# 08 — Folder Structure

The tree below is the repository **as it exists at this commit** (`find src -type f`), annotated. Directories
marked *(planned)* do not exist yet; they are where `docs/CONVENTIONS.md` §2 says the corresponding code goes.

---

## 1. Annotated tree

```
cang-platform/
├── .env.example                  # every variable the app reads, with safe defaults (docs/06 §12.4)
├── .dockerignore
├── .gitignore                    # ignores .env*, .next, node_modules, storage/uploads, playwright output
├── Dockerfile                    # deps → build → prod-deps → runner (node:20-alpine, standalone)
├── docker-compose.yml            # production: db, redis, app, caddy
├── docker-compose.dev.yml        # local infra only: db, redis
├── drizzle.config.ts             # drizzle-kit: schema entry, ./drizzle out dir, casing snake_case
├── next.config.ts                # output: "standalone", security headers, next-intl plugin, 10 MB action bodies
├── package.json                  # scripts (README §4), pinned deps, node >= 20
├── pnpm-lock.yaml
├── postcss.config.js
├── tailwind.config.ts            # design tokens: ink, brass, steel, success, warning, danger, info; Inter/Manrope
├── tsconfig.json                 # strict, paths "@/*" → src/*, excludes drizzle/
│
├── deploy/
│   ├── Caddyfile                 # TLS + reverse proxy for cang.vn / www.cang.vn → app:3000
│   ├── entrypoint.sh             # wait for db → tsx src/db/migrate.ts → node server.js
│   ├── backup.sh                 # nightly pg_dump + uploads tar, 14-day rotation, rclone off-host
│   └── README.md                 # Sprintbox VPS runbook (DNS at iNET, first login, seeding note)
│
├── docs/                         # this documentation set (00–10), CONVENTIONS.md, er-model.prisma (reference)
│
├── drizzle/                      # SQL migrations, applied in order by src/db/migrate.ts
│   ├── 0000_extensions.sql       # pg_trgm, unaccent, immutable_array_to_string(), immutable_unaccent()
│   ├── 0001_init.sql             # 72 enums, 83 tables, indexes, FKs (459 statements)
│   └── meta/                     # drizzle-kit journal + snapshots (do not hand-edit)
│
├── e2e/
│   └── smoke-auth.mjs            # Playwright script: login as demo buyer, register a seller
│
├── public/
│   ├── favicon.svg
│   └── logo.svg
│
└── src/
    ├── middleware.ts             # next-intl only (locale detection/prefix); matcher skips /api, static, sitemap, robots
    │
    ├── app/
    │   ├── layout.tsx            # pass-through; <html>/<body> live in [locale]/layout.tsx
    │   ├── globals.css           # Tailwind layers + font imports
    │   ├── robots.ts             # /robots.txt: disallow dashboards/auth/api, advertise sitemap
    │   ├── sitemap.ts            # (planned) /sitemap.xml — see docs/07 L-02
    │   ├── [locale]/
    │   │   ├── layout.tsx        # validates locale, NextIntlClientProvider, ToastProvider, force-dynamic, metadata base
    │   │   ├── error.tsx         # error boundary for every page under the locale
    │   │   ├── not-found.tsx
    │   │   ├── (marketing)/      # public site — SiteHeader + SiteFooter
    │   │   │   ├── layout.tsx
    │   │   │   ├── page.tsx      # homepage (placeholder today)
    │   │   │   ├── products/ product/[slug]/ manufacturers/ supplier/[slug]/ clusters/   (planned)
    │   │   │   ├── rfq/ search/ guides/ why-vietnam/ pricing/ about/ contact/ help/ legal/[slug]/  (planned)
    │   │   ├── (auth)/           # split-screen auth layout, noindex
    │   │   │   ├── layout.tsx
    │   │   │   ├── login/        page.tsx + login-form.tsx (client)
    │   │   │   ├── register/     page.tsx + register-form.tsx
    │   │   │   ├── forgot-password/  page.tsx + forgot-form.tsx
    │   │   │   ├── reset-password/   page.tsx + reset-form.tsx
    │   │   │   └── verify-email/     page.tsx
    │   │   └── (dashboard)/
    │   │       ├── buyer/        layout.tsx (guard: session → company → isBuyer) + page.tsx (placeholder)
    │   │       ├── seller/       layout.tsx (guard: … isSeller) + page.tsx (placeholder)
    │   │       ├── admin/        layout.tsx (guard: admin.access) + page.tsx (placeholder)
    │   │       └── onboarding/   page.tsx + onboarding-form.tsx + actions.ts (create company / enable capability)
    │   └── api/                  # route handlers — never locale-prefixed
    │       ├── health/route.ts               GET  liveness + SELECT 1
    │       ├── uploads/route.ts              POST multipart upload → documents row
    │       ├── files/[...key]/route.ts       GET  serve a stored document with visibility checks
    │       ├── auth/google/route.ts          GET  start OAuth (state cookie)
    │       ├── auth/google/callback/route.ts GET  exchange code, upsert auth_accounts, create session
    │       ├── webhooks/[kind]/[provider]/   (planned P2/P3)
    │       ├── cron/[job]/                   (planned)
    │       └── v1/                           (planned P4 public API)
    │
    ├── components/
    │   ├── ui/                   # design-system primitives, re-exported from ui/index.ts
    │   │   ├── button.tsx        Button (variants), submit-button.tsx SubmitButton
    │   │   ├── input.tsx         Input, Textarea, Select, Checkbox, Label, Field
    │   │   ├── badge.tsx         Badge, StatusBadge, TrustBadges, VerifiedMark
    │   │   ├── card.tsx          Card*, StatCard, EmptyState, Alert, Skeleton, Separator, DataList
    │   │   ├── table.tsx         Table, THead, TBody, TR, TH, TD
    │   │   ├── misc.tsx          Avatar, RatingStars, Breadcrumbs, PageHeader, SectionHeading, LinkTabs, Pagination, JsonLd
    │   │   ├── smart-image.tsx   SmartImage (fallback-aware <img>)
    │   │   ├── dialog.tsx        Dialog, Dropdown, DropdownItem
    │   │   ├── toast.tsx         ToastProvider, useToast
    │   │   └── form.tsx          useActionForm, FormError, FormSuccess
    │   ├── layout/               # SiteHeader, SiteFooter, DashboardShell (+ navFor), SidebarNav, MobileNav,
    │   │                         # SearchBar, UserMenu, Logo, LocaleSwitcher
    │   ├── marketplace/          # ProductCard, SupplierCard (shared public/dashboard cards)
    │   └── <feature>/            # (planned) rfq/, orders/, messaging/, products/ … feature components
    │
    ├── modules/                  # server-only domain logic; one folder per bounded context
    │   ├── auth/                 rbac.ts · session.ts · current-user.ts · actions.ts · password.ts · google.ts · schemas.ts · redirects.ts
    │   ├── companies/            service.ts (createCompanyForUser, uniqueCompanySlug, enableCapability)
    │   ├── rfq/                  service.ts (matchSuppliersForRfq, publishRfq, refreshQuotationCount, canSupplierViewRfq, …)
    │   ├── orders/               service.ts (DEFAULT_ORDER_STATUSES, TRANSITION_ACTORS, createOrderFromQuotation, transitionOrder)
    │   ├── payments/             provider.ts (interface) · registry.ts (adapters, chooseProvider) · service.ts · adapters/manual-bank-transfer.ts
    │   ├── fees/                 engine.ts (resolveFeeRule, computeFee, recordCommission, previewFee)
    │   ├── search/               types.ts (SearchProvider, filters, hits) · index.ts (factory) · postgres.ts
    │   ├── notifications/        service.ts (notifyUser, notifyCompany, unreadCount) · email.ts (EmailProvider, emailLayout)
    │   ├── storage/              index.ts (StorageProvider, LocalDiskStorage, MIME + sniffing) · upload.ts (saveUpload)
    │   ├── settings/             service.ts (SETTING_DEFAULTS, getSetting, setSetting, getAllSettings)
    │   ├── audit/                log.ts (audit)
    │   └── messaging/ reviews/ logistics/ inspection/ financing/ credit/ advertising/ compliance/ analytics/ cms/ badges/ support/  (planned)
    │
    ├── db/
    │   ├── index.ts              # pg Pool (DB_POOL_MAX), drizzle client with schema + casing, Tx type
    │   ├── migrate.ts            # applies ./drizzle in order (used by pnpm db:migrate and deploy/entrypoint.sh)
    │   ├── reset.ts              # DROP SCHEMA public (refuses in production)
    │   ├── schema/
    │   │   ├── _helpers.ts       # id() cuid2, timestamps(), softDelete(), money()/money2()/rate()/rating(), tsvector type
    │   │   ├── enums.ts          # 72 pgEnums
    │   │   ├── identity.ts       users, auth_accounts, sessions, verification_tokens
    │   │   ├── reference.ts      countries, currencies, provinces, industries, product_categories, certifications
    │   │   ├── documents.ts      documents (central file registry, no FKs)
    │   │   ├── companies.ts      companies, company_members, company_invitations, manufacturer_profiles, buyer_profiles, company_industries, company_certifications, company_media, badges, company_badges
    │   │   ├── compliance.ts     verifications, compliance_checks, beneficial_owners, risk_flags
    │   │   ├── products.ts       products, product_images, product_price_tiers, product_variants, product_specifications, product_certifications, saved_items
    │   │   ├── rfq.ts            rfqs, rfq_items, rfq_invitations, quotations, quotation_items
    │   │   ├── messaging.ts      conversations, conversation_participants, messages
    │   │   ├── orders.ts         order_statuses, orders, order_items, order_events, invoices
    │   │   ├── payments.ts       payment_providers, payments, payment_transactions, disputes, dispute_messages
    │   │   ├── logistics.ts      logistics_providers, logistics_requests, logistics_quotes, shipments, shipment_events
    │   │   ├── inspection.ts     inspection_providers, inspection_orders
    │   │   ├── financing.ts      financing_providers, financing_applications, financing_offers, credit_scoring_rules, credit_scores
    │   │   ├── reviews.ts        reviews
    │   │   ├── monetization.ts   plans, subscriptions, fee_rules, commissions
    │   │   ├── advertising.ts    ad_products, ad_campaigns, advertisements, ad_events
    │   │   ├── system.ts         notifications, audit_logs, analytics_events, supplier_daily_metrics, api_keys, pages, banners, homepage_sections, email_templates, settings, support_tickets, support_ticket_messages
    │   │   ├── relations.ts      # Drizzle relational-API declarations (537 lines)
    │   │   └── index.ts          # re-exports everything
    │   └── seed/
    │       ├── index.ts          # entry: reference → platform → admin user → marketplace demo
    │       ├── reference.ts      # upserts countries, currencies, provinces, industries, categories, certifications
    │       ├── platform.ts       # upserts plans, badges, order statuses, fee rules, providers, ad products, sections, settings, scoring rules
    │       ├── marketplace.ts    # demo users/companies (bootstrap stub — no products yet)
    │       └── data/
    │           ├── reference.ts  # COUNTRIES, CURRENCIES, PROVINCES (8 clusters), INDUSTRIES (24), CATEGORIES, CERTIFICATIONS
    │           └── platform.ts   # PLANS, BADGES, ORDER_STATUSES, FEE_RULES, *_PROVIDERS, AD_PRODUCTS, HOMEPAGE_SECTIONS, SETTINGS, CREDIT_SCORING_RULES
    │
    ├── i18n/
    │   ├── routing.ts            # locales ["en","vi"], defaultLocale "en", plannedLocales, localePrefix "always"
    │   ├── navigation.ts         # Link, redirect, usePathname, useRouter, getPathname (locale-aware)
    │   └── request.ts            # loads src/messages/<locale>/<namespace>.json for 17 namespaces, en fallback, Asia/Ho_Chi_Minh
    │
    ├── lib/
    │   ├── env.ts                # zod-validated server env (server-only)
    │   ├── action.ts             # ActionResult, ok/fail, ActionError + Unauthorized/Forbidden/NotFound, parseInput, runAction, formDataToObject
    │   ├── ids.ts                # RFQ-/QUO-/ORD-/PAY-/INV-/SHP-/DSP-/FIN-/INS-/LOG-/TKT- business numbers, secureToken, numericOtp
    │   ├── rate-limit.ts         # RateLimitStore, MemoryStore, rateLimit(), RATE_LIMITS
    │   ├── seo.ts                # siteUrl, buildMetadata (canonical + hreflang), JSON-LD builders
    │   └── utils.ts              # cn, slugify, formatMoney/Number/Date, timeAgo, localized(), humanize, absoluteUrl …
    │
    └── messages/
        ├── en/                   auth.json · common.json · dashboard.json · errors.json · nav.json   (12 more namespaces planned)
        └── vi/                   same five files
```

