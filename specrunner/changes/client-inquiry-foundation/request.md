# 顧客・引き合い管理基盤

## Meta

- **type**: new-feature
- **slug**: client-inquiry-foundation
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: 承認ワークフロー専用だったシステムに案件管理ドメインを新設。新テーブル3つ追加、既存の承認フローとの連携パターン確立 → true -->

## 背景

Clearflow は承認ワークフロー SaaS として機能しているが、承認対象となる業務ドメインとの統合がない。受託開発の案件管理を組み込むにあたり、最初の入口として「顧客（企業＋担当者）」と「引き合い（問い合わせ・商談化判断）」を導入する。

引き合いの商談化判断（Go/No-Go）を既存の承認テンプレートで回すことで、承認フローと案件管理の連携パターンを確立する。

## 現状コードの前提

<!-- 現状のコードについての断定（「今のコードはこうなっている」）は file:line を伴ってこの節に書く。 -->

- `src/infrastructure/schema.ts:17` — `roleEnum` は `["admin", "member", "manager", "finance"]` の4値
- `src/infrastructure/schema.ts:38-42` — `organizations` テーブルが全テナントのルート。`id`, `name`, `createdAt` の3カラム
- `src/infrastructure/schema.ts:72-87` — `requests` テーブルが `organizationId` FK でテナント分離、`creatorId` で作成者参照、`version` で楽観ロック。新テーブルもこのパターンに従う
- `src/infrastructure/schema.ts:247-257` — `organizationsRelations` が全テナント所有テーブルの `many()` を定義。新テーブル追加時にここへ追記が必要
- `src/infrastructure/schema.ts:209-245` — Auth.js adapter テーブル（`accounts`, `sessions`, `verificationTokens`）がファイル末尾に配置。新ビジネステーブルはこの前に挿入する
- `src/domain/models/request.ts:1` — ドメインモデルは純粋な `type` エイリアスで定義。ORM 非依存
- `src/domain/models/index.ts:1-21` — barrel export で `export type { ... } from "./file"` パターン
- `src/infrastructure/repositories/index.ts:1-10` — `export * as repoName from "./repoFile"` の名前空間パターン
- `src/infrastructure/repositories/requestRepository.ts:8-21` — `mapRow()` 内部関数で DB 行→ドメイン型変換
- `src/infrastructure/repositories/requestRepository.ts:81-93` — `findById()` で `and(eq(id), eq(organizationId))` のテナント条件パターン
- `src/application/usecases/createRequest.ts:12-14` — Result 型は `{ ok: true; data } | { ok: false; reason }` の判別共用体
- `src/application/usecases/createRequest.ts:40-82` — `db.transaction(async (tx) => { ... })` でトランザクション、内部で `auditLogRepository.create()` を呼び audit log 記録
- `src/application/usecases/createRequest.ts:84-88` — トランザクション外で `void deliverWebhookEvent()` の fire-and-forget パターン
- `src/app/actions/requests.ts:1` — `"use server"` 宣言
- `src/app/actions/requests.ts:19-22` — Zod スキーマでバリデーション
- `src/app/actions/requests.ts:51-54` — `auth()` + `session?.user?.id` チェックによる認証
- `src/app/actions/requests.ts:56-63` — `checkRateLimit()` によるレート制限
- `src/app/(dashboard)/layout.tsx:24-47` — ヘッダーナビゲーション。「申請一覧」（全員）と「設定」「監査ログ」（admin のみ）
- `src/app/(dashboard)/settings/layout.tsx:1-21` — 設定サブレイアウト。admin ロール以外は `/requests` へリダイレクト
- `src/app/components/index.ts:1-6` — 共有コンポーネント: `PageToolbar`, `DataTable`, `FormField`, `LinkButton`, `SectionCard` 等
- `src/infrastructure/seed.ts:27-354` — 1組織・5ユーザー・3テンプレート・3申請・承認ステップ・監査ログ・Webhook・代理承認をシード
- `src/infrastructure/seed.ts:31-42` — テーブル truncation 順序（FK 安全順）
- `src/__tests__/static/projectStructure.test.ts:102-112` — ドメインモデルファイル一覧配列。新モデル追加時にここへの追記が必要
- `src/__tests__/static/projectStructure.test.ts:135-152` — ドメインサービスファイル一覧。インフラ非依存チェック対象
- `src/__tests__/static/projectStructure.test.ts:464-527` — テナント分離テスト。全リポジトリの `organizationId` 条件を検証

## 要件

<!-- コツ: 実装の最重量部（既存機構の一般化・暗黙の前提の変更）は行間に隠さず要件として名指しする。 -->

