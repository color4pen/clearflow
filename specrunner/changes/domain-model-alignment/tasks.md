# Tasks: ドメインモデルの設計整合

## T-01: schema.ts — inquirySourceEnum を pgEnum として定義し inquiries テーブルを更新する

- [x] `src/infrastructure/schema.ts` に `inquirySourceEnum` を pgEnum として追加する: `pgEnum("inquiry_source", ["web", "phone", "email", "referral", "agent_service", "exhibition", "other"])`
- [x] inquiries テーブルの `source` カラムを `inquirySourceEnum("source").notNull()` に変更する（text 型から enum 型へ）
- [x] inquiries テーブルに `budget: integer("budget")` カラムを追加する（nullable）
- [x] inquiries テーブルに `timeline: text("timeline")` カラムを追加する（nullable）

**Acceptance Criteria**:
- `inquirySourceEnum` が pgEnum として定義され 7 値を持つ
- inquiries テーブルの source カラムが inquirySourceEnum 型である
- inquiries テーブルに budget (integer, nullable) と timeline (text, nullable) カラムが存在する
- `bun run build` が通る

---

## T-02: schema.ts — meetings テーブルに inquiryId を追加し dealId を nullable に変更する

- [x] meetings テーブルの `dealId` を nullable に変更する: `uuid("deal_id").references(() => deals.id)` （`.notNull()` を削除）
- [x] meetings テーブルに `inquiryId: uuid("inquiry_id").references(() => inquiries.id)` を追加する（nullable）
- [x] `meetingsRelations` に `inquiry` リレーションを追加する: `inquiry: one(inquiries, { fields: [meetings.inquiryId], references: [inquiries.id] })`
- [x] `inquiriesRelations` に `meetings: many(meetings)` を追加する
- [x] meetings テーブルの `attendees` カラムの schema default を新配列形式に変更する: `jsonb('attendees').notNull().default([])` （旧形式 `{ internal: [], external: [] }` から変更）

**Acceptance Criteria**:
- meetings テーブルの deal_id が nullable である
- meetings テーブルに inquiry_id (uuid, nullable, FK → inquiries.id) が存在する
- meetingsRelations と inquiriesRelations にリレーション定義が存在する
- meetings テーブルの attendees の schema default が `[]`（空配列）である
- `bun run build` が通る

---

## T-03: schema.ts — deals テーブルに description を追加する

- [x] deals テーブルに `description: text("description")` カラムを追加する（nullable、title の後に配置）

**Acceptance Criteria**:
- deals テーブルに description (text, nullable) カラムが存在する
- `bun run build` が通る

---

## T-04: schema.ts — contracts テーブルの amount / startDate を NOT NULL に変更する

- [x] contracts テーブルの `amount` を `integer("amount").notNull()` に変更する
- [x] contracts テーブルの `startDate` を `timestamp("start_date").notNull()` に変更する

**Acceptance Criteria**:
- contracts テーブルの amount が NOT NULL である
- contracts テーブルの start_date が NOT NULL である
- `bun run build` が通る

---

## T-05: schema.ts — invoices テーブルに issueDate を追加する

- [x] invoices テーブルに `issueDate: timestamp("issue_date")` カラムを追加する（nullable、dueDate の後に配置）

**Acceptance Criteria**:
- invoices テーブルに issue_date (timestamp, nullable) カラムが存在する
- `bun run build` が通る

---

## T-06: ドメインモデル型 — Inquiry モデルに budget / timeline を追加し InquirySource を拡張する

- [x] `src/domain/models/inquiry.ts` の `InquirySource` 型に `"email"` と `"agent_service"` を追加して 7 値にする: `"web" | "phone" | "email" | "referral" | "agent_service" | "exhibition" | "other"`
- [x] `src/domain/models/inquiry.ts` の `Inquiry` 型に `budget: number | null` と `timeline: string | null` を追加する
- [x] `src/app/actions/inquiries.ts` の source の zod enum に `"email"` と `"agent_service"` を追加する（createInquirySchema と updateInquirySchema の両方）

**Acceptance Criteria**:
- InquirySource 型が 7 値を持つ
- Inquiry 型に budget と timeline フィールドが存在する
- inquiries action の zod バリデーションが 7 値の source を受け付ける
- `bun run build` が通る

---

## T-07: ドメインモデル型 — Meeting モデルの attendees 型と inquiryId を変更する

