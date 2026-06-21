# Test Cases: ドメインモデル再構築と用語統一

## Summary

- **Total**: 59 cases
- **Automated** (unit/integration): 51
- **Manual**: 8
- **Priority**: must: 49, should: 10, could: 0

---

### TC-001: 顧客未選択で引き合いを作成する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 引き合いは顧客未確定で作成できる > Scenario: 顧客未選択で引き合いを作成する

---

### TC-002: 顧客を選択して引き合いを作成する

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: 引き合いは顧客未確定で作成できる > Scenario: 顧客を選択して引き合いを作成する

---

### TC-003: inquiryId のみで商談を作成する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 商談は引き合いまたは案件のどちらか一方に必ず紐づく > Scenario: inquiryId のみで商談を作成する

---

### TC-004: dealId のみで商談を作成する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 商談は引き合いまたは案件のどちらか一方に必ず紐づく > Scenario: dealId のみで商談を作成する

---

### TC-005: inquiryId と dealId の両方が null で商談作成を試みる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 商談は引き合いまたは案件のどちらか一方に必ず紐づく > Scenario: inquiryId と dealId の両方が null

---

### TC-006: converted への遷移で承認リクエストのタイトルが「案件化承認: {title}」になる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 案件化への遷移は「案件化」という用語で統一される > Scenario: 案件化承認リクエストのタイトル

---

### TC-007: 案件化済み引き合いへ案件を重複作成しようとするとエラーが返る

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: 案件化への遷移は「案件化」という用語で統一される > Scenario: 案件化済み引き合いへの案件重複作成

---

### TC-008: テンプレートなしで estimate_approval へ遷移しようとするとエラーが返る

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 見積承認フェーズへの遷移はテンプレートが必要 > Scenario: テンプレートなしで見積承認フェーズへ遷移する

---

### TC-009: テンプレートありで estimate_approval へ遷移すると承認リクエストが作成される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 見積承認フェーズへの遷移はテンプレートが必要 > Scenario: テンプレートありで見積承認フェーズへ遷移する

---

### TC-010: member ロールのユーザーが updateDealAction を呼び出すと権限エラーが返る

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 案件更新は admin と manager のみが実行できる > Scenario: member ロールによる案件更新

---

### TC-011: admin ロールのユーザーが updateDealAction を呼び出すと成功する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 案件更新は admin と manager のみが実行できる > Scenario: admin ロールによる案件更新

---

### TC-012: 案件に担当者を role 付きで登録できる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 案件ごとの担当者と役割を管理できる > Scenario: 案件に担当者を登録する

---

### TC-013: 同一 (dealId, contactId) の組み合わせを重複登録すると一意制約違反が返る

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: 案件ごとの担当者と役割を管理できる > Scenario: 同一担当者の重複登録

---

### TC-014: phaseLabels は labels.ts のみで定義され各ページで estimate_approval が「見積承認中」と表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: UIラベルは単一ソースから供給される > Scenario: 用語の一括変更

---

### TC-015: schema.ts の dealPhaseEnum に estimate_approval が含まれ internal_approval が含まれない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `src/infrastructure/schema.ts` に `dealPhaseEnum` が定義されている
**WHEN** `dealPhaseEnum` の値配列を参照する
**THEN** `"estimate_approval"` が含まれ、`"internal_approval"` が含まれない

---

### TC-016: schema.ts の inquiries テーブルで clientId に .notNull() が付いていない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `src/infrastructure/schema.ts` の `inquiries` テーブル定義
**WHEN** `clientId` カラムの制約を参照する
**THEN** `.notNull()` が存在しない

---

### TC-017: schema.ts の inquiries テーブルに contactId カラムが存在しない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `src/infrastructure/schema.ts` の `inquiries` テーブル定義
**WHEN** カラム一覧を参照する
**THEN** `contactId` カラムが存在しない

---

### TC-018: schema.ts の inquiries テーブルに conversionRequestId カラムが存在する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `src/infrastructure/schema.ts` の `inquiries` テーブル定義
**WHEN** カラム一覧を参照する
**THEN** `conversionRequestId`（DB カラム名: `conversion_request_id`）が存在し、`requestId` が存在しない

---

### TC-019: schema.ts の meetings テーブルに dealId カラム（nullable）が存在する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `src/infrastructure/schema.ts` の `meetings` テーブル定義
**WHEN** カラム一覧を参照する
**THEN** `dealId` カラムが存在し、`.notNull()` が付いていない

---