1. **clients テーブル追加**: カラム: id (uuid PK), organizationId (FK), name (text — 企業名), industry (text, nullable — 業種), size (text, nullable — 企業規模), address (text, nullable — 所在地), notes (text, nullable — 備考), createdAt, updatedAt。1組織に複数の顧客を登録できる
2. **client_contacts テーブル追加**: カラム: id (uuid PK), clientId (FK to clients), name (text — 担当者名), department (text, nullable — 部署), position (text, nullable — 役職), email (text, nullable), phone (text, nullable), isPrimary (boolean, default false — 主担当者フラグ), createdAt。1顧客に複数の担当者を登録できる
3. **inquiries テーブル追加**: カラム: id (uuid PK), organizationId (FK), clientId (FK to clients), contactId (FK to client_contacts, nullable — 担当者が未確定の場合あり), title (text — 件名), description (text, nullable — 概要), source (text — 流入経路: "web" | "phone" | "referral" | "exhibition" | "other"), status (inquiryStatusEnum), assigneeId (FK to users, nullable — 社内担当者), requestId (FK to requests, nullable — Go/No-Go 承認リクエスト), createdAt, updatedAt
4. **inquiryStatusEnum 追加**: `["new", "in_progress", "converted", "declined"]`。`new` = 新規受付、`in_progress` = 対応中、`converted` = 商談化済み、`declined` = 見送り
5. **ドメインモデル追加**: `src/domain/models/` に `client.ts`（`Client` 型, `ClientContact` 型）と `inquiry.ts`（`InquiryStatus` 型, `Inquiry` 型, `InquiryWithClient` 型）を追加する。純粋な type エイリアスで定義し ORM に依存しない
6. **ドメインサービス追加**: `src/domain/services/inquiryTransition.ts` を追加する。状態遷移ルール: `new → in_progress | declined`, `in_progress → converted | declined`, `converted` と `declined` は終端状態。`canTransition(from, to): boolean` を公開する
7. **リポジトリ追加**: `clientRepository.ts`（create, findById, findAllByOrganization, update）と `inquiryRepository.ts`（create, findById, findAllByOrganization, findAllWithClientByOrganization, update, updateStatus）を `src/infrastructure/repositories/` に追加する。全クエリに `organizationId` 条件を付与する。`mapRow()` 内部関数で DB→ドメイン型変換。トランザクション対応（optional `tx` パラメータ）
8. **ユースケース追加**: `src/application/usecases/` に以下を追加する。全ユースケースで `auditLogRepository.create()` による監査ログ記録を `db.transaction()` 内で行う
   - `createClient.ts` — 顧客を作成する。担当者も同時に作成できる（contacts 配列、optional）
   - `createInquiry.ts` — 引き合いを作成する。clientId 必須、contactId optional
   - `updateInquiryStatus.ts` — 引き合いのステータスを遷移する。`inquiryTransition.canTransition()` でバリデーション。`converted` への遷移時に承認テンプレートを指定して承認リクエスト（Request）を自動作成し、`inquiries.requestId` に紐づける
   - `listClients.ts` — 組織内の顧客一覧を返す
   - `listInquiries.ts` — 組織内の引き合い一覧を返す（顧客情報を JOIN）
9. **Server Actions 追加**: `src/app/actions/clients.ts` と `src/app/actions/inquiries.ts` を追加する。`"use server"` 宣言、`auth()` による認証チェック、Zod バリデーション、レート制限、`revalidatePath()` を含む。顧客・引き合いの作成は全ロールが実行可能。引き合いのステータス変更（特に `converted`）は admin と manager のみ
10. **UI ページ追加**: 以下のルートを `src/app/(dashboard)/` に追加する。既存の共有コンポーネント（`PageToolbar`, `DataTable`, `FormField`, `LinkButton`, `SectionCard`）を活用する
    - `/clients` — 顧客一覧ページ（DataTable で企業名・業種・担当者数を表示）
    - `/clients/new` — 顧客登録ページ（企業情報 + 担当者を1名以上入力）
    - `/clients/[id]` — 顧客詳細ページ（企業情報、担当者一覧、関連する引き合い一覧）
    - `/inquiries` — 引き合い一覧ページ（DataTable でステータス・顧客名・件名・流入経路・担当者を表示。ステータスフィルタ）
    - `/inquiries/new` — 引き合い登録ページ（顧客選択、担当者選択、件名、概要、流入経路）
    - `/inquiries/[id]` — 引き合い詳細ページ（詳細表示、ステータス変更ボタン、商談化時のテンプレート選択、関連する承認リクエストへのリンク）
