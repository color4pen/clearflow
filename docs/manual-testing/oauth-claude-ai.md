# claude.ai Custom Connector 接続の手動確認手順

OAuth 2.1 認可フローを claude.ai custom connector から実機確認するための手順書。

## 前提条件

- clearflow が HTTPS でアクセスできること（ngrok 等のトンネリングツールで公開）
- claude.ai の custom connector 機能にアクセスできること
- clearflow にログイン可能なアカウントがあること

## 確認手順

### Step 1: clearflow を HTTPS で公開する

開発環境を ngrok 等で公開する。

```bash
# ngrok を使う場合
ngrok http 3000
```

ngrok が発行した HTTPS URL（例: `https://abc123.ngrok-free.app`）を控える。

環境変数を設定する:

```bash
AUTH_URL=https://abc123.ngrok-free.app
```

または `.env.local` に追記:

```
AUTH_URL=https://abc123.ngrok-free.app
```

clearflow を再起動する:

```bash
bun dev
```

### Step 2: メタデータエンドポイントの確認

ブラウザまたは curl で以下のエンドポイントにアクセスし、正しい JSON が返ることを確認する。

```bash
curl https://abc123.ngrok-free.app/.well-known/oauth-protected-resource
# 期待値: { "resource": "https://abc123.ngrok-free.app/api/mcp", "authorization_servers": [...], ... }

curl https://abc123.ngrok-free.app/.well-known/oauth-authorization-server
# 期待値: { "issuer": "https://abc123.ngrok-free.app", "authorization_endpoint": "...", ... }
```

### Step 3: claude.ai で custom connector を追加する

1. claude.ai にログインする
2. 設定 → Integrations → Custom Connectors（または同等のメニュー）を開く
3. 「Add custom connector」または「新しい接続を追加」を選択する
4. MCP サーバーの URL として `https://abc123.ngrok-free.app/api/mcp` を入力する
5. 「Connect」または「接続」ボタンをクリックする

### Step 4: OAuth 認可フローの確認

接続ボタンを押すと、claude.ai が以下の処理を自動で行う:

1. **メタデータ発見**: `GET /api/mcp` に認証なしでリクエストを送信し、`WWW-Authenticate` ヘッダから Protected Resource Metadata の URL を取得する
2. **認可サーバー発見**: Protected Resource Metadata から Authorization Server の URL を取得する
3. **動的クライアント登録**: `POST /api/oauth/register` に client_name と redirect_uris を送信し、client_id を取得する
4. **認可リクエスト**: ブラウザが `GET /api/oauth/authorize?...` に遷移する

### Step 5: clearflow でログインする

認可フローが開始されると、clearflow のログイン画面が表示される（未ログインの場合）。

1. clearflow のログイン画面で認証情報を入力してログインする
2. ログイン後、自動的に同意画面にリダイレクトされる

### Step 6: 同意画面で許可する

同意画面に以下の情報が表示されることを確認する:

- **アプリケーション名**: claude.ai またはそれに相当するクライアント名
- **アクセス内容**: clearflow の MCP ツールへのアクセスを許可
- **ユーザー名**: ログインしているユーザー名
- **組織名**: 所属組織名

「許可」ボタンをクリックする。

### Step 7: トークン取得の確認

同意後、claude.ai に制御が戻る。認可コードがトークンに交換され、アクセストークンとリフレッシュトークンが発行される。

### Step 8: ツール実行の確認

claude.ai から clearflow の MCP ツールを実行する。例:

```
引き合い一覧を取得して
```

clearflow の MCP ツールが正常に実行され、結果が返ることを確認する。

---

## 確認ポイント一覧

| 確認項目 | 確認方法 | 期待結果 |
|----------|----------|----------|
| メタデータ取得 | curl で `/.well-known/oauth-protected-resource` を叩く | 200 + JSON レスポンス |
| 動的登録 | 接続開始後にサーバーログを確認 | 201 が返る |
| 同意画面表示 | ブラウザで同意画面を確認 | クライアント名・アクセス内容・ユーザー名・組織名が表示される |
| トークン取得 | 接続完了後に clearflow の DB を確認 | `oauth_tokens` テーブルにレコードが存在する |
| ツール実行 | claude.ai からツールを呼び出す | 正常な結果が返る |
| 接続管理 UI | clearflow の `/account` ページを確認 | 「接続済みアプリケーション」に claude.ai が表示される |
| 接続解除 | `/account` から「接続解除」をクリック | 以後のツール実行で 401 が返る |

---

## トラブルシューティング

### HTTPS が必須

OAuth フローはブラウザからのリダイレクトを含むため、HTTP では正常に動作しない。必ず HTTPS でアクセスできる環境で確認すること。

### リダイレクト URI の確認

claude.ai が動的登録で送る `redirect_uris` は claude.ai のドメイン配下である。clearflow はこの URI を検証しないが、認可コードのリダイレクト先として正しく機能する必要がある。

### CORS 設定の確認

`/api/oauth/register` と `/api/oauth/token` は CORS ヘッダ（`Access-Control-Allow-Origin: *`）を返す。ブラウザのプリフライトが失敗する場合は、Next.js の設定やリバースプロキシの設定を確認すること。

### 同意画面が表示されない場合

1. clearflow にログインできているか確認する
2. `oauth_pending_params` Cookie が設定されているか確認する（ブラウザの開発者ツールで確認）
3. `AUTH_URL` 環境変数が正しく設定されているか確認する

### 接続済みアプリケーション一覧に表示されない場合

アクセストークンまたはリフレッシュトークンが正常に発行されているか確認する。clearflow の DB で以下を確認する:

```sql
SELECT type, client_id, user_id, expires_at, revoked_at
FROM oauth_tokens
ORDER BY created_at DESC
LIMIT 10;
```
