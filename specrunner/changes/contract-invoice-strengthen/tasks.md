# Tasks: 契約・請求モデルの強化

## T-01: スキーマ変更とマイグレーション生成

- [ ] `src/infrastructure/schema.ts` の `contracts` テーブルで `amount` を `integer("amount").notNull()` に変更する（L372）
- [ ] `src/infrastructure/schema.ts` の `contracts` テーブルで `startDate` を `timestamp("start_date").notNull()` に変更する（L373）
- [ ] `src/infrastructure/schema.ts` の `invoices` テーブルに `issueDate: timestamp("issue_date")` を追加する（L397 付近、`invoicedAt` の前）
- [ ] `src/infrastructure/schema.ts` の `invoices` テーブルで `dueDate` を `timestamp("due_date").notNull()` に変更する（L395）
- [ ] `bun run db:generate` でマイグレーション SQL を生成する
- [ ] 生成されたマイグレーション SQL を編集し、NOT NULL 変更の前に UPDATE 文を追加する:
  - `UPDATE contracts SET amount = 0 WHERE amount IS NULL;` を `ALTER TABLE "contracts" ALTER COLUMN "amount" SET NOT NULL;` の前に挿入
  - `UPDATE contracts SET start_date = created_at WHERE start_date IS NULL;` を `ALTER TABLE "contracts" ALTER COLUMN "start_date" SET NOT NULL;` の前に挿入
  - `UPDATE invoices SET due_date = created_at + INTERVAL '30 days' WHERE due_date IS NULL;` を `ALTER TABLE "invoices" ALTER COLUMN "due_date" SET NOT NULL;` の前に挿入

**Acceptance Criteria**:
- マイグレーション SQL が存在し、UPDATE → ALTER COLUMN SET NOT NULL の順序が正しい
- `issue_date` カラムの追加が含まれている
- `bun run db:push` でスキーマが DB に反映される（開発環境での検証）

## T-02: ドメインモデルの型更新

- [ ] `src/domain/models/contract.ts` の `Contract` 型で `amount` を `number`（non-nullable）に変更する（L12）
- [ ] `src/domain/models/contract.ts` の `Contract` 型で `startDate` を `Date`（non-nullable）に変更する（L13）
- [ ] `src/domain/models/invoice.ts` の `Invoice` 型に `issueDate: Date | null` フィールドを追加する（`dueDate` の後）
- [ ] `src/domain/models/invoice.ts` の `Invoice` 型で `dueDate` を `Date`（non-nullable）に変更する（L9）

**Acceptance Criteria**:
- `Contract.amount` が `number` 型（nullable でない）
- `Contract.startDate` が `Date` 型（nullable でない）
- `Invoice.issueDate` が `Date | null` 型
- `Invoice.dueDate` が `Date` 型（nullable でない）

## T-03: 契約バリデーションのドメインサービス追加

- [ ] `src/domain/services/contractValidation.ts` を新規作成する
- [ ] `validateContractAmount(amount: number): { ok: true } | { ok: false; reason: string }` を実装する — amount > 0 でない場合にエラーを返す
- [ ] `validateContractDates(startDate: Date, endDate: Date | null): { ok: true } | { ok: false; reason: string }` を実装する — endDate が non-null かつ startDate > endDate の場合にエラーを返す
- [ ] `src/domain/services/index.ts` に export を追加する

**Acceptance Criteria**:
- `validateContractAmount(0)` が `{ ok: false }` を返す
- `validateContractAmount(-1)` が `{ ok: false }` を返す
- `validateContractAmount(1)` が `{ ok: true }` を返す
- `validateContractDates(new Date('2026-07-01'), new Date('2026-06-01'))` が `{ ok: false }` を返す
- `validateContractDates(new Date('2026-07-01'), new Date('2026-07-01'))` が `{ ok: true }` を返す
- `validateContractDates(new Date('2026-07-01'), null)` が `{ ok: true }` を返す

## T-04: 請求バリデーションのドメインサービス追加

- [ ] `src/domain/services/invoiceValidation.ts` を新規作成する
- [ ] `validateInvoiceDates(issueDate: Date | null, dueDate: Date): { ok: true } | { ok: false; reason: string }` を実装する — issueDate が non-null かつ issueDate > dueDate の場合にエラーを返す
- [ ] `src/domain/services/index.ts` に export を追加する

