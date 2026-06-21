# Tasks: 承認連携の撤去と直接遷移への移行

## T-01: schema.ts のスキーマ変更

- [ ] `dealPhaseEnum` の値リストから `"estimate_approval"` を削除し、`["proposal_prep", "proposed", "negotiation", "won", "lost"]` の5値にする（`src/infrastructure/schema.ts:49-56`）
- [ ] `requests` テーブルの `sourceType: text("source_type")` 定義（行109）を削除する
- [ ] `requests` テーブルの `sourceId: uuid("source_id")` 定義（行110）を削除する
- [ ] `inquiries` テーブルの `conversionRequestId: uuid("conversion_request_id").references(...)` 定義（行276）を削除する
- [ ] `inquiriesRelations` の `conversionRequest: one(requests, { fields: [inquiries.conversionRequestId], ... })` エントリ（行575-578）を削除する

**Acceptance Criteria**:
- `dealPhaseEnum` の値が `["proposal_prep", "proposed", "negotiation", "won", "lost"]` の5値になっている
- `requests` テーブル定義に `sourceType`, `sourceId` のカラム定義が存在しない
- `inquiries` テーブル定義に `conversionRequestId` のカラム定義が存在しない
- `inquiriesRelations` に `conversionRequest` の `one()` 参照が存在しない

## T-02: マイグレーションファイルの生成

- [ ] `bunx drizzle-kit generate` を実行してマイグレーション SQL を生成する
- [ ] 対話プロンプトが出た場合、`estimate_approval` 値の削除はカラム削除として処理する（enum の truncate/rename ではなく DROP → CREATE の形式になる）
- [ ] 生成された `drizzle/` 配下の SQL ファイルを確認し、`deal_phase` enum の再作成・`source_type`/`source_id`/`conversion_request_id` カラムの DROP が含まれることを確認する

**Acceptance Criteria**:
- `drizzle/` 配下に新しいマイグレーション SQL ファイルが生成されている
- SQL に `deal_phase` 型の変更（`estimate_approval` 値の削除）が含まれる
- SQL に `ALTER TABLE requests DROP COLUMN source_type` および `DROP COLUMN source_id` が含まれる
- SQL に `ALTER TABLE inquiries DROP COLUMN conversion_request_id` が含まれる

## T-03: ドメインモデルの変更

- [ ] `src/domain/models/deal.ts` の `DealPhase` union 型から `"estimate_approval"` を削除し、5値 union にする（行1-7）
- [ ] `src/domain/models/request.ts` の `Request` 型から `sourceType: string | null` フィールドを削除する（行15）
- [ ] `src/domain/models/request.ts` の `Request` 型から `sourceId: string | null` フィールドを削除する（行16）
- [ ] `src/domain/models/request.ts` にある `sourceType`/`sourceId` の関連コメントも削除する
- [ ] `src/domain/models/inquiry.ts` の `Inquiry` 型から `conversionRequestId: string | null` フィールドを削除する（行15）
- [ ] `src/domain/models/inquiry.ts` の関連コメントも削除する

**Acceptance Criteria**:
- `DealPhase` 型が `"proposal_prep" | "proposed" | "negotiation" | "won" | "lost"` の5値 union になっている
- `Request` 型に `sourceType` フィールドが存在しない
- `Request` 型に `sourceId` フィールドが存在しない
- `Inquiry` 型に `conversionRequestId` フィールドが存在しない

## T-04: ドメインサービス（dealTransition.ts）の変更

- [ ] `src/domain/services/dealTransition.ts` の `VALID_TRANSITIONS` マップを変更する
  - `negotiation: ["estimate_approval", "lost"]` を `negotiation: ["won", "lost"]` に変更する（行7）
  - `estimate_approval: ["won", "lost"]` のエントリ（行8）を削除する

