# Regression Gate Result — mcp-tools-activity Iteration 2

- **verdict**: approved
- **date**: 2026-07-07
- **iteration**: 2

## Summary

Findings ledger 5 件を検証した。全件修正済みを確認。回帰なし。

---

## Verified as Fixed

### Finding #1 (HIGH): result.reason 素通しによる DB エラー漏洩 — ✅ FIXED

**対象ファイル**: `src/app/api/mcp/tools/watches.ts`, `src/app/api/mcp/tools/interactions.ts`

- `watches.ts` の `watch` パス (line 57): `toToolError("ウォッチの登録に失敗しました")` — 固定文言 ✅
- `watches.ts` の `unwatch` パス (line 69): `toToolError("ウォッチの解除に失敗しました")` — 固定文言 ✅
- `interactions.ts` の全 4 operation: すべて固定文言を返し `result.reason` を素通ししていない ✅
- `errors.ts` の `handleToolError` は未知例外に対して `"内部エラーが発生しました"` を返す ✅

前 iteration から変更なし。維持を確認。

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

前 iteration から変更なし。8 件すべて `mock.module` を使った behavioral test として実装済みを確認。

---

### Finding #3 (LOW): 監査ログ検証が推論のみ — ✅ FIXED（iter 2 で修正）

**対象ファイル**: `src/__tests__/mcp/mcpActivityAuditTenant.dynamic.test.ts`

前 iteration（iter 1）では `createActionItem` usecase 全体をモックしており `recordAudit` が実際には呼ばれていなかった。

iter 2 での修正内容:
- `createActionItem` usecase のモックを削除し、実実装を経由するようにした
- `actionItemRepository`（個別モック: lines 75–102）と `auditRecorder.recordAudit`（個別モック: lines 104–110）のみをモック
- TC-019 の assert (lines 271–279) が `recordAudit` の呼び出しを直接検証するように変更された

```typescript
// recordAudit が action_item.create アクションで呼ばれた（監査記録される）
expect(state.auditCalls).toHaveLength(1);
expect(state.auditCalls[0].action).toBe("action_item.create");
expect(state.auditCalls[0].organizationId).toBe("org-1");
expect(state.auditCalls[0].actorId).toBe("user-A");
```

将来 `recordAudit` が `createActionItem` から削除された場合にテストが失敗するようになっており、回帰防止として機能する。✅

---

### Finding #4 (LOW): update_meeting internalAttendees: null が空配列として処理される — ✅ FIXED

**対象ファイル**: `src/app/api/mcp/tools/interactions.ts` line 180

前 iteration から変更なし。外側の `if` 条件による undefined/null 区別を確認:

```typescript
if (args.internalAttendees !== undefined || args.externalAttendees !== undefined) {
  attendees = [
    ...(args.internalAttendees ?? []).map(...)
    ...(args.externalAttendees ?? []).map(...)
  ];
}
```

- `undefined + undefined` → `attendees = undefined`（変更なし）✅
- `null` → 条件を通過して `[]`（クリア）✅

---

### Finding #5 (LOW): TC-004 record_invoice_adjustment 正常系が未カバー — ✅ FIXED

**対象ファイル**: `src/__tests__/mcp/mcpInteractions.dynamic.test.ts` line 332–350

前 iteration から変更なし。`createInvoiceAdjustment` usecase への正常系パスを実行検証するテストが存在することを確認。

---

## Conclusion

- Finding #1 (HIGH): **fixed** ✅
- Finding #2 (MEDIUM): **fixed** ✅
- Finding #3 (LOW): **fixed** ✅（iter 2 で修正確認）
- Finding #4 (LOW): **fixed** ✅
- Finding #5 (LOW): **fixed** ✅

全 5 件修正済み。回帰なし。
