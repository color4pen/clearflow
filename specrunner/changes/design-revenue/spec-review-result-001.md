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
| 1 | MEDIUM | Consistency | tasks.md T-08 | `updateRevenueTargetAction` はすでに `src/app/actions/revenue.ts` に実装済み（auth check・Zod validation・rate limit・revalidatePath を含む）。T-08 の「追加する」指示に従うと実装者が重複実装するリスクがある。 | T-08 の「追加する」を「既存の `updateRevenueTargetAction` を利用する」に変更し、新規追加が不要であることを明記する。 |
| 2 | MEDIUM | Consistency | tasks.md T-08 | T-08 では form の hidden フィールドを `name="targetId"` と指定しているが、既存の `updateRevenueTargetAction` は `formData.get("id")` で読み取る。名前不一致により action の Zod バリデーション（`id: z.string().uuid()`）が `null` 入力として失敗し、保存が silent failure になる。 | hidden input の name を `id` に変更する（`targetId` → `id`）か、tasks.md の記述を既存 action の引数名に合わせて修正する。 |
| 3 | LOW | Clarity | tasks.md T-07 | 前後ナビゲーション（`< >` ボタン）の実装方法が「`?periodType=...&offset=N`」と「直接 periodStart/periodEnd を searchParam に持たせる」の 2 案を並記したまま実装者の裁量に委ねている。spec.md にも前後ナビゲーションの Scenario が存在しない。 | tasks.md で実装方法を 1 つに絞る（直接 periodStart/periodEnd を searchParam に持たせる方式が URL 共有しやすく推奨）。spec.md にナビゲーションの Scenario を追加することも検討。 |

## Security Review

認証・認可・入力バリデーションの観点で確認した結果を以下に記す。

**認証（Authentication）**: 3 ページすべて `auth()` セッション確認済み。`updateRevenueTargetAction` も `session?.user?.id` チェックあり。問題なし。

**認可（Authorization）**: T-08 の `updateRevenueTargetAction` は `canPerform(session.user.role, "revenue", "setTarget")` チェックを実施済み。権限のないユーザーには読み取り専用表示となる設計（spec.md Scenario）も正確に反映されている。問題なし。

**IDOR**: `updateRevenueTargetAction` が受け取る `id`（hidden field 由来）に対し、`organizationId` はセッションから取得し、repository の update クエリが `AND organizationId = $2` で突合する（`revenueTargetRepository.update`）。横断アクセスは不可能。問題なし。

**入力バリデーション（Injection）**: Drizzle ORM がパラメータバインドで SQL injection を防止。`id` は UUID 形式を Zod で強制。`targetAmount` は `z.coerce.number().int().positive()` で検証済み。問題なし。

**OWASP Top 10 該当項目の要約**:
- A01 (Broken Access Control): 組織スコープ + RBAC で保護。✓
- A03 (Injection): Drizzle ORM のパラメータバインド。✓
- A07 (Identification and Authentication Failures): Auth.js セッション + rate limit。✓