**Acceptance Criteria**:
- `canTransition("negotiation", "won")` が `true` を返す
- `canTransition("negotiation", "estimate_approval")` が `false` を返す
- `canTransition("estimate_approval", "won")` が `false` を返す（`estimate_approval` 自体が遷移元として存在しない）
- `canTransition("negotiation", "lost")` が `true` を返す

## T-05: リポジトリの変更

### requestRepository.ts

- [ ] `src/infrastructure/repositories/requestRepository.ts` の `mapRow` 関数から `sourceType: row.sourceType ?? null` と `sourceId: row.sourceId ?? null` のマッピング（行20-21）を削除する
- [ ] `create` 関数の引数型から `sourceType?: string | null` と `sourceId?: string | null` を削除する（行33-34）
- [ ] `create` 関数の `.values({...})` 内から `sourceType: data.sourceType ?? null` と `sourceId: data.sourceId ?? null` の記述（行48-49）を削除する

### inquiryRepository.ts

- [ ] `src/infrastructure/repositories/inquiryRepository.ts` の `mapRow` 関数から `conversionRequestId: row.conversionRequestId ?? null` のマッピング（行17）を削除する
- [ ] `create` 関数の `.values({...})` 内から `conversionRequestId: null` の記述（行46）を削除する
- [ ] `updateStatus` 関数のシグネチャから `conversionRequestId: string | null` 引数（行122）を削除する
- [ ] `updateStatus` 関数の `.set({...})` 内から `conversionRequestId,` を削除する（行128）

**Acceptance Criteria**:
- `requestRepository.create` の型定義に `sourceType`, `sourceId` パラメータが存在しない
- `inquiryRepository.updateStatus` のシグネチャに `conversionRequestId` 引数が存在しない
- TypeScript の型エラーがない

## T-06: updateInquiryStatus.ts の簡素化

- [ ] import から `approvalTemplateRepository`, `requestRepository`, `approvalStepRepository` を削除する（行4-6）
- [ ] import の `filterStepsByCondition` を削除する（行9）
- [ ] `dealRepository` を `@/infrastructure/repositories` からの import に追加する
- [ ] `updateInquiryStatus` 関数のシグネチャから `templateId?: string` を削除する（行21）
- [ ] converted 遷移ブロック全体（行36-135）を以下のロジックに置き換える:
  - `db.transaction` 内で `dealRepository.create({ organizationId, inquiryId: data.inquiryId, title: inquiry.title }, tx)` を呼び出す
  - `inquiryRepository.updateStatus` の呼び出しから `conversionRequestId` 引数を削除し、ステータスのみ更新する（`updateStatus(data.inquiryId, data.organizationId, data.newStatus, inquiry.version, tx)`）
  - `auditLogRepository.create` を呼び出して `inquiry.updateStatus` のログを記録する（`metadata: { fromStatus, toStatus, dealId: deal.id }` を含める）
- [ ] converted 以外の遷移ブロック（行138-176）の `inquiryRepository.updateStatus` 呼び出しから `conversionRequestId` 引数（`null`）を削除する

**Acceptance Criteria**:
- `updateInquiryStatus` が `approvalTemplateRepository`, `requestRepository`, `approvalStepRepository` を import しない
- `filterStepsByCondition` を呼び出さない
- converted 遷移時に `dealRepository.create` を呼ぶ
- converted 遷移時に `requestRepository.create` を呼ばない
- `templateId` パラメータが存在しない
- `db.transaction` が使われている（Deal 作成とステータス更新が同一 TX）
- `auditLogRepository.create` が呼ばれている（監査ログ記録）

## T-07: updateDealPhase.ts の簡素化

- [ ] import から `approvalTemplateRepository`, `requestRepository`, `approvalStepRepository` を削除する（行4-6）
- [ ] import の `filterStepsByCondition` を削除する（行9）
- [ ] `updateDealPhase` 関数のシグネチャから `templateId?: string` を削除する（行19）
- [ ] estimate_approval 遷移ブロック全体（行33-144）を削除する（条件判定 `if (data.newPhase === "estimate_approval")` を含む）
- [ ] estimate_approval 以外の遷移ブロック（行146-185）のコメント「`estimate_approval 以外の遷移`」を削除し、全遷移の共通パスとして扱う

