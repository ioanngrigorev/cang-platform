#!/usr/bin/env bash
# CANG — nightly backup: pg_dump (custom format) + uploads volume, 14-day local rotation,
# optional off-host copy with rclone.
#
# Install on the VPS (as the deploy user that owns the compose project):
#   sudo cp deploy/backup.sh /usr/local/bin/cang-backup && sudo chmod +x /usr/local/bin/cang-backup
#   crontab -e  →  30 2 * * * cd /opt/cang && /usr/local/bin/cang-backup >> /var/log/cang-backup.log 2>&1
#
# Environment (optional):
#   BACKUP_DIR       default /var/backups/cang
#   RETENTION_DAYS   default 14
#   BACKUP_REMOTE    rclone remote:path (e.g. "r2:cang-backups"); when set, dumps are copied off-host
#   COMPOSE_PROJECT  default "cang" (must match `name:` in docker-compose.yml)
#   SKIP_UPLOADS     "true" once STORAGE_PROVIDER=s3 (uploads then live in the bucket, not the volume)
#
# Restore (database):
#   docker compose exec -T db pg_restore -U cang -d cang --clean --if-exists < /var/backups/cang/db/cang-YYYYmmdd-HHMM.dump
# Restore (uploads):
#   docker run --rm -v cang_uploads:/data -v /var/backups/cang/uploads:/backup alpine \
#     sh -c "cd /data && tar xzf /backup/uploads-YYYYmmdd.tar.gz"

set -euo pipefail
umask 077

BACKUP_DIR="${BACKUP_DIR:-/var/backups/cang}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
BACKUP_REMOTE="${BACKUP_REMOTE:-}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-cang}"
SKIP_UPLOADS="${SKIP_UPLOADS:-false}"

STAMP="$(date +%Y%m%d-%H%M%S)"
DB_DIR="${BACKUP_DIR}/db"
UP_DIR="${BACKUP_DIR}/uploads"
mkdir -p "$DB_DIR" "$UP_DIR"

log() { printf '%s [backup] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }
fail() { log "ERROR: $*"; exit 1; }

# Read the running database configuration without executing the dotenv file as shell code.
PGUSER="$(docker compose exec -T db printenv POSTGRES_USER)"
PGDB="$(docker compose exec -T db printenv POSTGRES_DB)"

# ---- 1. database ----
DB_FILE="${DB_DIR}/${PGDB}-${STAMP}.dump"
log "dumping database ${PGDB} → ${DB_FILE}"
docker compose exec -T db pg_dump -U "$PGUSER" -d "$PGDB" -Fc --no-owner --no-privileges > "${DB_FILE}.partial" \
  || fail "pg_dump failed"
[ -s "${DB_FILE}.partial" ] || fail "dump is empty"
docker compose exec -T db pg_restore --list < "${DB_FILE}.partial" >/dev/null || fail "dump archive is unreadable"
mv "${DB_FILE}.partial" "$DB_FILE"
sha256sum "$DB_FILE" > "${DB_FILE}.sha256"
log "database dump $(du -h "$DB_FILE" | cut -f1)"

# ---- 2. uploads volume ----
if [ "$SKIP_UPLOADS" != "true" ]; then
  UP_FILE="${UP_DIR}/uploads-${STAMP}.tar.gz"
  log "archiving uploads volume → ${UP_FILE}"
  docker run --rm -v "${COMPOSE_PROJECT}_uploads:/data:ro" -v "${UP_DIR}:/backup" alpine \
    sh -c "umask 077; cd /data && tar czf /backup/uploads-${STAMP}.tar.gz.partial ." \
    || fail "uploads archive failed"
  tar tzf "${UP_FILE}.partial" >/dev/null || fail "uploads archive is unreadable"
  mv "${UP_FILE}.partial" "$UP_FILE"
  sha256sum "$UP_FILE" > "${UP_FILE}.sha256"
  log "uploads archive $(du -h "$UP_FILE" | cut -f1)"
else
  log "SKIP_UPLOADS=true — uploads live in object storage"
fi

# ---- 3. off-host copy ----
if [ -n "$BACKUP_REMOTE" ]; then
  command -v rclone >/dev/null 2>&1 || fail "rclone not installed but BACKUP_REMOTE is set"
  log "copying to ${BACKUP_REMOTE}"
  rclone copy "$DB_DIR" "${BACKUP_REMOTE}/db" --include "*-${STAMP}.dump*" || fail "rclone db copy failed"
  if [ "$SKIP_UPLOADS" != "true" ]; then
    rclone copy "$UP_DIR" "${BACKUP_REMOTE}/uploads" --include "uploads-${STAMP}.tar.gz*" || fail "rclone uploads copy failed"
  fi
fi

# ---- 4. rotation (14 days) ----
log "pruning local backups older than ${RETENTION_DAYS} days"
find "$DB_DIR" -type f -name '*.dump*' -mtime "+${RETENTION_DAYS}" -print -delete
find "$UP_DIR" -type f -name 'uploads-*.tar.gz*' -mtime "+${RETENTION_DAYS}" -print -delete

log "done"
