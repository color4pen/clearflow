# DB基盤・認証・基本ドメインモデルの導入

## Meta

- **type**: new-feature
- **slug**: foundation-db-auth-domain
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: 新しい port/adapter 追加、既存パターンと異なる設計選択、振る舞い/契約を変える修正、構造的リファクタリング → true。いずれにも該当しない → false -->

## 背景

Clearflow はマルチテナント対応の承認ワークフロー SaaS。現在は create-next-app の初期状態にレイヤードアーキテクチャのディレクトリ構造（actions / usecases / domain / infrastructure）を置いただけの状態で、DB・認証・ドメインモデルが存在しない。

本 request でアプリケーションの土台を一括で導入する。具体的には PostgreSQL + Drizzle ORM によるデータ層、Auth.js v5 による認証、および組織・ユーザー・申請の基本ドメインモデルを構築し、最小限の CRUD UI を接続する。

## 現状コードの前提

<!-- 現状のコードについての断定（「今のコードはこうなっている」）は file:line を伴ってこの節に書く。
     これらは未検証の前提として扱われ、design / request-review が実コードと突き合わせる。
     意図・方針・将来の構想はこの節の対象外。
     コツ: 書く直前に grep で再検証する。記憶や過去メモの前提は merge で腐っていることがある。 -->

- `src/app/layout.tsx:1` — Next.js 16 App Router。metadata と RootLayout のみ定義
- `src/app/page.tsx` — create-next-app のデフォルトページ
- `src/domain/models/.gitkeep` — 空。ドメインモデルは未定義
- `src/infrastructure/repositories/.gitkeep` — 空。DB 接続・リポジトリは未定義
- `package.json:1` — Drizzle, Auth.js, PostgreSQL ドライバは未導入
- `tsconfig.json:22` — パスエイリアス `@/*` → `./src/*` が設定済み

## 要件

<!-- コツ: 実装の最重量部（既存機構の一般化・暗黙の前提の変更）は行間に隠さず要件として名指しする。
     粒度: 1 request = 1 つのレビュー収束ループで直しきれる範囲。超えるなら「土台（挙動不変の機構導入）→ 上物（その利用）」に分割する。
     詳細: docs/request-authoring.md -->

1. **PostgreSQL + Drizzle ORM の導入**: `drizzle-orm`, `drizzle-kit`, `postgres`（node-postgres）, `zod`, `@auth/drizzle-adapter`, `bcryptjs`（+ `@types/bcryptjs`）をインストールし、DB 接続ユーティリティを `src/infrastructure/db.ts` に配置する。Drizzle の設定ファイル（`drizzle.config.ts`）をプロジェクトルートに置く。環境変数 `DATABASE_URL`, `AUTH_SECRET` で接続先・認証シークレットを指定する
2. **スキーマ定義**: 以下のテーブルを Drizzle schema として `src/infrastructure/schema.ts` に定義する
   - `organizations` — id, name, createdAt
   - `users` — id, email, hashedPassword, name, organizationId (FK), role (enum: admin | member), createdAt
   - `requests` — id, title, description, status (enum: draft | pending | approved | rejected), organizationId (FK), creatorId (FK to users), createdAt, updatedAt
   - `audit_logs` — id, action, targetType, targetId, actorId (FK to users), organizationId (FK), metadata (jsonb), createdAt
   - Auth.js v5 Drizzle adapter が必要とする `accounts`, `sessions`, `verification_tokens` テーブルは `@auth/drizzle-adapter` の公式スキーマに従って追加する
