# 案件管理と見積承認フロー連携

## Meta

- **type**: new-feature
- **slug**: deal-management
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: 引き合いから案件への転換パターン確立、見積承認で既存承認フローとの新しい連携ポイント追加、フェーズ遷移モデルの導入 → true -->

## 背景

顧客・引き合い・商談の基盤が整った。最後のピースとして「案件（Deal）」を導入する。引き合いが商談化（converted）された後、提案準備から受注・失注までのフェーズを管理する。

見積承認を既存の承認テンプレートで回すことで、引き合いの Go/No-Go 承認に続く2つ目の承認フロー連携パターンを確立する。

## 現状コードの前提

<!-- 現状のコードについての断定（「今のコードはこうなっている」）は file:line を伴ってこの節に書く。 -->

- `src/infrastructure/schema.ts:42-48` — `meetingTypeEnum` がファイル内の最後の enum。新 enum はこの後に追加する
- `src/infrastructure/schema.ts:252-271` — `inquiries` テーブルに `requestId` FK（nullable, requests への参照）がある（line 266）。商談化承認リクエストとの紐づけパターンが実装済み
- `src/infrastructure/schema.ts:274-296` — `meetings` テーブルが定義済み。`inquiryId` FK で引き合いに紐づく
- `src/infrastructure/schema.ts:338-350` — `organizationsRelations` に `clients`, `inquiries`, `meetings` の `many()` が定義済み
- `src/infrastructure/schema.ts:497-519` — `inquiriesRelations` に `meetings: many(meetings)` が定義済み（line 518）
- `src/infrastructure/schema.ts:534` — ファイル最終行。新 relations はこの後に追加する
- `src/application/usecases/updateInquiryStatus.ts:36-132` — `converted` 遷移時に承認リクエストを自動作成するパターンが実装済み。`filterStepsByCondition` でテンプレートステップをフィルタし、`requestRepository.create` + `approvalStepRepository.createMany` をトランザクション内で実行
- `src/application/usecases/updateInquiryStatus.ts:53-62` — 承認リクエスト作成時のタイトル: `"商談化承認: ${inquiry.title}"`。同じパターンで見積承認リクエストを作成する
- `src/application/usecases/createRequest.ts:37` — `filterStepsByCondition(selectedTemplate.steps, data.formData)` でフォームデータに基づく条件付きステップフィルタ
- `src/application/usecases/createRequest.ts:53-64` — `approvalStepRepository.createMany` で期限計算: `new Date(now.getTime() + s.deadlineHours * 60 * 60 * 1000)`
- `src/domain/models/inquiry.ts:5-19` — `Inquiry` 型に `requestId: string | null` がある。案件も同様に承認リクエストへの参照を持つ
- `src/domain/models/approvalTemplate.ts:22-29` — `ApprovalTemplate` 型。`fields: TemplateField[]` でフォーム定義を持つ
- `src/domain/services/approvalStepService.ts:136-141` — `filterStepsByCondition(steps, formData)` が公開済み
- `src/domain/services/inquiryTransition.ts:4-7` — 遷移マップパターン: `VALID_TRANSITIONS` で `from → to[]` を定義し `canTransition` で検証
- `src/app/(dashboard)/layout.tsx:27-42` — ヘッダーナビに「申請一覧」「顧客」「引き合い」が配置済み
- `src/app/(dashboard)/inquiries/[id]/page.tsx:111-127` — 引き合い詳細に「承認情報」セクション。requestId があれば承認リクエストへのリンクを表示
- `src/app/(dashboard)/inquiries/[id]/page.tsx:130-195` — 引き合い詳細に「商談履歴」セクション
- `src/infrastructure/seed.ts:35-51` — truncation 順序。meetings(38) → inquiries(39) → clientContacts(40) → clients(41) → requests(42)
- `src/infrastructure/seed.ts:428-460` — 引き合いシードデータ。converted の引き合い（DX推進プロジェクト受注）が approvedRequest に紐づく
- `src/__tests__/static/projectStructure.test.ts:102-115` — ドメインモデルファイル一覧
- `src/__tests__/static/projectStructure.test.ts:137-158` — ドメインサービスファイル一覧
- `src/__tests__/static/projectStructure.test.ts:970-1015` — テナント分離テスト（meeting）
- `src/application/usecases/index.ts:19-26` — client/inquiry/meeting のユースケース export

## 要件

<!-- コツ: 実装の最重量部（既存機構の一般化・暗黙の前提の変更）は行間に隠さず要件として名指しする。 -->

