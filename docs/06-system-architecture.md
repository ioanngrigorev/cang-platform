# 06 — System Architecture

CANG is a **modular monolith**: one Next.js 15 process serves the public site, three dashboards, Server
Actions and route handlers, backed by one PostgreSQL 16 database. Everything that will later run elsewhere —
search indexing, notification delivery, payment webhooks, scheduled jobs, object storage — already sits behind
a TypeScript interface with an environment switch. This document describes the runtime as deployed today, the
seams along which it is meant to split, and the production deployment on a Sprintbox VPS.

---

## 1. Runtime architecture

```mermaid
flowchart TB
  subgraph Clients
    B[Buyer browser]
    S[Supplier browser]
    A[Admin browser]
    G[Googlebot / crawlers]
    P[Partner systems<br/>webhooks · API]
  end

  subgraph Edge["Sprintbox VPS · Docker Compose"]
    C[Caddy 2<br/>TLS · HTTP/2 · gzip]
    subgraph App["app · node:20-alpine · Next.js standalone"]
      MW[middleware<br/>next-intl]
      RSC[React Server Components<br/>layouts · pages]
      SA[Server Actions<br/>modules/*/actions.ts]
      RH[Route handlers<br/>api/*]
      MOD[Domain modules<br/>auth · companies · rfq · orders · payments · fees · search · notifications · storage · settings · audit]
      PRV[Provider adapters<br/>payments · storage · email · search · rate-limit]
    end
    DB[(PostgreSQL 16<br/>tsvector + GIN)]
    R[(Redis 7<br/>optional)]
    FS[(storage/uploads<br/>docker volume)]
  end

  subgraph External
    GO[Google OAuth]
    BANK[Partner bank / PSP]
    MAIL[SMTP / Resend]
    S3[S3-compatible bucket + CDN]
    OS[OpenSearch]
  end

  B & S & A & G --> C --> MW --> RSC
  RSC --> SA & RH
  SA & RH --> MOD --> PRV
  MOD --> DB
  PRV -. REDIS_URL .-> R
  PRV --> FS
  PRV -. STORAGE_PROVIDER=s3 .-> S3
  PRV -. EMAIL_PROVIDER .-> MAIL
  PRV -. SEARCH_PROVIDER=opensearch .-> OS
  PRV -. adapters .-> BANK
  P --> C --> RH
  RH --> GO
```

Solid edges exist today; dotted edges are switches already declared in `src/lib/env.ts` whose implementation
is pending.

| Component | Today | Notes |
|---|---|---|
| Reverse proxy | Caddy 2 (`deploy/Caddyfile`) | Automatic Let's Encrypt for `cang.vn` and `www.cang.vn`; forwards `X-Forwarded-For`, which `requestMeta()` reads |
| Application | Next.js 15.5, React 19, `output: "standalone"`, one container | Stateless except the in-memory rate-limit store and the 30 s settings cache; both are per-instance and documented as such |
| Database | PostgreSQL 16, `pg` pool (`DB_POOL_MAX`, default 10) | Migrations applied by `src/db/migrate.ts` at container start (`deploy/entrypoint.sh`) |
| Cache / queue | Redis 7 container, **unused by application code yet** | Reserved for the rate-limit store, `unstable_cache` handler and job queue (§5, §11) |
| Object storage | Local disk (`storage/uploads`, a named volume) | `StorageProvider` interface; S3 implementation pending |
| E-mail | `ConsoleEmailProvider` (logs to stdout) | `EmailProvider` interface; SMTP/Resend pending |
| Search | PostgreSQL generated `tsvector` columns | `SearchProvider` interface; OpenSearch pending |

---

## 2. Request flow

```mermaid
sequenceDiagram
  autonumber
  participant U as Browser
  participant C as Caddy
  participant M as middleware.ts
  participant L as locale layout
  participant D as dashboard layout guard
  participant P as page.tsx RSC
  participant Q as queries.ts
  participant A as actions.ts
  participant S as service.ts
  participant DB as PostgreSQL

  U->>C: GET /vi/seller/products
  C->>M: proxy (adds X-Forwarded-*)
  M->>M: next-intl: detect / validate locale, rewrite
  M->>L: /vi → setRequestLocale, load messages (vi ⊕ en fallback)
  L->>D: render
  D->>DB: getAuth(): sessions by tokenHash → users → company_members ⋈ companies
  D-->>U: redirect if no session / no company / wrong capability
  D->>P: DashboardShell(auth) + children
  P->>P: requireCompany({ seller: true, permission: "products.read" })
  P->>Q: listProducts(company.id, filters)
  Q->>DB: typed select (soft-delete + company filter)
  P-->>U: streamed HTML

  U->>C: POST (Server Action id)
  C->>M: proxy
  M->>A: createProductAction(prev, formData)
  A->>A: runAction → requireCompany({ permission: "products.write" }) → parseInput(zod)
  A->>S: createProduct(company.id, user.id, data)
  S->>DB: transaction: insert → counters → order_events/audit_logs
  S->>S: notifyCompany(...) (in-app + e-mail, never throws)
  A-->>U: { ok, data } → revalidatePath / redirect({ href, locale })
```

Key properties:

1. **Locale before auth.** The middleware matcher excludes `api`, `_next`, `sitemap.xml`, `robots.txt`, static
   files and `uploads`, so route handlers are never locale-prefixed and never pay for locale negotiation.
2. **One auth resolution per request.** `getAuth()` is wrapped in React `cache()`; the layout, the page, the
   shell and any action within the same request share the result.
3. **`force-dynamic` at the locale layout.** Every page renders on request because the header is
   session-aware and the content is database-driven. Caching is added per query, not per page (§5).
