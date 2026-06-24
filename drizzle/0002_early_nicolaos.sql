UPDATE contracts SET amount = 0 WHERE amount IS NULL;--> statement-breakpoint
ALTER TABLE "contracts" ALTER COLUMN "amount" SET NOT NULL;--> statement-breakpoint
UPDATE contracts SET start_date = created_at WHERE start_date IS NULL;--> statement-breakpoint
ALTER TABLE "contracts" ALTER COLUMN "start_date" SET NOT NULL;--> statement-breakpoint
UPDATE invoices SET due_date = created_at + INTERVAL '30 days' WHERE due_date IS NULL;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "due_date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "issue_date" timestamp;