# Tasks: MCP サーバー基盤とコア CRM ツール（引合・案件・顧客）

## T-01: mod-mcp モジュール宣言と architecture test 対応

- [x] `design/static/modules.md` に `mod-mcp` セクションを追加する:
  ```
  ## MCP {#mod-mcp}
  責務: MCP プロトコルの受付・ツール登録・Bearer 認証解決・認可チェック・ユースケース委譲。ビジネスロジックを持たない。
  実装: src/app/api/mcp/
  ```
- [x] `design/static/dependencies.md` のプレゼンテーション層セクションに以下の許可依存を追加する:
  - `[[mod-mcp]] -> [[mod-usecase]]`
  - `[[mod-mcp]] -> [[mod-auth]]`
  - `[[mod-mcp]] -> [[mod-authz]]`
  - `[[mod-mcp]] -> [[mod-model]]`
  - `[[mod-mcp]] -> [[mod-webhook]]`（`checkRateLimit` 用）
  - `[[mod-mcp]] -> [[mod-repo]]`（読み取り系の直接呼び出し）
  - `[[mod-mcp]] -> [[mod-appservice]]`（`validatePrimaryUniqueness` 等）
  - `[[mod-mcp]] -> [[mod-lib]]`（ユーティリティ参照）
- [x] `bunx aozu export rules --out design/rules.json` で rules.json を再生成する
- [x] `bun test src/__tests__/static/architecture.test.ts` で architecture test が green になることを確認する

**Acceptance Criteria**:
- `design/static/modules.md` に `{#mod-mcp}` アンカー付きのセクションが存在する
- `design/static/dependencies.md` に上記の許可依存がすべて列挙されている
- `design/rules.json` に `mod-mcp` のモジュール定義・パス・許可依存が反映されている
- `bunx aozu export rules --verify` が exit 0
- architecture test が green

## T-02: MCP route handler の骨格（エンドポイント・認証・transport 接続）

- [x] `src/app/api/mcp/route.ts` を作成する。`POST` handler を export する
- [x] route handler 内で `request.headers.get("Authorization")` を取得し、`resolveBearer` を呼び出す
- [x] `resolveBearer` が null を返した場合、HTTP 401 レスポンスを返す（`new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })`）
- [x] 認証成功時、`WebStandardStreamableHTTPServerTransport` を stateless モード（`sessionIdGenerator: undefined`）、`enableJsonResponse: true` で生成する
- [x] モジュールレベルのシングルトン `McpServer` を作成し、`serverInfo` に `{ name: "clearflow", version: "1.0.0" }` を設定する
- [x] transport を `McpServer` に connect し、`transport.handleRequest(request)` の結果を Response として返す
- [x] GET handler も export し、stateless モードでの適切なレスポンス（SDK が 405 を返す）を処理する
- [x] 認証で解決した `{ userId, organizationId, role }` を transport の `handleRequest` に `authInfo` として渡し、ツールハンドラ内で参照できるようにする。SDK の `HandleRequestOptions.authInfo` を使用する

**Acceptance Criteria**:
- `/api/mcp` に POST できる route handler が存在する
- Authorization ヘッダなし → 401
- 無効トークン → 401
- 有効トークンで `initialize` JSON-RPC を送信 → 正常な initialize レスポンス

## T-03: inquiries ツールの実装

- [x] `src/app/api/mcp/tools/inquiries.ts` を作成する
- [x] `registerInquiriesTools(server: McpServer)` 関数を export する
- [x] `inquiries` ツールを `server.registerTool` で登録する。`inputSchema` に operation の discriminated union を定義する:
  - `operation: "list"` — フィルタ引数（status, source）はオプション
  - `operation: "create"` — createInquirySchema 相当のフィールド（clientId, newClientName, title, description, contactNote, source, assigneeId, budget, timeline）
  - `operation: "update"` — inquiryId + updateInquirySchema 相当のフィールド
  - `operation: "update_status"` — inquiryId + newStatus（"new" | "converted" | "declined"）
  - `operation: "delete"` — inquiryId
