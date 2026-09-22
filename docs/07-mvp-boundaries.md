# 07 — MVP Boundaries

This document draws the line around Phase 1 and states, feature by feature, what "done" means. It uses three
words consistently:

| Term | Meaning |
|---|---|
| **Working MVP** | Code exists, is exercised end-to-end today (the auth smoke test in `e2e/smoke-auth.mjs` or a service with a caller), and meets the acceptance criteria below |
| **Foundation** | Schema, enums, seeds and — where noted — a service function exist; there is no page or action that lets a user reach it yet |
| **Planned** | Nothing beyond the schema; scheduled for the phase named |

The build state summary in [`00-overview.md`](00-overview.md) §2 is the short version of this document.

---

## 1. Phase 1 scope — Marketplace

Phase 1 is the smallest product that creates and captures demand: a buyer can find a Vietnamese supplier,
ask for a quotation, compare answers and talk to the supplier; a supplier can present a factory and a
catalogue and respond; an operator can moderate and configure. **No money moves in Phase 1.**

### 1.1 Feature table with acceptance criteria

| # | Feature | State today | Acceptance criteria (Phase 1 "done") |
|---|---|---|---|
| P1-01 | **Authentication** — e-mail/password, Google, e-mail verification, password reset, session management | **Working MVP** | (a) Register as buyer or seller creates user + company + OWNER membership + FREE subscription in one transaction. (b) Login rate-limited 10/15 min; failed attempts audited. (c) Reset link single-use, 1 h, destroys all sessions. (d) Google sign-in links by verified e-mail; `state` mismatch rejected. (e) Cookie `httpOnly`/`secure`/`lax`; token stored hashed. (f) `e2e/smoke-auth.mjs` passes |
| P1-02 | **Onboarding & company switching** | **Working MVP** | (a) User without a company is redirected to `/onboarding` from any dashboard. (b) Enabling the second capability (buyer↔seller) creates the missing profile row without a second company. (c) `switchCompanyAction` refuses companies the user is not a member of |
| P1-03 | **RBAC** | **Working MVP** | (a) Matrices in `rbac.ts` match [`05-permissions.md`](05-permissions.md). (b) Every dashboard layout redirects unauthenticated / wrong-capability users. (c) Every action calls `requireCompany`/`requireAdmin`. (d) UI hides affordances with `canCompany`/`canPlatform` |
| P1-04 | **i18n en/vi** | **Working MVP** (plumbing) / **Foundation** (messages) | (a) Every route exists under `/en` and `/vi`; `hreflang` + `x-default` emitted. (b) Missing `vi` keys fall back to `en`. (c) **Gap:** only 5 of 17 namespaces have message files (`auth`, `common`, `dashboard`, `errors`, `nav`); the remaining 12 must be created as their pages are built, with real Vietnamese |
| P1-05 | **Homepage** — admin-composed sections | **Foundation** (`homepage_sections` seeded; page is a placeholder) | (a) Renders the 10 seeded sections in `sortOrder`, skipping inactive ones. (b) `TOP_CATEGORIES`, `VERIFIED_MANUFACTURERS`, `TRENDING_PRODUCTS`, `NEW_SUPPLIERS` read live data with the configured `limit`. (c) LCP < 2.5 s on a 4G profile; `Organization` + `WebSite` JSON-LD present |
| P1-06 | **Product catalog (public)** — `/products`, `/products/[categorySlug]`, `/product/[slug]` | **Foundation** (schema, seed taxonomy, search provider) | (a) Category hub lists 20 top-level categories with product counts. (b) Category page uses `searchProducts({ categorySlug })` with facets (province, verified, MOQ, lead time, price, certifications, OEM/ODM) and 7 sort orders. (c) Product page shows gallery, price tiers, MOQ, lead time, specs, variants, certifications, supplier card, "Request quotation" and "Contact supplier". (d) `Product` JSON-LD; canonical is `/product/[slug]` regardless of category. (e) Draft/inactive products and products of non-ACTIVE companies return 404 |
| P1-07 | **Manufacturer directory** — `/manufacturers`, `/[industrySlug]`, `/[industrySlug]/[provinceSlug]`, `/supplier/[slug]` | **Foundation** | (a) Industry × province pages render for all 24 × 28 combinations; empty ones return 200 with `noindex, follow`. (b) Supplier profile shows company, factory profile, certifications, media, badges, products, reviews (empty state), "Contact". (c) `Organization` JSON-LD with `AggregateRating` only when `ratingCount > 0` |
| P1-08 | **Industrial clusters** — `/clusters`, `/clusters/[provinceSlug]` | **Foundation** (8 clusters seeded with content) | (a) Cluster page renders headline, description, key facts, major industries and suppliers in the province. (b) Non-cluster provinces 404 |
| P1-09 | **Search** — `/search`, header suggest | **Working MVP** (service) / **Foundation** (page) | (a) `searchProducts` / `searchSuppliers` return in < 200 ms p95 on 50 k products (GIN). (b) Prefix match on EN and VI terms; ranking includes `searchBoost`, featured and verified. (c) `/search?q=` shows products and suppliers tabs with counts; parameterised results `noindex`. (d) Suggest returns categories + products + suppliers in one query |
| P1-10 | **Seller: company & factory profile** — `/seller/company`, `/seller/company/factory`, `/seller/company/certifications` | **Foundation** | (a) All `companies` and `manufacturer_profiles` fields editable with zod validation and field errors. (b) Logo/cover/media via `/api/uploads` (`PUBLIC`). (c) Certifications with document + expiry, status `PENDING` until moderated. (d) Profile completeness percentage on `/seller` |
| P1-11 | **Seller: products** — `/seller/products`, `/new`, `/[id]` | **Foundation** | (a) Create/edit with images, tiers, variants, specs, certifications, HS code, packaging, SEO fields. (b) Publish requires `products.publish`; goes `ACTIVE` or `PENDING_REVIEW` per `products.requireModeration`. (c) `plans.limits.maxProducts` enforced with an upgrade prompt. (d) `search_vector` updates automatically (generated column) — verified by a test that searches the new title |
| P1-12 | **Buyer: RFQ** — `/buyer/rfqs`, `/new`, `/[id]`, `/[id]/compare`; public `/rfq`, `/rfq/[id]`, `/rfq/new` | **Working MVP** (`publishRfq`, matching, `canSupplierViewRfq`) / **Foundation** (pages, `createRfq`) | (a) Draft → publish sets `OPEN`, `expiresAt`, writes ≤ `rfq.autoMatchLimit` invitations, notifies matches in-app. (b) Rate limit 20 RFQs/hour. (c) Public list shows `OPEN`+`PUBLIC` only; detail masks buyer identity until the viewer has quoted. (d) Compare view: unit price, total, MOQ, lead time, Incoterm, payment terms, validity, sample — side by side for ≥ 2 quotations. (e) `EXPIRED` transition by the `rfq-expire` job |
| P1-13 | **Seller: quotations** — `/seller/rfqs`, `/seller/rfqs/[id]`, `/seller/quotations/*` | **Foundation** (`refreshQuotationCount`) | (a) Supplier sees matched, invited and all open RFQs; detail gated by `canSupplierViewRfq`. (b) Quotation with line items, shipping, discount, lead time, Incoterm, terms, validity, sample; `quotationCount` refreshed. (c) Revise creates `revisionNumber + 1` with `parentQuotationId`; withdraw sets `WITHDRAWN`. (d) `maxRfqResponsesPerMonth` enforced |
| P1-14 | **Messaging** — `/buyer|seller/messages`, `/[conversationId]` | **Foundation** (schema only; no service) | (a) Conversation is created from a product, RFQ or quotation context with both companies as participants. (b) Messages rate-limited 60/min; attachments via `/api/uploads` (`COUNTERPARTY`). (c) Unread counts per participant; `MESSAGE_NEW` notification (in-app, e-mail digest later). (d) `COUNTER_OFFER` message type carries a structured payload |
| P1-15 | **Saved items** | **Foundation** | Save/unsave product or supplier; lists under `/buyer/saved/*` |
| P1-16 | **Team** — `/buyer|seller/team` | **Foundation** (`company_invitations` schema) | (a) Invite by e-mail with a role; token e-mail; acceptance creates membership. (b) Only `company.members.manage`. (c) Cannot remove the last OWNER |
| P1-17 | **Notifications** — `/buyer|seller/notifications` | **Working MVP** (service) / **Foundation** (page) | (a) In-app list with mark-read; unread badge in the shell (already wired). (b) E-mail via `EmailProvider` for the `EMAIL_BY_DEFAULT` types |
| P1-18 | **Uploads & files** | **Working MVP** | (a) Allow-list + sniffing + size cap enforced; wrong content rejected with `UPLOAD_TYPE`. (b) Non-public files require an authorised viewer. (c) Keys are random; original names only in `documents.name` |
| P1-19 | **Admin console (Phase 1 pages)** — `/admin/users`, `/companies`, `/products`, `/categories`, `/rfqs`, `/cms`, `/settings`, `/audit` | **Foundation** (layout guard + shell built) | (a) Each page checks its permission from [`02-sitemap.md`](02-sitemap.md) §5. (b) Every mutation audited with `actorType = ADMIN` and `before`/`after`. (c) Product moderation queue with approve/reject + reason → `PRODUCT_MODERATION` notification. (d) Settings editor edits every `SETTING_DEFAULTS` key with type-appropriate inputs. (e) CMS: pages (markdown, per locale), banners, homepage section toggles |
| P1-20 | **Content pages** — guides, why-vietnam, pricing, about, contact, help, legal | **Foundation** (`pages` table) | (a) Rendered from `pages` by `(slug, locale)`; `LEGAL` pages exist for terms, privacy, cookies before launch. (b) `/contact` creates a `support_tickets` row. (c) `/pricing` reads public `plans` |
| P1-21 | **SEO infrastructure** | **Working MVP** (`robots.ts`, `buildMetadata`, JSON-LD helpers) / **Missing** (`sitemap.ts`) | (a) `sitemap.xml` emits locale-paired URLs for categories, products, suppliers, industry×province, clusters, guides, static pages; chunked at 50 000. (b) Every public page uses `buildMetadata`. (c) Lighthouse SEO ≥ 95 on product, supplier and category pages |
| P1-22 | **Health & ops** | **Working MVP** | `/api/health` returns `ok`/`degraded`; Docker Compose stack in `docker-compose.yml`; runbook in `deploy/README.md` |

