# Tasks: 管理者によるユーザー作成

## T-01: AuditAction に "user.create" を追加する

- [x] `src/domain/models/auditLog.ts` の `AuditAction` 型に `"user.create"` を追加する（既存の `"user.updateRole"` の近くに配置）

**Acceptance Criteria**:
- `AuditAction` 型ユニオンに `"user.create"` が含まれている
- `AuditTargetType` は変更しない（`"user"` は既存）
- `bun run typecheck` が成功する

## T-02: authorization.ts に createUser 認可を追加する

- [x] `src/domain/authorization.ts` の `PERMISSION_MATRIX.organization` に `createUser: ADMIN_ONLY` を追加する

**Acceptance Criteria**:
- `canPerform("admin", "organization", "createUser")` が `true` を返す
- `canPerform("manager", "organization", "createUser")` が `false` を返す
- `canPerform("finance", "organization", "createUser")` が `false` を返す
- `canPerform("member", "organization", "createUser")` が `false` を返す
- `bun run typecheck` が成功する

## T-03: userRepository.create を追加する

- [x] `src/infrastructure/repositories/userRepository.ts` に `create` 関数を追加する
- [x] 引数: `data: { organizationId: string; email: string; name: string; role: Role; hashedPassword: string }` と `tx?: Transaction`
- [x] `tx ?? db` パターンでトランザクション対応する（既存の `updateRole` と同じパターン）
- [x] `.returning()` で `User` 型のフィールドを返す（`id`, `email`, `name`, `organizationId`, `role`, `notificationsLastSeenAt`, `createdAt`）
- [x] 戻り値: `Promise<User>`

**Acceptance Criteria**:
- `create` 関数が export されている
- `Transaction` を受け取ってトランザクション内で実行できる
- `.returning()` で作成されたユーザーの `User` オブジェクトが返される
- `bun run typecheck` が成功する

## T-04: createUser usecase を追加する

- [x] `src/application/usecases/createUser.ts` を新規作成する
- [x] 結果型: `CreateUserResult = { ok: true; user: User } | { ok: false; reason: string }`
- [x] 引数: `{ organizationId: string; actorId: string; email: string; name: string; role: Role; password: string }`
- [x] 処理フロー:
  1. `userRepository.findByEmailForAuth(email)` で既存ユーザーの有無を確認する。存在する場合は `{ ok: false, reason: "このメールアドレスは既に使用されています" }` を返す
  2. `bcrypt.hash(password, 12)` でパスワードをハッシュする（bcryptjs、salt round 12）
  3. `db.transaction` 内で以下を実行:
     - `userRepository.create({ organizationId, email, name, role, hashedPassword }, tx)`
     - `recordAudit({ action: "user.create", targetType: "user", targetId: createdUser.id, actorId, organizationId }, tx)`
  4. 成功時: `{ ok: true, user: createdUser }` を返す
  5. エラー時: PostgreSQL UNIQUE 制約違反（エラーコード `23505`）は email 重複メッセージに変換する。その他のエラーは汎用メッセージを返す
- [x] `src/application/usecases/index.ts` に `export { createUser } from "./createUser"` を追加する

**Acceptance Criteria**:
- `createUser` usecase が export されている
- email 重複時にドメイン的なエラーメッセージが返される（usecase 事前チェック + DB UNIQUE の二段）
- パスワードが bcryptjs の salt round 12 でハッシュされる
- `recordAudit` がトランザクション内で呼び出される
- `db.transaction` でユーザー作成と監査ログ記録がアトミックに実行される
- `bun run typecheck` が成功する

## T-05: createUserAction Server Action を追加する

- [x] `src/app/actions/users.ts` に `createUserAction` を追加する
- [x] `createUser` usecase を import に追加する
- [x] zod スキーマ `createUserSchema` を定義する:
  - `email`: `z.string().email("有効なメールアドレスを入力してください")`
  - `name`: `z.string().min(1, "名前は必須です")`
  - `role`: `z.enum(["admin", "member", "manager", "finance"])`
  - `password`: `z.string().min(8, "パスワードは8文字以上で入力してください")`
- [x] 関数シグネチャ: `async function createUserAction(prevState: CreateUserState, formData: FormData): Promise<CreateUserState>`
- [x] 処理フロー:
  1. `auth()` で認証チェック
  2. `canPerform(session.user.role, "organization", "createUser")` で認可チェック
  3. `formData` から入力値を取得し、zod でバリデーション
  4. バリデーション成功時、`createUser` usecase を呼び出す（`organizationId`, `actorId` は session 由来）
  5. 成功時: `revalidatePath("/settings/users")` して `{ success: true }` を返す
  6. 失敗時: `{ success: false, message: result.reason }` を返す
