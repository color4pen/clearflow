# Regression Gate Result — controls-tables-restyle / iteration 1

- **verdict**: needs-fix

## Ledger Verification

### Finding 1: TC-008 / TC-017 / TC-018 / TC-019 (must unit) が自動テストとして未実装

- **Status**: FIXED ✅
- **Evidence**:
  - `src/__tests__/static/uiBusinessStyle.test.ts` に `describe("DataTable styles — TC-008, TC-017, TC-018")` および `describe("BulkApprovalPanel result alert tokens — TC-019")` の両ブロックが追加されている。
  - TC-017: `DataTable.tsx` line 35 の `<th>` className に `text-text-secondary` が含まれる。テスト `.toContain("text-text-secondary")` と実装が一致。
  - TC-008: `DataTable.tsx` line 49 の `<tr>` className に `hover:bg-bg-surface-alt` が含まれる。テスト `.toContain("hover:bg-bg-surface-alt")` と実装が一致。
  - TC-018: `DataTable.tsx` に `hover:bg-primary/10` が存在しない。テスト `.not.toContain("hover:bg-primary/10")` と実装が一致。
  - TC-019: `BulkApprovalPanel.tsx` の結果アラートが `bg-bg-success-light` / `text-success`（成功）、`bg-status-red-bg` / `text-status-red-text`（失敗）、`bg-bg-row-pending` / `text-warning`（部分成功）を使用。`bg-green-*` / `bg-red-*` / `bg-yellow-*` の生パレットクラスも存在しない。テストと実装が一致。

---

### Finding 2: TC-012（廃止定数の不在）が明示的な静的テストで担保されていない

- **Status**: NOT FIXED ❌ (regression)
- **Evidence**:
  - `src/__tests__/static/uiBusinessStyle.test.ts` に TC-012 を担保する `.not.toContain()` アサーションが追加されていない。
  - 具体的に欠落しているアサーション:
    - `expect(content).not.toContain("BTN_PRIMARY_DISABLED")`
    - `expect(content).not.toContain("BTN_SUCCESS")`
    - `expect(content).not.toContain("BTN_WARNING")`
    - `expect(content).not.toContain("BTN_SUBMIT")`
  - TC-004 / TC-032 のテストは「BTN_PRIMARY が正しい値を持つ」を確認するよう更新されたが、廃止定数が存在しないことを直接アサートするテストは追加されなかった。
  - `src/app/(dashboard)/styles.ts` の実装自体はこれらの廃止定数を含まず正しい。ただし、テストによる明示的な保護がないため、将来の変更でリグレッションが生じても検出できない状態が継続している。

## Regressions

| # | Severity | File | Title | Resolution |
|---|----------|------|-------|------------|
| 1 | low | src/__tests__/static/uiBusinessStyle.test.ts | TC-012: 廃止定数の不在テスト（BTN_PRIMARY_DISABLED / BTN_SUCCESS / BTN_WARNING / BTN_SUBMIT）が未追加 | fixable |
