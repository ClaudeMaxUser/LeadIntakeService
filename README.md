# Lead Intake Service

A production-ready inbound lead intake service that ingests Meta Lead Ads webhooks, validates payloads, enforces deduplication and idempotency, tracks status workflow transitions, and records an immutable audit trail.

---

## 1. Architecture

### System Architecture Diagram

```
                               ┌─────────────────────────────────────────┐
                               │             Meta Ads Webhook            │
                               └────────────────────┬────────────────────┘
                                                    │
                                         POST /webhook/meta-lead
                                 (HMAC-SHA256: X-Hub-Signature-256)
                                                    │
                                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Express Backend (Node.js 22 + TypeScript)                                              │
│                                                                                        │
│  ┌──────────────────────┐   ┌────────────────────────┐    ┌─────────────────────────┐  │
│  │ Webhook Module       │   │ Leads Module           │    │ Activities Module       │  │
│  │ • GET /webhook       │   │ • GET /leads (Paged)   │    │ • GET /leads/:id/       │  │
│  │   Handshake          │   │ • GET /leads/:id       │    │   activities            │  │
│  │ • HMAC Signature     │   │ • PATCH /leads/:id     │    │ • Transactional Logging │  │
│  │ • Defensive Mapping  │   │   (Profile Edit)       │    │   (LEAD_CREATED,        │  │
│  │ • Idempotency Guard  │   │ • PATCH /leads/:id/    │    │    LEAD_UPDATED,        │  │
│  │   (Conflict Safe)    │   │   status (FSM Guard)   │    │    STATUS_CHANGED)      │  │
│  └──────────┬───────────┘   └───────────┬────────────┘    └────────────┬────────────┘  │
└─────────────┼───────────────────────────┼──────────────────────────────┼───────────────┘
              │                           │                              │
              └───────────────────────────┼──────────────────────────────┘
                                          ▼ (Single ACID DB Transactions)
                         ┌──────────────────────────────────┐
                         │   PostgreSQL 16                  │
                         │   • leads (JSONB raw_payload)    │
                         │   • activities (JSONB metadata)  │
                         │   • Enums & Composite Indices    │
                         └──────────────────────────────────┘
                                          ▲
                                          │ Authorization: Bearer <API_KEY>
                         ┌────────────────┴─────────────────┐
                         │ React 18 + TypeScript Dashboard  │
                         │ • Inbound Lead List (Paged)      │
                         │ • Lead Details + Profile Editing │
                         │ • Status Transition Controls     │
                         │ • Real-time Audit Timeline       │
                         └──────────────────────────────────┘
```

### Architectural Highlights

1. **Meta Ads Webhook Verification**:
   - `GET /webhook/meta-lead`: Implements Meta's challenge handshake (`hub.mode=subscribe`, `hub.verify_token`, `hub.challenge`) with timing-safe comparison.
   - `POST /webhook/meta-lead`: Cryptographic verification using HMAC-SHA256 (`X-Hub-Signature-256`) against `META_APP_SECRET` using `crypto.timingSafeEqual`.
2. **Defensive Ingestion & Idempotency**:
   - Maps `field_data` defensively by field name without assuming array ordering or casing.
   - Atomic deduplication on `external_lead_id` (= `leadgen_id`). Duplicate deliveries return `200 OK` with `{ status: "duplicate_ignored" }` and write an audit event without creating duplicate rows.
3. **Finite State Machine (FSM) Lifecycle**:
   - Strictly enforced transitions: `NEW → CONTACTED → QUALIFIED → CONVERTED`, with `LOST` accessible from any non-terminal state.
   - Terminal states (`CONVERTED`, `LOST`) reject subsequent transitions with `400 Bad Request`.
   - Idempotent no-op status updates return `200 OK` without creating spurious audit noise.
