#!/bin/bash
# CANG — auto-deploy: run every few minutes by the cang-autodeploy systemd timer.
# When main has a commit that is neither deployed nor known to have failed, deploys it with update.sh.
# Logs: /var/log/cang-deploy/<time>-<sha>.log (last 20 kept) and `journalctl -u cang-autodeploy`.
# Pause: touch /opt/cang/.autodeploy-paused   Resume: rm /opt/cang/.autodeploy-paused
# Retry a failed commit: rm /opt/cang/.failed-sha
set -uo pipefail

REPO="${CANG_REPO:-ioanngrigorev/cang-platform}"
APP_DIR="${APP_DIR:-/opt/cang}"
LOG_DIR=/var/log/cang-deploy
TOKEN_FILE=/root/.cang-github-token

[ -e "$APP_DIR/.autodeploy-paused" ] && exit 0

# One deploy at a time (the bootstrap takes the same lock).
exec 9>/var/lock/cang-deploy.lock
flock -n 9 || exit 0

url="https://github.com/$REPO.git"
if [ -s "$TOKEN_FILE" ]; then url="https://x-access-token:$(tr -d '[:space:]' < "$TOKEN_FILE")@github.com/$REPO.git"; fi
head="$(timeout 30 git ls-remote "$url" refs/heads/main 2>/dev/null | cut -f1)"
[[ "$head" =~ ^[0-9a-f]{40}$ ]] || { echo "cannot read main (network?)"; exit 0; }

deployed="$(cat "$APP_DIR/.deployed-sha" 2>/dev/null || true)"
failed="$(cat "$APP_DIR/.failed-sha" 2>/dev/null || true)"
[ "$head" = "$deployed" ] && exit 0
[ "$head" = "$failed" ] && exit 0

mkdir -p "$LOG_DIR"
log="$LOG_DIR/$(date -u +%Y%m%d-%H%M%S)-${head:0:7}.log"
echo "new commit ${head:0:7} (deployed: ${deployed:0:7}) — deploying, log: $log"
if bash "$APP_DIR/deploy/update.sh" "$head" >"$log" 2>&1; then
  echo "deployed ${head:0:7}"
else
  echo "$head" > "$APP_DIR/.failed-sha"
  echo "deploy of ${head:0:7} FAILED — see $log"
  tail -n 30 "$log"
fi
ls -1t "$LOG_DIR"/*.log 2>/dev/null | tail -n +21 | xargs -r rm -f
exit 0
