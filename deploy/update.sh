#!/usr/bin/env bash
# Deploy a commit with a database/upload backup and verified image/config rollback.
# Schema rollback is deliberately not automatic: migrations must remain backward compatible.
set -Eeuo pipefail
umask 077

main() {
  repo="${CANG_REPO:-ioanngrigorev/cang-platform}"
  app_dir="${APP_DIR:-/opt/cang}" token_file="${TOKEN_FILE:-/root/.cang-github-token}"
  sha="${1:-}"
  stage=""
  previous_sha=""
  previous_image=""
  changed=false
  log() { printf '%s [update] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }
  if [ "${CANG_DEPLOY_LOCK_HELD:-0}" != 1 ]; then
    exec 9>/var/lock/cang-deploy.lock
    flock -n 9 || { log 'another deployment is running'; return 1; }
  fi
  stage="$(mktemp -d /tmp/cang-release.XXXXXX)"
  : > "$stage/auth"
  curl_auth=(--config "$stage/auth")
  # Credentials stay in a private curl config, never in a URL or process argument.
  if [ -s "$token_file" ]; then
    printf 'header = "Authorization: Bearer %s"\n' "$(tr -d '[:space:]' < "$token_file")" > "$stage/auth"
  fi
  if [ -z "$sha" ]; then
    sha="$(curl -fsS --max-time 30 "${curl_auth[@]}" "https://api.github.com/repos/$repo/commits/main" | python3 -c 'import json,sys;print(json.load(sys.stdin)["sha"])')"
  fi
  [[ "$sha" =~ ^[0-9a-f]{40}$ ]] || { rm -rf "$stage"; log 'invalid commit'; return 1; }
  cd "$app_dir"
  previous_sha="$(cat .deployed-sha 2>/dev/null || true)"
  previous_image="$(docker inspect --format '{{.Image}}' "$(docker compose ps -q app)" 2>/dev/null || true)"
  if [ -z "$previous_image" ]; then rm -rf "$stage"; log 'no running app: use bootstrap for initial installation'; return 1; fi
  mkdir -p "$stage/previous" "$stage/source"
  rsync -a --exclude='/.env' --exclude='/storage/' --exclude='/node_modules/' --exclude='/.git/' --exclude='/.next/' ./ "$stage/previous/"

  healthy() {
    local expected="$1" v
    for _ in $(seq 1 60); do
      v="$(docker compose exec -T app wget -qO- http://127.0.0.1:3000/api/health 2>/dev/null </dev/null | sed -n 's/.*"version":"\([0-9a-f]*\)".*/\1/p' || true)"
      if [ -n "$v" ] && { [ -z "$expected" ] || [ "$v" = "$expected" ]; }; then return 0; fi
      sleep 5
    done
    return 1
  }
  sync_source() {
    rsync -ac --delete --exclude='/.env' --exclude='/.deployed-sha' --exclude='/.failed-sha' --exclude='/.autodeploy-paused' --exclude='/storage/' --exclude='/node_modules/' --exclude='/.git/' --exclude='/.next/' "$1/" "$app_dir/"
  }
  finish() {
    local code=$?
    trap - EXIT
    if [ "$code" -ne 0 ]; then
      echo "$sha" > "$app_dir/.failed-sha"
      if [ "$changed" = true ]; then
        log 'deployment failed; restoring previous source, Compose, Caddy and app image'
        sync_source "$stage/previous" || true
        # Resolve the actual configured image name instead of assuming cang/app:latest.
        local image_name
        image_name="$(docker compose config --format json | python3 -c 'import json,sys;print(json.load(sys.stdin)["services"]["app"]["image"])')"
        docker tag "$previous_image" "$image_name" || true
        export BUILD_SHA="$previous_sha"
        docker compose up -d --no-build app || true
        docker compose up -d --no-build --force-recreate caddy || true
        docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile >/dev/null 2>&1 || true
        if healthy "$previous_sha"; then log 'rollback verified'; else log 'CRITICAL: rollback did not become healthy; operator action required'; fi
      fi
    fi
    rm -rf "$stage"
    exit "$code"
  }
  trap finish EXIT
  log "downloading $sha"
  curl -fsSL --max-time 180 "${curl_auth[@]}" -o "$stage/src.tgz" "https://codeload.github.com/$repo/tar.gz/$sha"
  tar xzf "$stage/src.tgz" --strip-components=1 -C "$stage/source"
  # A failed backup aborts before application files or schema are changed.
  bash deploy/backup.sh
  changed=true
  sync_source "$stage/source"
  export BUILD_SHA="$sha"
  BUILD_NODE_OPTIONS="--max-old-space-size=3072" docker compose build app
  docker compose run --rm --no-deps caddy caddy validate --config /etc/caddy/Caddyfile
  docker compose up -d --no-build app
  docker compose up -d --no-build --force-recreate caddy
  docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile
  healthy "$sha" || { log 'new app did not become healthy'; return 1; }
  # Business settings and demo data are not re-seeded on release.
  echo "$sha" > .deployed-sha
  rm -f .failed-sha
  log "deployed $sha"
}
main "$@"
