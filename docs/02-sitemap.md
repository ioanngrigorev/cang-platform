# 02 — Sitemap

Every URL is locale-prefixed (`localePrefix: "always"`), so each row below exists twice: `/en/...` and
`/vi/...`, with `hreflang` alternates emitted by `buildMetadata()` and an `x-default` pointing at `/en`.

**Status legend** — **Built**: route exists and works. **Placeholder**: route exists but renders a stub.
**Planned (P*n*)**: not built, scheduled for the named phase.

---

## 1. Public site (`src/app/[locale]/(marketing)`)

### 1.1 Home and search

| Route | Purpose | SEO intent | Index | Sample URL | Data source | Status |
|---|---|---|---|---|---|---|
| `/` | "Source from Vietnam" hero + search, then admin-composed sections | Brand + head term "Vietnam manufacturers" | Yes | `/en` | `homepage_sections`, `banners`, `product_categories`, `companies`, `products` | **Placeholder** |
| `/search` | Unified search results (products + suppliers), faceted | Long-tail; `noindex` on parameterised queries, canonical to the clean path | Partial | `/en/search?q=backpack&verified=1` | `search().searchProducts/searchSuppliers` | Planned (P1) |

Homepage sections are rows in `homepage_sections`, ordered by `sortOrder`, each with a JSON `config`:
`TOP_CATEGORIES` (limit 12), `VERIFIED_MANUFACTURERS` (8), `MADE_IN_VIETNAM` (6), `TRENDING_PRODUCTS` (12),
`POST_RFQ`, `NEW_SUPPLIERS` (8), `WHY_VIETNAM`, `TRADE_ASSURANCE`, `SERVICES` (logistics/inspection/
financing), `GUIDES`. Turning a section off is an Admin toggle.

### 1.2 Product catalog

| Route | Purpose | SEO intent | Index | Sample URL | Data source | Status |
|---|---|---|---|---|---|---|
| `/products` | All categories, top-level tiles | Category hub | Yes | `/en/products` | `product_categories` where `level = 0` | Planned (P1) |
| `/products/[categorySlug]` | Category listing with facets; `?sub=` narrows to a child | Head category terms ("packaging manufacturers Vietnam") | Yes | `/en/products/packaging?sub=corrugated-boxes` | `searchProducts({ categorySlug })` | Planned (P1) |
| `/product/[slug]` | Product detail: gallery, tiered pricing, MOQ, lead time, specs, variants, certifications, supplier card, Contact supplier / Request quotation | Product long-tail; `Product` + `AggregateOffer` JSON-LD | Yes | `/en/product/420d-ripstop-hiking-backpack` | `products` + images/tiers/variants/specs/certifications + `companies` | Planned (P1) |

Flat single-segment `/product/[slug]` (not nested under the category) keeps the canonical URL stable when a
product is recategorised.

### 1.3 Manufacturer directory

| Route | Purpose | SEO intent | Index | Sample URL | Data source | Status |
|---|---|---|---|---|---|---|
| `/manufacturers` | Directory landing: industries, clusters, featured verified suppliers | Head term "Vietnamese manufacturers" | Yes | `/en/manufacturers` | `industries`, `provinces`, `searchSuppliers({ verifiedOnly })` | Planned (P1) |
| `/manufacturers/[industrySlug]` | Suppliers in one industry, faceted | "textile manufacturers Vietnam" | Yes | `/en/manufacturers/textiles` | `searchSuppliers({ industrySlug })` | Planned (P1) |
| `/manufacturers/[industrySlug]/[provinceSlug]` | Industry × province — the highest-intent SEO surface | "textile manufacturers Ho Chi Minh City" | Yes | `/en/manufacturers/textiles/ho-chi-minh-city` | `searchSuppliers({ industrySlug, provinceSlug })` | Planned (P1) |
| `/supplier/[slug]` | Manufacturer profile: overview, factory (size, lines, capacity, OEM/ODM, lead times), certifications, products, media, badges, reviews, contact | Brand + "company name" queries; `Organization` + `AggregateRating` JSON-LD | Yes | `/en/supplier/saigon-pack-manufacturing` | `companies` + `manufacturer_profiles` + certifications + media + badges + products + reviews | Planned (P1) |

