CREATE TYPE "public"."ad_campaign_status" AS ENUM('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'COMPLETED', 'REJECTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."ad_event_type" AS ENUM('IMPRESSION', 'CLICK', 'LEAD', 'RFQ', 'ORDER');--> statement-breakpoint
CREATE TYPE "public"."ad_placement" AS ENUM('FEATURED_PRODUCT', 'FEATURED_SUPPLIER', 'TOP_SEARCH', 'CATEGORY_PROMOTION', 'HOMEPAGE_PROMOTION', 'RFQ_BOOST');--> statement-breakpoint
CREATE TYPE "public"."ad_pricing_model" AS ENUM('CPM', 'CPC', 'FLAT_DAILY', 'FLAT_MONTHLY');--> statement-breakpoint
CREATE TYPE "public"."analytics_event_type" AS ENUM('PAGE_VIEW', 'PRODUCT_VIEW', 'SUPPLIER_VIEW', 'SEARCH', 'RFQ_VIEW', 'PRODUCT_INQUIRY', 'SUPPLIER_CONTACT', 'RFQ_POSTED', 'QUOTATION_SUBMITTED', 'ORDER_PLACED');--> statement-breakpoint
CREATE TYPE "public"."api_key_status" AS ENUM('ACTIVE', 'REVOKED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."audit_actor_type" AS ENUM('USER', 'ADMIN', 'SYSTEM', 'API');--> statement-breakpoint
CREATE TYPE "public"."auth_provider" AS ENUM('GOOGLE', 'PHONE');--> statement-breakpoint
CREATE TYPE "public"."badge_source" AS ENUM('RULE', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."banner_placement" AS ENUM('HOMEPAGE_HERO', 'HOMEPAGE_SECONDARY', 'CATEGORY', 'SEARCH', 'RFQ', 'SIDEBAR');--> statement-breakpoint
CREATE TYPE "public"."business_type" AS ENUM('MANUFACTURER', 'OEM_MANUFACTURER', 'ODM_MANUFACTURER', 'WHOLESALER', 'EXPORTER', 'DISTRIBUTOR', 'INDUSTRIAL_SUPPLIER', 'SERVICE_PROVIDER', 'TRADING_COMPANY', 'IMPORTER', 'RETAILER', 'BRAND_OWNER', 'LOGISTICS_PROVIDER', 'INSPECTION_AGENCY', 'FINANCIAL_INSTITUTION', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."commission_status" AS ENUM('PENDING', 'INVOICED', 'COLLECTED', 'WAIVED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."company_status" AS ENUM('PENDING', 'ACTIVE', 'SUSPENDED', 'BANNED');--> statement-breakpoint
CREATE TYPE "public"."compliance_check_type" AS ENUM('KYC', 'KYB', 'AML', 'SANCTIONS', 'PEP', 'UBO', 'ADVERSE_MEDIA', 'TRANSACTION_MONITORING');--> statement-breakpoint
CREATE TYPE "public"."compliance_status" AS ENUM('PENDING', 'CLEARED', 'FLAGGED', 'REJECTED', 'MANUAL_REVIEW');--> statement-breakpoint
CREATE TYPE "public"."conversation_context" AS ENUM('GENERAL', 'PRODUCT', 'RFQ', 'QUOTATION', 'ORDER', 'DISPUTE');--> statement-breakpoint
CREATE TYPE "public"."conversation_status" AS ENUM('OPEN', 'ARCHIVED', 'BLOCKED');--> statement-breakpoint
CREATE TYPE "public"."dispute_status" AS ENUM('OPEN', 'AWAITING_RESPONSE', 'UNDER_REVIEW', 'MEDIATION', 'RESOLVED_REFUND', 'RESOLVED_PARTIAL_REFUND', 'RESOLVED_NO_ACTION', 'REJECTED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."dispute_type" AS ENUM('QUALITY', 'QUANTITY', 'DELIVERY_DELAY', 'NON_DELIVERY', 'PAYMENT', 'DAMAGE', 'SPECIFICATION_MISMATCH', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('QUOTATION', 'PURCHASE_ORDER', 'PROFORMA_INVOICE', 'COMMERCIAL_INVOICE', 'PACKING_LIST', 'BILL_OF_LADING', 'AIRWAY_BILL', 'CERTIFICATE_OF_ORIGIN', 'CERTIFICATE', 'INSPECTION_REPORT', 'CONTRACT', 'BUSINESS_LICENSE', 'TAX_CERTIFICATE', 'EXPORT_LICENSE', 'ID_DOCUMENT', 'BANK_STATEMENT', 'FINANCIAL_STATEMENT', 'SPECIFICATION', 'DRAWING', 'PHOTO', 'VIDEO', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."document_visibility" AS ENUM('PRIVATE', 'COMPANY', 'COUNTERPARTY', 'ADMIN', 'PUBLIC');--> statement-breakpoint
CREATE TYPE "public"."employee_range" AS ENUM('R_1_10', 'R_11_50', 'R_51_200', 'R_201_500', 'R_501_1000', 'R_1001_5000', 'R_5000_PLUS');--> statement-breakpoint
CREATE TYPE "public"."escrow_status" AS ENUM('NOT_APPLICABLE', 'PENDING_FUNDING', 'FUNDED', 'HELD', 'PARTIALLY_RELEASED', 'RELEASED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."fee_calc" AS ENUM('PERCENTAGE', 'FIXED', 'TIERED');--> statement-breakpoint
CREATE TYPE "public"."fee_type" AS ENUM('TRANSACTION_COMMISSION', 'PAYMENT_ORCHESTRATION', 'FINANCING_ORIGINATION', 'LOGISTICS_COMMISSION', 'INSPECTION_COMMISSION', 'VERIFICATION_FEE', 'ADVERTISING', 'RFQ_PRIORITY', 'API_ACCESS', 'SUBSCRIPTION');--> statement-breakpoint
CREATE TYPE "public"."financing_offer_status" AS ENUM('OFFERED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN');--> statement-breakpoint
CREATE TYPE "public"."financing_product_type" AS ENUM('INVOICE_FINANCING', 'PURCHASE_FINANCING', 'BNPL', 'IMPORT_FINANCING', 'WORKING_CAPITAL', 'PRODUCTION_FINANCING', 'INVOICE_FACTORING', 'RECEIVABLES_FINANCING', 'PURCHASE_ORDER_FINANCING');--> statement-breakpoint
CREATE TYPE "public"."financing_provider_type" AS ENUM('BANK', 'NON_BANK_LENDER', 'FINTECH', 'FACTORING_COMPANY', 'EXPORT_CREDIT_AGENCY');--> statement-breakpoint
CREATE TYPE "public"."financing_side" AS ENUM('BUYER', 'SELLER');--> statement-breakpoint
CREATE TYPE "public"."financing_status" AS ENUM('DRAFT', 'SUBMITTED', 'ROUTED', 'UNDER_REVIEW', 'OFFERED', 'ACCEPTED', 'DECLINED', 'FUNDED', 'REPAYING', 'REPAID', 'DEFAULTED', 'CANCELLED', 'WITHDRAWN');--> statement-breakpoint
CREATE TYPE "public"."incoterm" AS ENUM('EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP');--> statement-breakpoint
CREATE TYPE "public"."inspection_result" AS ENUM('PENDING', 'PASS', 'FAIL', 'CONDITIONAL');--> statement-breakpoint
CREATE TYPE "public"."inspection_status" AS ENUM('REQUESTED', 'QUOTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."inspection_type" AS ENUM('FACTORY_AUDIT', 'PRE_PRODUCTION', 'DURING_PRODUCTION', 'PRE_SHIPMENT', 'CONTAINER_LOADING');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."invoice_type" AS ENUM('PROFORMA', 'COMMERCIAL', 'CREDIT_NOTE', 'PLATFORM_FEE');--> statement-breakpoint
CREATE TYPE "public"."logistics_quote_status" AS ENUM('SUBMITTED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN');--> statement-breakpoint
CREATE TYPE "public"."logistics_request_status" AS ENUM('DRAFT', 'OPEN', 'QUOTED', 'BOOKED', 'CANCELLED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."logistics_service" AS ENUM('FACTORY_PICKUP', 'DOMESTIC_TRANSPORT', 'WAREHOUSING', 'FREIGHT_FORWARDING', 'SEA_FREIGHT', 'AIR_FREIGHT', 'RAIL_FREIGHT', 'CUSTOMS_BROKERAGE', 'LAST_MILE', 'CARGO_INSURANCE');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('OWNER', 'ADMIN', 'MANAGER', 'SALES', 'PURCHASING', 'FINANCE', 'STAFF', 'VIEWER');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('TEXT', 'IMAGE', 'FILE', 'SPECIFICATION', 'QUOTATION', 'COUNTER_OFFER', 'CONTRACT', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('IN_APP', 'EMAIL', 'SMS', 'PUSH');--> statement-breakpoint
CREATE TYPE "public"."page_status" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."page_type" AS ENUM('PAGE', 'GUIDE', 'LEGAL', 'BLOG', 'HELP');--> statement-breakpoint
CREATE TYPE "public"."payment_kind" AS ENUM('DEPOSIT', 'BALANCE', 'FULL', 'MILESTONE', 'SUBSCRIPTION', 'SERVICE_FEE', 'AD_SPEND', 'VERIFICATION_FEE');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('BANK_TRANSFER', 'LOCAL_BANK_TRANSFER_VN', 'CARD', 'INTERNATIONAL_WIRE', 'GATEWAY', 'VIRTUAL_ACCOUNT', 'ESCROW', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."payment_provider_type" AS ENUM('BANK_TRANSFER', 'GATEWAY', 'ESCROW_PARTNER', 'VIRTUAL_ACCOUNT', 'CARD_ACQUIRER', 'WIRE');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('CREATED', 'PENDING', 'AUTHORIZED', 'PAID', 'SETTLED', 'FAILED', 'REFUNDED', 'DISPUTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."payment_txn_type" AS ENUM('CHARGE', 'AUTHORIZATION', 'CAPTURE', 'RELEASE', 'REFUND', 'PAYOUT', 'FEE', 'ADJUSTMENT');--> statement-breakpoint
CREATE TYPE "public"."plan_tier" AS ENUM('FREE', 'PRO', 'PREMIUM', 'ENTERPRISE');--> statement-breakpoint
CREATE TYPE "public"."platform_role" AS ENUM('USER', 'SUPPORT', 'MODERATOR', 'FINANCE', 'COMPLIANCE', 'ADMIN', 'SUPER_ADMIN');--> statement-breakpoint
CREATE TYPE "public"."price_type" AS ENUM('FIXED', 'TIERED', 'NEGOTIABLE', 'CONTACT');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'INACTIVE', 'REJECTED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."quotation_status" AS ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REVISED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('PENDING', 'PUBLISHED', 'HIDDEN', 'FLAGGED', 'REMOVED');--> statement-breakpoint
CREATE TYPE "public"."rfq_invitation_status" AS ENUM('PENDING', 'VIEWED', 'QUOTED', 'DECLINED');--> statement-breakpoint
CREATE TYPE "public"."rfq_status" AS ENUM('DRAFT', 'OPEN', 'CLOSED', 'AWARDED', 'CANCELLED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."rfq_visibility" AS ENUM('PUBLIC', 'INVITED_ONLY');--> statement-breakpoint
CREATE TYPE "public"."risk_flag_status" AS ENUM('OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED');--> statement-breakpoint
CREATE TYPE "public"."risk_severity" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."sanctions_status" AS ENUM('NOT_SCREENED', 'CLEAR', 'POTENTIAL_MATCH', 'MATCH');--> statement-breakpoint
CREATE TYPE "public"."saved_item_type" AS ENUM('SUPPLIER', 'PRODUCT', 'RFQ');--> statement-breakpoint
CREATE TYPE "public"."shipment_mode" AS ENUM('SEA_FCL', 'SEA_LCL', 'AIR', 'RAIL', 'ROAD', 'COURIER', 'MULTIMODAL');--> statement-breakpoint
CREATE TYPE "public"."shipment_status" AS ENUM('PENDING', 'BOOKED', 'PICKED_UP', 'AT_WAREHOUSE', 'AT_ORIGIN_PORT', 'DEPARTED', 'IN_TRANSIT', 'AT_DESTINATION_PORT', 'CUSTOMS_CLEARANCE', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."token_purpose" AS ENUM('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'PHONE_OTP', 'MAGIC_LINK', 'TWO_FACTOR');--> statement-breakpoint
CREATE TYPE "public"."txn_status" AS ENUM('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('UNVERIFIED', 'PENDING', 'IN_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."verification_type" AS ENUM('KYB', 'BUSINESS_LICENSE', 'TAX_REGISTRATION', 'FACTORY_AUDIT', 'EXPORT_LICENSE', 'BANK_ACCOUNT', 'UBO', 'IDENTITY');--> statement-breakpoint
CREATE TABLE "auth_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" "auth_provider" NOT NULL,
	"provider_account_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" text NOT NULL,
	"active_company_id" text,
	"ip_address" text,
	"user_agent" text,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"email_verified_at" timestamp with time zone,
	"password_hash" text,
	"name" text NOT NULL,
	"phone" text,
	"phone_verified_at" timestamp with time zone,
	"avatar_url" text,
	"locale" text DEFAULT 'en' NOT NULL,
	"timezone" text DEFAULT 'Asia/Ho_Chi_Minh' NOT NULL,
	"platform_role" "platform_role" DEFAULT 'USER' NOT NULL,
	"status" "user_status" DEFAULT 'ACTIVE' NOT NULL,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"two_factor_secret" text,
	"last_login_at" timestamp with time zone,
	"last_login_ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"identifier" text NOT NULL,
	"token_hash" text NOT NULL,
	"purpose" "token_purpose" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certifications" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"issuing_body" text,
	"icon_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_vi" text NOT NULL,
	"region" text,
	"dial_code" text,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	"decimals" integer DEFAULT 2 NOT NULL,
	"rate_to_usd" numeric(18, 8) DEFAULT 1 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "industries" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"name_vi" text NOT NULL,
	"description" text,
	"description_vi" text,
	"icon" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"parent_id" text,
	"industry_id" text,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"name_vi" text NOT NULL,
	"description" text,
	"description_vi" text,
	"icon" text,
	"image_url" text,
	"level" integer DEFAULT 0 NOT NULL,
	"path" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"product_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provinces" (
	"id" text PRIMARY KEY NOT NULL,
	"country_code" text DEFAULT 'VN' NOT NULL,
	"code" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"name_vi" text NOT NULL,
	"region" text,
	"is_industrial_cluster" boolean DEFAULT false NOT NULL,
	"cluster_headline" text,
	"cluster_headline_vi" text,
	"cluster_description" text,
	"cluster_description_vi" text,
	"hero_image_url" text,
	"major_industries" text[] DEFAULT '{}'::text[] NOT NULL,
	"key_facts" jsonb,
	"seo_title" text,
	"seo_description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_company_id" text,
	"uploaded_by_id" text,
	"type" "document_type" DEFAULT 'OTHER' NOT NULL,
	"name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage_key" text NOT NULL,
	"url" text NOT NULL,
	"checksum" text,
	"visibility" "document_visibility" DEFAULT 'COMPANY' NOT NULL,
	"order_id" text,
	"rfq_id" text,
	"quotation_id" text,
	"message_id" text,
	"verification_id" text,
	"dispute_id" text,
	"shipment_id" text,
	"financing_application_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"name_vi" text NOT NULL,
	"description" text,
	"description_vi" text,
	"icon" text,
	"color" text,
	"rule_config" jsonb,
	"is_automatic" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buyer_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"sourcing_categories" text[] DEFAULT '{}'::text[] NOT NULL,
	"annual_purchasing_volume_usd" numeric(18, 2),
	"preferred_currency" text DEFAULT 'USD' NOT NULL,
	"destination_countries" text[] DEFAULT '{}'::text[] NOT NULL,
	"preferred_incoterms" "incoterm"[] DEFAULT '{}'::incoterm[] NOT NULL,
	"company_size_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "buyer_profiles_companyId_unique" UNIQUE("company_id")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"name_vi" text,
	"legal_name" text,
	"business_type" "business_type" DEFAULT 'MANUFACTURER' NOT NULL,
	"is_seller" boolean DEFAULT false NOT NULL,
	"is_buyer" boolean DEFAULT false NOT NULL,
	"status" "company_status" DEFAULT 'PENDING' NOT NULL,
	"country_code" text DEFAULT 'VN' NOT NULL,
	"province_id" text,
	"city" text,
	"address" text,
	"postal_code" text,
	"tax_id" text,
	"registration_number" text,
	"website" text,
	"email" text,
	"phone" text,
	"logo_url" text,
	"cover_url" text,
	"tagline" text,
	"tagline_vi" text,
	"description" text,
	"description_vi" text,
	"year_established" integer,
	"employee_range" "employee_range",
	"annual_revenue_usd" numeric(18, 2),
	"languages" text[] DEFAULT '{}'::text[] NOT NULL,
	"verification_status" "verification_status" DEFAULT 'UNVERIFIED' NOT NULL,
	"verified_at" timestamp with time zone,
	"kyb_status" "verification_status" DEFAULT 'UNVERIFIED' NOT NULL,
	"sanctions_status" "sanctions_status" DEFAULT 'NOT_SCREENED' NOT NULL,
	"response_rate" numeric(12, 4),
	"avg_response_hours" numeric(12, 4),
	"rating_avg" numeric(3, 2) DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"transaction_count" integer DEFAULT 0 NOT NULL,
	"transaction_volume_usd" numeric(18, 2) DEFAULT 0 NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"featured_until" timestamp with time zone,
	"search_boost" integer DEFAULT 0 NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('simple', coalesce("companies"."name", '')), 'A') || setweight(to_tsvector('simple', coalesce("companies"."name_vi", '')), 'A') || setweight(to_tsvector('simple', coalesce("companies"."tagline", '')), 'B') || setweight(to_tsvector('simple', coalesce("companies"."description", '')), 'C') || setweight(to_tsvector('simple', coalesce("companies"."description_vi", '')), 'C') || setweight(to_tsvector('simple', coalesce("companies"."city", '')), 'B')) STORED
);
--> statement-breakpoint
CREATE TABLE "company_badges" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"badge_id" text NOT NULL,
	"source" "badge_source" DEFAULT 'RULE' NOT NULL,
	"granted_by_id" text,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "company_certifications" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"certification_id" text NOT NULL,
	"certificate_number" text,
	"issued_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"document_id" text,
	"status" "verification_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_industries" (
	"company_id" text NOT NULL,
	"industry_id" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "company_industries_company_id_industry_id_pk" PRIMARY KEY("company_id","industry_id")
);
--> statement-breakpoint
CREATE TABLE "company_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"email" text NOT NULL,
	"role" "member_role" DEFAULT 'STAFF' NOT NULL,
	"token_hash" text NOT NULL,
	"status" "invitation_status" DEFAULT 'PENDING' NOT NULL,
	"invited_by_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_media" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"kind" text DEFAULT 'PHOTO' NOT NULL,
	"url" text NOT NULL,
	"thumbnail_url" text,
	"caption" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_members" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "member_role" DEFAULT 'STAFF' NOT NULL,
	"title" text,
	"status" "member_status" DEFAULT 'ACTIVE' NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"invited_by_id" text,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manufacturer_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"factory_address" text,
	"factory_size_sqm" integer,
	"production_lines" integer,
	"annual_capacity" text,
	"annual_capacity_value" numeric(18, 2),
	"annual_capacity_unit" text,
	"oem_capable" boolean DEFAULT false NOT NULL,
	"odm_capable" boolean DEFAULT false NOT NULL,
	"private_label_capable" boolean DEFAULT false NOT NULL,
	"min_order_value_usd" numeric(18, 2),
	"avg_lead_time_days" integer,
	"sample_lead_time_days" integer,
	"export_countries" text[] DEFAULT '{}'::text[] NOT NULL,
	"main_markets" text[] DEFAULT '{}'::text[] NOT NULL,
	"export_percentage" integer,
	"export_experience_years" integer,
	"rd_staff_count" integer,
	"qc_staff_count" integer,
	"main_equipment" text,
	"main_materials" text,
	"payment_terms_accepted" text[] DEFAULT '{}'::text[] NOT NULL,
	"accepted_incoterms" "incoterm"[] DEFAULT '{}'::incoterm[] NOT NULL,
	"video_urls" text[] DEFAULT '{}'::text[] NOT NULL,
	"factory_tour_available" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "manufacturer_profiles_companyId_unique" UNIQUE("company_id")
);
--> statement-breakpoint
CREATE TABLE "beneficial_owners" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"full_name" text NOT NULL,
	"nationality" text,
	"date_of_birth" timestamp with time zone,
	"ownership_percent" numeric(5, 2),
	"role" text,
	"is_pep" boolean DEFAULT false NOT NULL,
	"sanctions_status" "sanctions_status" DEFAULT 'NOT_SCREENED' NOT NULL,
	"id_document_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_checks" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text,
	"user_id" text,
	"type" "compliance_check_type" NOT NULL,
	"provider" text,
	"status" "compliance_status" DEFAULT 'PENDING' NOT NULL,
	"result" jsonb,
	"risk_score" integer,
	"notes" text,
	"checked_at" timestamp with time zone,
	"reviewed_by_id" text,
	"next_review_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_flags" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"rule_code" text NOT NULL,
	"severity" "risk_severity" DEFAULT 'MEDIUM' NOT NULL,
	"status" "risk_flag_status" DEFAULT 'OPEN' NOT NULL,
	"description" text NOT NULL,
	"data" jsonb,
	"resolved_by_id" text,
	"resolved_at" timestamp with time zone,
	"resolution" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"type" "verification_type" NOT NULL,
	"status" "verification_status" DEFAULT 'PENDING' NOT NULL,
	"data" jsonb,
	"notes" text,
	"rejection_reason" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by_id" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_certifications" (
	"product_id" text NOT NULL,
	"certification_id" text NOT NULL,
	CONSTRAINT "product_certifications_product_id_certification_id_pk" PRIMARY KEY("product_id","certification_id")
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"url" text NOT NULL,
	"alt" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"width" integer,
	"height" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_price_tiers" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"min_qty" integer NOT NULL,
	"max_qty" integer,
	"price" numeric(18, 4) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_specifications" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"value" text NOT NULL,
	"unit" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"sku" text,
	"name" text NOT NULL,
	"attributes" jsonb NOT NULL,
	"price" numeric(18, 4),
	"moq" integer,
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"category_id" text NOT NULL,
	"slug" text NOT NULL,
	"sku" text,
	"title" text NOT NULL,
	"title_vi" text,
	"short_description" text,
	"description" text,
	"description_vi" text,
	"status" "product_status" DEFAULT 'DRAFT' NOT NULL,
	"rejection_reason" text,
	"reviewed_by_id" text,
	"price_type" "price_type" DEFAULT 'TIERED' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"base_price" numeric(18, 4),
	"moq" integer DEFAULT 1 NOT NULL,
	"unit" text DEFAULT 'pieces' NOT NULL,
	"has_sample" boolean DEFAULT false NOT NULL,
	"sample_price" numeric(18, 4),
	"sample_lead_days" integer,
	"lead_time_days" integer,
	"lead_time_note" text,
	"customizable" boolean DEFAULT false NOT NULL,
	"oem_available" boolean DEFAULT false NOT NULL,
	"odm_available" boolean DEFAULT false NOT NULL,
	"packaging_details" text,
	"shipping_info" text,
	"hs_code" text,
	"origin_country" text DEFAULT 'VN' NOT NULL,
	"brand" text,
	"model" text,
	"video_url" text,
	"keywords" text[] DEFAULT '{}'::text[] NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"inquiry_count" integer DEFAULT 0 NOT NULL,
	"rfq_count" integer DEFAULT 0 NOT NULL,
	"order_count" integer DEFAULT 0 NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"featured_until" timestamp with time zone,
	"search_boost" integer DEFAULT 0 NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('simple', coalesce("products"."title", '')), 'A') || setweight(to_tsvector('simple', coalesce("products"."title_vi", '')), 'A') || setweight(to_tsvector('simple', immutable_array_to_string("products"."keywords", ' ')), 'B') || setweight(to_tsvector('simple', coalesce("products"."short_description", '')), 'B') || setweight(to_tsvector('simple', coalesce("products"."description", '')), 'C') || setweight(to_tsvector('simple', coalesce("products"."description_vi", '')), 'C') || setweight(to_tsvector('simple', coalesce("products"."brand", '')), 'B')) STORED
);
--> statement-breakpoint
CREATE TABLE "saved_items" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "saved_item_type" NOT NULL,
	"product_id" text,
	"supplier_company_id" text,
	"rfq_id" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotation_items" (
	"id" text PRIMARY KEY NOT NULL,
	"quotation_id" text NOT NULL,
	"rfq_item_id" text,
	"description" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit" text DEFAULT 'pieces' NOT NULL,
	"unit_price" numeric(18, 4) NOT NULL,
	"total" numeric(18, 4) NOT NULL,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotations" (
	"id" text PRIMARY KEY NOT NULL,
	"quotation_number" text NOT NULL,
	"rfq_id" text NOT NULL,
	"supplier_company_id" text NOT NULL,
	"created_by_id" text NOT NULL,
	"status" "quotation_status" DEFAULT 'DRAFT' NOT NULL,
	"revision_number" integer DEFAULT 1 NOT NULL,
	"parent_quotation_id" text,
	"currency" text DEFAULT 'USD' NOT NULL,
	"subtotal" numeric(18, 4) NOT NULL,
	"shipping_cost" numeric(18, 4) DEFAULT 0 NOT NULL,
	"discount" numeric(18, 4) DEFAULT 0 NOT NULL,
	"total" numeric(18, 4) NOT NULL,
	"moq" integer,
	"lead_time_days" integer,
	"production_time_note" text,
	"incoterm" "incoterm",
	"shipping_method" text,
	"payment_terms" text,
	"valid_until" timestamp with time zone,
	"notes" text,
	"sample_available" boolean DEFAULT false NOT NULL,
	"sample_price" numeric(18, 4),
	"buyer_notes" text,
	"submitted_at" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rfq_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"rfq_id" text NOT NULL,
	"supplier_company_id" text NOT NULL,
	"status" "rfq_invitation_status" DEFAULT 'PENDING' NOT NULL,
	"notified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"viewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rfq_items" (
	"id" text PRIMARY KEY NOT NULL,
	"rfq_id" text NOT NULL,
	"product_name" text NOT NULL,
	"specifications" text,
	"quantity" integer NOT NULL,
	"unit" text DEFAULT 'pieces' NOT NULL,
	"target_price" numeric(18, 4),
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfqs" (
	"id" text PRIMARY KEY NOT NULL,
	"rfq_number" text NOT NULL,
	"buyer_company_id" text NOT NULL,
	"created_by_id" text NOT NULL,
	"category_id" text,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit" text DEFAULT 'pieces' NOT NULL,
	"target_price" numeric(18, 4),
	"target_currency" text DEFAULT 'USD' NOT NULL,
	"destination_country_code" text,
	"destination_city" text,
	"incoterm" "incoterm",
	"preferred_payment_terms" text,
	"quote_deadline" timestamp with time zone,
	"required_delivery_date" timestamp with time zone,
	"certification_requirements" text,
	"customization_requirements" text,
	"packaging_requirements" text,
	"sample_required" boolean DEFAULT false NOT NULL,
	"status" "rfq_status" DEFAULT 'DRAFT' NOT NULL,
	"visibility" "rfq_visibility" DEFAULT 'PUBLIC' NOT NULL,
	"is_priority" boolean DEFAULT false NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"quotation_count" integer DEFAULT 0 NOT NULL,
	"awarded_quotation_id" text,
	"published_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "conversation_participants" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"user_id" text NOT NULL,
	"company_id" text,
	"last_read_at" timestamp with time zone,
	"is_muted" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"subject" text,
	"context" "conversation_context" DEFAULT 'GENERAL' NOT NULL,
	"status" "conversation_status" DEFAULT 'OPEN' NOT NULL,
	"buyer_company_id" text,
	"supplier_company_id" text,
	"product_id" text,
	"rfq_id" text,
	"quotation_id" text,
	"order_id" text,
	"last_message_at" timestamp with time zone,
	"last_message_preview" text,
	"message_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"sender_id" text,
	"type" "message_type" DEFAULT 'TEXT' NOT NULL,
	"body" text,
	"body_lang" text,
	"translations" jsonb,
	"payload" jsonb,
	"edited_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_number" text NOT NULL,
	"order_id" text,
	"type" "invoice_type" DEFAULT 'COMMERCIAL' NOT NULL,
	"issuer_company_id" text,
	"recipient_company_id" text,
	"status" "invoice_status" DEFAULT 'DRAFT' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"subtotal" numeric(18, 4) NOT NULL,
	"tax_amount" numeric(18, 4) DEFAULT 0 NOT NULL,
	"total" numeric(18, 4) NOT NULL,
	"amount_paid" numeric(18, 4) DEFAULT 0 NOT NULL,
	"line_items" jsonb,
	"notes" text,
	"document_id" text,
	"issued_at" timestamp with time zone,
	"due_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"type" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"title" text NOT NULL,
	"description" text,
	"data" jsonb,
	"actor_id" text,
	"is_visible_to_buyer" boolean DEFAULT true NOT NULL,
	"is_visible_to_supplier" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"product_id" text,
	"variant_id" text,
	"description" text NOT NULL,
	"specifications" jsonb,
	"quantity" integer NOT NULL,
	"unit" text DEFAULT 'pieces' NOT NULL,
	"unit_price" numeric(18, 4) NOT NULL,
	"total" numeric(18, 4) NOT NULL,
	"hs_code" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_statuses" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_vi" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"color" text DEFAULT 'gray' NOT NULL,
	"is_terminal" boolean DEFAULT false NOT NULL,
	"is_cancellable" boolean DEFAULT true NOT NULL,
	"allowed_transitions" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"order_number" text NOT NULL,
	"buyer_company_id" text NOT NULL,
	"supplier_company_id" text NOT NULL,
	"rfq_id" text,
	"quotation_id" text,
	"status_code" text DEFAULT 'PURCHASE_ORDER' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"subtotal" numeric(18, 4) NOT NULL,
	"shipping_cost" numeric(18, 4) DEFAULT 0 NOT NULL,
	"tax_amount" numeric(18, 4) DEFAULT 0 NOT NULL,
	"discount" numeric(18, 4) DEFAULT 0 NOT NULL,
	"total" numeric(18, 4) NOT NULL,
	"platform_fee" numeric(18, 4) DEFAULT 0 NOT NULL,
	"incoterm" "incoterm",
	"payment_terms" text,
	"deposit_percent" integer,
	"trade_assurance_enabled" boolean DEFAULT false NOT NULL,
	"trade_assurance_terms" jsonb,
	"expected_production_days" integer,
	"expected_ship_date" timestamp with time zone,
	"expected_delivery_date" timestamp with time zone,
	"shipping_address" jsonb,
	"billing_address" jsonb,
	"buyer_notes" text,
	"supplier_notes" text,
	"internal_notes" text,
	"placed_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"shipped_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "dispute_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"dispute_id" text NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disputes" (
	"id" text PRIMARY KEY NOT NULL,
	"dispute_number" text NOT NULL,
	"order_id" text NOT NULL,
	"raised_by_company_id" text NOT NULL,
	"respondent_company_id" text NOT NULL,
	"type" "dispute_type" NOT NULL,
	"status" "dispute_status" DEFAULT 'OPEN' NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"claimed_amount" numeric(18, 4),
	"currency" text DEFAULT 'USD' NOT NULL,
	"resolution" text,
	"resolution_amount" numeric(18, 4),
	"resolved_by_id" text,
	"respond_by" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_providers" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" "payment_provider_type" NOT NULL,
	"description" text,
	"adapter_code" text DEFAULT 'manual_bank_transfer' NOT NULL,
	"supported_methods" "payment_method"[] DEFAULT '{}'::payment_method[] NOT NULL,
	"supported_currencies" text[] DEFAULT '{}'::text[] NOT NULL,
	"supported_countries" text[] DEFAULT '{}'::text[] NOT NULL,
	"supports_escrow" boolean DEFAULT false NOT NULL,
	"license_info" text,
	"public_config" jsonb,
	"fee_config" jsonb,
	"is_active" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"payment_id" text NOT NULL,
	"provider_id" text,
	"type" "payment_txn_type" NOT NULL,
	"status" "txn_status" DEFAULT 'PENDING' NOT NULL,
	"currency" text NOT NULL,
	"amount" numeric(18, 4) NOT NULL,
	"provider_txn_id" text,
	"raw_response" jsonb,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"payment_number" text NOT NULL,
	"order_id" text,
	"invoice_id" text,
	"payer_company_id" text,
	"payee_company_id" text,
	"provider_id" text,
	"provider_reference" text,
	"kind" "payment_kind" DEFAULT 'FULL' NOT NULL,
	"method" "payment_method" DEFAULT 'BANK_TRANSFER' NOT NULL,
	"status" "payment_status" DEFAULT 'CREATED' NOT NULL,
	"escrow_status" "escrow_status" DEFAULT 'NOT_APPLICABLE' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"amount" numeric(18, 4) NOT NULL,
	"fee_amount" numeric(18, 4) DEFAULT 0 NOT NULL,
	"net_amount" numeric(18, 4),
	"milestone_label" text,
	"instructions" jsonb,
	"due_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"settled_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"failure_reason" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "logistics_providers" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"logo_url" text,
	"services" "logistics_service"[] DEFAULT '{}'::logistics_service[] NOT NULL,
	"modes" "shipment_mode"[] DEFAULT '{}'::shipment_mode[] NOT NULL,
	"countries" text[] DEFAULT '{}'::text[] NOT NULL,
	"adapter_code" text DEFAULT 'manual' NOT NULL,
	"api_config" jsonb,
	"rating_avg" numeric(3, 2) DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "logistics_providers_companyId_unique" UNIQUE("company_id")
);
--> statement-breakpoint
CREATE TABLE "logistics_quotes" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"status" "logistics_quote_status" DEFAULT 'SUBMITTED' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"amount" numeric(18, 4) NOT NULL,
	"breakdown" jsonb,
	"mode" "shipment_mode" NOT NULL,
	"transit_days" integer,
	"valid_until" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "logistics_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"request_number" text NOT NULL,
	"requester_company_id" text NOT NULL,
	"order_id" text,
	"status" "logistics_request_status" DEFAULT 'OPEN' NOT NULL,
	"services" "logistics_service"[] DEFAULT '{}'::logistics_service[] NOT NULL,
	"preferred_mode" "shipment_mode",
	"origin_address" jsonb NOT NULL,
	"destination_address" jsonb NOT NULL,
	"origin_country_code" text DEFAULT 'VN' NOT NULL,
	"destination_country_code" text NOT NULL,
	"incoterm" "incoterm",
	"cargo_description" text,
	"hs_code" text,
	"packages" integer,
	"gross_weight_kg" numeric(12, 2),
	"volume_cbm" numeric(12, 3),
	"container_type" text,
	"cargo_value" numeric(18, 2),
	"currency" text DEFAULT 'USD' NOT NULL,
	"insurance_required" boolean DEFAULT false NOT NULL,
	"ready_date" timestamp with time zone,
	"required_delivery_date" timestamp with time zone,
	"notes" text,
	"quote_deadline" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipment_events" (
	"id" text PRIMARY KEY NOT NULL,
	"shipment_id" text NOT NULL,
	"milestone" text NOT NULL,
	"status" "shipment_status" NOT NULL,
	"location" text,
	"description" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" text PRIMARY KEY NOT NULL,
	"shipment_number" text NOT NULL,
	"order_id" text NOT NULL,
	"provider_id" text,
	"logistics_quote_id" text,
	"status" "shipment_status" DEFAULT 'PENDING' NOT NULL,
	"mode" "shipment_mode" DEFAULT 'SEA_FCL' NOT NULL,
	"carrier" text,
	"tracking_number" text,
	"container_number" text,
	"vessel_or_flight" text,
	"incoterm" "incoterm",
	"origin_address" jsonb,
	"origin_port" text,
	"destination_port" text,
	"destination_address" jsonb,
	"packages" integer,
	"gross_weight_kg" numeric(12, 2),
	"volume_cbm" numeric(12, 3),
	"etd" timestamp with time zone,
	"eta" timestamp with time zone,
	"actual_departure" timestamp with time zone,
	"actual_arrival" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"insured" boolean DEFAULT false NOT NULL,
	"insurance_value" numeric(18, 2),
	"cost" numeric(18, 4),
	"currency" text DEFAULT 'USD' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspection_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"inspection_number" text NOT NULL,
	"order_id" text,
	"requester_company_id" text NOT NULL,
	"provider_id" text,
	"type" "inspection_type" NOT NULL,
	"status" "inspection_status" DEFAULT 'REQUESTED' NOT NULL,
	"result" "inspection_result" DEFAULT 'PENDING' NOT NULL,
	"factory_address" text,
	"requested_date" timestamp with time zone,
	"scheduled_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"checklist" jsonb,
	"findings" text,
	"fee" numeric(18, 4),
	"currency" text DEFAULT 'USD' NOT NULL,
	"report_document_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspection_providers" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"logo_url" text,
	"services" "inspection_type"[] DEFAULT '{}'::inspection_type[] NOT NULL,
	"countries" text[] DEFAULT '{}'::text[] NOT NULL,
	"adapter_code" text DEFAULT 'manual' NOT NULL,
	"api_config" jsonb,
	"rating_avg" numeric(3, 2) DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inspection_providers_companyId_unique" UNIQUE("company_id")
);
--> statement-breakpoint
CREATE TABLE "credit_scores" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"score" integer NOT NULL,
	"grade" text NOT NULL,
	"version" text NOT NULL,
	"features" jsonb NOT NULL,
	"breakdown" jsonb,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_scoring_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"feature" text NOT NULL,
	"weight" numeric(12, 4) DEFAULT 1 NOT NULL,
	"config" jsonb,
	"version" text DEFAULT 'v1' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financing_applications" (
	"id" text PRIMARY KEY NOT NULL,
	"application_number" text NOT NULL,
	"company_id" text NOT NULL,
	"order_id" text,
	"side" "financing_side" NOT NULL,
	"product_type" "financing_product_type" NOT NULL,
	"status" "financing_status" DEFAULT 'DRAFT' NOT NULL,
	"provider_id" text,
	"amount" numeric(18, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"purpose" text,
	"requested_tenor_days" integer,
	"financial_data" jsonb,
	"risk_score" integer,
	"risk_grade" text,
	"risk_score_version" text,
	"risk_factors" jsonb,
	"accepted_offer_id" text,
	"submitted_at" timestamp with time zone,
	"routed_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"funded_at" timestamp with time zone,
	"repaid_at" timestamp with time zone,
	"decline_reason" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financing_offers" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"status" "financing_offer_status" DEFAULT 'OFFERED' NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"interest_rate" numeric(12, 4),
	"fee_percent" numeric(12, 4),
	"fee_amount" numeric(18, 2),
	"tenor_days" integer NOT NULL,
	"repayment_schedule" jsonb,
	"terms" text,
	"valid_until" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financing_providers" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" "financing_provider_type" NOT NULL,
	"description" text,
	"logo_url" text,
	"license_number" text,
	"regulator" text,
	"products" "financing_product_type"[] DEFAULT '{}'::financing_product_type[] NOT NULL,
	"countries" text[] DEFAULT '{}'::text[] NOT NULL,
	"currencies" text[] DEFAULT '{}'::text[] NOT NULL,
	"min_amount" numeric(18, 2),
	"max_amount" numeric(18, 2),
	"min_tenor_days" integer,
	"max_tenor_days" integer,
	"indicative_rate" text,
	"adapter_code" text DEFAULT 'manual' NOT NULL,
	"api_config" jsonb,
	"routing_rules" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text,
	"product_id" text,
	"author_company_id" text NOT NULL,
	"author_user_id" text NOT NULL,
	"target_company_id" text NOT NULL,
	"rating_quality" integer NOT NULL,
	"rating_communication" integer NOT NULL,
	"rating_delivery" integer NOT NULL,
	"rating_accuracy" integer NOT NULL,
	"rating_service" integer NOT NULL,
	"rating_overall" numeric(3, 2) NOT NULL,
	"title" text,
	"body" text,
	"is_verified_purchase" boolean DEFAULT false NOT NULL,
	"status" "review_status" DEFAULT 'PENDING' NOT NULL,
	"fraud_score" integer DEFAULT 0 NOT NULL,
	"fraud_signals" jsonb,
	"moderated_by_id" text,
	"moderation_note" text,
	"reply" text,
	"replied_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "commissions" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"order_id" text,
	"payment_id" text,
	"fee_rule_id" text,
	"type" "fee_type" NOT NULL,
	"status" "commission_status" DEFAULT 'PENDING' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"base_amount" numeric(18, 4) NOT NULL,
	"rate" numeric(12, 4),
	"amount" numeric(18, 4) NOT NULL,
	"note" text,
	"collected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" "fee_type" NOT NULL,
	"calc" "fee_calc" DEFAULT 'PERCENTAGE' NOT NULL,
	"value" numeric(12, 4) DEFAULT 0 NOT NULL,
	"tiers" jsonb,
	"currency" text DEFAULT 'USD' NOT NULL,
	"min_fee" numeric(18, 4),
	"max_fee" numeric(18, 4),
	"plan_id" text,
	"category_slug" text,
	"country_code" text,
	"paid_by" text DEFAULT 'SELLER' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_to" timestamp with time zone,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"tier" "plan_tier" NOT NULL,
	"name" text NOT NULL,
	"name_vi" text NOT NULL,
	"description" text,
	"price_monthly" numeric(18, 2) DEFAULT 0 NOT NULL,
	"price_yearly" numeric(18, 2) DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"features" jsonb NOT NULL,
	"limits" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"status" "subscription_status" DEFAULT 'ACTIVE' NOT NULL,
	"billing_cycle" text DEFAULT 'monthly' NOT NULL,
	"current_period_start" timestamp with time zone NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"trial_ends_at" timestamp with time zone,
	"payment_provider_id" text,
	"external_id" text,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"ad_product_id" text NOT NULL,
	"name" text NOT NULL,
	"status" "ad_campaign_status" DEFAULT 'DRAFT' NOT NULL,
	"budget" numeric(18, 2) NOT NULL,
	"spent" numeric(18, 2) DEFAULT 0 NOT NULL,
	"daily_budget" numeric(18, 2),
	"currency" text DEFAULT 'USD' NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone,
	"targeting" jsonb,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_events" (
	"id" text PRIMARY KEY NOT NULL,
	"advertisement_id" text NOT NULL,
	"type" "ad_event_type" NOT NULL,
	"user_id" text,
	"session_id" text,
	"cost" numeric(18, 6) DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_products" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"placement" "ad_placement" NOT NULL,
	"name" text NOT NULL,
	"name_vi" text NOT NULL,
	"description" text,
	"pricing_model" "ad_pricing_model" DEFAULT 'FLAT_DAILY' NOT NULL,
	"price" numeric(18, 4) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"min_budget" numeric(18, 2),
	"max_slots" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "advertisements" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"placement" "ad_placement" NOT NULL,
	"product_id" text,
	"supplier_company_id" text,
	"category_id" text,
	"keyword" text,
	"creative" jsonb,
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"leads" integer DEFAULT 0 NOT NULL,
	"rfqs" integer DEFAULT 0 NOT NULL,
	"orders" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "analytics_event_type" NOT NULL,
	"user_id" text,
	"company_id" text,
	"product_id" text,
	"session_id" text,
	"path" text,
	"referrer" text,
	"country_code" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"created_by_id" text NOT NULL,
	"name" text NOT NULL,
	"prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"scopes" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" "api_key_status" DEFAULT 'ACTIVE' NOT NULL,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"actor_type" "audit_actor_type" DEFAULT 'USER' NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"before" jsonb,
	"after" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "banners" (
	"id" text PRIMARY KEY NOT NULL,
	"placement" "banner_placement" NOT NULL,
	"locale" text,
	"title" text NOT NULL,
	"subtitle" text,
	"image_url" text,
	"cta_label" text,
	"cta_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"subject" text NOT NULL,
	"body_html" text NOT NULL,
	"body_text" text,
	"variables" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homepage_sections" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"title_vi" text NOT NULL,
	"subtitle" text,
	"subtitle_vi" text,
	"config" jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"channel" "notification_channel" DEFAULT 'IN_APP' NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link" text,
	"data" jsonb,
	"read_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"type" "page_type" DEFAULT 'PAGE' NOT NULL,
	"title" text NOT NULL,
	"excerpt" text,
	"content" text NOT NULL,
	"cover_image_url" text,
	"status" "page_status" DEFAULT 'DRAFT' NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"group" text DEFAULT 'general' NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_daily_metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"date" date NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"product_views" integer DEFAULT 0 NOT NULL,
	"leads" integer DEFAULT 0 NOT NULL,
	"rfqs_received" integer DEFAULT 0 NOT NULL,
	"quotations" integer DEFAULT 0 NOT NULL,
	"orders" integer DEFAULT 0 NOT NULL,
	"gmv_usd" numeric(18, 2) DEFAULT 0 NOT NULL,
	"ad_impressions" integer DEFAULT 0 NOT NULL,
	"ad_clicks" integer DEFAULT 0 NOT NULL,
	"ad_spend_usd" numeric(18, 2) DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_ticket_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_id" text NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_number" text NOT NULL,
	"requester_id" text NOT NULL,
	"company_id" text,
	"assignee_id" text,
	"subject" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provinces" ADD CONSTRAINT "provinces_country_code_countries_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."countries"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD CONSTRAINT "buyer_profiles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_country_code_countries_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."countries"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_province_id_provinces_id_fk" FOREIGN KEY ("province_id") REFERENCES "public"."provinces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_badges" ADD CONSTRAINT "company_badges_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_badges" ADD CONSTRAINT "company_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_badges" ADD CONSTRAINT "company_badges_granted_by_id_users_id_fk" FOREIGN KEY ("granted_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_certifications" ADD CONSTRAINT "company_certifications_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_certifications" ADD CONSTRAINT "company_certifications_certification_id_certifications_id_fk" FOREIGN KEY ("certification_id") REFERENCES "public"."certifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_certifications" ADD CONSTRAINT "company_certifications_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_industries" ADD CONSTRAINT "company_industries_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_industries" ADD CONSTRAINT "company_industries_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_invitations" ADD CONSTRAINT "company_invitations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_invitations" ADD CONSTRAINT "company_invitations_invited_by_id_users_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_media" ADD CONSTRAINT "company_media_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manufacturer_profiles" ADD CONSTRAINT "manufacturer_profiles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficial_owners" ADD CONSTRAINT "beneficial_owners_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficial_owners" ADD CONSTRAINT "beneficial_owners_id_document_id_documents_id_fk" FOREIGN KEY ("id_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_checks" ADD CONSTRAINT "compliance_checks_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_checks" ADD CONSTRAINT "compliance_checks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_checks" ADD CONSTRAINT "compliance_checks_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_flags" ADD CONSTRAINT "risk_flags_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_flags" ADD CONSTRAINT "risk_flags_resolved_by_id_users_id_fk" FOREIGN KEY ("resolved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_certifications" ADD CONSTRAINT "product_certifications_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_certifications" ADD CONSTRAINT "product_certifications_certification_id_certifications_id_fk" FOREIGN KEY ("certification_id") REFERENCES "public"."certifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_price_tiers" ADD CONSTRAINT "product_price_tiers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_specifications" ADD CONSTRAINT "product_specifications_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_items" ADD CONSTRAINT "saved_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_items" ADD CONSTRAINT "saved_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_items" ADD CONSTRAINT "saved_items_supplier_company_id_companies_id_fk" FOREIGN KEY ("supplier_company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_rfq_item_id_rfq_items_id_fk" FOREIGN KEY ("rfq_item_id") REFERENCES "public"."rfq_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_supplier_company_id_companies_id_fk" FOREIGN KEY ("supplier_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_invitations" ADD CONSTRAINT "rfq_invitations_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_invitations" ADD CONSTRAINT "rfq_invitations_supplier_company_id_companies_id_fk" FOREIGN KEY ("supplier_company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_items" ADD CONSTRAINT "rfq_items_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_buyer_company_id_companies_id_fk" FOREIGN KEY ("buyer_company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_destination_country_code_countries_code_fk" FOREIGN KEY ("destination_country_code") REFERENCES "public"."countries"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_buyer_company_id_companies_id_fk" FOREIGN KEY ("buyer_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_supplier_company_id_companies_id_fk" FOREIGN KEY ("supplier_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_issuer_company_id_companies_id_fk" FOREIGN KEY ("issuer_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_recipient_company_id_companies_id_fk" FOREIGN KEY ("recipient_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_company_id_companies_id_fk" FOREIGN KEY ("buyer_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_supplier_company_id_companies_id_fk" FOREIGN KEY ("supplier_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_status_code_order_statuses_code_fk" FOREIGN KEY ("status_code") REFERENCES "public"."order_statuses"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispute_messages" ADD CONSTRAINT "dispute_messages_dispute_id_disputes_id_fk" FOREIGN KEY ("dispute_id") REFERENCES "public"."disputes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispute_messages" ADD CONSTRAINT "dispute_messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_raised_by_company_id_companies_id_fk" FOREIGN KEY ("raised_by_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_respondent_company_id_companies_id_fk" FOREIGN KEY ("respondent_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_resolved_by_id_users_id_fk" FOREIGN KEY ("resolved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_provider_id_payment_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."payment_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_payer_company_id_companies_id_fk" FOREIGN KEY ("payer_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_payee_company_id_companies_id_fk" FOREIGN KEY ("payee_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_provider_id_payment_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."payment_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logistics_providers" ADD CONSTRAINT "logistics_providers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logistics_quotes" ADD CONSTRAINT "logistics_quotes_request_id_logistics_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."logistics_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logistics_quotes" ADD CONSTRAINT "logistics_quotes_provider_id_logistics_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."logistics_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logistics_requests" ADD CONSTRAINT "logistics_requests_requester_company_id_companies_id_fk" FOREIGN KEY ("requester_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logistics_requests" ADD CONSTRAINT "logistics_requests_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_provider_id_logistics_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."logistics_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_logistics_quote_id_logistics_quotes_id_fk" FOREIGN KEY ("logistics_quote_id") REFERENCES "public"."logistics_quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_orders" ADD CONSTRAINT "inspection_orders_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_orders" ADD CONSTRAINT "inspection_orders_requester_company_id_companies_id_fk" FOREIGN KEY ("requester_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_orders" ADD CONSTRAINT "inspection_orders_provider_id_inspection_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."inspection_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_orders" ADD CONSTRAINT "inspection_orders_report_document_id_documents_id_fk" FOREIGN KEY ("report_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_providers" ADD CONSTRAINT "inspection_providers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_scores" ADD CONSTRAINT "credit_scores_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_applications" ADD CONSTRAINT "financing_applications_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_applications" ADD CONSTRAINT "financing_applications_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_applications" ADD CONSTRAINT "financing_applications_provider_id_financing_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."financing_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_offers" ADD CONSTRAINT "financing_offers_application_id_financing_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."financing_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_offers" ADD CONSTRAINT "financing_offers_provider_id_financing_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."financing_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_author_company_id_companies_id_fk" FOREIGN KEY ("author_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_target_company_id_companies_id_fk" FOREIGN KEY ("target_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_moderated_by_id_users_id_fk" FOREIGN KEY ("moderated_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_fee_rule_id_fee_rules_id_fk" FOREIGN KEY ("fee_rule_id") REFERENCES "public"."fee_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_rules" ADD CONSTRAINT "fee_rules_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_payment_provider_id_payment_providers_id_fk" FOREIGN KEY ("payment_provider_id") REFERENCES "public"."payment_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_ad_product_id_ad_products_id_fk" FOREIGN KEY ("ad_product_id") REFERENCES "public"."ad_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_events" ADD CONSTRAINT "ad_events_advertisement_id_advertisements_id_fk" FOREIGN KEY ("advertisement_id") REFERENCES "public"."advertisements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advertisements" ADD CONSTRAINT "advertisements_campaign_id_ad_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."ad_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advertisements" ADD CONSTRAINT "advertisements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advertisements" ADD CONSTRAINT "advertisements_supplier_company_id_companies_id_fk" FOREIGN KEY ("supplier_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advertisements" ADD CONSTRAINT "advertisements_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_daily_metrics" ADD CONSTRAINT "supplier_daily_metrics_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_accounts_provider_idx" ON "auth_accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "auth_accounts_user_idx" ON "auth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_idx" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_idx" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "users_platform_role_idx" ON "users" USING btree ("platform_role");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_tokens_hash_idx" ON "verification_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "verification_tokens_identifier_idx" ON "verification_tokens" USING btree ("identifier","purpose");--> statement-breakpoint
CREATE UNIQUE INDEX "certifications_code_idx" ON "certifications" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "industries_slug_idx" ON "industries" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "product_categories_slug_idx" ON "product_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "product_categories_parent_idx" ON "product_categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "product_categories_industry_idx" ON "product_categories" USING btree ("industry_id");--> statement-breakpoint
CREATE INDEX "product_categories_active_idx" ON "product_categories" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "provinces_slug_idx" ON "provinces" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "provinces_country_code_idx" ON "provinces" USING btree ("country_code","code");--> statement-breakpoint
CREATE INDEX "provinces_cluster_idx" ON "provinces" USING btree ("is_industrial_cluster");--> statement-breakpoint
CREATE INDEX "documents_owner_idx" ON "documents" USING btree ("owner_company_id","type");--> statement-breakpoint
CREATE INDEX "documents_order_idx" ON "documents" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "documents_rfq_idx" ON "documents" USING btree ("rfq_id");--> statement-breakpoint
CREATE INDEX "documents_message_idx" ON "documents" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "documents_verification_idx" ON "documents" USING btree ("verification_id");--> statement-breakpoint
CREATE UNIQUE INDEX "badges_code_idx" ON "badges" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "companies_slug_idx" ON "companies" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "companies_seller_idx" ON "companies" USING btree ("status","is_seller");--> statement-breakpoint
CREATE INDEX "companies_buyer_idx" ON "companies" USING btree ("status","is_buyer");--> statement-breakpoint
CREATE INDEX "companies_province_idx" ON "companies" USING btree ("province_id");--> statement-breakpoint
CREATE INDEX "companies_country_idx" ON "companies" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "companies_verification_idx" ON "companies" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "companies_business_type_idx" ON "companies" USING btree ("business_type");--> statement-breakpoint
CREATE INDEX "companies_rating_idx" ON "companies" USING btree ("rating_avg");--> statement-breakpoint
CREATE INDEX "companies_search_idx" ON "companies" USING gin ("search_vector");--> statement-breakpoint
CREATE UNIQUE INDEX "company_badges_unique_idx" ON "company_badges" USING btree ("company_id","badge_id");--> statement-breakpoint
CREATE UNIQUE INDEX "company_certifications_unique_idx" ON "company_certifications" USING btree ("company_id","certification_id");--> statement-breakpoint
CREATE INDEX "company_industries_industry_idx" ON "company_industries" USING btree ("industry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "company_invitations_token_idx" ON "company_invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "company_invitations_company_idx" ON "company_invitations" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "company_invitations_email_idx" ON "company_invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "company_media_company_idx" ON "company_media" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "company_members_company_user_idx" ON "company_members" USING btree ("company_id","user_id");--> statement-breakpoint
CREATE INDEX "company_members_user_idx" ON "company_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "beneficial_owners_company_idx" ON "beneficial_owners" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "compliance_checks_company_idx" ON "compliance_checks" USING btree ("company_id","type");--> statement-breakpoint
CREATE INDEX "compliance_checks_status_idx" ON "compliance_checks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "risk_flags_entity_idx" ON "risk_flags" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "risk_flags_status_idx" ON "risk_flags" USING btree ("status","severity");--> statement-breakpoint
CREATE INDEX "verifications_company_type_idx" ON "verifications" USING btree ("company_id","type");--> statement-breakpoint
CREATE INDEX "verifications_status_idx" ON "verifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "product_images_product_idx" ON "product_images" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_price_tiers_product_idx" ON "product_price_tiers" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_specifications_product_idx" ON "product_specifications" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_variants_product_idx" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_idx" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "products_company_status_idx" ON "products" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "products_category_status_idx" ON "products" USING btree ("category_id","status");--> statement-breakpoint
CREATE INDEX "products_status_published_idx" ON "products" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "products_featured_idx" ON "products" USING btree ("is_featured");--> statement-breakpoint
CREATE INDEX "products_search_idx" ON "products" USING gin ("search_vector");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_items_user_product_idx" ON "saved_items" USING btree ("user_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_items_user_supplier_idx" ON "saved_items" USING btree ("user_id","supplier_company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_items_user_rfq_idx" ON "saved_items" USING btree ("user_id","rfq_id");--> statement-breakpoint
CREATE INDEX "saved_items_user_type_idx" ON "saved_items" USING btree ("user_id","type");--> statement-breakpoint
CREATE INDEX "quotation_items_quotation_idx" ON "quotation_items" USING btree ("quotation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quotations_number_idx" ON "quotations" USING btree ("quotation_number");--> statement-breakpoint
CREATE INDEX "quotations_rfq_status_idx" ON "quotations" USING btree ("rfq_id","status");--> statement-breakpoint
CREATE INDEX "quotations_supplier_status_idx" ON "quotations" USING btree ("supplier_company_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "rfq_invitations_unique_idx" ON "rfq_invitations" USING btree ("rfq_id","supplier_company_id");--> statement-breakpoint
CREATE INDEX "rfq_invitations_supplier_idx" ON "rfq_invitations" USING btree ("supplier_company_id","status");--> statement-breakpoint
CREATE INDEX "rfq_items_rfq_idx" ON "rfq_items" USING btree ("rfq_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rfqs_number_idx" ON "rfqs" USING btree ("rfq_number");--> statement-breakpoint
CREATE INDEX "rfqs_buyer_status_idx" ON "rfqs" USING btree ("buyer_company_id","status");--> statement-breakpoint
CREATE INDEX "rfqs_status_published_idx" ON "rfqs" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "rfqs_category_status_idx" ON "rfqs" USING btree ("category_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_participants_unique_idx" ON "conversation_participants" USING btree ("conversation_id","user_id");--> statement-breakpoint
CREATE INDEX "conversation_participants_user_idx" ON "conversation_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversations_buyer_idx" ON "conversations" USING btree ("buyer_company_id","last_message_at");--> statement-breakpoint
CREATE INDEX "conversations_supplier_idx" ON "conversations" USING btree ("supplier_company_id","last_message_at");--> statement-breakpoint
CREATE INDEX "conversations_order_idx" ON "conversations" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "conversations_rfq_idx" ON "conversations" USING btree ("rfq_id");--> statement-breakpoint
CREATE INDEX "conversations_product_idx" ON "conversations" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "messages_conversation_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_number_idx" ON "invoices" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "invoices_order_idx" ON "invoices" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "invoices_recipient_idx" ON "invoices" USING btree ("recipient_company_id","status");--> statement-breakpoint
CREATE INDEX "invoices_issuer_idx" ON "invoices" USING btree ("issuer_company_id","status");--> statement-breakpoint
CREATE INDEX "order_events_order_idx" ON "order_events" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_number_idx" ON "orders" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "orders_buyer_status_idx" ON "orders" USING btree ("buyer_company_id","status_code");--> statement-breakpoint
CREATE INDEX "orders_supplier_status_idx" ON "orders" USING btree ("supplier_company_id","status_code");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status_code");--> statement-breakpoint
CREATE INDEX "orders_created_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "dispute_messages_dispute_idx" ON "dispute_messages" USING btree ("dispute_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "disputes_number_idx" ON "disputes" USING btree ("dispute_number");--> statement-breakpoint
CREATE INDEX "disputes_order_idx" ON "disputes" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "disputes_status_idx" ON "disputes" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_providers_code_idx" ON "payment_providers" USING btree ("code");--> statement-breakpoint
CREATE INDEX "payment_transactions_payment_idx" ON "payment_transactions" USING btree ("payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_number_idx" ON "payments" USING btree ("payment_number");--> statement-breakpoint
CREATE INDEX "payments_order_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payments_payer_idx" ON "payments" USING btree ("payer_company_id","status");--> statement-breakpoint
CREATE INDEX "payments_payee_idx" ON "payments" USING btree ("payee_company_id","status");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "logistics_providers_code_idx" ON "logistics_providers" USING btree ("code");--> statement-breakpoint
CREATE INDEX "logistics_quotes_request_idx" ON "logistics_quotes" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "logistics_quotes_provider_idx" ON "logistics_quotes" USING btree ("provider_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "logistics_requests_number_idx" ON "logistics_requests" USING btree ("request_number");--> statement-breakpoint
CREATE INDEX "logistics_requests_requester_idx" ON "logistics_requests" USING btree ("requester_company_id","status");--> statement-breakpoint
CREATE INDEX "logistics_requests_order_idx" ON "logistics_requests" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "shipment_events_shipment_idx" ON "shipment_events" USING btree ("shipment_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "shipments_number_idx" ON "shipments" USING btree ("shipment_number");--> statement-breakpoint
CREATE INDEX "shipments_order_idx" ON "shipments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "shipments_status_idx" ON "shipments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "inspection_orders_number_idx" ON "inspection_orders" USING btree ("inspection_number");--> statement-breakpoint
CREATE INDEX "inspection_orders_order_idx" ON "inspection_orders" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "inspection_orders_requester_idx" ON "inspection_orders" USING btree ("requester_company_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "inspection_providers_code_idx" ON "inspection_providers" USING btree ("code");--> statement-breakpoint
CREATE INDEX "credit_scores_company_idx" ON "credit_scores" USING btree ("company_id","computed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_scoring_rules_code_idx" ON "credit_scoring_rules" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "financing_applications_number_idx" ON "financing_applications" USING btree ("application_number");--> statement-breakpoint
CREATE INDEX "financing_applications_company_idx" ON "financing_applications" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "financing_applications_order_idx" ON "financing_applications" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "financing_applications_provider_idx" ON "financing_applications" USING btree ("provider_id","status");--> statement-breakpoint
CREATE INDEX "financing_offers_application_idx" ON "financing_offers" USING btree ("application_id");--> statement-breakpoint
CREATE UNIQUE INDEX "financing_providers_code_idx" ON "financing_providers" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_order_author_idx" ON "reviews" USING btree ("order_id","author_company_id");--> statement-breakpoint
CREATE INDEX "reviews_target_status_idx" ON "reviews" USING btree ("target_company_id","status");--> statement-breakpoint
CREATE INDEX "reviews_product_status_idx" ON "reviews" USING btree ("product_id","status");--> statement-breakpoint
CREATE INDEX "commissions_company_idx" ON "commissions" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "commissions_order_idx" ON "commissions" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fee_rules_code_idx" ON "fee_rules" USING btree ("code");--> statement-breakpoint
CREATE INDEX "fee_rules_type_active_idx" ON "fee_rules" USING btree ("type","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "plans_code_idx" ON "plans" USING btree ("code");--> statement-breakpoint
CREATE INDEX "subscriptions_company_idx" ON "subscriptions" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "ad_campaigns_company_idx" ON "ad_campaigns" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "ad_campaigns_active_idx" ON "ad_campaigns" USING btree ("status","start_at","end_at");--> statement-breakpoint
CREATE INDEX "ad_events_ad_type_idx" ON "ad_events" USING btree ("advertisement_id","type","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ad_products_code_idx" ON "ad_products" USING btree ("code");--> statement-breakpoint
CREATE INDEX "advertisements_placement_idx" ON "advertisements" USING btree ("placement","is_active");--> statement-breakpoint
CREATE INDEX "advertisements_category_idx" ON "advertisements" USING btree ("category_id","placement");--> statement-breakpoint
CREATE INDEX "analytics_events_type_idx" ON "analytics_events" USING btree ("type","created_at");--> statement-breakpoint
CREATE INDEX "analytics_events_company_idx" ON "analytics_events" USING btree ("company_id","type","created_at");--> statement-breakpoint
CREATE INDEX "analytics_events_product_idx" ON "analytics_events" USING btree ("product_id","type","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_hash_idx" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "api_keys_company_idx" ON "api_keys" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "banners_placement_idx" ON "banners" USING btree ("placement","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "email_templates_code_locale_idx" ON "email_templates" USING btree ("code","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "homepage_sections_key_idx" ON "homepage_sections" USING btree ("key");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","read_at","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pages_slug_locale_idx" ON "pages" USING btree ("slug","locale");--> statement-breakpoint
CREATE INDEX "pages_type_status_idx" ON "pages" USING btree ("type","status");--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_daily_metrics_unique_idx" ON "supplier_daily_metrics" USING btree ("company_id","date");--> statement-breakpoint
CREATE INDEX "support_ticket_messages_ticket_idx" ON "support_ticket_messages" USING btree ("ticket_id");--> statement-breakpoint
CREATE UNIQUE INDEX "support_tickets_number_idx" ON "support_tickets" USING btree ("ticket_number");--> statement-breakpoint
CREATE INDEX "support_tickets_status_idx" ON "support_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "support_tickets_requester_idx" ON "support_tickets" USING btree ("requester_id");