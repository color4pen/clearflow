# Tasks: 案件の watch とアクティビティ通知（監査ログから派生）

## T-01: watches テーブルのスキーマ定義とマイグレーション

- [x] `src/infrastructure/schema.ts` に `watches` テーブルを追加する。カラム: `id` (uuid, PK), `userId` (uuid, FK → users.id), `dealId` (uuid, FK → deals.id), `organizationId` (uuid, FK → organizations.id), `createdAt` (timestamp, default now)
- [x] `(userId, dealId)` にユニーク制約を追加する（`watches_user_deal_unique`）
- [x] `(organizationId, userId)` にインデックスを追加する（ユーザーの watch 一覧取得を最適化）
- [x] `src/infrastructure/schema.ts` に `watchesRelations` を追加する（user, deal, organization への relation）
- [x] `organizationsRelations` に `watches: many(watches)` を追加する
- [x] `usersRelations` に `watches: many(watches)` を追加する
- [x] `dealsRelations` に `watches: many(watches)` を追加する
- [x] `drizzle/0012_watches_table.sql` にマイグレーション SQL を作成する
- [x] `bun run db:migrate` でマイグレーションが適用できることを確認する

**Acceptance Criteria**:
- `watches` テーブルが作成され、`(userId, dealId)` ユニーク制約が機能する
- `organizationId` FK が存在する
- 既存テストが green

## T-02: users テーブルに notifications_last_seen_at カラムを追加

- [x] `src/infrastructure/schema.ts` の `users` テーブルに `notificationsLastSeenAt` (timestamp, nullable) を追加する
- [x] `src/domain/models/user.ts` の `User` 型に `notificationsLastSeenAt: Date | null` を追加する
- [x] `src/infrastructure/repositories/userRepository.ts` の `findById` と `findByOrganization` の select に `notificationsLastSeenAt` を追加する
- [x] `drizzle/0013_notifications_last_seen_at.sql` にマイグレーション SQL を作成する

**Acceptance Criteria**:
- `users.notifications_last_seen_at` カラムが nullable で追加される
- 既存の User 取得関数が `notificationsLastSeenAt` を返す
- typecheck が green

## T-03: Watch ドメインモデルの定義

- [x] `src/domain/models/watch.ts` を作成する。`Watch` 型: `{ id: string; userId: string; dealId: string; organizationId: string; createdAt: Date }`
- [x] `src/domain/models/notification.ts` を作成する。通知対象アクションの定数 `NOTIFICATION_ACTIONS` を定義する: `["deal.update", "deal.updatePhase", "meeting.create", "action_item.create", "contract.create"]`
- [x] `DerivedNotification` 型を定義する: `{ log: AuditLog; dealId: string; dealTitle: string; targetInfo: TargetInfo | null; isUnread: boolean }`
- [x] `GetNotificationsResult` 型を定義する: `{ notifications: DerivedNotification[]; unreadCount: number }`

**Acceptance Criteria**:
- Watch 型と通知関連の型が定義されている
- 通知対象アクションが定数として定義されている
- typecheck が green

## T-04: watchRepository の実装

- [x] `src/infrastructure/repositories/watchRepository.ts` を作成する
- [x] `create(data: { userId, dealId, organizationId }, tx?)` — watch レコードを作成する。既存レコードがある場合は何もしない（ON CONFLICT DO NOTHING または事前チェック）
- [x] `findByUserAndDeal(userId, dealId, organizationId)` — 指定ユーザー・案件の watch を取得する（存在確認用）
- [x] `findByUser(userId, organizationId)` — ユーザーの全 watch を取得する（通知導出用）
- [x] `deleteByUserAndDeal(userId, dealId, organizationId)` — watch を削除する
- [x] 全関数で `organizationId` 条件を必ず付与する
- [x] `src/infrastructure/repositories/index.ts` に `export * as watchRepository from "./watchRepository"` を追加する

**Acceptance Criteria**:
- CRUD 操作が全て `organizationId` 条件付きで動作する
- `create` が冪等（重複挿入でエラーにならない）
- typecheck が green

## T-05: auditLogRepository.findByTargets の拡張

- [x] `findByTargets` の `options` に `afterDate?: Date` を追加する — `gte(auditLogs.createdAt, afterDate)` 条件を追加
- [x] `findByTargets` の `options` に `excludeActorId?: string` を追加する — `ne(auditLogs.actorId, excludeActorId)` 条件を追加（`drizzle-orm` の `ne` を import）
- [x] `findByTargets` の `options` に `includeActions?: string[]` を追加する — `inArray(auditLogs.action, includeActions)` 条件を追加
- [x] 既存の `getDealActivity` からの呼び出しに影響がないことを確認する（新オプションは全て optional）

