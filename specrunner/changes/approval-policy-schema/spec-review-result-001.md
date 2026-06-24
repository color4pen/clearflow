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
| 1 | HIGH | Missing Task / Typecheck | `tasks.md` (T-13) / `src/application/usecases/createDelegation.ts` | T-13 は `approvalDelegationRepository.create()` のシグネチャに必須フィールド `fromUserRole: string` を追加するが、唯一の呼び出し元である `createDelegation.ts` を更新するタスクが存在しない。そのため実装後に `typecheck` が失敗する。`createDelegation.ts` はステップ 3 で `fromUser.role` を既に取得しているため修正コストは低いが、タスク定義に欠落がある。 | T-13 に「`createDelegation.ts` の `approvalDelegationRepository.create()` 呼び出しに `fromUserRole: fromUser.role` を追加する」ステップを追記する（既存ステップ (a) の前後に配置）。 |
| 2 | MEDIUM | Schema / Migration | `tasks.md` (T-14) / `src/infrastructure/seed.ts` | T-14 は seed.ts の truncate 順序として「`approvalPolicies` を `requests` テーブルの前に配置する」と指示しているが、FK の向きは `requests.origin_policy_id → approval_policies.id` であり、子テーブル（FK 保持側）の `requests` を先に削除しないと一般的に FK 制約違反になる。seed データでは全リクエストの `origin_policy_id` が NULL のため実害はないが、将来 system 起動のリクエストが存在する本番環境でシードを再実行した場合に失敗する。また、schema 定義では `origin_policy_id` の ON DELETE 挙動が未指定（デフォルト RESTRICT）のままである。 | T-14 の truncate 順序を「`requests` を削除した後に `approvalPolicies` を削除する（approvalTemplates の前）」へ修正する。また T-01/T-02 で `origin_policy_id` FK の ON DELETE 挙動を明示する（例: `{ onDelete: "set null" }` — 既存の `requests.templateId` と同様のパターン）。 |
| 3 | MEDIUM | Schema / Index | `tasks.md` (T-01, T-10) / `src/infrastructure/schema.ts` | `findActiveByTriggerAction(organizationId, triggerAction)` は `organization_id`、`trigger_action`、`is_active` の 3 カラムで絞り込むが、この複合インデックスがスキーマ定義タスクに含まれていない。ポリシー数が少ない初期は問題ないが、ポリシー評価が実行されるたびにシーケンシャルスキャンになる。 | T-01 に `approvalPolicies` テーブルの index 定義として `index("approval_policies_org_action_active_idx").on(table.organizationId, table.triggerAction, table.isActive)` を追加するステップを設ける。 |
| 4 | LOW | Type Safety | `tasks.md` (T-10) / `src/infrastructure/repositories/approvalPolicyRepository.ts` | T-10 は `conditionOperator` を `as ConditionOperator \| null` でキャストすると指定している。DB から取得した値を実行時に検証せずキャストするため、DB に想定外の値が入った場合に型の保証が崩れる。現時点では挿入経路が限定的なので実害は小さい。 | mapRow 内で `conditionOperator` をキャストする前に `isValidConditionOperator(value)` のようなガード関数で値を検証するか、型ガード付きのユーティリティを domain 層に用意することを推奨する。本リクエストのスコープで必須ではないが、tasks.md にコメントとして記載すると後続実装者への情報引き継ぎになる。 |
| 5 | LOW | Type Duplication | `design.md` (D5) / `src/domain/models/approvalPolicy.ts` vs `src/domain/models/approvalTemplate.ts` | `ConditionOperator` 型（`"gt" \| "gte" \| "lt" \| "lte" \| "eq"`）は `approvalTemplate.ts` の `StepCondition.operator` と同一の値域を持つが、モデルごとに独立定義する方針が採られている。将来演算子を追加する際に片方の更新漏れが起きるリスクがある。design.md には「将来的に共有型として抽出可能」と記載されているが、tasks.md に今後の改善候補として TODO コメントを残す指示がない。 | tasks.md の T-07 に「将来的に `ConditionOperator` を共有型として `src/domain/models/shared.ts` 等に抽出することを検討する旨を approvalPolicy.ts のコメントに記載する」ステップを追加する（任意）。 |

## Summary

全体的に設計は堅実であり、テナント分離・CHECK 制約・マイグレーション戦略・後方互換性のいずれも適切に検討されている。セキュリティ観点では、承認ポリシーの作成 API はこの PR のスコープ外であるためオープンな入力経路はなく、リポジトリ層の全関数に organizationId 条件が明記されておりマルチテナント安全性は担保されている。

ブロッカーは Finding #1 のみ: T-13 が `approvalDelegationRepository.create()` のシグネチャを破壊的に変更するにもかかわらず、唯一の呼び出し元 `createDelegation.ts` を更新するタスクが欠落しており、`typecheck` が通らない。Finding #2 の seed truncate 順序と FK ON DELETE 挙動も production リスクとして修正が望ましい。
