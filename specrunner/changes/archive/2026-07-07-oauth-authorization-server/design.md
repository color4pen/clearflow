# Design: MCP クライアント向け OAuth 2.1 認可サーバー

## Context

clearflow の MCP エンドポイント（`/api/mcp`）は Bearer トークン検証を `resolveBearer`（`apiTokenResolver.ts`）経由で行い、`{ userId, organizationId, role }` を解決する。PAT（`cfp_` プレフィクス）はヘッダ設定可能なクライアント向けには十分だが、claude.ai custom connector のようなブラウザベースの MCP クライアントは OAuth フローを前提とし、任意ヘッダの PAT を設定できない。

MCP 認可仕様（2025-06-18）は以下の discovery 経路を規定する:

1. MCP リクエスト（トークンなし）→ 401 + `WWW-Authenticate: Bearer resource_metadata="..."` ヘッダ
2. クライアントが Protected Resource Metadata（RFC 9728）を取得 → `authorization_servers` フィールドから認可サーバー URL を発見
3. Authorization Server Metadata（RFC 8414）を取得 → エンドポイント情報を発見
4. Dynamic Client Registration（RFC 7591）で client_id を取得（初回のみ）
5. Authorization Code + PKCE フローで認可コードを取得
6. Token エンドポイントでアクセストークン + リフレッシュトークンを取得
7. アクセストークンで MCP リクエスト

前提:
- `api-token-foundation`（PAT 基盤）と `mcp-server-core` がマージ済み
- `resolveBearer` は PAT 専用。OAuth トークン解決は未実装
- OAuth クライアント・認可コード・トークンのスキーマは未存在
- 既存テスト（`mcpAuth.test.ts`）は `resolveBearer` の関数名と `hasApiTokenPrefix` の存在を文字列照合でアサートしており、これらの関数名は維持が必要

## Goals / Non-Goals

**Goals**:

- MCP 認可仕様（2025-06-18）に準拠した OAuth 2.1 認可サーバーを clearflow 自身に構築する
- メタデータ発見（RFC 9728 / RFC 8414）→ 動的クライアント登録（RFC 7591）→ 認可コード + PKCE → トークン取得の一連のフローを実装する
- OAuth アクセストークンを既存の Bearer 検証インターフェースに統合し、PAT と同じ `{ userId, organizationId, role }` を解決する
- 接続管理 UI（接続済みアプリケーション一覧・接続解除）をアカウント設定に追加する
- 同意・接続解除を監査ログに記録する
- OAuth クライアント・OAuth トークンのエンティティを `design/domain/model.md` に追加する

**Non-Goals**:

- トークンの権限スコープ（scope による read-only 制限）— 接続 = ユーザー本人の全権限
- 外部 IdP（Google 等）を認可サーバーとして使う構成
- PAT の廃止（併存させる）
- Resource Indicators（RFC 8707）の `resource` パラメータによる audience 検証 — 認可サーバーと MCP リソースサーバーが同一ホストの self-hosted 構成のため、トークンは自サーバー専用。クライアントが送る `resource` パラメータは受け入れるが、audience claim を埋め込んだ JWT は採用しない（D2 参照）

## Decisions

### D1: `resolveBearer` を PAT / OAuth トークン統合 dispatcher として拡張する

resolveBearer の既存シグネチャと関数名を維持する。内部で「PAT プレフィクス（`cfp_`）を持つ → PAT 解決パス」「持たない → OAuth アクセストークン解決パス」に分岐する。

**Rationale**: 既存テスト（`mcpAuth.test.ts`）が `resolveBearer` と `hasApiTokenPrefix` の関数名を文字列照合でアサートしている。関数名の変更はテスト破壊を招く。dispatch パターンなら MCP route（`route.ts`）の呼び出しコードは無変更で OAuth トークンを透過的に処理できる。

**Alternatives considered**: 別関数 `resolveOAuthBearer` を route.ts で呼び分ける → route.ts の変更が大きく、テスト影響の調査範囲が広がる。却下。

### D2: アクセストークンはランダム opaque 文字列（JWT 不採用）

アクセストークンは `oat_` プレフィクス + 32 バイトランダム（base64url）の opaque 文字列とする。SHA-256 ハッシュで DB に保存し、検証時は DB 照合する。JWT は採用しない。

