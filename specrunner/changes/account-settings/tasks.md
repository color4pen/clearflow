# Tasks: アカウント設定（プロフィール編集・パスワード変更）

## T-01: AuditAction に `user.updatePassword` を追加

- [ ] `src/domain/models/auditLog.ts` の `AuditAction` union に `"user.updatePassword"` を追加する（`"user.updateRole"` の次に配置）

**Acceptance Criteria**:
- `AuditAction` 型に `"user.updatePassword"` が含まれる
- 既存の型が変更されていない
- `bun run typecheck` green

## T-02: userRepository に `findByIdForAuth` を追加

- [ ] `src/infrastructure/repositories/userRepository.ts` に `findByIdForAuth(id: string, organizationId: string): Promise<UserWithPassword | null>` を追加する
- [ ] WHERE は `and(eq(users.id, id), eq(users.organizationId, organizationId))` でテナント分離する
- [ ] 返却型は既存の `UserWithPassword`（`User & { hashedPassword: string }`）を使用する
- [ ] `select()` で全カラムを取得し、`findByEmailForAuth` と同じ projection で `UserWithPassword` を構築する
- [ ] `.limit(1)` を付与する

**Acceptance Criteria**:
- `findByIdForAuth` が `UserWithPassword | null` を返す
- WHERE に `id` と `organizationId` の両方が含まれる
- `findById` の select（安全 projection）は変更されていない
- `bun run typecheck` green

## T-03: userRepository に `updateProfile` を追加

- [ ] `src/infrastructure/repositories/userRepository.ts` に `updateProfile(id: string, organizationId: string, data: { name: string }, tx?: Transaction): Promise<User | null>` を追加する
- [ ] WHERE は `and(eq(users.id, id), eq(users.organizationId, organizationId))` で絞る
- [ ] `.set({ name: data.name })` で name のみ更新する
- [ ] `.returning()` は `updateRole` と同じ安全 projection（hashedPassword を含まない）を使用する
- [ ] `tx ?? db` パターンで queryRunner を決定する（既存の `updateRole` と同じ）

**Acceptance Criteria**:
- `updateProfile` が `User | null` を返す（hashedPassword を含まない）
- WHERE に `id` と `organizationId` の両方が含まれる
- `bun run typecheck` green

## T-04: userRepository に `updatePassword` を追加

- [ ] `src/infrastructure/repositories/userRepository.ts` に `updatePassword(id: string, organizationId: string, hashedPassword: string, tx?: Transaction): Promise<boolean>` を追加する
- [ ] WHERE は `and(eq(users.id, id), eq(users.organizationId, organizationId))` で絞る
- [ ] `.set({ hashedPassword })` で hashedPassword のみ更新する
- [ ] `.returning({ id: users.id })` で更新成功を確認し、`result.length > 0` を返す
- [ ] `tx ?? db` パターンで queryRunner を決定する

**Acceptance Criteria**:
- `updatePassword` が `boolean` を返す
- WHERE に `id` と `organizationId` の両方が含まれる
- returning で更新有無を判定している
- `bun run typecheck` green

## T-05: `updateOwnProfile` usecase を作成

- [ ] `src/application/usecases/updateOwnProfile.ts` を新規作成する
- [ ] 入力型: `{ userId: string; organizationId: string; name: string }`
- [ ] 返却型: `UpdateOwnProfileResult = { ok: true } | { ok: false; reason: string }`
- [ ] `userRepository.updateProfile(userId, organizationId, { name })` を呼び出す
- [ ] 更新対象が見つからない場合（`null` 返却）は `{ ok: false, reason: "ユーザーが見つかりません" }` を返す
- [ ] 監査ログは記録しない（D4: 表示名変更は監査対象外）
- [ ] トランザクションは不要（単一操作）
- [ ] `src/application/usecases/index.ts` に `export { updateOwnProfile } from "./updateOwnProfile"` を追加する

**Acceptance Criteria**:
- usecase が `userRepository.updateProfile` を呼び出す
- `recordAudit` を呼び出さない
- index.ts に export がある
- `bun run typecheck` green

## T-06: `changeOwnPassword` usecase を作成

