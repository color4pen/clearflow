# Tasks: interaction-contract-invoice

## T-01: interactionRepository に findAllByContract / findAllByInvoice を追加

- [x] `src/infrastructure/repositories/interactionRepository.ts` に `findAllByContract(contractId, organizationId)` を追加。`interactions.contractId` と `interactions.organizationId` で絞り込み、`desc(interactions.date)` で返す
- [x] 同ファイルに `findAllByInvoice(invoiceId, organizationId)` を追加。`interactions.invoiceId` と `interactions.organizationId` で絞り込み、`desc(interactions.date)` で返す
- [x] 戻り値型は `Promise<Interaction[]>`（既存の `findAllByDeal` / `findAllByInquiry` と同じ）

**Acceptance Criteria**:
- `findAllByContract` が `contractId` 一致かつ `organizationId` 一致の Interaction を date 降順で返す
- `findAllByInvoice` が `invoiceId` 一致かつ `organizationId` 一致の Interaction を date 降順で返す
- 該当なしの場合は空配列を返す

## T-02: authorization.ts に interaction エンティティの認可ルールを追加

- [x] `Entity` 型に `"interaction"` を追加
- [x] `PERMISSION_MATRIX` に `interaction` エンティティを追加。操作: `recordContractAdjustment` = `["admin", "manager", "member"]`、`recordInvoiceAdjustment` = `["admin", "manager", "finance"]`
- [x] 既存の `canPerform` 関数は変更不要（マトリクス追加のみで動作する）

**Acceptance Criteria**:
- `canPerform("admin", "interaction", "recordContractAdjustment")` → `true`
- `canPerform("manager", "interaction", "recordContractAdjustment")` → `true`
- `canPerform("member", "interaction", "recordContractAdjustment")` → `true`
- `canPerform("finance", "interaction", "recordContractAdjustment")` → `false`
- `canPerform("admin", "interaction", "recordInvoiceAdjustment")` → `true`
- `canPerform("manager", "interaction", "recordInvoiceAdjustment")` → `true`
- `canPerform("finance", "interaction", "recordInvoiceAdjustment")` → `true`
- `canPerform("member", "interaction", "recordInvoiceAdjustment")` → `false`

## T-03: createContractAdjustment usecase を作成

- [x] `src/application/usecases/createContractAdjustment.ts` を新規作成
- [x] 入力: `{ contractId, organizationId, actorId, summary, date?, details? }`
- [x] `contractRepository.findById(contractId, organizationId)` で契約の存在・所属を検証。見つからなければ `{ ok: false, reason: "契約が見つかりません" }`
- [x] `db.transaction` 内で `interactionRepository.create({ organizationId, kind: "contract_adjustment", contractId, date: date ?? new Date(), summary, details: details ?? null, attendees: [], actionItems: [], createdById: actorId })` を呼ぶ
- [x] 同トランザクション内で `recordAudit({ action: "interaction.create", targetType: "interaction", targetId, actorId, organizationId, metadata: { kind: "contract_adjustment" } })` を記録
- [x] 戻り値: `{ ok: true, interaction: Interaction } | { ok: false, reason: string }`
- [x] `src/application/usecases/index.ts` に export を追加

**Acceptance Criteria**:
- 契約が存在する場合、`kind=contract_adjustment`・`contractId` 設定の Interaction が作成される
- `interaction.create` 監査ログに `metadata.kind=contract_adjustment` が記録される
- 契約が見つからない場合は `ok: false` が返る

## T-04: createInvoiceAdjustment usecase を作成

- [x] `src/application/usecases/createInvoiceAdjustment.ts` を新規作成
- [x] 入力: `{ invoiceId, organizationId, actorId, summary, date?, details? }`
- [x] `invoiceRepository.findById(invoiceId, organizationId)` で請求の存在・所属を検証。見つからなければ `{ ok: false, reason: "請求が見つかりません" }`
- [x] `db.transaction` 内で `interactionRepository.create({ organizationId, kind: "invoice_adjustment", invoiceId, date: date ?? new Date(), summary, details: details ?? null, attendees: [], actionItems: [], createdById: actorId })` を呼ぶ
- [x] 同トランザクション内で `recordAudit({ action: "interaction.create", targetType: "interaction", targetId, actorId, organizationId, metadata: { kind: "invoice_adjustment" } })` を記録
- [x] 戻り値: `{ ok: true, interaction: Interaction } | { ok: false, reason: string }`
- [x] `src/application/usecases/index.ts` に export を追加

