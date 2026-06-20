# Tasks: ドメインモデル再構築と用語統一

## T-01: スキーマ定義の変更

- [ ] `src/infrastructure/schema.ts` の `dealPhaseEnum` で `"internal_approval"` を `"estimate_approval"` に変更する
- [ ] `src/infrastructure/schema.ts` の `inquiries` テーブルで `clientId` の `.notNull()` を削除する
- [ ] `src/infrastructure/schema.ts` の `inquiries` テーブルから `contactId` カラム定義を削除する
- [ ] `src/infrastructure/schema.ts` の `inquiries` テーブルで `requestId` を `conversionRequestId` に改名する（カラム名は `conversion_request_id`）
- [ ] `src/infrastructure/schema.ts` の `meetings` テーブルで `inquiryId` の `.notNull()` を削除する
- [ ] `src/infrastructure/schema.ts` の `meetings` テーブルに `dealId: uuid("deal_id").references(() => deals.id)` を追加する（nullable）
- [ ] `src/infrastructure/schema.ts` に `dealContacts` テーブルを追加する（カラム: `id` uuid PK, `dealId` uuid NOT NULL FK to deals, `contactId` uuid NOT NULL FK to clientContacts, `role` text NOT NULL, `createdAt` timestamp）。同一 `(dealId, contactId)` の組み合わせに unique 制約を追加する
- [ ] `src/infrastructure/schema.ts` の `inquiriesRelations` から `contact` の one() 参照を削除する
- [ ] `src/infrastructure/schema.ts` の `inquiriesRelations` で `request` の参照フィールドを `inquiries.requestId` から `inquiries.conversionRequestId` に変更する
- [ ] `src/infrastructure/schema.ts` の `meetingsRelations` に `deal: one(deals, ...)` を追加する
- [ ] `src/infrastructure/schema.ts` の `dealsRelations` に `meetings: many(meetings)` を追加する
- [ ] `src/infrastructure/schema.ts` に `dealContactsRelations` を追加する（deal の one()、contact の one() を含む）
- [ ] `src/infrastructure/schema.ts` の `organizationsRelations` に `dealContacts: many(dealContacts)` を追加する

**Acceptance Criteria**:
- `inquiries.clientId` に `.notNull()` が存在しない
- `inquiries` テーブルに `contactId` カラムが存在しない
- `inquiries` テーブルに `conversionRequestId`（カラム名 `conversion_request_id`）が存在する
- `meetings` テーブルに `dealId` カラム（nullable）が存在する
- `meetings.inquiryId` に `.notNull()` が存在しない
- `dealContacts` テーブルが定義され、`(dealId, contactId)` の unique 制約が設定されている
- `dealPhaseEnum` に `"estimate_approval"` が含まれ `"internal_approval"` が含まれない
- `inquiriesRelations` に `contact` の one() が存在しない
- `meetingsRelations` に `deal` の one() が存在する
- `dealsRelations` に `meetings` の many() が存在する
- TypeScript 型チェックが通る

## T-02: ドメインモデルの変更

- [ ] `src/domain/models/inquiry.ts` の `Inquiry` 型で `clientId: string` を `clientId: string | null` に変更する
- [ ] `src/domain/models/inquiry.ts` の `Inquiry` 型から `contactId: string | null` フィールドを削除する
- [ ] `src/domain/models/inquiry.ts` の `Inquiry` 型で `requestId: string | null` を `conversionRequestId: string | null` に改名する
- [ ] `src/domain/models/inquiry.ts` の `InquiryWithClient` 型で `clientName: string` を `clientName: string | null` に変更する
- [ ] `src/domain/models/meeting.ts` の `Meeting` 型で `inquiryId: string` を `inquiryId: string | null` に変更する
- [ ] `src/domain/models/meeting.ts` の `Meeting` 型に `dealId: string | null` フィールドを追加する
- [ ] `src/domain/models/deal.ts` で `DealPhase` 型の `"internal_approval"` を `"estimate_approval"` に変更する
- [ ] `src/domain/models/deal.ts` で `ContractType` 型の `"contract"` を `"fixed_price"` に変更する
- [ ] `src/domain/models/deal.ts` に `DealContactRole = "key_person" | "decision_maker" | "technical" | "other"` 型を追加する
- [ ] `src/domain/models/deal.ts` に `DealContact = { id: string; dealId: string; contactId: string; role: DealContactRole; createdAt: Date }` 型を追加する
- [ ] `src/domain/models/index.ts` に `DealContactRole`, `DealContact` の export を追加する