- [x] 各 operation のハンドラ内で:
  1. `extra.authInfo` から `userId` / `organizationId` / `role` を取得する
  2. 適切な `canPerform` チェックを行う（Server Action と同じ entity + operation の組み合わせ）
  3. 書き込み操作には `checkRateLimit` を適用する
  4. 対応する usecase を呼び出す（`createInquiry`, `updateInquiry`, `updateInquiryStatus`, `deleteInquiry`, `listInquiries`）
  5. Result → MCP ツール結果に変換する
- [x] `update_status` で `newStatus: "converted"` の場合:
  - `canPerform(role, "inquiry", "convert")` で認可チェック
  - usecase の結果に `pendingApproval` がある場合、ツール結果のテキストに承認待ちである旨を含める
- [x] `update_status` で `newStatus: "declined"` の場合:
  - `canPerform(role, "inquiry", "decline")` で認可チェック
- [x] `create` で `newClientName` が指定され `clientId` が未指定の場合、Server Action と同様に `createClient` usecase を先に呼び出して顧客を作成する
- [x] route.ts の McpServer 初期化部分で `registerInquiriesTools(server)` を呼び出す

**Acceptance Criteria**:
- `tools/list` に `inquiries` ツールが含まれる
- list 操作で引合一覧が返る（organizationId でフィルタ済み）
- create 操作で引合が作成され、成功結果が返る
- update_status で converted → 承認ポリシー該当時に pending 情報がツール結果に含まれる
- delete 操作で member ロールの場合 isError: true が返る
- 全操作で他テナントのデータにアクセスできない

## T-04: deals ツールの実装

- [x] `src/app/api/mcp/tools/deals.ts` を作成する
- [x] `registerDealsTools(server: McpServer)` 関数を export する
- [x] `deals` ツールを登録する。inputSchema:
  - `operation: "list"` — フィルタ引数（phase, clientId）はオプション
  - `operation: "get"` — dealId（詳細 + 担当者 + タイムライン表示）
  - `operation: "create"` — createDealSchema 相当のフィールド（inquiryId, clientId, title, description, estimatedAmount, estimatedStartDate, estimatedEndDate, contractType, assigneeId, technicalLeadId, notes）
  - `operation: "update"` — dealId + updateDealSchema 相当のフィールド
  - `operation: "update_phase"` — dealId + newPhase
  - `operation: "delete"` — dealId
- [x] 各 operation のハンドラで canPerform チェック:
  - list/get: `canPerform(role, "deal", "list")` / `"view"`
  - create: `canPerform(role, "deal", "create")`
  - update: `canPerform(role, "deal", "edit")`
  - update_phase: terminal phase（won/lost）なら `"closePhase"`、それ以外は `"changePhase"`
  - delete: `canPerform(role, "deal", "delete")`
- [x] `get` 操作の実装:
  - `getDeal` usecase で案件詳細を取得
  - `listDealContacts` で担当者一覧を取得
  - `getDealActivity` でタイムライン（厳選表示）を取得
  - 結果を統合して返す
- [x] `create` で `inquiryId` も `clientId` もない場合のエラーハンドリング（Server Action と同様）
- [x] 書き込み操作に `checkRateLimit` を適用する
- [x] route.ts で `registerDealsTools(server)` を呼び出す

**Acceptance Criteria**:
- `tools/list` に `deals` ツールが含まれる
- get 操作で案件詳細 + 担当者 + タイムラインが返る
- create 操作で member ロールの場合 isError: true が返る（deal.create は admin/manager のみ）
- update_phase で won/lost への遷移は closePhase 権限が必要
- 全操作でテナント分離が担保される

## T-05: clients ツールの実装

