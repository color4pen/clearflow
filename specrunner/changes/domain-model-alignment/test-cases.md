# Test Cases: ドメインモデルの設計整合

<!-- FORMAT REQUIREMENTS:
Test Case heading format: `### TC-{NNN}: {Name}` (3-digit zero-padded, e.g. TC-001)

Required fields per test case:
  **Category**: unit | integration | manual
  **Priority**: must | should | could
  **Source**: reference to spec Scenario (spec.md > Requirement: <name> > Scenario: <name>) or design.md / tasks.md section

GIVEN/WHEN/THEN structure (mixed format — depends on TC type):
  Scenario 由来 TC (Source = spec.md > Requirement: <name> > Scenario: <name>):
    GWT は記述しない。Source 参照のみ。behavior の正典は spec の Scenario。
  非 Scenario 由来 TC (Source = design.md or tasks.md section):
    GWT は必須:
    **GIVEN** <preconditions>
    **WHEN** <action>
    **THEN** <expected result>

Category determination:
  unit        — pure logic, validation, helper functions (automated)
  integration — DB operations, API endpoints, multi-module interaction (automated)
  manual      — UI/UX confirmation, visual verification, build artifact check (not automated)

Priority determination:
  must   — core functionality; if broken, the feature does not work
  should — important but core still works; edge cases, error handling
  could  — nice to have; performance, UX details

Summary section MUST appear immediately after the title with ALL 4 items:
  ## Summary
  - **Total**: {count} cases
  - **Automated** (unit/integration): {count}
  - **Manual**: {count}
  - **Priority**: must: {count}, should: {count}, could: {count}

Result section MUST appear at the very end as a YAML code block:
  ## Result
  ```yaml
  result: completed | partial | failed
  total: {count}
  automated: {count}
  manual: {count}
  must: {count}
  should: {count}
  could: {count}
  blocked_reasons: []
  ```

  result determination:
    completed — all testable behaviors are documented
    partial   — some cases could not be derived due to design ambiguity
    failed    — spec is absent AND design.md / tasks.md are also missing
-->

## Summary

- **Total**: 61 cases
- **Automated** (unit/integration): 52
- **Manual**: 9
- **Priority**: must: 47, should: 14, could: 0

---

## Inquiry — budget / timeline 追加

### TC-001: 引き合い作成時に budget と timeline を指定する

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: inquiries テーブルに budget / timeline カラムが存在する > Scenario: 引き合い作成時に budget と timeline を指定する

### TC-002: budget / timeline 未指定で引き合いを作成できる（nullable）

- **Category**: integration
- **Priority**: should
- **Source**: spec.md > Requirement: inquiries テーブルに budget / timeline カラムが存在する > Scenario: budget / timeline 未指定で引き合いを作成する

### TC-003: InquirySource 型が 7 値を持つ

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-06

**GIVEN** `src/domain/models/inquiry.ts` の InquirySource 型定義を参照する  
**WHEN** 型の値を列挙する  
**THEN** `"web" | "phone" | "email" | "referral" | "agent_service" | "exhibition" | "other"` の 7 値であり、旧 5 値から `email` と `agent_service` が追加されている

### TC-004: updateInquiry で budget / timeline を更新できる

- **Category**: unit
- **Priority**: should
- **Source**: tasks.md > T-30

**GIVEN** budget=3000000, timeline="2027年Q1" を引数に updateInquiry usecase を呼び出す  
**WHEN** inquiryRepository.update への引数を確認する  
**THEN** updatePayload に budget と timeline が含まれ、repository に渡されている

---

## InquirySource — pgEnum 拡張

### TC-005: email ソースで引き合いを作成する

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: inquiries.source が pgEnum 型で 7 値を持つ > Scenario: email ソースで引き合いを作成する

### TC-006: 既存の text 型 source データがマイグレーションで enum 値に変換される

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: inquiries.source が pgEnum 型で 7 値を持つ > Scenario: 既存の text 型データがマイグレーションで変換される