**Acceptance Criteria**:
- 新オプション（afterDate, excludeActorId, includeActions）が正しく SQL 条件に反映される
- 既存の `getDealActivity` が変更なしで動作する
- 既存テストが green

## T-06: createDeal に自動 watch を追加

- [x] `src/application/usecases/createDeal.ts` のトランザクション内で、案件作成後に `watchRepository.create({ userId: data.actorId, dealId: newDeal.id, organizationId: data.organizationId }, tx)` を呼び出す
- [x] `watchRepository` の import を追加する

**Acceptance Criteria**:
- 案件作成時に作成者の watch レコードが同一トランザクション内で作成される
- 案件作成が失敗した場合、watch レコードもロールバックされる

## T-07: updateDeal に担当者の自動 watch を追加

- [x] `src/application/usecases/updateDeal.ts` のトランザクション内で、`assigneeId` が指定されている場合に `watchRepository.create({ userId: data.assigneeId, dealId: data.dealId, organizationId: data.organizationId }, tx)` を呼び出す
- [x] `watchRepository` の import を追加する
- [x] `create` の冪等性により、既に watch 済みの場合は何もしないことを確認する

**Acceptance Criteria**:
- 担当者設定時に担当者の watch レコードが同一トランザクション内で作成される
- 既に watch 済みの担当者を再設定してもエラーにならない

## T-08: watchDeal / unwatchDeal usecase の実装

- [x] `src/application/usecases/watchDeal.ts` を作成する — `watchRepository.create` を呼び出す
- [x] `src/application/usecases/unwatchDeal.ts` を作成する — `watchRepository.deleteByUserAndDeal` を呼び出す
- [x] `src/application/usecases/getWatchStatus.ts` を作成する — `watchRepository.findByUserAndDeal` で watch 状態を返す
- [x] `src/application/usecases/index.ts` に export を追加する

**Acceptance Criteria**:
- watch/unwatch/状態取得が正しく動作する
- 全操作に organizationId が必須パラメータとして含まれる

## T-09: getNotifications usecase の実装

- [x] `src/application/usecases/getNotifications.ts` を作成する
- [x] 入力: `{ userId, organizationId, notificationsLastSeenAt: Date | null }`
- [x] 処理フロー:
  1. `watchRepository.findByUser(userId, organizationId)` で watch 一覧を取得
  2. watch 中の案件ごとに `getDealActivity` と同等の対象解決を行う（配下エンティティの列挙 → targets 構築）
  3. 全 watch 分の targets をまとめて `auditLogRepository.findByTargets` に渡す。オプション: `includeActions: NOTIFICATION_ACTIONS`, `excludeActorId: userId`, `afterDate: 各 watch の最古の created_at`
  4. 結果をフィルタ: 各ログが対応する watch の `created_at` 以降であることを確認する
  5. `targetInfoMap` を構築する
  6. 未読数を `notificationsLastSeenAt` で判定する
- [x] 返り値: `GetNotificationsResult`
- [x] `src/application/usecases/index.ts` に export を追加する

**Acceptance Criteria**:
- watch 中の案件の対象アクションのみが通知として返される
- 本人操作が除外される
- watch 開始前のログが除外される
- 未読数が `notificationsLastSeenAt` 基準で正しく計算される
- 通知テーブルを使用していない（派生方式）

## T-10: markNotificationsAsRead usecase の実装

- [x] `src/application/usecases/markNotificationsAsRead.ts` を作成する
- [x] `userRepository` に `updateNotificationsLastSeenAt(userId, organizationId, timestamp)` 関数を追加する
- [x] usecase は `updateNotificationsLastSeenAt` を呼び出して `notifications_last_seen_at` を現在時刻に更新する
- [x] `src/application/usecases/index.ts` に export を追加する

**Acceptance Criteria**:
- `notifications_last_seen_at` が現在時刻に更新される
- 更新後に getNotifications を呼ぶと未読数が 0 になる
- organizationId 条件が含まれる

## T-11: watch/unwatch/markAsRead の Server Actions

- [x] `src/app/actions/watches.ts` を作成する
- [x] `watchDealAction(dealId)` — 認証チェック → `watchDeal` usecase 呼び出し → revalidatePath
- [x] `unwatchDealAction(dealId)` — 認証チェック → `unwatchDeal` usecase 呼び出し → revalidatePath
- [x] `src/app/actions/notifications.ts` を作成する
- [x] `markNotificationsAsReadAction()` — 認証チェック → `markNotificationsAsRead` usecase 呼び出し → revalidatePath

