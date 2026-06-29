# Tasks: action-item-status

## T-01: domain model に status 型・定数を追加

- [x] `src/domain/models/actionItem.ts` に `ActionItemStatus` 型（`"todo" | "in_progress" | "done"`）を追加し export する
- [x] 同ファイルに `ACTION_ITEM_STATUSES` 定数（`["todo", "in_progress", "done"] as const`）を追加し export する
- [x] `ActionItem` 型に `status: ActionItemStatus` フィールドを追加する

**Acceptance Criteria**:
- `ActionItemStatus` と `ACTION_ITEM_STATUSES` が export されている
- `ActionItem` 型が `status` フィールドを持つ
- `bun run typecheck` が通る（後続タスクで他ファイルの型エラーを解消するため、この時点では型エラーが出る箇所がある前提）

## T-02: schema に status カラムを追加しマイグレーション生成

- [x] `src/infrastructure/schema.ts` の `actionItems` テーブル定義に `status: text("status")` を追加する（nullable、デフォルトなし）
- [x] `bun run db:generate` でマイグレーションファイルを生成する
- [x] 生成されたマイグレーション SQL が `ALTER TABLE ... ADD COLUMN "status" text` のみを含み、backfill や他テーブル/カラムの変更を含まないことを確認する

**Acceptance Criteria**:
- マイグレーションファイルが生成され、status カラムの追加のみを含む
- nullable で backfill なし

## T-03: repository の mapRow で status 導出ロジックを追加

- [x] `src/infrastructure/repositories/actionItemRepository.ts` の `mapRow` に status の導出を追加: `status: row.status ?? (row.done ? "done" : "todo")`
- [x] `create` 関数の insert values に `status` を追加（省略時は undefined で nullable のまま）
- [x] `update` 関数の `data` 型に `status: ActionItemStatus` を追加（Partial なので省略可能）
- [x] `mapRow` の返却値に `status` を含める

**Acceptance Criteria**:
- status=null の行は done から導出される（done=true → "done"、done=false → "todo"）
- status が非 null の行はその値がそのまま使われる
- create / update で status を設定可能

## T-04: auditLog 型に action_item.updateStatus を追加

- [x] `src/domain/models/auditLog.ts` の `AuditAction` に `"action_item.updateStatus"` を追加する
- [x] `AuditMetadataMap` に `"action_item.updateStatus": { status: string }` を追加する

**Acceptance Criteria**:
- `recordAudit({ action: "action_item.updateStatus", ..., metadata: { status: "in_progress" } })` が型チェックを通る
- 既存の audit 型との整合が保たれている

## T-05: updateActionItemStatus usecase を新設

- [x] `src/application/usecases/updateActionItemStatus.ts` を作成する
- [x] 入力: `{ id: string, organizationId: string, actorId: string, status: ActionItemStatus }`
- [x] 処理:
  1. `actionItemRepository.findById` で存在確認
  2. `db.transaction` 内で `actionItemRepository.update` に `{ status, done: status === "done" }` を渡す
  3. `recordAudit` で `action: "action_item.updateStatus"`, `metadata: { status }` を記録
- [x] 返却型: `{ ok: true, actionItem: ActionItem } | { ok: false, reason: string }`
- [x] `src/application/usecases/index.ts` に export を追加する

**Acceptance Criteria**:
- status が設定され done が `status === "done"` に同期される
- `action_item.updateStatus` の監査記録が metadata.status 付きで残る
- 楽観ロック（version）が効いている
- 存在しない id でエラーを返す

## T-06: toggleActionItemDone に status 同期を追加

- [x] `src/application/usecases/toggleActionItemDone.ts` の update 呼び出しで、done だけでなく status も渡す: `{ done: !existing.done, status: !existing.done ? "done" : "todo" }`

**Acceptance Criteria**:
- toggle で done=false→true のとき status="done" に同期される
- toggle で done=true→false のとき status="todo" に同期される
- 既存の toggle 監査記録（`action_item.toggle` / `{ done }` メタデータ）は変更しない

## T-07: actions 層に updateActionItemStatusAction を追加

