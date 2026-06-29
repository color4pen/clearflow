# Tasks: 商談（Meeting）を顧客接点（Interaction）に一般化

## T-01: スキーマ定義の一般化（schema.ts）

- [x] `pgEnum("interaction_kind", ["meeting", "call", "email", "contract_adjustment", "invoice_adjustment"])` を追加する
- [x] `meetings` テーブル定義を `interactions` にリネームする（テーブル名: `"interactions"`）
- [x] `kind` カラム（`interactionKindEnum("kind").notNull().default("meeting")`）を追加する
- [x] `type` カラムを `meetingType`（`meetingTypeEnum("meeting_type")`）にリネームする。nullable にする（kind=meeting 以外では null のため）
- [x] `hearingData` カラムを `details`（`jsonb("details")`）にリネームする
- [x] `contractId` FK（`uuid("contract_id").references(() => contracts.id)`、nullable）を追加する
- [x] `invoiceId` FK（`uuid("invoice_id").references(() => invoices.id)`、nullable）を追加する
- [x] `clientId` FK（`uuid("client_id").references(() => clients.id)`、nullable）を追加する
- [x] CHECK 制約を `"interactions_related_entity_check"` に変更: `deal_id IS NOT NULL OR inquiry_id IS NOT NULL OR contract_id IS NOT NULL OR invoice_id IS NOT NULL OR client_id IS NOT NULL`
- [x] index を維持/追加: `(org, deal_id)` / `(org, inquiry_id)` は維持。`(org, contract_id)` / `(org, invoice_id)` / `(org, client_id)` を追加する
- [x] `action_items` テーブルの `meetingId` を `interactionId`（`uuid("interaction_id").references(() => interactions.id, { onDelete: "set null" })`）にリネームする
- [x] `action_items` テーブルの index `action_items_meeting_id_idx` を `action_items_interaction_id_idx` に更新する
- [x] Drizzle relations を更新する: `meetingsRelations` &rarr; `interactionsRelations`。`actionItemsRelations` の `meeting` を `interaction` に変更する
- [x] `organizationsRelations`、`usersRelations`、`inquiriesRelations`、`dealsRelations` 内の `meetings` 参照を `interactions` に更新する

**Acceptance Criteria**:
- `bun run typecheck` が成功する
- `interactions` テーブルに `kind`、`meeting_type`、`details`、`contract_id`、`invoice_id`、`client_id` カラムが定義されている
- `action_items` テーブルに `interactionId` が定義され、`meetingId` が存在しない
- CHECK 制約が 5 つの関連先のいずれか 1 つ以上で成立する

## T-02: ドメインモデルの一般化（domain/models）

- [x] `src/domain/models/interaction.ts` を新規作成する
  - `InteractionKind = "meeting" | "call" | "email" | "contract_adjustment" | "invoice_adjustment"` 型を定義する
  - `Interaction` 型を定義する: `id`, `organizationId`, `kind`, `dealId`, `inquiryId`, `contractId`, `invoiceId`, `clientId`, `meetingType`(MeetingType | null), `date`, `location`, `attendees`(MeetingAttendee[]), `summary`, `actionItems`(LegacyMeetingActionItem[]), `details`(HearingData | null), `createdById`, `createdAt`, `updatedAt`, `version`
  - `MeetingType`, `HearingData`, `MeetingAttendee` 型を re-export する（互換性のため）
  - `LegacyMeetingActionItem` 型を定義する（旧 `ActionItem` jsonb 構造: `{ description, assignee, dueDate, done }`）
  - 将来 kind 追加時に `details` を discriminated union 等で拡張する方針のコメントを残す
- [x] `src/domain/models/meeting.ts` を更新する
  - `ActionItem` を `LegacyMeetingActionItem` に改名する
  - `Meeting` 型を `Interaction` 型の re-export に変更する（後方互換）、もしくは `Meeting` 型を削除し利用箇所を `Interaction` に置き換える
- [x] `src/domain/models/actionItem.ts` を更新する
  - `meetingId` を `interactionId` に変更する
- [x] `src/domain/models/auditLog.ts` を更新する
  - `AuditAction` に `"interaction.create"` と `"interaction.update"` を追加する
  - `AuditTargetType` に `"interaction"` を追加する
  - `AuditMetadataMap` に `"interaction.create": { kind: string }` と `"interaction.update": { kind: string }` を追加する

