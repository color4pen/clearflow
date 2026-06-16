# ADR-001: DB基盤・認証・基本ドメインモデルの設計判断

- **Status**: accepted
- **Date**: 2026-06-16
- **Change**: foundation-db-auth-domain
- **Deciders**: architect

---

## Context

Clearflow はマルチテナント対応の承認ワークフロー SaaS。本変更時点では create-next-app の初期状態にレイヤードアーキテクチャのディレクトリスケルトン（`.gitkeep` のみ）が置かれた段階で、DB 接続・認証・ドメインモデルのいずれも未実装だった。

本変更でアプリケーションの全土台（PostgreSQL 接続基盤、Auth.js v5 認証、組織・ユーザー・申請の基本ドメインモデル、最小限の CRUD UI）を一括導入した。ここで行った設計選択は以後の全変更に波及するため ADR として記録する。

---

## Decisions

### D1: ORM — Drizzle ORM を採用（Prisma を却下）

**Decision**: `drizzle-orm` + `drizzle-kit` を採用する。

**Rationale**:
- Prisma は独自のクエリエンジンプロセス（Rust バイナリ）を要し、Bun との相性に制約がある
- Drizzle は SQL に近い API で軽量、型推論が強く、スキーマとマイグレーションが統合管理できる
- `drizzle-kit generate` / `migrate` によりマイグレーションを単一ツールで完結させられる

#### Alternative 1: Prisma

| | |
|---|---|
| **Pros** | 成熟したエコシステム・豊富なドキュメント・型生成が自動 |
| **Cons** | 独自の Rust クエリエンジンプロセスを要し、Bun との相性に制約がある。エンジン起動のオーバーヘッドと互換性リスクが高い |
| **Why not** | Bun ランタイムでの互換性リスクが解消されるまで採用困難 |

#### Alternative 2: Kysely

| | |
|---|---|
| **Pros** | 型安全なクエリビルダー、SQL に近い API |
| **Cons** | マイグレーション・スキーマ管理ツールが Drizzle ほど統合されておらず、別途ツールが必要 |
| **Why not** | スキーマ定義・マイグレーション・型推論を単一ツールで完結させたいため |

---

### D2: DB ドライバ — postgres.js を採用（pg / node-postgres を却下）

**Decision**: `postgres`（postgres.js by Porsager）を使用し、import パスは `drizzle-orm/postgres-js` とする。

**Rationale**:
- postgres.js は Bun ネイティブで高速、接続プーリングが組み込まれている
- `pg`（node-postgres）はネイティブバインディング不要で安定だが、Bun 環境ではパフォーマンスに劣る

**Note**: パッケージ名 `postgres` は `pg`（node-postgres）と混同しやすい。import パスは必ず `drizzle-orm/postgres-js` を使用すること。

#### Alternative 1: pg (node-postgres)

| | |
|---|---|
| **Pros** | ネイティブバインディング不要で安定。Node.js エコシステムで長年の実績がある |
| **Cons** | Bun 環境では postgres.js と比べてパフォーマンスに劣る。接続プーリングには別途 `pg-pool` が必要 |
| **Why not** | Bun ネイティブの postgres.js のほうがパフォーマンスに優れ、接続プーリングも組み込み済みのため |

---

### D3: 認証ライブラリ — Auth.js v5 Credentials provider を採用

**Decision**: `next-auth@5` の Credentials provider でメール/パスワード認証を実装する。セッションには `userId`, `organizationId`, `role` を含め、Drizzle adapter でセッション・アカウントを DB 管理する。

**Rationale**:
- デモ用途のため OAuth 不要。Credentials provider で最小構成を実現できる
- Auth.js v5 は `auth()` 関数で Server Component / Server Action の両方からセッション取得可能
- 将来 OAuth provider を追加可能な拡張性がある

**Auth.js 設定の配置**:
- 設定本体: `src/infrastructure/auth.ts`（DB adapter と Drizzle スキーマに依存するため infrastructure 層）
- ルートハンドラ: `src/app/api/auth/[...nextauth]/route.ts`（`handlers` を re-export）

#### Alternative 1: Lucia

| | |
|---|---|
| **Pros** | 軽量でシンプル、Next.js との統合が容易 |
| **Cons** | 公式メンテナンス終了のリスクがあり、長期的なサポートが不透明 |
| **Why not** | メンテナンス継続性が不確かな認証基盤を SaaS の土台に採用するリスクを避けるため |

#### Alternative 2: 自作 JWT 認証

