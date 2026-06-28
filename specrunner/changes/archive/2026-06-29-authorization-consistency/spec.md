# Spec: 認可の一貫性とロックアウト防止

## Requirements

### Requirement: 承認アクションは canPerform 経由でロールゲートを行う

`approveRequestAction` SHALL use `canPerform(role, "approval", "approve")` to determine whether the caller is authorized to approve a request, instead of inline `role === "member"` comparison.

#### Scenario: admin が承認を実行できる

**Given** セッションユーザーのロールが `admin` である
**When** `approveRequestAction` を呼び出す
**Then** canPerform による権限チェックを通過し、usecase が実行される

#### Scenario: member が承認を拒否される

**Given** セッションユーザーのロールが `member` である
**When** `approveRequestAction` を呼び出す
**Then** canPerform が false を返し、`{ success: false, message: "権限がありません" }` が返される

### Requirement: 却下アクションは canPerform 経由でロールゲートを行う

`rejectRequestAction` SHALL use `canPerform(role, "approval", "reject")` to determine whether the caller is authorized to reject a request.

#### Scenario: finance が却下を実行できる

**Given** セッションユーザーのロールが `finance` である
**When** `rejectRequestAction` を呼び出す
**Then** canPerform による権限チェックを通過し、usecase が実行される

#### Scenario: member が却下を拒否される

**Given** セッションユーザーのロールが `member` である
**When** `rejectRequestAction` を呼び出す
**Then** canPerform が false を返し、`{ success: false, message: "権限がありません" }` が返される

### Requirement: 一括承認アクションは canPerform 経由でロールゲートを行う

`bulkApproveAction` SHALL use `canPerform(role, "approval", "approve")` to determine whether the caller is authorized to perform bulk approval.

#### Scenario: manager が一括承認を実行できる

**Given** セッションユーザーのロールが `manager` である
**When** `bulkApproveAction` を呼び出す
**Then** canPerform による権限チェックを通過し、usecase が実行される

#### Scenario: member が一括承認を拒否される

**Given** セッションユーザーのロールが `member` である
**When** `bulkApproveAction` を呼び出す
**Then** canPerform が false を返し、`{ success: false, message: "権限がありません" }` が返される

### Requirement: 組織で最後の admin は降格できない

`updateUserRole` usecase SHALL reject a role change that would remove the last admin from an organization. When the target user is currently `admin`, the new role is not `admin`, and no other user in the same organization has role `admin`, the operation MUST return `{ ok: false }` with a descriptive error message.

#### Scenario: 最後の admin を降格しようとすると拒否される

**Given** 組織に admin が対象ユーザー 1 人のみ存在する
**When** `updateUserRole` を newRole `member` で呼び出す
**Then** `{ ok: false, reason: "組織に最低1人の管理者が必要です" }` が返される

#### Scenario: 他に admin がいれば降格できる

**Given** 組織に admin が対象ユーザーを含め 2 人以上存在する
**When** `updateUserRole` を newRole `member` で呼び出す
**Then** 降格が成功し `{ ok: true }` が返される

#### Scenario: admin を admin に変更する場合はガード不要

**Given** 組織に admin が対象ユーザー 1 人のみ存在する
**When** `updateUserRole` を newRole `admin` で呼び出す
**Then** ロール変更は同値のため通常通り処理される

### Requirement: 自己降格ガードは引き続き機能する

`updateUserRole` SHALL continue to reject role changes where `actorId === targetUserId`, returning `{ ok: false, reason: "自分自身のロールは変更できません" }`. The new last-admin guard MUST NOT interfere with or bypass this existing guard.

#### Scenario: 自分自身のロールを変更しようとすると拒否される

**Given** actorId と targetUserId が同一である
**When** `updateUserRole` を呼び出す
**Then** `{ ok: false, reason: "自分自身のロールは変更できません" }` が返される

### Requirement: requests.ts は canPerform を import する

`src/app/actions/requests.ts` SHALL import `canPerform` from `@/domain/authorization` to enforce the centralized authorization rule. The dependency direction `actions → domain` MUST be maintained.

#### Scenario: requests.ts が canPerform を使用している

**Given** `src/app/actions/requests.ts` のソースコード
**When** 静的解析でインポートを確認する
**Then** `@/domain/authorization` から `canPerform` がインポートされている
