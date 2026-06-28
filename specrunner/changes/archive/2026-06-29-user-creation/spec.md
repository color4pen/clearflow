# Spec: 管理者によるユーザー作成

## Requirements

### Requirement: userRepository.create がユーザーをテナントに紐づけて永続化する

`userRepository.create` SHALL insert a new user row with the given `organizationId`, `email`, `name`, `role`, and `hashedPassword`. The returned `User` object SHALL include the generated `id` and `createdAt`. The function SHALL accept an optional `Transaction` parameter (`tx`) so that the caller can execute the insert within an existing transaction.

#### Scenario: ユーザーが正常に作成される

**Given** 有効な organizationId, email, name, role, hashedPassword が渡される
**When** `userRepository.create` が呼び出される
**Then** users テーブルに新しい行が挿入され、生成された id と createdAt を含む User オブジェクトが返される

#### Scenario: email が既存ユーザーと重複する場合

**Given** 同一 email のユーザーが既に存在する
**When** `userRepository.create` が呼び出される
**Then** PostgreSQL の UNIQUE 制約違反エラーが発生する（呼び出し側で捕捉可能）

---

### Requirement: createUser usecase がユーザー作成のオーケストレーションを行う

`createUser` usecase SHALL receive `{ organizationId, actorId, email, name, role, password }` and perform the following within a single database transaction: (a) verify no existing user with the same email, (b) hash the password with bcryptjs (salt round 12), (c) create the user via `userRepository.create`, (d) record an audit log with action `"user.create"`.

#### Scenario: 正常にユーザーが作成される

**Given** 有効なパラメータが渡され、同一 email のユーザーが存在しない
**When** `createUser` が呼び出される
**Then** ユーザーが作成され、`user.create` 監査ログが記録され、`{ ok: true, user }` が返される

#### Scenario: email が重複する場合

**Given** 同一 email のユーザーが既に存在する
**When** `createUser` が呼び出される
**Then** ユーザーは作成されず、`{ ok: false, reason: "..." }` が返される（email 重複を示すメッセージ）

#### Scenario: パスワードが bcryptjs でハッシュされる

**Given** 平文パスワードが渡される
**When** `createUser` が呼び出される
**Then** パスワードは `bcrypt.hash(password, 12)` でハッシュされてから `userRepository.create` に渡される。ハッシュされたパスワードは `bcrypt.compare(password, hashedPassword)` で検証可能である

#### Scenario: 監査ログがトランザクション内で記録される

**Given** 有効なパラメータが渡される
**When** `createUser` が呼び出される
**Then** `recordAudit` が `db.transaction` のコールバック内で呼び出され、action は `"user.create"`、targetType は `"user"`、targetId は作成されたユーザーの id である

---

### Requirement: AuditAction 型に "user.create" が含まれる

`AuditAction` type union SHALL include `"user.create"` as a valid action value.

#### Scenario: user.create が AuditAction 型に存在する

**Given** `src/domain/models/auditLog.ts` のソースコード
**When** `AuditAction` 型定義を確認する
**Then** `"user.create"` がユニオンメンバーとして含まれている

---

### Requirement: organization エンティティに createUser 認可が定義される

`authorization.ts` の PERMISSION_MATRIX の `organization` エントリ SHALL include `createUser` with `ADMIN_ONLY` permission.

#### Scenario: admin のみ createUser が許可される

**Given** canPerform 関数が利用可能である
**When** `canPerform("admin", "organization", "createUser")` が呼び出される
**Then** `true` が返される

#### Scenario: admin 以外は createUser が拒否される

**Given** canPerform 関数が利用可能である
**When** `canPerform("manager", "organization", "createUser")` / `canPerform("finance", "organization", "createUser")` / `canPerform("member", "organization", "createUser")` が呼び出される
**Then** すべて `false` が返される

---

### Requirement: createUserAction が認証・認可・入力検証を行う

`createUserAction` Server Action SHALL (1) authenticate via `auth()`, (2) authorize via `canPerform(role, "organization", "createUser")`, (3) validate input with zod (email format, name required, role enum, password minimum length), (4) call `createUser` usecase with `organizationId` and `actorId` from session, (5) `revalidatePath("/settings/users")` on success.

#### Scenario: 認証されていないユーザーからの呼び出し

**Given** セッションが無い（未認証）
**When** `createUserAction` が呼び出される
**Then** 認証エラーが返される

#### Scenario: admin 以外のロールからの呼び出し

**Given** manager ロールのユーザーがセッションを持つ
**When** `createUserAction` が呼び出される
**Then** 権限エラーが返される

#### Scenario: 入力バリデーション失敗

**Given** 不正な email 形式が渡される
**When** `createUserAction` が呼び出される
**Then** バリデーションエラーが返される

#### Scenario: 正常に作成される

**Given** admin ロールのユーザーが有効な入力を提供する
**When** `createUserAction` が呼び出される
**Then** `createUser` usecase が呼び出され、成功後に `/settings/users` が revalidate される

---

### Requirement: settings/users 画面にユーザー作成フォームが表示される

The settings/users page SHALL display a user creation form with fields for email, name, role, and initial password. The form SHALL be visible to admin users (the page itself is already admin-guarded). On successful submission, the user list SHALL be refreshed to include the newly created user.

#### Scenario: 管理者がユーザー作成フォームを使用する

**Given** admin ロールのユーザーが settings/users ページにアクセスしている
**When** email, name, role, 初期パスワードを入力して送信する
**Then** ユーザーが作成され、一覧に反映される

#### Scenario: 作成時にエラーが発生した場合

**Given** admin ロールのユーザーがフォームに入力する
**When** email 重複などのエラーが発生する
**Then** エラーメッセージがフォーム上に表示される
