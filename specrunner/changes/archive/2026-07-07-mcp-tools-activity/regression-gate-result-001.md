# Regression Gate Result — mcp-tools-activity Iteration 1

- **verdict**: needs-fix
- **date**: 2026-07-07
- **iteration**: 1

## Summary

Findings ledger 5 件を検証した。Finding #1 (HIGH)・#2 (MEDIUM)・#4 (LOW)・#5 (LOW) は修正済みを確認。Finding #3 (LOW) のみ未修正が確認された。

---

## Verified as Fixed

### Finding #1 (HIGH): result.reason 素通しによる DB エラー漏洩 — ✅ FIXED

**対象ファイル**: `src/app/api/mcp/tools/watches.ts`, `src/app/api/mcp/tools/interactions.ts`

- `watches.ts` の `watch` パス (line 57): `toToolError("ウォッチの登録に失敗しました")` — 固定文言 ✅
- `watches.ts` の `unwatch` パス (line 69): `toToolError("ウォッチの解除に失敗しました")` — 固定文言 ✅
- `interactions.ts` の全 4 operation (`create_meeting` / `update_meeting` / `record_contract_adjustment` / `record_invoice_adjustment`): すべて固定文言を返しており `result.reason` を素通ししていない ✅
- TC-024 (`mcpInteractions.dynamic.test.ts` line 438–477) が例外スロー時と `ok:false` 時の両方でクライアントに内部詳細が漏れないことを実行検証している ✅

---

### Finding #2 (MEDIUM): must 優先度 TC 8 件が未カバー — ✅ FIXED

| TC | テストファイル / 行 | 状態 |
|---|---|---|
| TC-003 (record_contract_adjustment 正常系) | `mcpInteractions.dynamic.test.ts` line 312–330 | ✅ |
| TC-005 (update_meeting 部分更新) | `mcpInteractions.dynamic.test.ts` line 352–372 | ✅ |
| TC-006 (update_meeting null クリア) | `mcpInteractions.dynamic.test.ts` line 374–392 | ✅ |
| TC-012 (tasks update null クリア) | `mcpTasks.dynamic.test.ts` line 223–252 | ✅ |
| TC-015 (unwatch 正常系) | `mcpWatches.dynamic.test.ts` line 155–187 | ✅ |
| TC-020 (organizationId スキーマ外排除) | `mcpInteractions.dynamic.test.ts` line 394–418 | ✅ |
| TC-024 (usecase 例外マスク) | `mcpInteractions.dynamic.test.ts` line 438–477 | ✅ |
| TC-025 (7 ツール登録) | `mcpToolsRegistration.test.ts` line 49–99 | ✅ |

すべて `mock.module` を使った behavioral test として実装されており、実行検証の要件を満たす。

---

### Finding #4 (LOW): update_meeting internalAttendees: null が空配列として処理される — ✅ FIXED

**対象ファイル**: `src/app/api/mcp/tools/interactions.ts` line 180

```typescript
if (args.internalAttendees !== undefined || args.externalAttendees !== undefined) {
  attendees = [
    ...(args.internalAttendees ?? []).map(...)
    ...(args.externalAttendees ?? []).map(...)
  ];
}
```

外側の `if` 条件により `undefined + undefined` → `attendees = undefined`（変更なし）が正しく機能するようになった。`null` は条件を通過して `[]` に変換される（クリア）= D6 原則を満たす。TC-006 が `location: null` の null セマンティクスを実行検証している。

---

### Finding #5 (LOW): TC-004 record_invoice_adjustment 正常系が未カバー — ✅ FIXED

**対象ファイル**: `src/__tests__/mcp/mcpInteractions.dynamic.test.ts` line 332–350

`record_invoice_adjustment` が `createInvoiceAdjustment` usecase に `invoiceId` / `organizationId` / `actorId` / `summary` を正しく渡すことを実行検証するテストが追加されている。

---

## Regression Found

### Finding #3 (LOW): 監査ログ検証が推論のみ — ❌ NOT FIXED

**対象ファイル**: `src/__tests__/mcp/mcpActivityAuditTenant.dynamic.test.ts` line 228–242
**severity**: low
**resolution**: fixable

#### 問題

`createActionItem` usecase 全体をモックしているため `recordAudit` は実際には呼ばれない。

```typescript
// mcpActivityAuditTenant.dynamic.test.ts line 59–63
mock.module("@/application/usecases/createActionItem", () => ({
  createActionItem: async (input: unknown) => {
    state.createActionItemCalls.push(input);
    return { ok: true as const, actionItem: mockActionItem };
  },
}));
```

テストの assert（line 239–241）:

```typescript
// usecase 内で recordAudit が呼ばれる = 監査記録される  ← コメントのみ
expect(callArgs.organizationId).toBe("org-1");
expect(callArgs.actorId).toBe("user-A");
```

`recordAudit` の直接的な呼び出し確認はなく、usecase が `organizationId`/`actorId` を受け取ることを確認するのみ。将来 `recordAudit` が `createActionItem` usecase から削除されてもテストは pass し続ける。これは Finding #3 が指摘した「推論のみ」パターンそのものであり、修正が適用されていない。

#### 修正方法

`createActionItem` usecase 全体をモックするのではなく、`recordAudit`（監査サービス）のみをモックして実際の `createActionItem` usecase を動作させる。これにより `recordAudit` の呼び出し有無を直接 assert できる。

```typescript
// 例: recordAudit のみモック
import * as auditServiceModule from "@/application/services/auditService";
mock.module("@/application/services/auditService", () => ({
  recordAudit: async (data: unknown) => {
    state.recordAuditCalls.push(data);
  },
}));
// ...
expect(state.recordAuditCalls).toHaveLength(1);
```

---

## Conclusion

- Finding #1 (HIGH): **fixed** ✅
- Finding #2 (MEDIUM): **fixed** ✅
- Finding #3 (LOW): **regression** — 未修正、`needs-fix`
- Finding #4 (LOW): **fixed** ✅
- Finding #5 (LOW): **fixed** ✅