**Acceptance Criteria**:
- `Interaction` 型が `kind`, `meetingType`, `details`, `contractId`, `invoiceId`, `clientId` を持つ
- `LegacyMeetingActionItem` 型が定義されている
- `ActionItem` ドメインモデルの `meetingId` が `interactionId` に変更されている
- `AuditAction` に `interaction.create`/`interaction.update` が含まれる
- `bun run typecheck` が成功する

## T-03: interactionRepository の作成

- [x] `src/infrastructure/repositories/interactionRepository.ts` を新規作成する
  - `mapRow` 関数: `interactions` テーブルの行を `Interaction` 型にマップする
  - `create`: kind/meetingType/details/contractId/invoiceId/clientId を含む Interaction を作成する
  - `findById`: organizationId でテナント分離
  - `findAllByDeal`: organizationId でテナント分離、date 昇順
  - `findAllByOrganization`: organizationId でフィルタ、date 降順
  - `findAllByInquiry`: organizationId でテナント分離、date 昇順
  - `update`: 楽観ロック（version）付き更新。meetingType/details を含む
  - `searchBySummary`: ilike 検索
  - 各関数で kind フィルタは追加しない。将来 kind 追加時のフィルタ追加 TODO コメントを残す
- [x] `src/infrastructure/repositories/meetingRepository.ts` を削除する
- [x] `src/infrastructure/repositories/index.ts` を更新する
  - `meetingRepository` を `interactionRepository` に置き換える

**Acceptance Criteria**:
- `interactionRepository` が create/findById/findAllByDeal/findAllByOrganization/findAllByInquiry/update/searchBySummary を提供する
- `meetingRepository` が削除されている
- `bun run typecheck` が成功する

## T-04: actionItemRepository の更新

- [x] `src/infrastructure/repositories/actionItemRepository.ts` を更新する
  - `meetingId` 参照を `interactionId` に変更する（スキーマの `actionItems.interactionId` を使用）
  - `findByMeeting` を `findByInteraction` にリネームする
  - `create` 関数のパラメータで `meetingId` を `interactionId` に変更する
  - index 参照を更新する
- [x] `actionItemRepository` を利用している全ファイルで `meetingId` &rarr; `interactionId`、`findByMeeting` &rarr; `findByInteraction` に更新する

**Acceptance Criteria**:
- `actionItemRepository` に `meetingId` 参照が残っていない
- `findByInteraction` が interactionId でアクションアイテムを取得する
- `bun run typecheck` が成功する

## T-05: usecase の更新（商談 CRUD）

- [x] `src/application/usecases/createMeeting.ts` を更新する
  - `meetingRepository` &rarr; `interactionRepository` に切り替える
  - create 呼び出しに `kind: "meeting"` を追加する
  - 監査ログを `action: "interaction.create"`, `targetType: "interaction"`, `metadata: { kind: "meeting" }` に変更する
  - import を `Interaction` 型に切り替える（返り値の型注釈）
- [x] `src/application/usecases/updateMeeting.ts` を更新する
  - `meetingRepository` &rarr; `interactionRepository` に切り替える
  - 監査ログを `action: "interaction.update"`, `targetType: "interaction"`, `metadata: { kind: "meeting" }` に変更する
  - import を `Interaction` 型に切り替える
- [x] `src/application/usecases/getMeeting.ts` を更新する
  - `meetingRepository` &rarr; `interactionRepository` に切り替える
  - 返り値型を `Interaction` に切り替える
- [x] `src/application/usecases/listMeetings.ts` を更新する
  - `meetingRepository` &rarr; `interactionRepository` に切り替える
  - 返り値型を `Interaction[]` に切り替える
- [x] `src/application/usecases/listMeetingsByInquiry.ts` を更新する
  - `meetingRepository` &rarr; `interactionRepository` に切り替える
  - 返り値型を `Interaction[]` に切り替える
- [x] `src/application/usecases/searchMeetings.ts` を更新する
  - `meetingRepository` &rarr; `interactionRepository` に切り替える
  - `meeting.type` を `interaction.meetingType` に変更する
- [x] `src/application/usecases/listActionItemsByMeeting.ts` を更新する
  - `meetingRepository` &rarr; `interactionRepository` に切り替える
  - `actionItemRepository.findByMeeting` &rarr; `findByInteraction` に切り替える

**Acceptance Criteria**:
- 全 meeting 系 usecase が `interactionRepository` を使用している
- 監査ログが `interaction.create`/`interaction.update` で記録される
- `meetingRepository` への参照が usecase から消えている
- `bun run typecheck` が成功する

