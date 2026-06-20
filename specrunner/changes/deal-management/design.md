# Design: 案件管理と見積承認フロー連携

## Context

顧客・引き合い・商談の基盤が整った状態で、引き合いから受注までのライフサイクルを管理する「案件（Deal）」を導入する。

現状のコードベース:
- スキーマ定義は `schema.ts` に集約。`meetingTypeEnum`（L42-48）がファイル内の最後の enum。新 enum はこの後に追加する
- `inquiries` テーブル（L252-271）に `requestId` FK で承認リクエストを紐づけるパターンが実装済み。案件も同じパターンで `estimateRequestId` を持つ
- `updateInquiryStatus.ts`（L36-132）で `converted` 遷移時に承認リクエストを自動作成する実装がある。`filterStepsByCondition` でテンプレートステップをフィルタし、`requestRepository.create` + `approvalStepRepository.createMany` をトランザクション内で実行するパターン。見積承認でもこのパターンを踏襲する
- `inquiryTransition.ts` に `VALID_TRANSITIONS` マップ + `canTransition(from, to)` の遷移ルールパターンが確立済み
- `organizationsRelations` に `clients`, `inquiries`, `meetings` の `many()` が定義済み。`usersRelations` に `inquiries`, `meetings` の `many()` あり
- ダッシュボードヘッダーナビに「申請一覧」「顧客」「引き合い」が配置済み（全ロール表示）
- リポジトリは `mapRow()` 内部関数で DB→ドメイン型変換、オプション `tx` パラメータでトランザクション対応
- ユースケースは Result 型 `{ ok: true; data } | { ok: false; reason }` で返却
- Server Actions は `"use server"` 宣言、`auth()` 認証、Zod バリデーション、`checkRateLimit`、`revalidatePath()` のパターンが確立
- `inquiryRepository.updateStatus` で楽観ロック付き更新（`version` カラム + `eq(inquiries.version, currentVersion)` 条件）が実装済み
- 引き合い詳細ページ（`/inquiries/[id]`）に承認情報セクションと商談履歴セクションがある。案件セクションを追加する余地がある

## Goals / Non-Goals

**Goals**:
- `deals` テーブルと `dealPhaseEnum` をスキーマに追加する
- 案件のフェーズ遷移（`proposal_prep → proposed → negotiation → internal_approval → won` / 任意フェーズから `lost`）をドメインサービスで管理する
- `internal_approval` フェーズ遷移時に、既存の承認テンプレートを利用して見積承認リクエスト（Request）を自動作成し、`deals.estimateRequestId` に紐づける
- 案件一覧（`/deals`）・案件詳細（`/deals/[id]`）の UI ページを追加する
- 引き合い詳細ページに案件セクションを追加する
- ダッシュボードヘッダーに「案件」ナビを追加する（全ロール表示）
- シードデータ・テスト・Relations を整備する

**Non-Goals**:
- プロジェクト進行管理（受注後のキックオフ→納品→検収）
- 契約管理（契約書アップロード、契約条件の詳細管理）
- 見積明細の管理（項目・工数・単価）
- 提案書・見積書のファイル添付
- 案件の売上予測・パイプラインダッシュボード
- 案件の削除
- ページネーション・検索・ソート

## Decisions

### D1: 案件を引き合いに 1:1 で紐づける（architect 決定済み）

**決定**: 1 つの引き合いに対して作成できる案件は 1 件のみ。`dealRepository.findByInquiryId` で重複チェックし、重複時はエラーを返す。

**理由**: 受託案件は 1 つの引き合い（商談の種）から 1 つの案件に発展する。複数の案件が派生するケースは引き合い自体を分割して管理する方が自然。1:1 制約により重複作成を防止できる。

**代替案**: 1:N を許容する案。分割提案を案件の分岐として扱うことになり、ドメインモデルが複雑化するため却下。

### D2: 見積承認時に estimatedAmount をフォームデータとして承認リクエストに渡す（architect 決定済み）

**決定**: `updateDealPhase` で `internal_approval` 遷移時に、`{ amount: { value: deal.estimatedAmount, label: "想定金額" } }` をフォームデータとして承認リクエストに渡す。

**理由**: 承認リクエスト（Request）は案件ドメインを知らない。フォームデータとして金額を渡すことで、既存の承認テンプレートの条件付きステップ（金額による承認ルート分岐）をそのまま活用できる。`updateInquiryStatus` での `converted` 遷移時の承認リクエスト作成パターンを踏襲するが、フォームデータを渡す点が異なる。

**代替案**: 案件テーブルから直接参照する案。承認ドメインが案件ドメインを知ることになり、結合度が上がるため却下。

### D3: フェーズ遷移をドメインサービスで管理する（architect 決定済み）

**決定**: `src/domain/services/dealTransition.ts` に `VALID_TRANSITIONS` マップと `canTransition(from, to): boolean` を定義する。

