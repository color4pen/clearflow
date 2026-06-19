# Tasks: 顧客・引き合い管理基盤

## T-01: schema.ts に inquiryStatusEnum と 3 テーブル（clients, client_contacts, inquiries）を追加する

- [ ] `src/infrastructure/schema.ts` の Enums セクション（L31 付近、`approvalStepStatusEnum` の後）に `inquiryStatusEnum` を追加する: `pgEnum("inquiry_status", ["new", "in_progress", "converted", "declined"])`
- [ ] Auth.js adapter テーブル（L208 `accounts` 定義）の前に `clients` テーブルを追加する。カラム: `id` (uuid PK defaultRandom), `organizationId` (uuid FK to organizations, notNull), `name` (text, notNull), `industry` (text, nullable), `size` (text, nullable), `address` (text, nullable), `notes` (text, nullable), `createdAt` (timestamp, defaultNow, notNull), `updatedAt` (timestamp, defaultNow, notNull)
- [ ] `clients` の直後に `clientContacts` テーブルを追加する。カラム: `id` (uuid PK defaultRandom), `clientId` (uuid FK to clients, notNull), `name` (text, notNull), `department` (text, nullable), `position` (text, nullable), `email` (text, nullable), `phone` (text, nullable), `isPrimary` (boolean, default false, notNull), `createdAt` (timestamp, defaultNow, notNull)
- [ ] `clientContacts` の直後に `inquiries` テーブルを追加する。カラム: `id` (uuid PK defaultRandom), `organizationId` (uuid FK to organizations, notNull), `clientId` (uuid FK to clients, notNull), `contactId` (uuid FK to clientContacts, nullable), `title` (text, notNull), `description` (text, nullable), `source` (text, notNull), `status` (inquiryStatusEnum, notNull, default "new"), `assigneeId` (uuid FK to users, nullable), `requestId` (uuid FK to requests, nullable, onDelete "set null"), `createdAt` (timestamp, defaultNow, notNull), `updatedAt` (timestamp, defaultNow, notNull)

**Acceptance Criteria**:
- `inquiryStatusEnum` が `["new", "in_progress", "converted", "declined"]` で定義されている
- `clients`, `clientContacts`, `inquiries` の 3 テーブルが export されている
- `inquiries.requestId` の FK に `onDelete: "set null"` が設定されている
- `client_contacts` に `organizationId` カラムは存在しない（D8: clientId 経由で委譲）
- テーブル定義は Auth.js adapter テーブルの前に配置されている
- `bun run build` が通る

---

## T-02: schema.ts に Relations 定義を追加する

- [ ] `organizationsRelations`（L248 付近）の `many()` に `clients: many(clients)` と `inquiries: many(inquiries)` を追記する
- [ ] Relations セクションに `clientsRelations` を追加する: `organization` (one → organizations), `contacts` (many → clientContacts), `inquiries` (many → inquiries)
- [ ] Relations セクションに `clientContactsRelations` を追加する: `client` (one → clients)
- [ ] Relations セクションに `inquiriesRelations` を追加する: `organization` (one → organizations), `client` (one → clients), `contact` (one → clientContacts), `assignee` (one → users), `request` (one → requests)
- [ ] `usersRelations` に `inquiries: many(inquiries)` を追記する（assigneeId の逆参照）

**Acceptance Criteria**:
- `organizationsRelations` に `clients` と `inquiries` の `many()` がある
- `clientsRelations`, `clientContactsRelations`, `inquiriesRelations` が export されている
- 全 Relations の fields/references が正しい FK カラムを参照している
- `bun run build` が通る

---

## T-03: ドメインモデル（client.ts, inquiry.ts）を追加する

