# Lead Intake Service

A production-ready inbound lead intake service that ingests Meta Lead Ads webhooks, validates payloads, enforces deduplication and idempotency, tracks status workflow transitions, and records an immutable audit trail.

---

## System Architecture

```
                               ┌─────────────────────────────────────────┐
                               │             Meta Ads Webhook            │
                               └────────────────────┬────────────────────┘
                                                    │
                                         POST /webhook/meta-lead
                                 (HMAC-SHA256: X-Hub-Signature-256)
                                                    │
                                                    ▼
┌───────────────────────────────────────────────────────────────────────────────────────┐
│ Express Backend (Node.js 22 + TypeScript)                                             │
│                                                                                       │
│  ┌──────────────────────┐   ┌────────────────────────┐   ┌─────────────────────────┐  │
│  │ Webhook Module       │   │ Leads Module           │   │ Activities Module       │  │
│  │ • GET /webhook       │   │ • GET /leads (Paged)   │   │ • GET /leads/:id/       │  │
│  │   Handshake          │   │                        │   │   activities            │  │
│  │ • HMAC Signature     │   │ • GET /leads/:id       │   │                         │  │
│  │ • Defensive Mapper   │   │ • PATCH /leads/:id/    │   │ • Transactional Logging │  │
│  │ • Idempotency Guard  │   │   status               │   │                         │  │
│  └──────────┬───────────┘   └───────────┬────────────┘   └────────────┬────────────┘  │
└─────────────┼───────────────────────────┼─────────────────────────────┼───────────────┘
              │                           │                             │
              └───────────────────────────┼─────────────────────────────┘
                                          ▼ (Single DB Transactions)
                         ┌─────────────────────────────────┐
                         │   PostgreSQL 16                 │
                         │   • leads (JSONB raw_payload)   │
                         │   • activities (JSONB metadata) │
                         │   • Enums & Composite Indices   │
                         └─────────────────────────────────┘
                                          ▲
                                          │ Authorization: Bearer <API_KEY>
                         ┌────────────────┴────────────────┐
                         │ React 18 + TypeScript Dashboard │
                         │ • Inbound Lead List (Paged)     │
                         │ • Lead Details + Status Control │
                         │ • Real-time Audit Timeline      │
                         └─────────────────────────────────┘
```

---

## Key Features

1. **Meta Ads Webhook Verification**:
   - `GET /webhook/meta-lead`: Implements Meta's challenge handshake (`hub.mode=subscribe`, `hub.verify_token`, `hub.challenge`).
   - `POST /webhook/meta-lead`: Real-time cryptographic validation using HMAC-SHA256 (`X-Hub-Signature-256`) against `META_APP_SECRET` with constant-time equality check.
2. **Defensive Lead Extraction & Idempotency**:
   - Maps `field_data` defensively by field name without relying on array ordering.
   - Dedupes incoming leads by `leadgen_id` (`external_lead_id` unique index); duplicate delivery returns `200 duplicate_ignored` with zero data duplication.
3. **Strict Status Lifecycle**:
   - `NEW → CONTACTED → QUALIFIED → CONVERTED`, with `LOST` accessible from any non-terminal state.
   - Terminal states (`CONVERTED`, `LOST`) prevent further illegal transitions.
   - Idempotent no-op transitions return `200` without creating redundant audit rows.
4. **Transaction-Bound Audit Trail**:
   - Every creation and status change executes inside an ACID database transaction.
   - Secondary sorting on `activities.id` (BIGSERIAL) guarantees deterministic timeline order under millisecond collision.
5. **Dashboard & API Security**:
   - `Authorization: Bearer <API_KEY>` protection across all dashboard `/leads*` endpoints.
   - Rate limiting on public webhook endpoints.

---

## Getting Started

### Prerequisites

- Node.js >= 22.0.0
- Docker & Docker Compose (or local PostgreSQL)

### 1. Environment Setup

Copy sample environment files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 2. Local Development with Docker Compose

Run the entire system (Postgres, Backend API, and Frontend Dashboard):

```bash
docker-compose up --build
```

- **Frontend Dashboard**: `http://localhost:5173`
- **Backend API**: `http://localhost:3000`
- **PostgreSQL**: `localhost:5432`

