# AGENT.md — Lead Intake Service

## Purpose & Overview

This document provides a transparent and detailed audit of all AI-assisted engineering activities conducted during the design, development, hardening, and verification of the **Lead Intake Service**.

Per the assignment specification, this document explicitly records:
1. **AI Tools Used**
2. **Prompts & Task Directives**
3. **AI-Generated Sections**
4. **Manually Written & Architecturally Guided Sections**
5. **Architecture Decision Records (ADR)**

---

## 1. AI Tools Used

| Tool | Model / Version | Role in Project | Scope of Usage |
| :--- | :--- | :--- | :--- |
| **Google Antigravity** | Gemini 3.8 Flash (Autonomous Agentic Coding) | Lead engineering pair-programmer & executor | Monorepo scaffolding, test generation, route & controller implementation, styling refactors, and test verification. |
| **Node.js Crypto & Vitest CLI** | Node.js v22.x built-ins / Vitest v2.1.9 | Cryptographic verification & test execution | Test runner executing 73 automated unit, integration, and end-to-end tests across backend and frontend. |

---

## 2. Prompts & Task Directives Log

The following table documents the progression of prompts, directives, and autonomous agent executions across the development lifecycle:

| Date | Tool | Prompt / Directive Summary | Primary Output | Human Review & Refinement | Files Touched |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 2026-09-23 | Antigravity | *"Scaffold monorepo, tooling, backend and frontend architecture per SPEC.md"* | Monorepo structure, root `package.json`, TypeScript configs, Docker Compose | Validated workspace dependencies, Node 22 engine targets, and Docker container networking. | `package.json`, `docker-compose.yml`, `backend/*`, `frontend/*`, `.gitignore` |
| 2026-09-23 | Antigravity | *"Generate initial node-pg-migrate schema and models for leads and activities"* | SQL DDL migrations with PostgreSQL ENUMs, UUID defaults, and composite indexes | Verified composite index `idx_activities_lead_created` for sub-millisecond timeline queries. | `backend/migrations/*`, `backend/src/modules/leads/types.ts` |
| 2026-09-23 | Antigravity | *"Implement core backend middleware, webhook HMAC verification, and lead service"* | HMAC-SHA256 signature verification, FSM status transition logic, Zod edge validation | Verified cryptographic constant-time comparison and FSM terminal state protection. | `backend/src/*`, `backend/tests/unit/*` |
| 2026-09-23 | Antigravity | *"Build complete React dashboard components, custom hooks, and pages"* | `LeadList`, `LeadDetail`, `ActivityTimeline`, `StatusBadge`, and data fetching hooks | Enforced clean component boundaries, loading skeletons, and empty state fallbacks. | `frontend/src/components/*`, `frontend/src/pages/*`, `frontend/src/hooks/*` |
| 2026-09-23 | Antigravity | *"Implement Supertest integration tests and RTL frontend component tests"* | Integration tests for auth and webhook parsing, RTL unit tests for UI components | Ensured tests ran deterministically without network dependencies. | `backend/tests/integration/*`, `frontend/src/components/**/*.test.tsx` |
| 2026-09-23 | Antigravity | *"Write comprehensive README.md with architecture diagram, trade-offs, and deployment"* | README documentation draft covering setup and architecture | Structured deployment steps and Docker quickstart. | `README.md` |
| 2026-09-23 | Antigravity | *"Review project end-to-end against evaluation criteria and identify gaps"* | Code review audit across security, concurrency, test coverage, and brief alignment | Identified webhook race conditions, timing attacks, and unexercised `LEAD_UPDATED` event. | `review.md`, `implementation_plan.md` |
| 2026-09-23 | Antigravity | *"Implement race-safe webhook idempotency and timing-safe API key auth"* | Atomic `INSERT ... ON CONFLICT DO NOTHING`, timing-safe SHA-256 comparison for API keys | Tested concurrent webhook posts to guarantee zero duplicate lead generation. | `backend/src/modules/webhook/service.ts`, `backend/src/middleware/apiKeyAuth.ts` |
| 2026-09-23 | Antigravity | *"Refactor frontend with CSS modules, ErrorBoundary, and Vite build ARGs"* | Extracted CSS Modules, created React ErrorBoundary for crash resilience | Replaced inline styles with maintainable CSS modules. | `frontend/Dockerfile`, `frontend/src/components/**/*`, `backend/src/modules/activities/*` |
| 2026-09-23 | Antigravity | *"Add full lifecycle end-to-end integration test against PostgreSQL"* | Comprehensive E2E test verifying webhook -> dedupe -> list -> detail -> status change -> audit log | Validated real PostgreSQL transaction rollback and foreign key integrity. | `backend/tests/integration/webhook-lifecycle.test.ts` |
| 2026-09-23 | Antigravity | *"Audit backend for vulnerabilities, timing attacks, query sanitization, and logger PII leaks"* | Null-byte query sanitization, hex string regex checks, log PII masking | Hardened against SQL parameter injection and log exposure. | `backend/src/modules/webhook/*`, `backend/src/middleware/*`, `backend/src/db/*` |
| 2026-09-23 | Antigravity | *"Refactor ActivityTimeline with CSS module and add unit tests"* | Clean CSS module styling and Vitest RTL suite for timeline component | Verified timeline icon mappings and relative timestamp format. | `frontend/src/components/ActivityTimeline/*` |
| 2026-09-23 | Antigravity | *"Implement PATCH /leads/:id to support Lead Updated audit requirement with production-grade validations"* | Added `PATCH /leads/:id`, `UpdateLeadSchema` with pipe sanitization, row locking, `LEAD_UPDATED` diff logging, and frontend edit form | Added contact retention rule (lead must retain email or phone) and strict phone regex. | `backend/src/modules/leads/*`, `frontend/src/**/*`, `SPEC.md`, `README.md` |

