# 請求管理

## Meta

- **type**: new-feature
- **slug**: invoice-management
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 既存パターン（テーブル + CRUD + UI）の踏襲。新しいアーキテクチャパターンではない → false -->

## 背景

契約（Contract）が作成されたが、請求情報を管理する仕組みがない。契約に紐づく請求スケジュール（分割請求）を管理し、請求のステータス（予定→請求済→入金済）を追跡する Invoice ドメインを導入する。

one_time 契約では請求合計が契約金額を超えないことを検証する。recurring 契約では合計金額の上限チェックは行わない。

## 現状コードの前提

<!-- 現状のコードについての断定（「今のコードはこうなっている」）は file:line を伴ってこの節に書く。 -->

- `src/infrastructure/schema.ts:56-60` — `contractStatusEnum`: `["active", "completed", "cancelled"]`
- `src/infrastructure/schema.ts:61` — `renewalTypeEnum`: `["one_time", "recurring"]`
- `src/infrastructure/schema.ts:359-385` — `contracts` テーブル: dealId, clientId, title, contractType, amount (integer, nullable), renewalType, status 等。unique 制約 `contracts_deal_id_unique` on dealId（line 384）
- `src/infrastructure/schema.ts:681` — ファイル最終行
- `src/domain/models/contract.ts:5-21` — `Contract` 型: `amount: number | null`, `renewalType: RenewalType`, `status: ContractStatus`
- `src/domain/models/contract.ts:23-24` — `ContractWithClient = Contract & { clientName: string }`
- `src/domain/models/index.ts:25` — `ContractStatus`, `RenewalType`, `Contract`, `ContractWithClient` を export
- `src/infrastructure/repositories/contractRepository.ts:27` — `create` メソッド
- `src/infrastructure/repositories/contractRepository.ts:63` — `findById` メソッド
- `src/infrastructure/repositories/contractRepository.ts:77` — `findByDealId` メソッド
- `src/infrastructure/repositories/index.ts:16` — `contractRepository` を export
- `src/application/usecases/index.ts:35-39` — `createContract`, `updateContract`, `updateContractStatus`, `listContracts`, `getContract` を export
- `src/app/(dashboard)/labels.ts:45-54` — `contractStatusLabels` と `renewalTypeLabels` が定義済み
- `src/app/(dashboard)/layout.tsx:43-48` — ナビに「契約」（`/contracts`）が配置済み
- `src/infrastructure/seed.ts:38-60` — truncation 順序: contracts は deals の前
- `src/infrastructure/seed.ts:918-931` — contracts シード1件（DX推進プロジェクト、one_time、amount: 30000000）
- `src/infrastructure/seed.ts:949` — ファイル最終行
- `src/__tests__/static/projectStructure.test.ts:102-117` — モデルファイル一覧に `contract.ts` 含む
- `src/__tests__/static/projectStructure.test.ts:1260` — ファイル最終行

## 要件

<!-- コツ: 実装の最重量部（既存機構の一般化・暗黙の前提の変更）は行間に隠さず要件として名指しする。 -->

1. **invoiceStatusEnum 追加**: `["scheduled", "invoiced", "paid", "overdue"]`
2. **invoices テーブル追加**: カラム: id (uuid PK), organizationId (FK to organizations, NOT NULL), contractId (FK to contracts, NOT NULL), title (text, NOT NULL — 「着手金」「○月分稼働」等), amount (integer, NOT NULL — 請求金額), dueDate (timestamp, nullable — 支払期日), status (invoiceStatusEnum, NOT NULL, default "scheduled"), invoicedAt (timestamp, nullable — 請求書発行日), paidAt (timestamp, nullable — 入金日), notes (text, nullable), createdAt, updatedAt
3. **ドメインモデル追加**: `src/domain/models/invoice.ts` に `InvoiceStatus` 型（`"scheduled" | "invoiced" | "paid" | "overdue"`）、`Invoice` 型を追加する。`src/domain/models/index.ts` に追記する
4. **リポジトリ追加**: `src/infrastructure/repositories/invoiceRepository.ts` を追加する。メソッド: create, findById, findAllByContract (contractId + organizationId), update, updateStatus。全クエリに organizationId 条件。`src/infrastructure/repositories/index.ts` に追記する。追加メソッド: `sumAmountByContract(contractId, organizationId)` — 契約に紐づく全請求の金額合計を返す（one_time 契約の上限チェック用）
5. **ユースケース追加**: `src/application/usecases/` に以下を追加する。全ユースケースで監査ログ記録。`src/application/usecases/index.ts` に追記する
   - `createInvoice.ts` — 請求を作成する。contractId 必須。契約が active であることを検証する。one_time 契約の場合: 既存請求の合計金額 + 新規請求金額が契約金額を超えないことを検証する（`invoiceRepository.sumAmountByContract` で既存合計を取得し、`contract.amount` と比較。contract.amount が null の場合はチェックをスキップ）。recurring 契約の場合: 合計金額チェックをスキップする
   - `updateInvoiceStatus.ts` — 請求ステータスを変更する。遷移ルール: scheduled → invoiced（請求書発行。invoicedAt を現在日時にセット）、invoiced → paid（入金確認。paidAt を現在日時にセット）、invoiced → overdue（支払期日超過）。scheduled, paid, overdue からの遷移は不可（paid と overdue は終端状態。scheduled からは invoiced のみ）
   - `listInvoicesByContract.ts` — 契約に紐づく請求一覧を返す
