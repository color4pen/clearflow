# Tasks: invoice-management

## T-01: ドメインモデルに Invoice 型と InvoiceStatus 型を追加

- [ ] `src/domain/models/invoice.ts` を新規作成し、以下を定義する:
  - `InvoiceStatus` 型: `"scheduled" | "invoiced" | "paid" | "overdue"`
  - `Invoice` 型: `id: string`, `organizationId: string`, `contractId: string`, `title: string`, `amount: number`, `dueDate: Date | null`, `status: InvoiceStatus`, `invoicedAt: Date | null`, `paidAt: Date | null`, `notes: string | null`, `createdAt: Date`, `updatedAt: Date`
- [ ] `src/domain/models/index.ts` に `export type { InvoiceStatus, Invoice } from "./invoice"` を追記する

**Acceptance Criteria**:
- `InvoiceStatus` が `"scheduled" | "invoiced" | "paid" | "overdue"` である
- `Invoice` 型が全カラムに対応するフィールドを持つ
- `src/domain/models/index.ts` から `InvoiceStatus` と `Invoice` がエクスポートされる
- `typecheck` が green

## T-02: DB スキーマに invoiceStatusEnum と invoices テーブルを追加

- [ ] `src/infrastructure/schema.ts` に `invoiceStatusEnum` を追加する: `pgEnum("invoice_status", ["scheduled", "invoiced", "paid", "overdue"])`（`renewalTypeEnum` の後に配置）
- [ ] `src/infrastructure/schema.ts` に `invoices` テーブルを追加する（`contracts` テーブルの後に配置）:
  - `id`: uuid PK defaultRandom
  - `organizationId`: uuid FK to organizations, NOT NULL
  - `contractId`: uuid FK to contracts, NOT NULL
  - `title`: text, NOT NULL
  - `amount`: integer, NOT NULL
  - `dueDate`: timestamp, nullable
  - `status`: invoiceStatusEnum, NOT NULL, default `"scheduled"`
  - `invoicedAt`: timestamp, nullable
  - `paidAt`: timestamp, nullable
  - `notes`: text, nullable
  - `createdAt`: timestamp, defaultNow, NOT NULL
  - `updatedAt`: timestamp, defaultNow, NOT NULL

**Acceptance Criteria**:
- `invoiceStatusEnum` が `["scheduled", "invoiced", "paid", "overdue"]` で定義されている
- `invoices` テーブルが全カラムを持つ
- `organizationId` と `contractId` に FK 制約がある
- `typecheck` が green

## T-03: Relations 定義を追加

- [ ] `src/infrastructure/schema.ts` に `invoicesRelations` を追加する: `organization` への `one()`、`contract` への `one()`
- [ ] `contractsRelations` に `invoices: many(invoices)` を追加する（`one()` から `one, many` に変更）
- [ ] `organizationsRelations` に `invoices: many(invoices)` を追加する

**Acceptance Criteria**:
- `invoicesRelations` が `organization` と `contract` への relation を持つ
- `contractsRelations` に `invoices` の many relation が含まれる
- `organizationsRelations` に `invoices` の many relation が含まれる
- `typecheck` が green

## T-04: invoiceRepository を追加

- [ ] `src/infrastructure/repositories/invoiceRepository.ts` を新規作成する
- [ ] `mapRow` 関数: DB 行を `Invoice` 型にマッピングする
- [ ] `create(data, tx?)`: 請求を作成する。`organizationId` を含む
- [ ] `findById(id, organizationId, tx?)`: ID と organizationId で請求を取得する
- [ ] `findAllByContract(contractId, organizationId, tx?)`: 契約に紐づく請求一覧を取得する。`createdAt` 昇順
- [ ] `update(id, organizationId, data, tx?)`: 請求を更新する。`updatedAt` を現在日時に更新
- [ ] `updateStatus(id, organizationId, status, additionalFields?, tx?)`: ステータスを更新する。`additionalFields` で `invoicedAt` / `paidAt` を受け取る。`updatedAt` を現在日時に更新
- [ ] `sumAmountByContract(contractId, organizationId, tx?)`: 契約に紐づく全請求の金額合計を SQL の `SUM(amount)` で返す。請求が存在しない場合は `0` を返す
- [ ] `src/infrastructure/repositories/index.ts` に `export * as invoiceRepository from "./invoiceRepository"` を追記する

