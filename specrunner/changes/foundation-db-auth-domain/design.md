# Design: DB基盤・認証・基本ドメインモデルの導入

## Context

Clearflow は create-next-app (Next.js 16) の初期状態にレイヤードアーキテクチャのディレクトリスケルトン（`.gitkeep` のみ）を配置した段階にある。DB 接続、認証、ドメインモデル、ビジネスロジックのいずれも未実装である。

現状の確認済み事実:

- `package.json` — Next.js 16.2.9, React 19.2.4, Tailwind CSS 4 のみ。ORM / 認証 / バリデーションライブラリは未導入
- `tsconfig.json:22` — パスエイリアス `@/*` → `./src/*` が設定済み
- `src/domain/models/.gitkeep`, `src/domain/services/.gitkeep`, `src/infrastructure/repositories/.gitkeep`, `src/application/usecases/.gitkeep`, `src/app/actions/.gitkeep` — すべて空ファイル
- `src/app/layout.tsx` — RootLayout + metadata のみ定義。Geist フォント設定済み
- `src/app/page.tsx` — create-next-app のデフォルトランディングページ
- Next.js 16 では `middleware.ts` が `proxy.ts` にリネームされている（`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` で確認）。exported function 名も `proxy` に変更

本変更で PostgreSQL + Drizzle ORM によるデータ層、Auth.js v5 Credentials provider による認証、組織・ユーザー・申請の基本ドメインモデル、最小限の CRUD UI を一括導入する。

## Goals / Non-Goals

**Goals**:

- PostgreSQL 接続基盤（Drizzle ORM + postgres.js ドライバ）を確立する
- Auth.js v5 Credentials provider でメール/パスワード認証を実装する
- organizations, users, requests, audit_logs の 4 テーブル + Auth.js adapter テーブルを定義する
- domain 層に ORM 非依存の型定義と状態遷移ルールを配置する
- レイヤードアーキテクチャの依存方向（actions → usecases → domain / infrastructure）を実コードで確立する
- ログイン → 申請一覧 → 申請作成 → 承認/却下 の最小 UI フローを接続する
- テナント分離（全クエリに organizationId 条件を付与）を実装する
- シードスクリプトでデモデータを投入可能にする

**Non-Goals**:

- 複数段階承認（単一承認者のみ）
- メール通知・Webhook
- ユーザー登録フロー（シードデータで初期ユーザーを投入）
- API Routes（Server Actions のみ）
- テスト（次の request で導入）
- CI/CD パイプライン
- Docker / コンテナ化

## Decisions

### D1: ORM — Drizzle ORM を採用

**Rationale**: Prisma は独自クエリエンジンプロセスを要し、Bun との相性に制約がある。Drizzle は SQL に近い API で軽量、型推論が強い。

**Alternatives considered**:
- Prisma — クエリエンジンのオーバーヘッドと Bun 環境での互換性リスクにより却下
- Kysely — 型安全だが Drizzle ほどエコシステム（マイグレーション、スキーマ管理）が統合されていない

### D2: DB ドライバ — postgres.js (`postgres` パッケージ) を採用

**Rationale**: Drizzle は `postgres` (postgres.js by Porsager) と `pg` (node-postgres) の両方をサポートする。postgres.js は Bun ネイティブで高速、接続プーリングが組み込まれている。import パスは `drizzle-orm/postgres-js` を使用する。

**Alternatives considered**:
- `pg` (node-postgres) — ネイティブバインディング不要で安定だが、Bun 環境では postgres.js のほうがパフォーマンスに優れる

### D3: 認証 — Auth.js v5 Credentials provider を採用

**Rationale**: デモ用途のため OAuth 不要。Credentials provider でメール/パスワード認証を最小構成で実装する。Auth.js v5 は `auth()` 関数で Server Component / Server Action の両方からセッション取得可能。

**Alternatives considered**:
- Lucia — 軽量だが公式メンテナンス終了のリスク
- 自作 JWT — セッション管理・CSRF 対策のボイラープレートが増大

### D4: Auth.js 設定ファイルの配置

Auth.js の設定は `src/infrastructure/auth.ts` に配置する。auth 関連のルートハンドラは `src/app/api/auth/[...nextauth]/route.ts` に配置し、`src/infrastructure/auth.ts` から `handlers` を re-export する。

**Rationale**: Auth.js の設定は DB アダプターや Drizzle スキーマに依存するため infrastructure 層に属する。Server Actions や usecase からは `auth()` 関数を import して使用する。

