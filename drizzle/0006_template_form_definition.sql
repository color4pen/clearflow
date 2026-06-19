-- Step 1: Add fields column to approval_templates
ALTER TABLE "approval_templates" ADD COLUMN "fields" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
-- Step 2: Drop minAmount / maxAmount from approval_templates
ALTER TABLE "approval_templates" DROP COLUMN IF EXISTS "min_amount";
--> statement-breakpoint
ALTER TABLE "approval_templates" DROP COLUMN IF EXISTS "max_amount";
--> statement-breakpoint
-- Step 3: Add form_data column to requests
ALTER TABLE "requests" ADD COLUMN "form_data" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
-- Step 4: Migrate existing description / amount data to form_data
UPDATE "requests" SET "form_data" =
  CASE
    WHEN description IS NOT NULL AND amount IS NOT NULL THEN
      jsonb_build_object('description', jsonb_build_object('value', to_jsonb(description), 'label', '"説明"'::jsonb), 'amount', jsonb_build_object('value', to_jsonb(amount), 'label', '"金額"'::jsonb))
    WHEN description IS NOT NULL THEN
      jsonb_build_object('description', jsonb_build_object('value', to_jsonb(description), 'label', '"説明"'::jsonb))
    WHEN amount IS NOT NULL THEN
      jsonb_build_object('amount', jsonb_build_object('value', to_jsonb(amount), 'label', '"金額"'::jsonb))
    ELSE '{}'::jsonb
  END;
--> statement-breakpoint
-- Step 5: Drop description and amount from requests
ALTER TABLE "requests" DROP COLUMN IF EXISTS "description";
--> statement-breakpoint
ALTER TABLE "requests" DROP COLUMN IF EXISTS "amount";
--> statement-breakpoint
-- Step 6: Add template_id column to requests
ALTER TABLE "requests" ADD COLUMN "template_id" uuid;
--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_template_id_approval_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."approval_templates"("id") ON DELETE set null ON UPDATE no action;
