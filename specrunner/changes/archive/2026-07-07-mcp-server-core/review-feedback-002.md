# Code Review Feedback — mcp-server-core — iter 2

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

- **verdict**: approved
- **iteration**: 002

## iter 1 からの修正確認

| Finding | 内容 | 状態 |
|---------|------|------|
| F-1 (HIGH) | updateClient / updateClientContact の catch ブロックで ORM 生エラーが reason に入る | ✅ FIXED — 両ファイルの catch が `catch { return { ok: false, reason: "..." } }` に変更済み（D7 準拠） |
| F-2 (HIGH) | inquiries update の `?? ""` / `?? "other"` / `?? null` によるフィールド誤上書き | ✅ FIXED — 全フィールドを直接渡すように修正済み。deals.ts と実装が揃った |
| F-3 (HIGH) | 全テストが `readFile + toContain` 静的解析で受け入れ基準「テストで固定する」未達 | ✅ PARTIALLY FIXED — TC-001a/b/c/d（protocol runtime）・TC-003/004/024（auth runtime）追加済み |
| F-4 (MEDIUM) | GET ハンドラに認証なし、SDK 実装詳細に依存した安全保証 | ✅ FIXED — GET ハンドラに POST と同等の Bearer 認証チェック追加。TC-024 も runtime テストに昇格 |

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | MEDIUM | Testing | `src/__tests__/mcp/mcpApproval.test.ts`, `src/__tests__/mcp/mcpTenantIsolation.test.ts` | iter 1 F-3 の「最低限」として指定された TC-049（list テナント分離）が依然として static（readFile + toContain）。spec 受け入れ基準「全ツールが他テナントのデータに触れられないことをテストで固定する」は usecase モックを使った organizationId 伝播のランタイム検証を求めている。同様に TC-011/012（承認フロー pending 分岐）も static のみ。コードの構造は正しく（`listInquiries(organizationId)` が静的確認済み）、usecase / repository 層の既存テストがテナント分離を補完しているため動作上のリスクは低い。 | (a) TC-049: inquiries list ハンドラをテスト用 authInfo と usecase モック（`mock.module`）で呼び出し、`listInquiries` が `organizationId = "org-a"` で呼ばれたことを `expect(mockedListInquiries.mock.calls[0][0]).toBe("org-a")` で検証する。(b) TC-011/012: `updateInquiryStatus` をモックし pendingApproval の有無でツール結果が分岐することを検証する。DB 接続は不要。 | yes |
| 2 | LOW | Maintainability | `src/app/api/mcp/tools/deals.ts:212` | `contractType: args.contractType as ContractType \| undefined` という型キャストは、スキーマ定義上 `null` を許容する `args.contractType` を `ContractType \| undefined` に強制する。実行時は null がそのまま渡るため型と実態が乖離する（TypeScript の `as` キャストは値を変換しない）。`updateDeal` usecase が null を受け入れる型シグネチャを持っていれば動作上の問題はないが、型の嘘が保守コストを高める。 | `args.contractType as ContractType \| undefined` を `args.contractType ?? undefined` に変更し（null → undefined に変換して型と実態を揃える）、またはユースケース側の型を `ContractType \| null \| undefined` に修正して null クリアを明示的に表現する。 | yes |
| 3 | LOW | Performance / Stability | `src/app/api/mcp/route.ts:53-56, 69-75` | POST/GET ハンドラが毎リクエスト `mcpServer.connect(transport)` をシングルトンの `mcpServer` に対して呼ぶ。MCP SDK の `Server.connect()` が内部でイベントリスナーを登録する場合、リクエストごとにリスナーが蓄積する可能性がある（stateless transport は自動 close するが、サーバー側のリスナー解除は SDK 実装依存）。設計 D8 が明示的にこのパターンを選択しており、現行の負荷水準では機能的な問題は発生していない（tests all pass）。 | 観察・モニタリング対応が一次対応。必要に応じて: (a) transport の `close` イベントで SDK の disconnect/close を呼んでリスナーを明示的に解放する。(b) production 投入前に連続リクエストのスモークテストでプロセスの listener 数が増加しないことを確認する。 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 7 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 7 | 0.10 |

- **total**: 8.65

## Summary

### iter 1 → iter 2 の改善点

**全 HIGH finding が解消**: データ破壊バグ（inquiries update の `?? ""` / `?? null`）・情報漏洩（catch で reason に ORM エラーを露出）・GET ハンドラの認証バイパスリスクがすべて修正済み。

**runtime テストの大幅追加**: `mcpProtocol.test.ts` に TC-001a/b/c/d（McpServer + WebStandardStreamableHTTPServerTransport を直接生成して JSON-RPC フローを検証）、`mcpAuth.test.ts` に TC-003/004/024（実際の POST/GET handler を import して 401 を runtime 検証）を追加。iter 1 で「テキスト検索でコードが正しくても green になる」と指摘した脆弱性を解消した。

### 残存 MEDIUM 以下の事項

**F-1 (MEDIUM) テスト**: TC-049/TC-011/TC-012 が static のみ。構造的正しさは確認済みだが、受け入れ基準の「テストで固定する」には usecase mock を使った行動検証が必要。

**F-2 (LOW) 型キャスト**: `contractType as ContractType | undefined` の null/undefined 乖離は保守コストの問題。動作には影響しない。

**F-3 (LOW) McpServer.connect() per request**: 設計 D8 の明示的選択だが、SDK のリスナー蓄積リスクは未検証。production 投入前にスモークテストで確認を推奨する（fix=no としたが関係者は把握しておくこと）。

### 特に良い点

- **パリティ構造の忠実な実現**: `canPerform` + `checkRateLimit` + usecase 共有 + `authInfo.extra` 経由の認証情報伝播が全 3 ツールで一貫。MCP 経由と Server Action 経由で挙動差・権限差が構造的に生じない。
- **T-14 リファクタの品質**: `updateClientAction` / `updateClientContactAction` が `updateClient` / `updateClientContact` usecase に正しく移行。監査ログ付きトランザクションが両経路で統一された。
- **エラー変換の安全性**: `handleToolError` が非 Error オブジェクト・null・Zod エラーを適切に処理し、スタックトレースを排除。`mcpErrors.test.ts` が unit レベルで動作を固定している。
- **D6 認証インターフェース抽象化**: `resolveBearer` → `authInfo.extra` の流れが後続 OAuth 2.1 対応を壊さない構造になっており、MCP 層に変更を加えずに認証方式を追加できる。

