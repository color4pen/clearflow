# Tasks: DB基盤・認証・基本ドメインモデルの導入

## T-01: 依存パッケージのインストールと環境設定

- [x] `bun add drizzle-orm postgres zod next-auth@5 @auth/drizzle-adapter bcryptjs` を実行
- [x] `bun add -d drizzle-kit @types/bcryptjs` を実行
- [x] プロジェクトルートに `.env.example` を作成し `DATABASE_URL=postgres://user:password@localhost:5432/clearflow` と `AUTH_SECRET=your-secret-here` を記載
- [x] プロジェクトルートに `drizzle.config.ts` を作成: `defineConfig` で `schema: "./src/infrastructure/schema.ts"`, `out: "./drizzle"`, `dialect: "postgresql"`, `dbCredentials: { url: process.env.DATABASE_URL! }` を設定
- [x] `package.json` の `scripts` に `"db:generate": "drizzle-kit generate"`, `"db:migrate": "drizzle-kit migrate"`, `"db:seed": "bun run src/infrastructure/seed.ts"` を追加

**Acceptance Criteria**:
- `bun install` が成功する
- `.env.example` に `DATABASE_URL` と `AUTH_SECRET` が記載されている
- `drizzle.config.ts` が存在し TypeScript として型チェックが通る

## T-02: Drizzle スキーマ定義

- [x] `src/infrastructure/schema.ts` に以下のテーブルを定義:
  - `roleEnum` — pgEnum で `admin`, `member` を定義
  - `requestStatusEnum` — pgEnum で `draft`, `pending`, `approved`, `rejected` を定義
  - `organizations` テーブル — `id` (uuid, primaryKey, defaultRandom), `name` (text, notNull), `createdAt` (timestamp, defaultNow)
  - `users` テーブル — `id` (uuid, primaryKey, defaultRandom), `email` (text, notNull, unique), `hashedPassword` (text, notNull), `name` (text, notNull), `organizationId` (uuid, FK → organizations, notNull), `role` (roleEnum, notNull, default 'member'), `createdAt` (timestamp, defaultNow)
  - `requests` テーブル — `id` (uuid, primaryKey, defaultRandom), `title` (text, notNull), `description` (text), `status` (requestStatusEnum, notNull, default 'draft'), `organizationId` (uuid, FK → organizations, notNull), `creatorId` (uuid, FK → users, notNull), `createdAt` (timestamp, defaultNow), `updatedAt` (timestamp, defaultNow, onUpdateNow 相当)
  - `auditLogs` テーブル — `id` (uuid, primaryKey, defaultRandom), `action` (text, notNull), `targetType` (text, notNull), `targetId` (text, notNull), `actorId` (uuid, FK → users, notNull), `organizationId` (uuid, FK → organizations, notNull), `metadata` (jsonb), `createdAt` (timestamp, defaultNow)
- [x] Auth.js v5 Drizzle adapter が必要とするテーブル (`accounts`, `sessions`, `verificationTokens`) を `@auth/drizzle-adapter` の公式スキーマに従って追加。ただし `users` テーブルは上記のカスタム定義を使用し、adapter のデフォルト users テーブルは使わない
- [x] Drizzle の relations 定義を追加（organizations ↔ users, organizations ↔ requests, users ↔ requests, users ↔ auditLogs）

**Acceptance Criteria**:
- `bunx drizzle-kit generate` でマイグレーションファイルが生成される
- テーブル定義に外部キー制約が正しく設定されている
- `bun run build` が成功する（スキーマファイル単体で型エラーがない）

## T-03: DB 接続ユーティリティ

- [x] `src/infrastructure/db.ts` を作成:
  - `postgres` パッケージ（postgres.js）で `DATABASE_URL` に接続する client を生成
  - `drizzle-orm/postgres-js` の `drizzle()` で Drizzle インスタンスを生成し export
  - スキーマを `schema` オプションに渡してリレーショナルクエリを有効化

**Acceptance Criteria**:
- `db` インスタンスが型付きで export されている
- import パスが `drizzle-orm/postgres-js` であること（`drizzle-orm/node-postgres` ではない）

## T-04: ドメインモデル型定義