4. **Actions are thin.** `runAction` converts `ActionError`s into `{ ok: false, code }`, re-throws Next's
   `redirect()`/`notFound()` digests, and maps anything else to a generic message so internals never leak.
5. **Redirects are locale-aware.** `redirect({ href, locale })` from `@/i18n/navigation` — never
   `next/navigation` — so `/seller/orders/x` becomes `/vi/seller/orders/x` for a Vietnamese user.

---

## 3. Modular monolith layout and service-extraction plan

### 3.1 Layout

```
src/modules/<context>/
  service.ts    writes, invariants, side effects (audit, notify)
  queries.ts    read models for pages
  schemas.ts    zod schemas shared by server + client
  actions.ts    "use server" entry points
```

Modules may import each other's `service.ts` and `queries.ts`; pages import only `queries.ts` and `actions.ts`;
nothing imports `src/db` from a page. Cross-context calls are plain function calls inside one process and one
transaction (`Tx` is threaded through `createOrderFromQuotation → createPaymentSchedule → recordCommission`),
which is the monolith's main advantage: the order, its payment schedule and its first timeline event commit
atomically.

Dependency direction today (arrows = imports):

```mermaid
flowchart LR
  auth --> companies
  auth --> audit
  auth --> notifications
  orders --> payments --> fees
  orders --> notifications
  orders --> audit
  orders --> settings
  rfq --> notifications
  rfq --> audit
  rfq --> settings
  payments --> notifications
  payments --> audit
  storage --> db[(db)]
  search --> db
  notifications --> db
```

`settings`, `audit`, `notifications`, `storage` and `search` are leaf modules (they import only `db`); the
domain modules depend on them, never the other way round. That is the rule that keeps extraction possible.

### 3.2 Extraction plan

Each candidate below is a function that can run out-of-process without changing its callers, because the
caller already goes through an interface or a table. Extraction order is by operational pressure, not by
phase.

| Candidate | Trigger for extraction | Today | Extracted shape | Contract that stays fixed |
|---|---|---|---|---|
| **Notification worker** | E-mail provider latency blocks Server Actions; retry needed | `notifyUser` inserts `notifications` then calls `sendEmail` fire-and-forget | Worker consumes a queue (`notifications` rows with `sentAt IS NULL`, or a Redis stream); renders `email_templates` per locale; retries with backoff | `notifyUser` / `notifyCompany` signatures; `notifications` row shape |
| **Payment webhooks** | First real PSP/escrow adapter | `parseWebhook?` on `PaymentProviderAdapter`, no route yet | `POST /api/webhooks/payments/[provider]` verifies the signature, stores the raw event (`payment_transactions.rawResponse`), enqueues, worker calls `confirmPayment` / `releasePayment` / `refundPayment` idempotently by `providerReference` | The three service functions and the `WebhookEvent` type |
| **Search indexer** | Catalogue > ~200 k products, or relevance features Postgres cannot express (synonyms, typo tolerance, per-locale analysers) | Generated `tsvector` columns; nothing to index | Outbox table (`search_outbox(entity, id, op, createdAt)`) written in the same transaction as product/company writes; indexer ships to OpenSearch; `OpenSearchProvider implements SearchProvider` | `SearchProvider` interface and the `ProductHit` / `SupplierHit` shapes |
| **RFQ expiry cron** | Phase 1 launch | Nothing moves `OPEN` RFQs past `expiresAt` | `POST /api/cron/rfq-expire` (shared secret) or a worker tick: `OPEN AND expiresAt < now()` → `EXPIRED`, notify buyer, invalidate `rfq_invitations` | `rfqs.status` enum |
| **Badge engine** | Phase 2 | Rules seeded in `badges.ruleConfig`; no evaluator | Nightly job: for each automatic badge, a handler per `ruleConfig.type` (`VERIFICATION`, `VERIFICATION_TYPE`, `EXPORT`, `RESPONSE`, `PERFORMANCE`) computes the qualifying company set and upserts `company_badges` with `source = 'RULE'`, revoking rows that no longer qualify | `company_badges` rows; search's `badgeCodes` filter |
| **Credit-score recompute** | Phase 3 | `credit_scoring_rules` seeded (7 rules, weights sum to 100); no scorer | Nightly and on-demand: extract features (completed orders, GMV 12 m, dispute rate, company age, verification level, on-time payment, on-time delivery) → bucket per rule `config` → weighted 0–100 → immutable `credit_scores` snapshot with `features` and `breakdown` | `credit_scores` row; `financing_applications.riskScore*` |
| **Financing routing** | Phase 3 | `financing_providers.routingRules` seeded | Router selects eligible providers (product, country, currency, amount, tenor, `minCreditScore`, `side`) and dispatches through a `FinancingProvider` adapter (`manual` creates an admin task; API adapters POST the application) | `financing_applications.status` machine |
| **Analytics rollups** | Phase 4 (or when the seller overview needs charts) | `analytics_events` and `supplier_daily_metrics` tables exist; nothing writes them | Event ingestion endpoint or middleware tap → `analytics_events`; nightly rollup into `supplier_daily_metrics` (unique `(companyId, date)`) | Both table shapes |

All scheduled work is designed as **idempotent, table-driven jobs** callable through `POST /api/cron/[job]`
with a shared secret, so that the first deployment can run them from the host's `cron` hitting the container,
and a later deployment can move them to a worker container or Kubernetes `CronJob` without code change.

---

## 4. Provider abstractions

Every external dependency is an interface plus a factory that reads `env()`. Adding a provider means adding a
class and a `case`; callers do not change.

