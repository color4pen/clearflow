# Test Cases: MCP クライアント向け OAuth 2.1 認可サーバー

## Summary

- **Total**: 52 cases
- **Automated** (unit/integration): 47
- **Manual**: 5
- **Priority**: must: 28, should: 20, could: 4

---

## メタデータエンドポイント

### TC-001: Protected Resource Metadata を取得する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Protected Resource Metadata を well-known エンドポイントで提供する > Scenario: Protected Resource Metadata を取得する

### TC-002: Authorization Server Metadata を取得する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Authorization Server Metadata を well-known エンドポイントで提供する > Scenario: Authorization Server Metadata を取得する

### TC-003: 無認証リクエストに WWW-Authenticate ヘッダが含まれる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: MCP エンドポイントの 401 応答に WWW-Authenticate ヘッダを含める > Scenario: 無認証リクエストに WWW-Authenticate ヘッダが含まれる

---

## 動的クライアント登録

### TC-004: MCP クライアントが動的に登録される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 動的クライアント登録を提供する > Scenario: MCP クライアントが動的に登録される

### TC-005: 動的クライアント登録にレート制限が適用される

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: 動的クライアント登録を提供する > Scenario: 動的クライアント登録にレート制限が適用される

---

## 認可コードフロー + PKCE

### TC-006: 未ログインユーザーがログインへ誘導される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 認可コードフロー + PKCE（S256 必須）で認可を行う > Scenario: 未ログインユーザーがログインへ誘導される

### TC-007: ログイン済みユーザーに同意画面が表示される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 認可コードフロー + PKCE（S256 必須）で認可を行う > Scenario: ログイン済みユーザーに同意画面が表示される

### TC-008: 同意を拒否するとエラーリダイレクトされる

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: 認可コードフロー + PKCE（S256 必須）で認可を行う > Scenario: 同意を拒否するとエラーリダイレクトされる

### TC-009: 同意を許可すると認可コードが発行される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 認可コードフロー + PKCE（S256 必須）で認可を行う > Scenario: 同意を許可すると認可コードが発行される

### TC-010: PKCE code_challenge_method が S256 以外なら拒否する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 認可コードフロー + PKCE（S256 必須）で認可を行う > Scenario: PKCE code_challenge_method が S256 以外なら拒否する

### TC-011: code_challenge が未指定なら拒否する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 認可コードフロー + PKCE（S256 必須）で認可を行う > Scenario: code_challenge が未指定なら拒否する

### TC-012: 構文上有効だが未登録の redirect_uri は 400 エラーページを返す

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 認可コードフロー + PKCE（S256 必須）で認可を行う > Scenario: 構文上有効だが未登録の redirect_uri は 400 エラーページを返す

---

## トークンエンドポイント

### TC-013: 認可コードをトークンに交換する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: トークンエンドポイントで認可コード交換とリフレッシュトークンローテーションを行う > Scenario: 認可コードをトークンに交換する

### TC-014: PKCE verifier が不一致ならトークン交換を拒否する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: トークンエンドポイントで認可コード交換とリフレッシュトークンローテーションを行う > Scenario: PKCE verifier が不一致ならトークン交換を拒否する

### TC-015: 認可コードの再利用を拒否する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: トークンエンドポイントで認可コード交換とリフレッシュトークンローテーションを行う > Scenario: 認可コードの再利用を拒否する

### TC-016: リフレッシュトークンで新しいトークンペアを取得する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: トークンエンドポイントで認可コード交換とリフレッシュトークンローテーションを行う > Scenario: リフレッシュトークンで新しいトークンペアを取得する

### TC-017: リフレッシュトークンの再利用検知で系列を失効させる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: トークンエンドポイントで認可コード交換とリフレッシュトークンローテーションを行う > Scenario: リフレッシュトークンの再利用検知で系列を失効させる

### TC-018: 期限切れリフレッシュトークンを拒否する

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: トークンエンドポイントで認可コード交換とリフレッシュトークンローテーションを行う > Scenario: 期限切れリフレッシュトークンを拒否する

### TC-019: 期限切れ認可コードを拒否する

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: トークンエンドポイントで認可コード交換とリフレッシュトークンローテーションを行う > Scenario: 期限切れ認可コードを拒否する

---

## OAuth トークンによる MCP アクセス