4. **Comprehensive 3-Way Audit Trail**:
   - Every mutation and its corresponding activity record are committed **inside the same database transaction** (`withTransaction`).
   - Generates exact audit event types required by the brief:
     - `LEAD_CREATED`: When a new lead is ingested from Meta Ads.
     - `LEAD_UPDATED`: When contact information (`full_name`, `email`, `phone`) is modified via `PATCH /leads/:id`.
     - `STATUS_CHANGED`: When the sales pipeline stage is transitioned via `PATCH /leads/:id/status`.
     - `DUPLICATE_IGNORED`: When Meta resends an already-processed lead.
   - Deterministic sorting via `ORDER BY created_at DESC, id DESC` guarantees stability against sub-millisecond clock collisions.
5. **Security & Production Hardening**:
   - Parameterized SQL queries prevent SQL injection.
   - Strict Zod schemas with pre-validation sanitization pipelines (`.pipe()`) strip null-bytes (`\0`) and reject arbitrary unknown properties (`.strict()`).
   - Rate limiting on both public webhook endpoints and protected dashboard APIs.
   - Timing-safe authentication comparison protects API key verification against timing side-channel attacks.

---

## 2. Setup Instructions

### Prerequisites

- **Node.js**: >= 22.0.0
- **Docker & Docker Compose** (recommended for zero-friction setup)
- **Git**

### Environment Configuration

Copy the sample environment configuration for both services:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

| Variable               | Description                                            | Default (Local)                                           |
| :--------------------- | :----------------------------------------------------- | :-------------------------------------------------------- |
| `PORT`                 | Backend HTTP listening port                            | `3000`                                                    |
| `DATABASE_URL`         | PostgreSQL connection string                           | `postgres://postgres:postgres@localhost:5432/lead_intake` |
| `API_KEY`              | Dashboard API authorization key                        | `dev_secret_key_123`                                      |
| `WEBHOOK_VERIFY_TOKEN` | Meta Webhook GET verification token                    | `meta_webhook_verify_token_xyz`                           |
| `META_APP_SECRET`      | Meta App Secret for HMAC-SHA256 signature verification | `meta_test_secret_abc123`                                 |
| `VITE_API_URL`         | Frontend connection URL to backend API                 | `http://localhost:3000`                                   |
| `VITE_API_KEY`         | Frontend bearer token matching `API_KEY`               | `dev_secret_key_123`                                      |

### Option A: Local Run with Docker Compose (Recommended)

Spins up PostgreSQL 16, runs database migrations automatically, and starts both backend and frontend:

```bash
docker-compose up --build
```

- **Frontend Dashboard**: `http://localhost:5173`
- **Backend API**: `http://localhost:3000`
- **PostgreSQL**: `localhost:5432`

### Option B: Local Run (Manual)

1. **Install dependencies across the monorepo**:

   ```bash
   npm install
   ```

2. **Run database migrations**:
   Ensure PostgreSQL is running locally on port 5432, then execute:

   ```bash
   npm run migrate:up
   ```

3. **Start backend in development mode**:

   ```bash
   npm run dev:backend
   ```

4. **Start frontend in development mode**:
   ```bash
   npm run dev:frontend
   ```

### Running Tests

Execute 73 comprehensive automated tests across the monorepo:

```bash
npm test
```

- **Backend (49 tests)**: Vitest + Supertest covering HMAC cryptographic verification, payload parsing, status transition rules, API authentication, error handling, input sanitization, contact retention rules, and complete webhook ingestion lifecycle.
- **Frontend (24 tests)**: Vitest + React Testing Library covering UI components, status badges, pagination, table rendering, inline lead editing, and audit activity timeline.

---

## 3. Deployment Steps

The application is containerized with multi-stage Dockerfiles ready for deployment on **Railway**, **Render**, or any container platform.

### Deploying to Railway

1. **Create Railway Project**:
   - Log into Railway and select **New Project**.
   - Select **Provision PostgreSQL** to spin up a managed database.

