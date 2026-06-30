-- interaction_kind enum を meeting/call/email/note の 4 値に再作成する。
-- PostgreSQL は enum 値の削除をサポートしないため、enum 再作成＋列差し替えで行う。
-- 既存の contract_adjustment / invoice_adjustment 行は kind=note に寄せ、relatedTo は不変。
-- 商談（kind=meeting）行は不変。

-- (a) 旧値の行を note に寄せる（relatedTo は変更しない）
UPDATE "interactions" SET "kind" = 'note' WHERE "kind" IN ('contract_adjustment', 'invoice_adjustment');
--> statement-breakpoint

-- (b) DEFAULT を一旦外す
ALTER TABLE "interactions" ALTER COLUMN "kind" DROP DEFAULT;
--> statement-breakpoint

-- (c) 新 enum を作成する
CREATE TYPE "public"."interaction_kind_new" AS ENUM('meeting', 'call', 'email', 'note');
--> statement-breakpoint

-- (d) 列の型を新 enum に差し替える
ALTER TABLE "interactions" ALTER COLUMN "kind" TYPE "public"."interaction_kind_new" USING "kind"::text::"public"."interaction_kind_new";
--> statement-breakpoint

-- (e) DEFAULT を再設定する
ALTER TABLE "interactions" ALTER COLUMN "kind" SET DEFAULT 'meeting';
--> statement-breakpoint

-- (f) 旧 enum を削除する
DROP TYPE "public"."interaction_kind";
--> statement-breakpoint

-- (g) 新 enum を interaction_kind にリネームする
ALTER TYPE "public"."interaction_kind_new" RENAME TO "interaction_kind";
