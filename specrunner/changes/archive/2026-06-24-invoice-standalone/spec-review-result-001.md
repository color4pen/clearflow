# Spec Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:    specification is complete, consistent, and ready for implementation
  - needs-fix:   specification has issues that must be resolved before implementation
  - escalation:  unresolvable conflicts, missing context, or requires human judgment
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | File | Description | How to Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
  - CRITICAL: production outage, data loss, security breach
  - HIGH:     functional failure, clear bug, no workaround — blocks approval
  - MEDIUM:   quality degradation, maintainability issue, future risk
  - LOW:      informational, style, minor improvement
- If no findings, write a table row with "None" or omit the table body.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: needs-fix

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | HIGH | Functional Bug | tasks.md T-02 | `paidAt` のZodスキーマとして `z.string().datetime().optional()` が候補に挙げられているが、`<input type="date">` が出力する "YYYY-MM-DD" 形式は `.datetime()` の検証を通過しない（ISO 8601 の日時成分が必須）。実装者がこちらを選択すると入金確認操作が常にバリデーションエラーになる | T-02 の "または" 表記を削除し、`z.string().date().optional()`（Zod 3.22+）または `z.string().optional()` のいずれかに統一して明記する。選択したスキーマに合わせて、アクション内で `new Date(parsed.data.paidAt)` への変換を行うことも記載する |
| 2 | MEDIUM | Consistency | spec.md / tasks.md T-06 | 請求作成成功後のリダイレクト先に不整合がある。spec.md の Scenario は「契約詳細ページ**または**請求詳細ページにリダイレクトされる」と曖昧に記述しているが、tasks.md T-06 は `/contracts/[id]` のみと明記している。さらに `createInvoiceAction` の現在の返却型（`ActionResult`）は作成した invoiceId を含まないため、フォームから請求詳細ページへリダイレクトするには Action の戻り型変更が必要になる | tasks.md T-06 の「/contracts/[id] にリダイレクト」を決定版として spec.md の "または請求詳細ページ" を削除する。将来的に請求詳細ページへのリダイレクトを希望する場合は `createInvoiceAction` の返却型変更を別タスクとして切り出す |
| 3 | MEDIUM | Security | tasks.md T-02 / T-09 | `updateInvoiceStatusAction` にレートリミットが存在しない。同じ請求に対してステータス更新を連続呼び出しした場合のガードがなく、`createInvoiceAction` との設計一貫性も損なわれる | T-02 または T-09 に `checkRateLimit({ key: \`updateInvoiceStatus:${session.user.id}\`, ... })` を追加する旨を明記する |
| 4 | LOW | Security | tasks.md T-02 | `paidAt` に未来日付の制限が定義されていない。入金確認ダイアログでユーザーが来月以降の日付を入力しても拒否されないため、誤操作による不正な入金日の登録が可能 | Server Action スキーマで `paidAt` が現在日以前であることを検証するか、ユースケース内にガードを追加することを検討する。業務上将来日付が不要であれば `max` バリデーションを追加する |
