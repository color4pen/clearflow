# Design: トランザクション導入・認証プロキシ修正・テナント分離強化

## Context

PR#3 で DB 基盤・認証・基本ドメインモデルを導入した。コードレビューで以下の非ブロッカーが検出されている:

1. usecase 層の `requestRepository.updateStatus` と `auditLogRepository.create` がトランザクションで囲まれていない — 監査ログ insert 失敗時にステータスだけ変わり監査証跡が欠落する
2. `src/proxy.ts` の認証プロキシロジックが Next.js に認識されていないとの指摘があったが、Next.js 16 では `middleware.ts` が `proxy.ts` にリネーム済みであり、現在の `src/proxy.ts` は正しい配置 (D2 参照)
3. `userRepository.findByEmail` に organizationId 条件がない — Credentials login の authorize 専用だが将来のテナント跨ぎリスクがある
4. approve/reject/submit の Server Actions で認証失敗時にエラーメッセージなしの `void` return — クライアントに情報が伝わらない
5. `src/infrastructure/db.ts` で `process.env.DATABASE_URL!` の non-null assertion — 未設定時に不明瞭なランタイムエラー

確認済みの現状コード:

- `src/application/usecases/approveRequest.ts:27-43` — `requestRepository.updateStatus` と `auditLogRepository.create` を逐次呼び出し。トランザクションなし。`rejectRequest.ts`, `submitRequest.ts` も同構造
- `src/proxy.ts:1-29` — `proxy` 関数と `config.matcher` を export。Next.js 16 の file convention に準拠
- `src/infrastructure/repositories/userRepository.ts:8-15` — `findByEmail` は email のみで検索。organizationId 条件なし
- `src/app/actions/requests.ts:62,83,105` — `submitRequestAction`, `approveRequestAction`, `rejectRequestAction` で認証失敗時に `return;` (void)
- `src/infrastructure/db.ts:5` — `postgres(process.env.DATABASE_URL!)` で non-null assertion
- `src/infrastructure/auth.ts:7,36` — `findByEmail` を named import して `authorize` 内で使用
- `src/infrastructure/repositories/requestRepository.ts:2` — module-level `db` import でクエリ実行
- `src/infrastructure/repositories/auditLogRepository.ts:1` — 同上

## Goals / Non-Goals

**Goals**:

- approve/reject/submit usecase のステータス更新と監査ログ記録をトランザクションで囲み、原子性を保証する
- `findByEmail` を `findByEmailForAuth` にリネームし、ログイン専用であることを命名で明示する
- approve/reject/submit の Server Actions で認証失敗時に構造化エラーレスポンスを返す
- `db.ts` の `DATABASE_URL` 未設定時に明示的なエラーメッセージで throw する

**Non-Goals**:

- UI の変更
- 新しいドメインモデルの追加
- テストフレームワークの変更（bun:test を維持）
- `organizationRepository` の WHERE 条件修正（動作に影響なし、次回以降）
- `createRequestAction` の戻り値型変更（既存 `CreateRequestState` を維持 — フォームバリデーション UI 依存）

## Decisions

### D1: Drizzle `db.transaction()` + リポジトリ関数への省略可能 `tx` 引数

usecase 内で `db.transaction(async (tx) => { ... })` を呼び出し、トランザクション内で実行すべきリポジトリ関数に `tx` を渡す方式を採用する。

**対象リポジトリ関数**: `requestRepository.updateStatus` と `auditLogRepository.create`。これらの関数に省略可能な末尾引数 `tx?: Transaction` を追加する。渡された場合は `tx` を、省略時は module-level の `db` をクエリ実行に使う。

**トランザクション型**: `src/infrastructure/db.ts` から `db` の型に基づく `Transaction` 型を export する。Drizzle の `db.transaction()` コールバックの `tx` 引数型を利用する。

```
// db.ts で export する型
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
```

**Rationale**: リポジトリのインターフェース変更が最小限（末尾に `tx?` を追加するのみ）。既存の呼び出し元は引数なしで従来通り動作する。usecase がトランザクション境界を制御し、domain 層は永続化を知らないというアーキテクチャを維持する。

**Alternatives considered**:
- Unit of Work パターン — 現在のコードベースの規模に対して過剰。将来トランザクション境界が複雑化した際に検討
- Context/Provider パターン (AsyncLocalStorage) — ランタイムの暗黙的な状態伝播で可読性が下がる。明示的な引数渡しを優先

