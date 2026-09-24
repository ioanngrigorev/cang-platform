import { pgEnum } from "drizzle-orm/pg-core";

// Identity
export const platformRoleEnum = pgEnum("platform_role", [
  "USER",
  "SUPPORT",
  "MODERATOR",
  "FINANCE",
  "COMPLIANCE",
  "ADMIN",
  "SUPER_ADMIN",
]);
export const userStatusEnum = pgEnum("user_status", ["PENDING_VERIFICATION", "ACTIVE", "SUSPENDED", "DEACTIVATED"]);
export const authProviderEnum = pgEnum("auth_provider", ["GOOGLE", "PHONE"]);
export const tokenPurposeEnum = pgEnum("token_purpose", [
  "EMAIL_VERIFICATION",
  "PASSWORD_RESET",
  "PHONE_OTP",
  "MAGIC_LINK",
  "TWO_FACTOR",
]);

// Companies
export const businessTypeEnum = pgEnum("business_type", [
  "MANUFACTURER",
  "OEM_MANUFACTURER",
  "ODM_MANUFACTURER",
  "WHOLESALER",
  "EXPORTER",
  "DISTRIBUTOR",
  "INDUSTRIAL_SUPPLIER",
  "SERVICE_PROVIDER",
  "TRADING_COMPANY",
  "IMPORTER",
  "RETAILER",
  "BRAND_OWNER",
  "LOGISTICS_PROVIDER",
  "INSPECTION_AGENCY",
  "FINANCIAL_INSTITUTION",
  "OTHER",
]);
export const companyStatusEnum = pgEnum("company_status", ["PENDING", "ACTIVE", "SUSPENDED", "BANNED"]);
export const verificationStatusEnum = pgEnum("verification_status", [
  "UNVERIFIED",
  "PENDING",
  "IN_REVIEW",
  "VERIFIED",
  "REJECTED",
  "EXPIRED",
]);
export const employeeRangeEnum = pgEnum("employee_range", [
  "R_1_10",
  "R_11_50",
  "R_51_200",
  "R_201_500",
  "R_501_1000",
  "R_1001_5000",
  "R_5000_PLUS",
]);
export const memberRoleEnum = pgEnum("member_role", [
  "OWNER",
  "ADMIN",
  "MANAGER",
  "SALES",
  "PURCHASING",
  "FINANCE",
  "STAFF",
  "VIEWER",
]);
export const memberStatusEnum = pgEnum("member_status", ["INVITED", "ACTIVE", "SUSPENDED", "REMOVED"]);
export const invitationStatusEnum = pgEnum("invitation_status", ["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"]);
export const badgeSourceEnum = pgEnum("badge_source", ["RULE", "MANUAL"]);

