ALTER TYPE "public"."shipment_status" ADD VALUE 'READY_TO_PICK';--> statement-breakpoint
ALTER TYPE "public"."shipment_status" ADD VALUE 'PICKUP_FAILED';--> statement-breakpoint
ALTER TYPE "public"."shipment_status" ADD VALUE 'VEHICLE_ASSIGNED';--> statement-breakpoint
ALTER TYPE "public"."shipment_status" ADD VALUE 'EXPORT_CLEARED';--> statement-breakpoint
ALTER TYPE "public"."shipment_status" ADD VALUE 'IMPORT_CLEARED';--> statement-breakpoint
ALTER TYPE "public"."shipment_status" ADD VALUE 'DELIVERY_FAILED';--> statement-breakpoint
ALTER TYPE "public"."shipment_status" ADD VALUE 'RETURNING';--> statement-breakpoint
ALTER TYPE "public"."shipment_status" ADD VALUE 'RETURNED';--> statement-breakpoint
ALTER TYPE "public"."shipment_status" ADD VALUE 'LOST';--> statement-breakpoint
ALTER TYPE "public"."shipment_status" ADD VALUE 'DAMAGED';--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "is_logistics_partner" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shipment_events" ADD COLUMN "reason_code" text;--> statement-breakpoint
ALTER TABLE "shipment_events" ADD COLUMN "attachments" jsonb;--> statement-breakpoint
ALTER TABLE "shipment_events" ADD COLUMN "data" jsonb;--> statement-breakpoint
ALTER TABLE "shipment_events" ADD COLUMN "actor_user_id" text;--> statement-breakpoint
ALTER TABLE "shipment_events" ADD COLUMN "actor_company_id" text;--> statement-breakpoint
ALTER TABLE "shipment_events" ADD COLUMN "external_key" text;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "carrier_code" text;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "assigned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "exception_reason" text;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "last_event_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "tracking_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "tracking_sync_error" text;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "receiver_name" text;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "pod_url" text;--> statement-breakpoint
CREATE UNIQUE INDEX "shipment_events_external_idx" ON "shipment_events" USING btree ("external_key") WHERE "shipment_events"."external_key" is not null;--> statement-breakpoint
CREATE INDEX "shipments_provider_idx" ON "shipments" USING btree ("provider_id","status");--> statement-breakpoint
CREATE INDEX "shipments_tracking_idx" ON "shipments" USING btree ("carrier_code","tracking_number");