24 industries × 8 cluster provinces = 192 indexable industry×province pages per locale, plus 28 province pages
and 118 category pages (20 top-level plus 98 children reachable as `?sub=`; children are canonicalised to the
parent unless they have their own inventory). Empty combinations should return a 200 page with related links and
`robots: noindex, follow` until they have inventory, to avoid thin-content penalties.

### 1.4 Industrial clusters

| Route | Purpose | SEO intent | Index | Sample URL | Data source | Status |
|---|---|---|---|---|---|---|
| `/clusters` | All Vietnamese industrial clusters | "Vietnam industrial zones" | Yes | `/en/clusters` | `provinces` where `isIndustrialCluster` | Planned (P1) |
| `/clusters/[provinceSlug]` | Cluster landing: headline, description, key facts, major industries, suppliers in the province | "Binh Duong manufacturing" | Yes | `/en/clusters/binh-duong` | `provinces` (cluster content columns) + `searchSuppliers({ provinceSlug })` | Planned (P1) |

Seeded clusters: `ho-chi-minh-city`, `binh-duong`, `dong-nai`, `bac-ninh`, `hai-phong`, `hanoi`, `da-nang`,
`long-an`.

### 1.5 RFQ marketplace

| Route | Purpose | SEO intent | Index | Sample URL | Data source | Status |
|---|---|---|---|---|---|---|
| `/rfq` | Public open RFQs — a demand signal that attracts suppliers | "buyers looking for Vietnamese suppliers" | Yes | `/en/rfq` | `rfqs` where `status='OPEN' AND visibility='PUBLIC'` | Planned (P1) |
| `/rfq/[id]` | Public RFQ detail; buyer identity partially masked until a quotation is submitted | Long-tail demand terms | Yes | `/en/rfq/clx…` | `rfqs` + `rfq_items`, gated by `canSupplierViewRfq` | Planned (P1) |
| `/rfq/new` | Post an RFQ (auth required; unauthenticated users are sent to register with intent preserved) | Conversion, `noindex` | No | `/en/rfq/new` | `createRfq` action | Planned (P1) |

### 1.6 Content, service and legal pages

| Route | Purpose | Index | Sample URL | Data source | Status |
|---|---|---|---|---|---|
| `/guides` | Buyer and supplier guide index | Yes | `/en/guides` | `pages` where `type='GUIDE'` | Planned (P1) |
| `/guides/[slug]` | Guide article (markdown) | Yes | `/en/guides/importing-from-vietnam` | `pages` | Planned (P1) |
| `/why-vietnam` | Sourcing case for Vietnam | Yes | `/en/why-vietnam` | `pages` (CMS) | Planned (P1) |
| `/trade-assurance` | How escrow-like protection works | Yes | `/en/trade-assurance` | CMS | Planned (P2) |
| `/logistics` | Logistics services and partners | Yes | `/en/logistics` | CMS + `logistics_providers` | Planned (P3) |
| `/financing` | Trade finance offering and partners | Yes | `/en/financing` | CMS + `financing_providers` | Planned (P3) |
| `/inspection` | Inspection services and partners | Yes | `/en/inspection` | CMS + `inspection_providers` | Planned (P3) |
| `/pricing` | Seller plans comparison | Yes | `/en/pricing` | `plans` where `isPublic` | Planned (P1) |
| `/about` | Company | Yes | `/en/about` | CMS | Planned (P1) |
| `/contact` | Contact form → `support_tickets` | Yes | `/en/contact` | CMS + support | Planned (P1) |
| `/help` | Help centre index | Yes | `/en/help` | `pages` where `type='HELP'` | Planned (P1) |
| `/legal/[slug]` | Terms, privacy, cookies, Trade Assurance terms, AUP | Yes | `/en/legal/privacy` | `pages` where `type='LEGAL'` | Planned (P1) |

### 1.7 SEO infrastructure

