# Tasks: API トークンの発行・失効と Bearer 認証

## T-01: api_tokens テーブルのスキーマ定義とマイグレーション生成

- [x] `src/infrastructure/schema.ts` に `apiTokens` テーブルを追加する。カラム: `id` (uuid PK defaultRandom), `organizationId` (uuid NOT NULL → organizations.id), `userId` (uuid NOT NULL → users.id), `name` (text NOT NULL), `tokenHash` (text NOT NULL), `tokenPrefix` (text NOT NULL), `lastUsedAt` (timestamp nullable), `expiresAt` (timestamp nullable), `revokedAt` (timestamp nullable), `createdAt` (timestamp defaultNow NOT NULL)
- [x] `apiTokens` にインデックスを追加する: `(organizationId, userId)` の複合インデックス（一覧取得の高速化）、`tokenHash` のユニークインデックス（ハッシュ照合時の一意検索）
- [x] `apiTokensRelations` を定義する: `user` → `users` (userId), `organization` → `organizations` (organizationId)
- [x] `organizationsRelations` に `apiTokens: many(apiTokens)` を追加する
- [x] `usersRelations` に `apiTokens: many(apiTokens)` を追加する
- [x] `bun run db:generate` で差分マイグレーション SQL を生成する（DB リセットや既存テーブル変更なし）
- [x] `bun run db:migrate` でマイグレーションを適用し、エラーがないことを確認する

**Acceptance Criteria**:
- `apiTokens` テーブルが schema.ts に定義されている
- organizationId, userId が NOT NULL で FK 参照を持つ
- tokenHash にユニーク制約がある
- リレーション定義が organizations, users の両方に追加されている
- 差分マイグレーション SQL が `drizzle/` に生成されている
- `bun run typecheck` が通る

---

## T-02: ドメインモデル `ApiToken` の型定義

- [x] `src/domain/models/apiToken.ts` を新規作成する。`ApiToken` 型を定義: `{ id: string; organizationId: string; userId: string; name: string; tokenPrefix: string; lastUsedAt: Date | null; expiresAt: Date | null; revokedAt: Date | null; createdAt: Date }`。平文・ハッシュはモデルに含めない
- [x] `src/domain/models/index.ts` に `export type { ApiToken } from "./apiToken"` を追加する

**Acceptance Criteria**:
- `ApiToken` 型が `tokenHash` を含まない（リポジトリ層のみがハッシュを扱う）
- index.ts に re-export がある
- `bun run typecheck` が通る

---

## T-03: 監査ログ型に `api_token` 関連の action / targetType を追加

- [x] `src/domain/models/auditLog.ts` の `AuditAction` union に `"api_token.create"` と `"api_token.revoke"` を追加する
- [x] 同ファイルの `AuditTargetType` union に `"api_token"` を追加する

**Acceptance Criteria**:
- `AuditAction` に `"api_token.create"` と `"api_token.revoke"` が含まれる
- `AuditTargetType` に `"api_token"` が含まれる
- `bun run typecheck` が通る

---

## T-04: apiTokenRepository の実装

- [x] `src/infrastructure/repositories/apiTokenRepository.ts` を新規作成する
- [x] `create(data: { organizationId, userId, name, tokenHash, tokenPrefix }, tx?): Promise<ApiToken>` — INSERT して ApiToken を返す。tokenHash は DB に保存するが戻り値の ApiToken 型には含めない
- [x] `findByTokenHash(tokenHash: string): Promise<{ id, organizationId, userId, revokedAt, expiresAt } | null>` — tokenHash でトークンレコードを検索する。Bearer 解決用。organizationId 条件は不要（ハッシュがグローバルユニーク）
- [x] `findByUserAndOrganization(userId, organizationId): Promise<ApiToken[]>` — ユーザーの全トークンを取得する（revoked 含む）。createdAt desc でソート
- [x] `revokeById(id, userId, organizationId, tx?): Promise<ApiToken | null>` — `revokedAt` を現在時刻に設定する。WHERE に `id AND userId AND organizationId AND revokedAt IS NULL` を含め、本人かつ未失効のトークンのみ操作可能にする
- [x] `updateLastUsedAt(id: string, timestamp: Date): Promise<void>` — lastUsedAt を更新する。トランザクション不要（ベストエフォート）
- [x] `src/infrastructure/repositories/index.ts` に `export * as apiTokenRepository from "./apiTokenRepository"` を追加する

