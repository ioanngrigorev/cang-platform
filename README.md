# CANG — Vietnam-first global B2B industrial marketplace

**cang.vn** connects international buyers with verified Vietnamese manufacturers and orchestrates the whole
trade: discovery, RFQ and quotation, messaging, orders with a configurable lifecycle, payment orchestration
through licensed partners (Trade Assurance), financing routing, logistics, inspection, reviews and
monetization — all in one modular monolith.

CANG is **not a bank**: it never holds funds. Payments, escrow and lending are performed by licensed partners
behind adapter interfaces; CANG records, routes and charges configurable fees.

> Build state: the data layer, domain services, auth/RBAC, i18n plumbing and UI kit are working; public
> marketplace pages and dashboard pages are the next deliverable. See
> [`docs/07-mvp-boundaries.md`](docs/07-mvp-boundaries.md) for the honest feature-by-feature status.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15.5 (App Router, React 19, Server Components + Server Actions), TypeScript strict |
| Database | PostgreSQL 16, Drizzle ORM 0.45 (`casing: "snake_case"`), SQL migrations in `drizzle/` |
| Search | PostgreSQL generated `tsvector` columns + GIN, behind a `SearchProvider` interface (OpenSearch-ready) |
| Auth | DB-backed sessions (HMAC-hashed tokens), bcrypt, Google OAuth, OTP abstraction, 2FA fields |
| i18n | `next-intl` 4, `/en` and `/vi` (`zh`, `ko`, `ja`, `ru`, `th`, `id` planned) |
| UI | Tailwind CSS 3.4, design tokens, `lucide-react`, Inter / Manrope |
| Validation | zod 3 |
| Infra | Docker Compose (app, PostgreSQL, Redis, Caddy) on an Ubuntu VPS; local disk → S3/CDN for uploads |

---

## Quick start

Requirements: **Node 20+**, **pnpm 10** (`corepack enable && corepack prepare pnpm@10 --activate`), and **PostgreSQL 16** (local install or Docker).

```bash
# 1. database (Docker) — or point DATABASE_URL at your own PostgreSQL 16
docker compose -f docker-compose.dev.yml up -d

# 2. configure
cp .env.example .env            # defaults match the dev compose file; set SESSION_SECRET (≥ 32 chars)

# 3. install, migrate, seed, run
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev                        # http://localhost:3000 → redirects to /en
```

`pnpm setup` runs install + migrate + seed in one go. `pnpm db:reset` drops and recreates the schema
(refuses in production).

### Demo accounts

Created by `pnpm db:seed` (passwords from `SEED_ADMIN_PASSWORD` / `SEED_DEMO_PASSWORD` in `.env`):

| Account | Password | Role |
|---|---|---|
| `admin@cang.vn` | `Admin123!` | `SUPER_ADMIN` → `/en/admin` |
| `buyer@nordwind-outdoor.de` | `Password123!` | Owner of **Nordwind Outdoor GmbH** (Hamburg, buyer) → `/en/buyer` |
| `sales@saigonpack.vn` | `Password123!` | Owner of **Saigon Pack Manufacturing** (Ho Chi Minh City, manufacturer) → `/vi/seller` |

The seed is idempotent: reference data and platform configuration are upserted, demo companies are created
only if absent. **Do not seed demo accounts into production** — see [`deploy/README.md`](deploy/README.md) §5.

---

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Next.js dev server |
| `pnpm build` / `pnpm start` | Production build (`output: "standalone"`) / start |
| `pnpm typecheck` | `tsc --noEmit` (must pass) |
| `pnpm lint` | `next lint` |
| `pnpm db:generate` | Generate a SQL migration from schema changes (`drizzle-kit generate`) — review the SQL |
| `pnpm db:migrate` | Apply `drizzle/*.sql` in order (`src/db/migrate.ts`) |
| `pnpm db:push` | Push schema directly without a migration (dev only) |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm db:seed` | Seed reference data, platform config, admin user, demo companies |
| `pnpm db:reset` | Drop schema → migrate → seed (development only) |
| `pnpm setup` | `install` + `db:migrate` + `db:seed` |
| `pnpm test:e2e` | Playwright (`e2e/smoke-auth.mjs` is a standalone smoke script: `node e2e/smoke-auth.mjs` against a running dev server) |

---

## Folder overview

```
src/app/[locale]/(marketing)   public site           src/modules/*      domain logic (service · queries · schemas · actions)
src/app/[locale]/(auth)        login/register/…      src/db/schema/*    Drizzle schema (83 tables, 72 enums)
src/app/[locale]/(dashboard)   buyer · seller · admin src/db/seed/*     idempotent seeds
src/app/api/*                  route handlers        src/i18n/*         routing, navigation, message loading
src/components/{ui,layout,marketplace}               src/lib/*          env, action helpers, ids, rate-limit, seo, utils
drizzle/                       SQL migrations        src/messages/{en,vi}/*.json
deploy/                        Caddyfile, entrypoint, backup, VPS runbook
docs/                          architecture documentation (below)
```

Full annotated tree and "how to add a module / page / translation / migration":
[`docs/08-folder-structure.md`](docs/08-folder-structure.md). Engineering contract:
[`docs/CONVENTIONS.md`](docs/CONVENTIONS.md).

---

## Documentation

| Doc | Contents |
|---|---|
| [`docs/00-overview.md`](docs/00-overview.md) | Index, executive summary, build state, Prisma → Drizzle decision, terminology |
| [`docs/01-product-architecture.md`](docs/01-product-architecture.md) | Pillars, bounded contexts, module map, monetization engine, trust & badges, configurable order lifecycle, phasing |
| [`docs/02-sitemap.md`](docs/02-sitemap.md) | Every route: public, buyer, seller, admin, API — with SEO intent and status |
| [`docs/03-user-journeys.md`](docs/03-user-journeys.md) | Nine end-to-end journeys with table-level system actions |
| [`docs/04-er-model.md`](docs/04-er-model.md) | Schema conventions, ERDs, table-by-table reference |
| [`docs/05-permissions.md`](docs/05-permissions.md) | RBAC matrices, enforcement points, data scoping, audit, API keys, 2FA, sessions |
| [`docs/06-system-architecture.md`](docs/06-system-architecture.md) | Runtime, request flow, extraction plan, providers, caching, search, storage, observability, security, compliance, **deployment** |
| [`docs/07-mvp-boundaries.md`](docs/07-mvp-boundaries.md) | Phase 1 acceptance criteria, foundations, known limitations, out of scope |
| [`docs/08-folder-structure.md`](docs/08-folder-structure.md) | Annotated tree, naming, how-to-add guides |
| [`docs/09-roadmap.md`](docs/09-roadmap.md) | Phases 1–4 epics, effort, milestones, first-30-days ops checklist |
| [`docs/10-security-compliance.md`](docs/10-security-compliance.md) | Threat model, controls, data classification, retention, GDPR/PDPD, incident response |

---

## Deployment

Production runs as Docker Compose on a **Sprintbox** Ubuntu VPS with Caddy for TLS; the domain **cang.vn** is
registered and DNS-managed at **iNET**. Build the image with `docker compose build app`, start with
`docker compose up -d`; the app container applies migrations on boot.

Step-by-step runbook (server prep, DNS records, first admin login, backups, updates):
[`deploy/README.md`](deploy/README.md). Architecture, environment variables and scaling path:
[`docs/06-system-architecture.md`](docs/06-system-architecture.md) §12.

---

## License

Proprietary — © CANG. All rights reserved.