| Artifact | Location | Status | Notes |
|---|---|---|---|
| `robots.txt` | `src/app/robots.ts` | **Built** | Allows `/`, disallows `/api/`, `/*/buyer`, `/*/seller`, `/*/admin`, `/*/onboarding`, `/*/login`, `/*/register`, `/*/reset-password`, `/*/verify-email`; declares the sitemap and host |
| `sitemap.xml` | `src/app/sitemap.ts` | **Missing** | `robots.ts` already advertises it and `CONVENTIONS.md` §2 lists it — tracked as L-02 in [`07-mvp-boundaries.md`](07-mvp-boundaries.md) §3. Must emit locale-paired entries for categories, products, manufacturers, industry×province, clusters, guides and static pages, chunked per 50 000 URLs |
| Metadata | `src/lib/seo.ts` → `buildMetadata()` | **Built** | Canonical + `hreflang` per locale + `x-default`, OpenGraph, Twitter card, `robots` control |
| JSON-LD | `src/lib/seo.ts` + `<JsonLd/>` | **Built** | `organizationJsonLd`, `websiteJsonLd` (with `SearchAction`), `breadcrumbJsonLd`, `productJsonLd`, `supplierJsonLd`, `faqJsonLd` |

---

## 2. Auth routes (`src/app/[locale]/(auth)`)

All `noindex`.

| Route | Purpose | Status |
|---|---|---|
| `/login` | Email + password, Google button, `?next=` preserved | **Built** |
| `/register` | Account + company creation; `?type=buyer|seller` preselects the account type | **Built** |
| `/forgot-password` | Request a reset link | **Built** |
| `/reset-password` | Consume a reset token | **Built** |
| `/verify-email` | Consume an e-mail verification token | **Built** |

After sign-in, `defaultHomeFor(role, company)` routes: staff → `/admin`, no company → `/onboarding`,
seller → `/seller`, otherwise `/buyer`.

---

## 3. Buyer dashboard (`/buyer/*`)

Sidebar from `navFor("buyer", t)` in `src/components/layout/dashboard-shell.tsx`. The layout guard requires a
session; pages call `requireCompany({ buyer: true, permission })`.

| Group | Route | Purpose | Permission | Status |
|---|---|---|---|---|
| — | `/buyer` | Overview: open RFQs, quotations awaiting review, active orders, payments due, unread messages | `company.profile.read` | **Placeholder** |
| Sourcing | `/buyer/rfqs` | RFQ list with status filters | `rfq.read` | Planned (P1) |
| Sourcing | `/buyer/rfqs/new` | Create RFQ (items, quantity, target price, Incoterm, destination, deadline, requirements) | `rfq.write` | Planned (P1) |
| Sourcing | `/buyer/rfqs/[id]` | RFQ detail, invited suppliers, received quotations | `rfq.read` | Planned (P1) |
| Sourcing | `/buyer/rfqs/[id]/compare` | Side-by-side quotation comparison (unit price, total, MOQ, lead time, Incoterm, payment terms, validity, sample) | `quotation.read` | Planned (P1) |
| Sourcing | `/buyer/quotations` | All quotations across RFQs | `quotation.read` | Planned (P1) |
| Sourcing | `/buyer/quotations/[id]` | Quotation detail, negotiate, accept → order | `quotation.read` / `orders.write` | Planned (P1) |
| Sourcing | `/buyer/messages` | Conversation list | `messages.read` | Planned (P1) |
| Sourcing | `/buyer/messages/[conversationId]` | Thread with product/RFQ/order context | `messages.read` | Planned (P1) |
| Sourcing | `/buyer/saved/suppliers` | Saved suppliers | `company.profile.read` | Planned (P1) |
| Sourcing | `/buyer/saved/products` | Saved products | `company.profile.read` | Planned (P1) |
| Transactions | `/buyer/orders` | Orders list by status | `orders.read` | Planned (P2) |
| Transactions | `/buyer/orders/[id]` | Order detail: items, timeline, documents, payments, shipment, inspection, actions | `orders.read` | Planned (P2) |
| Transactions | `/buyer/payments` | Payment schedule and history | `payments.read` | Planned (P2) |
| Transactions | `/buyer/payments/[id]` | Payment detail + transfer instructions | `payments.read` | Planned (P2) |
| Transactions | `/buyer/invoices` | Proforma and commercial invoices | `payments.read` | Planned (P2) |
| Transactions | `/buyer/shipments` | Shipments and milestones | `logistics.manage` | Planned (P3) |
| Transactions | `/buyer/shipments/[id]` | Tracking timeline, documents | `logistics.manage` | Planned (P3) |
| Transactions | `/buyer/inspections` | Inspection orders and reports | `orders.read` | Planned (P3) |
| Transactions | `/buyer/financing` | Buyer financing applications and offers | `financing.apply` | Planned (P3) |
| Transactions | `/buyer/disputes` | Disputes raised or received | `disputes.manage` | Planned (P2) |
| Transactions | `/buyer/reviews` | Reviews written | `reviews.write` | Planned (P2) |
| Company | `/buyer/company` | Company profile + buyer profile (sourcing categories, volume, destinations, Incoterms) | `company.profile.read/write` | Planned (P1) |
| Company | `/buyer/company/verification` | KYB submission and status | `company.verification.submit` | Planned (P2) |
| Company | `/buyer/documents` | Document library | `company.profile.read` | Planned (P1) |
| Company | `/buyer/team` | Members, roles, invitations | `company.members.manage` | Planned (P1) |
| Company | `/buyer/notifications` | Notification centre | — | Planned (P1) |
| Company | `/buyer/settings` | Account, locale, password, sessions, notification preferences | — | Planned (P1) |