- [ ] `src/domain/models/client.ts` を作成する。`Client` 型: `{ id, organizationId, name, industry, size, address, notes, createdAt, updatedAt }` — 全フィールド string 型、nullable フィールドは `string | null`、日付は `Date`。`ClientContact` 型: `{ id, clientId, name, department, position, email, phone, isPrimary, createdAt }` — nullable フィールドは `string | null`、`isPrimary` は `boolean`
- [ ] `src/domain/models/inquiry.ts` を作成する。`InquiryStatus` 型: `"new" | "in_progress" | "converted" | "declined"`。`InquirySource` 型: `"web" | "phone" | "referral" | "exhibition" | "other"`。`Inquiry` 型: `{ id, organizationId, clientId, contactId, title, description, source, status, assigneeId, requestId, createdAt, updatedAt }` — nullable フィールドは `string | null`、`status` は `InquiryStatus`、`source` は `InquirySource`。`InquiryWithClient` 型: `Inquiry & { clientName: string }`
- [ ] `src/domain/models/index.ts` に `export type { Client, ClientContact } from "./client"` と `export type { InquiryStatus, InquirySource, Inquiry, InquiryWithClient } from "./inquiry"` を追記する

**Acceptance Criteria**:
- `client.ts` と `inquiry.ts` に ORM / infrastructure への import がない（純粋な type エイリアス）
- `index.ts` の barrel export に `Client`, `ClientContact`, `InquiryStatus`, `InquirySource`, `Inquiry`, `InquiryWithClient` が含まれる
- `bun run build` が通る

---

## T-04: ドメインサービス（inquiryTransition.ts）を追加する

- [ ] `src/domain/services/inquiryTransition.ts` を作成する
- [ ] `InquiryStatus` 型を `../models/inquiry` から import する
- [ ] 遷移マップを定義する: `new → [in_progress, declined]`, `in_progress → [converted, declined]`。`converted` と `declined` は終端状態（マップに含めない）
- [ ] `canTransition(from: InquiryStatus, to: InquiryStatus): boolean` を export する。遷移マップに `from` が存在し、`to` が許可リストに含まれる場合に `true` を返す
- [ ] `src/domain/services/index.ts` に `export { canTransition } from "./inquiryTransition"` を追記する

**Acceptance Criteria**:
- `canTransition("new", "in_progress")` → `true`
- `canTransition("new", "declined")` → `true`
- `canTransition("in_progress", "converted")` → `true`
- `canTransition("in_progress", "declined")` → `true`
- `canTransition("converted", "new")` → `false`
- `canTransition("converted", "in_progress")` → `false`
- `canTransition("declined", "in_progress")` → `false`
- `canTransition("declined", "new")` → `false`
- `canTransition("new", "converted")` → `false`（`new` から直接 `converted` は不可）
- ファイルに `@/infrastructure` への import がない
- `bun run build` が通る

---

## T-05: clientRepository を追加する

- [ ] `src/infrastructure/repositories/clientRepository.ts` を作成する
- [ ] `db`, `Transaction`, `clients`, `clientContacts` を import する。`Client`, `ClientContact` を domain models から import する
- [ ] `mapRow()` 内部関数で `clients.$inferSelect` → `Client` 変換を実装する
- [ ] `mapContactRow()` 内部関数で `clientContacts.$inferSelect` → `ClientContact` 変換を実装する
- [ ] `create(data: { name, organizationId, industry?, size?, address?, notes? }, tx?): Promise<Client>` — `.returning()` で `mapRow` 適用
- [ ] `findById(id, organizationId, tx?): Promise<Client | null>` — `and(eq(id), eq(organizationId))` で条件
- [ ] `findAllByOrganization(organizationId): Promise<Client[]>` — `eq(organizationId)` で絞り込み、`createdAt` 順
- [ ] `update(id, organizationId, data: Partial<{ name, industry, size, address, notes }>, tx?): Promise<Client | null>` — `updatedAt: new Date()` を含めて更新、`.returning()` で返却
- [ ] `createContact(data: { clientId, name, department?, position?, email?, phone?, isPrimary? }, tx?): Promise<ClientContact>` — `.returning()` で `mapContactRow` 適用
- [ ] `findContactsByClientId(clientId, tx?): Promise<ClientContact[]>` — `eq(clientContacts.clientId, clientId)` で絞り込み
- [ ] `src/infrastructure/repositories/index.ts` に `export * as clientRepository from "./clientRepository"` を追記する