### TC-020: schema.ts の meetings テーブルで inquiryId に .notNull() が付いていない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `src/infrastructure/schema.ts` の `meetings` テーブル定義
**WHEN** `inquiryId` カラムの制約を参照する
**THEN** `.notNull()` が存在しない

---

### TC-021: schema.ts に deal_contacts テーブルが定義されており (dealId, contactId) の unique 制約がある

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `src/infrastructure/schema.ts`
**WHEN** `dealContacts` テーブル定義を参照する
**THEN** `id`・`dealId`・`contactId`・`role`・`createdAt` カラムが存在し、`(dealId, contactId)` の unique 制約が設定されている

---

### TC-022: Inquiry 型に contactId フィールドが存在しない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `src/domain/models/inquiry.ts` の `Inquiry` 型定義
**WHEN** 型フィールド一覧を参照する
**THEN** `contactId` フィールドが存在しない

---

### TC-023: Inquiry 型の conversionRequestId が string | null であり requestId が存在しない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `src/domain/models/inquiry.ts` の `Inquiry` 型定義
**WHEN** フィールド一覧を参照する
**THEN** `conversionRequestId: string | null` が存在し、`requestId` フィールドが存在しない

---

### TC-024: Inquiry 型の clientId が string | null である

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `src/domain/models/inquiry.ts` の `Inquiry` 型定義
**WHEN** `clientId` フィールドの型を参照する
**THEN** 型が `string | null` である

---

### TC-025: DealPhase 型に estimate_approval が含まれ internal_approval が含まれない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `src/domain/models/deal.ts` の `DealPhase` 型定義
**WHEN** 型の値域を参照する
**THEN** `"estimate_approval"` が含まれ、`"internal_approval"` が含まれない

---

### TC-026: ContractType 型に fixed_price が含まれ contract が含まれない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `src/domain/models/deal.ts` の `ContractType` 型定義
**WHEN** 型の値域を参照する
**THEN** `"fixed_price"` が含まれ、`"contract"` が含まれない

---

### TC-027: DealContact・DealContactRole が domain/models/index.ts からエクスポートされている

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-02

**GIVEN** `src/domain/models/deal.ts` に `DealContact` 型と `DealContactRole` 型が定義されている
**WHEN** `src/domain/models/index.ts` を参照する
**THEN** `DealContact` と `DealContactRole` が export されている

---

### TC-028: canDealTransition("negotiation", "estimate_approval") が true を返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `src/domain/services/dealTransition.ts` の遷移マップが `estimate_approval` に更新されている
**WHEN** `canDealTransition("negotiation", "estimate_approval")` を呼び出す
**THEN** `true` が返る

---

### TC-029: canDealTransition("negotiation", "internal_approval") が false を返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `src/domain/services/dealTransition.ts` の遷移マップから `internal_approval` が削除されている
**WHEN** `canDealTransition("negotiation", "internal_approval" as never)` を呼び出す
**THEN** `false` が返る

---

### TC-030: inquiryRepository の updateStatus が conversionRequestId パラメータを使用する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** `src/infrastructure/repositories/inquiryRepository.ts` の `updateStatus` 関数定義
**WHEN** 関数シグネチャとクエリ内 set 句を参照する
**THEN** パラメータ名が `conversionRequestId` であり、`requestId` が存在しない

---

### TC-031: meetingRepository.findAllByDeal が organizationId 条件を含み別テナントの商談を返さない

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** テナントAの案件に商談が存在し、テナントBの案件にも商談が存在する
**WHEN** テナントAの `organizationId` で `findAllByDeal(dealId, organizationId)` を呼び出す
**THEN** テナントAの商談のみ返り、テナントBの商談は含まれない

---

### TC-032: meetingRepository.findAllByInquiryOrDeal が案件の引き合い商談も含めて返す

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** 引き合いAと案件（inquiryId=引き合いA）が存在し、引き合いAの商談1件・案件に直紐づきの商談1件がある
**WHEN** `findAllByInquiryOrDeal(引き合いA.id, organizationId)` を呼び出す
**THEN** 2件の商談が返る

---

### TC-033: dealContactRepository.findByDeal が organizationId 条件を含み別テナントのデータを返さない

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** テナントAの案件に担当者が登録されており、テナントBの organizationId で検索する
**WHEN** `dealContactRepository.findByDeal(dealId, tenantB.organizationId)` を呼び出す
**THEN** テナントAの担当者レコードは返らない

---

