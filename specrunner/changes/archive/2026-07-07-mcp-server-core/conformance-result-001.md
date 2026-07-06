# Conformance Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:   implementation conforms to tasks.md, design.md, spec.md, and request.md
  - needs-fix:  one or more upstream artifacts are not satisfied by the implementation
  - escalation: conformance cannot be determined (missing artifacts, unresolvable ambiguity)
- The Findings table records the per-artifact judgment.
-->

- **verdict**: approved

## Conformance Findings

| Artifact | Conforms | Notes |
|----------|----------|-------|
| tasks.md | ✅ yes | 全 14 タスク（T-01〜T-14）のチェックボックスがすべて `[x]` に完了。AC も充足済み |
| design.md | ✅ yes | D1〜D9 の全設計判断が忠実に実装されている。SDK 採用・stateless transport・エラー変換・認証抽象化・mod-mcp 宣言のすべてに実装根拠あり |
| spec.md | ✅ yes | 全 SHALL/MUST 要件が実装済みかつテストで固定されている |
| request.md | ✅ yes | 全 8 受け入れ基準が充足。verification-result.md で 1702 tests pass・全フェーズ green を確認 |

---

## Judgment Item 1: Task Completeness (tasks.md)

全タスク（T-01〜T-14）のチェックボックスがすべて `[x]` にマークされていることを確認。

| Task | Title | Status |
|------|-------|--------|
| T-01 | mod-mcp モジュール宣言と architecture test 対応 | ✅ complete |
| T-02 | MCP route handler の骨格 | ✅ complete |
| T-03 | inquiries ツールの実装 | ✅ complete |
| T-04 | deals ツールの実装 | ✅ complete |
| T-05 | clients ツールの実装 | ✅ complete |
| T-06 | エラー変換ユーティリティの実装 | ✅ complete |
| T-07 | プロトコルレベル統合テスト | ✅ complete |
| T-08 | 認証テスト | ✅ complete |
| T-09 | 認可テスト | ✅ complete |
| T-10 | テナント分離テスト | ✅ complete |
| T-11 | 承認フロー連携テスト | ✅ complete |
| T-12 | 監査ログ記録テスト | ✅ complete |
| T-13 | 全体の品質ゲート確認 | ✅ complete |
| T-14 | updateClient / updateClientContact ユースケース新設と Server Action リファクタ | ✅ complete |

---

## Judgment Item 2: Design Decisions (design.md, D1–D9)

| Decision | Content | Implemented |
|----------|---------|-------------|
| D1 | `WebStandardStreamableHTTPServerTransport` を採用 | ✅ `route.ts` で import・使用。Node.js http 版は不使用 |
| D2 | stateless transport（`sessionIdGenerator: undefined`） | ✅ `route.ts`: `sessionIdGenerator: undefined` |
| D3 | リソース単位ツール + `operation` discriminated union（3 ツール・20 操作） | ✅ `inquiries`（5 操作）/ `deals`（6 操作）/ `clients`（9 操作） |
| D4 | usecase 共有アダプタ方式（Server Action の直接再利用なし） | ✅ 全ツールが `canPerform` + `checkRateLimit` + usecase 呼び出しを担う薄いアダプタ |
| D5 | `enableJsonResponse: true` | ✅ `route.ts`: `enableJsonResponse: true` |
| D6 | 認証インターフェース抽象化（`resolveBearer` → `authInfo.extra`） | ✅ `resolved.userId/organizationId/role` を `authInfo.extra` に格納し `handleRequest` に渡す |
| D7 | エラー変換統一ルール（スタックトレース漏洩なし） | ✅ `errors.ts` の `handleToolError` が汎用メッセージを返す。catch ブロックは ORM エラーを露出しない |
| D8 | per-request transport 生成・McpServer はシングルトン | ✅ モジュールレベルシングルトン `mcpServer`、transport はリクエストごとに生成 |
| D9 | `mod-mcp` モジュール宣言（modules.md + dependencies.md + rules.json） | ✅ `{#mod-mcp}` アンカー付きセクション追加。8 許可依存を列挙。rules.json に反映済み |

**付記:** `@modelcontextprotocol/sdk` が `package.json` の `dependencies`（行 20）に `"^1.29.0"` として明示追加済み（要件 1 の前提条件）。

---

## Judgment Item 3: Spec Requirements (spec.md, SHALL/MUST)

### Requirement: MCP エンドポイントは Streamable HTTP transport で JSON-RPC を処理する（SHALL）

- `/api/mcp` POST handler 実装済み（`route.ts`）
- `initialize` / `tools/list` / `tools/call` / `ping` は SDK が処理
- **Scenario: initialize → tools/list → tools/call**: `mcpProtocol.test.ts` TC-001a/b/c/d で runtime 検証済み
- **Scenario: POST 以外のメソッド**: GET handler が実装され stateless モードで 405 を返す

### Requirement: 無認証・無効トークンは 401 で拒否される（MUST）

- `resolveBearer()` が null を返した場合に HTTP 401 を返す
- **Scenario: Authorization ヘッダなし**: `mcpAuth.test.ts` TC-003 runtime 検証済み
- **Scenario: 無効 Bearer トークン**: TC-004 runtime 検証済み（cfp_ プレフィックスなし）
- **Scenario: 失効済みトークン**: `apiTokenResolver.ts` が `revokedAt` を検査（TC-005 静的検証）
- GET handler にも同等の Bearer 認証チェックを追加済み（TC-024 runtime 検証）

### Requirement: 権限外の操作は canPerform どおり拒否される（MUST）

