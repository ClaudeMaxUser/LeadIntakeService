# AGENT.md — Lead Intake Service

## Purpose & Overview

This document provides a transparent and rigorous audit of all AI-assisted engineering activities conducted during the design, architecture, development, security hardening, and verification of the **Lead Intake Service**.

### Engineering Ownership & AI Collaboration

The core system architecture, domain models, cryptographic security specifications, concurrency invariants, relational database schemas, error handling paradigms, and engineering trade-offs were designed, reviewed, and driven by the engineer.

AI tooling (**Google Antigravity** running **Gemini 3.8 Flash** and **Claude Sonnet**) was utilized in an assistive pair-programming and consultative capacity:

1. To explore architectural trade-offs and brainstorm pros and cons across candidate solutions.
2. To accelerate monorepo scaffolding and generate typed boilerplate from human specifications.
3. To expand repetitive test scenarios and run automated verification suites.

Every line of AI-assisted code and candidate architecture option was critically evaluated, tested, and refined by the engineer to satisfy production-grade quality, performance, and security standards.

---

## 1. AI Tools Used

| Tool                            | Model / Version                         | Role in Project                                               | Scope of Usage & Supervision                                                                                                                                                                                                                                                      |
| :------------------------------ | :-------------------------------------- | :------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claude** | Claude Sonnet 5 | Brainstorming & Trade-off Analysis Partner | Used as a sounding board for structured brainstorming and Q&A on open decisions (lead schema, auth model, webhook verification depth, DB/testing tooling) before any code was written. For each open question, laid out the candidate options with pros/cons; final choice on every point — schema shape, auth approach, verification depth, ORM vs. plain SQL, TanStack Query vs. plain fetch, test runner, deployment target — was made by the developer. Drafted `SPEC.md` and the initial `AGENT.md` structure to those specifications, with each section reviewed and confirmed before being finalized. |
| **Google Antigravity**          | Gemini 3.8 Flash (Agentic Execution)    | Supervised Pair-Programming Assistant & Consultative Executor | Executed monorepo scaffolding, boilerplate file creation, CSS module extraction, and repetitive test case authoring strictly under human architectural specifications, constraints, and line-by-line review. Provided candidate trade-off analyses during brainstorming sessions. |
| **Node.js Crypto & Vitest CLI** | Node.js v22.x built-ins / Vitest v2.1.9 | Cryptographic verification & test execution harness           | Verification harness executing 73 automated unit, integration, and end-to-end tests across backend and frontend under human-designed test plans.                                                                                                                                  |

---

## 2. Prompts & Task Directives Log

The following table documents the progression of engineering directives, collaborative brainstorming prompts, human architectural constraints, AI scaffolding outputs, and human code reviews/refinements across the development lifecycle:

