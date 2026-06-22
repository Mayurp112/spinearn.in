# SpinEarn — Get Paid While Claude Code Thinks

> A VS Code extension that turns AI spinner wait states into a passive income stream for developers. Advertisers bid for one sponsored line in the Claude Code / Codex loading spinner. Developers earn 50% of every dollar spent — automatically, while coding normally.

---

## ⚠️ License Notice

This repository is **source-available but proprietary**.

- ✅ You may **view** this code for personal learning and evaluation
- ✅ You may **clone and run** it locally for evaluation purposes only
- ❌ You may **not** copy, modify, redistribute, sublicense, or use this code (in whole or in part) in any commercial or personal project without explicit written permission from the author
- ❌ You may **not** publish derivative works or competing products based on this codebase

All rights reserved © 2026 Mayur Pashte. See [`LICENSE`](./LICENSE) for full terms.

---

## What Is SpinEarn?

When a developer sends a prompt to Claude Code or Codex, there is a wait state — a spinner or "Thinking…" line — that can last anywhere from 2 to 60 seconds. SpinEarn replaces that line with a single auctioned ad. Advertisers compete in a real-time English ascending auction for that slot. Developers earn 50% of the winning bid, automatically, with zero extra effort.

```
Normal Claude Code:      ◐ Thinking…
With SpinEarn:           ◐ Supabase — Postgres without the ops headache → supabase.com
```

**Developer earns:** ~$9–14/month at 4 hours/day usage  
**Advertiser gets:** 1,000 confirmed 5-second impressions per block  
**Platform takes:** 50% of gross ad revenue

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│              VS Code Extension (TypeScript)      │
│  Claude Code adapter · Codex adapter · CLI       │
│  Google Auth · Status bar balance · Kill switch  │
└──────────────────┬──────────────────────────────┘
                   │ HTTPS / REST
