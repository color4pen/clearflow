# Test Cases: action-item-status

## Summary

- **Total**: 25 cases
- **Automated** (unit/integration): 17
- **Manual**: 8
- **Priority**: must: 16, should: 8, could: 1

---

## status カラムの導出

### TC-001: status=null かつ done=false の行を読み取ると "todo" に導出される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: status カラムの導出 > Scenario: status=null かつ done=false の行を読み取る

---

### TC-002: status=null かつ done=true の行を読み取ると "done" に導出される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: status カラムの導出 > Scenario: status=null かつ done=true の行を読み取る

---

### TC-003: status が明示的に設定されている行は導出されずそのまま返される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: status カラムの導出 > Scenario: status が明示的に設定されている行を読み取る

---

## updateActionItemStatus による status 設定と done 同期

### TC-004: status を "done" に更新すると done=true に同期される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: updateActionItemStatus による status 設定と done 同期 > Scenario: status を "done" に更新する

---

### TC-005: status を "in_progress" に更新すると done=false に同期される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: updateActionItemStatus による status 設定と done 同期 > Scenario: status を "in_progress" に更新する

---

### TC-006: status を "todo" に更新すると done=false に同期される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: updateActionItemStatus による status 設定と done 同期 > Scenario: status を "todo" に更新する

---

## updateActionItemStatus の監査記録

### TC-007: status 更新時に action_item.updateStatus の監査ログが metadata.status 付きで記録される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: updateActionItemStatus の監査記録 > Scenario: status 更新の監査ログが記録される

---

## toggleActionItemDone の status 同期

### TC-008: toggle で done=false→true のとき status が "done" に同期される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: toggleActionItemDone の status 同期 > Scenario: toggle で done=false→true のとき status が "done" に同期される

---

### TC-009: toggle で done=true→false のとき status が "todo" に同期される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: toggleActionItemDone の status 同期 > Scenario: toggle で done=true→false のとき status が "todo" に同期される

---

## マイグレーションの制約

### TC-010: 生成されたマイグレーション SQL が status カラム追加のみを含む

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: マイグレーションの制約 > Scenario: マイグレーション SQL の内容

---

## 既存の done ベース機能の後方互換

### TC-011: done=false フィルタで todo と in_progress が返り done ステータスは除外される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 既存の done ベース機能の後方互換 > Scenario: done=false フィルタで未完了アイテムが返る

---

## UI ステータス切替

### TC-012: ステータスセレクタで「対応中」を選択すると updateActionItemStatusAction が呼ばれる

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: UI ステータス切替 > Scenario: ステータスセレクタで「対応中」を選択する

---

## updateActionItemStatus usecase — エラーハンドリング

### TC-013: 存在しない id で updateActionItemStatus を呼ぶと ok=false が返る

**Category**: unit
**Priority**: should
**Source**: tasks.md T-05

**GIVEN** actionItemRepository.findById が null を返すようにモックされている
**WHEN** updateActionItemStatus を存在しない id で呼び出す
**THEN** 返却値が `{ ok: false, reason: ... }` となり usecase 内の update・recordAudit は呼ばれない

---

### TC-025: 楽観ロックの version 不一致で updateActionItemStatus がエラーを返す

**Category**: integration
**Priority**: should
**Source**: tasks.md T-05

**GIVEN** version=1 のアクションアイテムが存在し、別トランザクションで既に更新されて version が進んでいる
**WHEN** 古い version で updateActionItemStatus を呼び出す
**THEN** 楽観ロックエラー（version mismatch）が返され、status/done は更新されない

---

## updateActionItemStatusAction — Server Action 認証・認可・バリデーション

### TC-014: 未認証ユーザーが updateActionItemStatusAction を呼ぶと認証エラーが返る

**Category**: integration
**Priority**: must
**Source**: tasks.md T-07

**GIVEN** セッションが存在しない（未認証）状態
**WHEN** updateActionItemStatusAction を呼び出す
**THEN** 認証エラーが返され、usecase は呼ばれない

---

### TC-015: edit 権限がないロールで updateActionItemStatusAction を呼ぶと認可エラーが返る

