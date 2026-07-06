# Test Cases: MCP サーバー基盤とコア CRM ツール（引合・案件・顧客）

<!-- FORMAT REQUIREMENTS:
Test Case heading format: `### TC-{NNN}: {Name}` (3-digit zero-padded, e.g. TC-001)

Required fields per test case:
  **Category**: unit | integration | manual
  **Priority**: must | should | could
  **Source**: reference to spec Scenario (spec.md > Requirement: <name> > Scenario: <name>) or design.md / tasks.md section

GIVEN/WHEN/THEN structure (mixed format — depends on TC type):
  Scenario 由来 TC (Source = spec.md > Requirement: <name> > Scenario: <name>):
    GWT は記述しない。Source 参照のみ。behavior の正典は spec の Scenario。
  非 Scenario 由来 TC (Source = design.md or tasks.md section):
    GWT は必須:
    **GIVEN** <preconditions>
    **WHEN** <action>
    **THEN** <expected result>

Category determination:
  unit        — pure logic, validation, helper functions (automated)
  integration — DB operations, API endpoints, multi-module interaction (automated)
  manual      — UI/UX confirmation, visual verification, build artifact check (not automated)

Priority determination:
  must   — core functionality; if broken, the feature does not work
  should — important but core still works; edge cases, error handling
  could  — nice to have; performance, UX details

Summary section MUST appear immediately after the title with ALL 4 items:
  ## Summary
  - **Total**: {count} cases
  - **Automated** (unit/integration): {count}
  - **Manual**: {count}
  - **Priority**: must: {count}, should: {count}, could: {count}

Result section MUST appear at the very end as a YAML code block:
  ## Result
  ```yaml
  result: completed | partial | failed
  total: {count}
  automated: {count}
  manual: {count}
  must: {count}
  should: {count}
  could: {count}
  blocked_reasons: []
  ```

  result determination:
    completed — all testable behaviors are documented
    partial   — some cases could not be derived due to design ambiguity
    failed    — spec is absent AND design.md / tasks.md are also missing
-->

## Summary

- **Total**: 53 cases
- **Automated** (unit/integration): 47
- **Manual**: 6
- **Priority**: must: 44, should: 9, could: 0

---

## プロトコル・エンドポイント

### TC-001: initialize → tools/list → tools/call の一連の交換

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: MCP エンドポイントは Streamable HTTP transport で JSON-RPC メッセージを処理する > Scenario: initialize → tools/list → tools/call の一連の交換

### TC-002: POST 以外のメソッドは適切に処理される

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: MCP エンドポイントは Streamable HTTP transport で JSON-RPC メッセージを処理する > Scenario: POST 以外のメソッドは適切に処理される

### TC-003: Authorization ヘッダなしのリクエスト

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 無認証・無効トークンのリクエストは 401 で拒否される > Scenario: Authorization ヘッダなしのリクエスト

### TC-004: 無効な Bearer トークン

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 無認証・無効トークンのリクエストは 401 で拒否される > Scenario: 無効な Bearer トークン

### TC-005: 失効済みトークン

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 無認証・無効トークンのリクエストは 401 で拒否される > Scenario: 失効済みトークン

### TC-024: GET リクエストは 405 を返す

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-02: MCP route handler の骨格

**GIVEN** MCP エンドポイント `/api/mcp`
**WHEN** GET リクエストを送信する
**THEN** HTTP 405 が返る（SDK が stateless モードで処理する）

### TC-025: 有効トークンでの initialize レスポンスに serverInfo が含まれる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-02: MCP route handler の骨格 / T-07: プロトコルレベル統合テスト

**GIVEN** 有効な Bearer トークン（`cfp_...` 形式）
**WHEN** `/api/mcp` に `initialize` JSON-RPC メッセージを POST する
**THEN** `{ name: "clearflow", version: "1.0.0" }` を含む serverInfo が JSON-RPC レスポンスに含まれる

### TC-026: tools/list に 3 ツールが含まれる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-07: プロトコルレベル統合テスト

