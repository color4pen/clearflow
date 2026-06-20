-- T-01: Add UNIQUE constraint on deals.inquiry_id to enforce 1:1 relationship at DB level
-- Prevents TOCTOU race conditions where concurrent requests pass the app-layer check simultaneously.

ALTER TABLE "deals" ADD CONSTRAINT "deals_inquiry_id_unique" UNIQUE ("inquiry_id");