**Acceptance Criteria**:
- 全メソッドが export されている
- create / revokeById に `tx?: Transaction` がある
- findByUserAndOrganization に userId AND organizationId 条件がある
- revokeById に userId AND organizationId AND revokedAt IS NULL 条件がある
- index.ts に re-export がある
- `bun run typecheck` が通る

---

## T-05: Bearer 解決関数の実装

- [x] `src/infrastructure/apiTokenResolver.ts` を新規作成する
- [x] `resolveBearer(authorizationHeader: string | null): Promise<{ userId: string; organizationId: string; role: Role } | null>` を実装する
- [x] 処理フロー: (1) ヘッダが `Bearer ` で始まるか検査 → (2) トークンが `cfp_` で始まるか検査 → (3) SHA-256 ハッシュを算出 → (4) `apiTokenRepository.findByTokenHash` で DB 照合 → (5) `revokedAt` / `expiresAt` を検査 → (6) `userRepository.findById` でユーザーを取得し `deactivatedAt` を検査 → (7) `apiTokenRepository.updateLastUsedAt` を呼ぶ → (8) `{ userId, organizationId, role }` を返す
- [x] SHA-256 ハッシュの算出は `crypto.createHash("sha256").update(plainToken).digest("hex")` を使用する
- [x] いずれの検査でも失敗時は `null` を返す（エラー種別を外部に漏らさない）

**Acceptance Criteria**:
- `resolveBearer` が export されている
- Bearer / cfp_ prefix の検査がある
- SHA-256 ハッシュで DB 照合する
- revokedAt / expiresAt / deactivatedAt の検査がある
- 認証成功時に lastUsedAt を更新する
- 全失敗ケースで `null` を返す
- `bun run typecheck` が通る

---

## T-06: createApiToken ユースケースの実装

- [x] `src/application/usecases/createApiToken.ts` を新規作成する
- [x] 引数: `{ userId, organizationId, name, expiresAt? }`。name の空文字検証を行う
- [x] トークン生成: `crypto.randomBytes(32)` → base64url エンコード → `cfp_` prefix 付与
- [x] tokenPrefix: 平文の先頭 8 文字（`cfp_` + 4 文字）
- [x] tokenHash: `crypto.createHash("sha256").update(plainToken).digest("hex")`
- [x] `db.transaction` 内で `apiTokenRepository.create` + `recordAudit({ action: "api_token.create", targetType: "api_token", targetId: newToken.id, actorId: userId, organizationId }, tx)` を実行する
- [x] 戻り値: `{ ok: true; token: ApiToken; plainToken: string }` — plainToken はこの時だけ返す
- [x] `src/application/usecases/index.ts` に re-export する

**Acceptance Criteria**:
- `cfp_` + base64url の平文トークンが生成される
- SHA-256 ハッシュのみが DB に保存される
- トランザクション内で監査ログが記録される
- 戻り値に plainToken が含まれる
- index.ts に re-export がある
- `bun run typecheck` が通る

---

## T-07: revokeApiToken ユースケースの実装

- [x] `src/application/usecases/revokeApiToken.ts` を新規作成する
- [x] 引数: `{ tokenId, userId, organizationId }`
- [x] `db.transaction` 内で `apiTokenRepository.revokeById(tokenId, userId, organizationId, tx)` を実行する。戻り値が null の場合は `{ ok: false, reason: "トークンが見つからないか、既に失効済みです" }` を返す
- [x] 同トランザクション内で `recordAudit({ action: "api_token.revoke", targetType: "api_token", targetId: tokenId, actorId: userId, organizationId }, tx)` を記録する
- [x] 戻り値: `{ ok: true } | { ok: false; reason: string }`
- [x] `src/application/usecases/index.ts` に re-export する

**Acceptance Criteria**:
- revokeById に userId と organizationId が渡される（本人のみ操作可能）
- トランザクション内で失効 + 監査ログが記録される
- 存在しないトークン / 他人のトークン / 失効済みトークンは拒否される
- index.ts に re-export がある
- `bun run typecheck` が通る

---

## T-08: listApiTokens ユースケースの実装

