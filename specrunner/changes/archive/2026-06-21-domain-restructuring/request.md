# ドメインモデル再構築と用語統一

## Meta

- **type**: refactoring
- **slug**: domain-restructuring
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: 引き合い・商談・案件のテーブル構造変更、FK 関係の再設計、ユビキタス言語の刷新 → true -->

## 背景

受託案件管理機能（顧客・引き合い・商談・案件）を3本のリクエストで構築したが、実際の業務フローとドメインモデルに以下の不整合が生じている。

1. **引き合いが構造化されすぎ**: 引き合いは外部から来る受付メモであり、顧客情報が不明な段階もある。しかし `clientId` が NOT NULL で事前登録が必須になっている
2. **商談が引き合いにのみ紐づく**: 案件化後の提案・交渉・クロージングの商談を案件に紐づけられない
3. **案件ごとの担当者の役割管理がない**: 同じ顧客でも案件によってキーマン・決裁者が異なるケースに対応できない
4. **用語の不整合**: 「商談化」が Meeting（商談記録）と converted（案件化判断）の2つの意味で使われている。`internal_approval`（社内承認）に「内示」（顧客からの通知）のラベルが当たっている
5. **ステータスラベルが各ファイルに重複定義されている**

## 現状コードの前提

<!-- 現状のコードについての断定（「今のコードはこうなっている」）は file:line を伴ってこの節に書く。 -->

- `src/infrastructure/schema.ts:36-41` — `inquiryStatusEnum`: `["new", "in_progress", "converted", "declined"]`
- `src/infrastructure/schema.ts:42-48` — `meetingTypeEnum`: `["hearing", "proposal", "negotiation", "closing", "followup"]`
- `src/infrastructure/schema.ts:49-56` — `dealPhaseEnum`: `["proposal_prep", "proposed", "negotiation", "internal_approval", "won", "lost"]`
- `src/infrastructure/schema.ts:230-242` — `clients` テーブル: id, organizationId, name, industry, size, address, notes, createdAt, updatedAt
- `src/infrastructure/schema.ts:245-257` — `clientContacts` テーブル: id, clientId, name, department, position, email, phone, isPrimary, createdAt
- `src/infrastructure/schema.ts:260-279` — `inquiries` テーブル: `clientId` が NOT NULL（line 264）、`contactId` FK to clientContacts（line 265）、`requestId` FK to requests（line 270）、`source` が text 型（line 267）
- `src/infrastructure/schema.ts:282-304` — `meetings` テーブル: `inquiryId` が NOT NULL（line 287-288）、`dealId` カラムなし
- `src/infrastructure/schema.ts:307-335` — `deals` テーブル: `contractType` が text 型（line 321）、`estimatedAmount` が integer 型（line 317）
- `src/infrastructure/schema.ts:377-390` — `organizationsRelations`: clients, inquiries, meetings, deals の many() 含む
- `src/infrastructure/schema.ts:399-414` — `usersRelations`: inquiries, meetings, dealsAsAssignee, dealsAsTechnicalLead の many() 含む
- `src/infrastructure/schema.ts:539-562` — `inquiriesRelations`: contact 参照（line 544）、request 参照（line 548）、meetings/deals の many()
- `src/infrastructure/schema.ts:564-577` — `meetingsRelations`: inquiry の one() のみ。deal の参照なし
- `src/infrastructure/schema.ts:579-602` — `dealsRelations`: estimateRequest の one() あり
- `src/infrastructure/schema.ts:603` — ファイル最終行
- `src/domain/models/inquiry.ts:5-19` — `Inquiry` 型: `clientId: string`（not nullable）、`contactId: string | null`、`requestId: string | null`
- `src/domain/models/meeting.ts:24-38` — `Meeting` 型: `inquiryId: string`（not nullable）、dealId なし
- `src/domain/models/deal.ts:9` — `ContractType = "quasi_delegation" | "contract" | "ses"`
- `src/domain/models/deal.ts:12-31` — `Deal` 型: `estimateRequestId: string | null`
- `src/domain/models/index.ts:1-24` — 全モデルの barrel export
- `src/domain/services/index.ts:10` — `canTransition` を inquiryTransition から export
- `src/domain/services/index.ts:11` — `canDealTransition` を dealTransition から export
- `src/infrastructure/repositories/index.ts:1-14` — 14リポジトリの namespace export
- `src/infrastructure/repositories/meetingRepository.ts:73-83` — `findAllByInquiry` のみ。findAllByDeal なし
- `src/application/usecases/updateInquiryStatus.ts:53-62` — converted 遷移で承認リクエスト作成。タイトル: `"商談化承認: ${inquiry.title}"`
- `src/application/usecases/updateDealPhase.ts:36` — エラーメッセージ: `"内示フェーズへの遷移にはテンプレートの指定が必要です"`
- `src/application/usecases/updateDealPhase.ts:57-66` — internal_approval 遷移で見積承認リクエスト作成。タイトル: `"見積承認: ${deal.title}"`
- `src/application/usecases/createDeal.ts:35` — エラーメッセージ: `"商談化済みの引き合いにのみ案件を作成できます"`
- `src/app/(dashboard)/inquiries/page.tsx:6-11` — `statusLabels` に `converted: "商談化済"`
- `src/app/(dashboard)/inquiries/page.tsx:13-19` — `sourceLabels` 定義（重複あり）
- `src/app/(dashboard)/inquiries/[id]/page.tsx:15-20` — `statusLabels` 重複定義
- `src/app/(dashboard)/inquiries/[id]/page.tsx:22-28` — `sourceLabels` 重複定義
- `src/app/(dashboard)/inquiries/[id]/page.tsx:30-36` — `meetingTypeLabels` 定義
- `src/app/(dashboard)/clients/[id]/page.tsx:7-12` — `statusLabels` 重複定義
- `src/app/(dashboard)/clients/[id]/page.tsx:14-20` — `sourceLabels` 重複定義
- `src/app/(dashboard)/deals/page.tsx:7-14` — `phaseLabels` に `internal_approval: "内示"`
- `src/app/(dashboard)/deals/[id]/page.tsx:14-21` — `phaseLabels` 重複定義
- `src/app/(dashboard)/deals/[id]/page.tsx:23-27` — `contractTypeLabels` に `contract: "請負"`
- `src/app/(dashboard)/inquiries/[id]/page.tsx:147-154` — インラインの phaseLabels 重複定義
- `src/app/(dashboard)/layout.tsx:25-30` — ナビ順序: 申請一覧 > 顧客 > 引き合い > 案件
- `src/app/(dashboard)/inquiries/[id]/InquiryActions.tsx:86` — ボタンラベル「商談化」
- `src/infrastructure/seed.ts:36-54` — truncation 順序: auditLogs → approvalSteps → deals → meetings → inquiries → ...
- `src/infrastructure/seed.ts:432-463` — 引き合いシード3件。`inProgressInquiry` が実際は `status: "converted"` で `requestId: null`。`convertedInquiry` が `requestId: approvedRequest.id`（経費申請の承認リクエスト）に紐づく
- `src/infrastructure/seed.ts:466-549` — 商談シード4件。全て inquiryId のみで dealId なし
- `src/infrastructure/seed.ts:552-570` — 案件シード2件。`convertedInquiry` に won、`inProgressInquiry` に proposed
- `src/__tests__/static/projectStructure.test.ts:102-116` — ドメインモデルファイル一覧
- `src/__tests__/static/projectStructure.test.ts:139-158` — ドメインサービスファイル一覧
- `src/__tests__/static/projectStructure.test.ts:877-967` — テナント分離テスト（client/inquiry）
- `src/__tests__/static/projectStructure.test.ts:973-1018` — テナント分離テスト（meeting）
- `src/__tests__/static/projectStructure.test.ts:1045-1098` — テナント分離テスト（deal）
- `src/__tests__/static/projectStructure.test.ts:1099` — ファイル最終行
- `src/app/actions/deals.ts:163-219` — `updateDealAction` にロールチェックなし