1. **dealPhaseEnum 追加**: `["proposal_prep", "proposed", "negotiation", "internal_approval", "won", "lost"]`。`proposal_prep` = 提案準備、`proposed` = 提案済、`negotiation` = 交渉中、`internal_approval` = 内示（社内承認待ち）、`won` = 受注、`lost` = 失注
2. **deals テーブル追加**: カラム: id (uuid PK), organizationId (FK), inquiryId (FK to inquiries), title (text — 案件名), phase (dealPhaseEnum), estimatedAmount (integer, nullable — 想定金額), estimatedStartDate (timestamp, nullable — 想定開始日), estimatedEndDate (timestamp, nullable — 想定終了日), contractType (text, nullable — 契約種別: "quasi_delegation" | "contract" | "ses" | null), assigneeId (FK to users, nullable — 営業担当), technicalLeadId (FK to users, nullable — 技術担当), estimateRequestId (FK to requests, nullable — 見積承認リクエスト), notes (text, nullable — 備考), createdAt, updatedAt, version (integer, default 1 — 楽観ロック)
3. **ドメインモデル追加**: `src/domain/models/deal.ts` に `DealPhase` 型（union literal）、`ContractType` 型（`"quasi_delegation" | "contract" | "ses"`）、`Deal` 型、`DealWithInquiry` 型（`Deal & { inquiryTitle: string, clientName: string }`）を追加する。`src/domain/models/index.ts` に追記する
4. **ドメインサービス追加**: `src/domain/services/dealTransition.ts` を追加する。フェーズ遷移ルール: `proposal_prep → proposed | lost`, `proposed → negotiation | lost`, `negotiation → internal_approval | lost`, `internal_approval → won | lost`, `won` と `lost` は終端状態。`canTransition(from, to): boolean` を公開する。`src/domain/services/index.ts` に追記する
5. **リポジトリ追加**: `src/infrastructure/repositories/dealRepository.ts` を追加する。メソッド: create, findById, findAllByOrganization (JOIN inquiries + clients で DealWithInquiry を返す), findByInquiryId, update, updatePhase (楽観ロック付き)。全クエリに organizationId 条件。トランザクション対応。`src/infrastructure/repositories/index.ts` に追記する
6. **ユースケース追加**: `src/application/usecases/` に以下を追加。全ユースケースで監査ログ記録。`src/application/usecases/index.ts` に追記する
   - `createDeal.ts` — 案件を作成する。inquiryId 必須。`inquiryRepository.findById` で引き合い存在確認。引き合いのステータスが `converted` であることを検証する。1つの引き合いに対して作成できる案件は1件のみ（`dealRepository.findByInquiryId` で重複チェック）
   - `listDeals.ts` — 組織内の案件一覧を返す（DealWithInquiry）
   - `getDeal.ts` — 案件詳細を返す（関連する引き合い・顧客情報込み）
   - `updateDealPhase.ts` — 案件のフェーズを遷移する。`dealTransition.canTransition()` でバリデーション。`internal_approval` への遷移時に承認テンプレートを指定して見積承認リクエスト（Request）を自動作成し、`deals.estimateRequestId` に紐づける。承認リクエストのタイトルは `"見積承認: ${deal.title}"`。フォームデータとして `{ amount: { value: deal.estimatedAmount, label: "想定金額" } }` を渡す
   - `updateDeal.ts` — 案件情報を更新する（title, estimatedAmount, estimatedStartDate, estimatedEndDate, contractType, assigneeId, technicalLeadId, notes）
7. **Server Actions 追加**: `src/app/actions/deals.ts` を追加する。`"use server"` 宣言、認証チェック、Zod バリデーション、レート制限。案件の作成・フェーズ変更は admin と manager のみ。案件情報の更新は全ロールが実行可能
8. **UI ページ追加**:
   - `/deals` — 案件一覧ページ。DataTable でフェーズ・案件名・顧客名・想定金額・担当者を表示。フェーズフィルタ
   - `/deals/[id]` — 案件詳細ページ。案件情報、フェーズ変更ボタン、関連する引き合い・商談へのリンク、見積承認リクエストへのリンク（estimateRequestId がある場合）、案件情報の編集フォーム
   - 引き合い詳細ページ（`/inquiries/[id]`）に「案件」セクションを追加する。引き合いに紐づく案件があればリンクを表示。converted ステータスで案件が未作成の場合は「案件を作成」ボタンを表示する