- [x] `src/domain/models/meeting.ts` に `MeetingAttendee` 型を新設する: `{ userId: string | null; contactId: string | null; name: string; isExternal: boolean }`
- [x] `src/domain/models/meeting.ts` の `MeetingAttendees` 型を `MeetingAttendee[]` に変更する（型エイリアスの再定義）
- [x] `src/domain/models/meeting.ts` の `Meeting` 型に `inquiryId: string | null` を追加する。`dealId` を `string | null` に変更する
- [x] `src/domain/models/index.ts` の meeting 関連の export に `MeetingAttendee` を追加する

**Acceptance Criteria**:
- MeetingAttendee 型が新設され export されている
- MeetingAttendees が MeetingAttendee[] に変更されている
- Meeting 型に inquiryId (string | null) が存在し、dealId が string | null である
- `bun run build` が通る（この時点で型エラーが発生するのは想定内、後続タスクで修正）

---

## T-08: ドメインモデル型 — Deal モデルに description を追加する

- [x] `src/domain/models/deal.ts` の `Deal` 型に `description: string | null` を追加する（title の後に配置）

**Acceptance Criteria**:
- Deal 型に description (string | null) フィールドが存在する
- `bun run build` が通る

---

## T-09: ドメインモデル型 — Contract モデルの amount / startDate を必須に変更する

- [x] `src/domain/models/contract.ts` の `Contract` 型の `amount` を `number`（非 nullable）に変更する
- [x] 同型の `startDate` を `Date`（非 nullable）に変更する

**Acceptance Criteria**:
- Contract 型の amount が number（非 nullable）である
- Contract 型の startDate が Date（非 nullable）である
- `bun run build` が通る（この時点で型エラーが発生するのは想定内、後続タスクで修正）

---

## T-10: ドメインモデル型 — Invoice モデルに issueDate を追加する

- [x] `src/domain/models/invoice.ts` の `Invoice` 型に `issueDate: Date | null` を追加する（dueDate の後に配置）

**Acceptance Criteria**:
- Invoice 型に issueDate (Date | null) フィールドが存在する
- `bun run build` が通る

---

## T-11: リポジトリ — inquiryRepository に budget / timeline を反映する

- [x] `src/infrastructure/repositories/inquiryRepository.ts` の `mapRow` 関数に `budget` と `timeline` のマッピングを追加する
- [x] `mapRow` 関数の `source` フィールドの `as InquirySource` 型キャストを削除する（T-01 で source が pgEnum になると Drizzle の `$inferSelect` が自動的にユニオン型を推論するため、明示的なキャストは不要かつ型安全を低下させる）
- [x] `create` メソッドの data 引数に `budget?: number | null` と `timeline?: string | null` を追加し、values に含める
- [x] `update` メソッドの data 引数に `budget?: number | null` と `timeline?: string | null` を追加する

**Acceptance Criteria**:
- mapRow が budget と timeline を返す
- mapRow の source フィールドに `as InquirySource` キャストが存在しない
- create / update で budget と timeline を設定できる
- `bun run build` が通る

---

## T-12: リポジトリ — meetingRepository を inquiryId / 新 attendees 型に対応させる

- [x] `src/infrastructure/repositories/meetingRepository.ts` の `mapRow` 関数に `inquiryId` のマッピングを追加する。`dealId` のマッピングを nullable 対応にする（`row.dealId ?? null`）
- [x] `create` メソッドの data 引数の `dealId` を `string` から `string | undefined` に変更し、`inquiryId?: string | null` を追加する。values に inquiryId を含める
- [x] `create` メソッドの `attendees` 引数の型を新しい `MeetingAttendee[]` 型に更新する（`MeetingAttendees` 型エイリアスが変更されるため import はそのまま）
- [x] `update` メソッドの data 引数に `inquiryId` を追加し、attendees の型を更新する
- [x] `findAllByDeal` メソッドの WHERE 条件で `eq(meetings.dealId, dealId)` を使用する箇所を確認する（dealId が nullable になるが、検索時に渡す dealId は string なので問題なし）
- [x] `findAllByInquiry` メソッドを新設する: `inquiryId: string, organizationId: string` を引数に、`eq(meetings.inquiryId, inquiryId)` AND `eq(meetings.organizationId, organizationId)` で検索し、`Meeting[]` を返す

