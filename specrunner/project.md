# Clearflow

マルチテナント対応の承認ワークフローSaaS。SpecRunner によるAI駆動開発のショーケースプロジェクト。

## Tech Stack

- **Runtime**: Bun
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict)
- **CSS**: Tailwind CSS 4
- **ORM**: Drizzle ORM
- **DB**: PostgreSQL
- **Auth**: Auth.js v5

## Architecture

レイヤードアーキテクチャ。依存方向は上から下への一方向。

```
src/
  app/actions/           — Server Actions: validation, auth, error変換, usecase呼び出し
  app/(routes)/          — Pages (UI のみ)
  application/usecases/  — オーケストレーション: repository + domain service の協調, トランザクション境界
  application/services/  — 複数ユースケースで共有するアプリケーションサービス（監査記録・検証など）
  domain/models/         — 型定義, 状態遷移ルール, 値オブジェクト
  domain/services/       — 複数 model にまたがる純粋なビジネスルール
  infrastructure/repositories/ — Drizzle 経由の DB 操作
```

依存関係: `actions → usecases → domain (services + models) / repositories (infrastructure)`

- domain layer は repository を呼び出さない（永続化を知らない）
- usecase が domain と infrastructure の両方を協調させる

## Commands

```bash
bun dev             # 開発サーバー起動
bun run build       # プロダクションビルド
bun run lint        # ESLint 実行
bun run typecheck   # 型チェック (tsc --noEmit)
bun test            # テスト実行
bun run db:migrate  # マイグレーション適用
bun run db:generate # スキーマからマイグレーション生成
```

## Conventions

- Server Actions を入り口レイヤーとして使う（validation, auth check, error handling を担当）
- 1 usecase = 1 関数
- domain layer は副作用を持たない
