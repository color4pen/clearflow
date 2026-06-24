# Regression Gate Result — design-dashboard iteration 1

- **verdict**: needs-fix

## Summary

Ledger に 4 件の修正が記録されていた。検証の結果、1 件が確認済み（FIXED）、3 件が未修正のままであることが判明した（REGRESSION）。

---

## Finding Results

### Finding 1: must優先度の純粋関数ユニットテスト未実装 (TC-009, TC-016) — ✅ FIXED

- **Severity**: MEDIUM
- **File**: `src/__tests__/dashboard/salesDashboardUtils.test.ts`
- **Status**: 修正済み
- **Detail**: `formatRelativeTime` の TC-009 テスト（30 分前 → "30分前"）および `PipelineSummaryItem` の reduce 算出 TC-016 テスト（count 合計 11 件、totalAmount 合計 8,800,000）がともに実装されている。`dashboardUtils.ts` に純粋関数として切り出されており、テストから正しくインポートされている。

---

### Finding 2: パイプライン5番目フェーズセルの border-r 欠落 — ❌ REGRESSION

- **Severity**: HIGH
- **Resolution**: fixable
- **File**: `src/app/(dashboard)/dashboard/SalesDashboard.tsx:121`
- **Detail**: 条件 `idx < pipelineSummary.length - 1` が修正されていない。`pipelineSummary` が 5 件の場合、`pipelineSummary.length - 1 = 4` であり、idx=4（5 番目フェーズ）は `4 < 4 = false` となり `border-r` が付与されない。合計セルは別要素（ループ外）のため、全フェーズセルに `border-r` を付与すべきだが、未修正のまま。
- **Fix**: 条件分岐を削除し、全フェーズセルに `border-r border-border` を無条件付与する（例: `className="block p-3 hover:bg-bg-page text-center border-r border-border"`）。

---

### Finding 3: subtitle にロールが未表示（要件R1「日付 + ロール」未達） — ❌ REGRESSION

- **Severity**: HIGH
- **Resolution**: fixable
- **Files**:
  - `src/app/(dashboard)/dashboard/SalesDashboard.tsx:91`
  - `src/app/(dashboard)/dashboard/page.tsx:74-80`
- **Detail**: `SalesDashboard` の `subtitle` に `{today}` のみが渡されており、ロールが表示されない。`page.tsx` では `userRole`（line 14）が取得されているが、`SalesDashboard` への props に含まれていない（lines 75–80）。`SalesDashboard` の Props 型にも `userRole` フィールドが存在しない。TC-020 が期待する `"2026/06/25 | 営業"` 形式が実現できていない。
- **Fix**:
  1. `SalesDashboard` の Props 型に `userRole: string` を追加する。
  2. `page.tsx` で `<SalesDashboard ... userRole={userRole} />` と渡す。
  3. `SalesDashboard` 内で `subtitle={`${today} | ${userRole}`}` のように結合して渡す（表示テキストはロールラベルに変換する必要があれば `roleLabel[userRole]` 等を使う）。

---

### Finding 4: アクション待ちリストで key={idx} アンチパターン使用 — ❌ REGRESSION

- **Severity**: HIGH
- **Resolution**: fixable
- **File**: `src/app/(dashboard)/dashboard/SalesDashboard.tsx:178`
- **Detail**: `actions.map((item, idx) => ... key={idx} ...)` と配列インデックスをキーに使っており、修正されていない。`DashboardActionItem` はタイプ別にユニーク ID（`approval` → `requestId`、`action_item` → `dealId`、`inquiry` → `inquiryId`）を持つため、インデックスキーは不要。
- **Fix**: `key={item.type === "approval" ? item.requestId : item.type === "action_item" ? item.dealId : item.inquiryId}` のように型別 ID をキーに使用する。または共通の `id` フィールドをモデルに追加する。
