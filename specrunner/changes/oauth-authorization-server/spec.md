# Spec: MCP クライアント向け OAuth 2.1 認可サーバー

## Requirements

### Requirement: Protected Resource Metadata を well-known エンドポイントで提供する

MCP エンドポイント（`/api/mcp`）の Protected Resource Metadata を `/.well-known/oauth-protected-resource` で提供する。レスポンスは RFC 9728 に準拠し、`resource` フィールドと `authorization_servers` フィールドを含まなければならない（SHALL）。

#### Scenario: Protected Resource Metadata を取得する

**Given** clearflow が起動している
**When** `GET /.well-known/oauth-protected-resource` にリクエストを送信する
**Then** ステータス 200 が返り、Content-Type は `application/json`、レスポンスボディに `resource`（MCP エンドポイントの canonical URI）と `authorization_servers`（認可サーバー URL の配列）が含まれる

### Requirement: Authorization Server Metadata を well-known エンドポイントで提供する

認可サーバーのメタデータを `/.well-known/oauth-authorization-server` で提供する。レスポンスは RFC 8414 に準拠し、`issuer`、`authorization_endpoint`、`token_endpoint`、`registration_endpoint`、`response_types_supported`、`code_challenge_methods_supported` を含まなければならない（SHALL）。

#### Scenario: Authorization Server Metadata を取得する

**Given** clearflow が起動している
**When** `GET /.well-known/oauth-authorization-server` にリクエストを送信する
**Then** ステータス 200 が返り、Content-Type は `application/json`、レスポンスボディに `issuer`、`authorization_endpoint`、`token_endpoint`、`registration_endpoint`、`response_types_supported`（`["code"]`）、`grant_types_supported`（`["authorization_code", "refresh_token"]`）、`code_challenge_methods_supported`（`["S256"]`）が含まれる

### Requirement: MCP エンドポイントの 401 応答に WWW-Authenticate ヘッダを含める

MCP エンドポイント（`/api/mcp`）が認証失敗で 401 を返す際、`WWW-Authenticate` ヘッダに `resource_metadata` パラメータを含めなければならない（SHALL）。RFC 9728 Section 5.1 に準拠する。

#### Scenario: 無認証リクエストに WWW-Authenticate ヘッダが含まれる

**Given** MCP エンドポイントが起動している
**When** Authorization ヘッダなしで `POST /api/mcp` にリクエストを送信する
**Then** ステータス 401 が返り、レスポンスヘッダに `WWW-Authenticate: Bearer resource_metadata="<Protected Resource Metadata URL>"` が含まれる

### Requirement: 動的クライアント登録を提供する

RFC 7591 に準拠した動的クライアント登録エンドポイント（`POST /api/oauth/register`）を提供する。公開クライアント（`token_endpoint_auth_method: "none"`）を受け付け、`client_id` と登録メタデータを返さなければならない（SHALL）。登録されたクライアントは組織に属さないプラットフォームレベルの記録として保持する。

#### Scenario: MCP クライアントが動的に登録される

**Given** clearflow が起動している
**When** `POST /api/oauth/register` に `{ "client_name": "Claude Desktop", "redirect_uris": ["http://localhost:3000/callback"], "grant_types": ["authorization_code", "refresh_token"], "token_endpoint_auth_method": "none" }` を送信する
**Then** ステータス 201 が返り、レスポンスボディに `client_id`（UUID）、`client_name`、`redirect_uris`、`token_endpoint_auth_method`、`client_id_issued_at` が含まれる

#### Scenario: 動的クライアント登録にレート制限が適用される

**Given** 同一 IP アドレスから 1 時間以内に 10 件のクライアント登録が完了している
**When** 同一 IP アドレスから `POST /api/oauth/register` にリクエストを送信する
**Then** ステータス 429 が返り、登録は拒否される

### Requirement: 認可コードフロー + PKCE（S256 必須）で認可を行う

`GET /api/oauth/authorize` で認可リクエストを受け付ける。パラメータとして `response_type=code`、`client_id`、`redirect_uri`、`code_challenge`、`code_challenge_method=S256`、`state` を MUST とする。未ログインなら既存ログイン画面（`/login`）へ誘導し、ログイン済みユーザーに同意画面（`/oauth/consent`）を表示しなければならない（SHALL）。同意の拒否は `error=access_denied` でリダイレクトする。

#### Scenario: 未ログインユーザーがログインへ誘導される

