#!/bin/bash
# CANG production bootstrap — runs as root on first boot (Vultr startup script).
exec > >(tee -a /var/log/cang-bootstrap.log) 2>&1
set -x
echo "=== CANG bootstrap started $(date -u) ==="

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg ufw jq >/dev/null

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

# source: the current head of main (update.sh below syncs exactly this commit and bakes it into the image)
apt-get install -y -qq git rsync >/dev/null
REPO=ioanngrigorev/cang-platform
SHA="$(git ls-remote https://github.com/$REPO.git refs/heads/main | cut -f1)"
mkdir -p /opt/cang && cd /opt/cang
curl -fsSL -o /tmp/src.tgz "https://codeload.github.com/$REPO/tar.gz/${SHA}"
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

SEED_DEMO_DATA=true
SEED_ADMIN_EMAIL=admin@cang.vn
SEED_ADMIN_PASSWORD=${ADMIN_PASS}

STORAGE_PROVIDER=local
SEARCH_PROVIDER=postgres
EMAIL_PROVIDER=console
EMAIL_FROM=CANG <no-reply@cang.vn>
OTP_PROVIDER=console

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
SMTP_URL=
ENVEOF
chmod 600 /opt/cang/.env; fi

# build, start, wait for the new version, seed — the same path the auto-deploy timer uses
exec 9>/var/lock/cang-deploy.lock
flock 9
bash /opt/cang/deploy/update.sh "$SHA"
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
