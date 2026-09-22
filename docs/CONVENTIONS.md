# CANG — Engineering Conventions (read before writing code)

This is the contract every module in the codebase follows. It is deliberately strict so that features built in parallel fit together.

## 1. Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15.5 (App Router, React 19, Server Components + Server Actions) | TypeScript strict |
| Styling | Tailwind CSS 3.4 + design tokens in `tailwind.config.ts` (`ink`, `brass`, `steel`, `success`, `warning`, `danger`, `info`) | fonts: Inter Variable (body), Manrope Variable (display) via `@fontsource-variable` |
| i18n | `next-intl` 4 — URL prefix `/en/...`, `/vi/...` (`localePrefix: "always"`) | messages split per namespace: `src/messages/<locale>/<namespace>.json` |
| DB | PostgreSQL 16 + Drizzle ORM 0.45 (`casing: "snake_case"`) | schema in `src/db/schema/*.ts`, migrations in `drizzle/` (drizzle-kit) |
| Auth | Custom DB-backed sessions (`cang_session` httpOnly cookie), bcrypt passwords, Google OAuth, phone-OTP provider abstraction | `src/modules/auth` |
| Validation | zod 3 | shared schemas live next to the module (`schemas.ts`) |
| Icons | `lucide-react` | |

Package manager: **pnpm**. Scripts: `pnpm dev`, `pnpm typecheck`, `pnpm build`, `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm db:reset`.

## 2. Folder structure

```
src/
  app/
    layout.tsx                      # passes through; <html> lives in [locale]/layout.tsx
    [locale]/
      layout.tsx                    # NextIntlClientProvider + ToastProvider; force-dynamic
      (marketing)/                  # public site — SiteHeader + SiteFooter
        page.tsx                    # homepage
        products/…  product/[slug]  manufacturers/…  supplier/[slug]  clusters/…  rfq/…  guides/… search/ …
      (auth)/                       # login, register, forgot-password, reset-password, verify-email
      (dashboard)/
        buyer/…   seller/…   admin/…   onboarding/
    api/                            # route handlers (auth callbacks, uploads, files, health, webhooks)
    robots.ts  sitemap.ts
  components/
    ui/          # design-system primitives (see §6)
    layout/      # SiteHeader, SiteFooter, DashboardShell, SidebarNav, SearchBar, UserMenu, Logo, LocaleSwitcher
    marketplace/ # ProductCard, SupplierCard, CategoryTile … (public + reusable)
    <feature>/   # feature-specific components (rfq/, orders/, messaging/ …)
  modules/       # domain logic — server-side only. One folder per bounded context:
    auth/ companies/ rfq/ orders/ payments/ fees/ notifications/ search/ storage/ settings/ audit/ …
      service.ts   # business operations (DB writes, side effects, notifications, audit)
      queries.ts   # read models for pages (typed selects with relations)
      schemas.ts   # zod input schemas (shared by server + client forms)
      actions.ts   # "use server" Server Actions (thin: auth → validate → service → revalidate/redirect)
  db/            # drizzle client, schema, migrations runner, seed
  i18n/          # routing, navigation (Link/redirect/useRouter/usePathname), request config
  lib/           # utils, env, seo, ids, action helpers, rate-limit
  messages/      # en/ vi/ <namespace>.json
```

Modular monolith: modules may import each other's `service.ts`/`queries.ts`; **pages never talk to the DB directly** except through module queries (keeps read models reusable and testable). Small page-local queries are acceptable in `queries.ts` of the owning module.

## 3. Routing & i18n

* Always import `Link`, `redirect`, `useRouter`, `usePathname` from `@/i18n/navigation` (never from `next/link` / `next/navigation` for internal links). `redirect({ href: "/buyer/orders", locale })` in server code (`const locale = await getLocale()`).
* Page props in Next 15 are promises: `{ params: Promise<{ locale: string; slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }` — `await` them.
* Translations: server `const t = await getTranslations("rfq")`, client `const t = useTranslations("rfq")`. Add keys to **both** `src/messages/en/<ns>.json` and `src/messages/vi/<ns>.json`. Namespaces registered in `src/i18n/request.ts`: common, nav, home, auth, marketplace, rfq, dashboard, buyer, seller, admin, messaging, orders, payments, logistics, financing, content, errors. English is the fallback for missing Vietnamese keys.
* Localized DB text: use `localized(row, "name", locale)` from `@/lib/utils` (picks `nameVi` for vi).
* Public URL scheme (SEO):
  * `/products` · `/products/[categorySlug]` (category listing; supports `?sub=<childSlug>`) · `/product/[slug]` (detail)
  * `/manufacturers` · `/manufacturers/[industrySlug]` · `/manufacturers/[industrySlug]/[provinceSlug]` · `/supplier/[slug]`
  * `/clusters` · `/clusters/[provinceSlug]` · `/search?q=` · `/rfq` (public RFQ marketplace) · `/rfq/[id]` · `/rfq/new`
  * `/guides` · `/guides/[slug]` · `/why-vietnam` · `/trade-assurance` · `/logistics` · `/financing` · `/inspection` · `/pricing` · `/about` · `/contact` · `/help` · `/legal/[slug]`
  * Dashboards: `/buyer/...`, `/seller/...`, `/admin/...` (see sidebar in `components/layout/dashboard-shell.tsx`).
