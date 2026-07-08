ALTER TYPE "public"."deal_phase" ADD VALUE 'hearing' BEFORE 'proposal_prep';--> statement-breakpoint
ALTER TYPE "public"."deal_phase" ADD VALUE 'passed';--> statement-breakpoint
ALTER TABLE "deals" ALTER COLUMN "phase" SET DEFAULT 'hearing';