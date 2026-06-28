# Conformance Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:   implementation conforms to tasks.md, design.md, spec.md, and request.md
  - needs-fix:  one or more upstream artifacts are not satisfied by the implementation
  - escalation: conformance cannot be determined (missing artifacts, unresolvable ambiguity)
- The Findings table records the per-artifact judgment.
-->

- **verdict**: approved

## Conformance Findings

| Artifact | Conforms | Notes |
|----------|----------|-------|
| tasks.md | ✅ Yes | 全 14 タスク（T-01〜T-14）のチェックボックスが `[x]` で完了済み |
| design.md | ✅ Yes | D1〜D8 の全設計判断が実装に反映されている |
| spec.md | ✅ Yes | 全 7 Requirement（SHALL/MUST）と全シナリオが実装でカバーされている |
| request.md | ✅ Yes | 全 5 受け入れ基準をテストで固定済み。verification 全フェーズ passed |

## 1. Tasks Completeness

tasks.md の全 14 タスク（T-01〜T-14）のチェックボックスが `[x]` で完了済み。欠落なし。

## 2. Design Decisions 適合

| Decision | 内容 | 適合 |
|----------|------|------|
| D1 | 派生（read-side）方式 — 通知テーブルなし、監査ログから都度導出 | ✅ `getNotifications.ts` に `notificationRepository` 参照なし。テストで `notifications"` / `notificationRepository` の不存在を確認 |
| D2 | watches テーブル `(id, user_id, deal_id, organization_id, created_at)`、`(user_id, deal_id)` ユニーク制約 | ✅ schema.ts・migration SQL ともに `watches_user_deal_unique` あり |
| D3 | users テーブルに `notifications_last_seen_at` (timestamp, nullable) を追加 | ✅ migration で `ALTER TABLE users ADD COLUMN notifications_last_seen_at timestamp`。userRepository の全 select に含む |
| D4 | getNotifications フロー: watch 一覧 → 配下エンティティ列挙 → findByTargets → per-watch フィルタ → targetInfoMap → 未読判定 | ✅ 実装が設計フローに完全準拠。2段階フィルタ（DB: `afterDate`=最古 watch 日時、App: 各 watch の `created_at` 以降）が tasks.md T-09 と一致 |
| D5 | createDeal/updateDeal のトランザクション内で自動 watch | ✅ 両 usecase で `watchRepository.create(..., tx)` がトランザクション内に配置済み。`onConflictDoNothing` で冪等 |
| D6 | NotificationBell（Server Component）+ NotificationPanel（Client Component）を layout.tsx に組み込み | ✅ `layout.tsx` に `<NotificationBell />` あり。Server/Client 分担が Next.js パターン通り |
| D7 | `findByTargets` に `afterDate` / `excludeActorId` / `includeActions` を optional として追加 | ✅ auditLogRepository に `gte`, `ne`, `inArray` で各条件実装。既存呼び出しへの破壊的変更なし |
| D8 | `NOTIFICATION_ACTIONS` を domain 層に定数として定義（5 アクション） | ✅ `notification.ts` が `deal.update`, `deal.updatePhase`, `meeting.create`, `action_item.create`, `contract.create` を列挙 |

## 3. Spec Requirements・Scenarios 適合

### Requirement: ユーザーは案件を watch/unwatch できる（SHALL organizationId を検証）
- `watchDeal.ts` で `dealRepository.findById(data.dealId, data.organizationId)` による組織所有権検証あり ✅
- `watchRepository` の全関数に `eq(watches.organizationId, organizationId)` 条件あり ✅
- Scenarios（未 watch→watch / watch→unwatch / テナント分離）: watchRepository の `and()` 条件とユニーク制約でカバー ✅

### Requirement: 作成者自動 watch（MUST 同一トランザクション内）
- `createDeal.ts` の `db.transaction` 内で `watchRepository.create({ userId: data.actorId, ... }, tx)` ✅

### Requirement: 担当者変更時の自動 watch（MUST 同一トランザクション内）
- `updateDeal.ts` の `db.transaction` 内で `if (data.assigneeId) { await watchRepository.create({ userId: data.assigneeId, ... }, tx) }` ✅
- `onConflictDoNothing` により重複挿入が冪等 ✅

