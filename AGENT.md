# AGENT.md — Lead Intake Service

## Purpose & Overview

This document tracks how AI tools were used while building the Lead Intake Service.

AI tools (Claude, and Google Antigravity running Gemini 3.8 Flash) generated most of the implementation code — backend services, migrations, React components, and the test suite. The engineer made the architecture and security decisions (schema design, the HMAC/timing-safe auth approach, the idempotency strategy, the FSM rules), reviewed the generated code against those decisions, and is responsible for what shipped.

---

## 1. AI Tools Used

| Tool                            | Model / Version                         | Role in Project                         | Scope of Usage & Supervision                                                                                                                                                                                                                                        |
| :------------------------------ | :-------------------------------------- | :-------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Claude**                      | Claude Sonnet                           | Architecture discussion & spec drafting | Discussed trade-offs (lead schema design, authentication models, webhook verification depth, database tooling, frontend state management) before code authoring. Weighed pros/cons of each approach; the engineer made the final calls, recorded in `SPEC.md`.      |
| **Google Antigravity**          | Gemini 3.8 Flash (Agentic Execution)    | Primary code generator                  | Generated most of the code for: backend Express routes, services, database migrations, cryptographic middleware, frontend React components, CSS Modules, and Vitest test suites. Worked from the engineer's directives; all output was reviewed and edited by hand. |
| **Node.js Crypto & Vitest CLI** | Node.js v22.x built-ins / Vitest v2.1.9 | Test execution harness                  | Ran the 77 automated unit, integration, and end-to-end tests (51 backend + 26 frontend) across the monorepo, from test plans the engineer designed.                                                                                                                 |

---

## 2. Prompts & Task Directives Log

The table below tracks each development phase: what the engineer specified, what the AI generated, and what the engineer changed or verified afterward.

