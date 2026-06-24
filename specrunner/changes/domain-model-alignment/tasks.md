# Tasks: domain-model-alignment

## T-01: InquirySource pgEnum の定義と source カラムの型変更

- [ ] `src/infrastructure/schema.ts` に `inquirySourceEnum` を pgEnum として定義する: `pgEnum("inquiry_source", ["web", "phone", "email", "referral", "agent_service", "exhibition", "other"])`
- [ ] `inquiries` テーブルの `source` カラムを `text("source").notNull()` から `inquirySourceEnum("source").notNull()` に変更する
- [ ] `src/domain/models/inquiry.ts` の `InquirySource` 型を `"web" | "phone" | "email" | "referral" | "agent_service" | "exhibition" | "other"` に拡張する
- [ ] `src/app/actions/inquiries.ts` の `createInquirySchema` と `updateInquirySchema` の `source` の `z.enum` を 7 値に更新する
- [ ] `src/infrastructure/repositories/inquiryRepository.ts` の `mapRow` で `source` のキャストが `InquirySource` と整合するか確認する（pgEnum 化により Drizzle が型を推論するため `as InquirySource` キャストが不要になる可能性あり）

**Acceptance Criteria**:
- `inquirySourceEnum` が pgEnum として schema.ts に定義されている
- inquiries テーブルの source カラムが enum 型を参照している
- InquirySource 型に `email` と `agent_service` が含まれている
- アクションの Zod スキーマが 7 値を受け付ける

## T-02: Inquiry に budget / timeline カラムを追加

- [ ] `src/infrastructure/schema.ts` の `inquiries` テーブルに `budget: integer("budget")` (nullable) と `timeline: text("timeline")` (nullable) を追加する
- [ ] `src/domain/models/inquiry.ts` の `Inquiry` 型に `budget: number | null` と `timeline: string | null` を追加する
- [ ] `src/infrastructure/repositories/inquiryRepository.ts` の `mapRow` に `budget` と `timeline` のマッピングを追加する
- [ ] `src/infrastructure/repositories/inquiryRepository.ts` の `create` 関数の引数に `budget` と `timeline` を追加し、insert values に含める
- [ ] `src/infrastructure/repositories/inquiryRepository.ts` の `update` 関数の引数に `budget` と `timeline` を追加する
- [ ] `src/application/usecases/createInquiry.ts` の引数に `budget` と `timeline` を追加し、リポジトリに渡す
- [ ] `src/application/usecases/updateInquiry.ts` の引数に `budget` と `timeline` を追加し、リポジトリに渡す
- [ ] `src/app/actions/inquiries.ts` の `createInquirySchema` と `updateInquirySchema` に `budget` (z.coerce.number().int().optional()) と `timeline` (z.string().optional()) を追加する
- [ ] アクション関数から use case 呼び出し時に `budget` と `timeline` を渡す

**Acceptance Criteria**:
- inquiries テーブルに budget (integer, nullable) と timeline (text, nullable) カラムが存在する
- Inquiry モデル型に budget と timeline フィールドが含まれている
- 引き合いの作成・更新で budget と timeline を設定できる

## T-03: Deal に description カラムを追加

- [ ] `src/infrastructure/schema.ts` の `deals` テーブルに `description: text("description")` (nullable) を追加する
- [ ] `src/domain/models/deal.ts` の `Deal` 型に `description: string | null` を追加する
- [ ] `src/infrastructure/repositories/dealRepository.ts` の `mapRow` に `description` のマッピングを追加する
- [ ] `src/infrastructure/repositories/dealRepository.ts` の `create` 関数の引数に `description` を追加し、insert values に含める
- [ ] `src/infrastructure/repositories/dealRepository.ts` の `update` 関数の引数に `description` を追加する
- [ ] `src/application/usecases/createDeal.ts` の引数に `description` を追加し、リポジトリに渡す
- [ ] `src/application/usecases/updateDeal.ts` の引数に `description` を追加し、リポジトリに渡す
- [ ] `src/app/actions/deals.ts` の `createDealSchema` と `updateDealSchema` に `description` (z.string().optional()) を追加する
- [ ] アクション関数から use case 呼び出し時に `description` を渡す

**Acceptance Criteria**:
- deals テーブルに description (text, nullable) カラムが存在する
- Deal モデル型に description フィールドが含まれている
- 案件の作成・更新で description を設定できる

## T-04: Meeting に inquiryId を追加し dealId を nullable に変更

