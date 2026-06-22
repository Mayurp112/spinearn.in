# SpinEarn / SpinAds — Deployment & Extension Marketplace Guide

> **Platform:** VS Code Extension (published via VS Code Marketplace)
> **Backend:** FastAPI + PostgreSQL + Redis + Celery on AWS EC2
> **Frontend:** Next.js 14.2
> **Payment:** Razorpay (India)

---

## Table of Contents

1. [Prerequisites & Local Development Setup](#1-prerequisites--local-development-setup)
2. [Environment Variables Reference](#2-environment-variables-reference)
3. [Local Development Workflow](#3-local-development-workflow)
4. [Staging Deployment on EC2](#4-staging-deployment-on-ec2)
5. [Production Deployment — Tier 1 → Tier 3](#5-production-deployment--tier-1--tier-3)
6. [Nginx Configuration](#6-nginx-configuration)
7. [SSL Setup with Let's Encrypt / Certbot](#7-ssl-setup-with-lets-encrypt--certbot)
8. [Domain Configuration](#8-domain-configuration)
9. [CI/CD Pipeline — GitHub Actions](#9-cicd-pipeline--github-actions)
10. [Database Backup Strategy](#10-database-backup-strategy)
11. [Rollback Procedure](#11-rollback-procedure)
12. [Performance Optimization](#12-performance-optimization)
13. [Zero-Downtime Deployment](#13-zero-downtime-deployment)
14. [VS Code Marketplace — One-Time Setup](#14-vs-code-marketplace--one-time-setup)
15. [Packaging the Extension](#15-packaging-the-extension)
16. [Publishing Commands](#16-publishing-commands)
17. [Versioning Strategy](#17-versioning-strategy)
18. [Extension Manifest Checklist](#18-extension-manifest-checklist)
19. [Marketplace Listing Optimization](#19-marketplace-listing-optimization)
20. [Review Process & Approval Timeline](#20-review-process--approval-timeline)
21. [Update Management & Auto-Update Behavior](#21-update-management--auto-update-behavior)
22. [Remote Kill Switch via /api/v1/config](#22-remote-kill-switch-via-apiv1config)
23. [Extension Signing with PAT](#23-extension-signing-with-pat)
24. [Browser Extension Note](#24-browser-extension-note)

---

## 1. Prerequisites & Local Development Setup

### System Requirements

- Docker Desktop 24+ and Docker Compose v2
- Node.js 20+ and npm 10+
- Python 3.11+ (for local backend development without Docker)
- AWS CLI v2 (for EC2 deployment and S3 backups)

### Clone and Bootstrap

```bash
git clone https://github.com/your-org/spinads.git
cd spinads

# Copy environment template
cp .env.example .env

# Edit required values (see Section 2 before continuing)
nano .env

# Start all 7 containers
docker compose up -d

# Verify all containers are healthy
docker compose ps
```

Expected containers: `nginx`, `backend`, `celery`, `celery_beat`, `frontend`, `postgres`, `redis`

```bash
# Run initial database migrations
docker compose exec backend alembic upgrade head

# Create first superuser (run once)
docker compose exec backend python -m app.cli create_superuser
```

### Local Development Teardown

```bash
# Stop without removing volumes (data preserved)
docker compose stop

# Stop and remove containers + networks (data preserved)
docker compose down

# Full reset including volumes — DESTROYS all local data
docker compose down -v
```

---

## 2. Environment Variables Reference

Create `.env` in the project root. Never commit this file.

### Required — App Will Not Start Without These

```env
# Database
DATABASE_URL=postgresql://spinads:password@postgres:5432/spinads

# Security
SECRET_KEY=your-64-char-random-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret-here
```

### Required — Payment & Payouts

```env
# Razorpay (get from dashboard.razorpay.com)
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your-razorpay-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
RAZORPAY_ACCOUNT_NUMBER=1234567890

# Wise (for INR payouts to developers)
WISE_API_KEY=your-wise-api-key
WISE_PROFILE_ID=12345678
```

### Required — URLs

```env
FRONTEND_URL=https://app.spinads.dev
BACKEND_URL=https://api.spinads.dev
ENVIRONMENT=production
```

### Optional — Defaults Shown

```env
# Redis / Celery
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0

# Business rules
USD_TO_INR_RATE=83.0
PLATFORM_REVENUE_SHARE=0.50

# Per-developer caps (in cents)
HOURLY_CAP_CENTS=50
DAILY_CAP_CENTS=500
MINIMUM_PAYOUT_CENTS=1000
```

### Local Development Overrides

```env
ENVIRONMENT=development
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
DATABASE_URL=postgresql://spinads:password@localhost:5432/spinads
REDIS_URL=redis://localhost:6379/0
```

---

## 3. Local Development Workflow

```bash
# Watch backend logs
docker compose logs -f backend

# Watch all logs
docker compose logs -f

# Run backend tests
docker compose exec backend pytest tests/ -v

# Run a one-off migration
docker compose exec backend alembic revision --autogenerate -m "add_column_xyz"
docker compose exec backend alembic upgrade head

# Rebuild backend after dependency changes
docker compose up -d --build backend

# Open a psql shell
docker compose exec postgres psql -U spinads -d spinads

# Flush Redis
docker compose exec redis redis-cli FLUSHDB

# Trigger a Celery task manually
docker compose exec backend python -c "from app.tasks import my_task; my_task.delay()"
```

### Frontend Development (hot reload outside Docker)

```bash
cd frontend
npm install
npm run dev    # http://localhost:3000
```

---

## 4. Staging Deployment on EC2

Use a separate t3.medium instance with a staging subdomain (e.g., `staging.spinads.dev`).

```bash
# SSH into staging instance
ssh -i spinads-key.pem ubuntu@<staging-ip>

# First-time server setup
sudo apt update && sudo apt install -y docker.io docker-compose-plugin git
sudo usermod -aG docker ubuntu
newgrp docker

# Clone repo
git clone https://github.com/your-org/spinads.git /home/ubuntu/spinads
cd /home/ubuntu/spinads

# Create .env for staging
cp .env.example .env
nano .env   # Set ENVIRONMENT=staging, staging URLs, etc.

# Start stack
docker compose up -d

# Run migrations
docker compose exec backend alembic upgrade head
```

---

## 5. Production Deployment — Tier 1 → Tier 3

### Tier 1 — Single EC2 t3.large ($63/mo, 0–500 devs)

All 7 containers on one machine. Use this until CPU > 70% sustained or memory > 80%.

```bash
# On EC2 (t3.large, 2 vCPU, 8 GB RAM)
cd /home/ubuntu/spinads
git pull origin main
docker compose pull
docker compose up -d
docker compose exec backend alembic upgrade head
```

**When to upgrade:** Active developers > 400, or ad impressions > 50k/day.

---

### Tier 2 — RDS + ElastiCache + EC2 ($192/mo, 500–2000 devs)

Move Postgres to RDS (db.t3.medium) and Redis to ElastiCache (cache.t3.micro). Remove `postgres` and `redis` from `docker-compose.yml`.

```env
# Update .env on EC2
DATABASE_URL=postgresql://spinads:password@your-rds-endpoint:5432/spinads
REDIS_URL=redis://your-elasticache-endpoint:6379/0
CELERY_BROKER_URL=redis://your-elasticache-endpoint:6379/0
```

```bash
# Migrate data from local Postgres to RDS (one-time)
docker compose exec postgres pg_dump -U spinads spinads | \
  psql -h your-rds-endpoint -U spinads -d spinads

# Restart with new env
docker compose up -d --force-recreate backend celery celery_beat
```

---

### Tier 3 — ALB + 2 EC2 + Read Replica ($444/mo, 2000–5000 devs)

- Application Load Balancer in front of 2 EC2 instances
- RDS read replica for heavy SELECT queries
- Separate instance for Celery workers

```bash
# Add read replica URL to .env
DATABASE_READ_URL=postgresql://spinads:password@your-rds-replica-endpoint:5432/spinads

# Use connection pooling (see Section 12)
# Deploy backend on both EC2 instances behind ALB
# Celery runs only on the worker instance
```

---

## 6. Nginx Configuration

`/etc/nginx/sites-available/spinads`

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.spinads.dev app.spinads.dev;
    return 301 https://$host$request_uri;
}

# API — proxy to FastAPI backend
server {
    listen 443 ssl http2;
    server_name api.spinads.dev;

    ssl_certificate     /etc/letsencrypt/live/api.spinads.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.spinads.dev/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    client_max_body_size 10M;

    location / {
        proxy_pass         http://127.0.0.1:8000;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 90;
    }
}

# Frontend — proxy to Next.js
server {
    listen 443 ssl http2;
    server_name app.spinads.dev;

    ssl_certificate     /etc/letsencrypt/live/app.spinads.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.spinads.dev/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
    }
}
```

```bash
# Test and reload Nginx
sudo nginx -t && sudo systemctl reload nginx
```

---

## 7. SSL Setup with Let's Encrypt / Certbot

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Issue certificates for both domains
sudo certbot --nginx -d api.spinads.dev -d app.spinads.dev \
  --email mayur.pashte@acc.ltd --agree-tos --no-eff-email

# Test auto-renewal
sudo certbot renew --dry-run

# Renewal runs automatically via systemd timer — verify it
sudo systemctl status certbot.timer
```

Certificates expire every 90 days. Certbot auto-renews at 60 days. No manual action needed after initial setup.

---

## 8. Domain Configuration

Add the following DNS records at your registrar (e.g., Cloudflare, Route 53):

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | api | `<EC2 public IP>` | 300 |
| A | app | `<EC2 public IP>` | 300 |
| A | @ | `<EC2 public IP>` | 300 |

For Tier 3 (ALB), replace EC2 IPs with the ALB DNS name using a CNAME:

| Type | Name | Value |
|------|------|-------|
| CNAME | api | `spinads-alb-123.us-east-1.elb.amazonaws.com` |
| CNAME | app | `spinads-alb-123.us-east-1.elb.amazonaws.com` |

---

## 9. CI/CD Pipeline — GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Test, Build, Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: spinads
          POSTGRES_PASSWORD: password
          POSTGRES_DB: spinads_test
        ports: ["5432:5432"]
      redis:
        image: redis:7
        ports: ["6379:6379"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install -r requirements.txt
      - run: pytest tests/ -v
        env:
          DATABASE_URL: postgresql://spinads:password@localhost:5432/spinads_test
          REDIS_URL: redis://localhost:6379/0
          SECRET_KEY: test-secret-key-not-real
          ENVIRONMENT: testing

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker images
        run: docker compose build

      - name: Deploy to EC2
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd /home/ubuntu/spinads
            git pull origin main
            docker compose pull
            docker compose up -d --no-deps --build backend celery celery_beat frontend
            docker compose exec -T backend alembic upgrade head
            docker image prune -f
```

Add these GitHub repository secrets:

- `EC2_HOST` — public IP or DNS of EC2 instance
- `EC2_SSH_KEY` — contents of the `.pem` private key

---

## 10. Database Backup Strategy

### Automated pg_dump + S3 Upload

`/home/ubuntu/scripts/backup_db.sh`:

```bash
#!/bin/bash
set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/tmp/spinads_backup_${TIMESTAMP}.sql.gz"
S3_BUCKET="s3://spinads-backups/postgres"

# Dump and compress
docker compose -f /home/ubuntu/spinads/docker-compose.yml \
  exec -T postgres pg_dump -U spinads spinads | gzip > "$BACKUP_FILE"

# Upload to S3
aws s3 cp "$BACKUP_FILE" "${S3_BUCKET}/${TIMESTAMP}.sql.gz"

# Delete local copy
rm "$BACKUP_FILE"

# Remove S3 backups older than 30 days
aws s3 ls "${S3_BUCKET}/" | awk '{print $4}' | while read key; do
  created=$(echo "$key" | cut -d'_' -f3 | cut -d'.' -f1)
  if [[ $(date -d "${created:0:8}" +%s 2>/dev/null) -lt $(date -d "30 days ago" +%s) ]]; then
    aws s3 rm "${S3_BUCKET}/${key}"
  fi
done

echo "Backup complete: ${TIMESTAMP}"
```

```bash
chmod +x /home/ubuntu/scripts/backup_db.sh

# Schedule via cron — runs at 2 AM UTC daily
crontab -e
# Add:
0 2 * * * /home/ubuntu/scripts/backup_db.sh >> /var/log/spinads_backup.log 2>&1
```

### Restore from Backup

```bash
# Download backup from S3
aws s3 cp s3://spinads-backups/postgres/20260120_020000.sql.gz /tmp/restore.sql.gz

# Restore
gunzip -c /tmp/restore.sql.gz | docker compose exec -T postgres \
  psql -U spinads -d spinads
```

**Backup checklist:**
- [ ] Daily automated backups confirmed in S3
- [ ] Test restore performed monthly
- [ ] S3 bucket versioning enabled
- [ ] IAM role on EC2 has `s3:PutObject` and `s3:GetObject` on backup bucket only

---

## 11. Rollback Procedure

### Application Rollback (Git-based)

```bash
# On EC2 — find the previous working commit
git log --oneline -10

# Roll back to specific commit
git checkout <previous-commit-hash>
docker compose up -d --no-deps --build backend celery celery_beat frontend

# Or roll back to previous tag
git checkout v1.2.3
docker compose up -d --build
```

### Database Migration Rollback

```bash
# Check current migration version
docker compose exec backend alembic current

# Roll back one migration
docker compose exec backend alembic downgrade -1

# Roll back to a specific revision
docker compose exec backend alembic downgrade <revision_id>
```

### Full Rollback (from backup)

```bash
# 1. Stop the app
docker compose stop backend celery celery_beat

# 2. Restore database from backup (see Section 10)

# 3. Checkout old code
git checkout <last-known-good-tag>

# 4. Restart
docker compose up -d
```

---

## 12. Performance Optimization

### Uvicorn Workers

In `docker-compose.yml`, set workers to `2 * CPU_cores + 1`:

```yaml
backend:
  command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 5
```

For t3.large (2 vCPU): 5 workers. For t3.xlarge (4 vCPU): 9 workers.

### PgBouncer (Connection Pooling)

Add PgBouncer as a Docker container when Postgres connection count > 80:

```yaml
pgbouncer:
  image: edoburu/pgbouncer:latest
  environment:
    DATABASE_URL: postgresql://spinads:password@postgres:5432/spinads
    POOL_MODE: transaction
    MAX_CLIENT_CONN: 200
    DEFAULT_POOL_SIZE: 20
  ports:
    - "5432:5432"
```

Update `DATABASE_URL` to point to PgBouncer instead of Postgres directly.

### Redis Pipeline (Batch Operations)

```python
# In your FastAPI app — batch Redis writes
async with redis.pipeline() as pipe:
    pipe.incr(f"impressions:{ad_id}")
    pipe.expire(f"impressions:{ad_id}", 3600)
    pipe.lpush("impression_queue", json.dumps(event))
    await pipe.execute()
```

### Celery Worker Concurrency

```yaml
celery:
  command: celery -A app.celery worker --loglevel=info --concurrency=4
```

---

## 13. Zero-Downtime Deployment

For Tier 1 (single EC2), use Docker Compose's `--no-deps` flag to replace containers one at a time:

```bash
# Pull new images while old containers still serve traffic
docker compose pull backend

# Replace backend container — brief (< 2s) interruption due to single instance
docker compose up -d --no-deps backend

# Run migrations before restarting (must be backward-compatible)
docker compose exec backend alembic upgrade head
```

**Writing backward-compatible migrations:** Never DROP a column in the same release that removes code using it. Add column → deploy code → remove old code → drop column (3 separate releases).

For Tier 3 (ALB + 2 EC2): Deploy to one instance, health-check passes, then deploy to the second. Configure ALB health check on `/api/v1/health`.

---

## 14. VS Code Marketplace — One-Time Setup

SpinEarn is a **VS Code extension**, published exclusively via the [VS Code Marketplace](https://marketplace.visualstudio.com). This is the only distribution channel for the extension.

### Create a Publisher Account

1. Go to [marketplace.visualstudio.com/manage](https://marketplace.visualstudio.com/manage)
2. Sign in with a Microsoft account
3. Click **Create Publisher**
4. Set publisher ID to `spinads` (must match `package.json` `publisher` field exactly)
5. Complete profile: display name, website (`https://spinads.dev`), logo

### Create a Personal Access Token (PAT)

1. Go to [dev.azure.com](https://dev.azure.com) → User settings → Personal access tokens
2. Create new token:
   - **Name:** `vsce-publish`
   - **Organization:** All accessible organizations
   - **Scopes:** Marketplace → **Manage**
   - **Expiry:** 1 year (set a calendar reminder to rotate)
3. Copy the token immediately — it will not be shown again

### Authenticate vsce

```bash
npm install -g @vscode/vsce

# Login with your publisher ID and PAT
vsce login spinads
# Paste PAT when prompted
```

---

## 15. Packaging the Extension

### Build and Package

```bash
# Install extension dependencies
npm install

# Bundle with esbuild (production build)
npm run package

# This runs esbuild and then vsce package, producing:
# spinads-1.0.0.vsix
```

Typical `package.json` scripts:

```json
{
  "scripts": {
    "build": "esbuild src/extension.ts --bundle --outfile=out/extension.js --external:vscode --format=cjs --platform=node",
    "package": "npm run build && vsce package",
    "publish": "npm run build && vsce publish"
  }
}
```

### Inspect the Package

```bash
# List files included in the .vsix
vsce ls

# Ensure .vscodeignore excludes dev files
cat .vscodeignore
```

`.vscodeignore` should exclude:

```
.vscode/**
src/**
*.ts
*.map
node_modules/**
.env*
test/**
```

---

## 16. Publishing Commands

```bash
# Bump patch version (1.0.0 → 1.0.1) and publish
vsce publish patch

# Bump minor version (1.0.0 → 1.1.0) and publish
vsce publish minor

# Bump major version (1.0.0 → 2.0.0) and publish
vsce publish major

# Publish a specific version without auto-bumping
vsce publish 1.2.3

# Publish a pre-built .vsix file
vsce publish --packagePath spinads-1.0.0.vsix

# Publish with explicit PAT (for CI)
vsce publish --pat $VSCE_PAT patch
```

### Verify After Publishing

```bash
# Check the extension is live
vsce show spinads.spinads

# Install the just-published version locally
code --install-extension spinads.spinads
```

---

## 17. Versioning Strategy

Follow [Semantic Versioning](https://semver.org): `MAJOR.MINOR.PATCH`

| Change Type | Version Bump | SpinEarn Examples |
|---|---|---|
| Breaking API/auth change | MAJOR | Changed auth token format requiring re-login |
| New feature, backward compatible | MINOR | Added earnings dashboard panel; added new ad format |
| Bug fix, UI tweak | PATCH | Fixed status bar flicker; corrected payout display |

### SpinEarn-Specific Examples

```
1.0.0  — Initial release: ad display, earnings tracking, basic auth
1.1.0  — Added real-time earnings WebSocket updates
1.2.0  — Added payout history panel
1.2.1  — Fixed payout amount rounding display bug
1.3.0  — Added referral code feature
2.0.0  — Migrated auth to new token format (breaking: requires re-login)
```

Update version in `package.json` before publishing, or let `vsce publish patch/minor/major` do it automatically. The `vsce publish` command commits the version bump — ensure your working tree is clean.

---

## 18. Extension Manifest Checklist

Required fields in `package.json`:

```json
{
  "name": "spinads",
  "displayName": "SpinEarn — Earn While You Code",
  "description": "Earn passive income by viewing non-intrusive ads in VS Code while you work.",
  "version": "1.0.0",
  "publisher": "spinads",
  "engines": { "vscode": "^1.85.0" },
  "categories": ["Other"],
  "keywords": ["earn money", "ads", "passive income", "developer earnings", "spinads"],
  "icon": "images/icon.png",
  "activationEvents": ["onStartupFinished"],
  "main": "./out/extension.js",
  "contributes": {
    "configuration": {
      "title": "SpinEarn",
      "properties": {
        "spinads.apiUrl": {
          "type": "string",
          "default": "https://api.spinads.dev",
          "description": "SpinEarn API endpoint URL"
        },
        "spinads.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable or disable SpinEarn ad display"
        },
        "spinads.showInStatusBar": {
          "type": "boolean",
          "default": true,
          "description": "Show earnings in the VS Code status bar"
        }
      }
    }
  },
  "repository": { "type": "git", "url": "https://github.com/your-org/spinads" },
  "license": "MIT",
  "bugs": { "url": "https://github.com/your-org/spinads/issues" },
  "homepage": "https://spinads.dev"
}
```

**Checklist:**
- [ ] `icon.png` is exactly 128x128 pixels, PNG format
- [ ] `publisher` field matches your Marketplace publisher ID (`spinads`)
- [ ] `engines.vscode` set to minimum supported version
- [ ] `repository` URL is public or accessible
- [ ] `LICENSE` file exists in root
- [ ] `CHANGELOG.md` exists and is up to date
- [ ] `README.md` is the Marketplace listing description (keep it polished)

---

## 19. Marketplace Listing Optimization

### Keywords

In `package.json` `keywords` array (max 5 shown in Marketplace):

```json
["earn money coding", "developer income", "passive income", "ads vscode", "spinads"]
```

### README.md (Marketplace Description)

The extension's `README.md` becomes the Marketplace listing page. Structure:

```markdown
# SpinEarn — Earn While You Code

[badge: version] [badge: installs] [badge: rating]

**Earn real money passively** while you write code in VS Code. SpinEarn shows
non-intrusive sponsored messages in your status bar. Zero distraction, real income.

## How It Works
1. Install the extension and sign up free
2. Ads appear subtly in your status bar as you work
3. Earnings accumulate in your dashboard
4. Withdraw to your bank via UPI/IMPS (India) when balance ≥ ₹10

## Features
- Status bar earnings display
- Real-time balance dashboard
- Payout history
- Referral program

## Screenshots
![Status bar](images/statusbar.png)
![Dashboard](images/dashboard.png)
```

### Icon Requirements

- Exactly `128x128` pixels
- PNG format
- No transparency for best display
- Distinct, readable at small size (will display at 50x50 in search results)

### Screenshots

Add screenshots under `images/` and reference in README. Recommended:
- `statusbar.png` — VS Code with SpinEarn status bar item visible
- `dashboard.png` — WebView earnings dashboard
- `settings.png` — VS Code settings for SpinEarn

---

## 20. Review Process & Approval Timeline

- **Initial publish:** Manual review by Microsoft. Typically **2–5 business days**.
- **Subsequent updates:** Usually **auto-approved within 1–2 hours** if no major changes to manifest or permissions.
- **Rejection reasons (common):** Misleading description, missing icon, broken repository link, or flagged keywords.

If rejected, you receive an email to the Microsoft account linked to the publisher. Fix the flagged issue and re-publish — no cooldown period.

**After publishing, the extension appears at:**
`https://marketplace.visualstudio.com/items?itemName=spinads.spinads`

---

## 21. Update Management & Auto-Update Behavior

VS Code **automatically updates extensions** in the background. By default:

- On next VS Code launch, if a newer version is available, it downloads silently
- User is prompted to reload VS Code to activate the update
- Users can disable auto-updates via `extensions.autoUpdate` setting

### Communicating Breaking Changes

For breaking changes (new auth flow, removed settings), add a migration notice in:
1. `CHANGELOG.md` — detailed change log
2. Extension's activation event — show a one-time notification:

```typescript
const previousVersion = context.globalState.get<string>('version');
const currentVersion = pkg.version;
if (previousVersion && previousVersion !== currentVersion) {
    vscode.window.showInformationMessage(
        `SpinEarn updated to v${currentVersion}. Please re-authenticate.`,
        'Sign In'
    ).then(action => {
        if (action === 'Sign In') { /* open auth flow */ }
    });
}
context.globalState.update('version', currentVersion);
```

---

## 22. Remote Kill Switch via /api/v1/config

The extension polls the backend for a config object that controls minimum version and enabled state. This allows you to force-disable the extension or enforce upgrades without a Marketplace update.

### Backend Endpoint

```python
# FastAPI route: GET /api/v1/config
@router.get("/config")
async def get_config():
    return {
        "min_version": "1.0.0",       # bump to force upgrade
        "enabled": True,               # set False to kill all clients globally
        "message": None,               # optional string shown to user
        "check_interval_ms": 300000    # how often extension polls (5 min default)
    }
```

### Extension-Side Handling

```typescript
async function checkRemoteConfig(apiUrl: string): Promise<void> {
    const response = await fetch(`${apiUrl}/api/v1/config`);
    const config = await response.json();

    if (!config.enabled) {
        // Disable ad display and status bar
        statusBarItem.hide();
        return;
    }

    if (semver.lt(EXTENSION_VERSION, config.min_version)) {
        vscode.window.showWarningMessage(
            `SpinEarn v${config.min_version}+ required. Please update.`,
            'Update Now'
        ).then(action => {
            if (action === 'Update Now') {
                vscode.commands.executeCommand(
                    'workbench.extensions.action.checkForExtensionUpdates'
                );
            }
        });
    }

    if (config.message) {
        vscode.window.showInformationMessage(`SpinEarn: ${config.message}`);
    }
}
```

Poll this endpoint at the interval returned in `check_interval_ms` (default 5 minutes). Gracefully handle network failures — do not disable the extension if the config endpoint is unreachable.

---

## 23. Extension Signing with PAT

`vsce` uses your Personal Access Token (PAT) to authenticate and sign the extension during publish. The `.vsix` is signed by Microsoft's Marketplace infrastructure — no separate code-signing certificate is needed.

```bash
# Publish using environment variable (recommended for CI/CD)
export VSCE_PAT=your-pat-here
vsce publish patch

# Or pass inline
vsce publish patch --pat your-pat-here
```

### Rotate PAT Before Expiry

1. Go to Azure DevOps → User settings → Personal access tokens
2. Create a new token with the same Marketplace → Manage scope
3. Update `VSCE_PAT` in GitHub Actions secrets
4. Revoke the old token

**Do not store the PAT in source control.** Use GitHub Actions secrets or a secrets manager.

**Publishing checklist:**
- [ ] `npm run package` succeeds locally
- [ ] `.vsix` file tested via `code --install-extension spinads-x.y.z.vsix`
- [ ] `CHANGELOG.md` updated
- [ ] Version bumped in `package.json`
- [ ] PAT is valid (check expiry date)
- [ ] All tests pass
- [ ] `vsce publish` exits with code 0

---

## 24. Browser Extension Note

SpinEarn is a **VS Code extension**, not a browser extension. It runs inside the VS Code desktop application (Electron-based) and is distributed exclusively via the VS Code Marketplace. Browser extension stores (Chrome Web Store, Firefox AMO, Edge Add-ons, Safari Extensions Gallery) are **not applicable** to the current SpinEarn architecture.

### Why This Matters

VS Code extensions have a fundamentally different architecture than browser extensions:
- They use the VS Code Extension API (`vscode` module), not browser Web APIs
- They are packaged as `.vsix` files, not `.crx` or `.xpi`
- They are published via `@vscode/vsce`, not browser store developer consoles
- They activate based on VS Code events (e.g., `onStartupFinished`), not page loads

### Future: Browser-Based IDE Surfaces

If SpinEarn expands to browser-based IDEs (VS Code for Web at `vscode.dev`, GitHub Codespaces, Gitpod), the same extension codebase may work with limitations — browser extensions APIs are sandboxed differently. In that case:

- Test with `vsce package --target web` for the web extension target
- Some Node.js APIs used in the extension may need web-compatible replacements
- The same Marketplace listing covers both desktop and web if the extension is web-compatible

If SpinEarn later adds a companion browser extension (e.g., to track browsing context or show ads in browser-based IDEs), those would require separate submissions:
- Chrome Web Store: [chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole)
- Firefox AMO: [addons.mozilla.org/developers](https://addons.mozilla.org/developers)
- Edge Add-ons: [partner.microsoft.com/dashboard/microsoftedge](https://partner.microsoft.com/dashboard/microsoftedge)

For the current SpinEarn product, **focus exclusively on the VS Code Marketplace**.

---

*Last updated: 2026-06-22*
