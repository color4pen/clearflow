ALTER TABLE "deals" DROP CONSTRAINT "deals_inquiry_id_unique";--> statement-breakpoint
ALTER TABLE "deals" ALTER COLUMN "inquiry_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "client_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;