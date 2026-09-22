# Deploying CANG to a Sprintbox VPS

Step-by-step for a single Ubuntu VPS running the Docker Compose stack in `docker-compose.yml`
(`db` PostgreSQL 16, `redis` 7, `app` Next.js standalone, `caddy` 2 for TLS). Architecture, environment
variables, DNS and scaling are explained in [`../docs/06-system-architecture.md`](../docs/06-system-architecture.md) §12;
this file is the runbook.

Domain: **cang.vn**, registered at iNET (`portal.inet.vn`), DNS managed there.
Server: **Sprintbox** VPS, Ubuntu 22.04/24.04 LTS, 2 vCPU / 4 GB RAM / 80 GB minimum.

---

## 0. Prerequisites

| What | Where |
|---|---|
| Sprintbox VPS with a public IPv4 (and IPv6 if offered), root or sudo SSH access | Sprintbox control panel |
| Access to the `cang.vn` DNS zone | iNET portal → Quản lý tên miền → `cang.vn` → DNS |
| A container registry (GitHub Container Registry works) or the ability to build on the VPS | GitHub |
| Google OAuth client (optional) with redirect URI `https://cang.vn/api/auth/google/callback` | Google Cloud Console |
| Transactional e-mail provider (SMTP or Resend) — optional for first boot; e-mails log to stdout until configured | provider dashboard |

## 1. Prepare the server

```bash
# as root
apt update && apt -y upgrade
apt -y install ca-certificates curl gnupg ufw fail2ban unattended-upgrades rclone
# Docker Engine + Compose plugin (official repo)
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list
apt update && apt -y install docker-ce docker-ce-cli containerd.io docker-compose-plugin
# deploy user
adduser --disabled-password --gecos "" deploy && usermod -aG docker deploy
mkdir -p /opt/cang /var/backups/cang && chown -R deploy:deploy /opt/cang /var/backups/cang
# firewall: SSH + HTTP/HTTPS only (Postgres and Redis are never published)
ufw default deny incoming && ufw default allow outgoing
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 443/udp
ufw enable
timedatectl set-timezone Asia/Ho_Chi_Minh
```

Also enable the firewall in the Sprintbox panel if it has one (allow 22, 80, 443), disable password SSH
login in `/etc/ssh/sshd_config` (`PasswordAuthentication no`) once your key works, and keep
`unattended-upgrades` on for security patches.

## 2. DNS at iNET

In the iNET portal, create the records below (replace `VPS_IPV4` / `VPS_IPV6`). Set TTL to 300 for the
cut-over and raise it to 3600 afterwards.

| Type | Host | Value | Notes |
|---|---|---|---|
| A | `@` | `VPS_IPV4` | apex |
| AAAA | `@` | `VPS_IPV6` | if available |
| A | `www` | `VPS_IPV4` | Caddy redirects to apex |
| AAAA | `www` | `VPS_IPV6` | |
| CAA | `@` | `0 issue "letsencrypt.org"` | Caddy uses Let's Encrypt |
| CNAME | `cdn` | CDN / bucket hostname | only when `CDN_URL` is used |
| MX | `@` | mailbox provider's MX | placeholder until chosen |
| TXT | `@` | `v=spf1 include:<transactional> include:<mailbox> -all` | placeholder values from providers |
| TXT | `<selector>._domainkey` | DKIM key from the transactional provider | placeholder |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@cang.vn` | tighten to `p=quarantine` later |

Verify from your machine before continuing: `dig +short cang.vn` and `dig +short www.cang.vn` must return
the VPS address. Caddy will fail certificate issuance (and hit rate limits) if DNS is not live.

## 3. Get the code and configure

```bash
# as deploy
cd /opt/cang
git clone https://github.com/<org>/cang-platform.git .     # or: scp a release tarball
cp .env.example .env
chmod 600 .env
```

Edit `.env` — production values that **must** change:

```dotenv
NODE_ENV="production"
APP_URL="https://cang.vn"
NEXT_PUBLIC_APP_URL="https://cang.vn"
SESSION_SECRET="<openssl rand -base64 48>"

