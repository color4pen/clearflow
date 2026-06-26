# Domain Invariants Review Result — action-items-ui — iter 1

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:    invariants are all maintained; no blocking issues found
  - needs-fix:   one or more invariant violations must be resolved before merge
  - escalation:  ambiguous ownership, cross-team boundary, or requires human judgment
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | File | Description | How to Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
  - CRITICAL: tenant data leakage, missing auth, broken approval invariant
  - HIGH:     functional invariant broken, missing audit trail for mutation, no workaround
  - MEDIUM:   audit log incompleteness, future risk, partial coverage
  - LOW:      informational, minor improvement
-->

- **verdict**: approved

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | LOW | 監査ログ metadata 欠落 | `updateActionItem.ts` | `action_item.update` 監査ログに変更内容（どのフィールドが変わったか）の `metadata` が記録されていない。`toggleActionItemDone` は `{ done: !existing.done }` を metadata として渡しているが、`updateActionItem` は metadata なし。監査ログの完全性は満たしているが、フィールドごとの変更差分を追う場合に情報が不足する。 | `updateActionItem.ts` の `auditLogRepository.create` 呼び出しに `metadata: { fields: Object.keys(updateData) }` 相当を追加する。本変更のスコープ外であれば後続タスクとして記録しておく。 |

## 検証サマリ

### 1. テナント分離

| 観点 | 確認箇所 | 結果 |
|------|---------|------|
| organizationId はサーバー側 session から取得 | `actionItems.ts` 全アクション（line 43, 120, 196, 261） | ✅ クライアント入力から取得していない |
| repository 全操作に organizationId を渡している | `actionItemRepository.ts`: `findById`, `findByOrganization`, `findByDeal`, `findByMeeting`, `update`, `deleteById` | ✅ 全メソッドで `and(eq(...id), eq(...organizationId))` を適用 |
| usecase がクロステナント参照を検証している | `createActionItem.ts`: assignee/deal/meeting/inquiry の `findById(..., organizationId)` | ✅ 他組織のエンティティに紐づけようとすると "見つかりません" で弾く |
| usecase がクロステナント操作を拒否している | `toggleActionItemDone.ts`, `updateActionItem.ts`, `deleteActionItem.ts` | ✅ `findById(id, organizationId)` が null を返せば即時 `{ ok: false }` |
| ページコンポーネントで deal/meeting の org 帰属を検証 | `deals/[id]/page.tsx` line 31–33, `meetings/[meetingId]/page.tsx` line 22–29 | ✅ `getDeal` / `getMeeting` が null のとき `notFound()` を呼ぶ。また `meeting.dealId !== id` チェックで URL 改ざんを防止 |
| getDashboardActions の organizationId スコープ | `getDashboardActions.ts` line 11 | ✅ `findByOrganization(organizationId, { done: false })` — セッション由来の organizationId のみ |
| userMap がテナントスコープ済みのユーザーのみを含む | `dashboard/page.tsx` line 58, `deals/[id]/page.tsx` line 41 | ✅ `listOrganizationUsers({ organizationId })` で取得。他テナントの userId が userMap に混入しない |

### 2. 監査ログの完全性

| 操作 | audit action | トランザクション内 | actorId / organizationId |
|------|-------------|-----------------|--------------------------|
| `createActionItem` | `action_item.create` | ✅ `db.transaction` | ✅ |
| `toggleActionItemDone` | `action_item.toggle` + metadata `{ done }` | ✅ `db.transaction` | ✅ |
| `updateActionItem` | `action_item.update` | ✅ `db.transaction` | ✅（metadata なし — LOW #1 参照） |
| `deleteActionItem` | `action_item.delete` | ✅ `db.transaction` | ✅ |

すべての WRITE 操作が対応する audit log 生成と同一トランザクションに含まれており、部分書き込みによる監査ログ欠落は発生しない。

### 3. 承認ワークフロー不変条件

| 不変条件 | 確認内容 | 結果 |
|---------|---------|------|
| getDashboardActions section (a) — 承認待ちアイテム — が変更されていない | `getDashboardActions.ts` line 24–36 | ✅ 本変更で section (a) には一切触れていない |
| DashboardActionItem の `approval` バリアントが変更されていない | `dashboard.ts` line 4–10 | ✅ `approval` バリアントは今回の diff に含まれない |
| approval の並び順ロジック（getSortDate）が維持されている | `getDashboardActions.ts` line 78–81 | ✅ `approval` 分岐は変更なし |
| 承認アクション（approveRequest / rejectRequest）への影響なし | 本 diff に対象ファイル含まれず | ✅ スコープ外で未触 |

### 4. RBAC

| 操作 | canPerform チェック | 許可ロール |
|------|-------------------|-----------|
| create | `canPerform(role, "actionItem", "create")` | admin / manager / member |
| toggle | `canPerform(role, "actionItem", "toggle")` | admin / manager / member |
| edit | `canPerform(role, "actionItem", "edit")` | admin / manager / member |
| delete | `canPerform(role, "actionItem", "delete")` | admin / manager |

finance ロールはアクションアイテムの作成・完了切替が不可。deny-by-default の PERMISSION_MATRIX が適用されており、マトリクスに存在しない操作はすべて `false` を返す。

### 5. 承認ワークフロー外のデータ読み取りスコープ

`getDashboardActions` の `actionItemRepository.findByOrganization(organizationId, { done: false })` は `done=false` フィルターのみを適用し、assigneeId によるフィルタリングを行わない（全テナントメンバーの未完了アイテムを返す）。これは既存の Dashboard 設計（承認者は全員が全アクション待ちを把握する）に沿った意図的な仕様であり、テナント分離の問題ではない。

## 総評

本変更においてテナント分離・監査ログ完全性・承認ワークフロー不変条件の破壊は確認されなかった。CRITICAL / HIGH の指摘事項はなし。LOW 指摘 1 件（`updateActionItem` の監査 metadata 欠落）は機能的に問題がなく、今回のスコープ外で対応可能。**approved** とする。