**Acceptance Criteria**:
- `create`, `findById`, `findAllByOrganization`, `update` が export されている
- `createContact`, `findContactsByClientId` が export されている
- `findById` と `update` に `organizationId` 条件がある
- `findAllByOrganization` に `organizationId` 条件がある
- 全メソッドにオプション `tx?: Transaction` パラメータがある（findAllByOrganization を除く）
- `index.ts` に `clientRepository` が追加されている
- `bun run build` が通る

---

## T-06: inquiryRepository を追加する

- [ ] `src/infrastructure/repositories/inquiryRepository.ts` を作成する
- [ ] `db`, `Transaction`, `inquiries`, `clients` を import する。`Inquiry`, `InquiryWithClient`, `InquiryStatus` を domain models から import する
- [ ] `mapRow()` 内部関数で `inquiries.$inferSelect` → `Inquiry` 変換を実装する
- [ ] `create(data: { organizationId, clientId, contactId?, title, description?, source, assigneeId? }, tx?): Promise<Inquiry>` — `.returning()` で `mapRow` 適用
- [ ] `findById(id, organizationId, tx?): Promise<Inquiry | null>` — `and(eq(id), eq(organizationId))` で条件
- [ ] `findAllByOrganization(organizationId): Promise<Inquiry[]>` — `eq(organizationId)` で絞り込み、`createdAt` 順
- [ ] `findAllWithClientByOrganization(organizationId): Promise<InquiryWithClient[]>` — `inquiries` と `clients` を `leftJoin` し、`clients.name` を `clientName` として含む。`eq(inquiries.organizationId)` で条件
- [ ] `update(id, organizationId, data: Partial<{ title, description, source, contactId, assigneeId }>, tx?): Promise<Inquiry | null>` — `updatedAt: new Date()` を含めて更新
- [ ] `updateStatus(id, organizationId, status: InquiryStatus, requestId: string | null, tx?): Promise<Inquiry | null>` — `status` と `requestId` と `updatedAt` を更新。`and(eq(id), eq(organizationId))` で条件。`.returning()` で返却
- [ ] `src/infrastructure/repositories/index.ts` に `export * as inquiryRepository from "./inquiryRepository"` を追記する

**Acceptance Criteria**:
- `create`, `findById`, `findAllByOrganization`, `findAllWithClientByOrganization`, `update`, `updateStatus` が export されている
- 全クエリ関数に `organizationId` 条件がある
- `findAllWithClientByOrganization` が `clients` と JOIN して `clientName` を返す
- `updateStatus` が `requestId` も同時に更新できる
- `index.ts` に `inquiryRepository` が追加されている
- `bun run build` が通る

---

## T-07: createClient usecase を追加する

- [ ] `src/application/usecases/createClient.ts` を作成する
- [ ] `CreateClientResult` 型を定義する: `{ ok: true; client: Client } | { ok: false; reason: string }`
- [ ] `createClient(data: { name, organizationId, actorId, industry?, size?, address?, notes?, contacts?: Array<{ name, department?, position?, email?, phone?, isPrimary? }> }): Promise<CreateClientResult>` を export する
- [ ] `db.transaction()` 内で `clientRepository.create()` を実行する
- [ ] `contacts` 配列が提供された場合、同一トランザクション内で `clientRepository.createContact()` を各担当者に対して呼び出す
- [ ] 同一トランザクション内で `auditLogRepository.create()` を呼び出す（action: `client.create`, targetType: `client`, targetId: 新顧客ID）
- [ ] エラーハンドリング: try/catch で `{ ok: false, reason }` を返す
- [ ] `src/application/usecases/index.ts` に `export { createClient } from "./createClient"` を追記する

**Acceptance Criteria**:
- トランザクション内で顧客作成 + 担当者作成（任意）+ 監査ログ記録が行われる
- contacts が空配列または未指定の場合でも正常に動作する
- index.ts に re-export がある
- `bun run build` が通る

---

## T-08: createInquiry usecase を追加する

