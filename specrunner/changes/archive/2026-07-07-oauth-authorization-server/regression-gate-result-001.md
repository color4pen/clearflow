# Regression Gate Result — Iteration 001

- **verdict**: approved
- **date**: 2026-07-07
- **findings**: 0 regressions

## Summary

All 4 findings from the ledger are confirmed fixed. No regressions detected.

## Finding Verification

### [HIGH] TC-020/021/022/049: OAuth アクセストークンによる MCP アクセスが HTTP レベルで未テスト
- **Status**: ✅ FIXED
- **Evidence**: `src/__tests__/oauth/oauthBearerMcp.test.ts` が新規追加され、以下を HTTP レベルで検証している。
  - TC-020: 有効な `oat_` トークン → MCP `initialize` 200
  - TC-021: `revokedAt` 設定済みトークン → MCP 401（接続解除による系列失効も含む）
  - TC-022: `expiresAt` が過去のトークン → MCP 401
  - TC-049: 動的登録 → 認可コード発行 → トークン交換 → MCP アクセスの一連フロー
  - `resolveBearer` / MCP ルート (`POST`) を直接 import してリクエストを送信しており、受け入れ基準を充足する。

### [HIGH] TC-006: authorize ルートの未ログイン→ログインリダイレクトが未テスト
- **Status**: ✅ FIXED
- **Evidence**: `src/__tests__/oauth/oauthAuthorizeRoute.test.ts` が新規追加され、以下を検証している。
  - セッションなし → `302` / `Location` が `/login?callbackUrl=...` を含む
  - `callbackUrl` が `/api/oauth/authorize` を含む
  - OAuth パラメータが Cookie に保存されてからリダイレクトする
  - セッションあり → `302` / `Location` が `/oauth/consent` を含む
  - `auth()` と `next/headers cookies()` を `mock.module` でモックし、GET ルートを直接 import して実行している。

### [LOW] 未使用 import `redirect` が残存（finding #3 / #4 共通）
- **Status**: ✅ FIXED
- **Evidence**: `src/app/api/oauth/authorize/route.ts` の import 行は以下の 4 行のみで、`import { redirect } from "next/navigation"` は存在しない。
  ```ts
  import { cookies } from "next/headers";
  import { auth } from "@/infrastructure/auth";
  import { oauthClientRepository } from "@/infrastructure/repositories";
  import { authorizeOAuthClient } from "@/application/usecases/authorizeOAuthClient";
  ```
  すべてのリダイレクトは `Response.redirect()` で実装されており、ESLint warning は解消されている。
