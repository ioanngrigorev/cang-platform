#!/bin/sh
# CANG application entrypoint (runs inside the `runner` image as the non-root `nextjs` user).
#   1. wait for PostgreSQL
#   2. apply Drizzle migrations from ./drizzle (idempotent — tracked in drizzle.__drizzle_migrations)
#   3. exec the Next.js standalone server
#
# Seeding is deliberately NOT done here. Run it once, by hand:
#   docker compose exec app node_modules/.bin/tsx src/db/seed/index.ts
# (see deploy/README.md for what the seed creates and the SEED_DEMO_DATA note).
set -eu

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${SESSION_SECRET:?SESSION_SECRET is required}"

DB_WAIT_SECONDS="${DB_WAIT_SECONDS:-60}"
SKIP_MIGRATIONS="${SKIP_MIGRATIONS:-false}"

log() { printf '%s [entrypoint] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }

log "waiting for database (up to ${DB_WAIT_SECONDS}s)"
i=0
until pg_isready -d "$DATABASE_URL" -q 2>/dev/null; do
  i=$((i + 1))
  if [ "$i" -ge "$DB_WAIT_SECONDS" ]; then
    log "database not reachable after ${DB_WAIT_SECONDS}s — giving up"
    exit 1
  fi
  sleep 1
done
log "database is ready"

if [ "$SKIP_MIGRATIONS" = "true" ]; then
  log "SKIP_MIGRATIONS=true — not applying migrations"
else
  log "applying migrations"
  # tsx lives in the production node_modules copied into the image (see Dockerfile prod-deps stage).
  node_modules/.bin/tsx src/db/migrate.ts
  log "migrations applied"
fi

log "starting server on ${HOSTNAME:-0.0.0.0}:${PORT:-3000}"
exec node server.js