**Acceptance Criteria**:
- `Inquiry.clientId` が `string | null` である
- `Inquiry` に `contactId` フィールドが存在しない
- `Inquiry.conversionRequestId` が `string | null` である（`requestId` は存在しない）
- `InquiryWithClient.clientName` が `string | null` である
- `Meeting.inquiryId` が `string | null` である
- `Meeting.dealId` が `string | null` である
- `DealPhase` に `"estimate_approval"` が含まれ `"internal_approval"` が含まれない
- `ContractType` に `"fixed_price"` が含まれ `"contract"` が含まれない
- `DealContact`・`DealContactRole` が `src/domain/models/index.ts` からエクスポートされている
- TypeScript 型チェックが通る

## T-03: ドメインサービスの変更

- [ ] `src/domain/services/dealTransition.ts` の `VALID_TRANSITIONS` マップで `"internal_approval"` キーと値を `"estimate_approval"` に変更する

**Acceptance Criteria**:
- `canDealTransition("negotiation", "estimate_approval")` が true を返す
- `canDealTransition("negotiation", "internal_approval")` が false を返す（型エラーにもなる）
- TypeScript 型チェックが通る

## T-04: リポジトリの変更

- [ ] `src/infrastructure/repositories/inquiryRepository.ts` の `mapRow` 関数から `contactId` のマッピングを削除し、`requestId` を `conversionRequestId` に改名する
- [ ] `src/infrastructure/repositories/inquiryRepository.ts` の `create` 関数のシグネチャから `clientId: string` を `clientId?: string | null` に変更し、`contactId` パラメータを削除する。insert values も追従修正する
- [ ] `src/infrastructure/repositories/inquiryRepository.ts` の `update` 関数のシグネチャから `contactId` を削除する
- [ ] `src/infrastructure/repositories/inquiryRepository.ts` の `updateStatus` 関数のシグネチャで `requestId` パラメータを `conversionRequestId` に改名し、set 句の `requestId` → `conversionRequestId` も変更する
- [ ] `src/infrastructure/repositories/meetingRepository.ts` の `mapRow` 関数に `dealId: row.dealId ?? null` を追加する
- [ ] `src/infrastructure/repositories/meetingRepository.ts` の `create` 関数のシグネチャに `dealId?: string | null` を追加し、`inquiryId` を `inquiryId?: string | null` に変更する。insert values も追従修正する
- [ ] `src/infrastructure/repositories/meetingRepository.ts` に `findAllByDeal(dealId: string, organizationId: string): Promise<Meeting[]>` を追加する（`meetings.dealId` で絞り込み、`asc(meetings.date)` でソート）
- [ ] `src/infrastructure/repositories/meetingRepository.ts` に `findAllByInquiryOrDeal(inquiryId: string, organizationId: string): Promise<Meeting[]>` を追加する（`meetings.inquiryId = inquiryId OR meetings.dealId IN (SELECT id FROM deals WHERE inquiryId = ?)` — Drizzle の `or`, `inArray`, サブクエリを使用）
- [ ] `src/infrastructure/repositories/dealContactRepository.ts` を新規作成する。関数: `create(data: { dealId, contactId, role }, tx?)`, `findByDeal(dealId, organizationId)`, `deleteByDealAndContact(dealId, contactId, organizationId, tx?)`
- [ ] `src/infrastructure/repositories/index.ts` に `dealContactRepository` の export を追加する

