#!/usr/bin/env bash
# =============================================================================
# CANG (cang.vn) — one-command production bootstrap for a fresh Ubuntu server.
#
#   curl -fsSL <this file> | DOMAIN=cang.vn ADMIN_EMAIL=you@cang.vn bash
# or, with the source already on the server:
#   cd /opt/cang && DOMAIN=cang.vn bash deploy/bootstrap.sh
#
# Installs Docker, writes .env with generated secrets, builds the app image,
# starts PostgreSQL + Redis + app + Caddy (automatic HTTPS), applies migrations
# and seeds reference data only (no demo companies).
# =============================================================================
set -euo pipefail

DOMAIN="${DOMAIN:-cang.vn}"
APP_DIR="${APP_DIR:-/opt/cang}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@${DOMAIN}}"
SOURCE_ARCHIVE="${SOURCE_ARCHIVE:-}"   # optional https URL of a .tgz of the repo
SOURCE_REPO="${SOURCE_REPO:-}"         # optional git URL (may embed a token)

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "run as root (sudo -i)"

log "1/7 System packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg ufw fail2ban unattended-upgrades jq >/dev/null

log "1b/7 Swap (needed to build Next.js on small instances)"
TOTAL_MB=$(free -m | awk '/^Mem:/{print $2}')
if [ "$TOTAL_MB" -lt 3000 ] && [ ! -f /swapfile ]; then
  fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
  chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10 >/dev/null
  echo "  4 GB swap enabled (RAM: ${TOTAL_MB} MB)"
fi

log "2/7 Docker Engine"
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin >/dev/null
fi
systemctl enable --now docker >/dev/null 2>&1 || true
docker --version

log "3/7 Firewall"
ufw allow OpenSSH >/dev/null 2>&1 || true
ufw allow 80/tcp  >/dev/null 2>&1 || true
ufw allow 443/tcp >/dev/null 2>&1 || true
ufw --force enable >/dev/null 2>&1 || true

log "4/7 Application source → ${APP_DIR}"
mkdir -p "$APP_DIR"
if [ -n "$SOURCE_ARCHIVE" ]; then
  curl -fsSL "$SOURCE_ARCHIVE" -o /tmp/cang-src.tgz
  tar xzf /tmp/cang-src.tgz -C "$APP_DIR"
  rm -f /tmp/cang-src.tgz
elif [ -n "$SOURCE_REPO" ]; then
  if [ -d "$APP_DIR/.git" ]; then git -C "$APP_DIR" pull --ff-only; else git clone --depth 1 "$SOURCE_REPO" "$APP_DIR"; fi
fi
[ -f "$APP_DIR/docker-compose.yml" ] || die "no source in $APP_DIR — set SOURCE_ARCHIVE or SOURCE_REPO, or upload the code there first"
cd "$APP_DIR"

log "5/7 Environment"
if [ ! -f .env ]; then
  DB_PASS="$(openssl rand -hex 24)"
  SESSION_SECRET="$(openssl rand -hex 32)"
  ADMIN_PASS="$(openssl rand -base64 18 | tr -d '/+=' | head -c 20)"
  cat > .env <<ENVEOF
NODE_ENV=production
APP_URL=https://${DOMAIN}
NEXT_PUBLIC_APP_URL=https://${DOMAIN}
SITE_DOMAIN=${DOMAIN}
ACME_EMAIL=${ADMIN_EMAIL}

POSTGRES_USER=cang
POSTGRES_PASSWORD=${DB_PASS}
POSTGRES_DB=cang
DATABASE_URL=postgresql://cang:${DB_PASS}@db:5432/cang?schema=public

REDIS_URL=redis://redis:6379
SESSION_SECRET=${SESSION_SECRET}

# Production seeding: reference data + platform config + admin only.
SEED_DEMO_DATA=false
SEED_ADMIN_EMAIL=${ADMIN_EMAIL}
SEED_ADMIN_PASSWORD=${ADMIN_PASS}

STORAGE_PROVIDER=local
SEARCH_PROVIDER=postgres
EMAIL_PROVIDER=console
EMAIL_FROM=CANG <no-reply@${DOMAIN}>
OTP_PROVIDER=console

# Fill in later and restart: docker compose up -d --force-recreate app
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
SMTP_URL=
ENVEOF
  chmod 600 .env
  echo "  .env written (secrets generated)"
else
  echo "  .env already present — keeping it"
fi

log "6/7 Build and start the stack"
# Cap the Next.js build heap so it does not get OOM-killed on a small instance.
BUILD_HEAP=$(( $(free -m | awk '/^Mem:/{print $2}') * 3 / 4 ))
[ "$BUILD_HEAP" -lt 1536 ] && BUILD_HEAP=1536
BUILD_NODE_OPTIONS="--max-old-space-size=${BUILD_HEAP}" DOCKER_BUILDKIT=1 docker compose build app
docker compose up -d
echo "  waiting for the app to become healthy…"
for i in $(seq 1 60); do
  if curl -fsS -o /dev/null "http://localhost:3000/api/health" 2>/dev/null; then break; fi
  sleep 3
done

log "7/7 Seed reference data"
docker compose exec -T app sh -lc 'node_modules/.bin/tsx src/db/seed/index.ts' \
  || docker compose run --rm --entrypoint sh app -lc 'node_modules/.bin/tsx src/db/seed/index.ts' 

# Nightly backups
if [ -f deploy/backup.sh ]; then
  chmod +x deploy/backup.sh
  ( crontab -l 2>/dev/null | grep -v 'cang backup' ; echo "15 3 * * * cd ${APP_DIR} && ./deploy/backup.sh >> /var/log/cang-backup.log 2>&1 # cang backup" ) | crontab -
  echo "  nightly backup scheduled at 03:15"
fi

ADMIN_PASS_SHOWN="$(grep '^SEED_ADMIN_PASSWORD=' .env | cut -d= -f2-)"
cat <<DONE

=============================================================
  CANG is up.

  Site      : https://${DOMAIN}        (TLS issued by Caddy once DNS points here)
  Admin     : https://${DOMAIN}/en/login
  Login     : ${ADMIN_EMAIL}
  Password  : ${ADMIN_PASS_SHOWN}
              ^ change it after the first sign-in

  DNS required at the registrar (iNET):
      A    @      <this server's IPv4>
      A    www    <this server's IPv4>

  Useful:
      docker compose ps
      docker compose logs -f app
      docker compose restart app
      docker compose exec db psql -U cang -d cang
=============================================================
DONE
