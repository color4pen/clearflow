# 案件アクティビティの厳選表示（タイムライン）

## Meta

- **type**: spec-change
- **slug**: activity-timeline-curation
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 既存の DealActivityResult（監査ログ由来の読み取りモデル）の表示ロジックを「分類・集約・整形」する改善。新しい port/adapter・スキーマ変更は無いため false -->

## 背景

案件詳細の「アクティビティ」は監査ログを無選別に全件表示しており、フェーズ変更の連発やアクションアイテムのトグル往復などノイズが多く、意味のある動きが埋もれる。設計（`docs/design/01-domain-design.md` §7.2、`docs/design/ユビキタス言語辞書.md`「タイムラインの構成概念」）に従い、タイムラインを **顧客接点（Interaction）＋ 業務イベント（Event）の厳選表示**に変更する。監査ログ（全変更の網羅記録）はそのまま流さない。**スキーマ変更は行わない**（既存の監査ログ由来データを分類・集約・整形する）。

## 現状コードの前提

- `src/application/usecases/getDealActivity.ts` — 案件配下（deal/meeting/contract/invoice/action_item/deal_contact）の監査ログを `auditLogRepository.findByTargets` で集約。`ACTIVITY_TIMELINE_LIMIT`(=30) を **DB 取得時に** 適用。`getHiddenActions()`（env `ACTIVITY_HIDDEN_ACTIONS`）で追加除外。
- `src/app/(dashboard)/deals/[id]/DealActivitySection.tsx` — `[相対時刻] [操作者] が [操作ラベル] ： [対象名(リンク)]` を新しい順に表示。
- `src/lib/activityLabels.ts` — `ACTION_LABELS` による action→日本語ラベル。`action_item.toggle` は metadata.done で分岐。**`action_item.updateStatus` 等はラベル未定義で生キーが漏れる**。フォールバックは `?? log.action`。
- `src/lib/activityConfig.ts` — `ACTIVITY_TIMELINE_LIMIT` / `getHiddenActions` / `isActivityFeedEnabled`（env `ACTIVITY_FEED_ENABLED`）。
- `src/domain/models/auditLog.ts` — `AuditAction`/`AuditTargetType`/`AuditMetadataMap`。状態遷移の metadata: `deal.updatePhase` は `{ fromPhase, toPhase }`、`contract.updateStatus` は `{ fromStatus, toStatus }` を記録済み。**`invoice.update_status` は from/to を記録していない**。`AuditMetadataMap` は現状 `action_item.toggle`/`action_item.updateStatus` の2件のみ。
- 状態遷移を記録する usecase: `src/application/usecases/updateInvoiceStatus.ts`（現状 metadata 未付与）。
- `src/__tests__/usecases/dealActivity.test.ts` — 現状 action_item/deal_contact を取得対象に含む前提のテスト（新仕様に追従して改修が必要）。

## 要件

1. **表示対象の分類**: 監査ログを次に分類し、タイムラインには「顧客接点」「業務イベント」のみ表示する。
   - 顧客接点（表示）: `meeting.create`
   - 業務イベント（表示）: `deal.create` / `deal.updatePhase`（受注・失注を含む） / `contract.create` / `contract.updateStatus` / `invoice.create` / `invoice.update_status`
   - 除外（非表示）: 細かなフィールド更新（`deal.update` / `contract.update` / `invoice.update` / `meeting.update`）、タスク（`action_item.*`）、案件担当者の増減（`deal_contact.*`）
   - `getDealActivity` の取得対象から `action_item` / `deal_contact` を外す（取得もしない）。
2. **集約**: 取得 → 厳選・集約 → 件数上限（`ACTIVITY_TIMELINE_LIMIT`）の順に適用する（DB 取得時に上限で切らない）。
   - 同一の `(操作者・アクション・対象)` が連続する場合は 1 件にまとめ、件数を示す。
   - 状態遷移系（`deal.updatePhase` / `contract.updateStatus` / `invoice.update_status`）が連続する場合は、最初の変更前から最後の変更後への正味の遷移にまとめる。
