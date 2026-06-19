-- Add version column to inquiries for optimistic locking
ALTER TABLE "inquiries" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;