- [x] `CreateUserState` 型を export する

**Acceptance Criteria**:
- `createUserAction` が `"use server"` ファイル内に定義されている
- `auth()` による認証チェックがある
- `canPerform` による `"createUser"` 認可チェックがある
- zod による入力バリデーション（email 形式、name 必須、role enum、password 最小8文字）がある
- `organizationId` と `actorId` は session から取得される（リクエストから受け取らない）
- 成功時に `revalidatePath("/settings/users")` が呼ばれる
- `bun run typecheck` が成功する

## T-06: CreateUserForm クライアントコンポーネントを追加する

- [x] `src/app/(dashboard)/settings/users/CreateUserForm.tsx` を新規作成する
- [x] `"use client"` ディレクティブを付ける
- [x] `useActionState` を使って `createUserAction` を呼び出す（WebhookCreateForm と同じパターン）
- [x] フォームフィールド:
  - email: `<Input type="email" name="email" required />`（FormField コンポーネントで囲む）
  - name: `<Input type="text" name="name" required />`
  - role: `<Select name="role">` で admin / manager / finance / member を選択可能にする（デフォルト: member）
  - password: `<Input type="password" name="password" required />`（最小8文字）
- [x] 共通コンポーネント（`FormField`, `Input`, `Select`, `SubmitButton`, `preventEnterSubmit`）を使用する
- [x] エラー表示: `state?.success === false` の場合にエラーメッセージを表示する
- [x] 成功表示: `state?.success === true` の場合に成功メッセージを表示し、フォームをリセットする

**Acceptance Criteria**:
- `CreateUserForm` が `"use client"` コンポーネントとして定義されている
- `useActionState` で `createUserAction` を呼び出す
- email / name / role / password の4フィールドがある
- 既存の共通コンポーネント（FormField, Input, Select, SubmitButton）を使用する
- エラー時にメッセージが表示される
- 成功時に成功メッセージが表示される

## T-07: settings/users ページに CreateUserForm を組み込む

- [x] `src/app/(dashboard)/settings/users/page.tsx` に `CreateUserForm` を import する
- [x] ユーザー一覧の上部に `SectionCard` で囲んだ `CreateUserForm` を配置する
- [x] ページの admin ガードは既存のまま（追加の権限チェック不要）

**Acceptance Criteria**:
- settings/users ページに CreateUserForm が表示される
- admin ロールのユーザーがフォームを使用できる
- 既存のユーザー一覧・ロール変更機能が影響を受けない
- `bun run build` が成功する

## T-08: テストを追加する

- [x] `src/__tests__/usecases/userManagement.test.ts` に `createUser` usecase のテストを追加する（静的コード解析パターン）:
  - `createUser` usecase が存在する
  - `findByEmailForAuth` による email 重複チェックがある
  - `bcrypt.hash` によるパスワードハッシュがある
  - `db.transaction` でトランザクションが使われている
  - `recordAudit` がトランザクション内で呼び出される
  - action が `"user.create"` である
  - email 重複時のエラーメッセージが含まれる
- [x] `src/__tests__/settings/userSettingsActions.test.ts` に `createUserAction` のテストを追加する（静的コード解析パターン）:
  - `createUserAction` が存在する
  - `canPerform` で `"createUser"` 権限チェックがある
  - zod で email / name / role / password のバリデーションがある
  - 成功後に `revalidatePath` が呼ばれる
- [x] `src/__tests__/domain/authorization.test.ts` に `createUser` 認可のテストを追加する:
  - `canPerform("admin", "organization", "createUser")` が `true`
  - `canPerform("manager", "organization", "createUser")` が `false`
  - `canPerform("finance", "organization", "createUser")` が `false`
  - `canPerform("member", "organization", "createUser")` が `false`
- [x] `src/__tests__/static/auditRecorder.test.ts` で `"user.create"` が `AuditAction` に含まれることを確認する（既存テストのパターンに従って必要な場合のみ追加）

**Acceptance Criteria**:
- 管理者がユーザーを作成できることがテストで固定される
- email 重複拒否がテストで固定される
- admin 以外が作成できないことがテストで固定される
- `user.create` 監査ログ記録がテストで固定される
- パスワードハッシュ方式（bcryptjs）の一貫性がテストで固定される
- `bun test` が全テスト green になる
- 既存テストが変更なしで通る
