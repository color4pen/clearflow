# Spec: 残りの更新系エンティティの楽観的ロック

## Requirements

### Requirement: Meeting の楽観的ロック

updateMeeting usecase SHALL reject an update when the version supplied to the repository does not match the current database version, and SHALL return `{ ok: false, reason: "この商談は他のユーザーによって更新されました。画面を更新してください" }`.

#### Scenario: version 一致で Meeting 更新が成功し version がインクリメントされる

**Given** meetings テーブルに id=M1, organizationId=O1, version=1 の行が存在する
**When** updateMeeting が meetingId=M1, organizationId=O1 で呼ばれ、リポジトリに expectedVersion=1 が渡される
**Then** 更新が成功し、返却された Meeting の version は 2 である

#### Scenario: version 不一致で Meeting 更新が拒否される

**Given** meetings テーブルに id=M1, organizationId=O1, version=2 の行が存在する
**When** updateMeeting が meetingId=M1, organizationId=O1 で呼ばれ、リポジトリに expectedVersion=1（古い version）が渡される
**Then** 更新行数は 0 であり、usecase は `{ ok: false, reason: "この商談は他のユーザーによって更新されました。画面を更新してください" }` を返す

### Requirement: ActionItem の楽観的ロック（updateActionItem）

updateActionItem usecase SHALL reject an update when the version does not match, and SHALL return `{ ok: false, reason: "このアクションアイテムは他のユーザーによって更新されました。画面を更新してください" }`.

#### Scenario: version 一致で ActionItem 更新が成功し version がインクリメントされる

**Given** action_items テーブルに id=A1, organizationId=O1, version=1 の行が存在する
**When** updateActionItem が id=A1, organizationId=O1 で呼ばれ、リポジトリに expectedVersion=1 が渡される
**Then** 更新が成功し、返却された ActionItem の version は 2 である

#### Scenario: version 不一致で ActionItem 更新が拒否される

**Given** action_items テーブルに id=A1, organizationId=O1, version=2 の行が存在する
**When** updateActionItem が id=A1, organizationId=O1 で呼ばれ、リポジトリに expectedVersion=1 が渡される
**Then** usecase は `{ ok: false, reason: "このアクションアイテムは他のユーザーによって更新されました。画面を更新してください" }` を返す

### Requirement: ActionItem の楽観的ロック（toggleActionItemDone）

toggleActionItemDone usecase SHALL reject a toggle when the version does not match, and SHALL return the same failure message as updateActionItem.

#### Scenario: version 一致で toggleActionItemDone が成功し version がインクリメントされる

**Given** action_items テーブルに id=A1, organizationId=O1, done=false, version=1 の行が存在する
**When** toggleActionItemDone が id=A1, organizationId=O1 で呼ばれ、リポジトリに expectedVersion=1 が渡される
**Then** done が true に切り替わり、返却された ActionItem の version は 2 である

#### Scenario: version 不一致で toggleActionItemDone が拒否される

**Given** action_items テーブルに id=A1, organizationId=O1, version=2 の行が存在する
**When** toggleActionItemDone が id=A1, organizationId=O1 で呼ばれ、リポジトリに expectedVersion=1 が渡される
**Then** usecase は `{ ok: false, reason: "このアクションアイテムは他のユーザーによって更新されました。画面を更新してください" }` を返す

### Requirement: RevenueTarget の楽観的ロック

updateRevenueTarget usecase SHALL reject an update when the version does not match, and SHALL return `{ ok: false, reason: "この売上目標は他のユーザーによって更新されました。画面を更新してください" }`.

#### Scenario: version 一致で RevenueTarget 更新が成功し version がインクリメントされる

**Given** revenue_targets テーブルに id=R1, organizationId=O1, version=1 の行が存在する
**When** updateRevenueTarget が id=R1, organizationId=O1 で呼ばれ、リポジトリに expectedVersion=1 が渡される
**Then** 更新が成功し、返却された RevenueTarget の version は 2 である

#### Scenario: version 不一致で RevenueTarget 更新が拒否される

**Given** revenue_targets テーブルに id=R1, organizationId=O1, version=2 の行が存在する
**When** updateRevenueTarget が id=R1, organizationId=O1 で呼ばれ、リポジトリに expectedVersion=1 が渡される
**Then** usecase は `{ ok: false, reason: "この売上目標は他のユーザーによって更新されました。画面を更新してください" }` を返す

### Requirement: version カラムの差分マイグレーション

The migration SHALL add a `version` column with `integer NOT NULL DEFAULT 1` to meetings, action_items, and revenue_targets tables without dropping or recreating the tables.

#### Scenario: 既存行に version = 1 が付与される

**Given** meetings / action_items / revenue_targets テーブルに既存行が存在する
**When** マイグレーション 0010 が適用される
**Then** 全既存行の version カラムは 1 である

### Requirement: リポジトリの mapRow に version を含める

The mapRow function in meetingRepository, actionItemRepository, and revenueTargetRepository SHALL include `version: row.version` in the returned domain object.

#### Scenario: リポジトリの findById が version を含む Meeting を返す

**Given** meetings テーブルに version=1 の行が存在する
**When** meetingRepository.findById で取得する
**Then** 返却された Meeting オブジェクトに version: 1 が含まれる