**Acceptance Criteria**:
- mapRow が inquiryId を返し、dealId が nullable を許容する
- create で inquiryId を設定でき、dealId が省略可能
- findAllByInquiry メソッドが存在する
- attendees の型が新しい MeetingAttendee[] に対応している
- `bun run build` が通る

---

## T-13: リポジトリ — dealRepository に description を反映する

- [x] `src/infrastructure/repositories/dealRepository.ts` の `mapRow` 関数に `description` のマッピングを追加する: `description: row.description ?? null`
- [x] `create` メソッドの data 引数に `description?: string | null` を追加し、values に含める
- [x] `update` メソッドの data 引数に `description: string | null` を追加する

**Acceptance Criteria**:
- mapRow が description を返す
- create / update で description を設定できる
- `bun run build` が通る

---

## T-14: リポジトリ — contractRepository の amount / startDate を NOT NULL 対応にする

- [x] `src/infrastructure/repositories/contractRepository.ts` の `mapRow` 関数で `amount` と `startDate` の nullable フォールバック（`?? null`）を削除する（NOT NULL のため不要）
- [x] `create` メソッドの data 引数で `amount` を `number`（必須）、`startDate` を `Date`（必須）に変更する
- [x] `update` メソッドの data 引数で `amount` を `number | null` から `number` に、`startDate` を `Date | null` から `Date` に変更する（nullable を許容しない）

**Acceptance Criteria**:
- mapRow で amount と startDate が非 nullable で返される
- create の amount / startDate が必須引数である
- `bun run build` が通る

---

## T-15: リポジトリ — invoiceRepository に issueDate を反映する

- [x] `src/infrastructure/repositories/invoiceRepository.ts` の `mapRow` 関数に `issueDate` のマッピングを追加する: `issueDate: row.issueDate ?? null`
- [x] `create` メソッドの data 引数に `issueDate?: Date | null` を追加し、values に含める
- [x] `update` メソッドの data 引数に `issueDate?: Date | null` を追加する

**Acceptance Criteria**:
- mapRow が issueDate を返す
- create / update で issueDate を設定できる
- `bun run build` が通る

---

## T-16: ドメインサービス — clientContactService に validatePrimaryUniqueness を新設する

- [x] `src/domain/services/clientContactService.ts` を新規作成する
- [x] `validatePrimaryUniqueness(isPrimary: boolean, existingPrimaryCount: number): { valid: true } | { valid: false; reason: string }` 関数を実装する。isPrimary が true かつ existingPrimaryCount > 0 の場合 `{ valid: false, reason: "この顧客にはすでに主担当者が設定されています" }` を返す。それ以外は `{ valid: true }` を返す
- [x] `src/domain/services/index.ts` に re-export を追加する

**Acceptance Criteria**:
- `validatePrimaryUniqueness` が export されている
- isPrimary=true かつ existingPrimaryCount > 0 でエラーを返す
- isPrimary=false の場合は常に valid を返す
- 関数が純粋で副作用がない（repository を呼ばない）
- `bun run build` が通る

---

## T-17: usecase — createInquiry に budget / timeline を追加する

- [x] `src/application/usecases/createInquiry.ts` の data 引数に `budget?: number | null` と `timeline?: string | null` を追加する
- [x] inquiryRepository.create 呼び出し時に budget と timeline を渡す

**Acceptance Criteria**:
- createInquiry で budget / timeline を指定できる
- `bun run build` が通る

---

## T-18: usecase — createMeeting を inquiryId 対応に変更する

- [x] `src/application/usecases/createMeeting.ts` の data 引数で `dealId` を `string` から `string | undefined` に変更し、`inquiryId?: string` を追加する
- [x] バリデーション追加: `!data.dealId && !data.inquiryId` の場合 `{ ok: false, reason: "案件または引き合いの指定が必要です" }` を返す
- [x] dealId が指定された場合の存在確認は維持。inquiryId が指定された場合は inquiryRepository.findById で存在確認する（import 追加）
- [x] meetingRepository.create 呼び出し時に inquiryId を渡す

**Acceptance Criteria**:
- createMeeting で dealId または inquiryId のいずれかを指定できる
- 両方 null の場合にエラーが返る
- inquiryId 指定時に引き合いの存在確認が行われる
- `bun run build` が通る

---

## T-19: usecase — createContract の amount / startDate 必須化バリデーションを追加する