### 3. Local Development (Manual)

Ensure Node 22 is active:

```bash
nvm use 22
npm install
```

Start the backend:

```bash
npm run dev:backend
```

Start the frontend:

```bash
npm run dev:frontend
```

Run database migrations:

```bash
npm run migrate:up
```

---

## Running Tests

All test suites can be executed across the monorepo:

```bash
nvm use 22
npm test
```

- **Backend Tests (37 tests)**: Vitest + Supertest covering HMAC cryptographic verification, payload parsing, status transition rules, API authentication, error handling, input sanitization, and complete webhook ingestion lifecycle.
- **Frontend Tests (20 tests)**: Vitest + React Testing Library covering UI components, status badges, pagination, table rendering, and audit activity timeline.

---

## API Reference

### Webhook Endpoints

- `GET /webhook/meta-lead?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...`
  - _Response_: 200 (echoes challenge) or 403 Forbidden.
- `POST /webhook/meta-lead`
  - _Headers_: `X-Hub-Signature-256: sha256=<hex>`
  - _Response_: `201 Created` (with lead) or `200 OK` (`{"status": "duplicate_ignored", "leadId": "..."}`).

### Dashboard Endpoints (Requires `Authorization: Bearer <API_KEY>`)

- `GET /leads?page=1&limit=20&status=NEW&search=john&sortBy=createdAt&sortOrder=desc`
  - _Response_: `200 OK` with paginated lead list.
- `GET /leads/:id`
  - _Response_: `200 OK` with complete lead details.
- `GET /leads/:id/activities`
  - _Response_: `200 OK` with chronological audit timeline.
- `PATCH /leads/:id/status`
  - _Body_: `{"status": "CONTACTED", "note": "Spoke on phone"}`
  - _Response_: `200 OK` with updated lead.

### Health Check

- `GET /health`
  - _Response_: `200 OK` (`{"status": "ok", "database": "connected"}`).

---

## Architectural Decisions & Trade-Offs

1. **Plain `pg` vs ORM (Prisma/TypeORM)**:
   - _Decision_: Plain `node-postgres` with parameterized SQL and `node-pg-migrate`.
   - _Rationale_: Zero black-box abstraction overhead, granular control over connection pooling, and explicit transactional locking (`FOR UPDATE`) for concurrent state transitions.
2. **Custom Fetch Client vs TanStack Query**:
   - _Decision_: Plain typed `fetch` wrapped in custom React hooks.
   - _Rationale_: For a focused 3-view dashboard, lightweight custom hooks minimize bundle size and eliminate unnecessary client-side caching complexity where the database audit trail is the immediate source of truth.
3. **Database-Level JSONB Payloads**:
   - _Decision_: Store `raw_payload` in `leads` and `metadata` in `activities` as `JSONB`.
   - _Rationale_: Preserves original webhook bodies for auditing and debugging unexpected third-party field additions without requiring immediate database schema migrations.

---

## Scaling Considerations & Production Readiness

1. **High-Throughput Asynchronous Ingestion**:
   - Under heavy webhook traffic spikes from large ad campaigns, synchronous DB writes can be decoupled by placing a message queue (such as Redis BullMQ, RabbitMQ, or AWS SQS) immediately after the HMAC verification step. A dedicated worker pool can then process leads idempotently.
2. **Read/Write DB Splitting**:
   - `GET /leads` listing and filtering queries can be routed to PostgreSQL read replicas, keeping the primary database unburdened for write transactions.
3. **Distributed Rate Limiting**:
   - Replace in-memory rate limiting with Redis-backed token bucket rate limiters to support horizontal scaling across multi-instance clusters.

---

## Deployment Steps (Railway)

1. Provision a managed **PostgreSQL** instance on Railway.
2. Create a **Backend Service** connected to the repository (root directory `./backend`):
   - Set environment variables: `DATABASE_URL`, `API_KEY`, `WEBHOOK_VERIFY_TOKEN`, `META_APP_SECRET`, `CORS_ORIGIN`.
   - Start command: `npm run migrate:up && npm start`.
3. Create a **Frontend Service** (root directory `./frontend`):
   - Set environment variables: `VITE_API_URL` (pointing to backend Railway URL) and `VITE_API_KEY`.