### TC-034: dealContactRepository が repositories/index.ts からエクスポートされている

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** `src/infrastructure/repositories/dealContactRepository.ts` が作成されている
**WHEN** `src/infrastructure/repositories/index.ts` を参照する
**THEN** `dealContactRepository` が export されている

---

### TC-035: createDeal のエラーメッセージに「案件化済みの引き合いにのみ」が含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** `src/application/usecases/createDeal.ts` の実装
**WHEN** ステータスが `converted` でない引き合いで `createDeal` を呼び出す
**THEN** 返るエラーに「案件化済みの引き合いにのみ」が含まれ、「商談化済み」が含まれない

---

### TC-036: updateDealPhase のエラーメッセージに「見積承認フェーズへの遷移には」が含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** `src/application/usecases/updateDealPhase.ts` の実装
**WHEN** `templateId` を指定せず `estimate_approval` への遷移を試みる
**THEN** エラーに「見積承認フェーズへの遷移には」が含まれ、「内示フェーズ」が含まれない

---

### TC-037: createInquiry が clientId なしで成功し inquiryId が null で保存される

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** `src/application/usecases/createInquiry.ts` が clientId を optional に変更されている
**WHEN** `clientId` を省略して `createInquiry` を呼び出す
**THEN** 引き合いが `clientId = null` で DB に保存され、エラーは返らない

---

### TC-038: updateDealPhase が estimate_approval への遷移で承認リクエストを作成しフェーズを更新する

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** 案件が `negotiation` フェーズにあり、有効な `templateId` が存在する
**WHEN** `updateDealPhase` で `estimate_approval` への遷移を呼び出す
**THEN** 承認リクエストが作成され、案件フェーズが `estimate_approval` に更新される

---

### TC-039: createInquiryAction のスキーマに contactId フィールドが存在しない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** `src/app/actions/inquiries.ts` の `createInquirySchema` 定義
**WHEN** スキーマのフィールド一覧を参照する
**THEN** `contactId` フィールドが存在しない

---

### TC-040: createMeetingAction のスキーマで inquiryId が optional かつ dealId フィールドが追加されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** `src/app/actions/meetings.ts` の `createMeetingSchema` 定義
**WHEN** スキーマを参照する
**THEN** `inquiryId` が `optional()` であり、`dealId: z.string().uuid().optional()` が存在する

---

### TC-041: createMeetingAction が inquiryId・dealId 両方未指定のフォームデータでエラーを返す

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** `inquiryId` も `dealId` も含まないフォームデータ
**WHEN** `createMeetingAction` を呼び出す
**THEN** `{ message: "引き合いまたは案件のどちらかを指定してください" }` が返る

---

### TC-042: labels.ts が存在し5種類すべてのラベルをエクスポートする

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** `src/app/(dashboard)/labels.ts` が新規作成されている
**WHEN** ファイルのエクスポート一覧を参照する
**THEN** `statusLabels`・`sourceLabels`・`meetingTypeLabels`・`phaseLabels`・`contractTypeLabels` がすべてエクスポートされている

---

### TC-043: labels.ts の statusLabels.converted が「案件化済」である

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** `src/app/(dashboard)/labels.ts` の `statusLabels` 定義
**WHEN** `statusLabels.converted` を参照する
**THEN** 値が `"案件化済"` であり `"商談化済"` ではない

---

### TC-044: labels.ts の phaseLabels に estimate_approval が「見積承認中」で存在し internal_approval が存在しない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** `src/app/(dashboard)/labels.ts` の `phaseLabels` 定義
**WHEN** `phaseLabels` のキー一覧を参照する
**THEN** `estimate_approval` キーが `"見積承認中"` の値で存在し、`internal_approval` キーが存在しない

---

### TC-045: labels.ts の contractTypeLabels に fixed_price が「請負」で存在し contract が存在しない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** `src/app/(dashboard)/labels.ts` の `contractTypeLabels` 定義
**WHEN** `contractTypeLabels` のキー一覧を参照する
**THEN** `fixed_price` キーが `"請負"` の値で存在し、`contract` キーが存在しない

---

### TC-046: 各ページファイルにローカルのラベル定義が存在しない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** `inquiries/page.tsx`・`inquiries/[id]/page.tsx`・`clients/[id]/page.tsx`・`deals/page.tsx`・`deals/[id]/page.tsx` の各ファイル
**WHEN** ファイル内の変数宣言を参照する
**THEN** `statusLabels`・`sourceLabels`・`meetingTypeLabels`・`phaseLabels`・`contractTypeLabels` のローカル定義が存在しない