**Category**: integration
**Priority**: should
**Source**: tasks.md T-07

**GIVEN** canPerform(role, "actionItem", "edit") が false を返すロールのユーザーがセッションに存在する
**WHEN** updateActionItemStatusAction を呼び出す
**THEN** 認可エラーが返され、usecase は呼ばれない

---

### TC-016: 不正な status 値で updateActionItemStatusAction を呼ぶと zod バリデーションエラーが返る

**Category**: unit
**Priority**: should
**Source**: tasks.md T-07

**GIVEN** 認証済みかつ edit 権限を持つユーザーがセッションに存在する
**WHEN** updateActionItemStatusAction に `status: "invalid_value"` を渡す
**THEN** zod バリデーションエラーが返され、usecase は呼ばれない

---

### TC-017: 正常系で updateActionItemStatusAction が usecase を呼び revalidatePath が実行される

**Category**: integration
**Priority**: should
**Source**: tasks.md T-07

**GIVEN** 認証済みかつ edit 権限を持つユーザーがセッションに存在し、有効な id と status="in_progress" が渡される
**WHEN** updateActionItemStatusAction を呼び出す
**THEN** updateActionItemStatus usecase が呼ばれ、revalidatePath("/dashboard") と revalidatePath("/tasks") が実行される

---

## toggleActionItemDone — 監査記録の後方互換

### TC-024: toggle 時の監査記録は action_item.toggle / metadata.done のまま変更されない

**Category**: integration
**Priority**: should
**Source**: tasks.md T-06

**GIVEN** done=false のアクションアイテムが存在する
**WHEN** toggleActionItemDone を実行する
**THEN** recordAudit が `action: "action_item.toggle"`, `metadata: { done: true }` で呼ばれ、`action_item.updateStatus` は記録されない

---

## UI — ActionItemRow スタイリングとインタラクション

### TC-019: 完了ステータスのアクションアイテムに打ち消し線と muted スタイルが適用される

**Category**: manual
**Priority**: should
**Source**: tasks.md T-08

**GIVEN** status="done" のアクションアイテムが ActionItemRow にレンダリングされている
**WHEN** 行の表示を確認する
**THEN** アイテムタイトルに line-through と muted テキストのスタイルが適用されている

---

### TC-020: showSource=true（グローバル一覧）と showSource=false（カード表示）の両レイアウトでステータスセレクタが機能する

**Category**: manual
**Priority**: should
**Source**: tasks.md T-08

**GIVEN** ActionItemRow が showSource=true および showSource=false でそれぞれレンダリングされている
**WHEN** 各レイアウトのステータスセレクタを確認する
**THEN** 両レイアウトでセレクタが正常に表示され、選択肢（未着手 / 対応中 / 完了）を切替可能である

---

### TC-018: action ペンディング中はステータスセレクタが disabled になる

**Category**: manual
**Priority**: could
**Source**: tasks.md T-08

**GIVEN** ステータス変更 Server Action のリクエストが送信中（isPending=true）である
**WHEN** ActionItemRow を表示する
**THEN** ステータスセレクタが disabled 属性を持ち、ユーザーが操作できない

---

## 検証 — 品質ゲート

### TC-021: 既存テストが変更なしで全て green

**Category**: manual
**Priority**: must
**Source**: tasks.md T-11

**GIVEN** 本変更が実装されている
**WHEN** `bun test` を実行する
**THEN** 既存テストが全て green で通り、テストコードへの変更が不要である

---

### TC-022: typecheck が green

**Category**: manual
**Priority**: must
**Source**: tasks.md T-11

**GIVEN** 本変更が実装されている
**WHEN** `bun run typecheck` を実行する
**THEN** 型エラーが0件で完了する

---

### TC-023: ビルドが成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md T-11

**GIVEN** 本変更が実装されている
**WHEN** `bun run build` を実行する
**THEN** ビルドエラーなしで成功する

---

## Result

```yaml
result: completed
total: 25
automated: 17
manual: 8
must: 16
should: 8
could: 1
blocked_reasons: []
```
