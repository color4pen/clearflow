# Code Review Feedback — iteration 001

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
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | medium | testing | `src/__tests__/mcp/mcpInvoices.dynamic.test.ts` | **TC-016 未実装**: 将来日付の paidAt 拒否テストが存在しない。invoices.ts 206-213 行の JST バリデーション（paidAt > todayJST → toToolError）を実行検証するテストがなく、将来のリグレッションを検知できない。test-cases.md priority: must。実装コードは正しく動作している | paidAt: "2099-12-31" で update_status を呼び、isError: true かつ updateInvoiceStatus usecase が呼ばれないことを assert するテストを追加する | yes |
| 2 | medium | testing | `src/__tests__/mcp/mcpContracts.dynamic.test.ts` | **TC-038 未実装**: contracts update の null vs undefined 区別を実行検証するテストがない。design D7「null（クリア）と undefined（変更なし）を区別する」と request.md「実装上の必須事項 4」で明示要求。contracts.ts 164-174 行の実装は正しいが将来の退行検知テストが不在 | endDate: null と contractType 省略で update を呼び、usecase 引数の endDate === null、contractType === undefined を assert する（TC-038 GIVEN/WHEN/THEN に従う） | yes |
| 3 | medium | testing | `src/__tests__/mcp/mcpInvoices.dynamic.test.ts` | **TC-039 未実装**: invoices update の null vs undefined 区別を実行検証するテストがない。F-02 と同様の問題。invoices.ts 163-173 行の実装は正しいが将来の退行検知テストが不在 | notes: null と issueDate 省略で update を呼び、usecase 引数の notes === null、issueDate === undefined を assert する（TC-039 GIVEN/WHEN/THEN に従う） | yes |
| 4 | low | testing | `src/__tests__/mcp/` | **基本操作シナリオ 16 件未実装（test-cases.md priority: must）**: TC-001〜TC-003, TC-005〜TC-007（contracts 基本 CRUD）、TC-009〜TC-011, TC-013, TC-017（invoices 基本操作）、TC-022〜TC-023（revenue_targets 基本操作）。happy-path の成功ケースおよび usecase 呼び出し引数検証が不在。T-09/T-12 テストで implicit なカバレッジはある | 各ツールの基本 operation について、usecase が正しい引数で呼ばれること・成功結果が返ることを assert するテストを追加する。実装は正しいためパターン追加のみ | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 9 | 0.10 |
| testing | 5 | 0.10 |

- **total**: 8.60

## Summary

### 実装品質

実装は全般的に高品質。mcp-server-core で確立したパターンを正しく踏襲しており、特に以下の点が優れている。

**D10 catch ブロック固定文言化** — createContract / updateContract / updateContractStatus / deleteContract / updateInvoiceStatus / setRevenueTarget / updateRevenueTarget / deleteRevenueTarget の 8 ファイル全てで err.message 素通しから固定文言に変更済み。createInvoice / updateInvoice は設計通り err.message パターン維持（SERIALIZABLE トランザクション内の業務エラーを伝達するため）。

**null / undefined 区別** — contracts.update（endDate / contractType / paymentTerms / renewalCycle）・invoices.update（issueDate / notes）・invoices.create（issueDate）の nullable/optional フィールド全てで実装が正確。

**テナント分離** — 全 4 ツールで organizationId は authInfo.extra からのみ取得。Zod スキーマに organizationId フィールドが存在しない。

**認可** — canPerform による権限チェックが全 operation でハンドラ経路（usecase 呼び出し前）に実装済み。revenue.setTarget は finance ロールを含まない（admin/manager のみ）ことも正しく反映。

**paidAt JST バリデーション** — Intl.DateTimeFormat('sv', { timeZone: 'Asia/Tokyo' }) による YYYY-MM-DD 文字列比較で将来日付を正しく拒否。

**request.md 受け入れ基準テスト（T-06〜T-13）** — 全 8 件が behavioral test として実装済み。バレルモックなし・afterAll 復元あり・個別ファイルモックの方針を遵守。

### テスト不足の詳細

test-cases.md に定義された 35 件の自動 "must" テストのうち 16 件（46%）が未実装。

F-01（TC-016）・F-02（TC-038）・F-03（TC-039）は設計書で明示された edge case の実行検証であり、他テストで代替不能なため medium 判定とした。実装コードは正しく動作しているため、修正はテスト追加のみで対応可能。

F-04（基本操作）は既存の T-09/T-12 テストが各ツールを経由するため implicit なカバレッジはあるが、戻り値構造や usecase 引数の正確性を検証するテストが不足している。
