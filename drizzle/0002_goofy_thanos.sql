-- (e) Convert existing attendees from {internal: string[], external: string[]} to MeetingAttendee[]
UPDATE meetings SET attendees = (
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'userId', null,
      'contactId', null,
      'name', elem,
      'isExternal', false
    )
  ), '[]'::jsonb)
  FROM jsonb_array_elements_text(attendees->'internal') AS elem
) || (
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'userId', null,
      'contactId', null,
      'name', elem,
      'isExternal', true
    )
  ), '[]'::jsonb)
  FROM jsonb_array_elements_text(attendees->'external') AS elem
)
WHERE attendees ? 'internal';--> statement-breakpoint
-- (a) Normalize source values not in enum to 'other' before creating enum type
UPDATE inquiries SET source = 'other' WHERE source NOT IN ('web', 'phone', 'email', 'referral', 'agent_service', 'exhibition', 'other');--> statement-breakpoint
CREATE TYPE "public"."inquiry_source" AS ENUM('web', 'phone', 'email', 'referral', 'agent_service', 'exhibition', 'other');--> statement-breakpoint
-- (b) Set default for null amounts before making NOT NULL
UPDATE contracts SET amount = 0 WHERE amount IS NULL;--> statement-breakpoint
ALTER TABLE "contracts" ALTER COLUMN "amount" SET NOT NULL;--> statement-breakpoint
-- (c) Set default for null start_dates before making NOT NULL
UPDATE contracts SET start_date = created_at WHERE start_date IS NULL;--> statement-breakpoint
ALTER TABLE "contracts" ALTER COLUMN "start_date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "inquiries" ALTER COLUMN "source" SET DATA TYPE "public"."inquiry_source" USING "source"::"public"."inquiry_source";--> statement-breakpoint
ALTER TABLE "meetings" ALTER COLUMN "deal_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "meetings" ALTER COLUMN "attendees" SET DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "budget" integer;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "timeline" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "issue_date" timestamp;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "inquiry_id" uuid;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- (d) Ensure each meeting has either a deal_id or inquiry_id
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_deal_or_inquiry_check" CHECK ("deal_id" IS NOT NULL OR "inquiry_id" IS NOT NULL);