## 要件

<!-- コツ: 実装の最重量部（既存機構の一般化・暗黙の前提の変更）は行間に隠さず要件として名指しする。 -->

### A. スキーマ変更

1. **inquiries.clientId を nullable に変更**: 引き合い受付時に顧客が未確定でもよい。NOT NULL 制約を外す
2. **inquiries.contactId カラムを削除**: 担当者は商談で判明していくため、引き合いに持たせない。`inquiriesRelations` の `contact` 参照も削除する
3. **inquiries.requestId を conversionRequestId に改名**: 案件化承認リクエストであることを明示する。型名・リポジトリ・ユースケース・UI の全参照箇所を追従修正する
4. **meetings テーブルに dealId カラムを追加**: nullable FK to deals。`inquiryId` も nullable に変更する。ドメインルールとして `inquiryId` と `dealId` のどちらか一方は必須（アプリケーション層で検証、DB 制約は NOT NULL を外すのみ）
5. **meetingsRelations に deal の one() を追加**: `dealsRelations` に `meetings: many(meetings)` を追加する
6. **deal_contacts 中間テーブルを追加**: カラム: id (uuid PK), dealId (FK to deals, NOT NULL), contactId (FK to client_contacts, NOT NULL), role (text, NOT NULL — "key_person" | "decision_maker" | "technical" | "other"), createdAt。同一 deal + contactId の組み合わせに unique 制約
7. **deals.contractType の enum 値 `contract` を `fixed_price` に変更**: ドメインモデルの `ContractType` 型も `"quasi_delegation" | "fixed_price" | "ses"` に変更する
8. **dealPhaseEnum の `internal_approval` を `estimate_approval` に変更**: UIラベルを「内示」から「見積承認中」に変更する。ドメインモデル・サービス・ユースケースの全参照箇所を追従修正する

