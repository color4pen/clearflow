# ADR-022: 案件 Watch と派生（read-side）通知方式

- **Status**: accepted
- **Date**: 2026-06-28
- **Change**: deal-watch-notifications
- **Deciders**: architect

---

## Context

ユーザーが複数の案件を横断的に追跡し、未読の活動を把握したいという要件が発生した。案件ごとのアクティビティ（`getDealActivity` usecase）は既に監査ログから導出できていたが、複数案件を watch してその変化を一覧する手段がなかった。

本変更の主要な設計課題:

1. **Watch ドメインの新設**: ユーザーと案件の購読関係（watch/unwatch）をどのようなデータ構造で表現するか
2. **通知生成方式の選択**: 通知を「保存型」（イベント発火→handler→notifications テーブル→fan-out）で生成するか、「派生（read-side）」（監査ログ + watch 開始時刻から都度導出）で生成するか
3. **未読管理の最小構成**: per-user の既読状態をどのように保持するか
4. **昇格パスの確保**: v1 の派生方式から将来の保存型への移行コストをどう小さく保つか

既存の `auditLogRepository.findByTargets` と `getDealActivity` パターン（ADR-019）が監査ログ取得基盤として確立されており、通知機能はこれを読み取り側で再利用できる立場にあった。

---

## Decisions

### D1: 派生（read-side）方式による通知導出

**Decision**: 通知レコードを保存する専用テーブルを作らず、`watches`（watch 開始時刻）・`users.notifications_last_seen_at`（最終確認時刻）・監査ログの3要素から `getNotifications` usecase が都度導出する。`recordAudit` には一切手を加えない。

**Rationale**:
- v1 要件（watch 案件の未読表示）に対して保存型は過剰な構造。監査ログに記録済みのデータを通知テーブルに複製すると二重管理になる
- 派生方式は既存の `findByTargets` パターン（ADR-019）をそのまま再利用でき、新たなインフラが不要
- 将来保存型への昇格が必要になった場合、`recordAudit` の単一記録点に発火を1行追加するだけで移行できる

#### Alternative: 保存型生成（recordAudit → イベント → 通知 handler → notifications テーブル）

| | |
|---|---|
| **Pros** | 個別既読が可能。watch を外した後も通知履歴を保持できる。クエリが watch 数に依存しない |
| **Cons** | fan-out ロジック・通知テーブルのスキーマ設計・per-user 保存が必要。監査ログとの二重管理が発生する。v1 要件に対して構造が過剰 |
| **Why not** | 派生で v1 要件を満たせる段階での先行投資は管理コストを増やすだけ。必要になれば `recordAudit` の単一記録点から昇格できる |

---

### D2: watches テーブルの新設

**Decision**: `watches`（`id`, `user_id`, `deal_id`, `organization_id`, `created_at`）を新設し、`(user_id, deal_id)` にユニーク制約を付与する。案件の作成者（`createDeal` トランザクション内）と担当者（`updateDeal` で `assigneeId` 変更時）を自動的に watch する。自動 watch も明示的な watch レコードとして同一テーブルに挿入する（冪等: `onConflictDoNothing`）。

**Rationale**:
- `created_at`（watch 開始時刻）が通知の起点フィルタとして不可欠。watch 状態と開始時刻を統一的に管理できる
- 明示 watch と自動 watch を同一テーブルで扱うことで、「watch 中かどうか」の判定が単純な存在確認クエリになる
- トランザクション内での挿入により案件作成/更新と watch 登録の整合性を保証する
- `organization_id` を含めることで全クエリにテナント分離条件を付与できる

#### Alternative: users テーブルに watched_deal_ids 配列カラムを追加

| | |
|---|---|
| **Pros** | テーブル追加不要。シンプルなスキーマ |
| **Cons** | watch 開始時刻を管理できない。配列カラムではテナント分離条件の付与・クエリの柔軟性が低い |
| **Why not** | watch 開始時刻は通知フィルタに必須であり、配列カラムでは保持できない |

#### Alternative: users テーブルに watch 情報を持ち、暗黙的に watch 扱い（テーブルなし）

| | |
|---|---|
| **Pros** | テーブル不要 |
| **Cons** | `getNotifications` のクエリが「作成者 OR 担当者 OR 明示 watch」の複雑な OR 条件になる。watch 開始時刻の管理が不可能 |
| **Why not** | クエリの複雑化と watch 開始時刻の欠落が許容できない |

---

### D3: 未読管理は users テーブルへのカラム追加

**Decision**: `users` テーブルに `notifications_last_seen_at`（timestamp, nullable）を追加する。null は「一度も確認していない」を意味し、watch 開始時刻以降の全ログが未読となる。「既読にする」操作で現在時刻に更新し、以降の未読数は 0 になる。一括既読のみをサポートし、個別既読はスコープ外とする。

