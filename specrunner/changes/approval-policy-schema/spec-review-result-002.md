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
| 1 | HIGH | Schema / Constraint Conflict | `design.md` (D2) / `tasks.md` (T-02) | `origin_policy_id` FK に `{ onDelete: "set null" }` が指定されているが、`requests_origin_check` CHECK 制約は `origin_type = 'system'` のとき `origin_policy_id IS NOT NULL` を要求する。ポリシー削除時に PostgreSQL が origin_policy_id を NULL にセットしようとすると、CHECK 制約が拒否しエラーになる。これらは互いに矛盾した制約であり、ポリシー評価ロジック実装後（system 起動のリクエストが存在する状態）にポリシー削除が一切できなくなる。spec-fixer が Finding を解消するために ON DELETE SET NULL を追記した際に導入された矛盾。現フェーズでは system リクエストが存在しないため実害は潜在的だが、仕様として矛盾を内包したまま実装に進むべきではない。 | design.md D2 および tasks.md T-02 の `origin_policy_id` FK の ON DELETE 挙動を `{ onDelete: "set null" }` から `{ onDelete: "restrict" }` に変更する。理由: ポリシーを削除したとき、そのポリシー起動で作成されたリクエストを孤児にするのはビジネス的に不正確。RESTRICT にすることで「参照中のリクエストが存在する場合はポリシーを削除できない」という意図的な制約として表現できる。削除が必要な場合は is_active = false による論理削除を代替手段とする（これは後続 PR で対応可能）。D2 の記述「既存の template_id FK と一貫した挙動」も合わせて削除し、RESTRICT を選択した理由を記載する。 |
| 2 | LOW | Documentation | `tasks.md` (T-03) / `src/infrastructure/schema.ts` | `approval_steps` テーブルへの `approver_id` カラム追加タスク（T-03）に、既存の `approved_by` カラムとの意味の違いを示すコメント追加の指示がない。request-review-result-001 でも同様の観察が記録されており未対応のまま。将来の実装者が `approver_id`（ポリシーが事前に指定した承認予定者）と `approved_by`（実際に承認操作を行ったユーザー）を混同するリスクがある。 | T-03 に「`approver_id` カラムの直上に `// ポリシーが事前に指定した承認予定者。実際の承認操作を行ったユーザーは approved_by カラムに記録される。` のスキーマコメントを追加する」ステップを設ける（任意）。 |

## Summary

spec-fixer ラウンドで解決された issues（T-13b 欠落、seed truncate 順序、複合インデックス、conditionOperator バリデーション、ConditionOperator TODO）はいずれも設計ステップ時点ですでに tasks.md に含まれており、仕様は全体として堅実に設計されている。テナント分離（全リポジトリ関数に organizationId 条件）、CHECK 制約による条件フィールドの整合保証、マイグレーション戦略、後方互換性（origin_type = 'manual' デフォルト）は適切に設計されている。セキュリティ観点では、ポリシー CRUD の Server Action は本 PR スコープ外のため露出した入力経路がなく、Drizzle ORM の parameterized query で SQL インジェクションリスクも抑制されている。

ブロッカーは Finding #1 のみ: spec-fixer が「ON DELETE 挙動を明示する」という Finding に応えて `{ onDelete: "set null" }` を追加したが、これが `requests_origin_check` CHECK 制約（`origin_type = 'system'` → `origin_policy_id IS NOT NULL`）と論理的に矛盾する。`{ onDelete: "restrict" }` に修正することで解決できる。