---

### TC-047: deals/page.tsx の allPhases 配列に estimate_approval が含まれ internal_approval が含まれない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** `src/app/(dashboard)/deals/page.tsx` の `allPhases` 配列定義
**WHEN** 配列の要素を参照する
**THEN** `"estimate_approval"` が含まれ、`"internal_approval"` が含まれない

---

### TC-048: InquiryActions.tsx に「商談化」の文言が存在しない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** `src/app/(dashboard)/inquiries/[id]/InquiryActions.tsx` の全テキスト
**WHEN** ファイル内の文字列リテラルを参照する
**THEN** 「商談化」という文字列が存在せず、「案件化」に統一されている

---

### TC-049: ナビゲーション順序が「顧客 > 引き合い > 案件 > 申請一覧」になっている

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** アプリケーションが起動しており、ダッシュボードにアクセスしている
**WHEN** サイドバーのナビゲーション項目を確認する
**THEN** 「顧客」「引き合い」「案件」「申請一覧」の順でナビゲーション項目が表示される

---

### TC-050: 引き合い作成フォームに contactId フィールドが表示されない

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** `/inquiries/new` ページにアクセスしている
**WHEN** 引き合い作成フォームを表示する
**THEN** 担当者（contactId）選択フィールドが表示されない

---

### TC-051: 引き合い作成フォームで顧客を「未定」のまま送信できる

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** `/inquiries/new` ページにアクセスし、顧客フィールドが「未定」（未選択）の状態
**WHEN** 必須項目のみ入力してフォームを送信する
**THEN** バリデーションエラーが表示されず、引き合いが作成される

---

### TC-052: 案件詳細ページに「商談履歴」セクションが表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** 引き合いに紐づく商談が存在する案件の詳細ページにアクセスしている
**WHEN** ページを表示する
**THEN** 「商談履歴」セクションが表示され、引き合い時代の商談（type・date・summary）が一覧に含まれる

---

### TC-053: /deals/[id]/meetings/new から商談を作成すると案件詳細に戻りリバリデートされる

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-11

**GIVEN** `/deals/{dealId}/meetings/new` にアクセスしている
**WHEN** 商談情報を入力してフォームを送信する
**THEN** `/deals/{dealId}` にリダイレクトされ、作成した商談が「商談履歴」セクションに表示される

---

### TC-054: 顧客詳細ページに「案件一覧」セクションが表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-12

**GIVEN** 引き合いを経由して案件が存在する顧客の詳細ページにアクセスしている
**WHEN** ページを表示する
**THEN** 「案件一覧」セクションが表示され、関連する案件のタイトル・フェーズ・担当者が確認できる

---

### TC-055: deal.inquiryId が null の案件の商談取得が findAllByDeal にフォールバックする

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-10

**GIVEN** `inquiryId = null` の案件が存在し、その案件に直接紐づく商談が1件ある
**WHEN** 案件詳細ページで商談一覧を取得する処理を実行する
**THEN** `meetingRepository.findAllByDeal` が呼ばれ、商談1件が返る（型エラーが発生しない）

---

### TC-056: シード実行後 inProgressInquiry の status が in_progress になっている

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-13

**GIVEN** `src/infrastructure/seed.ts` が修正されている
**WHEN** `bun run seed` を実行する
**THEN** 変数 `inProgressInquiry` に対応する引き合いの status が `"in_progress"` である

---

### TC-057: シード実行後 deal_contacts にデータが存在する

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-13

**GIVEN** `src/infrastructure/seed.ts` に deal_contacts のシードが追加されている
**WHEN** `bun run seed` を実行する
**THEN** `deal_contacts` テーブルに少なくとも1件のレコードが存在する

---

### TC-058: シード実行後 converted 引き合いの conversionRequestId が案件化承認専用 Request を参照する

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-13

**GIVEN** `bun run seed` 実行後
**WHEN** converted ステータスの引き合いの `conversionRequestId` を参照する
**THEN** 参照先 Request の title が「案件化承認:」で始まり、経費申請の Request ではない

---

### TC-059: bun run build が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md（受け入れ基準）

**GIVEN** 全タスクの実装が完了している
**WHEN** `bun run build` を実行する
**THEN** TypeScript コンパイルエラーおよびビルドエラーが発生しない

---

## Result

```yaml
result: completed
total: 59
automated: 51
manual: 8
must: 49
should: 10
could: 0
blocked_reasons: []
```
