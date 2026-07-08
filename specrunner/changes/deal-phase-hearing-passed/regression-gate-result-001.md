# Regression Gate Result — Iteration 1

- **verdict**: approved

## Summary

All 4 findings from the review ledger are confirmed fixed. No regressions detected.

---

## Finding Verification

### [HIGH] TC-011: revenueRepository.activePhases のテストが存在しない

- **File checked**: `src/__tests__/usecases/pipelineSummary.test.ts`
- **Status**: ✅ Fixed
- **Evidence**: `describe("TC-011: revenueRepository activePhases 静的検証", ...)` ブロック（line 70–112）が追加されている。`hearing` が `activePhases` に含まれること、`passed`/`won`/`lost` が除外されること、4フェーズ全てが含まれることを静的検証する5テストが存在する。

---

### [MEDIUM] D1・T-02: マイグレーション方式が設計決定（型再作成パターン）と不一致

- **File checked**: `drizzle/0021_silky_shinko_yamashiro.sql`
- **Status**: ✅ Fixed
- **Evidence**: SQL は設計決定 D1 の型再作成パターン（6ステップ）で実装されている。
  - (a) `ALTER COLUMN "phase" DROP DEFAULT`
  - (b) `CREATE TYPE "public"."deal_phase_new" AS ENUM(...)` — 並び順: `hearing, proposal_prep, proposed, negotiation, won, lost, passed`
  - (c) `ALTER COLUMN "phase" TYPE ... USING "phase"::text::"public"."deal_phase_new"`
  - (d) `ALTER COLUMN "phase" SET DEFAULT 'hearing'`
  - (e) `DROP TYPE "public"."deal_phase"`
  - (f) `ALTER TYPE "public"."deal_phase_new" RENAME TO "deal_phase"`
  - `ALTER TYPE ADD VALUE` は使われていない。

---

### [MEDIUM] TC-015: MCP isTerminalPhase に passed が含まれることのテストが存在しない

- **File checked**: `src/__tests__/mcp/mcpAuthorization.test.ts`
- **Status**: ✅ Fixed
- **Evidence**: `describe("TC-015: MCP deals.ts isTerminalPhase に passed が含まれる（静的検証）", ...)` ブロック（line 137–173）が追加されている。以下を検証する4テストが存在する。
  - `isTerminalPhase` 判定に `passed` が含まれる
  - `updatePhaseSchema` に `"passed"` が含まれる（MCP が passed を受理できる）
  - `updatePhaseSchema` に `"hearing"` が含まれる
  - `passed` が `closePhase` 権限経路に到達する（`update_phase` case ブロック内に `passed` と `closePhase` が共存）

---

### [MEDIUM] TC-003/TC-004: hearing デフォルト起点を静的テストで固定していない

- **File checked**: `src/__tests__/usecases/dealManagement.test.ts`
- **Status**: ✅ Fixed
- **Evidence**: `describe("TC-003/TC-004: hearing デフォルト起点 静的検証", ...)` ブロック（line 216–255）が追加されている。以下を検証する3テストが存在する。
  - `schema.ts` の `deals.phase` カラムに `.default("hearing")` が存在する
  - `dealRepository.create` の `.values()` 呼び出しに `phase` が含まれない（DB default に委ねる）
  - `dealPhaseEnum` の先頭値が `hearing` である（enum 並び順の固定）

---

## Conclusion

4件の指摘すべてが修正されており、新たな退行は検出されなかった。矛盾（A修正でBが再発）も確認されなかった。
