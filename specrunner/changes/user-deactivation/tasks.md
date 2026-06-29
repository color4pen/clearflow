# Tasks: ユーザーの無効化・再有効化

## T-01: schema に deactivated_at カラムを追加し、マイグレーションを生成する

- [x] `src/infrastructure/schema.ts` の `users` テーブル定義に `deactivatedAt: timestamp("deactivated_at")` を追加する（nullable、デフォルトなし）。`createdAt` の後に配置する
- [x] `bun run db:generate` で差分マイグレーションを生成する
- [x] 生成されたマイグレーション SQL が `ALTER TABLE ... ADD COLUMN "deactivated_at"` のみであることを確認する（他テーブル・他カラムの変更を含まないこと）
- [x] `bun run db:migrate` でマイグレーションを適用する

**Acceptance Criteria**:
- `users` テーブルに `deactivated_at` (timestamp, nullable) カラムが追加される
- マイグレーションファイルが `deactivated_at` 追加のみを含む
- `bun run typecheck` が通る

## T-02: User モデルに deactivatedAt を追加し、repository の select 句を更新する

- [x] `src/domain/models/user.ts` の `User` 型に `deactivatedAt: Date | null` を追加する
- [x] `src/infrastructure/repositories/userRepository.ts` の全 select 句（`findByOrganization`, `updateRole`, `findById`, `create`, `updateProfile`）に `deactivatedAt: users.deactivatedAt` を追加する
- [x] `findByEmailForAuth` の返り値にも `deactivatedAt` を追加する（UserWithPassword 型は User を extends しているため自動的に含まれるが、select 句でフィールドを明示する）
- [x] `findByIdForAuth` の返り値にも同様に `deactivatedAt` を追加する

**Acceptance Criteria**:
- `User` 型に `deactivatedAt` フィールドが存在する
- repository の全 select 句が `deactivatedAt` を返す
- `bun run typecheck` が通る
- 既存テスト（`bun test`）が変更なしで green

## T-03: findByEmailForAuth と findByIdForAuth に無効化ユーザー除外条件を追加する

- [x] `src/infrastructure/repositories/userRepository.ts` の `findByEmailForAuth` の WHERE 句に `isNull(users.deactivatedAt)` 条件を追加する（`and(eq(users.email, email), isNull(users.deactivatedAt))`）
- [x] `src/infrastructure/repositories/userRepository.ts` の `findByIdForAuth` の WHERE 句に `isNull(users.deactivatedAt)` 条件を追加する（`and(eq(users.id, id), eq(users.organizationId, organizationId), isNull(users.deactivatedAt))`）
- [x] `drizzle-orm` から `isNull` をインポートする

**Acceptance Criteria**:
- `findByEmailForAuth` は `deactivated_at IS NULL` のユーザーのみ返す
- `findByIdForAuth` は `deactivated_at IS NULL` のユーザーのみ返す
- 無効化済みユーザーは `findByEmailForAuth` で null が返る
- 無効化済みユーザーは `findByIdForAuth` で null が返る（パスワード変更等の認証用途でも遮断される）
- `bun run typecheck` が通る

## T-04: userRepository に deactivate / reactivate メソッドを追加する

- [x] `src/infrastructure/repositories/userRepository.ts` に `deactivate(id: string, organizationId: string, tx?: Transaction): Promise<User | null>` を追加する。`deactivated_at = new Date()` に設定し、`WHERE (id, organizationId)` で絞る。更新後の User を returning で返す
- [x] 同ファイルに `reactivate(id: string, organizationId: string, tx?: Transaction): Promise<User | null>` を追加する。`deactivated_at = null` に設定し、`WHERE (id, organizationId)` で絞る。更新後の User を returning で返す
- [x] returning の select 句は既存の `updateRole` と同じフィールド（`id, email, name, organizationId, role, notificationsLastSeenAt, createdAt` + `deactivatedAt`）を返す

**Acceptance Criteria**:
- `deactivate` は `deactivated_at` を現在時刻に設定し、更新後の User を返す
- `reactivate` は `deactivated_at` を null に設定し、更新後の User を返す
- 該当行がない場合は null を返す
- `bun run typecheck` が通る

## T-05: AuditAction に user.deactivate / user.reactivate を追加する

- [x] `src/domain/models/auditLog.ts` の `AuditAction` union 型に `"user.deactivate"` と `"user.reactivate"` を追加する。`"user.updatePassword"` の後に配置する

**Acceptance Criteria**:
- `AuditAction` 型が `"user.deactivate"` と `"user.reactivate"` を含む
- `bun run typecheck` が通る
- 既存テスト（`bun test`）が変更なしで green

## T-06: authorization に deactivateUser 操作を追加する

- [x] `src/domain/authorization.ts` の `organization` エンティティの権限マトリクスに `deactivateUser: ADMIN_ONLY` を追加する。`createUser` の後に配置する

