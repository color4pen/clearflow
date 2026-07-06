# Regression Gate Result — mcp-server-core — iter 1

- **verdict**: approved
- **iteration**: 001

## Summary

全 5 件の HIGH finding と 2 件の MEDIUM finding が修正済みであることを確認。LOW finding 2 件のうち 1 件（Finding 8）は未実装、1 件（Finding 9）は review で fix=no と判断済みのため設計上の継続事項。HIGH/CRITICAL の回帰なし → approved。

## Ledger Verification

| # | Severity | File | Description | Status |
|---|----------|------|-------------|--------|
| 1 | HIGH | `src/application/usecases/updateClient.ts` | catch ブロックで err.message を reason に露出 — D7 違反 | ✅ FIXED |
| 2 | HIGH | `src/application/usecases/updateClientContact.ts` | catch ブロックで err.message を reason に露出 — D7 違反 | ✅ FIXED |
| 3 | HIGH | `src/app/api/mcp/tools/inquiries.ts` | update 操作のデフォルト変換バグ（`?? null` / `?? ''`） | ✅ FIXED |
| 4 | HIGH | `src/__tests__/mcp/mcpAuth.test.ts` | auth 401 テストが静的解析のみ — 受け入れ基準未充足 | ✅ FIXED |
| 5 | HIGH | `src/__tests__/mcp/mcpProtocol.test.ts` | protocol フロー integration テストが静的解析のみ — 受け入れ基準未充足 | ✅ FIXED |
| 6 | MEDIUM | `src/app/api/mcp/route.ts` | GET ハンドラが認証なしで McpServer に接続する | ✅ FIXED |
| 7 | MEDIUM | `src/__tests__/mcp/mcpTenantIsolation.test.ts` | TC-049 テナント分離テストが static ソース解析のみ | ✅ FIXED |
| 8 | LOW | `src/app/api/mcp/tools/deals.ts:211` | contractType null → undefined 型キャストが実態と乖離 | ⚠️ NOT FIXED |
| 9 | LOW | `src/app/api/mcp/route.ts` | McpServer シングルトンへの毎リクエスト connect(transport) — リスナー蓄積リスク | ℹ️ BY DESIGN (fix=no) |

## Finding-by-Finding Detail

### Finding 1 — ✅ FIXED
**File**: `src/application/usecases/updateClient.ts`

`catch { return { ok: false, reason: "顧客の更新に失敗しました" } }` に変更済み。`err` 変数なし・`err.message` の露出なし。D7 準拠を確認。

### Finding 2 — ✅ FIXED
**File**: `src/application/usecases/updateClientContact.ts`

`catch { return { ok: false, reason: "担当者の更新に失敗しました" } }` に変更済み。Finding 1 と同様、ORM エラーの露出なし。

### Finding 3 — ✅ FIXED
**File**: `src/app/api/mcp/tools/inquiries.ts` (update ケース, lines 162–174)

`title: args.title`、`source: args.source`、`description: args.description`、`contactNote: args.contactNote` 等、全フィールドが `?? null` / `?? ''` デフォルト変換なしで直接渡されている。deals.ts の実装と一致。

### Finding 4 — ✅ FIXED
**File**: `src/__tests__/mcp/mcpAuth.test.ts`

TC-003（Authorization ヘッダなし → 401）・TC-004（cfp_ プレフィックスなし → 401）・TC-024（GET 無認証 → 401）が `POST`/`GET` ハンドラを直接 import した runtime テストとして実装済み。静的解析依存を解消。

### Finding 5 — ✅ FIXED
**File**: `src/__tests__/mcp/mcpProtocol.test.ts`

TC-001a/b/c/d が `McpServer` + `WebStandardStreamableHTTPServerTransport` を直接生成した runtime テストとして実装済み。`initialize`→`tools/list`→`tools/call` の JSON-RPC フロー全体をDB接続なしで検証。

### Finding 6 — ✅ FIXED
**File**: `src/app/api/mcp/route.ts` (lines 59–68)

GET ハンドラの先頭に POST と同等の Bearer 認証チェック（`resolveBearer` 呼び出し → null なら 401）を追加済み。TC-024 の runtime テストでも確認済み。

### Finding 7 — ✅ FIXED
**File**: `src/__tests__/mcp/mcpTenantIsolation.test.ts`

TC-049（inquiries list テナント分離）が `mock.module("@/application/usecases", ...)` を使った runtime テストとして実装済み。`listInquiries` の第一引数が `authInfo.extra.organizationId` と一致することを `expect(tenantMockState.listInquiriesCalls[0]).toBe(targetOrgId)` で検証。TC-050 も追加済み。

TC-011/TC-012（承認フロー pending 分岐）も `mcpApproval.test.ts` で runtime テストとして実装済み（`updateInquiryStatus` を mock し `pendingApproval` の有無でツール結果の分岐を検証）。

### Finding 8 — ⚠️ NOT FIXED (LOW severity regression)
**File**: `src/app/api/mcp/tools/deals.ts:211`

```ts
// 現在のコード（未修正）
contractType: args.contractType as ContractType | undefined,
```

iter 2 の code-review にて fix=yes と判定されたが、code-fixer iter 2 のコミット（915a1c3）はテストファイル（`mcpApproval.test.ts`・`mcpTenantIsolation.test.ts`）のみを変更しており、deals.ts の修正は実施されなかった。

- **期待される修正**: `args.contractType as ContractType | undefined` → `args.contractType ?? undefined`（null → undefined の明示的変換）
- **影響**: LOW 保守コスト問題。動作上は `updateDeal` usecase が null を受け入れる型を持つため機能的な問題はなし
- **ブロック判定**: LOW severity のため承認はブロックしない

### Finding 9 — ℹ️ BY DESIGN (fix=no)
**File**: `src/app/api/mcp/route.ts` (lines 9–12, 53, 75)

iter 2 の code-review にて `fix=no` と明示的に判定。設計 D8 が「transport はリクエストごとに生成する」を明示的に選択しており、コメントで文書化済み。コードパターンの変更は不要。本番投入前のスモークテスト（リスナー数の増加確認）が推奨事項として記録されている。

## Regressions

| Severity | File | Finding | Resolution |
|----------|------|---------|------------|
| LOW | `src/app/api/mcp/tools/deals.ts:211` | `contractType as ContractType \| undefined` キャストが未修正（fix=yes 判定済みだが code-fixer で実施されなかった） | fixable |

## Contradictions

なし。

## Conclusion

HIGH/CRITICAL の回帰ゼロ。LOW の未修正 1 件（contractType キャスト）は動作影響なし、後続 PR で対処可能。
