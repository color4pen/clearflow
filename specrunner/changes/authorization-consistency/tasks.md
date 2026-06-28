# Tasks: 認可の一貫性とロックアウト防止

## T-01: requests.ts に canPerform import を追加

- [ ] `src/app/actions/requests.ts` に `import { canPerform } from "@/domain/authorization";` を追加する

**Acceptance Criteria**:
- `canPerform` が `@/domain/authorization` からインポートされている
- 依存方向 actions → domain を遵守

## T-02: approveRequestAction のインライン判定を canPerform に置換

- [ ] `src/app/actions/requests.ts` の `approveRequestAction` 内の `if (session.user.role === "member")` を `if (!canPerform(session.user.role, "approval", "approve"))` に置き換える
- [ ] 返却メッセージ `"権限がありません"` は変更しない

**Acceptance Criteria**:
- `approveRequestAction` が `canPerform(role, "approval", "approve")` でロールゲートを行う
- admin/manager/finance は通過し member は拒否される（振る舞い不変）
- エラーメッセージが `"権限がありません"` のまま

## T-03: rejectRequestAction のインライン判定を canPerform に置換

- [ ] `src/app/actions/requests.ts` の `rejectRequestAction` 内の `if (session.user.role === "member")` を `if (!canPerform(session.user.role, "approval", "reject"))` に置き換える
- [ ] 返却メッセージ `"権限がありません"` は変更しない

**Acceptance Criteria**:
- `rejectRequestAction` が `canPerform(role, "approval", "reject")` でロールゲートを行う
- admin/manager/finance は通過し member は拒否される（振る舞い不変）
- エラーメッセージが `"権限がありません"` のまま

## T-04: bulkApproveAction のインライン判定を canPerform に置換

- [ ] `src/app/actions/requests.ts` の `bulkApproveAction` 内の `if (session.user.role === "member")` を `if (!canPerform(session.user.role, "approval", "approve"))` に置き換える
- [ ] 返却メッセージ `"権限がありません"` は変更しない

**Acceptance Criteria**:
- `bulkApproveAction` が `canPerform(role, "approval", "approve")` でロールゲートを行う
- admin/manager/finance は通過し member は拒否される（振る舞い不変）
- エラーメッセージが `"権限がありません"` のまま

## T-05: updateUserRole に最後の admin ガードを追加

- [ ] `src/application/usecases/updateUserRole.ts` に `userRepository` の `findByOrganization` を使えるようインポートを確認する（既に `userRepository` はインポート済み）
- [ ] ユーザー存在確認（`findById` で `currentUser` 取得）の後、トランザクション開始の前に、以下のガードロジックを追加する:
  1. `currentUser.role === "admin"` かつ `data.newRole !== "admin"` の場合のみチェック実行
  2. `userRepository.findByOrganization(data.organizationId)` で組織内全ユーザーを取得
  3. 対象ユーザー以外で `role === "admin"` のユーザーが 0 人なら `{ ok: false, reason: "組織に最低1人の管理者が必要です" }` を返す
- [ ] 既存の自己降格ガード（L20）はそのまま維持する

**Acceptance Criteria**:
- 組織で最後の admin を non-admin に降格しようとすると `{ ok: false, reason: "組織に最低1人の管理者が必要です" }` が返される
- 他に admin がいる場合は降格が成功する
- admin → admin の変更（同値）はガードに引っかからない
- 自己降格ガードが引き続き先に評価される
- ガード順序: 自己降格 → ユーザー存在確認 → 最後の admin → トランザクション

## T-06: 承認系アクションの canPerform 使用を静的テストで固定

- [ ] `src/__tests__/actions/` 配下にテストファイルを作成（既存の `roleCheck.test.ts` のパターンに従う）
- [ ] 以下を静的コード分析で検証するテストを記述する:
  1. `requests.ts` が `canPerform` を `@/domain/authorization` からインポートしている
  2. `approveRequestAction` 関数内で `canPerform` が使用されている
  3. `rejectRequestAction` 関数内で `canPerform` が使用されている
  4. `bulkApproveAction` 関数内で `canPerform` が使用されている
  5. インライン `role === "member"` による判定が承認系アクション内に存在しない

**Acceptance Criteria**:
- テストが既存パターン（`readFile` による静的検証）に従っている
- 承認 / 却下 / 一括承認の 3 アクションすべてが canPerform 使用をテストで固定される
- `bun test` が green

## T-07: 最後の admin ガードをテストで固定

- [ ] `src/__tests__/usecases/userManagement.test.ts` に静的コード分析テストを追加する:
  1. `updateUserRole.ts` が `findByOrganization` を使用してガードを実装している
  2. `updateUserRole.ts` に `"組織に最低1人の管理者が必要です"` のエラーメッセージが含まれる
  3. 自己降格ガード `"自分自身のロールは変更できません"` が引き続き存在する

**Acceptance Criteria**:
- 最後の admin ガードの存在がテストで検証される
- 既存の自己降格ガードのテストが引き続き green
- 既存テストを変更していない（追加のみ）
- `bun test` が green

## T-08: ビルド・型チェック検証

- [ ] `bun run typecheck` が green であることを確認
- [ ] `bun run build` が成功することを確認
- [ ] `bun test` が全テスト green であることを確認

**Acceptance Criteria**:
- `bun run typecheck` 成功
- `bun run build` 成功
- `bun test` 全テスト green
- 既存テストの変更なし