11. **ナビゲーション追加**: ダッシュボード `layout.tsx` のヘッダーナビに「顧客」（`/clients`）と「引き合い」（`/inquiries`）を追加する。全ロールに表示する
12. **シードデータ追加**: `seed.ts` に顧客2社（各2名の担当者）と引き合い3件（new, in_progress, converted 各1件）を追加する。`converted` の引き合いには承認リクエストを紐づける。テーブル truncation 順序に `inquiries`, `clientContacts`, `clients` を追加する
13. **テスト追加**: `projectStructure.test.ts` のドメインモデルファイル一覧（L102-112）に `client.ts`, `inquiry.ts` を追記する。テナント分離テスト（L464-527）に `clientRepository`, `inquiryRepository` を追加する。`inquiryTransition` の状態遷移テストを `src/__tests__/domain/` に追加する
14. **Relations 定義追加**: `schema.ts` の relations セクションに `clientsRelations`, `clientContactsRelations`, `inquiriesRelations` を追加する。`organizationsRelations` の `many()` に `clients`, `inquiries` を追記する

## スコープ外

- 商談（Meeting）管理 — 次のリクエストで対応
- 案件（Deal）管理 — 後続リクエストで対応
- 顧客の編集・削除 UI
- 引き合いの編集 UI（ステータス変更以外）
- 担当者の編集・削除 UI
- 顧客・引き合いに対する Webhook 通知
- CSVインポート・エクスポート
- 検索・ソート機能
- ページネーション

## 受け入れ基準

<!-- コツ: 機械検証できる文にする -->

- [ ] `bun run build` が成功する
- [ ] `bun test` が全件 green
- [ ] `clients`, `client_contacts`, `inquiries` テーブルが `schema.ts` に定義されている
- [ ] `inquiryStatusEnum` が `["new", "in_progress", "converted", "declined"]` で定義されている
- [ ] 全リポジトリ関数のクエリに `organizationId` 条件が付与されている
- [ ] 状態遷移テスト: `new → in_progress` が許可される
- [ ] 状態遷移テスト: `in_progress → converted` が許可される
- [ ] 状態遷移テスト: `converted → new` が拒否される
- [ ] 状態遷移テスト: `declined → in_progress` が拒否される
- [ ] `converted` 遷移時に承認リクエスト（Request）が自動作成され `inquiries.requestId` に紐づくことをテストで確認する
- [ ] 引き合い作成・ステータス変更で `audit_logs` にレコードが記録される
- [ ] 引き合いのステータス変更（`converted`）が admin と manager のみ実行可能
- [ ] ダッシュボードヘッダーに「顧客」「引き合い」のナビリンクが表示される
- [ ] 依存方向 `actions → usecases → domain / infrastructure` を遵守
- [ ] `typecheck` が green

## architect 評価済みの設計判断

<!-- コツ: 採用した判断に加え、却下した代替案とその理由を書く。 -->

1. **顧客と担当者を別テーブル（clients + client_contacts）で管理を採用、担当者を jsonb カラムで管理を却下** — 担当者は引き合いから FK 参照する必要があるため、正規化されたテーブルが必要。jsonb だと参照整合性を保証できない
2. **引き合いのステータス遷移をドメインサービスで管理を採用、usecase 内での直接チェックを却下** — 既存の `requestTransition.ts` と同じパターンに合わせる。遷移ルールを一箇所で管理し、テスト容易性を確保する
3. **商談化時に既存の Request（承認リクエスト）を自動作成する連携パターンを採用、独自の承認機構を却下** — 既存の承認テンプレート・承認ステップの仕組みをそのまま活用する。案件管理ドメインから承認ドメインへの依存は usecase 層で閉じる
4. **inquiries.requestId で承認リクエストへの参照を保持を採用、Request 側から inquiry を参照する方式を却下** — 承認ドメイン（Request）は案件管理ドメインを知らない方が疎結合。引き合い側が参照を持つことで、将来的な分離（Turborepo 化）が容易になる
5. **顧客・引き合いページをダッシュボード直下のトップレベルルートに配置を採用、settings 配下に配置を却下** — 顧客・引き合いは全ロールが利用する主要機能であり、admin 専用の settings 配下に置くのは不適切。申請一覧と並列のトップレベルナビとする
6. **流入経路（source）を固定文字列 enum で管理を採用、マスタテーブル方式を却下** — 初期段階では流入経路のカスタマイズは不要。5種類の固定値で十分。将来必要になればマスタテーブルへ移行可能
