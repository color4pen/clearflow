# Code Review Feedback — mcp-server-core — iter 1

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
- iteration line format (exact): `- **iteration**: NNN` (3-digit zero-padded integer)
- Findings table MUST have exactly 7 columns in this order:
  # | Severity | Category | File | Description | How to Fix | Fix
  - Fix column: yes = fixer should address this finding; no = skip (pre-existing / out-of-scope)
- Scores table columns: Category | Score | Weight
  - Valid Category values: correctness | security | architecture | performance | maintainability | testing
  - Score: integer 1-10
  - Weight: decimal as defined below
- total line format (exact): `- **total**: <decimal>`
- Default weights: correctness=0.30, security=0.25, architecture=0.15, performance=0.10, maintainability=0.10, testing=0.10
- Scores table is optional but recommended.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: needs-fix
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | HIGH | Security / Information Disclosure | `src/application/usecases/updateClient.ts:59`, `src/application/usecases/updateClientContact.ts:62` | 両ユースケースの `catch` ブロックで `reason: err instanceof Error ? err.message : "..."` を使っており、ORM / DB の生エラーメッセージ（例: PostgreSQL 制約違反詳細、スキーマ名）が `reason` に入る。MCP ツールハンドラは `toToolError(result.reason)` でこれをクライアントに直接露出するため D7「ORM 例外をキャッチした場合は汎用メッセージに変換してから reason に設定する」に違反する。既存ユースケースに同パターンが広く存在するが、本 PR で新設した 2 ファイルは MCP 経路に直接つながっており、D7 が本 PR の明示的な設計規律として定められているため、本 PR 範囲での修正が必要。 | `updateClient.ts:59` の catch を `return { ok: false, reason: "顧客の更新に失敗しました" }` に、`updateClientContact.ts:62` を `return { ok: false, reason: "担当者の更新に失敗しました" }` に変更する（`err instanceof Error ? err.message :` を削除）。必要であれば `console.error(err)` でサーバーサイドログに記録する。 | yes |
| 2 | HIGH | Functional Bug / Data Corruption | `src/app/api/mcp/tools/inquiries.ts:163-175` | `update` 操作で `title: args.title ?? ""` と `source: args.source ?? "other"` を usecase に渡している。MCP クライアントがこれらを指定しない場合、`args.title = undefined` であるが `?? ""` によって `""` に変換され、`updateInquiry` の `if (data.title !== undefined)` チェックを通過してタイトルが空文字に上書きされる。同様に `source` が `"other"` に書き換えられる。さらに `description ?? null`, `contactNote ?? null`, `clientId ?? null` 等の `?? null` パターンも、指定なしフィールドを null（クリア）として扱うため、呼び出し側が意図しないフィールドのクリアが発生する。`deals.ts` の `update` 操作（値をそのまま渡す）と実装が不一致。 | update ハンドラを修正: `title: args.title`（`?? ""` 削除）、`source: args.source`（`?? "other"` 削除）、および `description`, `contactNote`, `clientId`, `assigneeId`, `budget`, `timeline` からも `?? null` を削除して `args.description` 等をそのまま渡す。未指定フィールドが `undefined` のまま usecase に届き、usecase がスキップする。`deals.ts` の update 実装を参照。 | yes |
| 3 | HIGH | Test Quality / Acceptance Criteria 未充足 | `src/__tests__/mcp/mcpProtocol.test.ts`, `src/__tests__/mcp/mcpAuth.test.ts`, `src/__tests__/mcp/mcpApproval.test.ts`, `src/__tests__/mcp/mcpTenantIsolation.test.ts`, `src/__tests__/mcp/mcpAuditLog.test.ts` | tasks.md は T-07「`WebStandardStreamableHTTPServerTransport` を直接使用する transport レベルのテスト」・T-08「POST 関数を直接 import してテスト」と明示しているが、実際のテストはすべて `readFile` + `toContain` による静的ソース解析。受け入れ基準「テストで固定する」が要求する TC-001（initialize→tools/list→tools/call フロー）・TC-003/004/005（auth 401）・TC-011/012（承認フロー）・TC-013/049/050（テナント分離）・TC-014/015/016（監査ログ記録）のランタイム動作が実質的に検証されていない。`resolveBearer` 呼び出しにバグがあってもテキスト検索は green になる。`mcpErrors.test.ts` と `mcpAuthorization.test.ts`（canPerform 直接テスト）は適切。 | 最低限以下を runtime テストに変更する。(a) TC-001/026: `McpServer` + `WebStandardStreamableHTTPServerTransport` を直接生成し（usecase はモック）、`handleRequest` に JSON-RPC initialize/tools/list/tools/call を送って応答を検証する。(b) TC-003/004/005: route.ts の `POST` を import し `resolveBearer` をモック（null 返却）、`Request` オブジェクトを生成して呼び出し、`response.status === 401` を検証する。(c) TC-049（list テナント分離）: inquiries ツールハンドラを直接呼び出し、usecase モックが organizationId=テナントA で呼ばれることを検証する。 | yes |
| 4 | MEDIUM | Security / Defense-in-Depth | `src/app/api/mcp/route.ts:59-67` | `GET` ハンドラが認証チェックなしで `mcpServer.connect(transport)` を呼んでいる。設計は「SDK が stateless モードで 405 を返す」を前提としているが、SDK の実装詳細に依存した安全保証である。SDK バージョンアップや想定外エラーパスで GET が処理された場合に認証バイパスが生じるリスクがある。 | GET ハンドラの先頭に POST ハンドラと同じ Bearer 認証チェック（`resolveBearer` → null なら 401）を追加する。または TC-024 を runtime テスト（GET → 405 の応答を実際に検証）に昇格し、その旨のコメントを route.ts に記述する。 | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 4 | 0.30 |
| security | 5 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 3 | 0.10 |