**Acceptance Criteria**:
- `updateDealPhase` が `approvalTemplateRepository`, `requestRepository`, `approvalStepRepository` を import しない
- `filterStepsByCondition` を呼び出さない
- `data.newPhase === "estimate_approval"` の条件分岐が存在しない
- `templateId` パラメータが存在しない
- `auditLogRepository.create` が呼ばれている（監査ログ記録）
- `dealRepository.updatePhase` が呼ばれている

## T-08: approveRequest.ts から連動処理を撤去

- [ ] `import` から `inquiryRepository`, `dealRepository` を削除する（行6-7）
- [ ] `runPostApprovalLinkage` 関数（行28-125）を丸ごと削除する
- [ ] no-steps フロー（行191付近）の `await runPostApprovalLinkage(updated, ...)` 呼び出しを削除する
- [ ] multi-step フロー（行389付近）の `await runPostApprovalLinkage(txResult.request, ...)` 呼び出しと、その前後の `if (txResult.allApproved)` ブロック内の `runPostApprovalLinkage` 参照を削除する（`deliverWebhookEvent` による `request.approved` イベント配信は維持する）

**Acceptance Criteria**:
- `approveRequest.ts` に `runPostApprovalLinkage` 関数が存在しない
- `approveRequest.ts` が `inquiryRepository`, `dealRepository` を import しない
- `approveRequest.ts` に `approval.linkage_failed` の audit log アクションが存在しない
- `approveRequest.ts` に `sourceType`, `sourceId` の参照が存在しない
- `request.approved` の Webhook イベント配信コードは維持されている

## T-09: Server Actions の変更

- [ ] `src/app/actions/inquiries.ts` の `updateInquiryStatusAction` 内の `const templateId = formData.get("templateId")` を削除する（行109）
- [ ] `updateInquiryStatus` の呼び出しから `templateId:` 引数を削除する（行127）

**Acceptance Criteria**:
- `updateInquiryStatusAction` が `templateId` を FormData から取得しない
- `updateInquiryStatus` の呼び出しに `templateId` 引数が渡されない

## T-10: UI の変更

### InquiryActions.tsx

- [ ] `src/app/(dashboard)/inquiries/[id]/InquiryActions.tsx` の Props 型から `templates: Array<{ id: string; name: string }>` を削除する（行14）
- [ ] 関数シグネチャから `templates` を削除する（行18）
- [ ] `selectedTemplateId` の state と setter を削除する（行20）
- [ ] `handleTransition` 関数内の `if (templateId) formData.set("templateId", templateId);` を削除する（行34）
- [ ] `handleTransition` の `templateId?: string` 引数を削除する（行29）
- [ ] テンプレート選択モーダル全体（行81-123）を削除する
- [ ] 案件化ボタンのクリックハンドラを確認ダイアログ表示に変更し、確認後 `handleTransition("converted")` を直接呼ぶ形にする（確認ダイアログは「この引き合いを案件化しますか？」のシンプルな confirm または modal）
- [ ] `Select` コンポーネントの import が不要になった場合は削除する

### inquiries/[id]/page.tsx

- [ ] `src/app/(dashboard)/inquiries/[id]/page.tsx` の import から `approvalTemplateRepository`, `requestRepository` を削除する（行7, 10）
- [ ] `Promise.all` の配列から `approvalTemplateRepository.findByOrganization(organizationId)` と `inquiry.conversionRequestId ? requestRepository.findById(...) : Promise.resolve(null)` を削除する（行31-41）
- [ ] `templates` と `conversionRequest` 変数を削除する
- [ ] `InquiryActions` への `templates={...}` props 渡しを削除する（行74）
- [ ] 案件化承認の表示セクション（行104-119）の `conversionRequest && (...)` ブロックを削除する

