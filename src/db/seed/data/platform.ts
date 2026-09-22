/** Platform configuration seeds: plans, badges, fee rules, providers, ad products, homepage sections, settings. */
import type { PlanLimits } from "@/db/schema";

export const PLANS: Array<{ code: string; tier: "FREE" | "PRO" | "PREMIUM" | "ENTERPRISE"; name: string; nameVi: string; description: string; priceMonthly: number; priceYearly: number; features: string[]; limits: PlanLimits; sortOrder: number; isPublic: boolean }> = [
  {
    code: "FREE", tier: "FREE", name: "Free Seller", nameVi: "Gói Miễn phí", sortOrder: 0, isPublic: true,
    description: "Get listed and receive your first inquiries.",
    priceMonthly: 0, priceYearly: 0,
    features: ["Up to 20 products", "Basic company profile", "Respond to 10 RFQs / month", "Standard search ranking", "Buyer messaging"],
    limits: { maxProducts: 20, maxRfqResponsesPerMonth: 10, analytics: "basic", rfqPriority: false, searchBoost: 0, verificationIncluded: false, teamSeats: 2, apiAccess: false, featuredSlots: 0 },
  },
  {
    code: "PRO", tier: "PRO", name: "Pro Seller", nameVi: "Gói Pro", sortOrder: 1, isPublic: true,
    description: "Grow with more products, priority RFQs and analytics.",
    priceMonthly: 99, priceYearly: 990,
    features: ["Up to 200 products", "Priority RFQ access (see RFQs 24h earlier)", "Advanced analytics", "Better search visibility", "Business verification included", "5 team seats", "2 featured product slots"],
    limits: { maxProducts: 200, maxRfqResponsesPerMonth: 100, analytics: "advanced", rfqPriority: true, searchBoost: 2, verificationIncluded: true, teamSeats: 5, apiAccess: false, featuredSlots: 2 },
  },
  {
    code: "PREMIUM", tier: "PREMIUM", name: "Verified Manufacturer", nameVi: "Nhà sản xuất Xác minh", sortOrder: 2, isPublic: true,
    description: "Factory verification, premium profile, lead generation and API access.",
    priceMonthly: 349, priceYearly: 3490,
    features: ["Unlimited products", "On-site factory verification & audit badge", "Premium profile with video and factory tour", "Top search placement", "Lead generation & buyer matching", "Advanced analytics & exports", "API access", "Unlimited team seats", "6 featured product slots", "Dedicated account manager"],
    limits: { maxProducts: null, maxRfqResponsesPerMonth: null, analytics: "advanced", rfqPriority: true, searchBoost: 5, verificationIncluded: true, teamSeats: null, apiAccess: true, featuredSlots: 6 },
  },
  {
    code: "ENTERPRISE", tier: "ENTERPRISE", name: "Enterprise", nameVi: "Doanh nghiệp", sortOrder: 3, isPublic: false,
    description: "Custom terms for industrial groups and trading companies.",
    priceMonthly: 0, priceYearly: 0,
    features: ["Everything in Verified Manufacturer", "Custom integrations", "Multi-factory management", "Custom commission terms"],
    limits: { maxProducts: null, maxRfqResponsesPerMonth: null, analytics: "advanced", rfqPriority: true, searchBoost: 8, verificationIncluded: true, teamSeats: null, apiAccess: true, featuredSlots: 12 },
  },
];

