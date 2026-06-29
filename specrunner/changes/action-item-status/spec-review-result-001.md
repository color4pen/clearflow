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
| 1 | LOW | Test Clarity | tasks.md / T-10 | "usecase（findById 等）経由で ActionItem を取得し status を assert する" の実装経路が曖昧。`findById` は repository 関数であり usecase ではない。`@/infrastructure/db` をモックして実際の `mapRow` 導出ロジックを通す方式でなければ、derivation ロジック自体はテストされない（モックの返り値を assert するだけになる）。 | `@/infrastructure/repositories` ではなく `@/infrastructure/db` の query チェーンをモックし、`actionItemRepository.findById` を直接呼び出す形で mapRow の実ロジックを通すこと。または `updateActionItemStatus` usecase 内の findById を経由させ、その返却 ActionItem の status を assert する方式でもよい。 |
| 2 | LOW | Specification Gap | tasks.md / T-07 | "紐づけ先ページの revalidate" の対象が未列挙。既存 `toggleActionItemAction` は `/deals/${dealId}` と `/deals/${meeting.dealId}/meetings/${meetingId}` を revalidate するが、inquiry 専用ページの revalidate は既存コードに存在しない。`updateActionItemStatusAction` で同じパスを踏むべきかどうか明記されていない。 | 既存 `toggleActionItemAction` の revalidate パターン（deal + meeting の2パス）を踏襲することを明記する。inquiry-specific ページが将来追加された場合の考慮は別リクエストで対応する、と記載すれば十分。 |

## Summary

コードベースとの整合を検証した結果、すべての前提は正確でありスペックは実装可能。

**コードベース確認結果:**
- `schema.ts` L526〜: `done boolean NOT NULL default false`、`(organization_id, done)` index、`status` カラムなし ✓
- `domain/models/actionItem.ts`: `done: boolean` のみ、`status` フィールドなし ✓
- `domain/models/auditLog.ts`: `action_item.updateStatus` 未定義、`action_item.toggle: { done: boolean }` のみ ✓
- `actionItemRepository.mapRow`: status フィールド未含、導出ロジックなし ✓
- `actionItemRepository.update`: Partial 型で `done` を含む部分更新をサポート、楽観ロック（version）実装済み ✓
- `toggleActionItemDone.ts`: done のみ更新、status 同期なし ✓（T-06 で追加が必要）
- `authorization.ts` `actionItem.edit`: `ADMIN_MANAGER_MEMBER` — T-07 の認可チェックに対応 ✓
- 既存 Server Action パターン（auth → canPerform → zod → usecase → revalidate）: T-07 と一致 ✓

**セキュリティレビュー（OWASP Top 10 関連）:**
- **認証 (A07)**: `auth()` で session を取得し未認証は即 return ✓
- **認可 (A01)**: `canPerform(role, "actionItem", "edit")` による RBAC ✓；`organizationId` は session 由来のため改ざん不可 ✓；`findById(id, organizationId)` でテナント所有権を確認 ✓
- **入力検証 (A03)**: `id: z.string().uuid()` + `status: z.enum(ACTION_ITEM_STATUSES)` — 不正な status 値はバリデーション段階で排除 ✓；status は enum に限定されるため XSS・インジェクション非リスク ✓
- **SQL インジェクション (A03)**: Drizzle ORM のパラメータバインディング使用 ✓
- **監査証跡**: `action_item.updateStatus` + `metadata: { status }` で全更新を記録 ✓
- **楽観ロック**: 並行更新競合を version チェックで検出 ✓

**設計整合性:**
- request.md → design.md → tasks.md → spec.md の一貫性 ✓
- D2（mapRow 導出）・D3（done 双方向同期）・D7（チェックボックス→セレクタ置き換え）がすべて tasks と spec に正しく反映 ✓
- toggle が "todo ↔ done" 直接切替（in_progress をスキップ）であることが D3・T-06・spec シナリオで一致 ✓
- done フィルタの後方互換: status 同期により `done: false` = {todo, in_progress}、`done: true` = {done} が成立し既存集計・フィルタが継続動作 ✓

blocking 判定（CRITICAL / HIGH）なし。スペックは完全・一貫・実装可能と判断する。