### D5: パスワードハッシュ — bcryptjs を採用

**Rationale**: argon2 はネイティブバインディングを要し、プラットフォーム間で互換性問題が発生しやすい。bcryptjs は純 JS 実装で依存が軽い。デモ用途では十分なセキュリティ。

**Alternatives considered**:
- argon2 — セキュリティ面では優位だがネイティブバインディング依存で Bun/Node バージョン間の互換性リスクあり

### D6: スキーマ定義を infrastructure 層に配置

Drizzle スキーマ（`pgTable`, `pgEnum` 等）は `src/infrastructure/schema.ts` に定義する。domain/models にはプレーンな TypeScript 型定義と状態遷移ルールのみを配置する。

**Rationale**: Drizzle のスキーマは ORM 固有の API に依存するため、domain 層の純粋性を保つためには infrastructure 層に配置するのが適切。domain 型は `$inferSelect` 等で Drizzle 型から導出しない — ORM 非依存の独立型定義とする。

### D7: audit_logs を独立テーブルとして設計

append-only の独立テーブルで監査ログを記録する。usecase 層で状態変更時に監査ログを同一トランザクション内で挿入する。

**Rationale**: イベントソーシングは過剰。独立テーブルで将来の要件拡張に備える。

### D8: 状態遷移ルールを domain 層で管理

申請の状態遷移（`draft → pending → approved | rejected`）のバリデーションは `src/domain/services/requestTransition.ts` に配置する。遷移マップを定義し、不正な遷移を拒否する純粋関数として実装する。

**Rationale**: DB 制約やアプリケーション層ではなく domain 層に集約することで、テスト容易性と可読性を確保する。

### D9: Next.js 16 の Proxy（旧 Middleware）を使用した認証ガード

認証済みルートの保護に `src/proxy.ts` を使用する。Next.js 16 では `middleware.ts` が `proxy.ts` にリネームされており、exported function 名も `proxy` となる。

**Rationale**: Auth.js v5 は proxy/middleware 統合を公式サポートしている。ただし Next.js 16 のリネームに対応する必要がある。proxy ではセッション存在の楽観的チェックのみ行い、実際の認可は Server Action 内で行う。

### D10: UI ルーティング構造

App Router のルートグループを使用して認証フローを分離する:

```
src/app/
  (auth)/login/page.tsx         — ログイン画面
  (dashboard)/
    layout.tsx                  — 認証済みレイアウト（セッションチェック）
    requests/page.tsx           — 申請一覧
    requests/new/page.tsx       — 申請作成
    requests/[id]/page.tsx      — 申請詳細（承認/却下ボタン）
  api/auth/[...nextauth]/route.ts — Auth.js ルートハンドラ
  layout.tsx                    — ルートレイアウト
  page.tsx                      — トップページ → ダッシュボードへリダイレクト
```

**Rationale**: ルートグループで認証有無によるレイアウト分離が可能。`(dashboard)/layout.tsx` でセッション存在を確認し、未認証時はログインへリダイレクトする。

### D11: テナント分離の実装方式

リポジトリ層の各メソッドで organizationId を引数として受け取り、WHERE 条件に付与する。usecase 層でセッションから organizationId を取得してリポジトリに渡す。

**Rationale**: Row Level Security (RLS) は PostgreSQL 固有機能で設定が複雑。アプリケーション層での分離は可読性が高く、テスト容易。

## Risks / Trade-offs

[Risk] Auth.js v5 と Next.js 16 proxy の互換性 → Auth.js の `auth` export が middleware 前提の場合、proxy へのアダプテーションが必要になる可能性がある。proxy では `NextRequest` のクッキーベースでセッショントークンを確認し、詳細な認可は Server Action 内で `auth()` を呼ぶ構成で回避する。

[Risk] bcryptjs のパフォーマンス → 純 JS 実装のため argon2 比で低速だが、デモ用途では問題にならない。将来 OAuth 導入でパスワード認証自体が不要になる想定。

[Risk] `postgres` パッケージ名と `pg` (node-postgres) の混同 → 要件記述に「postgres (postgres.js)」と明記済み。implementer は `drizzle-orm/postgres-js` の import パスを使用すること。

[Risk] Drizzle adapter for Auth.js の成熟度 → `@auth/drizzle-adapter` は公式パッケージだが、Auth.js v5 beta 期のスキーマ変更に追従できていない可能性がある。adapter が要求するテーブル構造は公式ドキュメントに従い定義する。

## Open Questions

なし（request-review で指摘事項はすべて解消済み）