| #   | Lifecycle Phase                          | Engineer's Directive & Constraints                                                                                                                                                                                                           | AI Implementation Generation                                                                                                       | Engineer's Review & Refinements                                                                                                                                                                                                                                                   | Target Artifacts                                                                                                        |
| :-- | :--------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------- |
| 1   | **Monorepo Architecture**                | Use an npm workspaces monorepo separating `backend` (Node 22 / Express / TS / pg) and `frontend` (React 18 / Vite / TS). Strict ESM, explicit TypeScript paths, Docker Compose orchestration.                                                | Generated workspace manifests, `package.json`, `tsconfig.json` configurations, directory hierarchy, and initial container configs. | Checked workspace dependency resolution, pinned Node.js 22 LTS engine targets, configured Docker container bridge networking.                                                                                                                                                     | `package.json`, `docker-compose.yml`, `backend/*`, `frontend/*`, `.gitignore`                                           |
| 2   | **Database Design & Schema**             | Use PostgreSQL with `node-pg-migrate`. Relational schema: native ENUM for status, UUID v4 primary keys, indexed `JSONB` for raw payload, composite index `(lead_id, created_at DESC, id DESC)` for timeline queries.                         | Implemented complete migration scripts (`node-pg-migrate`), DDL table definitions, indexes, and TypeScript schema types.           | Added a `BIGSERIAL` secondary sort on `activities` for deterministic pagination when timestamps collide; added foreign key CASCADE constraints.                                                                                                                                   | `backend/migrations/*`, `backend/src/modules/leads/types.ts`                                                            |
| 3   | **Webhook Cryptography (HMAC)**          | Discussed raw byte stream capture. Design Meta webhook verification via `X-Hub-Signature-256`. Capture the raw `rawBody` Buffer before Express's JSON parser mutates the stream. Constant-time equality check, 64-char hex regex validation. | Implemented Express route handlers, webhook signature header parsing, and HMAC-SHA256 calculation logic.                           | Identified the stream-mutation risk in body-parsers; added raw `rawBody` Buffer capture in `express.json({ verify })`. Replaced the naive string comparison with `crypto.timingSafeEqual` and a 64-char hex regex check to reduce timing attacks and malformed payload injection. | `backend/src/app.ts`, `backend/src/modules/webhook/verifySignature.ts`                                                  |
| 4   | **Concurrency & Idempotency**            | Compared distributed locks vs. a database constraint. Prevent duplicate leads during concurrent webhook delivery. Use database-level idempotency via `external_lead_id UNIQUE` with `INSERT ... ON CONFLICT DO NOTHING`.                     | Implemented webhook ingestion service logic, duplicate handling flow, and database insertion queries.                              | Checked concurrency safety under burst conditions. Rejected an application-level `SELECT-then-INSERT` check (race-prone); used atomic storage-level deduplication via `INSERT ... ON CONFLICT DO NOTHING RETURNING id`, returning HTTP 200 `duplicate_ignored`.                   | `backend/src/modules/webhook/service.ts`, `backend/src/modules/webhook/routes.ts`                                       |
| 5   | **Finite State Machine (FSM)**           | Design a strict, one-directional lead lifecycle: `NEW → CONTACTED → QUALIFIED → CONVERTED`. `LOST` reachable from any active state. Terminal states (`CONVERTED`, `LOST`) must be immutable.                                                 | Implemented status enum definitions, transition lookup maps, and status update controller endpoints.                               | Wrote the state transition matrix (`AllowedTransitions`) and an `isValidTransition()` guard; returns 400 with the allowed transitions listed when a jump is invalid.                                                                                                              | `backend/src/modules/leads/types.ts`, `backend/src/modules/leads/service.ts`                                            |
| 6   | **ACID Transactional Boundary**          | Avoid orphaned state changes. Wrap status transitions and activity log entries in one transaction (`withTransaction`) using `SELECT ... FOR UPDATE` row-level locking.                                                                       | Implemented database query functions for lead status updates and corresponding activity log insertions.                            | Identified the risk of a status change committing without its audit record (or vice versa). Built the `withTransaction` wrapper with `SELECT ... FOR UPDATE` locking so both commit or roll back together.                                                                        | `backend/src/modules/leads/service.ts`, `backend/src/modules/activities/service.ts`                                     |
| 7   | **API Key Security & Timing Defense**    | Considered timing side-channel attacks on variable-length tokens. Protect dashboard endpoints with Bearer API key middleware. Avoid timing leaks by hashing both values to a fixed length before the constant-time check.                    | Implemented Bearer token extraction middleware, authorization header parsing, and credential check routines.                       | Identified that `crypto.timingSafeEqual` throws on unequal buffer lengths, which leaks key length via response latency. Added SHA-256 pre-hashing so both buffers are always 32 bytes and the comparison runs in constant time.                                                   | `backend/src/middleware/apiKeyAuth.ts`                                                                                  |
| 8   | **Defensive Sanitization & Privacy**     | Harden backend endpoints against null-byte injection (`\0`), malformed UUID path parameters, and sensitive customer data leakage in application logs.                                                                                        | Implemented request logging middleware, route parameter binding, and standard database query parameterization.                     | Reviewed security and privacy: added null-byte stripping (`\0`), strict UUID regex parameter validation, CORS origin restrictions, Helmet security headers, and PII redaction filters (masking phone numbers and emails) in application logs.                                     | `backend/src/middleware/*`, `backend/src/db/index.ts`, `backend/src/modules/leads/router.ts`                            |
| 9   | **Lead Mutation & Invariant Rules**      | Discussed audit payload storage (snapshots vs. granular deltas). Design `PATCH /leads/:id` to fulfill the `Lead Updated` requirement. Business invariant: a lead cannot have both email and phone removed.                                   | Implemented `PATCH /leads/:id` controller, Zod validation schemas, and React edit modal with controlled inputs.                    | Set the invariant that a lead must retain at least one valid contact method (email or phone). Built field-level diffing that computes `{ before, after }` deltas for the `LEAD_UPDATED` activity record.                                                                          | `backend/src/modules/leads/*`, `frontend/src/components/LeadDetail/*`                                                   |
| 10  | **Frontend Architecture & State**        | Compared TanStack Query vs. lightweight custom hooks. Build the React dashboard on custom hooks (`useLeads`, `useLeadDetail`, `useUpdateLead`), treating the backend audit log as the source of truth.                                       | Implemented full React application views: split-pane dashboard, lead table, detail drawer, timeline view, and data hooks.          | Weighed caching complexity vs. data freshness; chose custom hooks over a caching library to avoid stale-cache mismatches with the audit trail. Added URL search-param sync for shareable filters and pagination.                                                                  | `frontend/src/hooks/*`, `frontend/src/components/*`, `frontend/src/pages/*`                                             |
| 11  | **Component Isolation & Error Boundary** | Modularize frontend styling with scoped CSS Modules (`*.module.css`) to avoid global style collisions. Implement a top-level React `ErrorBoundary` for crash resilience.                                                                     | Implemented CSS Modules across components, design system classes, and React `ErrorBoundary` implementation.                        | Added loading skeletons, empty-state fallbacks, status badge styling, and an error boundary fallback view.                                                                                                                                                                        | `frontend/src/components/ErrorBoundary/*`, `frontend/src/components/**/*.module.css`                                    |
| 12  | **Cryptographic & Unit Verification**    | Write isolated unit tests for HMAC signature verification, timing-safe API key auth, and FSM transition logic using Vitest. Cover edge cases: altered body bytes, uppercase hex, illegal jumps.                                              | Generated Vitest test suites, mock fixtures, and assertion test cases across cryptographic and domain modules.                     | Designed the test matrix: altered payload bytes, uppercase hex signatures, missing authorization headers, timing edge cases, and illegal state transitions — all passing.                                                                                                         | `backend/tests/unit/verifySignature.test.ts`, `backend/tests/unit/fsm.test.ts`, `backend/tests/unit/apiKeyAuth.test.ts` |
| 13  | **E2E Lifecycle & Concurrency Tests**    | Build a full lifecycle integration test against PostgreSQL: webhook ingestion → deduplication → listing → status transition → field edit → audit trail verification.                                                                         | Implemented Supertest integration test suite exercising end-to-end API workflows against a live test database container.           | Designed a concurrent webhook replay test dispatching simultaneous duplicate payloads to verify race safety of `ON CONFLICT DO NOTHING`; verified transactional rollback on activity failure.                                                                                     | `backend/tests/integration/webhook-lifecycle.test.ts`, `backend/tests/integration/leads.test.ts`                        |
| 14  | **Production Dockerization**             | Build production-oriented multi-stage Dockerfiles for backend and frontend. Run database migrations on container startup before the app server binds its port.                                                                               | Generated multi-stage Dockerfiles for backend and frontend, and multi-container `docker-compose.yml` configurations.               | Hardened container deployments: enforced non-root execution contexts, configured automated migration health check boot ordering, and wired Vite build-time argument injection.                                                                                                    | `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml`                                                       |

