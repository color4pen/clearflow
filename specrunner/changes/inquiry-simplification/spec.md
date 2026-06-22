# Spec: 引き合い簡素化と商談の案件専属化

## Requirements

### Requirement: inquiryStatusEnum から in_progress を削除する

`inquiryStatusEnum` の値は `["new", "converted", "declined"]` の3値でなければならない。`in_progress` は含まれてはならない。The enum SHALL contain only `["new", "converted", "declined"]`.

#### Scenario: スキーマ定義に in_progress が含まれない

**Given** `src/infrastructure/schema.ts` の `inquiryStatusEnum` 定義
**When** 値の一覧を確認する
**Then** `"in_progress"` が含まれず、`["new", "converted", "declined"]` のみである

---

### Requirement: meetings テーブルから inquiryId カラムを削除し dealId を NOT NULL にする

`meetings` テーブルには `inquiry_id` カラムが存在してはならない。`deal_id` は `NOT NULL` でなければならない。商談は必ず案件に紐づく。The `meetings` table MUST NOT contain an `inquiry_id` column, and `deal_id` MUST be NOT NULL.

#### Scenario: meetings テーブルに inquiryId カラムが存在しない

**Given** `src/infrastructure/schema.ts` の `meetings` テーブル定義
**When** カラム一覧を確認する
**Then** `inquiryId` カラムが存在せず、`dealId` が `.notNull()` 制約を持つ

#### Scenario: マイグレーションファイルが差分として追加される

**Given** 既存のマイグレーションファイルは変更されていない
**When** `bunx drizzle-kit generate` を実行する
**Then** 新しいマイグレーションファイルが生成され、`ALTER TABLE meetings DROP COLUMN inquiry_id` および `ALTER COLUMN deal_id SET NOT NULL` を含む

---

### Requirement: inquiriesRelations と meetingsRelations から meetings/inquiry 参照を削除する

`inquiriesRelations` の `meetings: many(meetings)` と `meetingsRelations` の `inquiry: one(inquiries)` は削除されなければならない。Both relation entries SHALL be removed.

#### Scenario: inquiriesRelations に meetings フィールドが存在しない

**Given** `src/infrastructure/schema.ts` の `inquiriesRelations`
**When** リレーション定義を確認する
**Then** `meetings: many(meetings)` フィールドが存在しない

---

### Requirement: InquiryStatus 型から in_progress を削除する

`InquiryStatus` 型は `"new" | "converted" | "declined"` の3値のユニオン型でなければならない。The `InquiryStatus` type SHALL be `"new" | "converted" | "declined"` with no other members.

#### Scenario: InquiryStatus 型に in_progress が含まれない

**Given** `src/domain/models/inquiry.ts` の `InquiryStatus` 型定義
**When** 型の値を確認する
**Then** `"in_progress"` が含まれず、`"new" | "converted" | "declined"` のみである

---

### Requirement: Meeting 型から inquiryId フィールドを削除し dealId を必須にする

`Meeting` 型の `inquiryId` フィールドは削除されなければならない。`dealId` は `string`（nullable なし）でなければならない。The `Meeting` type MUST NOT contain an `inquiryId` field, and `dealId` SHALL be typed as `string` (non-nullable).

#### Scenario: Meeting 型に inquiryId フィールドが存在しない

**Given** `src/domain/models/meeting.ts` の `Meeting` 型定義
**When** フィールド一覧を確認する
**Then** `inquiryId` フィールドが存在せず、`dealId: string` が必須フィールドとして定義されている

---

### Requirement: 引き合いの遷移ルールを簡素化する

遷移ルールは `new → [converted, declined]`、`declined → [new]` のみを許可しなければならない。`in_progress` への遷移および `in_progress` からの遷移はすべて禁止される。The system SHALL allow only the transitions `new → converted`, `new → declined`, and `declined → new`. All transitions involving `in_progress` MUST be rejected.

#### Scenario: new から converted への直接遷移が許可される

**Given** 引き合いのステータスが `new`
**When** `canTransition("new", "converted")` を呼び出す
**Then** `true` が返る