**Acceptance Criteria**:
- 全メソッドの引数に `organizationId` が含まれる
- 全クエリの WHERE 条件に `organizationId` が含まれる
- `sumAmountByContract` が SQL の `SUM` を使用する
- `src/infrastructure/repositories/index.ts` から `invoiceRepository` がエクスポートされる
- `typecheck` が green

## T-05: 請求ステータス遷移ルールを定義

- [ ] `src/domain/services/invoiceTransition.ts` を新規作成する
- [ ] `VALID_INVOICE_TRANSITIONS` 定数を定義する:
  - `scheduled`: `["invoiced"]`
  - `invoiced`: `["paid", "overdue"]`
  - `paid`: `[]`（終端状態）
  - `overdue`: `[]`（終端状態）
- [ ] `validateInvoiceTransition(from: InvoiceStatus, to: InvoiceStatus): { ok: true } | { ok: false; reason: string }` 関数をエクスポートする
- [ ] `src/domain/services/index.ts` に `export { validateInvoiceTransition } from "./invoiceTransition"` を追記する（既存の `contractTransition`・`inquiryTransition`・`dealTransition` と同じパターン）

**Acceptance Criteria**:
- `validateInvoiceTransition("scheduled", "invoiced")` が `{ ok: true }` を返す
- `validateInvoiceTransition("invoiced", "paid")` が `{ ok: true }` を返す
- `validateInvoiceTransition("invoiced", "overdue")` が `{ ok: true }` を返す
- `validateInvoiceTransition("paid", "invoiced")` が `{ ok: false }` を返す
- `validateInvoiceTransition("scheduled", "paid")` が `{ ok: false }` を返す
- `validateInvoiceTransition("overdue", "invoiced")` が `{ ok: false }` を返す
- `src/domain/services/index.ts` から `validateInvoiceTransition` がエクスポートされる

## T-06: createInvoice ユースケースを追加

- [ ] `src/application/usecases/createInvoice.ts` を新規作成する
- [ ] 引数: `contractId`, `organizationId`, `actorId`, `title`, `amount`, `dueDate?`, `notes?`
- [ ] 戻り値: `{ ok: true; invoice: Invoice } | { ok: false; reason: string }`
- [ ] 処理フロー:
  1. `contractRepository.findById` で契約を取得。存在しなければエラー
  2. 契約ステータスが `active` でなければエラー
  3. トランザクション内で:
     - one_time 契約かつ `contract.amount` が null でない場合:
       - `invoiceRepository.sumAmountByContract(contractId, organizationId, tx)` で既存合計をトランザクション内で取得（TOCTOU 防止のため合計取得とレコード作成を同一 tx に含める）
       - 既存合計 + 新規 amount > contract.amount ならエラー（ロールバック）
     - `invoiceRepository.create` でレコードを作成
     - `auditLogRepository.create`（action: `"invoice.create"`, targetType: `"invoice"`）
- [ ] `src/application/usecases/index.ts` に `export { createInvoice } from "./createInvoice"` を追記する

**Acceptance Criteria**:
- active 以外の契約への請求作成がエラーになる
- one_time 契約で合計金額超過時にエラーになる
- recurring 契約で合計金額チェックがスキップされる
- one_time 契約で contract.amount が null の場合にチェックがスキップされる
- 監査ログが記録される
- `typecheck` が green

## T-07: updateInvoiceStatus ユースケースを追加

- [ ] `src/application/usecases/updateInvoiceStatus.ts` を新規作成する
- [ ] 引数: `invoiceId`, `organizationId`, `actorId`, `newStatus`
- [ ] 戻り値: `{ ok: true; invoice: Invoice } | { ok: false; reason: string }`
- [ ] 処理フロー:
  1. `invoiceRepository.findById` で請求を取得。存在しなければエラー
  2. `validateInvoiceTransition(invoice.status, newStatus)` で遷移を検証
  3. 遷移先に応じた追加フィールドを決定:
     - `invoiced`: `{ invoicedAt: new Date() }`
     - `paid`: `{ paidAt: new Date() }`
     - その他: なし
  4. トランザクション内で `invoiceRepository.updateStatus` + `auditLogRepository.create`（action: `"invoice.update_status"`, targetType: `"invoice"`）
