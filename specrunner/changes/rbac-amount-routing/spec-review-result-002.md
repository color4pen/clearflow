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
| 1 | MEDIUM | Input validation — amount 上限未定義（OWASP A03） | `tasks.md (T-06)` | `createRequestSchema` の `amount` フィールドが `z.coerce.number().int().nonnegative().optional()` と定義されているが、上限値（`.max()`）が未指定。PostgreSQL の `integer` 型の上限は 2,147,483,647 であるため、それを超える値（例: `9999999999`）は Zod バリデーションを通過するが、DB 挿入時に「integer out of range」エラーが発生し、ユーザーへは汎用的な「Failed to create request.」が返される。金融系フィールドとして明示的な上限バリデーションと適切なエラーメッセージが必要。 | T-06 の `createRequestSchema` 定義に `.max(2147483647, "金額が上限を超えています")` を追加する。 |
| 2 | LOW | 表示形式の不一致 — 金額の円表記 | `spec.md` / `tasks.md (T-09)` | `spec.md` の「申請詳細画面に金額が表示される」シナリオでは「金額「150,000」が表示される」（円なし）と記述しているが、`tasks.md` T-09 では「カンマ区切り表示する（例: "150,000"）。「円」を後置する」と記述されており矛盾している。実装者がどちらを正として扱うか判断できない。 | spec.md のシナリオを tasks.md T-09 に合わせて `Then 金額「150,000 円」が表示される` に統一するか、tasks.md から「円」後置要件を削除して spec.md に一本化する。 |

## Previous Findings Resolution (Iteration 1 → Resolved)

前回レビュー（spec-review-result-001）で指摘された4件はすべて本 iteration で対処済み:

- **[元 HIGH #1] テンプレート選択の非決定性** → **RESOLVED**
  - `design.md` Risks/Trade-offs 節に `findByOrganizationForAmount` の `CASE WHEN min_amount IS NULL AND max_amount IS NULL THEN 1 ELSE 0 END ASC` ORDER BY が明記された
  - `tasks.md` T-03 に「**並び順として ... を必ず ORDER BY に指定し、デフォルトテンプレートが最後に来るようにする**」が追記された
  - `tasks.md` T-04 に `selectTemplate` 内での特定度順ソートロジック（`minAmount !== null || maxAmount !== null` のテンプレートを先に）が明記された
  - amount=100000 → 少額テンプレート選択、amount=100001 → 高額テンプレート選択の決定論的動作が保証されている

- **[元 HIGH #2] TC-047 / TC-054 の削除・更新漏れ** → **RESOLVED**
  - `tasks.md` T-11 に「**TC-047 を削除または更新する**」「**TC-054 を削除または更新する**」が明示され、具体的な書き換え内容も記載された
  - TC-018/019/020/023 の `role !== "admin"` 検証を `role === "member"` に変更する旨も T-11 に記載済み

- **[元 MEDIUM #3] 排他パターンの将来ロール追加リスク** → **RESOLVED**
  - `design.md` D5 に `⚠️ 逆リスク（将来ロール追加時の注意）` セクションが追加され、閲覧専用ロール追加時の暗黙的権限付与リスクと対処方針が明記された

- **[元 LOW #4] T-07 の auth.ts キャスト更新漏れ** → **RESOLVED**
  - `tasks.md` T-07 が「`src/infrastructure/auth.ts` の JWT/session コールバック内キャストを `as { role: Role }` / `as Role` に更新する」「**必ず更新すること**」として具体的に追記された
  - ソースコード確認: `auth.ts:60` の `(user as { role: "admin" | "member" }).role` と `auth.ts:67` の `token.role as "admin" | "member"` が T-07 のターゲットとして正確に特定されている

## Summary

spec.md / design.md / tasks.md はいずれも規約（Requirement ヘッダー、Scenario Given/When/Then、SHALL/MUST normative keyword）を遵守している。前回レビューの HIGH 2件はいずれも解消済みであり、ブロッキング事項は存在しない。新規 finding は MEDIUM 1件（Zod 上限バリデーション未定義）と LOW 1件（表示形式の不一致）のみ。実装時に T-06 へ `.max(2147483647)` を追加することを推奨するが、仕様としては実装可能な状態にある。
