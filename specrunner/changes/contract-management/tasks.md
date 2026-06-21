# Tasks: 契約管理

## T-01: schema.ts に contractStatusEnum, renewalTypeEnum, contracts テーブルを追加

- [ ] `src/infrastructure/schema.ts` の enum 定義セクション（`dealPhaseEnum` の後）に `contractStatusEnum` を追加する: `pgEnum("contract_status", ["active", "completed", "cancelled"])`
- [ ] 同セクションに `renewalTypeEnum` を追加する: `pgEnum("renewal_type", ["one_time", "recurring"])`
- [ ] `dealContacts` テーブル定義の後に `contracts` テーブルを追加する。カラム: `id` (uuid PK defaultRandom), `organizationId` (uuid FK to organizations, NOT NULL), `dealId` (uuid FK to deals, NOT NULL), `clientId` (uuid FK to clients, NOT NULL), `title` (text, NOT NULL), `contractType` (text, nullable), `amount` (integer, nullable), `startDate` (timestamp, nullable), `endDate` (timestamp, nullable), `paymentTerms` (text, nullable), `renewalType` (renewalTypeEnum, NOT NULL, default "one_time"), `renewalCycle` (text, nullable), `status` (contractStatusEnum, NOT NULL, default "active"), `createdAt` (timestamp, defaultNow, NOT NULL), `updatedAt` (timestamp, defaultNow, NOT NULL)
- [ ] `contracts` テーブルに unique 制約を追加する: `unique("contracts_deal_id_unique").on(table.dealId)`

**Acceptance Criteria**:
- `contractStatusEnum` が `["active", "completed", "cancelled"]` で定義されている
- `renewalTypeEnum` が `["one_time", "recurring"]` で定義されている
- `contracts` テーブルが全カラム・FK・unique 制約付きで定義されている
- `bun run build` が通る

---

## T-02: Relations 定義を追加

- [ ] `src/infrastructure/schema.ts` に `contractsRelations` を追加する。`organization: one(organizations)`, `deal: one(deals)`, `client: one(clients)` の3リレーション
- [ ] `dealsRelations` に `contract: one(contracts, { fields: [contracts.dealId], references: [deals.id] })` を追加する。ただし Drizzle の one() on the "has one" side は `contracts` テーブル側が FK を持つため、`deals` 側で `one(contracts)` を宣言する際は `fields` / `references` を省略する（Drizzle が FK を逆引きする）。正確な書き方は Drizzle ORM のドキュメントに従い、`dealsRelations` に `contract: one(contracts)` と書く
- [ ] `organizationsRelations` の `many()` に `contracts: many(contracts)` を追加する
- [ ] `clientsRelations` の `many()` に `contracts: many(contracts)` を追加する
- [ ] `contracts` を `schema.ts` のトップレベル import/export として利用可能にする（pgTable export 済みであることを確認）

**Acceptance Criteria**:
- `contractsRelations` が organization, deal, client への `one()` を持つ
- `dealsRelations` に `contract` リレーションが追加されている
- `organizationsRelations` に `contracts: many(contracts)` が追加されている
- `clientsRelations` に `contracts: many(contracts)` が追加されている
- `bun run build` が通る

---

## T-03: Contract ドメインモデルを追加

- [ ] `src/domain/models/contract.ts` を作成する。`ContractStatus` 型（`"active" | "completed" | "cancelled"`）、`RenewalType` 型（`"one_time" | "recurring"`）、`Contract` 型を定義する。`Contract` のフィールド: `id: string`, `organizationId: string`, `dealId: string`, `clientId: string`, `title: string`, `contractType: string | null`, `amount: number | null`, `startDate: Date | null`, `endDate: Date | null`, `paymentTerms: string | null`, `renewalType: RenewalType`, `renewalCycle: string | null`, `status: ContractStatus`, `createdAt: Date`, `updatedAt: Date`
- [ ] `ContractWithClient` 型を追加する: `Contract & { clientName: string }`（一覧表示用）
- [ ] `src/domain/models/index.ts` に `ContractStatus`, `RenewalType`, `Contract`, `ContractWithClient` を export 追加する

**Acceptance Criteria**:
- `contract.ts` に ORM への依存がない（drizzle, @auth, postgres の import がない）
- `ContractStatus`, `RenewalType`, `Contract`, `ContractWithClient` が index.ts 経由で import 可能
- `bun run build` が通る