- [ ] `src/application/usecases/createInquiry.ts` を作成する
- [ ] `CreateInquiryResult` 型を定義する: `{ ok: true; inquiry: Inquiry } | { ok: false; reason: string }`
- [ ] `createInquiry(data: { organizationId, actorId, clientId, contactId?, title, description?, source, assigneeId? }): Promise<CreateInquiryResult>` を export する
- [ ] `clientRepository.findById(clientId, organizationId)` で顧客の存在を確認する。見つからなければ `{ ok: false, reason: "顧客が見つかりません" }` を返す
- [ ] `db.transaction()` 内で `inquiryRepository.create()` + `auditLogRepository.create()`（action: `inquiry.create`, targetType: `inquiry`）を実行する
- [ ] `src/application/usecases/index.ts` に re-export を追記する

**Acceptance Criteria**:
- 存在しない clientId が渡された場合にエラーを返す
- トランザクション内で引き合い作成 + 監査ログ記録が行われる
- index.ts に re-export がある
- `bun run build` が通る

---

## T-09: updateInquiryStatus usecase を追加する

- [ ] `src/application/usecases/updateInquiryStatus.ts` を作成する
- [ ] `UpdateInquiryStatusResult` 型を定義する: `{ ok: true; inquiry: Inquiry } | { ok: false; reason: string }`
- [ ] `updateInquiryStatus(data: { inquiryId, organizationId, actorId, newStatus: InquiryStatus, templateId?: string }): Promise<UpdateInquiryStatusResult>` を export する
- [ ] `inquiryRepository.findById()` で引き合いを取得。見つからなければエラー
- [ ] `canTransition(currentStatus, newStatus)` で遷移バリデーション。不可なら `{ ok: false, reason }` を返す
- [ ] `converted` 遷移時の処理:
  - `templateId` が未指定なら `{ ok: false, reason: "商談化にはテンプレートの指定が必要です" }` を返す
  - `approvalTemplateRepository.findById(templateId, organizationId)` でテンプレートを取得。見つからなければエラー
  - `filterStepsByCondition()` でテンプレートのステップをフィルタリングする（formData は空オブジェクト `{}` を渡す — 引き合いには formData がないため）
  - `db.transaction()` 内で:
    1. `requestRepository.create()` で承認リクエストを作成する（title: `"商談化承認: " + inquiry.title`, formData: `{}`, templateId, organizationId, creatorId: actorId）
    2. `approvalStepRepository.createMany()` でフィルタ済みステップから承認ステップを生成する
    3. `inquiryRepository.updateStatus()` で引き合いのステータスと `requestId` を更新する
    4. `auditLogRepository.create()` で監査ログを記録する（action: `inquiry.updateStatus`, metadata: `{ fromStatus, toStatus, requestId }`）
    5. `auditLogRepository.create()` で Request 作成の監査ログも記録する（action: `request.create`, targetType: `request`, targetId: newRequestId, metadata: `{ templateId, templateName, inquiryId }`）
- [ ] `converted` 以外の遷移時: `db.transaction()` 内で `inquiryRepository.updateStatus(id, organizationId, newStatus, null, tx)` + `auditLogRepository.create()`（metadata: `{ fromStatus, toStatus }`）を実行する
- [ ] `src/application/usecases/index.ts` に re-export を追記する

**Acceptance Criteria**:
- 遷移ルール違反時にエラーを返す
- `converted` 遷移時にテンプレート未指定でエラーを返す
- `converted` 遷移時に承認リクエスト + 承認ステップが作成され、`inquiries.requestId` に紐づく
- 全操作が単一トランザクション内で完了する
- 監査ログに `fromStatus` と `toStatus` が含まれる
- index.ts に re-export がある
- `bun run build` が通る

---

## T-10: listClients / listInquiries usecase を追加する

- [ ] `src/application/usecases/listClients.ts` を作成する。`listClients(organizationId): Promise<Client[]>` — `clientRepository.findAllByOrganization()` を呼び出す
- [ ] `src/application/usecases/listInquiries.ts` を作成する。`listInquiries(organizationId): Promise<InquiryWithClient[]>` — `inquiryRepository.findAllWithClientByOrganization()` を呼び出す
- [ ] `src/application/usecases/index.ts` に両方を re-export する

**Acceptance Criteria**:
- `listClients` が `Client[]` を返す
- `listInquiries` が `InquiryWithClient[]`（顧客名を含む）を返す
- index.ts に re-export がある
- `bun run build` が通る

