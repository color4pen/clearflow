# 顧客接点の種別(kind)をチャネルに整理（contract_adjustment/invoice_adjustment 廃止）

## Meta

- **type**: spec-change
- **slug**: interaction-kind-channel
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 既存 Interaction の kind enum を「チャネル」に整理し、文脈は relatedTo に寄せる。新しい port/adapter は無いが enum 再作成のデータ移行を伴う。設計判断は設計書で確定済みのため adr=false。 -->

## 背景

設計（`docs/design/ユビキタス言語辞書.md`、`01-domain-design.md` §4.3、`06-data-model-design.md`、`03-authorization-design.md`）どおり、顧客接点（Interaction）の **種別(kind) を「チャネル」**（`meeting`/`call`/`email`/`note`）に整理する。`contract_adjustment` / `invoice_adjustment` は **kind から廃止**し、文脈は **relatedTo（contract_id / invoice_id）**で表現する。kind と relatedTo は独立。**既存データ（特に商談=kind=meeting）は不可侵**。

## 現状コードの前提

- `src/infrastructure/schema.ts`: `interactionKindEnum`（PG enum `interaction_kind`）の値 = `meeting / call / email / contract_adjustment / invoice_adjustment`。`interactions.kind` は NOT NULL DEFAULT `meeting`。`interaction_kind` を参照する列は `interactions.kind` のみ。
- `src/domain/models/interaction.ts`: `InteractionKind = "meeting" | "call" | "email" | "contract_adjustment" | "invoice_adjustment"`。
- `src/application/usecases/createContractAdjustment.ts`: `kind: "contract_adjustment"`、`contractId` 設定、audit `interaction.create` metadata `{ kind: "contract_adjustment" }`。`createInvoiceAdjustment.ts` も同様（invoice）。
- `src/domain/authorization.ts`: `interaction.recordContractAdjustment = ADMIN_MANAGER_MEMBER` / `recordInvoiceAdjustment = ADMIN_MANAGER_FINANCE`。
- `src/lib/activityLabels.ts`: `interaction.create`/`meeting.create` を一律「商談を記録」表記（kind 非依存）。kind のラベル変換は無い。
- UI（`ContractInteractionSection` / `InvoiceInteractionSection`）: kind を表示しない・チャネル選択も無い（固定 kind で作成）。
- repository（`interactionRepository`）: 取得は関連先（findAllByDeal/Contract/Invoice 等）で行い kind フィルタなし。CHECK は関連先5種のいずれか NOT NULL のみ（kind と関連先を縛る制約なし）。
- 既存データ: seed の interaction は全て kind=meeting+deal_id（`contract_adjustment`/`invoice_adjustment` の seed 行なし）。adjustment 行は UI 記録経由でのみ発生。
- テストで `contract_adjustment`/`invoice_adjustment` をハードコード: `contractAdjustment.dynamic.test.ts` / `invoiceAdjustment.dynamic.test.ts` / `actions/interactions.dynamic.test.ts` / `interactionByRelation.dynamic.test.ts` / `dealActivity.dynamic.test.ts`。

## 要件

1. **enum 是正（データ安全な差分マイグレーション）**: `interaction_kind` を `meeting / call / email / note` にする。`contract_adjustment` / `invoice_adjustment` を廃止し `note` を追加する。
   - **マイグレーションの扱い（重要）**: PostgreSQL は enum 値の削除（`ALTER TYPE ... DROP VALUE`）を**サポートしない**ため、**enum 再作成＋列の型差し替え**で行う。手順は概ね: (a) 旧値の行を寄せる `UPDATE interactions SET kind='note' WHERE kind IN ('contract_adjustment','invoice_adjustment')`（**relatedTo（contract_id/invoice_id）は変更しない**）、(b) 列の DEFAULT を一旦外す、(c) 新 enum を作成し `ALTER COLUMN kind TYPE ... USING kind::text::新enum`、(d) DEFAULT を `'meeting'` で再設定、(e) 旧 enum を DROP し RENAME。
   - **`bun run db:generate` が enum 値削除を非対話で安全に生成できない場合は別途対応**（対話生成または手順に沿った安全な差分を用意）。生成 SQL に **既存行や relatedTo を失わせる DROP COLUMN / DELETE / TRUNCATE が含まれないこと**を確認する。実装の検証は mock ベース `.dynamic.test.ts` で行い、マイグレーション適用はマージ後に別途（`db:migrate`、適用前に SQL を精査）。