- [x] `src/app/actions/actionItems.ts` に `updateActionItemStatusAction` を追加する
- [x] zod スキーマ: `{ id: z.string().uuid(), status: z.enum(ACTION_ITEM_STATUSES) }`（`ACTION_ITEM_STATUSES` を domain から import）
- [x] auth 認証 + `canPerform(role, "actionItem", "edit")` 認可
- [x] session から `organizationId` と `actorId` を取得
- [x] `updateActionItemStatus` usecase を呼び出す
- [x] 成功時に `revalidatePath("/dashboard")`, `revalidatePath("/tasks")`, 紐づけ先ページの revalidate

**Acceptance Criteria**:
- 未認証でエラーを返す
- edit 権限がないロールでエラーを返す
- 不正な status 値で validation エラーを返す
- 正常系で usecase が呼ばれ revalidate される

## T-08: UI — ActionItemRow のチェックボックスをステータスセレクタに変更

- [x] `src/app/(dashboard)/components/ActionItemRow.tsx` のチェックボックス (`<input type="checkbox">`) をステータスセレクタ（`<select>` 要素）に置き換える
- [x] 選択肢: 未着手 (todo) / 対応中 (in_progress) / 完了 (done)
- [x] 選択変更時に `updateActionItemStatusAction` を呼ぶ（`toggleActionItemAction` の代わり）
- [x] ステータスに応じたスタイリング: 完了時は打ち消し線 + muted テキスト、対応中は通常テキスト + 目印色
- [x] グローバル一覧（showSource=true）とカード表示（showSource=false）の両方のレイアウトを対応する
- [x] `handleToggle` 関数を `handleStatusChange` に書き換え、`toggleActionItemAction` の import を `updateActionItemStatusAction` に変更する

**Acceptance Criteria**:
- チェックボックスがステータスセレクタに置き換わっている
- 3ステータス（未着手 / 対応中 / 完了）を選択可能
- 選択変更で `updateActionItemStatusAction` が呼ばれる
- 完了時のスタイル（打ち消し線等）が維持されている
- `isPending` 中はセレクタが disabled になる

## T-09: テスト — updateActionItemStatus usecase

- [x] `src/__tests__/usecases/updateActionItemStatus.dynamic.test.ts` を作成する
- [x] `mock.module` 方式で `@/infrastructure/repositories` と `@/infrastructure/db` をモックする
- [x] テストケース:
  1. status="done" で更新 → done=true に同期されることを assert
  2. status="in_progress" で更新 → done=false に同期されることを assert
  3. status="todo" で更新 → done=false に同期されることを assert
  4. `recordAudit` が `action: "action_item.updateStatus"`, `metadata: { status }` で呼ばれることを assert
  5. 存在しない id でエラーを返すことを assert

**Acceptance Criteria**:
- status 設定と done 同期の全パターンがテストで固定される
- 監査記録の action と metadata がテストで固定される
- `bun test src/__tests__/usecases/updateActionItemStatus.dynamic.test.ts` が green

## T-10: テスト — status 導出ロジック

- [x] `src/__tests__/usecases/actionItemStatusDerivation.dynamic.test.ts` を作成する
- [x] `mock.module` 方式で repository 層の呼び出しをモックし、status が導出された行を返すようにする
- [x] テストケース:
  1. status=null, done=false → 実効 status が "todo" であること
  2. status=null, done=true → 実効 status が "done" であること
  3. status="in_progress", done=false → 実効 status が "in_progress" であること（明示値が優先）
- [x] テストは usecase（listActionItems 等）経由で ActionItem を取得し、status を assert する

**Acceptance Criteria**:
- null 導出の3パターンがテストで固定される
- `bun test src/__tests__/usecases/actionItemStatusDerivation.dynamic.test.ts` が green

## T-11: 検証 — 既存テストと型チェック・ビルド

- [x] `bun test` で全テストが green であることを確認（既存テスト無変更）
- [x] `bun run typecheck` が green であることを確認
- [x] `bun run build` が成功することを確認

**Acceptance Criteria**:
- 既存テストが変更なしで通る
- 型チェック green
- ビルド成功