- [ ] `src/application/usecases/index.ts` に `export { updateInvoiceStatus } from "./updateInvoiceStatus"` を追記する

**Acceptance Criteria**:
- 有効な遷移（scheduled→invoiced, invoiced→paid, invoiced→overdue）が成功する
- 無効な遷移（paid→invoiced, scheduled→paid）がエラーになる
- invoiced 遷移時に `invoicedAt` が自動セットされる
- paid 遷移時に `paidAt` が自動セットされる
- 監査ログが記録される
- `typecheck` が green

## T-08: listInvoicesByContract ユースケースを追加

- [ ] `src/application/usecases/listInvoicesByContract.ts` を新規作成する
- [ ] 引数: `contractId`, `organizationId`
- [ ] 戻り値: `Invoice[]`
- [ ] `invoiceRepository.findAllByContract` を呼び出して返す
- [ ] `src/application/usecases/index.ts` に `export { listInvoicesByContract } from "./listInvoicesByContract"` を追記する

**Acceptance Criteria**:
- 契約に紐づく請求一覧が返される
- organizationId によるテナント分離が適用されている
- `typecheck` が green

## T-09: labels.ts に invoiceStatusLabels を追加

- [ ] `src/app/(dashboard)/labels.ts` に `invoiceStatusLabels` を追加する:
  - `scheduled: "予定"`, `invoiced: "請求済"`, `paid: "入金済"`, `overdue: "期日超過"`

**Acceptance Criteria**:
- `invoiceStatusLabels` が全4ステータスのラベルを持つ
- `typecheck` が green

## T-10: Server Actions を追加

- [ ] `src/app/actions/invoices.ts` を新規作成する
- [ ] `"use server"` 宣言を記述する
- [ ] `createInvoiceAction(formData: FormData)`:
  - 認証チェック（`auth()`）
  - 権限チェック（admin / manager のみ）
  - レート制限チェック
  - Zod バリデーション: `contractId`（uuid 必須）、`title`（文字列必須、最大255文字、`z.string().min(1).max(255)`）、`amount`（正の整数必須、`z.coerce.number().int().positive()`、0 は不可）、`dueDate`（文字列 optional）、`notes`（文字列 optional、最大1000文字、`z.string().max(1000).optional()`）
  - `createInvoice` ユースケースを呼び出す
  - `revalidatePath` で契約詳細ページを再検証
- [ ] `updateInvoiceStatusAction(invoiceId: string, newStatus: string)`:
  - 認証チェック
  - 権限チェック（admin / manager のみ）
  - Zod バリデーション: `invoiceId`（uuid 必須）、`newStatus`（`z.enum(["scheduled", "invoiced", "paid", "overdue"])` 必須。TypeScript 型はランタイムで保証されないため列挙型として検証する）
  - `updateInvoiceStatus` ユースケースを呼び出す
  - `revalidatePath` で契約詳細ページを再検証
- [ ] `listInvoicesByContractAction(contractId: string)`:
  - 認証チェック
  - `listInvoicesByContract` ユースケースを呼び出す

**Acceptance Criteria**:
- 全 action に `"use server"` 宣言がある
- 全 action に認証チェックがある
- 作成・ステータス変更 action に admin / manager 権限チェックがある
- `createInvoiceAction` の `amount` が `z.coerce.number().int().positive()` で検証され、0 は拒否される
- `createInvoiceAction` の `title` が `z.string().min(1).max(255)` で検証される
- `createInvoiceAction` の `notes` が `z.string().max(1000).optional()` で検証される
- `updateInvoiceStatusAction` の `newStatus` が `z.enum(["scheduled", "invoiced", "paid", "overdue"])` で検証される
- レート制限が適用されている
- `typecheck` が green

## T-11: 契約詳細ページに請求一覧セクションを追加

- [ ] 請求一覧コンポーネントを作成する（`src/app/(dashboard)/contracts/[id]/InvoiceSection.tsx` 等）:
  - 請求サマリー表示: 請求済合計 / 入金済合計 / 未請求合計を算出・表示する
  - DataTable で請求名（title）・金額・支払期日・ステータスを表示する
  - ステータス列に `invoiceStatusLabels` を使用する
  - 金額は `¥` 付きのロケール表示（`toLocaleString("ja-JP")`）
  - 支払期日は `toLocaleDateString("ja-JP")` で表示（null の場合は `-`）