---

## T-11: Server Actions（clients.ts, inquiries.ts）を追加する

- [ ] `src/app/actions/clients.ts` を作成する。`"use server"` 宣言
- [ ] `createClientAction(prevState, formData): Promise<CreateClientState>` を実装する:
  - `auth()` で認証チェック
  - `checkRateLimit()` でレート制限（`createClient:${session.user.id}`、既存の `RATE_LIMITS` に `clientManage: { limit: 10, windowMs: 60_000 }` を追加するか、既存の `createRequest` と同じ上限を流用する）
  - Zod バリデーション: `name` は必須 1 文字以上、`industry`, `size`, `address`, `notes` は optional、`contacts` は配列（各要素: `name` 必須、`department`, `position`, `email`, `phone` optional、`isPrimary` boolean）
  - `createClient` usecase を呼び出す
  - `revalidatePath("/clients")`
- [ ] `listClientsAction()` を実装する: 認証チェック → `listClients(organizationId)` を呼び出す
- [ ] `src/app/actions/inquiries.ts` を作成する。`"use server"` 宣言
- [ ] `createInquiryAction(prevState, formData): Promise<CreateInquiryState>` を実装する:
  - `auth()` で認証チェック
  - `checkRateLimit()` でレート制限
  - Zod バリデーション: `clientId` UUID 必須、`contactId` UUID optional、`title` 必須 1 文字以上、`description` optional、`source` は `"web" | "phone" | "referral" | "exhibition" | "other"` の enum、`assigneeId` UUID optional
  - `createInquiry` usecase を呼び出す
  - `revalidatePath("/inquiries")`
- [ ] `updateInquiryStatusAction(inquiryId, formData): Promise<ActionResult>` を実装する:
  - `auth()` で認証チェック
  - formData から `newStatus` と `templateId`（optional）を取得
  - `newStatus === "converted"` の場合、`session.user.role` が `admin` または `manager` でなければ `{ success: false, message: "権限がありません" }` を返す
  - `updateInquiryStatus` usecase を呼び出す
  - `revalidatePath("/inquiries")` + `revalidatePath("/inquiries/${inquiryId}")`
- [ ] `listInquiriesAction()` を実装する: 認証チェック → `listInquiries(organizationId)` を呼び出す

**Acceptance Criteria**:
- 全アクションに認証チェックがある
- `createClientAction` と `createInquiryAction` に Zod バリデーションがある
- `updateInquiryStatusAction` で `converted` 時に `admin`/`manager` ロールチェックがある
- organizationId はセッションから取得している
- `bun run build` が通る

---

## T-12: UI — 顧客一覧ページ（/clients）

- [ ] `src/app/(dashboard)/clients/page.tsx` を作成する（Server Component）
- [ ] `auth()` でセッションを取得する
- [ ] `listClients(organizationId)` と `clientRepository.findContactsByClientId` で顧客一覧と担当者数を取得する（または `listClientsAction` 経由）
- [ ] `PageToolbar` で「顧客管理」タイトルと「新規登録」リンク（`/clients/new`）を表示する
- [ ] テーブルで企業名・業種・担当者数・作成日を表示する。各行は `/clients/[id]` へのリンクとする
- [ ] 顧客が 0 件の場合は空状態メッセージを表示する

**Acceptance Criteria**:
- `/clients` にアクセスすると顧客一覧が表示される
- 各顧客行がクリック可能で詳細ページへ遷移する
- 「新規登録」リンクが `/clients/new` を指す
- `bun run build` が通る

---

## T-13: UI — 顧客登録ページ（/clients/new）

- [ ] `src/app/(dashboard)/clients/new/page.tsx` を作成する（Server Component）
- [ ] 顧客登録フォームコンポーネント（Client Component）を配置する
- [ ] `src/app/(dashboard)/clients/new/ClientForm.tsx` を作成する（`"use client"`）
- [ ] フォームフィールド: name（必須）、industry（任意）、size（任意）、address（任意）、notes（任意）
- [ ] 担当者セクション: 担当者の動的追加・削除 UI。各担当者に name（必須）、department、position、email、phone、isPrimary（チェックボックス）。「担当者を追加」ボタンで行を追加
- [ ] フォーム送信時に `createClientAction` を呼び出す。`useActionState` で状態管理
- [ ] 成功時に `/clients` へ遷移する

