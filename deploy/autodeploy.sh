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

umask 077
auth_config="$(mktemp)"
trap 'rm -f "$auth_config"' EXIT
if [ -s "$TOKEN_FILE" ]; then
  printf 'header = "Authorization: Bearer %s"\n' "$(tr -d '[:space:]' < "$TOKEN_FILE")" > "$auth_config"
fi
head="$(curl -fsS --max-time 30 --config "$auth_config" "https://api.github.com/repos/$REPO/commits/main" 2>/dev/null | python3 -c 'import json,sys;print(json.load(sys.stdin)["sha"])' 2>/dev/null)"
[[ "$head" =~ ^[0-9a-f]{40}$ ]] || { echo "cannot read main (network or credentials)"; exit 1; }

deployed="$(cat "$APP_DIR/.deployed-sha" 2>/dev/null || true)"
failed="$(cat "$APP_DIR/.failed-sha" 2>/dev/null || true)"
[ "$head" = "$deployed" ] && exit 0
[ "$head" = "$failed" ] && exit 0

# A push must pass the quality workflow before it reaches production.
runs="$(curl -fsS --max-time 30 --config "$auth_config" "https://api.github.com/repos/$REPO/actions/runs?head_sha=$head&per_page=100")" || { echo "cannot read CI status"; exit 1; }
ci="$(printf '%s' "$runs" | python3 -c 'import json,sys; runs=[r for r in json.load(sys.stdin).get("workflow_runs",[]) if r.get("name")=="Quality checks" and r.get("head_branch")=="main" and r.get("event")=="push"]; print(runs[0].get("conclusion") if runs else "waiting")')"
[ "$ci" = success ] || { echo "waiting for successful Quality checks on ${head:0:7} ($ci)"; exit 0; }

mkdir -p "$LOG_DIR"
log="$LOG_DIR/$(date -u +%Y%m%d-%H%M%S)-${head:0:7}.log"
echo "new commit ${head:0:7} (deployed: ${deployed:0:7}) — deploying, log: $log"
if CANG_DEPLOY_LOCK_HELD=1 bash "$APP_DIR/deploy/update.sh" "$head" >"$log" 2>&1; then
  echo "deployed ${head:0:7}"
else
  echo "$head" > "$APP_DIR/.failed-sha"
  echo "deploy of ${head:0:7} FAILED — see $log"
  tail -n 30 "$log"
  exit 1
fi
ls -1t "$LOG_DIR"/*.log 2>/dev/null | tail -n +21 | xargs -r rm -f
exit 0