- [x] `src/application/usecases/listApiTokens.ts` を新規作成する
- [x] 引数: `{ userId, organizationId }`
- [x] `apiTokenRepository.findByUserAndOrganization(userId, organizationId)` を呼び出し、`ApiToken[]` を返す
- [x] `src/application/usecases/index.ts` に re-export する

**Acceptance Criteria**:
- userId AND organizationId で絞り込んだ結果のみ返す
- index.ts に re-export がある
- `bun run typecheck` が通る

---

## T-09: API トークン管理の Server Actions

- [x] `src/app/actions/apiTokens.ts` を新規作成する。`"use server"` ディレクティブを先頭に記述
- [x] `createApiTokenAction(prevState, formData)`: セッション取得 → zod バリデーション（name: 必須 1 文字以上100 文字以下） → `createApiToken({ userId: session.user.id, organizationId: session.user.organizationId, name })` → 成功時に `{ success: true, plainToken }` を返す（UI で一度だけ表示するため）
- [x] `revokeApiTokenAction(prevState, formData)`: セッション取得 → tokenId（UUID）の検証 → `revokeApiToken({ tokenId, userId: session.user.id, organizationId: session.user.organizationId })` → `revalidatePath("/account")`
- [x] `listApiTokensAction()`: セッション取得 → `listApiTokens({ userId: session.user.id, organizationId: session.user.organizationId })` → `ApiToken[]` を返す

**Acceptance Criteria**:
- 3 アクションが export されている
- 全アクションでセッション認証を行っている
- userId と organizationId はセッションから取得している（引数やフォームデータから受け取らない）
- createApiTokenAction に zod バリデーションがある
- createApiTokenAction の戻り値に plainToken が含まれる
- `bun run typecheck` が通る

---

## T-10: アカウント設定 UI — トークン一覧・発行・失効

- [x] `src/app/(dashboard)/account/page.tsx` を更新する。`listApiTokensAction` でトークン一覧を取得し、新しいトークン管理セクション（SectionCard）を ProfileForm / PasswordForm の下に追加する
- [x] `src/app/(dashboard)/account/ApiTokenSection.tsx` を新規作成する（Client Component: `"use client"`）
- [x] トークン一覧テーブル: 列は「名前」「トークン」（tokenPrefix + `...`）「最終使用」（lastUsedAt の相対時間 or 「未使用」）「作成日」「操作」（失効ボタン）。失効済みトークンは視覚的に区別する（取り消し線やグレーアウト等）
- [x] 発行フォーム: 名前テキストフィールド + 「発行」ボタン。`createApiTokenAction` を `useActionState` で呼び出す
- [x] 発行成功時: 平文トークンをモーダルまたはアラート内にコピー可能な形式で一度だけ表示する。「この画面を閉じると二度と表示できません」の注意書きを添える
- [x] 失効ボタン: `revokeApiTokenAction` を呼び出す form submit で実装する。失効済みトークンの行では非表示にする

**Acceptance Criteria**:
- `/account` にトークン管理セクションが表示される
- トークン一覧に name / prefix / lastUsedAt / createdAt が表示される
- 発行成功時に平文トークンが一度だけ表示される
- 失効ボタンで revokeApiTokenAction が呼ばれる
- 失効済みトークンが視覚的に区別される
- `bun run build` が通る

---

## T-11: 設計 delta — ent-api-token を design/domain/model.md に追加

- [x] `design/domain/model.md` の末尾（ドメインイベントの後）に以下を追加する:

```
## API トークン {#ent-api-token}
本人が発行する外部クライアント認証の資格情報。[[ent-organization]] と発行者（ユーザー）を必須参照し、用途表示名・失効日時・有効期限を持つ。平文は SHA-256 ハッシュとして保存され、発行時のみ返却される。先頭 8 文字（tokenPrefix）を一覧表示用に保持する。発行・失効は監査ログに記録される。
```

- [x] `aozu check` が exit 0 であることを確認する

**Acceptance Criteria**:
- `design/domain/model.md` に `{#ent-api-token}` セクションが追加されている
- `aozu check` exit 0

---

## T-12: テスト — Bearer 解決の正常系・異常系

