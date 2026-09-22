# CANG — Architecture Documentation

CANG (`cang.vn`) is a Vietnam-first, globally-facing B2B industrial marketplace: a place where international
buyers find, evaluate and transact with Vietnamese factories, and where the whole trade — sourcing, quotation,
contract, payment, financing, inspection, logistics and settlement — is orchestrated in one system.

This directory is the architecture documentation set. It describes the product, the data model, the runtime,
the permissions, the deployment and the roadmap, and it states honestly what is built today versus what is
scaffolded or planned.

---

## 1. Document index

| Doc | Contents |
|---|---|
| [`00-overview.md`](00-overview.md) | This index, executive summary, Prisma→Drizzle decision record |
| [`01-product-architecture.md`](01-product-architecture.md) | Product pillars, bounded contexts, module map, monetization engine, trust & verification, badge rules, configurable order lifecycle, phasing |
| [`02-sitemap.md`](02-sitemap.md) | Every public route (purpose, SEO intent, indexability, data source), buyer/seller/admin dashboard sitemaps, API routes |
| [`03-user-journeys.md`](03-user-journeys.md) | Nine end-to-end journeys with table-level system actions, including the flagship German-backpack journey |
| [`04-er-model.md`](04-er-model.md) | Domain ERDs (Mermaid) + table-by-table reference for all 83 tables, schema conventions |
| [`05-permissions.md`](05-permissions.md) | Platform-role × permission and member-role × permission matrices, enforcement points, data scoping, audit, API keys, 2FA plan |
| [`06-system-architecture.md`](06-system-architecture.md) | Runtime architecture, request flow, provider abstractions, caching, search, storage, jobs, observability, security controls, compliance workflows, **deployment** (Docker Compose on Sprintbox, DNS at iNET, TLS, backups, scaling) |
| [`07-mvp-boundaries.md`](07-mvp-boundaries.md) | Phase 1 scope with acceptance criteria, foundations, known limitations, out of scope |
| [`08-folder-structure.md`](08-folder-structure.md) | Annotated repository tree, naming conventions, how to add a module / page / translation |
| [`09-roadmap.md`](09-roadmap.md) | Phase 1–4 epics, dependencies, effort, milestones, first-30-days ops checklist |
| [`10-security-compliance.md`](10-security-compliance.md) | STRIDE-lite threat model, control status, data classification, retention, GDPR/PDPD, incident response |
| [`CONVENTIONS.md`](CONVENTIONS.md) | Engineering contract — read before writing code (pre-existing) |
| [`er-model.prisma`](er-model.prisma) | The same relational model in Prisma notation (reference only, not executed) |

Companion files outside `docs/`:

| File | Contents |
|---|---|
| [`../README.md`](../README.md) | Project intro, stack, quick start, demo accounts, scripts, folder overview, docs index |
| [`../deploy/README.md`](../deploy/README.md) | Sprintbox VPS runbook: server prep, DNS at iNET, first start, seeding, first admin login, backups, updates |
| [`../docker-compose.yml`](../docker-compose.yml) · [`../docker-compose.dev.yml`](../docker-compose.dev.yml) | Production stack (db, redis, app, caddy) · local infrastructure (db, redis) |
| [`../Dockerfile`](../Dockerfile) · [`../.dockerignore`](../.dockerignore) | Multi-stage image (deps → build → prod-deps → runner) |
| [`../deploy/Caddyfile`](../deploy/Caddyfile) · [`../deploy/entrypoint.sh`](../deploy/entrypoint.sh) · [`../deploy/backup.sh`](../deploy/backup.sh) | TLS reverse proxy · migrate-then-start entrypoint · nightly backup with 14-day rotation |
| [`../.env.example`](../.env.example) | Every environment variable with safe defaults (explained in [`06-system-architecture.md`](06-system-architecture.md) §12.4) |

Reading order for a new engineer: `README.md` → `CONVENTIONS.md` → `01` → `04` → `05` → `08`, then the
document for the area being built. For an operator: `README.md` → `06` §12 → `deploy/README.md` → `10`.

---

## 2. Executive summary