**Acceptance Criteria**:
- `/clients/new` に顧客登録フォームが表示される
- 担当者の動的追加・削除ができる
- フォーム送信で `createClientAction` が呼ばれる
- バリデーションエラー時にメッセージが表示される
- `bun run build` が通る

---

## T-14: UI — 顧客詳細ページ（/clients/[id]）

- [ ] `src/app/(dashboard)/clients/[id]/page.tsx` を作成する（Server Component）
- [ ] `auth()` でセッションを取得し、`clientRepository.findById(id, organizationId)` で顧客を取得する。見つからない場合は `notFound()` を返す
- [ ] `clientRepository.findContactsByClientId(id)` で担当者一覧を取得する
- [ ] `inquiryRepository.findAllByOrganization(organizationId)` から当該顧客の引き合いをフィルタする（または専用クエリ `findByClientId` を追加する）
- [ ] `SectionCard` で企業情報（名前、業種、規模、所在地、備考）を表示する
- [ ] 担当者一覧をテーブルで表示する（名前、部署、役職、メール、電話、主担当者フラグ）
- [ ] 関連する引き合い一覧をテーブルで表示する（件名、ステータス、流入経路、作成日）。各行は `/inquiries/[id]` へのリンク

**Acceptance Criteria**:
- `/clients/:id` にアクセスすると顧客詳細が表示される
- 企業情報、担当者一覧、関連引き合い一覧が表示される
- 存在しない顧客 ID の場合 404 が表示される
- `bun run build` が通る

---

## T-15: UI — 引き合い一覧ページ（/inquiries）

- [ ] `src/app/(dashboard)/inquiries/page.tsx` を作成する（Server Component）
- [ ] `auth()` でセッションを取得する
- [ ] `listInquiries(organizationId)` で引き合い一覧（顧客名付き）を取得する
- [ ] `PageToolbar` で「引き合い管理」タイトルと「新規登録」リンク（`/inquiries/new`）を表示する
- [ ] ステータスごとの件数サマリーを表示する（`new`, `in_progress`, `converted`, `declined`）
- [ ] テーブルでステータス・顧客名・件名・流入経路・担当者・作成日を表示する。各行は `/inquiries/[id]` へのリンク
- [ ] ステータスフィルタ: 全て / 新規 / 対応中 / 商談化済 / 見送りのフィルタリンク（URL パラメータ `?status=xxx` またはクライアントサイドフィルタ）
- [ ] 引き合いが 0 件の場合は空状態メッセージを表示する

**Acceptance Criteria**:
- `/inquiries` にアクセスすると引き合い一覧が表示される
- ステータスによるフィルタリングが機能する
- 各引き合い行がクリック可能で詳細ページへ遷移する
- `bun run build` が通る

---

## T-16: UI — 引き合い登録ページ（/inquiries/new）

- [ ] `src/app/(dashboard)/inquiries/new/page.tsx` を作成する（Server Component）
- [ ] `listClients(organizationId)` で顧客一覧を取得し、Client Component に渡す
- [ ] `src/app/(dashboard)/inquiries/new/InquiryForm.tsx` を作成する（`"use client"`）
- [ ] フォームフィールド: clientId（顧客選択ドロップダウン）、contactId（担当者選択ドロップダウン — 選択された顧客に応じて動的更新）、title（必須）、description（任意）、source（ドロップダウン: web / phone / referral / exhibition / other）
- [ ] 顧客を選択すると、その顧客の担当者一覧が contactId ドロップダウンに表示される（初期状態は空）
- [ ] フォーム送信時に `createInquiryAction` を呼び出す
- [ ] 成功時に `/inquiries` へ遷移する

**Acceptance Criteria**:
- `/inquiries/new` に引き合い登録フォームが表示される
- 顧客選択に応じて担当者ドロップダウンが更新される
- フォーム送信で `createInquiryAction` が呼ばれる
- `bun run build` が通る