---

## T-04: Contract ステータス遷移ルールを domain service に追加

- [ ] `src/domain/services/contractTransition.ts` を作成する。`canTransition(from: ContractStatus, to: ContractStatus): boolean` を export する
- [ ] 遷移ルール: `active` → `completed` / `cancelled` のみ許可。`completed` / `cancelled` は終端状態（それ以外の遷移は全て `false`）。同一ステータスへの遷移も `false`
- [ ] `src/domain/services/index.ts` に `canTransition as canContractTransition` を re-export する

**Acceptance Criteria**:
- `canContractTransition("active", "completed")` → `true`
- `canContractTransition("active", "cancelled")` → `true`
- `canContractTransition("completed", "active")` → `false`
- `canContractTransition("cancelled", "active")` → `false`
- `canContractTransition("active", "active")` → `false`
- `bun run build` が通る

---

## T-05: contractRepository を追加

- [ ] `src/infrastructure/repositories/contractRepository.ts` を作成する
- [ ] `mapRow` 関数: `contracts.$inferSelect` → `Contract` 型への変換。`dealRepository.ts` の `mapRow` と同パターン
- [ ] `create(data, tx?)`: `contracts` テーブルに INSERT。`data` は `{ organizationId, dealId, clientId, title, contractType?, amount?, startDate?, endDate?, paymentTerms?, renewalType?, renewalCycle? }`。`.returning()` で `Contract` を返す
- [ ] `findById(id, organizationId, tx?)`: `eq(id) AND eq(organizationId)` で検索。`Contract | null` を返す
- [ ] `findByDealId(dealId, organizationId, tx?)`: `eq(dealId) AND eq(organizationId)` で検索。`Contract | null` を返す
- [ ] `findAllByOrganization(organizationId)`: `clients` テーブルを INNER JOIN し `ContractWithClient[]` を返す。`eq(contracts.organizationId, organizationId)` で絞り込み。`asc(contracts.createdAt)` でソート
- [ ] `update(id, organizationId, data, tx?)`: `data` は `Partial<{ title, contractType, amount, startDate, endDate, paymentTerms, renewalType, renewalCycle, status }>`。`updatedAt` を `new Date()` で更新。`.returning()` で `Contract | null` を返す
- [ ] `src/infrastructure/repositories/index.ts` に `export * as contractRepository from "./contractRepository"` を追加する

**Acceptance Criteria**:
- 5 メソッド（create, findById, findByDealId, findAllByOrganization, update）が export されている
- 全メソッドに organizationId 条件が含まれている
- create, findById, findByDealId, update はオプション引数 `tx?: Transaction` を受け取る
- findAllByOrganization は clients と JOIN して clientName を返す
- `bun run build` が通る

---

## T-06: createContract usecase を追加

- [ ] `src/application/usecases/createContract.ts` を作成する
- [ ] 引数: `{ dealId, organizationId, actorId, title?, contractType?, amount?, startDate?, endDate?, paymentTerms?, renewalType?, renewalCycle? }`
- [ ] `dealRepository.findById(dealId, organizationId)` で Deal を取得。存在しなければ `{ ok: false, reason: "案件が見つかりません" }` を返す
- [ ] Deal の phase が `won` でなければ `{ ok: false, reason: "受注済みの案件にのみ契約を作成できます" }` を返す
- [ ] `contractRepository.findByDealId(dealId, organizationId)` で既存 Contract をチェック。存在すれば `{ ok: false, reason: "この案件にはすでに契約が存在します" }` を返す
- [ ] Deal の情報を初期値として使用する: `title` → `deal.title`, `contractType` → `deal.contractType`, `amount` → `deal.estimatedAmount`, `startDate` → `deal.estimatedStartDate`, `endDate` → `deal.estimatedEndDate`, `clientId` → `deal.clientId`。引数で明示的に渡された値は初期値を上書きする
- [ ] `db.transaction` 内で `contractRepository.create` + `auditLogRepository.create`（action: `contract.create`, targetType: `contract`）を実行する
- [ ] 戻り値: `{ ok: true, contract } | { ok: false, reason: string }`
- [ ] `src/application/usecases/index.ts` に re-export する

