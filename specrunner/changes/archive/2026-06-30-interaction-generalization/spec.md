# Spec: 商談（Meeting）を顧客接点（Interaction）に一般化

## Requirements

### Requirement: Interaction スキーマ定義が interactions テーブルとして定義される

`schema.ts` の `meetings` テーブル定義 SHALL be replaced with an `interactions` テーブル定義 that includes:
- `interaction_kind` enum カラム（meeting/call/email/contract_adjustment/invoice_adjustment）
- 既存カラムの維持: `organization_id`, `deal_id`, `inquiry_id`, `date`, `location`, `attendees`, `summary`, `action_items`(レガシー jsonb), `created_by_id`, `created_at`, `updated_at`, `version`
- リネームカラム: `type` &rarr; `meeting_type`, `hearing_data` &rarr; `details`
- 追加 FK: `contract_id`, `invoice_id`, `client_id`（いずれも nullable）
- CHECK 制約: `deal_id`/`inquiry_id`/`contract_id`/`invoice_id`/`client_id` の少なくとも 1 つが NOT NULL

#### Scenario: interactions テーブル定義が typecheck を通る

**Given** `schema.ts` に `interactions` テーブルが定義されている
**When** `bun run typecheck` を実行する
**Then** 型エラーなしで成功する

#### Scenario: CHECK 制約が5つの関連先のいずれか1つ以上を要求する

**Given** interactions テーブルに CHECK 制約が定義されている
**When** `drizzle-kit check` を実行する
**Then** スキーマ定義が正常であると判定される

### Requirement: action_items テーブルの meeting_id が interaction_id にリネームされる

`schema.ts` の `action_items` テーブルの `meeting_id` カラム SHALL be renamed to `interaction_id` with FK referencing `interactions.id` (ON DELETE SET NULL)。既存の紐づけ値は維持される。

#### Scenario: action_items スキーマが interaction_id を持つ

**Given** `schema.ts` に `action_items` テーブルが定義されている
**When** `bun run typecheck` を実行する
**Then** `action_items.interactionId` が型として存在し、`meetingId` は存在しない

### Requirement: Interaction ドメインモデルが kind と関連先を持つ

`Interaction` 型 SHALL include `kind`(InteractionKind)、`meetingType`(MeetingType, kind=meeting 固有)、`details`(HearingData | null)、関連先(`dealId`/`inquiryId`/`contractId`/`invoiceId`/`clientId`)を持つ。`Meeting` 型のレガシー `ActionItem` は `LegacyMeetingActionItem` に改名される。

#### Scenario: kind=meeting の Interaction を作成する

**Given** interactionRepository が利用可能である
**When** kind="meeting"、dealId 指定で create を呼び出す
**Then** kind="meeting"、指定した dealId を持つ Interaction が返される

#### Scenario: kind=meeting の Interaction を更新する

**Given** kind=meeting の Interaction が存在する
**When** meetingType を "proposal" に変更して update を呼び出す
**Then** meetingType が "proposal" に更新された Interaction が返される

### Requirement: 商談の作成が kind=meeting の Interaction として記録される

createMeeting usecase SHALL create a kind=meeting Interaction via interactionRepository and record an `interaction.create` audit log with `metadata.kind = "meeting"` and `targetType = "interaction"`。外部から見た商談の作成振る舞い（バリデーション、エラーメッセージ）は不変。

#### Scenario: 商談を案件配下に作成する

**Given** 案件が存在する
**When** createMeeting を type="hearing"、dealId 指定で呼び出す
**Then** ok: true が返り、kind=meeting の Interaction が作成され、`interaction.create` 監査ログが metadata `{ kind: "meeting" }` 付きで記録される

#### Scenario: dealId と inquiryId の両方が未指定の場合エラーになる

**Given** なし
**When** createMeeting を dealId/inquiryId ともに未指定で呼び出す
**Then** ok: false、reason に関連先必須のエラーメッセージが返る

### Requirement: 商談の更新が interaction.update 監査ログを記録する

updateMeeting usecase SHALL update a kind=meeting Interaction and record an `interaction.update` audit log with `metadata.kind = "meeting"` and `targetType = "interaction"`。

#### Scenario: 商談を更新する

**Given** kind=meeting の Interaction が存在する
**When** updateMeeting を summary 変更で呼び出す
**Then** ok: true が返り、Interaction が更新され、`interaction.update` 監査ログが metadata `{ kind: "meeting" }` 付きで記録される

