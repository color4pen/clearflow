# Tasks: behavioral-test-hardening

## T-01: updateUserRole behavioral テストの作成

`src/__tests__/usecases/updateUserRole.dynamic.test.ts` を新規作成する。

- [ ] `mock.module` で `@/infrastructure/db` をモック（transaction を即時実行）
- [ ] `mock.module` で `@/infrastructure/repositories/userRepository` をモック（findById, findByOrganization, updateRole を state で制御）
- [ ] `mock.module` で `@/infrastructure/repositories/auditLogRepository` をモック（create の引数をキャプチャ）
- [ ] モック定義の後に `import { updateUserRole } from "@/application/usecases/updateUserRole"` を配置
- [ ] state オブジェクトに `foundUser`, `orgUsers`, `updatedUser`, `updateRoleArgs`, `auditCreateArgs` を定義
- [ ] `beforeEach` で state を初期値にリセット
- [ ] テストケース: 自己降格拒否 — actorId === targetUserId で `{ ok: false }` が返り、updateRole が呼ばれない
- [ ] テストケース: 最後の admin 降格拒否 — findByOrganization が対象ユーザーのみ（他に admin なし）を返すとき `{ ok: false }` が返る
- [ ] テストケース: 他に有効な admin がいれば降格成功 — `{ ok: true }` が返り、updateRole が正しい引数で呼ばれ、audit が action="user.updateRole" + metadata に oldRole/newRole で記録される
- [ ] テストケース: 対象ユーザーが見つからない場合 — findById が null を返すとき `{ ok: false }` が返る

**Acceptance Criteria**:
- 全テストケースが usecase を実行して戻り値・呼び出し引数・監査を assert している（readSrc/toContain 不使用）
- `bun test src/__tests__/usecases/updateUserRole.dynamic.test.ts` が green
- 個別ファイルモック方式（バレル `@/infrastructure/repositories` はモックしない）

## T-02: deactivateUser behavioral テストの作成

`src/__tests__/usecases/deactivateUser.dynamic.test.ts` を新規作成する。

- [ ] `mock.module` で `@/infrastructure/db` をモック（transaction を即時実行）
- [ ] `mock.module` で `@/infrastructure/repositories/userRepository` をモック（findById, findByOrganization, deactivate を state で制御）
- [ ] `mock.module` で `@/infrastructure/repositories/auditLogRepository` をモック（create の引数をキャプチャ）
- [ ] モック定義の後に `import { deactivateUser } from "@/application/usecases/deactivateUser"` を配置
- [ ] state オブジェクトに `foundUser`, `orgUsers`, `deactivatedUser`, `deactivateArgs`, `auditCreateArgs` を定義
- [ ] `beforeEach` で state を初期値にリセット
- [ ] テストケース: 自己無効化拒否 — actorId === targetUserId で `{ ok: false }` が返る
- [ ] テストケース: 最後の有効 admin 無効化拒否 — 対象が admin で findByOrganization が他に有効な admin を返さないとき `{ ok: false }` が返る
- [ ] テストケース: member の無効化成功 — `{ ok: true }` が返り、deactivate が呼ばれ、audit が action="user.deactivate" で記録される
- [ ] テストケース: 対象ユーザーが見つからない場合 — findById が null を返すとき `{ ok: false }` が返る

**Acceptance Criteria**:
- 全テストケースが usecase を実行して戻り値・呼び出し引数・監査を assert している（readSrc/toContain 不使用）
- `bun test src/__tests__/usecases/deactivateUser.dynamic.test.ts` が green
- 個別ファイルモック方式

## T-03: reactivateUser behavioral テストの作成

`src/__tests__/usecases/reactivateUser.dynamic.test.ts` を新規作成する。

- [ ] `mock.module` で `@/infrastructure/db` をモック（transaction を即時実行）
- [ ] `mock.module` で `@/infrastructure/repositories/userRepository` をモック（findById, reactivate を state で制御）
- [ ] `mock.module` で `@/infrastructure/repositories/auditLogRepository` をモック（create の引数をキャプチャ）
- [ ] モック定義の後に `import { reactivateUser } from "@/application/usecases/reactivateUser"` を配置
- [ ] state オブジェクトに `foundUser`, `reactivatedUser`, `reactivateArgs`, `auditCreateArgs` を定義
- [ ] `beforeEach` で state を初期値にリセット
- [ ] テストケース: 再有効化成功 — 無効化済みユーザー（deactivatedAt 非 null）に対して `{ ok: true }` が返り、reactivate が呼ばれ、audit が action="user.reactivate" で記録される
- [ ] テストケース: 既に有効なユーザーへの再有効化拒否 — deactivatedAt===null のユーザーに対して `{ ok: false }` が返り、reactivate は呼ばれない
- [ ] テストケース: 対象ユーザーが見つからない場合 — findById が null を返すとき `{ ok: false }` が返る