export const BADGES = [
  { code: "VERIFIED_MANUFACTURER", name: "Verified Manufacturer", nameVi: "Nhà sản xuất đã xác minh", icon: "BadgeCheck", color: "success", isAutomatic: true, sortOrder: 0, description: "Business registration, tax ID and factory ownership verified by CANG.", ruleConfig: { type: "VERIFICATION", verificationStatus: "VERIFIED", requiresManufacturerProfile: true } },
  { code: "FACTORY_AUDITED", name: "Factory Audited", nameVi: "Nhà máy đã kiểm định", icon: "Factory", color: "ink", isAutomatic: true, sortOrder: 1, description: "An on-site audit (CANG or third-party) was completed in the last 24 months.", ruleConfig: { type: "VERIFICATION_TYPE", verificationType: "FACTORY_AUDIT", maxAgeMonths: 24 } },
  { code: "EXPORT_READY", name: "Export Ready", nameVi: "Sẵn sàng xuất khẩu", icon: "Globe2", color: "info", isAutomatic: true, sortOrder: 2, description: "Documented export experience to at least 3 countries and accepted international payment terms.", ruleConfig: { type: "EXPORT", minExportCountries: 3, requiresIncoterms: true } },
  { code: "FAST_RESPONSE", name: "Fast Response", nameVi: "Phản hồi nhanh", icon: "Zap", color: "brass", isAutomatic: true, sortOrder: 3, description: "Responds to ≥ 90% of inquiries within 24 hours (rolling 90 days).", ruleConfig: { type: "RESPONSE", minResponseRate: 90, maxAvgResponseHours: 24, windowDays: 90 } },
  { code: "TOP_SUPPLIER", name: "Top Supplier", nameVi: "Nhà cung cấp hàng đầu", icon: "Star", color: "brass", isAutomatic: true, sortOrder: 4, description: "Rating ≥ 4.7 with at least 10 verified reviews and no unresolved disputes.", ruleConfig: { type: "PERFORMANCE", minRating: 4.7, minReviews: 10, maxOpenDisputes: 0 } },
];

export const ORDER_STATUSES = [
  { code: "PURCHASE_ORDER", name: "Purchase order", nameVi: "Đơn đặt hàng", sortOrder: 10, color: "steel", allowedTransitions: ["PAYMENT", "CANCELLED"] },
  { code: "PAYMENT", name: "Awaiting payment", nameVi: "Chờ thanh toán", sortOrder: 20, color: "warning", allowedTransitions: ["PRODUCTION", "CANCELLED", "DISPUTED"] },
  { code: "PRODUCTION", name: "In production", nameVi: "Đang sản xuất", sortOrder: 30, color: "info", allowedTransitions: ["QUALITY_INSPECTION", "SHIPPING", "DISPUTED", "CANCELLED"] },
  { code: "QUALITY_INSPECTION", name: "Quality inspection", nameVi: "Kiểm định chất lượng", sortOrder: 40, color: "info", allowedTransitions: ["SHIPPING", "PRODUCTION", "DISPUTED"] },
  { code: "SHIPPING", name: "Shipping", nameVi: "Đang vận chuyển", sortOrder: 50, color: "brass", allowedTransitions: ["DELIVERY", "DISPUTED"] },
  { code: "DELIVERY", name: "Delivered", nameVi: "Đã giao hàng", sortOrder: 60, color: "success", allowedTransitions: ["COMPLETED", "DISPUTED"] },
  { code: "COMPLETED", name: "Completed", nameVi: "Hoàn tất", sortOrder: 70, color: "success", isTerminal: true, isCancellable: false, allowedTransitions: [] },
  { code: "DISPUTED", name: "In dispute", nameVi: "Đang tranh chấp", sortOrder: 80, color: "danger", isCancellable: false, allowedTransitions: ["PRODUCTION", "SHIPPING", "DELIVERY", "COMPLETED", "CANCELLED"] },
  { code: "CANCELLED", name: "Cancelled", nameVi: "Đã huỷ", sortOrder: 90, color: "steel", isTerminal: true, isCancellable: false, allowedTransitions: [] },
];