**Acceptance Criteria**:
- Deal が won でない場合にエラーが返る
- 同一 Deal に2件目の Contract を作成しようとするとエラーが返る
- Deal の情報（title, contractType, estimatedAmount 等）が初期値として引き継がれる
- トランザクション内で契約作成と監査ログ記録が行われる
- index.ts に re-export がある
- `bun run build` が通る

---

## T-07: updateContract usecase を追加

- [ ] `src/application/usecases/updateContract.ts` を作成する
- [ ] 引数: `{ contractId, organizationId, actorId, title?, contractType?, amount?, startDate?, endDate?, paymentTerms?, renewalType?, renewalCycle? }`
- [ ] `contractRepository.findById(contractId, organizationId)` で Contract を取得。存在しなければ `{ ok: false, reason: "契約が見つかりません" }` を返す
- [ ] `db.transaction` 内で `contractRepository.update` + `auditLogRepository.create`（action: `contract.update`, targetType: `contract`）を実行する
- [ ] 戻り値: `{ ok: true, contract } | { ok: false, reason: string }`
- [ ] `src/application/usecases/index.ts` に re-export する

**Acceptance Criteria**:
- 存在しない Contract の場合エラーが返る
- トランザクション内で更新と監査ログ記録が行われる
- index.ts に re-export がある
- `bun run build` が通る

---

## T-08: updateContractStatus usecase を追加

- [ ] `src/application/usecases/updateContractStatus.ts` を作成する
- [ ] 引数: `{ contractId, organizationId, actorId, newStatus: ContractStatus }`
- [ ] `contractRepository.findById(contractId, organizationId)` で Contract を取得。存在しなければ `{ ok: false, reason: "契約が見つかりません" }` を返す
- [ ] `canContractTransition(contract.status, newStatus)` で遷移可否を検証する。遷移不可なら `{ ok: false, reason: "ステータスを \"${contract.status}\" から \"${newStatus}\" に変更することはできません" }` を返す
- [ ] `db.transaction` 内で `contractRepository.update(contractId, organizationId, { status: newStatus }, tx)` + `auditLogRepository.create`（action: `contract.updateStatus`, targetType: `contract`, metadata: `{ fromStatus, toStatus }`）を実行する
- [ ] 戻り値: `{ ok: true, contract } | { ok: false, reason: string }`
- [ ] `src/application/usecases/index.ts` に re-export する

**Acceptance Criteria**:
- `active` → `completed` が成功する
- `active` → `cancelled` が成功する
- `completed` → `active` が拒否される
- `cancelled` → `active` が拒否される
- 監査ログの metadata に fromStatus と toStatus が含まれる
- index.ts に re-export がある
- `bun run build` が通る

---

## T-09: listContracts / getContract usecase を追加

- [ ] `src/application/usecases/listContracts.ts` を作成する。引数: `organizationId: string`。`contractRepository.findAllByOrganization(organizationId)` を呼び出し、`ContractWithClient[]` を返す
- [ ] `src/application/usecases/getContract.ts` を作成する。引数: `{ contractId, organizationId }`。`contractRepository.findById(contractId, organizationId)` を呼び出し、`Contract | null` を返す
- [ ] `src/application/usecases/index.ts` に re-export する

**Acceptance Criteria**:
- listContracts が organizationId で絞り込まれた一覧を返す
- getContract が contractId + organizationId で検索して返す
- index.ts に re-export がある
- `bun run build` が通る

---

## T-10: 契約管理 Server Actions を追加

- [ ] `src/app/actions/contracts.ts` を新規作成する。`"use server"` ディレクティブを先頭に記述
- [ ] `createContractAction`: セッション取得 → admin/manager ガード → zod バリデーション（dealId: UUID 必須、title?: 文字列、contractType?: "quasi_delegation" | "fixed_price" | "ses"、amount?: 非負整数、startDate?: 文字列、endDate?: 文字列、paymentTerms?: 文字列、renewalType?: "one_time" | "recurring"、renewalCycle?: 文字列） → レート制限 → `createContract` usecase 呼び出し → `revalidatePath("/contracts")` + `revalidatePath(\`/deals/${dealId}\`)`
- [ ] `updateContractAction`: セッション取得 → admin/manager ガード → zod バリデーション → `updateContract` usecase 呼び出し → `revalidatePath`
- [ ] `updateContractStatusAction`: セッション取得 → admin/manager ガード → `updateContractStatus` usecase 呼び出し → `revalidatePath`
- [ ] `listContractsAction`: セッション取得 → `listContracts` usecase 呼び出し（全ロール許可）
- [ ] `getContractAction`: セッション取得 → `getContract` usecase 呼び出し（全ロール許可）

