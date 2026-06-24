CREATE TABLE "approval_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"trigger_action" text NOT NULL,
	"condition_field" text,
	"condition_operator" text,
	"condition_value" text,
	"template_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "approval_policies_condition_check" CHECK (("approval_policies"."condition_field" IS NULL AND "approval_policies"."condition_operator" IS NULL AND "approval_policies"."condition_value" IS NULL) OR ("approval_policies"."condition_field" IS NOT NULL AND "approval_policies"."condition_operator" IS NOT NULL AND "approval_policies"."condition_value" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "approval_delegations" ADD COLUMN "from_user_role" text;--> statement-breakpoint
UPDATE "approval_delegations" SET "from_user_role" = (SELECT "role" FROM "users" WHERE "users"."id" = "approval_delegations"."from_user_id");--> statement-breakpoint
ALTER TABLE "approval_delegations" ALTER COLUMN "from_user_role" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "approval_steps" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "approval_steps" ADD COLUMN "approver_id" uuid;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "origin_type" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "origin_policy_id" uuid;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "origin_trigger_action" text;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "origin_trigger_entity_id" uuid;--> statement-breakpoint
ALTER TABLE "approval_policies" ADD CONSTRAINT "approval_policies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_policies" ADD CONSTRAINT "approval_policies_template_id_approval_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."approval_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "approval_policies_org_trigger_active_idx" ON "approval_policies" USING btree ("organization_id","trigger_action","is_active");--> statement-breakpoint
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_origin_policy_id_approval_policies_id_fk" FOREIGN KEY ("origin_policy_id") REFERENCES "public"."approval_policies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_origin_check" CHECK (("requests"."origin_type" = 'manual' AND "requests"."origin_policy_id" IS NULL AND "requests"."origin_trigger_action" IS NULL AND "requests"."origin_trigger_entity_id" IS NULL) OR ("requests"."origin_type" = 'system' AND "requests"."origin_policy_id" IS NOT NULL AND "requests"."origin_trigger_action" IS NOT NULL AND "requests"."origin_trigger_entity_id" IS NOT NULL));