---

## 3. AI-Generated vs. Manually Written & Supervised Sections

To provide a clear distinction of engineering ownership, the table below highlights which parts were generated by AI and which were architected, constrained, and reviewed manually:

| Area / Component | AI-Generated Elements | Manually Written / Architectural Decisions |
| :--- | :--- | :--- |
| **Specification & Domain Scope** | Initial draft generation of API response contracts | **`SPEC.md` Contract Authoring**: Defined binding FSM transitions, database constraints, locked-in tech stack, and resolved assignment ambiguities. |
| **Database & Migrations** | Initial `node-pg-migrate` script syntax and boilerplate DDL | **Schema Design & Index Optimization**: Mandated explicit PostgreSQL ENUMs, `UUID` primary keys, `BIGSERIAL` autoincrement secondary sort for activities, and `JSONB` for payload extensibility. |
| **Webhook Ingestion** | Express handler boilerplate and field data extraction loops | **Security & Concurrency Invariants**: Mandated raw-body HMAC buffer hashing, timing-safe equality, atomic `ON CONFLICT DO NOTHING` idempotency, and defense against missing webhook array fields. |
| **Audit Event Design** | Activity logging service methods and SQL insert statements | **Transactional Integrity Guarantee**: Mandated that every state mutation and audit log insert happen inside the exact same database transaction (`withTransaction`) to eliminate orphan mutations. |
| **Lead Update Architecture** | Zod schema definition and React inline form controls | **Domain Gap Resolution**: Identified that `PATCH /leads/:id/status` alone did not satisfy the brief's `Lead Updated` requirement; architected `PATCH /leads/:id` with field diffing and contact method retention rules. |
| **Frontend Dashboard** | Component JSX structure, CSS Module definitions, and custom hook templates | **State & UX Strategy**: Decided against caching library bloat (TanStack Query) in favor of lightweight custom hooks where the audit timeline is the immediate source of truth; implemented ErrorBoundary crash resilience. |
| **Testing & Quality Assurance** | Test case boilerplate and mock lead data generation | **Test Strategy & Edge Cases**: Mandated specific security edge cases: timing attack resilience, null-byte injection, malformed UUIDs, terminal state lockouts, and duplicate resubmission idempotency. |

---

## 4. Architecture Decision Records (ADR Log)

The following architectural decisions were made during development to balance production readiness, security, and project scope:

