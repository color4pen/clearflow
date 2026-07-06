# Tasks: MCP クライアント向け OAuth 2.1 認可サーバー

## T-01: DB スキーマ — oauth_clients / oauth_tokens テーブル追加

- [ ] `src/infrastructure/schema.ts` に `oauthClients` テーブルを追加する
  - `id` (uuid PK), `clientId` (text, unique — 動的登録で生成した UUID 文字列), `clientName` (text), `redirectUris` (jsonb — string[]), `tokenEndpointAuthMethod` (text, default "none"), `grantTypes` (jsonb — string[]), `responseTypes` (jsonb — string[]), `clientIdIssuedAt` (timestamp), `createdAt` (timestamp)
  - 注: `organizationId` なし（D3: プラットフォームレベル）
- [ ] `src/infrastructure/schema.ts` に `oauthTokens` テーブルを追加する
  - `id` (uuid PK), `type` (text — "authorization_code" | "access_token" | "refresh_token"), `clientId` (text, FK → oauthClients.clientId), `userId` (uuid, FK → users.id), `organizationId` (uuid, FK → organizations.id), `tokenHash` (text, unique), `tokenPrefix` (text — 一覧表示用), `familyId` (uuid — トークン系列 ID), `expiresAt` (timestamp), `revokedAt` (timestamp), `lastUsedAt` (timestamp), `createdAt` (timestamp)
  - 認可コード固有: `codeChallenge` (text, nullable), `codeChallengeMethod` (text, nullable), `redirectUri` (text, nullable), `state` (text, nullable)
  - インデックス: `tokenHash` (unique), `(userId, clientId, type)` (接続一覧用), `(familyId)` (系列失効用), `(organizationId, userId)` (テナントスコープ一覧)
- [ ] `oauthClientsRelations` と `oauthTokensRelations` を追加する
- [ ] `organizationsRelations` に `oauthTokens: many(oauthTokens)` を追加する
- [ ] `usersRelations` に `oauthTokens: many(oauthTokens)` を追加する
- [ ] `bun run db:generate` でマイグレーションを生成する
- [ ] `bun run db:migrate` でマイグレーションを適用する

**Acceptance Criteria**:
- マイグレーションが正常に適用され、`oauth_clients` と `oauth_tokens` テーブルが作成される
- `bun run typecheck` が green
- 既存テストが green（既存テーブルに影響なし）

## T-02: ドメインモデル — OAuth クライアント / OAuth トークン

- [ ] `src/domain/models/oauthClient.ts` を作成する
  - `OAuthClient` 型を定義（id, clientId, clientName, redirectUris, tokenEndpointAuthMethod, grantTypes, responseTypes, clientIdIssuedAt, createdAt）
- [ ] `src/domain/models/oauthToken.ts` を作成する
  - `OAuthTokenType = "authorization_code" | "access_token" | "refresh_token"` を定義
  - `OAuthToken` 型を定義（id, type, clientId, userId, organizationId, tokenPrefix, familyId, expiresAt, revokedAt, lastUsedAt, createdAt, codeChallenge, codeChallengeMethod, redirectUri）
  - トークンプレフィクス定数: `OAUTH_ACCESS_TOKEN_PREFIX = "oat_"`, `OAUTH_REFRESH_TOKEN_PREFIX = "ort_"`
  - トークン生成関数: `generateOAuthAccessToken()`, `generateOAuthRefreshToken()`, `generateAuthorizationCode()`
  - ハッシュ関数: `hashOAuthToken(plainToken: string): string`（SHA-256、PAT と同じパターン）
  - プレフィクス判定関数: `hasOAuthAccessTokenPrefix(token: string): boolean`, `hasOAuthRefreshTokenPrefix(token: string): boolean`
  - 有効期限定数: `ACCESS_TOKEN_LIFETIME_MS = 3600_000`, `REFRESH_TOKEN_LIFETIME_MS = 30 * 24 * 3600_000`, `AUTHORIZATION_CODE_LIFETIME_MS = 600_000`