**Given** ユーザーが未ログインである
**When** `GET /api/oauth/authorize?response_type=code&client_id=...&redirect_uri=...&code_challenge=...&code_challenge_method=S256&state=...` にリクエストを送信する
**Then** `/login` へリダイレクトされ、ログイン後に認可フローへ戻される

#### Scenario: ログイン済みユーザーに同意画面が表示される

**Given** ユーザーがログイン済みである
**When** `GET /api/oauth/authorize?response_type=code&client_id=...&redirect_uri=...&code_challenge=...&code_challenge_method=S256&state=...` にリクエストを送信する
**Then** 同意画面（`/oauth/consent`）が表示され、クライアント名・アクセス内容・ユーザー名・組織名が表示される

#### Scenario: 同意を拒否するとエラーリダイレクトされる

**Given** ユーザーがログイン済みで同意画面を表示している
**When** ユーザーが「拒否」を選択する
**Then** `redirect_uri` に `error=access_denied&state=...` を付与してリダイレクトされる

#### Scenario: 同意を許可すると認可コードが発行される

**Given** ユーザーがログイン済みで同意画面を表示している
**When** ユーザーが「許可」を選択する
**Then** `redirect_uri` に `code=<認可コード>&state=...` を付与してリダイレクトされ、認可コードは DB にハッシュ保存される

#### Scenario: PKCE code_challenge_method が S256 以外なら拒否する

**Given** ユーザーがログイン済みである
**When** `GET /api/oauth/authorize` に `code_challenge_method=plain` を指定してリクエストを送信する
**Then** `redirect_uri` に `error=invalid_request` を付与してリダイレクトされる

#### Scenario: code_challenge が未指定なら拒否する

**Given** ユーザーがログイン済みである
**When** `GET /api/oauth/authorize` に `code_challenge` パラメータなしでリクエストを送信する
**Then** `redirect_uri` に `error=invalid_request` を付与してリダイレクトされる

### Requirement: トークンエンドポイントで認可コード交換とリフレッシュトークンローテーションを行う

`POST /api/oauth/token` で `grant_type=authorization_code` による認可コード → アクセストークン + リフレッシュトークン交換、および `grant_type=refresh_token` によるリフレッシュトークンローテーションを提供しなければならない（SHALL）。

#### Scenario: 認可コードをトークンに交換する

**Given** 有効な認可コードが発行されている
**When** `POST /api/oauth/token` に `grant_type=authorization_code&code=<認可コード>&redirect_uri=...&client_id=...&code_verifier=<PKCE verifier>` を送信する
**Then** ステータス 200 が返り、レスポンスボディに `access_token`（`oat_` プレフィクス）、`token_type: "Bearer"`、`expires_in: 3600`、`refresh_token`（`ort_` プレフィクス）が含まれる

#### Scenario: PKCE verifier が不一致ならトークン交換を拒否する

**Given** 有効な認可コードが発行されている
**When** `POST /api/oauth/token` に誤った `code_verifier` を指定して送信する
**Then** ステータス 400 が返り、`error=invalid_grant` が含まれる

#### Scenario: 認可コードの再利用を拒否する

**Given** 認可コードが既にトークンに交換されている
**When** 同じ認可コードで `POST /api/oauth/token` に再度送信する
**Then** ステータス 400 が返り、`error=invalid_grant` が含まれる。さらに、その認可コードから発行された全トークン（系列）が失効する

#### Scenario: リフレッシュトークンで新しいトークンペアを取得する

**Given** 有効なリフレッシュトークンがある
**When** `POST /api/oauth/token` に `grant_type=refresh_token&refresh_token=<リフレッシュトークン>&client_id=...` を送信する
**Then** ステータス 200 が返り、新しい `access_token` と `refresh_token` が発行され、旧リフレッシュトークンは失効する

#### Scenario: リフレッシュトークンの再利用検知で系列を失効させる

**Given** リフレッシュトークンが既にローテーションされ失効している
**When** 失効済みのリフレッシュトークンで `POST /api/oauth/token` に送信する
**Then** ステータス 400 が返り、`error=invalid_grant` が含まれ、同一 family_id の全トークンが失効する

#### Scenario: 期限切れリフレッシュトークンを拒否する

**Given** リフレッシュトークンの有効期限（30 日）が過ぎている
**When** 期限切れのリフレッシュトークンで `POST /api/oauth/token` に送信する
**Then** ステータス 400 が返り、`error=invalid_grant` が含まれる