---

## 3. Implementation Material vs. Architectural & Security Ownership

The table below maps each subsystem to what the AI generated and what the engineer decided and verified.

| Architectural Subsystem                        | AI Implementation Contributions                                                                                                 | Engineer's Decisions & Verification                                                                                                                                                                                                                                |
| :--------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **System Architecture & Stack Strategy**       | Generated monorepo workspace configurations, package manifests, TypeScript build configs, and Express/Vite scaffolding.         | **Human:** Set the monorepo topology, decoupled the Express backend from the Vite React SPA, used strict ESM, and chose PostgreSQL 16 for ACID audit compliance.                                                                                                   |
| **Relational Schema & DDL Migrations**         | Implemented `node-pg-migrate` migration scripts, DDL table definitions (`leads`, `activities`), indexes, and schema types.      | **Human:** Designed the schema: native ENUMs for status, UUID v4 primary keys, indexed `JSONB` for payload storage, and a composite index `(lead_id, created_at DESC, id DESC)` with a `BIGSERIAL` tiebreaker for stable pagination.                               |
| **Webhook Cryptography & Verification**        | Implemented Express webhook routing, signature header extraction, and HMAC-SHA256 signature verification functions.             | **Human:** Set up raw buffer preservation via `express.json({ verify: ... })` so HMAC verification runs on the exact bytes Meta signed. Required `crypto.timingSafeEqual` and 64-char hex regex validation to reduce timing leaks and malformed payload injection. |
| **Concurrency Control & Idempotency**          | Implemented webhook ingestion service logic, conflict handling routines, and database write operations.                         | **Human:** Chose storage-level idempotency via `external_lead_id UNIQUE` with `INSERT ... ON CONFLICT DO NOTHING RETURNING id`, over an application-level `SELECT-then-INSERT` (race-prone under concurrent webhook bursts).                                       |
| **Finite State Machine (FSM) Lifecycle**       | Implemented status transitions, validation helper routines, and status update controller endpoints.                             | **Human:** Designed the one-directional state machine (`NEW → CONTACTED → QUALIFIED → CONVERTED`, with `LOST` reachable from any non-terminal state). Required terminal states to be immutable and 400 responses to list the allowed transitions.                  |
| **ACID Transactional Boundaries & Auditing**   | Implemented database query functions, activity insertion helpers, and metadata formatting utilities.                            | **Human:** Built the `withTransaction` wrapper with `SELECT ... FOR UPDATE` row-level locking so status changes and audit records commit or roll back together. Defined the activity type taxonomy.                                                                |
| **API Authentication & Timing-Safe Security**  | Implemented Bearer token extraction middleware, header parsing logic, and route authorization guards.                           | **Human:** Designed the length-independent comparison — SHA-256 pre-hashing before `crypto.timingSafeEqual` — to remove the timing side-channel that would otherwise leak key length.                                                                              |
| **Lead Mutation Engine & Business Invariants** | Implemented `PATCH /leads/:id` controller, Zod request schemas, and React edit modal with controlled form fields.               | **Human:** Set the invariant that a lead can't have both email and phone removed. Designed the field diffing that computes `{ before, after }` deltas for `LEAD_UPDATED` entries.                                                                                  |
| **Frontend State Architecture & UX Design**    | Implemented complete React SPA: split-pane layout, lead table, detail drawer, activity timeline, custom hooks, and CSS Modules. | **Human:** Chose custom hooks over a caching library to avoid stale-cache mismatches with the audit trail; added URL query-param state sync, loading skeletons, and a top-level `ErrorBoundary`.                                                                   |
| **Defensive Engineering & Privacy Protection** | Implemented request logging middleware, route parameter binding, and parameterized database queries.                            | **Human:** Required null-byte stripping (`\0`) on query params, strict UUID regex guards, CORS origin restrictions, Helmet security headers, and PII redaction for emails/phone numbers in logs.                                                                   |
| **Test Engineering & Verification Matrix**     | Implemented the 77 Vitest test cases (51 backend + 26 frontend), mock fixtures, and assertion scripts across the test suite.    | **Human:** Designed the test strategy: concurrent duplicate webhook replay, timing-attack cases, invalid FSM jumps, transactional rollback scenarios, and full-lifecycle PostgreSQL integration tests.                                                             |