- [ ] `src/domain/models/auditLog.ts` の `AuditAction` に `"oauth_connection.create" | "oauth_connection.revoke"` を追加する
- [ ] `src/domain/models/auditLog.ts` の `AuditTargetType` に `"oauth_connection"` を追加する

**Acceptance Criteria**:
- 型定義・定数・ユーティリティ関数が export され、`bun run typecheck` が green
- トークン生成関数がプレフィクス付きランダム文字列を返す
- ハッシュ関数が SHA-256 hex を返す

## T-03: リポジトリ — OAuth クライアント / OAuth トークン

- [ ] `src/infrastructure/repositories/oauthClientRepository.ts` を作成する
  - `create(data, tx?)`: クライアント登録
  - `findByClientId(clientId)`: clientId で検索
- [ ] `src/infrastructure/repositories/oauthTokenRepository.ts` を作成する
  - `create(data, tx?)`: トークン/認可コード作成
  - `findByTokenHash(tokenHash)`: tokenHash で検索（認可コード交換・トークン検証用）
  - `revokeByFamilyId(familyId, tx?)`: 系列一括失効
  - `revokeByUserAndClientId(userId, clientId, organizationId, tx?)`: 接続解除（ユーザー × クライアントの全トークン失効）
  - `findActiveConnectionsByUser(userId, organizationId)`: ユーザーの接続一覧（クライアント名・最終使用日時・許可日時）— type が access_token または refresh_token で revokedAt IS NULL かつ expiresAt > now のものをクライアント単位でグルーピング
  - `updateLastUsedAt(id, organizationId, timestamp)`: lastUsedAt 更新（スロットリング付き、PAT と同パターン）
- [ ] `src/infrastructure/repositories/index.ts` に `oauthClientRepository` と `oauthTokenRepository` を追加する

**Acceptance Criteria**:
- リポジトリ関数が正しい SQL を生成し、`bun run typecheck` が green
- テナントスコープ関数（findActiveConnectionsByUser, revokeByUserAndClientId）が organizationId で制約している
- findByTokenHash はグローバル検索（PAT の findByTokenHash と同パターン — 認証パスでは organizationId が未知のため）

## T-04: ユースケース — 動的クライアント登録

- [ ] `src/application/usecases/registerOAuthClient.ts` を作成する
  - 入力: `{ clientName, redirectUris, grantTypes?, responseTypes?, tokenEndpointAuthMethod? }`
  - バリデーション: clientName 必須、redirectUris 必須（1 つ以上の有効な URL）、tokenEndpointAuthMethod は "none" のみ許可
  - clientId を UUID で生成
  - oauthClientRepository.create でクライアントを保存
  - 出力: `{ ok: true, client }` | `{ ok: false, reason }`
- [ ] レート制限ロジック: 既存の `rateLimitRecords` テーブルを使い、key `oauth_register:<ip>` で 10 件/時間の制限を適用する。レート制限チェックは route handler で行い、ユースケースには含めない

**Acceptance Criteria**:
- 正常系: クライアント登録が成功し、clientId が返る
- 異常系: 不正な redirectUris（空配列、非 URL）で拒否される
- `bun run typecheck` が green

## T-05: ユースケース — 認可（同意 → 認可コード発行）

- [ ] `src/application/usecases/authorizeOAuthClient.ts` を作成する
  - 入力: `{ clientId, redirectUri, codeChallenge, codeChallengeMethod, state, userId, organizationId }`
  - バリデーション: clientId が存在する、redirectUri がクライアントの登録済み redirectUris に含まれる、codeChallengeMethod が "S256"
  - 認可コードを生成し、ハッシュで DB に保存（type: "authorization_code"、familyId を新規 UUID で生成）
  - 同一トランザクション内で監査ログを記録（`oauth_connection.create`）
  - 出力: `{ ok: true, code, state }` | `{ ok: false, error: "invalid_request" | "access_denied" | "unauthorized_client" }`

**Acceptance Criteria**:
- 正常系: 認可コードが返り、監査ログが記録される
- 異常系: 未登録 clientId で拒否、redirectUri 不一致で拒否、codeChallengeMethod が S256 以外で拒否
- `bun run typecheck` が green