### 1.2 Phase 1 exit criteria (whole product)

1. The flagship journey in [`03-user-journeys.md`](03-user-journeys.md) §A runs through step 10 (revised
   quotation) with real UI, in both locales, on a fresh `pnpm db:reset` database.
2. 50 verified-looking demo suppliers with ≥ 500 products seeded, so search and directory pages are not empty
   (the seed today creates two companies and no products — see §4).
3. `pnpm typecheck` and `pnpm build` clean; `e2e/` covers register, publish product, post RFQ, quote, compare,
   message.
4. All 17 message namespaces present in `en` and `vi`.
5. Production stack deployed to the Sprintbox VPS with TLS, backups running, admin password rotated.

---

## 2. Foundations present for Phases 2–4

Everything below exists in `drizzle/0001_init.sql`, `src/db/schema/*.ts`, `relations.ts` and the seeds. What
is missing is stated precisely.

| Phase | Capability | Schema | Seeds | Service | UI | Missing |
|---|---|---|---|---|---|---|
| 2 | Orders & configurable lifecycle | `order_statuses`, `orders`, `order_items`, `order_events` | 9 statuses | `createOrderFromQuotation`, `transitionOrder`, `addOrderNote` **(Working)** | — | Order pages (buyer/seller/admin), accept-quotation action, admin lifecycle editor |
| 2 | Payments & Trade Assurance | `payment_providers`, `payments`, `payment_transactions` | 3 providers (1 inactive) | `createPaymentSchedule`, `initiatePayment`, `confirmPayment`, `releasePayment`, `refundPayment`; `ManualBankTransferAdapter` **(Working)** | — | Payment pages, admin confirm/release/refund UI, webhook route, real PSP/escrow adapter, auto-complete job |
| 2 | Fees & commissions | `fee_rules`, `commissions` | 10 rules | `resolveFeeRule`, `computeFee`, `recordCommission`, `previewFee` **(Working)**, charged in `confirmPayment` | — | `/admin/fees` editor, commission invoicing job, fee preview on quotation/checkout |
| 2 | Invoices | `invoices` | — | — | — | Proforma/commercial invoice generation (PDF), platform commission invoices |
| 2 | Disputes | `disputes`, `dispute_messages` | — | — | — | Dispute service (open/respond/escalate/resolve), escrow freeze gate, mediation UI |
| 2 | Verification / KYB | `verifications`, `documents` links, `companies.verificationStatus/kybStatus` | — | — | — | Submission forms, review queue, expiry job |
| 2 | Compliance screening | `compliance_checks`, `beneficial_owners`, `risk_flags` | — | — | — | Screening adapter, UBO forms, risk queue |
| 2 | Badges | `badges`, `company_badges` | 5 badges with `ruleConfig` | consumed by search filter | `TrustBadges` UI component | Badge engine job, manual grant UI |
| 2 | Reviews & anti-fraud | `reviews` (unique per order/side) | — | — | `RatingStars` UI | Review service, fraud scoring, moderation queue, rating aggregation |
| 2 | Subscriptions & billing | `plans`, `subscriptions` | 4 plans; FREE subscription on signup | `createCompanyForUser` | — | Upgrade flow, payment for plans, limit enforcement helpers, `/seller/subscription` |
| 2 | Support | `support_tickets`, `support_ticket_messages` | — | — | — | Contact form → ticket, admin queue |
| 3 | Logistics | `logistics_providers/requests/quotes`, `shipments`, `shipment_events` | 3 forwarders | — | — | Request/quote/booking service, tracking, provider adapter, webhook |
| 3 | Inspection | `inspection_providers`, `inspection_orders` | 2 agencies | — | — | Booking service, report upload, adapter |
| 3 | Financing & credit | `financing_providers/applications/offers`, `credit_scoring_rules`, `credit_scores` | 3 lenders, 7 rules | — | — | Application service, scorer, router, adapter, offer acceptance |
| 4 | Advertising | `ad_products`, `ad_campaigns`, `advertisements`, `ad_events` | 6 products | — | — | Campaign purchase, placement rendering, event tracking, budget job |
| 4 | Analytics | `analytics_events`, `supplier_daily_metrics` | — | — | — | Event capture, rollup job, dashboards |
| 4 | Public API | `api_keys` | — | — | — | Key issuance, `/api/v1/*`, scope checks |
| 4 | More locales | `plannedLocales` in `routing.ts`; in-row `*Vi` columns | — | — | `LocaleSwitcher` | Message files, `*_translations` tables when needed |
| 4 | Homepage/CMS extras | `banners`, `email_templates` | — | — | — | Template rendering in `notifyUser`, banner placements |