// Compliance
export const verificationTypeEnum = pgEnum("verification_type", [
  "KYB",
  "BUSINESS_LICENSE",
  "TAX_REGISTRATION",
  "FACTORY_AUDIT",
  "EXPORT_LICENSE",
  "BANK_ACCOUNT",
  "UBO",
  "IDENTITY",
]);
export const complianceCheckTypeEnum = pgEnum("compliance_check_type", [
  "KYC",
  "KYB",
  "AML",
  "SANCTIONS",
  "PEP",
  "UBO",
  "ADVERSE_MEDIA",
  "TRANSACTION_MONITORING",
]);
export const complianceStatusEnum = pgEnum("compliance_status", [
  "PENDING",
  "CLEARED",
  "FLAGGED",
  "REJECTED",
  "MANUAL_REVIEW",
]);
export const sanctionsStatusEnum = pgEnum("sanctions_status", ["NOT_SCREENED", "CLEAR", "POTENTIAL_MATCH", "MATCH"]);
export const riskSeverityEnum = pgEnum("risk_severity", ["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const riskFlagStatusEnum = pgEnum("risk_flag_status", ["OPEN", "INVESTIGATING", "RESOLVED", "DISMISSED"]);

// Products
export const productStatusEnum = pgEnum("product_status", [
  "DRAFT",
  "PENDING_REVIEW",
  "ACTIVE",
  "INACTIVE",
  "REJECTED",
  "ARCHIVED",
]);
export const priceTypeEnum = pgEnum("price_type", ["FIXED", "TIERED", "NEGOTIABLE", "CONTACT"]);
export const savedItemTypeEnum = pgEnum("saved_item_type", ["SUPPLIER", "PRODUCT", "RFQ"]);

// RFQ
export const rfqStatusEnum = pgEnum("rfq_status", ["DRAFT", "OPEN", "CLOSED", "AWARDED", "CANCELLED", "EXPIRED"]);
export const rfqVisibilityEnum = pgEnum("rfq_visibility", ["PUBLIC", "INVITED_ONLY"]);
export const rfqInvitationStatusEnum = pgEnum("rfq_invitation_status", ["PENDING", "VIEWED", "QUOTED", "DECLINED"]);
export const quotationStatusEnum = pgEnum("quotation_status", [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "REVISED",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
  "EXPIRED",
]);
export const incotermEnum = pgEnum("incoterm", [
  "EXW",
  "FCA",
  "FAS",
  "FOB",
  "CFR",
  "CIF",
  "CPT",
  "CIP",
  "DAP",
  "DPU",
  "DDP",
]);

// Messaging
export const conversationContextEnum = pgEnum("conversation_context", [
  "GENERAL",
  "PRODUCT",
  "RFQ",
  "QUOTATION",
  "ORDER",
  "DISPUTE",
]);
export const conversationStatusEnum = pgEnum("conversation_status", ["OPEN", "ARCHIVED", "BLOCKED"]);
export const messageTypeEnum = pgEnum("message_type", [
  "TEXT",
  "IMAGE",
  "FILE",
  "SPECIFICATION",
  "QUOTATION",
  "COUNTER_OFFER",
  "CONTRACT",
  "SYSTEM",
]);

// Payments
export const paymentStatusEnum = pgEnum("payment_status", [
  "CREATED",
  "PENDING",
  "AUTHORIZED",
  "PAID",
  "SETTLED",
  "FAILED",
  "REFUNDED",
  "DISPUTED",
  "CANCELLED",
]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "BANK_TRANSFER",
  "LOCAL_BANK_TRANSFER_VN",
  "CARD",
  "INTERNATIONAL_WIRE",
  "GATEWAY",
  "VIRTUAL_ACCOUNT",
  "ESCROW",
  "OTHER",
]);
export const paymentKindEnum = pgEnum("payment_kind", [
  "DEPOSIT",
  "BALANCE",
  "FULL",
  "MILESTONE",
  "SUBSCRIPTION",
  "SERVICE_FEE",
  "AD_SPEND",
  "VERIFICATION_FEE",
]);
export const escrowStatusEnum = pgEnum("escrow_status", [
  "NOT_APPLICABLE",
  "PENDING_FUNDING",
  "FUNDED",
  "HELD",
  "PARTIALLY_RELEASED",
  "RELEASED",
  "REFUNDED",
]);
export const paymentTxnTypeEnum = pgEnum("payment_txn_type", [
  "CHARGE",
  "AUTHORIZATION",
  "CAPTURE",
  "RELEASE",
  "REFUND",
  "PAYOUT",
  "FEE",
  "ADJUSTMENT",
]);
export const txnStatusEnum = pgEnum("txn_status", ["PENDING", "SUCCEEDED", "FAILED", "CANCELLED"]);
export const paymentProviderTypeEnum = pgEnum("payment_provider_type", [
  "BANK_TRANSFER",
  "GATEWAY",
  "ESCROW_PARTNER",
  "VIRTUAL_ACCOUNT",
  "CARD_ACQUIRER",
  "WIRE",
]);
export const invoiceTypeEnum = pgEnum("invoice_type", ["PROFORMA", "COMMERCIAL", "CREDIT_NOTE", "PLATFORM_FEE"]);
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "DRAFT",
  "ISSUED",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CANCELLED",
]);