**Rationale**: clearflow は自己完結型（認可サーバーとリソースサーバーが同一プロセス）。JWT の利点（署名検証のみで DB 不要）は DB 照合コストが無視できるこの構成では不要。opaque トークンなら即時失効（DB 削除で無効化）が可能で、JWT の有効期限内は失効できない問題を回避できる。PAT と同じ opaque + ハッシュ保存パターンを踏襲し、実装の一貫性も保てる。

**Alternatives considered**: JWT（署名検証のみ）→ 即時失効不可、鍵管理の複雑さ。却下。

### D3: OAuth クライアントはプラットフォームレベル（組織スコープ外）で保持する

`oauth_clients` テーブルは `organizationId` を持たない。claude.ai 等の MCP クライアントは特定組織に属さず、任意のユーザーが同一クライアントで接続する。同意（`oauth_tokens` テーブル）側で `userId` + `organizationId` を保持し、テナント分離を担保する。

**Rationale**: 動的クライアント登録は組織コンテキスト外で発生する（ユーザーが未認証の段階で実行されうる）。クライアントを組織に紐づけると、1 クライアントが複数組織のユーザーに接続を提供できない。`inv-all-tenant-scoped` の意図的な例外として、`oauth_clients` は組織スコープ外とし、テナント分離は同意レコード（`oauth_tokens`）が担保する。

**Alternatives considered**: クライアントを組織スコープにする → claude.ai が組織ごとに別 client_id を持つ必要があり、動的登録の意味がなくなる。却下。

### D4: リフレッシュトークンローテーション + 再利用検知で系列失効

リフレッシュトークンは `family_id`（UUID）で系列を管理する。リフレッシュ時に旧トークンを失効させ新トークンを発行する（ローテーション）。失効済みトークンでリフレッシュが試行された場合、同一 `family_id` の全トークン（アクセス + リフレッシュ）を失効させる（再利用検知）。

**Rationale**: MCP クライアントは public client（client_secret を保持できない）であり、盗難トークンの検知手段がローテーションしかない。OAuth 2.1 の推奨に従う。

**Alternatives considered**: リフレッシュトークンなし（アクセストークンのみ） → 頻繁な再認可が必要でユーザー体験が悪い。却下。

### D5: 認可コード・トークンを単一テーブル `oauth_tokens` で管理する

認可コード・アクセストークン・リフレッシュトークンを `type` カラム（`authorization_code` / `access_token` / `refresh_token`）で区別する単一テーブルとする。共通カラム（`client_id`, `userId`, `organizationId`, `codeHash`/`tokenHash`, `expiresAt`, `revokedAt`）に加え、認可コード固有（`codeChallenge`, `codeChallengeMethod`, `redirectUri`）、トークン固有（`familyId`）のカラムを持つ。

**Rationale**: 認可コード → トークン交換、リフレッシュ → ローテーションなど、これらのレコードは密接に関連する。単一テーブルなら `family_id` での系列一括失効が 1 クエリで完結する。テーブル数の増加を抑え、マイグレーションも 1 つで済む。

**Alternatives considered**: `oauth_authorization_codes` / `oauth_access_tokens` / `oauth_refresh_tokens` の 3 テーブル → 系列失効が 3 テーブルにまたがり複雑。却下。

### D6: 認可エンドポイントのパス設計

- Protected Resource Metadata: `/.well-known/oauth-protected-resource` → Next.js の `src/app/.well-known/oauth-protected-resource/route.ts`
- Authorization Server Metadata: `/.well-known/oauth-authorization-server` → `src/app/.well-known/oauth-authorization-server/route.ts`
- Dynamic Client Registration: `/api/oauth/register` → `src/app/api/oauth/register/route.ts`
- Authorize: `/api/oauth/authorize` → `src/app/api/oauth/authorize/route.ts`（GET: 同意画面へリダイレクト、POST: 同意処理）
- Token: `/api/oauth/token` → `src/app/api/oauth/token/route.ts`
- 同意画面: `/oauth/consent` → `src/app/(auth)/oauth/consent/page.tsx`

**Rationale**: `/.well-known/` は RFC が規定するパス。`/api/oauth/` は既存の `/api/auth/` と衝突しない namespace。同意画面は `(auth)` レイアウトグループに配置し、ログインと同じ認証チェック機構を再利用する。

