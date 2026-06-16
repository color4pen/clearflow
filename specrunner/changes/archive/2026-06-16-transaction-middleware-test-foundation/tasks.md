# Tasks: トランザクション導入・認証プロキシ修正・テナント分離強化

## T-01: db.ts の環境変数ガードと Transaction 型 export

- [x] `src/infrastructure/db.ts` で `process.env.DATABASE_URL` の存在チェックを追加する。未設定時に `throw new Error("DATABASE_URL environment variable is not set")` する
- [x] non-null assertion (`!`) を削除し、ガード後の変数を `postgres()` に渡す
- [x] `db.transaction()` コールバックの `tx` 引数型を `Transaction` として export する: `export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];`
- [x] 既存の `export const db = drizzle(client, { schema })` と `drizzle-orm/postgres-js`, `schema` の import は維持する

**Acceptance Criteria**:
- `src/infrastructure/db.ts` に `DATABASE_URL` 未設定時のガード (`if (!databaseUrl)`) が存在する
- throw されるメッセージが `"DATABASE_URL environment variable is not set"` である
- `Transaction` 型が export されている
- `bun run build` が成功する

## T-02: リポジトリ関数への省略可能 tx 引数追加

- [x] `src/infrastructure/repositories/requestRepository.ts` の `updateStatus` 関数に末尾引数 `tx?: Transaction` を追加する。`Transaction` は `@/infrastructure/db` から import する
- [x] `updateStatus` 内のクエリ実行を `(tx ?? db)` で行うように変更する: `const queryRunner = tx ?? db;` とし、`db.update(...)` を `queryRunner.update(...)` に置き換える
- [x] `src/infrastructure/repositories/auditLogRepository.ts` の `create` 関数に末尾引数 `tx?: Transaction` を追加する
- [x] `create` 内のクエリ実行を `(tx ?? db)` で行うように変更する
- [x] `tx` なしの既存呼び出し（`createRequest` usecase 等）が従来通り動作することを確認する

**Acceptance Criteria**:
- `requestRepository.updateStatus` の末尾引数に `tx?: Transaction` が存在する
- `auditLogRepository.create` の末尾引数に `tx?: Transaction` が存在する
- `tx` 省略時は `db` でクエリが実行される（既存動作を維持）
- `typecheck` が green

## T-03: usecase へのトランザクション導入

- [x] `src/application/usecases/approveRequest.ts` で `db` を `@/infrastructure/db` から import する
- [x] `approveRequest` 関数内の `requestRepository.updateStatus` と `auditLogRepository.create` の呼び出しを `db.transaction(async (tx) => { ... })` で囲む
- [x] トランザクション内で `requestRepository.updateStatus(..., tx)` と `auditLogRepository.create(..., tx)` に `tx` を渡す
- [x] トランザクション外の `requestRepository.findById` と `validateTransition` はトランザクション外に維持する（読み取り専用操作のため）
- [x] `src/application/usecases/rejectRequest.ts` に同様の変更を適用する
- [x] `src/application/usecases/submitRequest.ts` に同様の変更を適用する
- [x] 各 usecase の戻り値型 (`ApproveRequestResult` 等) は変更しない

**Acceptance Criteria**:
- `approveRequest.ts`, `rejectRequest.ts`, `submitRequest.ts` 内に `db.transaction` の呼び出しがある
- トランザクション内で `tx` が `updateStatus` と `auditLogRepository.create` に渡されている
- `findById` と `validateTransition` はトランザクション外で実行される
- 依存方向が `usecases → domain / infrastructure` を遵守している
- `typecheck` が green

## T-04: userRepository.findByEmail → findByEmailForAuth リネーム

- [x] `src/infrastructure/repositories/userRepository.ts` の `findByEmail` 関数名を `findByEmailForAuth` に変更する。引数・戻り値型・実装は変更しない
- [x] `src/infrastructure/auth.ts:7` の import を `findByEmailForAuth` に変更する: `import { findByEmailForAuth } from "./repositories/userRepository";`
- [x] `src/infrastructure/auth.ts:36` の呼び出しを `findByEmailForAuth(email)` に変更する
- [x] `src/infrastructure/repositories/index.ts` の `userRepository` namespace export は変更不要（`export * as userRepository` のため自動的に反映される）

