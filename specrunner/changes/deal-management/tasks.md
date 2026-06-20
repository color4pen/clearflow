# Tasks: 案件管理と見積承認フロー連携

## T-01: schema.ts に dealPhaseEnum と deals テーブルを追加する

- [ ] `src/infrastructure/schema.ts` の `meetingTypeEnum`（L42-48）の直後に `dealPhaseEnum` を追加する: `pgEnum("deal_phase", ["proposal_prep", "proposed", "negotiation", "internal_approval", "won", "lost"])`
- [ ] `meetings` テーブル（L274-296）の直後、Auth.js adapter テーブルの前に `deals` テーブルを追加する。カラム:
  - `id` (uuid PK defaultRandom)
  - `organizationId` (uuid FK to organizations, notNull)
  - `inquiryId` (uuid FK to inquiries, notNull)
  - `title` (text, notNull)
  - `phase` (dealPhaseEnum, notNull, default "proposal_prep")
  - `estimatedAmount` (integer, nullable)
  - `estimatedStartDate` (timestamp, nullable)
  - `estimatedEndDate` (timestamp, nullable)
  - `contractType` (text, nullable) — ドメインモデルで型制約（D6）
  - `assigneeId` (uuid FK to users, nullable) — 営業担当
  - `technicalLeadId` (uuid FK to users, nullable) — 技術担当
  - `estimateRequestId` (uuid FK to requests, nullable, onDelete "set null") — 見積承認リクエスト
  - `notes` (text, nullable)
  - `createdAt` (timestamp, defaultNow, notNull)
  - `updatedAt` (timestamp, defaultNow, notNull)
  - `version` (integer, default 1, notNull) — 楽観ロック（D10）

**Acceptance Criteria**:
- `dealPhaseEnum` が `["proposal_prep", "proposed", "negotiation", "internal_approval", "won", "lost"]` で定義されている
- `deals` テーブルが export されている
- `deals.estimateRequestId` の FK に `onDelete: "set null"` が設定されている
- テーブル定義は Auth.js adapter テーブルの前に配置されている
- `bun run build` が通る

---

## T-02: schema.ts に deals の Relations 定義を追加する

- [ ] ファイル末尾に `dealsRelations` を追加する: `organization` (one → organizations), `inquiry` (one → inquiries), `assignee` (one → users, relationName: "dealsAsAssignee"), `technicalLead` (one → users, relationName: "dealsAsTechnicalLead"), `estimateRequest` (one → requests)
- [ ] `organizationsRelations`（L338-350）の `many()` に `deals: many(deals)` を追記する
- [ ] `usersRelations`（L359-372）に `dealsAsAssignee: many(deals, { relationName: "dealsAsAssignee" })` と `dealsAsTechnicalLead: many(deals, { relationName: "dealsAsTechnicalLead" })` の 2 つの `many()` を追記する
- [ ] `inquiriesRelations`（L497-519）に `deals: many(deals)` を追記する

**Acceptance Criteria**:
- `dealsRelations` が export されている
- `organizationsRelations` に `deals` の `many()` がある
- `usersRelations` に `dealsAsAssignee` と `dealsAsTechnicalLead` の 2 つの `many()` がある（`relationName` 付き）
- `inquiriesRelations` に `deals` の `many()` がある
- 全 Relations の fields/references が正しい FK カラムを参照している
- `bun run build` が通る

---

## T-03: ドメインモデル（deal.ts）を追加する

- [ ] `src/domain/models/deal.ts` を作成する
- [ ] `DealPhase` 型を定義する: `"proposal_prep" | "proposed" | "negotiation" | "internal_approval" | "won" | "lost"`
- [ ] `ContractType` 型を定義する: `"quasi_delegation" | "contract" | "ses"`
- [ ] `Deal` 型を定義する: `{ id, organizationId, inquiryId, title, phase, estimatedAmount, estimatedStartDate, estimatedEndDate, contractType, assigneeId, technicalLeadId, estimateRequestId, notes, createdAt, updatedAt, version }` — nullable フィールドは `型 | null`、日付は `Date`、`version` は `number`、`contractType` は `ContractType | null`
- [ ] `DealWithInquiry` 型を定義する: `Deal & { inquiryTitle: string; clientName: string }`
- [ ] `src/domain/models/index.ts` に `export type { DealPhase, ContractType, Deal, DealWithInquiry } from "./deal"` を追記する

