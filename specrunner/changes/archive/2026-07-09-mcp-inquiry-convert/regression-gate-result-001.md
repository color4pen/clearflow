# Regression Gate Result — mcp-inquiry-convert — iteration 001

- **verdict**: approved
- **iteration**: 001

## Summary

3 件の LOW finding を検証した。critical / high finding はなく、verdict は approved。

| # | Finding | Fix 指定 | 状態 |
|---|---------|---------|------|
| 1 | TC-012: deal なし direct 変換シナリオのモック | yes | 未修正（コードフィクサーがスキップ） |
| 2 | convert 説明が advertised inputSchema に届かない | no | 受け入れ済み（pre-existing 制約） |
| 3 | 即時成功パスで result.deal?.id ?? "" が空になりうる | no | 受け入れ済み（防御的改善として保留） |

---

## Finding 1 — LOW（未修正）

**File**: `src/__tests__/mcp/mcpApproval.test.ts:220`

- `review-feedback-001.md` Finding #1 は Fix=yes で記録された。
- code-fixer コミット（9114bd2）は specrunner メタデータのみを変更し、`mcpApproval.test.ts` には触れていない。
- TC-012 のモックは依然として `{ ok: true, inquiry: mockInquiry }` （deal なし）を返し、`parsed.id === INQUIRY_UUID`（flat inquiry 構造）をアサートしている。
- テスト自体は green のまま通過する（`update_status: converted` ハンドラの `if (result.deal) { … }` が偽となり `toToolSuccess(result.inquiry)` を返す）。
- 実運用の direct 変換パスでは `updateInquiryStatus` が必ず `deal` を返すため、TC-012 はその実レスポンス構造（`{ inquiry, deal }`）を反映していない。
- 影響は将来の開発者の誤解リスク（ドキュメント品質）であり、機能バグではない。LOW として継続管理対象。

## Finding 2 — LOW（受け入れ済み）

**File**: `src/app/api/mcp/tools/inquiries.ts`

- `mcp-conformance-result-001.md` Finding #1 は Fix=no で明示的に受け入れ。
- `buildAdvertisementSchema` は `z.enum(operations).describe("実行する操作")` で全 operation の個別 describe を上書きする pre-existing 構造制約。
- `convertSchema.operation.describe("引合を案件化し Deal を生成する...")` は `tools/list` には届かないが、ツールレベル description と `update_status.newStatus` の describe により機能的な誤用リスクは低い。
- 現状維持。リグレッションなし。

## Finding 3 — LOW（受け入れ済み）

**File**: `src/app/api/mcp/tools/inquiries.ts:296`

- `mcp-conformance-result-001.md` Finding #2 は Fix=no で明示的に受け入れ。
- `message: \`案件を生成しました（dealId: ${result.deal?.id ?? ""}）\`` はオプショナルチェーンにより deal が undefined の場合に空 dealId メッセージを生成しうる。
- usecase の direct 変換経路では `deal` は必ず存在するため実害なし。型安全性の防御的改善として将来対処可能。
- 現状維持。リグレッションなし。

---

## Regression Check

- **Finding 1**: 修正が適用されなかった（コードフィクサースキップ）。LOW severity のため approval をブロックしない。
- **Finding 2 / 3**: Fix=no で受け入れ済み。コード変更なし。リグレッションなし。
- critical / high finding: 0 件
- 全品質ゲート（build / typecheck / test 2009 pass / lint）: green（verification-result.md 確認済み）