---

## 4. Collaborative Brainstorming & Security Trade-off Sessions

Structured sessions with the AI assistant to explore candidate designs and weigh trade-offs before implementation:

### Session 1: Webhook Raw-Body Capture vs. Body-Parser Mutation

- **Engineering Dilemma**: Express's default `express.json()` middleware parses incoming JSON streams into JavaScript objects, mutating whitespace, key order, and unicode encodings. Meta webhook HMAC-SHA256 signatures are computed by Meta over the exact raw byte stream. If the signature is checked against a reconstructed JSON string, verification fails intermittently.
- **Options Considered**:
  - _Option A (Route-Specific Raw Parser)_: Use `express.raw({ type: 'application/json' })` only on the `/api/webhook` route, manually calling `JSON.parse()` afterwards.
    - _Pros_: Isolates raw buffer handling strictly to the webhook endpoint.
    - _Cons_: Introduces middleware ordering fragility; if global JSON parsing is registered earlier, the stream is prematurely consumed.
  - _Option B (Global Verify Hook)_: Use `express.json({ verify: (req, res, buf) => { req.rawBody = buf; } })` globally with a strict payload size limit (`1mb`).
    - _Pros_: Preserves the untouched Buffer in `req.rawBody` while automatically populating `req.body`; keeps behavior consistent across all routes.
    - _Cons_: Retains the raw byte buffer in memory alongside the parsed object.
