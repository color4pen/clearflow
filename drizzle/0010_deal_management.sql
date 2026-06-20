-- T-01: Add dealPhaseEnum and deals table for deal management

-- Add deal_phase enum
CREATE TYPE "public"."deal_phase" AS ENUM('proposal_prep', 'proposed', 'negotiation', 'internal_approval', 'won', 'lost');
--> statement-breakpoint

-- Add deals table
CREATE TABLE "deals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "inquiry_id" uuid NOT NULL,
  "title" text NOT NULL,
  "phase" "deal_phase" DEFAULT 'proposal_prep' NOT NULL,
  "estimated_amount" integer,
  "estimated_start_date" timestamp,
  "estimated_end_date" timestamp,
  "contract_type" text,
  "assignee_id" uuid,
  "technical_lead_id" uuid,
  "estimate_request_id" uuid,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint

-- Foreign key constraints
ALTER TABLE "deals" ADD CONSTRAINT "deals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_technical_lead_id_users_id_fk" FOREIGN KEY ("technical_lead_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_estimate_request_id_requests_id_fk" FOREIGN KEY ("estimate_request_id") REFERENCES "public"."requests"("id") ON DELETE set null ON UPDATE no action;
