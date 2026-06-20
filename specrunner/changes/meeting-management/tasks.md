# Tasks: 商談管理

## T-01: schema.ts に meetingTypeEnum と meetings テーブルを追加する

- [x] `src/infrastructure/schema.ts` の Enums セクション（L36 `inquiryStatusEnum` の後）に `meetingTypeEnum` を追加する: `pgEnum("meeting_type", ["hearing", "proposal", "negotiation", "closing", "followup"])`
- [x] `inquiries` テーブル定義（L264）の直後、Auth.js adapter テーブル（L266 `accounts`）の前に `meetings` テーブルを追加する。カラム:
  - `id` (uuid PK defaultRandom)
  - `organizationId` (uuid FK to organizations, notNull)
  - `inquiryId` (uuid FK to inquiries, notNull)
  - `type` (meetingTypeEnum, notNull)
  - `date` (timestamp, notNull) — 商談日時
  - `location` (text, nullable) — 場所/オンラインURL
  - `attendees` (jsonb, notNull, default `{ internal: [], external: [] }`) — `{ internal: string[], external: string[] }`
  - `summary` (text, nullable) — 議事録/要約
  - `actionItems` (jsonb, notNull, default `[]`) — `Array<{ description: string, assignee: string, dueDate: string | null, done: boolean }>`
  - `hearingData` (jsonb, nullable) — ヒアリング項目。type が `hearing` の場合に使用
  - `createdById` (uuid FK to users, notNull) — 記録者
  - `createdAt` (timestamp, defaultNow, notNull)
  - `updatedAt` (timestamp, defaultNow, notNull)

**Acceptance Criteria**:
- `meetingTypeEnum` が `["hearing", "proposal", "negotiation", "closing", "followup"]` で定義されている
- `meetings` テーブルの全カラムが定義されている
- `meetings.organizationId` が organizations への FK である
- `meetings.inquiryId` が inquiries への FK である
- `meetings.createdById` が users への FK である
- テーブル定義は Auth.js adapter テーブルの前に配置されている
- `bun run build` が通る

---

## T-02: schema.ts に meetings の Relations 定義を追加する

- [x] `inquiriesRelations`（L463-484）に `meetings: many(meetings)` を追記する
- [x] `organizationsRelations`（L306-317）に `meetings: many(meetings)` を追記する
- [x] `usersRelations`（L326-338）に `meetings: many(meetings)` を追記する（createdById の逆参照）
- [x] Relations セクション末尾に `meetingsRelations` を追加する: `organization` (one → organizations), `inquiry` (one → inquiries), `createdBy` (one → users)

**Acceptance Criteria**:
- `meetingsRelations` が export されている
- `inquiriesRelations` に `meetings: many(meetings)` がある
- `organizationsRelations` に `meetings: many(meetings)` がある
- `usersRelations` に `meetings: many(meetings)` がある
- 全 Relations の fields/references が正しい FK カラムを参照している
- `bun run build` が通る

---

## T-03: ドメインモデル（meeting.ts）を追加する

- [x] `src/domain/models/meeting.ts` を作成する
- [x] `MeetingType` 型: `"hearing" | "proposal" | "negotiation" | "closing" | "followup"`
- [x] `HearingData` 型: `{ challenge: string | null, budget: string | null, decisionMaker: string | null, timeline: string | null, competitors: string | null, notes: string | null }`
- [x] `ActionItem` 型: `{ description: string, assignee: string, dueDate: string | null, done: boolean }`
- [x] `MeetingAttendees` 型: `{ internal: string[], external: string[] }`
- [x] `Meeting` 型: `{ id: string, organizationId: string, inquiryId: string, type: MeetingType, date: Date, location: string | null, attendees: MeetingAttendees, summary: string | null, actionItems: ActionItem[], hearingData: HearingData | null, createdById: string, createdAt: Date, updatedAt: Date }`
- [x] `src/domain/models/index.ts` に `export type { MeetingType, HearingData, ActionItem, MeetingAttendees, Meeting } from "./meeting"` を追記する

**Acceptance Criteria**:
- `meeting.ts` に ORM / infrastructure への import がない（純粋な type エイリアス）
- `index.ts` の barrel export に `MeetingType`, `HearingData`, `ActionItem`, `MeetingAttendees`, `Meeting` が含まれる
- `bun run build` が通る

---

## T-04: meetingRepository を追加する

