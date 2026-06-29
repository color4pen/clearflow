-- 商談（Meeting）を顧客接点（Interaction）に一般化するマイグレーション
-- meetings テーブルを interactions にリネームし、kind・新規FK列・詳細JSONB列を追加する。
-- action_items.meeting_id を interaction_id にリネームする。

-- 1. interaction_kind 列挙型の作成
CREATE TYPE "public"."interaction_kind" AS ENUM('meeting', 'call', 'email', 'contract_adjustment', 'invoice_adjustment');
--> statement-breakpoint

-- 2. meetings テーブルを interactions にリネーム
ALTER TABLE "meetings" RENAME TO "interactions";
--> statement-breakpoint

-- 3. 既存の meetings 関連制約・FKをリネーム（テーブルリネームで自動変更されない場合）
ALTER TABLE "interactions" RENAME CONSTRAINT "meetings_organization_id_organizations_id_fk" TO "interactions_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "interactions" RENAME CONSTRAINT "meetings_inquiry_id_inquiries_id_fk" TO "interactions_inquiry_id_inquiries_id_fk";
--> statement-breakpoint
ALTER TABLE "interactions" RENAME CONSTRAINT "meetings_deal_id_deals_id_fk" TO "interactions_deal_id_deals_id_fk";
--> statement-breakpoint
ALTER TABLE "interactions" RENAME CONSTRAINT "meetings_created_by_id_users_id_fk" TO "interactions_created_by_id_users_id_fk";
--> statement-breakpoint

-- 4. 旧 CHECK 制約を削除（2 条件）
ALTER TABLE "interactions" DROP CONSTRAINT "meetings_deal_or_inquiry_check";
--> statement-breakpoint

-- 5. type カラムを meeting_type にリネームし nullable に変更
ALTER TABLE "interactions" RENAME COLUMN "type" TO "meeting_type";
--> statement-breakpoint
ALTER TABLE "interactions" ALTER COLUMN "meeting_type" DROP NOT NULL;
--> statement-breakpoint

-- 6. hearing_data カラムを details にリネーム
ALTER TABLE "interactions" RENAME COLUMN "hearing_data" TO "details";
--> statement-breakpoint

-- 7. kind カラムを追加（NOT NULL, default 'meeting' — 既存行は全て kind=meeting）
ALTER TABLE "interactions" ADD COLUMN "kind" "interaction_kind" NOT NULL DEFAULT 'meeting';
--> statement-breakpoint

-- 8. contract_id / invoice_id / client_id カラムを追加
ALTER TABLE "interactions" ADD COLUMN "contract_id" uuid;
--> statement-breakpoint
ALTER TABLE "interactions" ADD COLUMN "invoice_id" uuid;
--> statement-breakpoint
ALTER TABLE "interactions" ADD COLUMN "client_id" uuid;
--> statement-breakpoint

-- 9. 新規 FK 制約を追加
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- 10. 新 CHECK 制約を追加（5 条件）
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_related_entity_check" CHECK ("interactions"."deal_id" IS NOT NULL OR "interactions"."inquiry_id" IS NOT NULL OR "interactions"."contract_id" IS NOT NULL OR "interactions"."invoice_id" IS NOT NULL OR "interactions"."client_id" IS NOT NULL);
--> statement-breakpoint

-- 11. 既存インデックスをリネーム
DROP INDEX "meetings_org_deal_id_idx";
--> statement-breakpoint
DROP INDEX "meetings_org_inquiry_id_idx";
--> statement-breakpoint
CREATE INDEX "interactions_org_deal_id_idx" ON "interactions" USING btree ("organization_id","deal_id");
--> statement-breakpoint
CREATE INDEX "interactions_org_inquiry_id_idx" ON "interactions" USING btree ("organization_id","inquiry_id");
--> statement-breakpoint

-- 12. 新規インデックスを追加
CREATE INDEX "interactions_org_contract_id_idx" ON "interactions" USING btree ("organization_id","contract_id");
--> statement-breakpoint
CREATE INDEX "interactions_org_invoice_id_idx" ON "interactions" USING btree ("organization_id","invoice_id");
--> statement-breakpoint
CREATE INDEX "interactions_org_client_id_idx" ON "interactions" USING btree ("organization_id","client_id");
--> statement-breakpoint

-- 13. action_items.meeting_id を interaction_id にリネーム
ALTER TABLE "action_items" RENAME COLUMN "meeting_id" TO "interaction_id";
--> statement-breakpoint

-- 14. action_items の旧 FK を削除し、interactions テーブル参照の新 FK を追加
ALTER TABLE "action_items" DROP CONSTRAINT "action_items_meeting_id_meetings_id_fk";
--> statement-breakpoint
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_interaction_id_interactions_id_fk" FOREIGN KEY ("interaction_id") REFERENCES "public"."interactions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

-- 15. action_items インデックスをリネーム
DROP INDEX "action_items_meeting_id_idx";
--> statement-breakpoint
CREATE INDEX "action_items_interaction_id_idx" ON "action_items" USING btree ("interaction_id");