**Acceptance Criteria**:
- `deal.ts` に ORM / infrastructure への import がない（純粋な type エイリアス）
- `index.ts` の barrel export に `DealPhase`, `ContractType`, `Deal`, `DealWithInquiry` が含まれる
- `bun run build` が通る

---

## T-04: ドメインサービス（dealTransition.ts）を追加する

- [ ] `src/domain/services/dealTransition.ts` を作成する
- [ ] `DealPhase` 型を `../models/deal` から import する
- [ ] 遷移マップを定義する: `proposal_prep → [proposed, lost]`, `proposed → [negotiation, lost]`, `negotiation → [internal_approval, lost]`, `internal_approval → [won, lost]`。`won` と `lost` は終端状態（マップに含めない）
- [ ] `canTransition(from: DealPhase, to: DealPhase): boolean` を export する。遷移マップに `from` が存在し、`to` が許可リストに含まれる場合に `true` を返す
- [ ] `src/domain/services/index.ts` に export を追記する。`inquiryTransition.ts` の `canTransition` と名前が衝突するため、名前付き export で区別する: `export { canTransition as canDealTransition } from "./dealTransition"`

**Acceptance Criteria**:
- `canTransition("proposal_prep", "proposed")` → `true`
- `canTransition("proposal_prep", "lost")` → `true`
- `canTransition("proposed", "negotiation")` → `true`
- `canTransition("proposed", "lost")` → `true`
- `canTransition("negotiation", "internal_approval")` → `true`
- `canTransition("negotiation", "lost")` → `true`
- `canTransition("internal_approval", "won")` → `true`
- `canTransition("internal_approval", "lost")` → `true`
- `canTransition("won", "proposal_prep")` → `false`
- `canTransition("won", "lost")` → `false`（won は終端状態）
- `canTransition("lost", "negotiation")` → `false`
- `canTransition("lost", "proposal_prep")` → `false`
- `canTransition("proposal_prep", "negotiation")` → `false`（飛び越し禁止）
- `canTransition("proposal_prep", "internal_approval")` → `false`
- ファイルに `@/infrastructure` への import がない
- `bun run build` が通る

---

## T-05: dealRepository を追加する

- [ ] `src/infrastructure/repositories/dealRepository.ts` を作成する
- [ ] `db`, `Transaction`, `deals`, `inquiries`, `clients` を import する。`Deal`, `DealWithInquiry`, `DealPhase`, `ContractType` を domain models から import する
- [ ] `mapRow()` 内部関数で `deals.$inferSelect` → `Deal` 変換を実装する。`contractType` は `as ContractType | null` でキャスト
- [ ] `create(data: { organizationId, inquiryId, title, estimatedAmount?, estimatedStartDate?, estimatedEndDate?, contractType?, assigneeId?, technicalLeadId?, notes? }, tx?): Promise<Deal>` — `.returning()` で `mapRow` 適用
- [ ] `findById(id, organizationId, tx?): Promise<Deal | null>` — `and(eq(id), eq(organizationId))` で条件
- [ ] `findAllByOrganization(organizationId): Promise<DealWithInquiry[]>` — `deals` と `inquiries` を JOIN し、さらに `clients` を JOIN して `inquiryTitle` と `clientName` を取得。`eq(deals.organizationId)` で条件。`createdAt` 順
- [ ] `findByInquiryId(inquiryId, organizationId, tx?): Promise<Deal | null>` — `and(eq(inquiryId), eq(organizationId))` で条件。1:1 制約チェックに使用
- [ ] `update(id, organizationId, data: Partial<{ title, estimatedAmount, estimatedStartDate, estimatedEndDate, contractType, assigneeId, technicalLeadId, notes }>, tx?): Promise<Deal | null>` — `updatedAt: new Date()` を含めて更新。`.returning()` で返却
- [ ] `updatePhase(id, organizationId, phase: DealPhase, estimateRequestId: string | null, currentVersion: number, tx?): Promise<Deal | null>` — 楽観ロック付き。`phase`, `estimateRequestId`, `updatedAt`, `version: sql\`version + 1\`` を更新。`and(eq(id), eq(organizationId), eq(version, currentVersion))` で条件。`.returning()` で返却
- [ ] `src/infrastructure/repositories/index.ts` に `export * as dealRepository from "./dealRepository"` を追記する