### B. ドメインモデル変更

9. **Inquiry 型の修正**: `clientId` を `string | null` に変更。`contactId` フィールドを削除。`requestId` を `conversionRequestId` に改名
10. **Meeting 型の修正**: `inquiryId` を `string | null` に変更。`dealId: string | null` フィールドを追加
11. **DealContact 型を追加**: `src/domain/models/deal.ts` に `DealContact = { id, dealId, contactId, role, createdAt }` と `DealContactRole = "key_person" | "decision_maker" | "technical" | "other"` を追加する。`src/domain/models/index.ts` に追記
12. **ContractType 修正**: `"contract"` → `"fixed_price"` に変更
13. **DealPhase 修正**: `"internal_approval"` → `"estimate_approval"` に変更

### C. リポジトリ変更

14. **inquiryRepository の修正**: `contactId` 関連のカラム参照を削除。`requestId` → `conversionRequestId` に全箇所改名
15. **meetingRepository の修正**: `findAllByDeal(dealId, organizationId)` メソッドを追加。`findAllByInquiryOrDeal(inquiryId, organizationId)` メソッドを追加（案件に紐づく引き合いの商談も含めて返す）。create メソッドで `dealId` を受け付ける
16. **dealContactRepository を追加**: `src/infrastructure/repositories/dealContactRepository.ts` に create, findByDeal, delete を実装する。`src/infrastructure/repositories/index.ts` に追記

### D. ユースケース変更

17. **updateInquiryStatus の修正**: `requestId` → `conversionRequestId` に改名。承認リクエストのタイトルを `"商談化承認:"` → `"案件化承認: ${inquiry.title}"` に変更。エラーメッセージの「商談化」を「案件化」に統一
18. **createDeal の修正**: エラーメッセージ `"商談化済みの引き合いにのみ"` → `"案件化済みの引き合いにのみ"` に変更
19. **updateDealPhase の修正**: `internal_approval` → `estimate_approval` に変更。エラーメッセージ `"内示フェーズ"` → `"見積承認フェーズ"` に変更
20. **createMeeting の修正**: `dealId` パラメータを受け付ける。`inquiryId` と `dealId` のどちらか一方が必須のバリデーションを追加
21. **createInquiry の修正**: `clientId` を optional に変更。`contactId` パラメータを削除

### E. Server Actions 変更

22. **actions/inquiries.ts の修正**: createInquirySchema から `contactId` を削除。`clientId` を optional に変更
23. **actions/meetings.ts の修正**: `dealId` を受け付ける。`inquiryId` と `dealId` のバリデーション
24. **actions/deals.ts の修正**: `updateDealAction` に admin/manager のロールチェックを追加

### F. UI 変更

25. **ラベル定義の集約**: `src/app/(dashboard)/labels.ts` を新設し、`statusLabels`, `sourceLabels`, `meetingTypeLabels`, `phaseLabels`, `contractTypeLabels` を一箇所で定義する。各ページから import に変更する
26. **用語修正**: statusLabels の `converted: "商談化済"` → `"案件化済"` に変更。phaseLabels の `internal_approval: "内示"` → `"見積承認中"` に変更。contractTypeLabels の `contract: "請負"` → `fixed_price: "請負"` に変更
27. **InquiryActions.tsx の修正**: ボタンラベル「商談化」→「案件化」、「商談化する」→「案件化する」に変更。承認テンプレート選択の見出し文言も修正
28. **ナビゲーション順序変更**: layout.tsx のナビを「顧客 > 引き合い > 案件 > 申請一覧」の順に変更
29. **引き合い作成フォームの修正**: `contactId` フィールドを削除。`clientId` を任意に変更（選択肢に「未定」を追加）
30. **商談作成フォームの修正**: `dealId` を受け付けるルーティング対応。案件詳細から商談作成できるよう `/deals/[id]/meetings/new` ルートを追加する
31. **案件詳細ページに商談履歴セクションを追加**: 引き合い時代の商談 + 案件の商談を統合表示する
32. **顧客詳細ページに案件一覧セクションを追加**: 引き合い経由で関連する案件を表示する

### G. シードデータ修正

33. **シードデータを業務フローに沿って修正する**:
    - `inProgressInquiry` の status を `"in_progress"` に修正（変数名と一致させる）。clientId あり、assigneeId あり
    - 新たに `convertedInquiry2` を追加するか、既存を修正して converted の引き合い2件が正しく承認リクエストに紐づくようにする
    - 案件の `estimateRequestId` は承認テンプレートから作成された Request に紐づける（経費申請の Request を流用しない）
    - 商談シードに `dealId` を持つ商談（提案・交渉）を含める
    - `deal_contacts` のシードデータを追加する

