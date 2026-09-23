# Lead Intake Service — Spec

This file is the binding build spec: the original assignment brief, the decisions made to fill
its gaps, and the detailed contract (data models, API shapes, edge cases, folder layout) an AI
coding tool or a human can build from without re-asking questions already answered here.

`AGENT.md` is the separate, living log: AI usage, architecture-decision history, and open
assumptions, filled in *as the project is built*.

---

## Part A — Original Assignment Brief

### Objective
Build a Lead Intake Service demonstrating architecture, ownership, engineering judgment, and
production readiness. AI tools are allowed and encouraged.

### Scenario
A Meta Ads webhook sends leads to your system. The application should receive, store, audit, and
display those leads.

### Frontend Requirements
- Lead List
- Lead Detail View
- Activity Timeline

### Backend Requirements
- `POST /webhook/meta-lead`
- `GET /leads`
- `GET /leads/:id`
- `PATCH /leads/:id/status`

### Audit Trail
Every action should generate an activity record: Lead Created, Lead Updated, Status Changed.

### Technology Stack (as given)
- **Frontend:** React + TypeScript
- **Backend:** Any backend technology: Node.js (Express/NestJS/Fastify), Golang,
  Python (FastAPI/Django), or comparable.
- **Database:** PostgreSQL or MongoDB
- **Deployment:** Docker

### Required Deliverables
- Source Code Repository
- Live Deployment URL
- README.md
- AGENT.md
- Minimum 12–15 meaningful Git commits

### README.md must cover
Architecture, Setup Instructions, Deployment Steps, Trade-offs, Scaling Considerations, and
Future Improvements.

### AGENT.md must cover
AI tools used, prompts, AI-generated sections, manually written sections, and architecture
decisions.

### AI Usage
AI tools are allowed and encouraged. Evaluated: engineering judgment, problem solving, ownership,
architecture decisions, and quality of the final solution.

### Evaluation Criteria
| Criterion | Weight |
|---|---|
| Architecture | 20% |
| Backend Design | 20% |
| Frontend Quality | 15% |
| Audit/Event Design | 10% |
| Deployment | 10% |
| README | 10% |
| AGENT.md | 5% |
| Git Commit Trail | 5% |
| Testing | 5% |

---

## Part B — Finalized Decisions (fill the gaps the brief leaves open)

| Area | Decision |
|---|---|
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL |
| DB access | Plain `pg` (node-postgres), hand-written parameterized SQL — **no ORM** |
| Migrations | `node-pg-migrate` |
| Validation | Zod |
| Frontend | React + TypeScript, plain `fetch` + custom hooks — **no TanStack Query** |
| Testing | **Vitest**, shared config for backend and frontend (+ Supertest for backend HTTP tests, + React Testing Library for frontend component tests) |
| Lead schema | Follows real Meta Lead Ads webhook shape (`leadgen_id`, `form_id`, `field_data[]`) |
| Status flow | `NEW → CONTACTED → QUALIFIED → CONVERTED`, with `LOST` reachable from any non-terminal state |
| Auth | API key / bearer token on all `/leads*` routes. Webhook route uses Meta's own signature scheme instead (see Part C §6) |
| Webhook verification | **Full** Meta verification implemented: `GET` `hub.challenge` handshake **and** `X-Hub-Signature-256` HMAC check on every POST — not the simplified/optional version |
| Duplicate leads | Deduped by `leadgen_id` (unique constraint) — resend returns `200 duplicate_ignored`, no second row |
| `GET /leads` | Pagination + status filter + search + sort |
| Deployment | Railway (managed Postgres + Docker deploy, one live URL) |
| Docs split | This file (`SPEC.md`) = brief + decisions + full contract. `AGENT.md` = living log only |

---

## Part C — Detailed Build Contract

### 1. Project overview

**In scope:** webhook ingestion, lead storage, status workflow, audit trail, a 3-screen frontend
(list / detail / timeline), API-key auth on the dashboard API, Docker packaging, tests, docs.

**Explicitly out of scope unless revisited:** multi-tenant support, real Meta OAuth app review
flow (App Review, permissions), outbound notifications (email/SMS to the lead), full user
login/accounts. These are reasonable "Future Improvements" for the README, not built now.