| | |
|---|---|
| **Pros** | 外部ライブラリへの依存がなく、挙動を完全にコントロールできる |
| **Cons** | セッション管理・CSRF 対策・トークン失効・リフレッシュのボイラープレートが増大し、実装ミスによるセキュリティリスクが高い |
| **Why not** | 認証のセキュリティ要件を自前で正確に満たすコストが高く、Auth.js v5 が同じことを提供しているため |

---

### D4: パスワードハッシュ — bcryptjs を採用（argon2 を却下）

**Decision**: `bcryptjs`（純 JS 実装）を採用する。

**Rationale**:
- argon2 はネイティブバインディングを要し、Bun/Node バージョンやプラットフォーム間で互換性問題が発生しやすい
- bcryptjs は純 JS 実装で依存が軽く、Bun 環境での動作が安定している
- デモ用途では十分なセキュリティ強度

**Trade-off**: 将来 OAuth 導入でパスワード認証自体が不要になる想定のため、セキュリティ強度より安定性を優先した。

#### Alternative 1: argon2

| | |
|---|---|
| **Pros** | bcrypt より強力なハッシュアルゴリズム（メモリハード）でセキュリティ面では優位 |
| **Cons** | ネイティブバインディングを要し、Bun/Node バージョンやプラットフォーム（ARM/x86）間で互換性問題が発生しやすい |
| **Why not** | デモ用途でセキュリティ強度より環境互換性を優先。将来 OAuth 導入でパスワード認証自体が不要になる想定のため |

---

### D5: スキーマ定義を infrastructure 層に配置

**Decision**: Drizzle スキーマ（`pgTable`, `pgEnum` 等）は `src/infrastructure/schema.ts` に定義する。`domain/models` には ORM 非依存のプレーンな TypeScript 型定義とビジネスルールのみを配置する。

**Rationale**:
- Drizzle のスキーマ定義は ORM 固有 API（`pgTable`, `pgEnum`, `$inferSelect` 等）に依存する
- domain 層の純粋性を保つには ORM API を持ち込まない設計が必要
- domain 型は `$inferSelect` から導出せず、独立した型定義として維持する

**Constraint**: domain 層は infrastructure 層（schema.ts, repositories）を一切 import してはならない。依存方向は `actions → usecases → domain / infrastructure` のみ。

#### Alternative 1: domain 型を Drizzle の `$inferSelect` から導出

| | |
|---|---|
| **Pros** | 型定義が一箇所（schema.ts）に集約され、スキーマ変更時の型更新が自動になる |
| **Cons** | domain 型が Drizzle ORM API に直接依存し、ORM を変更した場合に domain 層全体の書き換えが必要になる。domain 層の純粋性が失われ、単体テストに Drizzle が必要になる |
| **Why not** | domain 層は ORM 非依存の純粋な TypeScript であるべき。ORM 変更コストを domain 層に波及させないため |

---

### D6: 状態遷移ルールを domain 層で管理

**Decision**: 申請の状態遷移バリデーションを `src/domain/services/requestTransition.ts` に配置する。遷移マップ（`draft → pending`, `pending → approved`, `pending → rejected`）を定義し、不正な遷移を拒否する純粋関数として実装する。

**Rationale**:
- DB 制約（CHECK constraint）に置くとビジネスルールの可視性が失われる
- アプリケーション層に置くと複数箇所への散在リスクがある
- domain 層の純粋関数として集約することでテスト容易性と可読性を確保する

**State machine**:
```
draft → pending → approved
                → rejected
```
終端状態（`approved`, `rejected`）からの遷移は一切許可しない。

#### Alternative 1: DB CHECK 制約で状態遷移を強制

| | |
|---|---|
| **Pros** | DB レベルで強制されるため、アプリケーションコードのバグによる不正遷移を防げる |
| **Cons** | ビジネスルールが SQL マイグレーションに埋め込まれ、可視性・可読性が失われる。遷移ルールの変更にマイグレーション実行が必要 |
| **Why not** | ビジネスルールは domain 層のコードとして表現し、テストで固定する方針のため |

#### Alternative 2: アプリケーション層（usecase / Server Action）でインラインチェック

| | |
|---|---|
| **Pros** | 追加の関数・ファイルが不要でシンプル |
| **Cons** | 複数のユースケースに同じ遷移チェックが散在し、ルール変更時の修正漏れが発生しやすい |
| **Why not** | 単一の信頼できる遷移ルール定義（Single Source of Truth）を domain 層に持ちたいため |

---

### D7: audit_logs を append-only 独立テーブルとして設計

**Decision**: 状態変更（提出・承認・却下）時に `audit_logs` テーブルへのレコード挿入を、状態変更と同一トランザクション内で行う。

