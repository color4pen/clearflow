-- Step 1a: Create inquiry_source enum type
CREATE TYPE "public"."inquiry_source" AS ENUM('web', 'phone', 'email', 'referral', 'agent_service', 'exhibition', 'other');
--> statement-breakpoint
-- Step 1b: Fallback existing data with enum-incompatible values to 'other'
UPDATE inquiries SET source = 'other' WHERE source NOT IN ('web', 'phone', 'email', 'referral', 'agent_service', 'exhibition', 'other');
--> statement-breakpoint
-- Step 1c: Change source column type from text to enum
ALTER TABLE "inquiries" ALTER COLUMN "source" SET DATA TYPE "public"."inquiry_source" USING "source"::"public"."inquiry_source";
--> statement-breakpoint
-- Step 2: Add budget and timeline to inquiries
ALTER TABLE "inquiries" ADD COLUMN "budget" integer;
--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "timeline" text;
--> statement-breakpoint
-- Step 3: Add description to deals
ALTER TABLE "deals" ADD COLUMN "description" text;
--> statement-breakpoint
-- Step 4: Make deal_id nullable and add inquiry_id to meetings
ALTER TABLE "meetings" ALTER COLUMN "deal_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "meetings" ALTER COLUMN "attendees" SET DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "inquiry_id" uuid;
--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
-- Step 5: Add CHECK constraint to ensure at least one of deal_id or inquiry_id is NOT NULL
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_deal_or_inquiry_check" CHECK (deal_id IS NOT NULL OR inquiry_id IS NOT NULL);
--> statement-breakpoint
-- Step 6: Migrate existing attendees data from old format { internal: [...], external: [...] } to new format [...]
UPDATE meetings SET attendees = (
  SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'userId', NULL,
      'contactId', NULL,
      'name', elem,
      'isExternal', false
    ) AS item
    FROM jsonb_array_elements_text(attendees->'internal') AS elem
    UNION ALL
    SELECT jsonb_build_object(
      'userId', NULL,
      'contactId', NULL,
      'name', elem,
      'isExternal', true
    ) AS item
    FROM jsonb_array_elements_text(attendees->'external') AS elem
  ) sub
)
WHERE attendees ? 'internal';