// Documents
export const documentTypeEnum = pgEnum("document_type", [
  "QUOTATION",
  "PURCHASE_ORDER",
  "PROFORMA_INVOICE",
  "COMMERCIAL_INVOICE",
  "PACKING_LIST",
  "BILL_OF_LADING",
  "AIRWAY_BILL",
  "CERTIFICATE_OF_ORIGIN",
  "CERTIFICATE",
  "INSPECTION_REPORT",
  "CONTRACT",
  "BUSINESS_LICENSE",
  "TAX_CERTIFICATE",
  "EXPORT_LICENSE",
  "ID_DOCUMENT",
  "BANK_STATEMENT",
  "FINANCIAL_STATEMENT",
  "SPECIFICATION",
  "DRAWING",
  "PHOTO",
  "VIDEO",
  "OTHER",
]);
export const documentVisibilityEnum = pgEnum("document_visibility", [
  "PRIVATE",
  "COMPANY",
  "COUNTERPARTY",
  "ADMIN",
  "PUBLIC",
]);

// Disputes
export const disputeTypeEnum = pgEnum("dispute_type", [
  "QUALITY",
  "QUANTITY",
  "DELIVERY_DELAY",
  "NON_DELIVERY",
  "PAYMENT",
  "DAMAGE",
  "SPECIFICATION_MISMATCH",
  "OTHER",
]);
export const disputeStatusEnum = pgEnum("dispute_status", [
  "OPEN",
  "AWAITING_RESPONSE",
  "UNDER_REVIEW",
  "MEDIATION",
  "RESOLVED_REFUND",
  "RESOLVED_PARTIAL_REFUND",
  "RESOLVED_NO_ACTION",
  "REJECTED",
  "CLOSED",
]);

// Logistics
export const shipmentModeEnum = pgEnum("shipment_mode", [
  "SEA_FCL",
  "SEA_LCL",
  "AIR",
  "RAIL",
  "ROAD",
  "COURIER",
  "MULTIMODAL",
]);
export const shipmentStatusEnum = pgEnum("shipment_status", [
  "PENDING",
  "BOOKED",
  "PICKED_UP",
  "AT_WAREHOUSE",
  "AT_ORIGIN_PORT",
  "DEPARTED",
  "IN_TRANSIT",
  "AT_DESTINATION_PORT",
  "CUSTOMS_CLEARANCE",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "EXCEPTION",
  "CANCELLED",
  // Added with the logistics-partner portal (domestic parcel, truckload and export milestones, failures).
  "READY_TO_PICK",
  "PICKUP_FAILED",
  "VEHICLE_ASSIGNED",
  "EXPORT_CLEARED",
  "IMPORT_CLEARED",
  "DELIVERY_FAILED",
  "RETURNING",
  "RETURNED",
  "LOST",
  "DAMAGED",
]);
export const logisticsServiceEnum = pgEnum("logistics_service", [
  "FACTORY_PICKUP",
  "DOMESTIC_TRANSPORT",
  "WAREHOUSING",
  "FREIGHT_FORWARDING",
  "SEA_FREIGHT",
  "AIR_FREIGHT",
  "RAIL_FREIGHT",
  "CUSTOMS_BROKERAGE",
  "LAST_MILE",
  "CARGO_INSURANCE",
]);
export const logisticsRequestStatusEnum = pgEnum("logistics_request_status", [
  "DRAFT",
  "OPEN",
  "QUOTED",
  "BOOKED",
  "CANCELLED",
  "EXPIRED",
]);
export const logisticsQuoteStatusEnum = pgEnum("logistics_quote_status", [
  "SUBMITTED",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "WITHDRAWN",
]);