- [x] `src/infrastructure/repositories/meetingRepository.ts` を作成する
- [x] `db`, `Transaction`, `meetings` を import する。`Meeting`, `MeetingType`, `HearingData`, `ActionItem`, `MeetingAttendees` を domain models から import する
- [x] `mapRow()` 内部関数で DB 行 → `Meeting` 型変換を実装する。`attendees` は `as MeetingAttendees` でキャスト、`actionItems` は `as ActionItem[]` でキャスト、`hearingData` は `as HearingData | null` でキャスト、`type` は `as MeetingType` でキャスト
- [x] `create(data: { organizationId, inquiryId, type, date, location?, attendees, summary?, actionItems, hearingData?, createdById }, tx?): Promise<Meeting>` — `.returning()` で `mapRow` 適用
- [x] `findById(id, organizationId, tx?): Promise<Meeting | null>` — `and(eq(id), eq(organizationId))` で条件
- [x] `findAllByInquiry(inquiryId, organizationId): Promise<Meeting[]>` — `and(eq(inquiryId), eq(organizationId))` で条件、`date` 順（昇順）
- [x] `findAllByOrganization(organizationId): Promise<Meeting[]>` — `eq(organizationId)` で絞り込み、`date` 順（降順）
- [x] `update(id, organizationId, data: Partial<{ type, date, location, attendees, summary, actionItems, hearingData }>, tx?): Promise<Meeting | null>` — `updatedAt: new Date()` を含めて更新、`.returning()` で返却
- [x] `src/infrastructure/repositories/index.ts` に `export * as meetingRepository from "./meetingRepository"` を追記する

**Acceptance Criteria**:
- `create`, `findById`, `findAllByInquiry`, `findAllByOrganization`, `update` が export されている
- 全クエリ関数に `organizationId` 条件がある
- `findAllByInquiry` に `inquiryId` と `organizationId` の両条件がある
- 全メソッドにオプション `tx?: Transaction` パラメータがある（findAllByInquiry, findAllByOrganization を除く）
- `index.ts` に `meetingRepository` が追加されている
- `bun run build` が通る

---

## T-05: createMeeting usecase を追加する

- [x] `src/application/usecases/createMeeting.ts` を作成する
- [x] `CreateMeetingResult` 型を定義する: `{ ok: true; meeting: Meeting } | { ok: false; reason: string }`
- [x] `createMeeting(data: { organizationId, actorId, inquiryId, type, date, location?, attendees, summary?, actionItems, hearingData? }): Promise<CreateMeetingResult>` を export する
- [x] `inquiryRepository.findById(inquiryId, organizationId)` で引き合いの存在確認。見つからなければ `{ ok: false, reason: "引き合いが見つかりません" }` を返す
- [x] type が `hearing` でない場合、hearingData を null に強制する
- [x] `db.transaction()` 内で:
  1. `meetingRepository.create()` で商談を作成する
  2. `auditLogRepository.create()` で監査ログを記録する（action: `meeting.create`, targetType: `meeting`, targetId: 新商談ID）
- [x] エラーハンドリング: try/catch で `{ ok: false, reason }` を返す
- [x] `src/application/usecases/index.ts` に `export { createMeeting } from "./createMeeting"` を追記する

**Acceptance Criteria**:
- 存在しない inquiryId が渡された場合にエラーを返す
- type が `hearing` でない場合に hearingData が null になる
- トランザクション内で商談作成 + 監査ログ記録が行われる
- index.ts に re-export がある
- `bun run build` が通る

---

## T-06: listMeetings usecase を追加する

- [x] `src/application/usecases/listMeetings.ts` を作成する
- [x] `listMeetings(inquiryId: string, organizationId: string): Promise<Meeting[]>` を export する — `meetingRepository.findAllByInquiry()` を呼び出す
- [x] `src/application/usecases/index.ts` に `export { listMeetings } from "./listMeetings"` を追記する

**Acceptance Criteria**:
- `listMeetings` が `Meeting[]` を返す
- index.ts に re-export がある
- `bun run build` が通る

---

## T-07: updateMeeting usecase を追加する

