# Domain-Invariants Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | File | Description | How to Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
-->

- **verdict**: approved

## Review Summary

**観点**: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。

**Iteration**: 2

Iteration 1 で HIGH と判定した `assigneeId` のテナント帰属検証欠落が、両ユースケース（`createActionItem.ts`・`updateActionItem.ts`）に正しく修正されている。修正後の全クエリで `organizationId` による絞り込みが実施されており、クロステナント参照は不可能になった。監査ログ・承認ワークフロー不変条件も前回と同様に保持されている。

**CRITICAL / HIGH 所見なし。approved。**

---

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | LOW | Robustness | `src/application/usecases/createActionItem.ts`, `src/application/usecases/updateActionItem.ts` | **存在確認がトランザクション外（前回 #2 の持ち越し）**。dealId / meetingId / inquiryId / assigneeId の existence + org チェックはトランザクション開始前に実行される（TOCTOU）。エンティティが check と insert の間に削除されると FK 制約違反で汎用エラーになる。セキュリティ上のリスクは低い。 | 必須対応ではない。チェックをトランザクション内へ移動するか、FK 違反を検出して適切なメッセージを返す try-catch を追加することで改善できる。後続リクエストで対処可。 |

---

## テナント分離 検証結果

| チェック項目 | 実装箇所 | 判定 |
|------------|---------|------|
| リポジトリ全クエリが `organizationId` を含む | `actionItemRepository.ts`: findById, findByOrganization, update, deleteById, findByDeal, findByMeeting すべてに `eq(actionItems.organizationId, organizationId)` | ✅ |
| ユースケースが session の organizationId を使用 | `actionItems.ts` 全アクション: `session.user.organizationId` を直接渡す | ✅ |
| deal 紐づけの org 検証 | `createActionItem.ts:34`, `updateActionItem.ts:40` — `dealRepository.findById(id, organizationId)` | ✅ |
| meeting 紐づけの org 検証 | `createActionItem.ts:41`, `updateActionItem.ts:49` — `meetingRepository.findById(id, organizationId)` | ✅ |
| inquiry 紐づけの org 検証 | `createActionItem.ts:48`, `updateActionItem.ts:58` — `inquiryRepository.findById(id, organizationId)` | ✅ |
| assignee (user) の org 検証 | `createActionItem.ts:27-32`, `updateActionItem.ts:33-38` — `userRepository.findById(assigneeId, organizationId)` **（前回 HIGH → 修正済み）** | ✅ |
| updateActionItem の assigneeId 変更時のみチェック | `updateActionItem.ts:33`: `data.assigneeId !== undefined && data.assigneeId !== null && data.assigneeId !== existing.assigneeId` — existing は org-scoped で取得済みのため安全 | ✅ |
| マイグレーション SQL が organization_id を正しく継承 | `0008_migrate_action_items_data.sql`: `m.organization_id` を直接参照 | ✅ |
| マイグレーション SQL に created_by_id の NULL ガード | `WHERE ... AND m.created_by_id IS NOT NULL` | ✅ |
| マイグレーション SQL に不正 JSON ガード | `WHERE jsonb_typeof(m.action_items) = 'array' AND jsonb_array_length(m.action_items) > 0` | ✅ |

---

## 監査ログ完全性 検証結果

| 操作 | audit event | トランザクション内 | organizationId 記録 | 判定 |
|-----|------------|-----------------|-------------------|------|
| create | `action_item.create` | ✅ (db.transaction) | ✅ | ✅ |
| toggle | `action_item.toggle` + metadata `{ done }` | ✅ (db.transaction) | ✅ | ✅ |
| update | `action_item.update` | ✅ (db.transaction) | ✅ | ✅ |
| delete | `action_item.delete` | ✅ (db.transaction) | ✅ | ✅ |
| list (read-only) | 不要 | — | — | ✅ |
| migration SQL | audit log なし | — | — | ✅ (許容) |

すべての状態変更操作で監査ログが同一トランザクション内に記録される。audit log 失敗時は action 自体もロールバックされる設計は正しい。

---

## 承認ワークフロー不変条件 検証結果

| チェック項目 | 判定 |
|------------|------|
| `PERMISSION_MATRIX.approval` に変更なし | ✅ |
| `PERMISSION_MATRIX.approvalSettings` に変更なし | ✅ |
| `canPerform` の deny-by-default 動作は保持 | ✅ |
| `finance` ロールが actionItem を操作できない（`ADMIN_MANAGER_MEMBER` から除外）| ✅ (meeting と同等、仕様通り) |
| `toggle` 操作が `PERMISSION_MATRIX.actionItem` に定義されている | ✅ |
| 新 `actionItem` エントリが `Entity` union に正しく追加された | ✅ |

承認ワークフローに関する不変条件の破壊はなし。

---

## Iteration 1 からの差分サマリー

| Finding (iter 1) | 修正状況 |
|-----------------|---------|
| #1 HIGH — assigneeId の組織帰属検証が欠落 | ✅ 修正済み。createActionItem.ts L27-32、updateActionItem.ts L33-38 に `userRepository.findById(assigneeId, organizationId)` チェックを追加 |
| #2 LOW — 存在確認がトランザクション外 | 持ち越し（LOW、機能上の問題なし） |