### 2. Locked-in stack

| Layer | Choice |
|---|---|
| Frontend | React + TypeScript |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL |
| DB access | `pg` + hand-written SQL |
| Migrations | `node-pg-migrate` |
| Validation | Zod |
| Server-state (frontend) | Plain `fetch` wrapped in custom hooks |
| Auth | API key / bearer token (dashboard API); HMAC signature (webhook) |
| Tests | Vitest (shared) + Supertest (backend HTTP) + React Testing Library (frontend) |
| Containerization | Docker + docker-compose |
| Deployment target | Railway |

### 3. Repository structure

```
/
├── backend/
│   ├── src/
│   │   ├── config/            # env loading, constants
│   │   ├── db/                # pg Pool singleton, query helper
│   │   ├── middleware/        # errorHandler, requestLogger, rateLimiter, apiKeyAuth
│   │   ├── modules/
│   │   │   ├── leads/         # controller, service, routes, zod schemas, types
│   │   │   ├── webhook/       # controller, service (payload mapping, idempotency, signature verify)
│   │   │   └── activities/    # service (write + query audit log)
│   │   ├── app.ts
│   │   └── server.ts
│   ├── migrations/            # node-pg-migrate migration files
│   ├── tests/
│   │   ├── unit/
│   │   └── integration/
│   ├── Dockerfile
│   ├── vitest.config.ts
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/                # typed fetch client (attaches API key header)
│   │   ├── hooks/               # useLeads, useLead, useUpdateStatus, useActivities
│   │   ├── components/
│   │   │   ├── LeadList/
│   │   │   ├── LeadDetail/
│   │   │   ├── ActivityTimeline/
│   │   │   ├── StatusBadge/
│   │   │   └── common/         # Loading, ErrorState, EmptyState, Pagination
│   │   ├── pages/               # LeadsPage.tsx, LeadDetailPage.tsx
│   │   ├── types/
│   │   └── App.tsx
│   ├── Dockerfile
│   ├── vitest.config.ts
│   └── .env.example
├── docker-compose.yml
├── README.md
├── SPEC.md
└── AGENT.md
```

### 4. Data models (PostgreSQL DDL)

```sql
CREATE TYPE lead_status AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST');
CREATE TYPE activity_type AS ENUM ('LEAD_CREATED', 'LEAD_UPDATED', 'STATUS_CHANGED', 'DUPLICATE_IGNORED');

CREATE TABLE leads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_lead_id  TEXT UNIQUE,                  -- Meta's leadgen_id — idempotency key
  full_name         TEXT NOT NULL,
  email             TEXT,
  phone             TEXT,
  source            TEXT NOT NULL DEFAULT 'meta_ads',
  page_id           TEXT,
  form_id           TEXT,
  ad_id             TEXT,
  status            lead_status NOT NULL DEFAULT 'NEW',
  raw_payload       JSONB NOT NULL,               -- full original webhook body
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE activities (
  id           BIGSERIAL PRIMARY KEY,             -- autoincrement: deterministic tiebreaker
  lead_id      UUID NOT NULL REFERENCES leads(id),
  type         activity_type NOT NULL,
  description  TEXT NOT NULL,                     -- e.g. "Status changed from NEW to CONTACTED"
  metadata     JSONB,                             -- e.g. { "from": "NEW", "to": "CONTACTED" }
  actor        TEXT NOT NULL DEFAULT 'system:webhook',   -- or 'user:dashboard' for API-key-authed changes
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_external_lead_id ON leads(external_lead_id);
CREATE INDEX idx_activities_lead_created ON activities(lead_id, created_at DESC, id DESC);
```

`raw_payload` and `metadata` as JSONB matter: they make the audit trail useful for debugging a
real incident, not just a log line — and they let audit data outlive later schema changes to the
typed columns.

### 5. API contracts

All routes below except the two webhook routes require `Authorization: Bearer <API_KEY>` (checked
against the `API_KEY` env var). Missing/invalid key → `401`.

