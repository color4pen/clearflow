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

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | MEDIUM | Security | tasks.md > T-06 | 承認待ちバナー用のクエリ条件として「`originTriggerEntityId === contract.id` かつ `status === "pending"`」のみが明示されており、`organizationId` フィルタの追記がない。新規リポジトリメソッドを追加する場合に組織スコープが抜ける実装リスクがある（既存の `findByOriginTriggerEntity` は `organizationId` を含むため既存メソッド流用なら問題なし）。 | 新規メソッドを追加する際は `organizationId` を必ず WHERE 条件に含めること。既存 `findByOriginTriggerEntity` のシグネチャを参照し、同パターンに揃える。 |
| 2 | LOW | 仕様カバレッジ | spec.md > T-05 関連シナリオ | プログレスバーのシナリオ（spec.md）が `paid` と `invoiced` のセグメント幅のみを検証しており、`scheduled` 請求が存在する場合にバー合計が 100% 未満になる挙動（`残り = contractAmount − (paid + invoiced + scheduled)` の結果 gray セグメントが収縮する）が未テスト。 | `scheduled` > 0 のケースのシナリオを追加するか、tasks.md の formula がそのまま spec の根拠と見なしてよい旨を明記する。実装上は tasks.md の計算式が明確なため functional ブロッカーではない。 |
| 3 | LOW | 仕様明確性 | tasks.md > T-04 | ContractStatusActions を左カラムに統合する記述に「既存の `!isTerminal` 条件（completed / cancelled の場合は非表示）を維持する」旨の明示がない。受け入れ基準の「既存の機能が維持される」で暗黙的にカバーされているが、条件分岐が実装時に失われるリスクがある。 | T-04 チェックリストに「`isTerminal` が `true` の場合は ContractStatusActions を非表示にする既存ロジックを維持すること」を追記することを推奨。 |