- [ ] `src/infrastructure/schema.ts` の `meetings` テーブルで `dealId` を `.notNull()` を外して nullable にする: `uuid("deal_id").references(() => deals.id)`
- [ ] `src/infrastructure/schema.ts` の `meetings` テーブルに `inquiryId: uuid("inquiry_id").references(() => inquiries.id)` (nullable) を追加する
- [ ] `src/infrastructure/schema.ts` の `meetings` テーブル定義のコメントに CHECK 制約 `deal_id IS NOT NULL OR inquiry_id IS NOT NULL` が存在する旨を記載する
- [ ] `src/domain/models/meeting.ts` の `Meeting` 型の `dealId` を `string | null` に変更し、`inquiryId: string | null` を追加する
- [ ] `src/infrastructure/repositories/meetingRepository.ts` の `mapRow` を更新: `dealId` を nullable 対応にし、`inquiryId` のマッピングを追加する
- [ ] `src/infrastructure/repositories/meetingRepository.ts` の `create` 関数の引数で `dealId` を optional にし、`inquiryId` を追加する
- [ ] `src/infrastructure/repositories/meetingRepository.ts` に `findAllByInquiry(inquiryId, organizationId)` メソッドを追加する
- [ ] `src/infrastructure/schema.ts` の `meetingsRelations` に `inquiry` relation を追加する: `inquiry: one(inquiries, { fields: [meetings.inquiryId], references: [inquiries.id] })`
- [ ] `src/infrastructure/schema.ts` の `inquiriesRelations` に `meetings: many(meetings)` を追加する
- [ ] `src/application/usecases/createMeeting.ts` を更新:
  - 引数に `inquiryId` (optional) を追加し、`dealId` を optional にする
  - `dealId` も `inquiryId` もない場合はエラーを返す
  - `inquiryId` が指定された場合は引合の存在確認を行う
  - リポジトリ呼び出しに `inquiryId` を渡す
- [ ] `src/app/actions/meetings.ts` の `createMeetingSchema` を更新:
  - `dealId` を optional にする（`z.string().uuid().optional()`）
  - `inquiryId` を追加する（`z.string().uuid().optional()`）
  - `dealId` と `inquiryId` の少なくとも一方が必要なバリデーションを追加する
- [ ] `src/app/actions/meetings.ts` の `createMeetingAction` を更新: use case に `inquiryId` を渡す。revalidatePath を inquiryId にも対応させる
- [ ] `src/application/usecases/updateMeeting.ts` の `MeetingAttendees` 型参照を新構造に合わせる（T-05 と連動）

**Acceptance Criteria**:
- meetings テーブルに inquiry_id (uuid, nullable, FK → inquiries.id) カラムが存在する
- meetings.deal_id が nullable になっている
- inquiryId のみで Meeting を作成できる
- dealId と inquiryId の両方が null の場合はエラーになる
- findAllByInquiry でリポジトリから引合別の商談を取得できる

## T-05: Meeting の Attendee 構造を変更

- [ ] `src/domain/models/meeting.ts` の `MeetingAttendees` 型を削除し、新しい `MeetingAttendee` 型を定義する:
  ```typescript
  export type MeetingAttendee = {
    userId: string | null;
    contactId: string | null;
    name: string;
    isExternal: boolean;
  };
  ```
- [ ] `src/domain/models/meeting.ts` の `Meeting` 型で `attendees` のフィールド型を `MeetingAttendee[]` に変更する
- [ ] `src/infrastructure/repositories/meetingRepository.ts` の import と型参照を `MeetingAttendees` から `MeetingAttendee` に変更する
- [ ] `src/infrastructure/repositories/meetingRepository.ts` の `mapRow` で `attendees` のキャストを `MeetingAttendee[]` に変更する
- [ ] `src/infrastructure/repositories/meetingRepository.ts` の `create` / `update` 関数の引数型を `MeetingAttendee[]` に変更する
- [ ] `src/application/usecases/createMeeting.ts` の import と引数型を更新する
- [ ] `src/application/usecases/updateMeeting.ts` の import と引数型を更新する
- [ ] `src/app/actions/meetings.ts` の `createMeetingAction` を更新:
  - `internalAttendees` / `externalAttendees` の FormData パースを維持しつつ、use case に渡す前に新構造に変換する
  - internal 要素 → `{ userId: null, contactId: null, name: value, isExternal: false }`
  - external 要素 → `{ userId: null, contactId: null, name: value, isExternal: true }`
- [ ] `src/app/actions/meetings.ts` の `updateMeetingAction` を更新: 同様に attendees の構造変換を行う

**Acceptance Criteria**:
- `MeetingAttendee` 型が `{ userId: string | null, contactId: string | null, name: string, isExternal: boolean }` である
- `Meeting.attendees` が `MeetingAttendee[]` 型である
- アクションで internal/external の入力を新構造に変換して use case に渡している
- 既存のテスト（meetingManagement.test.ts 等）がパスする（型変更に合わせてテストも更新）

## T-06: ClientContact の isPrimary 一意性検証

- [ ] `src/domain/services/clientContactService.ts` を新規作成する
- [ ] `validatePrimaryUniqueness(clientId: string, contactId: string | null, isPrimary: boolean, tx?: Transaction)` 関数を実装する:
  - `isPrimary` が false の場合は即座に成功を返す
  - `isPrimary` が true の場合、同じ `clientId` で `isPrimary=true` の既存レコードを検索する
  - `contactId` が指定されている場合（更新時）は自身を除外する
  - 既存の primary が存在する場合はエラーを返す