### TC-007: enum に含まれない source 値の挿入が DB 制約エラーになる

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: inquiries.source が pgEnum 型で 7 値を持つ > Scenario: enum に含まれない値の挿入が拒否される

### TC-008: inquirySourceEnum が pgEnum として schema.ts に定義されている

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-01

**GIVEN** `src/infrastructure/schema.ts` を参照する  
**WHEN** `inquirySourceEnum` の定義を確認する  
**THEN** `pgEnum("inquiry_source", ["web", "phone", "email", "referral", "agent_service", "exhibition", "other"])` として定義されており 7 値を持つ

### TC-009: migration SQL で enum 外の source 値を `other` に変換する UPDATE が ALTER TYPE の前に存在する

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-33

**GIVEN** drizzle/ ディレクトリのマイグレーション SQL ファイルを参照する  
**WHEN** source 変換と型変更の実行順序を確認する  
**THEN** `UPDATE inquiries SET source = 'other' WHERE source NOT IN (...)` が `ALTER TABLE inquiries ALTER COLUMN source TYPE` より前の行に存在する

---

## Meeting — inquiryId 追加 / dealId nullable 化

### TC-010: 引合に紐づく商談を dealId なしで作成できる

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: meetings テーブルに inquiry_id カラムが存在し dealId が nullable である > Scenario: 引合に紐づく商談を作成する（Deal なし）

### TC-011: Deal に紐づく商談を inquiryId なしで作成できる

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: meetings テーブルに inquiry_id カラムが存在し dealId が nullable である > Scenario: Deal に紐づく商談を作成する（引合なし）

### TC-012: dealId も inquiryId も未指定で createMeeting がエラーを返す

- **Category**: unit
- **Priority**: must
- **Source**: spec.md > Requirement: meetings テーブルに inquiry_id カラムが存在し dealId が nullable である > Scenario: dealId も inquiryId も未指定で商談作成が拒否される

### TC-013: deal_id=null かつ inquiry_id=null の INSERT が CHECK 制約エラーになる

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: meetings テーブルに inquiry_id カラムが存在し dealId が nullable である > Scenario: CHECK 制約により両方 null の INSERT が拒否される

### TC-014: meetings action — dealId も inquiryId も未指定でバリデーションエラーが返る

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-23

**GIVEN** dealId も inquiryId も含まない FormData で createMeetingAction を呼び出す  
**WHEN** createMeetingSchema の refine バリデーションを確認する  
**THEN** バリデーションエラーが返り、createMeeting usecase は呼び出されない

### TC-015: createMeeting — inquiryId 指定時に引き合いの存在確認が行われる

- **Category**: integration
- **Priority**: should
- **Source**: tasks.md > T-18

**GIVEN** 存在しない inquiryId を指定して createMeeting usecase を実行する  
**WHEN** inquiryRepository.findById による存在確認を確認する  
**Then** 引き合いが見つからない場合にエラーが返り、商談は作成されない

### TC-016: meetingRepository.findAllByInquiry が organizationId でテナント分離されている

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: テナント分離 — 全クエリに organizationId 条件を付与する > Scenario: meetings の inquiryId 検索がテナント分離されている

### TC-017: meetingRepository.create が dealId 省略・inquiryId 指定を受け付ける

- **Category**: integration
- **Priority**: must
- **Source**: tasks.md > T-12

**GIVEN** dealId=undefined, inquiryId="uuid-xxx" を data に含めて meetingRepository.create を呼び出す  
**WHEN** DB への INSERT を確認する  
**THEN** deal_id=null, inquiry_id="uuid-xxx" のレコードが作成される

---

## Meeting — attendees 構造変更

### TC-018: 既存の attendees データがマイグレーションで新形式に変換される

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: meetings の attendees JSON 構造が新形式に準拠する > Scenario: 既存データがマイグレーションで新形式に変換される

