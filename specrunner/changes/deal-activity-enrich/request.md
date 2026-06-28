# 案件アクティビティに対象エンティティ名とリンクを表示

## Meta

- **type**: spec-change
- **slug**: deal-activity-enrich
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 新規 port/adapter なし・契約/振る舞いの構造変更なし・既存データの表示拡張のみのため false -->

## 背景

案件アクティビティは「誰が・いつ・何をしたか（アクション文）」のみで、**どの対象に対してか**が分からない（例:「アクションアイテムを追加」だけで、どの項目かが不明）。各行に対象エンティティの名前を表示し、詳細ページがある対象はリンクにして、何が追加/変更されたかを辿れるようにする。

## 現状コードの前提

- src/application/usecases/getDealActivity.ts — 案件配下（meeting / contract / invoice / action_item / deal_contact）を解決して targets を組み、`findByTargets` で `AuditLog[]` を返す。**解決済みエンティティは関数内に存在するが、表示用には返していない**
- src/app/(dashboard)/deals/[id]/DealActivitySection.tsx — 時刻・actor・アクション文のみ表示。対象名/リンク無し
- src/domain/models/auditLog.ts — `AuditLog` は `targetType` / `targetId` を持つ（対象の特定は可能）
- 詳細ページがある対象: deal（/deals/[id]） / meeting（/deals/[id]/meetings/[meetingId]） / contract（/contracts/[id]）。**invoice / action_item / deal_contact は詳細ページ無し**
- 表示名フィールド: meeting=種別+日時 / contract.title / invoice.title / action_item.description / deal.title

## 要件

1. `getDealActivity` が `AuditLog[]` に加えて、**`targetType` + `targetId` → `{ label, href? }` の対応マップ**を返す。マップは**既に解決済みのエンティティから組む**（新規のリポジトリ取得を増やさない）
2. ラベルとリンクの対応:
   - deal=案件名 / meeting=種別+日時 / contract=契約名 / invoice=請求名 / action_item=内容
   - `href` は詳細ページがある **deal / meeting / contract のみ**付与。invoice / action_item はテキストのみ（href なし）
   - deal_contact はアクション文（「担当者を追加/削除」）で足りるため対象ラベルの対象外とする（contactId→氏名の追加解決はしない）
3. `DealActivitySection` が各行で、アクション文に続けて対象ラベルを表示する。`href` がある対象はリンクにする
4. 対象がマップに無い場合（削除済み等で解決不能）は対象表示を省略し、従来通りアクション文のみで成立させる（フォールバック）
5. 既存表示（時刻・actor・アクション文）、env フィーチャーフラグ、件数上限（`ACTIVITY_TIMELINE_LIMIT`）は不変

## スコープ外

- 「何を変更したか」の詳細（変更前後の値・フィールド差分）。変更履歴／バージョン管理に踏み込むため本リクエストでは扱わない
- invoice / action_item / deal_contact の詳細ページ新設
- 監査ログ記録側（`recordAudit`）の変更・metadata 拡充
- 案件詳細以外（ダッシュボードの「最近のアクティビティ」等）の表示変更

## 受け入れ基準

- [ ] `getDealActivity` が対象の `{ label, href? }` マップを返し、新規リポジトリ取得を増やしていないことをテストで固定する
- [ ] `DealActivitySection` が対象ラベルを表示し、deal / meeting / contract はリンク・invoice / action_item はテキストのみであることをテストで固定する
- [ ] 対象が解決できない場合にアクション文のみで表示が壊れないことをテストで固定する
- [ ] 既存テストが無変更で green（既存の表示要素・件数・env 挙動が不変）
- [ ] typecheck / lint が green