**GIVEN** 有効な Bearer トークンを持つ MCP クライアント、`McpServer` が初期化済み（inquiries / deals / clients 登録済み）
**WHEN** `tools/list` JSON-RPC メッセージを送信する
**THEN** `inquiries` / `deals` / `clients` の 3 ツールがリストに含まれ、総ツール数が 3 である

### TC-027: 未知のツール名での tools/call がエラーを返す

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-07: プロトコルレベル統合テスト

**GIVEN** 有効な Bearer トークン
**WHEN** 登録されていないツール名（例: `nonexistent_tool`）で `tools/call` を送信する
**THEN** エラーを示す JSON-RPC レスポンスが返る

### TC-028: 不正な JSON-RPC メッセージが適切なエラーを返す

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-07: プロトコルレベル統合テスト

**GIVEN** 有効な Bearer トークン
**WHEN** JSON-RPC 形式でない不正なボディ（例: `{ "hello": "world" }`）を POST する
**THEN** JSON-RPC エラーレスポンスが返り、HTTP ステータスは 4xx

### TC-029: 無効化されたユーザーのトークン → 401

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-08: 認証テスト

**GIVEN** アカウントが無効化されたユーザーのトークン（`resolveBearer` が null を返す状態）
**WHEN** `/api/mcp` に POST する
**THEN** HTTP 401 Unauthorized が返る

---

## 認可・権限

### TC-006: member ロールによる引合の削除

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 権限外の操作は canPerform どおり拒否される > Scenario: member ロールによる引合の削除

### TC-007: member ロールによる案件の作成

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 権限外の操作は canPerform どおり拒否される > Scenario: member ロールによる案件の作成

### TC-008: admin ロールによる引合の削除は成功する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 権限外の操作は canPerform どおり拒否される > Scenario: admin ロールによる引合の削除は成功する

### TC-009: decline 権限を持たないロールによる引合の却下

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 権限外の操作は canPerform どおり拒否される > Scenario: decline 権限を持たないロールによる引合の却下

### TC-010: decline 権限を持つロールによる引合の却下は成功する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 権限外の操作は canPerform どおり拒否される > Scenario: decline 権限を持つロールによる引合の却下は成功する

### TC-030: member による client.deleteContact → isError

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-09: 認可テスト

**GIVEN** role が `member` のユーザーのトークン、存在する clientId と contactId
**WHEN** `clients` ツールを `operation: "delete_contact"` で呼び出す
**THEN** `isError: true` の結果が返り、担当者は削除されない（`canPerform` で `client.deleteContact` は admin/manager のみ）

### TC-031: manager による deal.create → 成功

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-09: 認可テスト

**GIVEN** role が `manager` のユーザーのトークン、必要な作成入力データ（inquiryId または clientId を含む）
**WHEN** `deals` ツールを `operation: "create"` で呼び出す
**THEN** 成功結果が返り、案件が作成される

### TC-033: deals update_phase で won/lost への遷移に closePhase 権限が必要

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-04: deals ツールの実装

**GIVEN** role が `member` のユーザーのトークン、存在する dealId
**WHEN** `deals` ツールを `operation: "update_phase"` / `newPhase: "won"` で呼び出す
**THEN** `isError: true` の結果が返る（`canPerform(role, "deal", "closePhase")` が拒否する）

### TC-053: inquiries update_status → declined の usecase 呼び出し確認

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-11: 承認フロー連携テスト

**GIVEN** role が `admin` のユーザーのトークン、存在する引合（`updateInquiryStatus` usecase をモック）
**WHEN** `inquiries` ツールを `operation: "update_status"` / `newStatus: "declined"` で呼び出す
**THEN** `updateInquiryStatus` usecase が `"declined"` 値で呼び出されることがモック検証で確認される

---

## 承認フロー連携

### TC-011: 承認ポリシー該当時の案件化

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 引合の案件化（update_status → converted）は承認ポリシー該当時に pending となる > Scenario: 承認ポリシー該当時の案件化

### TC-012: 承認ポリシー非該当時の案件化

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 引合の案件化（update_status → converted）は承認ポリシー該当時に pending となる > Scenario: 承認ポリシー非該当時の案件化