- [x] `src/application/usecases/createContract.ts` で、Deal の estimatedAmount フォールバック後に amount が null / undefined / 0 以下の場合 `{ ok: false, reason: "契約金額は必須です" }` を返す
- [x] startDate のフォールバック後に null の場合 `{ ok: false, reason: "契約開始日は必須です" }` を返す
- [x] contractRepository.create 呼び出し時の amount / startDate を非 null として渡す（型アサーション不要になるようフォールバックロジックを整理する）

**Acceptance Criteria**:
- amount が null / 0 以下の場合にエラーが返る
- startDate が null の場合にエラーが返る
- contractRepository.create に非 null の amount / startDate が渡される
- `bun run build` が通る

---

## T-20: usecase — createClientContact に isPrimary バリデーションを追加する

- [x] `src/application/usecases/createClientContact.ts` の data 引数に `isPrimary?: boolean` を追加する
- [x] isPrimary が true の場合、`clientRepository.findContactsByClientId(data.clientId)` で既存担当者を取得し、isPrimary=true のカウントを計算する
- [x] `validatePrimaryUniqueness` を呼び出し、valid でない場合はエラーを返す
- [x] `clientRepository.createContact` 呼び出し時に isPrimary を渡す

**Acceptance Criteria**:
- createClientContact で isPrimary を指定できる
- isPrimary=true かつ既存の主担当者がいる場合にエラーが返る
- `bun run build` が通る

---

## T-21: usecase — updateMeeting を新 attendees 型に対応させる

- [x] `src/application/usecases/updateMeeting.ts` の data 引数の attendees 型が新しい `MeetingAttendees`（= `MeetingAttendee[]`）に対応していることを確認する（型エイリアスの import はそのままで、型変更が自動的に反映される）

**Acceptance Criteria**:
- updateMeeting の attendees 引数型が MeetingAttendee[] に対応している
- `bun run build` が通る

---

## T-22: Server Action — inquiries action に budget / timeline / 新 source enum を反映する

- [x] `src/app/actions/inquiries.ts` の `createInquirySchema` に `budget: z.coerce.number().int().optional()` と `timeline: z.string().optional()` を追加する
- [x] `createInquiryAction` で parsed.data.budget / timeline を createInquiry に渡す
- [x] `updateInquirySchema` に `budget` と `timeline` を追加する
- [x] `updateInquiryAction` で parsed.data.budget / timeline を updateInquiry に渡す

**Acceptance Criteria**:
- 引き合い作成・更新時に budget / timeline を指定できる
- source の zod enum が 7 値を受け付ける（T-06 で対応済み）
- `bun run build` が通る

---

## T-23: Server Action — meetings action を inquiryId / 新 attendees 構造に対応させる

- [x] `src/app/actions/meetings.ts` の `createMeetingSchema` で `dealId` を optional にし、`inquiryId: z.string().uuid().optional()` を追加する
- [x] `createMeetingSchema` に refine を追加: dealId と inquiryId の少なくとも一方が必須
- [x] `createMeetingAction` の attendees 構築ロジックを変更する。internalAttendees の文字列配列を `{ userId: null, contactId: null, name: value, isExternal: false }` のオブジェクト配列に変換する。externalAttendees も同様に `{ userId: null, contactId: null, name: value, isExternal: true }` に変換する
- [x] `createMeetingAction` の createMeeting 呼び出し時に inquiryId を渡す
- [x] `updateMeetingAction` の attendees 構築ロジックも同様に新構造に変更する

**Acceptance Criteria**:
- meetings action で inquiryId を指定できる（dealId なしでも可）
- attendees が新しい配列構造で createMeeting / updateMeeting に渡される
- `bun run build` が通る

---

## T-24: Server Action — deals action に description を反映する

- [x] `src/app/actions/deals.ts` の `createDealSchema` に `description: z.string().optional()` を追加する
- [x] `createDealAction` で parsed.data.description を createDeal に渡す
- [x] `updateDealSchema` に `description: z.string().optional().nullable()` を追加する
- [x] `updateDealAction` で parsed.data.description を updateDeal に渡す

**Acceptance Criteria**:
- 案件作成・更新時に description を指定できる
- `bun run build` が通る

---

## T-25: Server Action — contracts action の amount / startDate 必須化を反映する

- [x] `src/app/actions/contracts.ts` の `createContractSchema` の amount バリデーションを確認する（`.nonnegative()` を `.positive()` に変更して 0 を拒否する、または usecase 側のバリデーションに委ねる）
- [x] `updateContractSchema` の amount / startDate の nullable を削除する（NOT NULL に対応）