### TC-020: 有効な OAuth アクセストークンで MCP リクエストが成功する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: OAuth アクセストークンで MCP エンドポイントを利用できる > Scenario: 有効な OAuth アクセストークンで MCP リクエストが成功する

### TC-021: 失効した OAuth アクセストークンは 401 を返す

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: OAuth アクセストークンで MCP エンドポイントを利用できる > Scenario: 失効した OAuth アクセストークンは 401 を返す

### TC-022: 期限切れの OAuth アクセストークンは 401 を返す

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: OAuth アクセストークンで MCP エンドポイントを利用できる > Scenario: 期限切れの OAuth アクセストークンは 401 を返す

---

## 接続管理 UI

### TC-023: 接続済みアプリケーション一覧を表示する

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: 接続管理 UI で接続済みアプリケーションを管理できる > Scenario: 接続済みアプリケーション一覧を表示する

### TC-024: 接続を解除するとトークン系列が失効する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 接続管理 UI で接続済みアプリケーションを管理できる > Scenario: 接続を解除するとトークン系列が失効する

### TC-025: 他ユーザーの接続は一覧に表示されない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 接続管理 UI で接続済みアプリケーションを管理できる > Scenario: 他ユーザーの接続は一覧に表示されない

---

## 監査ログ

### TC-026: 同意を許可した際に監査ログが記録される

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: 同意と接続解除を監査ログに記録する > Scenario: 同意を許可した際に監査ログが記録される

### TC-027: 接続解除した際に監査ログが記録される

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: 同意と接続解除を監査ログに記録する > Scenario: 接続解除した際に監査ログが記録される

---

## CORS

### TC-028: /api/oauth/register への CORS プリフライトが成功する

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: ブラウザ発 OAuth エンドポイントに CORS ヘッダを設定する > Scenario: /api/oauth/register への CORS プリフライトが成功する

### TC-029: /api/oauth/token への CORS プリフライトが成功する

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: ブラウザ発 OAuth エンドポイントに CORS ヘッダを設定する > Scenario: /api/oauth/token への CORS プリフライトが成功する

---

## 設計ドキュメント

### TC-030: model.md に OAuth エンティティが存在する

**Category**: manual
**Priority**: could
**Source**: spec.md > Requirement: OAuth クライアント・OAuth トークンのエンティティを設計ドキュメントに追加する > Scenario: model.md に OAuth エンティティが存在する

### TC-031: aozu check が通る

**Category**: manual
**Priority**: could
**Source**: spec.md > Requirement: OAuth クライアント・OAuth トークンのエンティティを設計ドキュメントに追加する > Scenario: aozu check が通る

---

## ドメインモデル — トークン生成・ハッシュ関数

### TC-032: generateOAuthAccessToken が oat_ プレフィクス付き文字列を返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02: ドメインモデル — OAuth クライアント / OAuth トークン

**GIVEN** `generateOAuthAccessToken` 関数がインポートされている
**WHEN** `generateOAuthAccessToken()` を呼び出す
**THEN** `oat_` プレフィクスで始まる文字列が返り、呼び出すたびに異なる値になる

### TC-033: generateOAuthRefreshToken が ort_ プレフィクス付き文字列を返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02: ドメインモデル — OAuth クライアント / OAuth トークン

**GIVEN** `generateOAuthRefreshToken` 関数がインポートされている
**WHEN** `generateOAuthRefreshToken()` を呼び出す
**THEN** `ort_` プレフィクスで始まる文字列が返り、呼び出すたびに異なる値になる

### TC-034: hashOAuthToken が SHA-256 hex を返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02: ドメインモデル — OAuth クライアント / OAuth トークン

**GIVEN** `hashOAuthToken` 関数がインポートされている
**WHEN** 同一の文字列を引数にして `hashOAuthToken(token)` を 2 回呼び出す
**THEN** 両回とも同一の 64 文字 hex 文字列（SHA-256）が返る

### TC-035: hasOAuthAccessTokenPrefix がプレフィクスを正しく判定する

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-02: ドメインモデル — OAuth クライアント / OAuth トークン

**GIVEN** `hasOAuthAccessTokenPrefix` 関数がインポートされている
**WHEN** `oat_abc123` を渡す場合は true、`cfp_abc` や `ort_abc` や `abc` を渡す場合は false が期待される
**THEN** それぞれの入力に対して期待通りの boolean が返る

