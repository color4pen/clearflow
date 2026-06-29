# Regression Gate Result — Iteration 001

- **change**: activity-timeline-curation
- **iteration**: 1
- **verdict**: approved

## Findings Verification

### [HIGH] Invoice の targetInfoMap に href が設定されない（要件 #5 未達）
- **File**: src/application/usecases/getDealActivity.ts:86–91
- **Status**: ✅ FIXED — `invoices.map((inv) => [..., { label: inv.title, href: \`/contracts/${inv.contractId}/invoices/${inv.id}\` }])` が実装されており、invoice エントリに href が付与されている。

### [LOW] テストタイトルと検証内容が逆（TC-011 / TC-012 の取り違え）
- **File**: src/__tests__/usecases/dealActivity.dynamic.test.ts:480
- **Status**: ✅ FIXED — タイトルは「集約後の件数が ACTIVITY_TIMELINE_LIMIT を超える場合は上限件数に切り捨てられる」に修正済み。テスト本体（40 件 distinct → 30 件に切り捨て）と一致している。

### [LOW] TC-015（invoice metadata 記録）が実行テストで固定されていない
- **File**: src/application/usecases/updateInvoiceStatus.ts
- **Status**: ✅ FIXED — `src/__tests__/usecases/updateInvoiceStatus.dynamic.test.ts` が新設され、mock.module 方式で `recordAudit` への `{ fromStatus, toStatus }` 引数を runtime で assert するテスト（TC-015）が 4 ケース実装されている。

### [LOW] テストタイトルが実際の振る舞いと逆（iter-001 F-02 未修正）
- **File**: src/__tests__/usecases/dealActivity.dynamic.test.ts:480
- **Status**: ✅ FIXED — [HIGH] と同一箇所。タイトルと振る舞いの逆転は解消されている。

### [LOW] updateInvoiceStatus の metadata 記録に関する実行テスト欠落（iter-001 F-03 未修正）
- **File**: src/application/usecases/updateInvoiceStatus.ts
- **Status**: ✅ FIXED — TC-015 と同一。`updateInvoiceStatus.dynamic.test.ts` の追加によりカバー済み。

## Summary

全 5 件のフィンディングが修正済みであることを確認。リグレッション・矛盾は検出されなかった。