### D7: 同意画面は既存の Auth.js セッションで認証する

`/api/oauth/authorize` への GET リクエスト時、Auth.js セッションが無ければ `/login` へリダイレクトし、ログイン後に認可フローへ戻す。セッションがあれば同意画面（`/oauth/consent`）を表示する。同意画面はクライアント名・アクセス内容・ユーザー名/組織名を表示し、許可/拒否を選択できる。

**Rationale**: 既存の認証基盤（Auth.js + JWT セッション）を再利用し、新規の認証メカニズムを導入しない。

### D8: 接続管理 UI はアカウント設定ページに追加する

`/account` ページ（`src/app/(dashboard)/account/page.tsx`）に「接続済みアプリケーション」セクションを追加する。API トークンセクションと並列に配置する。一覧にはクライアント名・最終使用日時・許可日時を表示し、接続解除（トークン系列の全失効）を提供する。

**Rationale**: アカウント設定ページは既に API トークン管理を持ち、個人の認証情報管理の場所として一貫している。管理者設定（`/settings`）ではなく個人設定に置くことで、各ユーザーが自分の接続のみを管理する。

### D9: 動的クライアント登録のレート制限

登録レート制限は per-IP で適用する。既存の `rateLimitRecords` テーブルを再利用し、key は `oauth_register:<ip>` 形式とする。閾値は 10 件/時間とする。

**Rationale**: 動的登録は未認証で呼べるエンドポイントであり、ボット攻撃による大量登録を防ぐ必要がある。per-IP が最も自然な粒度。既存のレート制限テーブル・ロジックを再利用してコードの重複を避ける。

### D10: トークン有効期限

- アクセストークン: 1 時間
- リフレッシュトークン: 30 日
- 認可コード: 10 分

**Rationale**: OAuth 2.1 の推奨に沿い、MCP クライアントとの相性を考慮した設定。アクセストークン 1 時間はセッション中の操作に十分で、リフレッシュトークン 30 日は再認可なしの長期接続を可能にする。認可コードは RFC が推奨する短寿命。

### D11: WWW-Authenticate ヘッダの追加

MCP エンドポイント（`/api/mcp`）が 401 を返す際、`WWW-Authenticate: Bearer resource_metadata="https://<host>/.well-known/oauth-protected-resource"` ヘッダを含める。RFC 9728 Section 5.1 に準拠。

**Rationale**: MCP 認可仕様が MUST として要求。クライアントがこのヘッダから Protected Resource Metadata の URL を発見し、認可フローを開始する。

### D12: proxy.ts の除外パス追加

`proxy.ts`（リクエストプロキシ）に `/.well-known/` と `/api/oauth/` を認証除外パスとして追加する。OAuth フローのエンドポイント（メタデータ取得・クライアント登録・トークン取得）は未認証で呼び出せる必要がある。`/oauth/consent` は Auth.js セッションで認証するため除外不要（セッションなしならログインへリダイレクト）。

## Risks / Trade-offs

[Risk] opaque トークンは DB 照合が毎リクエスト発生する → [Mitigation] PAT と同じパスを通るため、既にこのコストは受容済み。インデックス付き tokenHash での照合は十分高速。将来的にキャッシュ層を追加する余地はある。

[Risk] `oauth_clients` テーブルが組織スコープ外であり `inv-all-tenant-scoped` の例外となる → [Mitigation] `design/domain/invariants.md` にこの例外を明記する。テナント分離は `oauth_tokens`（同意レコード）が `userId` + `organizationId` で担保する。`oauth_clients` はプラットフォーム共有のメタデータに過ぎず、テナントの機密データを含まない。

[Risk] 動的クライアント登録が悪用されクライアント数が際限なく増える → [Mitigation] per-IP レート制限（10 件/時間）を適用する。古い未使用クライアントの定期的なクリーンアップは将来タスクとしてスコープ外。

[Risk] 再利用検知による系列一括失効が正当なユーザーの接続を切断する（ネットワーク遅延で旧リフレッシュトークンが再送される場合） → [Mitigation] OAuth 2.1 の推奨動作であり、セキュリティとのトレードオフとして受容する。ユーザーは再接続（再認可）で復旧できる。

## Open Questions

なし — 設計判断は architect 評価済みの内容に基づき確定している。