┌──────────────────▼──────────────────────────────┐
│                   Nginx                          │
│   /api/*  →  FastAPI    /  →  Next.js 14        │
└────────┬─────────────────────────┬──────────────┘
         │                         │
┌────────▼────────┐     ┌─────────▼────────────┐
│  FastAPI        │     │  Next.js 14           │
│  Python 3.12    │     │  Developer dashboard  │
│  SQLAlchemy 2   │     │  Advertiser portal    │
│  async / await  │     │  Campaign leaderboard │
└────────┬────────┘     └──────────────────────┘
         │
┌────────┴────────────────────────────┐
│  PostgreSQL 16  │  Redis 7          │
│  6 tables       │  Auction ZSET     │
│  Alembic        │  Rate limiter     │
└─────────────────┘  Celery broker   │
                   └─────────────────┘
         │
┌────────┴────────────────────────────┐
│  Razorpay          │  Wise Business  │
│  Advertiser pay    │  Global dev     │
│  India payouts     │  payouts        │
└────────────────────┘─────────────────┘
```

**Stack:** FastAPI · PostgreSQL 16 · Redis 7 · Celery · Next.js 14 · TypeScript · Docker Compose · AWS EC2

---

## Running Locally (Evaluation Only)

> These instructions are provided for evaluation purposes. Running this project locally does not grant any rights beyond viewing and testing.

### Prerequisites

| Tool | Version |
|------|---------|
| Docker Desktop | Latest |
| Docker Compose | v2+ |
| Node.js | 18+ |
| Python | 3.12+ |
| Git | Any |

### Step 1 — Clone the repository

```bash
git clone https://github.com/Mayurp112/spinearn.in.git
cd spinearn.in
```

### Step 2 — Configure environment variables

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env.local
```

Open `backend/.env` and fill in the required values:

```env
# ── Required ──────────────────────────────────────────
DATABASE_URL=postgresql+asyncpg://spinearn:spinearn@postgres:5432/spinearn
SECRET_KEY=your-secret-key-min-32-chars-change-this
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# ── Razorpay (advertiser payments + India payouts) ────
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your-razorpay-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
RAZORPAY_ACCOUNT_NUMBER=your-razorpay-x-account

# ── Wise Business (global developer payouts) ──────────
WISE_API_KEY=your-wise-api-key
WISE_PROFILE_ID=your-wise-profile-id

# ── Optional (defaults shown) ─────────────────────────
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/1
FRONTEND_URL=http://localhost:3000
ENVIRONMENT=development
USD_TO_INR_RATE=83.0
PLATFORM_REVENUE_SHARE=0.50
HOURLY_CAP_CENTS=50
DAILY_CAP_CENTS=500
MINIMUM_PAYOUT_CENTS=1000
```

> **Google OAuth setup:** Go to [console.cloud.google.com](https://console.cloud.google.com) → Create project → APIs & Services → Credentials → OAuth 2.0 Client ID. Add `http://localhost:8000/api/v1/auth/google/callback` as an authorized redirect URI.

### Step 3 — Start all services

```bash
docker compose up --build
```

This starts 7 containers:

| Container | Port | Description |
|-----------|------|-------------|
| `nginx` | 80 | Reverse proxy |
| `backend` | 8000 | FastAPI application |
| `celery` | — | Background workers |
| `celery_beat` | — | Scheduled tasks |
| `frontend` | 3000 | Next.js dashboard |
| `postgres` | 5432 | Database |
| `redis` | 6379 | Cache + auction |

### Step 4 — Run database migrations

In a new terminal, once the containers are running:

```bash
docker compose exec backend alembic upgrade head
```

### Step 5 — Verify the setup

| URL | What it is |
|-----|-----------|
| `http://localhost` | Homepage |
| `http://localhost/dashboard` | Developer dashboard |
| `http://localhost/advertise` | Advertiser portal |
| `http://localhost/api/docs` | FastAPI Swagger UI |
| `http://localhost/api/v1/config` | Kill switch / config endpoint |

### Step 6 — Install the extension locally (optional)

```bash
cd extension
npm install
npm run build

# Install the .vsix in VS Code:
# Press Ctrl+Shift+P → "Extensions: Install from VSIX"
# Select extension/spinads-*.vsix
```

In VS Code settings, set `spinads.apiUrl` to `http://localhost:8000`.

### Stopping the project

```bash
docker compose down          # Stop containers, keep data
docker compose down -v       # Stop containers, delete all data
```

---

## Project Structure

```
spinearn.in/
│
├── backend/                    # FastAPI application
│   ├── app/
│   │   ├── config.py           # Pydantic Settings (all env vars)
│   │   ├── database.py         # Async SQLAlchemy engine
│   │   ├── models/             # SQLAlchemy ORM models
│   │   │   ├── developer.py    # Developer accounts + payment info
│   │   │   ├── advertiser.py   # Advertiser accounts
│   │   │   ├── campaign.py     # Ad campaigns + auction bids
│   │   │   ├── impression.py   # Individual ad impressions
│   │   │   ├── click.py        # Click events (50× impression rate)
│   │   │   └── payout.py       # Developer payout records
│   │   ├── routers/            # API route handlers
│   │   ├── services/           # Business logic
│   │   │   ├── auction.py      # Redis ZSET auction engine
│   │   │   ├── impression.py   # Fraud detection + validation
│   │   │   ├── razorpay_service.py
│   │   │   └── wise_service.py
│   │   └── tasks/              # Celery background jobs
│   └── alembic/                # Database migrations
│
├── frontend/                   # Next.js 14 dashboard
│   └── src/
│       ├── app/                # App Router pages
│       │   ├── dashboard/      # Developer earnings + payouts
│       │   ├── advertise/      # Campaign creation + management
│       │   ├── leaderboard/    # Public campaign board
│       │   └── stats/          # Platform statistics
│       └── components/         # React components
│
├── extension/                  # VS Code extension
│   └── src/
│       ├── adapters/           # Claude Code, Codex, CLI adapters
│       ├── auth/               # Google OAuth + keychain storage
│       ├── metrics/            # Impression + click tracking
│       ├── activation/         # Status bar, ad rotation
│       └── killswitch/         # Remote disable mechanism
│
├── nginx/nginx.conf            # Reverse proxy config
├── docker-compose.yml          # Development stack
├── docker-compose.prod.yml     # Production stack
└── .env.example                # Environment variable template
```

---

## API Reference

The full Swagger UI is available at `http://localhost/api/docs` when running locally.

| Domain | Endpoints |
|--------|-----------|
| Auth | `POST /api/v1/auth/google` · `POST /api/v1/auth/refresh` · `POST /api/v1/auth/logout` |
| Config | `GET /api/v1/config` — kill switch, min version |
| Developers | `GET /api/v1/developers/me` · `PATCH /api/v1/developers/me` |
| Impressions | `POST /api/v1/impressions/confirm` |
| Clicks | `POST /api/v1/clicks` |
| Campaigns | `GET /api/v1/campaigns/active` · `POST /api/v1/campaigns` |
| Payouts | `POST /api/v1/payouts/request` · `GET /api/v1/payouts` |
| Webhooks | `POST /api/v1/webhooks/razorpay` · `POST /api/v1/webhooks/wise` |

---

## Security Design

- **Fraud caps:** 50¢/hour, $5/day per developer — enforced server-side
- **Impression validation:** Server validates ≥5 second duration before crediting
- **Device binding:** `device_id` unique constraint prevents multi-account abuse
- **JWT:** 15-minute access tokens, 30-day refresh via httpOnly cookie
- **No CSP modification:** Extension never weakens any webview security policy
- **Marketplace updates only:** Extension updates exclusively through VS Code Marketplace — no unsigned self-update mechanism

---

## Contact

**Author:** Mayur Pashte  
**Email:** mayurpashte04@gmail.com 
**Website:** [spinads.dev](https://spinads.dev)

For licensing inquiries, partnership proposals, or advertiser onboarding, please contact via email.

---

## License

Copyright © 2026 Mayur Pashte. All rights reserved.

This source code is made available for **viewing and local evaluation only**.  
See [`LICENSE`](./LICENSE) for complete terms.
