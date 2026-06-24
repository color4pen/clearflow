CREATE TYPE "public"."inquiry_source" AS ENUM('web', 'phone', 'email', 'referral', 'agent_service', 'exhibition', 'other');--> statement-breakpoint
UPDATE "inquiries" SET "source" = 'other' WHERE "source" NOT IN ('web', 'phone', 'email', 'referral', 'agent_service', 'exhibition', 'other');--> statement-breakpoint
ALTER TABLE "inquiries" ALTER COLUMN "source" SET DATA TYPE "public"."inquiry_source" USING "source"::"public"."inquiry_source";--> statement-breakpoint
ALTER TABLE "meetings" ALTER COLUMN "deal_id" DROP NOT NULL;--> statement-breakpoint
UPDATE "meetings" SET "attendees" = (
  SELECT COALESCE(jsonb_agg(item), '[]'::jsonb) FROM (
    SELECT jsonb_build_object('userId', null, 'contactId', null, 'name', elem, 'isExternal', false) AS item
    FROM jsonb_array_elements_text(COALESCE("attendees"->'internal', '[]'::jsonb)) AS elem
    UNION ALL
    SELECT jsonb_build_object('userId', null, 'contactId', null, 'name', elem, 'isExternal', true) AS item
    FROM jsonb_array_elements_text(COALESCE("attendees"->'external', '[]'::jsonb)) AS elem
  ) sub
);--> statement-breakpoint
ALTER TABLE "meetings" ALTER COLUMN "attendees" SET DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "budget" integer;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "timeline" text;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "inquiry_id" uuid;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_deal_or_inquiry_check" CHECK ("meetings"."deal_id" IS NOT NULL OR "meetings"."inquiry_id" IS NOT NULL);
