# Tasks: deal-flexibility

## T-01: DB スキーマ変更 — deals テーブルに clientId 追加、inquiryId を nullable 化、unique 制約削除

- [ ] `src/infrastructure/schema.ts` — `deals.inquiryId` の `.notNull()` を削除する（nullable にする）
- [ ] `src/infrastructure/schema.ts` — `deals` テーブルに `clientId: uuid("client_id").notNull().references(() => clients.id)` を追加する（`inquiryId` の直下に配置）
- [ ] `src/infrastructure/schema.ts` — `unique("deals_inquiry_id_unique").on(table.inquiryId)` を削除する

**Acceptance Criteria**:
- `deals.inquiryId` が nullable である（`.notNull()` なし）
- `deals.clientId` が NOT NULL で `clients.id` への FK を持つ
- `deals_inquiry_id_unique` 制約が存在しない
- `typecheck` が green

## T-02: ドメインモデル変更 — Deal 型と DealWithDetails 型

- [ ] `src/domain/models/deal.ts` — `Deal` 型の `inquiryId: string` を `inquiryId: string | null` に変更する
- [ ] `src/domain/models/deal.ts` — `Deal` 型に `clientId: string` フィールドを追加する
- [ ] `src/domain/models/deal.ts` — `DealWithInquiry` を `DealWithDetails` に改名する。`inquiryTitle: string` を `inquiryTitle: string | null` に変更する
- [ ] `src/domain/models/index.ts` — エクスポートの `DealWithInquiry` を `DealWithDetails` に変更する

**Acceptance Criteria**:
- `Deal.inquiryId` が `string | null` 型である
- `Deal.clientId` が `string` 型である
- `DealWithInquiry` が存在せず `DealWithDetails` が存在する
- `DealWithDetails.inquiryTitle` が `string | null` 型である
- `typecheck` が green

## T-03: ドメインサービス変更 — dealTransition の終端チェック化

- [ ] `src/domain/services/dealTransition.ts` — `VALID_TRANSITIONS` マップを削除する
- [ ] `src/domain/services/dealTransition.ts` — `canTransition(from, to)` を書き換える: `from` が `won` / `lost` でなく、`to` が有効な `DealPhase` であり、`from !== to` の場合に `true` を返す

**Acceptance Criteria**:
- `canTransition("proposal_prep", "negotiation")` が `true`（スキップ可）
- `canTransition("proposed", "proposal_prep")` が `true`（巻き戻し可）
- `canTransition("won", "negotiation")` が `false`
- `canTransition("lost", "proposal_prep")` が `false`
- `canTransition("proposed", "proposed")` が `false`（同一フェーズ不可）

## T-04: リポジトリ変更 — dealRepository.create のシグネチャ修正

- [ ] `src/infrastructure/repositories/dealRepository.ts` — `create` メソッドの `data` パラメータに `clientId: string` を追加する（必須）
- [ ] `src/infrastructure/repositories/dealRepository.ts` — `create` メソッドの `data` パラメータの `inquiryId` を `inquiryId?: string` に変更する（optional）
- [ ] `src/infrastructure/repositories/dealRepository.ts` — `create` メソッドの `values` オブジェクトに `clientId: data.clientId` を追加し、`inquiryId` を `data.inquiryId ?? null` にする

**Acceptance Criteria**:
- `create` に `clientId` が必須パラメータとして存在する
- `create` に `inquiryId` なしで呼び出し可能
- 作成されたレコードに `clientId` が設定される
- `typecheck` が green

## T-05: リポジトリ変更 — dealRepository.findAllByOrganization の JOIN 修正

- [ ] `src/infrastructure/repositories/dealRepository.ts` — `findAllByOrganization` の `innerJoin(inquiries, eq(deals.inquiryId, inquiries.id))` を `leftJoin(inquiries, eq(deals.inquiryId, inquiries.id))` に変更する
- [ ] `src/infrastructure/repositories/dealRepository.ts` — `innerJoin(clients, eq(inquiries.clientId, clients.id))` を `innerJoin(clients, eq(deals.clientId, clients.id))` に変更する（deals.clientId で直接 JOIN）
- [ ] `src/infrastructure/repositories/dealRepository.ts` — 返却型を `DealWithInquiry[]` から `DealWithDetails[]` に変更する
- [ ] `src/infrastructure/repositories/dealRepository.ts` — `mapRow` に `clientId` マッピングを追加する（`clientId: row.clientId`）
- [ ] `src/infrastructure/repositories/dealRepository.ts` — `mapRow` の `inquiryId` マッピングを `row.inquiryId ?? null` に変更する
- [ ] `src/infrastructure/repositories/dealRepository.ts` — import 文の `DealWithInquiry` を `DealWithDetails` に変更する