- [x] `src/domain/models/organization.ts` — `Organization` 型（id, name, createdAt）を定義
- [x] `src/domain/models/user.ts` — `User` 型（id, email, name, organizationId, role, createdAt）を定義。`Role` union 型 (`"admin" | "member"`) を export
- [x] `src/domain/models/request.ts` — `Request` 型（id, title, description, status, organizationId, creatorId, createdAt, updatedAt）を定義。`RequestStatus` union 型 (`"draft" | "pending" | "approved" | "rejected"`) を export
- [x] `src/domain/models/auditLog.ts` — `AuditLog` 型（id, action, targetType, targetId, actorId, organizationId, metadata, createdAt）を定義
- [x] `src/domain/models/index.ts` — 各モデルを re-export するバレルファイルを作成
- [x] すべての型定義が ORM 非依存（Drizzle の型や import を含まない）であることを確認

**Acceptance Criteria**:
- `src/domain/models/` 配下に ORM への依存がない
- 全型定義が TypeScript の型チェックを通る
- `RequestStatus` 型が `"draft" | "pending" | "approved" | "rejected"` の union 型である

## T-05: ドメインサービス — 状態遷移バリデーション

- [x] `src/domain/services/requestTransition.ts` を作成:
  - `VALID_TRANSITIONS` マップを定義: `{ draft: ["pending"], pending: ["approved", "rejected"] }` — approved と rejected は終端状態（遷移先なし）
  - `validateTransition(currentStatus: RequestStatus, nextStatus: RequestStatus): { ok: true } | { ok: false; reason: string }` 関数を export
  - 遷移が許可されていない場合は `{ ok: false, reason: "..." }` を返す
- [x] `src/domain/services/index.ts` — バレルファイルを作成

**Acceptance Criteria**:
- `validateTransition("draft", "pending")` が `{ ok: true }` を返す
- `validateTransition("draft", "approved")` が `{ ok: false, reason: "..." }` を返す
- `validateTransition("approved", "pending")` が `{ ok: false, reason: "..." }` を返す
- domain/services に infrastructure 層への import がない

## T-06: リポジトリ実装

- [x] `src/infrastructure/repositories/organizationRepository.ts` — `findById(id, organizationId)` を実装
- [x] `src/infrastructure/repositories/userRepository.ts` — `findByEmail(email)`, `findById(id, organizationId)` を実装。`findByEmail` はログイン認証用のため organizationId フィルタなし（email はグローバル一意）
- [x] `src/infrastructure/repositories/requestRepository.ts` — `create(data)`, `findById(id, organizationId)`, `findAllByOrganization(organizationId)`, `updateStatus(id, organizationId, status, updatedAt)` を実装。すべてのクエリ（`findByEmail` 以外）に `organizationId` 条件を付与
- [x] `src/infrastructure/repositories/auditLogRepository.ts` — `create(data)` を実装
- [x] `src/infrastructure/repositories/index.ts` — バレルファイルを作成

**Acceptance Criteria**:
- `findById`, `findAllByOrganization`, `updateStatus` のクエリに `organizationId` の WHERE 条件がある
- リポジトリが Drizzle の `db` インスタンスを使用して型安全なクエリを実行する
- `create` メソッドが挿入後のレコードを返す

## T-07: Auth.js v5 設定と認証

- [x] `src/infrastructure/auth.ts` を作成:
  - `NextAuth()` を呼び出して `auth`, `signIn`, `signOut`, `handlers` を export
  - Drizzle adapter (`@auth/drizzle-adapter`) を設定
  - Credentials provider を設定: email/password を受け取り、`userRepository.findByEmail` でユーザーを取得し、`bcryptjs.compare` でパスワードを検証
  - `callbacks.jwt` でトークンに `userId`, `organizationId`, `role` を含める
  - `callbacks.session` でセッションに `userId`, `organizationId`, `role` を含める
  - `session: { strategy: "jwt" }` を設定（Credentials provider は JWT strategy 必須）
  - `pages: { signIn: "/login" }` でカスタムログインページを指定
- [x] `src/app/api/auth/[...nextauth]/route.ts` を作成: `src/infrastructure/auth.ts` から `handlers` を import し `GET`, `POST` として export
- [x] `src/proxy.ts` を作成（Next.js 16 の proxy — 旧 middleware）:
  - `auth` を使用してセッション存在を確認
  - 未認証時に `/login` へリダイレクト
  - `/login`, `/api/auth` パスは除外
  - export する関数名は `proxy`（Next.js 16 の規約）。ただし Auth.js の `auth` が middleware 関数を返す場合は `export { auth as proxy }` 形式を検討。互換性問題がある場合は手動で NextRequest のクッキーからセッショントークンの存在を確認する方式にフォールバック
  - `config.matcher` で `/((?!api|_next/static|_next/image|favicon.ico|login).*)` を設定

