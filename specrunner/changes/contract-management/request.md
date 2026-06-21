# 契約管理

## Meta

- **type**: new-feature
- **slug**: contract-management
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 新テーブル追加だが既存パターン（テーブル + CRUD + UI）の踏襲であり、新しい port/adapter やアーキテクチャパターンの導入ではない → false -->

## 背景

案件（Deal）が受注（won）した後、契約情報を管理する仕組みがない。受注金額・契約期間・契約種別・支払条件を記録し、案件の受注後のライフサイクルを管理する Contract ドメインを導入する。

## 現状コードの前提

<!-- 現状のコードについての断定（「今のコードはこうなっている」）は file:line を伴ってこの節に書く。 -->

- `src/infrastructure/schema.ts:49-55` — `dealPhaseEnum`: `["proposal_prep", "proposed", "negotiation", "won", "lost"]`。won が受注確定の終端状態
- `src/infrastructure/schema.ts:303-330` — `deals` テーブルに `clientId` (NOT NULL FK to clients) がある（line 310-312）。`estimateRequestId` も残存（line 320-322）
- `src/infrastructure/schema.ts:628` — ファイル最終行
- `src/domain/models/deal.ts:20-38` — `Deal` 型: `clientId: string`, `inquiryId: string | null`, `phase: DealPhase`, `estimatedAmount: number | null`, `contractType: ContractType | null`
- `src/domain/models/index.ts:24` — `DealPhase`, `ContractType`, `Deal`, `DealWithDetails`, `DealContactRole`, `DealContact` を export
- `src/app/(dashboard)/layout.tsx:25-48` — ナビ: 顧客 > 引き合い > 案件 > 申請一覧
- `src/app/(dashboard)/labels.ts:32-36` — `contractTypeLabels`: quasi_delegation/fixed_price/ses
- `src/infrastructure/seed.ts:37-57` — truncation 順序。deals の前に dealContacts を削除
- `src/infrastructure/seed.ts:931` — ファイル最終行
- `src/infrastructure/repositories/index.ts:1-15` — 15 リポジトリの namespace export
- `src/application/usecases/index.ts:1-35` — 35 ユースケースの export
- `src/__tests__/static/projectStructure.test.ts:102-116` — ドメインモデルファイル一覧
- `src/__tests__/static/projectStructure.test.ts:1206` — ファイル最終行

## 要件

<!-- コツ: 実装の最重量部（既存機構の一般化・暗黙の前提の変更）は行間に隠さず要件として名指しする。 -->

1. **contractStatusEnum 追加**: `["active", "completed", "cancelled"]`
2. **renewalTypeEnum 追加**: `["one_time", "recurring"]`
3. **contracts テーブル追加**: カラム: id (uuid PK), organizationId (FK to organizations, NOT NULL), dealId (FK to deals, NOT NULL), clientId (FK to clients, NOT NULL), title (text, NOT NULL), contractType (text, nullable — Deal から引き継ぎ), amount (integer, nullable — 契約金額), startDate (timestamp, nullable), endDate (timestamp, nullable), paymentTerms (text, nullable — 支払条件), renewalType (renewalTypeEnum, NOT NULL, default "one_time"), renewalCycle (text, nullable — "monthly" | "yearly"), status (contractStatusEnum, NOT NULL, default "active"), createdAt, updatedAt。1 Deal に対して Contract は1件のみ（unique 制約: dealId）
4. **ドメインモデル追加**: `src/domain/models/contract.ts` に `ContractStatus` 型（`"active" | "completed" | "cancelled"`）、`RenewalType` 型（`"one_time" | "recurring"`）、`Contract` 型を追加する。`src/domain/models/index.ts` に追記する
5. **リポジトリ追加**: `src/infrastructure/repositories/contractRepository.ts` を追加する。メソッド: create, findById, findByDealId, findAllByOrganization, update。全クエリに organizationId 条件。トランザクション対応。`src/infrastructure/repositories/index.ts` に追記する
6. **ユースケース追加**: `src/application/usecases/` に以下を追加する。全ユースケースで監査ログ記録。`src/application/usecases/index.ts` に追記する
   - `createContract.ts` — 契約を作成する。dealId 必須。Deal が won フェーズであることを検証する。Deal に既に Contract が存在しないことを検証する（`contractRepository.findByDealId`）。Deal の情報（title, contractType, estimatedAmount, estimatedStartDate, estimatedEndDate, clientId）を初期値として引き継ぐ。操作者は admin または manager
   - `updateContract.ts` — 契約情報を更新する（title, contractType, amount, startDate, endDate, paymentTerms, renewalType, renewalCycle）。操作者は admin または manager
   - `updateContractStatus.ts` — 契約ステータスを変更する。active → completed / cancelled のみ許可。completed / cancelled は終端状態。操作者は admin または manager
   - `listContracts.ts` — 組織内の契約一覧を返す
   - `getContract.ts` — 契約詳細を返す
