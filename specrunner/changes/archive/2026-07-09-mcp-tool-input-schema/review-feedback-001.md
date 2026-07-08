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
| 1 | high | testing | `src/__tests__/mcp/mcpTenantIsolation.test.ts` | 受け入れ基準「既存テストに変更を加えていない」違反。handler 内変数を `args` から `typedArgs` に改名したことで、string-match テスト 2 箇所 (`getDeal(args.dealId...)`, `getClient(args.clientId...)`) が追従修正された | `deals.ts` と `clients.ts` の handler パラメータを `_rawArgs` に改名し `const args = _rawArgs as z.infer<typeof ...InputSchema>` とすることで `args.dealId` / `args.clientId` の文字列を維持し、`mcpTenantIsolation.test.ts` の変更を revert する | yes |
| 2 | low | maintainability | `src/app/api/mcp/schemaHelpers.ts:11` | `_zod.def` という Zod 内部 API を `isNullable()` で直接参照。公開 API でないため Zod アップデートで壊れるリスクがある | `package.json` の zod を exact version または `~` でピンし、アップグレード時に動作確認を必須とするコメントを追記する | no |
| 3 | low | maintainability | `src/app/api/mcp/tools/approvalPolicies.ts:106-107` | `.superRefine()` 付きスキーマを `as unknown as z.ZodObject<z.ZodRawShape>` で強制キャスト。型安全を意図的に破棄している | キャスト箇所にコメント（"ZodEffects from superRefine — shape is accessible at runtime in Zod v4"）を追加して意図を明示する | no |
| 4 | low | maintainability | `src/app/api/mcp/schemaHelpers.ts:87-95` | `validateAndParse` 内の Zod issue フォーマット処理が `errors.ts` の private `extractZodErrors` と同一実装。`extractZodErrors` は export されていないため重複はやむを得ないが DRY 違反 | `errors.ts` から `extractZodErrors` を export するか、共通ユーティリティ関数として切り出す（follow-up 可） | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 8 | 0.10 |

- **total**: 8.80

## Summary

全体的な実装品質は高い。`buildAdvertisementSchema` ヘルパーによる per-operation スキーマからの広告スキーマ自動生成、ハンドラ先頭での `validateAndParse` による二段検証、SDK の transport 経由で `tools/list` を実際に呼ぶ統合テスト 20 件—いずれも設計判断（D1/D2/D3）どおり正確に実装されている。受け入れ基準の機能要件（TC-001〜TC-007、TC-010）は全て behavioral テストで固定されており、1924 テスト全 pass・typecheck/lint/build 全 green も確認済み。

**唯一の blocking 修正点**: `mcpTenantIsolation.test.ts` の 2 箇所が既存テスト修正禁止の受け入れ基準に違反している。修正は `deals.ts` と `clients.ts` の handler パラメータをリネーム（`_rawArgs` → `const args = ...`）するだけの最小変更で済む。

その他 3 件は low 観察事項（Zod 内部 API 参照・型キャスト・コード重複）で blocking ではなく follow-up 対応可。