**Acceptance Criteria**:
- `create`, `findById`, `findAllByOrganization`, `findByInquiryId`, `update`, `updatePhase` が export されている
- `findById`, `findByInquiryId`, `update`, `updatePhase` に `organizationId` 条件がある
- `findAllByOrganization` に `organizationId` 条件があり、`inquiries` と `clients` を JOIN して `DealWithInquiry` を返す
- `updatePhase` に楽観ロック（`version` 条件）がある
- 全メソッドにオプション `tx?: Transaction` パラメータがある（`findAllByOrganization` を除く）
- `index.ts` に `dealRepository` が追加されている
- `bun run build` が通る

---

## T-06: createDeal usecase を追加する

- [ ] `src/application/usecases/createDeal.ts` を作成する
- [ ] `CreateDealResult` 型を定義する: `{ ok: true; deal: Deal } | { ok: false; reason: string }`
- [ ] `createDeal(data: { organizationId, actorId, inquiryId, title, estimatedAmount?, estimatedStartDate?, estimatedEndDate?, contractType?, assigneeId?, technicalLeadId?, notes? }): Promise<CreateDealResult>` を export する
- [ ] `inquiryRepository.findById(inquiryId, organizationId)` で引き合いの存在を確認する。見つからなければ `{ ok: false, reason: "引き合いが見つかりません" }`
- [ ] `inquiry.status !== "converted"` の場合は `{ ok: false, reason: "商談化済みの引き合いにのみ案件を作成できます" }`
- [ ] `dealRepository.findByInquiryId(inquiryId, organizationId)` で重複チェック。既に案件がある場合は `{ ok: false, reason: "この引き合いにはすでに案件が存在します" }`
- [ ] `db.transaction()` 内で `dealRepository.create()` + `auditLogRepository.create()`（action: `deal.create`, targetType: `deal`, targetId: 新案件ID）を実行する
- [ ] `src/application/usecases/index.ts` に `export { createDeal } from "./createDeal"` を追記する

**Acceptance Criteria**:
- 引き合いが存在しない場合にエラーを返す
- 引き合いのステータスが `converted` でない場合にエラーを返す
- 同一引き合いに対して重複作成しようとした場合にエラーを返す
- トランザクション内で案件作成 + 監査ログ記録が行われる
- index.ts に re-export がある
- `bun run build` が通る

---

## T-07: listDeals / getDeal usecase を追加する

- [ ] `src/application/usecases/listDeals.ts` を作成する。`listDeals(organizationId): Promise<DealWithInquiry[]>` — `dealRepository.findAllByOrganization()` を呼び出す
- [ ] `src/application/usecases/getDeal.ts` を作成する。`getDeal(id, organizationId): Promise<Deal | null>` — `dealRepository.findById()` を呼び出す
- [ ] `src/application/usecases/index.ts` に両方を re-export する

**Acceptance Criteria**:
- `listDeals` が `DealWithInquiry[]` を返す
- `getDeal` が `Deal | null` を返す
- index.ts に re-export がある
- `bun run build` が通る

---

## T-08: updateDealPhase usecase を追加する