# The db container is initialised from POSTGRES_*; the app, seed and backup scripts use DATABASE_URL.
# Set all four explicitly and keep the password identical (the localhost value from .env.example will not work
# inside the compose network — the host is "db").
POSTGRES_USER="cang"
POSTGRES_PASSWORD="<openssl rand -base64 24 | tr -d '/+='>"
POSTGRES_DB="cang"
DATABASE_URL="postgresql://cang:<same password>@db:5432/cang"
REDIS_URL="redis://redis:6379"

SEED_ADMIN_EMAIL="admin@cang.vn"
SEED_ADMIN_PASSWORD="<strong, then change it after first login>"
SEED_DEMO_PASSWORD="<random — demo users should not be usable in production>"

EMAIL_PROVIDER="console"            # switch to smtp/resend when configured
EMAIL_FROM="CANG <no-reply@cang.vn>"
GOOGLE_CLIENT_ID=""                 # optional
GOOGLE_CLIENT_SECRET=""

# Caddy
SITE_DOMAIN="cang.vn"
ACME_EMAIL="ops@cang.vn"
```

`NEXT_PUBLIC_APP_URL` is inlined into the client bundle at **build** time, so it is also passed as a build
argument in `docker-compose.yml`. If you build images in CI, pass `--build-arg NEXT_PUBLIC_APP_URL=https://cang.vn`.

## 4. First start

```bash
docker compose build app                       # or: docker compose pull app (CI-built image, set APP_IMAGE in .env)
docker compose up -d db redis
docker compose ps                              # wait until db is "healthy"
docker compose up -d app                       # entrypoint waits for db, runs migrations, starts server
docker compose logs -f app                     # expect "migrations applied" then "starting server"
curl -s http://127.0.0.1:3000/api/health || docker compose exec app wget -qO- http://127.0.0.1:3000/api/health
docker compose up -d caddy                     # obtains certificates; check: docker compose logs caddy
curl -I https://cang.vn/en                     # 200 from the app
curl -I https://www.cang.vn/en                 # 308 → https://cang.vn/en
```

## 5. Seed platform data (once)

```bash
docker compose exec app node_modules/.bin/tsx src/db/seed/index.ts
```

The seed is idempotent and creates, in order:

1. **Reference data** — countries, currencies, provinces (8 industrial clusters), industries, product
   categories, certifications. Required.
2. **Platform configuration** — plans, badges, order statuses, fee rules, payment/financing/logistics/
   inspection providers, ad products, homepage sections, settings, credit-scoring rules. Required (the app
   expects `FREE` plan and `order_statuses` rows to exist).
3. **Admin user** — `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` as `SUPER_ADMIN`. Required.
4. **Demo marketplace data** — two users and two companies (`sales@saigonpack.vn` / Saigon Pack Manufacturing,
   `buyer@nordwind-outdoor.de` / Nordwind Outdoor GmbH) with `SEED_DEMO_PASSWORD`. **Not wanted in
   production.**

> **Engineering TODO — `SEED_DEMO_DATA` flag.** `src/db/seed/index.ts` should skip step 4 when
> `SEED_DEMO_DATA=false` (recommended default for `NODE_ENV=production`). Until that guard exists, production
> operators must either (a) set `SEED_DEMO_PASSWORD` to a long random value so the demo logins are unusable
> and then delete the two demo companies and users from `/admin/companies` and `/admin/users`, or (b) remove
> them in SQL right after seeding:
>
> ```sql
> DELETE FROM users WHERE email IN ('sales@saigonpack.vn', 'buyer@nordwind-outdoor.de');
> DELETE FROM companies WHERE slug IN ('saigon-pack-manufacturing', 'nordwind-outdoor');
> ```
>
> (`company_members`, profiles and subscriptions cascade.) Do not implement the flag from this runbook; it
> belongs in the seed code with a test.

