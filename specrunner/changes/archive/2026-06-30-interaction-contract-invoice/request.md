# 契約調整・請求調整の顧客接点を契約/請求から記録する

## Meta

- **type**: spec-change
- **slug**: interaction-contract-invoice
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 既存の Interaction（顧客接点）に対し、kind=contract_adjustment / invoice_adjustment の記録 usecase・action・UI を追加するだけ。スキーマ変更・新しい port/adapter は無いため false。 -->

## 背景

設計（`docs/design/01-domain-design.md` §4.3、`docs/usecases/contract.md`・`invoice.md`、`docs/design/screens/contract.md`・`invoice.md`、§3 スコープ外）に従い、**契約・請求に関するやり取り（契約調整＝contract_adjustment／請求調整＝invoice_adjustment）を、契約・請求の詳細画面から顧客接点（Interaction）として記録**できるようにする。記録した接点は案件のタイムライン（アクティビティ）にも表示される。`interactions` テーブル・`interaction_kind` enum（contract_adjustment/invoice_adjustment）・`contract_id`/`invoice_id` 関連先 FK は既に存在する（前リクエストで実装済）ため、**スキーマ変更は不要**。

**境界**: 請求・契約は既存エンティティ（重複させない・参照のみ）。**消込・督促・回収（AR/債権管理）は作らない**。本リクエストは「やり取りの記録」までに閉じる。

## 現状コードの前提

- `src/infrastructure/schema.ts` `interactions`: `kind`(interaction_kind: meeting/call/email/contract_adjustment/invoice_adjustment) / 関連先 FK `deal_id`/`inquiry_id`/`contract_id`/`invoice_id`/`client_id`（いずれか1つ以上 NOT NULL の CHECK）/ `date` / `summary` / `details`(jsonb) / `attendees`(jsonb) / `created_by_id` / `version` 等。**追加カラムは不要**。
- `src/infrastructure/repositories/interactionRepository.ts`: 顧客接点の create / find 系。関連先別の取得（findAllByDeal / findAllByInquiry 等）あり。**contract / invoice 関連先での取得は要追加**。
- 顧客接点の作成は `interaction.create`（metadata に `kind`）で監査記録される（実装済）。タイムライン（`getDealActivity`）と通知は `interaction.create` を表示対象に含む（実装済）。
- 契約詳細: `src/app/(dashboard)/contracts/[id]/page.tsx`。請求詳細: `src/app/(dashboard)/contracts/[id]/invoices/[invoiceId]/page.tsx`。いずれもやり取り記録セクションは未実装。
- 認可: `src/domain/authorization.ts`。契約操作は admin/manager、請求操作は admin/finance（顧客接点の「記録」はこれらとは別概念として定める）。

## 要件

1. **usecase（記録・一覧）**:
   - 契約調整の記録: `kind=contract_adjustment`・`contractId` 必須の Interaction を作成する usecase（`{ contractId, organizationId, actorId, summary, date?, details? }`）。`interaction.create`（metadata.kind=contract_adjustment）を記録。
   - 請求調整の記録: `kind=invoice_adjustment`・`invoiceId` 必須の Interaction を作成する usecase（`{ invoiceId, organizationId, actorId, summary, date?, details? }`）。`interaction.create`（metadata.kind=invoice_adjustment）を記録。
   - 一覧: 契約に紐づく顧客接点（`interactionRepository.findAllByContract`）、請求に紐づく顧客接点（`findAllByInvoice`）を取得する usecase。
2. **認可**: 顧客接点の「記録」は契約・請求エンティティへの「操作」とは別概念として定める。`contract_adjustment` の記録は admin/manager/member、`invoice_adjustment` の記録は admin/manager/finance（`src/domain/authorization.ts` に追加）。
3. **Server Action**: 契約調整・請求調整の記録 action（auth 認証、上記認可、organizationId/actorId は session 由来、zod 検証、contractId/invoiceId は入力から受けるが所属の検証あり）。
4. **UI**:
   - 契約詳細に「契約調整（やり取り）」セクションを追加。この契約に紐づく contract_adjustment の顧客接点を新しい順に表示し、「契約調整を記録」フォーム（日時・要約・任意メモ）を置く。
   - 請求詳細に「請求調整（やり取り）」セクションを追加。invoice_adjustment の顧客接点を表示・記録。
5. **タイムライン統合**: 案件タイムライン（`getDealActivity`）に、その案件配下の契約・請求に紐づく顧客接点（contract_adjustment / invoice_adjustment の `interaction.create`）も表示する。`getDealActivity` の targets に、案件の契約・請求に紐づく interaction を含める（`findAllByContract` / `findAllByInvoice` で取得し `{ targetType: "interaction", targetId }` を追加）。

## スコープ外

- スキーマ変更（interaction_kind・FK は実装済）。
- 電話・メール（kind=call/email）の記録 UI。
- 消込・督促・回収（AR/債権管理）。
- 顧客接点の編集・削除 UI（本リクエストは記録・表示のみ）。

## 受け入れ基準

**テスト方針（必須）**: 振る舞いは `.dynamic.test.ts` の `mock.module` 方式で **実行して** assert する（usecase / repository を実行）。ソースの静的検査（readSrc / toContain）で代替しない。

- [ ] 契約調整の記録で `kind=contract_adjustment`・`contractId` 設定の Interaction が作成され、`interaction.create`（metadata.kind=contract_adjustment）監査が記録されることを実行テストで固定する。
- [ ] 請求調整の記録で `kind=invoice_adjustment`・`invoiceId` 設定の Interaction が作成され、`interaction.create`（metadata.kind=invoice_adjustment）監査が記録されることを実行テストで固定する。
- [ ] 契約/請求に紐づく顧客接点の一覧取得（`findAllByContract` / `findAllByInvoice`）が正しく動作することを実行テストで固定する。
- [ ] 認可（contract_adjustment=admin/manager/member、invoice_adjustment=admin/manager/finance）が守られることをテストで固定する。
- [ ] `getDealActivity` が案件配下の契約・請求に紐づく顧客接点もタイムラインに含めることを実行テストで固定する。
- [ ] 既存テスト無変更で `bun test` green / `typecheck` / `bun run build` 成功。
- [ ] 依存方向（actions/RSC → usecases → domain / infrastructure）を遵守する。

## architect 評価済みの設計判断

1. **スキーマ変更なし**。`interaction_kind`（contract_adjustment/invoice_adjustment）・`contract_id`/`invoice_id` FK は実装済。本リクエストは記録 usecase・action・UI・一覧・タイムライン統合の追加に閉じる。
2. **顧客接点の「記録」は契約・請求への「操作」とは別の認可概念**。記録はやり取りを残す行為であり、contract_adjustment=admin/manager/member、invoice_adjustment=admin/manager/finance（請求は経理領域）。
3. **境界＝記録まで**。消込・督促・回収（AR/債権管理）は作らない。請求ステータスの記録は既存どおり。
4. **タイムライン統合**: 案件配下の契約・請求の顧客接点も案件タイムラインに出す（contract_id/invoice_id 経由で取得し targets に追加）。表示・集約ロジックは前リクエストの仕組みを再利用する。