3. **Auth.js v5 の導入**: `next-auth@5` をインストールし、Credentials provider で email/password 認証を実装する。セッションにユーザーの organizationId と role を含める。Drizzle adapter を使用してセッション・アカウントを DB 管理する
4. **ドメインモデル**: `src/domain/models/` に型定義と状態遷移ルールを配置する。申請の状態遷移は `draft → pending → approved | rejected` のみ許可する
5. **ドメインサービス**: `src/domain/services/` に申請の状態遷移バリデーションを配置する
6. **ユースケース**: `src/application/usecases/` に「申請作成」「申請一覧取得」「申請承認」「申請却下」の 4 ユースケースを実装する
7. **リポジトリ**: `src/infrastructure/repositories/` に requests, users, organizations, auditLogs の各リポジトリを実装する
8. **Server Actions**: `src/app/actions/` に上記ユースケースを呼び出す Server Actions を配置する。入力は zod でバリデーションする
9. **最小 UI**: ログイン画面、申請一覧画面、申請作成フォーム、申請詳細画面（承認/却下ボタン付き）を実装する
10. **シード**: `src/infrastructure/seed.ts` にテスト用の組織・ユーザー・申請データを投入するスクリプトを用意する
11. **テナント分離**: すべてのクエリに organizationId 条件を付与し、他組織のデータにアクセスできないようにする

## スコープ外

- 複数段階承認（単一承認者のみ）
- メール通知・Webhook
- ユーザー登録フロー（シードデータで初期ユーザーを投入）
- API Routes（Server Actions のみ）
- テスト（次の request で導入）
- CI/CD パイプライン
- Docker / コンテナ化

## 受け入れ基準

<!-- コツ: 機械検証できる文にする（「〜をテストで固定する」「既存テスト無変更で green」）。
     「適切に動作する」のような判定不能な文は conformance が照合できない。 -->

- [ ] `bun run build` が成功する
- [ ] Drizzle schema から migration を生成できる（`bunx drizzle-kit generate`）
- [ ] シードスクリプト実行後、ログイン → 申請一覧 → 申請作成 → 承認/却下 の一連の操作が可能
- [ ] 申請の状態遷移が `draft → pending → approved | rejected` のルールに従い、不正な遷移を拒否する
- [ ] audit_logs テーブルに状態変更が記録される
- [ ] Server Actions に zod バリデーションが適用されている
- [ ] 依存方向が `actions → usecases → domain / infrastructure` を遵守している（domain から infrastructure への import がない）
- [ ] `.env.example` に `DATABASE_URL`, `AUTH_SECRET` が記載されている
- [ ] `bun run lint` がエラーなし
- [ ] `typecheck && test` が green（テストは未導入のため typecheck のみ）
- [ ] 状態遷移バリデーションのテストは次 request（テスト導入）で追加予定。本 request では domain service の関数シグネチャと遷移ルールの型定義が存在することを typecheck で確認する

## architect 評価済みの設計判断

<!-- コツ: 採用した判断に加え、却下した代替案とその理由を書く。
     implementer の再発明と reviewer の再議論の両方を防ぐ。 -->

1. **ORM: Drizzle を採用、Prisma を却下** — Prisma は独自のクエリエンジンプロセスを要し、Bun との相性に制約がある。Drizzle は SQL に近い API で軽量、型推論が強い
2. **認証: Auth.js v5 Credentials provider を採用** — デモ用途のため OAuth 不要。Credentials provider で email/password 認証を最小構成で実装する。本番環境では OAuth provider を追加可能
3. **スキーマ定義を infrastructure 層に配置** — Drizzle のスキーマは ORM 固有の API（pgTable 等）に依存するため、domain/models ではなく infrastructure/schema.ts に置く。domain/models には ORM 非依存の型定義・ビジネスルールのみ配置
4. **audit_logs を独立テーブルとして設計** — イベントソーシングは過剰。append-only の独立テーブルで監査ログを記録し、将来の要件拡張に備える
5. **状態遷移ルールを domain 層で管理** — 状態遷移の妥当性検証を DB 制約やアプリケーション層ではなく、domain/services に集約する。テスト容易性と可読性を優先
6. **パスワードハッシュ: bcryptjs を採用、argon2 を却下** — argon2 はネイティブバインディングを要し、Bun/Node バージョンやプラットフォーム間で互換性問題が発生しやすい。bcryptjs は純 JS 実装で依存が軽い。デモ用途では十分なセキュリティ
