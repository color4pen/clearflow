# Tasks: interaction-kind-channel

## T-01: ドメイン型 `InteractionKind` を更新する

- [x] `src/domain/models/interaction.ts` の `InteractionKind` 型を `"meeting" | "call" | "email" | "note"` に変更する（`"contract_adjustment"` / `"invoice_adjustment"` を削除、`"note"` を追加）

**Acceptance Criteria**:
- `InteractionKind` が `"meeting" | "call" | "email" | "note"` の 4 値 union であること
- `"contract_adjustment"` / `"invoice_adjustment"` がコード中に型として存在しないこと
- `bun run typecheck` が成功すること（後続タスクとの組み合わせで最終確認）

---

## T-02: Drizzle スキーマ `interactionKindEnum` を更新する

- [x] `src/infrastructure/schema.ts` の `interactionKindEnum` を `["meeting", "call", "email", "note"]` に変更する（`"contract_adjustment"` / `"invoice_adjustment"` を削除、`"note"` を追加）

**Acceptance Criteria**:
- `interactionKindEnum` が `["meeting", "call", "email", "note"]` であること
- `interactions.kind` の DEFAULT が `"meeting"` のまま維持されていること

---

## T-03: 手書きマイグレーション SQL を作成する

- [x] `drizzle/0018_interaction_kind_channel.sql` を以下の手順で作成する:
  1. `UPDATE interactions SET kind = 'note' WHERE kind IN ('contract_adjustment', 'invoice_adjustment')` — 既存行を寄せる（relatedTo は不変）
  2. `ALTER TABLE interactions ALTER COLUMN kind DROP DEFAULT` — DEFAULT を一旦外す
  3. `CREATE TYPE "public"."interaction_kind_new" AS ENUM('meeting', 'call', 'email', 'note')` — 新 enum を作成
  4. `ALTER TABLE interactions ALTER COLUMN kind TYPE "public"."interaction_kind_new" USING kind::text::"public"."interaction_kind_new"` — 列の型を差し替え
  5. `ALTER TABLE interactions ALTER COLUMN kind SET DEFAULT 'meeting'` — DEFAULT を再設定
  6. `DROP TYPE "public"."interaction_kind"` — 旧 enum を削除
  7. `ALTER TYPE "public"."interaction_kind_new" RENAME TO "interaction_kind"` — 新 enum をリネーム
- [x] 各 statement の間に `--> statement-breakpoint` を挿入する（drizzle-kit の慣例に従う）
- [x] SQL に `DROP COLUMN` / `DELETE` / `TRUNCATE` が含まれていないことを確認する
- [x] drizzle の meta ファイル（`drizzle/meta/_journal.json`）にエントリを追加する（既存パターンに従う）
- [x] `drizzle/meta/0018_snapshot.json` を作成する（`drizzle/meta/0017_snapshot.json` を元に `interactionKindEnum` の値を `["meeting", "call", "email", "note"]` に更新したスナップショット）。スナップショットがなければ `drizzle-kit check` が失敗し、`bun run db:generate` が 0017 スナップショットと schema.ts の乖離を新たな差分として検出し重複マイグレーション SQL を生成する
- [x] `bun run db:generate` を実行し、追加の差分が生成されないことを確認する（schema.ts と SQL が一致している状態）

**Acceptance Criteria**:
- `0018_interaction_kind_channel.sql` が存在し、上記 7 ステップの SQL を含むこと
- `drizzle/meta/0018_snapshot.json` が存在し、`interactionKindEnum` の値が `["meeting", "call", "email", "note"]` であること
- SQL に DROP COLUMN / DELETE / TRUNCATE が含まれないこと
- `drizzle-kit check` がエラーなく通過すること
- `bun run db:generate` で追加差分が生成されないこと
- 既存の `contract_adjustment` / `invoice_adjustment` 行が `kind = 'note'` に更新され、`contract_id` / `invoice_id` が不変であること（SQL の意図として）

---

## T-04: usecase `createContractAdjustment` を `kind: "note"` に変更する

- [x] `src/application/usecases/createContractAdjustment.ts` の `kind: "contract_adjustment"` を `kind: "note"` に変更する
- [x] 同ファイルの `recordAudit` 呼び出しの `metadata: { kind: "contract_adjustment" }` を `metadata: { kind: "note" }` に変更する

**Acceptance Criteria**:
- `createContractAdjustment` が `kind: "note"` で Interaction を作成すること
- audit メタデータが `{ kind: "note" }` であること
- `contractId` の設定が不変であること（relatedTo の維持）

---

## T-05: usecase `createInvoiceAdjustment` を `kind: "note"` に変更する

- [x] `src/application/usecases/createInvoiceAdjustment.ts` の `kind: "invoice_adjustment"` を `kind: "note"` に変更する
- [x] 同ファイルの `recordAudit` 呼び出しの `metadata: { kind: "invoice_adjustment" }` を `metadata: { kind: "note" }` に変更する