- [x] `src/__tests__/infrastructure/apiTokenResolver.test.ts` を新規作成する
- [x] テスト: `resolveBearer` のソースに `Bearer ` prefix チェックが含まれることを静的解析で確認する
- [x] テスト: `resolveBearer` のソースに `cfp_` prefix チェックが含まれることを静的解析で確認する
- [x] テスト: `resolveBearer` のソースに `createHash("sha256")` または `createHash('sha256')` が含まれることを静的解析で確認する
- [x] テスト: `resolveBearer` のソースに `revokedAt` と `expiresAt` の検査が含まれることを静的解析で確認する
- [x] テスト: `resolveBearer` のソースに `deactivatedAt` の検査が含まれることを静的解析で確認する
- [x] テスト: `resolveBearer` のソースに `updateLastUsedAt` の呼び出しが含まれることを静的解析で確認する

**Acceptance Criteria**:
- Bearer 解決の全検査ステップがソースに含まれていることがテストで検証される
- `bun test` が全件 green

---

## T-13: テスト — トークン発行・失効の監査ログ記録

- [x] `src/__tests__/usecases/apiTokenManagement.test.ts` を新規作成する
- [x] テスト: `createApiToken` のソースに `recordAudit` と `api_token.create` が含まれることを静的解析で確認する
- [x] テスト: `createApiToken` のソースに `db.transaction` が含まれることを静的解析で確認する
- [x] テスト: `createApiToken` のソースに `cfp_` prefix と `randomBytes` が含まれることを静的解析で確認する
- [x] テスト: `createApiToken` のソースに `createHash` と `sha256` が含まれることを静的解析で確認する
- [x] テスト: `revokeApiToken` のソースに `recordAudit` と `api_token.revoke` が含まれることを静的解析で確認する
- [x] テスト: `revokeApiToken` のソースに `db.transaction` が含まれることを静的解析で確認する

**Acceptance Criteria**:
- トークン発行・失効の監査ログ記録がテストで検証される
- トランザクション使用がテストで検証される
- トークン形式（cfp_ / randomBytes / SHA-256）がテストで検証される
- `bun test` が全件 green

---

## T-14: テスト — 本人操作の制約とテナント分離

- [x] `src/__tests__/usecases/apiTokenOwnership.test.ts` を新規作成する
- [x] テスト: `apiTokenRepository.ts` の `revokeById` のソースに `userId` と `organizationId` の WHERE 条件が含まれることを静的解析で確認する
- [x] テスト: `apiTokenRepository.ts` の `findByUserAndOrganization` のソースに `userId` と `organizationId` の WHERE 条件が含まれることを静的解析で確認する
- [x] テスト: `src/app/actions/apiTokens.ts` のソースが `session.user.id` と `session.user.organizationId` を使用していることを静的解析で確認する
- [x] テスト: `src/app/actions/apiTokens.ts` のソースが `formData` や引数から `userId` / `organizationId` を取得していないことを静的解析で確認する

**Acceptance Criteria**:
- repository の本人+テナント制約がテストで検証される
- Server Action がセッションから userId / organizationId を取得していることがテストで検証される
- `bun test` が全件 green

---

## T-15: テスト — 既存テストの green 維持と静的構造検証

- [x] `src/__tests__/static/projectStructure.test.ts` にテストを追加する: `apiTokenRepository.ts` が存在すること、`infrastructure/repositories/index.ts` に `apiTokenRepository` の re-export があることを確認する
- [x] `src/__tests__/static/projectStructure.test.ts` にテストを追加する: `apiTokenResolver.ts` が `src/infrastructure/` に存在することを確認する
- [x] `bun test` で全テスト（既存 + 新規）が green であることを確認する

**Acceptance Criteria**:
- apiTokenRepository と apiTokenResolver の存在がテストで検証される
- 既存テストが変更なしで green
- `bun test` 全件 green

---

## T-16: 最終確認 — ビルド・型チェック・テスト・aozu

- [x] `bun run typecheck` を実行し、型チェックが通ることを確認する
- [x] `bun test` を実行し、全テストが green であることを確認する
- [x] `bun run build` を実行し、ビルドが成功することを確認する
- [x] `bun run lint` を実行し、lint エラーがないことを確認する
- [x] `aozu check` を実行し、exit 0 であることを確認する（ent-api-token 追加を含む）

**Acceptance Criteria**:
- `bun run typecheck` green
- `bun test` 全件 green
- `bun run build` 成功
- `bun run lint` エラーなし
- `aozu check` exit 0