- [ ] `src/application/usecases/changeOwnPassword.ts` を新規作成する
- [ ] 入力型: `{ userId: string; organizationId: string; currentPassword: string; newPassword: string }`
- [ ] 返却型: `ChangeOwnPasswordResult = { ok: true } | { ok: false; reason: string }`
- [ ] `userRepository.findByIdForAuth(userId, organizationId)` で現在のハッシュを取得する
- [ ] ユーザーが見つからない場合は `{ ok: false, reason: "ユーザーが見つかりません" }` を返す
- [ ] `bcrypt.compare(currentPassword, user.hashedPassword)` で照合する。不一致なら `{ ok: false, reason: "現在のパスワードが正しくありません" }` を返す
- [ ] `bcrypt.hash(newPassword, 12)` で新パスワードをハッシュする
- [ ] `db.transaction` 内で以下を実行する:
  - `userRepository.updatePassword(userId, organizationId, hashedPassword, tx)` を呼び出す
  - 更新失敗（`false` 返却）時は throw する
  - `recordAudit({ action: "user.updatePassword", targetType: "user", targetId: userId, actorId: userId, organizationId }, tx)` を呼び出す
- [ ] `src/application/usecases/index.ts` に `export { changeOwnPassword } from "./changeOwnPassword"` を追加する

**Acceptance Criteria**:
- `bcrypt.compare` でパスワード照合がある
- `bcrypt.hash(newPassword, 12)` でハッシュしている
- `db.transaction` 内で `updatePassword` と `recordAudit` が実行される
- `recordAudit` の action が `"user.updatePassword"` である
- actorId と targetId が共に userId である
- index.ts に export がある
- `bun run typecheck` green

## T-07: `src/app/actions/account.ts` に Server Action を作成

- [ ] `src/app/actions/account.ts` を新規作成する
- [ ] ファイル先頭に `"use server"` ディレクティブを記述する
- [ ] `updateOwnProfileAction` を実装する:
  - `auth()` で認証チェック（未認証なら `{ success: false, message: "認証が必要です" }`）
  - `session.user.id` と `session.user.organizationId` を使用する（入力から userId を受けない）
  - zod スキーマ: `{ name: z.string().min(1, "名前は必須です") }`
  - `updateOwnProfile({ userId: session.user.id, organizationId: session.user.organizationId, name })` を呼び出す
  - 成功後 `revalidatePath("/account")` を呼び出す
  - 返却型: `{ success: true } | { success: false; message: string }`
- [ ] `changeOwnPasswordAction` を実装する:
  - `auth()` で認証チェック
  - `session.user.id` と `session.user.organizationId` を使用する
  - zod スキーマ: `{ currentPassword: z.string().min(1, "現在のパスワードは必須です"), newPassword: z.string().min(8, "新しいパスワードは8文字以上で入力してください") }`
  - `changeOwnPassword({ userId: session.user.id, organizationId: session.user.organizationId, currentPassword, newPassword })` を呼び出す
  - 返却型: `{ success: true } | { success: false; message: string }`
- [ ] `canPerform` によるロールゲートは使用しない（全ロール許可）
- [ ] `FormData` ベースのインターフェースとする（既存の Action パターンに合わせる）

**Acceptance Criteria**:
- `"use server"` ディレクティブがある
- userId は `session.user.id` から取得し、入力から受け取らない
- `canPerform` を使用していない
- zod による入力検証がある（name: min(1), newPassword: min(8)）
- `updateOwnProfile` / `changeOwnPassword` usecase を呼び出す
- repository を直接インポートしていない
- `bun run typecheck` green

## T-08: `/account` ページと UI コンポーネントを作成

- [ ] `src/app/(dashboard)/account/page.tsx` を新規作成する:
  - `auth()` で認証チェック（未認証なら `/login` にリダイレクト）
  - ロールチェックは行わない（全ロール到達可能）
  - `PageToolbar` で「アカウント設定」タイトルを表示する
  - `SectionCard` で「プロフィール」セクション（ProfileForm）と「パスワード変更」セクション（PasswordForm）を配置する
  - 現在のユーザー名を `session.user.name` から取得して ProfileForm に渡す
- [ ] `src/app/(dashboard)/account/ProfileForm.tsx` を新規作成する:
  - Client Component（`"use client"`）
  - name 入力フィールド（`FormField` + `Input` コンポーネント使用）
  - `updateOwnProfileAction` を `useActionState` で呼び出す
  - `SubmitButton` で送信
  - 成功・エラーメッセージの表示
