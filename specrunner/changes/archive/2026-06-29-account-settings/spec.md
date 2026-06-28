# Spec: アカウント設定（プロフィール編集・パスワード変更）

## Requirements

### Requirement: 本人が自分の表示名を変更できる

The system SHALL update the user's name using session.user.id as the target. The action MUST NOT accept userId from input, ensuring the target is always the authenticated user. No role gate is required (all roles are permitted).

#### Scenario: member ロールのユーザーが表示名を変更する

**Given** member ロールのユーザーがログイン済みである
**When** ユーザーが新しい表示名「山田太郎」を送信する
**Then** session.user.id に対応する users.name が「山田太郎」に更新される

#### Scenario: 他ユーザーの表示名には影響しない

**Given** ユーザー A とユーザー B が同一テナントに存在する
**When** ユーザー A が自分の表示名を変更する
**Then** ユーザー B の name は変更されない

### Requirement: パスワード変更は現在パスワード照合に成功した場合のみ実行される

The system SHALL verify the current password via bcrypt.compare before updating. If the comparison fails, the system MUST reject the request. Only when the current password matches SHALL the system hash newPassword with bcrypt.hash(pw, 12) and persist the result.

#### Scenario: 正しい現在パスワードでパスワード変更が成功する

**Given** ユーザーの現在パスワードが「oldPass123」である
**When** currentPassword に「oldPass123」、newPassword に「newPass456」を送信する
**Then** パスワードが更新され、bcrypt.compare("newPass456", 新しいハッシュ) が true を返す

#### Scenario: 誤った現在パスワードでパスワード変更が拒否される

**Given** ユーザーの現在パスワードが「oldPass123」である
**When** currentPassword に「wrongPass」を送信する
**Then** エラーが返され、パスワードは変更されない

### Requirement: パスワード変更時に user.updatePassword 監査ログが記録される

On successful password change, the system MUST record an audit log with `recordAudit({ action: "user.updatePassword", targetType: "user", targetId: userId, actorId: userId, organizationId })` within the same database transaction as the password update.

#### Scenario: パスワード変更成功時に監査ログが記録される

**Given** ユーザーが正しい現在パスワードを提供する
**When** パスワード変更が成功する
**Then** action が `user.updatePassword`、actorId と targetId が共に session.user.id である監査ログが記録される

### Requirement: findById の安全 projection が維持される

`findById(id, organizationId)` MUST NOT return hashedPassword in its projection. Password verification SHALL use a separate method `findByIdForAuth` instead.

#### Scenario: findById が hashedPassword を含まない

**Given** `findById` 関数のソースコード
**When** select オブジェクトを検査する
**Then** `hashedPassword` フィールドが含まれない

### Requirement: アカウント設定は全ロールから到達・操作できる

The `/account` page SHALL be accessible to all roles (admin / manager / finance / member). It MUST NOT be placed under the admin-restricted `/settings` route.

#### Scenario: member ロールが /account にアクセスできる

**Given** member ロールのユーザーがログイン済みである
**When** `/account` にアクセスする
**Then** アカウント設定画面が表示される（リダイレクトされない）

### Requirement: Server Action は依存方向を遵守する

The `account.ts` Server Action SHALL invoke usecases, which in turn coordinate repository and domain service calls. The Action MUST NOT import or call repositories directly (except `auth` / `revalidatePath`).

#### Scenario: account.ts が usecase 経由で処理する

**Given** `src/app/actions/account.ts` のソースコード
**When** インポートを検査する
**Then** `@/application/usecases` からのインポートがあり、`@/infrastructure/repositories` からの直接インポートがない