- [x] `src/application/usecases/updateMeeting.ts` を作成する
- [x] `UpdateMeetingResult` 型を定義する: `{ ok: true; meeting: Meeting } | { ok: false; reason: string }`
- [x] `updateMeeting(data: { meetingId, organizationId, actorId, type?, date?, location?, attendees?, summary?, actionItems?, hearingData? }): Promise<UpdateMeetingResult>` を export する
- [x] `meetingRepository.findById(meetingId, organizationId)` で商談の存在確認。見つからなければ `{ ok: false, reason: "商談が見つかりません" }` を返す
- [x] 更新後の type（指定がなければ既存の type）が `hearing` でない場合、hearingData を null に強制する
- [x] `db.transaction()` 内で:
  1. `meetingRepository.update()` で商談を更新する
  2. `auditLogRepository.create()` で監査ログを記録する（action: `meeting.update`, targetType: `meeting`, targetId: meetingId）
- [x] エラーハンドリング: try/catch で `{ ok: false, reason }` を返す
- [x] `src/application/usecases/index.ts` に `export { updateMeeting } from "./updateMeeting"` を追記する

**Acceptance Criteria**:
- 存在しない meetingId が渡された場合にエラーを返す
- type が `hearing` でない場合に hearingData が null になる
- トランザクション内で商談更新 + 監査ログ記録が行われる
- actionItems の done フラグ更新が可能
- index.ts に re-export がある
- `bun run build` が通る

---

## T-08: Server Actions（meetings.ts）を追加する

- [x] `src/app/actions/meetings.ts` を作成する。`"use server"` 宣言
- [x] `createMeetingSchema` を定義する（Zod）:
  - `inquiryId`: UUID 必須
  - `type`: `z.enum(["hearing", "proposal", "negotiation", "closing", "followup"])`
  - `date`: 日時文字列（ISO8601）必須
  - `location`: text optional
  - `internalAttendees`: 文字列配列 optional（default `[]`）
  - `externalAttendees`: 文字列配列 optional（default `[]`）
  - `summary`: text optional
  - `actionItems`: `z.array(z.object({ description: z.string(), assignee: z.string(), dueDate: z.string().nullable(), done: z.boolean() }))` optional（default `[]`）
  - `hearingData`: `z.object({ challenge, budget, decisionMaker, timeline, competitors, notes })` optional（全フィールド `z.string().nullable()`）
- [x] `createMeetingAction(prevState, formData): Promise<CreateMeetingState>` を実装する:
  - `auth()` 認証チェック
  - `checkRateLimit()` でレート制限
  - Zod バリデーション
  - `createMeeting` usecase を呼び出す（attendees は `{ internal: internalAttendees, external: externalAttendees }` に組み立て）
  - `revalidatePath("/inquiries/${inquiryId}")` + `revalidatePath("/inquiries/${inquiryId}/meetings")`
- [x] `updateMeetingSchema` を定義する（Zod）— createMeetingSchema と同様だが全フィールド optional + `meetingId` UUID 必須
- [x] `updateMeetingAction(prevState, formData): Promise<UpdateMeetingState>` を実装する:
  - `auth()` 認証チェック
  - Zod バリデーション
  - `updateMeeting` usecase を呼び出す
  - `revalidatePath` で関連パスを更新

**Acceptance Criteria**:
- 全アクションに認証チェックがある
- `createMeetingAction` に Zod バリデーションがある
- organizationId はセッションから取得している
- `bun run build` が通る

---

## T-09: UI — 引き合い詳細ページに「商談履歴」セクションを追加する

- [x] `src/app/(dashboard)/inquiries/[id]/page.tsx` を修正する
- [x] `meetingRepository.findAllByInquiry(id, organizationId)` で商談一覧を取得する
- [x] 既存の「ステータス変更」SectionCard の前に「商談履歴」SectionCard を追加する
- [x] 商談一覧をテーブルで時系列表示する（種別、日時、場所、参加者数、アクションアイテム数）
- [x] 各行は `/inquiries/[id]/meetings/[meetingId]` へのリンクとする
- [x] 「商談を記録」リンクボタン（`/inquiries/[id]/meetings/new`）を配置する
- [x] 商談が 0 件の場合は空状態メッセージを表示する

**Acceptance Criteria**:
- 引き合い詳細ページに「商談履歴」セクションが表示される
- 商談が時系列で表示される
- 「商談を記録」リンクが `/inquiries/[id]/meetings/new` を指す
- 各商談行がクリック可能で詳細ページへ遷移する
- `bun run build` が通る

---

## T-10: UI — 商談記録ページ（/inquiries/[id]/meetings/new）