// Inspection
export const inspectionTypeEnum = pgEnum("inspection_type", [
  "FACTORY_AUDIT",
  "PRE_PRODUCTION",
  "DURING_PRODUCTION",
  "PRE_SHIPMENT",
  "CONTAINER_LOADING",
]);
export const inspectionStatusEnum = pgEnum("inspection_status", [
  "REQUESTED",
  "QUOTED",
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);
export const inspectionResultEnum = pgEnum("inspection_result", ["PENDING", "PASS", "FAIL", "CONDITIONAL"]);

// Financing
export const financingProductTypeEnum = pgEnum("financing_product_type", [
  "INVOICE_FINANCING",
  "PURCHASE_FINANCING",
  "BNPL",
  "IMPORT_FINANCING",
  "WORKING_CAPITAL",
  "PRODUCTION_FINANCING",
  "INVOICE_FACTORING",
  "RECEIVABLES_FINANCING",
  "PURCHASE_ORDER_FINANCING",
]);
export const financingSideEnum = pgEnum("financing_side", ["BUYER", "SELLER"]);
export const financingStatusEnum = pgEnum("financing_status", [
  "DRAFT",
  "SUBMITTED",
  "ROUTED",
  "UNDER_REVIEW",
  "OFFERED",
  "ACCEPTED",
  "DECLINED",
  "FUNDED",
  "REPAYING",
  "REPAID",
  "DEFAULTED",
  "CANCELLED",
  "WITHDRAWN",
]);
export const financingOfferStatusEnum = pgEnum("financing_offer_status", [
  "OFFERED",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "WITHDRAWN",
]);
export const financingProviderTypeEnum = pgEnum("financing_provider_type", [
  "BANK",
  "NON_BANK_LENDER",
  "FINTECH",
  "FACTORING_COMPANY",
  "EXPORT_CREDIT_AGENCY",
]);

// Reviews
export const reviewStatusEnum = pgEnum("review_status", ["PENDING", "PUBLISHED", "HIDDEN", "FLAGGED", "REMOVED"]);

// Monetization
export const planTierEnum = pgEnum("plan_tier", ["FREE", "PRO", "PREMIUM", "ENTERPRISE"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "CANCELLED",
  "EXPIRED",
]);
export const feeTypeEnum = pgEnum("fee_type", [
  "TRANSACTION_COMMISSION",
  "PAYMENT_ORCHESTRATION",
  "FINANCING_ORIGINATION",
  "LOGISTICS_COMMISSION",
  "INSPECTION_COMMISSION",
  "VERIFICATION_FEE",
  "ADVERTISING",
  "RFQ_PRIORITY",
  "API_ACCESS",
  "SUBSCRIPTION",
]);
export const feeCalcEnum = pgEnum("fee_calc", ["PERCENTAGE", "FIXED", "TIERED"]);
export const commissionStatusEnum = pgEnum("commission_status", [
  "PENDING",
  "INVOICED",
  "COLLECTED",
  "WAIVED",
  "REFUNDED",
]);

// Advertising
export const adPlacementEnum = pgEnum("ad_placement", [
  "FEATURED_PRODUCT",
  "FEATURED_SUPPLIER",
  "TOP_SEARCH",
  "CATEGORY_PROMOTION",
  "HOMEPAGE_PROMOTION",
  "RFQ_BOOST",
]);
export const adPricingModelEnum = pgEnum("ad_pricing_model", ["CPM", "CPC", "FLAT_DAILY", "FLAT_MONTHLY"]);
export const adCampaignStatusEnum = pgEnum("ad_campaign_status", [
  "DRAFT",
  "PENDING_REVIEW",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
]);
export const adEventTypeEnum = pgEnum("ad_event_type", ["IMPRESSION", "CLICK", "LEAD", "RFQ", "ORDER"]);

// System
export const notificationChannelEnum = pgEnum("notification_channel", ["IN_APP", "EMAIL", "SMS", "PUSH"]);
export const pageTypeEnum = pgEnum("page_type", ["PAGE", "GUIDE", "LEGAL", "BLOG", "HELP"]);
export const pageStatusEnum = pgEnum("page_status", ["DRAFT", "PUBLISHED", "ARCHIVED"]);
export const bannerPlacementEnum = pgEnum("banner_placement", [
  "HOMEPAGE_HERO",
  "HOMEPAGE_SECONDARY",
  "CATEGORY",
  "SEARCH",
  "RFQ",
  "SIDEBAR",
]);
export const auditActorTypeEnum = pgEnum("audit_actor_type", ["USER", "ADMIN", "SYSTEM", "API"]);
export const apiKeyStatusEnum = pgEnum("api_key_status", ["ACTIVE", "REVOKED", "EXPIRED"]);
export const analyticsEventTypeEnum = pgEnum("analytics_event_type", [
  "PAGE_VIEW",
  "PRODUCT_VIEW",
  "SUPPLIER_VIEW",
  "SEARCH",
  "RFQ_VIEW",
  "PRODUCT_INQUIRY",
  "SUPPLIER_CONTACT",
  "RFQ_POSTED",
  "QUOTATION_SUBMITTED",
  "ORDER_PLACED",
]);