**Acceptance Criteria**:
- `createInvoiceAdjustment` が `kind: "note"` で Interaction を作成すること
- audit メタデータが `{ kind: "note" }` であること
- `invoiceId` の設定が不変であること（relatedTo の維持）

---

## T-06: 認可マトリクスの操作名を relatedTo ベースにリネームする

> **⚠️ 原子的変更**: T-06（authorization.ts）・T-07（interactions.ts）・T-08（contracts/[id]/page.tsx・invoices/[invoiceId]/page.tsx）の計 4 ファイルの変更は**同一コミットで行うこと**。partial リネームの状態でコードが動作すると、canPerform の deny-by-default により未更新ファイルが参照する操作名は全ロールに拒否され機能停止を引き起こす。

- [x] `src/domain/authorization.ts` の `interaction` エンティティの操作名を変更する:
  - `recordContractAdjustment` → `recordContractInteraction`
  - `recordInvoiceAdjustment` → `recordInvoiceInteraction`
- [x] 権限値は維持する: 契約=`ADMIN_MANAGER_MEMBER`、請求=`ADMIN_MANAGER_FINANCE`

**Acceptance Criteria**:
- `canPerform("admin", "interaction", "recordContractInteraction")` が `true` を返すこと
- `canPerform("finance", "interaction", "recordContractInteraction")` が `false` を返すこと
- `canPerform("admin", "interaction", "recordInvoiceInteraction")` が `true` を返すこと
- `canPerform("member", "interaction", "recordInvoiceInteraction")` が `false` を返すこと
- 旧操作名 `recordContractAdjustment` / `recordInvoiceAdjustment` がコードから除去されていること

---

## T-07: Server Action の認可チェックを新操作名に追従させる

> **⚠️ 原子的変更**: T-06・T-07・T-08 の 4 ファイル変更を同一コミットで行うこと（T-06 の注記参照）。

- [x] `src/app/actions/interactions.ts` の `recordContractAdjustmentAction` 内の `canPerform(...)` 呼び出しで `"recordContractAdjustment"` → `"recordContractInteraction"` に変更する
- [x] `src/app/actions/interactions.ts` の `recordInvoiceAdjustmentAction` 内の `canPerform(...)` 呼び出しで `"recordInvoiceAdjustment"` → `"recordInvoiceInteraction"` に変更する

**Acceptance Criteria**:
- Server Action の認可チェックが新操作名を使用していること
- 認可ルール（契約=admin/manager/member、請求=admin/manager/finance）が従来どおり機能すること

---

## T-08: RSC ページの認可チェックを新操作名に追従させる

> **⚠️ 原子的変更**: T-06・T-07・T-08 の 4 ファイル変更を同一コミットで行うこと（T-06 の注記参照）。

- [x] `src/app/(dashboard)/contracts/[id]/page.tsx` の `canPerform(session!.user.role, "interaction", "recordContractAdjustment")` を `"recordContractInteraction"` に変更する
- [x] `src/app/(dashboard)/contracts/[id]/invoices/[invoiceId]/page.tsx` の `canPerform(session!.user.role, "interaction", "recordInvoiceAdjustment")` を `"recordInvoiceInteraction"` に変更する

**Acceptance Criteria**:
- 契約詳細ページで認可チェックが `recordContractInteraction` を使用していること
- 請求詳細ページで認可チェックが `recordInvoiceInteraction` を使用していること

---

## T-09: `getDealActivity` のラベルとコメントを更新する

- [x] `src/application/usecases/getDealActivity.ts` のコメント「契約・請求に紐づく顧客接点（contract_adjustment / invoice_adjustment）」を「契約・請求に紐づく顧客接点」に変更する
- [x] `targetInfoMap` 内の契約経由接点のラベル `契約調整` → `契約のやり取り` に変更する
- [x] `targetInfoMap` 内の請求経由接点のラベル `請求調整` → `請求のやり取り` に変更する
- [x] コメント「契約調整の顧客接点」→「契約に紐づく顧客接点」、「請求調整の顧客接点（invoiceId から contractId を逆引き）」→「請求に紐づく顧客接点（invoiceId から contractId を逆引き）」に変更する

**Acceptance Criteria**:
- `getDealActivity` が契約経由の接点を「契約のやり取り YYYY/MM/DD」のラベルで返すこと
- `getDealActivity` が請求経由の接点を「請求のやり取り YYYY/MM/DD」のラベルで返すこと
- コードに `contract_adjustment` / `invoice_adjustment` の文字列が残っていないこと

---

## T-10: テスト `contractAdjustment.dynamic.test.ts` を新仕様に更新する

- [x] `makeInteraction` 内の `kind: "contract_adjustment"` → `kind: "note"` に変更する
- [x] テストの assert を更新する:
  - `result.interaction.kind` の期待値を `"note"` に変更
  - `state.createArgs?.kind` の期待値を `"note"` に変更
  - `state.auditArgs?.metadata` の期待値を `{ kind: "note" }` に変更
- [x] テスト説明文の `kind=contract_adjustment` → `kind=note` に更新する

