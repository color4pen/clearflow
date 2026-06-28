# Clearflow

受託開発企業向けの案件管理 SaaS。引合の受付から案件化・契約・請求・売上管理までの営業プロセスと、業務に横断的に挟まる承認ワークフローを管理する。マルチテナント対応。

SpecRunner による AI 駆動開発のショーケースプロジェクト。

## 技術スタック

- **ランタイム**: Bun
- **フレームワーク**: Next.js 16 (App Router / RSC / Server Actions)
- **言語**: TypeScript (strict)
- **CSS**: Tailwind CSS 4
- **ORM**: Drizzle ORM
- **DB**: PostgreSQL
- **認証**: Auth.js v5

## アーキテクチャ

レイヤードアーキテクチャ。依存方向は上から下への一方向。

```
src/
  app/actions/                 — Server Actions: 入力検証・認証・エラー変換・ユースケース呼び出し
  app/(dashboard)/             — ダッシュボード配下の画面（UI）
  application/usecases/         — オーケストレーション（repository と domain の協調、トランザクション境界）。1 ユースケース 1 関数
  application/services/         — 複数ユースケースで共有するアプリケーションサービス（監査記録・検証など）
  domain/models/               — 型定義・状態遷移ルール・値オブジェクト（副作用なし）
  domain/services/             — 複数 model にまたがる純粋なビジネスルール
  infrastructure/repositories/ — Drizzle 経由の DB 操作
```

- すべてのテーブル・リポジトリ操作は `organizationId` でテナント分離する。
- ドメイン層は永続化を知らない（repository を呼ばない）。usecase が domain と infrastructure を協調させる。

## セットアップ

前提: [Bun](https://bun.sh) と Docker（PostgreSQL 用）。

1. 依存をインストール
   ```bash
   bun install
   ```
2. 環境変数を用意（`.env.example` をコピー）
   ```bash
   cp .env.example .env.local
   ```
   `AUTH_SECRET` を生成して設定する。その他の変数は `.env.example` のコメントを参照。
   ```bash
   bunx auth secret
   ```
3. PostgreSQL を起動
   ```bash
   docker compose up -d
   ```
4. スキーマを適用
   ```bash
   bun run db:migrate
   ```
5. 開発用の初期データを投入（任意。**既存データを削除して再投入する**ため開発環境のみで使う）
   ```bash
   bun run db:seed
   ```
6. 開発サーバーを起動して http://localhost:3000 を開く
   ```bash
   bun dev
   ```

シード投入後は次のアカウントでログインできる（パスワードはいずれも `password123`）。

| メール | ロール |
|---|---|
| admin@example.com | admin |
| manager@example.com | manager |
| member@example.com | member |
| finance@example.com | finance |

## コマンド

```bash
bun dev             # 開発サーバー起動
bun run build       # プロダクションビルド
bun run lint        # ESLint
bun run typecheck   # 型チェック (tsc --noEmit)
bun test            # テスト

bun run db:generate # スキーマからマイグレーション生成
bun run db:migrate  # マイグレーション適用
bun run db:seed     # 初期データ投入（既存データを削除して再投入）
```

## ドキュメント

- `docs/design/` — ドメイン設計・データモデル・承認/認可設計・UX ジャーニー・ユビキタス言語辞書・画面仕様（`screens/`）
- `docs/usecases/` — ユーザーゴール単位のユースケース
- `specrunner/adr/` — アーキテクチャ決定記録（ADR）
