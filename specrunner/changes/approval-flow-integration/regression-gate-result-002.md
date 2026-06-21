# Regression Gate Result — Iteration 2

- **verdict**: approved
- **regressions**: 0
- **contradictions**: 0

## Ledger Verification

### [HIGH] runPostApprovalLinkage の例外が承認成功後に ok: false を漏出させる

**Status**: 修正済み（回帰なし）

`src/application/usecases/approveRequest.ts` の `runPostApprovalLinkage` 関数（L28-125）において、`inquiry` ブランチ（L37-76）と `deal` ブランチ（L81-123）の両方で以下の二重 try-catch が実装されている。

- 外側 catch でビジネスロジックの失敗を捕捉
- 内側 try-catch（L60-75, L107-121）で `auditLogRepository.create` の書き込みを捕捉

いずれの例外も呼び出し元に漏出しない構造になっており、no-steps フロー（L191）と multi-step フロー（L389）の両方で `runPostApprovalLinkage` が `ok: true` の return の手前で呼ばれている。

### [MEDIUM] TC-011 および TC-005 のテストが欠落している

**Status**: 修正済み（回帰なし）

`src/__tests__/usecases/approvalFlowIntegration.test.ts` に以下のテストが存在する。

- TC-011（L221-232）: `steps.length === 0` ブロックから `// Multi-step approval flow` コメントの手前を切り出し、`runPostApprovalLinkage` の呼び出しを静的に確認
- TC-005（L276-294）: `mapRow` 関数内に `sourceType: row.sourceType` / `sourceId: row.sourceId` が存在することを確認

### [LOW] TC-014 および TC-016（sourceType null/不明時の連動スキップ）のテストが欠落

**Status**: 修正済み（回帰なし）

- TC-014（L240-248）: `runPostApprovalLinkage` の関数先頭 300 文字以内に `if (!sourceType || !sourceId) return` が存在することを確認
- TC-016（L251-268）: 関数本体（L28 から `export type ApproveRequestResult` 直前まで）に `} else {` も `else if` も存在しないことを確認。実装上は `if (sourceType === "inquiry")` と `if (sourceType === "deal")` の独立した if が並ぶ構造になっており、未知の sourceType は何もせず終了する