---

## テナント分離

### TC-013: テナント A のトークンでテナント B の引合を操作

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 全ツールはテナント分離を遵守する > Scenario: テナント A のトークンでテナント B の引合を操作

### TC-049: テナント A の list 操作でテナント B のデータが含まれない

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-10: テナント分離テスト

**GIVEN** テナント A のユーザーのトークン、テナント B のデータが DB に存在する（usecase / repository モック）
**WHEN** `inquiries` / `deals` / `clients` ツールでそれぞれ `operation: "list"` を実行する
**THEN** レスポンスにテナント B のデータが含まれず、全エンティティのテナントがトークンの `organizationId` に一致する

### TC-050: テナント A のトークンでテナント B の案件を get → not found

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-10: テナント分離テスト

**GIVEN** テナント A のユーザーのトークン、テナント B に属する dealId
**WHEN** `deals` ツールを `operation: "get"` / 当該 dealId で呼び出す
**THEN** `isError: true` の結果または not found エラーが返る。テナント B のデータは返却されない

---

## 監査ログ記録

### TC-014: MCP 経由の引合作成が監査ログに記録される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 書き込み操作は監査ログに記録される > Scenario: MCP 経由の引合作成が監査ログに記録される

### TC-015: MCP 経由の顧客更新が監査ログに記録される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 書き込み操作は監査ログに記録される > Scenario: MCP 経由の顧客更新が監査ログに記録される

### TC-016: MCP 経由の顧客担当者更新が監査ログに記録される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 書き込み操作は監査ログに記録される > Scenario: MCP 経由の顧客担当者更新が監査ログに記録される

### TC-046: MCP 経由の deals update_phase が監査ログに記録される

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-12: 監査ログ記録テスト

**GIVEN** 有効なトークン（admin）、存在する dealId（`updateDealPhase` usecase をモック）
**WHEN** `deals` ツールを `operation: "update_phase"` / 非 terminal フェーズで呼び出す
**THEN** `deal.updatePhase` アクションの監査ログが usecase 経由で記録される（usecase 呼び出しのモック検証）

### TC-047: MCP 経由の clients add_contact が監査ログに記録される

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-12: 監査ログ記録テスト

**GIVEN** 有効なトークン（admin）、存在する clientId（`addClientContact` usecase をモック）
**WHEN** `clients` ツールを `operation: "add_contact"` で呼び出す
**THEN** `client_contact.create` アクションの監査ログが usecase 経由で記録される（usecase 呼び出しのモック検証）

### TC-048: 既存 Server Action（updateClientAction）経由の update が同一ユースケースを通る

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-12: 監査ログ記録テスト / T-14: updateClient / updateClientContact ユースケースの新設と Server Action リファクタ

**GIVEN** T-14 リファクタ後の `updateClientAction`（`updateClient` usecase をモック）
**WHEN** `updateClientAction` を呼び出す
**THEN** `updateClient` ユースケースが呼び出される。`clientRepository.update` を直接呼ばないことを確認する

---

## レート制限・エラー変換

### TC-017: レート制限超過

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: レート制限が MCP 呼び出しにも適用される > Scenario: レート制限超過

### TC-018: 予期しない例外の処理

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: エラー変換はスタックトレース・内部 ID を漏らさない > Scenario: 予期しない例外の処理

### TC-038: toToolError が正しい MCP ツール結果を返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-06: エラー変換ユーティリティの実装

**GIVEN** エラーメッセージ文字列（例: `"権限がありません"`）
**WHEN** `toToolError(message)` を呼び出す
**THEN** `{ isError: true, content: [{ type: "text", text: message }] }` が返る

### TC-039: toToolSuccess が正しい MCP ツール結果を返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-06: エラー変換ユーティリティの実装

**GIVEN** 任意のデータオブジェクト（例: `{ id: "123", title: "引合A" }`）
**WHEN** `toToolSuccess(data)` を呼び出す
**THEN** `{ content: [{ type: "text", text: JSON.stringify(data, null, 2) }] }` が返る

