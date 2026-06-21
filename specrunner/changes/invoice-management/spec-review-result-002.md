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

- **verdict**: approved

## Previous Review Summary (spec-review-result-001)

spec-review-result-001 で指摘した 6 件の findings はすべて修正済みを確認した。

| # | 旧 Severity | 修正確認 |
|---|-------------|---------|
| 1 | HIGH | ✅ T-06: `sumAmountByContract` がトランザクション内に移動、TOCTOU 防止コメント追記済み |
| 2 | MEDIUM | ✅ T-10: `updateInvoiceStatusAction` に `z.enum([...])` と `z.string().uuid()` バリデーション追加済み |
| 3 | MEDIUM | ✅ spec.md: `overdue からの遷移が拒否される` シナリオ追加済み |
| 4 | LOW | ✅ T-05: `src/domain/services/index.ts` への `validateInvoiceTransition` export 追記明示済み |
| 5 | LOW | ✅ T-10: `amount` が `.positive()` に変更、0 拒否明記済み |
| 6 | LOW | ✅ T-10: `title` に `max(255)`、`notes` に `max(1000)` 制約追加済み |

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | MEDIUM | セキュリティ（並行性） | tasks.md / T-06 | `sumAmountByContract` をトランザクション内に移動したことで単純な TOCTOU は防止できた。しかし PostgreSQL デフォルトの READ COMMITTED 分離レベルでは、2つの並行トランザクションが同一 tx コミット前に両者とも同じ SUM を読み取り、両方が上限チェックを通過して insert する phantom read がなお残る。one_time 契約の請求合計を厳密に守る必要がある場合、`SELECT FOR UPDATE` (contracts 行のロック) または `SERIALIZABLE` トランザクションを採用する必要がある。B2B 小規模チームでの実運用リスクは低いが、金額上限の財務的重要性を踏まえると将来的な考慮が必要。 | 当面の対策としては T-06 のトランザクション内で `contractRepository.findById(contractId, organizationId, tx)` に `FOR UPDATE` 相当のロックを加えるか（Drizzle では `.for("update")`）、または許容リスクとして設計書に明示する。実装フェーズで判断可。今回の spec 修正は不要。 |
| 2 | LOW | 仕様の明確性 | tasks.md / T-06 | T-06 フロー Step 1 が「`contractRepository.findById` で契約を取得」と記述するのみで `organizationId` を渡すことが明示されていない。既存の `findById(id, organizationId, tx?)` シグネチャ（実装確認済み）は organizationId を必須引数とするため型エラーで気づけるが、仕様の読み手にとって ambiguous。 | T-06 の Step 1 を `contractRepository.findById(contractId, organizationId)` と明示する（他の UC（例: createContract）の記述スタイルに統一）。 |
| 3 | LOW | セキュリティ（入力検証） | tasks.md / T-10 | `listInvoicesByContractAction(contractId: string)` に Zod バリデーションが指定されていない。`createInvoiceAction` と `updateInvoiceStatusAction` では UUID 検証が明示されているのに対して不一致。Drizzle がクエリをパラメータ化するため SQL インジェクションにはならないが、不正形式の contractId が DB に到達すると無駄なクエリが発行される。 | T-10 の `listInvoicesByContractAction` に `contractId: z.string().uuid()` の Zod 検証を追加する。 |
| 4 | LOW | セキュリティ（入力検証） | tasks.md / T-10 | `createInvoiceAction` の `dueDate` が「文字列 optional」とのみ記述され、日付フォーマットの検証が未指定。不正な文字列が渡された場合、Drizzle/PostgreSQL が timestamp カラムへの insert 時にエラーを返す可能性がある。エラーは DB レベルで防止されるが、アクション層での明示的なバリデーションが抜けている。 | `dueDate: z.string().datetime({ offset: true }).optional()` または `z.coerce.date().optional()` を追加する。 |
