# Domain-Invariants Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | File | Description | How to Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
-->

- **verdict**: needs-fix

## Review Summary

**観点**: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。

**Iteration**: 1

全体的に実装は堅牢であり、organizationId の二重検証（リポジトリ層での AND 条件 + ユースケース層での存在確認）、監査ログの完全なカバレッジ、deny-by-default な認可設計など、マルチテナント不変条件の大部分は正しく実装されている。

しかし、`assigneeId` に対してのみ tenant ownership 検証が行われていない。これは他の FK（dealId, meetingId, inquiryId）とは一貫しない穴であり、クロステナント参照を許してしまう。

---

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | HIGH | Tenant Isolation | `src/application/usecases/createActionItem.ts`, `src/application/usecases/updateActionItem.ts` | **`assigneeId` の組織帰属検証が欠落**。`dealId`/`meetingId`/`inquiryId` には各リポジトリの `findById(id, organizationId)` で org 一致を確認しているが、`assigneeId` に対しては同等チェックがない。FK 制約は「ユーザーが `users` テーブルに存在する」ことしか保証しない。攻撃者が他テナントのユーザー UUID を知っている場合、クロステナント参照を `action_items.assignee_id` に書き込める。将来 assignee_id を JOIN して担当者情報を表示する機能が入ると、他テナントのユーザー情報がリークする。`userRepository.findById(id, organizationId)` は既に org-scoped な実装が存在し、呼ぶだけで解決できる。 | `createActionItem.ts` の dealId/meetingId/inquiryId チェックブロックに、`assigneeId` が指定されている場合のチェックを追加する: `const user = await userRepository.findById(data.assigneeId, data.organizationId); if (!user) return { ok: false, reason: "担当者が見つかりません" };`。`updateActionItem.ts` も同様に、`data.assigneeId` が `undefined` でなく `null` でもない場合に `userRepository.findById(data.assigneeId, data.organizationId)` を呼び出す。両ファイルに `userRepository` の import を追加する。 |
| 2 | LOW | Robustness | `src/application/usecases/createActionItem.ts`, `src/application/usecases/updateActionItem.ts` | **存在確認がトランザクション外**。`dealId`/`meetingId`/`inquiryId` の existence + org チェックはトランザクション開始前に実行される（TOCTOU）。エンティティが check と insert の間に削除された場合、FK 制約違反で内部エラーになりエラーメッセージが不明瞭になる。エンティティが org 間を移動することはないため、セキュリティ上のリスクは低い。 | 必須対応ではないが、チェックをトランザクション内に移動することで一貫したエラーハンドリングが保証される。または try-catch のエラーメッセージで FK 違反を検出して適切なメッセージを返す処理を追加する。 |

---

## テナント分離 検証結果

| チェック項目 | 実装箇所 | 判定 |
|------------|---------|------|
| リポジトリ全クエリが `organizationId` を含む | `actionItemRepository.ts`: findById, findByOrganization, update, deleteById, findByDeal, findByMeeting すべてに `eq(actionItems.organizationId, organizationId)` | ✅ |
| ユースケースが session の organizationId を使用 | `actionItems.ts` 全アクション: `session.user.organizationId` を直接渡す | ✅ |
| deal 紐づけの org 検証 | `createActionItem.ts:27`, `updateActionItem.ts:34` | ✅ |
| meeting 紐づけの org 検証 | `createActionItem.ts:34`, `updateActionItem.ts:41` | ✅ |
| inquiry 紐づけの org 検証 | `createActionItem.ts:40`, `updateActionItem.ts:50` | ✅ |
| assignee (user) の org 検証 | `createActionItem.ts`, `updateActionItem.ts` — 存在しない | ❌ **要修正** |
| マイグレーション SQL が organization_id を正しく継承 | `0008_migrate_action_items_data.sql`: `m.organization_id` を直接参照 | ✅ |
| マイグレーション SQL に created_by_id の NULL ガード | `WHERE ... AND m.created_by_id IS NOT NULL` | ✅ |

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

すべての状態変更操作で監査ログが同一トランザクション内に記録される。audit log が失敗した場合、action 自体もロールバックされる設計は正しい。

---

## 承認ワークフロー不変条件 検証結果

| チェック項目 | 判定 |
|------------|------|
| `PERMISSION_MATRIX.approval` に変更なし | ✅ |
| `PERMISSION_MATRIX.approvalSettings` に変更なし | ✅ |
| `canPerform` の deny-by-default 動作は保持 | ✅ |
| `finance` ロールが action_item を操作できない（`ADMIN_MANAGER_MEMBER` から除外）| ✅ (meeting と同等、仕様通り) |
| 新 `actionItem` エントリが `Entity` union に正しく追加された | ✅ |

承認ワークフローに関する不変条件の破壊はなし。