### TC-040: handleToolError がスタックトレースを含まない安全なエラーを返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-06: エラー変換ユーティリティの実装

**GIVEN** スタックトレースを持つ `Error` オブジェクト（例: `new Error("DB connection failed")` with stack）
**WHEN** `handleToolError(error)` を呼び出す
**THEN** `isError: true` の結果が返り、`content[0].text` にスタックトレース・ファイルパス・DB エラー詳細が含まれない

### TC-041: Zod 検証エラーがフィールド別メッセージに変換される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-06: エラー変換ユーティリティの実装

**GIVEN** 必須フィールドが欠けた入力（例: `operation: "create"` で `title` フィールドが未指定）
**WHEN** ツールハンドラ内の Zod スキーマ検証が実行される
**THEN** `isError: true` でフィールド名と検証エラーメッセージを含む結果が返る

---

## inquiries ツール

### TC-037: inquiries create で newClientName のみ指定した場合に顧客も作成される

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-03: inquiries ツールの実装

**GIVEN** 有効なトークン（admin）、`clientId` 未指定・`newClientName` 指定の create 入力（`createClient` usecase をモック）
**WHEN** `inquiries` ツールを `operation: "create"` で呼び出す
**THEN** `createClient` usecase が呼ばれた後に `createInquiry` usecase が呼ばれ、成功結果が返る

---

## deals ツール

### TC-032: deals get で案件詳細 + 担当者 + タイムラインが返る

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-04: deals ツールの実装

**GIVEN** 有効なトークン（admin）、存在する dealId（`getDeal` / `listDealContacts` / `getDealActivity` をモック）
**WHEN** `deals` ツールを `operation: "get"` / 当該 dealId で呼び出す
**THEN** 案件詳細・担当者一覧・タイムライン（厳選表示）を統合した成功結果が返る

### TC-034: deals create で inquiryId も clientId もない場合のエラー

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-04: deals ツールの実装

**GIVEN** 有効なトークン（admin）、`inquiryId` も `clientId` も指定しない create 入力
**WHEN** `deals` ツールを `operation: "create"` で呼び出す
**THEN** `isError: true` の結果が返る（Server Action と同様のバリデーションエラー）

---

## clients ツール

### TC-035: clients get で顧客 + 担当者一覧が返る

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-05: clients ツールの実装

**GIVEN** 有効なトークン（admin）、存在する clientId（`getClient` / `listClientContacts` をモック）
**WHEN** `clients` ツールを `operation: "get"` / 当該 clientId で呼び出す
**THEN** 顧客詳細と担当者一覧を含む成功結果が返る

### TC-036: clients update_contact で isPrimary 一意性検証が行われる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-05: clients ツールの実装

**GIVEN** 有効なトークン（admin）、既に別の担当者が `isPrimary: true` の顧客、`validatePrimaryUniqueness` をモック
**WHEN** `clients` ツールを `operation: "update_contact"` / `isPrimary: true` で別の担当者に対して呼び出す
**THEN** `validatePrimaryUniqueness` が呼ばれ、一意性違反の場合は `isError: true` が返る

---

## updateClient / updateClientContact ユースケース新設（T-14）

### TC-042: updateClient ユースケースが存在し監査ログ記録ロジックを含む

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-14: updateClient / updateClientContact ユースケースの新設と Server Action リファクタ

**GIVEN** `src/application/usecases/updateClient.ts` が実装済み（`clientRepository.update` と `auditLogRepository` をモック）
**WHEN** `updateClient({ organizationId, clientId, data, userId })` を呼び出す
**THEN** `clientRepository.update` が呼ばれ、`client.update` アクションの監査ログが記録される。Result 型 `{ ok: true, client }` が返る

### TC-043: updateClientContact ユースケースが存在し監査ログ記録ロジックを含む

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-14: updateClient / updateClientContact ユースケースの新設と Server Action リファクタ