## T-06: usecase の更新（タイムライン・通知）

- [x] `src/lib/activityConfig.ts` を更新する
  - `TIMELINE_ACTIONS` に `"interaction.create"` を追加する（`"meeting.create"` は維持する）
- [x] `src/domain/models/notification.ts` を更新する
  - `NOTIFICATION_ACTIONS` に `"interaction.create"` を追加する（`"meeting.create"` は維持する）
- [x] `src/domain/models/auditLog.ts` の `AuditAction` に `"interaction.create"` と `"interaction.update"` を追加する（T-02 と同時に実施可能）
- [x] `src/application/usecases/getDealActivity.ts` を更新する
  - `meetingRepository` &rarr; `interactionRepository` に切り替える（import 先変更）
  - targets 配列に各 interaction について `{ targetType: "interaction", targetId }` と `{ targetType: "meeting", targetId }` の**両方**を追加する
  - `targetInfoMap` に `interaction:<id>` と `meeting:<id>` の両キーを登録する
  - `meetingTypeLabels` の参照を `interaction.meetingType` に合わせて更新する
- [x] `src/application/usecases/getNotifications.ts` を更新する
  - `meetingRepository` &rarr; `interactionRepository` に切り替える（import 先変更）
  - targets 配列に各 interaction について `{ targetType: "interaction", targetId }` と `{ targetType: "meeting", targetId }` の**両方**を追加する
  - `targetInfoMap` に `interaction:<id>` と `meeting:<id>` の両キーを登録する
  - `meetingTypeLabels` の参照を `interaction.meetingType` に合わせて更新する

**Acceptance Criteria**:
- `TIMELINE_ACTIONS` に `"interaction.create"` と `"meeting.create"` の両方が含まれる
- `NOTIFICATION_ACTIONS` に `"interaction.create"` と `"meeting.create"` の両方が含まれる
- `getDealActivity` の targets に各 interaction の `interaction` と `meeting` の両 targetType が含まれる
- `getNotifications` の targets に各 interaction の `interaction` と `meeting` の両 targetType が含まれる
- `targetInfoMap` に `interaction:<id>` と `meeting:<id>` の両キーが登録される
- `bun run typecheck` が成功する

## T-07: usecase の更新（アクションアイテム関連）

- [x] `src/application/usecases/createActionItem.ts` を更新する
  - `meetingRepository` &rarr; `interactionRepository` に切り替える
  - `meetingId` パラメータを `interactionId` に変更する（存在確認も interactionRepository.findById に切り替え）
  - 引数の型定義と内部ロジックを更新する
- [x] `src/application/usecases/updateActionItem.ts` を更新する
  - `meetingRepository` &rarr; `interactionRepository` に切り替える
  - `meetingId` 参照を `interactionId` に変更する
- [x] `src/application/usecases/listActionItems.ts` を更新する
  - `meetingRepository` &rarr; `interactionRepository` に切り替える
  - `meetingIds` / `meetingMap` を `interactionIds` / `interactionMap` に変更する
  - `item.meetingId` を `item.interactionId` に変更する
- [x] `src/application/usecases/deleteDeal.ts` を更新する
  - `meetingRepository` &rarr; `interactionRepository` に切り替える
  - `meetingRepository.findAllByDeal` &rarr; `interactionRepository.findAllByDeal` に変更する
  - エラーメッセージ「商談が紐づいている案件は削除できません」は維持する（UI 表記は「商談」）

**Acceptance Criteria**:
- createActionItem / updateActionItem / listActionItems / deleteDeal が `interactionRepository` を使用している
- `meetingId` パラメータが `interactionId` に変更されている
- `meetingRepository` への参照が残っていない
- `bun run typecheck` が成功する

## T-08: Server Action の更新

- [x] `src/app/actions/meetings.ts` を更新する
  - `createMeeting`/`updateMeeting` の import を更新する（型が `Interaction` になるため）
  - `hearingData` パラメータ名は維持するが、usecase への受け渡し時は `details` として渡す（usecase 側で mapping）
  - `canPerform(session.user.role, "meeting", ...)` は維持する（D9）
- [x] `src/app/actions/actionItems.ts` を更新する
  - `meetingId` 参照を `interactionId` に変更する
  - `meetingRepository.findById` &rarr; `interactionRepository.findById` に切り替える
  - revalidatePath の `/meetings/` パスは維持する（UI ルートは変更しない）