- [x] `src/app/(dashboard)/inquiries/[id]/meetings/new/page.tsx` を作成する（Server Component）
- [x] `auth()` でセッションを取得し、引き合いの存在確認を行う（notFound）
- [x] `src/app/(dashboard)/inquiries/[id]/meetings/new/MeetingForm.tsx` を作成する（`"use client"`）
- [x] フォームフィールド:
  - `type`: 種別選択ドロップダウン（hearing / proposal / negotiation / closing / followup）日本語ラベル付き
  - `date`: 日時入力（datetime-local）
  - `location`: 場所/URL テキスト入力（任意）
  - `internalAttendees`: 社内参加者（動的追加・削除 UI）
  - `externalAttendees`: 社外参加者（動的追加・削除 UI）
  - `summary`: 議事録テキストエリア（任意）
  - `actionItems`: アクションアイテム（動的追加・削除 UI）。各アイテムに description, assignee, dueDate, done
- [x] type が `hearing` の場合のみヒアリング項目入力フォームを追加表示する（条件付きレンダリング）:
  - `challenge`: 課題 テキストエリア
  - `budget`: 予算感 テキスト入力
  - `decisionMaker`: 決裁者 テキスト入力
  - `timeline`: 時期 テキスト入力
  - `competitors`: 競合状況 テキストエリア
  - `notes`: 備考 テキストエリア
- [x] フォーム送信時に `createMeetingAction` を呼び出す。`useActionState` で状態管理
- [x] 成功時に `/inquiries/[id]` へ遷移する

**Acceptance Criteria**:
- `/inquiries/:id/meetings/new` に商談記録フォームが表示される
- 種別で `hearing` を選択するとヒアリング項目フォームが表示される
- 種別で `hearing` 以外を選択するとヒアリング項目フォームが非表示になる
- 社内/社外参加者の動的追加・削除ができる
- アクションアイテムの動的追加・削除ができる
- フォーム送信で `createMeetingAction` が呼ばれる
- バリデーションエラー時にメッセージが表示される
- `bun run build` が通る

---

## T-11: UI — 商談詳細ページ（/inquiries/[id]/meetings/[meetingId]）

- [x] `src/app/(dashboard)/inquiries/[id]/meetings/[meetingId]/page.tsx` を作成する（Server Component）
- [x] `auth()` でセッションを取得し、`meetingRepository.findById(meetingId, organizationId)` で商談を取得する。見つからない場合は `notFound()`
- [x] 商談の詳細情報を SectionCard で表示する:
  - 種別（日本語ラベル）、日時、場所、記録者
  - 参加者（社内/社外を区分して表示）
  - 議事録
  - type が `hearing` の場合、ヒアリング項目を表示する（課題、予算感、決裁者、時期、競合状況、備考）
- [x] アクションアイテム一覧を表示する。各アイテムに完了チェックボックスを配置する
- [x] 編集フォーム（Client Component）を配置する。`updateMeetingAction` を呼び出す
- [x] アクションアイテムの done チェックボックス変更時に `updateMeetingAction` を呼び出す（actionItems 配列全体を再構築して送信）

**Acceptance Criteria**:
- `/inquiries/:id/meetings/:meetingId` に商談詳細が表示される
- type が `hearing` の場合にヒアリング項目が表示される
- アクションアイテムの done 状態を更新できる
- 編集フォームが表示され、更新が可能
- 存在しない商談 ID の場合 404 が表示される
- `bun run build` が通る

---

## T-12: シードデータを追加する

- [x] `src/infrastructure/seed.ts` に `meetings` の import を追加する
- [x] テーブル truncation 順序に `meetings` を `inquiries` の前（`auditLogs → approvalSteps → meetings → inquiries → ...`）に追加する（meetings.inquiryId が inquiries.id を参照するため先に削除）
- [x] 引き合い 3 件に紐づく商談 4 件を作成する:
  - 1 件目: type `hearing`、引き合い1件目に紐づく、hearingData あり（challenge: "基幹システムの老朽化", budget: "3000万円程度", decisionMaker: "情報システム部長", timeline: "来期上期", competitors: "B社、C社", notes: null）
  - 2 件目: type `proposal`、引き合い2件目に紐づく、hearingData null
  - 3 件目: type `negotiation`、引き合い2件目に紐づく、hearingData null
  - 4 件目: type `followup`、引き合い3件目に紐づく、hearingData null
- [x] 各商談に attendees（internal: ユーザー名、external: 顧客担当者名）と actionItems（1-2件）を設定する