- **total**: 5.85

## Summary

### 実装の良い点

**アーキテクチャ・設計の忠実な実装**: route.ts は D2（stateless）・D5（JSON レスポンス）・D8（モジュールレベルシングルトン）を正しく実装。Bearer 認証 → `resolveBearer` → `authInfo.extra` → ツールハンドラという D6 の抽象化フローは後続の OAuth 2.1 差し込みに対応できる。

**エラーユーティリティ**: `errors.ts` の `toToolError` / `toToolSuccess` / `handleToolError` の責務分離が明確。`mcpErrors.test.ts` が TC-038/039/040 を適切な unit テストで検証している。

**認可パリティ**: `canPerform` の operation 指定が Server Action と一致（inquiry.delete=admin、deal.create=admin/manager、deal.closePhase vs changePhase など）。`mcpAuthorization.test.ts` が `canPerform` を直接 import して権限マトリクスを runtime 検証しており、Server Action との一致を担保している。

**T-14 Server Action リファクタ**: `updateClientAction` / `updateClientContactAction` が新設ユースケース経由に正しく変更。MCP 経路・Server Action 経路で同一ユースケースを通す構造が実現されている。

**deals.ts・clients.ts の update 実装**: フィールドを `?? null` せずにそのまま渡しており、部分更新の意味論が正しい（Finding 2 の inquiries.ts と対比すると差異が明確）。

### 修正優先度

1. **Finding 2（最高優先）**: データ破壊バグ。`?? ""` / `?? "other"` / `?? null` の削除のみで修正可能。変更コスト最小。
2. **Finding 1**: catch ブロック 2 行の修正。変更コスト最小。
3. **Finding 3**: runtime テスト追加。`McpServer` と transport の直接生成は DB 接続不要で可能。usecase をモックすれば `bun test` 環境で実行できる。TC-001（protocol）と TC-003（auth 401）を優先する。
4. **Finding 4（MEDIUM）**: GET ハンドラへの認証追加、または TC-024 の runtime テスト化。