- [ ] `src/app/(dashboard)/account/PasswordForm.tsx` を新規作成する:
  - Client Component（`"use client"`）
  - currentPassword / newPassword 入力フィールド（type="password"）
  - `changeOwnPasswordAction` を `useActionState` で呼び出す
  - `SubmitButton` で送信
  - 成功・エラーメッセージの表示

**Acceptance Criteria**:
- `/account` ページがロールチェック無しで表示される
- `PageToolbar` / `SectionCard` / `FormField` / `Input` / `SubmitButton` 等の既存コンポーネントを使用している
- プロフィール編集フォームとパスワード変更フォームが独立して動作する
- `bun run typecheck` green、`bun run build` 成功

## T-09: SidebarNav に「アカウント」リンクを追加

- [ ] `src/app/(dashboard)/SidebarNav.tsx` の `navItems` 配列に `{ href: "/account", label: "アカウント" }` を追加する
- [ ] `adminOnly` は付けない（全ロール表示）
- [ ] 配置位置は「設定」の前（管理系の前に本人向けを配置）

**Acceptance Criteria**:
- `navItems` に `/account` が含まれる
- `adminOnly` が設定されていない
- 全ロールで「アカウント」リンクが表示される
- `bun run typecheck` green

## T-10: テストを作成

- [ ] `src/__tests__/usecases/accountSettings.test.ts` を新規作成する（静的コード解析テスト、既存パターンに準拠）:
  - `updateOwnProfile` usecase が `userRepository.updateProfile` を呼び出すことを検証
  - `updateOwnProfile` usecase が `recordAudit` を呼び出さないことを検証
  - `changeOwnPassword` usecase が `bcrypt.compare` でパスワード照合することを検証
  - `changeOwnPassword` usecase が `bcrypt.hash` でハッシュすることを検証（salt round 12）
  - `changeOwnPassword` usecase が `db.transaction` 内で `updatePassword` + `recordAudit` を実行することを検証
  - `changeOwnPassword` usecase の `recordAudit` action が `"user.updatePassword"` であることを検証
  - `changeOwnPassword` usecase の actorId と targetId が同じ userId であることを検証
  - usecase index.ts に `updateOwnProfile` / `changeOwnPassword` が export されていることを検証
- [ ] `src/__tests__/actions/accountActions.test.ts` を新規作成する（静的コード解析テスト）:
  - `account.ts` に `"use server"` ディレクティブがあることを検証
  - `updateOwnProfileAction` が `canPerform` を使用しないことを検証
  - `changeOwnPasswordAction` が `canPerform` を使用しないことを検証
  - `account.ts` が `session.user.id` を使用し、入力から userId を受け取らないことを検証
  - `account.ts` が `@/infrastructure/repositories` を直接インポートしないことを検証
  - `account.ts` が `updateOwnProfile` / `changeOwnPassword` usecase をインポートしていることを検証
  - zod バリデーション（`z.string()`, `min`）が含まれることを検証
- [ ] `src/__tests__/infrastructure/accountRepository.test.ts` を新規作成する（静的コード解析テスト）:
  - `findByIdForAuth` が `userRepository.ts` に存在することを検証
  - `findByIdForAuth` が `organizationId` で WHERE 条件を持つことを検証
  - `findById` の select に `hashedPassword` が含まれないことを検証（安全 projection 維持）
  - `updateProfile` が WHERE に `id` と `organizationId` の両方を含むことを検証
  - `updatePassword` が WHERE に `id` と `organizationId` の両方を含むことを検証
- [ ] `src/__tests__/domain/accountAuditAction.test.ts` を新規作成する（静的コード解析テスト）:
  - `AuditAction` 型に `"user.updatePassword"` が含まれることを検証
- [ ] 全ロールアクセスのテストを追加する:
  - `/account` ページに `role !== "admin"` リダイレクトが無いことを検証
  - SidebarNav に `/account` が `adminOnly` 無しで含まれることを検証

**Acceptance Criteria**:
- 受け入れ基準の全項目がテストでカバーされている
- 既存テストが変更されていない
- `bun test` green
- `bun run typecheck` green

## T-11: ビルド・全テスト確認

- [ ] `bun run typecheck` が成功する
- [ ] `bun run lint` が成功する
- [ ] `bun test` が成功する（既存テスト含む）
- [ ] `bun run build` が成功する

**Acceptance Criteria**:
- 全コマンドがエラー無しで完了する
- 既存テストが変更されていない