**Acceptance Criteria**:
- `validateInvoiceDates(new Date('2026-08-01'), new Date('2026-07-01'))` が `{ ok: false }` を返す
- `validateInvoiceDates(new Date('2026-07-01'), new Date('2026-07-01'))` が `{ ok: true }` を返す
- `validateInvoiceDates(null, new Date('2026-07-01'))` が `{ ok: true }` を返す

## T-05: リポジトリ層の型更新

- [ ] `src/infrastructure/repositories/contractRepository.ts` の `mapRow` 関数で `amount` と `startDate` の `?? null` フォールバックを削除する（L15-16）
- [ ] `contractRepository.create` の引数型で `amount` を `number`（optional なし）に変更し、`startDate` を `Date`（optional なし）に変更する
- [ ] `contractRepository.update` の Partial 型で `amount` を `number`（`null` なし）に、`startDate` を `Date`（`null` なし）に変更する
- [ ] `src/infrastructure/repositories/invoiceRepository.ts` の `mapRow` 関数に `issueDate: row.issueDate ?? null` を追加する
- [ ] `invoiceRepository.create` の引数に `issueDate?: Date | null` を追加し、values に含める
- [ ] `invoiceRepository.update` の Partial 型に `issueDate: Date | null` を追加する
- [ ] `invoiceRepository.mapRow` の `dueDate` から `?? null` フォールバックを削除する（NOT NULL のため）

**Acceptance Criteria**:
- contractRepository の create/update で amount と startDate が non-nullable 型を受け取る
- invoiceRepository の mapRow が issueDate を返す
- invoiceRepository の create/update が issueDate を扱える
- TypeScript コンパイルエラーがない

## T-06: createContract usecase にバリデーション追加

- [ ] `src/application/usecases/createContract.ts` に `validateContractAmount` と `validateContractDates` を import する
- [ ] `amount` の引数型を `number`（optional なし、nullable なし）に変更する
- [ ] `startDate` の引数型を `Date`（optional なし、nullable なし）に変更する
- [ ] Deal からのデフォルト値取得ロジックを更新する — `deal.estimatedAmount ?? 0` のような fallback ではなく、Deal に値がない場合は明示的にエラーを返すか、呼び出し元で必須入力にする。設計方針: amount と startDate は必須入力とし、Deal の値はデフォルト表示用にのみ使用する
- [ ] db.transaction の前に `validateContractAmount(amount)` を呼び、ok でなければ `{ ok: false, reason }` を返す
- [ ] db.transaction の前に `validateContractDates(startDate, endDate)` を呼び、ok でなければ `{ ok: false, reason }` を返す

**Acceptance Criteria**:
- amount ≤ 0 で createContract を呼ぶと `{ ok: false }` が返る
- startDate > endDate で createContract を呼ぶと `{ ok: false }` が返る
- 正常な入力で契約が作成される

## T-07: updateContract usecase にバリデーション追加

- [ ] `src/application/usecases/updateContract.ts` に `validateContractAmount` と `validateContractDates` を import する
- [ ] `amount` の引数型を `number | undefined`（null なし）に変更する
- [ ] `startDate` の引数型を `Date | undefined`（null なし）に変更する
- [ ] `amount` が undefined でない場合のみ `validateContractAmount(amount)` を呼ぶ
- [ ] 更新後の startDate と endDate を算出し（指定されたフィールドは新値、未指定は既存値を使用）、`validateContractDates` を呼ぶ
- [ ] repository.update の data から `amount: null` と `startDate: null` のケースを除外する

**Acceptance Criteria**:
- amount を 0 に更新しようとすると `{ ok: false }` が返る
- amount を含まない更新（title のみ等）は amount バリデーションをスキップして成功する
- startDate を endDate より後に更新しようとすると `{ ok: false }` が返る

## T-08: createInvoice usecase に issueDate 対応と日付バリデーション追加

- [ ] `src/application/usecases/createInvoice.ts` に `validateInvoiceDates` を import する
- [ ] 引数に `issueDate?: Date | null` を追加する
- [ ] `dueDate` の引数型を `Date`（non-nullable、必須）に変更する
- [ ] db.transaction の前に `validateInvoiceDates(data.issueDate ?? null, data.dueDate)` を呼び、ok でなければ `{ ok: false, reason }` を返す
- [ ] `invoiceRepository.create` の呼び出しに `issueDate` を渡す