**Acceptance Criteria**:
- `userRepository` に `findByEmail` 関数が存在しない
- `findByEmailForAuth` が export されている
- `auth.ts` が `findByEmailForAuth` を import し呼び出している
- `bun run build` が成功する

## T-05: Server Actions のエラーレスポンス統一

- [x] `src/app/actions/requests.ts` に `ActionResult` 型を定義する: `export type ActionResult = { success: boolean; message?: string };`
- [x] `submitRequestAction` の戻り値型を `Promise<void>` から `Promise<ActionResult>` に変更する
- [x] `submitRequestAction` の認証失敗時 (`!session?.user?.id`) を `return { success: false, message: "認証が必要です" };` に変更する
- [x] `submitRequestAction` の usecase 失敗時を `return { success: false, message: result.reason };` に変更する（`throw new Error` を置き換え）
- [x] `submitRequestAction` の成功時を `return { success: true };` に変更する（`revalidatePath` の後）
- [x] `approveRequestAction` の戻り値型を `Promise<void>` から `Promise<ActionResult>` に変更する
- [x] `approveRequestAction` の認証失敗時 (`!session?.user?.id`) を `return { success: false, message: "認証が必要です" };` に変更する
- [x] `approveRequestAction` の認可失敗時 (`role !== "admin"`) を `return { success: false, message: "権限がありません" };` に変更する
- [x] `approveRequestAction` の usecase 失敗時を `return { success: false, message: result.reason };` に変更する
- [x] `approveRequestAction` の成功時を `return { success: true };` に変更する
- [x] `rejectRequestAction` に同様の変更を適用する
- [x] `createRequestAction` は既存の `CreateRequestState` 型を維持する（変更しない）

**Acceptance Criteria**:
- `submitRequestAction`, `approveRequestAction`, `rejectRequestAction` の戻り値型が `Promise<ActionResult>` である
- 認証失敗時に `{ success: false, message: "認証が必要です" }` が返される
- 認可失敗時に `{ success: false, message: "権限がありません" }` が返される
- usecase 失敗時に `{ success: false, message: <reason> }` が返される（throw しない）
- 成功時に `{ success: true }` が返される
- `createRequestAction` の型・動作が変更されていない
- `bun run build` が成功する

## T-06: 既存テストの整合性確認と更新

- [x] `src/__tests__/static/projectStructure.test.ts` の TC-029 が `db.ts` の変更後も green であることを確認する（`export const db`, `drizzle-orm/postgres-js`, `schema` の存在チェック）
- [x] `src/__tests__/static/projectStructure.test.ts` の TC-021, TC-044, TC-048 が `proxy.ts` を参照しており変更不要であることを確認する
- [x] `src/__tests__/usecases/requestWorkflow.test.ts` の TC-039, TC-040 がソースコード内の `validateTransition` → `updateStatus` の順序チェックであり、トランザクション追加後も green であることを確認する（`validateTransition` はトランザクション外で先に呼ばれるため順序は維持される）
- [x] `src/__tests__/usecases/requestWorkflow.test.ts` の TC-011, TC-012, TC-013 が `auditLogRepository` の存在チェックであり、トランザクション追加後も green であることを確認する
- [x] TC-036 (`usecases import from domain and infrastructure`) が `db` の追加 import 後も green であることを確認する — `@/infrastructure/db` は infrastructure 層からの import であり依存方向に適合

**Acceptance Criteria**:
- `bun test` が全件 green
- 既存テストの意図（静的コード解析）がトランザクション追加後も正しく検証される

## T-07: ビルド検証

- [x] `bun run build` が成功する
- [x] `bun test` が全件 green
- [x] `src/application/usecases/approveRequest.ts`, `rejectRequest.ts`, `submitRequest.ts` 内に `db.transaction` の呼び出しがあることを grep で確認する
- [x] `userRepository` に `findByEmail` 関数が存在しないことを grep で確認する
- [x] `src/infrastructure/db.ts` に `DATABASE_URL` ガードが存在することを確認する
- [x] 依存方向: `src/domain/` 配下に `@/infrastructure` の import がないことを grep で確認する