**Acceptance Criteria**:
- 契約作成時に amount=0 が拒否される（usecase またはバリデーション層で）
- `bun run build` が通る

---

## T-26: Server Action — invoices action に issueDate を反映する

- [x] `src/app/actions/invoices.ts` の `createInvoiceSchema` に `issueDate: z.string().optional()` を追加する
- [x] `createInvoiceAction` で parsed.data.issueDate を createInvoice に渡す（Date に変換）

**Acceptance Criteria**:
- 請求作成時に issueDate を指定できる
- `bun run build` が通る

---

## T-27: Server Action — clients action に isPrimary バリデーションを追加する

- [x] `src/app/actions/clients.ts` の `addClientContactAction` で isPrimary を createClientContact usecase に渡す（現在は usecase に isPrimary 引数がないため、T-20 完了後に対応）
- [x] `updateClientContactAction` に isPrimary 検証を追加する: isPrimary=true の場合、`clientRepository.findContactsByClientId(clientId)` で既存担当者を取得し、自身以外に isPrimary=true がいるかを確認する。重複カウントは `contacts.filter(c => c.isPrimary && c.id !== contactId).length` で計算する（自己再設定の場合は自身を除外するため、すでに isPrimary=true の担当者を isPrimary=true のまま更新する操作は成功する）。`validatePrimaryUniqueness` を import して呼び出す。valid でない場合はエラーを返す

**Acceptance Criteria**:
- addClientContactAction が isPrimary を createClientContact usecase に渡す
- updateClientContactAction で isPrimary=true への変更時に重複チェックが行われる
- updateClientContactAction で自分自身（contactId が一致するレコード）は重複チェックの対象外とする
- `bun run build` が通る

---

## T-28: usecase — createDeal / updateDeal に description を追加する

- [x] `src/application/usecases/createDeal.ts` の data 引数に `description?: string | null` を追加し、dealRepository.create に渡す
- [x] `src/application/usecases/updateDeal.ts` の data 引数に `description?: string | null` を追加し、dealRepository.update に渡す

**Acceptance Criteria**:
- createDeal / updateDeal で description を指定できる
- `bun run build` が通る

---

## T-29: usecase — createInvoice / updateInvoice に issueDate を追加する

- [x] `src/application/usecases/createInvoice.ts` の data 引数に `issueDate?: Date | null` を追加し、invoiceRepository.create に渡す
- [x] invoice の update 関連 usecase（updateInvoiceStatus 含む）で issueDate の更新が必要な場合は対応する

**Acceptance Criteria**:
- createInvoice で issueDate を指定できる
- `bun run build` が通る

---

## T-30: usecase — updateInquiry に budget / timeline を追加する

- [x] `src/application/usecases/updateInquiry.ts` の data 引数に `budget?: number | null` と `timeline?: string | null` を追加する
- [x] updatePayload に budget / timeline の更新ロジックを追加する

**Acceptance Criteria**:
- updateInquiry で budget / timeline を更新できる
- `bun run build` が通る

---

## T-31: UI コンポーネント — MeetingInfoSection / DealMeetingForm を新 attendees 構造に対応させる

- [x] `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/MeetingInfoSection.tsx` の Props の attendees 型を `MeetingAttendee[]` に変更する
- [x] MeetingInfoSection 内の internal/external 分離ロジックを新構造に対応させる。表示時: `attendees.filter(a => !a.isExternal)` で内部参加者、`attendees.filter(a => a.isExternal)` で外部参加者を分離する
- [x] フォーム送信時の attendees 構築ロジックを新構造に変更する
- [x] `src/app/(dashboard)/deals/[id]/meetings/new/DealMeetingForm.tsx` も同様に新構造に対応させる
- [x] `src/app/(dashboard)/deals/[id]/page.tsx` の attendees 表示を新構造に対応させる

**Acceptance Criteria**:
- MeetingInfoSection が新しい MeetingAttendee[] 構造で動作する
- DealMeetingForm が新構造で attendees を送信する
- deals/[id]/page.tsx の attendees 表示が新構造に対応している
- `bun run build` が通る

---

## T-32: シードデータ — seed.ts を新スキーマに対応させる