**Acceptance Criteria**:
- `auth()` でセッションを取得できる型定義がある
- セッションに `userId`, `organizationId`, `role` が含まれる型定義がある
- ルートハンドラ (`GET`, `POST`) が export されている
- proxy ファイルが `src/proxy.ts` に配置され、関数名が `proxy` である

## T-08: ユースケース実装

- [x] `src/application/usecases/createRequest.ts` — 認証済みユーザーの organizationId と creatorId を受け取り、title/description で申請を作成する。初期 status は `draft` 固定。audit_log に `request.create` を記録
- [x] `src/application/usecases/listRequests.ts` — organizationId を受け取り、その組織の申請一覧を返す
- [x] `src/application/usecases/approveRequest.ts` — requestId, organizationId, actorId を受け取り、domain service で遷移バリデーション（`pending → approved`）後にステータスを更新。audit_log に `request.approve` を記録。バリデーション失敗時はエラーを返す
- [x] `src/application/usecases/rejectRequest.ts` — requestId, organizationId, actorId を受け取り、domain service で遷移バリデーション（`pending → rejected`）後にステータスを更新。audit_log に `request.reject` を記録
- [x] `src/application/usecases/getRequest.ts` — requestId, organizationId を受け取り、該当申請を返す（テナント分離）
- [x] `src/application/usecases/submitRequest.ts` — requestId, organizationId, actorId を受け取り、domain service で遷移バリデーション（`draft → pending`）後にステータスを更新。audit_log に `request.submit` を記録
- [x] `src/application/usecases/index.ts` — バレルファイルを作成
- [x] usecase が repository と domain service を呼び出す構成（domain は repository を呼ばない）を遵守

**Acceptance Criteria**:
- `createRequest` が status を `draft` で固定して作成する
- `approveRequest` / `rejectRequest` / `submitRequest` が `validateTransition` を呼び出してから状態更新する
- 状態変更を伴うユースケースで audit_log が挿入される
- usecase は domain/services と infrastructure/repositories の両方を import するが、domain は infrastructure を import しない

## T-09: Server Actions

- [x] `src/app/actions/auth.ts` を作成:
  - `loginAction(prevState, formData)` — zod で email/password をバリデーション後、`signIn("credentials", ...)` を呼び出す。`useActionState` 対応の戻り値形式
- [x] `src/app/actions/requests.ts` を作成:
  - `createRequestAction(prevState, formData)` — `auth()` で認証チェック → zod で title/description をバリデーション → `createRequest` usecase を呼び出す
  - `submitRequestAction(requestId)` — `auth()` で認証チェック → `submitRequest` usecase を呼び出す
  - `approveRequestAction(requestId)` — `auth()` で認証チェック → `approveRequest` usecase を呼び出す
  - `rejectRequestAction(requestId)` — `auth()` で認証チェック → `rejectRequest` usecase を呼び出す
  - 各 action に `"use server"` ディレクティブを付与
  - 成功時は `revalidatePath` で関連パスを再検証

**Acceptance Criteria**:
- すべての Server Action に `"use server"` ディレクティブがある
- すべての mutation 系 action で `auth()` による認証チェックが最初に行われる
- zod スキーマでバリデーションされた入力のみ usecase に渡される
- `revalidatePath` が状態変更後に呼び出される

## T-10: UI — ログイン画面

- [x] `src/app/(auth)/login/page.tsx` を作成:
  - メール/パスワード入力フォーム
  - `useActionState` で `loginAction` を呼び出す
  - バリデーションエラー/認証エラーの表示
  - ログイン成功後に `/requests` へリダイレクト
  - Tailwind CSS でスタイリング（最小限の整ったデザイン）

**Acceptance Criteria**:
- `/login` でログインフォームが表示される
- フォーム送信が `loginAction` Server Action を呼び出す
- エラーメッセージが表示可能である

## T-11: UI — ダッシュボードレイアウトと申請一覧

- [x] `src/app/(dashboard)/layout.tsx` を作成:
  - `auth()` でセッション確認。未認証なら `/login` へリダイレクト
  - ヘッダーにユーザー名、組織名、ログアウトボタンを配置
  - Tailwind CSS でスタイリング