#### Scenario: new から declined への遷移が許可される

**Given** 引き合いのステータスが `new`
**When** `canTransition("new", "declined")` を呼び出す
**Then** `true` が返る

#### Scenario: declined から new への復帰が許可される

**Given** 引き合いのステータスが `declined`
**When** `canTransition("declined", "new")` を呼び出す
**Then** `true` が返る

#### Scenario: new から in_progress への遷移が禁止される

**Given** 引き合いのステータスが `new`
**When** `canTransition("new", "in_progress")` を呼び出す
**Then** `false` が返る（in_progress は廃止）

#### Scenario: declined から in_progress への遷移が禁止される

**Given** 引き合いのステータスが `declined`
**When** `canTransition("declined", "in_progress")` を呼び出す
**Then** `false` が返る

---

### Requirement: meetingRepository から inquiryId 関連メソッドを削除する

`meetingRepository` の `findAllByInquiry` メソッドと `findAllByInquiryOrDeal` メソッドは削除されなければならない。`create` メソッドの引数から `inquiryId` は削除されなければならない。`mapRow` から `inquiryId` のマッピングは削除されなければならない。The `meetingRepository` MUST NOT export `findAllByInquiry` or `findAllByInquiryOrDeal`, and the `create` function SHALL NOT accept an `inquiryId` parameter.

#### Scenario: findAllByInquiry メソッドが存在しない

**Given** `src/infrastructure/repositories/meetingRepository.ts`
**When** エクスポートされた関数の一覧を確認する
**Then** `findAllByInquiry` 関数が存在しない

#### Scenario: findAllByInquiryOrDeal メソッドが存在しない

**Given** `src/infrastructure/repositories/meetingRepository.ts`
**When** エクスポートされた関数の一覧を確認する
**Then** `findAllByInquiryOrDeal` 関数が存在しない

---

### Requirement: createMeeting ユースケースから inquiryId を削除し dealId を必須にする

`createMeeting` の引数に `inquiryId` は存在してはならない。`dealId` は必須（`string` 型）でなければならない。引き合い存在確認のロジックは削除されなければならない。The `createMeeting` use case MUST NOT accept an `inquiryId` parameter, and `dealId` SHALL be a required `string` argument.

#### Scenario: createMeeting に inquiryId パラメータが存在しない

**Given** `src/application/usecases/createMeeting.ts` の `createMeeting` 関数シグネチャ
**When** 引数の型定義を確認する
**Then** `inquiryId` フィールドが存在せず、`dealId: string` が必須フィールドである

---

### Requirement: updateInquiryStatus ユースケースから in_progress 遷移処理を削除する

`updateInquiryStatus` は `in_progress` への遷移を処理してはならない。`new` から直接 `converted` への遷移を受け付けなければならない。The `updateInquiryStatus` use case SHALL accept a direct `new → converted` transition and MUST NOT process any transition to or from `in_progress`.

#### Scenario: new から converted への案件化が成功する

**Given** ステータスが `new` で `clientId` が設定されている引き合い
**When** `updateInquiryStatus` で `newStatus: "converted"` を渡す
**Then** Deal が作成され、引き合いのステータスが `converted` に更新される

---

### Requirement: Server Actions から inquiryId 関連処理を削除する

`createMeetingAction` の `createMeetingSchema` から `inquiryId` フィールドは削除されなければならない。`dealId` は必須フィールドでなければならない。`revalidatePath` の `inquiryId` 参照は削除されなければならない。`updateInquiryStatusAction` は `in_progress` を受け付けてはならない。The Server Actions SHALL remove all `inquiryId` references, and `dealId` MUST be required in `createMeetingSchema`.

#### Scenario: createMeetingSchema に inquiryId が存在しない

**Given** `src/app/actions/meetings.ts` の `createMeetingSchema`
**When** スキーマ定義を確認する
**Then** `inquiryId` フィールドが存在せず、`dealId` が必須（`.uuid()` で optional なし）である

---