**Acceptance Criteria**:
- issueDate > dueDate で createInvoice を呼ぶと `{ ok: false }` が返る
- issueDate = null で createInvoice を呼ぶと日付バリデーションがスキップされる
- 作成された Invoice に issueDate が正しく設定される

## T-09: updateInvoice usecase を新規作成する

- [ ] `src/application/usecases/updateInvoice.ts` を新規作成する
- [ ] `updateInvoice(data: { invoiceId, organizationId, actorId, title?, amount?, dueDate?, issueDate?, notes? })` を実装する
- [ ] `invoiceRepository.findById` で請求の存在を確認する
- [ ] `amount` が指定されている場合、`contractRepository.findById` で契約を取得し、one_time 契約かつ contract.amount が設定されている場合に合計金額チェックを実施する（SERIALIZABLE トランザクション内）
  - 合計金額の計算では、更新対象の請求の現在の金額を差し引き、新しい金額を加算する（`existingTotal - currentInvoice.amount + newAmount`）
- [ ] `issueDate` と `dueDate` の両方が確定している場合（指定値と既存値を組み合わせ）に `validateInvoiceDates` を呼ぶ
- [ ] `invoiceRepository.update` でフィールドを更新する
- [ ] `auditLogRepository.create` で監査ログを同一トランザクション内で記録する（action: `"invoice.update"`）
- [ ] `src/application/usecases/index.ts` に export を追加する

**Acceptance Criteria**:
- 単発契約の請求金額を増額して合計が契約金額を超える場合に `{ ok: false }` が返る
- 単発契約の請求金額を増額して合計が契約金額以内の場合に更新が成功する
- 定期契約の請求金額更新は合計チェックなしで成功する
- issueDate > dueDate の更新は `{ ok: false }` が返る
- 監査ログが同一トランザクション内で記録される

## T-10: Server Action のスキーマ・呼び出し更新（contracts）

- [ ] `src/app/actions/contracts.ts` の `createContractSchema` で `amount` を `z.coerce.number().int().positive()` に変更する（`.nonnegative()` → `.positive()`、`.optional()` を削除）
- [ ] `createContractSchema` で `startDate` を必須（`.optional()` を削除）にする
- [ ] `updateContractSchema` で `amount` を `z.coerce.number().int().positive().optional()`（`.nullable()` を削除）に変更する
- [ ] `updateContractSchema` で `startDate` を `z.string().optional()`（`.nullable()` を削除）に変更する
- [ ] `createContractAction` の `createContract` 呼び出しで `amount` と `startDate` を必須として渡す
- [ ] `updateContractAction` の `updateContract` 呼び出しで `amount: null` と `startDate: null` のケースを除外する

**Acceptance Criteria**:
- FormData に amount がない、または 0 以下の値で `createContractAction` を呼ぶとバリデーションエラーが返る
- FormData に startDate がない場合に `createContractAction` がバリデーションエラーを返す
- 更新時に amount を空文字列にしても null ではなく undefined として扱われ、バリデーションをスキップする

## T-11: Server Action のスキーマ・呼び出し更新（invoices）

- [ ] `src/app/actions/invoices.ts` の `createInvoiceSchema` に `issueDate: z.string().optional()` を追加する
- [ ] `createInvoiceSchema` の `dueDate` を必須にする（`z.string().min(1, "支払期限は必須です")`）
- [ ] `createInvoiceAction` の `createInvoice` 呼び出しに `issueDate` を渡す
- [ ] `createInvoiceAction` の `dueDate` を必須として渡す（`new Date(parsed.data.dueDate)`）
- [ ] `updateInvoiceAction` を新規作成する — `updateInvoice` usecase を呼び出す Server Action
- [ ] `updateInvoiceAction` の Zod スキーマで `title`, `amount`, `dueDate`, `issueDate`, `notes` を optional フィールドとして定義する
- [ ] `updateInvoiceAction` に認証・認可・レート制限チェックを含める

**Acceptance Criteria**:
- `createInvoiceAction` で dueDate が未指定の場合にバリデーションエラーが返る
- `createInvoiceAction` で issueDate を指定して請求が作成される
- `updateInvoiceAction` で金額を更新できる

## T-12: typecheck と test の確認

- [ ] `bun run typecheck` が型エラーなしで完了する
- [ ] `bun run test` が全テスト green で完了する
- [ ] 既存の `src/__tests__/domain/invoiceTransition.test.ts` が引き続き pass する

**Acceptance Criteria**:
- `bun run typecheck && bun run test` が exit 0 で完了する
