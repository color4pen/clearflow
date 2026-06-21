-- T-01: Add sourceType and sourceId columns to requests table for approval flow integration
-- Enables approveRequest to know where a request came from and trigger post-approval linkage.

ALTER TABLE "requests" ADD COLUMN "source_type" text;
--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "source_id" uuid;