- [x] `src/app/(dashboard)/requests/page.tsx` を作成:
  - `auth()` でセッション取得 → `listRequests` usecase で申請一覧取得
  - 各申請の title, status, createdAt を表示するテーブル/リスト
  - 「新規申請」ボタン → `/requests/new` へリンク
  - 各行クリックで `/requests/[id]` へリンク

**Acceptance Criteria**:
- 認証済みユーザーのみがダッシュボードにアクセスできる
- 申請一覧が組織の申請のみ表示する
- 「新規申請」ボタンが存在する

## T-12: UI — 申請作成フォーム

- [x] `src/app/(dashboard)/requests/new/page.tsx` を作成:
  - title (必須), description (任意) の入力フォーム
  - `useActionState` で `createRequestAction` を呼び出す
  - バリデーションエラーの表示
  - 作成成功後に `/requests` へリダイレクト（`redirect` を使用）

**Acceptance Criteria**:
- `/requests/new` で申請作成フォームが表示される
- title 空で送信するとバリデーションエラーが表示される
- 成功時に申請一覧にリダイレクトされる

## T-13: UI — 申請詳細画面（承認/却下）

- [x] `src/app/(dashboard)/requests/[id]/page.tsx` を作成:
  - `auth()` でセッション取得 → `getRequest` usecase で申請詳細取得
  - title, description, status, createdAt を表示
  - status が `draft` の場合: 「提出」ボタン（`submitRequestAction` を呼び出す）
  - status が `pending` の場合: 「承認」「却下」ボタン（それぞれ `approveRequestAction`, `rejectRequestAction` を呼び出す）
  - status が `approved` / `rejected` の場合: ボタン非表示（最終状態）
  - 申請が見つからない場合は `notFound()` を呼び出す

**Acceptance Criteria**:
- `/requests/[id]` で申請詳細が表示される
- status に応じて適切なアクションボタンが表示/非表示される
- 存在しない ID の場合 404 が表示される

## T-14: トップページのリダイレクト

- [x] `src/app/page.tsx` を更新: create-next-app のデフォルトコンテンツを削除し、`/requests` へリダイレクト（`redirect` を使用）する

**Acceptance Criteria**:
- `/` にアクセスすると `/requests` にリダイレクトされる

## T-15: シードスクリプト

- [x] `src/infrastructure/seed.ts` を作成:
  - `bcryptjs` でパスワード (`password123`) をハッシュ化
  - 組織 1 件を作成（例: "Acme Corp"）
  - admin ユーザー 1 件を作成（email: `admin@example.com`, role: `admin`）
  - member ユーザー 1 件を作成（email: `member@example.com`, role: `member`）
  - 申請 2〜3 件を作成（draft / pending / approved の各 status）
  - 既存データを truncate してから挿入（冪等性）
  - `bun run src/infrastructure/seed.ts` で直接実行可能（`db.$client.end()` で接続を閉じる）

**Acceptance Criteria**:
- `bun run db:seed` でシードスクリプトが実行される
- admin@example.com / password123 でログインできるデータが作成される
- 複数 status の申請が作成される

## T-16: .env.example と .gitignore の整備

- [x] `.env.example` が未作成なら T-01 で作成済みのものを確認
- [x] `.gitignore` に `drizzle/` ディレクトリが含まれていないことを確認（マイグレーションファイルは git 管理する）
- [x] `src/app/layout.tsx` の metadata の title を "Clearflow" に更新、description を適切な内容に更新

**Acceptance Criteria**:
- `.env.example` に `DATABASE_URL` と `AUTH_SECRET` が記載されている
- マイグレーションファイルが git 管理対象である

## T-17: ビルド検証と型チェック

- [x] `bun run build` が成功することを確認
- [x] `bun run lint` がエラーなしで通ることを確認
- [x] domain 層から infrastructure 層への import がないことを確認（`src/domain/` 配下のファイルで `@/infrastructure` への import がゼロ）
- [x] Auth.js の型拡張（`next-auth` の `Session`, `JWT` 型に `userId`, `organizationId`, `role` を追加）が正しく機能することを確認

**Acceptance Criteria**:
- `bun run build` が exit code 0 で完了
- `bun run lint` が exit code 0 で完了
- `grep -r "from.*@/infrastructure" src/domain/` の結果が空
