# Tasks: ドメインモデルの設計整合

## T-01: inquirySourceEnum の定義と inquiries スキーマ変更

- [ ] `src/infrastructure/schema.ts` に `inquirySourceEnum` を pgEnum として追加する。値は `["web", "phone", "email", "referral", "agent_service", "exhibition", "other"]` の 7 値
- [ ] `inquiries` テーブルの `source` カラムを `text("source").notNull()` から `inquirySourceEnum("source").notNull()` に変更する
- [ ] `inquiries` テーブルに `budget: integer("budget")` (nullable) カラムを追加する
- [ ] `inquiries` テーブルに `timeline: text("timeline")` (nullable) カラムを追加する

**Acceptance Criteria**:
- `inquirySourceEnum` が schema.ts 内で pgEnum として定義されている（7 値）
- inquiries テーブル定義に budget, timeline, source (enum 型) が含まれる
- TypeScript の型チェックが通る

## T-02: meetings スキーマ変更（inquiryId 追加・dealId nullable 化）

- [ ] `meetings` テーブルの `dealId` を `.notNull()` から nullable に変更する: `dealId: uuid("deal_id").references(() => deals.id)` （.notNull() を削除）
- [ ] `meetings` テーブルに `inquiryId: uuid("inquiry_id").references(() => inquiries.id)` (nullable) カラムを追加する。dealId 定義の直後に配置する
- [ ] `meetings` テーブルの `attendees` カラムの default 値を旧形式から新形式に変更する: `.default({ internal: [], external: [] })` → `.default([])` （MeetingAttendee[] の空配列）
- [ ] `meetingsRelations` に `inquiry` relation を追加する: `inquiry: one(inquiries, { fields: [meetings.inquiryId], references: [inquiries.id] })`
- [ ] `inquiriesRelations` に `meetings: many(meetings)` を追加する

**Acceptance Criteria**:
- meetings テーブル定義で dealId が nullable になっている
- meetings テーブル定義に inquiryId (nullable, FK → inquiries.id) が存在する
- meetings テーブルの attendees カラムの default 値が `[]`（空配列）になっている
- relations 定義が双方向で設定されている
- TypeScript の型チェックが通る

## T-03: deals スキーマ変更（description 追加）

- [ ] `deals` テーブルに `description: text("description")` (nullable) カラムを追加する。title 定義の直後に配置する

**Acceptance Criteria**:
- deals テーブル定義に description (text, nullable) が存在する
- TypeScript の型チェックが通る

## T-04: Drizzle migration 生成とデータマイグレーション SQL の手動編集

- [ ] T-01〜T-03 のスキーマ変更を反映した状態で `bunx drizzle-kit generate` を実行し、migration ファイルを生成する
- [ ] 生成された migration SQL を以下の順序で手動編集する:

**Step 1: inquirySourceEnum 関連**
```sql
-- 1a. enum 型を作成する
CREATE TYPE "public"."inquiry_source" AS ENUM('web', 'phone', 'email', 'referral', 'agent_service', 'exhibition', 'other');
-- 1b. 既存データで enum 外の値を 'other' にフォールバックする
UPDATE inquiries SET source = 'other' WHERE source NOT IN ('web', 'phone', 'email', 'referral', 'agent_service', 'exhibition', 'other');
-- 1c. カラム型を text → enum に変更する
ALTER TABLE "inquiries" ALTER COLUMN "source" SET DATA TYPE "public"."inquiry_source" USING "source"::"public"."inquiry_source";
```

**Step 2: inquiries に budget / timeline を追加**
```sql
ALTER TABLE "inquiries" ADD COLUMN "budget" integer;
ALTER TABLE "inquiries" ADD COLUMN "timeline" text;
```

**Step 3: deals に description を追加**
```sql
ALTER TABLE "deals" ADD COLUMN "description" text;
```

