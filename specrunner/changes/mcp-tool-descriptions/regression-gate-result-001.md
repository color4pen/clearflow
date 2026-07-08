# Regression Gate Result — iteration 001

- **verdict**: needs-fix
- **iteration**: 001

## Verification Summary

Ledger に登録された 1 件の finding について、現在のブランチ（`change/mcp-tool-descriptions-bb303b25`）上のコードを検証した。

## Finding Verification

### Finding 1: TC-028（must）未カバー — inquiries の source・budget .describe() 維持テストなし

- **Original Severity**: low
- **File**: `src/__tests__/mcp/mcpToolDescriptions.test.ts`
- **Resolution**: fixable
- **Status**: ❌ **REGRESSION** — fix は未適用

**検証結果:**

`src/__tests__/mcp/mcpToolDescriptions.test.ts`（192 行）を確認した。テストスイートは以下の 3 ブロックのみ:

1. `distinctness: 全 19 ツールの description が相互に distinct である`
2. `keyword: 各ツールの description に主要キーワードが含まれる`
3. `non-empty: 全 19 ツールの description が空でない`

TC-028 が要求する「`inquiries` ツールの `source` プロパティの description に「問い合わせ元」を含む、`budget` プロパティの description に「予算（整数）」を含む」ことを `tools/list` の inputSchema 経由で検証するテストは存在しない。

**実装側（`src/app/api/mcp/tools/inquiries.ts`）:**

```
source: z.string().optional().describe("問い合わせ元"),   // 正しく維持されている
budget: z.number().int().optional().describe("予算（整数）"),  // 正しく維持されている
```

実装は正しいが、テストによる固定が行われていないため finding は未解消。

**必要な修正:**

`mcpToolDescriptions.test.ts` に TC-028 相当のテストブロックを追加する。`tools/list` の inputSchema を取得するヘルパーを追加し、`inquiries` ツールの `source` プロパティに `description: "問い合わせ元"` を含む文字列、`budget` プロパティに `description: "予算（整数）"` を含む文字列が存在することを assert する。

## Findings Report

| # | Severity | Category | File | Description | Resolution |
|---|----------|----------|------|-------------|------------|
| 1 | high | testing | `src/__tests__/mcp/mcpToolDescriptions.test.ts` | TC-028（must 優先度）が未カバー。`inquiries` の `source`・`budget` フィールドの `.describe()` 維持を `tools/list` 経由で検証するテストが存在しない | fixable |
