# Code Review Feedback — iteration 002

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
- iteration line format (exact): `- **iteration**: NNN` (3-digit zero-padded integer)
- Findings table MUST have exactly 7 columns in this order:
  # | Severity | Category | File | Description | How to Fix | Fix
  - Fix column: yes = fixer should address this finding; no = skip (pre-existing / out-of-scope)
- Scores table columns: Category | Score | Weight
  - Valid Category values: correctness | security | architecture | performance | maintainability | testing
  - Score: integer 1-10
  - Weight: decimal as defined below
- total line format (exact): `- **total**: <decimal>`
- Default weights: correctness=0.30, security=0.25, architecture=0.15, performance=0.10, maintainability=0.10, testing=0.10
- Scores table is optional but recommended.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approved
- **iteration**: 002

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | low | maintainability | `src/app/api/oauth/authorize/route.ts` | iteration 001 finding #3 未修正: `import { redirect } from "next/navigation"` が 2 行目に残存し、ファイル内で一切使用されていない。lint warning `'redirect' is defined but never used` が継続して発生する | 2 行目の `import { redirect } from "next/navigation"` を削除する | yes |

## iteration 001 からの修正確認

| Finding | Severity | 修正状況 |
|---------|----------|----------|
| #1: TC-020/021/022/049 未カバー（MCP Bearer 検証 HTTP レベル未検証） | high | ✅ 修正済み — `oauthBearerMcp.test.ts`（449 行）を新規追加。有効トークン → MCP 200、失効トークン → 401、期限切れ → 401、系列失効後 → 401、リフレッシュローテーション後の新トークン → MCP 200 まで網羅 |
| #2: TC-006 未カバー（未ログイン → ログインリダイレクト未テスト） | high | ✅ 修正済み — `oauthAuthorizeRoute.test.ts`（220 行）を新規追加。未ログイン → 302 `/login?callbackUrl=...`、Cookie へのパラメータ保存、ログイン済み → `/oauth/consent` リダイレクト、パラメータバリデーション（redirect_uri 欠如・未登録 client_id・PKCE 不備）を検証 |
| #3: `redirect` 未使用 import | low | ❌ 未修正 |

## 新規テストの品質確認

**`oauthBearerMcp.test.ts`**:
- `mock.module` を `import` 前に配置し、モジュール解決順序を正しく制御している
- `@/infrastructure/repositories/oauthTokenRepository` をインメモリモックで置き換え、`repositories/index.ts` 経由の re-export も正しく差し替わる構成
- `@/infrastructure/db` のモックは `PgDatabase.prototype` から `Object.create` し `transaction` だけを override — `exchangeOAuthToken` の DB トランザクション内から呼ばれる `oauthTokenRepository` 関数もモックに転送される
- TC-049 のシナリオは `registerOAuthClient` → `authorizeOAuthClient` → `exchangeOAuthToken` → MCP POST の 4 ステップを通し、「正規 OAuth フローで取得したトークンで MCP にアクセスできる」「リフレッシュローテーション後の新トークンでもアクセスできる」を HTTP レベルで確認している

**`oauthAuthorizeRoute.test.ts`**:
- `auth()`・`next/headers cookies()`・`next/navigation redirect` をすべてモックしてから `GET` を動的 import する正しい順序
- `redirect()` モックは「呼び出されたら例外を投げる」として、`Response.redirect()` に移行済みであることを自己文書化している
- TC-006 の 3 テストケース（302 確認・callbackUrl 検証・Cookie 保存確認）は互いに独立しており、`beforeEach` でストアをリセットするため実行順序依存がない

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 10 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 9 | 0.10 |

- **total**: 9.05

## Summary

iteration 001 で指摘した HIGH 2 件がいずれも質の高いテストで解消された。`oauthBearerMcp.test.ts` は HTTP ルートレベルで OAuth アクセストークンの有効/失効/期限切れを確認し、受け入れ基準「失効後が 401 になることをテストで固定する」「一連のフローを統合テストで固定する」を充足する。`oauthAuthorizeRoute.test.ts` は TC-006（未ログイン → ログインリダイレクト）を直接固定し、受け入れ基準「同意画面が未ログイン時にログインへ誘導することをテストで固定する」を充足する。

残存する LOW finding（`redirect` 未使用 import による lint warning）は合否を左右しない。次回マージ前に 1 行削除で解消できる。

実装のコア品質（PKCE 検証・認可コード再利用検知・リフレッシュトークンローテーション・系列失効・opaque トークン + ハッシュ保存・テナント分離・監査ログ）はすべて設計通りであり、新テストによってさらに固定された。