## T-06: ユースケース — トークン交換（認可コード → アクセストークン + リフレッシュトークン）

- [ ] `src/application/usecases/exchangeOAuthToken.ts` を作成する
  - grant_type=authorization_code のパス:
    - 入力: `{ grantType: "authorization_code", code, redirectUri, clientId, codeVerifier }`
    - tokenHash で認可コードを DB から取得
    - 検証: 認可コードが存在する、未使用（revokedAt IS NULL）、未期限切れ、clientId 一致、redirectUri 一致
    - PKCE 検証: SHA-256(codeVerifier) を base64url エンコードし、保存された codeChallenge と一致するか
    - 認可コードを使用済みにする（revokedAt を設定）
    - 同一 familyId でアクセストークン + リフレッシュトークンを生成・保存
    - 出力: `{ ok: true, accessToken, refreshToken, expiresIn: 3600, tokenType: "Bearer" }`
  - grant_type=refresh_token のパス:
    - 入力: `{ grantType: "refresh_token", refreshToken, clientId }`
    - tokenHash でリフレッシュトークンを DB から取得
    - 検証: トークンが存在する、type が refresh_token、clientId 一致
    - 再利用検知: revokedAt が設定済み → 同一 familyId の全トークンを失効させ、error=invalid_grant を返す
    - 未期限切れ検証
    - 旧リフレッシュトークンを失効させる（revokedAt を設定）
    - 同一 familyId で新しいアクセストークン + リフレッシュトークンを生成・保存
    - 出力: `{ ok: true, accessToken, refreshToken, expiresIn: 3600, tokenType: "Bearer" }`
  - 認可コード再利用検知: 使用済み認可コードで交換試行 → 同一 familyId の全トークンを失効させる

**Acceptance Criteria**:
- 正常系: 認可コード交換でアクセストークン + リフレッシュトークンが返る
- 正常系: リフレッシュトークンローテーションで新しいトークンペアが返り、旧リフレッシュトークンが失効する
- 異常系: PKCE verifier 不一致で invalid_grant
- 異常系: 認可コード再利用で invalid_grant + 系列失効
- 異常系: リフレッシュトークン再利用（失効済み）で invalid_grant + 系列失効
- 異常系: 期限切れトークンで invalid_grant
- `bun run typecheck` が green

## T-07: ユースケース — 接続管理（一覧・解除）

- [ ] `src/application/usecases/listOAuthConnections.ts` を作成する
  - 入力: `{ userId, organizationId }`
  - oauthTokenRepository.findActiveConnectionsByUser で取得
  - 出力: 接続一覧（clientName, clientId, lastUsedAt, connectedAt）
- [ ] `src/application/usecases/revokeOAuthConnection.ts` を作成する
  - 入力: `{ userId, organizationId, clientId }`
  - oauthTokenRepository.revokeByUserAndClientId でトークン系列を全失効
  - 同一トランザクション内で監査ログを記録（`oauth_connection.revoke`）
  - 出力: `{ ok: true }` | `{ ok: false, reason }`

**Acceptance Criteria**:
- 一覧: ユーザー自身の接続のみが返る（organizationId でテナントスコープ）
- 解除: 指定クライアントの全トークンが失効し、監査ログが記録される
- 他ユーザーのトークンは影響を受けない
- `bun run typecheck` が green

## T-08: Bearer 検証の拡張 — resolveBearer に OAuth トークン解決を追加

- [ ] `src/infrastructure/apiTokenResolver.ts` の `resolveBearer` を修正する
  - 既存ロジック: `hasApiTokenPrefix(plainToken)` が true → PAT 解決パス（現行コードそのまま）
  - 新規分岐: `hasOAuthAccessTokenPrefix(plainToken)` が true → OAuth トークン解決パス
    - tokenHash を算出し oauthTokenRepository.findByTokenHash で取得
    - revokedAt / expiresAt を検証
    - userId で users テーブルを引き、deactivatedAt を検証
    - lastUsedAt を更新（ベストエフォート）
    - `{ userId, organizationId, role }` を返す
  - どちらのプレフィクスにも一致しない → null を返す（現行動作と同じ）