### TC-019: 新形式の attendees で商談を作成できる

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: meetings の attendees JSON 構造が新形式に準拠する > Scenario: 新形式で商談を作成する

### TC-020: meetings action の attendees が MeetingAttendee[] 形式に変換されて渡される

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-23

**GIVEN** internalAttendees=["田中"], externalAttendees=["鈴木"] を含む FormData で createMeetingAction を呼び出す  
**WHEN** attendees 構築ロジックの出力を確認する  
**THEN** `[{ userId: null, contactId: null, name: "田中", isExternal: false }, { userId: null, contactId: null, name: "鈴木", isExternal: true }]` として createMeeting に渡される

### TC-021: MeetingAttendee 型が新設され domain/models/index.ts から export されている

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-07

**GIVEN** `src/domain/models/meeting.ts` と `src/domain/models/index.ts` を参照する  
**WHEN** MeetingAttendee の型定義と export を確認する  
**THEN** `{ userId: string | null; contactId: string | null; name: string; isExternal: boolean }` として定義され、index.ts から re-export されている

### TC-022: MeetingAttendees 型が MeetingAttendee[] に変更されている

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-07

**GIVEN** `src/domain/models/meeting.ts` を参照する  
**WHEN** MeetingAttendees の型定義を確認する  
**THEN** `MeetingAttendee[]` として定義されており、旧形式 `{ internal: string[]; external: string[] }` ではない

### TC-023: Meeting 型に inquiryId が存在し dealId が string | null である

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-07

**GIVEN** `src/domain/models/meeting.ts` を参照する  
**WHEN** Meeting 型の dealId / inquiryId フィールドを確認する  
**THEN** `dealId: string | null` と `inquiryId: string | null` が両方存在する

### TC-024: attendees JSON 変換 SQL が internal/external を正しい新形式にマッピングする

- **Category**: integration
- **Priority**: must
- **Source**: tasks.md > T-33

**GIVEN** `{ internal: ["田中"], external: ["鈴木"] }` の attendees を持つ meetings レコードが存在する状態でマイグレーションを実行する  
**WHEN** マイグレーション後の attendees を SELECT する  
**THEN** `[{ userId: null, contactId: null, name: "田中", isExternal: false }, { userId: null, contactId: null, name: "鈴木", isExternal: true }]` に変換されている

### TC-025: meetings の attendees default が空配列 `[]` に変更されている

- **Category**: unit
- **Priority**: should
- **Source**: tasks.md > T-02

**GIVEN** `src/infrastructure/schema.ts` の meetings テーブル定義を参照する  
**WHEN** attendees カラムのデフォルト値を確認する  
**THEN** `.default([])` が設定されており旧デフォルト `{ internal: [], external: [] }` ではない

---

## Deal — description 追加

### TC-026: description 付きで案件を作成できる

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: deals テーブルに description カラムが存在する > Scenario: description 付きで案件を作成する

### TC-027: Deal 型に description フィールドが存在する

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-08

**GIVEN** `src/domain/models/deal.ts` を参照する  
**WHEN** Deal 型の定義を確認する  
**THEN** `description: string | null` フィールドが存在する

---

## Contract — amount / startDate NOT NULL 化

### TC-028: 既存の null amount データにマイグレーションで 0 が設定される

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: contracts.amount と contracts.start_date が NOT NULL である > Scenario: 既存の null amount データにデフォルト値が設定される

### TC-029: 既存の null startDate データにマイグレーションで createdAt が設定される

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: contracts.amount と contracts.start_date が NOT NULL である > Scenario: 既存の null startDate データにデフォルト値が設定される

### TC-030: amount=null の INSERT が NOT NULL 制約エラーになる

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: contracts.amount と contracts.start_date が NOT NULL である > Scenario: amount=null の新規 INSERT が拒否される

### TC-031: migration SQL で NOT NULL 変更の前に NULL データのデフォルト値設定 UPDATE が実行される

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-33

