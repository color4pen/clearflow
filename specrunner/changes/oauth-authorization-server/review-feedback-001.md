# Code Review Feedback — iteration 001

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

- **verdict**: needs-fix
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | high | testing | `src/__tests__/oauth/oauthFlow.test.ts` | TC-020/021/022/049 未カバー: oauthFlow.test.ts の「Bearer 解決」2テストはトークンストアの状態確認のみで、`resolveBearer` や MCP エンドポイントを呼んでいない。受け入れ基準「失効後 AT が 401 になることをテストで固定する」「MCP ツール実行まで一連のフローを統合テストで固定する」を満たしていない | `oauthMetadata.test.ts` の手法（route を直接 import してリクエスト送信）を踏襲し、有効 `oat_` トークンで MCP POST が 200 を返すこと（TC-020）、失効・期限切れトークンで 401 を返すこと（TC-021/022）を検証するテストを追加する。既存の Exchange→Refresh シナリオの末尾で発行済みトークンを使って MCP 呼び出しを追加することで TC-049 も同時に充足できる | yes |
| 2 | high | testing | `src/__tests__/oauth/` (未存在) | TC-006 未カバー: `GET /api/oauth/authorize` のセッションなし時に `/login?callbackUrl=...` へリダイレクトするという `must` 受け入れ基準（「同意画面が未ログイン時にログインへ誘導することをテストで固定する」）がテストされていない。authorize ルート全体に自動テストが存在しない | `authorize/route.ts` を直接 import し、`auth()` を bun `mock.module` でセッションなし/あり両パターンにして GET を呼び出す。セッションなし → 302 Location に `/login` + `callbackUrl` を含む、セッションあり → Cookie 保存 + 302 Location が `/oauth/consent` を確認するテストを追加する | yes |
| 3 | low | maintainability | `src/app/api/oauth/authorize/route.ts` | lint warning: `redirect` が import されているが使用されていない（verification-result.md に記録済み）。ルートの全リダイレクトは `Response.redirect()` で実装されており不要 | 2行目の `import { redirect } from "next/navigation"` を削除する | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 10 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 4 | 0.10 |

- **total**: 8.6

## Summary

実装全体の品質は高い。PKCE S256 検証・認可コード再利用検知・リフレッシュトークンローテーション・再利用検知による系列一括失効はいずれも仕様通り正しく実装されており、トークンのハッシュ保存・テナント分離・監査ログも設計に忠実。build/typecheck/test/lint は全て pass（lint warning 1 件のみ）。

needs-fix の理由は実装ロジックの誤りではなく、テストカバレッジの欠落にある。

1. **OAuth アクセストークンによる MCP アクセスが HTTP レベルで未検証**（high / TC-020/021/022/049）: oauthFlow.test.ts はユースケース層をモックベースでテストしているが、「oat_ トークン → resolveBearer → MCP 200」と「失効・期限切れ → MCP 401」のパスが end-to-end で確認されていない。受け入れ基準が明示する「失効後が 401 になることをテストで固定する」「MCP ツール実行まで一連フローを固定する」を充足しない。
2. **authorize ルートの未ログイン→ログインリダイレクトが未テスト**（high / TC-006）: authorize ルートに対する自動テストが存在せず、受け入れ基準「同意画面が未ログイン時にログインへ誘導することをテストで固定する」を満たしていない。
3. **未使用 import（low）**: authorize/route.ts の `redirect` import を削除することで lint warning を解消できる。

修正は比較的小規模（テスト追加 + 1行削除）で完了可能。