**Acceptance Criteria**:
- 5 アクションが export されている
- 作成・更新・ステータス変更に admin/manager ガードがある
- 一覧・詳細は全ロールに公開されている
- organizationId はセッションから取得している
- zod バリデーションが適用されている
- `bun run build` が通る

---

## T-11: labels.ts にラベルを追加

- [ ] `src/app/(dashboard)/labels.ts` に `contractStatusLabels` を追加する: `{ active: "契約中", completed: "完了", cancelled: "解約" }`
- [ ] 同ファイルに `renewalTypeLabels` を追加する: `{ one_time: "スポット", recurring: "定期" }`

**Acceptance Criteria**:
- `contractStatusLabels` と `renewalTypeLabels` が export されている
- `bun run build` が通る

---

## T-12: ダッシュボードヘッダーに「契約」ナビリンクを追加

- [ ] `src/app/(dashboard)/layout.tsx` のヘッダーナビに「契約」リンク（`/contracts`）を追加する。「案件」の後、「申請一覧」の前に配置する
- [ ] 全ロールに表示する（admin ガードなし。既存の「顧客」「引き合い」「案件」「申請一覧」と同じ扱い）

**Acceptance Criteria**:
- ヘッダーに「契約」リンクが表示される
- リンク先は `/contracts`
- 「案件」と「申請一覧」の間に配置されている
- 全ロール（admin, member, manager, finance）に表示される
- `bun run build` が通る

---

## T-13: 契約一覧ページ（/contracts）を追加

- [ ] `src/app/(dashboard)/contracts/page.tsx` を作成する（Server Component）
- [ ] `listContractsAction` で契約一覧を取得して表示する
- [ ] DataTable のカラム: 契約名（title）、顧客名（clientName）、契約種別（contractType — contractTypeLabels でラベル変換）、金額（amount — ¥ フォーマット）、ステータス（status — contractStatusLabels でラベル変換）
- [ ] 各行に契約詳細ページ（`/contracts/{id}`）へのリンクを設定する
- [ ] パンくず: 契約一覧

**Acceptance Criteria**:
- `/contracts` にアクセスすると契約一覧が DataTable で表示される
- 各行に契約詳細へのリンクがある
- 金額が日本円フォーマットで表示される
- `bun run build` が通る

---

## T-14: 契約詳細ページ（/contracts/[id]）を追加

- [ ] `src/app/(dashboard)/contracts/[id]/page.tsx` を作成する（Server Component）
- [ ] `contractRepository.findById` で契約を取得する。見つからない場合は `notFound()`
- [ ] 契約情報の表示: 契約名、契約種別、金額、開始日、終了日、支払条件、更新種別、更新サイクル、ステータス、作成日
- [ ] 関連案件へのリンク（`/deals/{dealId}`）を表示する
- [ ] 関連顧客へのリンク（`/clients/{clientId}`）を表示する
- [ ] admin / manager の場合: ステータス変更ボタン（active → completed / cancelled）を表示する。ステータスが終端の場合はボタンを非表示にする
- [ ] admin / manager の場合: 編集リンク（`/contracts/{id}/edit`）を表示する
- [ ] ステータス変更は `ContractStatusActions` Client Component で実装する（`DealPhaseActions` と同パターン）

**Acceptance Criteria**:
- `/contracts/:id` にアクセスすると契約詳細が表示される
- 関連案件・顧客へのリンクがある
- admin/manager にステータス変更ボタンと編集リンクが表示される
- 存在しない ID の場合 404 が表示される
- `bun run build` が通る

---

## T-15: 契約編集ページ（/contracts/[id]/edit）を追加

- [ ] `src/app/(dashboard)/contracts/[id]/edit/page.tsx` を作成する（Server Component）
- [ ] admin / manager ガード
- [ ] `contractRepository.findById` で契約を取得。見つからない場合は `notFound()`
- [ ] `ContractEditForm` Client Component を配置する。既存値をデフォルト値として渡す
- [ ] `src/app/(dashboard)/contracts/[id]/ContractEditForm.tsx` を作成する（`"use client"`）
- [ ] フォームフィールド: title（テキスト）、contractType（ドロップダウン: quasi_delegation / fixed_price / ses）、amount（数値）、startDate（日付）、endDate（日付）、paymentTerms（テキスト）、renewalType（ドロップダウン: one_time / recurring）、renewalCycle（テキスト、renewalType が recurring の場合のみ表示）
- [ ] フォーム送信時に `updateContractAction` を呼び出す