**Step 4: meetings の dealId nullable 化と inquiryId 追加**
```sql
ALTER TABLE "meetings" ALTER COLUMN "deal_id" DROP NOT NULL;
ALTER TABLE "meetings" ADD COLUMN "inquiry_id" uuid;
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE no action ON UPDATE no action;
```

**Step 5: meetings の CHECK 制約追加**
```sql
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_deal_or_inquiry_check" CHECK (deal_id IS NOT NULL OR inquiry_id IS NOT NULL);
```

**Step 6: meetings の attendees データ変換**
```sql
UPDATE meetings SET attendees = (
  SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'userId', NULL,
      'contactId', NULL,
      'name', elem,
      'isExternal', false
    ) AS item
    FROM jsonb_array_elements_text(attendees->'internal') AS elem
    UNION ALL
    SELECT jsonb_build_object(
      'userId', NULL,
      'contactId', NULL,
      'name', elem,
      'isExternal', true
    ) AS item
    FROM jsonb_array_elements_text(attendees->'external') AS elem
  ) sub
)
WHERE attendees ? 'internal';
```

- [ ] 生成された migration ファイルが `drizzle/` ディレクトリの連番に従っていることを確認する（0003_*.sql）
- [ ] `statement-breakpoint` コメントが各 statement の間に挿入されていることを確認する

**Acceptance Criteria**:
- `drizzle/0003_*.sql` が存在し、上記 6 ステップの SQL を含む
- `drizzle/meta/_journal.json` に新エントリが追加されている
- 各 SQL 文の間に `--> statement-breakpoint` が挿入されている

## T-05: ドメインモデル型の更新

- [ ] `src/domain/models/inquiry.ts` の `InquirySource` 型に `"email"` と `"agent_service"` を追加する: `"web" | "phone" | "email" | "referral" | "agent_service" | "exhibition" | "other"`
- [ ] `src/domain/models/inquiry.ts` の `Inquiry` 型に `budget: number | null` と `timeline: string | null` フィールドを追加する
- [ ] `src/domain/models/meeting.ts` の `MeetingAttendees` 型を削除し、`MeetingAttendee` 型を新設する:
  ```typescript
  export type MeetingAttendee = {
    userId: string | null;
    contactId: string | null;
    name: string;
    isExternal: boolean;
  };
  ```
- [ ] `src/domain/models/meeting.ts` の `Meeting` 型を更新する:
  - `dealId: string` → `dealId: string | null`
  - `attendees: MeetingAttendees` → `attendees: MeetingAttendee[]`
  - `inquiryId: string | null` フィールドを追加する（dealId の直後）
- [ ] `src/domain/models/deal.ts` の `Deal` 型に `description: string | null` フィールドを追加する（title の直後）

**Acceptance Criteria**:
- InquirySource が 7 値の union 型である
- Inquiry 型に budget / timeline が含まれる
- MeetingAttendees 型が削除され MeetingAttendee 型が存在する
- Meeting 型の dealId が `string | null`、attendees が `MeetingAttendee[]`、inquiryId が `string | null`
- Deal 型に description が含まれる
- domain 層に infrastructure への import がない

## T-06: リポジトリの更新

- [ ] `src/infrastructure/repositories/inquiryRepository.ts`:
  - `mapRow` に `budget` と `timeline` のマッピングを追加する: `budget: row.budget ?? null`, `timeline: row.timeline ?? null`
  - `create` の data 引数に `budget?: number | null`, `timeline?: string | null` を追加する
  - `create` の values に `budget: data.budget ?? null`, `timeline: data.timeline ?? null` を追加する
  - `update` の data 型に `budget: number | null`, `timeline: string | null` を追加する