- [ ] 「請求を追加」ボタンを配置する（admin / manager のみ表示。契約が active の場合のみ）
- [ ] ステータス変更ボタンを各行に配置する:
  - `scheduled` の行: 「請求書発行」ボタン（→ invoiced）
  - `invoiced` の行: 「入金確認」ボタン（→ paid）と「期日超過」ボタン（→ overdue）
  - `paid` / `overdue` の行: ボタンなし（終端状態）
  - admin / manager のみ表示
- [ ] `src/app/(dashboard)/contracts/[id]/page.tsx` にセクションを組み込む

**Acceptance Criteria**:
- 契約詳細ページに請求一覧セクションが表示される
- 請求サマリー（請求済合計/入金済合計/未請求合計）が表示される
- ステータスに応じた変更ボタンが表示される
- admin / manager 以外にはステータス変更ボタンと「請求を追加」ボタンが非表示

## T-12: 請求追加フォーム（モーダル）を実装

- [ ] 請求追加モーダルコンポーネントを作成する（`src/app/(dashboard)/contracts/[id]/CreateInvoiceModal.tsx` 等）:
  - 入力フィールド: タイトル（text, 必須）、金額（number, 必須）、支払期日（date, 任意）、備考（textarea, 任意）
  - `contractId` を hidden フィールドまたは props で渡す
  - `createInvoiceAction` をフォーム送信時に呼び出す
  - 成功時にモーダルを閉じる。エラー時にエラーメッセージを表示する
- [ ] T-11 の「請求を追加」ボタンからモーダルを開く

**Acceptance Criteria**:
- 「請求を追加」ボタンからモーダルが開く
- フォーム送信で請求が作成される
- バリデーションエラーが表示される
- 成功時にモーダルが閉じ、一覧が更新される

## T-13: シードデータに請求を追加

- [ ] `src/infrastructure/seed.ts` — truncation 順序に `invoices` を追加する（`contracts` の前に `await db.delete(invoices)` を追加）
- [ ] `src/infrastructure/seed.ts` — `invoices` テーブルのインポートを追加する
- [ ] DX推進プロジェクト契約に対して請求3件を追加する:
  - 着手金: title `"着手金"`, amount `9000000`, status `"paid"`, invoicedAt と paidAt に過去日時をセット
  - 中間金: title `"中間金"`, amount `9000000`, status `"invoiced"`, invoicedAt に過去日時をセット
  - 残金: title `"残金"`, amount `12000000`, status `"scheduled"`
- [ ] 請求の `organizationId` は契約と同じ組織IDを使用する
- [ ] 契約の insert から返される ID を使用するか、returning を追加して contractId を取得する

**Acceptance Criteria**:
- シード実行後、DX推進プロジェクト契約に3件の請求が作成される
- 金額合計が 3000 万円（= 契約金額）
- 各請求のステータスと日時フィールドが正しい
- truncation 順序が FK 制約に違反しない

## T-14: テストを追加

- [ ] `src/__tests__/static/projectStructure.test.ts` のモデルファイル一覧（TC-031）に `"domain/models/invoice.ts"` を追記する
- [ ] テナント分離テストを追加する:
  - `invoiceRepository.create includes organizationId`
  - `invoiceRepository.findById includes organizationId condition`
  - `invoiceRepository.findAllByContract includes organizationId condition`
  - `invoiceRepository.update includes organizationId condition`
  - `invoiceRepository.updateStatus includes organizationId condition`
  - `invoiceRepository.sumAmountByContract includes organizationId condition`
  - `invoices action uses session.user.organizationId`

**Acceptance Criteria**:
- `invoice.ts` がモデルファイル一覧に含まれる
- テナント分離テストが全て green
- `bun test` が全件 green

## T-15: Drizzle マイグレーション生成

- [ ] `bunx drizzle-kit generate` を実行してマイグレーションファイルを生成する（`invoice_status` enum の追加、`invoices` テーブルの追加）

**Acceptance Criteria**:
- `drizzle/` ディレクトリにマイグレーションファイルが生成される
- `bun run build` が成功する
- `bun test` が全件 green