2. **ドメイン型**: `InteractionKind = "meeting" | "call" | "email" | "note"`。`contract_adjustment` / `invoice_adjustment` を削除。
3. **usecase**: `createContractAdjustment` / `createInvoiceAdjustment` を **kind=`note` ＋ relatedTo（contractId / invoiceId）**で作成するよう変更。audit `interaction.create` の metadata も `{ kind: "note" }`。記録・一覧の外形的な振る舞い（契約/請求に紐づく接点の記録・表示）は不変。
4. **認可**: `interaction` の記録操作を **relatedTo 文脈ベース**に整理（kind 名を前提にしない）。権限値は維持（契約に紐づく接点の記録=admin/manager/member、請求に紐づく接点の記録=admin/manager/finance、商談=admin/manager/member）。操作名が kind 前提なら relatedTo 文脈名にリネームする。
5. **表示**: 「種別」は relatedTo から導出する（契約に紐づく接点＝契約のやり取り、請求＝請求のやり取り、案件/引合＝商談）。UI のチャネル選択は追加しない。
6. **テスト追従**: `contract_adjustment` / `invoice_adjustment` をハードコードする既存テストを新仕様（kind=note + relatedTo）に更新する。

## スコープ外

- チャネル選択 UI（meeting/call/email/note を画面で選ぶ）。将来対応。
- 商談（kind=meeting・relatedTo 案件/引合）の作成・編集・一覧・詳細の振る舞い変更。
- 監査ログの過去データ書き換え（追記専用・不可侵。過去 `interaction.create` の metadata.kind は残る）。
- AR/債権管理。

## 受け入れ基準

**テスト方針（必須）**: 振る舞いは `.dynamic.test.ts` の `mock.module` 方式で **実行して** assert する。ソースの静的検査（readSrc / toContain）で代替しない。

- [ ] `InteractionKind` が `meeting | call | email | note` であり、`contract_adjustment` / `invoice_adjustment` がコードから除去されていることを確認する。
- [ ] `createContractAdjustment` / `createInvoiceAdjustment` が kind=`note` ＋ relatedTo（contractId / invoiceId）で接点を作成し、`interaction.create` 監査が `metadata.kind="note"` で記録されることを実行テストで固定する。
- [ ] 契約/請求に紐づく接点の一覧（relatedTo ベース取得）が従来どおり動作することを実行テストで固定する。
- [ ] 認可（契約=admin/manager/member、請求=admin/manager/finance、商談=admin/manager/member）が維持されることをテストで固定する。
- [ ] 差分マイグレーションが**データを保持**する（既存 adjustment 行は kind=note へ寄せ relatedTo を保持、商談=meeting 行は不変。DROP COLUMN/DELETE/TRUNCATE を含まない）こと、`drizzle-kit check` 通過を確認する。
- [ ] 商談（relatedTo 案件/引合・kind=meeting）の作成・更新・一覧・詳細が従来どおり動作することを実行テストで固定する。
- [ ] 既存テストを新仕様に追従し、`bun test` green / `typecheck` / `bun run build` 成功。
- [ ] 依存方向（actions/RSC → usecases → domain / infrastructure）を遵守する。

## architect 評価済みの設計判断

1. **kind＝チャネル（meeting/call/email/note）・relatedTo＝文脈**。CRM/SFA の定石（活動の Type は Related-To から独立）に合わせ、kind から文脈情報（contract_adjustment/invoice_adjustment）を排する。
2. **enum 再作成でデータ安全に移行**。PG は enum 値削除不可のため再作成＋列差し替え。既存 adjustment 行は kind=note へ寄せ relatedTo を保持（情報損失なし）。商談=meeting 行は不変。マイグレーションは生成 SQL を精査し DROP/DELETE/TRUNCATE を含めない。マージ後に `db:migrate`。
3. **契約/請求のやり取りは kind=note ＋ relatedTo で表現**。種別表示は relatedTo から導出。記録の外形的振る舞いは不変。
4. **認可は relatedTo 文脈別**（kind を前提にしない）。権限値は現状維持。
5. **商談・監査ログは非破壊**。商談の振る舞いは不変、過去監査の metadata.kind は書き換えない。