- [ ] `src/application/usecases/updateDealPhase.ts` を作成する
- [ ] `UpdateDealPhaseResult` 型を定義する: `{ ok: true; deal: Deal } | { ok: false; reason: string }`
- [ ] `updateDealPhase(data: { dealId, organizationId, actorId, newPhase: DealPhase, templateId?: string }): Promise<UpdateDealPhaseResult>` を export する
- [ ] `dealRepository.findById()` で案件を取得。見つからなければエラー
- [ ] `canDealTransition(currentPhase, newPhase)` で遷移バリデーション。不可なら `{ ok: false, reason }` を返す
- [ ] `internal_approval` 遷移時の処理（`updateInquiryStatus.ts` L36-132 のパターンを踏襲）:
  - `templateId` が未指定なら `{ ok: false, reason: "内示フェーズへの遷移にはテンプレートの指定が必要です" }` を返す
  - `approvalTemplateRepository.findById(templateId, organizationId)` でテンプレートを取得。見つからなければエラー
  - `filterStepsByCondition()` でテンプレートのステップをフィルタリングする。フォームデータとして `{ amount: { value: deal.estimatedAmount, label: "想定金額" } }` を渡す
  - `db.transaction()` 内で:
    1. `requestRepository.create()` で見積承認リクエストを作成する（title: `"見積承認: " + deal.title`, formData: `{ amount: { value: deal.estimatedAmount, label: "想定金額" } }`, templateId, organizationId, creatorId: actorId）
    2. `approvalStepRepository.createMany()` でフィルタ済みステップから承認ステップを生成する（期限計算: `new Date(now.getTime() + s.deadlineHours * 60 * 60 * 1000)`）
    3. `dealRepository.updatePhase()` で案件のフェーズと `estimateRequestId` を更新する（楽観ロック付き）
    4. `auditLogRepository.create()` でフェーズ変更の監査ログを記録する（action: `deal.updatePhase`, targetType: `deal`, metadata: `{ fromPhase, toPhase, requestId }`）
    5. `auditLogRepository.create()` で Request 作成の監査ログも記録する（action: `request.create`, targetType: `request`, targetId: newRequestId, metadata: `{ templateId, templateName, dealId }`）
- [ ] `internal_approval` 以外の遷移時: `db.transaction()` 内で `dealRepository.updatePhase(id, organizationId, newPhase, null, deal.version, tx)` + `auditLogRepository.create()`（metadata: `{ fromPhase, toPhase }`）を実行する
- [ ] 楽観ロック失敗時（`updatePhase` が null を返した場合）: `{ ok: false, reason: "この案件は他のユーザーによって更新されました" }` を返す
- [ ] `src/application/usecases/index.ts` に re-export を追記する

**Acceptance Criteria**:
- 遷移ルール違反時にエラーを返す
- `internal_approval` 遷移時にテンプレート未指定でエラーを返す
- `internal_approval` 遷移時に見積承認リクエスト + 承認ステップが作成され、`deals.estimateRequestId` に紐づく
- 承認リクエストのタイトルが `"見積承認: ${deal.title}"` である
- フォームデータに `{ amount: { value: deal.estimatedAmount, label: "想定金額" } }` が含まれる
- 全操作が単一トランザクション内で完了する
- 監査ログに `fromPhase` と `toPhase` が含まれる
- 楽観ロック失敗時にエラーを返す
- index.ts に re-export がある
- `bun run build` が通る

---

## T-09: updateDeal usecase を追加する

- [ ] `src/application/usecases/updateDeal.ts` を作成する
- [ ] `UpdateDealResult` 型を定義する: `{ ok: true; deal: Deal } | { ok: false; reason: string }`
- [ ] `updateDeal(data: { dealId, organizationId, actorId, title?, estimatedAmount?, estimatedStartDate?, estimatedEndDate?, contractType?, assigneeId?, technicalLeadId?, notes? }): Promise<UpdateDealResult>` を export する
- [ ] `dealRepository.findById()` で案件を取得。見つからなければエラー
- [ ] `db.transaction()` 内で `dealRepository.update()` + `auditLogRepository.create()`（action: `deal.update`, targetType: `deal`, targetId: dealId）を実行する
- [ ] `src/application/usecases/index.ts` に re-export を追記する