| #   | Lifecycle Phase                          | Human Architectural Directive & Design Constraints                                                                                                                                                                                                                       | AI Generated Elements                                                                               | Human Review, Security Decisions & Refinements                                                                                                                                              | Target Artifacts                                                                                                        |
| :-- | :--------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------- |
| 1   | **Monorepo Architecture**                | Mandate an npm workspaces monorepo separating `backend` (Node 22 / Express / TS / pg) and `frontend` (React 18 / Vite / TS). Mandate strict ESM, explicit TypeScript paths, and Docker Compose orchestration.                                                            | Scaffolding root `package.json`, `tsconfig.json`, workspaces layout, and initial container configs. | Validated workspace dependency resolution, pinned Node.js 22 LTS engine targets, and configured Docker container bridge networking.                                                         | `package.json`, `docker-compose.yml`, `backend/*`, `frontend/*`, `.gitignore`                                           |
| 2   | **Database Design & Schema**             | Mandate PostgreSQL with `node-pg-migrate`. Define relational schema: native ENUM for status, UUID v4 primary keys, indexed `JSONB` for raw payload, and composite index `(lead_id, created_at DESC, id DESC)` for sub-millisecond timeline queries.                      | Initial migration script boilerplate and standard DDL syntax.                                       | Mandated `BIGSERIAL` secondary sort on `activities` to guarantee deterministic pagination during millisecond timestamp collisions; enforced foreign key CASCADE constraints.                | `backend/migrations/*`, `backend/src/modules/leads/types.ts`                                                            |
| 3   | **Webhook Cryptography (HMAC)**          | _Brainstorming session on raw byte stream capture_. Architect Meta webhook verification via `X-Hub-Signature-256`. Capture pristine `rawBody` Buffer before Express JSON parser mutates stream. Implement constant-time equality check and 64-char hex regex validation. | Express route handler boilerplate and signature header extraction helpers.                          | Rejected AI's naive string comparison; implemented `crypto.timingSafeEqual` with strict hex regex verification to eliminate timing attacks and malformed payload injection.                 | `backend/src/app.ts`, `backend/src/modules/webhook/verifySignature.ts`                                                  |
| 4   | **Concurrency & Idempotency**            | _Brainstorming session on distributed locks vs database constraints_. Prevent duplicate lead generation during concurrent webhook delivery spikes. Mandate database-level atomic idempotency via `external_lead_id UNIQUE` with `INSERT ... ON CONFLICT DO NOTHING`.     | Ingestion service logic with standard try/catch error handling.                                     | Explicitly overruled AI proposal to use application-level `SELECT-then-INSERT` (vulnerable to race conditions); verified atomic deduplication returning HTTP 200 `duplicate_ignored`.       | `backend/src/modules/webhook/service.ts`, `backend/src/modules/webhook/routes.ts`                                       |
| 5   | **Finite State Machine (FSM)**           | Architect strict unidirectional lead lifecycle: `NEW → CONTACTED → QUALIFIED → CONVERTED`. Allow `LOST` from any active state. Mandate that terminal states (`CONVERTED`, `LOST`) are immutable.                                                                         | Enum definitions and status update route handler templates.                                         | Authored formal state transition matrix (`AllowedTransitions`) and `isValidTransition()` guard; enforced explicit 400 Bad Request with transition guidance upon invalid jumps.              | `backend/src/modules/leads/types.ts`, `backend/src/modules/leads/service.ts`                                            |
| 6   | **ACID Transactional Boundary**          | Guarantee zero orphaned state changes. Wrap status transitions and activity log entries within an atomic database transaction (`withTransaction`) utilizing `SELECT ... FOR UPDATE` row-level locking.                                                                   | Separate database query methods for lead updates and activity inserts.                              | Overruled disconnected queries; refactored both operations into a unified transactional envelope where activity logging failure forces complete status update rollback.                     | `backend/src/modules/leads/service.ts`, `backend/src/modules/activities/service.ts`                                     |
| 7   | **API Key Security & Timing Defense**    | _Brainstorming session on timing-side channel attacks on variable-length tokens_. Protect internal dashboard endpoints via Bearer API Key middleware. Defeat timing leaks using SHA-256 buffer normalization before constant-time checks.                                | Header extraction middleware and direct token comparison logic.                                     | Overruled plain equality; implemented double SHA-256 hash digest normalization prior to `crypto.timingSafeEqual` to guarantee constant buffer length and constant execution time.           | `backend/src/middleware/apiKeyAuth.ts`                                                                                  |
| 8   | **Defensive Sanitization & Privacy**     | Harden backend endpoints against null-byte injection (`\0`), malformed UUID path parameters, and sensitive customer data leakage in application logs.                                                                                                                    | Request logging middleware and route parameter passing.                                             | Added regex UUID path validation, null-byte sanitization across search queries, and explicit PII redaction filters (masking phone numbers and emails) in Morgan loggers.                    | `backend/src/middleware/*`, `backend/src/db/index.ts`, `backend/src/modules/leads/router.ts`                            |
| 9   | **Lead Mutation & Invariant Rules**      | _Brainstorming session on audit payload storage (snapshots vs granular deltas)_. Design `PATCH /leads/:id` to fulfill `Lead Updated` requirement. Establish business invariant: a lead cannot have both email and phone removed.                                         | Zod schema definition draft and React inline edit form controls.                                    | Authored contact retention rule (lead must retain at least one contact method); built field diffing engine storing `{ before, after }` deltas for granular `LEAD_UPDATED` activity history. | `backend/src/modules/leads/*`, `frontend/src/components/LeadDetail/*`                                                   |
| 10  | **Frontend Architecture & State**        | _Brainstorming session on TanStack Query vs lightweight custom hooks_. Architect React dashboard using zero-bloat custom hooks (`useLeads`, `useLeadDetail`, `useUpdateLead`), treating backend audit log as single source of truth.                                     | Component JSX scaffolding and native fetch call skeletons.                                          | Designed split-pane layout (lead list + detail timeline), loading skeletons, empty state fallbacks, and optimistic UI updates for status dropdown transitions.                              | `frontend/src/hooks/*`, `frontend/src/components/*`, `frontend/src/pages/*`                                             |
| 11  | **Component Isolation & Error Boundary** | Modularize frontend styling with scoped CSS Modules (`*.module.css`) to eliminate global style collisions. Implement top-level React `ErrorBoundary` for crash resilience.                                                                                               | Extracted CSS module class names and ErrorBoundary component template.                              | Designed clean, modern dashboard aesthetic with status badge color semantics; ensured graceful fallback UI rendering if an uncaught runtime exception occurs in child trees.                | `frontend/src/components/ErrorBoundary/*`, `frontend/src/components/**/*.module.css`                                    |
| 12  | **Cryptographic & Unit Verification**    | Author isolated unit tests for HMAC signature verification, timing-safe API key auth, and FSM transition logic using Vitest. Validate edge cases: altered body bytes, uppercase hex, illegal jumps.                                                                      | Test file scaffolding, mock fixtures, and assertion runner setup.                                   | Designed negative security test vectors: timing attack hash mismatch, malformed header structures, terminal state lockout, and non-existent lead UUID handling (100% pass rate).            | `backend/tests/unit/verifySignature.test.ts`, `backend/tests/unit/fsm.test.ts`, `backend/tests/unit/apiKeyAuth.test.ts` |
| 13  | **E2E Lifecycle & Concurrency Tests**    | Construct full lifecycle integration test against PostgreSQL container: webhook ingestion → deduplication → listing → status transition → field edit → audit trail verification.                                                                                         | Supertest test runner harness and sample HTTP requests.                                             | Authored concurrent webhook test sending simultaneous duplicate payloads to verify atomic idempotency under high concurrency; verified transaction rollback behavior.                       | `backend/tests/integration/webhook-lifecycle.test.ts`, `backend/tests/integration/leads.test.ts`                        |
| 14  | **Production Dockerization**             | Build production-ready multi-stage Dockerfiles for backend and frontend. Automate database migrations on container startup before application server binds port.                                                                                                         | Initial single-stage Dockerfile drafts.                                                             | Re-architected with lean multi-stage builds (`builder` -> `runner`), non-root security context, automated migration healthcheck boot sequence, and Vite build-time argument injection.      | `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml`                                                       |