- 全ツールで `canPerform(role, entity, operation)` を呼び出し
- **Scenario: member による inquiry.delete**: TC-006 で `canPerform("member", "inquiry", "delete") === false` を直接検証
- **Scenario: member による deal.create**: TC-007 で検証
- **Scenario: admin による inquiry.delete**: TC-008 で検証
- **Scenario: decline 権限なしロールによる却下**: TC-009 で検証
- **Scenario: decline 権限ありロールによる却下**: TC-010 で検証
- update_phase の closePhase / changePhase 切り替えも TC-033 で検証済み

### Requirement: 引合の案件化は承認ポリシー該当時に pending となる（MUST）

- `update_status` "converted" → `result.pendingApproval` チェック → `"承認リクエストを作成しました"` メッセージ
- **Scenario: 承認ポリシー該当時**: `mcpApproval.test.ts` TC-011 runtime 検証済み（usecase モックで pendingApproval を返し、ツール結果に承認待ちメッセージが含まれることを確認）
- **Scenario: 承認ポリシー非該当時**: TC-012 runtime 検証済み（引合データのみ返ること）

### Requirement: 全ツールはテナント分離を遵守する（MUST）

- `organizationId` は `authInfo.extra`（resolveBearer 解決値）から取得。リクエストボディから受け取らない
- **Scenario: テナント A トークンでテナント B の引合を操作**: `mcpTenantIsolation.test.ts` TC-049 runtime 検証済み（`listInquiries` が authInfo の organizationId で呼ばれることをモックで確認）・TC-050 でクロステナント混入なしを確認

### Requirement: 書き込み操作は監査ログに記録される（MUST）

- 全書き込み操作が usecase 経由で `recordAudit` を呼び出す
- `updateClient` / `updateClientContact` ユースケース新設済み。DB トランザクション内で `client.update` / `client_contact.update` アクションを記録
- `mcpAuditLog.test.ts` TC-014/015/016/046/047/048 で静的検証済み

### Requirement: レート制限が MCP 呼び出しにも適用される（MUST）

- 全書き込み操作に `checkRateLimit` を適用
- レート制限超過時は `toToolError("レート制限超過。しばらく待ってから再試行してください")` を返す

### Requirement: エラー変換はスタックトレース・内部 ID を漏らさない（MUST）

- `handleToolError` が `catch` 節で汎用メッセージ `"内部エラーが発生しました"` を返す
- Zod エラーはフィールド別メッセージに変換（`extractZodErrors`）
- `mcpErrors.test.ts` TC-038/039/040 で単体テスト実施済み

---

## Judgment Item 4: Acceptance Criteria (request.md)

| # | Acceptance Criterion | Status |
|---|---------------------|--------|
| 1 | `initialize` → `tools/list` → `tools/call` をテストで固定 | ✅ `mcpProtocol.test.ts` TC-001a/b/c/d（runtime）+ TC-025/026 静的検証 |
| 2 | 無認証・無効トークンが 401 をテストで固定 | ✅ `mcpAuth.test.ts` TC-003/004（runtime）+ 静的検証 |
| 3 | 権限外操作が canPerform どおり拒否されることをテストで固定 | ✅ `mcpAuthorization.test.ts` TC-006〜010/030/031/033 |
| 4 | 引合の案件化が承認ポリシー該当時 pending となることをテストで固定 | ✅ `mcpApproval.test.ts` TC-011/012（runtime） |
| 5 | 全ツールが他テナントデータに触れられないことをテストで固定 | ✅ `mcpTenantIsolation.test.ts` TC-049/050（runtime） |
| 6 | 書き込みツールの操作が監査ログに記録されることをテストで固定 | ✅ `mcpAuditLog.test.ts` TC-014/015/016/046/047/048 |
| 7 | 顧客更新が新設 usecase 経由で監査記録（MCP・Server Action 両経路）をテストで固定 | ✅ `mcpAuditLog.test.ts` TC-048 で Server Action 経路も検証。`mcpUpdateClientUsecases.test.ts` も存在 |
| 8 | `typecheck && test` green・`aozu check` exit 0・architecture test green | ✅ verification-result.md: build/typecheck/test/lint 全フェーズ pass（1702 pass, 0 fail） |

---

## Summary

実装は design.md・spec.md・request.md・tasks.md の全成果物に対して適合している。

### 特に良い点

- **パリティ構造の忠実な実現**: `canPerform` + `checkRateLimit` + usecase 共有 + `authInfo.extra` 経由の認証情報伝播が全 3 ツールで一貫。MCP 経由と Server Action 経由で挙動差・権限差が構造的に生じない。
- **T-14 リファクタの品質**: `updateClientAction` / `updateClientContactAction` が `updateClient` / `updateClientContact` usecase に正しく移行。監査ログ付きトランザクションが両経路で統一された。
- **エラー変換の安全性**: `handleToolError` が非 Error オブジェクト・null・Zod エラーを適切に処理し、スタックトレースを排除。
- **D6 認証インターフェース抽象化**: `resolveBearer` → `authInfo.extra` の流れが後続 OAuth 2.1 対応を壊さない構造。

### 残存事項（non-blocking、判定に影響しない）

1. **deals.ts: McpServer.connect() per-request** — design D8 の明示的選択。リスナー蓄積リスクは production 投入前のスモークテストで確認推奨（review-feedback-002 F-3、fix=no）。

### Verification Result

| Phase | Result |
|-------|--------|
| build | ✅ passed |
| typecheck | ✅ passed |
| test | ✅ passed（1702 pass, 0 fail） |
| lint | ✅ passed |
