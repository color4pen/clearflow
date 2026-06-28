# Design: 案件の watch とアクティビティ通知（監査ログから派生）

## Context

ユーザーが関心のある案件を watch し、案件およびその配下エンティティの活動を通知として受け取る機能を追加する。

現状、案件のアクティビティは `getDealActivity` usecase で監査ログから取得して案件詳細ページに表示できるが、ユーザーが複数の案件を横断的に追跡し、未読の活動を把握する手段がない。

既存の監査ログ基盤（`auditLogRepository.findByTargets`）は、対象のリストに対して `organizationId` 付きで監査ログを取得する API を持ち、`getDealActivity` がこれを利用して案件＋配下の活動を取得している。通知機能はこの既存基盤の上に乗る。

watch / notification のテーブル・コードは現在存在しない（完全新規）。

## Goals / Non-Goals

**Goals**:

- 案件を watch/unwatch できるトグル UI を案件詳細ヘッダーに追加する
- 案件の作成者・担当者を自動的に watch する
- watch 中の案件について、監査ログから通知を都度導出する usecase を提供する
- ダッシュボードのナビバーに未読バッジと通知一覧 UI を追加する
- 未読/既読を per-user の `notifications_last_seen_at` で管理する

**Non-Goals**:

- 保存型の通知生成（イベント発火・通知 handler・notifications テーブル・fan-out）
- 案件以外（引合・顧客等）の watch
- 個別既読（通知1件だけ既読にする機能）
- メール・プッシュ通知
- 変更内容の詳細表示（変更前後の値）

## Decisions

### D1: 派生（read-side）方式による通知導出

通知レコードを保持する専用テーブルは作らず、`watches` + `notifications_last_seen_at` + 監査ログの3要素から都度導出する。

**Rationale**: v1 要件（watch 案件の未読表示）に対し保存型は過剰。監査ログに記録済みのデータを複製する構造的な問題を避ける。保存型が必要になった場合、`recordAudit` の単一記録点に発火を1行足すだけで昇格可能。

**Alternatives considered**:
- **保存型生成**（recordAudit → イベント → 通知 handler → notifications テーブル）: fan-out ロジック、通知テーブルのスキーマ設計、個別既読管理が必要になり、v1 の規模には過剰。却下。

### D2: watches テーブルの設計

`watches` テーブルを `(id, user_id, deal_id, organization_id, created_at)` で新設する。`(user_id, deal_id)` にユニーク制約を付与し、重複 watch を防止する。

**Rationale**: watch 状態と開始時刻の両方を管理でき、開始時刻は通知の起点フィルタとして使用する。テナント分離のため `organization_id` を含め、全クエリに条件を付与する。

**Alternatives considered**:
- **users テーブルに watched_deal_ids 配列カラム**: 開始時刻の管理が困難で、クエリの柔軟性が低い。却下。

### D3: 未読管理は users テーブルへのカラム追加

`users` テーブルに `notifications_last_seen_at` (timestamp, nullable) を追加する。null は「一度も確認していない」を意味し、watch 開始時刻以降の全ログが未読になる。

**Rationale**: per-user の単一時刻で一括既読を実現する最小構成。専用テーブルを増やす理由がない。

**Alternatives considered**:
- **notification_settings テーブルを新設**: last_seen 1カラムのためだけに新テーブルは過剰。却下。

### D4: getNotifications usecase の設計

`getNotifications` は以下のフローで通知を導出する:

1. ログインユーザーの watch 一覧を取得
2. 各 watch 対象の案件について、`getDealActivity` と同等の対象解決（案件＋配下エンティティの列挙）を行い、監査ログを取得
3. 通知対象アクションのフィルタ: `deal.update`, `deal.updatePhase`, `meeting.create`, `action_item.create`, `contract.create`
4. 本人（actorId = currentUserId）の操作を除外
5. 各 watch の `created_at` 以降のログに限定
6. `targetInfoMap` を構築して返却
7. 未読数は `notifications_last_seen_at` 以降の件数として導出