2. **Deploy Backend Service**:
   - Click **New Service** → **GitHub Repo** → Select `LeadIntakeService`.
   - Set **Root Directory** to `/backend`.
   - Add Environment Variables in the Railway Dashboard:
     - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}` (uses Railway private reference)
     - `API_KEY`: Generate a secure random string (e.g. `openssl rand -hex 24`)
     - `WEBHOOK_VERIFY_TOKEN`: Your custom webhook verification string
     - `META_APP_SECRET`: Your Meta App Secret
     - `CORS_ORIGIN`: URL of your deployed frontend (e.g. `https://your-frontend.up.railway.app`)
     - `NODE_ENV`: `production`
   - Set **Start Command**:
     ```bash
     npm run migrate:up && npm start
     ```
   - Railway will build using `backend/Dockerfile` and automatically run pending database migrations on boot.

3. **Deploy Frontend Service**:
   - In the same project, click **New Service** → **GitHub Repo** → Select `LeadIntakeService`.
   - Set **Root Directory** to `/frontend`.
   - Add Environment Variables:
     - `VITE_API_URL`: Your backend Railway URL (e.g. `https://your-backend.up.railway.app`)
     - `VITE_API_KEY`: Matching `API_KEY` defined on the backend
   - Railway will build using `frontend/Dockerfile` (multi-stage build serving static assets with lightweight nginx).

4. **Verify Deployment**:
   - Ping the health check:
     ```bash
     curl https://your-backend.up.railway.app/health
     ```
     Expected response: `{"status": "ok", "database": "connected"}`.
   - Open your deployed frontend URL to view the live dashboard.

---

## 4. Architectural Decisions & Trade-Offs

| Decision                        | Chosen Solution                                                                           | Alternative Considered                | Rationale & Trade-Off                                                                                                                                                                                                                                                |
| :------------------------------ | :---------------------------------------------------------------------------------------- | :------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Database Access**             | Plain `pg` (node-postgres) + parameterized SQL                                            | Prisma / TypeORM / Drizzle            | **Trade-Off**: Writing hand-crafted SQL requires manual query authoring, but grants full transparency, zero ORM cold-start overhead, and precise transactional row locking (`SELECT ... FOR UPDATE`) critical for concurrency.                                       |
| **Database Migrations**         | `node-pg-migrate`                                                                         | ORM auto-sync / hand-run SQL          | **Trade-Off**: Schema changes are explicitly version-controlled and reversible in code, guaranteeing repeatable migrations across development, CI, and production containers.                                                                                        |
| **Frontend State Management**   | Custom hooks (`useLeads`, `useLead`, `useUpdateStatus`, `useUpdateLead`) + native `fetch` | TanStack Query / Redux Toolkit        | **Trade-Off**: For a focused 3-screen dashboard, lightweight custom hooks eliminate external dependency bloat (~40kB saved). Since audit trails must reflect server truth immediately, manual cache invalidation was bypassed in favor of explicit atomic refetches. |
| **Audit Payload Storage**       | `JSONB` for `raw_payload` & `metadata`                                                    | Normalized relational audit tables    | **Trade-Off**: JSONB fields cannot enforce relational foreign keys internally, but provide future-proof flexibility: webhook payloads and audit diffs outlive upstream schema changes without requiring database alterations.                                        |
| **Authentication Architecture** | Static Bearer API Key                                                                     | Full OAuth2 / JWT user accounts       | **Trade-Off**: For the specified assignment scope, API Key authentication secures dashboard endpoints against unauthorized access without the overhead of user registration, password hashing, and token refresh mechanisms.                                         |
| **Webhook Processing**          | Synchronous database transactions                                                         | Background message queue (BullMQ/SQS) | **Trade-Off**: Synchronous processing guarantees immediate consistency and simple failure feedback (`400`/`401`/`201`) to Meta's webhook runner. Under extreme traffic spikes, this trades throughput for simplicity (see Scaling Considerations).                   |

---

## 5. Scaling Considerations

If traffic grows from hundreds of leads per day to tens of thousands per hour during major marketing campaigns, the system can scale along the following axes:

