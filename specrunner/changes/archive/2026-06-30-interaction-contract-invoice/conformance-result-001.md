# Conformance Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:   implementation conforms to tasks.md, design.md, spec.md, and request.md
  - needs-fix:  one or more upstream artifacts are not satisfied by the implementation
  - escalation: conformance cannot be determined (missing artifacts, unresolvable ambiguity)
- The Findings table records the per-artifact judgment.
-->

- **verdict**: approved

## Conformance Findings

| Artifact | Conforms | Notes |
|----------|----------|-------|
| tasks.md | ✅ yes | T-01〜T-10 の全チェックボックスが [x] 完了。実装ファイルとの突合でも欠落なし |
| design.md | ✅ yes | D1〜D5 すべて適合（usecase 分離・認可追加・action 統合・タイムライン統合・クライアントコンポーネント分離） |
| spec.md | ✅ yes | 全 8 Requirements（SHALL/MUST）および全 Scenarios が実装で満たされている |
| request.md | ✅ yes | 全受け入れ基準が動的テスト（mock.module 方式）で固定。build/typecheck/test/lint all green |

---

## Detail

### tasks.md — 全タスク完了確認

| Task | チェック状態 | 対応ファイル |
|------|------------|------------|
| T-01 findAllByContract / findAllByInvoice 追加 | [x] 全項目 | `interactionRepository.ts` L198-228 |
| T-02 authorization.ts `interaction` エンティティ追加 | [x] 全項目 | `authorization.ts` L15, L145-148 |
| T-03 createContractAdjustment usecase | [x] 全項目 | `createContractAdjustment.ts` |
| T-04 createInvoiceAdjustment usecase | [x] 全項目 | `createInvoiceAdjustment.ts` |
| T-05 listInteractionsByContract / listInteractionsByInvoice | [x] 全項目 | 各 usecase ファイル・index.ts |
| T-06 Server Action（recordContractAdjustmentAction / recordInvoiceAdjustmentAction） | [x] 全項目 | `actions/interactions.ts` |
| T-07 ContractInteractionSection + contracts/[id]/page.tsx 修正 | [x] 全項目 | `ContractInteractionSection.tsx`・`page.tsx` |
| T-08 InvoiceInteractionSection + invoices/[invoiceId]/page.tsx 修正 | [x] 全項目 | `InvoiceInteractionSection.tsx`・`page.tsx` |
| T-09 getDealActivity タイムライン統合 | [x] 全項目 | `getDealActivity.ts` L46-67, L113-138 |
| T-10 テスト追加（5 ファイル） | [x] 全項目 | `contractAdjustment.dynamic.test.ts` / `invoiceAdjustment.dynamic.test.ts` / `interactionByRelation.dynamic.test.ts` / `interactionAuthorization.dynamic.test.ts` / `dealActivity.dynamic.test.ts`（追加） |

### design.md — 設計判断適合確認

- **D1（usecase 分離）**: `createContractAdjustment` / `createInvoiceAdjustment` は独立ファイルで実装。meeting 固有ロジック（meetingType・hearingData 強制 null 化）は含まれていない ✅
- **D2（`interaction` エンティティ認可）**: `Entity` 型に `"interaction"` を追加。`recordContractAdjustment: ADMIN_MANAGER_MEMBER`・`recordInvoiceAdjustment: ADMIN_MANAGER_FINANCE` が `PERMISSION_MATRIX` に登録済み ✅
- **D3（`interactions.ts` に action 統合）**: `src/app/actions/interactions.ts` に両 action を集約。`"use server"` 宣言あり ✅
- **D4（getDealActivity 内で並列取得）**: `Promise.all` で `contractInteractions` / `invoiceInteractions` を並列取得し、targets・targetInfoMap に追加 ✅
- **D5（クライアントコンポーネント分離）**: `ContractInteractionSection.tsx` / `InvoiceInteractionSection.tsx` に `"use client"` 宣言。データ取得は親 RSC（page.tsx）で実施 ✅

### spec.md — Requirements / Scenarios 適合確認

