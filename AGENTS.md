# CANG project instructions

## Source and release authorization

- Source of truth: `/Users/ivangrigorev/CANG/cang-push` on Ivan's Mac.
- On 2026-10-05 Ivan explicitly authorized assistants to publish CANG to production
  on his request without a separate manual push or routine confirmation.
- This supersedes the earlier handover rule that only Ivan performs `git push`.
- A request to release/deploy to production authorizes the necessary commit,
  fast-forward push to main, CI monitoring, deployment, health checks and recovery.
- Ordinary coding/review requests do not implicitly authorize a production release.
- Never force-push main or overwrite unrelated local work. Fetch and reconcile
  remote changes before a release. Never publish secrets.

## Access

- GitHub: `ioanngrigorev/cang-platform`. Use the existing `gh` login/credential helper;
  never print tokens or copy them into the repository or command-line arguments.
- Server: `ssh cang-prod` (149.28.158.60, root). A dedicated local SSH identity is
  configured on Ivan's Mac. Server-side installation must be verified before use.
- First-time setup status and release procedure: `deploy/assistant-release.md`.
- Production secrets remain in `/opt/cang/.env`; do not display them or ADMIN-LOGIN.txt.

## Release checks

1. Read `deploy/README.md`. Complete its first-hardening-release procedure before
   pushing main while the legacy timer is still installed.
2. Run checks appropriate to changes. The `Quality checks` push workflow must pass
   for the exact main SHA before the updated timer deploys it.
3. Push only the intended reviewed commit, without force. Watch CI and deployment
   through completion; a successful push alone is not a completed release.
4. Confirm `https://cang.vn/api/health` reports the exact SHA and a healthy database;
   smoke-test `/en` and `/vi` and the changed functionality.
5. On failure inspect logs, confirm rollback health, fix the cause and retry within
   the authorized release. Do not bypass CI or perform destructive DB rollback.
6. Report the deployed SHA, verification and any unresolved limitation.

Use pnpm 10.34.6 and Node 22. Database integration tests must target an isolated
local database ending in `_test`. Never run demo seed or E2E writes against production.
