# Spec: スーパー管理者による組織プロビジョニング

## Requirements

### Requirement: isSuperAdmin 判定

`isSuperAdmin(email)` は環境変数 `SUPER_ADMIN_EMAILS` に含まれるメールアドレスに対して `true` を返し、含まれないメールアドレスおよび null/undefined に対して `false` を返さなければならない (SHALL)。判定は大文字小文字を区別しない (MUST)。`SUPER_ADMIN_EMAILS` が未設定または空文字列の場合、全メールアドレスに対して `false` を返さなければならない (SHALL)。

#### Scenario: 登録済みメールアドレスで判定

**Given** `SUPER_ADMIN_EMAILS` が `"admin@example.com,ops@example.com"` に設定されている
**When** `isSuperAdmin("admin@example.com")` を呼び出す
**Then** `true` が返る

#### Scenario: 大文字小文字を無視して判定

**Given** `SUPER_ADMIN_EMAILS` が `"Admin@Example.COM"` に設定されている
**When** `isSuperAdmin("admin@example.com")` を呼び出す
**Then** `true` が返る

#### Scenario: 未登録メールアドレスで判定

**Given** `SUPER_ADMIN_EMAILS` が `"admin@example.com"` に設定されている
**When** `isSuperAdmin("other@example.com")` を呼び出す
**Then** `false` が返る

#### Scenario: 環境変数が未設定の場合

**Given** `SUPER_ADMIN_EMAILS` が未設定（undefined）
**When** `isSuperAdmin("anyone@example.com")` を呼び出す
**Then** `false` が返る

#### Scenario: null/undefined 入力

**Given** `SUPER_ADMIN_EMAILS` が `"admin@example.com"` に設定されている
**When** `isSuperAdmin(null)` または `isSuperAdmin(undefined)` を呼び出す
**Then** `false` が返る

---

### Requirement: プラットフォームルートのアクセス制御

`/platform` ルートはスーパー管理者のみがアクセスでき、それ以外のユーザー（一般 admin 含む）はアクセスを拒否されなければならない (SHALL)。未認証ユーザーはログインページにリダイレクトされなければならない (MUST)。

#### Scenario: スーパー管理者がアクセス

**Given** ユーザーが認証済みで `SUPER_ADMIN_EMAILS` に含まれるメールアドレスを持つ
**When** `/platform` にアクセスする
**Then** プラットフォーム管理画面が表示される

#### Scenario: 一般 admin がアクセス

**Given** ユーザーが認証済み・role=admin だが `SUPER_ADMIN_EMAILS` に含まれない
**When** `/platform` にアクセスする
**Then** アクセスが拒否される（リダイレクトまたはエラー表示）

#### Scenario: 未認証ユーザーがアクセス

**Given** ユーザーが未認証
**When** `/platform` にアクセスする
**Then** ログインページにリダイレクトされる

---

### Requirement: 組織プロビジョニング

スーパー管理者は新規組織と初期 admin ユーザーを同一操作でプロビジョニングできなければならない (SHALL)。組織作成と初期 admin 作成は同一トランザクションで実行されなければならない (MUST)。初期 admin ユーザーは新組織に属し role=admin でなければならない (SHALL)。

#### Scenario: 正常な組織プロビジョニング

**Given** スーパー管理者が認証済み
**When** 組織名「TestOrg」、初期 admin の email「admin@testorg.com」、name「Test Admin」、password「securepass123」を指定してプロビジョニングを実行する
**Then** 新組織「TestOrg」が organizations テーブルに作成され、初期 admin ユーザーが新組織の organizationId で users テーブルに作成され、role が `"admin"` であり、パスワードが bcrypt ハッシュで保存される

#### Scenario: 既存メールアドレスとの重複

**Given** スーパー管理者が認証済みで、`"existing@example.com"` が既にユーザーとして存在する
**When** 初期 admin の email を `"existing@example.com"` に指定してプロビジョニングを実行する
**Then** エラーが返り、組織も初期 admin も作成されない（トランザクション全体がロールバック）

#### Scenario: 非スーパー管理者が provisionOrganization Server Action を呼び出す

**Given** ユーザーが認証済みだが `SUPER_ADMIN_EMAILS` に含まれない
**When** provisionOrganization の Server Action を直接呼び出す
**Then** 権限エラーが返り、組織は作成されない

---

### Requirement: 組織プロビジョニングの監査ログ

組織作成時に `organization.create` の監査ログが同一トランザクション内で記録されなければならない (MUST)。`actorId` はスーパー管理者の user id、`targetType` は `"organization"`、`targetId` は新組織の id、`organizationId` は新組織の id でなければならない (SHALL)。

#### Scenario: 監査ログの記録

**Given** スーパー管理者がプロビジョニングを実行する
**When** 組織とユーザーが正常に作成される
**Then** audit_logs テーブルに `action="organization.create"`、`targetType="organization"`、`targetId=新組織id`、`actorId=スーパー管理者のuser id`、`organizationId=新組織id` のレコードが存在する

---

### Requirement: 全組織一覧

スーパー管理者は全組織のメタ情報一覧（id, name, createdAt）を取得できなければならない (SHALL)。業務データ（ユーザー数、案件数等）は含めてはならない (MUST NOT)。

#### Scenario: 全組織一覧の取得

**Given** スーパー管理者が認証済みで、組織 A と組織 B が存在する
**When** 組織一覧を取得する
**Then** 組織 A と組織 B のメタ情報（id, name, createdAt）のみが返る

#### Scenario: 非スーパー管理者が一覧取得を試みる

**Given** ユーザーが認証済みだが `SUPER_ADMIN_EMAILS` に含まれない
**When** listAllOrganizations の Server Action を直接呼び出す
**Then** 権限エラーが返り、データは返されない

---

### Requirement: テナント分離の維持

スーパー管理者機能は組織のプロビジョニングのみを行い、各組織の業務データ（案件・契約・請求・ユーザー管理等）への横断アクセス経路を追加してはならない (MUST NOT)。既存の organizationId スコープリポジトリに非スコープメソッドを追加してはならない (MUST NOT)。ただし `organizationRepository.findAll()` と `organizationRepository.create()` のみ例外とする。

#### Scenario: 新規追加コードにテナント横断の業務データアクセスがない

**Given** 本変更で追加・変更されたコード全体
**When** コードレビューで確認する
**Then** organizations テーブルのメタ情報以外のテーブルに対して organizationId 条件なしのクエリは存在しない