- **Decision & Rationale**: Chose **Option B** with a 1MB limit. Lead payloads are small (<10KB), so the buffer memory footprint is negligible, while avoiding the middleware-ordering issue and ensuring HMAC verification runs on the exact bytes Meta signed.

---

### Session 2: API Key Verification & Timing Side-Channel Defense

- **Engineering Dilemma**: When verifying Bearer API keys, `crypto.timingSafeEqual(a, b)` requires both buffers to have identical byte lengths. If buffer lengths differ, the function throws a runtime exception. A naive length check (`if (token.length !== expected.length) return false;`) introduces a measurable timing side-channel where an attacker can deduce the secret key length by measuring sub-millisecond response deltas.
- **Options Considered**:
  - _Option A (Length Check + Early Exit)_: Validate `token.length === expected.length` before invoking `crypto.timingSafeEqual`.
    - _Pros_: Simple, idiomatic Node.js code with standard error handling.
    - _Cons_: Vulnerable to timing analysis attacks that leak the exact length of `API_KEY`.
  - _Option B (Cryptographic Pre-Hash Normalization)_: Hash both the incoming token and the configured `API_KEY` using SHA-256 before invoking `crypto.timingSafeEqual`.
    - _Pros_: SHA-256 output is always exactly 32 bytes (256 bits), regardless of input length, so `crypto.timingSafeEqual` always compares equal-length buffers in constant time — removing the key-length and early-byte timing leak.
    - _Cons_: Incurs a negligible SHA-256 hashing computation (~microseconds) per request.
- **Decision & Rationale**: Chose **Option B**. For an API handling lead data, the timing-attack fix was worth the cost — the extra hashing is negligible next to network I/O.

---

### Session 3: Concurrency Control & Webhook Idempotency Strategy

- **Engineering Dilemma**: Meta Lead Ads servers frequently retry webhook deliveries or send concurrent POST requests for the same `leadgen_id` during traffic bursts. A race condition between concurrent requests could result in duplicate lead creation and contaminated audit logs.
- **Options Considered**:
  - _Option A (Application-Level Select-Before-Insert)_: Execute `SELECT id FROM leads WHERE external_lead_id = $1` before inserting.
    - _Pros_: Straightforward application logic; allows returning custom duplicate messages without handling database errors.
    - _Cons_: Race-prone; concurrent requests arriving within milliseconds will both evaluate the `SELECT` to null and proceed to insert duplicates.
  - _Option B (Distributed In-Memory Lock via Redis)_: Acquire an atomic distributed lock on `external_lead_id` before processing.
    - _Pros_: Prevents simultaneous processing across distributed application workers.
    - _Cons_: Introduces an external infrastructure dependency (Redis), operational complexity, and network partition failure modes.
  - _Option C (Storage Engine Atomic Constraint)_: Enforce a database-level `UNIQUE (external_lead_id)` constraint combined with `INSERT INTO leads (...) VALUES (...) ON CONFLICT (external_lead_id) DO NOTHING RETURNING id`.
    - _Pros_: Race-safe at the storage engine level; ACID guarantee; no extra infrastructure; signals deduplication when zero rows are returned.
    - _Cons_: Consumes an internal sequence counter on collision (mitigated by using UUID v4 primary keys).
- **Decision & Rationale**: Chose **Option C**. PostgreSQL's unique constraint is race-safe by design, without the failure modes a distributed lock would add, and keeps the infrastructure simpler.

---

### Session 4: Audit Trail Architecture — Granular Deltas vs. Full Row Snapshots