---

## 3. AI-Generated vs. Manually Written & Supervised Sections

To provide clear transparency regarding the engineering process, the table below contrasts the AI's assistive contributions against the architectural decisions, security implementations, and domain constraints driven by the engineer:

| Architectural Subsystem                        | AI Pair-Programming Contributions (Syntax, Scaffolding & Feedback)                                           | Human Architectural Ownership, Security Implementations & Key Decisions                                                                                                                                                                                                                                               |
| :--------------------------------------------- | :----------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **System Architecture & Stack Strategy**       | Scaffolding initial directory structure, scripts in root `package.json`, and TypeScript configuration files. | **Primary Architectural Owner**: Formulated monorepo design, decoupled Express REST backend from Vite React SPA, established strict ESM module system, and mandated PostgreSQL 16 for ACID audit compliance.                                                                                                          |
| **Relational Schema & DDL Migrations**         | Generated `node-pg-migrate` script syntax, boilerplate table definitions, and initial column mappings.       | **Primary Architectural Owner**: Designed relational schema: PostgreSQL native ENUMs for statuses, UUID v4 primary keys, indexed `JSONB` for payload preservation, and composite index `(lead_id, created_at DESC, id DESC)` for sub-millisecond timeline queries without pagination drift.                           |
| **Webhook Cryptography & Verification**        | Express router boilerplate and signature header parsing logic.                                               | **Primary Security Implementer**: Architected raw buffer preservation via `express.json({ verify: ... })` to protect HMAC integrity. Enforced `crypto.timingSafeEqual` and 64-char hex regex validation to eliminate timing leaks and malformed payload injection.                                                    |
| **Concurrency Control & Idempotency**          | Basic try/catch route handling and HTTP response dispatching.                                                | **Primary Architectural Owner**: Designed database-level atomic idempotency via `external_lead_id UNIQUE` with `INSERT ... ON CONFLICT DO NOTHING`. Explicitly rejected application-level lock/select patterns susceptible to distributed race conditions.                                                            |
| **Finite State Machine (FSM) Lifecycle**       | Enum string declarations and route controller template.                                                      | **Primary Architectural Owner**: Formulated formal unidirectional state machine (`NEW → CONTACTED → QUALIFIED → CONVERTED`, with `LOST` accessibility). Mandated terminal state immutability and informative 400 Bad Request error contracts.                                                                         |
| **ACID Transactional Boundaries & Auditing**   | SQL query helper functions and timestamp generators.                                                         | **Primary Architectural Owner**: Architected atomic transactional wrapper (`withTransaction`) guaranteeing zero orphaned mutations — state mutation and audit log must commit or rollback together. Defined 3-way semantic activity taxonomy (`LEAD_CREATED`, `STATUS_CHANGED`, `LEAD_UPDATED`).                      |
| **API Authentication & Timing-Safe Security**  | Authorization header extraction middleware and token string retrieval.                                       | **Primary Security Implementer**: Architected internal Bearer token security layer. Conceived and implemented length-independent constant-time comparison via SHA-256 hashing before `crypto.timingSafeEqual` to completely defeat timing attacks.                                                                    |
| **Lead Mutation Engine & Business Invariants** | Zod schema syntax and React modal input bindings.                                                            | **Primary Architectural Owner**: Formulated business invariant: a lead cannot have both email and phone removed. Conceived and built field diffing engine computing `{ before, after }` deltas for granular `LEAD_UPDATED` activity log entries.                                                                      |
| **Frontend State Architecture & UX Design**    | Component JSX layouts, CSS Module extraction, and native fetch calls.                                        | **Primary Architectural Owner**: Decided against caching library bloat (TanStack Query / Redux) in favor of lightweight custom hooks (`useLeads`, `useLeadDetail`, `useUpdateLead`), keeping server audit log as single source of truth; architected split-pane UX, loading skeletons, and top-level `ErrorBoundary`. |
| **Defensive Engineering & Privacy Protection** | Route parameter passing and logging middleware boilerplate.                                                  | **Primary Security Implementer**: Mandated null-byte query parameter stripping (`\0`), strict UUID regex parameter guards, CORS origin restrictions, Helmet security headers, and PII redaction filters for emails and phone numbers in application logs.                                                             |
| **Test Engineering & Verification Matrix**     | Test file scaffolding, mock fixtures, and assertion syntax.                                                  | **Primary Quality Owner**: Architected 73-test verification suite covering multi-tenant edge cases, concurrent duplicate webhook replay, timing attack resistance, FSM transition rejections, and full-lifecycle PostgreSQL integration tests.                                                                        |