---

## 2. Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Files | kebab-case; React components in `.tsx`, everything else `.ts`; Server Actions files end in `actions.ts` and start with `"use server"` | `dashboard-shell.tsx`, `manual-bank-transfer.ts` |
| Components | PascalCase export named like the file | `export function SupplierCard` |
| Client components | Co-located `*-form.tsx` next to the page, `"use client"` at the top | `login/login-form.tsx` |
| Route groups | `(marketing)`, `(auth)`, `(dashboard)` — parentheses never appear in URLs | |
| Dynamic segments | `[slug]` for public entities, `[id]` for dashboard entities (cuid2), `[...key]` for storage keys | `/product/[slug]`, `/buyer/rfqs/[id]` |
| Tables | snake_case plural (`casing: "snake_case"` converts from camelCase TS keys) | `product_price_tiers` |
| Columns | camelCase in TypeScript, snake_case in SQL; `*Id` for FKs, `*At` for timestamps, `is*`/`has*` for booleans, `*Vi` for the Vietnamese sibling | `expectedShipDate` → `expected_ship_date` |
| Enums | `<name>Enum` in TS, `snake_case` type name in SQL, UPPER_SNAKE values | `rfqStatusEnum` → `rfq_status` → `AWARDED` |
| Indexes | `<table>_<columns>_idx`, unique ones the same (uniqueness is in the definition) | `sessions_token_hash_idx` |
| Business numbers | `PREFIX-YYYY-XXXXXX` from `src/lib/ids.ts`, alphabet without 0/O/1/I | `ORD-2026-9H3TZ1` |
| Permissions | dotted lower-case: `admin.<area>.<verb>` (platform), `<area>.<verb>` (company) | `admin.payments.write`, `products.publish` |
| Audit actions | dotted lower-case `<entity>.<verb>`, `admin.` prefix for console actions, `auth.` for identity | `order.transition`, `admin.company.verify` |
| Settings keys | `<group>.<camelCaseKey>`; group is the first segment | `tradeAssurance.inspectionWindowDays` |
| Notification types | UPPER_SNAKE from `NotificationType` | `RFQ_NEW_QUOTATION` |
| Translation keys | `<namespace>.<section>.<key>`, camelCase leaves | `nav.sidebar.rfqMarketplace` |
| Env vars | UPPER_SNAKE; `NEXT_PUBLIC_` prefix only for values the browser may see | `SESSION_SECRET`, `NEXT_PUBLIC_APP_URL` |
| Money helpers | `money()` numeric(18,4) for transactional amounts, `money2()` for reporting, `rate()` for percentages, `rating()` for 0–5 | see `_helpers.ts` |