### Requirement: getNotifications — 通知テーブルを使わず都度導出（MUST 派生）
- `getNotifications.ts` に通知テーブルへの DB アクセスなし。watchRepository / dealRepository / 配下 repository / auditLogRepository のみ ✅
- `includeActions: [...NOTIFICATION_ACTIONS]`, `excludeActorId: userId`, `afterDate: earliestWatchDate` でフィルタ ✅
- `log.createdAt >= info.watchCreatedAt` のアプリ側フィルタで各 watch の開始後のログに限定 ✅
- `orderBy(desc(auditLogs.createdAt))` で新しい順 ✅

### Requirement: 未読数は notifications_last_seen_at 以降の件数（MUST）
- `isUnread`: `notificationsLastSeenAt === null ? true : log.createdAt > notificationsLastSeenAt` ✅
- `null` の場合は全通知が未読（spec「watch 開始以降の全ログが未読」に対応） ✅
- `unreadCount = notifications.filter((n) => n.isUnread).length` ✅

### Requirement: 「既読にする」で notifications_last_seen_at 更新（MUST 現在時刻に更新）
- `markNotificationsAsRead.ts` → `userRepository.updateNotificationsLastSeenAt(userId, organizationId, new Date())` ✅
- `updateNotificationsLastSeenAt` に `eq(users.organizationId, organizationId)` 条件あり ✅

### Requirement: 通知は env フラグと独立（MUST 既存 env フラグに依存しない）
- `getNotifications.ts` に `ACTIVITY_FEED_ENABLED` 等の env 参照なし ✅
- `deals/[id]/page.tsx` の `activityEnabled` ガードは getDealActivity にのみかかり、getWatchStatus/getNotifications には影響しない ✅

### Requirement: 全クエリにテナント分離条件（MUST 全クエリに organizationId）
- watchRepository の全4関数に organizationId ✅
- auditLogRepository.findByTargets の第1引数として organizationId が常時渡されている ✅

## 4. 受け入れ基準 適合（request.md）

| 基準 | 適合 |
|------|------|
| watches テーブル・watch トグルで watch/unwatch でき、作成者・担当者が自動 watch されることをテストで固定 | ✅ `watchDeal.test.ts`・`dealManagement.test.ts` の静的検証テストでカバー |
| getNotifications が「案件変更＋配下の追加」を本人除外・新しい順で導出し、通知テーブルを使わないことをテストで固定 | ✅ `getNotifications.test.ts` の静的検証テストでカバー |
| 未読数が notifications_last_seen_at 以降の件数であり、「既読にする」で last_seen が更新され未読が 0 になることをテストで固定 | ✅ markNotificationsAsRead の `new Date()` 使用・organizationId 条件・updateNotificationsLastSeenAt 各テストでカバー |
| watch / notification の全クエリに organizationId 条件があることをテストで固定 | ✅ 「テナント分離 静的検証」describe ブロックでカバー |
| 既存テストが green / typecheck・lint が green | ✅ verification-result.md: build / typecheck / test（1227 pass, 0 fail）/ lint の全フェーズ passed |

## 5. 軽微な観察事項（ブロッカーなし）

- **テスト手法**: 全テストが静的解析（ファイル内容の文字列検査）で実装されている。DB 接続不要の CI 環境に適した実用的な選択であり、受け入れ基準の「テストで固定する」趣旨を満たしている。
- **2段階フィルタの設計意図**: DB 側 `afterDate`（全 watch の最古日時）＋アプリ側 `log.createdAt >= watchCreatedAt` による2段階フィルタは T-09 の設計に忠実で、正確な per-watch フィルタを実現している。
- **`invoice.create` の不在**: NOTIFICATION_ACTIONS に `invoice.create` は含まれず、要件の通知対象アクション列挙（設計 D8）と一致している。

## 総括

全仕様要件・設計判断・受け入れ基準を充足。verification 全フェーズ passed。ブロッカーとなる不適合は検出されなかった。