**Acceptance Criteria**:
- 請求が存在する場合、`kind=invoice_adjustment`・`invoiceId` 設定の Interaction が作成される
- `interaction.create` 監査ログに `metadata.kind=invoice_adjustment` が記録される
- 請求が見つからない場合は `ok: false` が返る

## T-05: listInteractionsByContract / listInteractionsByInvoice usecase を作成

- [x] `src/application/usecases/listInteractionsByContract.ts` を新規作成。`interactionRepository.findAllByContract` を呼ぶだけの薄いラッパー
- [x] `src/application/usecases/listInteractionsByInvoice.ts` を新規作成。`interactionRepository.findAllByInvoice` を呼ぶだけの薄いラッパー
- [x] `src/application/usecases/index.ts` に export を追加

**Acceptance Criteria**:
- `listInteractionsByContract(contractId, organizationId)` が `findAllByContract` の結果を返す
- `listInteractionsByInvoice(invoiceId, organizationId)` が `findAllByInvoice` の結果を返す

## T-06: Server Action（recordContractAdjustmentAction / recordInvoiceAdjustmentAction）を作成

- [x] `src/app/actions/interactions.ts` を新規作成（`"use server"` 宣言）
- [x] `recordContractAdjustmentAction`: auth 認証 → `canPerform(role, "interaction", "recordContractAdjustment")` 認可 → zod 検証（`contractId: z.string().uuid()`, `summary: z.string().min(1)`, `date: z.string().optional()`, `details: z.string().optional()`）→ `createContractAdjustment` usecase 呼び出し → `revalidatePath`
- [x] `recordInvoiceAdjustmentAction`: auth 認証 → `canPerform(role, "interaction", "recordInvoiceAdjustment")` 認可 → zod 検証（`invoiceId: z.string().uuid()`, `contractId: z.string().uuid()`, `summary: z.string().min(1)`, `date: z.string().optional()`, `details: z.string().optional()`）→ `createInvoiceAdjustment` usecase 呼び出し → `revalidatePath`
- [x] エラー時は `{ message: string }` を返す。成功時は `{}` を返す

**Acceptance Criteria**:
- 未認証ユーザーは「認証が必要です」を受ける
- 認可不足のユーザーは「この操作を実行する権限がありません」を受ける
- バリデーション失敗時は field-level errors を返す
- 成功時は usecase を呼び出し、関連パスの revalidation を行う

## T-07: 契約詳細ページに契約調整セクションを追加

- [x] `src/app/(dashboard)/contracts/[id]/ContractInteractionSection.tsx` を新規作成（`"use client"` コンポーネント）
- [x] Props: `contractId: string`、`interactions: Interaction[]`、`canRecord: boolean`
- [x] やり取り一覧: interactions を日時・要約で表示。空の場合は「やり取りはまだありません」
- [x] 記録フォーム（`canRecord` が true の場合のみ表示）: 日時（任意、デフォルト今日）・要約（必須）・メモ（任意）。`useActionState` で `recordContractAdjustmentAction` を呼ぶ
- [x] `src/app/(dashboard)/contracts/[id]/page.tsx` を修正: `listInteractionsByContract` で顧客接点を取得し、`ContractInteractionSection` を右カラムに追加（InvoiceSection の下）。`canRecord` は `canPerform(role, "interaction", "recordContractAdjustment")` で判定

**Acceptance Criteria**:
- 契約詳細ページに「契約調整（やり取り）」セクションが表示される
- 契約に紐づく contract_adjustment の顧客接点が新しい順に表示される
- 権限を持つユーザーに記録フォームが表示され、送信すると顧客接点が記録される

