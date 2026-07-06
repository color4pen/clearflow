# Spec: MCP サーバー基盤とコア CRM ツール（引合・案件・顧客）

## Requirements

### Requirement: MCP エンドポイントは Streamable HTTP transport で JSON-RPC メッセージを処理する

`/api/mcp` は MCP Streamable HTTP transport（stateless）を提供し、`initialize` / `tools/list` / `tools/call` / `ping` に JSON-RPC 2.0 形式で応答しなければならない（SHALL）。

#### Scenario: initialize → tools/list → tools/call の一連の交換

**Given** 有効な Bearer トークンを持つ MCP クライアント
**When** クライアントが `initialize` → `tools/list` → `tools/call` を順に送信する
**Then** 各リクエストに対して正しい JSON-RPC レスポンスが返る。`tools/list` は登録済みツール一覧を含み、`tools/call` はツール実行結果を返す

#### Scenario: POST 以外のメソッドは適切に処理される

**Given** MCP エンドポイント `/api/mcp`
**When** GET / DELETE / PUT リクエストが送信される
**Then** SDK の transport が適切なレスポンスを返す（GET は stateless モードでは 405、DELETE は stateless モードでは 405）

### Requirement: 無認証・無効トークンのリクエストは 401 で拒否される

MCP エンドポイントは Bearer トークンが欠落または無効な場合、HTTP 401 を返さなければならない（MUST）。JSON-RPC レベルのエラーではなく HTTP レベルで拒否する。

#### Scenario: Authorization ヘッダなしのリクエスト

**Given** Authorization ヘッダのないリクエスト
**When** `/api/mcp` に POST する
**Then** HTTP 401 Unauthorized が返る

#### Scenario: 無効な Bearer トークン

**Given** `Authorization: Bearer invalid_token_xxx` ヘッダ
**When** `/api/mcp` に POST する
**Then** HTTP 401 Unauthorized が返る

#### Scenario: 失効済みトークン

**Given** `revokedAt` が設定済みのトークンの Bearer ヘッダ
**When** `/api/mcp` に POST する
**Then** HTTP 401 Unauthorized が返る

### Requirement: 権限外の操作は canPerform どおり拒否される

各ツールの各操作は `canPerform(role, entity, operation)` を通し、Server Action と同一の認可判定を行わなければならない（MUST）。権限不足の場合は MCP ツール結果（isError: true）として返す。

#### Scenario: member ロールによる引合の削除

**Given** role が `member` のユーザーのトークン
**When** `inquiries` ツールを `operation: "delete"` で呼び出す
**Then** isError: true の結果が返り、引合は削除されない（canPerform matrix で inquiry.delete は admin のみ）

#### Scenario: member ロールによる案件の作成

**Given** role が `member` のユーザーのトークン
**When** `deals` ツールを `operation: "create"` で呼び出す
**Then** isError: true の結果が返る（canPerform matrix で deal.create は admin / manager のみ）

#### Scenario: admin ロールによる引合の削除は成功する

**Given** role が `admin` のユーザーのトークン、かつ対象の引合が存在する
**When** `inquiries` ツールを `operation: "delete"` で呼び出す
**Then** 成功結果が返り、引合が削除される

### Requirement: 引合の案件化（update_status → converted）は承認ポリシー該当時に pending となる

`inquiries` ツールの `update_status` で `newStatus: "converted"` を指定した場合、承認ポリシーに該当するとき、usecase は即座に案件化せず承認リクエストを生成する。この結果は MCP ツール結果に明示的に表現しなければならない（MUST）。

#### Scenario: 承認ポリシー該当時の案件化

**Given** 有効な引合と、`inquiry.convert` に該当する承認ポリシーが存在する
**When** `inquiries` ツールを `operation: "update_status"` / `newStatus: "converted"` で呼び出す
**Then** 成功結果が返り、結果テキストに「承認」を示す情報が含まれる。引合のステータスは `new` のまま

#### Scenario: 承認ポリシー非該当時の案件化

**Given** 有効な引合と、該当する承認ポリシーが存在しない
**When** `inquiries` ツールを `operation: "update_status"` / `newStatus: "converted"` で呼び出す
**Then** 成功結果が返り、案件が生成される

### Requirement: 全ツールはテナント分離を遵守する

全ツールのデータアクセスは、認証で解決された `organizationId` に制約されなければならない（MUST）。他テナントのデータの読み取り・変更は不可能でなければならない。

#### Scenario: テナント A のトークンでテナント B の引合を操作

**Given** テナント A に属するユーザーのトークン、テナント B に属する引合 ID
**When** `inquiries` ツールを `operation: "update"` / 当該引合 ID で呼び出す
**Then** isError: true の結果が返るか、引合が見つからないエラーが返る。テナント B のデータは変更されない

### Requirement: 書き込み操作は監査ログに記録される

状態を変更するツール操作（create / update / update_status / update_phase / delete / add_contact / update_contact / delete_contact / add_deal_contact / remove_deal_contact）は、usecase 経由で監査ログを記録しなければならない（MUST）。MCP ツール固有の監査記録は不要（usecase が担保する）。

#### Scenario: MCP 経由の引合作成が監査ログに記録される

**Given** 有効なトークンを持つ admin ユーザー
**When** `inquiries` ツールを `operation: "create"` で呼び出して引合を作成する
**Then** `inquiry.create` アクションの監査ログが記録される（usecase の `createInquiry` が記録する）

### Requirement: レート制限が MCP 呼び出しにも適用される

MCP 経由の書き込み操作に対して、Server Action と同等のレート制限（`checkRateLimit`）を適用しなければならない（MUST）。

#### Scenario: レート制限超過

**Given** 短時間に大量のツール呼び出しを行うクライアント
**When** レート制限の上限を超えて呼び出す
**Then** isError: true の結果が返り、レート制限超過を示すメッセージが含まれる

### Requirement: エラー変換はスタックトレース・内部 ID を漏らさない

ツール実行中のエラー（検証エラー・認可エラー・usecase エラー・予期しない例外）は、MCP ツール結果（isError: true）として安全に変換しなければならない（MUST）。スタックトレース・内部識別子・DB エラー詳細をクライアントに漏らしてはならない。

#### Scenario: 予期しない例外の処理

**Given** usecase が予期しない例外をスローした場合
**When** ツール呼び出し中にエラーが発生する
**Then** isError: true の結果が返り、汎用エラーメッセージが含まれる。スタックトレースは含まれない