export const FEE_RULES = [
  { code: "COMMISSION_DEFAULT", name: "Transaction commission (default)", type: "TRANSACTION_COMMISSION", calc: "TIERED", value: 0, tiers: [{ upTo: 10000, percent: 3 }, { upTo: 50000, percent: 2.5 }, { upTo: null, percent: 2 }], paidBy: "SELLER", priority: 0, description: "Marginal tiers on paid order value." },
  { code: "COMMISSION_FURNITURE", name: "Transaction commission — furniture", type: "TRANSACTION_COMMISSION", calc: "PERCENTAGE", value: 2.5, categorySlug: "furniture", paidBy: "SELLER", priority: 5, description: "Category override." },
  { code: "COMMISSION_AGRI", name: "Transaction commission — agriculture & food", type: "TRANSACTION_COMMISSION", calc: "PERCENTAGE", value: 1.5, categorySlug: "agriculture-food", paidBy: "SELLER", priority: 5, description: "Lower rate for commodity categories." },
  { code: "PAYMENT_ORCHESTRATION", name: "Payment orchestration fee", type: "PAYMENT_ORCHESTRATION", calc: "PERCENTAGE", value: 0.8, minFee: 5, paidBy: "SELLER", priority: 0, description: "Covers partner payment processing." },
  { code: "FINANCING_ORIGINATION", name: "Financing origination fee", type: "FINANCING_ORIGINATION", calc: "PERCENTAGE", value: 1, maxFee: 5000, paidBy: "SELLER", priority: 0, description: "Charged to the lender/borrower where legally permitted." },
  { code: "LOGISTICS_COMMISSION", name: "Logistics booking commission", type: "LOGISTICS_COMMISSION", calc: "PERCENTAGE", value: 5, paidBy: "SELLER", priority: 0, description: "Paid by logistics provider on booked quotes." },
  { code: "INSPECTION_COMMISSION", name: "Inspection referral commission", type: "INSPECTION_COMMISSION", calc: "PERCENTAGE", value: 10, paidBy: "SELLER", priority: 0, description: "Paid by inspection agency." },
  { code: "VERIFICATION_FEE", name: "Supplier verification fee", type: "VERIFICATION_FEE", calc: "FIXED", value: 199, paidBy: "SELLER", priority: 0, description: "One-time KYB + document verification (waived on Pro/Premium)." },
  { code: "RFQ_PRIORITY", name: "RFQ priority access", type: "RFQ_PRIORITY", calc: "FIXED", value: 29, paidBy: "SELLER", priority: 0, description: "Per-month add-on for Free sellers." },
  { code: "API_ACCESS", name: "API access", type: "API_ACCESS", calc: "FIXED", value: 149, paidBy: "SELLER", priority: 0, description: "Monthly API access for non-Premium plans." },
] as const;

export const PAYMENT_PROVIDERS = [
  {
    code: "PARTNER_BANK_TA", name: "Partner Bank — Trade Assurance Account", type: "ESCROW_PARTNER", adapterCode: "manual_bank_transfer",
    supportedMethods: ["BANK_TRANSFER", "INTERNATIONAL_WIRE"], supportedCurrencies: ["USD", "EUR", "VND"], supportedCountries: [], supportsEscrow: true, isActive: true, isDefault: true, sortOrder: 0,
    description: "Buyer funds are held in a segregated account at a licensed Vietnamese partner bank and released on delivery milestones.",
    licenseInfo: "Licensed credit institution under the State Bank of Vietnam (partner name and license number configured in Admin).",
    publicConfig: { beneficiaryName: "CANG TRADE ASSURANCE PARTNER (escrow account)", bankName: "Partner Bank Vietnam — to be configured", accountNumber: "0000-0000-0000", swift: "XXXXVNVX" },
    feeConfig: { percent: 0.6, fixed: 0, currency: "USD" },
  },
  {
    code: "VN_LOCAL_TRANSFER", name: "Vietnam local bank transfer (VND)", type: "BANK_TRANSFER", adapterCode: "manual_bank_transfer",
    supportedMethods: ["LOCAL_BANK_TRANSFER_VN"], supportedCurrencies: ["VND"], supportedCountries: ["VN"], supportsEscrow: false, isActive: true, isDefault: false, sortOrder: 1,
    description: "Domestic VND transfers (NAPAS / bank apps) for Vietnam-to-Vietnam trade.",
    licenseInfo: "Settled through partner bank.",
    publicConfig: { beneficiaryName: "CANG PARTNER BANK", bankName: "Vietcombank (example)", accountNumber: "0000000000" },
    feeConfig: { percent: 0.2, fixed: 0, currency: "VND" },
  },
  {
    code: "CARD_GATEWAY", name: "International cards (gateway)", type: "GATEWAY", adapterCode: "manual_bank_transfer",
    supportedMethods: ["CARD", "GATEWAY"], supportedCurrencies: ["USD", "EUR"], supportedCountries: [], supportsEscrow: false, isActive: false, isDefault: false, sortOrder: 2,
    description: "Card payments for samples and small orders — enable once a PSP contract is signed (Stripe / Adyen / VNPay adapter).",
    licenseInfo: "PSP licensed in its jurisdiction.",
    publicConfig: {},
    feeConfig: { percent: 2.9, fixed: 0.3, currency: "USD" },
  },
] as const;