- [ ] `src/domain/services/index.ts` に `validatePrimaryUniqueness` のエクスポートを追加する
- [ ] `src/application/usecases/createClientContact.ts` に `isPrimary` パラメータ (optional, default false) を追加する
- [ ] `createClientContact` use case 内で、create 前に `validatePrimaryUniqueness(clientId, null, isPrimary, tx)` を呼び出す
- [ ] `src/app/actions/clients.ts` の `addClientContactAction` で use case に `isPrimary` を渡す: `isPrimary: parsed.data.isPrimary ?? false`
- [ ] `src/app/actions/clients.ts` の `updateClientContactAction` で、`clientRepository.updateContact` 呼び出し前に `validatePrimaryUniqueness(clientId, contactId, isPrimary)` を呼び出す
- [ ] バリデーションエラー時はユーザーに「この顧客には既に主担当者が設定されています」等のメッセージを返す

**Acceptance Criteria**:
- `clientContactService.ts` に `validatePrimaryUniqueness` 関数が存在する
- createClientContact use case が isPrimary パラメータを受け取り、重複チェックを行う
- updateClientContactAction が更新前に isPrimary 重複チェックを行う
- 同一 client に isPrimary=true が 2 件以上存在する操作がアプリケーション層でブロックされる

## T-07: マイグレーション SQL の生成と手書き追記

- [ ] T-01〜T-05 のスキーマ変更を全て `src/infrastructure/schema.ts` に反映した後、`bunx drizzle-kit generate` を実行してマイグレーション SQL を生成する
- [ ] 生成されたマイグレーション SQL に以下の手書き SQL を追記する:
  - **source enum 変換**: enum に含まれない既存 source 値を `'other'` に UPDATE してから ALTER COLUMN で型変更する
    ```sql
    UPDATE "inquiries" SET "source" = 'other' WHERE "source" NOT IN ('web', 'phone', 'email', 'referral', 'agent_service', 'exhibition', 'other');
    ```
  - **attendees 構造変換**: 既存の `{ internal: [...], external: [...] }` を新構造に変換する
    ```sql
    UPDATE "meetings" SET "attendees" = (
      SELECT COALESCE(jsonb_agg(item), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('userId', null, 'contactId', null, 'name', elem, 'isExternal', false) AS item
        FROM jsonb_array_elements_text(COALESCE("attendees"->'internal', '[]'::jsonb)) AS elem
        UNION ALL
        SELECT jsonb_build_object('userId', null, 'contactId', null, 'name', elem, 'isExternal', true) AS item
        FROM jsonb_array_elements_text(COALESCE("attendees"->'external', '[]'::jsonb)) AS elem
      ) sub
    );
    ```
  - **CHECK 制約追加**:
    ```sql
    ALTER TABLE "meetings" ADD CONSTRAINT "meetings_deal_or_inquiry_check" CHECK ("deal_id" IS NOT NULL OR "inquiry_id" IS NOT NULL);
    ```
- [ ] マイグレーション SQL が正しい順序で実行されることを確認する（enum 作成 → データ変換 → 型変更 → CHECK 制約）

**Acceptance Criteria**:
- マイグレーション SQL が `drizzle/` ディレクトリに存在する
- 既存データの source 値が enum の 7 値のいずれかに変換されている
- 既存データの attendees が新構造に変換されている
- meetings テーブルに CHECK 制約 `meetings_deal_or_inquiry_check` が存在する
- マイグレーションが正常に完了する

## T-08: 既存テストの更新と新規テストの追加

- [ ] `src/__tests__/usecases/meetingManagement.test.ts` を更新: attendees の型を新構造 (`MeetingAttendee[]`) に合わせる。inquiryId を使った Meeting 作成のテストを追加する
- [ ] `src/__tests__/usecases/inquiryManagement.test.ts` を更新: budget / timeline を含む引き合い作成・更新のテストを追加する。新しい source 値 (`email`, `agent_service`) でのテストを追加する
- [ ] `src/__tests__/usecases/dealManagement.test.ts` を更新: description を含む案件作成・更新のテストを追加する
- [ ] `src/__tests__/domain/` に `clientContactService.test.ts` を新規作成: `validatePrimaryUniqueness` のテストケースを追加する
  - isPrimary=false の場合は常に成功
  - isPrimary=true で既存 primary なしの場合は成功
  - isPrimary=true で既存 primary ありの場合はエラー
  - 更新時に自身が既存 primary の場合は成功（自身を除外）
- [ ] `typecheck` と全テストが green であることを確認する

**Acceptance Criteria**:
- 既存テストが新しい型定義に合わせて更新されている
- 新規フィールド（budget, timeline, description, inquiryId）のテストが存在する
- validatePrimaryUniqueness のテストが存在する
- `bun run typecheck` がエラーなし
- `bun test` が全テスト green