---

## リポジトリ — OAuth トークン

### TC-036: revokeByFamilyId が同一 family_id の全レコードを失効させる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03: リポジトリ — OAuth クライアント / OAuth トークン

**GIVEN** 同一 `familyId` を持つアクセストークン・リフレッシュトークン・認可コードが DB に存在する
**WHEN** `oauthTokenRepository.revokeByFamilyId(familyId)` を呼び出す
**THEN** 対象 `familyId` に属す全レコードの `revokedAt` が設定され、他の `familyId` のレコードは変更されない

### TC-037: findActiveConnectionsByUser が organizationId でテナントスコープする

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03: リポジトリ — OAuth クライアント / OAuth トークン

**GIVEN** ユーザー A が組織 X と組織 Y それぞれで OAuth 接続を持つ
**WHEN** `oauthTokenRepository.findActiveConnectionsByUser(userAId, orgXId)` を呼び出す
**THEN** 組織 X の接続のみが返り、組織 Y の接続は含まれない

### TC-038: findByTokenHash が organizationId なしでグローバル検索を行う

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-03: リポジトリ — OAuth クライアント / OAuth トークン

**GIVEN** OAuth アクセストークンが DB に存在する
**WHEN** `oauthTokenRepository.findByTokenHash(tokenHash)` を organizationId を指定せずに呼び出す
**THEN** 対応するレコードが返る（認証パスでは organizationId が未知のためグローバル検索が必要）

---

## ユースケース — 動的クライアント登録バリデーション

### TC-039: redirectUris が空配列または非 URL 文字列の場合に登録を拒否する

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-04: ユースケース — 動的クライアント登録

**GIVEN** `registerOAuthClient` ユースケースが利用可能である
**WHEN** `redirectUris: []`（空配列）または `redirectUris: ["not-a-url"]`（非 URL）で呼び出す
**THEN** `{ ok: false, reason: ... }` が返り、クライアントは DB に保存されない

### TC-040: tokenEndpointAuthMethod が none 以外の場合に登録を拒否する

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-04: ユースケース — 動的クライアント登録

**GIVEN** `registerOAuthClient` ユースケースが利用可能である
**WHEN** `tokenEndpointAuthMethod: "client_secret_basic"` を指定して呼び出す
**THEN** `{ ok: false, reason: ... }` が返り、クライアントは DB に保存されない

---

## Bearer 検証拡張 — resolveBearer

### TC-041: PAT（cfp_ プレフィクス）が OAuth 拡張後も従来通り解決される

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-08: Bearer 検証の拡張 — resolveBearer に OAuth トークン解決を追加

**GIVEN** 有効な PAT（`cfp_` プレフィクス）が DB に存在する
**WHEN** `resolveBearer(patToken)` を呼び出す
**THEN** PAT 解決パスが実行され、`{ userId, organizationId, role }` が返る（OAuth 拡張の影響を受けない）

### TC-042: 既知プレフィクスなしのトークンは null を返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-08: Bearer 検証の拡張 — resolveBearer に OAuth トークン解決を追加

**GIVEN** `resolveBearer` 関数がインポートされている
**WHEN** `cfp_` でも `oat_` でもないプレフィクスを持つ文字列（例: `unknown_abc123`）を渡す
**THEN** `null` が返る

### TC-043: 無効化ユーザー（deactivatedAt 設定済み）の OAuth トークンは null を返す

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-08: Bearer 検証の拡張 — resolveBearer に OAuth トークン解決を追加

**GIVEN** 有効な OAuth アクセストークンが存在するが、発行対象ユーザーの `deactivatedAt` が設定されている
**WHEN** `resolveBearer(oauthAccessToken)` を呼び出す
**THEN** `null` が返る

---

## API ルート — 同意フロー

### TC-044: 同意 POST 時のパラメータはサーバーサイドセッションから復元される

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-11: API ルート — 認可エンドポイント + 同意画面

**GIVEN** ユーザーが認可フロー中でサーバーサイドセッションに OAuth パラメータが保存されている
**WHEN** URL にパラメータを含まない `POST /api/oauth/authorize` を送信する
**THEN** サーバーサイドセッションからパラメータが復元され、認可コードが発行される（URL パラメータ改ざん不可）