export const FINANCING_PROVIDERS = [
  { code: "VN_TRADE_BANK", name: "Vietnam Trade Bank (demo partner)", type: "BANK", regulator: "State Bank of Vietnam", licenseNumber: "SBV-DEMO-001", products: ["WORKING_CAPITAL", "PRODUCTION_FINANCING", "PURCHASE_ORDER_FINANCING", "INVOICE_FINANCING"], countries: ["VN"], currencies: ["VND", "USD"], minAmount: 10000, maxAmount: 2000000, minTenorDays: 30, maxTenorDays: 365, indicativeRate: "0.9% – 1.4% / month", routingRules: { minCreditScore: 55, side: "SELLER" }, description: "Working-capital and production financing for verified Vietnamese manufacturers." },
  { code: "MEKONG_FACTORING", name: "Mekong Factoring (demo partner)", type: "FACTORING_COMPANY", regulator: "State Bank of Vietnam", licenseNumber: "SBV-DEMO-014", products: ["INVOICE_FACTORING", "RECEIVABLES_FINANCING"], countries: ["VN"], currencies: ["USD", "EUR"], minAmount: 20000, maxAmount: 1000000, minTenorDays: 30, maxTenorDays: 180, indicativeRate: "1.2% – 2.0% / month", routingRules: { minCreditScore: 50, side: "SELLER" }, description: "Non-recourse factoring of export receivables." },
  { code: "GLOBAL_IMPORT_FIN", name: "Global Import Finance (demo partner)", type: "FINTECH", regulator: "FCA (UK) / MAS (SG)", licenseNumber: "FIN-DEMO-777", products: ["IMPORT_FINANCING", "BNPL", "PURCHASE_FINANCING"], countries: ["US", "GB", "DE", "FR", "NL", "SG", "AU"], currencies: ["USD", "EUR", "GBP"], minAmount: 5000, maxAmount: 500000, minTenorDays: 30, maxTenorDays: 120, indicativeRate: "1.0% – 1.8% / 30 days", routingRules: { minCreditScore: 60, side: "BUYER" }, description: "Buy-now-pay-later and import financing for international buyers." },
] as const;

export const LOGISTICS_PROVIDERS = [
  { code: "SAIGON_FREIGHT", name: "Saigon Freight Solutions (demo)", services: ["FACTORY_PICKUP", "DOMESTIC_TRANSPORT", "FREIGHT_FORWARDING", "SEA_FREIGHT", "CUSTOMS_BROKERAGE", "CARGO_INSURANCE"], modes: ["SEA_FCL", "SEA_LCL", "ROAD"], countries: ["VN", "US", "DE", "GB", "NL", "AU"], description: "Full-service forwarder from southern Vietnam ports (Cat Lai, Cai Mep) to EU/US." },
  { code: "NORTHSTAR_LOGISTICS", name: "NorthStar Logistics Hai Phong (demo)", services: ["FACTORY_PICKUP", "WAREHOUSING", "FREIGHT_FORWARDING", "SEA_FREIGHT", "RAIL_FREIGHT", "CUSTOMS_BROKERAGE"], modes: ["SEA_FCL", "SEA_LCL", "RAIL", "ROAD"], countries: ["VN", "CN", "KR", "JP", "DE", "PL"], description: "Hai Phong / Lach Huyen forwarding incl. China-Europe rail." },
  { code: "VIETAIR_EXPRESS", name: "VietAir Express Cargo (demo)", services: ["FACTORY_PICKUP", "AIR_FREIGHT", "CUSTOMS_BROKERAGE", "LAST_MILE"], modes: ["AIR", "COURIER"], countries: ["VN", "US", "DE", "GB", "JP", "KR", "SG"], description: "Air freight and express for samples and urgent shipments." },
] as const;