### labels.ts

- [ ] `src/app/(dashboard)/labels.ts` の `phaseLabels` オブジェクトから `estimate_approval: "見積承認中"` エントリ（行28）を削除する

**Acceptance Criteria**:
- `InquiryActions` コンポーネントに `templates` props が存在しない
- 案件化ボタンがテンプレート選択モーダルなしで動作する（確認ダイアログのみ）
- `page.tsx` が `approvalTemplateRepository`, `requestRepository` を import しない
- `page.tsx` に `conversionRequest &&` による表示ブロックが存在しない
- `phaseLabels` に `estimate_approval` キーが存在しない

## T-11: シードデータの修正

- [ ] `src/infrastructure/seed.ts` の案件化承認テンプレート挿入ブロック（行197-208）を削除する（`conversionTemplate` 変数と `INSERT` を含む）
- [ ] 見積承認テンプレート挿入ブロック（行211-225）を削除する（`estimateTemplate` 変数と `INSERT` を含む）
- [ ] 案件化承認リクエスト2件の挿入ブロック（行570-593）を削除する（`inProgressConversionRequest`, `convertedConversionRequest` 変数と `INSERT` を含む）
- [ ] 見積承認リクエストの挿入ブロック（行779-792）を削除する（`estimateApprovalRequest` 変数と `INSERT` を含む）
- [ ] `convertedInquiry1` の `conversionRequestId: inProgressConversionRequest.id` 参照（行640）を削除する（`conversionRequestId` フィールド自体なくなる）
- [ ] `convertedInquiry2` の `conversionRequestId: convertedConversionRequest.id` 参照（行650）を削除する
- [ ] `wonDeal` の `estimateRequestId: estimateApprovalRequest.id` 参照（行804）を削除する（`estimateRequestId` フィールドはカラムとして残るが、シードから参照をなくす）
- [ ] `conversionTemplate` / `estimateTemplate` を参照している箇所が他にないことを確認する

**Acceptance Criteria**:
- シードデータに案件化承認テンプレートの挿入がない
- シードデータに見積承認テンプレートの挿入がない
- シードデータに案件化承認リクエスト (`案件化承認:`) の挿入がない
- シードデータに見積承認リクエスト (`見積承認:`) の挿入がない
- `inquiries` の挿入で `conversionRequestId` フィールドを参照していない
- `deals` の挿入で `estimateRequestId: estimateApprovalRequest.id` を参照していない
- `bun run db:seed` が型エラーなしで実行できる（TypeScript コンパイルが通る）

## T-12: テストの修正

### dealTransition.test.ts の修正

- [ ] `src/__tests__/domain/dealTransition.test.ts` を以下の通り変更する:
  - T-05「negotiation → estimate_approval が許可される」を削除する
  - T-07「estimate_approval → won が許可される」を削除する
  - T-08「estimate_approval → lost が許可される」を削除する
  - T-14「proposal_prep → estimate_approval が拒否される」を削除する（型として存在しない）
  - T-15「全フェーズから lost への遷移が許可される」の `estimate_approval` 参照を削除し、4フェーズ（`proposal_prep`, `proposed`, `negotiation`, `won` は除く）の記述に変更する
  - 新テスト「negotiation → won が許可される」を追加する（ID は T-05 に再採番する）
  - 新テスト「negotiation → estimate_approval が拒否される（フェーズ削除）」を追加する

### approvalFlowIntegration.test.ts の修正