| Concern | Interface | File | Implemented | Switch |
|---|---|---|---|---|
| Payments | `PaymentProviderAdapter` | `modules/payments/provider.ts` | `ManualBankTransferAdapter` (`manual_bank_transfer`) | `payment_providers.adapterCode` per DB row; `registerAdapter()` at boot |
| Financing | `FinancingProvider` *(design)* | — | — | `financing_providers.adapterCode` |
| Logistics | `LogisticsProvider` *(design)* | — | — | `logistics_providers.adapterCode` |
| Inspection | `InspectionProvider` *(design)* | — | — | `inspection_providers.adapterCode` |
| Storage | `StorageProvider` | `modules/storage/index.ts` | `LocalDiskStorage` | `STORAGE_PROVIDER=local\|s3` |
| E-mail | `EmailProvider` | `modules/notifications/email.ts` | `ConsoleEmailProvider` | `EMAIL_PROVIDER=console\|smtp\|resend` |
| Search | `SearchProvider` | `modules/search/types.ts` | `PostgresSearchProvider` | `SEARCH_PROVIDER=postgres\|opensearch` |
| OTP / SMS | *(design)* | — | `numericOtp()` helper, `RATE_LIMITS.otp` | `OTP_PROVIDER=console\|twilio` |
| Rate-limit / queue store | `RateLimitStore` | `lib/rate-limit.ts` | `MemoryStore` | `REDIS_URL` (Redis store pending) |

### 4.1 Interface summaries

```ts
// Payments — CANG orchestrates; the licensed partner moves money.
interface PaymentProviderAdapter {
  readonly code: string;
  initiate(input: InitiateInput, provider: ProviderRow): Promise<InitiateResult>;      // instructions | redirectUrl; status PENDING|AUTHORIZED|PAID
  confirm(payment, provider, evidence?): Promise<{ providerTxnId? }>;                   // webhook or finance staff
  release(payment, provider, amount?): Promise<{ providerTxnId? }>;                     // escrow release to payee
  refund(payment, provider, amount?, reason?): Promise<{ providerTxnId? }>;
  parseWebhook?(req: Request, provider): Promise<WebhookEvent | null>;                  // verify signature, normalise
}
// WebhookEvent = { providerReference, type: PAID|SETTLED|FAILED|REFUNDED|RELEASED, amount?, currency?, raw? }

// Storage
interface StorageProvider {
  put(key, data: Buffer, contentType): Promise<{ url }>;
  get(key): Promise<{ data: Buffer; contentType? } | null>;
  delete(key): Promise<void>;
  publicUrl(key): string;                                                                // local: /api/files/<key>; s3: CDN_URL/<key> or a signed URL
}

// E-mail
interface EmailProvider { send(message: { to; subject; html; text?; replyTo? }): Promise<{ id? }> }

// Search
interface SearchProvider {
  searchProducts(filters: ProductSearchFilters): Promise<SearchResult<ProductHit>>;     // ~20 filters, 7 sorts, paging ≤ 60
  searchSuppliers(filters: SupplierSearchFilters): Promise<SearchResult<SupplierHit>>;
  suggest(q, limit?): Promise<Array<{ type: "product"|"supplier"|"category"; label; slug }>>;
}

// Rate limit store (also the shape a queue store would take)
interface RateLimitStore { hit(key, windowMs): Promise<{ count; resetAt }> }
```

Designed, not yet coded — these follow the payments pattern (DB row with `adapterCode` + non-secret
`apiConfig`, adapter registry keyed by code):

```ts
interface FinancingProvider  { submit(application, provider): Promise<{ providerRef }>; parseDecision?(req, provider): Promise<OfferEvent | null> }
interface LogisticsProvider  { requestQuote(request, provider): Promise<QuoteRef[]>; track(shipment, provider): Promise<ShipmentEvent[]>; parseWebhook?(req, provider) }
interface InspectionProvider { book(order, provider): Promise<{ providerRef; scheduledAt? }>; parseReport?(req, provider): Promise<InspectionResult | null> }
interface OtpProvider        { send(phone, code): Promise<void> }
```

Secrets for adapters are **never** in the provider row (`apiConfig`/`publicConfig` are non-secret by
contract); they come from environment variables named after the adapter code
(`PAYMENT_<CODE>_SECRET`), read inside the adapter.

---

## 5. Caching strategy

| Layer | Now | Next |
|---|---|---|
| Per-request memoisation | React `cache()` on `getAuth()`; `NextIntl` messages loaded once per request | unchanged |
| Settings | 30 s in-process TTL map in `modules/settings/service.ts`, invalidated by `setSetting` | Publish a Redis `settings:invalidate` message so all instances drop the key |
| Page output | none — `force-dynamic` at `[locale]/layout.tsx` | Keep dynamic; cache **queries** instead |
| Query results | none | `unstable_cache(fn, keys, { tags, revalidate })` on hot public reads: homepage sections, category tree, cluster pages, supplier profile, product detail. Tags: `category:<slug>`, `product:<id>`, `supplier:<id>`, `homepage`. Services call `revalidateTag()` after writes (the same place they already call `audit()`) |
| Cache handler | in-memory per instance | Redis-backed Next cache handler (`cacheHandler` in `next.config.ts`) once there is more than one app container, so tags invalidate cluster-wide |
| Static assets | `/_next/static` immutable (content-hashed) | CDN in front of Caddy for `_next/static`, `public/`, and public uploads |
| Uploads | `PUBLIC` documents `max-age=31536000, immutable` (keys are random, so a new upload is a new key) | Same headers from S3/CDN |
| HTTP | Caddy gzip/zstd | `Cache-Control: s-maxage` on public pages once query caching makes them safe to share |