### Requirement: 商談一覧が kind=meeting の Interaction を返す

listMeetings / listMeetingsByInquiry / searchMeetings usecase SHALL return Interaction objects (kind=meeting) from interactionRepository。

#### Scenario: 案件配下の商談一覧を取得する

**Given** 案件に kind=meeting の Interaction が 2 件紐づいている
**When** listMeetings を dealId 指定で呼び出す
**Then** 2 件の Interaction が返される

#### Scenario: 引合配下の商談一覧を取得する

**Given** 引合に kind=meeting の Interaction が 1 件紐づいている
**When** listMeetingsByInquiry を inquiryId 指定で呼び出す
**Then** 1 件の Interaction が返される

### Requirement: action_items が interaction_id で商談に紐づく

listActionItemsByMeeting usecase SHALL verify the interaction exists via interactionRepository.findById and fetch action items via actionItemRepository using `interaction_id`。`ActionItem` ドメインモデルの `meetingId` は `interactionId` に変更される。

#### Scenario: 商談に紐づくアクションアイテムを取得する

**Given** kind=meeting の Interaction にアクションアイテムが 2 件紐づいている
**When** listActionItemsByMeeting を interactionId 指定で呼び出す
**Then** ok: true、2 件の ActionItem が返される

### Requirement: getDealActivity が interaction と meeting の両 targetType を targets に含める

getDealActivity SHALL include both `{ targetType: "interaction", targetId }` and `{ targetType: "meeting", targetId }` in the targets array passed to `findByTargets` for each interaction。`targetInfoMap` にも `interaction:<id>` と `meeting:<id>` の両キーに同じ表示情報を登録する。

#### Scenario: targets 配列に interaction と meeting の両方が含まれる

**Given** 案件に kind=meeting の Interaction が 1 件紐づいている
**When** getDealActivity を呼び出す
**Then** findByTargets に渡される targets に `{ targetType: "interaction", targetId: <id> }` と `{ targetType: "meeting", targetId: <id> }` の両方が含まれる

#### Scenario: targetInfoMap に interaction と meeting の両キーが登録される

**Given** 案件に kind=meeting の Interaction が 1 件紐づいている
**When** getDealActivity を呼び出す
**Then** targetInfoMap に `interaction:<id>` と `meeting:<id>` の両キーが同じ label/href で登録される

### Requirement: getNotifications が interaction と meeting の両 targetType を targets に含める

getNotifications SHALL include both `{ targetType: "interaction", targetId }` and `{ targetType: "meeting", targetId }` in the targets array。`targetInfoMap` にも `interaction:<id>` と `meeting:<id>` の両キーに同じ表示情報を登録する。

#### Scenario: 通知の targets に interaction と meeting の両方が含まれる

**Given** watch している案件に kind=meeting の Interaction が 1 件紐づいている
**When** getNotifications を呼び出す
**Then** findByTargets に渡される targets に `{ targetType: "interaction", targetId: <id> }` と `{ targetType: "meeting", targetId: <id> }` の両方が含まれる

### Requirement: TIMELINE_ACTIONS に interaction.create が追加される

`TIMELINE_ACTIONS` SHALL include `"interaction.create"` in addition to the existing `"meeting.create"`。

#### Scenario: TIMELINE_ACTIONS が interaction.create を含む

**Given** activityConfig が import されている
**When** TIMELINE_ACTIONS の内容を確認する
**Then** `"interaction.create"` と `"meeting.create"` の両方が含まれる

### Requirement: NOTIFICATION_ACTIONS に interaction.create が追加される

`NOTIFICATION_ACTIONS` SHALL include `"interaction.create"` in addition to the existing `"meeting.create"`。

#### Scenario: NOTIFICATION_ACTIONS が interaction.create を含む

**Given** notification モデルが import されている
**When** NOTIFICATION_ACTIONS の内容を確認する
**Then** `"interaction.create"` と `"meeting.create"` の両方が含まれる

### Requirement: AuditAction 型に interaction.create / interaction.update が追加される

`AuditAction` 型 SHALL include `"interaction.create"` and `"interaction.update"`。`AuditTargetType` に `"interaction"` が追加される。`AuditMetadataMap` に `"interaction.create": { kind: string }` と `"interaction.update": { kind: string }` が追加される。

#### Scenario: interaction 監査アクションが型定義に含まれる

**Given** auditLog モデルが import されている
**When** AuditAction 型を確認する
**Then** `"interaction.create"` と `"interaction.update"` が含まれる
