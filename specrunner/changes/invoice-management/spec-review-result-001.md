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
| 1 | HIGH | 競合状態（TOCTOU） | tasks.md / T-06 | `createInvoice` の処理フローが `sumAmountByContract` チェック（ステップ3）をトランザクション外で実行し、その後別のトランザクションで `invoiceRepository.create` を実行する。並行リクエストが同時に sum チェックを通過した場合、双方とも請求を作成でき、合計金額が契約金額を超える可能性がある。one_time 契約の上限チェックはこの設計で機能しない。 | T-06 のフローを修正し、`sumAmountByContract` の取得と比較をトランザクション内（`invoiceRepository.create` の直前）に移動する。具体的には「4. トランザクション内で: sumAmountByContract 取得 → 上限チェック → create → audit log」の順序にする。 |
| 2 | MEDIUM | セキュリティ（入力検証） | tasks.md / T-10 | `updateInvoiceStatusAction(invoiceId, newStatus)` の仕様に Zod バリデーションが指定されていない。Next.js Server Actions では TypeScript の型はランタイムで強制されないため、悪意ある呼び出し元が `newStatus` に任意の文字列を送信できる。`validateInvoiceTransition` が不正値を拒否するが、アクション層での防御的検証が欠けている。 | T-10 の `updateInvoiceStatusAction` 仕様に Zod バリデーション（`z.enum(["scheduled", "invoiced", "paid", "overdue"])` で `newStatus` を検証）と `invoiceId` の `z.string().uuid()` 検証を追加する。 |
| 3 | MEDIUM | 仕様カバレッジ | spec.md | `overdue` 終端状態からの遷移拒否を示すシナリオが欠如している。normative text（SHALL NOT）では「paid と overdue からの遷移は禁止」と明記されているが、Given/When/Then シナリオが `paid → invoiced` のみを具体例として挙げており、`overdue → invoiced`（または任意の遷移）の拒否シナリオがない。request-review でも LOW として指摘済みだが spec.md に反映されていない。 | spec.md に「overdue からの遷移が拒否される」シナリオを追加する: Given 請求ステータスが `overdue`、When ステータスを `invoiced` に変更する、Then 遷移が拒否されエラーが返される。 |
| 4 | LOW | 仕様の不整合 | tasks.md / T-05 | `src/domain/services/invoiceTransition.ts` を新規作成する指示があるが、`src/domain/services/index.ts` への `validateInvoiceTransition` の追記が指定されていない。既存パターン（`contractTransition` → `canContractTransition` として index から再エクスポート）と不一致であり、T-07 が直接ファイルを import する場合も考慮すると実装者が判断を要する。 | T-05 または T-07 に `src/domain/services/index.ts` への `export { validateInvoiceTransition } from "./invoiceTransition"` 追記を明示する。 |
| 5 | LOW | 入力検証（バリデーション） | tasks.md / T-10 | `createInvoiceAction` の Zod スキーマで `amount: z.coerce.number().int().nonnegative()` が指定されており、0 を許容する。金額 0 円の請求は業務上意味を持たない（one_time 上限チェックでの集計にも影響）。 | `amount` バリデーションを `.positive()` に変更し、0 を拒否する。 |
| 6 | LOW | 入力検証（バリデーション） | tasks.md / T-10 | `title` と `notes` に最大文字数の制約が指定されていない。DB は text 型（無制限）だが、過大な入力はリクエストサイズ攻撃の温床になる。 | `title: z.string().min(1).max(200)`, `notes: z.string().max(1000).optional()` 相当の制限を追加する。 |
