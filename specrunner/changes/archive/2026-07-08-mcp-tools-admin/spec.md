# Spec: MCP ツール 管理系（組織・ユーザー・Webhook・監査ログ）

## Requirements

### Requirement: organization ツールは get / update 操作を提供する

organization ツール SHALL get（組織情報取得）と update（組織名変更）の 2 操作を `operation` 引数による discriminatedUnion で提供する。organizationId は authInfo.extra から取得し、ツール引数には含めない。

#### Scenario: get で自組織の情報を取得できる

**Given** admin ロールの PAT で認証されたリクエスト
**When** organization ツールを `{ operation: "get" }` で呼ぶ
**Then** 自組織の id, name, createdAt を含む JSON が返る

#### Scenario: update で組織名を変更できる

**Given** admin ロールの PAT で認証されたリクエスト
**When** organization ツールを `{ operation: "update", name: "新しい名前" }` で呼ぶ
**Then** updateOrganization usecase が呼ばれ、成功時に結果が返る

#### Scenario: admin 以外のロールでは update が拒否される

**Given** member ロールの PAT で認証されたリクエスト
**When** organization ツールを `{ operation: "update", name: "..." }` で呼ぶ
**Then** isError: true で権限エラーが返り、usecase に到達しない

### Requirement: users ツールは list / create / update_role / deactivate / reactivate 操作を提供する

users ツール SHALL 5 操作を提供する。すべての書き込み操作は admin ロール限定（canPerform の organization エンティティ配下）。list は admin / manager に許可される。

#### Scenario: list で自組織のユーザー一覧を取得できる

**Given** admin ロールの PAT で認証されたリクエスト
**When** users ツールを `{ operation: "list" }` で呼ぶ
**Then** 自組織のユーザー一覧が返る（パスワード情報は含まれない）

#### Scenario: create でユーザーを作成できる

**Given** admin ロールの PAT で認証されたリクエスト
**When** users ツールを `{ operation: "create", email, name, role, password }` で呼ぶ
**Then** createUser usecase が呼ばれ、成功時にユーザー情報が返る

#### Scenario: update_role でロールを変更できる

**Given** admin ロールの PAT で認証されたリクエスト
**When** users ツールを `{ operation: "update_role", userId, role }` で呼ぶ
**Then** updateUserRole usecase が呼ばれ、自己変更・最後の admin 降格は既存ガードで拒否される

#### Scenario: deactivate でユーザーを無効化できる

**Given** admin ロールの PAT で認証されたリクエスト
**When** users ツールを `{ operation: "deactivate", userId }` で呼ぶ
**Then** deactivateUser usecase が呼ばれ、自己無効化・最後の admin 無効化は既存ガードで拒否される

#### Scenario: reactivate でユーザーを再有効化できる

**Given** admin ロールの PAT で認証されたリクエスト
**When** users ツールを `{ operation: "reactivate", userId }` で呼ぶ
**Then** reactivateUser usecase が呼ばれ、成功時に結果が返る

#### Scenario: member ロールでは全操作が拒否される

**Given** member ロールの PAT で認証されたリクエスト
**When** users ツールを任意の operation で呼ぶ
**Then** isError: true で権限エラーが返り、usecase に到達しない

### Requirement: users ツールの deactivate は自己ロックアウト防止が機能する

users ツール SHALL deactivateUser usecase の既存ガード（actorId === targetUserId の拒否、最後の admin の拒否）を MCP 経由でもそのまま適用する。

#### Scenario: 自分自身の無効化が拒否される

**Given** admin ロールの PAT（userId: "user-A"）で認証されたリクエスト
**When** users ツールを `{ operation: "deactivate", userId: "user-A" }` で呼ぶ
**Then** isError: true で「自分自身は無効化できません」が返る

### Requirement: webhooks ツールは 6 操作を提供し、シークレットは create 時のみ返す

webhooks ツール SHALL list / create / delete / toggle / list_deliveries / retry_delivery の 6 操作を提供する。すべて admin ロール限定（canPerform の organization.manageWebhooks）。

