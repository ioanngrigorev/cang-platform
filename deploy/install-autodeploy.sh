#!/bin/bash
# CANG — install (or refresh) the auto-deploy timer. Run as root; the bootstrap calls it.
# After this, every push to main is deployed within a few minutes (plus ~10 min of build).
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/cang}"

command -v git >/dev/null && command -v rsync >/dev/null && command -v flock >/dev/null || {
  apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq git rsync util-linux >/dev/null
}
chmod +x "$APP_DIR"/deploy/*.sh

cat > /etc/systemd/system/cang-autodeploy.service <<EOF
[Unit]
Description=CANG auto-deploy (deploys new commits on main)
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/bin/bash $APP_DIR/deploy/autodeploy.sh
TimeoutStartSec=3600
Nice=5
EOF

cat > /etc/systemd/system/cang-autodeploy.timer <<EOF
[Unit]
Description=Check for new CANG commits every 2 minutes

[Timer]
OnBootSec=3min
OnUnitInactiveSec=2min
Persistent=false

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now cang-autodeploy.timer
echo "auto-deploy timer installed: $(systemctl is-active cang-autodeploy.timer)"