**Acceptance Criteria**:
- 全テストケースが usecase を実行して戻り値・呼び出し引数・監査を assert している（readSrc/toContain 不使用）
- `bun test src/__tests__/usecases/reactivateUser.dynamic.test.ts` が green
- 個別ファイルモック方式

## T-04: createUser behavioral テストの作成

`src/__tests__/usecases/createUser.dynamic.test.ts` を新規作成する。

- [ ] `mock.module` で `@/infrastructure/db` をモック（transaction を即時実行、state.throwCode で 23505 エラーをシミュレート）
- [ ] `mock.module` で `@/infrastructure/repositories/userRepository` をモック（existsByEmail, create を state で制御）
- [ ] `mock.module` で `@/infrastructure/repositories/auditLogRepository` をモック（create の引数をキャプチャ）
- [ ] `mock.module` で `bcryptjs` をモック（hash を固定値 "hashed_password" で返す）
- [ ] モック定義の後に `import { createUser } from "@/application/usecases/createUser"` を配置
- [ ] state オブジェクトに `emailExists`, `createdUser`, `userCreateArgs`, `auditCreateArgs`, `throwCode` を定義
- [ ] `beforeEach` で state を初期値にリセット
- [ ] テストケース: email 重複拒否（事前チェック）— existsByEmail が true のとき `{ ok: false }` が返り、userRepository.create は呼ばれない
- [ ] テストケース: 23505 フォールバック — existsByEmail が false だが transaction 内で 23505 エラーが発生したとき `{ ok: false }` が返る
- [ ] テストケース: 成功パス — `{ ok: true, user }` が返り、userRepository.create の引数の hashedPassword が bcrypt モックの戻り値（"hashed_password"）であり、organizationId/role/email が正しく渡され、audit が action="user.create" で記録される

**Acceptance Criteria**:
- 全テストケースが usecase を実行して戻り値・呼び出し引数・監査を assert している（readSrc/toContain 不使用）
- `bun test src/__tests__/usecases/createUser.dynamic.test.ts` が green
- 個別ファイルモック方式
- bcrypt.hash のモック戻り値が userRepository.create に渡されることを assert

## T-05: changeOwnPassword behavioral テストの作成

`src/__tests__/usecases/changeOwnPassword.dynamic.test.ts` を新規作成する。

- [ ] `mock.module` で `@/infrastructure/db` をモック（transaction を即時実行）
- [ ] `mock.module` で `@/infrastructure/repositories/userRepository` をモック（findByIdForAuth, updatePassword を state で制御）
- [ ] `mock.module` で `@/infrastructure/repositories/auditLogRepository` をモック（create の引数をキャプチャ）
- [ ] `mock.module` で `bcryptjs` をモック（compare を state.bcryptCompareResult で制御、hash を固定値 "new_hashed_password" で返す）
- [ ] モック定義の後に `import { changeOwnPassword } from "@/application/usecases/changeOwnPassword"` を配置
- [ ] state オブジェクトに `authUser`, `bcryptCompareResult`, `updatePasswordArgs`, `updatePasswordResult`, `auditCreateArgs` を定義
- [ ] `beforeEach` で state を初期値にリセット
- [ ] テストケース: ユーザーが見つからない場合 — findByIdForAuth が null を返すとき `{ ok: false }` が返る
- [ ] テストケース: 現在パスワード不一致 — bcrypt.compare が false を返すとき `{ ok: false }` が返り、updatePassword は呼ばれない
- [ ] テストケース: パスワード変更成功 — bcrypt.compare が true を返すとき `{ ok: true }` が返り、updatePassword が bcrypt.hash の戻り値（"new_hashed_password"）で呼ばれ、audit が action="user.updatePassword" + actorId=userId + targetId=userId で記録される

**Acceptance Criteria**:
- 全テストケースが usecase を実行して戻り値・呼び出し引数・監査を assert している（readSrc/toContain 不使用）
- `bun test src/__tests__/usecases/changeOwnPassword.dynamic.test.ts` が green
- 個別ファイルモック方式
- bcrypt.compare の結果に応じた分岐が検証されている
- actorId と targetId が共に userId であることが assert されている

## T-06: 全体検証

- [ ] `bun test` で既存テストを含む全テストが green
- [ ] `bun run typecheck` が green
- [ ] `bun run build` が成功
- [ ] 実装ファイル（`src/application/`, `src/infrastructure/`, `src/domain/`, `src/app/`）に差分がないことを確認

**Acceptance Criteria**:
- CI 相当の品質ゲート（test + typecheck + build）を全て通過
- `git diff --name-only` で `src/__tests__/` 配下の新規ファイルのみが変更対象