**GIVEN** drizzle/ ディレクトリのマイグレーション SQL ファイルを参照する  
**WHEN** contracts 関連の SQL 実行順序を確認する  
**THEN** `UPDATE contracts SET amount = 0 WHERE amount IS NULL` が amount の NOT NULL 変更より前に存在し、`UPDATE contracts SET start_date = created_at WHERE start_date IS NULL` が start_date の NOT NULL 変更より前に存在する

### TC-032: Contract 型の amount が number（非 nullable）である

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-09

**GIVEN** `src/domain/models/contract.ts` を参照する  
**WHEN** Contract 型の amount フィールドを確認する  
**THEN** `amount: number` として定義されており `number | null` ではない

### TC-033: Contract 型の startDate が Date（非 nullable）である

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-09

**GIVEN** `src/domain/models/contract.ts` を参照する  
**WHEN** Contract 型の startDate フィールドを確認する  
**THEN** `startDate: Date` として定義されており `Date | null` ではない

### TC-034: contractRepository.create が amount / startDate を必須引数として受け取る

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-14

**GIVEN** `src/infrastructure/repositories/contractRepository.ts` の create メソッドを参照する  
**WHEN** data 引数の型定義を確認する  
**THEN** `amount: number`（必須）と `startDate: Date`（必須）として定義されており nullable ではない

### TC-035: createContract usecase — amount が null / 0 以下でエラーが返る

- **Category**: unit
- **Priority**: must
- **Source**: spec.md > Requirement: createContract usecase が amount を必須として検証する > Scenario: amount 未指定で契約を作成しようとする（Deal の estimatedAmount も null）

### TC-036: createContract usecase — amount=0 でエラーが返る

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-19

**GIVEN** amount=0 を指定して createContract usecase を実行する  
**WHEN** バリデーションを確認する  
**THEN** `{ ok: false, reason: "契約金額は必須です" }` が返り契約は作成されない

### TC-037: createContract usecase — startDate が null でエラーが返る

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-19

**GIVEN** startDate=null（Deal からのフォールバック後も null）で createContract usecase を実行する  
**WHEN** バリデーションを確認する  
**THEN** `{ ok: false, reason: "契約開始日は必須です" }` が返り契約は作成されない

### TC-038: contracts action で amount=0 が拒否される

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-25

**GIVEN** amount=0 を含む FormData で createContractAction を実行する  
**WHEN** action 層または usecase 層のバリデーションを確認する  
**THEN** エラーが返り契約は作成されない

---

## Invoice — issueDate 追加

### TC-039: issueDate 付きで請求を作成できる

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: invoices テーブルに issue_date カラムが存在する > Scenario: issueDate 付きで請求を作成する

### TC-040: issueDate 未指定で請求を作成できる（null として保存）

- **Category**: integration
- **Priority**: should
- **Source**: spec.md > Requirement: invoices テーブルに issue_date カラムが存在する > Scenario: issueDate 未指定で請求を作成する

### TC-041: Invoice 型に issueDate フィールドが存在し invoicedAt も残っている

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-10

**GIVEN** `src/domain/models/invoice.ts` を参照する  
**WHEN** Invoice 型の定義を確認する  
**THEN** `issueDate: Date | null` フィールドが存在し、`invoicedAt` も引き続き存在する

---

## ClientContact — isPrimary 重複チェック

### TC-042: isPrimary=true の担当者が既に存在する状態で新たに isPrimary=true を追加するとエラー

- **Category**: unit
- **Priority**: must
- **Source**: spec.md > Requirement: isPrimary の重複チェックがアプリケーション層に存在する > Scenario: isPrimary=true の担当者が既に存在する状態で新たに isPrimary=true を追加する

### TC-043: isPrimary=false の担当者は既存の isPrimary=true に関わらず作成できる

- **Category**: unit
- **Priority**: must
- **Source**: spec.md > Requirement: isPrimary の重複チェックがアプリケーション層に存在する > Scenario: isPrimary=false の担当者は制限なく作成できる

