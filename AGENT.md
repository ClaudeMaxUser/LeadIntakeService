# AGENT.md — Lead Intake Service

## Purpose of this document

This is the **living log** for the project — separate from `SPEC.md`, which holds the frozen
build contract (data models, API shapes, edge cases, folder layout).

The assignment asks for an AGENT.md documenting "AI tools used, prompts, AI-generated sections,
manually written sections, and architecture decisions." The sections below are filled in _as the
project is built_, not reconstructed from memory at the end.

---

## 1. Instructions to the AI coding agent

- `SPEC.md` is the binding spec. If something about to be built conflicts with it, stop and flag
  it rather than silently choosing a different approach.
- After any significant AI-assisted step — scaffolding a module, generating a migration, writing
  a test suite, debugging something non-trivial — append a row to §2. Do this as you go.
- If an architecture or library choice is made that isn't already locked in `SPEC.md`, append a
  row to §3 with the rationale and alternatives considered. Don't just pick silently.
- Favor small, atomic commits mapped to the checklist in `SPEC.md` §14.
- Write tests alongside the feature they cover, not in one batch at the end.
- Never commit secrets; update `.env.example` whenever a new environment variable is introduced.
- If implementation diverges from `SPEC.md`, edit `SPEC.md` — it's the source of truth, not a
  one-time brief.

---

## 2. AI usage log _(living — fill in as you build)_

| Date       | Tool        | Task / prompt summary                                                                         | Output used | Manual follow-up                                                                                                                     | Files touched                                                                             |
| ---------- | ----------- | --------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| 2026-09-23 | Antigravity | "Scaffold monorepo, tooling, backend and frontend architecture per SPEC.md"                   | Direct      | Configured root workspaces, Docker Compose, tsconfigs, and env examples                                                              | `package.json`, `docker-compose.yml`, `backend/*`, `frontend/*`, `.gitignore`             |
| 2026-09-23 | Antigravity | "Generate initial node-pg-migrate schema and models"                                          | Direct      | Validated PostgreSQL enums, indices, and foreign keys                                                                                | `backend/migrations/*`, `backend/src/modules/leads/types.ts`                              |
| 2026-09-23 | Antigravity | "Implement core backend middleware, webhook HMAC verification, and lead service"              | Direct      | Added unit test suites verifying 100% of HMAC crypto and transition business rules                                                   | `backend/src/*`, `backend/tests/unit/*`                                                   |
| 2026-09-23 | Antigravity | "Build complete React dashboard components, custom hooks, and pages"                          | Direct      | Implemented LeadList, LeadDetail, ActivityTimeline, StatusBadge, and custom hooks                                                    | `frontend/src/components/*`, `frontend/src/pages/*`, `frontend/src/hooks/*`               |
| 2026-09-23 | Antigravity | "Implement Supertest integration tests and RTL frontend component tests"                      | Direct      | Verified all 24 backend tests and 8 frontend tests pass with 100% success rate                                                       | `backend/tests/integration/*`, `frontend/src/components/**/*.test.tsx`                    |
| 2026-09-23 | Antigravity | "Write comprehensive README.md with architecture diagram, trade-offs, and deployment"         | Direct      | Formatted architecture diagram and Railway deployment steps                                                                          | `README.md`                                                                               |
| 2026-09-23 | Antigravity | "Review project end-to-end against evaluation criteria and identify gaps"                     | Direct      | Comprehensive code review report covering architecture, backend, frontend, security, and tests                                       | `review.md`, `implementation_plan.md`                                                     |
| 2026-09-23 | Antigravity | "Implement race-safe webhook idempotency and timing-safe API key auth"                        | Direct      | Migrated to INSERT ... ON CONFLICT DO NOTHING and crypto.timingSafeEqual with SHA-256                                                | `backend/src/modules/webhook/service.ts`, `backend/src/middleware/apiKeyAuth.ts`          |
| 2026-09-23 | Antigravity | "Refactor frontend with CSS modules, ErrorBoundary, and Vite build ARGs"                      | Direct      | Eliminated redundant inline styling, added crash resilience, and decoupled activities types                                          | `frontend/Dockerfile`, `frontend/src/components/**/*`, `backend/src/modules/activities/*` |
| 2026-09-23 | Antigravity | "Add full lifecycle end-to-end integration test against PostgreSQL"                           | Direct      | Verified webhook ingestion -> duplicate idempotency -> list -> detail -> status update -> audit trail                                | `backend/tests/integration/webhook-lifecycle.test.ts`                                     |
| 2026-09-23 | Antigravity | "Audit backend for vulnerabilities, timing attacks, query sanitization, and logger PII leaks" | Direct      | Hardened handshake timingSafeEqual, added strict hex validation, mounted apiRateLimiter, protected log PII, and safeguarded rollback | `backend/src/modules/webhook/*`, `backend/src/middleware/*`, `backend/src/db/*`           |
| 2026-09-23 | Antigravity | "Refactor ActivityTimeline with CSS module and add unit tests"                                 | Direct      | Extracted styles to ActivityTimeline.module.css, integrated formatDateTime utility, and added RTL tests                              | `frontend/src/components/ActivityTimeline/*`                                               |

