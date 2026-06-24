# Test Cases: domain-model-alignment

## Summary

- **Total**: 32 cases
- **Automated** (unit/integration): 31
- **Manual**: 1
- **Priority**: must: 23, should: 9, could: 0

---

### TC-001: Creating an inquiry with budget and timeline

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Inquiry SHALL have budget and timeline fields > Scenario: Creating an inquiry with budget and timeline

---

### TC-002: Creating an inquiry without budget and timeline

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: Inquiry SHALL have budget and timeline fields > Scenario: Creating an inquiry without budget and timeline

---

### TC-003: Creating an inquiry with the new source value "email"

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: InquirySource SHALL be a pgEnum with 7 values > Scenario: Creating an inquiry with the new source value "email"

---

### TC-004: Creating an inquiry with the new source value "agent_service"

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: InquirySource SHALL be a pgEnum with 7 values > Scenario: Creating an inquiry with the new source value "agent_service"

---

### TC-005: Migration fallback for unknown source values

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: InquirySource SHALL be a pgEnum with 7 values > Scenario: Migration fallback for unknown source values

---

### TC-006: Creating a meeting linked to an inquiry (no deal)

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Meeting SHALL support linking to either an inquiry or a deal > Scenario: Creating a meeting linked to an inquiry (no deal)

---

### TC-007: Creating a meeting linked to a deal

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Meeting SHALL support linking to either an inquiry or a deal > Scenario: Creating a meeting linked to a deal

---

### TC-008: Rejecting a meeting with neither deal nor inquiry

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Meeting SHALL support linking to either an inquiry or a deal > Scenario: Rejecting a meeting with neither deal nor inquiry

---

### TC-009: Migration converts internal attendees

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Meeting attendees SHALL use the structured attendee format > Scenario: Migration converts internal attendees

---

### TC-010: Migration converts external attendees

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: Meeting attendees SHALL use the structured attendee format > Scenario: Migration converts external attendees

---

### TC-011: Migration converts mixed attendees

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: Meeting attendees SHALL use the structured attendee format > Scenario: Migration converts mixed attendees

---

### TC-012: Creating a deal with description

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Deal SHALL have a description field > Scenario: Creating a deal with description

---

### TC-013: Creating a deal without description

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: Deal SHALL have a description field > Scenario: Creating a deal without description

---

### TC-014: Setting isPrimary when no existing primary contact

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: isPrimary uniqueness SHALL be validated at the application layer > Scenario: Setting isPrimary when no existing primary contact

---

### TC-015: Setting isPrimary when another primary contact exists

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: isPrimary uniqueness SHALL be validated at the application layer > Scenario: Setting isPrimary when another primary contact exists

---

### TC-016: Updating isPrimary when another primary contact exists

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: isPrimary uniqueness SHALL be validated at the application layer > Scenario: Updating isPrimary when another primary contact exists

---

### TC-017: Unsetting isPrimary is always allowed

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: isPrimary uniqueness SHALL be validated at the application layer > Scenario: Unsetting isPrimary is always allowed

---

### TC-018: InquirySource 型が 7 値すべてを含む

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `InquirySource` 型が定義されている
**WHEN** 型定義を検査する
**THEN** `"web" | "phone" | "email" | "referral" | "agent_service" | "exhibition" | "other"` の 7 値がすべて含まれている

---

### TC-019: DB enum 制約が許可外の source 値を拒否する

**Category**: integration
**Priority**: should
**Source**: design.md > D1: source カラムを pgEnum に変更する

**GIVEN** inquiries テーブルの source カラムが inquirySourceEnum 型である
**WHEN** 直接 SQL で enum 外の値（例: `'fax'`）を INSERT しようとする
**THEN** PostgreSQL が `invalid input value for enum` エラーを返す

---

### TC-020: Zod スキーマが 7 つの source 値を受け付ける

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `createInquirySchema` と `updateInquirySchema` の `source` フィールドが定義されている
**WHEN** `"web"`, `"phone"`, `"email"`, `"referral"`, `"agent_service"`, `"exhibition"`, `"other"` をそれぞれ parse する
**THEN** 全 7 値が validation を通過する

---

### TC-021: Inquiry mapRow が budget / timeline を正しくマッピングする

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** DB から `{ budget: 5000000, timeline: "2026-Q3" }` を含む行が返される
**WHEN** `inquiryRepository` の `mapRow` 関数を適用する
**THEN** `Inquiry.budget === 5000000` かつ `Inquiry.timeline === "2026-Q3"` である

---

### TC-022: Deal mapRow が description を正しくマッピングする

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** DB から `{ description: "Large-scale system migration project" }` を含む行が返される
**WHEN** `dealRepository` の `mapRow` 関数を適用する
**THEN** `Deal.description === "Large-scale system migration project"` である