Rule of thumb: nothing that includes the session or company context is ever cached across users; the
`DashboardShell` and any page under `(dashboard)` stay uncached.

---

## 6. Search architecture

### Today — PostgreSQL

- `products.search_vector` and `companies.search_vector` are **generated columns** (weights A/B/C; see
  [`04-er-model.md`](04-er-model.md) §1) with GIN indexes. The application never writes them.
- `toTsQuery()` builds `tok:* & tok:*` prefix queries (max 8 tokens, ≥ 2 chars, `simple` dictionary).
- Ranking (products): `ts_rank_cd(p) × 10 + ts_rank_cd(c) × 2 + p.search_boost × 0.5 + featured 2 +
  verified 1 + c.search_boost × 0.25`. Suppliers: `ts_rank_cd(c) × 10 + c.search_boost × 0.5 + featured 2 +
  verified 1.5 + rating_avg × 0.3 + min(transaction_count, 50) × 0.02`.
- Filters compose as SQL fragments (`andAll`) — category subtree via `product_categories.path LIKE`, province,
  country, MOQ, lead time, price from `product_price_tiers` (min tier price) or `base_price`, certifications,
  badges, business types, export country, OEM/ODM, employee range.
- `suggest()` unions categories (ILIKE), products and suppliers (tsquery) for the header search box.
- Limitations: diacritics-sensitive (`immutable_unaccent` exists but is not yet in the generated column
  expressions), no synonyms, no typo tolerance, one query per facet count.

### Next — OpenSearch behind the same interface

```mermaid
flowchart LR
  W[product / company write<br/>in service.ts] --> TX[(same transaction)]
  TX --> T1[(products / companies)]
  TX --> OB[(search_outbox)]
  IDX[indexer worker] -->|poll / LISTEN| OB
  IDX -->|bulk upsert| OS[(OpenSearch<br/>products, suppliers indices)]
  APP[search()] -->|SEARCH_PROVIDER=opensearch| OSP[OpenSearchProvider]
  OSP --> OS
  APP -->|SEARCH_PROVIDER=postgres| PGP[PostgresSearchProvider] --> T1
```

- Index mappings: `en` and `vi` analysers (ICU folding for diacritics), edge-ngram for suggest, keyword
  fields for every filter, `search_boost`/`is_featured`/`verification_status` as ranking signals via
  `function_score`.
- The outbox row is written in the same transaction as the entity, so the index never diverges silently; a
  full reindex is a `SELECT` over the two tables.
- Facet counts come from aggregations in one round-trip, which is the main UX gain.
- `PostgresSearchProvider` stays as the fallback and the local-development default.

---

## 7. File storage

| | Now | Next |
|---|---|---|
| Provider | `LocalDiskStorage` → `storage/uploads/<scope>/<yyyy>/<mm>/<24-hex>.<ext>`, a Docker named volume | `S3Storage` (`@aws-sdk/client-s3`) against AWS S3, Cloudflare R2, MinIO or a Vietnamese cloud (Viettel/VNG) — any S3 API; `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, credentials in env |
| Validation | `saveUpload`: size ≤ `UPLOAD_MAX_MB` (10), MIME allow-list, **content sniffing** of magic bytes, random key, SHA-256 checksum, `documents` row | unchanged (validation is provider-independent) |
| Serving | `GET /api/files/[...key]` — visibility check, then stream from disk | `PUBLIC`: `CDN_URL/<key>` directly (bucket public-read or CDN origin pull). Non-public: `/api/files/[...key]` performs the same check and **302s to a signed URL** (5-minute expiry) so the app never proxies bytes |
| Image transforms | `next/image` with `remotePatterns: https://**` | Same; CDN image resizing where available |
| Virus scanning | none | ClamAV sidecar or a cloud scanner on the upload path for `verification`, `dispute` and `message` scopes before the document becomes visible |
| Backups | Part of the VPS backup (§12.7) | Bucket versioning + lifecycle |

---

## 8. Observability

| Signal | Now | Next |
|---|---|---|
| Health | `GET /api/health` → `{ status: "ok", db: "up" }` or `503 degraded`; used by the Compose healthcheck and by uptime monitoring | Add `redis`, `storage` and `search` probes with per-dependency status |
| Audit | `audit_logs` (§ [`05-permissions.md`](05-permissions.md) §5) | `/admin/audit` UI; export to cold storage after 12 months |
| Application logs | `console.*` to stdout/stderr, collected by Docker (`json-file`, rotated in `docker-compose.yml`); errors prefixed `[action]`, `[audit]`, `[notify]`, `[upload]`, `[google oauth]`, `[email]` | Structured JSON logger (`pino`) with `requestId`, `userId`, `companyId`, `action`; ship to Loki/Grafana Cloud or the provider's log service |
| Error tracking | none | Sentry (`@sentry/nextjs`) for server + client, source maps uploaded at build, PII scrubbing on |
| Metrics | none | Request duration/status from Caddy access logs; DB from `pg_stat_statements`; business KPIs from `/admin/analytics` |
| Tracing | none | OpenTelemetry via Next's `instrumentation.ts` once there is more than one service |
| Alerts | uptime check on `/api/health` | Sentry alert rules, disk/CPU from the VPS provider, failed-backup alert from `deploy/backup.sh` exit code |

---

## 9. Security controls

Mapped to the specification's control list. Status: **Done** / **Partial** / **Planned**. The threat model is
in [`10-security-compliance.md`](10-security-compliance.md).