- [x] `src/infrastructure/seed.ts` の inquiries 挿入データに budget / timeline を追加する（適切なサンプル値）
- [x] inquiries の source を新 enum 値に合わせる（既存値が enum に含まれていれば変更不要）
- [x] meetings の attendees データを新構造に変更する
- [x] meetings の dealId を維持しつつ、inquiryId が null であることを明示する（nullable 対応）
- [x] contracts のデータで amount / startDate が非 null であることを確認する
- [x] invoices のデータに issueDate を追加する（適切なサンプル値 or null）
- [x] deals のデータに description を追加する（適切なサンプル値 or null）

**Acceptance Criteria**:
- seed.ts が新スキーマに適合している
- `bun run build` が通る

---

## T-33: マイグレーション — drizzle-kit generate + 手動 SQL 編集

- [x] `bunx drizzle-kit generate` を実行してマイグレーション SQL を生成する
- [x] 生成された SQL ファイルに以下の手動編集を加える:
  - (a) `CREATE TYPE "public"."inquiry_source"` の前に、既存 source カラムの enum 外の値を `other` に UPDATE する SQL を追加: `UPDATE inquiries SET source = 'other' WHERE source NOT IN ('web', 'phone', 'email', 'referral', 'agent_service', 'exhibition', 'other');`
  - (b) contracts.amount の NOT NULL 変更の前に `UPDATE contracts SET amount = 0 WHERE amount IS NULL;` を追加する
  - (c) contracts.start_date の NOT NULL 変更の前に `UPDATE contracts SET start_date = created_at WHERE start_date IS NULL;` を追加する
  - (d) meetings テーブルに CHECK 制約を追加する: `ALTER TABLE "meetings" ADD CONSTRAINT "meetings_deal_or_inquiry_check" CHECK ("deal_id" IS NOT NULL OR "inquiry_id" IS NOT NULL);`
  - (e) attendees の JSON 変換 SQL を追加する:
    ```sql
    UPDATE meetings SET attendees = (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'userId', null,
          'contactId', null,
          'name', elem,
          'isExternal', false
        )
      ), '[]'::jsonb)
      FROM jsonb_array_elements_text(attendees->'internal') AS elem
    ) || (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'userId', null,
          'contactId', null,
          'name', elem,
          'isExternal', true
        )
      ), '[]'::jsonb)
      FROM jsonb_array_elements_text(attendees->'external') AS elem
    )
    WHERE attendees ? 'internal';
    ```
- [x] マイグレーションの実行順序が正しいことを確認する（UPDATE → ALTER の順）

**Acceptance Criteria**:
- マイグレーション SQL が drizzle/ ディレクトリに存在する
- source enum の変換 SQL が含まれている
- contracts の amount / startDate のデフォルト値設定 SQL が含まれている
- meetings の CHECK 制約追加 SQL が含まれている
- attendees の JSON 変換 SQL が含まれている
- `bunx drizzle-kit migrate` が正常に完了する

---

## T-34: テスト — 新規追加・変更されたモデル型の型整合確認

- [x] 静的解析テストで以下を検証する:
  - Inquiry 型に budget / timeline フィールドが存在する
  - InquirySource に "email" / "agent_service" が含まれる
  - Meeting 型に inquiryId フィールドが存在し、dealId が nullable である
  - MeetingAttendee 型が export されている
  - Deal 型に description フィールドが存在する
  - Contract 型の amount が non-nullable である
  - Invoice 型に issueDate フィールドが存在する
  - validatePrimaryUniqueness が domain/services から export されている

**Acceptance Criteria**:
- すべての静的解析テストが green
- `bun test` が通る

---

## T-35: テスト — isPrimary 検証の存在確認

- [x] 静的解析テストで以下を検証する:
  - `createClientContact.ts` のソースに `validatePrimaryUniqueness` の呼び出しが含まれる
  - `src/app/actions/clients.ts` の `updateClientContactAction` のソースに `validatePrimaryUniqueness` の呼び出しが含まれる

**Acceptance Criteria**:
- isPrimary 検証の存在がテストで確認される
- `bun test` が通る

---

## T-36: 最終確認 — ビルド・型チェック・テスト

- [x] `bun run build` を実行し、ビルドが成功することを確認する
- [x] `bunx tsc --noEmit` を実行し、型チェックが通ることを確認する
- [x] `bun test` を実行し、全テストが green であることを確認する
- [x] `bun run lint` を実行し、lint エラーがないことを確認する

**Acceptance Criteria**:
- `bun run build` 成功
- `typecheck` green
- `bun test` 全件 green
- `bun run lint` エラーなし