- [x] `src/app/api/mcp/tools/clients.ts` を作成する
- [x] `registerClientsTools(server: McpServer)` 関数を export する
- [x] `clients` ツールを登録する。inputSchema:
  - `operation: "list"` — フィルタなし
  - `operation: "get"` — clientId（担当者一覧を含む）
  - `operation: "create"` — createClientSchema 相当のフィールド（name, industry, size, address, notes, contacts）
  - `operation: "update"` — clientId + updateClientSchema 相当のフィールド
  - `operation: "add_contact"` — clientId + addContactSchema 相当のフィールド（name, department, position, email, phone, isPrimary）
  - `operation: "update_contact"` — clientId + contactId + updateContactSchema 相当のフィールド
  - `operation: "delete_contact"` — clientId + contactId
  - `operation: "add_deal_contact"` — dealId + contactId + role（key_person / decision_maker / technical / other）
  - `operation: "remove_deal_contact"` — dealId + contactId
- [x] 各 operation のハンドラで canPerform チェック:
  - list/get: `canPerform(role, "client", "list")` / `"view"`
  - create: `canPerform(role, "client", "create")`
  - update: `canPerform(role, "client", "edit")`
  - add_contact: `canPerform(role, "client", "addContact")`
  - update_contact: `canPerform(role, "client", "editContact")`
  - delete_contact: `canPerform(role, "client", "deleteContact")`
  - add_deal_contact: `canPerform(role, "deal", "manageContacts")`
  - remove_deal_contact: `canPerform(role, "deal", "manageContacts")`
- [x] `get` 操作で `getClient` + `listClientContacts` を呼び出し、担当者一覧を含めて返す
- [x] `update_contact` で `validatePrimaryUniqueness` を呼び出す（Server Action と同様）
- [x] `update` で `updateClient` ユースケースを呼び出す（T-14 で新設するユースケース。事前に T-14 を完了すること）
- [x] 書き込み操作に `checkRateLimit` を適用する
- [x] route.ts で `registerClientsTools(server)` を呼び出す

**Acceptance Criteria**:
- `tools/list` に `clients` ツールが含まれる
- get 操作で顧客 + 担当者一覧が返る
- `update` 操作が `updateClient` ユースケース経由で動作し、監査ログ（`client.update`）が記録される
- `update_contact` 操作が `updateClientContact` ユースケース経由で動作し、監査ログ（`client_contact.update`）が記録される
- add_contact / update_contact / delete_contact が正しく動作する
- add_deal_contact / remove_deal_contact が正しく動作する
- delete_contact で member ロールの場合 isError: true が返る（client.deleteContact は admin/manager のみ）
- update_contact で isPrimary の一意性検証が行われる

## T-06: エラー変換ユーティリティの実装

- [x] `src/app/api/mcp/errors.ts` を作成する
- [x] `toToolError(message: string): CallToolResult` ヘルパーを実装する。`{ isError: true, content: [{ type: "text", text: message }] }` を返す
- [x] `toToolSuccess(data: unknown): CallToolResult` ヘルパーを実装する。`{ content: [{ type: "text", text: JSON.stringify(data, null, 2) }] }` を返す
- [x] `handleToolError(error: unknown): CallToolResult` ヘルパーを実装する。予期しない例外を安全なエラーメッセージに変換する。スタックトレースを含めない
- [x] 全ツールハンドラからこれらのヘルパーを使用する

**Acceptance Criteria**:
- エラー変換ヘルパーが存在し、全ツールから使用されている
- スタックトレース・内部 ID がクライアントに漏れない
- Zod 検証エラーはフィールド別メッセージに変換される

## T-07: プロトコルレベル統合テスト