### Requirement: OAuth アクセストークンで MCP エンドポイントを利用できる

MCP エンドポイント（`/api/mcp`）の Bearer 検証インターフェース（`resolveBearer`）が OAuth アクセストークンを解決し、PAT と同じ `{ userId, organizationId, role }` を返さなければならない（SHALL）。失効・期限切れのトークンは 401 を返す。

#### Scenario: 有効な OAuth アクセストークンで MCP リクエストが成功する

**Given** 有効な OAuth アクセストークン（`oat_` プレフィクス）がある
**When** `Authorization: Bearer <OAuth アクセストークン>` ヘッダ付きで `POST /api/mcp` にリクエストを送信する
**Then** MCP リクエストが正常に処理され、authInfo に `userId`、`organizationId`、`role` が含まれる

#### Scenario: 失効した OAuth アクセストークンは 401 を返す

**Given** OAuth アクセストークンが失効している（接続解除により revokedAt が設定されている）
**When** 失効済みのトークンで `POST /api/mcp` にリクエストを送信する
**Then** ステータス 401 が返る

#### Scenario: 期限切れの OAuth アクセストークンは 401 を返す

**Given** OAuth アクセストークンの有効期限（1 時間）が過ぎている
**When** 期限切れのトークンで `POST /api/mcp` にリクエストを送信する
**Then** ステータス 401 が返る

### Requirement: 接続管理 UI で接続済みアプリケーションを管理できる

アカウント設定ページ（`/account`）に「接続済みアプリケーション」セクションを追加し、ユーザー自身の接続一覧と接続解除機能を提供しなければならない（SHALL）。他ユーザーの接続は表示・操作できない。

#### Scenario: 接続済みアプリケーション一覧を表示する

**Given** ユーザー A が OAuth で 2 つのアプリケーション（Claude Desktop, Claude Web）に接続している
**When** ユーザー A が `/account` ページを開く
**Then** 「接続済みアプリケーション」セクションに Claude Desktop と Claude Web が表示され、各アプリケーションのクライアント名・最終使用日時・許可日時が表示される

#### Scenario: 接続を解除するとトークン系列が失効する

**Given** ユーザー A が Claude Desktop に接続しており、アクセストークンとリフレッシュトークンが有効である
**When** ユーザー A が Claude Desktop の「接続解除」を選択する
**Then** Claude Desktop に関連する全トークン（アクセストークン + リフレッシュトークン）が失効し、以後そのトークンでの MCP リクエストは 401 を返す

#### Scenario: 他ユーザーの接続は一覧に表示されない

**Given** ユーザー A とユーザー B がそれぞれ OAuth 接続を持っている
**When** ユーザー A が `/account` ページを開く
**Then** ユーザー A の接続のみが表示され、ユーザー B の接続は表示されない

### Requirement: 同意と接続解除を監査ログに記録する

OAuth 同意（接続）と接続解除をそれぞれ監査ログに記録しなければならない（SHALL）。監査ログにはトークン値や認可コードを含めない。

#### Scenario: 同意を許可した際に監査ログが記録される

**Given** ユーザーが同意画面で「許可」を選択した
**When** 認可コードが発行される
**Then** `action: "oauth_connection.create"`、`targetType: "oauth_connection"`、`targetId: <client_id>`、`actorId: <userId>` の監査ログが記録される

#### Scenario: 接続解除した際に監査ログが記録される

**Given** ユーザーが接続済みアプリケーションの「接続解除」を選択した
**When** トークン系列が失効される
**Then** `action: "oauth_connection.revoke"`、`targetType: "oauth_connection"`、`targetId: <client_id>`、`actorId: <userId>` の監査ログが記録される

### Requirement: OAuth クライアント・OAuth トークンのエンティティを設計ドキュメントに追加する

`design/domain/model.md` に OAuth クライアントと OAuth トークンのエンティティ定義を追加しなければならない（SHALL）。`aozu check` exit 0 を維持する。

#### Scenario: model.md に OAuth エンティティが存在する

**Given** この変更が適用されている
**When** `design/domain/model.md` を参照する
**Then** `## OAuth クライアント {#ent-oauth-client}` と `## OAuth トークン {#ent-oauth-token}` のセクションが存在し、属性と関連が記述されている

#### Scenario: aozu check が通る

**Given** design ドキュメントが更新されている
**When** `aozu check` を実行する
**Then** exit 0 で完了する
