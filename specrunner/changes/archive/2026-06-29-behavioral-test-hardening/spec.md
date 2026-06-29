# Spec: behavioral-test-hardening

## Requirements

### Requirement: updateUserRole behavioral テストが mock ベースで全ガード分岐を検証する

updateUserRole usecase の自己降格ガード、最後の admin 降格ガード、正常降格パスの 3 分岐を、usecase を実行して戻り値・repository 呼び出し・監査 action を assert する behavioral テストで固定する。テストは `readSrc`/`toContain` を使用してはならない（SHALL NOT）。

#### Scenario: 自己降格は拒否される

**Given** actorId と targetUserId が同一である
**When** updateUserRole を実行する
**Then** `{ ok: false }` が返り、reason に自己変更不可のメッセージが含まれ、updateRole は呼ばれない

#### Scenario: 組織で最後の admin を非 admin に降格しようとすると拒否される

**Given** 対象ユーザーが admin であり、findByOrganization が他に有効な admin を返さない
**When** updateUserRole を newRole="member" で実行する
**Then** `{ ok: false }` が返り、reason に最低 1 人の管理者が必要なメッセージが含まれる

#### Scenario: 他に有効な admin がいれば降格が成功し監査が記録される

**Given** 対象ユーザーが admin であり、findByOrganization が他に有効な admin を 1 人以上返す
**When** updateUserRole を newRole="member" で実行する
**Then** `{ ok: true }` が返り、auditLogRepository.create が action="user.updateRole" で呼ばれ、metadata に oldRole と newRole が含まれる

### Requirement: deactivateUser behavioral テストが mock ベースで全ガード分岐を検証する

deactivateUser usecase の自己無効化ガード、最後の有効 admin 無効化ガード、正常無効化パスを behavioral テストで固定する。テストは `readSrc`/`toContain` を使用してはならない（SHALL NOT）。

#### Scenario: 自己無効化は拒否される

**Given** actorId と targetUserId が同一である
**When** deactivateUser を実行する
**Then** `{ ok: false }` が返り、reason に自己無効化不可のメッセージが含まれる

#### Scenario: 組織で最後の有効 admin の無効化は拒否される

**Given** 対象ユーザーが admin であり、findByOrganization が他に有効な admin を返さない
**When** deactivateUser を実行する
**Then** `{ ok: false }` が返り、reason に最低 1 人の管理者が必要なメッセージが含まれる

#### Scenario: 無効化成功時に deactivated_at が設定され監査が記録される

**Given** 対象ユーザーが member であり、findById が有効なユーザーを返す
**When** deactivateUser を実行する
**Then** `{ ok: true }` が返り、userRepository.deactivate が呼ばれ、auditLogRepository.create が action="user.deactivate" で呼ばれる

### Requirement: reactivateUser behavioral テストが mock ベースで全分岐を検証する

reactivateUser usecase の正常再有効化パスと既に有効なユーザーへの拒否を behavioral テストで固定する。テストは `readSrc`/`toContain` を使用してはならない（SHALL NOT）。

#### Scenario: 再有効化成功時に deactivatedAt=null となり監査が記録される

**Given** 対象ユーザーが無効化済み（deactivatedAt が非 null）
**When** reactivateUser を実行する
**Then** `{ ok: true }` が返り、userRepository.reactivate が呼ばれ、auditLogRepository.create が action="user.reactivate" で呼ばれる

#### Scenario: 既に有効なユーザーへの再有効化は拒否される

**Given** 対象ユーザーが有効（deactivatedAt が null）
**When** reactivateUser を実行する
**Then** `{ ok: false }` が返り、reason にすでに有効であるメッセージが含まれる

### Requirement: createUser behavioral テストが mock ベースで email 重複検知と正常作成を検証する

createUser usecase の email 重複拒否（事前チェック + 23505 フォールバック）、正常作成パス（bcrypt ハッシュ + 監査）を behavioral テストで固定する。テストは `readSrc`/`toContain` を使用してはならない（SHALL NOT）。

#### Scenario: email 重複時に事前チェックで拒否される

**Given** existsByEmail が true を返す
**When** createUser を実行する
**Then** `{ ok: false }` が返り、reason にメールアドレス重複のメッセージが含まれ、userRepository.create は呼ばれない

#### Scenario: DB 23505 制約違反時にフォールバックで拒否される

**Given** existsByEmail が false を返すが、db.transaction 内で code=23505 の例外が発生する
**When** createUser を実行する
**Then** `{ ok: false }` が返り、reason にメールアドレス重複のメッセージが含まれる

#### Scenario: 成功時に bcrypt ハッシュ済みパスワードで作成され監査が記録される

**Given** existsByEmail が false を返し、正常にユーザーが作成される
**When** createUser を実行する
**Then** `{ ok: true, user }` が返り、userRepository.create の引数に hashedPassword（bcrypt モックの戻り値）が含まれ、auditLogRepository.create が action="user.create" で呼ばれる

### Requirement: changeOwnPassword behavioral テストが mock ベースでパスワード照合と更新を検証する

changeOwnPassword usecase の現在パスワード不一致拒否、正常更新パス（bcrypt hash + 監査）を behavioral テストで固定する。テストは `readSrc`/`toContain` を使用してはならない（SHALL NOT）。

#### Scenario: 現在パスワード不一致で拒否される

**Given** findByIdForAuth がユーザーを返し、bcrypt.compare が false を返す
**When** changeOwnPassword を実行する
**Then** `{ ok: false }` が返り、reason に現在のパスワード不一致のメッセージが含まれ、updatePassword は呼ばれない

#### Scenario: パスワード一致時に新パスワードがハッシュされ更新・監査が記録される

**Given** findByIdForAuth がユーザーを返し、bcrypt.compare が true を返す
**When** changeOwnPassword を実行する
**Then** `{ ok: true }` が返り、userRepository.updatePassword が bcrypt.hash の戻り値で呼ばれ、auditLogRepository.create が action="user.updatePassword"・actorId=userId・targetId=userId で呼ばれる