- [ ] `src/infrastructure/repositories/meetingRepository.ts`:
  - import 文の `MeetingAttendees` を `MeetingAttendee` に変更する
  - `mapRow` の `dealId` を `row.dealId ?? null` に変更する（nullable 対応）
  - `mapRow` に `inquiryId: row.inquiryId ?? null` を追加する
  - `mapRow` の `attendees` キャストを `row.attendees as MeetingAttendee[]` に変更する
  - `create` の data 引数を更新: `dealId` を optional (`dealId?: string | null`) に変更、`inquiryId?: string | null` を追加、`attendees` の型を `MeetingAttendee[]` に変更
  - `create` の values に `inquiryId: data.inquiryId ?? null` を追加し、`dealId` を `data.dealId ?? null` に変更する
  - `update` の data 型の `attendees` を `MeetingAttendee[]` に変更する
  - `findAllByDeal` の WHERE 条件を維持する（dealId が null でない商談のみを返すため既存動作は変わらない）
  - `findAllByInquiry(inquiryId: string, organizationId: string)` メソッドを新設する: `and(eq(meetings.inquiryId, inquiryId), eq(meetings.organizationId, organizationId))` で検索し、`asc(meetings.date)` でソートする

- [ ] `src/infrastructure/repositories/dealRepository.ts`:
  - `mapRow` に `description: row.description ?? null` を追加する
  - `create` の data 引数に `description?: string | null` を追加する
  - `create` の values に `description: data.description ?? null` を追加する
  - `update` の data 型に `description: string | null` を追加する

**Acceptance Criteria**:
- inquiryRepository の mapRow / create / update が budget / timeline を扱う
- meetingRepository の mapRow が dealId を nullable として扱い、inquiryId をマッピングする
- meetingRepository に findAllByInquiry メソッドが存在する
- meetingRepository の attendees 型が `MeetingAttendee[]` になっている
- dealRepository の mapRow / create / update が description を扱う
- TypeScript の型チェックが通る

## T-07: isPrimary 検証の domain service 追加

- [ ] `src/domain/services/clientContactValidation.ts` を新規作成する:
  ```typescript
  import type { ClientContact } from "@/domain/models/client";

  export type ValidationResult = { ok: true } | { ok: false; reason: string };

  /**
   * 同一 clientId 内で isPrimary = true が 1 件以下であることを検証する。
   * 新規作成時は existingContacts に既存の担当者一覧を渡す。
   * 更新時は excludeContactId で自身を除外する。
   */
  export function validateIsPrimaryUniqueness(
    isPrimary: boolean,
    existingContacts: ClientContact[],
    excludeContactId?: string
  ): ValidationResult {
    if (!isPrimary) return { ok: true };
    const hasPrimary = existingContacts.some(
      (c) => c.isPrimary && c.id !== excludeContactId
    );
    if (hasPrimary) {
      return { ok: false, reason: "この顧客にはすでに主担当者が設定されています" };
    }
    return { ok: true };
  }
  ```
- [ ] `src/domain/services/index.ts` のバレルファイルに `clientContactValidation` の export を追加する

**Acceptance Criteria**:
- `validateIsPrimaryUniqueness(true, [既存primary], undefined)` が `{ ok: false }` を返す
- `validateIsPrimaryUniqueness(true, [既存primaryでないcontact], undefined)` が `{ ok: true }` を返す
- `validateIsPrimaryUniqueness(false, [...], undefined)` が常に `{ ok: true }` を返す
- `validateIsPrimaryUniqueness(true, [自身がprimary], 自身のid)` が `{ ok: true }` を返す
- domain/services に infrastructure への import がない

## T-08: usecase の更新

- [ ] `src/application/usecases/createInquiry.ts`:
  - create の data 引数に `budget?: number | null`, `timeline?: string | null` を追加する
  - inquiryRepository.create への引数に `budget: data.budget ?? null`, `timeline: data.timeline ?? null` を追加する

- [ ] `src/application/usecases/updateInquiry.ts`:
  - data 引数に `budget?: number | null`, `timeline?: string | null` を追加する
  - updatePayload の型に `budget: number | null`, `timeline: string | null` を追加する
  - budget / timeline の undefined チェックと updatePayload への代入を追加する