export const INSPECTION_PROVIDERS = [
  { code: "VQC_INSPECT", name: "Vietnam Quality Control Services (demo)", services: ["FACTORY_AUDIT", "PRE_PRODUCTION", "DURING_PRODUCTION", "PRE_SHIPMENT", "CONTAINER_LOADING"], countries: ["VN"], description: "Nationwide inspectors, reports within 24h, AQL sampling." },
  { code: "ASIA_AUDIT_PARTNERS", name: "Asia Audit Partners (demo)", services: ["FACTORY_AUDIT", "PRE_SHIPMENT"], countries: ["VN", "KH", "TH"], description: "Social compliance and factory capability audits." },
] as const;

export const AD_PRODUCTS = [
  { code: "FEATURED_PRODUCT", placement: "FEATURED_PRODUCT", name: "Featured Product", nameVi: "Sản phẩm nổi bật", pricingModel: "FLAT_DAILY", price: 8, minBudget: 56, maxSlots: 24, description: "Highlighted in category listings and search results." },
  { code: "FEATURED_SUPPLIER", placement: "FEATURED_SUPPLIER", name: "Featured Supplier", nameVi: "Nhà cung cấp nổi bật", pricingModel: "FLAT_DAILY", price: 15, minBudget: 105, maxSlots: 12, description: "Featured in the manufacturers directory and homepage." },
  { code: "TOP_SEARCH", placement: "TOP_SEARCH", name: "Top Search", nameVi: "Đầu trang tìm kiếm", pricingModel: "CPC", price: 0.45, minBudget: 50, maxSlots: null, description: "Keyword-targeted top placement, pay per click." },
  { code: "CATEGORY_PROMOTION", placement: "CATEGORY_PROMOTION", name: "Category Promotion", nameVi: "Quảng bá danh mục", pricingModel: "FLAT_MONTHLY", price: 240, minBudget: 240, maxSlots: 6, description: "Banner placement on a category page." },
  { code: "HOMEPAGE_PROMOTION", placement: "HOMEPAGE_PROMOTION", name: "Homepage Promotion", nameVi: "Quảng bá trang chủ", pricingModel: "FLAT_MONTHLY", price: 900, minBudget: 900, maxSlots: 4, description: "Premium slot on the homepage." },
  { code: "RFQ_BOOST", placement: "RFQ_BOOST", name: "RFQ Boost", nameVi: "Ưu tiên RFQ", pricingModel: "CPM", price: 12, minBudget: 30, maxSlots: null, description: "For buyers: push an RFQ to more matching suppliers." },
] as const;

export const HOMEPAGE_SECTIONS = [
  { key: "TOP_CATEGORIES", title: "Top categories", titleVi: "Danh mục nổi bật", sortOrder: 1, config: { limit: 12 } },
  { key: "VERIFIED_MANUFACTURERS", title: "Verified manufacturers", titleVi: "Nhà sản xuất đã xác minh", subtitle: "Factories with verified registration, capacity and certifications.", subtitleVi: "Nhà máy đã xác minh đăng ký, năng lực và chứng nhận.", sortOrder: 2, config: { limit: 8 } },
  { key: "MADE_IN_VIETNAM", title: "Made in Vietnam", titleVi: "Sản xuất tại Việt Nam", subtitle: "What the world sources from Vietnam right now.", subtitleVi: "Thế giới đang tìm nguồn gì từ Việt Nam.", sortOrder: 3, config: { limit: 6 } },
  { key: "TRENDING_PRODUCTS", title: "Trending products", titleVi: "Sản phẩm xu hướng", sortOrder: 4, config: { limit: 12 } },
  { key: "POST_RFQ", title: "Tell us what you need — get quotations in 48 hours", titleVi: "Cho chúng tôi biết bạn cần gì — nhận báo giá trong 48 giờ", sortOrder: 5, config: {} },
  { key: "NEW_SUPPLIERS", title: "New suppliers", titleVi: "Nhà cung cấp mới", sortOrder: 6, config: { limit: 8 } },
  { key: "WHY_VIETNAM", title: "Why source from Vietnam", titleVi: "Vì sao chọn Việt Nam", sortOrder: 7, config: {} },
  { key: "TRADE_ASSURANCE", title: "Trade Assurance", titleVi: "Bảo đảm giao dịch", sortOrder: 8, config: {} },
  { key: "SERVICES", title: "Logistics, inspection & financing", titleVi: "Logistics, kiểm định & tài chính", sortOrder: 9, config: {} },
  { key: "GUIDES", title: "Guides", titleVi: "Hướng dẫn", sortOrder: 10, config: {} },
];