**What it is.** A modular monolith on Next.js 15 (App Router, React 19, Server Components + Server Actions),
TypeScript, PostgreSQL 16 and Drizzle ORM. One deployable unit, internally divided into bounded contexts under
`src/modules/*`, each owning its tables, its service functions and its read models. Every cross-cutting
dependency that will eventually become a separate service — search, queues, object storage, payments,
financing, logistics, inspection, e-mail, OTP — is already behind a TypeScript interface with an environment
switch, so extraction is a deployment decision rather than a rewrite.

**What it does.** Six product pillars sit on one order object:

1. **Discovery** — manufacturer directory, product catalog, Postgres full-text search with weighted tsvector
   columns, category / industrial-cluster landing pages built for SEO.
2. **Demand** — RFQ marketplace, supplier auto-matching, quotation comparison, negotiation, messaging.
3. **Trust** — KYB and document verification, rule-driven badges, five-dimension verified-purchase reviews,
   sanctions/UBO/AML records, risk flags.
4. **Transaction** — a configurable order lifecycle (`order_statuses` rows, not an enum), payment orchestration
   through licensed partners, escrow-like Trade Assurance, invoices, disputes.
5. **Trade services** — financing marketplace routed to licensed lenders, logistics quote marketplace and
   shipment tracking, third-party quality inspection.
6. **Monetization** — subscription plans, transaction commission, orchestration fee, financing origination,
   logistics/inspection commission, advertising, RFQ priority, verification fees, API access. Every one of
   these is a `fee_rules` / `plans` / `ad_products` row editable from Admin, never a constant in code.

**What it is not.** CANG is not a bank, not a lender and not a licensed payment institution. It never takes
custody of buyer funds. `PaymentProviderAdapter` implementations talk to regulated partners; Trade Assurance
funds sit in a segregated account held by a licensed partner bank; `FinancingProvider` rows route applications
to licensed lenders and CANG records offers and origination fees but makes no credit decision. Credit scoring
is a configurable rule set (`credit_scoring_rules`) producing auditable snapshots (`credit_scores`) that
lenders may consume — no lending outcome is hard-coded.

**Configurability as an architectural principle.** Anything a business operator will want to change without a
deploy is a database row: order statuses and their allowed transitions, badge rules (`badges.ruleConfig`), fee
rules and tiers, plans and plan limits, ad products, payment/financing/logistics/inspection providers, homepage
sections, CMS pages, banners, e-mail templates and the `settings` key/value table. Anything inherent to the
domain — payment status, RFQ status, Incoterm, document type — is a PostgreSQL enum.

**Internationalisation.** `next-intl` with `localePrefix: "always"`: `/en/...` and `/vi/...` today,
architected for `zh`, `ko`, `ja`, `ru`, `th`, `id` (declared in `src/i18n/routing.ts` as `plannedLocales`).
Catalog text is localized in-row (`name` / `nameVi`) with `localized(row, field, locale)`; translation tables
come later when more locales land.

**Current build state (honest).** The data layer and the domain services are real and complete for Phase 1's
core; the presentation layer is largely still to be built. Concretely:

| Layer | State |
|---|---|
| Schema — 83 tables, 72 enums, 2 migrations, generated tsvector + GIN indexes | **Working** |
| Seeds — reference data (40 countries, 28 provinces / 8 clusters, 24 industries, 118 categories, 30 certifications), platform configuration, admin user | **Working** |
| Seeds — demo marketplace data | **Bootstrap only** — two users and two companies, no products/RFQs/orders yet |
| Auth — sessions, password, e-mail verification, reset, Google OAuth, onboarding, company switching | **Working** (e-mail goes to the console provider until SMTP/Resend is configured) |
| RBAC — permission matrices, guards, dashboard layout enforcement | **Working** |
| Services — orders, payments (manual bank-transfer adapter), fees, RFQ, search, notifications, audit, settings, storage (local disk), companies | **Working** |
| API — health, uploads, authenticated file serving, Google OAuth callback | **Working** |
| UI kit, layout shell, dashboard sidebars, i18n plumbing (5 of 17 message namespaces populated), SEO helpers (`sitemap.ts` missing) | **Working** |
| Deployment — Dockerfile, Compose stack, Caddy, entrypoint with migrations, backup script, VPS runbook | **Files ready** — server not yet provisioned |
| Public marketplace pages (catalog, supplier, clusters, search, RFQ, guides) | **Not built** — homepage is a placeholder |
| Dashboard pages (buyer / seller / admin sub-pages) | **Not built** — shells and index placeholders only |
| Messaging, reviews, logistics, inspection, financing, advertising, compliance, analytics services | **Foundation** — schema + seeded providers, no service layer |
| Badge engine, credit scorer, background jobs, payment webhooks, 2FA, API keys | **Planned** |