**Rationale**:
- イベントソーシングは現段階では過剰
- append-only の独立テーブルで将来の要件拡張（監査レポート、アクティビティフィード）に備える
- 同一トランザクションにより、状態変更と監査ログの整合性を保証する

**Audit log fields**: `action`, `targetType`, `targetId`, `actorId`, `organizationId`, `metadata` (jsonb)

#### Alternative 1: イベントソーシング

| | |
|---|---|
| **Pros** | 完全な変更履歴を持ち、任意の時点の状態を再構築できる。監査要件への対応力が高い |
| **Cons** | 実装複雑度が大幅に増加する。Read model の再構築、スナップショット管理、イベントスキーマの進化管理が必要 |
| **Why not** | 現段階の要件に対して過剰設計。append-only の独立テーブルで監査要件は十分に満たせる |

---

### D8: テナント分離をアプリケーション層 WHERE 条件で実装

**Decision**: リポジトリ層の各メソッドで `organizationId` を引数として受け取り、すべてのクエリの WHERE 条件に付与する。usecase 層でセッションから `organizationId` を取得してリポジトリに渡す。書き込み操作における `organizationId` はリクエストボディから受け入れない（セッションの値を強制使用）。

**Rationale**:
- PostgreSQL Row Level Security (RLS) は設定が複雑で、マイグレーション管理のコストが高い
- アプリケーション層での分離は可読性が高く、ローカル開発でのテストが容易
- セッションから `organizationId` を取得することで、クライアントによる組織 ID 偽装を防ぐ

#### Alternative 1: PostgreSQL Row Level Security (RLS)

| | |
|---|---|
| **Pros** | DB レベルで強制されるため、アプリケーションコードのバグによるデータ漏洩を防げる。リポジトリ層の実装が簡素化される |
| **Cons** | RLS ポリシーの設定が複雑。マイグレーション管理に RLS ポリシーの DDL が加わる。ローカル開発・テストで PostgreSQL 接続設定が必要になり、モックが困難 |
| **Why not** | デモ用途では設定複雑度とテスト困難性のコストが高い。アプリケーション層での WHERE 条件付与で十分な分離が実現できる |

---

### D9: Next.js 16 の proxy.ts（旧 middleware.ts）で認証ガードを実装

**Decision**: `src/proxy.ts` に認証済みルートの保護ロジックを配置する。exported function 名は `proxy`（`middleware` ではない）。

**Rationale**: Next.js 16 では `middleware.ts` が `proxy.ts` にリネームされ、exported function 名も変更されている。Auth.js v5 の proxy/middleware 統合を利用するためにこの変更に追従する必要がある。

**Scope of proxy**: セッション存在の楽観的チェックのみ。実際の認可（role チェック等）は Server Action 内で `auth()` を呼び出して行う。

---

## Consequences

### Positive
- Drizzle による軽量な型安全 DB アクセスが確立された
- Auth.js v5 の `auth()` 関数により Server Action / Server Component 両方から一貫したセッション取得が可能
- domain 層の純粋性（ORM 非依存）により、ビジネスルールの単体テストが容易
- テナント分離が全リポジトリメソッドで強制されており、漏洩リスクが低い
- audit_logs の append-only 設計で将来の監査要件拡張に対応可能

### Negative / Trade-offs
- bcryptjs は argon2 比でセキュリティ強度が低い（デモ用途として許容）
- アプリケーション層テナント分離は RLS より漏洩リスクが高い（将来 RLS 移行を検討）
- Auth.js v5 Drizzle adapter は beta 期のため、スキーマ変更追従が必要になる可能性がある
- `submitRequestAction` / `approveRequestAction` / `rejectRequestAction` が `Promise<void>` を返すため、usecase のエラー結果がユーザーに伝わらない（low 指摘として残存、次 request で対応予定）

### Constraints for future changes
- `domain/` は `infrastructure/` を import しない
- 新規リポジトリメソッドはすべて `organizationId` 引数を受け取り WHERE 条件に付与する
- 状態遷移ルールの変更は `src/domain/services/requestTransition.ts` の遷移マップを起点とする
- パスワード認証の強化（argon2 移行）は OAuth 導入と同時に検討する

---

## References

- `specrunner/changes/foundation-db-auth-domain/design.md` — 詳細設計（D1〜D11）
- `specrunner/changes/foundation-db-auth-domain/spec.md` — ビヘイビア仕様
- `src/infrastructure/schema.ts` — Drizzle スキーマ定義
- `src/domain/services/requestTransition.ts` — 状態遷移ルール
- `src/infrastructure/auth.ts` — Auth.js v5 設定
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` — Next.js 16 proxy 仕様
