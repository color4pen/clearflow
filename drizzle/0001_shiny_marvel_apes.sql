ALTER TABLE "inquiries" DROP CONSTRAINT "inquiries_conversion_request_id_requests_id_fk";
--> statement-breakpoint
ALTER TABLE "deals" ALTER COLUMN "phase" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "deals" ALTER COLUMN "phase" SET DEFAULT 'proposal_prep'::text;--> statement-breakpoint
DROP TYPE "public"."deal_phase";--> statement-breakpoint
CREATE TYPE "public"."deal_phase" AS ENUM('proposal_prep', 'proposed', 'negotiation', 'won', 'lost');--> statement-breakpoint
ALTER TABLE "deals" ALTER COLUMN "phase" SET DEFAULT 'proposal_prep'::"public"."deal_phase";--> statement-breakpoint
ALTER TABLE "deals" ALTER COLUMN "phase" SET DATA TYPE "public"."deal_phase" USING "phase"::"public"."deal_phase";--> statement-breakpoint
ALTER TABLE "inquiries" DROP COLUMN "conversion_request_id";--> statement-breakpoint
ALTER TABLE "requests" DROP COLUMN "source_type";--> statement-breakpoint
ALTER TABLE "requests" DROP COLUMN "source_id";