**Rationale**:
- per-user の単一時刻で一括既読を実現する最小構成。専用テーブルを追加する理由がない
- nullable カラムは ALTER TABLE が即時完了し、既存コードへの影響が最小（select リストへの追加のみ）
- 個別既読は保存型昇格時の拡張パスとして位置づける

#### Alternative: notification_settings テーブルを新設

| | |
|---|---|
| **Pros** | users テーブルへの変更が不要 |
| **Cons** | `notifications_last_seen_at` 1カラムのためだけに新テーブルは過剰 |
| **Why not** | 最小構成の原則に反する |

---

### D4: getNotifications usecase の設計

**Decision**: `getNotifications` usecase は次のフローで通知を導出する:

1. ログインユーザーの watch 一覧（`watchRepository.findByUser`）を取得
2. 全 watch の最古 `created_at` を `afterDate` として `findByTargets` に渡す（粗いフィルタ）
3. アプリ側で各 watch の `created_at` 以降に精密フィルタ（二段階フィルタ）
4. 通知対象アクション（`NOTIFICATION_ACTIONS`）のみに絞り込み
5. 本人（`actorId = currentUserId`）の操作を除外
6. `targetInfoMap`（対象ラベル・リンク）を構築して返却
7. 未読数は `notifications_last_seen_at` 以降の件数として導出

**Rationale**:
- 既存の `getDealActivity` パターン（エンティティ列挙 → `findByTargets`）を再利用することで、一貫した対象解決ロジックを維持する（ADR-019 参照）
- DB 側の粗いフィルタ（全 watch の最古日時）とアプリ側の精密フィルタ（watch ごとの `created_at`）の二段階により、余分なレコードの取得を抑えつつ正確なフィルタを実現する

#### Alternative: watch ごとに個別クエリを発行する

| | |
|---|---|
| **Pros** | watch ごとの `afterDate` フィルタを DB 側で正確に適用できる |
| **Cons** | watch 数に比例する N+1 クエリが発生する |
| **Why not** | N+1 は性能・コードの複雑度の両面で不利 |

---

### D5: 通知対象アクションの allowlist 定義

**Decision**: 通知対象アクションを domain 層に `NOTIFICATION_ACTIONS` 定数として定義する:
- 案件変更: `deal.update`, `deal.updatePhase`
- 配下の追加: `meeting.create`, `action_item.create`, `contract.create`

`deal.create`（作成者は自動 watch され、自身の操作は除外済み）、`deal.delete`（watch 自体が無意味になる）、配下の更新・削除（通知のノイズ）は対象外とする。

**Rationale**:
- v1 では「重要なイベント（変更・追加）」に限定し、通知ノイズを抑える
- allowlist 方式（含めるリスト）を採用することで、意図しないアクションが通知に入ることを防ぐ（アクティビティの除外リスト方式 ADR-019 D4 とは逆の判断。通知はノイズ制御が重要なため）

#### Alternative: excludelist（除外リスト）方式（ADR-019 D4 と同じアプローチ）

| | |
|---|---|
| **Pros** | 新しい audit action が増えても自動的に通知対象になり、追加漏れが起きない。アクティビティタイムラインと同じ方式で統一感がある |
| **Cons** | 意図しないアクション（`deal_contact.create` 等）が通知に混入するリスクがある。通知はアクティビティと異なりノイズが許容されにくく、受信側が頻繁に「気にならない通知」を受け取ることになる |
| **Why not** | 通知の価値はノイズを抑えることにある。新しい action が増えた際に通知対象かどうかを意識的に判断させる allowlist 方式の方が、誤通知よりも通知漏れが望ましい。アクティビティは「全部見たい」、通知は「重要なものだけ受け取りたい」という性質の違いによる |

---

### D6: auditLogRepository への `afterDate` / `excludeActorId` オプション追加

**Decision**: `findByTargets` に `afterDate`（`gte(createdAt, afterDate)`）と `excludeActorId`（`ne(actorId, excludeActorId)`）を optional パラメータとして追加する。既存の呼び出し箇所に影響しない後方互換な拡張とする。

**Rationale**:
- `getNotifications` 専用のクエリ関数を新設せず、既存 `findByTargets` を拡張することで関数の増殖を防ぐ
- optional パラメータのため、既存の `getDealActivity` 等の呼び出しは変更不要

#### Alternative: 通知専用の `findByTargetsForNotifications` 関数を新設する