- [ ] `hasApiTokenPrefix` の呼び出しはそのまま残す（既存テスト `mcpAuth.test.ts` の文字列照合を維持するため）

**Acceptance Criteria**:
- PAT（`cfp_` プレフィクス）は従来通り解決される
- OAuth アクセストークン（`oat_` プレフィクス）で `{ userId, organizationId, role }` が返る
- 失効・期限切れの OAuth トークンは null を返す
- 無効化ユーザーの OAuth トークンは null を返す
- 既存テスト（`mcpAuth.test.ts`）が無変更で green
- `bun run typecheck` が green

## T-09: API ルート — メタデータエンドポイント

- [ ] `src/app/.well-known/oauth-protected-resource/route.ts` を作成する
  - GET: `{ resource: "<MCP endpoint canonical URI>", authorization_servers: ["<authorization server URL>"], bearer_methods_supported: ["header"] }` を返す
  - URL はリクエストの Host ヘッダまたは環境変数（`NEXTAUTH_URL` / `AUTH_URL`）から構築する
- [ ] `src/app/.well-known/oauth-authorization-server/route.ts` を作成する
  - GET: RFC 8414 準拠のメタデータを返す
    - `issuer`, `authorization_endpoint`, `token_endpoint`, `registration_endpoint`, `response_types_supported: ["code"]`, `grant_types_supported: ["authorization_code", "refresh_token"]`, `token_endpoint_auth_methods_supported: ["none"]`, `code_challenge_methods_supported: ["S256"]`

**Acceptance Criteria**:
- `GET /.well-known/oauth-protected-resource` が 200 + 正しい JSON を返す
- `GET /.well-known/oauth-authorization-server` が 200 + RFC 8414 準拠の JSON を返す
- `bun run typecheck` が green

## T-10: API ルート — 動的クライアント登録エンドポイント

- [ ] `src/app/api/oauth/register/route.ts` を作成する
  - POST: リクエストボディを検証し、レート制限チェック（per-IP, 10 件/時間）を行い、registerOAuthClient ユースケースを呼び出す
  - 成功: 201 + クライアントメタデータ
  - レート制限超過: 429
  - バリデーションエラー: 400

**Acceptance Criteria**:
- 正常系: 201 + `client_id` を含むレスポンス
- レート制限超過: 429
- バリデーションエラー: 400
- `bun run typecheck` が green

## T-11: API ルート — 認可エンドポイント + 同意画面

- [ ] `src/app/api/oauth/authorize/route.ts` を作成する
  - GET: クエリパラメータ（response_type, client_id, redirect_uri, code_challenge, code_challenge_method, state, resource）を検証
    - パラメータ不足・不正: redirect_uri にエラーリダイレクト（`error=invalid_request`）。redirect_uri 自体が不正な場合は 400 エラーページ
    - Auth.js セッションなし: `/login?callbackUrl=<現在の authorize URL>` へリダイレクト
    - セッションあり: `/oauth/consent?<パラメータ>` へリダイレクト
  - POST: 同意結果の処理
    - 許可: authorizeOAuthClient ユースケースを呼び出し、redirect_uri に `code` と `state` を付与してリダイレクト
    - 拒否: redirect_uri に `error=access_denied&state=...` を付与してリダイレクト
- [ ] `src/app/(auth)/oauth/consent/page.tsx` を作成する（同意画面）
  - Auth.js セッションでユーザー認証（未ログインなら `/login` へリダイレクト）
  - クライアント名・アクセス内容（「clearflow の MCP ツールへのアクセスを許可」）・ユーザー名・組織名を表示
  - 「許可」「拒否」ボタン → POST /api/oauth/authorize へ送信
- [ ] パラメータ一式を同意画面 → POST 間で受け渡す（URL パラメータまたはセッション一時保存）

**Acceptance Criteria**:
- 未ログインユーザーがログインへ誘導され、ログイン後に認可フローへ戻る
- ログイン済みユーザーに同意画面が表示される
- 許可 → redirect_uri に code + state がリダイレクト
- 拒否 → redirect_uri に error=access_denied がリダイレクト
- PKCE パラメータ不備で invalid_request エラー
- `bun run typecheck` が green

