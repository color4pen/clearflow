# Regression Gate Result — Iteration 002

- **verdict**: approved

## Verification Summary

すべての修正が現在のコードに存在することを確認した。リグレッションなし。

---

## Finding 1: [MEDIUM] must優先度の純粋関数ユニットテスト未実装 (TC-009, TC-016)

- **Status**: ✅ Fixed
- **File**: `src/__tests__/dashboard/salesDashboardUtils.test.ts`

`src/__tests__/dashboard/salesDashboardUtils.test.ts` が新規追加されており、以下のテストが実装されている。

- TC-009: `formatRelativeTime` に 30 分前の Date を渡すと「30分前」が返る
- TC-014 / TC-015 / TC-010: 追加のカバレッジ
- TC-016: `pipelineSummary.reduce` で count 合計が 11、totalAmount 合計が 8,800,000 になることを検証する 2 ケース

テストは `dashboardUtils.ts` から `formatRelativeTime` を直接インポートしており、既存の bun test パターンに準拠している。

---

## Finding 2: [LOW] パイプライン5番目フェーズセルの border-r 欠落

- **Status**: ✅ Fixed
- **File**: `src/app/(dashboard)/dashboard/SalesDashboard.tsx` (L126–L144)

`pipelineSummary.map()` で生成される全フェーズセルに `border-r border-border` が静的 className として付与されており、条件分岐なし。合計セルは独立した `<Link>` 要素で `border-r` を持たない。5番目フェーズセルと合計セルの間に視覚的境界線が確保されている。

---

## Finding 3: [LOW] subtitle にロールが未表示（要件R1「日付 + ロール」未達）

- **Status**: ✅ Fixed
- **File**: `src/app/(dashboard)/dashboard/SalesDashboard.tsx` (L90)

```tsx
const subtitle = `${today} | ${roleLabels[userRole] ?? userRole}`;
```

`SalesDashboard` の Props に `userRole: string` が追加され、`page.tsx` (L80) から `userRole={userRole}` として渡されている。`subtitle` は「日付 | ロール名」形式で `DashboardHeader` に渡される。TC-020 で期待される形式（`"2026/06/25 | 営業"` 等）を満たす。

---

## Finding 4: [LOW] アクション待ちリストで key={idx} アンチパターン使用

- **Status**: ✅ Fixed
- **File**: `src/app/(dashboard)/dashboard/SalesDashboard.tsx` (L186–L194)

```tsx
const itemKey =
  item.type === "approval"
    ? item.requestId
    : item.type === "action_item"
      ? item.dealId
      : item.inquiryId;
return (
  <div key={itemKey} ...>
```

配列インデックスではなく、型別ユニーク ID（requestId / dealId / inquiryId）を key として使用している。

---

## Conclusion

4件の修正がすべて現在のコードに存在することを確認した。リグレッションおよび相互矛盾なし。