**理由**: `inquiryTransition.ts` と同じパターンに合わせる。遷移ルールを一箇所で管理し、テスト容易性を確保する。

### D4: 案件ページをトップレベルルートに配置する（architect 決定済み）

**決定**: `/deals` と `/deals/[id]` をダッシュボード直下に配置する。

**理由**: 案件は引き合いから独立したライフサイクルを持つ（提案→受注の長期プロセス）。一覧で全案件を俯瞰する必要がある。

**代替案**: 引き合い詳細のネストルート（`/inquiries/[id]/deals/...`）に配置する案。案件は引き合いに従属しない独立エンティティであり、一覧表示に不向きなため却下。

### D5: assigneeId と technicalLeadId を分離して管理する（architect 決定済み）

**決定**: `deals` テーブルに `assigneeId`（営業担当）と `technicalLeadId`（技術担当）の 2 つの FK を持たせる。

**理由**: 受託案件では営業担当と技術担当が異なることが多い。2 つの FK で明示的に管理する。

**代替案**: 単一の担当者カラムで管理する案。役割の異なる担当者を区別できないため却下。

### D6: contractType を text カラムで管理する（architect 決定済み）

**決定**: `deals.contractType` は text カラムとし、ドメインモデルで `ContractType = "quasi_delegation" | "contract" | "ses"` の型制約をかける。DB レベルでは pgEnum を使わない。

**理由**: 契約種別は組織によってカスタマイズされる可能性がある。初期段階では 3 種で十分だが、DB マイグレーションなしで値を追加できる柔軟性を持たせる。

**代替案**: pgEnum で DB 側に制約をかける案。値の追加に ALTER TYPE が必要になり、初期段階では過剰なため却下。

### D7: updateDealPhase で internal_approval 遷移時に承認リクエストを作成する（updateInquiryStatus パターンの踏襲）

**決定**: `updateDealPhase` usecase 内で `internal_approval` 遷移時に `requestRepository.create()` + `approvalStepRepository.createMany()` を直接呼び出す。`createRequest` usecase は呼び出さない。

**理由**: `updateInquiryStatus` での `converted` 遷移時と同じ設計判断（D10 of client-inquiry-foundation）。`createRequest` usecase は Webhook 送信（fire-and-forget）を含んでおり、トランザクション外の副作用がある。usecase → usecase の呼び出しは依存方向の原則に違反する。

**代替案**: `createRequest` usecase を呼び出す案。トランザクション境界の制御ができず、Webhook の二重送信リスクがあるため却下。

### D8: 案件作成・フェーズ変更は admin と manager のみ。情報更新は全ロールに許可する

**決定**: Server Action 層で権限チェック。`createDealAction` と `updateDealPhaseAction` は `admin`/`manager` ロール制限。`updateDealAction` は全ロール許可。

**理由**: 案件作成とフェーズ変更（特に `internal_approval` での承認リクエスト自動作成）は重要な業務判断を伴う。情報更新（金額・日程・備考等）は日常的な入力作業であり、全ロールに開放する。

### D9: 案件作成時に引き合いのステータスが converted であることを検証する

**決定**: `createDeal` usecase で `inquiryRepository.findById` で引き合いを取得後、`inquiry.status !== "converted"` の場合はエラーを返す。

**理由**: 案件は商談化（converted）された引き合いからのみ作成される。未確定の引き合いから案件を作成することは業務フロー上不正。

### D10: deals テーブルに楽観ロック用 version カラムを持たせる

**決定**: `deals` テーブルに `version` (integer, default 1) を追加し、`updatePhase` で楽観ロック付き更新を行う。

**理由**: `inquiries` テーブルの `version` カラムと同じパターン。`internal_approval` 遷移時の承認リクエスト重複作成を防ぐ。

## Risks / Trade-offs

**[Risk] updateDealPhase 内での Request 作成ロジックが createRequest・updateInquiryStatus と重複する**
→ Mitigation: テンプレートの steps 取得・フィルタリング・承認ステップ生成のロジックは `updateInquiryStatus` と同じパターンを踏襲する。将来的に共通ヘルパーへの抽出を検討するが、現時点では 3 箇所に留まるため許容する。テストで動作を担保する。

**[Risk] estimateRequestId の FK 参照先が nullable であり、承認リクエスト削除時に orphan が発生する可能性がある**
→ Mitigation: `requests` テーブル側の削除は現在スコープ外（削除機能が存在しない）。FK に `onDelete: "set null"` を設定し、万が一の削除時に案件が壊れないようにする。`inquiries.requestId` と同じ方針。

**[Risk] usersRelations に案件関連の many() が 2 つ追加される（dealsAsAssignee, dealsAsTechnicalLead）**
→ Mitigation: `relationName` パラメータで明示的に区別する。`approvalDelegations` での `delegationsFrom`/`delegationsTo` と同じパターン。

## Open Questions

None — 全設計判断は architect 評価済み。