#### `POST /webhook/meta-lead`  *(no API key — verified by signature instead, see §6)*
- `201` — lead created. Body: the created lead.
- `200` — `{ "status": "duplicate_ignored", "leadId": "<uuid>" }` when `external_lead_id` already exists.
- `400` — validation failure. Body: `{ "error": "...", "missingFields": [...] }`.
- `401` — missing/invalid `X-Hub-Signature-256`.
- `413` — payload too large.

#### `GET /webhook/meta-lead`  *(no API key — Meta's own verification handshake)*
- `200` — echoes `hub.challenge` if `hub.verify_token` matches `WEBHOOK_VERIFY_TOKEN`.
- `403` — token mismatch.

#### `GET /leads`
Query params: `page` (default 1), `limit` (default 20, max 100), `status` (filter), `search`
(matches name/email/phone), `sortBy` (allow-list: `createdAt`, `updatedAt`, `fullName`, `status`),
`sortOrder` (`asc`/`desc`).
- `200` — `{ "data": Lead[], "pagination": { "page", "limit", "total", "totalPages" } }`.
- `400` — invalid query params.
- `401` — missing/invalid API key.

#### `GET /leads/:id`
- `200` — full lead.
- `400` — `:id` not a valid UUID.
- `401` — missing/invalid API key.
- `404` — no lead with that id.

#### `GET /leads/:id/activities`
Returns the audit trail for one lead, newest-first, with a stable secondary sort (see §8).
- `200` — `Activity[]`.
- `401` — missing/invalid API key.
- `404` — lead not found.