**Requirement 1（contract_adjustment 作成）**:
- Scenario「Recording a contract adjustment creates an Interaction」: `createContractAdjustment` が `kind=contract_adjustment`・`contractId` を設定し、監査ログ `interaction.create` / `metadata.kind=contract_adjustment` を同一 transaction 内で記録する ✅
- Scenario「Contract adjustment requires contractId」: zod `z.string().uuid()` でバリデーション（action 層） ✅
- Scenario「Contract adjustment requires an existing contract」: `contractRepository.findById` で存在検証 → `ok: false` を返す ✅

**Requirement 2（invoice_adjustment 作成）**:
- Scenario「Recording an invoice adjustment creates an Interaction」: `createInvoiceAdjustment` が `kind=invoice_adjustment`・`invoiceId` を設定し、監査ログ記録 ✅
- Scenario「Invoice adjustment requires invoiceId」: zod バリデーション ✅
- Scenario「Invoice adjustment requires an existing invoice」: `invoiceRepository.findById` で検証 ✅

**Requirement 3（一覧取得）**:
- `findAllByContract`: `eq(interactions.contractId, contractId) AND eq(interactions.organizationId, organizationId)` / `desc(interactions.date)` ✅
- `findAllByInvoice`: 同上（invoiceId 条件） ✅
- 空配列返却: 実装上問題なし ✅

**Requirement 4（contract_adjustment 認可: admin/manager/member）**:
- `canPerform("finance", "interaction", "recordContractAdjustment") === false` ✅

**Requirement 5（invoice_adjustment 認可: admin/manager/finance）**:
- `canPerform("member", "interaction", "recordInvoiceAdjustment") === false` ✅

**Requirement 6（案件タイムライン統合）**:
- contracts / invoices 取得後、`findAllByContract` / `findAllByInvoice` を並列呼び出し。取得結果を `{ targetType: "interaction", targetId: i.id }` として `targets` に追加。`targetInfoMap` にラベル（"契約調整 yyyy/MM/dd" / "請求調整 yyyy/MM/dd"）と href を登録 ✅

**Requirement 7（契約詳細ページ）**:
- `ContractInteractionSection`（h2="契約調整（やり取り）"・空時メッセージ・記録フォーム）が右カラムに配置 ✅

**Requirement 8（請求詳細ページ）**:
- `InvoiceInteractionSection`（h2="請求調整（やり取り）"・空時メッセージ・記録フォーム）が配置 ✅

### request.md — 受け入れ基準確認

| 基準 | テストファイル | 方式 | 状態 |
|------|-------------|------|------|
| 契約調整の記録（kind・contractId・監査ログ） | `contractAdjustment.dynamic.test.ts` | mock.module 実行テスト | ✅ |
| 請求調整の記録（kind・invoiceId・監査ログ） | `invoiceAdjustment.dynamic.test.ts` | mock.module 実行テスト | ✅ |
| findAllByContract / findAllByInvoice 一覧取得 | `interactionByRelation.dynamic.test.ts` | mock.module 実行テスト | ✅ |
| 認可ルール（contract_adjustment / invoice_adjustment） | `interactionAuthorization.dynamic.test.ts` | canPerform 直接実行 | ✅ |
| getDealActivity タイムライン統合 | `dealActivity.dynamic.test.ts`（追加） | mock.module 実行テスト | ✅ |
| bun test green / typecheck / bun run build 成功 | `verification-result.md` | all passed（1560 pass / 0 fail） | ✅ |
| 依存方向遵守（actions → usecases → domain / infra） | ソース確認 | actions → usecases → repositories | ✅ |

### code-review findings の解消状況

code-review-001.md で指摘された 3 件は code-fixer（iteration 2）で解消済み:
- **Finding 1（medium: details フィールド保存されない）**: `data.details != null` 時に HearingData `{ notes: data.details, ... }` としてマッピングし repository に渡す実装に修正済み。テスト（「details を指定した場合 notes フィールドとして repository に渡される」）で固定済み ✅
- **Finding 2（low: Server Action テスト不足）**: `src/__tests__/actions/interactions.dynamic.test.ts`（355 行）が追加済み。未認証・認可拒否・成功時の revalidatePath を動的テストで固定 ✅
- **Finding 3（low: getDealActivity null チェック）**: `i.contractId ? ... : "/contracts"` / `relatedInvoice && i.invoiceId ? ... : "/contracts"` フォールバックで対処済み ✅
