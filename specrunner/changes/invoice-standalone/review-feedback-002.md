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
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: needs-fix
- **iteration**: 002

## Changes Since Iteration 001

iteration 001 から iteration 002 の間にソースコード変更はなし。`src/__tests__/domain/invoiceTransition.test.ts` に TC-007（overdue→paid 許可）/ TC-008（overdue→invoiced 拒否）/ TC-009（paid→overdue 拒否）の 3 件が追加されているが、これは implementer が最初から生成したブランチの変更であり、code-fixer による修正ではない。iteration 001 の 4 件の finding はいずれも未修正のまま。

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | HIGH | Bug | src/app/actions/invoices.ts:29-32, src/app/(dashboard)/contracts/[id]/invoices/[invoiceId]/InvoiceActions.tsx:14-16 | iteration 001 Finding #1 未修正。Server Action の paidAt 上限バリデーション（`val <= new Date().toISOString().slice(0, 10)`）と InvoiceActions.tsx の `todayString()` が UTC 基準の `new Date().toISOString().slice(0, 10)` を使用している。JST ユーザーが 0:00〜9:00 JST に当日の入金日を送信すると、サーバー側 refine が「入金日は本日以前の日付を指定してください」で拒否する。同時に InvoiceActions.tsx の `max={todayString()}` が前日 UTC 日付を `max` に設定するため HTML バリデーションとも不整合となり、当日を選択したユーザーが入金確認操作を完了できない。 | Server Action: refine の today 算出を `new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)` に変更するか `Intl.DateTimeFormat("sv", { timeZone: "Asia/Tokyo" }).format(new Date())` を使用する。InvoiceActions.tsx の `todayString` も同様に JST 日付を返す実装に変更する。 | yes |
| 2 | MEDIUM | Testing | src/__tests__/usecases/（未作成） | iteration 001 Finding #2 未修正。test-cases.md の automated（must）14 件中 11 件の integration テストが引き続き未実装。iteration 002 で invoiceTransition.test.ts に TC-007/TC-008/TC-009 が追加され test-cases.md TC-001/TC-002/TC-003 は充足されたが、TC-004（paidAt 指定で入金確認）、TC-005（paidAt 未指定フォールバック）、TC-006（overdue→paid ドメインイベント）、TC-007（getInvoice: 存在する請求）、TC-008（getInvoice: 存在しない請求）、TC-009（getInvoice: マルチテナント分離）、TC-011（contractId 不一致で 404）、TC-022（未来日付 paidAt 拒否）、TC-023（請求の新規作成）、TC-027（契約金額超過エラー）、TC-034（revalidatePath 両パス）の計 11 件が依然として存在しない。他ユースケース（inquiryManagement.test.ts, dealManagement.test.ts 等）に同等の静的解析テストが存在するのに対し、invoice だけカバレッジが著しく低い。 | `src/__tests__/usecases/invoiceManagement.test.ts` を新規作成し、他ユースケーステストと同様のパターンで各 TC を実装する。例: `expect(content).toContain('data.paidAt ?? new Date()')` で TC-004/005、`expect(content).toContain('"invoice.paid"')` で TC-006、`expect(content).toContain('data.organizationId')` で TC-009、`revalidatePath` 2 回呼び出しを検証して TC-034 を実装する。 | yes |
| 3 | LOW | Comment | src/domain/services/invoiceTransition.ts:12-14 | iteration 001 Finding #3 未修正。インライン 1 行目コメント（`// 有効な遷移先の定義。paid は終端状態`）は修正済みだが、直下の JSDoc ブロックコメント（「終端状態（paid / overdue）からの遷移、および定義外の遷移は不可」）が overdue を終端状態として誤って記述したまま残っている。 | JSDoc を「終端状態（paid）からの遷移、および定義外の遷移は不可」に修正する。 | yes |
| 4 | LOW | Security | src/app/(dashboard)/contracts/[id]/invoices/new/page.tsx | iteration 001 Finding #4 未修正。請求登録ページに `canPerform(role, "invoice", "create")` によるロールチェックがなく、権限のないユーザーにも登録フォームが表示される。`createInvoiceAction` 側でチェックがあるため機能的穴はないが、同コードベースの請求詳細ページ（`canChangeStatus` 分岐あり）との一貫性を欠く。 | `session!.user.role` を参照し `!canPerform(session!.user.role, "invoice", "create")` の場合は「この操作を実行する権限がありません」を表示してフォームを非表示にする。詳細ページの `canChangeStatus` 分岐と同様のパターン。 | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 8 | 0.30 |
| security | 7 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 3 | 0.10 |

- **total**: 7.50

## Summary

iteration 001 で指摘した 4 件の finding がいずれも未修正のまま iteration 002 を迎えている。iteration 002 で invoiceTransition.test.ts に 3 件の domain unit テストが追加されたが、これは implementer が最初から生成したブランチの変更であり code-fixer による修正ではない。

blocking 判定（needs-fix）の主因は Finding #1 の **タイムゾーン起因の機能不全**（HIGH）。JST 深夜帯（0:00〜9:00 JST）に入金確認を試みるユーザーが Server Action の refine と HTML `max` 属性の両方でブロックされ、操作を完了できない。Finding #2（11 件の integration テスト欠落）も MEDIUM で継続しブロッキング。

code-fixer への指示:
1. **最優先**: Finding #1 の timezone 修正（2 ファイル、数行の変更）
2. Finding #3 の JSDoc 修正（1 行）と Finding #4 の permission check 追加（数行）は軽微
3. Finding #2 の integration テストは `inquiryManagement.test.ts` のパターンを参照して実装する