#### `PATCH /leads/:id/status`
Body: `{ "status": "CONTACTED", "note"?: string }`.
- `200` — updated lead. Writes a `STATUS_CHANGED` activity with `actor: "user:dashboard"` (unless
  it's a true no-op — see §7).
- `400` — status not in enum, illegal transition, or missing `status` field.
- `401` — missing/invalid API key.
- `404` — lead not found.

#### `PATCH /leads/:id`
Body: `{ "full_name"?: string, "email"?: string | null, "phone"?: string | null }`.
- `200` — updated lead. Writes a `LEAD_UPDATED` activity with `actor: "user:dashboard"` containing
  diff metadata (`updatedFields`, `previous`, `current`), unless values are identical (no-op).
- `400` — validation failure (empty body, invalid email format, invalid phone characters, or unknown properties).
- `401` — missing/invalid API key.
- `404` — lead not found.

#### `GET /health`  *(no API key — deployment platform readiness check)*
- `200` — `{ "status": "ok" }`.

### 6. Webhook ingestion — Meta Ads lead webhook

Payload shape (mirrors Meta's real `field_data` structure):

```json
{
  "leadgen_id": "1234567890",
  "page_id": "111",
  "form_id": "222",
  "ad_id": "333",
  "created_time": "2026-09-20T10:00:00Z",
  "field_data": [
    { "name": "full_name", "values": ["Jane Doe"] },
    { "name": "email", "values": ["jane@example.com"] },
    { "name": "phone_number", "values": ["+1234567890"] }
  ]
}
```

Map `field_data` defensively: look up by `name`, take `values[0]`, tolerate missing/extra entries.

**Verification (implemented in full, not the simplified version):**
- **GET handshake:** Meta calls `GET /webhook/meta-lead?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...`
  once, on setup. Compare `hub.verify_token` to the `WEBHOOK_VERIFY_TOKEN` env var; if it matches,
  echo back `hub.challenge` as plain text with `200`; otherwise `403`.
- **POST signature:** every POST must carry `X-Hub-Signature-256: sha256=<hex>`. Compute
  HMAC-SHA256 of the *raw* request body using `META_APP_SECRET`, compare to the header
  (constant-time comparison). Mismatch or missing header → `401`, no lead created.

**Idempotency:** `external_lead_id` (= `leadgen_id`) has a unique DB constraint. On insert
conflict, don't error — return `200 duplicate_ignored`. This also covers Meta's real retry
behavior (webhooks are retried on non-2xx or timeout).

### 7. Status lifecycle & business rules

```
NEW → CONTACTED → QUALIFIED → CONVERTED
  ↘        ↘           ↘
   ───────── → LOST ←───
```

- `LOST` reachable from any non-terminal state.
- `CONVERTED` and `LOST` are terminal — further `PATCH .../status` calls return `400`.
- Setting status to its **current** value is accepted as a no-op: `200` with the unchanged lead,
  **no** new `STATUS_CHANGED` activity (avoids a noisy audit trail from double-submits).
- Every other transition writes an activity with `metadata: { from, to }` and a human-readable
  `description`, `actor: "user:dashboard"`.

### 8. Audit trail / activity timeline design

- Every mutation (lead create or update) and its activity row are written **inside the same DB
  transaction**. A lead should never exist without a matching `LEAD_CREATED` activity, and a
  status change should never be partially applied.
- `GET /leads/:id/activities` returns newest-first.
- Secondary sort key: `activities.id` (BIGSERIAL) alongside `created_at` — timestamps at
  millisecond resolution can collide under fast requests; the autoincrement id is the
  deterministic tiebreaker.
- `actor` is `"system:webhook"` for webhook-created events, `"user:dashboard"` for API-key-authed
  status changes from the UI.

### 9. Frontend requirements

- **Lead List** (`/leads`): paginated table — name, email/phone, status badge, created date.
  Status filter, search box, click-through to detail. Loading skeleton, empty state
  ("No leads yet"), error state with retry.
- **Lead Detail** (`/leads/:id`): all lead fields, a status-change control (dropdown + confirm,
  not optimistic — wait for the `PATCH` response before updating the UI, since the audit trail is
  the source of truth), raw payload available but collapsed/secondary.
- **Activity Timeline**: chronological list under/beside the detail view, one entry per activity —
  icon/color per `type`, description, relative timestamp.
- Null/optional fields render as `—`, not blank or `undefined`.
- Routing: React Router, two routes (`/leads`, `/leads/:id`).
- API key is read from a frontend env var and attached as `Authorization: Bearer <key>` on every
  request via the shared `api/` client.

### 10. Edge cases & validation checklist

**Webhook ingestion**
- [ ] Duplicate `leadgen_id` (retry) → idempotent, `200 duplicate_ignored`, no duplicate row.
- [ ] Missing required field (`full_name`, and at least one of `email`/`phone`) → `400`, no row created.
- [ ] Malformed JSON / wrong `Content-Type` → `400`.
- [ ] Missing or invalid `X-Hub-Signature-256` → `401`, no row created.
- [ ] Unexpected extra fields in payload → ignored, not rejected.
- [ ] Oversized body → `413` (explicit body-size limit in middleware).
- [ ] Two webhooks for the same `leadgen_id` near-simultaneously → DB unique constraint +
      transaction prevents a duplicate row even under a race.
- [ ] `field_data` entries with multiple `values` or unexpected order → take `values[0]`, don't
      assume array position.

**Dashboard API / auth**
- [ ] Missing `Authorization` header on any `/leads*` route → `401`.
- [ ] Malformed or wrong API key → `401`.

**Status updates**
- [ ] Status value outside the enum → `400`.
- [ ] Illegal transition (e.g. `CONVERTED → NEW`) → `400`, message lists allowed next states.
- [ ] `PATCH` on nonexistent lead → `404`.
- [ ] Setting status to its current value → `200`, no-op, no new activity.
- [ ] Concurrent `PATCH`es on the same lead → DB transaction around read-modify-write; each
      accepted transition is still individually logged.
- [ ] Missing `status` field in body → `400`.

**List / detail fetch**
- [ ] `:id` not a valid UUID → `400`, not `500`.
- [ ] Nonexistent `:id` → `404`.
- [ ] `page=0`, negative, or absurdly large `limit` → clamp/validate with sane defaults; `limit`
      capped at 100.
- [ ] Empty result set → `{ data: [], pagination: { total: 0, ... } }`, not an error.
- [ ] `search` containing SQL special characters → safe by construction via parameterized queries;
      never string-concatenate into raw SQL.
- [ ] `sortBy` not in the allow-list → `400`.

**Security / infra**
- [ ] Secrets (`DATABASE_URL`, `API_KEY`, `WEBHOOK_VERIFY_TOKEN`, `META_APP_SECRET`) via env vars
      only; `.env.example` committed, `.env` gitignored.
- [ ] CORS restricted to the deployed frontend origin in production.
- [ ] Basic rate limiting on `POST /webhook/meta-lead` (publicly reachable, signature-gated but
      still unauthenticated in the API-key sense).
- [ ] `GET /health` for the deployment platform's readiness checks.
- [ ] Schema changes go through `node-pg-migrate`, never a hand-run `ALTER TABLE`.
- [ ] Don't log full PII (email/phone) in plaintext application logs in production — mask or omit.

### 11. Non-functional requirements

- **Security:** parameterized queries only (`pg`'s `$1, $2...` placeholders), input validation at
  the edge (Zod), secrets never committed, API-key auth on the dashboard API, signature
  verification on the webhook, rate limiting on the public webhook route.
- **Performance:** unique index on `leads.external_lead_id` (idempotency lookup), composite index
  on `activities(lead_id, created_at, id)`; paginate everything that lists rows.
- **Scalability** (for the README's "Scaling Considerations," not built now): webhook ingestion
  could move to a queue (SQS/BullMQ) ahead of a worker if Meta's send rate ever outpaces
  synchronous DB writes; read replicas for `GET /leads` under heavy list traffic; `raw_payload`/
  `metadata` JSONB columns mean audit data can outlive schema changes to typed columns.

### 12. Testing requirements

- **Unit (Vitest):** status-transition validator, webhook payload mapper/validator, signature
  verification helper — pure functions, no DB.
- **Integration (Vitest + Supertest against a real test DB):**
  - webhook idempotency (same `leadgen_id` twice → one row, second call `duplicate_ignored`)
  - webhook signature verification (valid/invalid/missing signature)
  - API-key auth (missing/invalid key on protected routes → `401`)
  - full create → list → detail → status-update → timeline flow
  - every `400`/`404`/`401` case from §10 that's realistic to hit via HTTP
- **Frontend (Vitest + React Testing Library):** at least a render test for each of the three
  views plus one interaction test (status change flow).
- Don't chase 100% coverage — aim at the logic in §6–8, since audit/event design is 10% of the
  grade on its own.

### 13. Docker & deployment

- `docker-compose.yml` at repo root: `postgres`, `backend`, `frontend` services. Backend
  `Dockerfile` multi-stage (build TS → `dist`, run with plain `node` in production). Frontend
  `Dockerfile` builds the React app and serves the static output (nginx or similar).
- Migrations run via `node-pg-migrate` (`npm run migrate up`), either as a documented one-line
  command or a startup step in the backend container.
- Local dev: `docker-compose up` gets a working stack against a fresh Postgres, migrations applied
  automatically or via the documented command.
- Live deployment: Railway. Be explicit in the README's "Deployment Steps."

### 14. Git commit convention

Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`, `refactor:`). A natural path
satisfying the "12–15 meaningful commits" requirement without padding:

1. `chore: scaffold monorepo, tooling, eslint/prettier`
2. `feat: add DB schema + initial node-pg-migrate migration`
3. `feat: implement API key auth middleware`
4. `feat: implement webhook GET verification handshake + POST signature validation`
5. `feat: implement webhook ingestion + idempotency`
6. `test: unit tests for webhook payload validation + signature check`
7. `feat: implement GET /leads with pagination/filtering/search`
8. `feat: implement GET /leads/:id`
9. `feat: implement PATCH /leads/:id/status with transition rules`
10. `feat: wire activity log writes into lead create/update (transactional)`
11. `feat: implement GET /leads/:id/activities`
12. `test: integration tests for leads + webhook endpoints`
13. `feat: scaffold frontend, routing, API client with auth header`
14. `feat: Lead List page with pagination/filter/search`
15. `feat: Lead Detail page + status change control`
16. `feat: Activity Timeline component`
17. `chore: Dockerize backend + frontend, docker-compose, migration step`
18. `docs: README and AGENT.md`

(18 listed for slack — don't force a split that doesn't reflect real work.)