## 6. First admin login and configuration

1. Open `https://cang.vn/en/login`, sign in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`. You land on
   `/en/admin` (the `SUPER_ADMIN` role routes there).
2. Change the password immediately (`/admin` → account settings, or `changePasswordAction` from the settings
   page once built), and remove `SEED_ADMIN_PASSWORD` from `.env`.
3. Configure payment providers (`/admin/providers`, Phase 2 UI; until then, update
   `payment_providers.publicConfig` for `PARTNER_BANK_TA` with the real partner-bank beneficiary, account
   number and SWIFT — the seeded values are placeholders and are shown to buyers verbatim).
4. Review `/admin/settings` (`tradeAssurance.enabled`, `products.requireModeration`,
   `compliance.sanctionsScreeningEnabled`, `rfq.autoMatchLimit`).
5. Create additional staff accounts and assign platform roles (`/admin/users`).

## 7. Backups

```bash
sudo cp /opt/cang/deploy/backup.sh /usr/local/bin/cang-backup && sudo chmod +x /usr/local/bin/cang-backup
crontab -e
# nightly 02:30 local time, 14-day rotation, off-host copy when BACKUP_REMOTE is configured
30 2 * * * cd /opt/cang && BACKUP_REMOTE=r2:cang-backups /usr/local/bin/cang-backup >> /var/log/cang-backup.log 2>&1
```

Configure `rclone` (`rclone config`) with an S3-compatible bucket (Cloudflare R2, AWS S3, a Vietnamese cloud)
that has versioning enabled. Test a restore into a scratch database once a month:

```bash
docker compose exec -T db createdb -U cang cang_restore_test
docker compose exec -T db pg_restore -U cang -d cang_restore_test --no-owner < /var/backups/cang/db/<latest>.dump
docker compose exec -T db dropdb -U cang cang_restore_test
```

## 8. Updating (near-zero downtime)

```bash
cd /opt/cang
git pull                                                     # or bump APP_IMAGE tag in .env
docker compose build app                                     # or docker compose pull app
docker compose up -d --no-deps --scale app=2 --no-recreate app   # second replica boots, migrates, becomes healthy
docker compose ps                                            # both app replicas healthy
docker compose up -d --no-deps --scale app=1 app             # oldest replica stopped; Caddy keeps routing to the healthy one
docker image prune -f
```

Migrations must follow expand/contract (see `docs/06-system-architecture.md` §12.8) so the old replica keeps
working against the new schema during the overlap.

Rollback: set the previous image tag and run the same two `up -d` commands.

## 9. Scheduled jobs (when implemented)

The job endpoints under `/api/cron/[job]` are planned; when they land, add host cron lines such as:

```
0 * * * *  curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://cang.vn/api/cron/rfq-expire
15 3 * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://cang.vn/api/cron/badge-engine
```

## 10. Troubleshooting

| Symptom | Check |
|---|---|
| `caddy` logs show ACME errors | DNS not pointing here yet, or port 80/443 blocked (Sprintbox panel firewall + `ufw status`) |
| `app` restarts with `Invalid environment configuration` | `SESSION_SECRET` < 32 chars or `DATABASE_URL` missing in `.env` |
| `app` stuck "waiting for database" | `POSTGRES_PASSWORD` in `.env` differs from `DATABASE_URL`; `docker compose logs db` |
| Uploaded images 404 after redeploy | the `uploads` volume was recreated — never `docker compose down -v` in production |
| Google button missing | `GOOGLE_CLIENT_ID`/`SECRET` empty (by design) |
| E-mails not arriving | `EMAIL_PROVIDER=console` logs them to `docker compose logs app`; configure SMTP/Resend and SPF/DKIM |
| Healthcheck `degraded` | `db: down` — Postgres restarted or out of connections (`max_connections` vs `DB_POOL_MAX × replicas`) |