---

### TC-023: MeetingAttendee 型が正しい構造を持つ

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** `MeetingAttendee` 型が定義されている
**WHEN** 型定義を検査する
**THEN** `{ userId: string | null, contactId: string | null, name: string, isExternal: boolean }` の形状である

---

### TC-024: action が internal / external attendees を新構造に変換する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** FormData に `internalAttendees = ["Tanaka"]` と `externalAttendees = ["Client A"]` が含まれる
**WHEN** `createMeetingAction` または `updateMeetingAction` が attendees を変換して use case に渡す
**THEN** use case に渡される attendees が `[{ userId: null, contactId: null, name: "Tanaka", isExternal: false }, { userId: null, contactId: null, name: "Client A", isExternal: true }]` である

---

### TC-025: findAllByInquiry が inquiryId で商談を取得する

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** 同一 organizationId に対して inquiryId=X で紐付けられた Meeting が 2 件存在し、別の inquiryId=Y の Meeting が 1 件存在する
**WHEN** `meetingRepository.findAllByInquiry(X, organizationId)` を呼び出す
**THEN** X に紐付く 2 件のみが返り、Y に紐付くものは含まれない

---

### TC-026: meetingsRelations に inquiry リレーションが含まれる

**Category**: unit
**Priority**: should
**Source**: design.md > D6: Meeting の relations 更新

**GIVEN** `schema.ts` の `meetingsRelations` が定義されている
**WHEN** `meetingsRelations` の設定を検査する
**THEN** `inquiry` キーで `one(inquiries, ...)` のリレーションが定義されている

---

### TC-027: validatePrimaryUniqueness が application/services に配置されている

**Category**: unit
**Priority**: must
**Source**: design.md > D5: validatePrimaryUniqueness の配置

**GIVEN** `src/application/services/clientContactService.ts` が存在する
**WHEN** ファイルの export を検査する
**THEN** `validatePrimaryUniqueness` 関数がエクスポートされており、`src/domain/services/` には存在しない

---

### TC-028: createClientContact use case が db.transaction を使用する

**Category**: unit
**Priority**: must
**Source**: design.md > D5: validatePrimaryUniqueness の配置

**GIVEN** `createClientContact` use case の実装がある
**WHEN** ソースコードを検査する
**THEN** `db.transaction` ブロック内で `validatePrimaryUniqueness` の呼び出しと `clientRepository.createContact` の呼び出しが同一トランザクションに含まれている

---

### TC-029: マイグレーション SQL の実行順序が正しい

**Category**: manual
**Priority**: must
**Source**: design.md > D4: マイグレーションは手書き SQL + Drizzle generate の併用 / tasks.md > T-07

**GIVEN** `drizzle-kit generate` でマイグレーション SQL が生成され、手書き SQL が挿入されている
**WHEN** 生成されたマイグレーションファイルを目視確認する
**THEN** ステートメントの順序が `CREATE TYPE "inquiry_source"` → `UPDATE "inquiries" SET "source" = 'other' WHERE ...` → `ALTER TABLE "inquiries" ALTER COLUMN "source"` の順になっている

---

### TC-030: マイグレーション後に meetings テーブルに CHECK 制約が存在する

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** マイグレーションが実行済みである
**WHEN** `pg_constraint` カタログまたは Drizzle のスキーマ定義から制約を確認する
**THEN** `meetings_deal_or_inquiry_check` という名前の CHECK 制約 (`deal_id IS NOT NULL OR inquiry_id IS NOT NULL`) が存在する

---

### TC-031: findAllByDeal が dealId=null のレコードを含まない

**Category**: integration
**Priority**: should
**Source**: design.md > Risks / Trade-offs

**GIVEN** meetings テーブルに `deal_id=null, inquiry_id=<id>` のレコードと `deal_id=<deal-id>` のレコードが混在する
**WHEN** `meetingRepository.findAllByDeal(dealId, organizationId)` を呼び出す
**THEN** `deal_id=null` のレコードは結果に含まれず、指定した dealId のレコードのみが返る

---

### TC-032: マイグレーションが internal / external キーを持たない attendees を安全に処理する

**Category**: integration
**Priority**: should
**Source**: design.md > Risks / Trade-offs

**GIVEN** meetings テーブルに `attendees = '{}'` または `attendees = 'null'` のレコードが存在する
**WHEN** attendees 構造変換の UPDATE SQL が実行される
**THEN** そのレコードの attendees が `[]` (空配列) になり、エラーにならない

---

## Result

```yaml
result: completed
total: 32
automated: 31
manual: 1
must: 23
should: 9
could: 0
blocked_reasons: []
```