**Acceptance Criteria**:
- 案件が存在しない場合にエラーを返す
- トランザクション内で案件更新 + 監査ログ記録が行われる
- 更新可能フィールド: title, estimatedAmount, estimatedStartDate, estimatedEndDate, contractType, assigneeId, technicalLeadId, notes
- index.ts に re-export がある
- `bun run build` が通る

---

## T-10: Server Actions（deals.ts）を追加する

- [ ] `src/app/actions/deals.ts` を作成する。`"use server"` 宣言
- [ ] `createDealAction(prevState, formData): Promise<CreateDealState>` を実装する:
  - `auth()` で認証チェック
  - ロールチェック: `session.user.role` が `admin` または `manager` でなければ `{ message: "権限がありません" }`
  - `checkRateLimit()` でレート制限
  - Zod バリデーション: `inquiryId` (UUID 必須), `title` (必須 1 文字以上), `estimatedAmount` (integer optional), `estimatedStartDate` (string optional), `estimatedEndDate` (string optional), `contractType` (enum optional: `"quasi_delegation" | "contract" | "ses"`), `assigneeId` (UUID optional), `technicalLeadId` (UUID optional), `notes` (optional)
  - `createDeal` usecase を呼び出す
  - `revalidatePath("/deals")` + `revalidatePath("/inquiries/${inquiryId}")`
- [ ] `updateDealPhaseAction(dealId, formData): Promise<ActionResult>` を実装する:
  - `auth()` で認証チェック
  - ロールチェック: `admin` または `manager`
  - formData から `newPhase` と `templateId`（optional）を取得
  - `updateDealPhase` usecase を呼び出す
  - `revalidatePath("/deals")` + `revalidatePath("/deals/${dealId}")`
- [ ] `updateDealAction(dealId, formData): Promise<ActionResult>` を実装する:
  - `auth()` で認証チェック（全ロール許可）
  - Zod バリデーション
  - `updateDeal` usecase を呼び出す
  - `revalidatePath("/deals/${dealId}")`
- [ ] `listDealsAction()` を実装する: 認証チェック → `listDeals(organizationId)` を呼び出す

**Acceptance Criteria**:
- 全アクションに認証チェックがある
- `createDealAction` と `updateDealPhaseAction` に `admin`/`manager` ロールチェックがある
- `updateDealAction` にロールチェックがない（全ロール許可）
- `createDealAction` に Zod バリデーションがある
- organizationId はセッションから取得している
- `bun run build` が通る

---

## T-11: UI — 案件一覧ページ（/deals）

- [ ] `src/app/(dashboard)/deals/page.tsx` を作成する（Server Component）
- [ ] `auth()` でセッションを取得する
- [ ] `listDeals(organizationId)` で案件一覧（DealWithInquiry）を取得する
- [ ] `PageToolbar` で「案件管理」タイトルを表示する（案件作成は引き合い詳細ページから行うため、一覧ページに「新規登録」ボタンは不要）
- [ ] フェーズフィルタ: 全て / 提案準備 / 提案済 / 交渉中 / 内示 / 受注 / 失注のフィルタ（URL パラメータ `?phase=xxx` またはクライアントサイドフィルタ）
- [ ] `DataTable` でフェーズ・案件名・顧客名・想定金額・担当者を表示する。各行は `/deals/[id]` へのリンクとする
- [ ] フェーズのラベル: `proposal_prep` → 提案準備, `proposed` → 提案済, `negotiation` → 交渉中, `internal_approval` → 内示, `won` → 受注, `lost` → 失注
- [ ] 案件が 0 件の場合は空状態メッセージを表示する