9. **ナビゲーション追加**: ダッシュボード `layout.tsx` のヘッダーナビに「案件」（`/deals`）を追加する。「引き合い」の後に配置。全ロールに表示する
10. **Relations 定義追加**: `schema.ts` に `dealsRelations` を追加する。`organizationsRelations` に `deals: many(deals)` を追記する。`usersRelations` に `dealsAsAssignee` と `dealsAsTechnicalLead` の2つの `many(deals)` を `relationName` 付きで追記する。`inquiriesRelations` に `deals: many(deals)` を追記する
11. **シードデータ追加**: `seed.ts` に案件2件を追加する。1件は `won` フェーズ（受注済み、converted の引き合いに紐づく）、1件は `proposed` フェーズ（提案済、in_progress の引き合いを converted に変更するか、別途 converted の引き合いを追加する）。テーブル truncation 順序に `deals` を `meetings` の前に追加する
12. **テスト追加**: `projectStructure.test.ts` のモデルファイル一覧に `deal.ts` を追記する。ドメインサービスファイル一覧に `dealTransition.ts` を追記する。テナント分離テストに `dealRepository` を追加する。`src/__tests__/domain/dealTransition.test.ts` でフェーズ遷移テストを追加する。`src/__tests__/usecases/dealManagement.test.ts` で案件作成・フェーズ変更・見積承認連携のテストを追加する

## スコープ外

- プロジェクト進行管理（受注後のキックオフ→納品→検収）— 将来のリクエストで対応
- 契約管理（契約書アップロード、契約条件の詳細管理）
- 見積明細の管理（項目・工数・単価）
- 提案書・見積書のファイル添付
- 案件の売上予測・パイプラインダッシュボード
- 案件の削除
- ページネーション・検索・ソート

## 受け入れ基準

<!-- コツ: 機械検証できる文にする -->

- [ ] `bun run build` が成功する
- [ ] `bun test` が全件 green
- [ ] `deals` テーブルが `schema.ts` に定義されている
- [ ] `dealPhaseEnum` が `["proposal_prep", "proposed", "negotiation", "internal_approval", "won", "lost"]` で定義されている
- [ ] 全リポジトリ関数のクエリに `organizationId` 条件が付与されている
- [ ] フェーズ遷移テスト: `proposal_prep → proposed` が許可される
- [ ] フェーズ遷移テスト: `negotiation → internal_approval` が許可される
- [ ] フェーズ遷移テスト: `won → proposal_prep` が拒否される
- [ ] フェーズ遷移テスト: `lost → negotiation` が拒否される
- [ ] フェーズ遷移テスト: 全フェーズから `lost` への遷移が許可される（終端状態除く）
- [ ] `internal_approval` 遷移時に見積承認リクエスト（Request）が自動作成され `deals.estimateRequestId` に紐づくことをテストで確認する
- [ ] converted でない引き合いに対して案件を作成しようとした場合にエラーが返る
- [ ] 同一引き合いに対して2件目の案件を作成しようとした場合にエラーが返る
- [ ] 案件作成・フェーズ変更・情報更新で `audit_logs` にレコードが記録される
- [ ] 案件作成・フェーズ変更が admin と manager のみ実行可能
- [ ] ダッシュボードヘッダーに「案件」のナビリンクが表示される
- [ ] 引き合い詳細ページに案件セクションが表示される
- [ ] 依存方向 `actions → usecases → domain / infrastructure` を遵守
- [ ] `typecheck` が green

## architect 評価済みの設計判断

<!-- コツ: 採用した判断に加え、却下した代替案とその理由を書く。 -->

1. **案件を引き合いに1:1で紐づけを採用、1:N を却下** — 受託案件は1つの引き合い（商談の種）から1つの案件に発展する。1つの引き合いから複数の案件が派生するケースは分割提案であり、引き合い自体を分割して管理する方が自然。1:1 制約により重複作成を防止できる
2. **見積承認時に estimatedAmount をフォームデータとして承認リクエストに渡すパターンを採用、案件テーブルから直接参照を却下** — 承認リクエスト（Request）は案件ドメインを知らない。フォームデータとして金額を渡すことで、既存の承認テンプレートの条件付きステップ（金額による承認ルート分岐）をそのまま活用できる
3. **フェーズ遷移をドメインサービスで管理を採用** — `inquiryTransition.ts` と同じパターン。遷移ルールを一箇所で管理し、テスト容易性を確保する
4. **案件ページをトップレベルルートに配置を採用、引き合い詳細のネストルートを却下** — 案件は引き合いから独立したライフサイクルを持つ（提案→受注の長期プロセス）。商談と違い引き合いに従属しない。一覧で全案件を俯瞰する必要がある
5. **assigneeId と technicalLeadId を分離して管理を採用、単一の担当者カラムを却下** — 受託案件では営業担当と技術担当が異なることが多い。2つのFK で明示的に管理する
6. **contractType を text カラムで管理を採用、enum を却下** — 契約種別は組織によってカスタマイズされる可能性がある。初期段階では3種（準委任・請負・SES）を想定するがドメインモデルで型制約し、DB レベルでは text で柔軟性を持たせる
