# Regression Gate Result — mcp-server-core — iter 2

- **verdict**: approved
- **iteration**: 002

## Summary

全 9 件のうち 8 件が修正済みを確認。残り 1 件（Finding 9）は review-feedback-002.md にて fix=no（設計上の継続事項）と明示的に判定済み。HIGH/MEDIUM の回帰ゼロ → approved。

## Ledger Verification

| # | Severity | File | Description | Status |
|---|----------|------|-------------|--------|
| 1 | HIGH | `src/application/usecases/updateClient.ts` | catch ブロックで err.message を reason に露出 — D7 違反 | ✅ FIXED |
| 2 | HIGH | `src/application/usecases/updateClientContact.ts` | catch ブロックで err.message を reason に露出 — D7 違反 | ✅ FIXED |
| 3 | HIGH | `src/app/api/mcp/tools/inquiries.ts` | update 操作の `?? null` / `?? ''` デフォルト変換によるフィールド誤上書きバグ | ✅ FIXED |
| 4 | HIGH | `src/__tests__/mcp/mcpAuth.test.ts` | auth 401 テストが静的解析のみ — 受け入れ基準未充足 | ✅ FIXED |
| 5 | HIGH | `src/__tests__/mcp/mcpProtocol.test.ts` | protocol フロー integration テストが静的解析のみ — 受け入れ基準未充足 | ✅ FIXED |
| 6 | MEDIUM | `src/app/api/mcp/route.ts` | GET ハンドラが認証なしで McpServer に接続する | ✅ FIXED |
| 7 | MEDIUM | `src/__tests__/mcp/mcpTenantIsolation.test.ts` | TC-049 テナント分離テストが static ソース解析のみ | ✅ FIXED |
| 8 | LOW | `src/app/api/mcp/tools/deals.ts` | contractType null → undefined 型キャストが実態と乖離 | ✅ FIXED |
| 9 | LOW | `src/app/api/mcp/route.ts` | McpServer シングルトンへの毎リクエスト connect(transport) — リスナー蓄積リスク | ℹ️ BY DESIGN (fix=no) |

## Finding-by-Finding Detail

### Finding 1 — ✅ FIXED
**File**: `src/application/usecases/updateClient.ts:56-61`

```ts
} catch {
  return {
    ok: false,
    reason: "顧客の更新に失敗しました",
  };
}
```

`err` 変数なし。`err.message` 参照なし。ORM/DB 生エラーが reason に入る経路を完全に排除。D7 準拠を確認。

### Finding 2 — ✅ FIXED
**File**: `src/application/usecases/updateClientContact.ts:59-63`

```ts
} catch {
  return {
    ok: false,
    reason: "担当者の更新に失敗しました",
  };
}
```

Finding 1 と同様。`err` 変数なし・ORM エラー露出なし。

### Finding 3 — ✅ FIXED
**File**: `src/app/api/mcp/tools/inquiries.ts` (update ケース lines 162–174)

```ts
const result = await updateInquiry({
  inquiryId: args.inquiryId,
  organizationId,
  actorId: userId,
  title: args.title,
  description: args.description,
  contactNote: args.contactNote,
  source: args.source,
  clientId: args.clientId,
  assigneeId: args.assigneeId,
  budget: args.budget,
  timeline: args.timeline,
});
```

`?? null` / `?? ''` / `?? 'other'` デフォルト変換が全フィールドから除去済み。deals.ts の update 実装と一致。未指定フィールドは `undefined` のまま usecase に渡されるため、usecase の `if (data.title !== undefined)` チェックが正しく機能する。

### Finding 4 — ✅ FIXED
**File**: `src/__tests__/mcp/mcpAuth.test.ts` (lines 82–134)

TC-003（Authorization ヘッダなし → 401）・TC-004（cfp_ プレフィックスなし無効トークン → 401）・TC-024（GET ハンドラ無認証 → 401）が `POST`/`GET` ハンドラを直接 import した runtime テストとして実装済み。resolveBearer がどう実装されていても、実際に 401 が返ることを行動ベースで検証できている。

### Finding 5 — ✅ FIXED
**File**: `src/__tests__/mcp/mcpProtocol.test.ts` (lines 115–267)

TC-001a/b/c/d が `McpServer` + `WebStandardStreamableHTTPServerTransport` を直接生成した runtime テストとして実装済み。

- TC-001a: `initialize` → 200 + protocolVersion 検証
- TC-001b: `tools/list` → `echo` ツールの一覧確認
- TC-001c: `tools/call echo` → `"echo: hello MCP"` 結果確認
- TC-001d: 不正 method → -32601 エラーコード検証

DB 接続不要のテスト用ツール（`echo`）を登録して JSON-RPC フロー全体を網羅。

### Finding 6 — ✅ FIXED
**File**: `src/app/api/mcp/route.ts` (lines 59–68)

```ts
export async function GET(request: Request): Promise<Response> {
  // POST と同じ Bearer 認証（SDK バージョンアップ時の認証バイパスリスクを防ぐ）
  const authHeader = request.headers.get("Authorization");
  const resolved = await resolveBearer(authHeader);
  if (!resolved) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  ...
}
```

GET ハンドラ先頭に POST と同等の Bearer 認証チェックを追加済み。TC-024 の runtime テストでも 401 応答を直接検証済み。

### Finding 7 — ✅ FIXED
**File**: `src/__tests__/mcp/mcpTenantIsolation.test.ts` (lines 164–242)

TC-049/TC-050 が `mock.module("@/application/usecases", ...)` を使った runtime テストとして実装済み。

- TC-049: `authInfo.extra.organizationId = "org-tenant-a-isolation-test"` が `listInquiries` の第一引数にそのまま渡ることを `tenantMockState.listInquiriesCalls[0] === targetOrgId` で検証
- TC-050: テナント B の authInfo を使用した際、テナント A の ID が混入しないことを検証

加えて `src/__tests__/mcp/mcpApproval.test.ts` に TC-011/TC-012 の runtime テストも追加済み。`updateInquiryStatus` をモックし `pendingApproval` の有無でツール結果の分岐を検証している。

### Finding 8 — ✅ FIXED
**File**: `src/app/api/mcp/tools/deals.ts:211`

```ts
// 修正後
contractType: args.contractType ?? undefined,
```

`as ContractType | undefined` の型キャスト（null を実行時に変換しない）から `?? undefined`（null を実際に undefined へ変換）へ変更済み。型と実態が一致。iter 1 regression gate では NOT FIXED と記録されていたが、iter 2 で解消された。

### Finding 9 — ℹ️ BY DESIGN (fix=no)
**File**: `src/app/api/mcp/route.ts:53, 75`

POST/GET ハンドラが毎リクエスト `mcpServer.connect(transport)` をシングルトンに対して呼ぶパターンは変更なし。review-feedback-002.md で `fix=no` と明示的に判定済み（設計 D8 の意図的な選択。本番投入前スモークテストで listener 増加確認を推奨する旨を記録）。回帰ではない。

## Regressions

なし。HIGH/MEDIUM の回帰は確認されなかった。

## Contradictions

なし。

## Conclusion

全 HIGH (5 件) および MEDIUM (2 件) finding が修正済みを確認。LOW finding 1 件（Finding 8）も iter 2 で新たに修正済み。Finding 9 は設計判断による継続事項（fix=no）。承認をブロックする問題なし。
