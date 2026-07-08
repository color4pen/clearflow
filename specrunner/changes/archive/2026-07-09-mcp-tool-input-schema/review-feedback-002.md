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
| 1 | low | maintainability | `src/app/api/mcp/schemaHelpers.ts:11` | `_zod.def` という Zod 内部 API を `isNullable()` で直接参照。公開 API でないため Zod アップデートで壊れるリスクがある（iteration 001 から持ち越し） | `package.json` の zod を exact version または `~` でピンし、アップグレード時に動作確認を必須とするコメントを追記する | no |
| 2 | low | maintainability | `src/app/api/mcp/tools/approvalPolicies.ts:106-107` | `.superRefine()` 付きスキーマを `as unknown as z.ZodObject<z.ZodRawShape>` で強制キャスト。型安全を意図的に破棄している（iteration 001 から持ち越し） | キャスト箇所にコメントを追加して意図を明示する | no |
| 3 | low | maintainability | `src/app/api/mcp/schemaHelpers.ts:87-95` | `validateAndParse` 内の Zod issue フォーマット処理が `errors.ts` の private `extractZodErrors` と同一実装（iteration 001 から持ち越し） | `errors.ts` から `extractZodErrors` を export するか共通ユーティリティとして切り出す（follow-up 可） | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 10 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 9 | 0.10 |

- **total**: 9.20

## Summary

iteration 001 で blocking 指摘した唯一の high 所見（`mcpTenantIsolation.test.ts` の既存テスト修正禁止違反）が正しく解消されている。

### 修正の検証

- `deals.ts`（line 106）: ハンドラパラメータを `_rawArgs` にリネームし、`const args = _rawArgs as z.infer<typeof dealsInputSchema>` でキャスト → `args.dealId` という文字列がソース上に存在し続けるため `mcpTenantIsolation.test.ts` の `toContain("getDeal(args.dealId, organizationId)")` が引き続き pass する。
- `clients.ts`（line 146 / 156）: 同様に `_rawArgs` → `const args = ...` パターンを適用 → `toContain("getClient(args.clientId, organizationId)")` が引き続き pass する。
- `git diff main...HEAD --name-only` に `mcpTenantIsolation.test.ts` が**含まれていない**ことを確認。受け入れ基準「既存テストに変更を加えていない」を満たす。

### 受け入れ基準の充足確認

- **TC-001〜TC-002（全ツール非空 properties / operation enum）**: `mcpInputSchemaAdvertisement.test.ts` で全 19 ツールを実際に transport 経由で呼び出し behavioral 検証済み。
- **TC-003 / TC-004（inquiries budget = integer, source = enum）**: 専用 describe ブロックで assert 済み。
- **TC-005〜TC-007（不正引数拒否・正常呼び出し）**: `callTool` ヘルパーで実引数を渡して `isError` と usecase 到達有無を assert。
- **TC-008〜TC-020（ヘルパーユニット・deals型・auditLogs単一 op・description・テナント分離・不明 op・内部詳細漏洩防止）**: 全て behavioral または runtime テストで固定済み。
- **build / typecheck / lint / test**: verification-result.md で全フェーズ exit 0・1924 テスト 0 fail を確認。
- **ソース文字列照合なし**: 広告スキーマ検証は全て `tools/list` を通じた JSON Schema 検査で実施。mock はバレルでなく個別ファイルを対象。

### 残存 low 所見について

3 件はいずれも iteration 001 で `Fix: no`（blocking なし）とした観察事項の持ち越しであり、今回新たに発生したものではない。blocking 所見はゼロであるため verdict を **approved** とする。