* Metadata: `export async function generateMetadata()` returning `buildMetadata({ locale, path, title, description, image })` from `@/lib/seo` (adds canonical + hreflang + OpenGraph). Add JSON-LD with `<JsonLd data={productJsonLd(...)} />`.

## 4. Auth, sessions, RBAC

```ts
import { getAuth, requireAuth, requireCompany, requireAdmin, canCompany, canPlatform } from "@/modules/auth/current-user";

const auth = await getAuth();                       // AuthContext | null (cached per request)
const { user, company, membership } = await requireCompany({ permission: "rfq.write", buyer: true });
const admin = await requireAdmin("admin.orders.write");
```

* `AuthContext = { user, sessionId, memberships, activeMembership }`. `activeMembership.company` is the company the user acts for; a company can be both `isBuyer` and `isSeller`.
* Permissions are strings defined in `src/modules/auth/rbac.ts` (`COMPANY_PERMISSIONS`, `PLATFORM_PERMISSIONS`). Check them in server actions **and** hide UI affordances with `canCompany(auth, "products.write")`.
* Every state-changing action must (1) authenticate, (2) verify the entity belongs to the acting company (`where: and(eq(x.id, id), eq(x.companyId, company.id))`), (3) validate with zod, (4) write, (5) `audit(...)` for important actions, (6) `notifyCompany/notifyUser(...)` when the counterparty should know, (7) `revalidatePath(...)` or `redirect`.
* Dashboard layouts already guard access (`(dashboard)/buyer|seller|admin/layout.tsx`). Pages still call `requireCompany()` to get the company.

## 5. Server Actions & forms

```ts
// modules/rfq/actions.ts
"use server";
export async function createRfqAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "rfq.write", buyer: true });
    const parsed = parseInput(createRfqSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;          // { ok:false, fieldErrors }
    const rfq = await createRfq(company.id, user.id, parsed.data);
    revalidatePath("/[locale]/buyer/rfqs", "page");
    return ok({ id: rfq.id }, "RFQ created");
  });
}
```

Client side:
```tsx
"use client";
const { state, formAction, fieldError, pending } = useActionForm(createRfqAction, { onSuccess: (d) => router.push(`/buyer/rfqs/${d.id}`) });
<form action={formAction}>
  <Field label="Title" htmlFor="title" error={fieldError("title")} required><Input id="title" name="title" /></Field>
  <FormError state={state} />
  <SubmitButton>Create</SubmitButton>
</form>
```

* Only `async` functions may be exported from a `"use server"` file.
* Numbers/booleans from FormData: use `z.coerce.number()`, `z.coerce.boolean()`; checkboxes send `"on"`. Arrays: name inputs `foo[]` (handled by `formDataToObject`).
* Redirect inside an action: `redirect({ href, locale })` from `@/i18n/navigation` (throws; `runAction` re-throws Next redirects correctly).
* Simple one-off buttons (approve/reject/mark read) may be plain `<form action={boundAction}>` with `SubmitButton`.

## 6. UI kit (`@/components/ui`)

`Button` (variants: primary | accent | secondary | ghost | danger | link | subtle; `href` renders a Link), `SubmitButton`, `Input`, `Textarea`, `Select`, `Checkbox`, `Label`, `Field`, `Badge`, `StatusBadge` (colour by status code), `TrustBadges` (supplier badge codes), `VerifiedMark`, `Card/CardHeader/CardContent/CardFooter`, `StatCard`, `EmptyState`, `Alert`, `Skeleton`, `Separator`, `DataList`, `Table/THead/TBody/TR/TH/TD`, `Avatar`, `RatingStars`, `Breadcrumbs`, `PageHeader`, `SectionHeading`, `LinkTabs`, `Pagination`, `JsonLd`, `SmartImage` (img with fallback; use `fill` inside a `relative aspect-[4/3]` box), `Dialog`, `Dropdown/DropdownItem`, `useToast`, `useActionForm`, `FormError`, `FormSuccess`.