| Control | Implementation | Status |
|---|---|---|
| RBAC | `rbac.ts` matrices; layout guards; `requireCompany` / `requireAdmin` in pages and actions; `canCompany` / `canPlatform` in UI | **Done** |
| Sessions | HMAC-hashed DB sessions, `httpOnly` + `sameSite=lax` + `secure` cookie, 30-day sliding expiry, revocation on reset/suspension | **Done** |
| Rate limiting | Sliding window per key: login 10/15 min, register 5/h, password reset 5/h, OTP 5/10 min, message 60/min, RFQ 20/h, upload 60/h, API 600/min. In-memory store | **Partial** — Redis store needed for >1 instance |
| Input validation | zod on every action (`parseInput`), typed `fieldErrors`; `z.coerce` for FormData; env validated at boot | **Done** |
| CSRF | Server Actions: Next.js verifies the `Origin`/`Host` match on every action POST; `sameSite=lax` cookie; OAuth `state` cookie. Route handlers that mutate (`/api/uploads`) require the session cookie and are same-origin `fetch` calls | **Done** (framework) — add `experimental.serverActions.allowedOrigins` if the app is ever served behind a different public host |
| XSS | React escaping everywhere; `dangerouslySetInnerHTML` only in `<JsonLd/>` with server-generated JSON; e-mail bodies escaped (`escapeHtml`); CMS markdown to be rendered through a sanitising renderer | **Done** / CMS renderer **Planned** |
| SQL injection | Drizzle query builder and `sql\`\`` tagged templates — every interpolation is a bound parameter, including the raw search queries | **Done** |
| Secure uploads | MIME allow-list, magic-byte sniffing, size cap, random keys, original filename never used in the key, `nosniff` on serving, visibility checks | **Done** (AV scan **Planned**) |
| Security headers | `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `poweredByHeader: false` (`next.config.ts`); HSTS from Caddy | **Done** — CSP **Planned** (needs nonce plumbing for inline JSON-LD) |
| Audit logs | Append-only `audit_logs`, admin actions with `before`/`after` | **Done** (service layer) / admin UI **Planned** |
| 2FA | Columns exist; TOTP flow designed ([`05-permissions.md`](05-permissions.md) §7) | **Planned** |
| Secrets | `src/lib/env.ts` is server-only; only `NEXT_PUBLIC_*` reaches the client; `.env` git-ignored; provider secrets never in DB rows | **Done** |
| Password storage | bcrypt cost 12, policy enforced | **Done** |
| Account enumeration | Identical response for forgot-password; generic login error | **Done** |
| Open redirect | `safeNext()` on `next` parameters | **Done** |
| Dependency hygiene | pinned versions in `package.json`, `pnpm-lock.yaml` | **Done** — add `pnpm audit` to CI **Planned** |
| Transport | TLS 1.2+ via Caddy, HTTP→HTTPS redirect, HSTS | **Done** at deploy |

---

## 10. Compliance workflows

CANG is a marketplace, not a financial institution. KYC/KYB/AML obligations are shared with the licensed
partners that hold funds and lend; CANG's job is to collect, screen, record and make the evidence available.
The four tables below are the system of record; the workflows are processes over them, run by `COMPLIANCE`
staff today and by adapters later.

```mermaid
stateDiagram-v2
  direction LR
  [*] --> PENDING: company submits (verifications.type)
  PENDING --> IN_REVIEW: reviewer claims
  IN_REVIEW --> VERIFIED: approve · expiresAt set
  IN_REVIEW --> REJECTED: rejectionReason
  VERIFIED --> EXPIRED: scheduled job past expiresAt
  REJECTED --> PENDING: resubmit
  EXPIRED --> PENDING: renew
