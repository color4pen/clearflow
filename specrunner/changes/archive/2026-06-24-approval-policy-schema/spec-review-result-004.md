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
| 1 | LOW | Relations Completeness | `tasks.md` (T-01) / `src/infrastructure/schema.ts` | `approvalPoliciesRelations` に `template (one → approvalTemplates)` を定義するが、逆方向の `approvalTemplatesRelations → policies: many(approvalPolicies)` を追加するタスクが存在しない。Drizzle ORM は片方向 relation のみでも動作するため `typecheck` は通り、`approvalTemplates with { policies: ... }` のようなクエリを本 PR スコープで使用しないため実害はない。 | 将来 approvalTemplates からポリシーを eager load する際に T-01 または新規タスクで `approvalTemplatesRelations` への `many(approvalPolicies)` 追加を行う。本 PR 内対応は任意。 |

## Summary

今回で 4 度目の spec-review となる。前回（attempt 3）でブロッカーとして指摘した `tasks.md` T-02 の `{ onDelete: "set null" }` 記述が「`onDelete` 指定なし＝デフォルト RESTRICT」へ修正されており、`design.md` D2 との整合が取れている。

**過去 3 ラウンドの全 HIGH/MEDIUM finding の解消確認:**

- attempt 1 HIGH: T-13b（createDelegation.ts 呼び出し更新タスク欠落）→ tasks.md T-13b として追加済み ✅
- attempt 1 MEDIUM: seed truncate 順序（requests の後に approvalPolicies を削除）→ T-14 に正しく記載済み ✅
- attempt 1 MEDIUM: 複合インデックス欠落 → T-01 に `approval_policies_org_trigger_active_idx` として追加済み ✅
- attempt 1 LOW: conditionOperator 実行時バリデーション → T-10 に `CONDITION_OPERATORS` セットによるガードが明記済み ✅
- attempt 1 LOW: ConditionOperator TODO → T-07 に TODO コメント追加指示が明記済み ✅
- attempt 2 HIGH: `{ onDelete: "set null" }` と CHECK 制約の矛盾 → design.md D2 で RESTRICT に修正済み ✅
- attempt 2 LOW: approver_id と approved_by の意味差異 → design.md D3 に説明追加済み ✅
- attempt 3 HIGH: tasks.md T-02 に `{ onDelete: "set null" }` 記述が残存 → 今回確認でデフォルト RESTRICT に修正済み ✅

**現行仕様の品質確認:**

- **テナント分離**: 全リポジトリ関数（approvalPolicyRepository の 6 関数、既存リポジトリ更新分すべて）に `organizationId` 条件が明記されている ✅
- **CHECK 制約**: `approval_policies_condition_check`（condition 3 フィールドの全 null/全 NOT NULL）、`requests_origin_check`（origin_type に応じた null/not-null）が設計・タスク両方に正しく定義されている ✅
- **マイグレーション安全性**: `from_user_role` の 3 ステップ（nullable 追加 → UPDATE → NOT NULL 設定）が T-06 に明記。`requests.origin_type` のデフォルト `'manual'` により既存行に後方互換性あり ✅
- **セキュリティ**: 承認ポリシーの CRUD Server Action は本 PR スコープ外のため入力経路が存在しない。Drizzle ORM のパラメータ化クエリにより SQL インジェクションリスクは抑制。conditionOperator は実行時ガードでキャスト前に検証する設計 ✅
- **FK 整合性**: `origin_policy_id` → RESTRICT（ポリシー削除時に参照中のリクエストが存在する場合は削除不可）。`from_user_id` FK 制約により `users` 行の存在が保証されるため、UPDATE マイグレーションで NULL が残る心配がない ✅
- **依存方向**: domain layer（approvalPolicy.ts, request.ts, approvalStep.ts）が `@/infrastructure` を import しないことが T-07 の acceptance criteria および T-16 の最終チェックリストで保証されている ✅

ブロッキングする HIGH/CRITICAL finding はなし。仕様は実装を開始できる状態にある。