6. **Server Actions 追加**: `src/app/actions/invoices.ts` を追加する。`"use server"` 宣言、認証チェック、Zod バリデーション、レート制限。請求の作成・ステータス変更は admin と manager のみ
7. **UI**:
   - 契約詳細ページ（`/contracts/[id]`）に「請求一覧」セクションを追加する。DataTable で請求名・金額・支払期日・ステータスを表示する。「請求を追加」ボタンを配置する。請求サマリー（請求済合計 / 入金済合計 / 未請求合計）を表示する
   - 請求追加フォーム: 契約詳細ページ内のモーダルまたはインラインフォームで、タイトル・金額・支払期日を入力する
   - 請求ステータス変更: 請求一覧の各行にステータス変更ボタンを配置する（scheduled → 「請求書発行」、invoiced → 「入金確認」/「期日超過」）
   - 行クリックで請求詳細は不要（一覧上で完結する）
8. **labels.ts にラベル追加**: `invoiceStatusLabels = { scheduled: "予定", invoiced: "請求済", paid: "入金済", overdue: "期日超過" }` を追加する
9. **Relations 定義追加**: `invoicesRelations` を追加する（organization, contract への one()）。`contractsRelations` に `invoices: many(invoices)` を追加する。`organizationsRelations` に `invoices: many(invoices)` を追加する
10. **シードデータ追加**: DX推進プロジェクトの契約に対して請求3件を追加する: 着手金 900万（paid）、中間金 900万（invoiced）、残金 1200万（scheduled）。テーブル truncation 順序に `invoices` を `contracts` の前に追加する
11. **テスト追加**: `projectStructure.test.ts` のモデルファイル一覧に `invoice.ts` を追記する。テナント分離テストに `invoiceRepository` を追加する
12. **マイグレーションファイルを生成する**: `bunx drizzle-kit generate` を実行する

## スコープ外

- 請求書の PDF 生成・出力
- 入金管理の詳細（部分入金、振込手数料）
- 定期契約の自動請求生成
- 請求と承認ワークフローの連携
- 請求の編集（金額変更）— 作成後は金額固定。間違えた場合はキャンセルして再作成
- 独立した請求一覧ページ（契約詳細ページ内で完結）

## 受け入れ基準

<!-- コツ: 機械検証できる文にする -->

- [ ] `bun run build` が成功する
- [ ] `bun test` が全件 green
- [ ] `invoices` テーブルが `schema.ts` に定義されている
- [ ] `invoiceStatusEnum` が `["scheduled", "invoiced", "paid", "overdue"]` で定義されている
- [ ] one_time 契約で請求合計が契約金額を超える場合にエラーが返る
- [ ] recurring 契約で請求合計のチェックがスキップされる
- [ ] ステータス遷移テスト: scheduled → invoiced が許可される
- [ ] ステータス遷移テスト: invoiced → paid が許可される
- [ ] ステータス遷移テスト: invoiced → overdue が許可される
- [ ] ステータス遷移テスト: paid → invoiced が拒否される
- [ ] ステータス遷移テスト: scheduled → paid が拒否される
- [ ] invoiced 遷移時に invoicedAt が自動セットされる
- [ ] paid 遷移時に paidAt が自動セットされる
- [ ] 契約詳細に請求一覧セクションが表示される
- [ ] 請求サマリー（請求済/入金済/未請求）が表示される
- [ ] 全リポジトリの新規クエリに organizationId 条件が付与されている
- [ ] マイグレーションファイルが生成されている
- [ ] 依存方向 `actions → usecases → domain / infrastructure` を遵守
- [ ] `typecheck` が green

## architect 評価済みの設計判断

<!-- コツ: 採用した判断に加え、却下した代替案とその理由を書く。 -->

1. **請求を契約詳細ページ内で管理を採用、独立した請求一覧ページを却下** — 請求は常に契約のコンテキストで見る。独立ページだと契約との関係が見えにくい。契約詳細に請求一覧 + サマリーを表示するのが自然
2. **one_time のみ合計金額チェックを採用、全契約でチェックを却下** — recurring 契約は期間に応じて請求が無限に追加される。合計金額の上限を設けると運用が破綻する
3. **請求の金額変更を不可にするを採用、編集可能を却下** — 請求金額の変更は監査上の問題がある。間違えた場合はキャンセル（将来実装）して再作成する運用のほうが追跡性が高い
4. **overdue を手動遷移にするを採用、自動検出を却下** — 支払期日の自動判定には cron ジョブが必要であり、初期段階では過剰。手動で「期日超過」に変更する運用で十分
5. **sumAmountByContract を専用メソッドとして実装を採用、全請求取得して JS で集計を却下** — DB レベルで SUM を実行するほうがパフォーマンスが良く、大量の請求があっても効率的