### TC-044: updateClientContactAction で別担当者を isPrimary=true に変更しようとするとエラー

- **Category**: unit
- **Priority**: must
- **Source**: spec.md > Requirement: isPrimary の重複チェックがアプリケーション層に存在する > Scenario: updateClientContactAction で isPrimary を true に変更しようとする

### TC-045: updateClientContactAction で自身を isPrimary=true のまま更新すると成功する

- **Category**: unit
- **Priority**: must
- **Source**: spec.md > Requirement: isPrimary の重複チェックがアプリケーション層に存在する > Scenario: すでに isPrimary=true の担当者を isPrimary=true のまま更新する

### TC-046: updateClientContactAction の重複チェックで contactId 自身のレコードが除外される

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-27

**GIVEN** client-A に isPrimary=true の担当者 contact-X が存在する  
**WHEN** contact-X 自身を isPrimary=true のまま updateClientContactAction で更新する際の重複カウント算出ロジックを確認する  
**THEN** `contacts.filter(c => c.isPrimary && c.id !== contactId).length` を使用しており contact-X 自身は除外されるためカウントが 0 になり更新が成功する

### TC-047: validatePrimaryUniqueness が純粋関数である（repository 呼び出しなし）

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-16

**GIVEN** `src/domain/services/clientContactService.ts` の validatePrimaryUniqueness 実装を参照する  
**WHEN** 関数本体の副作用を確認する  
**THEN** repository / DB へのアクセスが存在せず、引数 `(isPrimary: boolean, existingPrimaryCount: number)` だけで `{ valid: true }` または `{ valid: false; reason: string }` を返す純粋関数である

### TC-048: validatePrimaryUniqueness(false, N) は常に { valid: true } を返す

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-16

**GIVEN** validatePrimaryUniqueness(false, 5) を呼び出す  
**WHEN** 戻り値を確認する  
**THEN** `{ valid: true }` が返る（existingPrimaryCount に関わらず）

### TC-049: validatePrimaryUniqueness(true, >0) が正しいエラーメッセージで { valid: false } を返す

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-16

**GIVEN** validatePrimaryUniqueness(true, 1) を呼び出す  
**WHEN** 戻り値を確認する  
**THEN** `{ valid: false, reason: "この顧客にはすでに主担当者が設定されています" }` が返る

### TC-050: validatePrimaryUniqueness が createClientContact と updateClientContactAction の両方で呼び出されている

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-35

**GIVEN** `src/application/usecases/createClientContact.ts` と `src/app/actions/clients.ts` のソースを参照する  
**WHEN** `validatePrimaryUniqueness` の呼び出し箇所を確認する  
**THEN** 両ファイルに `validatePrimaryUniqueness` の import と呼び出しが存在する

---

## Migration — 全体

### TC-051: migration SQL に meetings の CHECK 制約追加 SQL が含まれる

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-33

**GIVEN** drizzle/ ディレクトリのマイグレーション SQL ファイルを参照する  
**WHEN** meetings 関連の DDL を確認する  
**THEN** `ALTER TABLE "meetings" ADD CONSTRAINT "meetings_deal_or_inquiry_check" CHECK ("deal_id" IS NOT NULL OR "inquiry_id" IS NOT NULL)` が存在する

### TC-052: マイグレーション後にアプリケーションが正常に動作する

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: 既存データのマイグレーションが正常に完了する > Scenario: マイグレーション後にアプリケーションが正常に動作する

---

## Schema — Relations

### TC-053: meetingsRelations と inquiriesRelations にリレーション定義が存在する

- **Category**: unit
- **Priority**: should
- **Source**: tasks.md > T-02

**GIVEN** `src/infrastructure/schema.ts` のリレーション定義を参照する  
**WHEN** meetingsRelations と inquiriesRelations を確認する  
**THEN** meetingsRelations に `inquiry: one(inquiries, { fields: [meetings.inquiryId], references: [inquiries.id] })` が存在し、inquiriesRelations に `meetings: many(meetings)` が存在する