Layout: pages inside dashboards render `<PageHeader title=… actions=… />` then content; public pages use `<div className="container py-8">`. Keep the look **modern, industrial, trustworthy**: white surfaces, `steel` borders, `ink` primary, `brass` only for accents/highlights, generous whitespace, no gradients except subtle hero backgrounds.

Formatting helpers (`@/lib/utils`): `formatMoney(amount, currency, locale)`, `formatNumber`, `formatDate`, `formatDateTime`, `timeAgo`, `truncate`, `humanize("IN_PRODUCTION") → "In Production"`, `employeeRangeLabel`, `slugify`, `cn`.

## 7. Data access (Drizzle)

```ts
import { db } from "@/db";
import { products, companies } from "@/db/schema";
import { and, eq, desc, ilike, sql, inArray, count } from "drizzle-orm";

// relational API (preferred for pages)
const rfq = await db.query.rfqs.findFirst({ where: eq(rfqs.id, id), with: { items: true, quotations: { with: { supplierCompany: true, items: true } }, buyerCompany: true } });
// query builder
const rows = await db.select().from(products).where(and(eq(products.companyId, companyId), eq(products.status, "ACTIVE"))).orderBy(desc(products.createdAt)).limit(20);
// transactions
await db.transaction(async (tx) => { … });
```

* Money columns are JS `number`s (numeric mode "number"); never do float math for totals without rounding (`Math.round(x*100)/100`).
* Never change the schema without coordination. If a field is truly missing, use an existing `jsonb` `metadata`/`data` column and note it in your report.
* Soft-delete: filter `isNull(x.deletedAt)` where the table has it.
* Denormalised counters (`quotationCount`, `viewCount`, `ratingAvg`) must be kept in sync by the service that mutates the source rows.
* Full-text search: use `search()` from `@/modules/search` (`searchProducts`, `searchSuppliers`, `suggest`) — do not hand-roll search queries.

## 8. Core services you should reuse (do not re-implement)

| Need | Use |
|---|---|
| Create order from accepted quotation, status transitions, timeline | `@/modules/orders/service` (`createOrderFromQuotation`, `transitionOrder`, `addOrderNote`, `TRANSITION_ACTORS`) |
| Payments (initiate / confirm / release / refund), payment schedule | `@/modules/payments/service`, providers in `registry.ts` |
| Fees & commissions (configurable) | `@/modules/fees/engine` (`previewFee`, `recordCommission`) |
| RFQ publish + supplier matching + counters | `@/modules/rfq/service` (`publishRfq`, `refreshQuotationCount`, `canSupplierViewRfq`) |
| Notifications (in-app + email) | `@/modules/notifications/service` (`notifyUser`, `notifyCompany`) |
| Audit log | `@/modules/audit/log` (`audit({ actorId, action: "product.publish", entityType: "product", entityId })`) |
| Settings | `@/modules/settings/service` (`getSetting("rfq.defaultValidityDays")`) |
| Uploads | POST `/api/uploads` (multipart: file, scope, visibility) → `{ id, url }`; server-side `saveUpload()` in `@/modules/storage/upload` |
| Company creation / capability | `@/modules/companies/service` |
| Business numbers | `@/lib/ids` (`rfqNumber()`, `quotationNumber()`, …) |
| Rate limits | `rateLimit(key, RATE_LIMITS.message)` |

## 9. Security checklist (per feature)

* Authorise every read of private data by company membership; never trust ids from the client.
* Validate all input with zod; escape nothing manually — React escapes; use `dangerouslySetInnerHTML` only for JSON-LD via `<JsonLd/>`.
* Never expose secrets: `@/lib/env` is server-only; only `NEXT_PUBLIC_*` reaches the client.
* File uploads go through `saveUpload` (MIME sniffing, size limit, random keys).
* Rate-limit spammy actions (messages, RFQs, uploads).
* Log admin actions with `audit({ actorType: "ADMIN", … })`.

## 10. Quality bar

* `pnpm typecheck` must pass. Do not use `any`; prefer inferred Drizzle types (`typeof products.$inferSelect`).
* Every primary button does something real (server action or navigation). Forms validate on the server (zod) and show field errors.
* Empty states, loading states (`loading.tsx` with `Skeleton` where lists are heavy), error boundaries inherit from `[locale]/error.tsx`.
* Responsive: desktop-first but every page must be usable at 375px (stack columns, horizontal scroll for tables).
* Accessibility: labels on inputs, `aria-current` on active nav, buttons not divs.
* Vietnamese translations: provide real Vietnamese, not machine-looking placeholders, for every user-facing key.