---

## 4. Collaborative Brainstorming & Security Trade-off Sessions

During development, structured consultative sessions were conducted with the AI assistant to explore candidate designs, weigh trade-offs, and arrive at optimal architectural and security decisions. The following logs summarize the key sessions:

### Session 1: Webhook Raw-Body Capture vs. Body-Parser Mutation

- **Engineering Dilemma**: Express's default `express.json()` middleware parses incoming JSON streams into JavaScript objects, mutating whitespace, key order, and unicode encodings. Meta webhook HMAC-SHA256 signatures are computed by Meta over the exact raw byte stream. If the signature is checked against a reconstructed JSON string, verification fails intermittently.
- **Candidate Options Explored with AI**:
  - _Option A (Route-Specific Raw Parser)_: Use `express.raw({ type: 'application/json' })` only on the `/api/webhook` route, manually calling `JSON.parse()` afterwards.
    - _Pros_: Isolates raw buffer handling strictly to the webhook endpoint.
    - _Cons_: Introduces middleware ordering fragility; if global JSON parsing is registered earlier, the stream is prematurely consumed.
  - _Option B (Global Verify Hook)_: Use `express.json({ verify: (req, res, buf) => { req.rawBody = buf; } })` globally with a strict payload size limit (`1mb`).
    - _Pros_: Preserves the untouched Buffer in `req.rawBody` while automatically populating `req.body`; guarantees pipeline consistency across all routes.
    - _Cons_: Retains the raw byte buffer in memory alongside the parsed object.