---

## 3. How to add things

### 3.1 A module (bounded context)

1. Create `src/modules/<context>/` with `service.ts` (writes), `queries.ts` (reads), `schemas.ts` (zod),
   `actions.ts` (`"use server"`). Import only `@/db`, `@/db/schema`, `@/lib/*` and other modules'
   `service.ts`/`queries.ts`.
2. In `service.ts`: every mutation authenticates upstream (the action), verifies ownership
   (`eq(x.companyId, company.id)`), runs inside `db.transaction` when it touches more than one table, keeps
   denormalised counters in sync, then calls `audit()` and `notifyCompany()` **after** commit.
3. In `actions.ts`: `runAction(async () => { const { company, user } = await requireCompany({ permission });
   const parsed = parseInput(schema, formDataToObject(formData)); … revalidatePath(...); return ok(...) })`.
4. Add the notification types you need to `NotificationType` in `modules/notifications/service.ts` and, if
   they should e-mail by default, to `EMAIL_BY_DEFAULT`.
5. Add the audit action names to [`05-permissions.md`](05-permissions.md) §5 and, if a new permission is
   needed, to `rbac.ts` **and** the matrices in that document.
6. Register a rate limit in `RATE_LIMITS` for anything a user can spam.

### 3.2 A page

1. Pick the route from [`02-sitemap.md`](02-sitemap.md) and create `src/app/[locale]/<group>/<route>/page.tsx`.
2. Page props are promises: `const { locale, slug } = await params; const sp = await searchParams;`.
3. Guard: public pages call nothing; dashboard pages call `requireCompany({ buyer|seller: true, permission })`
   or `requireAdmin("admin.x.y")` even though the layout already redirected.