7. **Server Actions 追加**: `src/app/actions/contracts.ts` を追加する。`"use server"` 宣言、認証チェック、Zod バリデーション、レート制限。契約の作成・更新・ステータス変更は admin と manager のみ
8. **UI ページ追加**:
   - `/contracts` — 契約一覧ページ。DataTable で契約名・顧客名・契約種別・金額・ステータスを表示。ステータスフィルタ
   - `/contracts/[id]` — 契約詳細ページ。契約情報、関連案件へのリンク、ステータス変更ボタン、編集リンク
   - `/contracts/[id]/edit` — 契約編集ページ
   - 案件詳細ページ（`/deals/[id]`）に契約セクションを追加する。won フェーズで契約が未作成の場合は「契約を作成」ボタンを表示する。契約が存在する場合は契約へのリンクを表示する
9. **ナビゲーション追加**: ダッシュボード `layout.tsx` のヘッダーナビに「契約」（`/contracts`）を追加する。「案件」の後、「申請一覧」の前に配置する。全ロールに表示する
10. **labels.ts にラベル追加**: `contractStatusLabels = { active: "契約中", completed: "完了", cancelled: "解約" }` と `renewalTypeLabels = { one_time: "スポット", recurring: "定期" }` を追加する
11. **Relations 定義追加**: `contractsRelations` を追加する（organization, deal, client への one()）。`dealsRelations` に `contract: one(contracts)` を追加する。`organizationsRelations` と `clientsRelations` に `contracts: many(contracts)` を追加する
12. **シードデータ追加**: won フェーズの案件（DX推進プロジェクト）に対して Contract を1件追加する。status: active, renewalType: one_time, amount: 30000000。テーブル truncation 順序に `contracts` を `deals` の前に追加する
13. **テスト追加**: `projectStructure.test.ts` のモデルファイル一覧に `contract.ts` を追記する。テナント分離テストに `contractRepository` を追加する
14. **マイグレーションファイルを生成する**: `bunx drizzle-kit generate` を実行する

## スコープ外

- Invoice（請求）ドメイン — Request 3 で対応
- 契約の PDF 生成
- 契約更新の自動化
- 契約と承認ワークフローの連携

## 受け入れ基準

<!-- コツ: 機械検証できる文にする -->

- [ ] `bun run build` が成功する
- [ ] `bun test` が全件 green
- [ ] `contracts` テーブルが `schema.ts` に定義されている
- [ ] `contractStatusEnum` が `["active", "completed", "cancelled"]` で定義されている
- [ ] `renewalTypeEnum` が `["one_time", "recurring"]` で定義されている
- [ ] Contract 作成時に Deal が won フェーズでなければエラーが返る
- [ ] 同一 Deal に対して2件目の Contract を作成しようとした場合にエラーが返る
- [ ] Contract 作成時に Deal の情報（title, contractType, estimatedAmount 等）が引き継がれる
- [ ] ステータス遷移テスト: active → completed が許可される
- [ ] ステータス遷移テスト: active → cancelled が許可される
- [ ] ステータス遷移テスト: completed → active が拒否される
- [ ] 全リポジトリの新規クエリに organizationId 条件が付与されている
- [ ] 契約の作成・更新・ステータス変更で監査ログが記録される
- [ ] ダッシュボードヘッダーに「契約」のナビリンクが表示される
- [ ] 案件詳細に契約セクションが表示される（won 時に作成ボタン / 既存なら リンク）
- [ ] マイグレーションファイルが生成されている
- [ ] 依存方向 `actions → usecases → domain / infrastructure` を遵守
- [ ] `typecheck` が green

## architect 評価済みの設計判断

<!-- コツ: 採用した判断に加え、却下した代替案とその理由を書く。 -->

1. **1 Deal = 1 Contract（unique 制約）を採用、1:N を却下** — 追加発注は別 Deal → 別 Contract として管理する。1つの受注に複数の契約が紐づくケースは実務上稀であり、シンプルさを優先する
2. **Contract に clientId を直接持たせるを採用、Deal 経由の間接参照を却下** — 契約一覧で顧客名を表示する際に Deal を経由する JOIN が不要になる。Deal と Contract の顧客は常に一致するため冗長だが、クエリのシンプルさを優先する
3. **contractType を Deal と同じ text 型で管理を採用** — Deal から引き継ぐ値であり、型の一貫性を保つ。将来 enum 化する場合は Deal と Contract を同時に移行する
4. **renewalType を enum で管理を採用、text を却下** — one_time / recurring の2値は固定であり変動しない。DB レベルで制約する意味がある
