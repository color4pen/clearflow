# Design: action-item-status

## Context

アクションアイテムは `done: boolean` のみで完了/未完了を表現しており「対応中」を示す手段がない。受注業務の作業管理で未着手・対応中・完了の3段階を把握できるよう、固定3ステータス（todo / in_progress / done）を追加する。

現状の関連コード:
- `src/infrastructure/schema.ts` の `actionItems` テーブル: `done boolean NOT NULL default false`、index `(organization_id, done)`
- `src/domain/models/actionItem.ts`: `ActionItem` 型に `done: boolean`
- `src/infrastructure/repositories/actionItemRepository.ts`: `mapRow` で done をマッピング、`findByOrganization` で `done` フィルタ、`update` で `done` を受け取る
- `src/application/usecases/toggleActionItemDone.ts`: done を反転して `action_item.toggle` 監査記録
- `src/app/actions/actionItems.ts`: `toggleActionItemAction` が `actionItem.toggle` 権限チェック
- `src/app/(dashboard)/components/ActionItemRow.tsx`: チェックボックスで done を toggle
- `src/app/(dashboard)/tasks/page.tsx`: `status=todo|done` でタブフィルタ（内部は `done: boolean` で検索）
- `src/app/(dashboard)/dashboard/SalesDashboard.tsx` / `getDashboardActions`: `done: false` で未完了を集計
- `src/domain/models/auditLog.ts`: `action_item.toggle` / `{ done: boolean }` メタデータ

**制約**: 既存行の backfill 禁止。done カラムは残して後方互換を保つ。

## Goals / Non-Goals

**Goals**:

- `action_items` テーブルに `status` カラム（nullable text）を追加し、差分マイグレーションで適用する
- status が null の既存行は `done` から実効ステータスを導出する（done=true → "done"、done=false → "todo"）
- status 更新時に `done` を `status === "done"` に自動同期し、既存の done ベース機能（toggle、フィルタ、ダッシュボード）の後方互換を保つ
- `updateActionItemStatus` usecase を新設し、`action_item.updateStatus` 監査記録を残す
- UI にステータス切替を追加し、チェックボックスとの整合を保つ

**Non-Goals**:

- 期限リマインド・アサイン通知の実装
- 保留（on_hold）等の追加ステータス
- `done` カラムの廃止（後方互換のため残す）
- 既存行の backfill

## Decisions

### D1: status カラムは nullable・backfill なし・読み取り導出

**結論**: `status text` を nullable で追加。既存行は null のまま残し、読み取り時に done から導出する。

**Rationale**: 既存データ不可侵の制約を守るため。NOT NULL + DEFAULT だとマイグレーション自体は安全だが、既存行の status 値が実態（done）と乖離するリスクがある。nullable + 導出なら既存行の実態が常に正しく反映される。

**Alternatives**:
- `NOT NULL DEFAULT 'todo'` で追加 → 既存の done=true 行が status='todo' になり不整合。backfill が必要になる
- `NOT NULL` + backfill → 既存データ不可侵ポリシーに違反

### D2: 導出ロジックの配置 — repository の mapRow

**結論**: `actionItemRepository.mapRow` で `status ?? (done ? "done" : "todo")` を計算し、ドメインモデル `ActionItem` の `status` フィールドに格納する。

**Rationale**: mapRow は DB 行 → ドメインモデルの唯一の変換ポイントで、全読み取りパスを網羅する。ドメインモデルでは `status` は常に非 null の実効値として扱える。usecase や UI が null チェックを意識する必要がない。

**Alternatives**:
- domain service に導出関数を用意 → 呼び出し漏れリスク。全参照箇所で呼ぶ必要がある
- DB の generated column → Drizzle ORM での対応が複雑。DB 依存が増す

### D3: done との同期方向 — status → done の一方向同期

**結論**: `updateActionItemStatus` で status を設定する際、`done = (status === "done")` を同期する。既存の `toggleActionItemDone` は done を変更し、status も同期する（done=true → "done"、done=false → "todo"）。

**Rationale**: done は既存の index `(organization_id, done)` やダッシュボードフィルタで使われており廃止は影響大。双方向同期で後方互換を保つ。toggle は2値操作のため in_progress を経由しない（toggle = todo ↔ done の直接切替）。

**Alternatives**:
- done を廃止し status のみ → 既存の index・フィルタ・ダッシュボードの書き換えが必要。スコープ外
- done を computed view にする → DB レベルの変更が大きい。将来の別リクエスト向け

### D4: ActionItem 型に status を追加

**結論**: `src/domain/models/actionItem.ts` の `ActionItem` 型に `status: "todo" | "in_progress" | "done"` を追加する。mapRow の導出により常に非 null。

**Rationale**: domain model レベルで status を持つことで、usecase・action・UI が型安全にステータスを扱える。

### D5: 定数定義

**結論**: `src/domain/models/actionItem.ts` に `ACTION_ITEM_STATUSES` 定数と `ActionItemStatus` 型を定義する。

**Rationale**: domain model に配置することで、schema（infrastructure）、usecase、action、UI のいずれからも参照可能。zod バリデーションにも利用する。

### D6: 認可 — updateStatus は既存の edit 権限を流用

**結論**: `updateActionItemStatusAction` の権限チェックは `canPerform(role, "actionItem", "edit")` を使う。新しい権限は追加しない。

**Rationale**: ステータス変更はアクションアイテムの編集の一種。既存の edit 権限（admin, manager, member）と一致する。toggle 権限も同じロールセットのため矛盾しない。

### D7: UI — ステータスセレクタ（ドロップダウン）をチェックボックスの代わりに配置

**結論**: `ActionItemRow` のチェックボックスをステータスセレクタ（`<select>` またはカスタムドロップダウン）に置き換える。3値（未着手 / 対応中 / 完了）を選択可能にし、`updateActionItemStatusAction` を呼ぶ。

**Rationale**: チェックボックスは2値専用で3ステータスを表現できない。セレクタに統一することで UI とデータモデルが整合する。完了選択 → done=true 同期により、ダッシュボードの「未完了」集計も従来どおり動作する。

**Alternatives**:
- チェックボックスを残してステータスバッジを追加 → 2つの操作経路が生まれ混乱する
- ラジオボタン → 3値なら選択肢が少なく select の方がスペース効率が良い

## Risks / Trade-offs

[Risk] toggle と updateStatus の競合 → 既存の toggleActionItemAction は残す（後方互換）。toggle は done を反転し status を同期する。UI ではステータスセレクタに切り替えるため toggle は呼ばれなくなるが、API レベルでは残存する。将来的に toggle を deprecate する余地を残す。

[Risk] status=null 行の導出誤り → mapRow の導出ロジックをテストで固定し、null / done=true / done=false の3パターンを検証する。

[Risk] タスク一覧のフィルタ変更 → 現在のタブは「未完了 / 完了」の2分類。status 追加後も done ベースのフィルタを維持し、将来的に「対応中」タブを追加する余地を残す（本リクエストでは2タブ維持）。

## Open Questions

なし（architect 評価済みの設計判断により解決済み）。