- **Human Decision & Rationale**: The Human Engineer chose **Option B** with a 1MB limit. In a lead intake service, lead payloads are small (<10KB), making the buffer memory footprint negligible, while completely eliminating middleware ordering traps and ensuring HMAC verification operates on cryptographic ground truth.

---

### Session 2: API Key Verification & Timing Side-Channel Defense

- **Engineering Dilemma**: When verifying Bearer API keys, `crypto.timingSafeEqual(a, b)` requires both buffers to have identical byte lengths. If buffer lengths differ, the function throws a runtime exception. Performing a naive length check (`if (token.length !== expected.length) return false;`) introduces a measurable timing side-channel where an attacker can deduce the secret key length by measuring sub-millisecond response deltas.
- **Candidate Options Explored with AI**:
  - _Option A (Length Check + Early Exit)_: Validate `token.length === expected.length` before invoking `crypto.timingSafeEqual`.
    - _Pros_: Simple, idiomatic Node.js code with standard error handling.
    - _Cons_: Vulnerable to timing analysis attacks that leak the exact length of `API_KEY`.
  - _Option B (Cryptographic Pre-Hash Normalization)_: Hash both the incoming token and the configured `API_KEY` using SHA-256 before invoking `crypto.timingSafeEqual`.
    - _Pros_: SHA-256 output is mathematically guaranteed to be exactly 32 bytes (256 bits) regardless of input length. `crypto.timingSafeEqual` always receives equal-length buffers and executes in strict constant time, eliminating all key-length and early-byte timing leaks.
    - _Cons_: Incurs a negligible SHA-256 hashing computation (~microseconds) per request.
- **Human Decision & Rationale**: The Human Engineer mandated **Option B**. For an internal API gateway handling sensitive lead data, timing attack immunity is non-negotiable. The microsecond computational cost is completely imperceptible compared to network I/O.

---

### Session 3: Concurrency Control & Webhook Idempotency Strategy

- **Engineering Dilemma**: Meta Lead Ads servers frequently retry webhook deliveries or send concurrent POST requests for the same `leadgen_id` during traffic bursts. A race condition between concurrent requests could result in duplicate lead creation and contaminated audit logs.
- **Candidate Options Explored with AI**:
  - _Option A (Application-Level Select-Before-Insert)_: Execute `SELECT id FROM leads WHERE external_lead_id = $1` before inserting.
    - _Pros_: Straightforward application logic; allows returning custom duplicate messages without handling database errors.
    - _Cons_: Inherently race-prone; concurrent requests arriving within milliseconds will both evaluate the `SELECT` to null and proceed to insert duplicates.
  - _Option B (Distributed In-Memory Lock via Redis)_: Acquire an atomic distributed lock on `external_lead_id` before processing.
    - _Pros_: Completely prevents simultaneous processing across distributed application workers.
    - _Cons_: Introduces an external infrastructure dependency (Redis), operational complexity, and network partition failure modes.
  - _Option C (Storage Engine Atomic Constraint)_: Enforce a database-level `UNIQUE (external_lead_id)` constraint combined with `INSERT INTO leads (...) VALUES (...) ON CONFLICT (external_lead_id) DO NOTHING RETURNING id`.
    - _Pros_: 100% race-safe at the storage engine level; ACID transactional guarantee; zero extra infrastructure dependencies; atomically signals deduplication if zero rows are returned.
    - _Cons_: Consumes an internal sequence counter on collision (mitigated by using UUID v4 primary keys).
- **Human Decision & Rationale**: The Human Engineer chose **Option C**. The PostgreSQL storage engine's atomic uniqueness guarantee is mathematically race-proof, eliminating distributed lock failure modes and keeping the service infrastructure lean and resilient.

---

### Session 4: Audit Trail Architecture — Granular Deltas vs. Full Row Snapshots

- **Engineering Dilemma**: When an operator modifies a lead (`PATCH /leads/:id`), the system must record a `LEAD_UPDATED` event in the `activities` table. How should the change payload be structured in `metadata JSONB`?
- **Candidate Options Explored with AI**:
  - _Option A (Full Row Snapshots)_: Store the entire `{ before: LeadModel, after: LeadModel }` state in the audit metadata.
    - _Pros_: Trivial to serialize; captures complete state at each point in time.
    - _Cons_: Rapid database bloat; stores redundant unchanged columns; requires the frontend to compute client-side diffs to display what actually changed.
  - _Option B (Granular Semantic Deltas)_: Compute field-by-field diffs during the update transaction and store only modified keys: `{ changes: { [field]: { from, to } } }`.
    - _Pros_: Compact JSONB storage footprint; clear audit trail readability; enables the frontend timeline to immediately render "Updated email from a@b.com to c@d.com" without client-side diffing.
    - _Cons_: Requires backend diffing logic to compare incoming payload against current locked row.