**Acceptance Criteria**:
- `inquiryRepository.create` が `clientId` なしで呼び出せる
- `inquiryRepository.updateStatus` の引数が `conversionRequestId` である
- `meetingRepository.create` が `inquiryId` なしで `dealId` のみで呼び出せる
- `meetingRepository.findAllByDeal` が存在し `organizationId` 条件を含む
- `meetingRepository.findAllByInquiryOrDeal` が存在し `organizationId` 条件を含む
- `dealContactRepository` が `src/infrastructure/repositories/index.ts` からエクスポートされている
- TypeScript 型チェックが通る

## T-05: ユースケースの変更

- [ ] `src/application/usecases/createInquiry.ts` から `clientRepository.findById` の呼び出し（顧客存在確認）を削除し、`clientId` が指定された場合のみ確認するように変更する（`if (data.clientId) { ... }`）。引数の `clientId` を `clientId?: string | null` に変更する。`contactId` パラメータを削除する
- [ ] `src/application/usecases/updateInquiryStatus.ts` の `converted` 遷移ブロックで、承認リクエストのタイトルを `"商談化承認: ${inquiry.title}"` から `"案件化承認: ${inquiry.title}"` に変更する
- [ ] `src/application/usecases/updateInquiryStatus.ts` の `converted` 遷移ブロックで、エラーメッセージ `"商談化にはテンプレートの指定が必要です"` を `"案件化にはテンプレートの指定が必要です"` に変更する
- [ ] `src/application/usecases/updateInquiryStatus.ts` で `inquiryRepository.updateStatus` の呼び出し引数を `requestId` から `conversionRequestId` に変更する（2箇所: converted 遷移と非converted 遷移）
- [ ] `src/application/usecases/createDeal.ts` のエラーメッセージ `"商談化済みの引き合いにのみ案件を作成できます"` を `"案件化済みの引き合いにのみ案件を作成できます"` に変更する
- [ ] `src/application/usecases/updateDealPhase.ts` の `"internal_approval"` への遷移判定を `"estimate_approval"` に変更する（条件分岐の文字列を変更）
- [ ] `src/application/usecases/updateDealPhase.ts` のエラーメッセージ `"内示フェーズへの遷移にはテンプレートの指定が必要です"` を `"見積承認フェーズへの遷移にはテンプレートの指定が必要です"` に変更する
- [ ] `src/application/usecases/createMeeting.ts` の引数に `dealId?: string | null` を追加する
- [ ] `src/application/usecases/createMeeting.ts` の先頭に `inquiryId` と `dealId` の両方が null の場合に `{ ok: false, reason: "引き合いまたは案件のどちらかを指定してください" }` を返すバリデーションを追加する
- [ ] `src/application/usecases/createMeeting.ts` の `inquiryId` 存在確認を `if (data.inquiryId)` で条件分岐させる（dealId のみ指定の場合はスキップ）。dealId が指定された場合は `dealRepository.findById` で案件の存在確認を行う
- [ ] `src/application/usecases/createMeeting.ts` の `meetingRepository.create` 呼び出しに `dealId: data.dealId ?? null` を追加する

**Acceptance Criteria**:
- `createInquiry` が `clientId` なしで呼び出せる
- `updateInquiryStatus` の承認リクエストタイトルが `"案件化承認: ..."` で生成される
- `createDeal` のエラーメッセージに「案件化済み」が含まれる
- `updateDealPhase` が `"estimate_approval"` への遷移でリクエストを生成する（`"internal_approval"` 条件分岐は存在しない）
- `createMeeting` に `dealId` のみ指定で呼び出した場合、引き合いチェックをスキップして成功する
- `createMeeting` に `inquiryId` と `dealId` の両方が null の場合、エラーが返る
- TypeScript 型チェックが通る

## T-06: Server Actions の変更

