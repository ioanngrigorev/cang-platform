#!/bin/bash
# CANG production bootstrap — runs as root on first boot (Vultr startup script).
exec > >(tee -a /var/log/cang-bootstrap.log) 2>&1
set -euo pipefail
umask 077
[ ! -f /opt/cang/.env ] || { echo "Existing installation: use deploy/update.sh"; exit 1; }
exec 9>/var/lock/cang-deploy.lock
flock -n 9 || { echo "Another deployment is running"; exit 1; }
echo "=== CANG bootstrap started $(date -u) ==="

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg ufw jq python3 rsync util-linux openssl >/dev/null

# swap (2 GB RAM is not enough to build Next.js)
if [ ! -f /swapfile ]; then
  fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
  chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10
fi

# docker
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --batch --yes --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt-get update -qq
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

# firewall
ufw allow OpenSSH; ufw allow 80/tcp; ufw allow 443/tcp; ufw --force enable

# Source: current main; private repositories use an owner-provisioned read token.
apt-get install -y -qq git rsync >/dev/null
REPO=ioanngrigorev/cang-platform
auth_config="$(mktemp)"
trap 'rm -f "$auth_config"' EXIT
if [ -s /root/.cang-github-token ]; then
  printf 'header = "Authorization: Bearer %s"\n' "$(tr -d '[:space:]' < /root/.cang-github-token)" > "$auth_config"
fi
SHA="$(curl -fsS --config "$auth_config" "https://api.github.com/repos/$REPO/commits/main" | jq -r '.sha')"
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || exit 1
mkdir -p /opt/cang && cd /opt/cang
curl -fsSL --config "$auth_config" -o /tmp/src.tgz "https://codeload.github.com/$REPO/tar.gz/${SHA}"
tar xzf /tmp/src.tgz --strip-components=1 -C /opt/cang
rm -f /tmp/src.tgz

if test ! -f /opt/cang/.env; then # generated once, preserved across redeploys
DB_PASS="$(openssl rand -hex 24)"
SESSION_SECRET="$(openssl rand -hex 32)"
ADMIN_PASS="$(openssl rand -base64 18 | tr -d '/+=' | head -c 20)"
cat > /opt/cang/.env <<ENVEOF
NODE_ENV=production
APP_URL=https://cang.vn
NEXT_PUBLIC_APP_URL=https://cang.vn
SITE_DOMAIN=cang.vn
ACME_EMAIL=ivan_grigorev@icloud.com

POSTGRES_USER=cang
POSTGRES_PASSWORD=${DB_PASS}
POSTGRES_DB=cang
DATABASE_URL=postgresql://cang:${DB_PASS}@db:5432/cang

REDIS_URL=redis://redis:6379
SESSION_SECRET=${SESSION_SECRET}

SEED_DEMO_DATA=false
SEED_ADMIN_EMAIL=admin@cang.vn
SEED_ADMIN_PASSWORD=${ADMIN_PASS}

STORAGE_PROVIDER=local
SEARCH_PROVIDER=postgres
EMAIL_PROVIDER=console
EMAIL_FROM="CANG <no-reply@cang.vn>"
OTP_PROVIDER=console

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
SMTP_URL=
ENVEOF
chmod 600 /opt/cang/.env; fi

# First installation has no previous image to roll back to. Stop on any failure.
export BUILD_SHA="$SHA"
BUILD_NODE_OPTIONS="--max-old-space-size=3072" docker compose build app
docker compose up -d
healthy=false
for _ in $(seq 1 60); do
  version="$(docker compose exec -T app wget -qO- http://127.0.0.1:3000/api/health 2>/dev/null | jq -r '.version' || true)"
  if [ "$version" = "$SHA" ]; then healthy=true; break; fi
  sleep 5
done
[ "$healthy" = true ] || { echo "Initial app did not become healthy"; exit 1; }
docker compose exec -T app ./node_modules/.bin/tsx src/db/seed/index.ts
echo "$SHA" > .deployed-sha
flock -u 9

# from now on every push to main deploys itself (deploy/autodeploy.sh, checked every 2 minutes)
bash /opt/cang/deploy/install-autodeploy.sh

# nightly backup
chmod +x /opt/cang/deploy/backup.sh 2>/dev/null || true
( crontab -l 2>/dev/null | grep -v 'cang backup'; echo "15 3 * * * cd /opt/cang && ./deploy/backup.sh >> /var/log/cang-backup.log 2>&1 # cang backup" ) | crontab -

echo "=== CANG bootstrap finished $(date -u) ==="
grep '^SEED_ADMIN_PASSWORD=' /opt/cang/.env > /root/ADMIN-LOGIN.txt
echo "admin@cang.vn" >> /root/ADMIN-LOGIN.txt
docker compose ps