**Acceptance Criteria**:
- テストが `kind: "note"` で assert していること
- `bun test src/__tests__/usecases/contractAdjustment.dynamic.test.ts` が green であること

---

## T-11: テスト `invoiceAdjustment.dynamic.test.ts` を新仕様に更新する

- [x] `makeInteraction` 内の `kind: "invoice_adjustment"` → `kind: "note"` に変更する
- [x] テストの assert を更新する:
  - `result.interaction.kind` の期待値を `"note"` に変更
  - `state.createArgs?.kind` の期待値を `"note"` に変更
  - `state.auditArgs?.metadata` の期待値を `{ kind: "note" }` に変更
- [x] テスト説明文の `kind=invoice_adjustment` → `kind=note` に更新する

**Acceptance Criteria**:
- テストが `kind: "note"` で assert していること
- `bun test src/__tests__/usecases/invoiceAdjustment.dynamic.test.ts` が green であること

---

## T-12: テスト `interactions.dynamic.test.ts` (actions) を新仕様に更新する

- [x] `makeInteraction` 関数の引数型と内部の `kind` を `"contract_adjustment" | "invoice_adjustment"` → `"note"` に変更する（呼び出し元も `makeInteraction("note")` に統一）
- [x] テスト内の `canPerform` モック呼び出しの検証が新操作名（`recordContractInteraction` / `recordInvoiceInteraction`）に対応していることを確認する（Server Action の内部で canPerform を呼ぶため、モック側に変更は不要だが、認可不足のテストケース説明文を更新する）

**Acceptance Criteria**:
- テストが `kind: "note"` でモックデータを構築していること
- `bun test src/__tests__/actions/interactions.dynamic.test.ts` が green であること

---

## T-13: テスト `interactionByRelation.dynamic.test.ts` を新仕様に更新する

- [x] `makeInteraction` 内の `kind: "contract_adjustment"` → `kind: "note"` に変更する
- [x] 請求テストの `makeInteraction` 呼び出しで `kind: "invoice_adjustment"` → `kind: "note"` に変更する

**Acceptance Criteria**:
- テストが `kind: "note"` でモックデータを構築していること
- `bun test src/__tests__/usecases/interactionByRelation.dynamic.test.ts` が green であること

---

## T-14: テスト `interactionAuthorization.dynamic.test.ts` を新操作名に更新する

- [x] `recordContractAdjustment` → `recordContractInteraction` に変更する（テスト名・canPerform 呼び出し両方）
- [x] `recordInvoiceAdjustment` → `recordInvoiceInteraction` に変更する（テスト名・canPerform 呼び出し両方）
- [x] 各ロールの期待値が維持されていることを確認する（契約=admin/manager/member ok, finance ng、請求=admin/manager/finance ok, member ng）

**Acceptance Criteria**:
- テストが新操作名 `recordContractInteraction` / `recordInvoiceInteraction` で assert していること
- 権限値が従来どおり検証されていること
- `bun test src/__tests__/usecases/interactionAuthorization.dynamic.test.ts` が green であること

---

## T-15: テスト `dealActivity.dynamic.test.ts` を新仕様に更新する

- [x] テスト内のモックデータで `kind: "contract_adjustment"` → `kind: "note"` に変更する
- [x] テスト内のモックデータで `kind: "invoice_adjustment"` → `kind: "note"` に変更する
- [x] targetInfoMap のラベル検証を更新する:
  - `契約調整` → `契約のやり取り` を expect する
  - `請求調整` → `請求のやり取り` を expect する

**Acceptance Criteria**:
- テストが `kind: "note"` でモックデータを構築していること
- ラベルの期待値が `契約のやり取り` / `請求のやり取り` であること
- `bun test src/__tests__/usecases/dealActivity.dynamic.test.ts` が green であること

---

## T-16: 全体ビルド・テスト・型チェック確認

- [x] `bun run typecheck` が成功すること
- [x] `bun run build` が成功すること
- [x] `bun test` が全件 green であること
- [x] `bun run lint` が成功すること
- [x] コードベース全体で `contract_adjustment` / `invoice_adjustment` の文字列が残っていないことを grep で確認する（コメント・テスト説明文も含む。マイグレーション SQL 内の UPDATE 文は例外。監査ログの過去データに関する注記を除く）
- [x] コードベース全体で旧認可操作名 `recordContractAdjustment` / `recordInvoiceAdjustment` の文字列が残っていないことを grep で確認する（`authorization.ts`・`interactions.ts`・`contracts/[id]/page.tsx`・`invoices/[invoiceId]/page.tsx` の 4 ファイルを重点的に確認する。partial リネームの場合、canPerform の deny-by-default によりその操作は全ロールに拒否される）

**Acceptance Criteria**:
- typecheck / build / test / lint 全て成功
- `contract_adjustment` / `invoice_adjustment` がソースコードから除去されていること（マイグレーション SQL 内の UPDATE 文は例外）
- `recordContractAdjustment` / `recordInvoiceAdjustment` がソースコードから除去されていること
