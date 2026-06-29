# Spec: ユーザーの無効化・再有効化

## Requirements

### Requirement: 管理者は自組織のユーザーを無効化できる

admin ロールの操作者 SHALL 自組織内の他ユーザーを無効化できる。無効化により `users.deactivated_at` に現在時刻が設定される。admin 以外（manager/finance/member）は無効化を実行できない。

#### Scenario: admin が member を無効化する

**Given** 操作者が admin ロール、対象ユーザーが同一組織の member ロール
**When** `deactivateUserAction` を実行する
**Then** 対象ユーザーの `deactivated_at` に現在時刻が設定され、`user.deactivate` 監査ログが記録される

#### Scenario: manager が member を無効化しようとする

**Given** 操作者が manager ロール
**When** `deactivateUserAction` を実行する
**Then** 「この操作を実行する権限がありません」エラーが返り、対象ユーザーは変更されない

#### Scenario: finance が member を無効化しようとする

**Given** 操作者が finance ロール
**When** `deactivateUserAction` を実行する
**Then** 「この操作を実行する権限がありません」エラーが返り、対象ユーザーは変更されない

#### Scenario: member が member を無効化しようとする

**Given** 操作者が member ロール
**When** `deactivateUserAction` を実行する
**Then** 「この操作を実行する権限がありません」エラーが返り、対象ユーザーは変更されない

### Requirement: 管理者は自組織の無効化済みユーザーを再有効化できる

admin ロールの操作者 SHALL 自組織内の無効化済みユーザーを再有効化できる。再有効化により `users.deactivated_at` が null に設定される。

#### Scenario: admin が無効化済みユーザーを再有効化する

**Given** 操作者が admin ロール、対象ユーザーの `deactivated_at` が non-null
**When** `reactivateUserAction` を実行する
**Then** 対象ユーザーの `deactivated_at` が null になり、`user.reactivate` 監査ログが記録される

### Requirement: 自分自身は無効化できない

操作者 SHALL 自分自身を無効化できない（`actorId === targetUserId` の場合は拒否）。

#### Scenario: admin が自分自身を無効化しようとする

**Given** 操作者が admin ロール、`actorId === targetUserId`
**When** `deactivateUser` usecase を実行する
**Then** 「自分自身は無効化できません」エラーが返り、ユーザーは変更されない

### Requirement: 組織で最後の admin は無効化できない

組織内で唯一の有効な admin である場合、そのユーザーの無効化 SHALL 拒否される。

#### Scenario: 組織の唯一の admin を無効化しようとする

**Given** 組織に admin が 1 人だけ存在する
**When** その admin を無効化しようとする
**Then** 「組織に最低1人の管理者が必要です」エラーが返り、ユーザーは変更されない

#### Scenario: 複数 admin がいる場合に一人を無効化する

**Given** 組織に admin が 2 人以上存在する
**When** そのうち 1 人を無効化する
**Then** 無効化が成功する

### Requirement: 無効化済みユーザーは認証できない

無効化済みユーザー（`deactivated_at IS NOT NULL`）SHALL login 認証で拒否される。

#### Scenario: 無効化済みユーザーが正しいパスワードでログインしようとする

**Given** ユーザーの `deactivated_at` が non-null
**When** 正しい email/password で `findByEmailForAuth` が呼ばれる
**Then** `findByEmailForAuth` は null を返し、認証が失敗する

### Requirement: 無効化・再有効化は監査ログに記録される

`deactivateUser` usecase SHALL `user.deactivate` アクションの監査ログを記録する。`reactivateUser` usecase SHALL `user.reactivate` アクションの監査ログを記録する。

#### Scenario: 無効化時の監査ログ

**Given** admin が member を無効化する
**When** 無効化が完了する
**Then** 監査ログに `action: "user.deactivate"`, `targetType: "user"`, `targetId: <対象ユーザーID>`, `actorId: <操作者ID>`, `organizationId: <組織ID>` が記録される

#### Scenario: 再有効化時の監査ログ

**Given** admin が無効化済みユーザーを再有効化する
**When** 再有効化が完了する
**Then** 監査ログに `action: "user.reactivate"`, `targetType: "user"`, `targetId: <対象ユーザーID>`, `actorId: <操作者ID>`, `organizationId: <組織ID>` が記録される

### Requirement: 操作は自組織のユーザーにのみ作用する

無効化・再有効化の WHERE 条件 SHALL `(id, organizationId)` で絞り、他組織のユーザーには影響しない。

#### Scenario: 異なる組織のユーザーを無効化しようとする

**Given** 操作者の organizationId と対象ユーザーの organizationId が異なる
**When** 無効化を実行する
**Then** 対象ユーザーは見つからず、エラーが返る

### Requirement: 差分マイグレーションは deactivated_at 追加のみ

マイグレーションファイル SHALL `deactivated_at` カラムの追加のみを含み、他のテーブル変更やカラム変更を含まない。

#### Scenario: マイグレーションの内容

**Given** `bun run db:generate` でマイグレーションを生成する
**When** マイグレーション SQL を確認する
**Then** `ALTER TABLE ... ADD COLUMN "deactivated_at"` のみが含まれる