---

## 4. Seller dashboard (`/seller/*`)

Sidebar from `navFor("seller", t)`. Pages call `requireCompany({ seller: true, permission })`.

| Group | Route | Purpose | Permission | Status |
|---|---|---|---|---|
| — | `/seller` | Overview: profile completeness, views, leads, matched RFQs, quotations, orders, payments, plan usage | `company.profile.read` | **Placeholder** |
| Catalog | `/seller/products` | Product list, status filters, bulk actions | `products.read` | Planned (P1) |
| Catalog | `/seller/products/new` | Create product | `products.write` | Planned (P1) |
| Catalog | `/seller/products/[id]` | Edit: images, tiered pricing, MOQ, variants, specs, certifications, lead time, OEM/ODM, packaging, HS code, SEO | `products.write` / `products.publish` | Planned (P1) |
| Catalog | `/seller/company` | Company profile, description, media, languages, SEO | `company.profile.write` | Planned (P1) |
| Catalog | `/seller/company/factory` | Manufacturer profile: factory address, size, lines, capacity, OEM/ODM/private label, lead times, export countries, payment terms, Incoterms, equipment, materials, QC/R&D staff, video, factory tour | `company.profile.write` | Planned (P1) |
| Catalog | `/seller/company/certifications` | Certifications with documents and expiry | `company.profile.write` | Planned (P1) |
| Catalog | `/seller/company/verification` | KYB and verification submissions | `company.verification.submit` | Planned (P2) |
| Sales | `/seller/rfqs` | RFQ marketplace: matched, invited, all open | `rfq.read` | Planned (P1) |
| Sales | `/seller/rfqs/[id]` | RFQ detail + quote action (gated by `canSupplierViewRfq`) | `rfq.read` | Planned (P1) |
| Sales | `/seller/quotations` | Quotations by status | `quotation.read` | Planned (P1) |
| Sales | `/seller/quotations/new?rfq=` | Build a quotation (line items, shipping, discount, lead time, Incoterm, payment terms, validity, sample) | `quotation.write` | Planned (P1) |
| Sales | `/seller/quotations/[id]` | Detail, revise (new `revisionNumber` + `parentQuotationId`), withdraw | `quotation.write` | Planned (P1) |
| Sales | `/seller/messages` · `/seller/messages/[id]` | Buyer conversations | `messages.read/write` | Planned (P1) |
| Sales | `/seller/orders` · `/seller/orders/[id]` | Orders, timeline, status actions, documents | `orders.read/write` | Planned (P2) |
| Sales | `/seller/payments` · `/seller/payments/[id]` | Incoming payments, escrow state, release status | `payments.read` | Planned (P2) |
| Sales | `/seller/invoices` | Issue and track invoices | `payments.read` | Planned (P2) |
| Sales | `/seller/shipments` · `/seller/shipments/[id]` | Bookings and tracking | `logistics.manage` | Planned (P3) |
| Sales | `/seller/financing` | Working capital, production, PO and receivables financing | `financing.apply` | Planned (P3) |
| Sales | `/seller/disputes` | Disputes | `disputes.manage` | Planned (P2) |
| Sales | `/seller/reviews` | Received reviews, replies | `reviews.write` | Planned (P2) |
| Growth | `/seller/analytics` | Views, leads, RFQs, quotations, orders, GMV, conversion, top products, buyer geography | `analytics.read` | Planned (P4) |
| Growth | `/seller/advertising` | Campaigns, budgets, placements, performance | `advertising.manage` | Planned (P4) |
| Growth | `/seller/advertising/new` | Buy an ad product | `advertising.manage` | Planned (P4) |
| Growth | `/seller/subscription` | Plan, usage against limits, upgrade | `company.billing.manage` | Planned (P2) |
| Company | `/seller/team` | Members, roles, invitations | `company.members.manage` | Planned (P1) |
| Company | `/seller/api` | API keys and scopes | `company.apikeys.manage` | Planned (P4) |
| Company | `/seller/documents` | Document library | `company.profile.read` | Planned (P1) |
| Company | `/seller/notifications` | Notification centre | — | Planned (P1) |
| Company | `/seller/settings` | Account and preferences | — | Planned (P1) |