---

## 3. Known limitations (as of this commit)

| # | Limitation | Impact | Fix / phase |
|---|---|---|---|
| L-01 | **No public or dashboard pages beyond auth, onboarding and three placeholder overviews.** | The product is not usable by a buyer or supplier yet | Phase 1 build (§1.1) |
| L-02 | `sitemap.ts` missing although `robots.ts` advertises `/sitemap.xml` | 404 on the sitemap; crawlers rely on links | P1-21 |
| L-03 | Only 5 of 17 message namespaces exist | Pages built without their namespace fall back to raw keys | P1-04 |
| L-04 | Demo seed creates two companies and **no products, RFQs or orders** (`seedMarketplace` is a bootstrap stub) | Search and directory pages will be empty in development | Phase 1 exit criterion 2 |
| L-05 | Seed always creates the demo accounts, including in production | Demo logins exist on a production database until deleted | `SEED_DEMO_DATA=false` guard (TODO in `deploy/README.md`) |
| L-06 | Vietnamese search is diacritics-sensitive (`immutable_unaccent` defined, not applied to generated columns) | "ba lo" does not find "ba lô" | Migration 0002: wrap `to_tsvector` inputs in `immutable_unaccent(...)` and normalise the query the same way; Phase 1 |
| L-07 | Rate limiter and settings cache are per-process (in-memory) | Limits reset on restart; two app replicas double every limit | Redis store when scaling (§ [`06-system-architecture.md`](06-system-architecture.md) §12.9) |
| L-08 | `EMAIL_PROVIDER=console` — e-mails are logged, not sent | Verification and reset e-mails never reach users | SMTP/Resend provider, Phase 1 before launch |
| L-09 | `STORAGE_PROVIDER=local` only | Uploads live on one host's volume | `S3Storage`, Phase 1 before launch (recommended) |
| L-10 | `COUNTERPARTY` documents are fetchable by any authenticated user who knows the random key; `PRIVATE`/`ADMIN` behave like `COMPANY` | Relies on unguessable keys and page-level linking | Real counterparty resolution in `/api/files`, Phase 2 |
| L-11 | No background jobs (RFQ expiry, session GC, badge engine, auto-complete) | RFQs never expire; badges never granted automatically | `/api/cron/[job]` + host cron, Phase 1–2 |
| L-12 | No payment webhook route; `confirmPayment` is callable only from code | Manual bank transfer needs an admin UI or webhook to confirm | Phase 2 |
| L-13 | Commission is computed on **every** `confirmPayment`, including partial payments, using the first order item's category for the rule | Marginal tiers apply per payment, not per order, so a 30/70 split passes through the higher-rate tiers twice (8 120 vs 7 820 USD on the flagship order — [`03-user-journeys.md`](03-user-journeys.md) §A); category override is by first item only, and `order_items` copied from a quotation carry no `productId` (`quotation_items` has none), so the category is currently always `null` (default rule) | Decide: per-order cumulative tiering vs. per-payment; resolve the category from `rfqs.categoryId` via `orders.rfqId`; document in `/admin/fees` |
| L-14 | `confirmPayment` records commission before checking whether one already exists for the payment | A retried confirmation after a partial failure could double-record | Add a unique index on `commissions (paymentId, type)` and `onConflictDoNothing`; Phase 2 |
| L-15 | `users_phone_idx` is unique on a nullable column — fine in Postgres (NULLs distinct), but two users cannot share a company switchboard number | Minor | Leave; document |
| L-16 | Google OAuth links accounts by verified e-mail without asking the existing user | Standard behaviour, but an attacker controlling a Google account with the same e-mail is the trust boundary | Acceptable; note in security doc |
| L-17 | 2FA columns exist, no flow | Staff accounts protected by password only | Phase 2 ([`05-permissions.md`](05-permissions.md) §7) |
| L-18 | No CSP header | XSS mitigated by React escaping only | Phase 2 hardening |
| L-19 | `manual_bank_transfer` is the adapter for all three seeded payment providers, including `CARD_GATEWAY` (inactive) | Card payments do not work; the row is a placeholder | Real PSP adapter, Phase 2 |
| L-20 | `docs/er-model.prisma` is a reference copy and can drift from the Drizzle schema | Two sources of truth | Regenerate or delete after Phase 1 |