4. Data: call the module's `queries.ts`; never import `@/db` in a page.
5. Metadata: `export async function generateMetadata({ params })` returning `buildMetadata({ locale, path,
   title, description, image, noIndex })`; add `<JsonLd data={...} />` on public entity pages.
6. Links: `Link`, `redirect`, `useRouter` from `@/i18n/navigation`.
7. Layout: dashboard pages start with `<PageHeader title actions />`; public pages wrap in
   `<div className="container py-8">`. Add `loading.tsx` with `Skeleton` for heavy lists.
8. Forms: client component with `useActionForm(action)`, `Field` + `Input`, `FormError`, `SubmitButton`.
9. Add the sidebar entry to `navFor()` in `components/layout/dashboard-shell.tsx` plus `nav.sidebar.<key>`
   in `en` and `vi`, and update the status column in [`02-sitemap.md`](02-sitemap.md).

### 3.3 A translation namespace or key

1. Namespaces are listed in `src/i18n/request.ts` (`namespaces`). Adding one: append it there and create
   `src/messages/en/<ns>.json` **and** `src/messages/vi/<ns>.json` — a missing file is tolerated (empty
   object) but a missing `vi` file means every key falls back to English.
2. Keys: nested objects, camelCase leaves; interpolation with `{name}`; plurals with ICU
   (`{count, plural, one {# order} other {# orders}}`).