```

| Workflow | Trigger | Tables | Process | Outcome |
|---|---|---|---|---|
| **KYB** (supplier, and buyer when `compliance.kybRequiredForOrders`) | Company submits at `/seller\|buyer/company/verification` | `verifications` (`type = KYB`, `data` JSON, linked `documents` with `verificationId`), `companies.kybStatus` | Business registration number checked against the national register (Vietnam: Cổng thông tin quốc gia về đăng ký doanh nghiệp), tax code, registered address vs. factory address, licence validity, signatory authority | `companies.verificationStatus`/`kybStatus`, `verifiedAt`; `VERIFIED_MANUFACTURER` badge via engine |
| **KYC** (individuals) | Staff onboarding, UBO declarations, large-order signatories | `compliance_checks` (`type = KYC`, `userId`), `documents` (`ID_DOCUMENT`) | ID document + liveness through a provider adapter (manual today) | `compliance_checks.status`; `users.phoneVerifiedAt`/`emailVerifiedAt` |
| **UBO** | Part of KYB for companies; refreshed yearly | `beneficial_owners` (name, nationality, DOB, `ownershipPercent`, `role`, `isPep`, `sanctionsStatus`, `idDocumentId`) | Collect every owner ≥ 25 % (or controlling), screen each against sanctions/PEP lists, sum ownership | Per-owner `sanctionsStatus`; company blocked when any owner is `MATCH` |
| **Sanctions / PEP / adverse media** | Company creation when `compliance.sanctionsScreeningEnabled`; every UBO; periodic re-screen (`nextReviewAt`) | `compliance_checks` (`SANCTIONS`, `PEP`, `ADVERSE_MEDIA`; `provider`, `result`, `riskScore`) | Screen company name, registration number, directors and UBOs against OFAC, EU, UN, UK HMT lists plus Vietnam's MPS list; false positives cleared with `notes` | `companies.sanctionsStatus`; `MATCH` → `companies.status = SUSPENDED` + `risk_flags` CRITICAL |
| **AML / transaction monitoring** | Every `confirmPayment`; nightly batch | `compliance_checks` (`TRANSACTION_MONITORING`), `risk_flags` (`entityType = PAYMENT\|ORDER\|COMPANY`), `payment_transactions` | Rules: order value vs. company history and declared revenue, structuring (many payments just under thresholds), payer ≠ buyer company, rapid refund cycles, high-risk corridors, first order > threshold from unverified buyer | `risk_flags` at severity; `HIGH`/`CRITICAL` freeze `releasePayment` until a `COMPLIANCE` decision; SAR filing is the partner bank's obligation, evidence exported from `audit_logs` + `payment_transactions` |
| **Periodic review** | `verifications.expiresAt`, `compliance_checks.nextReviewAt` | same | Scheduled job lists due rows into the `/admin/compliance` queue; expired verifications downgrade the company and revoke rule-granted badges | status transitions above |

Every decision in these workflows is a staff action carrying `admin.verification.review` or
`admin.compliance.review`, and every one writes an `audit_logs` row with the reviewer, the previous and new
status, and the reason. Documents used as evidence carry `visibility = ADMIN` and are retained per
[`10-security-compliance.md`](10-security-compliance.md) §5 even if the company is deleted (no FK from
`documents`).

---

## 11. Background jobs

None run today. The design (all idempotent, all callable via `POST /api/cron/[job]` with `CRON_SECRET`):

| Job | Schedule | Reads | Writes | Phase |
|---|---|---|---|---|
| `rfq-expire` | hourly | `rfqs` where `OPEN AND expiresAt < now()` | `rfqs.status = EXPIRED`, notifications | P1 |
| `session-gc` | daily | `sessions` where `expiresAt < now()`; `verification_tokens` consumed or expired > 7 d | delete | P1 |
| `verification-expire` | daily | `verifications` where `VERIFIED AND expiresAt < now()` | `EXPIRED`, `companies.verificationStatus`, revoke RULE badges | P2 |
| `badge-engine` | nightly | companies, verifications, reviews, disputes, manufacturer_profiles, response metrics | `company_badges` (RULE) | P2 |
| `order-auto-complete` | daily | orders in `DELIVERY` past `deliveredAt + inspectionWindowDays` with no open dispute | `transitionOrder(COMPLETED, ADMIN)` + `releasePayment` | P2 |
| `commission-invoice` | monthly | `commissions` `PENDING` | `invoices` (platform → seller), `commissions.status = INVOICED` | P2 |
| `compliance-review` | daily | `compliance_checks.nextReviewAt` | queue rows / notifications | P2 |
| `credit-score` | nightly + on application | orders, payments, disputes, verifications | `credit_scores` | P3 |
| `metrics-rollup` | nightly | `analytics_events`, orders, RFQs, ads | `supplier_daily_metrics` | P4 |
| `ad-budget` | hourly | `ad_events`, `ad_campaigns` | pause campaigns over budget/end date | P4 |

First deployment: a host `cron` line per job (`curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET"
https://cang.vn/api/cron/rfq-expire`). Later: a `worker` service in Compose running the same functions on a
scheduler, then Kubernetes `CronJob`s.

---

## 12. Deployment

### 12.1 Environments

| Environment | Where | Database | Purpose |
|---|---|---|---|
| **local** | developer machine, `pnpm dev` + `docker compose -f docker-compose.dev.yml up` (Postgres + Redis only) | local `cang` | development, seeded demo data |
| **staging** | second Sprintbox VPS (or the same VPS with a second Compose project and `staging.cang.vn`) | own database, refreshed from a scrubbed production dump | pre-release verification, partner sandbox webhooks |
| **production** | Sprintbox VPS, `docker compose up -d` | `cang` in the `db` container (managed Postgres later, §12.8) | `cang.vn` |

Promotion is by git tag → image build → `docker compose pull && up -d` (§12.7). The same image runs in staging
and production; only `.env` differs.

### 12.2 Topology on the VPS

```mermaid
flowchart LR
  I[Internet] -->|:80 :443| CADDY[caddy:2]
  CADDY -->|app:3000| APP[app<br/>Next.js standalone]
  APP --> DB[(db<br/>postgres:16-alpine<br/>volume pgdata)]
  APP -.-> REDIS[(redis:7-alpine<br/>volume redisdata)]
  APP --> UP[(volume uploads<br/>/app/storage/uploads)]
  CRON[host cron] -->|pg_dump nightly| DB
  CRON -->|POST /api/cron/*| CADDY
```

Files: `docker-compose.yml` (production: db, redis, app, caddy), `docker-compose.dev.yml` (db, redis),
`Dockerfile` (multi-stage), `deploy/Caddyfile`, `deploy/entrypoint.sh`, `deploy/backup.sh`,
`deploy/README.md` (step-by-step).

Sizing for launch: 2 vCPU / 4 GB RAM / 80 GB NVMe is sufficient for the monolith plus Postgres; Postgres gets
`shared_buffers = 512MB`, `effective_cache_size = 2GB`. Ubuntu 22.04 or 24.04 LTS, Docker Engine 26+ with the
Compose plugin.

### 12.3 Container image