---

## 4. Out of scope for the MVP — and why

| Excluded | Why |
|---|---|
| **Any custody of funds, escrow logic inside CANG, or lending decisions** | CANG is not licensed for it. Trade Assurance is a partner-bank product orchestrated through `PaymentProviderAdapter`; financing is routed to licensed lenders. Building "our own escrow" would be both illegal and a distraction |
| **Card payments and PSP integration in Phase 1** | No money moves in Phase 1; the first real adapter should be the escrow partner (Phase 2), which is where the revenue is |
| **Native mobile apps** | The dashboards are responsive (375 px rule in `CONVENTIONS.md`); B2B procurement happens on desktop |
| **Real-time chat (WebSockets)** | Messaging is asynchronous by nature (time zones DE↔VN); polling/revalidation on the conversation page is sufficient until volume proves otherwise |
| **Machine translation of messages** | `messages.translations` is reserved; a provider is a Phase 4 add-on once zh/ko/ja arrive |
| **Locales beyond en/vi** | Architected for (`plannedLocales`), but each locale needs human-quality messages and localized catalogue text; adding them before there is supply-side content in Vietnamese is wasted effort |
| **OpenSearch / Elasticsearch** | Postgres tsvector with GIN handles the Phase 1 catalogue size; the `SearchProvider` interface keeps the door open |
| **Kubernetes** | One VPS with Compose is the right size for launch; the image and the stateless app are Kubernetes-ready when needed |
| **Advertising marketplace, analytics dashboards, public API** | Revenue streams that need traffic first; schema and pricing seeded so they can be switched on in Phase 4 |
| **Sample ordering / cart checkout** | Industrial B2B is quotation-driven; samples are a `quotations.sampleAvailable/samplePrice` field, not a separate commerce flow |
| **Supplier-side ERP integrations** | Public API (Phase 4) is the integration surface |
| **Blockchain / smart-contract escrow** | Not a requirement of buyers, banks or regulators |
