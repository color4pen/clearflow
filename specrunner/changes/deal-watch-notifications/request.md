# 案件の watch とアクティビティ通知（監査ログから派生）

## Meta

- **type**: new-feature
- **slug**: deal-watch-notifications
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: watch/通知という新しいドメイン概念の追加＋「保存型でなく派生(read-side)で実装する」という設計選択を記録するため true -->

## 背景

ユーザーが関心のある案件を **watch** し、その案件で起きた活動（案件自体の変更・配下の追加）を web のメニューで通知として確認したい。通知は**監査ログから派生して都度導出**する方式とし、専用の生成インフラ（イベント発火・通知 handler・通知テーブル・fan-out）は作らない。未読/既読は per-user の last_seen 時刻で管理する。

## 現状コードの前提

- src/infrastructure/repositories/auditLogRepository.ts — `findByTargets(organizationId, targets, {limit, excludeActions})` で対象別に監査ログを取得できる
- src/application/usecases/getDealActivity.ts — 案件＋配下（meeting/contract/invoice/action_item/deal_contact）の活動を取得し、対象ラベル/リンクのマップ（`targetInfoMap`）も返す
- watch / notification のテーブル・コードは**存在しない**（完全新規）
- users は org 単位。last_seen 用カラムは無い
- ナビ: src/app/(dashboard)/layout.tsx ＋ src/app/(dashboard)/SidebarNav.tsx
- 案件詳細ヘッダー: src/app/(dashboard)/deals/[id]/page.tsx 上部（タイトル＋フェーズ操作の行、`flex items-start justify-between`）
- 自動 watch のトリガ候補: src/application/usecases/createDeal.ts（作成者）/ updateDeal.ts（担当者）
- src/application/services/auditRecorder.ts（recordAudit）は存在するが、**本リクエストでは触らない**（派生方式のためイベント発火は不要）

## 要件

1. **watch モデル**: `watches`（`user_id` / `deal_id` / `organization_id` / `created_at`）を新設。案件詳細ヘッダーに watch トグル（watch / unwatch）。案件の**作成者・担当者は自動的に watch**（明示的な watch 行として扱ってよい）。全クエリに `organizationId` 条件（テナント分離）を必須とする
2. **未読管理**: per-user の最終確認時刻 `notifications_last_seen_at` を保持する（users への列追加など最小構成で）
3. **派生 getNotifications usecase**: ログインユーザーが watch 中の案件について、監査ログから次を導出する。**通知レコードは保存しない（都度導出）**
   - 対象アクション: 案件の変更（`deal.update` / `deal.updatePhase` 等）＋ 配下の**追加**（`meeting.create` / `action_item.create` / `contract.create`）
   - **本人（actorId = ログインユーザー）の操作は除外**
   - watch 開始（`watches.created_at`）以降のものに限る
   - 新しい順。未読 = `notifications_last_seen_at` 以降
   - 表示用に、A1 の対象ラベル/リンク（`targetInfoMap` 相当）を併せて返す
4. **通知センター UI**: ダッシュボードのナビに**未読バッジ＋通知一覧**を追加。各通知は「いつ・誰が・何を・どの対象に」を A1 のラベル/リンクで表示。「既読にする」で `notifications_last_seen_at` を更新し未読を 0 にする
5. **独立性**: 通知は監査ログを読むだけ。監査ログ記録・アクティビティ表示の env フラグとは独立に動く

## スコープ外

- **保存型の通知生成**（recordAudit からのイベント発火・通知 handler・notifications テーブル・fan-out）。派生で v1 要件を満たすため作らない。大規模化・個別既読・リアルタイムが必要になった時点で recordAudit の単一記録点に発火を1行足して昇格できる（今は作らない）
- watch 対象の拡張（引合・顧客等）。**案件のみ**
- 個別既読（通知1件だけ既読）。last_seen までの**一括既読のみ**
- メール / プッシュ通知。**アプリ内のみ**
- 変更内容の詳細（変更前後の値）。変更履歴／バージョン管理に踏み込むため対象外

## 受け入れ基準

- [ ] `watches` テーブルと案件詳細の watch トグルで watch/unwatch でき、作成者・担当者が自動 watch されることをテストで固定する
- [ ] `getNotifications` が watch 中案件の「案件変更＋配下の追加」を本人除外・新しい順で導出し、**通知テーブルを使わない（派生）**ことをテストで固定する
- [ ] 未読数が `notifications_last_seen_at` 以降の件数であり、「既読にする」で last_seen が更新され未読が 0 になることをテストで固定する
- [ ] watch / notification の全クエリに `organizationId` 条件があることをテストで固定する
- [ ] 既存テストが green / typecheck・lint が green

## architect 評価済みの設計判断

- **採用**: 派生（read-side）方式。監査ログ＋`watches`＋`notifications_last_seen_at` から都度導出する。保存型インフラ（イベント/handler/通知テーブル）は作らない
- **却下 — 保存型生成**（recordAudit→イベント→通知 handler→`notifications` テーブルに per-user 保存・fan-out）: v1 要件（watch 案件の未読表示）に対し過剰で、構造的に複製を生む。必要になれば recordAudit の単一記録点に発火を足して移行できるため、先行投資しない
- **トレードオフ（design / spec-review で確認）**: 個別既読は不可（last_seen までの一括）/ unwatch すると過去通知も見えなくなる（現在の watch から導出）/ watch 数が多いとクエリが重くなり得る。getNotifications は watch 中の各案件について getDealActivity 流の対象解決を行うため、案件数に比例する。v1 規模では許容、重くなれば保存型へ昇格