3. **状態遷移の表示（from→to）**: フェーズ変更・契約ステータス変更は metadata の遷移情報から「変更前 → 変更後」を表示する（例「提案準備 → 交渉中」）。`invoice.update_status` も `updateInvoiceStatus` で `{ fromStatus, toStatus }` を metadata に記録し、`AuditMetadataMap` に該当アクション（`deal.updatePhase` / `contract.updateStatus` / `invoice.update_status`）のエントリを追加して型安全に扱う。遷移情報を持たない既存ログは遷移を表示しない（単に「請求ステータスを変更」等）。
4. **ラベル整備**: タイムラインに表示するすべてのアクションに日本語ラベルを与え、生のアクションキー（例 `action_item.updateStatus`）が UI に漏れないようにする。
5. **表示の体裁**: 顧客接点と業務イベントを時系列で表示する。リンクのある対象（商談・契約・請求）はクリックで詳細へ遷移できる。

## スコープ外

- スキーマ変更（テーブル/カラム/enum の追加・変更）。
- 顧客接点（Interaction）のエンティティ化・Meeting の一般化（別リクエスト R2）。
- 契約調整・請求調整など新しい顧客接点 type（別リクエスト R3）。
- 監査ログ（全変更）の別画面（履歴/監査ビュー）化。
- 売掛金・督促・回収（AR/債権管理）。

## 受け入れ基準

**テスト方針（必須）**: 振る舞いは `.dynamic.test.ts` の `mock.module` 方式で **実行して** assert する（`getDealActivity` や表示用の分類・集約関数を実行）。ソースの静的検査（readSrc / toContain）で代替しない。

- [ ] 監査ログが「顧客接点／業務イベント／除外」に正しく分類され、除外対象（`*.update` / `action_item.*` / `deal_contact.*`）がタイムラインに出ないことを実行テストで固定する。
- [ ] `getDealActivity` が `action_item` / `deal_contact` を取得対象に含めないことを実行テストで固定する。
- [ ] 連続する同一操作が件数つき 1 件に、連続する状態遷移が「最初の変更前 → 最後の変更後」に集約されることを実行テストで固定する。
- [ ] 件数上限が取得時ではなく厳選・集約後に適用されることを実行テストで固定する。
- [ ] `deal.updatePhase` / `contract.updateStatus` / `invoice.update_status` が「変更前 → 変更後」で表示され、`invoice.update_status` の metadata に `{ fromStatus, toStatus }` が記録されることを実行テストで固定する。
- [ ] 表示対象アクションに生のアクションキーが UI へ漏れない（全てラベル化される）ことを実行テストで固定する。
- [ ] 既存テスト（`dealActivity.test.ts` 等）を新仕様に追従して改修し、`bun test` green / `typecheck` / `bun run build` が成功する。
- [ ] 依存方向（actions/RSC → usecases → domain / infrastructure）を遵守する。

## architect 評価済みの設計判断

1. **タイムライン = 顧客接点 ＋ 業務イベント の厳選表示**。監査ログ（全変更）を無選別に流すのはアンチパターン（ノイズで重要な動きが埋もれる）。表示対象を業務的に意味のあるものに限定する。
2. **スキーマ変更なし**。既存の監査ログ由来データ（DealActivityResult）を分類・集約・整形する表示層/読み取り層の改善に閉じる。Interaction のエンティティ化は別リクエスト。
3. **タスク（action_item）・案件担当者（deal_contact）はタイムライン対象外**。タスクは別概念、担当者増減は軽微なデータ編集のため、取得対象からも外す。
4. **集約は表示用の読み取り処理**であり、監査ログ自体は欠落させない（追記専用の記録は保持）。
5. **`invoice.update_status` の from/to 記録は非スキーマの usecase 改修**で行い、`AuditMetadataMap` のエントリ追加で型安全に扱う。既存ログは遷移情報を持たないため遷移表示はしない。
