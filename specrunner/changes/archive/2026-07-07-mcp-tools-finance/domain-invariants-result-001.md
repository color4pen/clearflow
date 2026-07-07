# Domain Invariants Review — mcp-tools-finance — iter 1

- **verdict**: approved
- **iteration**: 001
- **reviewer**: domain-invariants
- **purpose**: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。

## Findings

| # | Severity | Category | Invariant | File | Description | Verdict Impact |
|---|----------|----------|-----------|------|-------------|---------------|
| 1 | info | tenant-isolation | inv-all-tenant-scoped | all tools | organizationId は全 4 ツールで authInfo.extra からのみ取得。Zod スキーマに organizationId フィールドが存在しないことを確認。悪意ある呼び出し側がツール引数で organizationId を上書きする経路なし | none |
| 2 | info | audit-log | 監査完全性 | all write usecases | 書き込み操作 10 件すべて（createContract / updateContract / updateContractStatus / deleteContract / updateInvoiceStatus / createInvoice / updateInvoice / setRevenueTarget / updateRevenueTarget / deleteRevenueTarget）が DB トランザクション内で recordAudit を呼ぶ。revenue ツールは読み取り専用のため監査不要 | none |
| 3 | info | approval-gate | inv-system-approval-blocks-action | createContract.ts, updateContractStatus.ts | contract.create / contract.cancel（cancel は cancelled 遷移）の承認ゲートが未配線。これは既存 Server Action と同一挙動であり、本変更が導入した退行ではない。design D9 に明文化。承認ゲート配線は後続 request のスコープ | none — pre-existing, documented |
| 4 | info | domain-rule | inv-contract-requires-won-deal | createContract.ts | deal.phase !== "won" を usecase が検証し { ok: false } を返す。MCP ツールは toToolError(result.reason) でそのまま isError: true に変換。T-06 で実行検証済み | none |
| 5 | info | domain-rule | inv-invoice-must-be-issued-before-paid | invoiceTransition.ts | VALID_INVOICE_TRANSITIONS.scheduled = ["invoiced"] — scheduled→paid は拒否される。updateInvoiceStatus usecase が validateInvoiceTransition を呼ぶ。T-07 で実行検証済み | none |
| 6 | info | domain-rule | term-terminal-state | invoiceTransition.ts | VALID_INVOICE_TRANSITIONS.paid = [] — paid は終端状態で追加遷移なし。domain service レベルで保護 | none |
| 7 | info | domain-rule | term-optimistic-lock | updateContract.ts, updateContractStatus.ts, updateInvoice.ts, updateInvoiceStatus.ts, updateRevenueTarget.ts | 各 usecase が findById で version を取得し、repository update で DB 側 version チェック。不一致時は null 返却 → "...画面を更新してください" reason → toToolError 経由 isError: true。MCP スキーマに version フィールドがない点は Server Action パリティ（内部で version を管理する設計）。T-10 で実行検証済み | none |
| 8 | info | domain-rule | inv-invoice-paid-requires-date | updateInvoiceStatus.ts, invoices.ts | paidAt は MCP 層で optional（usecase がデフォルト new Date() を補完）。将来日付は invoices.ts 206-213 行の JST バリデーションで拒否。TC-016 で実行検証済み | none |

## Invariant Verification Summary

### テナント分離（inv-all-tenant-scoped）

**検証結果: ✅ PASS**

- `contracts.ts` L93: `const { userId, organizationId, role } = auth;` — authInfo 由来
- `invoices.ts` L81: 同パターン
- `revenue.ts` L57: 同パターン
- `revenueTargets.ts` L60: 同パターン
- 全 usecase 呼び出しで `organizationId` を引数として渡す
- Repository 操作は `(id, organizationId)` の 2 引数でスコープ（例: `contractRepository.findById(data.contractId, data.organizationId)`）
- `mcpFinanceAuditTenant.dynamic.test.ts` で org-A / org-B 分離を実行検証（T-12）