**Acceptance Criteria**:
- `findAllByOrganization` が `DealWithDetails[]` を返す
- 引き合いなし案件（`inquiryId` = null）が正しく返される（`inquiryTitle` = null）
- clients の JOIN が `deals.clientId` 経由である
- inquiries が LEFT JOIN である
- `typecheck` が green

## T-06: ユースケース変更 — createDeal の2パターン対応

- [ ] `src/application/usecases/createDeal.ts` — `createDeal` の `data` パラメータで `inquiryId` を optional（`inquiryId?: string`）に変更する
- [ ] `src/application/usecases/createDeal.ts` — `data` パラメータに `clientId?: string` を追加する
- [ ] `src/application/usecases/createDeal.ts` — パターン (a) `inquiryId` 指定あり: 既存の引き合い存在確認 + converted チェック + 重複チェックを維持。`inquiry.clientId` が null の場合は `{ ok: false, reason: "案件化するには顧客の登録が必要です" }` を返す。`clientId` を `inquiry.clientId` にセット
- [ ] `src/application/usecases/createDeal.ts` — パターン (b) `inquiryId` 指定なし: `clientId` が未指定の場合はエラーを返す。引き合いチェックをスキップ
- [ ] `src/application/usecases/createDeal.ts` — 両パターンとも `dealRepository.create` に `clientId` を渡す

**Acceptance Criteria**:
- `inquiryId` なし + `clientId` ありで案件を作成できる
- `inquiryId` あり + `inquiry.clientId` が null でエラーが返る
- `inquiryId` ありの場合、既存の converted チェック + 重複チェックが動作する
- `inquiryId` なし + `clientId` なしでエラーが返る
- 監査ログが従来通り記録される

## T-07: ユースケース変更 — updateInquiryStatus の converted 遷移修正

- [ ] `src/application/usecases/updateInquiryStatus.ts` — converted 遷移の `dealRepository.create` 呼び出しに `clientId: inquiry.clientId` を追加する
- [ ] `src/application/usecases/updateInquiryStatus.ts` — `inquiry.clientId` が null の場合、`dealRepository.create` の前に `{ ok: false, reason: "案件化するには顧客の登録が必要です" }` を返す

**Acceptance Criteria**:
- converted 遷移で作成された Deal に `clientId` が設定される
- `inquiry.clientId` が null の場合エラーが返る
- 既存の状態遷移チェック・楽観ロック・監査ログは維持される

## T-08: Server Actions 変更 — createDealAction のスキーマ修正

- [ ] `src/app/actions/deals.ts` — `createDealSchema` の `inquiryId` を `z.string().uuid().optional()` に変更する
- [ ] `src/app/actions/deals.ts` — `createDealSchema` に `clientId: z.string().uuid().optional()` を追加する
- [ ] `src/app/actions/deals.ts` — `createDealAction` でバリデーション追加: `inquiryId` も `clientId` もない場合はエラーを返す
- [ ] `src/app/actions/deals.ts` — `createDeal` usecase 呼び出しに `clientId` を渡す
- [ ] `src/app/actions/deals.ts` — `DealWithInquiry` の import と `listDealsAction` の返却型を `DealWithDetails` に変更する
- [ ] `src/app/actions/deals.ts` — `CreateDealState` の `errors` に `clientId?: string[]` を追加する
- [ ] `src/app/actions/deals.ts` — `revalidatePath` の `inquiryId` 参照を null ガードする（`inquiryId` が undefined の場合は `/inquiries/` の revalidate をスキップ）

**Acceptance Criteria**:
- `inquiryId` なし + `clientId` ありでフォーム送信が成功する
- `inquiryId` なし + `clientId` なしでバリデーションエラーが返る
- `DealWithDetails` 型で返却される
- `typecheck` が green

## T-09: UI 変更 — 案件一覧に新規作成ボタンを追加

- [ ] `src/app/(dashboard)/deals/page.tsx` — `PageToolbar` に `/deals/new` へのリンクを追加する（既存プロジェクトの他一覧ページのパターンに合わせる）
- [ ] `src/app/(dashboard)/deals/page.tsx` — `DealWithInquiry` の import と `DataTable` のジェネリック型を `DealWithDetails` に変更する

**Acceptance Criteria**:
- 案件一覧ページに新規作成ボタンが表示される
- リンク先が `/deals/new` である
- `DealWithDetails` 型が使用されている

## T-10: UI 変更 — 案件作成ページの修正（直接作成対応）

- [ ] `src/app/(dashboard)/deals/new/page.tsx` — `inquiryId` パラメータの有無で分岐する。パラメータなしの場合は顧客選択プルダウンを表示する
- [ ] `src/app/(dashboard)/deals/new/page.tsx` — 顧客一覧を取得する Server Action またはデータフェッチを追加する（`clientRepository.findAllByOrganization` 相当）
- [ ] `src/app/(dashboard)/deals/new/page.tsx` — `inquiryId` がない場合の「キャンセル」リンクを `/deals` に変更する
- [ ] `src/app/(dashboard)/deals/new/page.tsx` — フォームに `clientId` hidden フィールドまたは select フィールドを追加する