## T-12: API ルート — トークンエンドポイント

- [ ] `src/app/api/oauth/token/route.ts` を作成する
  - POST: `application/x-www-form-urlencoded` でリクエストを受け付ける
  - grant_type に応じて exchangeOAuthToken ユースケースを呼び出す
  - 成功: 200 + `{ access_token, token_type, expires_in, refresh_token }`
  - エラー: 400 + `{ error: "invalid_grant" | "invalid_request" | "unsupported_grant_type" }`
  - `Cache-Control: no-store` と `Pragma: no-cache` ヘッダを設定

**Acceptance Criteria**:
- 認可コード交換が成功し、トークンが返る
- リフレッシュトークンローテーションが成功し、新しいトークンペアが返る
- 各種エラーケースで適切な error コードが返る
- レスポンスにキャッシュ禁止ヘッダが含まれる
- `bun run typecheck` が green

## T-13: MCP エンドポイントの 401 に WWW-Authenticate ヘッダを追加

- [ ] `src/app/api/mcp/route.ts` の `authenticate` 関数を修正する
  - 401 レスポンスに `WWW-Authenticate: Bearer resource_metadata="<Protected Resource Metadata URL>"` ヘッダを追加する
  - URL はリクエストの Host ヘッダまたは環境変数から構築する

**Acceptance Criteria**:
- 認証失敗時の 401 レスポンスに `WWW-Authenticate` ヘッダが含まれる
- 既存テスト（`mcpAuth.test.ts`）の 401 アサーションが green（ヘッダ追加は既存のステータスコード・ボディのアサーションに影響しない）
- `bun run typecheck` が green

## T-14: proxy.ts の除外パス追加

- [ ] `src/proxy.ts` の認証除外パスに `/.well-known/` と `/api/oauth/` を追加する
  - `pathname.startsWith("/.well-known/")` または `pathname.startsWith("/api/oauth/")` の場合は `NextResponse.next()` を返す

**Acceptance Criteria**:
- `/.well-known/oauth-protected-resource` と `/.well-known/oauth-authorization-server` が未認証でアクセス可能
- `/api/oauth/register`、`/api/oauth/authorize`、`/api/oauth/token` が未認証でアクセス可能
- 既存の `/api/auth/` の除外は維持される
- `bun run typecheck` が green

## T-15: Server Actions — 接続管理

- [ ] `src/app/actions/oauthConnections.ts` を作成する
  - `listOAuthConnectionsAction()`: セッションから userId / organizationId を取得し、listOAuthConnections ユースケースを呼び出す
  - `revokeOAuthConnectionAction(clientId)`: セッションから userId / organizationId を取得し、revokeOAuthConnection ユースケースを呼び出す

**Acceptance Criteria**:
- セッションなしで呼び出された場合はエラーを返す
- 正常系: ユースケースが呼ばれ結果が返る
- `bun run typecheck` が green

## T-16: UI — 接続済みアプリケーションセクション

- [ ] `src/app/(dashboard)/account/OAuthConnectionSection.tsx` を作成する（Client Component）
  - 接続一覧を表示（クライアント名・最終使用日時・許可日時）
  - 各接続に「接続解除」ボタン
  - 接続解除の確認ダイアログ
  - 接続が 0 件の場合は「接続済みアプリケーションはありません」を表示
- [ ] `src/app/(dashboard)/account/page.tsx` を修正する
  - `listOAuthConnectionsAction` を呼び出して初期データを取得
  - `OAuthConnectionSection` を `ApiTokenSection` の後に追加する

**Acceptance Criteria**:
- 接続一覧が表示される
- 接続解除が機能し、一覧から削除される
- 接続が 0 件の場合は空状態メッセージが表示される
- `bun run typecheck` が green

## T-17: 設計ドキュメント delta — model.md / invariants.md 更新

