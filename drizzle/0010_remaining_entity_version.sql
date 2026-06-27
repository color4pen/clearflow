ALTER TABLE "meetings" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "action_items" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "revenue_targets" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;