**Acceptance Criteria**:
- `canPerform("admin", "organization", "deactivateUser")` が true
- `canPerform("manager", "organization", "deactivateUser")` が false
- `canPerform("finance", "organization", "deactivateUser")` が false
- `canPerform("member", "organization", "deactivateUser")` が false
- `bun run typecheck` が通る

## T-07: deactivateUser usecase を作成する

- [x] `src/application/usecases/deactivateUser.ts` を作成する
- [x] 入力型: `{ actorId: string; targetUserId: string; organizationId: string }`
- [x] 戻り値型: `DeactivateUserResult = { ok: true } | { ok: false; reason: string }`
- [x] ガード 1: `actorId === targetUserId` の場合は `{ ok: false, reason: "自分自身は無効化できません" }` を返す
- [x] ガード 2: `findById(targetUserId, organizationId)` で対象ユーザーを取得。見つからなければ `{ ok: false, reason: "ユーザーが見つかりません" }`
- [x] ガード 3: 対象ユーザーが admin の場合、`findByOrganization(organizationId)` で有効な admin（`deactivatedAt === null`）を数え、対象以外に admin がいなければ `{ ok: false, reason: "組織に最低1人の管理者が必要です" }`
- [x] `db.transaction` 内で `userRepository.deactivate(targetUserId, organizationId, tx)` と `recordAudit({ action: "user.deactivate", targetType: "user", targetId, actorId, organizationId }, tx)` を実行する
- [x] `src/application/usecases/index.ts` に `export { deactivateUser } from "./deactivateUser"` を追加する

**Acceptance Criteria**:
- 自己無効化が拒否される
- 組織で最後の admin の無効化が拒否される
- 存在しないユーザーの無効化が拒否される
- 正常系で `deactivated_at` が設定され、`user.deactivate` 監査ログが記録される
- `db.transaction` 内でリポジトリ更新と監査記録が実行される
- `bun run typecheck` が通る

## T-07b: updateUserRole の otherAdmins フィルターに無効化済みユーザー除外条件を追加する

- [x] `src/application/usecases/updateUserRole.ts` の `otherAdmins` フィルター条件に `&& u.deactivatedAt === null` を追加する（`u.role === "admin" && u.id !== data.targetUserId && u.deactivatedAt === null`）
- [x] `findByOrganization` が `deactivatedAt` を含む `User` を返すこと（T-02 完了後に有効）を前提とする

**Acceptance Criteria**:
- `updateUserRole` の `otherAdmins` フィルターは `deactivatedAt === null` の admin のみをカウントする
- deactivated admin のみが残る組織で active admin を降格しようとすると「組織に最低1人の管理者が必要です」エラーが返る
- deactivated admin A（有効な JWT を保持）と active admin B（唯一の有効 admin）がいる状態で A が B を降格しようとした場合、ガードが A を除外して B だけをカウントし、降格を拒否する
- `bun run typecheck` が通る

## T-08: reactivateUser usecase を作成する

- [x] `src/application/usecases/reactivateUser.ts` を作成する
- [x] 入力型: `{ actorId: string; targetUserId: string; organizationId: string }`
- [x] 戻り値型: `ReactivateUserResult = { ok: true } | { ok: false; reason: string }`
- [x] `findById(targetUserId, organizationId)` で対象ユーザーを取得。見つからなければ `{ ok: false, reason: "ユーザーが見つかりません" }`
- [x] 取得したユーザーの `deactivatedAt` が null（すでに有効）の場合は早期リターンで `{ ok: false, reason: "ユーザーはすでに有効です" }` を返す（no-op 実行と監査ログ記録を防ぐ）
- [x] `db.transaction` 内で `userRepository.reactivate(targetUserId, organizationId, tx)` と `recordAudit({ action: "user.reactivate", targetType: "user", targetId: targetUserId, actorId, organizationId }, tx)` を実行する
- [x] `src/application/usecases/index.ts` に `export { reactivateUser } from "./reactivateUser"` を追加する

**Acceptance Criteria**:
- 存在しないユーザーの再有効化が拒否される
- すでに有効なユーザーを再有効化しようとすると「ユーザーはすでに有効です」エラーが返り、DB 更新も監査ログ記録も行われない
- 正常系（deactivatedAt が non-null のユーザー）で `deactivated_at` が null に設定され、`user.reactivate` 監査ログが記録される
- `db.transaction` 内でリポジトリ更新と監査記録が実行される
- `bun run typecheck` が通る

## T-09: Server Actions に deactivateUserAction / reactivateUserAction を追加する

- [x] `src/app/actions/users.ts` に `deactivateUserAction` を追加する
  - `auth()` でセッション取得、未認証は `{ success: false, message: "認証が必要です" }`
  - `canPerform(session.user.role, "organization", "deactivateUser")` で権限チェック
  - FormData から `userId` (z.string().uuid()) を取得し zod でバリデーション
  - `deactivateUser({ targetUserId, organizationId: session.user.organizationId, actorId: session.user.id })` を呼び出す
  - 成功時に `revalidatePath("/settings/users")` して `{ success: true }` を返す