- [ ] `src/app/actions/inquiries.ts` の `createInquirySchema` から `contactId` フィールドを削除する。`clientId` を `z.string().uuid().optional()` に変更する
- [ ] `src/app/actions/inquiries.ts` の `CreateInquiryState.errors` から `contactId` フィールドを削除する
- [ ] `src/app/actions/inquiries.ts` の `createInquiryAction` で `contactId` の処理を削除する。`clientId` を optional として処理する（空文字の場合は undefined として渡す）
- [ ] `src/app/actions/inquiries.ts` の `createInquiryAction` で `createInquiry` 呼び出しから `contactId` を削除し、`clientId` を `parsed.data.clientId ?? null` として渡す
- [ ] `src/app/actions/meetings.ts` の `createMeetingSchema` に `dealId: z.string().uuid().optional()` を追加する。`inquiryId` を `z.string().uuid().optional()` に変更する
- [ ] `src/app/actions/meetings.ts` の `createMeetingAction` で `inquiryId` と `dealId` の両方が未指定の場合に `{ message: "引き合いまたは案件のどちらかを指定してください" }` を返すバリデーションを追加する
- [ ] `src/app/actions/meetings.ts` の `createMeetingAction` で `createMeeting` 呼び出しに `dealId` を追加する
- [ ] `src/app/actions/deals.ts` の `updateDealAction` の認証チェック直後に admin/manager ロールチェックを追加する（`session.user.role !== "admin" && session.user.role !== "manager"` の場合は `{ success: false, message: "権限がありません" }` を返す）

**Acceptance Criteria**:
- `createInquiryAction` が `clientId` なしのフォームデータで呼び出せる
- `createInquiryAction` に `contactId` フィールドが存在しない
- `createMeetingAction` が `dealId` のみで呼び出せる
- `updateDealAction` が member ロールのユーザーから呼ばれた場合 `{ success: false, message: "権限がありません" }` を返す
- TypeScript 型チェックが通る

## T-07: UIラベルの集約と用語修正

- [ ] `src/app/(dashboard)/labels.ts` を新規作成する。以下のラベルオブジェクトを定義してエクスポートする:
  - `statusLabels: Record<string, string>` — `{ new: "新規", in_progress: "対応中", converted: "案件化済", declined: "見送り" }`
  - `sourceLabels: Record<string, string>` — `{ web: "Web", phone: "電話", referral: "紹介", exhibition: "展示会", other: "その他" }`
  - `meetingTypeLabels: Record<string, string>` — `{ hearing: "ヒアリング", proposal: "提案", negotiation: "交渉", closing: "クロージング", followup: "フォローアップ" }`
  - `phaseLabels: Record<string, string>` — `{ proposal_prep: "提案準備", proposed: "提案済", negotiation: "交渉中", estimate_approval: "見積承認中", won: "受注", lost: "失注" }`
  - `contractTypeLabels: Record<string, string>` — `{ quasi_delegation: "準委任", fixed_price: "請負", ses: "SES" }`
- [ ] `src/app/(dashboard)/inquiries/page.tsx` からローカルの `statusLabels`・`sourceLabels` 定義を削除し、`labels.ts` から import する
- [ ] `src/app/(dashboard)/inquiries/[id]/page.tsx` からローカルの `statusLabels`・`sourceLabels`・`meetingTypeLabels`・`phaseLabels` の重複定義を削除し、`labels.ts` から import する
- [ ] `src/app/(dashboard)/clients/[id]/page.tsx` からローカルの `statusLabels`・`sourceLabels` 定義を削除し、`labels.ts` から import する
- [ ] `src/app/(dashboard)/deals/page.tsx` からローカルの `phaseLabels` 定義を削除し、`labels.ts` から import する。`allPhases` の配列で `internal_approval` を `estimate_approval` に変更する
- [ ] `src/app/(dashboard)/deals/[id]/page.tsx` からローカルの `phaseLabels`・`contractTypeLabels` 定義を削除し、`labels.ts` から import する
- [ ] `src/app/(dashboard)/inquiries/[id]/page.tsx` のインラインで重複定義されている `phaseLabels`（line 147-154 付近）を削除し、`labels.ts` から import に変更する