#### Scenario: create でフルシークレットが返る

**Given** admin ロールの PAT で認証されたリクエスト
**When** webhooks ツールを `{ operation: "create", url: "https://example.com/hook", events: ["request.created"] }` で呼ぶ
**Then** レスポンスに `secret` フィールドがフル形式（"whsec_..."）で含まれる

#### Scenario: list でシークレットが含まれない

**Given** admin ロールの PAT で認証されたリクエスト
**When** webhooks ツールを `{ operation: "list" }` で呼ぶ
**Then** 各エンドポイントのレスポンスに `secret` フィールドが含まれない

#### Scenario: create で HTTPS 以外の URL が拒否される

**Given** admin ロールの PAT で認証されたリクエスト
**When** webhooks ツールを `{ operation: "create", url: "http://example.com/hook", events: [...] }` で呼ぶ
**Then** isError: true でバリデーションエラーが返る

#### Scenario: retry_delivery で failed 以外の配信がエラーになる

**Given** admin ロールの PAT で認証されたリクエスト
**When** webhooks ツールを `{ operation: "retry_delivery", deliveryId }` で呼ぶ（status が "delivered" の配信）
**Then** isError: true で「failed 状態の配信のみリトライできます」が返る

### Requirement: audit_logs ツールは読み取り専用の search 操作を提供する

audit_logs ツール SHALL search 操作のみを提供する（inv-audit-log-append-only に従い書き込み操作は不可）。admin ロール限定。フィルタ（startDate / endDate / action / actorId / targetType）とページネーション（limit / offset）を受け付ける。

#### Scenario: admin が自組織の監査ログを検索できる

**Given** admin ロールの PAT で認証されたリクエスト
**When** audit_logs ツールを `{ operation: "search" }` で呼ぶ
**Then** listAuditLogs usecase が authInfo の organizationId で呼ばれ、結果が構造化 JSON で返る

#### Scenario: フィルタ付きで検索できる

**Given** admin ロールの PAT で認証されたリクエスト
**When** audit_logs ツールを `{ operation: "search", targetType: "user", limit: 10 }` で呼ぶ
**Then** listAuditLogs usecase にフィルタが渡され、対象のログのみが返る

#### Scenario: admin 以外のロールでは拒否される

**Given** member ロールの PAT で認証されたリクエスト
**When** audit_logs ツールを `{ operation: "search" }` で呼ぶ
**Then** isError: true で権限エラーが返り、usecase に到達しない

#### Scenario: 検索結果は自組織のログのみ返す

**Given** admin ロールの PAT（organizationId: "org-A"）で認証されたリクエスト
**When** audit_logs ツールを `{ operation: "search" }` で呼ぶ
**Then** listAuditLogs に渡される organizationId は "org-A" であり、他テナントのログは返らない

### Requirement: 全管理系ツールの書き込み操作は監査ログに記録される

organization の update、users の create / update_role / deactivate / reactivate SHALL 各 usecase を経由することで監査ログに記録される。webhooks の create / delete / toggle は Server Actions 同様に直接 repository 操作だが、これらは現状 Server Actions でも監査記録されていないため、MCP でも同一挙動とする。

#### Scenario: users create の監査記録

**Given** admin ロールの PAT で認証されたリクエスト
**When** users ツールを `{ operation: "create", ... }` で呼ぶ
**Then** createUser usecase 内で recordAudit が user.create アクションで呼ばれる

### Requirement: ツール登録数が 19 になる

ツール登録テスト SHALL 15 → 19 に更新し、新規 4 ツール（organization, users, webhooks, audit_logs）が tools/list に含まれることを検証する。

#### Scenario: tools/list が 19 ツールを返す

**Given** McpServer に全 19 ツールの register 関数が呼ばれている
**When** tools/list リクエストを送信する
**Then** レスポンスに 19 件のツールが含まれ、organization, users, webhooks, audit_logs が存在する