### Requirement: InquiryActions UI から in_progress 関連ボタンを削除する

`new` 状態では「案件化」と「見送り」のボタンのみ表示されなければならない。「対応開始」ボタン（`new → in_progress`）は存在してはならない。「対応再開」ボタンは `declined → new` への遷移ボタンに置き換えられなければならない（ラベルは「再開」）。The `InquiryActions` component MUST NOT render a button that triggers the `in_progress` transition. The "再開" button SHALL trigger a `declined → new` transition.

#### Scenario: new 状態で「対応開始」ボタンが表示されない

**Given** 引き合いのステータスが `new`
**When** `InquiryActions` コンポーネントをレンダリングする
**Then** `in_progress` への遷移ボタンが存在しない

#### Scenario: declined 状態で「再開」ボタンが new へ遷移する

**Given** 引き合いのステータスが `declined`
**When** 「再開」ボタンをクリックする
**Then** `updateInquiryStatusAction` に `newStatus: "new"` が渡される

---

### Requirement: 引き合い一覧ページから in_progress フィルタを削除する

`inquiries/page.tsx` の `in_progress` フィルタカウントとフィルタリンクは削除されなければならない。The inquiry list page SHALL NOT display an `in_progress` filter link or count.

#### Scenario: in_progress フィルタリンクが存在しない

**Given** `src/app/(dashboard)/inquiries/page.tsx`
**When** ページコンポーネントのレンダリングを確認する
**Then** `?status=in_progress` へのリンクが存在せず、`inProgressCount` の計算も存在しない

---

### Requirement: labels.ts から in_progress ラベルを削除する

`statusLabels` の `in_progress: "対応中"` エントリは削除されなければならない。The `statusLabels` object MUST NOT contain an `in_progress` key.

#### Scenario: statusLabels に in_progress が存在しない

**Given** `src/app/(dashboard)/labels.ts` の `statusLabels`
**When** オブジェクトのキーを確認する
**Then** `in_progress` キーが存在しない

---

### Requirement: 引き合い経由の商談ルートを削除する

`src/app/(dashboard)/inquiries/[id]/meetings/` ディレクトリ（`new/` と `[meetingId]/` を含む）は削除されなければならない。引き合い詳細ページの商談履歴セクションは削除されなければならない。The `inquiries/[id]/meetings/` route directory SHALL be deleted entirely. The inquiry detail page MUST NOT render a meeting history section.

#### Scenario: 引き合い詳細ページに商談履歴セクションが存在しない

**Given** `src/app/(dashboard)/inquiries/[id]/page.tsx`
**When** ページコンポーネントの JSX を確認する
**Then** 商談履歴セクション（`SectionCard` 内の「商談履歴」）が存在せず、`meetingRepository.findAllByInquiry` の呼び出しも存在しない

---

### Requirement: シードデータから in_progress と inquiryId を削除する

`seed.ts` の `inProgressInquiry1`、`inProgressInquiry2` のステータスは `new` または `converted` に変更されなければならない。`inquiryId` を持つ商談はすべて `dealId` のみ紐づけに変更されなければならない。The seed data SHALL NOT contain any inquiry with status `in_progress`, and all seeded meetings MUST be linked only via `dealId`.

#### Scenario: シードデータに in_progress ステータスの引き合いが存在しない

**Given** `src/infrastructure/seed.ts` の引き合いシードデータ
**When** ステータスの値を確認する
**Then** `in_progress` ステータスの引き合いが1件も存在しない

---

### Requirement: テストを新しい遷移ルールに合わせて更新する

`inquiryTransition.test.ts` の `in_progress` 関連テスト（T-01, T-03, T-04, T-07, T-08, T-09）は新しい遷移ルールを正しく反映した内容に書き換えられなければならない。The test file SHALL be updated to reflect the new transition rules, and all tests MUST pass with `bun test`.

#### Scenario: 全テストが新しい遷移ルールで green になる

**Given** 更新された `inquiryTransition.test.ts`
**When** `bun test` を実行する
**Then** すべてのテストが成功する