**Acceptance Criteria**:
- `/deals` にアクセスすると案件一覧が表示される
- フェーズによるフィルタリングが機能する
- 各案件行がクリック可能で詳細ページへ遷移する
- `bun run build` が通る

---

## T-12: UI — 案件詳細ページ（/deals/[id]）

- [ ] `src/app/(dashboard)/deals/[id]/page.tsx` を作成する（Server Component）
- [ ] `auth()` でセッションを取得し、`dealRepository.findById(id, organizationId)` で案件を取得する。見つからない場合は `notFound()`
- [ ] `inquiryRepository.findById(deal.inquiryId, organizationId)` で関連する引き合い情報を取得する
- [ ] `clientRepository.findById(inquiry.clientId, organizationId)` で顧客情報を取得する
- [ ] `approvalTemplateRepository.findByOrganization(organizationId)` でテンプレート一覧を取得する（フェーズ変更時のテンプレート選択用）
- [ ] 案件情報を `SectionCard` で表示する（案件名、フェーズ、想定金額、想定開始日、想定終了日、契約種別、営業担当、技術担当、備考）
- [ ] フェーズ変更ボタンを配置する:
  - `proposal_prep` 状態: 「提案済に変更」（→ proposed）、「失注」（→ lost）
  - `proposed` 状態: 「交渉開始」（→ negotiation）、「失注」（→ lost）
  - `negotiation` 状態: 「内示に変更」（→ internal_approval）、「失注」（→ lost）
  - `internal_approval` 状態: 「受注」（→ won）、「失注」（→ lost）
  - `won` / `lost` 状態: ボタンなし（終端状態）
- [ ] 「内示に変更」ボタン押下時にテンプレート選択 UI を表示する（引き合い詳細の「商談化」ボタンと同じパターン）
- [ ] フェーズ変更時に `updateDealPhaseAction` を呼び出す
- [ ] 関連する引き合いへのリンク（`/inquiries/${deal.inquiryId}`）を表示する
- [ ] 関連する顧客へのリンク（`/clients/${inquiry.clientId}`）を表示する
- [ ] `deal.estimateRequestId` が存在する場合、見積承認リクエストへのリンク（`/requests/${estimateRequestId}`）を表示する
- [ ] 案件情報の編集フォーム（Client Component）を配置する。`updateDealAction` を呼び出す。編集可能フィールド: title, estimatedAmount, estimatedStartDate, estimatedEndDate, contractType, assigneeId, technicalLeadId, notes

**Acceptance Criteria**:
- `/deals/:id` にアクセスすると案件詳細が表示される
- フェーズに応じた変更ボタンが表示される
- 内示フェーズ遷移時にテンプレート選択 UI が表示される
- 引き合い・顧客・見積承認リクエストへのリンクが表示される
- 案件情報の編集フォームが機能する
- 存在しない案件 ID の場合 404 が表示される
- `bun run build` が通る

---

## T-13: UI — 引き合い詳細ページに案件セクションを追加する

- [ ] `src/app/(dashboard)/inquiries/[id]/page.tsx` を修正する
- [ ] `dealRepository.findByInquiryId(id, organizationId)` で関連する案件を取得する
- [ ] 承認情報セクション（L111-127）の下、商談履歴セクションの前に「案件」セクションを追加する:
  - 案件が存在する場合: 案件名、フェーズ、想定金額を表示し、`/deals/${deal.id}` へのリンクを表示する
  - `inquiry.status === "converted"` かつ案件が存在しない場合: 「案件を作成」ボタンを表示する。クリック時に案件作成フォームを表示するか、`/deals/new?inquiryId=${id}` へ遷移する
  - それ以外の場合（converted でなく案件もない場合）: 「案件はありません」メッセージを表示する

**Acceptance Criteria**:
- 引き合い詳細ページに案件セクションが表示される
- 案件が存在する場合にリンクが表示される
- converted で案件未作成の場合に作成ボタンが表示される
- `bun run build` が通る