**Acceptance Criteria**:
- `src/app/(dashboard)/labels.ts` が存在する
- `statusLabels.converted` が `"案件化済"` である
- `phaseLabels.estimate_approval` が `"見積承認中"` である（`phaseLabels.internal_approval` は存在しない）
- `contractTypeLabels.fixed_price` が `"請負"` である（`contractTypeLabels.contract` は存在しない）
- 各ページファイルにローカルのラベル定義が存在しない
- TypeScript 型チェックが通る

## T-08: UI のテキスト・ナビゲーション修正

- [ ] `src/app/(dashboard)/inquiries/[id]/InquiryActions.tsx` のボタンラベル `"商談化"` を `"案件化"` に変更する。`"商談化する"` を `"案件化する"` に変更する。承認テンプレート選択の見出し文言（「商談化」を含むもの）も「案件化」に統一する
- [ ] `src/app/(dashboard)/layout.tsx` のナビゲーション順序を「顧客 > 引き合い > 案件 > 申請一覧」に変更する（現在は「申請一覧 > 顧客 > 引き合い > 案件」）

**Acceptance Criteria**:
- ナビゲーションが「顧客 > 引き合い > 案件 > 申請一覧」の順序で表示される
- InquiryActions.tsx に「商談化」という文言が存在しない

## T-09: 引き合い作成フォームの修正

- [ ] `src/app/(dashboard)/inquiries/new/page.tsx` から `clientRepository.findAllContactsByOrganization` の呼び出しと `contactsByClientId` の生成処理を削除する。`InquiryForm` への `contactsByClientId` プロップ渡しを削除する
- [ ] `src/app/(dashboard)/inquiries/new/InquiryForm.tsx` から `contactsByClientId` プロップと関連する `contacts` の state・ロジックを削除する
- [ ] `src/app/(dashboard)/inquiries/new/InquiryForm.tsx` の `contactId` フィールド（Select 要素）を削除する
- [ ] `src/app/(dashboard)/inquiries/new/InquiryForm.tsx` の `clientId` Select から `required` 属性を削除する。選択肢の先頭を「未定」（value 空文字）に変更する（現在は「選択してください」）

**Acceptance Criteria**:
- 引き合い作成フォームに `contactId` フィールドが存在しない
- 引き合い作成フォームの `clientId` が未選択（「未定」）のまま送信できる
- `new/page.tsx` が contacts の取得クエリを含まない

## T-10: 案件詳細ページへの商談履歴セクション追加

- [ ] `src/app/(dashboard)/deals/[id]/page.tsx` で、`meetingRepository.findAllByInquiryOrDeal(deal.inquiryId, organizationId)` を呼び出して商談一覧を取得する
- [ ] 同ページに「商談履歴」セクション（`SectionCard` を使用）を追加する。各商談の type（`meetingTypeLabels` から）・date・summary を一覧表示する。商談がない場合は「商談記録がありません」と表示する

**Acceptance Criteria**:
- 案件詳細ページに「商談履歴」セクションが表示される
- 引き合い時代の商談と案件直接紐づきの商談が統合表示される

## T-11: 案件詳細からの商談作成ルートの追加

- [ ] `src/app/(dashboard)/deals/[id]/meetings/new/` ディレクトリを作成し、`page.tsx` を追加する。`dealId` を隠しフィールドとして商談作成フォームを表示する
- [ ] 案件詳細ページの「商談履歴」セクションに「商談を追加」ボタン（`/deals/[id]/meetings/new` へのリンク）を追加する
- [ ] `src/app/actions/meetings.ts` の `createMeetingAction` で `revalidatePath` に `/deals/[id]` のパスを追加する

**Acceptance Criteria**:
- `/deals/[id]/meetings/new` にアクセスできる
- 同ページから商談を作成すると案件詳細ページに戻りリバリデートされる

## T-12: 顧客詳細ページへの案件一覧セクション追加