**Acceptance Criteria**:
- シード実行後に商談 4 件が作成される
- hearing タイプの商談に hearingData が設定されている
- 非 hearing タイプの商談の hearingData が null である
- truncation 順序が FK 制約に違反しない
- `bun run build` が通る

---

## T-13: テスト — projectStructure.test.ts にドメインモデルと静的検証を追加する

- [x] `src/__tests__/static/projectStructure.test.ts` の TC-031（ドメインモデルファイル一覧、L102-113）に `"domain/models/meeting.ts"` を追加する
- [x] TC-034（domain 層に infrastructure import がない、L136-153）のファイル一覧に `"domain/models/meeting.ts"` を追加する

**Acceptance Criteria**:
- `projectStructure.test.ts` のモデルファイル一覧に `meeting.ts` が含まれている
- TC-034 のファイル一覧に `meeting.ts` が含まれている
- `bun test` が通る

---

## T-14: テスト — テナント分離テストに meetingRepository を追加する

- [x] `src/__tests__/static/projectStructure.test.ts` に「Tenant isolation — meeting」describe ブロックを追加する:
  - テスト: `meetingRepository.create` に `organizationId` が含まれる
  - テスト: `meetingRepository.findById` に `organizationId` 条件がある
  - テスト: `meetingRepository.findAllByInquiry` に `organizationId` 条件がある
  - テスト: `meetingRepository.findAllByOrganization` に `organizationId` 条件がある
  - テスト: `meetingRepository.update` に `organizationId` 条件がある
  - テスト: `src/app/actions/meetings.ts` が `session.user.organizationId` を使用している
- [x] パターンは既存の「Tenant isolation — client/inquiry」セクション（L872-962）を踏襲する

**Acceptance Criteria**:
- meetingRepository の全メソッドに organizationId 条件があることがテストで検証される
- meetings action が organizationId をセッションから取得していることがテストで検証される
- `bun test` が通る

---

## T-15: テスト — meetingManagement usecase 静的検証テストを追加する

- [x] `src/__tests__/usecases/meetingManagement.test.ts` を作成する。パターンは `inquiryManagement.test.ts` を踏襲する
- [x] `createMeeting usecase 静的検証` describe:
  - テスト: `inquiryRepository.findById` の呼び出しが含まれる（引き合い存在確認）
  - テスト: `auditLogRepository.create` の呼び出しが含まれる（監査ログ記録）
  - テスト: `db.transaction` の呼び出しが含まれる（トランザクション内処理）
  - テスト: hearingData の null 制御コード（type が hearing でない場合に null）が含まれる
- [x] `updateMeeting usecase 静的検証` describe:
  - テスト: `meetingRepository.findById` の呼び出しが含まれる（存在確認）
  - テスト: `auditLogRepository.create` の呼び出しが含まれる（監査ログ記録）
  - テスト: `db.transaction` の呼び出しが含まれる（トランザクション内処理）
  - テスト: hearingData の null 制御コードが含まれる
- [x] `listMeetings usecase 静的検証` describe:
  - テスト: `meetingRepository.findAllByInquiry` の呼び出しが含まれる

**Acceptance Criteria**:
- createMeeting の引き合い存在確認・監査ログ・トランザクション・hearingData 制御がテストで検証される
- updateMeeting の存在確認・監査ログ・トランザクション・hearingData 制御がテストで検証される
- listMeetings のリポジトリ呼び出しがテストで検証される
- `bun test` が通る

---

## T-16: Drizzle マイグレーション生成

- [x] `bunx drizzle-kit generate` を実行してマイグレーションファイルを生成する（`meeting_type` enum 作成、`meetings` テーブル CREATE）

**Acceptance Criteria**:
- `drizzle/` にマイグレーションファイルが生成される
- マイグレーション内容に `meeting_type` enum と `meetings` テーブルの CREATE 文が含まれる
- `bun run build` が通る

---

## T-17: 最終確認 — ビルド・型チェック・テスト

- [x] `bun run build` を実行し、ビルドが成功することを確認する
- [x] `bunx tsc --noEmit` を実行し、型チェックが通ることを確認する
- [x] `bun test` を実行し、全テストが green であることを確認する
- [x] `bun run lint` を実行し、新規追加ファイルに起因する lint エラーがないことを確認する

**Acceptance Criteria**:
- `bun run build` 成功
- `typecheck` green
- `bun test` 全件 green
- `bun run lint` 新規ファイルの errors はゼロ