| ADR ID | Decision | Rationale | Alternatives Considered |
| :--- | :--- | :--- | :--- |
| **ADR-01** | **Backend: Node.js + Express + TypeScript** | Matches ecosystem requirements; provides lowest overhead and highest developer velocity for REST endpoints. | NestJS (excessive boilerplate), Fastify (less ubiquitous ecosystem). |
| **ADR-02** | **Database: PostgreSQL 16** | Relational integrity with foreign keys, transactional DDL, ACID transactions for audit logs, and native JSONB indexing. | MongoDB (lacks native transactional ACID guarantees for audit trails across collections). |
| **ADR-03** | **Lead Schema: Real Meta Lead Ads Shape** | Ingests real Meta webhook structure (`leadgen_id`, `field_data[]`), demonstrating authentic enterprise integration competence. | Simplified mock schema (`name, email, phone`). |
| **ADR-04** | **Status FSM: Strict Transition Rules** | Enforces `NEW → CONTACTED → QUALIFIED → CONVERTED`, with `LOST` accessible from non-terminal states. Terminal states are immutable. | Unrestricted status updating (allows nonsensical transitions like `CONVERTED → NEW`). |
| **ADR-05** | **Auth: Bearer API Key with Timing-Safe Check** | Secures internal dashboard API while keeping authentication lightweight and auditable. Uses `crypto.timingSafeEqual` with SHA-256 padding. | Full JWT + User sessions (unnecessary scope bloat for an intake service). |
| **ADR-06** | **Webhook Security: Full Meta HMAC Verification** | Real `X-Hub-Signature-256` HMAC-SHA256 verification and `GET` challenge handshake; protects webhook endpoint from forged submissions. | Optional or disabled verification (security vulnerability). |
| **ADR-07** | **Idempotency: Atomic Conflict Resolution** | Database-level unique constraint on `external_lead_id` with `INSERT ... ON CONFLICT DO NOTHING`; retried webhooks return `200 duplicate_ignored`. | Application-level `SELECT-then-INSERT` (vulnerable to race conditions under concurrent spikes). |
| **ADR-08** | **List API: Comprehensive Query Capabilities** | Supports cursor/offset pagination, status filtering, multi-field search (`full_name`, `email`, `phone`), and allow-listed sorting. | Unpaginated full-table dump (fails under production load). |
| **ADR-09** | **Audit Trail: 3-Way Semantic Event Types** | Dedicated endpoints for status changes (`STATUS_CHANGED`), lead edits (`LEAD_UPDATED`), and webhook ingestion (`LEAD_CREATED`). | Conflating status changes as lead updates (creates audit ambiguity). |
| **ADR-10** | **Database Access: Plain `pg` + Parameterized SQL** | Zero black-box abstraction overhead, granular connection pooling control, and explicit row locking (`SELECT ... FOR UPDATE`). | Prisma / TypeORM (cold-start latency, abstraction leaks, migration rigidity). |
| **ADR-11** | **Frontend State: Custom Hooks + Native Fetch** | Eliminates external dependency weight (~40kB saved). Server audit log is the immediate source of truth. | TanStack Query / Redux Toolkit (unneeded complexity for a 3-screen view). |
| **ADR-12** | **Testing: Shared Vitest Across Monorepo** | Single test runner and configuration across backend and frontend, reducing CI maintenance overhead. | Jest (backend) + Vitest (frontend) configuration divergence. |
| **ADR-13** | **Deployment: Multi-stage Docker + Railway** | Multi-stage Dockerfiles compiling TypeScript to lean production images; automated migration step on container startup. | Manual cloud server setup / uncontainerized VPS. |

---

## 5. Engineering Evaluation & Assumptions

### Assumptions Documented & Validated

1. **Webhook Payload Flexibility**: The parser defensively extracts `full_name`, `email`, and `phone` regardless of field casing (`FIRST_NAME`, `full_name`) or order in `field_data`.
2. **Contact Retention Invariant**: A lead can be updated to change email or phone, but cannot have both removed simultaneously, ensuring lead records remain actionable.
3. **Audit Immutability**: Activity records are append-only (`INSERT` only, no `UPDATE` or `DELETE` endpoints exposed), guaranteeing audit trail compliance.
4. **Deterministic Sorting**: Primary sort on `created_at DESC` with secondary sort on `id DESC` (BIGSERIAL) guarantees stable pagination even when multiple activities share the same millisecond timestamp.