---

## T-17: UI — 引き合い詳細ページ（/inquiries/[id]）

- [ ] `src/app/(dashboard)/inquiries/[id]/page.tsx` を作成する（Server Component）
- [ ] `auth()` でセッションを取得し、`inquiryRepository.findById(id, organizationId)` で引き合いを取得する。見つからない場合は `notFound()`
- [ ] `clientRepository.findById(inquiry.clientId, organizationId)` で顧客情報を取得する
- [ ] 引き合いの詳細情報を表示する（件名、概要、流入経路、ステータス、顧客名、担当者、作成日、更新日）
- [ ] ステータス変更ボタンを配置する:
  - `new` 状態: 「対応開始」（→ in_progress）、「見送り」（→ declined）
  - `in_progress` 状態: 「商談化」（→ converted）、「見送り」（→ declined）
  - `converted` / `declined` 状態: ボタンなし（終端状態）
- [ ] 「商談化」ボタン押下時にテンプレート選択モーダルまたはフォームを表示する。テンプレート一覧を `approvalTemplateRepository.findByOrganization()` で取得する
- [ ] ステータス変更時に `updateInquiryStatusAction` を呼び出す
- [ ] `inquiry.requestId` が存在する場合、承認リクエストへのリンク（`/requests/${requestId}`）を表示する

**Acceptance Criteria**:
- `/inquiries/:id` にアクセスすると引き合い詳細が表示される
- ステータスに応じた変更ボタンが表示される
- 商談化時にテンプレート選択 UI が表示される
- 承認リクエストが紐づいている場合にリンクが表示される
- 存在しない引き合い ID の場合 404 が表示される
- `bun run build` が通る

---

## T-18: ダッシュボードヘッダーにナビゲーションを追加する

- [ ] `src/app/(dashboard)/layout.tsx` のヘッダーナビ（L25-47 付近）に「顧客」（`/clients`）と「引き合い」（`/inquiries`）のリンクを追加する
- [ ] これらのリンクは `isAdmin` 条件なしで全ロールに表示する
- [ ] 「申請一覧」の直後に配置する。スタイルは「申請一覧」と同じ `text-text-on-dark-secondary hover:text-white text-sm` を使用する

**Acceptance Criteria**:
- ダッシュボードヘッダーに「顧客」と「引き合い」のリンクが表示される
- 全ロール（admin, member, manager, finance）で表示される
- リンク先が `/clients` と `/inquiries` である
- `bun run build` が通る

---

## T-19: シードデータを追加する

- [ ] `src/infrastructure/seed.ts` に `clients`, `clientContacts`, `inquiries` の import を追加する
- [ ] テーブル truncation 順序に `inquiries` → `clientContacts` → `clients` を追加する（FK 安全順: inquiries は clients を参照するため先に削除）。位置は `requests` の前が適切
- [ ] 顧客 2 社を作成する: 「株式会社テック商事」（IT業、中堅）と「大和建設株式会社」（建設業、大手）
- [ ] 各顧客に担当者 2 名を作成する（計 4 名）。1 名は `isPrimary: true`
- [ ] 引き合い 3 件を作成する:
  - 1 件目: `status: "new"`, source: "web", 株式会社テック商事の引き合い
  - 2 件目: `status: "in_progress"`, source: "phone", 大和建設株式会社の引き合い, assigneeId あり
  - 3 件目: `status: "converted"`, source: "referral", 株式会社テック商事の引き合い, 承認リクエストに紐づける（既存シードの requests のうち 1 件を使用するか、新規に作成する）

**Acceptance Criteria**:
- シード実行後に顧客 2 社、担当者 4 名、引き合い 3 件が作成される
- `converted` の引き合いに `requestId` が設定されている
- truncation 順序が FK 制約に違反しない
- `bun run build` が通る

---

## T-20: テスト — ドメインモデルと inquiryTransition の検証

