# Spec: API トークンの発行・失効と Bearer 認証

## Requirements

### Requirement: トークン発行時に平文を一度だけ返し、以後は取得不能にする

システムは `createApiToken` ユースケース実行時に平文トークンを発行レスポンスに含めなければならない（SHALL）。DB には SHA-256 ハッシュのみを保存し、平文は以後のどの API・画面からも取得できてはならない（MUST NOT）。

#### Scenario: トークンを発行し平文を受け取る

**Given** ユーザー A がログインしている
**When** ユーザー A が名前「MCP用」で `createApiToken` を実行する
**Then** レスポンスに `cfp_` で始まる平文トークンが含まれ、DB の `api_tokens.tokenHash` には SHA-256 ハッシュのみが保存される

#### Scenario: 発行済みトークンの平文を再取得しようとする

**Given** ユーザー A がトークンを発行済みである
**When** ユーザー A がトークン一覧を取得する
**Then** 各トークンの `tokenPrefix`（先頭 8 文字）のみが返り、平文やハッシュは含まれない

---

### Requirement: Bearer トークンからユーザーを解決する

`resolveBearer` 関数は `Authorization: Bearer cfp_...` ヘッダの平文トークンから SHA-256 ハッシュを算出し、DB 照合でユーザーを特定しなければならない（SHALL）。解決成功時は `{ userId, organizationId, role }` を返す。

#### Scenario: 有効なトークンでユーザーを解決する

**Given** ユーザー A（organizationId=org1, role=member）が発行したトークン T が有効である
**When** `Authorization: Bearer <T の平文>` で `resolveBearer` を呼び出す
**Then** `{ userId: A.id, organizationId: org1, role: "member" }` が返る

#### Scenario: 存在しないトークンで解決を試みる

**Given** DB に存在しないトークン文字列がある
**When** そのトークンで `resolveBearer` を呼び出す
**Then** `null` が返る

---

### Requirement: 失効済み・期限切れトークンを拒否する

`resolveBearer` は `revokedAt` が非 null のトークン、および `expiresAt` が現在時刻より前のトークンを拒否しなければならない（MUST）。

#### Scenario: 失効済みトークンを拒否する

**Given** ユーザー A のトークン T が失効済み（revokedAt が設定済み）である
**When** トークン T で `resolveBearer` を呼び出す
**Then** `null` が返る

#### Scenario: 期限切れトークンを拒否する

**Given** ユーザー A のトークン T の expiresAt が過去の日時である
**When** トークン T で `resolveBearer` を呼び出す
**Then** `null` が返る

---

### Requirement: 不正形式のトークンを拒否する

`resolveBearer` は `cfp_` で始まらないトークン、または `Authorization` ヘッダが `Bearer ` で始まらないリクエストを拒否しなければならない（MUST）。

#### Scenario: prefix なしのトークンを拒否する

**Given** `cfp_` で始まらない文字列がある
**When** `Authorization: Bearer <その文字列>` で `resolveBearer` を呼び出す
**Then** `null` が返る

#### Scenario: Bearer scheme でないヘッダを拒否する

**Given** Authorization ヘッダが `Basic xxx` である
**When** `resolveBearer` を呼び出す
**Then** `null` が返る

---

### Requirement: deactivated ユーザーのトークンを拒否する

`resolveBearer` はトークン自体が有効でも、対応するユーザーの `deactivatedAt` が非 null の場合に拒否しなければならない（MUST）。

#### Scenario: deactivated ユーザーのトークンを拒否する

**Given** ユーザー A が deactivated 状態であり、トークン T は revoke されていない
**When** トークン T で `resolveBearer` を呼び出す
**Then** `null` が返る

---

### Requirement: トークンの一覧・発行・失効は本人のみ

createApiToken / revokeApiToken / listApiTokens は本人の `userId` でスコープされなければならない（SHALL）。admin であっても他ユーザーのトークンを操作・閲覧できてはならない（MUST NOT）。

#### Scenario: 自分のトークンを一覧する

**Given** ユーザー A がトークンを 2 つ発行済みであり、ユーザー B がトークンを 1 つ発行済みである
**When** ユーザー A が `listApiTokens` を実行する
**Then** ユーザー A のトークン 2 つのみが返り、ユーザー B のトークンは含まれない

#### Scenario: 他ユーザーのトークンを失効しようとする

**Given** ユーザー A（admin）がユーザー B のトークン T の ID を知っている
**When** ユーザー A が `revokeApiToken(T.id)` を実行する
**Then** 失効は拒否される（トークンが見つからないとしてエラーが返る）

---

### Requirement: 発行・失効が監査ログに記録される

トークンの発行時は `api_token.create`、失効時は `api_token.revoke` を同一トランザクション内で監査ログに記録しなければならない（MUST）。メタデータに平文・ハッシュを含めてはならない（MUST NOT）。

#### Scenario: トークン発行時に監査ログが記録される

**Given** ユーザー A がトークンを発行する
**When** `createApiToken` ユースケースがトランザクションを完了する
**Then** `action='api_token.create'`, `targetType='api_token'`, `targetId=新トークンID` の監査ログが同一トランザクション内で記録され、metadata に平文・ハッシュは含まれない

#### Scenario: トークン失効時に監査ログが記録される

**Given** ユーザー A が自分のトークン T を失効する
**When** `revokeApiToken` ユースケースがトランザクションを完了する
**Then** `action='api_token.revoke'`, `targetType='api_token'`, `targetId=T.id` の監査ログが同一トランザクション内で記録される

---

### Requirement: テナント分離 — api_tokens テーブルのクエリに organizationId 条件を付与する

api_tokens テーブルに対する全クエリは organizationId を WHERE 条件に含めなければならない（SHALL）。organizationId はセッション（認証済みユーザー）から取得し、リクエストボディから受け取ってはならない。

#### Scenario: トークン一覧が自組織のみ返る

**Given** 組織 A のユーザー A1 がトークンを 2 つ持ち、組織 B のユーザー B1 がトークンを 1 つ持つ
**When** ユーザー A1 が `listApiTokens` を実行する
**Then** ユーザー A1 の 2 つのトークンのみが返る

---

### Requirement: lastUsedAt が Bearer 解決時に更新される

`resolveBearer` で認証に成功した場合、対象トークンの `lastUsedAt` を現在時刻に更新しなければならない（SHALL）。

#### Scenario: 認証成功時に lastUsedAt が更新される

**Given** トークン T の lastUsedAt が null である
**When** トークン T で `resolveBearer` を呼び出し認証に成功する
**Then** トークン T の lastUsedAt が現在時刻付近の値に更新される
