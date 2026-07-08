# Spec Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:    specification is complete, consistent, and ready for implementation
  - needs-fix:   specification has issues that must be resolved before implementation
  - escalation:  unresolvable conflicts, missing context, or requires human judgment
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | File | Description | How to Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
  - CRITICAL: production outage, data loss, security breach
  - HIGH:     functional failure, clear bug, no workaround — blocks approval
  - MEDIUM:   quality degradation, maintainability issue, future risk
  - LOW:      informational, style, minor improvement
- If no findings, write a table row with "None" or omit the table body.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approved

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | MEDIUM | Spec Consistency | tasks.md (T-01 vs T-02/T-04) | `buildAdvertisementSchema` の「同名フィールドは最初に出現した型を採用」ルールが T-02/T-04 の受け入れ基準と矛盾する可能性がある。`inquiries.ts` の `listSchema.source` は `z.string().optional()` だが `createSchema.source` は `z.enum([...])` であり、`[listSchema, createSchema, ...]` の順で渡すと `source` が enum でなく string として広告される。T-04 は「source が enum 配列を持つ」ことを要求しており、実装依存のまま放置すると受け入れ基準を通過しない恐れがある。T-01 は「型不一致時にビルドエラーを出す」とも記述しているが、`z.string()` と `z.enum([...])` の衝突がビルドエラー対象かどうか不明確。 | T-01 の衝突解決ルールを明示する。推奨: 「enum は string より具体的なため enum を優先」か、「型不一致（string vs enum）時はビルドエラーとし、呼び出し元（T-02）で `listSchema.source` を `z.enum([...]).optional()` に合わせる」のどちらかをタスクに明記する。いずれにせよ T-04 の enum 受け入れ基準が通るよう T-02 内で確認する。 |
| 2 | MEDIUM | Spec Consistency | tasks.md (T-01 vs T-03) | `validateAndParse` の戻り値仕様が T-01 と T-03 で矛盾している。T-01 は「成功時は parsed data を返し、失敗時は `handleToolError` 互換のツールエラー結果を返す」と記述するが、T-03 の利用パターン `if (parseResult) return parseResult;` は「成功時に null（falsy）を返し、失敗時に CallToolResult（truthy）を返す」を前提にしている。T-01 の仕様どおりに成功時が parsed data（truthy）を返すと、`if (parseResult)` が常に成立して handler が成功時にも早期 return してしまいハンドラ本体に到達しない。 | T-01 の `validateAndParse` を「失敗時は `CallToolResult` を返し、成功時は `null` を返す（呼び出し元は元の `args` を引き続き使用）」と再定義するか、または「成功時は `{ ok: true, data }` / 失敗時は `{ ok: false, result: CallToolResult }` の判別可能な型を返し、T-03 の利用パターンも `const v = validateAndParse(...); if (!v.ok) return v.result; const typedArgs = v.data;` 形式に更新する」のどちらかを明示する。 |
| 3 | LOW | Type Safety | tasks.md (T-03) | T-03 のパターンが `validateAndParse` で early return guard を置くだけで、ハンドラ内の `switch` 分岐は依然として広告用 flat schema の型（全フィールド optional）で `args` にアクセスする。`case "create"` ブロック内の `args.title` が `string | undefined` と推論されるため、型検証済みの required 扱いができず TypeScript の strict チェックで警告が出る可能性がある。`validateAndParse` で parsed data を返す設計にすれば自然に解消できる。 | finding 2 で採用した解決策（判別可能な戻り型 + `const typedArgs = v.data`）を選択すれば、`switch` 内の型安全性も同時に解決される。T-01 の型定義 `AdvertisementSchemaResult` にこの観点も含めて設計するよう T-01 に一文追記する。 |
| 4 | LOW | Security | request.md, design.md | inputSchema 広告により全 operation 値・フィールド名・enum 値がクライアントに公開される。調査範囲内（inquiries.source の "web"/"phone" 等）は業務上公開可能な値であり漏洩リスクなし。既存の認証（Bearer）・認可（`canPerform`）・レート制限（`checkRateLimit`）・エラー情報制限（`extractZodErrors` による内部詳細非露出）は変更されないため、OWASP Top 10 (A01 Broken Access Control / A03 Injection / A09 Security Logging) の観点でも新たなリスクは生じない。 | 対応不要。将来的に internal-only な enum 値が追加される場合は「広告スキーマに含めない」判断を別 request で検討することを推奨する（今回スコープ外）。 |

## Reviewer Notes

### 技術的前提の検証

**SDK 根本原因（確認済み）**

`node_modules/@modelcontextprotocol/sdk/dist/esm/server/zod-compat.js` の `normalizeObjectSchema` を直接確認した。Zod v4 スキーマに対しては `v4Schema._zod?.def?.type === 'object' || def.shape !== undefined` を判定する。`z.discriminatedUnion()` は `def.type` が 'object' でなく `.def.shape` も持たないため `undefined` を返し、`EMPTY_OBJECT_JSON_SCHEMA` へのフォールバックが確定する。`z.object({...})` は `def.shape` を持つため正しく通過する。この根本原因分析は正確。

プロジェクトが `"zod": "^4.4.3"` を使用しており、Zod v4 のパスが適用されることを確認（`z.object({})` は `_zod: true`, `shape: true` を持つ）。

**アーキテクチャ整合性**

mod-mcp の責務（MCP プロトコル受付・ツール登録・Bearer 認証解決・認可チェック・usecase 委譲）の範囲内の変更であり、新モジュール・新依存辺・新ドメイン概念・新シーケンスなし。aozu 影響判定は正確。

**既存テストパターンとの整合**

T-04 の `McpServer + WebStandardStreamableHTTPServerTransport + tools/list` パターンは `mcpToolsRegistration.test.ts` と完全に一致しており、実績あるパターンを踏襲している。mock 設計（個別ファイル mock・afterAll 復元・バレル非モック）も既存テストと整合する。

### 総評

spec の構造は明確で、background・design decisions（D1〜D4）・tasks（T-01〜T-05）・acceptance criteria いずれも実装者が迷わない水準に達している。2 件の MEDIUM は spec 内の記述間の不整合であり、実装前に T-01 の `validateAndParse` 戻り値仕様と衝突解決ルールを明確化すれば実装フェーズで問題は生じない。ブロッキング項目（CRITICAL / HIGH）なし。セキュリティ観点でも既存統制が維持されており問題なし。
