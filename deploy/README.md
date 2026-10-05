# CANG production operations

Source of truth: Ivan's `~/CANG/cang-push`. Assistants may push and deploy on Ivan's
explicit release request (authorization updated 2026-10-05); see `AGENTS.md` and
[assistant release setup](assistant-release.md).
VPS: `cang-prod`, 149.28.158.60, Vultr Singapore; app directory `/opt/cang`.
Secrets belong in `/opt/cang/.env`, never in Git, logs or support messages.

## Release process

1. `Quality checks` runs lint, type checks, unit/integration tests, dependency audit,
   production build, the 29-step journey and the five-role link audit.
2. The systemd timer checks `main` every two minutes and waits for a successful
   **push** workflow for that exact commit. A failed/missing workflow does not deploy.
3. `deploy/update.sh` takes a DB/uploads backup before changing source or schema.
4. It builds the image, validates Caddy, starts the app, recreates Caddy to remount
   its configuration and verifies `/api/health` against the expected SHA.
5. On failure it restores the previous source/Compose/Caddy and actual running app
   image, then checks rollback health. `.env`, uploads and the pause marker survive.

Regular releases **do not run seed**. `seedPlatform` and `seedReference` insert
missing defaults without overwriting operator settings. New mandatory data must
be introduced by a migration or an explicit reviewed initialization command.

Only backward-compatible migrations belong in an automatic release. Image rollback
cannot reverse data migrations. Do not use `docker compose down -v` on production.

Runtime: Node 22 LTS, pnpm 10.34.6, PostgreSQL 16, Redis 7, Caddy 2.
Node 20 is EOL; see [Node's release table](https://nodejs.org/en/about/previous-releases).

## First hardening release (migration from the old deploy scripts)

The old timer does not wait for CI and the old update script has no pre-deploy backup.
Before the first authorized push of this release to main:

1. On the VPS, `touch /opt/cang/.autodeploy-paused` and stop `cang-autodeploy.timer`.
2. From the reviewed working copy, copy `deploy/update.sh`, `deploy/autodeploy.sh`,
   `deploy/backup.sh` and `deploy/restore-check.sh` to `/opt/cang/deploy/` via the verified SSH connection.
3. Run an existing backup and verify a restore in a separate database. Check for
   historical duplicate quotation orders before migration 0004:

   ```sql
   SELECT quotation_id, count(*) FROM orders
   WHERE quotation_id IS NOT NULL
   GROUP BY quotation_id HAVING count(*) > 1;
   ```

   If there are duplicates, investigate them before release. Migration 0004 refuses
   to create its unique index; it never deletes orders or rewrites financial history.
4. The authorized releaser pushes main and waits for `Quality checks` to succeed. With a feature
   branch checked out, `git push origin HEAD:main` updates remote main explicitly.
5. Remove the pause marker and restart the timer. Verify the exact SHA at
   `https://cang.vn/api/health` and inspect the deploy log.

These steps require the owner's existing server access. Do not paste passwords or
private keys into a chat. Bootstrap is for initial installation, not the routine
update or rollback path.

## Useful commands (on the VPS)

```bash
cd /opt/cang
docker compose ps
docker compose logs --tail 100 app
journalctl -u cang-autodeploy --since today
cat .deployed-sha
# pause / resume
touch .autodeploy-paused
rm .autodeploy-paused
# retry a failed SHA after resolving its cause
rm .failed-sha
# explicit manual deploy (operator must check CI first)
bash deploy/update.sh <40-character-commit-sha>
```

Logs: `/var/log/cang-deploy/`. A failed deploy exits nonzero and records `.failed-sha`.
Configure external uptime and systemd failure alerts; the scripts log failures but
no external alerting account is configured by this repository.

## Private GitHub repository and tokens

Provision `/root/.cang-github-token` with mode 600 before changing repository visibility.
A fine-grained token needs **Contents: read** and **Actions: read** on this repository.
The latter is required to check CI. The token is passed in a temporary curl config,
not embedded in command-line URLs. Revoke previously exposed tokens in GitHub;
removing a value from a chat or Git history does not revoke it.

## Backups and restore checks

```bash
cd /opt/cang
bash deploy/backup.sh
bash deploy/restore-check.sh /var/backups/cang/db/<backup>.dump
```

`restore-check.sh` creates a unique temporary database, restores with
`--exit-on-error`, reads core tables and drops only that temporary database.
It never targets the live database. Verify uploaded files separately in a scratch
volume. Configure `BACKUP_REMOTE` with rclone for an off-host copy; local-only
backups do not protect against loss of the VPS. Default local retention is 14 days.
Backups use private file permissions and validate the dump catalogue before rotation.

## Email

Use `EMAIL_PROVIDER=resend` + `RESEND_API_KEY`, or `EMAIL_PROVIDER=smtp` + `SMTP_URL`.
Set `EMAIL_FROM`, verify the sending domain and SPF/DKIM/DMARC with the selected
provider, then recreate the app container and send a test from Admin → Providers.
Test registration, password reset and team invitations using real inboxes.
Console transport only logs recipient/subject; it does not deliver reset links.
The repository does not contain provider credentials. The current email sender
has no durable delivery queue: delivery failures are logged, and mail-provider
monitoring remains required.

## Accounts and commercial readiness

* The old bootstrap used shell tracing. Treat secrets in its historical logs as
  exposed to anyone who could read those logs; rotate the DB password, session
  secret and admin password through a coordinated maintenance procedure.
* Set `SEED_DEMO_DATA=false` for production initialization. Existing demo records
  are not deleted automatically. Review them before admitting real customers.
* A fresh production admin requires an explicit strong `SEED_ADMIN_PASSWORD`.
  Existing accounts are preserved. Change existing demo/admin passwords separately;
  ordinary password changes now revoke all prior sessions.
* The payment adapter is **manual bank transfer accounting**, not a banking API.
  Finance staff must confirm real receipt/release/refund with the bank. The adapter
  does not send money. Configure real beneficiary details before taking payments.
* Future gateway adapters need provider-side idempotency in addition to DB locking.
* Corporate bans disable company membership/API operations. Personal account access
  can be suspended separately in Admin → Users.
* DNS is managed at iNET. The owner reported expiry on **20 October 2026**; verify
  renewal in iNET under “Gia hạn”. No renewal is performed by these scripts.

## Local checks

Use Node 22 and `corepack enable` to select the pinned pnpm version.

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm build
# Only a dedicated localhost database whose name ends with _test:
DATABASE_URL=postgresql://cang:cang@127.0.0.1:5432/cang_integration_test pnpm db:migrate
DATABASE_URL=postgresql://cang:cang@127.0.0.1:5432/cang_integration_test pnpm db:seed
DATABASE_URL=postgresql://cang:cang@127.0.0.1:5432/cang_integration_test pnpm test:integration
pnpm exec playwright install chromium
# Start the production build locally with that test database before these commands:
BASE=http://localhost:3216 pnpm test:e2e
BASE=http://localhost:3216 pnpm test:links
```

Provide `SESSION_SECRET` (32+ characters, test-only) for integration tests and app
startup. Set `PW_CHROMIUM` only to use an existing Chrome binary; otherwise Playwright
uses its installed Chromium. Both E2E scripts now return a failing exit code when
their assertions fail. `TEST_REDIS_URL` enables the cross-process Redis regression.