**Acceptance Criteria**:
- Server Action が `interactionRepository` / `Interaction` 型を使用している
- 認可チェック `canPerform(..., "meeting", ...)` は維持されている
- `meetingId` パラメータ名は Server Action の公開インターフェース（FormData フィールド名）としては変更不要（UI 互換性）。内部での interactionId への変換を行う
- `bun run typecheck` が成功する

## T-09: UI コンポーネントの更新

- [x] `src/app/(dashboard)/deals/[id]/page.tsx` を更新する
  - `Meeting` 型の import を `Interaction` に変更する
  - `listMeetings` の返り値型が `Interaction[]` になるため型参照を更新する
  - `meetingTypeLabels[row.type]` を `meetingTypeLabels[row.meetingType!]` に変更する（kind=meeting では non-null）
- [x] `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/page.tsx` を更新する
  - `getMeeting` の返り値型が `Interaction` になるため型参照を更新する
- [x] `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/MeetingInfoSection.tsx` を更新する
  - `Meeting` 型を `Interaction` に変更する
  - `type` プロパティ参照を `meetingType` に変更する
- [x] `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/MeetingHearingSection.tsx` を更新する
  - `hearingData` 参照を `details` に変更する
- [x] `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/MeetingAttendeesSection.tsx` を更新する
  - `Meeting` 型を `Interaction` に変更する
- [x] `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/MeetingSummarySection.tsx` を更新する
  - 型参照を更新する（必要に応じて）
- [x] `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/MeetingActionItemsSection.tsx` を更新する
  - 型参照を更新する（必要に応じて）
- [x] `src/app/(dashboard)/deals/[id]/meetings/new/DealMeetingForm.tsx` を更新する
  - `Meeting` / `MeetingType` 型の import を `Interaction` / `MeetingType` に変更する
  - `hearingData` フォームフィールドの送信は維持する（Server Action の互換性）
- [x] `src/app/(dashboard)/inquiries/[id]/page.tsx` を更新する
  - `listMeetingsByInquiry` の返り値型が `Interaction[]` になるため型参照を更新する
- [x] `src/app/(dashboard)/inquiries/[id]/MeetingTable.tsx` を更新する
  - `Meeting` 型を `Interaction` に変更する
  - `type` プロパティ参照を `meetingType` に変更する
- [x] `src/app/(dashboard)/inquiries/[id]/InquiryMeetingSection.tsx` を更新する
  - 型参照を更新する
- [x] `src/lib/meetingLabels.ts` を更新する
  - `MeetingType` の import 元を `interaction` モデルに変更する（re-export 経由であれば不要）
- [x] `src/domain/authorization.ts` は `"meeting"` エンティティを維持する（D9: 変更しない）
- [x] UI の日本語表記「商談」はすべて維持する

**Acceptance Criteria**:
- UI コンポーネントが `Interaction` 型を使用している
- `meetingType` / `details` プロパティ参照に更新されている
- 日本語表記「商談」が維持されている
- UI ルート（`/deals/[id]/meetings/...`）は変更されていない
- `bun run typecheck` / `bun run build` が成功する

## T-10: usecase index の更新

- [x] `src/application/usecases/index.ts` を更新する
  - `meetingRepository` を使用していた re-export が正しく動作することを確認する
  - 必要に応じて型の re-export を追加する（`Interaction` 型など）

**Acceptance Criteria**:
- `bun run typecheck` が成功する
- 全 usecase が正しく export されている

## T-11: 既存テストの更新

- [x] `src/__tests__/usecases/dealActivity.dynamic.test.ts` を更新する
  - `mock.module("@/infrastructure/repositories/meetingRepository", ...)` を `mock.module("@/infrastructure/repositories/interactionRepository", ...)` に変更する
  - `Meeting` 型を `Interaction` 型に変更する
  - `state.meetings` のテストデータに `kind: "meeting"` を追加する
  - targets 配列に `interaction` と `meeting` の両 targetType が含まれることを検証するテストを追加する
  - `targetInfoMap` に `interaction:<id>` と `meeting:<id>` の両キーが含まれることを検証する
  - `TIMELINE_ACTIONS` に `"interaction.create"` が含まれることを検証する
- [x] `src/__tests__/usecases/getNotifications.dynamic.test.ts` を更新する
  - `mock.module("@/infrastructure/repositories/meetingRepository", ...)` を `mock.module("@/infrastructure/repositories/interactionRepository", ...)` に変更する
  - targets 配列に `interaction` と `meeting` の両 targetType が含まれることを検証するテストを追加する
  - `NOTIFICATION_ACTIONS` に `"interaction.create"` が含まれることを検証する