- [ ] `design/domain/model.md` に以下を追加する:
  - `## OAuth クライアント {#ent-oauth-client}`: 動的クライアント登録で作成される MCP クライアントの識別情報。clientId（一意識別子）・クライアント名・リダイレクト URI・認証方式を保持する。組織に属さないプラットフォームレベルの記録であり、`inv-all-tenant-scoped` の意図的な例外。
  - `## OAuth トークン {#ent-oauth-token}`: OAuth 2.1 認可フローで発行される認可コード・アクセストークン・リフレッシュトークンの統合記録。type で種別を区別する。[[ent-oauth-client]] と発行先ユーザー・組織を参照する。familyId で系列を管理し、リフレッシュトークンローテーションと再利用検知による系列一括失効を実現する。平文は SHA-256 ハッシュとして保存され、発行時のみ返却される。
- [ ] `design/domain/invariants.md` に以下を追加する:
  - `## OAuth クライアントはプラットフォームスコープ {#inv-oauth-client-platform-scoped}`: [[ent-oauth-client]] は [[inv-all-tenant-scoped]] の意図的な例外であり、organizationId を持たない。テナント分離は [[ent-oauth-token]]（同意レコード）が userId + organizationId で担保する。
- [ ] `design/static/modules.md` の `## 認証 {#mod-auth}` の責務に「OAuth 2.1 認可サーバー（認可コードフロー + PKCE）のエンドポイント群」を追加する
- [ ] `design/static/dependencies.md` に新規依存を追加する:
  - `[[mod-api]] -> [[mod-model]]`（OAuth route → ドメインモデル参照）
  - `[[mod-api]] -> [[mod-db]]`（OAuth route → レート制限テーブル参照）
  - `[[mod-auth]] -> [[mod-appservice]]`（apiTokenResolver → auditRecorder は不要 — resolverは監査しない）

**Acceptance Criteria**:
- `aozu check` exit 0
- model.md に OAuth クライアント / OAuth トークンのエンティティが存在する
- invariants.md にプラットフォームスコープ例外が明記されている

## T-18: テスト — OAuth フロー統合テスト

- [ ] `src/__tests__/oauth/oauthFlow.test.ts` を作成する（統合テスト）
  - メタデータ発見 → 動的登録 → 認可コード + PKCE → トークン取得 → MCP ツール実行の一連のフロー
  - PKCE 不正（verifier 不一致）の拒否
  - PKCE code_challenge_method が S256 以外の拒否
  - 認可コード再利用の拒否 + 系列失効
  - リフレッシュトークンローテーション
  - リフレッシュトークン再利用検知 + 系列失効
  - 失効後のアクセストークン・リフレッシュトークンが 401
- [ ] `src/__tests__/oauth/oauthConnections.test.ts` を作成する
  - 接続一覧: 自分の接続のみ表示
  - 接続解除: トークン系列の全失効
  - 他ユーザーの接続を一覧・解除できないこと
- [ ] `src/__tests__/oauth/oauthMetadata.test.ts` を作成する（静的検証）
  - Protected Resource Metadata のレスポンス形式
  - Authorization Server Metadata のレスポンス形式
  - WWW-Authenticate ヘッダの存在

**Acceptance Criteria**:
- 受け入れ基準の全テストケースがカバーされている
- `bun test` が green（既存テスト無変更で green）
- `bun run typecheck` が green

## T-19: claude.ai 接続の手動確認手順ドキュメント

- [ ] `docs/manual-testing/oauth-claude-ai.md` を作成する
  - claude.ai custom connector からの接続手順:
    1. clearflow を HTTPS で公開する（ngrok 等）
    2. claude.ai で custom connector を追加（MCP URL を指定）
    3. 接続フローが開始される（メタデータ発見 → 動的登録 → 認可 → 同意 → トークン取得）
    4. clearflow のログイン画面でログイン
    5. 同意画面で許可
    6. claude.ai からツール実行（例: 引き合い一覧取得）
  - 確認ポイント: メタデータ取得成功、動的登録成功、同意画面表示、トークン取得成功、ツール実行成功
  - トラブルシューティング: HTTPS 必須、リダイレクト URI の確認、CORS 設定の確認

**Acceptance Criteria**:
- 手順書が自己完結で読める
- 自動テストで担保できない部分（ブラウザ操作・claude.ai UI）の確認手順が記載されている