- [ ] `src/application/usecases/createMeeting.ts`:
  - import の `MeetingAttendees` を `MeetingAttendee` に変更する
  - data 引数の型を更新: `dealId` を `dealId?: string | null` に変更、`inquiryId?: string | null` を追加、`attendees` を `MeetingAttendee[]` に変更
  - dealId / inquiryId の存在確認ロジックを追加する:
    - dealId が指定された場合: 案件の存在確認（既存ロジックを維持）
    - inquiryId が指定された場合: 引き合いの存在確認を追加（inquiryRepository.findById で確認）
    - 両方とも未指定の場合: `{ ok: false, reason: "案件または引き合いの指定が必要です" }` を返す
  - meetingRepository.create への引数に `inquiryId: data.inquiryId ?? null` を追加し、`dealId` を `data.dealId ?? null` に変更する

- [ ] `src/application/usecases/updateMeeting.ts`:
  - import の `MeetingAttendees` を `MeetingAttendee` に変更する
  - data 引数の `attendees` 型を `MeetingAttendee[]` に変更する

- [ ] `src/application/usecases/createDeal.ts`:
  - data 引数に `description?: string | null` を追加する
  - dealRepository.create への引数に `description: data.description ?? null` を追加する

- [ ] `src/application/usecases/updateDeal.ts`:
  - data 引数に `description?: string | null` を追加する
  - update の条件分岐に `description` を追加する

- [ ] `src/application/usecases/createClientContact.ts`:
  - `clientContactValidation` の `validateIsPrimaryUniqueness` を import する
  - `clientRepository` から `findContactsByClientId` を使って既存担当者一覧を取得する
  - `data.isPrimary` が true の場合、`validateIsPrimaryUniqueness` で重複チェックを実行する
  - バリデーション失敗時は `{ ok: false, reason: "..." }` を返す

- [ ] `src/application/usecases/updateClientContact.ts` を新規作成する:
  - data 引数: `contactId`, `clientId`, `organizationId`, `actorId`, `name`, `department?`, `position?`, `email?`, `phone?`, `isPrimary?`
  - `clientRepository.findContactsByClientId` で既存担当者一覧を取得する
  - `validateIsPrimaryUniqueness(data.isPrimary ?? false, existingContacts, data.contactId)` で重複チェックを実行する
  - バリデーション失敗時は `{ ok: false, reason: "..." }` を返す
  - `clientRepository.updateContact` で更新する
  - 監査ログ (`client_contact.update`) を記録する
  - `{ ok: true; contact: ClientContact }` を返す

- [ ] `src/application/usecases/index.ts` のバレルファイルを確認し、新規の export（`updateClientContact` を含む）が必要な場合は追加する

- [ ] `src/__tests__/usecases/meetingManagement.test.ts` の T-01 テストを更新する:
  - `expect(content).not.toContain("inquiryId")` の行を削除し、代わりに `expect(content).toContain("inquiryId")` を追加する（T-08 で inquiryId サポートを追加した後の期待値に合わせる）
  - テスト名を「dealId が必須パラメータとして含まれる」→「dealId または inquiryId を受け付けるコードが含まれる」に変更する

**Acceptance Criteria**:
- createInquiry / updateInquiry が budget / timeline を扱う
- createMeeting が dealId / inquiryId の双方を受け付け、存在確認を行う
- updateMeeting の attendees 型が MeetingAttendee[] になっている
- createDeal / updateDeal が description を扱う
- createClientContact が isPrimary の重複チェックを行う
- updateClientContact usecase が存在し isPrimary の重複チェック（excludeContactId 付き）を行う
- meetingManagement.test.ts の T-01 が inquiryId を含むことを検証するよう更新されている
- TypeScript の型チェックが通る

## T-09: Server Action の更新

- [ ] `src/app/actions/inquiries.ts`:
  - `createInquirySchema` の `source` の z.enum に `"email"` と `"agent_service"` を追加する: `z.enum(["web", "phone", "email", "referral", "agent_service", "exhibition", "other"])`
  - `createInquirySchema` に `budget: z.number().int().nullable().optional()` と `timeline: z.string().nullable().optional()` を追加する
  - `createInquiryAction` で parsed.data.budget / timeline を createInquiry に渡す
  - `updateInquirySchema` の `source` の z.enum にも `"email"` と `"agent_service"` を追加する
  - `updateInquirySchema` に `budget` と `timeline` を追加する
  - `updateInquiryAction` で budget / timeline を updateInquiry に渡す