1. **Asynchronous Webhook Ingestion via Message Queue**:
   - Decouple webhook ingestion from DB persistence by placing a lightweight message broker (e.g. Redis + BullMQ, AWS SQS, or Apache Kafka) immediately after the HMAC verification step.
   - The webhook endpoint acknowledges Meta with `200 OK` in < 20ms, while a horizontally autoscaled worker pool consumes the queue and executes idempotent inserts.
2. **Read/Write Database Splitting**:
   - The dashboard read traffic (`GET /leads`, `GET /leads/:id`, `GET /leads/:id/activities`) can be routed to PostgreSQL read replicas using connection pooling (e.g. PgBouncer).
   - The primary database handles only write transactions (`POST /webhook/meta-lead`, `PATCH /leads/:id*`).
3. **Table Partitioning & Cold Storage Archival**:
   - As the `activities` table accumulates millions of audit records, partition the table by `created_at` (monthly ranges).
   - Old activity logs (> 12 months) can be archived to columnar storage (ClickHouse, BigQuery, or Amazon S3/Parquet) for compliance while keeping hot query performance optimal.
4. **Distributed Cluster Rate Limiting**:
   - Replace the current in-memory rate limiter with Redis-backed sliding-window or token-bucket rate limiting (e.g. `rate-limiter-flexible`) to maintain consistent rate caps across multi-container clusters.

---

## 6. Future Improvements

1. **Multi-Tenant Organization & Workspace Isolation**:
   - Introduce an `organization_id` on all leads, activities, and API keys with PostgreSQL Row-Level Security (RLS) to support multi-client agency setups.
2. **Dynamic Meta Graph API Integration**:
   - Add OAuth2 handshake for Meta Business accounts allowing automated subscription management, Page token retrieval, and automated retrieval of custom form field metadata.
3. **Outbound Real-time Notifications & Webhooks**:
   - Implement outgoing webhooks and integrations (Slack, Microsoft Teams, SMS via Twilio, or email via Resend/SendGrid) to notify sales reps immediately when a lead is marked `QUALIFIED`.
4. **Granular Multi-User Role-Based Access Control (RBAC)**:
   - Introduce user accounts (`Admin`, `Sales Rep`, `Viewer`) where the `activities.actor` column stores the authenticated user's ID (`user:<id>`) alongside audit session metadata.
5. **Advanced CRM Capabilities**:
   - Add saved filter presets, custom date range filtering, bulk status updates, and CSV/Excel export functionality on the Lead List view.

---

## API Reference

### Webhook Endpoints

- `GET /webhook/meta-lead?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...`
  - _Response_: 200 (echoes challenge) or 403 Forbidden.
- `POST /webhook/meta-lead`
  - _Headers_: `X-Hub-Signature-256: sha256=<hex>`
  - _Response_: `201 Created` (emits `LEAD_CREATED`) or `200 OK` (`{"status": "duplicate_ignored", "leadId": "..."}`).

### Dashboard Endpoints (Requires `Authorization: Bearer <API_KEY>`)

- `GET /leads?page=1&limit=20&status=NEW&search=john&sortBy=createdAt&sortOrder=desc`
  - _Response_: `200 OK` with paginated lead list.
- `GET /leads/:id`
  - _Response_: `200 OK` with complete lead details.
- `GET /leads/:id/activities`
  - _Response_: `200 OK` with chronological audit timeline.
- `PATCH /leads/:id/status`
  - _Body_: `{"status": "CONTACTED", "note": "Spoke on phone"}`
  - _Response_: `200 OK` with updated lead (emits `STATUS_CHANGED`).
- `PATCH /leads/:id`
  - _Body_: `{"full_name": "Jane Smith", "email": "jane.smith@example.com", "phone": "+1987654321"}`
  - _Response_: `200 OK` with updated lead (emits `LEAD_UPDATED` with field diff metadata).

### Health Check

- `GET /health`
  - _Response_: `200 OK` (`{"status": "ok", "database": "connected"}`).
