-- deal_phase enum を hearing/passed 追加＋default 変更するため型再作成パターンを使用する。
-- PostgreSQL は enum 値の並び順を ALTER TYPE ADD VALUE では保証できないため、
-- リポジトリ前例（0018_interaction_kind_channel.sql）と同じ再作成パターンで行う。
-- 既存データ（proposal_prep/proposed/negotiation/won/lost）は全値が新 enum に存在するため CAST で無損失移行する。

-- (a) DEFAULT を一旦外す
ALTER TABLE "deals" ALTER COLUMN "phase" DROP DEFAULT;
--> statement-breakpoint

-- (b) 新 enum を作成する（並び順: hearing, proposal_prep, proposed, negotiation, won, lost, passed）
CREATE TYPE "public"."deal_phase_new" AS ENUM('hearing', 'proposal_prep', 'proposed', 'negotiation', 'won', 'lost', 'passed');
--> statement-breakpoint

-- (c) 列の型を新 enum に差し替える（既存値は全て新 enum に存在するため直接キャスト）
ALTER TABLE "deals" ALTER COLUMN "phase" TYPE "public"."deal_phase_new" USING "phase"::text::"public"."deal_phase_new";
--> statement-breakpoint

-- (d) DEFAULT を hearing に再設定する
ALTER TABLE "deals" ALTER COLUMN "phase" SET DEFAULT 'hearing';
--> statement-breakpoint

-- (e) 旧 enum を削除する
DROP TYPE "public"."deal_phase";
--> statement-breakpoint

-- (f) 新 enum を deal_phase にリネームする
ALTER TYPE "public"."deal_phase_new" RENAME TO "deal_phase";
