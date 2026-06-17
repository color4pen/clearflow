ALTER TYPE "public"."role" ADD VALUE 'manager';
ALTER TYPE "public"."role" ADD VALUE 'finance';

ALTER TABLE "requests" ADD COLUMN "amount" integer;

ALTER TABLE "approval_templates" ADD COLUMN "min_amount" integer;
ALTER TABLE "approval_templates" ADD COLUMN "max_amount" integer;