- [ ] `src/app/actions/meetings.ts`:
  - `createMeetingSchema` の `dealId` を `z.string().uuid().optional()` に変更する（必須 → optional）
  - `createMeetingSchema` に `inquiryId: z.string().uuid().optional()` を追加する
  - attendees の組み立てロジックを新形式に変更する: `{ internal: [...], external: [...] }` → `MeetingAttendee[]` 形式への変換。internalAttendees の各要素を `{ userId: null, contactId: null, name: value, isExternal: false }` に、externalAttendees の各要素を `{ userId: null, contactId: null, name: value, isExternal: true }` に変換する
  - createMeeting の呼び出しで `dealId` を optional として渡し、`inquiryId` を追加する
  - `updateMeetingAction` の attendees 組み立ても同様に新形式に変更する

- [ ] `src/app/actions/clients.ts`:
  - `addClientContactAction` の `createClientContact` 呼び出しに `isPrimary: parsed.data.isPrimary ?? false` を追加する（現状では isPrimary がフォームから取得されているが usecase に渡されていない）
  - `updateClientContactAction` を更新する: `clientRepository.updateContact()` の直接呼び出しを廃止し、T-08 で新設した `updateClientContact` usecase を使用するよう変更する。import に `updateClientContact` を追加し、usecase 呼び出しの引数として `contactId`, `clientId`, `organizationId`, `actorId`, 各フィールドを渡す
  - `updateClientContact` が `{ ok: false }` を返した場合は `{ success: false, message: result.reason }` を返す

**Acceptance Criteria**:
- inquiries の zod スキーマが 7 値の source enum を受け付ける
- inquiries の action が budget / timeline を受け渡す
- meetings の action が dealId optional + inquiryId optional を受け付ける
- meetings の attendees が新形式（MeetingAttendee[]）で組み立てられる
- addClientContactAction が isPrimary を createClientContact に渡す
- updateClientContactAction が updateClientContact usecase を通じて isPrimary 重複チェックを行う
- TypeScript の型チェックが通る

## T-10: seed.ts の更新

- [ ] `src/infrastructure/seed.ts` の meetings データを新しい attendees 形式に変更する:
  - `attendees: { internal: [...], external: [...] }` → `attendees: [{ userId: null, contactId: null, name: "...", isExternal: false }, ...]` 形式に変換する
  - 全 8 件の meetings insert を更新する
- [ ] inquiries の seed データに budget / timeline の値を追加する（一部の引き合いに予算・時期を設定）
- [ ] inquiries の source に新しい enum 値（`"email"`, `"agent_service"` など）を使う seed データを 1〜2 件追加する（既存データの source 値が enum に含まれることを確認）

**Acceptance Criteria**:
- seed.ts の meetings データが新形式の attendees を使用している
- seed.ts の inquiries データに budget / timeline が含まれるレコードが存在する
- `bun run db:seed` が型チェックを通る（実行は migration 適用後に行う）

## T-11: ビルド検証

- [ ] `bun run build` が成功することを確認する
- [ ] TypeScript の型チェック（`bunx tsc --noEmit` または build に含まれる型チェック）がエラーなしで通ることを確認する
- [ ] `bun run lint` がエラーなしで通ることを確認する
- [ ] domain 層から infrastructure 層への import がないことを確認する（`src/domain/` 配下で `@/infrastructure` への import がゼロ）
- [ ] `bun test` が green であることを確認する

**Acceptance Criteria**:
- `bun run build` が exit code 0 で完了する
- `bun run lint` が exit code 0 で完了する
- `bun test` が exit code 0 で完了する
- `src/domain/` 配下に `@/infrastructure` への import が存在しない