---

## 5. Admin console (`/admin/*`)

Sidebar from `navFor("admin", t)`. The layout guard requires `admin.access`; each page additionally requires
its own permission ([`05-permissions.md`](05-permissions.md)).

| Group | Route | Purpose | Permission | Status |
|---|---|---|---|---|
| — | `/admin` | Platform overview: GMV, orders, new companies, pending verifications, open disputes, flagged risk, revenue by stream | `admin.access` | **Placeholder** |
| Marketplace | `/admin/users` · `/admin/users/[id]` | User search, platform role, status, sessions, impersonation audit | `admin.users.read/write` | Planned (P1) |
| Marketplace | `/admin/companies` · `/admin/companies/[id]` | Company records, capabilities, status, badges, subscription, risk | `admin.companies.read/write` | Planned (P1) |
| Marketplace | `/admin/verification` · `/admin/verification/[id]` | KYB / verification review queue with documents and decisions | `admin.verification.review` | Planned (P2) |
| Marketplace | `/admin/compliance` | AML, sanctions, PEP, UBO and transaction-monitoring checks | `admin.compliance.review` | Planned (P3) |
| Marketplace | `/admin/products` | Product moderation queue, approve/reject with reason | `admin.products.moderate` | Planned (P1) |
| Marketplace | `/admin/categories` | Category tree, industries, featured flags, SEO fields | `admin.categories.write` | Planned (P1) |
| Marketplace | `/admin/rfqs` | All RFQs, moderation, boost | `admin.rfqs.read/write` | Planned (P1) |
| Marketplace | `/admin/moderation` | Reviews, messages and content reports | `admin.reviews.moderate` | Planned (P2) |
| Transactions | `/admin/orders` · `/admin/orders/[id]` | Order monitoring, forced transitions (audited), timeline | `admin.orders.read/write` | Planned (P2) |
| Transactions | `/admin/payments` | Payment monitoring, confirm manual transfers, release escrow, refund | `admin.payments.read/write` | Planned (P2) |
| Transactions | `/admin/financing` | Applications, routing, offers, funded volume | `admin.financing.read/write` | Planned (P3) |
| Transactions | `/admin/logistics` | Requests, quotes, shipments, providers | `admin.logistics.write` | Planned (P3) |
| Transactions | `/admin/disputes` · `/admin/disputes/[id]` | Mediation, internal notes, resolution and refund decisions | `admin.disputes.resolve` | Planned (P2) |
| Transactions | `/admin/risk` | Risk flag queue (fraud, AML, transaction monitoring) | `admin.compliance.review` | Planned (P3) |
| Monetization | `/admin/fees` | Fee rules: type, calc, tiers, scope, min/max, validity, priority | `admin.fees.write` | Planned (P2) |
| Monetization | `/admin/fees/commissions` | Commission ledger, invoicing, collection | `admin.fees.write` | Planned (P2) |
| Monetization | `/admin/plans` | Plans, limits, subscriptions | `admin.plans.write` | Planned (P2) |
| Monetization | `/admin/advertising` | Ad products, campaign approval, performance | `admin.advertising.write` | Planned (P4) |
| Monetization | `/admin/providers` | Payment, financing, logistics and inspection providers; adapters, licence info, activation | `admin.settings.write` | Planned (P2) |
| Platform | `/admin/analytics` | GMV, orders, buyers, sellers, RFQ conversion, AOV, revenue by stream, financing and logistics volume | `admin.analytics.read` | Planned (P4) |
| Platform | `/admin/cms` | Pages, guides, legal, banners, homepage sections, e-mail templates | `admin.cms.write` | Planned (P1) |
| Platform | `/admin/support` | Ticket queue and replies | `admin.support.write` | Planned (P2) |
| Platform | `/admin/settings` | `settings` key/value editor grouped by namespace | `admin.settings.write` | Planned (P1) |
| Platform | `/admin/audit` | Audit log search by actor, action, entity | `admin.audit.read` | Planned (P1) |