**GIVEN** `src/application/usecases/updateClientContact.ts` が実装済み（`clientRepository.updateContact` と `auditLogRepository` をモック）
**WHEN** `updateClientContact({ organizationId, clientId, contactId, data, userId })` を呼び出す
**THEN** `clientRepository.updateContact` が呼ばれ、`client_contact.update` アクションの監査ログが記録される。Result 型が返る

### TC-044: updateClientAction が updateClient ユースケース経由に変更されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-14: updateClient / updateClientContact ユースケースの新設と Server Action リファクタ

**GIVEN** T-14 リファクタ後の `src/app/actions/clients.ts`（`updateClient` usecase をモック）
**WHEN** `updateClientAction` を呼び出す
**THEN** `updateClient` ユースケースが呼び出される。`clientRepository.update` を直接呼び出さないことをモック検証で確認する

### TC-045: updateClientContactAction が updateClientContact ユースケース経由に変更されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-14: updateClient / updateClientContact ユースケースの新設と Server Action リファクタ

**GIVEN** T-14 リファクタ後の `src/app/actions/clients.ts`（`updateClientContact` usecase をモック）
**WHEN** `updateClientContactAction` を呼び出す
**THEN** `updateClientContact` ユースケースが呼び出される。`clientRepository.updateContact` を直接呼び出さないことをモック検証で確認する

---

## mod-mcp モジュール宣言・アーキテクチャ

### TC-019: @modelcontextprotocol/sdk が dependencies に明示追加されている

**Category**: manual
**Priority**: must
**Source**: request.md > 要件 1

**GIVEN** `package.json`
**WHEN** `dependencies` セクションを確認する
**THEN** `@modelcontextprotocol/sdk` が `dependencies` に明示的に追加されている（`devDependencies` のみではない）

### TC-020: mod-mcp モジュール宣言が design/static/modules.md に存在する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-01: mod-mcp モジュール宣言と architecture test 対応

**GIVEN** `design/static/modules.md`
**WHEN** ファイルの内容を確認する
**THEN** `{#mod-mcp}` アンカー付きのセクションが存在し、責務（MCP プロトコルの受付・ツール登録・Bearer 認証解決・認可チェック・ユースケース委譲）と実装パス（`src/app/api/mcp/`）が記載されている

### TC-021: mod-mcp の許可依存が design/static/dependencies.md に列挙されている

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-01: mod-mcp モジュール宣言と architecture test 対応

**GIVEN** `design/static/dependencies.md`
**WHEN** ファイルの内容を確認する
**THEN** `mod-mcp → mod-usecase` / `mod-mcp → mod-auth` / `mod-mcp → mod-authz` / `mod-mcp → mod-model` / `mod-mcp → mod-webhook` / `mod-mcp → mod-repo` / `mod-mcp → mod-appservice` / `mod-mcp → mod-lib` の全 8 依存が列挙されている

### TC-022: architecture test が green（mod-mcp 宣言込み）

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-01: mod-mcp モジュール宣言と architecture test 対応 / T-13: 全体の品質ゲート確認

**GIVEN** `design/rules.json` が `mod-mcp` を含む状態で再生成されている
**WHEN** `bun test src/__tests__/static/architecture.test.ts` を実行する
**THEN** exit 0 で全テストが green

### TC-023: aozu check が exit 0

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-01: mod-mcp モジュール宣言と architecture test 対応

**GIVEN** `design/rules.json` が `bunx aozu export rules --out design/rules.json` で再生成されている
**WHEN** `bunx aozu check` を実行する
**THEN** exit 0

---

## 品質ゲート

### TC-051: typecheck が green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-13: 全体の品質ゲート確認

**GIVEN** 実装完了後のコードベース（全 T-01〜T-14 完了）
**WHEN** `bun run typecheck` を実行する
**THEN** 型エラーがなく exit 0 になる

### TC-052: 既存テストが変更なしで green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-13: 全体の品質ゲート確認

**GIVEN** 実装完了後のコードベース
**WHEN** `bun test` を実行する
**THEN** 既存テストが変更なしで green を維持し、新規テストも含めてすべて green

## Result

```yaml
result: completed
total: 53
automated: 47
manual: 6
must: 44
should: 9
could: 0
blocked_reasons: []
```
