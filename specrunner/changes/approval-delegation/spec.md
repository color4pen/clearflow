# Spec: Approval Delegation

## Requirements

### Requirement: Delegated approval via active delegation

委譲先ユーザーは、アクティブな委譲の委譲元ロールで承認ステップを承認できなければならない（SHALL）。

`canApprove` は、直接のロール一致に加え、`delegations` 内のアクティブな委譲で委譲元ロールが `step.approverRole` と一致する場合に `true` を返す。複数委譲がマッチする場合は `startDate` が最も新しいものを採用する。

#### Scenario: Delegated user can approve

**Given** manager ロールの User A が admin ロールの User B に委譲を設定している（期間内、isActive=true）
**When** User B が manager ロールを要求する承認ステップに対して承認操作を行う
**Then** `canApprove` が `true` を返し、承認が成功する

#### Scenario: Delegation outside active period is rejected

**Given** User A から User B への委譲が存在するが、現在日時が `startDate` より前または `endDate` より後
**When** User B が承認操作を行う
**Then** `findActiveByToUserId` が該当委譲を返さず、直接ロール不一致のため承認が拒否される

#### Scenario: Inactive delegation is ignored

**Given** User A から User B への委譲が存在するが、`isActive = false`
**When** User B が承認操作を行う
**Then** `findActiveByToUserId` が該当委譲を返さず、承認が拒否される

### Requirement: Self-delegation SHALL be rejected

`fromUserId === toUserId` の委譲作成を拒否しなければならない（SHALL）。

#### Scenario: Self-delegation attempt

**Given** admin ユーザーが委譲作成画面で fromUserId と toUserId に同一ユーザーを指定する
**When** 委譲作成を実行する
**Then** バリデーションエラーが返り、委譲は作成されない

### Requirement: Cross-organization delegation SHALL be rejected

`fromUserId` と `toUserId` が異なる `organizationId` に属する委譲を作成してはならない（SHALL）。

#### Scenario: Cross-org delegation attempt

**Given** User A が Org X に属し、User B が Org Y に属する
**When** admin が User A → User B の委譲を作成しようとする
**Then** バリデーションエラーが返り、委譲は作成されない

### Requirement: Overlapping delegation SHALL be rejected

同一 `fromUserId` → `toUserId` の組み合わせで、期間が重複するアクティブな委譲を作成してはならない（SHALL）。

#### Scenario: Overlapping period

**Given** User A → User B の委譲が 6/18〜6/25 で存在する（isActive=true）
**When** admin が User A → User B の 6/20〜6/30 の委譲を作成しようとする
**Then** 重複エラーが返り、委譲は作成されない

#### Scenario: Non-overlapping period succeeds

**Given** User A → User B の委譲が 6/18〜6/25 で存在する（isActive=true）
**When** admin が User A → User B の 6/26〜7/02 の委譲を作成する
**Then** 委譲が正常に作成される

### Requirement: Delegation data SHALL be fetched inside transaction

`approveRequest` usecase は、トランザクション内で `findActiveByToUserId` を呼び出し、最新の委譲データで `canApprove` を判定しなければならない（SHALL）。TOCTOU 防止。`rejectRequest` への委譲チェック追加は本 request のスコープ外（tasks.md T-10 参照）。

#### Scenario: Delegation revoked during approval

**Given** User B に対するアクティブな委譲が存在する
**When** User B が承認操作を開始した後、トランザクション開始前に委譲が無効化される
**Then** TX 内で最新データを取得するため、委譲無効化が反映され承認が拒否される

### Requirement: Audit log SHALL record delegatedFrom for delegated approvals

代理承認で操作した場合、`audit_logs` の `metadata` に `{ delegatedFrom: userId }` を記録しなければならない（SHALL）。通常承認では記録しない。

#### Scenario: Delegated approval audit log

**Given** User A（manager）から User B（admin）への委譲がアクティブ
**When** User B が代理承認でステップを承認する
**Then** 作成される audit_log の metadata に `delegatedFrom: User A の ID` が含まれる

#### Scenario: Normal approval audit log

**Given** User C が manager ロールで、委譲なしで承認ステップを承認する
**When** 承認操作を行う
**Then** 作成される audit_log の metadata に `delegatedFrom` は含まれない

### Requirement: createDelegation SHALL record audit log on success

`createDelegation` usecase は、委譲の作成が成功した場合、`audit_logs` にその操作を記録しなければならない（SHALL）。失敗時（バリデーションエラー等）は記録しない。

#### Scenario: Delegation creation is logged

**Given** admin ユーザーが有効な委譲を作成する
**When** `createDelegation` usecase が正常に完了する
**Then** `audit_logs` に委譲作成を示すレコードが作成される

### Requirement: deactivateDelegation SHALL record audit log

`deactivateDelegation` usecase は、委譲の無効化が成功した場合、`audit_logs` にその操作を記録しなければならない（SHALL）。対象委譲が存在しない場合は記録しない。

#### Scenario: Delegation deactivation is logged

**Given** アクティブな委譲が存在する
**When** `deactivateDelegation` usecase が正常に完了する
**Then** `audit_logs` に委譲無効化を示すレコードが作成される

### Requirement: Delegation management SHALL be admin-only

委譲の作成・無効化は admin ロールのユーザーのみが実行できなければならない（SHALL）。

#### Scenario: Admin creates delegation

**Given** admin ロールのユーザーがログインしている
**When** `/settings/delegations` で委譲を作成する
**Then** 委譲が正常に作成される

#### Scenario: Non-admin cannot access delegation management

**Given** member ロールのユーザーがログインしている
**When** `/settings/delegations` にアクセスしようとする
**Then** 権限エラーが返る

### Requirement: approval_delegations table schema

`approval_delegations` テーブルは以下のカラムを持たなければならない（SHALL）:
- `id` (uuid, PK)
- `from_user_id` (FK → users.id)
- `to_user_id` (FK → users.id)
- `organization_id` (FK → organizations.id)
- `start_date` (timestamp)
- `end_date` (timestamp)
- `is_active` (boolean, default true)
- `created_at` (timestamp)

複合インデックス: `(to_user_id, organization_id, is_active)`

#### Scenario: Table exists in schema

**Given** `src/infrastructure/schema.ts` を確認する
**When** `approval_delegations` テーブル定義を参照する
**Then** 上記カラムとインデックスが定義されている