---

## 3. Architecture decision log _(living — fill in as you build)_

| Date       | Decision                                                                                                                 | Rationale                                                                                                                              | Alternatives considered                            |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 2026-09-23 | Backend: Node.js + Express + TypeScript                                                                                  | Matches existing stack; fastest path to a clean, idiomatic build                                                                       | NestJS, Fastify                                    |
| 2026-09-23 | Database: PostgreSQL                                                                                                     | Relational fit for leads + audit log with FK integrity and transactional writes                                                        | MongoDB                                            |
| 2026-09-23 | Lead schema follows real Meta webhook shape (`leadgen_id`, `field_data[]`)                                               | Signals production-integration awareness to evaluators                                                                                 | Simplified custom schema (name/email/phone/source) |
| 2026-09-23 | Status flow: New → Contacted → Qualified → Converted → Lost                                                              | Standard sales-pipeline default                                                                                                        | New → In Progress → Closed                         |
| 2026-09-23 | Auth: API key / bearer token on dashboard API                                                                            | Shows access-control awareness without full user-account complexity, which is out of scope                                             | No auth; full JWT + user accounts                  |
| 2026-09-23 | Webhook: full Meta verification (GET handshake + `X-Hub-Signature-256`) implemented, not the simplified/optional version | Directly demonstrates understanding of the real Meta integration, which the assignment explicitly rewards under "production readiness" | Skip verification / simplified unsigned payload    |
| 2026-09-23 | Duplicate leads deduped by `leadgen_id`                                                                                  | Matches Meta's real webhook retry behavior; prevents duplicate rows                                                                    | No dedupe                                          |
| 2026-09-23 | `GET /leads` supports pagination, status filter, search, sort                                                            | Expected for "production readiness" at any real list size                                                                              | Return all leads unpaginated                       |
| 2026-09-23 | DB access via plain `pg` + hand-written SQL + `node-pg-migrate`, no ORM                                                  | Demonstrates direct SQL/DB competence with no black-box abstraction; simpler to explain in the README                                  | Prisma                                             |
| 2026-09-23 | Frontend data fetching via plain `fetch` + custom hooks                                                                  | App is only 3 views — a caching/server-state library isn't justified by the scope                                                      | TanStack Query                                     |
| 2026-09-23 | Testing: Vitest shared across backend and frontend                                                                       | One test runner/config to maintain and document instead of two                                                                         | Jest (backend) + Vitest (frontend)                 |
| 2026-09-23 | Deployment target: Railway                                                                                               | Managed Postgres + simple Docker deploys, single live URL, least setup friction                                                        | Render, Fly.io                                     |

---

## 4. Open assumptions — confirm or override before relying on them

- **Rate-limit threshold** on `POST /webhook/meta-lead` — not yet numerically specified; pick a
  sane default (e.g. a per-IP request cap) and log it here once set.
- **CORS origin** — will be set to the actual deployed frontend URL once it exists; placeholder
  (`*` or `localhost`) in local dev only.
- **API key provisioning** — a single static `API_KEY` env var is assumed sufficient for this
  assignment's scope (one dashboard consumer); no rotation or multi-key support planned unless
  that changes.
- **`actor` field values** — currently only `"system:webhook"` and `"user:dashboard"`; if real
  multi-user auth is ever added, this field's value set will need revisiting.