- [x] `src/app/actions/users.ts` に `reactivateUserAction` を追加する
  - 認証・認可（`deactivateUser` と同じ権限）・バリデーション・usecase 呼び出し・revalidatePath は `deactivateUserAction` と同パターン
  - `reactivateUser({ targetUserId, organizationId: session.user.organizationId, actorId: session.user.id })` を呼び出す
- [x] `import` に `deactivateUser`, `reactivateUser` を追加する

**Acceptance Criteria**:
- 未認証ユーザーは拒否される
- admin 以外は権限エラーで拒否される
- zod バリデーションが userId を UUID で検証する
- organizationId と actorId が session 由来（formData からではない）
- 成功時に `/settings/users` を revalidate する
- `bun run typecheck` が通る

## T-10: settings/users ページに無効化状態表示と操作ボタンを追加する

- [x] `src/app/(dashboard)/settings/users/UserDeactivateButton.tsx` クライアントコンポーネントを作成する
  - props: `{ userId: string; isDeactivated: boolean }`
  - 有効ユーザーには「無効化」ボタン（`BTN_DANGER` スタイル）を表示
  - 無効化済みユーザーには「有効化」ボタン（`BTN_PRIMARY` スタイル）を表示
  - クリック時に `deactivateUserAction` or `reactivateUserAction` を FormData 経由で呼び出す
  - エラー時はエラーメッセージを表示する
  - 送信中は disabled にする
- [x] `src/app/(dashboard)/settings/users/page.tsx` を更新する
  - DataTable のカラムに「状態」列を追加する。有効ユーザーは「有効」、無効化済みは「無効」と表示する
  - DataTable のカラムに「操作」列を追加する。自分以外のユーザーに `UserDeactivateButton` を表示する（自分自身には非表示）
  - `listUsersAction` で取得するユーザーの `deactivatedAt` を利用する
  - 無効化済みユーザーの名前行にはグレーアウトの視覚的区別をつける
  - 無効化済みユーザーのロール変更 select を disabled にする

**Acceptance Criteria**:
- ユーザー一覧に有効/無効の状態が表示される
- 自分以外のユーザーに無効化/再有効化ボタンが表示される
- 自分自身には無効化ボタンが表示されない
- 無効化済みユーザーのロール変更が disabled になる
- `bun run typecheck` が通る
- `bun run build` が成功する

## T-11: テストを追加する

- [x] `src/__tests__/usecases/userManagement.test.ts` に `deactivateUser` usecase の静的コード解析テストを追加する
  - 自己無効化ガード（`actorId === targetUserId` パターン、「自分自身は無効化できません」メッセージ）
  - `db.transaction` の使用
  - `recordAudit` がトランザクション内で呼ばれる
  - `action` が `"user.deactivate"` である
  - ユーザーが見つからない場合のエラーメッセージ
  - 最後の admin ガード（`findByOrganization` の使用、「組織に最低1人の管理者が必要です」メッセージ）
- [x] 同ファイルに `reactivateUser` usecase の静的コード解析テストを追加する
  - `db.transaction` の使用
  - `recordAudit` がトランザクション内で呼ばれる
  - `action` が `"user.reactivate"` である
  - ユーザーが見つからない場合のエラーメッセージ
  - すでに有効なユーザーへの再有効化拒否（early return ガード、「ユーザーはすでに有効です」メッセージ）
- [x] `src/__tests__/settings/userSettingsActions.test.ts` に `deactivateUserAction` / `reactivateUserAction` の静的コード解析テストを追加する
  - `canPerform` で `"deactivateUser"` 権限チェックの存在
  - `"use server"` ディレクティブ
  - `session.user.organizationId` と `session.user.id` からの参照
  - zod バリデーション（`z.string().uuid()`）
  - `revalidatePath` の呼び出し
- [x] `src/__tests__/domain/authorization.test.ts` に `deactivateUser` 権限テストを追加する
  - admin のみが `deactivateUser` 操作を実行できることを検証
- [x] 認証ゲートのテストを追加する（`findByEmailForAuth` と `findByIdForAuth` が `deactivated_at IS NULL` で絞ることの静的コード解析）
- [x] `updateUserRole` の `otherAdmins` フィルターに `deactivatedAt === null` 条件が含まれることの静的コード解析テストを追加する（`src/__tests__/usecases/userManagement.test.ts`）

**Acceptance Criteria**:
- 全テスト（`bun test`）が green
- 無効化・再有効化の主要パス（ガード、トランザクション、監査ログ、権限）がテストでカバーされている
- 認証ゲート（`findByEmailForAuth` の `isNull` 条件）がテストでカバーされている

## T-12: 最終検証

- [x] `bun run typecheck` が通る
- [x] `bun run lint` が通る
- [x] `bun test` が全て green
- [x] `bun run build` が成功する

**Acceptance Criteria**:
- CI 相当の全チェックが通る
- 既存テストに変更が入っていない