`Dockerfile` stages: `deps` (`pnpm install --frozen-lockfile`) → `build` (`pnpm build`, produces
`.next/standalone` because `output: "standalone"`) → `prod-deps` (`pnpm install --prod --frozen-lockfile`
followed by `pnpm add tsx`, giving a `node_modules` with `drizzle-orm`, `pg`, `dotenv` and `tsx` — `tsx` is a
devDependency in `package.json`, so the stage adds it explicitly) → `runner` (`node:20-alpine`, non-root
`nextjs` user, copies `.next/standalone`, `.next/static`, `public`, `drizzle/`, `src/` + `tsconfig.json` (so
`tsx` can run `src/db/migrate.ts`, `src/db/seed/index.ts` and `src/db/reset.ts` with the `@/*` alias), the
production `node_modules` on top of the standalone's traced `node_modules`, and `deploy/entrypoint.sh`). The
entrypoint runs `node_modules/.bin/tsx src/db/migrate.ts`, which resolves `drizzle-orm` and `pg` from
`/app/node_modules` and reads `./drizzle` relative to `/app`. `next build` needs no database: `env()` is
evaluated lazily at request time and every page is `force-dynamic`, so placeholder `DATABASE_URL` /
`SESSION_SECRET` values are passed to the build stage.

`deploy/entrypoint.sh`: wait for the database (`pg_isready` loop, 60 s), `node_modules/.bin/tsx src/db/migrate.ts`, then
`exec node server.js`. Migrations are idempotent (`drizzle.__drizzle_migrations` tracks them), so every start
is safe. **Seeding is not part of the entrypoint** — see §12.6.

### 12.4 Environment variables

From `.env.example` and the code (`src/lib/env.ts` validates the first group at boot).

| Variable | Required | Default | Used by | Notes |
|---|:-:|---|---|---|
| `DATABASE_URL` | yes | — | `db/index.ts`, `migrate.ts`, `seed` | In Compose: `postgresql://cang:<pw>@db:5432/cang` |
| `SESSION_SECRET` | yes | — | `session.ts` (HMAC) | ≥ 32 chars; `openssl rand -base64 48`; rotating it logs everyone out |
| `APP_URL` | yes | `http://localhost:3000` | Google redirect URI, absolute links | `https://cang.vn` |
| `NEXT_PUBLIC_APP_URL` | yes | `http://localhost:3000` | `siteUrl()` — canonical, sitemap, JSON-LD, e-mail footer | `https://cang.vn`; baked at **build** time for client code |
| `NODE_ENV` | — | `development` | cookie `secure`, reset guard | `production` in the image |
| `PORT`, `HOSTNAME` | — | `3000`, `0.0.0.0` | Next standalone `server.js` | set in the Dockerfile |
| `DB_POOL_MAX` | — | `10` | `pg.Pool` | ≤ Postgres `max_connections` / app instances |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | — | empty (Google button hidden) | `auth/google.ts` | Authorised redirect URI `https://cang.vn/api/auth/google/callback` |
| `OTP_PROVIDER` | — | `console` | (design) | `twilio` later |
| `REDIS_URL` | — | empty | (reserved) rate-limit store, cache handler, queue | `redis://redis:6379` in Compose |
| `STORAGE_PROVIDER` | — | `local` | `storage/index.ts` | `s3` once `S3Storage` lands |
| `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | with `s3` | empty | `S3Storage` | R2/MinIO need `S3_ENDPOINT` |
| `CDN_URL` | — | empty | public file URLs | `https://cdn.cang.vn` |
| `UPLOAD_MAX_MB` | — | `10` | `maxUploadBytes()` | must be ≤ Caddy `request_body` limit and Next `bodySizeLimit` (10 MB) |
| `SEARCH_PROVIDER`, `OPENSEARCH_URL` | — | `postgres`, empty | `search/index.ts` | |
| `EMAIL_PROVIDER`, `SMTP_URL`, `EMAIL_FROM` | — | `console`, empty, `CANG <no-reply@cang.vn>` | `notifications/email.ts` | `smtp://user:pass@host:587` |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_DEMO_PASSWORD` | seed only | `admin@cang.vn`, `Admin123!`, `Password123!` | `db/seed` | **Change before seeding production** |
| `SEED_DEMO_DATA` | seed only | *(not implemented)* | `db/seed` | Recommended flag: `false` in production to seed reference + platform + admin only — **engineering TODO**, see `deploy/README.md` |
| `CRON_SECRET` | with cron | — | `/api/cron/[job]` (planned) | Bearer token for scheduled jobs |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Compose | `cang`/—/`cang` | `db` container | Must match `DATABASE_URL` |

### 12.5 DNS — `cang.vn` at iNET

The domain is registered at iNET (`portal.inet.vn`); DNS is managed in the iNET portal (Quản lý tên miền →
DNS). Records to create, where `VPS_IPV4` / `VPS_IPV6` are the Sprintbox addresses:

| Type | Host | Value | TTL | Purpose |
|---|---|---|---|---|
| A | `@` | `VPS_IPV4` | 300 (raise to 3600 after cut-over) | apex `cang.vn` → Caddy |
| AAAA | `@` | `VPS_IPV6` | 300 | IPv6 (omit if Sprintbox gives no v6) |
| A | `www` | `VPS_IPV4` | 300 | `www.cang.vn`; Caddy redirects to apex |
| AAAA | `www` | `VPS_IPV6` | 300 | |
| A / AAAA | `staging` | staging VPS IP | 300 | optional staging host |
| CNAME | `cdn` | CDN / bucket hostname (e.g. `<bucket>.r2.dev` or the CDN's CNAME target) | 3600 | optional, when `CDN_URL=https://cdn.cang.vn` |
| CAA | `@` | `0 issue "letsencrypt.org"` | 3600 | restricts certificate issuance to Let's Encrypt (Caddy) |
| MX | `@` | per e-mail host (e.g. `10 mx1.<provider>`) | 3600 | inbound mail for `support@cang.vn`; **placeholder** until a mailbox provider is chosen |
| TXT | `@` | `v=spf1 include:<transactional-provider> include:<mailbox-provider> -all` | 3600 | SPF for `no-reply@cang.vn` and staff mail; **placeholder** values from the providers |
| TXT | `<selector>._domainkey` | DKIM public key issued by the transactional provider (Resend/SES/Postmark) | 3600 | **placeholder** — one record per provider/selector |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@cang.vn; pct=100` → tighten to `p=quarantine` after two weeks of clean reports | 3600 | DMARC |
| TXT | `@` | Google Search Console / Google OAuth domain verification strings | 3600 | as required by Google |

Cut-over checklist: lower TTLs 24 h before; point `A @` and `A www` at the VPS; `dig +short cang.vn`
from outside; Caddy obtains certificates on first request (ports 80/443 must be open in the Sprintbox firewall
and `ufw`); verify `https://www.cang.vn` redirects to `https://cang.vn`; then raise TTLs.

### 12.6 First run and seeding

1. `cp .env.example .env` on the server and fill in production values (§12.4). Set
   `SEED_ADMIN_PASSWORD` to a strong value.
2. `docker compose up -d db` → wait for healthy → `docker compose up -d` (app runs migrations on boot).
3. Seed **reference + platform + admin only**: `docker compose exec app node_modules/.bin/tsx src/db/seed/index.ts`.
   Today this also creates the two demo companies (`saigon-pack-manufacturing`, `nordwind-outdoor`) because
   `seedMarketplace` is unconditional. Until the `SEED_DEMO_DATA=false` guard is implemented, either delete
   those two companies (and their users) from `/admin/companies` after seeding, or seed before opening the site
   and remove them in SQL. This is documented as an engineering TODO in `deploy/README.md`.
4. Sign in as the admin at `https://cang.vn/en/login`, change the password, configure
   `/admin/providers` (partner bank account details in `payment_providers.publicConfig`) and `/admin/settings`.

### 12.7 Backups

`deploy/backup.sh`, run by host cron at 02:30 Asia/Ho_Chi_Minh:

- `pg_dump -Fc` through `docker compose exec -T db` → `/var/backups/cang/db/cang-YYYYmmdd-HHMM.dump`
- `tar` of the `uploads` volume → `/var/backups/cang/uploads/uploads-YYYYmmdd.tar.gz` (skipped once
  `STORAGE_PROVIDER=s3`)
- Copy both to off-host object storage (`rclone copy` to an S3/R2 bucket with versioning) — the script calls
  `rclone` when `BACKUP_REMOTE` is set
- **14-day rotation** locally (`find -mtime +14 -delete`); the bucket lifecycle keeps 90 days
- Exit code non-zero on any failure so cron mails the operator; a monthly restore drill into the staging
  database is part of the ops checklist ([`09-roadmap.md`](09-roadmap.md) §6)

Restore: `pg_restore -d cang --clean --if-exists <dump>` into a fresh container, then start the app (migrations
are already inside the dump's `drizzle` schema).

### 12.8 Zero-downtime deploy

With a single app container the honest description is *near*-zero: the cut-over is the time Caddy takes to see
the new container healthy (a few seconds), and in-flight Server Actions complete on the old container.

1. CI builds the image on a tag (`ghcr.io/<org>/cang:<sha>`) and pushes it.
2. On the VPS: `docker compose pull app`.
3. `docker compose up -d --no-deps --scale app=2 --no-recreate app` starts a second container; its entrypoint
   runs migrations (idempotent) and it becomes healthy (`/api/health`).
4. Caddy's `reverse_proxy app:3000` resolves both replicas through Docker DNS; health checks (`health_uri
   /api/health`) drop the old one once it is stopped.
5. `docker compose up -d --no-deps --scale app=1 app` removes the old container (Compose stops the older
   one first). Sessions are in Postgres, uploads on a shared volume, so nothing is lost.
6. Migration discipline that makes this safe: **expand/contract** — new columns nullable or defaulted, no
   renames in one release, drops only after the code that used them has shipped; the old container must run
   against the new schema for the overlap window.

Rollback is `docker compose up -d app` with the previous image tag; migrations are forward-only, which the
expand/contract rule accommodates.

### 12.9 Scaling path

| Step | When | Change |
|---|---|---|
| 1. Managed PostgreSQL | first paying customers / before Phase 2 money flows | Move `db` to a managed instance (or a dedicated VPS with streaming replication); point `DATABASE_URL`; keep `pg_dump` plus provider snapshots (PITR) |
| 2. Object storage + CDN | before Phase 1 launch, ideally | `STORAGE_PROVIDER=s3`, `CDN_URL`; removes the uploads volume from the app's state |
| 3. Redis in use | second app instance | Redis `RateLimitStore`, Redis Next cache handler, settings invalidation, job queue |
| 4. Horizontal app | CPU-bound rendering | `--scale app=N` behind Caddy, then a second VPS with Caddy as L7 LB; all state is already external |
| 5. Read replicas | analytics / catalogue reads dominate | Drizzle `withReplicas()` — `queries.ts` reads to the replica, `service.ts` writes to the primary |
| 6. OpenSearch | catalogue > ~200 k products or relevance needs | §6; indexer worker |
| 7. Worker tier | notification volume, webhooks, jobs | `worker` container from the same image running the job scheduler and queue consumers |
| 8. Kubernetes | multi-region / partner SLAs | Same image; `Deployment` (app), `Deployment` (worker), `CronJob`s, managed Postgres/Redis/OpenSearch, ingress-nginx or Caddy ingress; Compose files remain the reference for local/staging |

Nothing in the list requires a schema change or a module rewrite; that is the property the monolith was
designed for.