- [x] `src/__tests__/mcp/mcpProtocol.test.ts` を作成する
- [x] テスト用に `McpServer` と `WebStandardStreamableHTTPServerTransport` を直接使用する（route handler を経由しない transport レベルのテスト）
- [x] テストケース: `initialize` → `tools/list` → `tools/call` の一連の JSON-RPC 交換
  - initialize レスポンスに serverInfo が含まれる
  - tools/list に `inquiries` / `deals` / `clients` の 3 ツールが含まれる
  - tools/call で `inquiries` の list 操作が実行できる
- [x] テストケース: 未知のツール名での tools/call がエラーを返す
- [x] テストケース: 不正な JSON-RPC メッセージが適切なエラーを返す

**Acceptance Criteria**:
- initialize → tools/list → tools/call の一連の交換がテストで固定される
- 登録済みツール数が 3 であることが検証される

## T-08: 認証テスト

- [x] `src/__tests__/mcp/mcpAuth.test.ts` を作成する
- [x] route handler（`src/app/api/mcp/route.ts`）の POST 関数を直接 import してテストする、または route handler と同等のロジックを抽出した関数をテストする
- [x] テストケース: Authorization ヘッダなし → 401
- [x] テストケース: `Authorization: Bearer invalid` → 401
- [x] テストケース: 失効済みトークン → 401
- [x] テストケース: 無効化されたユーザーのトークン → 401
- [x] テストケース: 有効なトークン → 200（正常な JSON-RPC レスポンス）
- [x] `resolveBearer` のモックを使用して、認証ロジックを分離してテストする

**Acceptance Criteria**:
- 無認証・無効トークンの 401 レスポンスがテストで固定される
- 有効トークンでの認証成功がテストで固定される

## T-09: 認可テスト

- [x] `src/__tests__/mcp/mcpAuthorization.test.ts` を作成する
- [x] 各ロール（admin / manager / member / finance）× 各操作の組み合わせで canPerform の結果が Server Action と一致することをテストする
- [x] テストケース: member による inquiry.delete → isError
- [x] テストケース: member による deal.create → isError
- [x] テストケース: member による client.deleteContact → isError
- [x] テストケース: admin による inquiry.delete → 成功
- [x] テストケース: manager による deal.create → 成功
- [x] テストケース: member による inquiry.update_status → declined → isError（`canPerform(role, "inquiry", "decline")` により拒否）
- [x] テストケース: admin による inquiry.update_status → declined → 成功（decline 権限あり）

**Acceptance Criteria**:
- 権限マトリクスに基づく拒否がテストで固定される
- Server Action と同一の認可判定が行われることが検証される
- update_status の declined パスで decline 権限チェックが機能することが検証される

## T-10: テナント分離テスト

- [x] `src/__tests__/mcp/mcpTenantIsolation.test.ts` を作成する
- [x] テストケース: テナント A のトークンでテナント B の引合を update → エラーまたは not found
- [x] テストケース: テナント A のトークンでテナント B の案件を get → null / not found
- [x] テストケース: テナント A の list 操作でテナント B のデータが含まれない
- [x] usecase / repository のモックを使用して、organizationId が一貫して渡されることを検証する

**Acceptance Criteria**:
- 他テナントのデータに触れられないことがテストで固定される

## T-11: 承認フロー連携テスト

- [x] `src/__tests__/mcp/mcpApproval.test.ts` を作成する
- [x] テストケース: 承認ポリシー該当時に inquiries の update_status → converted でツール結果に承認待ち情報が含まれる
- [x] テストケース: 承認ポリシー非該当時に inquiries の update_status → converted で案件が生成される
- [x] `updateInquiryStatus` usecase のモックを使用して、pendingApproval の有無による結果分岐をテストする
- [x] テストケース: inquiries の update_status → declined で引合のステータスが declined に変わる（`updateInquiryStatus` が `declined` 値で呼ばれることをモック検証）

**Acceptance Criteria**:
- 承認ポリシー該当時の pending 状態がツール結果に明示されることがテストで固定される
- declined ステータス変更が正常に処理されることがテストで固定される

## T-12: 監査ログ記録テスト

