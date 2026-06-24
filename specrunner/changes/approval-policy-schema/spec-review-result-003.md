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
| 1 | HIGH | Schema / Constraint Conflict | `tasks.md` (T-02) | `tasks.md` T-02 に「`originPolicyId` の FK に `{ onDelete: "set null" }` を指定する（既存の `templateId` FK と一貫した挙動）」という記述が残っている。一方 `design.md` D2 はすでに「ON DELETE RESTRICT — ON DELETE SET NULL にすると system origin の CHECK 制約（origin_policy_id IS NOT NULL）に違反するため RESTRICT を使用」と修正済みである。実装者は tasks.md を参照して実装するため、tasks.md の指示のまま `{ onDelete: "set null" }` を実装すると、`origin_type = 'system'` のリクエストが存在する状態でポリシーを削除した際に PostgreSQL が `origin_policy_id` を NULL にセットし、`requests_origin_check` CHECK 制約に違反してエラーになる。これは spec-fixer が design.md のみを修正し tasks.md の対応する記述を更新しなかったことで生じた設計書間の不整合である（2 ラウンド継続）。 | `tasks.md` T-02 の該当箇所を以下のように修正する: `{ onDelete: "set null" }` → `{ onDelete: "restrict" }` および「既存の `templateId` FK と一貫した挙動」の説明を「ポリシーを参照するリクエストが存在する間は削除不可とする意図的な制約。削除が必要な場合は is_active = false による論理削除を使用する」に置き換える。design.md D2 との整合を確認する。 |

## Summary

今回で 3 度目の spec-review となる。前回（attempt 2）の HIGH finding で指摘した `origin_policy_id FK の ON DELETE 挙動と CHECK 制約の矛盾` について、`design.md` D2 は「ON DELETE RESTRICT」への修正が完了している一方、`tasks.md` T-02 には依然として `{ onDelete: "set null" }` の記述が残っており、実装指示が設計仕様と食い違ったままである。

それ以外の観点では仕様は堅実に整備されている:
- attempt 1 で指摘した全 finding（T-13b 欠落、seed truncate 順序、複合インデックス、conditionOperator ガード、ConditionOperator TODO）はいずれも tasks.md / design.md に反映済み ✅
- attempt 2 で指摘した LOW finding（approver_id vs approved_by の説明）は design.md D3 に記載済み ✅
- テナント分離（全リポジトリ関数に organizationId 条件）、CHECK 制約による整合性保証、3 ステップマイグレーション戦略、後方互換性（origin_type = 'manual' デフォルト）は設計・タスク両方に正しく記述されている ✅
- セキュリティ観点: ポリシー CRUD の Server Action は本 PR スコープ外で入力経路がなく、Drizzle ORM のパラメータ化クエリにより SQL インジェクションリスクは抑制されている。conditionOperator の実行時ガード（CONDITION_OPERATORS セット）も T-10 に明記されている ✅

ブロッカーは Finding #1 のみ: `tasks.md` T-02 の `{ onDelete: "set null" }` を `{ onDelete: "restrict" }` に修正することで解決できる。
