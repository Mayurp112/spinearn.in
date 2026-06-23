# SpinEarn / SpinEarn — Project Architecture

> Version 1.0.0 | Last updated: 2026-06-22

---

## Table of Contents

1. [Project Overview and Vision](#1-project-overview-and-vision)
2. [System Architecture Diagram](#2-system-architecture-diagram)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Backend Architecture](#4-backend-architecture)
5. [Database Design](#5-database-design)
6. [API Architecture](#6-api-architecture)
7. [Authentication and Authorization Flow](#7-authentication-and-authorization-flow)
8. [Third-Party Integrations](#8-third-party-integrations)
9. [Deployment Architecture](#9-deployment-architecture)
10. [Security Considerations](#10-security-considerations)
11. [Scalability Strategy](#11-scalability-strategy)
12. [Monitoring and Logging](#12-monitoring-and-logging)
13. [Development Workflow](#13-development-workflow)
14. [Folder Structure](#14-folder-structure)
15. [Technology Stack Rationale](#15-technology-stack-rationale)
16. [Future Roadmap](#16-future-roadmap)

---

## 1. Project Overview and Vision

**SpinEarn** (published as SpinEarn) is a VS Code extension that monetizes developer idle time by displaying auctioned advertisements inside the AI spinner — the wait state shown while Claude Code or Codex processes a prompt. Developers earn 50% of every ad dollar their spinner generates. Advertisers get guaranteed human eyeballs from a verified, high-intent engineering audience.

### Value Proposition

| Stakeholder | Problem Solved | Value Delivered |
|---|---|---|
| Developer | Earns $0 while waiting for AI responses | Passive income proportional to AI usage |
| Advertiser | Hard to reach engineers at decision-making moment | Captive, distraction-free placement |
| Platform | N/A | 50% margin on every impression and click |

### Key Metrics (Design Targets)

- Impression confirmed only after >= 5 seconds of display (server-validated)
- Developer cap: 50 cents/hour, $5.00/day (fraud floor)
- Auction resolves in < 2ms (Redis ZSET O(log N))
- Kill switch latency: <= 60 seconds via polled `/api/v1/config`
- Global payouts: Razorpay Route (India), Wise Business (200+ countries)

---

## 2. System Architecture Diagram

```mermaid
flowchart TB
    subgraph DEV["Developer Machine"]
        EXT["VS Code Extension\n(TypeScript + esbuild)"]
        WEBVIEW["Webview Panel\nclaude_code_webview\ncodex_webview"]
    end

    subgraph INFRA["AWS EC2 — Docker Compose"]
        NGINX["Nginx\nReverse Proxy\n:80 / :443"]

        subgraph APP["Application Layer"]
            FASTAPI["FastAPI\n(Python 3.12 async)\n:8000"]
            NEXTJS["Next.js 14.2\n(React 18, App Router)\n:3000"]
        end

        subgraph WORKERS["Background Workers"]
            CELERY["Celery Workers\n(4 concurrent)"]
            BEAT["Celery Beat\n(Scheduler)"]
        end

        subgraph DATA["Data Layer"]
            PG["PostgreSQL 16\n:5432"]
            REDIS["Redis 7\n:6379\nAuction ZSET\nRate Limit\nBroker"]
        end
    end

    subgraph THIRD["Third-Party Services"]
        GOOGLE["Google OAuth2"]
        GITHUB["GitHub OAuth"]
        RAZORPAY["Razorpay\nPayments + Route\n(INR)"]
        WISE["Wise Business\nGlobal Payouts\n(200+ countries)"]
    end

    EXT -- "HTTPS REST" --> NGINX
    WEBVIEW -- "postMessage / fetch" --> EXT
    NGINX -- "/api/*" --> FASTAPI
    NGINX -- "/*" --> NEXTJS
    FASTAPI -- "SQLAlchemy async" --> PG
    FASTAPI -- "aioredis" --> REDIS
    CELERY -- "asyncpg" --> PG
    CELERY -- "Redis" --> REDIS
    BEAT -- "cron schedule" --> CELERY
    NEXTJS -- "API calls" --> FASTAPI
    FASTAPI -- "OAuth flow" --> GOOGLE
    FASTAPI -- "OAuth flow" --> GITHUB
    FASTAPI -- "payment collection" --> RAZORPAY
    FASTAPI -- "payout transfers" --> WISE
    CELERY -- "payout webhooks" --> RAZORPAY
```

---

## 3. Frontend Architecture

The dashboard is built on **Next.js 14.2** using the App Router (React Server Components + Client Components). It serves two distinct user types: developers checking earnings and advertisers managing campaigns.

### App Router Structure

```
frontend/
├── app/
│   ├── layout.tsx                  # Root layout, global providers
│   ├── page.tsx                    # Landing / marketing page
│   ├── (auth)/
│   │   ├── login/page.tsx          # Google / GitHub OAuth entry
│   │   └── callback/page.tsx       # OAuth redirect handler
│   ├── dashboard/
│   │   ├── layout.tsx              # Developer shell (sidebar, nav)
│   │   ├── page.tsx                # Earnings overview
│   │   ├── impressions/page.tsx    # Impression history table
│   │   ├── payouts/page.tsx        # Payout history + trigger
│   │   └── settings/page.tsx       # Payment provider setup
│   └── advertiser/
│       ├── layout.tsx              # Advertiser shell
│       ├── page.tsx                # Campaign list
│       ├── campaigns/
│       │   ├── new/page.tsx        # Create campaign + Razorpay checkout
│       │   └── [id]/page.tsx       # Campaign analytics
│       └── billing/page.tsx        # Ad spend history
├── components/
│   ├── ui/                         # Headless primitives (Button, Modal, Table)
│   ├── charts/                     # Recharts wrappers (EarningsChart, SpendChart)
│   ├── CampaignForm.tsx            # Controlled form with Zod validation
│   └── PayoutButton.tsx            # Trigger payout with status polling
├── lib/
│   ├── api.ts                      # Typed fetch wrapper (base URL from env)
│   ├── auth.ts                     # JWT token refresh + httpOnly cookie handling
│   └── hooks/
│       ├── useEarnings.ts          # SWR data fetching for developer stats
│       └── useCampaigns.ts         # SWR for advertiser campaign list
└── middleware.ts                   # Route guards — redirect unauthenticated users
```

### Rendering Strategy

| Route | Strategy | Rationale |
|---|---|---|
| Landing page | Static (SSG) | No auth needed, SEO important |
| Dashboard overview | Server Component + streaming | Initial load fast; earnings fetched server-side |
| Impression history | Client Component (SWR) | Paginated, real-time feel |
| Campaign form | Client Component | Complex controlled form state |
| Admin analytics | ISR (60s revalidate) | Acceptable staleness, cheap to serve |

---

## 4. Backend Architecture

### FastAPI Application

The backend is an **async-first FastAPI** application organized around domain routers. SQLAlchemy 2.0 with asyncpg provides non-blocking database access. Every request that touches the database acquires a session from an async connection pool.

```
backend/app/
├── config.py           # Pydantic Settings — env vars, secrets
├── database.py         # Async engine, session factory, Base
├── main.py             # FastAPI app init, CORS, router includes, lifespan
├── dependencies.py     # Shared deps: get_db, get_current_developer, rate_limit
├── models/
│   ├── developer.py
│   ├── advertiser.py
│   ├── campaign.py
│   ├── impression.py
│   ├── click.py
│   └── payout.py
├── routers/
│   ├── auth.py         # /api/v1/auth/*
│   ├── config.py       # /api/v1/config (kill switch)
│   ├── developers.py   # /api/v1/developers/*
│   ├── impressions.py  # /api/v1/impressions/*
│   ├── clicks.py       # /api/v1/clicks/*
│   ├── campaigns.py    # /api/v1/campaigns/*
│   ├── payouts.py      # /api/v1/payouts/*
│   └── webhooks.py     # /api/v1/webhooks/razorpay, /wise
├── services/
│   ├── auction.py      # Redis ZSET auction logic
│   ├── fraud.py        # Cap checks, device_id validation
│   ├── payout.py       # Razorpay Route + Wise transfer orchestration
│   ├── oauth.py        # Google + GitHub token exchange
│   └── jwt.py          # Token creation, verification, refresh
└── workers/
    ├── celery_app.py   # Celery app + Redis broker config
    ├── auction_sync.py # Hourly task: PostgreSQL → Redis ZSET
    └── payout_sync.py  # Polling task: Razorpay/Wise status → DB
```

### Redis Auction Engine

The real-time ad auction runs entirely in Redis for sub-millisecond latency:

```
Key: auction:active_campaigns
Type: ZSET
Score: bid_cpm (NUMERIC cast to float)
Member: campaign_id (UUID string)

Operations:
  ZREVRANGE auction:active_campaigns 0 0  → top bidder (O(log N))
  ZADD auction:active_campaigns <bid> <id> → add/update campaign
  ZREM auction:active_campaigns <id>       → remove exhausted campaign
```

Every hour, `auction_sync` Celery task rebuilds the ZSET from PostgreSQL `campaigns` where `status = 'active'` and `impressions_served < impressions_purchased`.

### Celery Workers

| Task | Schedule | Description |
|---|---|---|
| `auction_sync` | Every 60 minutes (beat) | Sync active campaigns from PG to Redis ZSET |
| `process_payout` | On-demand | Initiate Razorpay Route or Wise transfer |
| `poll_payout_status` | Every 10 minutes (beat) | Update payout status from provider API |
| `expire_pending_impressions` | Every 5 minutes (beat) | Clean unconfirmed impressions older than 2 minutes |

---

## 5. Database Design

### Entity Relationship Overview

```mermaid
erDiagram
    developers {
        UUID id PK
        TEXT google_id UK
        TEXT github_id UK
        TEXT email UK
        TEXT device_id UK
        CHAR country
        TEXT payment_provider
        TEXT razorpay_contact_id
        TEXT razorpay_fund_account_id
        BOOL razorpay_onboarded
        TEXT wise_recipient_id
        TEXT wise_currency
        BOOL wise_onboarded
        NUMERIC pending_balance
        NUMERIC paid_balance
        INT hourly_cap_cents
        INT daily_cap_cents
        BOOL blocked
        TEXT referral_code UK
        UUID referred_by_id FK
        INT referral_bonus_cents
        BOOL has_first_impression
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }
    advertisers {
        UUID id PK
        TEXT email UK
        TEXT name
        TIMESTAMP created_at
    }
    campaigns {
        UUID id PK
        UUID advertiser_id FK
        TEXT creative_text
        TEXT destination_url
        NUMERIC bid_cpm
        INT click_multiplier
        INT impressions_purchased
        INT impressions_served
        INT clicks_count
        NUMERIC total_spend
        TEXT status
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }
    impressions {
        TEXT impression_id PK
        UUID campaign_id FK
        UUID developer_id FK
        TEXT surface
        INT duration_ms
        NUMERIC developer_earn
        NUMERIC platform_earn
        INET ip_address
        TIMESTAMP confirmed_at
        TIMESTAMP created_at
    }
    clicks {
        UUID id PK
        TEXT impression_id FK
        UUID campaign_id FK
        UUID developer_id FK
        NUMERIC developer_earn
        NUMERIC platform_earn
        TIMESTAMP clicked_at
    }
    payouts {
        UUID id PK
        UUID developer_id FK
        INT amount_cents
        TEXT provider
        TEXT razorpay_payout_id
        INT amount_inr_paise
        TEXT wise_transfer_id
        TEXT status
        TEXT failure_reason
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    developers ||--o{ impressions : "earns from"
    developers ||--o{ clicks : "generates"
    developers ||--o{ payouts : "receives"
    developers }o--o| developers : "referred_by"
    advertisers ||--o{ campaigns : "owns"
    campaigns ||--o{ impressions : "served in"
    campaigns ||--o{ clicks : "receives"
    impressions ||--o| clicks : "leads to"
```

### Table Definitions and Indexes

#### `developers`
```sql
-- Primary lookup indexes
CREATE UNIQUE INDEX ix_developers_google_id ON developers (google_id) WHERE google_id IS NOT NULL;
CREATE UNIQUE INDEX ix_developers_github_id ON developers (github_id) WHERE github_id IS NOT NULL;
CREATE UNIQUE INDEX ix_developers_email ON developers (email);
CREATE UNIQUE INDEX ix_developers_device_id ON developers (device_id) WHERE device_id IS NOT NULL;
CREATE UNIQUE INDEX ix_developers_referral_code ON developers (referral_code);
-- Fraud query
CREATE INDEX ix_developers_blocked ON developers (blocked) WHERE blocked = true;
```

**Constraint notes:**
- `payment_provider` CHECK IN ('razorpay', 'wise')
- `hourly_cap_cents` DEFAULT 50, `daily_cap_cents` DEFAULT 500
- `referred_by_id` self-references `developers(id)` ON DELETE SET NULL
- `pending_balance` NUMERIC(12,6), `paid_balance` NUMERIC(12,6)

#### `campaigns`
```sql
CREATE INDEX ix_campaigns_advertiser_id ON campaigns (advertiser_id);
CREATE INDEX ix_campaigns_status ON campaigns (status);
-- Auction sync query: active campaigns with remaining capacity
CREATE INDEX ix_campaigns_auction ON campaigns (status, impressions_served, impressions_purchased)
  WHERE status = 'active';
```

**Constraint notes:**
- `creative_text` CHECK (char_length(creative_text) BETWEEN 3 AND 60)
- `status` CHECK IN ('pending_payment', 'active', 'exhausted', 'paused', 'cancelled')
- `click_multiplier` DEFAULT 50 (click pays 50x CPM unit)
- `bid_cpm` NUMERIC(10,4)

#### `impressions`
```sql
-- impression_id is nanoid TEXT (not UUID) for compact URL-safe IDs
CREATE INDEX ix_impressions_campaign_id ON impressions (campaign_id);
CREATE INDEX ix_impressions_developer_id ON impressions (developer_id);
-- Fraud: hourly earnings query
CREATE INDEX ix_impressions_developer_confirmed ON impressions (developer_id, confirmed_at DESC);
-- Surface analytics
CREATE INDEX ix_impressions_surface ON impressions (surface);
```

**Constraint notes:**
- `surface` CHECK IN ('claude_code_webview', 'codex_webview', 'cli')
- `duration_ms` must be >= 5000 (enforced in application layer before INSERT)
- `confirmed_at` is NULL until extension sends confirmation; unconfirmed rows are not counted for earnings

#### `clicks`
```sql
CREATE UNIQUE INDEX ix_clicks_impression_id ON clicks (impression_id); -- one click per impression
CREATE INDEX ix_clicks_campaign_id ON clicks (campaign_id);
CREATE INDEX ix_clicks_developer_id ON clicks (developer_id);
```

#### `payouts`
```sql
CREATE INDEX ix_payouts_developer_id ON payouts (developer_id);
CREATE INDEX ix_payouts_status ON payouts (status) WHERE status IN ('pending', 'processing');
```

**Constraint notes:**
- `status` CHECK IN ('pending', 'processing', 'completed', 'failed')
- `provider` CHECK IN ('razorpay', 'wise')
- `amount_inr_paise` only populated for Razorpay payouts; Wise uses `wise_transfer_id`

---

## 6. API Architecture

All API routes are prefixed `/api/v1/`. The extension communicates exclusively with authenticated REST endpoints.

### Auth Domain — `/api/v1/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/auth/google` | None | Redirect to Google OAuth2 consent |
| GET | `/auth/google/callback` | None | Exchange code, set httpOnly cookie, return JWT |
| GET | `/auth/github` | None | Redirect to GitHub OAuth consent |
| GET | `/auth/github/callback` | None | Exchange code, issue tokens |
| POST | `/auth/refresh` | Cookie | Rotate refresh token, return new access JWT |
| POST | `/auth/logout` | Bearer | Invalidate refresh token, clear cookie |

### Config Domain — `/api/v1/config`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/config` | None | Kill switch: `{"enabled": true, "min_version": "1.0.0"}` |

Extension polls this every 60 seconds. If `enabled: false` or extension version < `min_version`, all ad serving halts.

### Developer Domain — `/api/v1/developers`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/developers/me` | Bearer | Profile + balances + caps |
| PATCH | `/developers/me` | Bearer | Update payment provider preferences |
| POST | `/developers/me/onboard/razorpay` | Bearer | Create Razorpay contact + fund account |
| POST | `/developers/me/onboard/wise` | Bearer | Register Wise recipient |
| GET | `/developers/me/earnings` | Bearer | Daily/weekly/monthly earnings summary |

### Impression Domain — `/api/v1/impressions`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/impressions/next` | Bearer | Auction lookup → return winning ad creative |
| POST | `/impressions/{impression_id}/confirm` | Bearer | Validate duration_ms >= 5000, credit earnings |
| GET | `/impressions` | Bearer | Paginated impression history for developer |

The `POST /impressions/next` flow:
1. Fraud check: is developer blocked? Is hourly/daily cap reached?
2. `ZREVRANGE auction:active_campaigns 0 0` → winning campaign_id
3. Create impression row (unconfirmed) with nanoid primary key
4. Return `{impression_id, creative_text, destination_url, click_url}`

### Click Domain — `/api/v1/clicks`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/clicks/{impression_id}` | Bearer | Record click, credit `click_multiplier * cpm_unit` |

Click earnings = `(bid_cpm / 1000) * click_multiplier * 0.50` to developer.

### Campaign Domain — `/api/v1/campaigns`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/campaigns` | Advertiser JWT | Create campaign + Razorpay order |
| GET | `/campaigns` | Advertiser JWT | List own campaigns |
| GET | `/campaigns/{id}` | Advertiser JWT | Campaign analytics |
| PATCH | `/campaigns/{id}` | Advertiser JWT | Pause / cancel |

### Payout Domain — `/api/v1/payouts`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/payouts/request` | Bearer | Trigger payout from pending_balance |
| GET | `/payouts` | Bearer | Payout history |

### Webhook Domain — `/api/v1/webhooks`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/webhooks/razorpay` | HMAC sig | Payment capture + payout status events |
| POST | `/webhooks/wise` | Token header | Transfer completed / failed events |

---

## 7. Authentication and Authorization Flow

```mermaid
sequenceDiagram
    participant EXT as VS Code Extension
    participant API as FastAPI /api/v1
    participant REDIS as Redis
    participant PG as PostgreSQL
    participant GOOGLE as Google OAuth2

    Note over EXT,GOOGLE: Initial Sign-In
    EXT->>API: GET /auth/google
    API-->>EXT: 302 → Google consent URL
    EXT->>GOOGLE: User approves OAuth scope
    GOOGLE-->>API: GET /auth/google/callback?code=xxx
    API->>GOOGLE: Exchange code → id_token + userinfo
    API->>PG: UPSERT developers (google_id, email) RETURNING *
    API->>API: Sign access_token (15 min, HS256)
    API->>API: Sign refresh_token (30 days, HS256)
    API-->>EXT: Set-Cookie: refresh_token (httpOnly, Secure, SameSite=Strict)
    API-->>EXT: {"access_token": "eyJ...", "token_type": "bearer"}

    Note over EXT,API: Authenticated Request
    EXT->>API: POST /impressions/next\nAuthorization: Bearer <access_token>
    API->>API: Verify JWT signature + exp
    API->>PG: SELECT developers WHERE id = sub
    API->>REDIS: Rate limit check (sliding window)
    API->>REDIS: ZREVRANGE auction:active_campaigns 0 0
    API->>PG: INSERT impressions (unconfirmed)
    API-->>EXT: {impression_id, creative_text, destination_url}

    Note over EXT,API: Token Refresh
    EXT->>API: POST /auth/refresh\nCookie: refresh_token=xxx
    API->>API: Verify refresh_token signature + exp
    API->>API: Issue new access_token (15 min)
    API->>API: Rotate refresh_token (30 days)
    API-->>EXT: Set-Cookie: refresh_token (new)\n{"access_token": "eyJ...new"}
```

### Authorization Levels

| Role | Identifier | Access |
|---|---|---|
| Developer | JWT sub = developer UUID | Own impressions, earnings, payouts |
| Advertiser | JWT sub = advertiser UUID, role claim | Own campaigns, billing |
| Platform Admin | Internal header + IP whitelist | All data, manual overrides |

---

## 8. Third-Party Integrations

### Google OAuth2

- Scopes: `openid email profile`
- Flow: Authorization Code with PKCE (state param = random nonce stored in Redis 5 min)
- `google_id` stored as unique identifier; email may change, google_id does not
- GitHub OAuth follows same pattern; `github_id` stored separately

### Razorpay

**Advertiser payment collection:**
1. `POST /campaigns` → backend creates Razorpay Order (`amount = impressions * bid_cpm / 1000 * 100` paise)
2. Frontend opens Razorpay Checkout.js in modal
3. `payment.captured` webhook → campaign status flipped to `active` → added to Redis ZSET

**Indian developer payouts via Razorpay Route:**
1. Developer onboards: `POST /developers/me/onboard/razorpay`
   - Creates Razorpay Contact (`razorpay_contact_id`)
   - Creates Fund Account with bank details (`razorpay_fund_account_id`)
   - Sets `razorpay_onboarded = true`
2. Payout triggered: Celery task calls Razorpay Payout API
   - Stores `razorpay_payout_id`, sets status `processing`
3. `payout.processed` / `payout.failed` webhook → update `payouts.status`

### Wise Business

**Global developer payouts (non-India):**
1. Developer onboards: `POST /developers/me/onboard/wise`
   - Registers Wise recipient (email or account details)
   - Stores `wise_recipient_id`, `wise_currency`
2. Payout: Celery task creates Wise Transfer
   - `amount_cents` converted to `wise_currency` at Wise spot rate
   - Stores `wise_transfer_id`, sets status `processing`
3. Wise webhook → `transfer.completed` / `transfer.failed` → update status

### Payout Routing Logic

```python
if developer.country == "IN":
    provider = "razorpay"   # Razorpay Route (INR)
else:
    provider = "wise"       # Wise Business (local currency)
```

---

## 9. Deployment Architecture

### Docker Compose (7 Containers)

```mermaid
flowchart LR
    INET["Internet\n:80/:443"]
    subgraph COMPOSE["Docker Compose — spinads-network bridge"]
        NGINX["nginx\n:80→3000/8000"]
        FRONTEND["frontend\nNext.js :3000"]
        BACKEND["backend\nFastAPI :8000\ngunicorn + uvicorn workers"]
        CELERY["celery\n4 concurrent workers"]
        BEAT["celery_beat\ncron scheduler"]
        PG["postgres\nPostgreSQL 16 :5432\nvolume: pgdata"]
        REDIS["redis\nRedis 7 :6379\nvolume: redisdata"]
    end

    INET --> NGINX
    NGINX -->|"/*"| FRONTEND
    NGINX -->|"/api/*"| BACKEND
    BACKEND --> PG
    BACKEND --> REDIS
    CELERY --> PG
    CELERY --> REDIS
    BEAT --> REDIS
    FRONTEND --> BACKEND
```

### Nginx Routing Rules

```nginx
location /api/ {
    proxy_pass http://backend:8000;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}

location / {
    proxy_pass http://frontend:3000;
}
```

SSL termination at Nginx (Let's Encrypt / ACM certificate).

### EC2 Scaling Tiers

| Tier | Infrastructure | Monthly Cost | Developer Capacity |
|---|---|---|---|
| Tier 1 | Single EC2 t3.large (all 7 containers) | ~$63/mo | 0 – 500 devs |
| Tier 2 | EC2 t3.large + RDS db.t3.medium + ElastiCache r7g.medium | ~$192/mo | 500 – 2,000 devs |
| Tier 3 | ALB + 2x EC2 c5.xlarge + RDS Multi-AZ + ElastiCache cluster | ~$444/mo | 2,000 – 5,000 devs |

**Tier 1 → Tier 2 trigger:** CPU > 70% sustained 15 min OR DB connections > 80% of max_connections.

**Tier 2 → Tier 3 trigger:** Active developers > 1,500 OR p99 API latency > 500ms.

---

## 10. Security Considerations

### JWT Security

- Access token TTL: 15 minutes (short enough to limit breach window)
- Refresh token TTL: 30 days, stored in httpOnly + Secure + SameSite=Strict cookie (immune to XSS)
- Algorithm: HS256 with 256-bit secret from environment (never committed)
- Refresh token rotation: every refresh issues a new refresh token; old is invalidated
- Logout: refresh token blocklisted in Redis (TTL = remaining token lifetime)

### Fraud Prevention

| Control | Mechanism | Enforcement Layer |
|---|---|---|
| Hourly earnings cap | 50 cents/hour | Application layer (fraud.py), checked before impression creation |
| Daily earnings cap | $5.00/day | Application layer, aggregate query on confirmed impressions |
| Impression duration | >= 5 seconds | Server-side: `duration_ms >= 5000` validated in `/confirm` |
| Device uniqueness | `device_id` UNIQUE constraint | Database constraint + app layer on first registration |
| IP abuse | `ip_address` stored per impression | Flagging and manual review |
| Account block | `developers.blocked = true` | Checked on every impression/click request |
| One click per impression | UNIQUE constraint on `clicks(impression_id)` | Database constraint |

### Network Security

- All external traffic TLS 1.2+ (enforced at Nginx)
- Internal Docker network traffic: bridge network, no external exposure except Nginx
- PostgreSQL and Redis ports bound to `127.0.0.1` (not 0.0.0.0) inside Docker network
- CORS: FastAPI allows only the dashboard origin and extension origin (configurable in config.py)
- Content Security Policy on Next.js responses (no inline scripts, no external origins)
- Razorpay webhook signature verified with HMAC-SHA256 before any DB write
- Wise webhook token verified via shared secret header

### Extension Security

- Kill switch polled every 60 seconds: if `enabled: false`, extension stops all ad requests immediately
- `min_version` check: forces update before serving ads on outdated extension versions
- Extension never stores JWT in plaintext; uses VS Code SecretStorage API

---

## 11. Scalability Strategy

### Horizontal Scaling Approach

The architecture is designed so that FastAPI workers are stateless — all shared state lives in PostgreSQL and Redis. Adding EC2 instances behind an ALB requires no application changes at Tier 3.

```mermaid
flowchart TB
    ALB["AWS ALB"] --> EC2A["EC2 Instance A\n(nginx + backend + frontend + celery)"]
    ALB --> EC2B["EC2 Instance B\n(nginx + backend + frontend + celery)"]
    EC2A --> RDS["RDS PostgreSQL 16\n(Multi-AZ)"]
    EC2B --> RDS
    EC2A --> ELASTICACHE["ElastiCache Redis 7\n(cluster mode)"]
    EC2B --> ELASTICACHE
    BEAT_SINGLE["Single celery_beat\n(EC2A only)"] --> ELASTICACHE
```

### Redis Auction Scalability

The ZSET auction is O(log N) per lookup regardless of campaign count. At 10,000 active campaigns, lookup is still < 1ms. The hourly sync from PostgreSQL keeps Redis as the fast-path; PostgreSQL is only the source of truth.

### Database Read Scaling

At Tier 3, a PostgreSQL read replica handles:
- Impression history queries (developer dashboard)
- Campaign analytics (advertiser dashboard)
- Audit queries

Write queries (impression creation, earnings credit) always go to primary.

### Connection Pooling

SQLAlchemy async engine uses `asyncpg` with `pool_size=10`, `max_overflow=20` per worker. At Tier 2+, `PgBouncer` sits between FastAPI and RDS in transaction pooling mode.

---

## 12. Monitoring and Logging

### Structured Logging

FastAPI uses Python `structlog` with JSON output. Every request log includes:
- `request_id` (UUID generated in middleware)
- `developer_id` (from JWT, if authenticated)
- `path`, `method`, `status_code`, `duration_ms`
- `campaign_id` on impression/click events

Log levels: DEBUG (dev), INFO (staging/prod). ERROR and above trigger alerts.

### Key Metrics to Instrument

| Metric | Tool | Alert Threshold |
|---|---|---|
| API p99 latency | Prometheus + Grafana | > 500ms |
| Impression confirm rate | Custom counter | < 80% (fraud signal) |
| Redis ZSET size | Redis INFO | 0 (all campaigns exhausted) |
| Celery queue depth | Flower | > 100 tasks |
| PostgreSQL connections | pg_stat_activity | > 80% of max_connections |
| Payout failure rate | Custom gauge | > 5% of attempted payouts |

### Health Checks

- `GET /api/v1/health` — checks DB connectivity + Redis ping, used by Docker healthcheck and ALB target group
- Celery worker liveness: Flower dashboard + beat heartbeat every 60 seconds

### Error Tracking

Sentry SDK integrated in both FastAPI (Python) and Next.js (browser). `SENTRY_DSN` injected via environment. Unhandled exceptions and slow transactions (> 1s) automatically captured.

---

## 13. Development Workflow

### Local Setup

```bash
# 1. Clone + environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# 2. Start all services
docker compose up -d postgres redis

# 3. Run migrations
cd backend && alembic upgrade head

# 4. Start backend (hot reload)
uvicorn app.main:app --reload --port 8000

# 5. Start frontend (hot reload)
cd frontend && npm run dev

# 6. Build extension
cd extension && npm run build
# Load unpacked from extension/dist in VS Code Extension Host
```

### Environment Variables (Required)

```
# backend/.env
DATABASE_URL=postgresql+asyncpg://spinads:password@localhost:5432/spinads
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=<256-bit-random>
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
WISE_API_KEY=
WISE_PROFILE_ID=
```

### Database Migrations

Alembic is used for all schema changes. Migration files live in `backend/alembic/versions/`.

```bash
# Create new migration
alembic revision --autogenerate -m "add_column_developers_foo"

# Apply migrations
alembic upgrade head

# Rollback one step
alembic downgrade -1
```

### Extension Development

```bash
cd extension
npm install
npm run build          # esbuild bundle → dist/extension.js
npm run watch          # incremental rebuild on change
npm run package        # vsce package → spinads-1.0.0.vsix
npm run publish        # vsce publish (requires VSCE_PAT env var)
```

Extension entry point: `extension/src/extension.ts`
Activation: `onStartupFinished` (loads after VS Code is fully ready, not on every file open)

### Branch Strategy

- `main` — production-ready, protected
- `develop` — integration branch
- `feature/*` — individual features, PR to develop
- `hotfix/*` — critical production fixes, PR directly to main + cherry-pick to develop

---

## 14. Folder Structure

```
spinads/
├── backend/
│   ├── app/
│   │   ├── config.py           # Pydantic BaseSettings, reads .env
│   │   ├── database.py         # SQLAlchemy async engine + session
│   │   ├── main.py             # FastAPI app, lifespan, router includes
│   │   ├── dependencies.py     # Reusable FastAPI Depends
│   │   ├── models/             # SQLAlchemy ORM model classes
│   │   ├── routers/            # FastAPI APIRouter modules per domain
│   │   ├── services/           # Business logic (auction, fraud, payout, oauth)
│   │   └── workers/            # Celery app + task definitions
│   ├── alembic/
│   │   ├── env.py              # Alembic async migration environment
│   │   └── versions/           # Timestamped migration files
│   ├── tests/
│   │   ├── conftest.py         # Pytest fixtures (test DB, test client)
│   │   ├── test_impressions.py
│   │   ├── test_auction.py
│   │   └── test_fraud.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── app/                    # Next.js App Router pages + layouts
│   ├── components/             # Reusable React components
│   ├── lib/                    # API client, auth helpers, hooks
│   ├── public/                 # Static assets
│   ├── Dockerfile
│   ├── next.config.js
│   └── package.json
├── extension/
│   ├── src/
│   │   ├── extension.ts        # VS Code activation, command registration
│   │   ├── adSpinner.ts        # Spinner intercept + ad webview injection
│   │   ├── authProvider.ts     # OAuth flow, token storage (SecretStorage)
│   │   ├── apiClient.ts        # Typed fetch wrapper, auto-refresh
│   │   └── statusBar.ts        # Status bar item (earnings, connection state)
│   ├── dist/                   # esbuild output (gitignored)
│   ├── package.json            # publisher: spinads, version: 1.0.0
│   └── tsconfig.json
├── nginx/
│   └── nginx.conf              # Reverse proxy config
├── docker-compose.yml          # 7-container orchestration
├── .env.example                # Template for required env vars
└── PROJECT_ARCHITECTURE.md     # This file
```

---

## 15. Technology Stack Rationale

### FastAPI over Django / Flask

- **Async-native:** Every impression request hits Redis and PostgreSQL. With Django ORM (sync), 100 concurrent requests mean 100 blocked threads. FastAPI + asyncpg handles 100 concurrent requests on a single thread via event loop.
- **Auto-generated OpenAPI docs:** Useful for the VS Code extension team to validate request/response shapes without synchronization overhead.
- **Pydantic validation:** Request body validation, environment config, and response serialization all use the same library — no impedance mismatch.

### SQLAlchemy 2.0 Async over raw asyncpg

- ORM relationships allow clean model definitions without writing JOIN queries manually.
- Alembic integration for migrations is first-class.
- Raw asyncpg is still available for performance-critical bulk queries (e.g., hourly auction sync iterates 10k rows with `fetchmany`).

### Redis ZSET for Auction

- O(log N) `ZREVRANGE` to get the top bidder — deterministic, fast, no locking.
- ZSET naturally handles bid updates (`ZADD NX / XX` semantics).
- Redis keeps auction hot in memory; PostgreSQL is the durable source of truth.
- Alternative considered: PostgreSQL `SELECT ... ORDER BY bid_cpm DESC LIMIT 1` — 10–30ms, unacceptable for impression path latency target of < 5ms total.

### Celery over AWS Lambda / cron

- At Tier 1 (single EC2), Lambda would add network roundtrip and cold-start latency for the payout polling job.
- Celery beat is co-located with the app, zero additional infrastructure cost.
- Migrating to SQS + Lambda at Tier 3 is a straightforward swap (Celery supports SQS as broker).

### Next.js 14.2 App Router over plain React SPA

- React Server Components reduce JavaScript bundle size on dashboard (earnings charts, impression tables) — no client-side data fetching waterfalls.
- Middleware-based route guards (`middleware.ts`) are simpler than client-side auth redirects.
- Built-in image optimization for any ad creative preview thumbnails.

### TypeScript + esbuild for Extension

- esbuild produces a single `dist/extension.js` in < 100ms — critical for VS Code Marketplace packaging (`vsce package` rejects large bundles).
- TypeScript gives compile-time guarantees on VS Code API usage (webview messaging, SecretStorage, commands).

### Razorpay + Wise over Stripe

- Stripe requires a registered business entity with a US/EU/UK bank account. The founder is India-based with no registered entity yet.
- Razorpay handles INR collection from advertisers and INR payouts to Indian developers via Route — same vendor, no forex.
- Wise Business covers the remaining 200+ countries with competitive FX rates and local bank transfers.

---

## 16. Future Roadmap

### Near-Term (0–3 months)

- **CLI surface:** Implement `cli` impression surface for non-VS Code AI terminals (Aider, Continue in terminal mode). The `surface` column already supports `'cli'`.
- **Referral program:** `referral_code` and `referred_by_id` columns are live; build the referral tracking UI and bonus credit trigger in Celery.
- **Advertiser self-serve dashboard:** Complete the Next.js advertiser portal so advertisers can sign up, create campaigns, and pay without engineering intervention.
- **First impression bonus:** `has_first_impression` flag exists; wire up a bonus credit (e.g., $0.25) on a developer's first confirmed impression.

### Medium-Term (3–6 months)

- **Codex surface:** Add VS Code extension hook for GitHub Copilot / Codex spinner in addition to Claude Code webview.
- **Frequency capping:** Add `max_impressions_per_developer_per_day` to `campaigns` table — prevents a single developer from serving the same ad 50 times.
- **A/B creative testing:** Allow advertisers to upload multiple `creative_text` variants; auction engine randomly selects between variants for the same campaign, Celery aggregates CTR per variant.
- **Minimum payout threshold:** UI to set a minimum balance before auto-payout (e.g., $10 minimum) — reduces Wise transfer fees per transaction.

### Long-Term (6–12 months)

- **Registered entity + Stripe:** Once incorporated, add Stripe as a third payment option for advertisers (credit card, not just India-centric UPI/netbanking).
- **Tier 3 infrastructure:** ALB + multi-AZ RDS + ElastiCache cluster as developer count crosses 2,000.
- **Targeting options:** Allow advertisers to bid on `surface` (claude_code vs codex) or `country` — requires ZSET segmentation by target key or a more sophisticated ad server.
- **SDK / open protocol:** Publish `@spinads/sdk` so other AI tool developers can integrate the spinner ad protocol without a VS Code extension.
- **Real-time earnings websocket:** Replace the extension's polling for balance updates with a WebSocket subscription — reduces API load and gives developers instant earnings feedback.

---

*This document is the canonical technical reference for SpinEarn / SpinEarn. Update it alongside any architectural change. All table names, column names, and API paths in this document are normative — implementation must match.*