- [x] `src/__tests__/mcp/mcpAuditLog.test.ts` を作成する
- [x] テストケース: MCP 経由の inquiries create → 監査ログ（inquiry.create）が記録される
- [x] テストケース: MCP 経由の deals update_phase → 監査ログ（deal.updatePhase）が記録される
- [x] テストケース: MCP 経由の clients add_contact → 監査ログ（client_contact.create）が記録される
- [x] テストケース: MCP 経由の clients update → 監査ログ（client.update）が記録される（`updateClient` usecase 呼び出しのモック検証）
- [x] テストケース: MCP 経由の clients update_contact → 監査ログ（client_contact.update）が記録される（`updateClientContact` usecase 呼び出しのモック検証）
- [x] テストケース: 既存 Server Action（`updateClientAction`）経由の clients update → 監査ログ（client.update）が記録される（T-14 のリファクタ後に同一 usecase を通ることを確認）
- [x] usecase 呼び出しが行われることのモック検証で、監査記録が usecase 内で行われることを確認する

**Acceptance Criteria**:
- 書き込みツールの操作が監査ログに記録されることがテストで固定される
- `clients update` / `clients update_contact` の MCP 経路・Server Action 経路の両方で監査ログ記録がテストで固定される

## T-13: 全体の品質ゲート確認

- [x] `bun run typecheck` が green（型エラーなし）
- [x] `bun test` が green（既存テスト無変更で green + 新規テスト green）
- [x] `bunx aozu check` が exit 0
- [x] architecture test が green（`mod-mcp` 宣言込み）

**Acceptance Criteria**:
- `typecheck && test` が green
- `aozu check` exit 0
- architecture test green（mod-mcp 宣言込み）
- 既存テストが変更されていない

## T-14: `updateClient` / `updateClientContact` ユースケースの新設と Server Action リファクタ

> **前提タスク**: T-05 の `clients update` / `update_contact` 操作で呼び出すユースケースを提供する。T-05 実装の前に完了すること。

- [x] `src/application/usecases/updateClient.ts` を作成する。`updateClient` 関数を export する
  - 引数: `{ organizationId, clientId, data: UpdateClientInput, userId }` 相当
  - `clientRepository.update` を呼び出して顧客レコードを更新する
  - 監査ログ（アクション: `client.update`、対象エンティティ: client、entityId: clientId）を記録する
  - 他ユースケース（`updateDeal` 等）のパターンに倣って実装する
  - Result 型（`{ ok: true, client }` / `{ ok: false, reason }`）を返す
- [x] `src/application/usecases/updateClientContact.ts` を作成する。`updateClientContact` 関数を export する
  - 引数: `{ organizationId, clientId, contactId, data: UpdateClientContactInput, userId }` 相当
  - `clientRepository.updateContact` を呼び出して担当者レコードを更新する
  - 監査ログ（アクション: `client_contact.update`、対象エンティティ: client_contact、entityId: contactId）を記録する
  - Result 型を返す
- [x] `src/app/actions/clients.ts` の `updateClientAction` を `updateClient` ユースケース経由に変更する（既存の `clientRepository.update` 直接呼び出しを置き換える）
- [x] `src/app/actions/clients.ts` の `updateClientContactAction` を `updateClientContact` ユースケース経由に変更する（既存の `clientRepository.updateContact` 直接呼び出しを置き換える）

**Acceptance Criteria**:
- `src/application/usecases/updateClient.ts` が存在し、監査ログ記録ロジックを含む
- `src/application/usecases/updateClientContact.ts` が存在し、監査ログ記録ロジックを含む
- `updateClientAction` が `updateClient` ユースケースを呼び出す（直接 `clientRepository.update` を呼ばない）
- `updateClientContactAction` が `updateClientContact` ユースケースを呼び出す（直接 `clientRepository.updateContact` を呼ばない）
- 既存テストが変更なしで green を維持する