---

## Repository — mapRow 型整合

### TC-054: inquiryRepository.mapRow の source フィールドに as InquirySource キャストが存在しない

- **Category**: unit
- **Priority**: should
- **Source**: tasks.md > T-11

**GIVEN** `src/infrastructure/repositories/inquiryRepository.ts` の mapRow 関数を参照する  
**WHEN** source フィールドの取り出し方を確認する  
**THEN** `as InquirySource` 型キャストが存在せず、Drizzle の `$inferSelect` によるユニオン型推論が活用されている

---

## UI コンポーネント

### TC-055: MeetingInfoSection が isExternal フラグで内部・外部参加者を分離表示する

- **Category**: manual
- **Priority**: should
- **Source**: tasks.md > T-31

**GIVEN** `attendees = [{ name: "田中", isExternal: false }, { name: "鈴木", isExternal: true }]` で MeetingInfoSection を描画する  
**WHEN** 内部・外部参加者の表示ロジックを確認する  
**THEN** `attendees.filter(a => !a.isExternal)` で内部参加者、`attendees.filter(a => a.isExternal)` で外部参加者が分離されて表示され、旧形式 `attendees.internal` / `attendees.external` への参照が存在しない

### TC-056: DealMeetingForm が新しい MeetingAttendee[] 形式で attendees を送信する

- **Category**: manual
- **Priority**: should
- **Source**: tasks.md > T-31

**GIVEN** `src/app/(dashboard)/deals/[id]/meetings/new/DealMeetingForm.tsx` を参照する  
**WHEN** フォーム送信時の attendees 構築ロジックを確認する  
**THEN** 旧形式 `{ internal: [...], external: [...] }` を構築するコードが存在せず、新しい `MeetingAttendee[]` 形式で送信されている

### TC-057: deals/[id]/page.tsx の attendees 表示が新構造に対応している

- **Category**: manual
- **Priority**: should
- **Source**: tasks.md > T-31

**GIVEN** `src/app/(dashboard)/deals/[id]/page.tsx` を参照する  
**WHEN** attendees 関連の表示ロジックを確認する  
**THEN** `attendees.internal` / `attendees.external` への参照が存在せず、`attendees.filter(a => ...)` または `isExternal` プロパティを使用している

---

## Seed データ

### TC-058: seed.ts が新スキーマに適合している

- **Category**: integration
- **Priority**: should
- **Source**: tasks.md > T-32

**GIVEN** `src/infrastructure/seed.ts` を参照し `bun run seed` を実行する  
**WHEN** 各テーブルの挿入データとエラーを確認する  
**THEN** エラーなく完了し、inquiries に budget / timeline が含まれ、meetings の attendees が新配列形式で、contracts の amount / startDate が非 null で、invoices に issueDate が含まれ、deals に description が含まれている

---

## Integration — ビルド・型チェック・テスト

### TC-059: ビルドが成功する

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: 型チェックとテストが green である > Scenario: ビルドが成功する

### TC-060: 型チェックが green である

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-36

**GIVEN** すべてのコード変更が完了している  
**WHEN** `bunx tsc --noEmit` を実行する  
**THEN** 型エラーが 0 件で終了する

### TC-061: テストが全件 green である

- **Category**: integration
- **Priority**: must
- **Source**: tasks.md > T-34 / T-35 / T-36

**GIVEN** すべてのコード変更とマイグレーションが完了している  
**WHEN** `bun test` を実行する  
**THEN** 全テストが pass し、T-34 の静的型整合確認テストと T-35 の isPrimary 検証存在確認テストを含め 0 件の failure である

---

## Result

```yaml
result: completed
total: 61
automated: 52
manual: 9
must: 47
should: 14
could: 0
blocked_reasons: []
```