- [ ] `src/__tests__/usecases/approvalFlowIntegration.test.ts` を以下の通り変更する:
  - describe「requestRepository.create signature」の T-03「sourceType パラメータを受け付ける」を削除する
  - describe「Request domain model fields」の T-02「sourceType フィールドが存在する」と「sourceId フィールドが存在する」を削除する
  - describe「schema.ts requests table columns」の T-01「source_type カラムが定義されている」と「source_id カラムが定義されている」を削除する
  - describe「updateInquiryStatus converted 遷移」の T-04 全3件（`status: "pending"`, `sourceType: "inquiry"`, `sourceId: data.inquiryId` の確認）を削除する
  - describe「updateDealPhase estimate_approval 遷移」の T-05 全3件（`status: "pending"`, `sourceType: "deal"`, `sourceId: data.dealId` の確認）を削除する
  - describe「approveRequest 連動処理」の T-06 全6件（inquiryRepository/dealRepository import 確認、sourceType 分岐確認、linkage_failed 確認）を削除する
  - describe「TC-011: no-steps フローでも runPostApprovalLinkage が呼ばれる」を削除する
  - 新 describe を追加: 「updateInquiryStatus converted 遷移（直接 Deal 作成）」として以下を追加する:
    - 「converted 遷移で `dealRepository.create` の呼び出しが含まれる」
    - 「converted 遷移で `requestRepository.create` の呼び出しが含まれない」
    - 「converted 遷移で `db.transaction` が使われている」

### inquiryManagement.test.ts の修正

- [ ] `src/__tests__/usecases/inquiryManagement.test.ts` を以下の通り変更する:
  - 「requestRepository.create の呼び出しが含まれる（converted 時の承認リクエスト作成）」テストを削除する
  - 「dealRepository.create の呼び出しが含まれる（converted 時の案件直接作成）」テストを追加する

### dealManagement.test.ts の修正

- [ ] `src/__tests__/usecases/dealManagement.test.ts` を以下の通り変更する:
  - 「requestRepository.create の呼び出しが含まれる（estimate_approval 時の見積承認リクエスト作成）」を削除する
  - 「見積承認リクエストのタイトルパターン「見積承認: 」が含まれる」を削除する
  - 「TC-008: templateId が未指定の場合に estimate_approval 遷移がエラーを返すガードが含まれる」を削除する
  - 「TC-027: 承認リクエストに渡す formData に "想定金額" ラベルが含まれる」を削除する
  - 「requestRepository.create が呼ばれない（estimate_approval 分岐の撤去確認）」テストを追加する

**Acceptance Criteria**:
- `dealTransition.test.ts` に `estimate_approval` を参照するテストが存在しない
- `dealTransition.test.ts` に「negotiation → won が許可される」テストが存在する
- `approvalFlowIntegration.test.ts` に `sourceType`, `sourceId`, `runPostApprovalLinkage`, `linkage_failed` を確認するテストが存在しない
- `approvalFlowIntegration.test.ts` に「converted 遷移で dealRepository.create が呼ばれる」テストが存在する
- `inquiryManagement.test.ts` に「dealRepository.create の呼び出しが含まれる」テストが存在する
- `dealManagement.test.ts` に `estimate_approval`, `requestRepository.create`（updateDealPhase 内）を確認するテストが存在しない
- `bun test` が全件 green

## T-13: 最終検証

- [ ] `bun run build` が成功することを確認する
- [ ] `bun run typecheck` が green であることを確認する
- [ ] `bun test` が全件 green であることを確認する
- [ ] `src/infrastructure/schema.ts` に `estimate_approval` が含まれないことを確認する
- [ ] `src/domain/models/deal.ts` の `DealPhase` に `"estimate_approval"` が含まれないことを確認する
- [ ] `src/domain/models/request.ts` の `Request` 型に `sourceType`, `sourceId` が存在しないことを確認する
- [ ] `src/domain/models/inquiry.ts` の `Inquiry` 型に `conversionRequestId` が存在しないことを確認する

**Acceptance Criteria**:
- `bun run build` が exit 0 で完了する
- `bun run typecheck` が型エラーなしで完了する
- `bun test` が全件 green（0 failures）で完了する
- 受け入れ基準として列挙された全項目が満たされている
