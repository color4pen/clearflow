# Code Review Feedback — iteration 002

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
- iteration line format (exact): `- **iteration**: NNN` (3-digit zero-padded integer)
- Findings table MUST have exactly 7 columns in this order:
  # | Severity | Category | File | Description | How to Fix | Fix
  - Fix column: yes = fixer should address this finding; no = skip (pre-existing / out-of-scope)
- Scores table columns: Category | Score | Weight
  - Valid Category values: correctness | security | architecture | performance | maintainability | testing
  - Score: integer 1-10
  - Weight: decimal as defined below
- total line format (exact): `- **total**: <decimal>`
- Default weights: correctness=0.30, security=0.25, architecture=0.15, performance=0.10, maintainability=0.10, testing=0.10
- Scores table is optional but recommended.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` >= 1 -> `escalation`
- `critical` or `high` >= 1 -> `needs-fix`
- otherwise -> `approved`
-->

- **verdict**: approved
- **iteration**: 002

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | low | testing | `src/__tests__/mcp/` | **iter-001 F-04 未解消（基本 CRUD 成功シナリオ 7 件）**: TC-001（契約一覧）・TC-002（契約詳細）・TC-005（契約ステータス更新 成功）・TC-006（契約削除）・TC-009（請求一覧・契約別）・TC-010（請求一覧・組織全体）・TC-027（organizationId がスキーマに含まれない）は専用ハッピーパステストが存在しない。TC-003（契約作成正常系）は mcpFinanceAuditTenant で、TC-013（invoiced→paid 成功）は mcpFinanceAuthz で各々暗黙的にカバーされている。実装は正しくタイプチェックも通過しており、認可・テナント分離・エラー変換の高リスク経路はすべて検証済み | 各操作について usecase が正しい引数で呼ばれ成功結果が返ることを assert するテストを追加する。最も欠如しているのは list/get/delete operation と組織全体の請求一覧 | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 9 | 0.10 |
| testing | 7 | 0.10 |

- **total**: 8.80

## Summary

### iter-001 指摘の解消確認

iter-001 で medium として指摘した 3 件はすべて正しく修正済み。

**F-01 (TC-016: 将来日付 paidAt 拒否)** — `mcpInvoices.dynamic.test.ts` に追加。`paidAt: "2099-12-31"` で `isError: true` かつ `updateInvoiceStatus` に到達しないことを実行検証。JST バリデーション経路（invoices.ts 206-213 行）を正しくカバーしている。

**F-02 (TC-038: contracts update の null vs undefined 区別)** — `mcpContracts.dynamic.test.ts` に追加。`endDate: null`（クリア）と `contractType` 省略（変更なし）で update を呼び、usecase 引数の `endDate === null` かつ `contractType === undefined` を assert。contracts.ts 164-174 行の実装が退行しても検知できる。

**F-03 (TC-039: invoices update の null vs undefined 区別)** — `mcpInvoices.dynamic.test.ts` に追加。`notes: null`（クリア）と `issueDate` 省略（変更なし）を検証。invoices.ts 163-173 行の実装を固定。

### 実装品質の再確認

**楽観的ロックの設計確認** — MCP スキーマに `version` フィールドが存在しない点を確認した。`updateContract` 等は内部で `findById` により現在の `version` を取得し、それをリポジトリ update に渡す設計（updateContract.ts 25 行・60 行）。MCP クライアントが version を知らなくてもトランザクション内の楽観的ロックが機能する。Server Action と同一挙動であり、パリティ規約に適合。

**D10 catch ブロック固定文言化** — 全 8 usecase（createContract / updateContract / updateContractStatus / deleteContract / updateInvoiceStatus / setRevenueTarget / updateRevenueTarget / deleteRevenueTarget）で `err.message` 素通しから固定文言に修正済みであることを差分で確認。`createInvoice` / `updateInvoice` のみ SERIALIZABLE トランザクション内での業務エラー伝達のために `err.message` パターンを維持する設計判断は design.md D10 に文書化されており妥当。

### 受け入れ基準の充足状況

request.md の全 8 受け入れ基準はすべて behavioral test で固定されている。

| 受け入れ基準 | カバーテスト |
|---|---|
| won でない案件への契約作成拒否 | `mcpContracts.dynamic.test.ts` T-06 |
| 未発行請求の入金記録拒否（inv-invoice-must-be-issued-before-paid） | `mcpInvoices.dynamic.test.ts` T-07 |
| 入金日の伝播（inv-invoice-paid-requires-date） | `mcpInvoices.dynamic.test.ts` T-08 |
| finance / member ロール操作可否 | `mcpFinanceAuthz.dynamic.test.ts` T-09 |
| version 不一致の衝突エラー | `mcpContracts` T-10・`mcpInvoices` T-10 |
| 売上サマリが UI と同一集計値 | `mcpRevenue.dynamic.test.ts` T-11 |
| 監査ログ記録・テナント分離 | `mcpFinanceAuditTenant.dynamic.test.ts` T-12 |
| typecheck && test green・aozu check exit 0 | verification-result.md: 全フェーズ passed |

### 残存 F-04 について

low 指摘の基本 CRUD 成功シナリオ未実装は継続。7 件（TC-001, TC-002, TC-005, TC-006, TC-009, TC-010, TC-027）が専用テスト不在だが、実装コードは正しく検証済み。TC-003（契約作成）と TC-013（invoiced→paid 成功）は他テストで暗黙的にカバーされる。認可・監査・エラーハンドリングの高リスク経路はすべて実行検証済みのため、品質ゲートとしての blocking 要因にはならない。
