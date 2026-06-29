# Spec: action-item-status

## Requirements

### Requirement: status カラムの導出

アクションアイテムの `status` が null（既存行）の場合、`done` フィールドから実効ステータスを導出しなければならない（SHALL）。

- done=true → "done"
- done=false → "todo"

status が非 null の場合はその値をそのまま使用する。

#### Scenario: status=null かつ done=false の行を読み取る

**Given** action_items に status=null, done=false の行が存在する
**When** repository 経由でその行を読み取る
**Then** 返却される ActionItem の status は "todo" である

#### Scenario: status=null かつ done=true の行を読み取る

**Given** action_items に status=null, done=true の行が存在する
**When** repository 経由でその行を読み取る
**Then** 返却される ActionItem の status は "done" である

#### Scenario: status が明示的に設定されている行を読み取る

**Given** action_items に status="in_progress", done=false の行が存在する
**When** repository 経由でその行を読み取る
**Then** 返却される ActionItem の status は "in_progress" である

---

### Requirement: updateActionItemStatus による status 設定と done 同期

`updateActionItemStatus` usecase は status を設定し、`done` を `status === "done"` に同期しなければならない（SHALL）。

#### Scenario: status を "done" に更新する

**Given** status="todo" のアクションアイテムが存在する
**When** updateActionItemStatus で status="done" を設定する
**Then** アクションアイテムの status は "done"、done は true になる

#### Scenario: status を "in_progress" に更新する

**Given** status="done", done=true のアクションアイテムが存在する
**When** updateActionItemStatus で status="in_progress" を設定する
**Then** アクションアイテムの status は "in_progress"、done は false になる

#### Scenario: status を "todo" に更新する

**Given** status="in_progress" のアクションアイテムが存在する
**When** updateActionItemStatus で status="todo" を設定する
**Then** アクションアイテムの status は "todo"、done は false になる

---

### Requirement: updateActionItemStatus の監査記録

`updateActionItemStatus` usecase は `action_item.updateStatus` アクションで監査記録を残さなければならない（SHALL）。メタデータに `{ status }` を含む。

#### Scenario: status 更新の監査ログが記録される

**Given** アクションアイテムが存在する
**When** updateActionItemStatus で status="in_progress" を設定する
**Then** recordAudit が action="action_item.updateStatus", targetType="action_item", metadata={ status: "in_progress" } で呼び出される

---

### Requirement: toggleActionItemDone の status 同期

既存の `toggleActionItemDone` は done を反転する際、status も同期しなければならない（SHALL）。

- done が false → true に変わる場合: status = "done"
- done が true → false に変わる場合: status = "todo"

#### Scenario: toggle で done=false→true のとき status が "done" に同期される

**Given** done=false のアクションアイテムが存在する
**When** toggleActionItemDone を実行する
**Then** done=true, status="done" になる

#### Scenario: toggle で done=true→false のとき status が "todo" に同期される

**Given** done=true のアクションアイテムが存在する
**When** toggleActionItemDone を実行する
**Then** done=false, status="todo" になる

---

### Requirement: マイグレーションの制約

マイグレーションは `action_items` テーブルへの `status` カラム追加のみであること（SHALL）。

- status は nullable text
- backfill を含まない
- 他のカラムやテーブルの変更を含まない
- `bun run db:generate` で生成し、`drizzle-kit check` を通過する

#### Scenario: マイグレーション SQL の内容

**Given** スキーマに status カラムを追加した
**When** `bun run db:generate` でマイグレーションを生成する
**Then** 生成された SQL は `ALTER TABLE action_items ADD COLUMN status text` のみを含む

---

### Requirement: 既存の done ベース機能の後方互換

既存の done ベース機能（toggle、done フィルタ、ダッシュボードの未完了集計）は従来どおり動作しなければならない（SHALL）。

#### Scenario: done=false フィルタで未完了アイテムが返る

**Given** status="todo" (done=false) と status="in_progress" (done=false) と status="done" (done=true) のアクションアイテムが存在する
**When** `findByOrganization` に `done: false` フィルタを適用する
**Then** status="todo" と status="in_progress" のアイテムが返り、status="done" は含まれない

---

### Requirement: UI ステータス切替

アクションアイテムの UI はチェックボックスの代わりに3ステータスのセレクタを表示しなければならない（SHALL）。選択肢は「未着手」「対応中」「完了」。選択時に `updateActionItemStatusAction` を呼び出す。

#### Scenario: ステータスセレクタで「対応中」を選択する

**Given** status="todo" のアクションアイテムが ActionItemRow に表示されている
**When** ステータスセレクタで「対応中」を選択する
**Then** `updateActionItemStatusAction` が `{ id, status: "in_progress" }` で呼び出される