**Rationale**: 既存の `getDealActivity` のパターン（エンティティ列挙 → findByTargets）を再利用することで、一貫した対象解決ロジックを維持する。

### D5: 自動 watch の挿入ポイント

案件作成（`createDeal`）のトランザクション内で作成者を自動 watch する。案件更新（`updateDeal`）で担当者（`assigneeId`）が設定・変更された場合、その担当者を自動 watch する（冪等 — 既に watch 済みなら何もしない）。

**Rationale**: 明示的な watch レコードとして扱うことで、watch の有無を統一的にクエリできる。トランザクション内で実行することで、案件作成/更新と watch の整合性を保つ。

**Alternatives considered**:
- **暗黙的に watch 扱い（テーブルに行を挿入しない）**: getNotifications のクエリが複雑化し、「作成者 OR 担当者 OR 明示 watch」の OR 条件が必要になる。却下。

### D6: 通知 UI の配置

ダッシュボードのナビバー（`SidebarNav` 付近）に通知ベルアイコン＋未読バッジを追加する。クリックで通知一覧（ドロップダウンまたはパネル）を表示する。レイアウト（`layout.tsx`）で未読数を Server Component として取得し、通知一覧は Client Component で表示する。

**Rationale**: ナビバーは全ダッシュボードページで共有されるため、通知の入り口として最適。Server Component で初期データを取得し、Client Component でインタラクション（既読にする等）を処理する分担が Next.js のパターンに合致する。

### D7: auditLogRepository の拡張

`findByTargets` に `afterDate` オプション（`gte(auditLogs.createdAt, afterDate)`）と `excludeActorId` オプション（`ne(auditLogs.actorId, excludeActorId)`）を追加する。既存呼び出しに影響しない optional パラメータとして追加する。

**Rationale**: getNotifications は watch 開始以降のログに限定し、本人操作を除外する必要がある。既存の `findByTargets` を拡張することで、通知専用のクエリ関数を増やさずに済む。

### D8: 通知対象アクションの定義

通知対象アクションは domain 層に定数として定義する:

- 案件変更: `deal.update`, `deal.updatePhase`
- 配下の追加: `meeting.create`, `action_item.create`, `contract.create`

`deal.create` と `deal.delete` は通知対象外とする（作成者は自分自身のため除外済み、削除は watch 自体が無意味になる）。

**Rationale**: 要件に明記された対象アクションに限定する。配下の「更新・削除」は通知のノイズになるため v1 では含めない。

## Risks / Trade-offs

[Risk] **watch 案件数に比例するクエリ負荷** — getNotifications は各 watch 案件について配下エンティティを列挙し監査ログを取得するため、watch 数が多いとクエリが増える。
→ Mitigation: v1 では通知取得に limit を設け、watch 数が多い場合は最新 N 件に制限する。重くなれば保存型へ昇格する前提。

[Risk] **unwatch すると過去通知が消える** — 通知は現在の watch から導出するため、unwatch すると該当案件の通知が見えなくなる。
→ Mitigation: v1 の仕様として許容する。ユーザーが明示的に unwatch した案件の通知を保持する要件はない。

[Risk] **個別既読が不可** — `notifications_last_seen_at` による一括既読のみのため、特定の通知だけを既読にできない。
→ Mitigation: v1 の仕様として許容する。保存型昇格時に個別既読を追加する拡張パスがある。

[Risk] **users テーブルへのカラム追加** — `notifications_last_seen_at` の追加は既存の User 型に影響する。
→ Mitigation: nullable カラムのため ALTER TABLE は即時完了。ドメインモデル `User` にはカラムを追加するが、既存コードの `findById`/`findByOrganization` の select リストに追加するだけで破壊的変更にならない。

## Open Questions

（なし — 要件と設計判断が明確に定義されている）