| | |
|---|---|
| **Pros** | 通知取得の要件（`afterDate`・`excludeActorId` 必須）が関数シグネチャで表現できる。`findByTargets` の汎用インターフェースが複雑化しない |
| **Cons** | `findByTargets` とほぼ同一のクエリロジックが重複する。同じ WHERE 句の変種が増えるたびに専用関数が増殖するパターンになる |
| **Why not** | 実装の重複が保守コストを増やす。optional パラメータの追加はシグネチャを若干複雑にするが、既存呼び出しを変更せずに済むメリットの方が大きい |

---

## Consequences

### Positive

- 専用の通知生成インフラ（イベント発火・handler・notifications テーブル・fan-out）なしに通知機能を実現できる
- 監査ログに記録済みのデータを複製する二重管理が発生しない
- `getDealActivity` 等の既存パターン（ADR-019）を再利用でき、コードの一貫性が保たれる
- `recordAudit` を一切変更しないため、監査ログ記録の正確性・既存テストへの影響がない
- 通知機能は `ACTIVITY_FEED_ENABLED` フラグとは独立して動作し、機能フラグの組み合わせが増えない

### Negative / Trade-offs

- **一括既読のみ**: `notifications_last_seen_at` による一括既読のため、特定の通知だけを既読にできない。個別既読は保存型昇格時の拡張パスとして位置づける
- **unwatch で過去通知が消える**: 通知は現在の watch から導出するため、unwatch すると該当案件の通知が見えなくなる。v1 の仕様として許容する
- **watch 数に比例するクエリ負荷**: `getNotifications` は watch 中の各案件について配下エンティティを列挙し監査ログを取得するため、watch 数が多いとクエリが増える。v1 では取得件数に `limit` を設け、重くなれば保存型への昇格を検討する

### Constraints for future changes

- **通知テーブルの追加禁止（派生方式の維持）**: 派生で要件を満たせる間は `notifications` テーブルを追加しないこと。保存型が必要になった場合は `recordAudit` の単一記録点に発火を1行追加して移行すること（D1 参照）
- **watch 開始時刻フィルタの維持**: 通知の起点は `watches.created_at`（watch 開始時刻）であり、それ以前のログを通知に含めてはならない（D4 参照）
- **自動 watch のトランザクション整合性**: `createDeal` / `updateDeal` の自動 watch 挿入は必ず同一トランザクション内で行うこと。トランザクション外での挿入は整合性を破壊する（D2 参照）
- **watch クエリへのテナント分離条件**: `watchRepository` の全操作（create / findByUserAndDeal / findByUser / deleteByUserAndDeal）に必ず `organizationId` 条件を付与すること。条件を省略した取得メソッドを追加しないこと（D2 参照）
- **NOTIFICATION_ACTIONS の変更**: 通知対象アクションを追加・削除する場合は `src/domain/models/notification.ts` の `NOTIFICATION_ACTIONS` 定数のみを変更すること。usecase やリポジトリに直接ハードコードしないこと（D5 参照）
- **保存型への昇格パス**: 個別既読・unwatch 後の履歴保持・リアルタイム通知などが必要になった場合、`recordAudit` の呼び出し後に `notificationService.notify(...)` を1行追加する形で保存型へ昇格できる。その際は `watches` テーブルと `notifications_last_seen_at` はそのまま流用できる

---

## References

- `specrunner/changes/deal-watch-notifications/request.md` — 要件定義と architect 評価済み設計判断
- `specrunner/changes/deal-watch-notifications/design.md` — 詳細設計（D1〜D8）
- `specrunner/changes/deal-watch-notifications/spec.md` — ビヘイビア仕様
- `specrunner/changes/deal-watch-notifications/review-feedback-001.md` — コードレビュー所見
- `specrunner/adr/ADR-019-deal-activity-timeline.md` — 監査ログ派生タイムラインの先行 ADR（`findByTargets` パターンの確立）
- `src/application/usecases/getNotifications.ts` — 派生通知導出 usecase
- `src/application/usecases/watchDeal.ts` / `unwatchDeal.ts` / `getWatchStatus.ts` — Watch ドメイン usecase
- `src/infrastructure/repositories/watchRepository.ts` — Watch リポジトリ実装
- `src/infrastructure/repositories/auditLogRepository.ts` — `afterDate` / `excludeActorId` 拡張
- `src/domain/models/notification.ts` — `NOTIFICATION_ACTIONS` 定数・通知型定義
- `src/domain/models/watch.ts` — Watch ドメインモデル
- `src/infrastructure/schema.ts` — `watches` テーブル定義
- `drizzle/0012_graceful_metal_master.sql` — `watches` テーブルと `notifications_last_seen_at` カラムのマイグレーション
- `src/app/(dashboard)/NotificationBell.tsx` / `NotificationPanel.tsx` — 通知 UI コンポーネント
- `src/app/(dashboard)/deals/[id]/WatchToggle.tsx` — Watch トグル UI