**Acceptance Criteria**:
- 全アクションで認証チェックが行われる
- organizationId はセッションから取得する（リクエストボディから受け取らない）
- revalidatePath で UI が更新される

## T-12: 案件詳細ヘッダーに watch トグル UI を追加

- [x] `src/app/(dashboard)/deals/[id]/WatchToggle.tsx` を Client Component として作成する
- [x] Props: `dealId: string`, `isWatching: boolean`
- [x] watch/unwatch の Server Action を呼び出すトグルボタンを実装する
- [x] watch 状態に応じてアイコンまたはテキストを切り替える（例: 「Watch」/「Watching」）
- [x] `src/app/(dashboard)/deals/[id]/page.tsx` のヘッダー部分（`DealHeaderActions` の近く）に `WatchToggle` を追加する
- [x] Server Component 側で `getWatchStatus` を呼び出して初期状態を取得する

**Acceptance Criteria**:
- 案件詳細ページのヘッダーに watch トグルが表示される
- クリックで watch/unwatch が切り替わる
- 全ユーザーが利用できる（admin/manager のみの制限なし）

## T-13: 通知センター UI（未読バッジ＋通知一覧）

- [x] `src/app/(dashboard)/NotificationBell.tsx` を Server Component として作成する — `getNotifications` を呼び出して未読数と通知一覧のデータを取得し、Client Component に渡す
- [x] `src/app/(dashboard)/NotificationPanel.tsx` を Client Component として作成する — 通知一覧の表示と「既読にする」ボタンを実装する
- [x] 未読バッジ: 未読数 > 0 の場合にベルアイコン上にバッジを表示する
- [x] 通知一覧: 各通知は「いつ・誰が・何を・どの対象に」を表示する。対象ラベルとリンクは `targetInfoMap` から取得する。アクションラベルは `getActionLabel` を利用する
- [x] 「既読にする」ボタン: `markNotificationsAsReadAction` を呼び出し、未読を 0 にする
- [x] `src/app/(dashboard)/layout.tsx` のサイドバー領域にベルアイコン＋バッジを配置する（ナビの上部またはヘッダー付近）

**Acceptance Criteria**:
- 未読数 > 0 の場合にバッジが表示される
- 通知一覧に「いつ・誰が・何を・どの対象に」が表示される
- 対象名がリンクとして表示され、クリックで遷移できる
- 「既読にする」で未読が 0 になる
- 通知が新しい順に並ぶ

## T-14: テストの実装

- [x] `src/__tests__/usecases/watchDeal.test.ts` — watch/unwatch/getWatchStatus の usecase テスト
  - watch の作成、取得、削除が正しく動作する
  - 重複 watch が冪等に処理される
  - organizationId 条件のテスト
- [x] `src/__tests__/usecases/dealManagement.test.ts` に createDeal の自動 watch テストを追加する
  - 案件作成時に作成者が自動 watch される
- [x] `src/__tests__/usecases/dealManagement.test.ts` に updateDeal の担当者自動 watch テストを追加する
  - 担当者設定時に担当者が自動 watch される
- [x] `src/__tests__/usecases/getNotifications.test.ts` — getNotifications の usecase テスト
  - watch 中案件の変更（deal.update 等）が通知に含まれる
  - 本人操作が除外される
  - watch 開始前のログが除外される
  - 通知対象外のアクション（meeting.update 等）が除外される
  - 未読数が notifications_last_seen_at 基準で正しい
  - 既読後に未読が 0 になる
  - organizationId 条件のテスト（テナント分離）
- [x] 既存テストが全て green であることを確認する
- [x] typecheck（`bun run build`）が green であることを確認する
- [x] lint（`bun run lint`）が green であることを確認する

**Acceptance Criteria**:
- 受け入れ基準の全項目がテストでカバーされる:
  - watches テーブルと watch トグルで watch/unwatch でき、作成者・担当者が自動 watch される
  - getNotifications が watch 中案件の「案件変更＋配下の追加」を本人除外・新しい順で導出し、通知テーブルを使わない
  - 未読数が notifications_last_seen_at 以降の件数であり、「既読にする」で last_seen が更新され未読が 0 になる
  - watch / notification の全クエリに organizationId 条件がある
- 既存テスト・typecheck・lint が全て green