### D2: `src/proxy.ts` を維持 — `middleware.ts` への改名を却下

request.md の要件 2 は「`src/middleware.ts` を作成し `src/proxy.ts` を削除する」だが、Next.js 16 では `middleware.ts` が deprecated であり `proxy.ts` にリネーム済みである（`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` で確認: "The `middleware` file convention is deprecated and has been renamed to `proxy`."）。

**結論**: `src/proxy.ts` は Next.js 16 が認識する正しい file convention であり、現状のままで認証ガードは proxy レベルで機能する。`middleware.ts` を作成すると Next.js 16 に認識されず、逆に認証ガードが機能しなくなる。

**対応**: `src/proxy.ts` をそのまま維持する。テスト（TC-021, TC-044, TC-048）も `proxy.ts` を参照しており正しいため変更不要。

**request.md との差異**: 受け入れ基準「`src/middleware.ts` が存在し、`src/proxy.ts` が存在しない」は Next.js 16 の file convention と矛盾するため、本設計では適用しない。proxy の認証ガード機能自体は現状正しく動作する。

### D3: `findByEmail` → `findByEmailForAuth` リネーム

`userRepository.findByEmail` を `findByEmailForAuth` にリネームして、ログイン認証専用であることを命名で明示する。

**変更箇所**:
- `src/infrastructure/repositories/userRepository.ts` — 関数名を変更
- `src/infrastructure/auth.ts:7` — import 名を変更
- `src/infrastructure/auth.ts:36` — 呼び出し箇所を変更

**Rationale**: Auth.js の `authorize` コールバックは login 時点でユーザーの organizationId を知らない（email + password のみ）。organizationId を必須引数にすると login が壊れる。関数名で用途を限定し、テナント跨ぎの誤用を命名で防ぐ。

### D4: Server Actions エラーレスポンス型の統一

approve/reject/submit の Server Actions の戻り値を `void` から構造化レスポンス型に変更する。

**型定義**: `src/app/actions/requests.ts` 内に `ActionResult` 型を定義する:
```
type ActionResult = { success: boolean; message?: string };
```

**変更対象**:
- `submitRequestAction` — `Promise<void>` → `Promise<ActionResult>`
- `approveRequestAction` — `Promise<void>` → `Promise<ActionResult>`
- `rejectRequestAction` — `Promise<void>` → `Promise<ActionResult>`

認証失敗時: `return { success: false, message: "認証が必要です" }`
認可失敗時 (role check): `return { success: false, message: "権限がありません" }`
usecase 失敗時: `return { success: false, message: result.reason }`
成功時: `return { success: true }`

**`createRequestAction` は変更しない**: 既存の `CreateRequestState` 型（フィールドレベル `errors` 含む）を維持する。フォームバリデーション UI に依存しているため変更すると UI 修正が必要になり、スコープ外の UI 変更に波及する。

**Alternatives considered**:
- 全 Server Actions を統一型にする — `createRequestAction` がフォームバリデーション用の `errors` フィールドを持つため、同一型にすると冗長か不整合が生じる。既存の動作する型を維持する

### D5: `DATABASE_URL` 環境変数ガード

`src/infrastructure/db.ts` で `process.env.DATABASE_URL` の存在を `postgres()` 呼び出し前にチェックし、未設定時に明示的なエラーメッセージで throw する。

```
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}
const client = postgres(databaseUrl);
```

## Risks / Trade-offs

[Risk] リポジトリ関数の `tx` 引数追加による既存呼び出し元への影響 → 省略可能引数のため、既存の呼び出し元は変更不要。TypeScript の型チェックで安全性を担保する。

[Risk] `findByEmailForAuth` リネームによる import 漏れ → `findByEmail` は `auth.ts` の 1 箇所のみから呼ばれている（grep 確認済み）。リネーム漏れは TypeScript の型チェックで検出される。

[Risk] Server Actions の戻り値型変更による UI 側への影響 → approve/reject/submit の呼び出し元 UI は `void` を前提としている可能性がある。ただし Server Actions の戻り値を無視している呼び出し元は型変更で壊れないため、リスクは低い。

[Risk] request.md の受け入れ基準との不整合 (D2) → `middleware.ts` 関連の受け入れ基準は Next.js 16 の file convention と矛盾する。実装者は `proxy.ts` を維持し、この基準を適用外とする。

## Open Questions

なし（D2 の proxy.ts 維持判断は Next.js 16 ドキュメントの明確な記載に基づく確定判断）