**Acceptance Criteria**:
- `/deals/new`（パラメータなし）で顧客選択プルダウンが表示される
- `/deals/new?inquiryId=<uuid>` で既存の動作を維持する（hidden inquiryId）
- 顧客未選択でサブミットするとバリデーションエラーになる
- タイトルと想定金額の入力フィールドは両パターンで共通

## T-11: UI 変更 — 案件詳細ページの修正（inquiryId nullable 対応）

- [ ] `src/app/(dashboard)/deals/[id]/page.tsx` — `inquiryRepository.findById(deal.inquiryId, organizationId)` を `deal.inquiryId ? inquiryRepository.findById(deal.inquiryId, organizationId) : null` に変更する（null ガード）
- [ ] `src/app/(dashboard)/deals/[id]/page.tsx` — 顧客取得を `inquiry?.clientId` 経由から `deal.clientId` 直接参照に変更する: `clientRepository.findById(deal.clientId, organizationId)`
- [ ] `src/app/(dashboard)/deals/[id]/page.tsx` — 顧客担当者取得も `deal.clientId` 経由に変更する: `clientRepository.findContactsByClientId(deal.clientId)`
- [ ] `src/app/(dashboard)/deals/[id]/page.tsx` — 「引き合い」リンクを `deal.inquiryId` が null の場合は非表示にする（条件付きレンダリング）
- [ ] `src/app/(dashboard)/deals/[id]/page.tsx` — `DealContactsSection` の `clientId` prop を `deal.clientId` に変更する

**Acceptance Criteria**:
- 引き合いなし案件（`inquiryId` = null）の詳細ページが正常に表示される
- 引き合いリンクが非表示になる
- 顧客情報が `deal.clientId` 経由で正しく取得・表示される
- 引き合いあり案件の表示は従来通り

## T-12: usecase エクスポートと型参照の追従修正

- [ ] `src/application/usecases/listDeals.ts` — `DealWithInquiry` の import を `DealWithDetails` に変更し、返却型を更新する
- [ ] `src/domain/services/index.ts` — `canDealTransition` のエクスポートは変更なし（関数名は維持）

**Acceptance Criteria**:
- `listDeals` の返却型が `DealWithDetails[]` である
- `typecheck` が green

## T-13: シードデータ修正

- [ ] `src/infrastructure/seed.ts` — 既存の5件の deal に `clientId` を追加する。各 deal に対応する inquiry の `clientId` と同じ値を指定する（`convertedInquiry1.clientId` → `yamato.id` 等）
- [ ] `src/infrastructure/seed.ts` — 引き合いなし案件を1件追加する: 既存顧客（例: `techClient`）に対して `inquiryId` なし、`clientId` のみで直接作成。phase は `proposal_prep`

**Acceptance Criteria**:
- 全既存 deal に `clientId` が設定されている
- 引き合いなし案件が1件シードされている（`inquiryId` なし）
- シード実行が成功する

## T-14: Drizzle マイグレーション生成

- [ ] `bunx drizzle-kit generate` を実行してマイグレーションファイルを生成する

**Acceptance Criteria**:
- `drizzle/` ディレクトリにマイグレーションファイルが生成されている
- マイグレーション SQL に `client_id` カラム追加、`inquiry_id` の NOT NULL 削除、`deals_inquiry_id_unique` 制約削除が含まれる

## T-15: 既存テストの追従修正

- [ ] `src/__tests__/usecases/dealManagement.test.ts` — `DealWithInquiry` → `DealWithDetails` の型名参照があれば更新する
- [ ] `src/__tests__/usecases/dealManagement.test.ts` — dealTransition 関連のテスト（`canDealTransition` / `canTransition`）を終端チェックのみのロジックに合わせて更新する
- [ ] `src/__tests__/usecases/dealManagement.test.ts` — createDeal テストに引き合いなし作成パターン（`clientId` のみ指定）の静的検証を追加する
- [ ] `src/__tests__/static/projectStructure.test.ts` — deal テナント分離テストに `clientId` 関連のアサーションが必要か確認し、必要であれば追加する

**Acceptance Criteria**:
- `bun test` が全件 green
- 遷移テストがスキップ・巻き戻しの許可を検証する
- 引き合いなし案件の作成パターンがテストされている

## T-16: ビルド検証

- [ ] `bun run build` が成功することを確認する
- [ ] `bun test` が全件 green であることを確認する

**Acceptance Criteria**:
- `bun run build` が成功する
- `bun test` が全件 green
- `typecheck` が green