---

## T-14: ダッシュボードヘッダーにナビゲーションを追加する

- [ ] `src/app/(dashboard)/layout.tsx` のヘッダーナビ（L24-59 付近）の「引き合い」リンクの直後に「案件」（`/deals`）のリンクを追加する
- [ ] `isAdmin` 条件なしで全ロールに表示する
- [ ] スタイルは「引き合い」と同じ `text-text-on-dark-secondary hover:text-white text-sm` を使用する

**Acceptance Criteria**:
- ダッシュボードヘッダーに「案件」のリンクが表示される
- 全ロール（admin, member, manager, finance）で表示される
- リンク先が `/deals` である
- 「引き合い」の直後に配置されている
- `bun run build` が通る

---

## T-15: シードデータを追加する

- [ ] `src/infrastructure/seed.ts` に `deals` の import を追加する（schema から）
- [ ] テーブル truncation 順序に `deals` を追加する。`deals.inquiryId` FK があるため、`meetings` の前（`meetings` より先に削除）に配置する: `await db.delete(deals)` を `await db.delete(meetings)` の前に追加する
- [ ] 案件 2 件を作成する:
  - 1 件目: `won` フェーズ。`convertedInquiry` に紐づく。title: "DX推進プロジェクト"。`estimatedAmount: 30000000`。`estimateRequestId: approvedRequest.id`。`assigneeId: managerUser.id`
  - 2 件目: `proposed` フェーズ。このためにもう 1 件 `converted` の引き合いが必要。既存の `inProgressInquiry`（工事管理ツールの導入検討、大和建設）を `converted` に変更するか、新しい converted 引き合いを追加する。最もシンプルな方法: `inProgressInquiry` のステータスを `converted` に変更する。title: "工事管理ツール導入"。`estimatedAmount: 15000000`。`assigneeId: managerUser.id`
- [ ] シードデータの整合性を確認する: 案件に紐づく引き合いが全て `converted` ステータスである

**Acceptance Criteria**:
- シード実行後に案件 2 件が作成される
- `won` フェーズの案件に `estimateRequestId` が設定されている
- 案件に紐づく引き合いが全て `converted` ステータスである
- truncation 順序が FK 制約に違反しない
- `bun run build` が通る

---

## T-16: テスト — ドメインモデルと dealTransition の検証

- [ ] `src/__tests__/static/projectStructure.test.ts` の TC-031（domain/models files have no ORM imports）のモデルファイル一覧に `"domain/models/deal.ts"` を追加する
- [ ] 同テストの TC-034（domain 層に infrastructure import がない）のファイル一覧に `"domain/models/deal.ts"` と `"domain/services/dealTransition.ts"` を追加する
- [ ] `src/__tests__/domain/dealTransition.test.ts` を作成する:
  - テスト: `canTransition("proposal_prep", "proposed")` → `true`
  - テスト: `canTransition("proposal_prep", "lost")` → `true`
  - テスト: `canTransition("proposed", "negotiation")` → `true`
  - テスト: `canTransition("proposed", "lost")` → `true`
  - テスト: `canTransition("negotiation", "internal_approval")` → `true`
  - テスト: `canTransition("negotiation", "lost")` → `true`
  - テスト: `canTransition("internal_approval", "won")` → `true`
  - テスト: `canTransition("internal_approval", "lost")` → `true`
  - テスト: `canTransition("won", "proposal_prep")` → `false`
  - テスト: `canTransition("won", "lost")` → `false`
  - テスト: `canTransition("lost", "negotiation")` → `false`
  - テスト: `canTransition("lost", "proposal_prep")` → `false`
  - テスト: `canTransition("proposal_prep", "negotiation")` → `false`（飛び越し禁止）
  - テスト: `canTransition("proposal_prep", "internal_approval")` → `false`
  - テスト: 全フェーズ（`proposal_prep`, `proposed`, `negotiation`, `internal_approval`）から `lost` への遷移が許可される