- **Human Decision & Rationale**: The Human Engineer chose **Option B** coupled with row-level `SELECT ... FOR UPDATE` locking. Preserves precise, auditable deltas while preventing database bloat and eliminating read-modify-write race conditions.

---

### Session 5: Frontend State Management — TanStack Query vs. Zero-Bloat Custom Hooks

- **Engineering Dilemma**: Selecting the state management and data synchronization architecture for the React frontend dashboard (lead list, filters, lead details, status transitions, and activity timeline).
- **Candidate Options Explored with AI**:
  - _Option A (TanStack Query / React Query)_: Install TanStack Query for caching, query invalidation, and background refetching.
    - _Pros_: Automatic stale-while-revalidate caching and standardized mutation hooks.
    - _Cons_: Adds ~40kB to the frontend bundle; complex cache invalidation rules can cause desynchronization between a status update mutation and the activity timeline feed.
  - _Option B (Lightweight Native Custom Hooks)_: Author purpose-built React hooks (`useLeads`, `useLeadDetail`, `useUpdateLead`) using native `fetch` and direct local state synchronization.
    - _Pros_: Zero external dependencies; minimal bundle footprint (~0kB overhead); backend database and audit log remain the single direct source of truth; guaranteed real-time synchronization between mutations and timeline refreshes.
    - _Cons_: Requires authoring manual loading and error state logic.
- **Human Decision & Rationale**: The Human Engineer chose **Option B**. For an operational lead dashboard, data freshness and audit synchronization are paramount. Removing third-party caching layers eliminated stale audit inconsistencies and preserved a lean, blazingly fast production bundle.

---

### Session 6: Contact Method Retention Invariant Rule

- **Engineering Dilemma**: If `PATCH /leads/:id` allows operators to modify contact details, an operator or faulty client payload could set both `email` and `phone` to `null` or empty strings, rendering the lead completely uncontactable.
- **Candidate Options Explored with AI**:
  - _Option A (Immutable Contact Fields)_: Disallow updating email and phone after creation; only permit status changes.
    - _Pros_: Prevents accidental data deletion entirely.
    - _Cons_: Too rigid for real-world operations; operators cannot correct mistyped phone numbers or update lead email addresses.
  - _Option B (Contact Retention Invariant)_: Allow updating email and phone, but enforce a strict domain invariant: the post-update lead state must retain at least one valid contact method (email or phone).
    - _Pros_: Delivers operational flexibility while guaranteeing that every lead in the database remains actionable.
    - _Cons_: Requires evaluating the combined state of existing database values merged with partial update fields before writing.
- **Human Decision & Rationale**: The Human Engineer authored and enforced **Option B**. Implemented the merged-state invariant check inside the transactional update pipeline, rejecting any mutation that would leave both contact channels empty with a descriptive 400 Bad Request error.

---

## 5. Architecture Decision Records (ADR Log)

The following architectural decisions were made during development to balance production readiness, security, and project scope:

| ADR ID     | Decision                                                  | Rationale                                                                                                                                         | Alternatives Considered                                                                         |
| :--------- | :-------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------- |
| **ADR-01** | **Backend: Node.js + Express + TypeScript**               | Matches ecosystem requirements; provides lowest overhead and highest developer velocity for REST endpoints.                                       | NestJS (excessive boilerplate), Fastify (less ubiquitous ecosystem).                            |
| **ADR-02** | **Database: PostgreSQL 16**                               | Relational integrity with foreign keys, transactional DDL, ACID transactions for audit logs, and native JSONB indexing.                           | MongoDB (lacks native transactional ACID guarantees for audit trails across collections).       |
| **ADR-03** | **Lead Schema: Real Meta Lead Ads Shape**                 | Ingests real Meta webhook structure (`leadgen_id`, `field_data[]`), demonstrating authentic enterprise integration competence.                    | Simplified mock schema (`name, email, phone`).                                                  |
| **ADR-04** | **Status FSM: Strict Transition Rules**                   | Enforces `NEW → CONTACTED → QUALIFIED → CONVERTED`, with `LOST` accessible from non-terminal states. Terminal states are immutable.               | Unrestricted status updating (allows nonsensical transitions like `CONVERTED → NEW`).           |
| **ADR-05** | **Auth: Bearer API Key with Timing-Safe Check**           | Secures internal dashboard API while keeping authentication lightweight and auditable. Uses `crypto.timingSafeEqual` with SHA-256 padding.        | Full JWT + User sessions (unnecessary scope bloat for an intake service).                       |
| **ADR-06** | **Webhook Security: Full Meta HMAC Verification**         | Real `X-Hub-Signature-256` HMAC-SHA256 verification and `GET` challenge handshake; protects webhook endpoint from forged submissions.             | Optional or disabled verification (security vulnerability).                                     |
| **ADR-07** | **Idempotency: Atomic Conflict Resolution**               | Database-level unique constraint on `external_lead_id` with `INSERT ... ON CONFLICT DO NOTHING`; retried webhooks return `200 duplicate_ignored`. | Application-level `SELECT-then-INSERT` (vulnerable to race conditions under concurrent spikes). |
| **ADR-08** | **List API: Comprehensive Query Capabilities**            | Supports cursor/offset pagination, status filtering, multi-field search (`full_name`, `email`, `phone`), and allow-listed sorting.                | Unpaginated full-table dump (fails under production load).                                      |
| **ADR-09** | **Audit Trail: 3-Way Semantic Event Types**               | Dedicated endpoints for status changes (`STATUS_CHANGED`), lead edits (`LEAD_UPDATED`), and webhook ingestion (`LEAD_CREATED`).                   | Conflating status changes as lead updates (creates audit ambiguity).                            |
| **ADR-10** | **Database Access: Plain `pg` + Parameterized SQL**       | Zero black-box abstraction overhead, granular connection pooling control, and explicit row locking (`SELECT ... FOR UPDATE`).                     | Prisma / TypeORM (cold-start latency, abstraction leaks, migration rigidity).                   |
| **ADR-11** | **Frontend State: Custom Hooks + Native Fetch**           | Eliminates external dependency weight (~40kB saved). Server audit log is the immediate source of truth.                                           | TanStack Query / Redux Toolkit (unneeded complexity for a 3-screen view).                       |
| **ADR-12** | **Testing: Shared Vitest Across Monorepo**                | Single test runner and configuration across backend and frontend, reducing CI maintenance overhead.                                               | Jest (backend) + Vitest (frontend) configuration divergence.                                    |
| **ADR-13** | **Deployment: Multi-stage Docker + Automated Migrations** | Multi-stage Dockerfiles compiling TypeScript to lean production images; automated migration step on container startup.                            | Manual cloud server setup / uncontainerized VPS.                                                |
| **ADR-14** | **Database Indexing: Composite Pagination Indexes**       | Added composite indexes on `(created_at DESC, id DESC)` and `(status, created_at DESC)` guaranteeing fast index-scan pagination without table scans. | Unindexed sequential scans or relying solely on single-column indexes.                          |
| **ADR-15** | **Frontend State: URL Search Parameters Sync**            | Synchronized filter, search, and page state with `useSearchParams`, enabling persistent and shareable dashboard views with zero library overhead. | Ephemeral component `useState` (state lost on refresh) or heavy global state stores.           |

---

## 6. Engineering Evaluation & Assumptions

### Assumptions Documented & Validated

1. **Webhook Payload Flexibility**: The parser defensively extracts `full_name`, `email`, and `phone` regardless of field casing (`FIRST_NAME`, `full_name`) or order in `field_data`.
2. **Contact Retention Invariant**: A lead can be updated to change email or phone, but cannot have both removed simultaneously, ensuring lead records remain actionable.
3. **Audit Immutability**: Activity records are append-only (`INSERT` only, no `UPDATE` or `DELETE` endpoints exposed), guaranteeing audit trail compliance.
4. **Deterministic Sorting**: Primary sort on `created_at DESC` with secondary sort on `id DESC` (BIGSERIAL) guarantees stable pagination even when multiple activities share the same millisecond timestamp.
