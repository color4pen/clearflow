# Regression Gate Result — Iteration 1

- **change**: delete-and-form-fixes
- **iteration**: 1
- **verdict**: needs-fix

## Finding 1 [MEDIUM] — updateStatus の戻り値未検査

- **file**: src/application/usecases/deleteDeal.ts:47
- **status**: fixed
- **detail**: `const updated = await inquiryRepository.updateStatus(...)` として戻り値を変数に受け、`if (!updated) throw new Error("引き合いのステータス更新に失敗しました");` によりトランザクションをロールバックさせる実装が確認できる（lines 47–54）。

## Finding 2 [LOW] — deleteDeal 静的テストに依存チェックの順序検証がない

- **file**: src/__tests__/static/projectStructure.test.ts:1346
- **status**: regression (still present)
- **severity**: low
- **resolution**: fixable
- **detail**: テスト `deleteDeal checks for meetings and contracts before deleting`（lines 1346–1350）は `findAllByDeal` と `findAllByDealId` の存在のみを `toContain` で確認しており、`deleteById` より前に出現するという順序検証が追加されていない。`deleteInquiry`（lines 1336–1344）と `deleteContract`（lines 1352–1360）はそれぞれ `findIdx < deleteIdx` の `expect(findIdx).toBeLessThan(deleteIdx)` を持つが、`deleteDeal` のテストには相当する assertion がない。
- **fix**: 以下のように書き換える。

```typescript
it("deleteDeal checks for meetings and contracts before deleting", async () => {
  const content = await readSrc("application/usecases/deleteDeal.ts");
  const findMeetingIdx = content.indexOf("findAllByDeal");
  const findContractIdx = content.indexOf("findAllByDealId");
  const deleteIdx = content.indexOf("deleteById");
  expect(findMeetingIdx).toBeGreaterThan(-1);
  expect(findContractIdx).toBeGreaterThan(-1);
  expect(deleteIdx).toBeGreaterThan(-1);
  // 存在チェックが deleteById より前に呼ばれていることを確認する
  expect(findMeetingIdx).toBeLessThan(deleteIdx);
  expect(findContractIdx).toBeLessThan(deleteIdx);
});
```