---

## API ルート — トークンエンドポイント

### TC-045: トークンエンドポイントのレスポンスに Cache-Control: no-store が含まれる

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-12: API ルート — トークンエンドポイント

**GIVEN** 有効な認可コードが存在する
**WHEN** `POST /api/oauth/token` で `grant_type=authorization_code` の正常リクエストを送信する
**THEN** レスポンスヘッダに `Cache-Control: no-store` と `Pragma: no-cache` が含まれる

### TC-046: 未サポートの grant_type で 400 + unsupported_grant_type が返る

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-12: API ルート — トークンエンドポイント

**GIVEN** clearflow が起動している
**WHEN** `POST /api/oauth/token` に `grant_type=client_credentials` を送信する
**THEN** ステータス 400 が返り、レスポンスボディに `error: "unsupported_grant_type"` が含まれる

---

## proxy.ts 除外パス

### TC-047: /.well-known/ パスが proxy.ts の認証チェックを通過する

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-14: proxy.ts の除外パス追加

**GIVEN** clearflow が起動しており、セッションクッキーなしのリクエストである
**WHEN** `GET /.well-known/oauth-protected-resource` および `GET /.well-known/oauth-authorization-server` にリクエストを送信する
**THEN** ログインページにリダイレクトされず、200 でメタデータが返る

---

## Server Actions — 認証チェック

### TC-048: セッションなしで接続管理アクションを呼ぶとエラーを返す

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-15: Server Actions — 接続管理

**GIVEN** Auth.js セッションが存在しない状態でサーバーアクションを呼び出す
**WHEN** `listOAuthConnectionsAction()` または `revokeOAuthConnectionAction(clientId)` を呼び出す
**THEN** エラーが返り、ユースケースは実行されない

---

## エンドツーエンド統合テスト

### TC-049: OAuth フロー E2E — メタデータ発見→動的登録→認可コード交換→MCP ツール実行

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-18: テスト — OAuth フロー統合テスト

**GIVEN** clearflow が起動しており、テスト用ユーザーがログイン済みである
**WHEN** (1) `GET /.well-known/oauth-protected-resource` でメタデータを取得し、(2) `POST /api/oauth/register` でクライアントを登録し、(3) `GET /api/oauth/authorize` → 同意 → `POST /api/oauth/authorize` で認可コードを取得し、(4) `POST /api/oauth/token` でアクセストークンを取得し、(5) そのトークンで `POST /api/mcp` にリクエストを送信する
**THEN** 各ステップが成功し、最終的に MCP リクエストが正常処理される

---

## UI — 接続管理

### TC-050: 接続が 0 件の場合に空状態メッセージが表示される

**Category**: manual
**Priority**: could
**Source**: tasks.md > T-16: UI — 接続済みアプリケーションセクション

**GIVEN** ユーザーが OAuth 接続を一切持っていない
**WHEN** `/account` ページを開く
**THEN** 「接続済みアプリケーションはありません」等の空状態メッセージが表示される

### TC-051: 接続解除ボタン押下時に確認ダイアログが表示される

**Category**: manual
**Priority**: could
**Source**: tasks.md > T-16: UI — 接続済みアプリケーションセクション

**GIVEN** ユーザーが `/account` ページで接続済みアプリケーション一覧を表示している
**WHEN** いずれかのアプリケーションの「接続解除」ボタンを押す
**THEN** 確認ダイアログが表示され、確認後に接続解除が実行される

---

## 手動確認

### TC-052: claude.ai custom connector から接続 → ツール実行の手動確認

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-19: claude.ai 接続の手動確認手順ドキュメント

**GIVEN** clearflow が HTTPS でアクセス可能な環境（ngrok 等）で起動している
**WHEN** claude.ai の custom connector に clearflow の MCP URL を登録し、接続フロー（メタデータ発見→動的登録→認可→同意→トークン取得）を実行してツールを呼び出す
**THEN** 接続フローの全ステップが成功し、clearflow の MCP ツールが claude.ai から実行できる（`docs/manual-testing/oauth-claude-ai.md` の手順に従う）

---

## Result

```yaml
result: completed
total: 52
automated: 47
manual: 5
must: 28
should: 20
could: 4
blocked_reasons: []
```