3. Server: `const t = await getTranslations("<ns>")`; client: `const t = useTranslations("<ns>")`.
4. Database text is not translated through messages: use `localized(row, "name", locale)` for `name`/`nameVi`
   pairs, and per-locale rows for `pages`, `email_templates`, `banners`.
5. Adding a locale (Phase 4): add the code to `locales` in `routing.ts`, create `src/messages/<locale>/*.json`
   for all 17 namespaces, decide whether the `*Vi` column pattern is extended or a `*_translations` table is
   introduced ([`04-er-model.md`](04-er-model.md) §1).

### 3.4 A migration

1. Edit the schema in `src/db/schema/<domain>.ts` (new enum values go in `enums.ts`; new tables also need
   `relations.ts` entries and, if soft-deletable, `softDelete()`).
2. `pnpm db:generate` → drizzle-kit writes `drizzle/000N_<name>.sql` and updates `meta/`. **Read the SQL.**
   Rename it to something descriptive (`0002_unaccent_search_vectors.sql`) and keep the journal entry in sync.
3. Follow expand/contract: add nullable/defaulted columns, backfill in a separate step, drop in a later
   release. Never rename a column in one release on a table with live rows.
4. Generated columns and index expressions must be IMMUTABLE; add helper functions in a migration the way
   `0000_extensions.sql` does.
5. `pnpm db:migrate` locally (or `pnpm db:reset` for a clean slate), then `pnpm typecheck`.
6. Update the seed if the change needs reference or platform rows, keep it idempotent
   (`onConflictDoUpdate` on the natural key).
7. Update [`04-er-model.md`](04-er-model.md) (table reference and count) and `docs/er-model.prisma` if it is
   still maintained.
8. Production applies the migration automatically at the next container start (`deploy/entrypoint.sh`).

### 3.5 A provider adapter

Payments: implement `PaymentProviderAdapter` in `modules/payments/adapters/<code>.ts`, register it in
`registry.ts`, insert a `payment_providers` row with `adapterCode = "<code>"` and non-secret `publicConfig`;
read secrets from `process.env.PAYMENT_<CODE>_*` inside the adapter. Storage, e-mail and search follow the
same pattern with their factories in `modules/storage/index.ts`, `modules/notifications/email.ts` and
`modules/search/index.ts`, switched by `STORAGE_PROVIDER`, `EMAIL_PROVIDER`, `SEARCH_PROVIDER`.