- **Engineering Dilemma**: When an operator modifies a lead (`PATCH /leads/:id`), the system must record a `LEAD_UPDATED` event in the `activities` table. How should the change payload be structured in `metadata JSONB`?
- **Options Considered**:
  - _Option A (Full Row Snapshots)_: Store the entire `{ before: LeadModel, after: LeadModel }` state in the audit metadata.
    - _Pros_: Trivial to serialize; captures complete state at each point in time.
    - _Cons_: Rapid database bloat; stores redundant unchanged columns; requires the frontend to compute client-side diffs to display what actually changed.
  - _Option B (Granular Semantic Deltas)_: Compute field-by-field diffs during the update transaction and store only modified keys: `{ changes: { [field]: { from, to } } }`.
    - _Pros_: Compact JSONB storage footprint; clear audit trail readability; lets the frontend timeline render "Updated email from a@b.com to c@d.com" without client-side diffing.
    - _Cons_: Requires backend diffing logic to compare incoming payload against current locked row.
- **Decision & Rationale**: Chose **Option B**, combined with row-level `SELECT ... FOR UPDATE` locking — precise, auditable deltas, without the database bloat or the read-modify-write race condition.

---

### Session 5: Frontend State Management — TanStack Query vs. Zero-Bloat Custom Hooks

- **Engineering Dilemma**: Selecting the state management and data synchronization architecture for the React frontend dashboard (lead list, filters, lead details, status transitions, and activity timeline).
- **Options Considered**:
  - _Option A (TanStack Query / React Query)_: Install TanStack Query for caching, query invalidation, and background refetching.
    - _Pros_: Automatic stale-while-revalidate caching and standardized mutation hooks.
    - _Cons_: Adds ~40kB to the frontend bundle; cache invalidation rules can cause a status update mutation to desync from the activity timeline feed.
  - _Option B (Lightweight Native Custom Hooks)_: Author purpose-built React hooks (`useLeads`, `useLeadDetail`, `useUpdateLead`) using native `fetch` and direct local state synchronization.
    - _Pros_: No external dependencies; minimal bundle footprint; the backend database and audit log stay the direct source of truth, with mutations and timeline refreshes staying in sync.
    - _Cons_: Requires authoring manual loading and error state logic.
- **Decision & Rationale**: Chose **Option B**. For this dashboard, data freshness and staying in sync with the audit trail mattered more than caching convenience — removing the caching library also kept the production bundle lean.

---

### Session 6: Contact Method Retention Invariant Rule

- **Engineering Dilemma**: If `PATCH /leads/:id` allows operators to modify contact details, an operator or faulty client payload could set both `email` and `phone` to `null` or empty strings, rendering the lead completely uncontactable.
- **Options Considered**:
  - _Option A (Immutable Contact Fields)_: Disallow updating email and phone after creation; only permit status changes.
    - _Pros_: Prevents accidental data deletion entirely.
    - _Cons_: Too rigid for real-world operations; operators cannot correct mistyped phone numbers or update lead email addresses.
  - _Option B (Contact Retention Invariant)_: Allow updating email and phone, but enforce a strict domain invariant: the post-update lead state must retain at least one valid contact method (email or phone).
    - _Pros_: Delivers operational flexibility while guaranteeing that every lead in the database remains actionable.
    - _Cons_: Requires evaluating the combined state of existing database values merged with partial update fields before writing.
- **Decision & Rationale**: Chose **Option B**: the merged-state invariant check runs inside the transactional update, rejecting any mutation that would leave both contact fields empty, with a 400 response explaining why.

---

## 5. Architecture Decision Records (ADR Log)

The following architectural decisions were made during development to balance production readiness, security, and project scope:

| ADR ID     | Decision                                                  | Rationale                                                                                                                                         | Alternatives Considered                                                                   |
| :--------- | :-------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------- |
| **ADR-01** | **Backend: Node.js + Express + TypeScript**               | Matches ecosystem requirements; lowest overhead and highest developer velocity for REST endpoints.                                                | NestJS (more boilerplate), Fastify (less ubiquitous ecosystem).                           |
| **ADR-02** | **Database: PostgreSQL 16**                               | Relational integrity with foreign keys, transactional DDL, ACID transactions for audit logs, and native JSONB indexing.                           | MongoDB (lacks native transactional ACID guarantees for audit trails across collections). |
| **ADR-03** | **Lead Schema: Real Meta Lead Ads Shape**                 | Matches the real Meta webhook payload shape (`leadgen_id`, `field_data[]`) rather than a simplified mock.                                         | Simplified mock schema (`name, email, phone`).                                            |
| **ADR-04** | **Status FSM: Strict Transition Rules**                   | Enforces `NEW → CONTACTED → QUALIFIED → CONVERTED`, with `LOST` accessible from non-terminal states. Terminal states are immutable.               | Unrestricted status updating (allows nonsensical transitions like `CONVERTED → NEW`).     |
| **ADR-05** | **Auth: Bearer API Key with Timing-Safe Check**           | Secures internal dashboard API while keeping authentication lightweight and auditable. Uses `crypto.timingSafeEqual` with SHA-256 padding.        | Full JWT + user sessions (unnecessary scope for an intake service).                       |
| **ADR-06** | **Webhook Security: Full Meta HMAC Verification**         | Real `X-Hub-Signature-256` HMAC-SHA256 verification and `GET` challenge handshake; protects webhook endpoint from forged submissions.             | Optional or disabled verification (security vulnerability).                               |
| **ADR-07** | **Idempotency: Atomic Conflict Resolution**               | Database-level unique constraint on `external_lead_id` with `INSERT ... ON CONFLICT DO NOTHING`; retried webhooks return `200 duplicate_ignored`. | Application-level `SELECT-then-INSERT` (race-prone under concurrent spikes).              |
| **ADR-08** | **List API: Comprehensive Query Capabilities**            | Supports pagination, status filtering, multi-field search (`full_name`, `email`, `phone`), and allow-listed sorting.                              | Unpaginated full-table dump (fails under production load).                                |
| **ADR-09** | **Audit Trail: Semantic Event Types**                     | Dedicated event types for status changes (`STATUS_CHANGED`), lead edits (`LEAD_UPDATED`), and webhook ingestion (`LEAD_CREATED`).                 | Conflating status changes with lead updates (creates audit ambiguity).                    |
| **ADR-10** | **Database Access: Plain `pg` + Parameterized SQL**       | No ORM abstraction overhead, direct connection pooling control, and explicit row locking (`SELECT ... FOR UPDATE`).                               | Prisma / TypeORM (cold-start latency, abstraction leaks, migration rigidity).             |
| **ADR-11** | **Frontend State: Custom Hooks + Native Fetch**           | No external dependency weight (~40kB saved). Server audit log stays the immediate source of truth.                                                | TanStack Query / Redux Toolkit (unneeded complexity for a 3-screen view).                 |
| **ADR-12** | **Testing: Shared Vitest Across Monorepo**                | One test runner and configuration across backend and frontend, reducing CI maintenance overhead.                                                  | Jest (backend) + Vitest (frontend) configuration divergence.                              |
| **ADR-13** | **Deployment: Multi-stage Docker + Automated Migrations** | Multi-stage Dockerfiles compiling TypeScript to lean production images; migrations run automatically on container startup.                        | Manual cloud server setup / uncontainerized VPS.                                          |
| **ADR-14** | **Database Indexing: Composite Pagination Indexes**       | Composite indexes on `(created_at DESC, id DESC)` and `(status, created_at DESC)` for fast index-scan pagination without table scans.             | Unindexed sequential scans or relying solely on single-column indexes.                    |
| **ADR-15** | **Frontend State: URL Search Parameters Sync**            | Filter, search, and page state synced with `useSearchParams`, giving persistent and shareable dashboard views with no extra library.              | Ephemeral component `useState` (state lost on refresh) or a heavier global state store.   |

---

## 6. Engineering Evaluation & Assumptions

### Assumptions Documented & Validated

1. **Webhook Payload Flexibility**: The parser defensively extracts `full_name`, `email`, and `phone` regardless of field casing (`FIRST_NAME`, `full_name`) or order in `field_data`.
2. **Contact Retention Invariant**: A lead can be updated to change email or phone, but cannot have both removed simultaneously, so lead records stay actionable.
3. **Audit Immutability**: Activity records are append-only (`INSERT` only, no `UPDATE` or `DELETE` endpoints exposed).
4. **Deterministic Sorting**: Primary sort on `created_at DESC` with secondary sort on `id DESC` (BIGSERIAL) keeps pagination stable even when multiple activities share the same millisecond timestamp.