[`07-mvp-boundaries.md`](07-mvp-boundaries.md) states this feature by feature with acceptance criteria and
lists the known limitations; [`09-roadmap.md`](09-roadmap.md) sequences the remaining work.

---

## 3. Decision record: Prisma → Drizzle

The original specification named Prisma as the ORM, and `docs/er-model.prisma` still carries the relational
model in Prisma notation as a readable reference. The implementation uses **Drizzle ORM 0.45** instead.

**Why.**

1. **Build-environment constraint.** Prisma requires downloading platform-specific query-engine binaries at
   install/generate time. Those binaries could not be fetched in the build environment, which made
   `prisma generate` — and therefore every build, migration and type-check — unreliable.
2. **Pure-TypeScript migrations.** Drizzle Kit emits plain SQL migrations (`drizzle/*.sql`) applied by a small
   TypeScript runner (`src/db/migrate.ts`). No engine binary, no shadow database, no runtime codegen step. A
   container only needs Node and `tsx`.
3. **Native SQL control where it matters.** Search is the hard requirement. The catalog uses PostgreSQL
   `tsvector` **generated columns** with per-field weights (A for names/titles, B for keywords, taglines and
   city, C for descriptions) and GIN indexes, ranked with `ts_rank_cd`. Drizzle expresses generated columns and
   raw `sql` fragments directly; the search provider composes filter predicates as SQL and executes one query.
   Prisma would have required raw queries for the same behaviour, discarding most of its benefit at exactly
   the place it was supposed to help.
4. **Same shape.** The relational model is unchanged: identical tables, columns, enums, indexes and relations.
   `docs/er-model.prisma` and `src/db/schema/*.ts` describe the same database. Where the two differ in
   expression — Prisma's implicit many-to-many versus an explicit join table, for instance — the Drizzle schema
   is authoritative.

**Consequences.**

- Types come from the schema by inference (`typeof products.$inferSelect`), not from a generated client.
- Relations for the query API are declared separately in `src/db/schema/relations.ts`.
- Column naming uses `casing: "snake_case"` in both `drizzle.config.ts` and the runtime client, so TypeScript
  stays camelCase while PostgreSQL stays snake_case.
- Migrations are reviewable SQL, which matters for a system holding financial and KYB data.
- There is no `prisma migrate dev` ergonomics; the workflow is `pnpm db:generate` → review the SQL →
  `pnpm db:migrate`.

---

## 4. Terminology

Used consistently across all documents and in the code.

| Term | Meaning |
|---|---|
| **RFQ** | Request for quotation — a buyer's sourcing request (`rfqs`), public or invited-only |
| **Quotation** | A supplier's priced response to an RFQ (`quotations`), revisable |
| **Supplier** | Any selling company (`companies.isSeller`) — factory, OEM/ODM, wholesaler, exporter, distributor, industrial supplier |
| **Manufacturer** | A supplier that owns production capacity; has a `manufacturer_profiles` row and appears in `/manufacturers` |
| **Buyer** | Any purchasing company (`companies.isBuyer`); a company may be both buyer and seller |
| **Trade Assurance** | CANG's escrow-like protection: buyer funds held by a licensed partner and released on delivery/inspection milestones. Tracked by `payments.escrowStatus` and `orders.tradeAssuranceEnabled` |
| **Order** | The transaction record created from an accepted quotation (`orders`), moved through configurable statuses |
| **Commission** | A computed fee ledger entry (`commissions`) produced by a `fee_rules` row |
| **Cluster** | A Vietnamese industrial province landing page (`provinces.isIndustrialCluster`) |
| **Platform role** | Staff permission axis on `users.platformRole` |
| **Member role** | Company permission axis on `company_members.role` |