Additional route implied by the spec but absent from the sidebar: `/admin/order-statuses` (lifecycle editor for
`order_statuses` including `allowedTransitions`) and `/admin/badges` (badge rule editor). Both belong under
Platform; add them to `navFor("admin")` when built.

---

## 6. Onboarding

| Route | Purpose | Status |
|---|---|---|
| `/onboarding` | For a signed-in user without a company: choose buyer or seller, create the company (name, country, province, city) or enable the second capability on an existing one | **Built** |

---

## 7. API routes (`src/app/api/*`)

Excluded from the i18n middleware matcher, so these are **not** locale-prefixed.

| Method | Route | Purpose | Auth | Status |
|---|---|---|---|---|
| GET | `/api/health` | Liveness + `SELECT 1` database probe; `200 {status:"ok"}` or `503 {status:"degraded"}` | none | **Built** |
| GET | `/api/auth/google` | Begin Google OAuth (state cookie + redirect) | none | **Built** |
| GET | `/api/auth/google/callback` | Exchange code, upsert `auth_accounts`, create session | none | **Built** |
| POST | `/api/uploads` | Multipart upload (`file`, `scope`, `visibility`); validates MIME allow-list, sniffs content, enforces size and rate limit; returns `{id, url, name, mimeType, sizeBytes}` | session | **Built** |
| GET | `/api/files/[...key]` | Serve a stored document with visibility enforcement; public files get immutable caching, private files `no-store` | conditional | **Built** |
| POST | `/api/webhooks/payments/[provider]` | Provider payment callbacks → `parseWebhook` → `confirmPayment` / release / refund | signature | Planned (P2) |
| POST | `/api/webhooks/logistics/[provider]` | Carrier milestone callbacks → `shipment_events` | signature | Planned (P3) |
| POST | `/api/webhooks/financing/[provider]` | Lender decision callbacks → `financing_offers` | signature | Planned (P3) |
| GET | `/api/v1/*` | Public partner API (products, RFQs, orders) authenticated by `api_keys` with scopes | API key | Planned (P4) |
| POST | `/api/cron/[job]` | Badge engine, credit scores, metric rollups, RFQ expiry — token-protected, callable by system cron | shared secret | Planned (P2) |

Server Actions are the primary mutation transport for the web UI; route handlers exist only for things
Server Actions cannot do (third-party callbacks, binary upload/download, health, machine API).