### 監査ログの完全性

**検証結果: ✅ PASS**

全書き込み usecase の recordAudit 呼び出しを確認:

| Usecase | action | トランザクション内 |
|---------|--------|------------------|
| createContract | contract.create | ✅ |
| updateContract | contract.update | ✅ |
| updateContractStatus | contract.updateStatus | ✅ |
| deleteContract | contract.delete | ✅ |
| createInvoice | invoice.create | ✅ |
| updateInvoice | invoice.update | ✅ |
| updateInvoiceStatus | invoice.update_status | ✅ |
| setRevenueTarget | revenue_target.create | ✅ |
| updateRevenueTarget | revenue_target.update | ✅ |
| deleteRevenueTarget | revenue_target.delete | ✅ |

`mcpFinanceAuditTenant.dynamic.test.ts` T-12 では organizationId・actorId の usecase への伝播を実行検証し、usecase 内で recordAudit が呼ばれることを間接保証。

### 承認ワークフロー不変条件（inv-system-approval-blocks-action）

**検証結果: ✅ PASS（退行なし）**

- `contract.create` および `contract.cancel`（updateContractStatus で status=cancelled）は承認ポリシー定数（`contract.create`, `contract.cancel`）に登録済みだが usecase 側で `evaluatePolicies` が呼ばれていない
- これは本変更が導入した退行ではない — 既存 Server Action（`src/app/actions/contracts.ts`）も同様に未配線
- 本変更は既存 usecase をそのまま呼び出す構造のため、Server Action と完全に同一挙動
- design D9 に「承認ゲート配線は後続 request の対象」として明文化
- MCP ツールが独自に承認ゲートをバイパスする新たな経路を追加していないことを確認

### ドメインルール不変条件

**検証結果: ✅ PASS**

- `inv-contract-requires-won-deal`: createContract usecase が deal.phase チェック → T-06 実行検証
- `inv-contract-requires-amount`: Zod schema（positive integer）+ validateContractAmount で二重保護
- `inv-contract-date-order`: validateContractDates で保護（createContract / updateContract）
- `inv-invoice-must-be-issued-before-paid`: validateInvoiceTransition → T-07 実行検証
- `inv-invoice-paid-requires-date`: paidAt 省略は usecase デフォルト (new Date()) で対処、将来日付は JST チェックで拒否 → TC-016 実行検証
- `inv-invoice-date-order`: createInvoice / updateInvoice usecase 内で保護
- `inv-invoice-sum-within-contract`: createInvoice usecase の SERIALIZABLE トランザクション内で金額超過チェック
- `term-optimistic-lock`: 全 update 系 usecase で version チェック → T-10 実行検証
- `term-terminal-state`: paid の VALID_INVOICE_TRANSITIONS = [] で保護

## 総合判断

本変更はマルチテナント SaaS における経理系 MCP ツールの追加であり、以下の点でドメイン不変条件を正しく維持している:

1. **テナント分離**: `organizationId` の唯一の取得源が `authInfo.extra` であることを全ツールで確認。ツール引数スキーマに `organizationId` が存在しないため、クライアントによるテナント偽装経路がない。

2. **監査ログ完全性**: 全 10 件の書き込み usecase で `recordAudit` が DB トランザクション内で呼ばれることを確認。レコード作成・更新・削除の全操作が監査対象。

3. **承認ワークフロー**: 本変更が承認ゲートをバイパスする新たな経路を追加していないことを確認。`contract.create` / `contract.cancel` の未配線は既存コードベースからの継承であり、本変更の退行ではない。設計書 D9 に適切に文書化。

4. **ドメインルール**: 契約・請求に関する全ての不変条件（won 必須・金額必須・日付順序・遷移ルール・楽観的ロック・終端状態）が既存 usecase / domain service によって保護されており、MCP ツールはそれらを直接呼び出すことでパリティを確保。