- [x] `src/__tests__/usecases/meetingManagement.test.ts` を更新する
  - `meetingRepository` のモックを `interactionRepository` に変更する
  - テストデータの `Meeting` 型を `Interaction` 型に変更する
- [x] `src/__tests__/usecases/actionItemManagement.test.ts` を更新する
  - `meetingId` 参照を `interactionId` に変更する
- [x] `src/__tests__/usecases/optimisticLock.test.ts` を更新する
  - `meetingRepository` のモックを `interactionRepository` に変更する（該当箇所があれば）
- [x] `src/__tests__/usecases/linkTargetSearch.test.ts` を更新する
  - `meetingRepository` のモックを `interactionRepository` に変更する（該当箇所があれば）
- [x] `src/__tests__/static/projectStructure.test.ts` を更新する
  - `meetingRepository` の参照が含まれていれば `interactionRepository` に変更する

**Acceptance Criteria**:
- `bun test` が全テスト green
- `meetingRepository` のモック参照が残っていない

## T-12: 新規 dynamic テストの作成

- [x] `src/__tests__/usecases/interactionManagement.dynamic.test.ts` を新規作成する
  - mock.module 方式で interactionRepository / dealRepository / inquiryRepository / auditLogRepository をモックする
  - **createMeeting テスト**: kind=meeting の Interaction が作成され、`interaction.create` 監査ログが `metadata: { kind: "meeting" }` 付きで記録されることを assert する
  - **updateMeeting テスト**: kind=meeting の Interaction が更新され、`interaction.update` 監査ログが `metadata: { kind: "meeting" }` 付きで記録されることを assert する
  - **listMeetings テスト**: 案件配下の kind=meeting Interaction が返されることを assert する
  - **listMeetingsByInquiry テスト**: 引合配下の kind=meeting Interaction が返されることを assert する
  - **getMeeting テスト**: kind=meeting の Interaction が返されることを assert する
  - **バリデーションテスト**: dealId/inquiryId 両方未指定時に ok: false が返ることを assert する
- [x] `src/__tests__/usecases/interactionActionItems.dynamic.test.ts` を新規作成する
  - mock.module 方式で interactionRepository / actionItemRepository をモックする
  - **listActionItemsByMeeting テスト**: interactionRepository.findById で存在確認し、actionItemRepository.findByInteraction で取得することを assert する
  - **createActionItem テスト**: interactionId が interactionRepository.findById で検証されることを assert する
- [x] `src/__tests__/usecases/dealActivity.dynamic.test.ts` に interaction 固有テストを追加する
  - targets に `{ targetType: "interaction" }` と `{ targetType: "meeting" }` の両方が含まれることを assert する
  - targetInfoMap に `interaction:<id>` と `meeting:<id>` の両キーが含まれることを assert する
- [x] `src/__tests__/usecases/getNotifications.dynamic.test.ts` に interaction 固有テストを追加する
  - targets に `{ targetType: "interaction" }` と `{ targetType: "meeting" }` の両方が含まれることを assert する

**Acceptance Criteria**:
- 商談の作成・更新・一覧・詳細が kind=meeting の Interaction として動作することが実行テストで固定されている
- `interaction.create`/`interaction.update` 監査が `metadata.kind` 付きで記録されることが実行テストで固定されている
- action_items が `interaction_id` で紐づくことが実行テストで固定されている
- getDealActivity / getNotifications の targets に interaction と meeting の両 targetType が含まれることが実行テストで固定されている
- `bun test` が全テスト green

## T-13: ビルド・型チェック・lint の通過確認

- [x] `bun run typecheck` が成功することを確認する
- [x] `bun run build` が成功することを確認する
- [x] `bun run lint` が成功することを確認する
- [x] `bun test` が全テスト green であることを確認する（1528 pass, 0 fail）
- [x] `meetingRepository` への参照がソースコード内に残っていないことを確認する（テストの mock.module パスを含む）
- [x] `from "@/domain/models/meeting"` への import がなくなっている、または `meeting.ts` が `interaction.ts` への re-export のみになっていることを確認する

**Acceptance Criteria**:
- `bun run typecheck` / `bun run build` / `bun run lint` / `bun test` がすべて成功する
- `meetingRepository` への参照がコードベースに残っていない（import パス / ファイル名）
