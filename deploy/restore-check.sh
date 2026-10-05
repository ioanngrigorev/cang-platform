#!/usr/bin/env bash
# Validate a backup in a NEW temporary database. Never restores over the live database.
set -euo pipefail
umask 077
: "${1:?Usage: bash deploy/restore-check.sh /absolute/path/to/database.dump}"
backup="$(realpath "$1")"
[ -s "$backup" ] || { echo 'Backup not found or empty' >&2; exit 1; }
user="$(docker compose exec -T db printenv POSTGRES_USER)"
scratch="cang_restore_check_$(date +%s)_$$"
cleanup() { docker compose exec -T db dropdb -U "$user" --if-exists "$scratch" >/dev/null; }
trap cleanup EXIT
docker compose exec -T db createdb -U "$user" "$scratch"
docker compose exec -T db pg_restore -U "$user" -d "$scratch" --exit-on-error --no-owner --no-privileges < "$backup"
docker compose exec -T db psql -v ON_ERROR_STOP=1 -U "$user" -d "$scratch" -c 'SELECT count(*) AS users FROM users; SELECT count(*) AS companies FROM companies; SELECT count(*) AS orders FROM orders; SELECT count(*) AS payments FROM payments;'
echo 'Database restore completed in an isolated database. Verify uploads separately.'
