ALTER TABLE "contracts" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;
