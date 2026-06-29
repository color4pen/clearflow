# アクションアイテムの作業ステータス（L1）

## Meta

- **type**: new-feature
- **slug**: action-item-status
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 既存パターン（repository・usecase・Server Action・recordAudit・差分マイグレーション）に沿って status を1本足すだけ。done との同期・導出は architect 判断に明記。新しい port/adapter は無いため false -->

## 背景

アクションアイテムは完了/未完了の真偽値（done）しか持たず「対応中」を表現できない。受注業務の作業管理として、未着手 / 対応中 / 完了の固定3ステータス（L1）を扱えるようにする。既存データに触れず、done との後方互換を保つ。通知（期限・アサイン）は本リクエストの対象外。

## 現状コードの前提

- src/infrastructure/schema.ts action_items（526行〜）: `done boolean NOT NULL default false`、index `(organization_id, done)`。status カラムは無い
- src/domain/models/auditLog.ts AuditAction: action_item.create / update / delete / toggle。`action_item.updateStatus` は無い。AuditMetadataMap に `action_item.toggle: { done: boolean }`
- 既存 UI: 案件詳細のアクションアイテムは done のチェックボックスで完了切替（action_item.toggle）
- `done` は一覧フィルタ・ダッシュボードの「未完了」集計・index 等で使われており後方互換が必要

## 定数

- ACTION_ITEM_STATUSES: ["todo", "in_progress", "done"]   # 未着手 / 対応中 / 完了

## 要件

1. schema に `action_items.status`（text, **nullable**, 値は ACTION_ITEM_STATUSES）を追加し、`bun run db:generate` で差分マイグレーションを生成する。**既存行は null のまま（backfill しない＝既存データ不可侵）**
2. **読み取り時の導出**: status が null の行は `done` から導出する（done=true → "done"、done=false → "todo"）。ドメイン/読み取りモデルで実効ステータスを提供する
3. **done との同期**: status を更新する際、`done` を `status === "done"` に同期する。既存の done ベースのフィルタ・toggle・ダッシュボードが従来どおり動くことを保つ
4. `updateActionItemStatus` usecase: `{ id, organizationId, actorId, status }` — status を設定し done を同期、`recordAudit({ action: "action_item.updateStatus", targetType: "action_item", targetId: id, actorId, organizationId, metadata: { status } })`
5. `src/domain/models/auditLog.ts` の AuditAction に `"action_item.updateStatus"` を、AuditMetadataMap に `"action_item.updateStatus": { status: string }` を追加
6. actions 層に `updateActionItemStatusAction`（auth 認証、認可は既存のアクションアイテム編集に準拠＝全ロール、organizationId/actorId は session 由来、zod で status 検証）
7. UI: アクションアイテムに3ステータスの切替（未着手/対応中/完了）を追加する。既存の done チェックボックスと矛盾しない（完了 ⇔ done=true）

## スコープ外

- 期限リマインド・アサイン通知（watch ベースの派生通知に actionItem は乗っていないため別リクエスト）
- 保留（on_hold）等の追加ステータス（3値に限定）
- `done` カラムの廃止（後方互換のため残す。廃止は将来の別リクエスト）
- 既存行の backfill（データ不可侵のため読み取り導出で対応）

## 受け入れ基準

**テスト方針（必須）**: 振る舞いは usecase を実行して assert する（`.dynamic.test.ts` の `mock.module` 方式）。ソースの静的検査（readSrc / toContain）で代替しない。

- [ ] status=null の行が done=true で "done"、done=false で "todo" に導出されることをテストで固定する
- [ ] `updateActionItemStatus` で status が設定され done が同期される（status="done"→done=true、それ以外→done=false）ことをテストで固定する
- [ ] `action_item.updateStatus` 監査が `metadata.status` 付きで記録されることをテストで固定する
- [ ] マイグレーションが status カラム追加のみ（nullable・backfill なし・他カラム/テーブル変更を含まない）で `drizzle-kit check` 通過
- [ ] 既存の done ベースの振る舞い（toggle・未完了フィルタ）が従来どおりであることを確認する
- [ ] 依存方向 actions/RSC → usecases → domain / infrastructure を遵守する
- [ ] 既存テスト無変更で `bun test` green、`typecheck` green、`bun run build` 成功

## architect 評価済みの設計判断

1. **status は nullable・backfill なし・読み取り導出** — 「既存データに触らない」制約を守るため status を nullable で追加し、既存行（null）は done から導出する。新規/更新時に status を明示設定する。
2. **done を残して同期** — done は既存のフィルタ・index・ダッシュボードで使われており廃止は影響大。status を真実源としつつ done を同期（done = status==="done"）し後方互換を保つ。done 廃止は将来の別リクエスト。
3. **通知は対象外** — actionItem は watch ベースの派生通知に乗っていないため、期限/アサイン通知は別途設計が必要。本リクエストは status に絞る。
4. **3値固定** — 未着手/対応中/完了に限定（受注業務の作業管理に必要十分）。ワークフロービルダー等は作らない（Redmine 化を避ける）。