- [ ] `src/app/(dashboard)/clients/[id]/page.tsx` で、`inquiryRepository.findByClientId(id, organizationId)` の結果の inquiryId 一覧から案件を取得する処理を追加する。`dealRepository.findByInquiryId` が 1:1 のため、各引き合いに対して案件を取得してまとめる（または `dealRepository` に `findByClientId` を追加する方法も可。複数 inquiry からの取得は Promise.all で対応）
- [ ] 同ページに「案件一覧」セクション（`SectionCard` を使用）を追加する。各案件の title・`phaseLabels[phase]`・assigneeName を一覧表示する。案件がない場合は「案件がありません」と表示する

**Acceptance Criteria**:
- 顧客詳細ページに「案件一覧」セクションが表示される
- 引き合い経由で関連する案件が表示される

## T-13: シードデータの修正

- [ ] `src/infrastructure/seed.ts` の `inProgressInquiry` の `status` を `"converted"` から `"in_progress"` に修正する（変数名と一致させる）。`contactId` 参照を削除する
- [ ] 新たに `convertedInquiry2` を追加するか既存を修正して、2件の converted 引き合いが各自の案件化承認リクエストに正しく紐づくようにする。`approvedRequest`（経費申請の承認リクエスト）への流用をやめ、案件化専用のリクエストを seed で作成する
- [ ] `newInquiry` の `contactId` 参照を削除する
- [ ] 商談シードに `dealId` を持つ商談（提案・交渉フェーズ）を1件以上追加する。案件が先に作成されている前提で dealId を参照する
- [ ] `deal_contacts` のシードデータを追加する（少なくとも1件: 既存案件に key_person ロールで連絡先を紐づける）
- [ ] シードの truncation 順序に `deal_contacts` の削除を追加する（`deals` 削除の前）
- [ ] 案件シードの `estimateRequestId` を、経費申請の `approvedRequest` ではなく seed 内で作成した案件化承認リクエストに変更する
- [ ] `contactId` を参照していた `inProgressInquiry`, `newInquiry` の seed 値から `contactId` を削除する
- [ ] `"contract"` 型の `contractType` が含まれている場合 `"fixed_price"` に修正する

**Acceptance Criteria**:
- `inProgressInquiry` の status が `"in_progress"` である
- converted 引き合いの `conversionRequestId` が経費申請の Request ではなく案件化承認専用の Request を参照する
- `deal_contacts` の seed データが存在する
- `meetingRepository.findAllByDeal` で案件直紐づき商談が取得できる
- seed 実行後に `bun test` が通る

## T-14: テストの修正と追加

- [ ] `src/__tests__/static/projectStructure.test.ts` のドメインモデルファイル一覧テスト（line 102-116 付近）を確認し、`deal.ts` に `DealContact`・`DealContactRole` が追加されたことを反映する
- [ ] `src/__tests__/static/projectStructure.test.ts` のドメインサービスファイル一覧テスト（line 139-158 付近）に変更がないか確認する
- [ ] `src/__tests__/static/projectStructure.test.ts` のテナント分離テスト（meeting 関連, line 973-1018 付近）に `dealId` を持つ商談のテナント分離確認を追加する（別テナントの dealId では取得できないことを検証）
- [ ] `src/__tests__/static/projectStructure.test.ts` のテナント分離テスト（deal 関連, line 1045-1098 付近）に `dealContactRepository` を用いたテスト（別テナントの deal_contact が取得できないこと）を追加する
- [ ] `src/__tests__/static/projectStructure.test.ts` の引き合いテナント分離テスト（line 877-967 付近）で `contactId` 参照を削除し、`conversionRequestId` に追従修正する
- [ ] `createMeeting` ユースケースのテスト（既存または新規作成）に、`inquiryId` と `dealId` の両方が null の場合にエラーが返ることを検証するテストを追加する
- [ ] `createMeeting` ユースケースのテストに、`dealId` のみ指定で成功することを検証するテストを追加する

**Acceptance Criteria**:
- `bun test` が全件 green
- `inquiryId` と `dealId` の両方が null の `createMeeting` 呼び出しがエラーを返すことがテストで確認されている
- `dealId` のみ指定の `createMeeting` がテストで成功することが確認されている
- テナント分離テストが `dealContactRepository` と meeting の `dealId` を含む