- [ ] `src/__tests__/static/projectStructure.test.ts` の「Domain model integrity」セクション（TC-031）のモデルファイル一覧に `"domain/models/client.ts"` と `"domain/models/inquiry.ts"` を追加する
- [ ] 同テストの TC-034（domain 層に infrastructure import がない）のファイル一覧に `"domain/models/client.ts"`, `"domain/models/inquiry.ts"`, `"domain/services/inquiryTransition.ts"` を追加する
- [ ] `src/__tests__/domain/inquiryTransition.test.ts` を作成する:
  - テスト: `canTransition("new", "in_progress")` → `true`
  - テスト: `canTransition("new", "declined")` → `true`
  - テスト: `canTransition("in_progress", "converted")` → `true`
  - テスト: `canTransition("in_progress", "declined")` → `true`
  - テスト: `canTransition("converted", "new")` → `false`
  - テスト: `canTransition("converted", "in_progress")` → `false`
  - テスト: `canTransition("declined", "in_progress")` → `false`
  - テスト: `canTransition("declined", "new")` → `false`
  - テスト: `canTransition("new", "converted")` → `false`

**Acceptance Criteria**:
- `projectStructure.test.ts` のモデルファイル一覧に新規ファイルが含まれている
- 状態遷移テストが全パターンをカバーしている
- `bun test` が全件 green

---

## T-21: テスト — テナント分離と usecase の検証

- [ ] `src/__tests__/static/projectStructure.test.ts` に「Tenant isolation — client/inquiry」セクションを追加する:
  - テスト: `clientRepository.ts` の `create`, `findById`, `findAllByOrganization`, `update` に `organizationId` が含まれる
  - テスト: `inquiryRepository.ts` の `create`, `findById`, `findAllByOrganization`, `findAllWithClientByOrganization`, `update`, `updateStatus` に `organizationId` が含まれる
  - テスト: `src/app/actions/clients.ts` が `session.user.organizationId` を使用している
  - テスト: `src/app/actions/inquiries.ts` が `session.user.organizationId` を使用している
- [ ] `src/__tests__/usecases/inquiryManagement.test.ts` を作成する:
  - テスト: `updateInquiryStatus.ts` のソースに `canTransition` の呼び出しが含まれることを静的解析で確認する
  - テスト: `updateInquiryStatus.ts` のソースに `auditLogRepository.create` の呼び出しが含まれることを確認する
  - テスト: `updateInquiryStatus.ts` のソースに `requestRepository.create` の呼び出しが含まれる（converted 時の承認リクエスト作成）ことを確認する
  - テスト: `createInquiry.ts` のソースに `auditLogRepository.create` の呼び出しが含まれることを確認する
  - テスト: `createClient.ts` のソースに `auditLogRepository.create` の呼び出しが含まれることを確認する
  - テスト: `updateInquiryStatusAction` のソースに converted 時のロールチェック（`role !== "admin"` と `role !== "manager"` または同等の条件）が含まれることを確認する

**Acceptance Criteria**:
- 新規 repository メソッドの organizationId 条件がテストで検証される
- Server Actions が organizationId をセッションから取得していることがテストで検証される
- usecase の監査ログ記録・遷移チェック・承認リクエスト作成がテストで検証される
- `bun test` が全件 green

---

## T-22: Drizzle マイグレーション生成

- [ ] `bunx drizzle-kit generate` を実行してマイグレーションファイルを生成する
- [ ] 生成されたマイグレーションを確認し、`inquiry_status` enum、`clients`、`client_contacts`、`inquiries` テーブルの CREATE 文が含まれることを確認する

**Acceptance Criteria**:
- `drizzle/` にマイグレーションファイルが生成されている
- マイグレーションの内容が T-01 のスキーマ定義と一致する
- `bun run build` が通る

---

## T-23: 最終確認 — ビルド・型チェック・テスト

- [ ] `bun run build` を実行し、ビルドが成功することを確認する
- [ ] `bunx tsc --noEmit` を実行し、型チェックが通ることを確認する
- [ ] `bun test` を実行し、全テストが green であることを確認する
- [ ] `bun run lint` を実行し、lint エラーがないことを確認する

**Acceptance Criteria**:
- `bun run build` 成功
- `typecheck` green
- `bun test` 全件 green
- `bun run lint` エラーなし