export const SETTINGS: Array<{ key: string; value: unknown; group: string; description: string; isPublic?: boolean }> = [
  { key: "site.name", value: "CANG", group: "general", description: "Platform display name", isPublic: true },
  { key: "site.tagline", value: "Source directly from verified Vietnamese manufacturers", group: "general", description: "Homepage hero tagline", isPublic: true },
  { key: "site.defaultCurrency", value: "USD", group: "general", description: "Default display currency", isPublic: true },
  { key: "site.supportEmail", value: "support@cang.vn", group: "general", description: "Support email shown to users", isPublic: true },
  { key: "rfq.defaultValidityDays", value: 14, group: "rfq", description: "Days an RFQ stays open when no deadline is given" },
  { key: "rfq.autoMatchLimit", value: 30, group: "rfq", description: "Max suppliers auto-invited per RFQ" },
  { key: "quotation.defaultValidityDays", value: 14, group: "rfq", description: "Default quotation validity" },
  { key: "orders.defaultDepositPercent", value: 30, group: "payments", description: "Deposit % when quotation terms are unspecified" },
  { key: "tradeAssurance.enabled", value: true, group: "payments", description: "Offer Trade Assurance on new orders", isPublic: true },
  { key: "tradeAssurance.inspectionWindowDays", value: 7, group: "payments", description: "Days after delivery to raise a dispute before funds release" },
  { key: "reviews.requireVerifiedPurchase", value: true, group: "general", description: "Only completed orders can be reviewed" },
  { key: "reviews.autoPublishThreshold", value: 30, group: "general", description: "Reviews with fraud score below this are auto-published" },
  { key: "products.requireModeration", value: false, group: "general", description: "New products need admin approval before going live" },
  { key: "uploads.maxSizeMb", value: 10, group: "general", description: "Maximum upload size" },
  { key: "compliance.sanctionsScreeningEnabled", value: true, group: "compliance", description: "Screen new companies against sanctions lists (provider adapter)" },
  { key: "compliance.kybRequiredForOrders", value: false, group: "compliance", description: "Require KYB before a company can place or accept orders" },
];

export const CREDIT_SCORING_RULES = [
  { code: "TRANSACTION_HISTORY", name: "Transaction history", feature: "completedOrders", weight: 20, config: { buckets: [{ min: 0, points: 0 }, { min: 1, points: 8 }, { min: 5, points: 14 }, { min: 20, points: 20 }] } },
  { code: "ORDER_VOLUME", name: "Order volume (USD, 12m)", feature: "gmv12m", weight: 15, config: { buckets: [{ min: 0, points: 0 }, { min: 10000, points: 6 }, { min: 100000, points: 11 }, { min: 500000, points: 15 }] } },
  { code: "DISPUTE_RATE", name: "Dispute rate", feature: "disputeRate", weight: 15, config: { buckets: [{ max: 0.02, points: 15 }, { max: 0.05, points: 10 }, { max: 0.1, points: 4 }, { max: 1, points: 0 }] } },
  { code: "COMPANY_AGE", name: "Company age (years)", feature: "companyAgeYears", weight: 10, config: { buckets: [{ min: 0, points: 2 }, { min: 2, points: 5 }, { min: 5, points: 8 }, { min: 10, points: 10 }] } },
  { code: "VERIFICATION", name: "Verification level", feature: "verificationLevel", weight: 15, config: { map: { UNVERIFIED: 0, PENDING: 3, VERIFIED: 10, AUDITED: 15 } } },
  { code: "PAYMENT_BEHAVIOR", name: "On-time payment rate", feature: "onTimePaymentRate", weight: 15, config: { buckets: [{ min: 0.95, points: 15 }, { min: 0.8, points: 9 }, { min: 0, points: 0 }] } },
  { code: "DELIVERY_PERFORMANCE", name: "On-time delivery rate", feature: "onTimeDeliveryRate", weight: 10, config: { buckets: [{ min: 0.95, points: 10 }, { min: 0.8, points: 6 }, { min: 0, points: 0 }] } },
] as const;
