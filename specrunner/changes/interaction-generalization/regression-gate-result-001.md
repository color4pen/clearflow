# Regression Gate Result — Iteration 1

- **verdict**: needs-fix

## Verified Findings

### [HIGH] [REGRESSION] interactionsRelations に contract / invoice / client の one-relation 定義が欠落

- **File**: src/infrastructure/schema.ts:854
- **Resolution**: fixable
- **Status**: 🔴 regression — 前イテレーションで fixable と記録されたが、現在のコードに修正が反映されていない

**詳細**:

FK カラム（`contractId`, `invoiceId`, `clientId`）は `interactions` テーブル（lines 379–381）に存在するが、`interactionsRelations`（lines 854–872）に対応する `one()` 定義がない。

現在の `interactionsRelations`:
```ts
export const interactionsRelations = relations(interactions, ({ one, many }) => ({
  organization: one(organizations, { ... }),
  deal: one(deals, { ... }),
  inquiry: one(inquiries, { ... }),
  createdBy: one(users, { ... }),
  actionItemsRef: many(actionItems),
}));
```

`contract` / `invoice` / `client` の one-relation が欠落している。

**修正方法**: `interactionsRelations` に以下を追加する。

```ts
  contract: one(contracts, {
    fields: [interactions.contractId],
    references: [contracts.id],
  }),
  invoice: one(invoices, {
    fields: [interactions.invoiceId],
    references: [invoices.id],
  }),
  client: one(clients, {
    fields: [interactions.clientId],
    references: [clients.id],
  }),
```