### H. テスト修正

34. **projectStructure.test.ts の修正**: テナント分離テスト（meeting）に `dealId` 関連のテストを追加。テナント分離テストに dealContactRepository を追加
35. **既存テストの追従修正**: `contactId` 削除、`requestId` → `conversionRequestId` 改名、enum 値変更に伴うテスト修正
36. **Meeting の紐づけバリデーションテストを追加**: `inquiryId` と `dealId` の両方が null の場合にエラーになることをテストする

## スコープ外

- 承認リクエストの初期ステータス変更（draft → pending）— Request 2 で対応
- 承認完了後の自動フェーズ進行 — Request 2 で対応
- 引き合い作成時の顧客同時登録 UI — Request 3 で対応
- 商談記録からの担当者（ClientContact）登録 UI — Request 3 で対応

## 受け入れ基準

<!-- コツ: 機械検証できる文にする -->

- [ ] `bun run build` が成功する
- [ ] `bun test` が全件 green
- [ ] `inquiries.clientId` が nullable である（schema.ts で `.notNull()` がない）
- [ ] `inquiries` テーブルに `contactId` カラムが存在しない
- [ ] `inquiries` テーブルの FK 名が `conversionRequestId` である
- [ ] `meetings` テーブルに `dealId` カラム（nullable FK）が存在する
- [ ] `meetings.inquiryId` が nullable である
- [ ] `deal_contacts` テーブルが schema.ts に定義されている
- [ ] `dealPhaseEnum` に `estimate_approval` が含まれ、`internal_approval` が含まれない
- [ ] `ContractType` に `fixed_price` が含まれ、`contract` が含まれない
- [ ] Meeting 作成時に `inquiryId` と `dealId` の両方が null だとエラーが返る
- [ ] Meeting 作成時に `dealId` のみ指定で成功する
- [ ] ステータスラベルが `src/app/(dashboard)/labels.ts` に集約されている
- [ ] UI 上で `converted` のラベルが「案件化済」と表示される
- [ ] UI 上で `estimate_approval` のラベルが「見積承認中」と表示される
- [ ] ナビゲーション順序が「顧客 > 引き合い > 案件 > 申請一覧」である
- [ ] 案件詳細ページに商談履歴セクションが表示される
- [ ] 顧客詳細ページに案件一覧セクションが表示される
- [ ] `updateDealAction` が admin/manager のみ実行可能
- [ ] 全リポジトリの新規クエリに `organizationId` 条件が付与されている
- [ ] 承認リクエストのタイトルが `"案件化承認: ..."` になっている
- [ ] シードデータの変数名と status が一致している
- [ ] 依存方向 `actions → usecases → domain / infrastructure` を遵守
- [ ] `typecheck` が green

## architect 評価済みの設計判断

<!-- コツ: 採用した判断に加え、却下した代替案とその理由を書く。 -->

1. **inquiries.clientId を nullable に変更を採用、clientId 必須を維持して「不明顧客」レコードで代替を却下** — 「不明顧客」はドメイン上の意味がなく、検索やフィルタでノイズになる。null が「未確定」を最も素直に表現する
2. **inquiries.contactId を削除を採用、nullable にして残すを却下** — 担当者は商談で判明していくものであり、引き合い受付時点で紐づける業務上の意味がない。残すと引き合い作成フォームに不要なフィールドが残り、入力を強制しないにしても混乱を招く
3. **meetings に dealId を追加し inquiryId を nullable にするを採用、meetings を引き合いのみに紐づけて案件は引き合い経由で辿るを却下** — 案件化後の商談（提案・交渉）は案件に対する活動であり、引き合い経由の間接参照は動線が不自然。案件詳細から商談を直接表示する必要がある
4. **deal_contacts 中間テーブルを採用、deals テーブルに keyPersonId 等のカラムを追加するを却下** — 案件ごとに関わる担当者は複数かつ役割が異なる。固定カラムでは数と種類の変動に対応できない
5. **ステータスラベルを共通モジュールに集約を採用、各ファイルでの個別定義を却下** — 6ファイルに同じラベル定義が散在しており、用語変更時の漏れリスクが高い。1箇所で管理することで一貫性を保証する
6. **internal_approval → estimate_approval に改名を採用、internal_approval のままラベルだけ変更を却下** — 「内示」は顧客からの意思表示であり、社内の見積承認とは異なる概念。enum 値自体が意味を正確に伝えるべき
7. **contract → fixed_price に改名を採用** — `contract` は一般的すぎて契約種別としての識別力がない。`quasi_delegation`（準委任）と同じ粒度で `fixed_price`（請負）にする
