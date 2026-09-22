# CANG demo accounts

The seed (`pnpm db:seed`) creates a fictional but realistic marketplace: 32 Vietnamese suppliers, 6 international buyers, ~175 products, 14 RFQs with 19 quotations, 11 orders across every lifecycle stage, 45 reviews, 8 conversations, notifications, analytics, ad campaigns and bilingual CMS pages. It is idempotent (skipped when the anchor supplier already has products) and deterministic (seeded PRNG in `src/db/seed/marketplace/rng.ts`).

All demo users share the password from `SEED_DEMO_PASSWORD` (default **`Password123!`**). The admin password comes from `SEED_ADMIN_PASSWORD` (default **`Admin123!`**).

## Platform admin

| Login | Role | What you see |
|---|---|---|
| `admin@cang.vn` | SUPER_ADMIN | Admin console: 6 pending KYB verifications, 5 products pending review, the open QUALITY dispute (Harbour & Finch vs Phoenix Activewear), a pending bank-transfer confirmation, fee rules, plans, providers, CMS pages and banners. |

## Buyers

| Login | Company | Country | Highlights |
|---|---|---|---|
| **`buyer@nordwind-outdoor.de`** (Lena Hartmann) | Nordwind Outdoor GmbH (`nordwind-outdoor`) | Hamburg, DE — VERIFIED | The demo journey: flagship RFQ "20,000 hiking backpacks 30–40 L, recycled polyester, private label, CIF Hamburg" (OPEN, deadline in 10 days) with 4 quotations from bag/apparel suppliers incl. a revised quotation chain from Saigon Pack; a QUALITY_INSPECTION order (6,000 laptop backpacks, both payments held under Trade Assurance, inspection scheduled), a COMPLETED order (5,000 rain jackets from Da Nang Outdoor Gear, verified review), an OPEN carton RFQ, a DRAFT base-layer RFQ, a logistics request with 2 freight quotes, 9 notifications and 2 conversations (incl. Nordwind ↔ Saigon Pack about the backpack RFQ with tech-pack attachment, quotation and counter-offer messages). |
| `purchasing@trailheadsupply.com` (Marcus Whitfield) | Trailhead Supply Co. (`trailhead-supply-co`) | Denver, US — VERIFIED | OPEN RFQs for trail running shoes (1 quotation) and a GPS-tracker PCBA (quotation UNDER_REVIEW), a CLOSED luggage RFQ (expired quotation), a PAYMENT-stage order (deposit PENDING with bank instructions) with a SUBMITTED buyer import-financing application, a COMPLETED trail-shoe order with a verified review. |
| `sourcing@harbourfinch.co.uk` (Priya Chandrasekar) | Harbour & Finch Retail Ltd (`harbour-finch-retail`) | Manchester, UK — PENDING | AWARDED dining-set RFQ → SHIPPING order (5 × 40HQ in transit to Southampton, passed pre-shipment inspection, all documents), a PURCHASE_ORDER-stage planter order, the DISPUTED leggings order (QUALITY dispute UNDER_REVIEW with 3 messages), a CLOSED dinnerware RFQ. |
| `trade@kanto-sourcing.jp` (Kenji Matsumoto) | Kanto Sourcing K.K. (`kanto-sourcing`) | Tokyo, JP — VERIFIED | OPEN towel and coffee RFQs, a DELIVERY-stage reefer order of pangasius (awaiting completion), a CANCELLED smart-plug order, coffee quotation conversation. |
| `buying@southerncrossdist.com.au` (Rebecca O'Donnell) | Southern Cross Distribution Pty Ltd (`southern-cross-distribution`) | Melbourne, AU — PENDING | OPEN safety-boot RFQ (one SUBMITTED, one WITHDRAWN quotation), CLOSED lounge-set RFQ (rejected quotation), a COMPLETED socket-set order with verified review. |
| `nam.le@hoanggiaindustrial.vn` (Lê Hoàng Nam, locale `vi`) | Hoang Gia Industrial Supply (`hoang-gia-industrial-supply`) | Hanoi, VN — buyer **and** seller | Vietnamese distributor: AWARDED LED high-bay RFQ → PRODUCTION order with BrightViet (50% deposit held), a Vietnamese-language product conversation, and 3 VND-priced stock products of its own. |

## Suppliers (sellers)

Every supplier owner uses locale `vi`. The anchor account for tests is **`sales@saigonpack.vn`**.

| Login | Company (slug) | Province · industry | Plan / status |
|---|---|---|---|
| **`sales@saigonpack.vn`** (Nguyễn Minh Tuấn) + sales `ngoc.tran@saigonpack.vn` | Saigon Pack Manufacturing (`saigon-pack-manufacturing`) | HCMC · bags & luggage / apparel | PREMIUM, VERIFIED, badges VERIFIED_MANUFACTURER + FACTORY_AUDITED + FAST_RESPONSE + EXPORT_READY + TOP_SUPPLIER; 8 products (2 featured, 1 draft), 11 reviews (4.82), the backpack RFQ quotation chain (rev. 1 REVISED → rev. 2 UNDER_REVIEW), the QUALITY_INSPECTION order, a production-financing application with a bank OFFER, an ACTIVE featured-product ad campaign, 9 notifications. |
| `sales@redriverbags.vn` | Red River Bag Works (`red-river-bag-works`) | Hanoi · promotional bags | PRO, VERIFIED — PAYMENT-stage tote order, backpack RFQ quotation (FOB) |
| `son.le@mekongtravelgear.com` (+ sales `chi.vo@…`) | Mekong Travel Gear (`mekong-travel-gear`) | Long An · luggage | PRO, PENDING — expired luggage quotation |
| `khanh.do@dnoutdoorgear.vn` | Da Nang Outdoor Gear (`da-nang-outdoor-gear`) | Da Nang · outdoor gear | PRO, VERIFIED, audited — COMPLETED rain-jacket order (AWARDED RFQ), backpack quotation |
| `lan.tran@daivietgarment.vn` (+ sales `long.nguyen@…`) | Dai Viet Garment Export (`dai-viet-garment-export`) | HCMC · apparel | PREMIUM, VERIFIED, featured — backpack + jacket quotations, 1 product pending review |
| `ha.bui@phoenixactivewear.vn` | Phoenix Activewear Manufacturing (`phoenix-activewear`) | Binh Duong · activewear | PRO, VERIFIED — respondent in the QUALITY dispute |
| `thang.vu@phumytextile.vn` | Phu My Textile Mills (`phu-my-textile-mills`) | Nam Dinh · fabrics | PRO, PENDING |
| `hanh.ngo@tbhometextiles.vn` | Thai Binh Home Textiles (`thai-binh-home-textiles`) | Thai Binh · home textiles | FREE, UNVERIFIED — towel quotation for Kanto |
| `sales@bienhoafootwear.vn` (+ sales `huong.ly@…`) | Bien Hoa Footwear Manufacturing (`bien-hoa-footwear`) | Dong Nai · footwear | PREMIUM, VERIFIED, featured — COMPLETED trail-shoe order, shoe RFQ quotation, WITHDRAWN safety-boot quotation |
| `dinh.truong@guardiansafety.vn` | Guardian Safety Footwear (`guardian-safety-footwear`) | Long An · safety footwear | FREE, PENDING — safety-boot quotation |
| `binh.phan@truonganfurniture.com` (+ sales `duong.dang@…`) | Truong An Wood Furniture (`truong-an-wood-furniture`) | Binh Duong · furniture | PREMIUM, VERIFIED, featured, TOP_SUPPLIER — SHIPPING dining-set order, top-search ad campaign, 10 reviews (4.88) |
| … | Sunrise Outdoor Furniture, Bac Ninh Precision Electronics, Viet Smart Devices, Hanoi Cable & Electric, BrightViet LED Lighting, Lac Hong Machinery, Da Nang Precision Engineering, Dong A Steel Structures, Thanh Cong Auto Components, Lach Huyen EV Components, An Phat Plastic Industries, Mekong Rubber Products, Saigon Carton & Packaging, VietFlex Packaging, Dai Loi Building Materials, Tay Nguyen Coffee Export, Delta Seafood Processing, Lotus Ceramics, Orchid Cosmetics Laboratory, VietChem Industrial, Thang Long Hand Tools | see `src/db/seed/data/suppliers.ts` for each owner's email | mix of FREE / PRO / PREMIUM, ~60% VERIFIED |

The full list of supplier owner and sales logins is the `owner.email` / `sales.email` field of each entry in `src/db/seed/data/suppliers.ts`.

## Where the demo data lives

| Area | File |
|---|---|
| Orchestrator (idempotency check, step order) | `src/db/seed/marketplace.ts` |
| Suppliers / buyers / products / scenarios / reviews / conversations / CMS | `src/db/seed/data/{suppliers,buyers,products-a,products-b,products-c,scenarios,reviews,conversations,pages}.ts` |
| Steps | `src/db/seed/marketplace/{companies,products,rfqs,orders,reviews,messaging,notifications,analytics,cms,finalize}.ts` |
| Copy composition (EN/VI descriptions, SEO) | `src/db/seed/marketplace/text.ts` |
| Deterministic PRNG and date helpers | `src/db/seed/marketplace/rng.ts` |

Business numbers (`RFQ-2026-…`, `ORD-2026-…`, …) come from `@/lib/ids` and differ between runs; everything else is deterministic. Document rows point at `/api/files/seed/orders/<orderNumber>/<name>.pdf` — the files themselves are not created.
