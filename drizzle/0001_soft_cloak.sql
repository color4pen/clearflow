ALTER TABLE "meetings" DROP CONSTRAINT "meetings_inquiry_id_inquiries_id_fk";
--> statement-breakpoint
ALTER TABLE "inquiries" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "inquiries" ALTER COLUMN "status" SET DEFAULT 'new'::text;--> statement-breakpoint
DROP TYPE "public"."inquiry_status";--> statement-breakpoint
CREATE TYPE "public"."inquiry_status" AS ENUM('new', 'converted', 'declined');--> statement-breakpoint
ALTER TABLE "inquiries" ALTER COLUMN "status" SET DEFAULT 'new'::"public"."inquiry_status";--> statement-breakpoint
ALTER TABLE "inquiries" ALTER COLUMN "status" SET DATA TYPE "public"."inquiry_status" USING "status"::"public"."inquiry_status";--> statement-breakpoint
ALTER TABLE "meetings" ALTER COLUMN "deal_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "meetings" DROP COLUMN "inquiry_id";