**Acceptance Criteria**:
- `projectStructure.test.ts` のモデルファイル一覧に新規ファイルが含まれている
- フェーズ遷移テストが全パターンをカバーしている
- `bun test` が全件 green

---

## T-17: テスト — テナント分離と usecase の検証

- [ ] `src/__tests__/static/projectStructure.test.ts` に「Tenant isolation — deal」セクションを追加する（meeting セクション L970-1015 の後に配置）:
  - テスト: `dealRepository.ts` の `create` に `organizationId` が含まれる
  - テスト: `dealRepository.ts` の `findById` に `organizationId` が含まれる
  - テスト: `dealRepository.ts` の `findAllByOrganization` に `organizationId` が含まれる
  - テスト: `dealRepository.ts` の `findByInquiryId` に `organizationId` が含まれる
  - テスト: `dealRepository.ts` の `update` に `organizationId` が含まれる
  - テスト: `dealRepository.ts` の `updatePhase` に `organizationId` が含まれる
  - テスト: `src/app/actions/deals.ts` が `session.user.organizationId` を使用している
- [ ] `src/__tests__/usecases/dealManagement.test.ts` を作成する:
  - テスト: `createDeal.ts` のソースに `inquiryRepository.findById` の呼び出しが含まれる（引き合い存在確認）
  - テスト: `createDeal.ts` のソースに `status` 文字列比較（converted チェック）が含まれる
  - テスト: `createDeal.ts` のソースに `dealRepository.findByInquiryId` の呼び出しが含まれる（重複チェック）
  - テスト: `createDeal.ts` のソースに `auditLogRepository.create` の呼び出しが含まれる
  - テスト: `updateDealPhase.ts` のソースに `canDealTransition` または `canTransition` の呼び出しが含まれる
  - テスト: `updateDealPhase.ts` のソースに `auditLogRepository.create` の呼び出しが含まれる
  - テスト: `updateDealPhase.ts` のソースに `requestRepository.create` の呼び出しが含まれる（internal_approval 時の見積承認リクエスト作成）
  - テスト: `updateDealPhase.ts` のソースに見積承認リクエストのタイトルパターン `"見積承認: "` が含まれる
  - テスト: `updateDeal.ts` のソースに `auditLogRepository.create` の呼び出しが含まれる
  - テスト: `createDealAction` のソースに admin/manager ロールチェックが含まれる
  - テスト: `updateDealPhaseAction` のソースに admin/manager ロールチェックが含まれる

**Acceptance Criteria**:
- 新規 repository メソッドの organizationId 条件がテストで検証される
- Server Actions が organizationId をセッションから取得していることがテストで検証される
- usecase の監査ログ記録・遷移チェック・承認リクエスト作成・重複チェックがテストで検証される
- `bun test` が全件 green

---

## T-18: Drizzle マイグレーション生成

- [ ] `bunx drizzle-kit generate` を実行してマイグレーションファイルを生成する
- [ ] 生成されたマイグレーションを確認し、`deal_phase` enum と `deals` テーブルの CREATE 文が含まれることを確認する

**Acceptance Criteria**:
- `drizzle/` にマイグレーションファイルが生成されている
- マイグレーションの内容が T-01 のスキーマ定義と一致する
- `bun run build` が通る

---

## T-19: 最終確認 — ビルド・型チェック・テスト

- [ ] `bun run build` を実行し、ビルドが成功することを確認する
- [ ] `bunx tsc --noEmit` を実行し、型チェックが通ることを確認する
- [ ] `bun test` を実行し、全テストが green であることを確認する
- [ ] `bun run lint` を実行し、lint エラーがないことを確認する（新規追加ファイルに起因する errors はゼロ）

**Acceptance Criteria**:
- `bun run build` 成功
- `typecheck` green
- `bun test` 全件 green
- `bun run lint` エラーなし（新規ファイルの errors はゼロ）
