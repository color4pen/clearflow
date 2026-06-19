-- T-01: Add meetingTypeEnum and meetings table for meeting management

-- Add meeting_type enum
CREATE TYPE "public"."meeting_type" AS ENUM('hearing', 'proposal', 'negotiation', 'closing', 'followup');
--> statement-breakpoint

-- Add meetings table
CREATE TABLE "meetings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "inquiry_id" uuid NOT NULL,
  "type" "meeting_type" NOT NULL,
  "date" timestamp NOT NULL,
  "location" text,
  "attendees" jsonb DEFAULT '{"internal":[],"external":[]}'::jsonb NOT NULL,
  "summary" text,
  "action_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "hearing_data" jsonb,
  "created_by_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Foreign key constraints
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
