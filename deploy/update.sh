#!/bin/bash
# CANG — deploy one commit of main to /opt/cang (run as root on the server).
#
#   bash /opt/cang/deploy/update.sh [<commit sha>]      # default: the current head of main
#
# Downloads that commit's source, syncs it into /opt/cang (keeping .env and local state), rebuilds the
# app image with the commit baked in (GET /api/health → "version"), restarts it, waits until the new
# version answers, then runs the idempotent seed. If the new container does not come up healthy the
# previous image is started again, so a bad commit never leaves the site down.
# Used by the auto-deploy timer (deploy/autodeploy.sh) and safe to run by hand.
set -euo pipefail

REPO="${CANG_REPO:-ioanngrigorev/cang-platform}"
APP_DIR="${APP_DIR:-/opt/cang}"
TOKEN_FILE=/root/.cang-github-token   # optional read token, needed once the repository is private
log() { printf '%s [update] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }

auth_url="https://github.com/$REPO.git"
curl_auth=()
if [ -s "$TOKEN_FILE" ]; then
  token="$(tr -d '[:space:]' < "$TOKEN_FILE")"
  auth_url="https://x-access-token:${token}@github.com/$REPO.git"
  curl_auth=(-H "Authorization: token ${token}")
fi

SHA="${1:-}"
if [ -z "$SHA" ]; then SHA="$(git ls-remote "$auth_url" refs/heads/main | cut -f1)"; fi
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || { log "cannot resolve commit (got '$SHA')"; exit 1; }
log "deploying $SHA"

# 1. source → staging dir → /opt/cang (deleted files disappear; .env and runtime files stay)
stage="$(mktemp -d /tmp/cang-src.XXXXXX)"
trap 'rm -rf "$stage"' EXIT
curl -fsSL "${curl_auth[@]}" -o "$stage/src.tgz" "https://codeload.github.com/$REPO/tar.gz/$SHA"
mkdir -p "$stage/src" && tar xzf "$stage/src.tgz" --strip-components=1 -C "$stage/src"
mkdir -p "$APP_DIR"
rsync -a --delete \
  --exclude '/.env' --exclude '/.deployed-sha' --exclude '/.failed-sha' --exclude '/storage/' \
  "$stage/src/" "$APP_DIR/"
chmod +x "$APP_DIR"/deploy/*.sh 2>/dev/null || true

# 2. build with the commit baked in; keep the running image as a fallback
cd "$APP_DIR"
if docker image inspect cang/app:latest >/dev/null 2>&1; then docker tag cang/app:latest cang/app:previous; fi
export BUILD_SHA="$SHA"
BUILD_NODE_OPTIONS="--max-old-space-size=3072" docker compose build app
docker compose up -d

# 3. wait for the new version (migrations run in the entrypoint before the server starts)
healthy=false
for _ in $(seq 1 60); do
  v="$(docker compose exec -T app wget -qO- http://127.0.0.1:3000/api/health 2>/dev/null </dev/null | sed -n 's/.*"version":"\([0-9a-f]*\)".*/\1/p' || true)"
  if [ "$v" = "$SHA" ]; then healthy=true; break; fi
  sleep 5
done
if [ "$healthy" != true ]; then
  log "new version did not become healthy — rolling back to the previous image"
  docker compose logs --tail 80 app || true
  if docker image inspect cang/app:previous >/dev/null 2>&1; then
    docker tag cang/app:previous cang/app:latest
    docker compose up -d app
  fi
  exit 1
fi

# 4. reference/demo data (idempotent), bookkeeping, cleanup
docker compose exec -T app sh -lc 'node_modules/.bin/tsx src/db/seed/index.ts' </dev/null || log "seed failed (the site is up; check the log)"
echo "$SHA" > "$APP_DIR/.deployed-sha"
rm -f "$APP_DIR/.failed-sha"
docker image prune -f >/dev/null 2>&1 || true
log "deployed $SHA"