**Acceptance Criteria**:
- `/contracts/:id/edit` に既存契約の値が入ったフォームが表示される
- admin/manager 以外はリダイレクトされる
- 存在しない ID の場合 404 が表示される
- フォーム送信で `updateContractAction` が呼ばれる
- `bun run build` が通る

---

## T-16: 案件詳細ページに契約セクションを追加

- [ ] `src/app/(dashboard)/deals/[id]/page.tsx` で `contractRepository.findByDealId(deal.id, organizationId)` を呼び出す
- [ ] Deal の phase が `won` の場合にのみ契約セクション（SectionCard）を表示する
- [ ] 契約未作成の場合: 「契約を作成」ボタンを表示する。ボタンは `createContractAction` を呼び出す form で実装する（dealId を hidden input で渡す）。admin / manager のみ表示
- [ ] 契約が存在する場合: 契約名、ステータス、金額を表示し、契約詳細ページ（`/contracts/{contractId}`）へのリンクを配置する
- [ ] `contractRepository` を import リストに追加する

**Acceptance Criteria**:
- won フェーズの案件詳細に契約セクションが表示される
- 契約未作成時に「契約を作成」ボタンが表示される（admin/manager のみ）
- 契約存在時に契約情報とリンクが表示される
- won 以外のフェーズでは契約セクションが表示されない
- `bun run build` が通る

---

## T-17: シードデータに Contract を追加

- [ ] `src/infrastructure/seed.ts` の import に `contracts` テーブルを追加する
- [ ] truncation 順序に `contracts` を追加する: `dealContacts` の削除の後、`deals` の削除の前に `await db.delete(contracts)` を挿入する
- [ ] deal contacts 作成後に Contract を1件追加する: `wonDeal` に対して `{ organizationId: org.id, dealId: wonDeal.id, clientId: techClient.id, title: "DX推進プロジェクト", contractType: "quasi_delegation", amount: 30000000, startDate: new Date("2026-07-01"), endDate: new Date("2027-03-31"), renewalType: "one_time", status: "active" }`

**Acceptance Criteria**:
- `contracts` テーブルの truncation が `deals` の前に実行される
- won 案件（DX推進プロジェクト）に対して Contract が1件作成される
- `bun run build` が通る

---

## T-18: テスト — projectStructure.test.ts を更新

- [ ] `src/__tests__/static/projectStructure.test.ts` の TC-031 ドメインモデルファイル一覧に `"domain/models/contract.ts"` を追加する
- [ ] テナント分離テストに `contractRepository.ts` のテストを追加する: `create`, `findById`, `findByDealId`, `findAllByOrganization`, `update` の各メソッドのソースに `organizationId` が含まれることを確認する
- [ ] Server Action テストを追加する: `src/app/actions/contracts.ts` が `session.user.organizationId` を使用していることを確認する

**Acceptance Criteria**:
- contract.ts がドメインモデルファイル一覧に含まれている
- contractRepository の全メソッドに organizationId 条件があることがテストで検証される
- Server Action が organizationId をセッションから取得していることがテストで検証される
- `bun test` が全件 green

---

## T-19: マイグレーションファイルを生成

- [ ] `bunx drizzle-kit generate` を実行し、contracts テーブル・enum のマイグレーションファイルを生成する

**Acceptance Criteria**:
- マイグレーションファイルが `drizzle/` ディレクトリに生成されている
- マイグレーションに `contractStatusEnum`, `renewalTypeEnum`, `contracts` テーブルの CREATE が含まれている

---

## T-20: 最終確認 — ビルド・型チェック・テスト

- [ ] `bun run build` を実行し、ビルドが成功することを確認する
- [ ] `bunx tsc --noEmit` を実行し、型チェックが通ることを確認する
- [ ] `bun test` を実行し、全テストが green であることを確認する
- [ ] `bun run lint` を実行し、lint エラーがないことを確認する

**Acceptance Criteria**:
- `bun run build` 成功
- `typecheck` green
- `bun test` 全件 green
- `bun run lint` エラーなし