## T-08: 請求詳細ページに請求調整セクションを追加

- [x] `src/app/(dashboard)/contracts/[id]/invoices/[invoiceId]/InvoiceInteractionSection.tsx` を新規作成（`"use client"` コンポーネント）
- [x] Props: `invoiceId: string`、`contractId: string`、`interactions: Interaction[]`、`canRecord: boolean`
- [x] やり取り一覧と記録フォーム（T-07 と同様の構造、action は `recordInvoiceAdjustmentAction`）
- [x] `src/app/(dashboard)/contracts/[id]/invoices/[invoiceId]/page.tsx` を修正: `listInteractionsByInvoice` で顧客接点を取得し、`InvoiceInteractionSection` を表示。`canRecord` は `canPerform(role, "interaction", "recordInvoiceAdjustment")` で判定

**Acceptance Criteria**:
- 請求詳細ページに「請求調整（やり取り）」セクションが表示される
- 請求に紐づく invoice_adjustment の顧客接点が新しい順に表示される
- 権限を持つユーザーに記録フォームが表示され、送信すると顧客接点が記録される

## T-09: getDealActivity にて契約・請求経由の顧客接点をタイムラインに統合

- [x] `src/application/usecases/getDealActivity.ts` を修正
- [x] 既存の contracts / invoices 取得後、`interactionRepository.findAllByContract` / `findAllByInvoice` を `Promise.all` で並列呼び出し
- [x] 取得した顧客接点を targets に `{ targetType: "interaction", targetId }` として追加
- [x] `targetInfoMap` に顧客接点のラベル（kind のラベル + 日付）と href（契約詳細 or 請求詳細のページ）を登録

**Acceptance Criteria**:
- `getDealActivity` の `targets` に契約経由の顧客接点の `{ targetType: "interaction", targetId }` が含まれる
- `getDealActivity` の `targets` に請求経由の顧客接点の `{ targetType: "interaction", targetId }` が含まれる
- `targetInfoMap` に対応するラベル・href が登録される

## T-10: テスト（usecase・repository・認可・タイムライン統合）

- [x] `src/__tests__/usecases/contractAdjustment.dynamic.test.ts` を新規作成
  - `createContractAdjustment` で `kind=contract_adjustment`・`contractId` 設定の Interaction が作成されることを検証
  - 監査ログが `interaction.create` / `metadata.kind=contract_adjustment` で記録されることを検証
  - 契約が見つからない場合に `ok: false` が返ることを検証
- [x] `src/__tests__/usecases/invoiceAdjustment.dynamic.test.ts` を新規作成
  - `createInvoiceAdjustment` で `kind=invoice_adjustment`・`invoiceId` 設定の Interaction が作成されることを検証
  - 監査ログが `interaction.create` / `metadata.kind=invoice_adjustment` で記録されることを検証
  - 請求が見つからない場合に `ok: false` が返ることを検証
- [x] `src/__tests__/usecases/interactionByRelation.dynamic.test.ts` を新規作成
  - `findAllByContract` / `findAllByInvoice` の正常取得・空配列を検証
- [x] `src/__tests__/usecases/interactionAuthorization.dynamic.test.ts` を新規作成
  - `canPerform` で `interaction` / `recordContractAdjustment` の admin/manager/member → true、finance → false を検証
  - `canPerform` で `interaction` / `recordInvoiceAdjustment` の admin/manager/finance → true、member → false を検証
- [x] `src/__tests__/usecases/dealActivity.dynamic.test.ts` に契約・請求経由の顧客接点がタイムラインに含まれるテストケースを追加
- [x] `mock.module` 方式で実行テスト（ソース静的検査を使わない）
- [x] 既存テスト無変更で `bun test` green / `typecheck` / `bun run build` 成功を確認

**Acceptance Criteria**:
- 全受け入れ基準がテストでカバーされている
- `bun test` が全件 green
- `bun run typecheck` が成功
- `bun run build` が成功
- 既存テストに変更がない（dealActivity.dynamic.test.ts への追加を除く）
