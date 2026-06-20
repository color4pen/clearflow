# 商談管理

## Meta

- **type**: new-feature
- **slug**: meeting-management
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 既存パターン（テーブル追加 + CRUD）の踏襲であり、新しい port/adapter やアーキテクチャ変更を伴わない → false -->

## 背景

第1リクエスト（client-inquiry-foundation）で顧客・引き合い管理基盤を導入した。次のステップとして、引き合いに紐づく商談記録を管理する機能を追加する。

商談には性質の異なる2種類がある。初回商談は「ヒアリングの場」で、先方の課題・予算感・決裁者・時期・競合状況を聞き出してインプットを蓄積する。2回目以降は「提案の場」で、提案書・見積を持ち込んで交渉する。この違いを種別（type）で区別し、ヒアリング商談ではヒアリング項目を構造化して記録できるようにする。

## 現状コードの前提

<!-- 現状のコードについての断定（「今のコードはこうなっている」）は file:line を伴ってこの節に書く。 -->

- `src/infrastructure/schema.ts:36-41` — `inquiryStatusEnum` が `["new", "in_progress", "converted", "declined"]` で定義済み
- `src/infrastructure/schema.ts:214-227` — `clients` テーブルが定義済み。id, organizationId, name, industry, size, address, notes, createdAt, updatedAt
- `src/infrastructure/schema.ts:229-242` — `clientContacts` テーブルが定義済み。id, clientId, name, department, position, email, phone, isPrimary, createdAt
- `src/infrastructure/schema.ts:244-264` — `inquiries` テーブルが定義済み。id, organizationId, clientId, contactId, title, description, source, status, assigneeId, requestId, createdAt, updatedAt, version
- `src/infrastructure/schema.ts:306-317` — `organizationsRelations` に `clients: many(clients)` と `inquiries: many(inquiries)` が追加済み
- `src/infrastructure/schema.ts:447-484` — `clientsRelations`, `clientContactsRelations`, `inquiriesRelations` が定義済み。最終行は 485
- `src/domain/models/inquiry.ts:1` — `InquiryStatus` = `"new" | "in_progress" | "converted" | "declined"`
- `src/domain/models/inquiry.ts:3` — `InquirySource` = `"web" | "phone" | "referral" | "exhibition" | "other"`
- `src/domain/models/inquiry.ts:5-19` — `Inquiry` 型に `clientId`, `contactId`, `assigneeId`, `requestId` の FK 参照あり
- `src/domain/models/inquiry.ts:21-23` — `InquiryWithClient` 型が `Inquiry & { clientName: string }` で定義済み
- `src/domain/models/index.ts:21-22` — `Client`, `ClientContact`, `InquiryStatus`, `InquirySource`, `Inquiry`, `InquiryWithClient` を barrel export 済み
- `src/infrastructure/repositories/inquiryRepository.ts:80-97` — `findAllWithClientByOrganization` で LEFT JOIN + `InquiryWithClient[]` 返却パターンが実装済み
- `src/infrastructure/repositories/clientRepository.ts:139-149` — `findContactsByClientId` でテナント分離は呼び出し元が保証するパターン
- `src/application/usecases/createInquiry.ts:1-62` — `clientRepository.findById` で顧客存在確認後にトランザクション内で作成。Result 型パターン
- `src/app/(dashboard)/inquiries/[id]/page.tsx:1-132` — 引き合い詳細ページ。SectionCard で「引き合い情報」と「承認情報」の2セクション
- `src/app/(dashboard)/inquiries/[id]/InquiryActions.tsx:1-143` — クライアントコンポーネント。ステータス変更ボタンを表示
- `src/app/(dashboard)/layout.tsx:35-42` — ヘッダーナビに「顧客」「引き合い」リンクが追加済み
- `src/app/actions/inquiries.ts:11-18` — `createInquirySchema` で Zod バリデーション
- `src/infrastructure/seed.ts:34-48` — truncation 順序: auditLogs → approvalSteps → inquiries → clientContacts → clients → ...
- `src/infrastructure/seed.ts:425-457` — 引き合い3件のシードデータ（new, in_progress, converted）
- `src/__tests__/static/projectStructure.test.ts:112-113` — ドメインモデルファイル一覧に `client.ts`, `inquiry.ts` が追加済み
- `src/__tests__/static/projectStructure.test.ts:148-153` — ドメインサービスファイル一覧に `inquiryTransition.ts` が追加済み
- `src/__tests__/static/projectStructure.test.ts:871-962` — テナント分離テストに client/inquiry リポジトリが追加済み

## 要件

<!-- コツ: 実装の最重量部（既存機構の一般化・暗黙の前提の変更）は行間に隠さず要件として名指しする。 -->

1. **meetings テーブル追加**: カラム: id (uuid PK), organizationId (FK), inquiryId (FK to inquiries), type (meetingTypeEnum — 商談種別), date (timestamp — 商談日時), location (text, nullable — 場所/オンラインURL), attendees (jsonb — `{ internal: string[], external: string[] }` 社内外の参加者名), summary (text, nullable — 議事録/要約), actionItems (jsonb, default [] — `Array<{ description: string, assignee: string, dueDate: string | null, done: boolean }>`), hearingData (jsonb, nullable — ヒアリング項目。type が `hearing` の場合に使用), createdById (FK to users — 記録者), createdAt, updatedAt
2. **meetingTypeEnum 追加**: `["hearing", "proposal", "negotiation", "closing", "followup"]`。`hearing` = ヒアリング（初回商談）、`proposal` = 提案、`negotiation` = 交渉、`closing` = クロージング、`followup` = フォローアップ
3. **ヒアリングデータ構造の定義**: `hearingData` は `{ challenge: string | null, budget: string | null, decisionMaker: string | null, timeline: string | null, competitors: string | null, notes: string | null }` の固定構造。type が `hearing` の場合に入力可能、それ以外の type では null
4. **ドメインモデル追加**: `src/domain/models/meeting.ts` に `MeetingType` 型（union literal）、`HearingData` 型、`ActionItem` 型、`MeetingAttendees` 型、`Meeting` 型を追加する。`src/domain/models/index.ts` の barrel export に追記する
5. **リポジトリ追加**: `src/infrastructure/repositories/meetingRepository.ts` を追加する。メソッド: create, findById, findAllByInquiry (inquiryId + organizationId), findAllByOrganization, update。全クエリに organizationId 条件を付与する。トランザクション対応（optional `tx` パラメータ）。`mapRow()` 内部関数で DB→ドメイン型変換。`src/infrastructure/repositories/index.ts` に `export * as meetingRepository from "./meetingRepository"` を追記する
6. **ユースケース追加**: `src/application/usecases/` に以下を追加する。全ユースケースで `auditLogRepository.create()` による監査ログ記録を `db.transaction()` 内で行う。`src/application/usecases/index.ts` に追記する
   - `createMeeting.ts` — 商談記録を作成する。inquiryId 必須。type が `hearing` の場合のみ hearingData を受け付ける。`inquiryRepository.findById` で引き合いの存在確認を行う
   - `listMeetings.ts` — 引き合いに紐づく商談一覧を返す
   - `updateMeeting.ts` — 商談記録を更新する（summary, actionItems, hearingData 等）
7. **Server Actions 追加**: `src/app/actions/meetings.ts` を追加する。`"use server"` 宣言、`auth()` 認証チェック、Zod バリデーション、レート制限。商談の作成・更新は全ロールが実行可能。actionItems の done フラグ更新も全ロールが実行可能
8. **UI ページ追加**: 以下のルートを `src/app/(dashboard)/` に追加する。既存の共有コンポーネントを活用する
   - 引き合い詳細ページ（`/inquiries/[id]`）に「商談履歴」セクションを追加する。時系列で商談記録を表示する（SectionCard 内に DataTable）。「商談を記録」リンクボタンを配置する
   - `/inquiries/[id]/meetings/new` — 商談記録ページ。種別選択、日時、場所、参加者（社内/社外）、議事録、アクションアイテム。種別が `hearing` の場合はヒアリング項目入力フォーム（課題、予算感、決裁者、時期、競合状況）を追加表示する
   - `/inquiries/[id]/meetings/[meetingId]` — 商談詳細ページ。記録内容の表示。アクションアイテムの完了チェック。編集フォーム
9. **Relations 定義追加**: `schema.ts` に `meetingsRelations` を追加する。`inquiriesRelations` に `meetings: many(meetings)` を追記する。`organizationsRelations` に `meetings: many(meetings)` を追記する。`usersRelations` に `meetings: many(meetings)` を追記する（createdById の逆参照）
10. **シードデータ追加**: `seed.ts` に各引き合いに1-2件の商談記録を追加する（計4件）。ヒアリング商談1件（hearingData 入り）、提案商談1件、交渉商談1件、フォローアップ商談1件。テーブル truncation 順序に `meetings` を `inquiries` の前に追加する（meetings.inquiryId が inquiries.id を参照するため）
11. **テスト追加**: `projectStructure.test.ts` のドメインモデルファイル一覧に `meeting.ts` を追記する。テナント分離テストに `meetingRepository` を追加する。`src/__tests__/usecases/meetingManagement.test.ts` を追加し、商談の作成・一覧・更新のテストを書く。hearing 以外の type で hearingData が null になることをテストする

## スコープ外

- 商談記録のファイル添付（提案書・見積書のアップロード）
- 商談のカレンダー連携
- 商談のリマインダー通知
- 商談テンプレート（定型議事録フォーマット）
- 商談の削除
- 案件（Deal）管理 — 次のリクエストで対応
- ページネーション・検索・ソート

## 受け入れ基準

<!-- コツ: 機械検証できる文にする -->

- [ ] `bun run build` が成功する
- [ ] `bun test` が全件 green
- [ ] `meetings` テーブルが `schema.ts` に定義されている
- [ ] `meetingTypeEnum` が `["hearing", "proposal", "negotiation", "closing", "followup"]` で定義されている
- [ ] 全リポジトリ関数のクエリに `organizationId` 条件が付与されている
- [ ] type が `hearing` の場合のみ `hearingData` が保存されることをテストで確認する
- [ ] type が `hearing` 以外の場合に `hearingData` が null であることをテストで確認する
- [ ] 商談作成時に存在しない引き合い ID を指定した場合にエラーが返ることをテストで確認する
- [ ] 商談作成・更新で `audit_logs` にレコードが記録される
- [ ] 引き合い詳細ページに商談履歴セクションが表示される
- [ ] 種別が `hearing` の場合にヒアリング項目フォームが表示される
- [ ] アクションアイテムの done 状態を更新できる
- [ ] 依存方向 `actions → usecases → domain / infrastructure` を遵守
- [ ] `typecheck` が green

## architect 評価済みの設計判断

<!-- コツ: 採用した判断に加え、却下した代替案とその理由を書く。 -->

1. **ヒアリングデータを固定構造の jsonb で管理を採用、動的フォーム定義（テンプレート方式）を却下** — ヒアリング項目は業種・案件によらず共通性が高い（課題・予算・決裁者・時期・競合）。初期段階でカスタマイズ性は不要。固定構造の方が型安全に扱える
2. **参加者を jsonb 配列で管理を採用、別テーブル（meeting_attendees）を却下** — 参加者は名前の記録が主目的で、ユーザーテーブルとの紐づけや参加者単位の検索は不要。jsonb でシンプルに保持する
3. **アクションアイテムを jsonb 配列で管理を採用、別テーブルを却下** — アクションアイテムは商談に従属し、商談と一体で表示・編集される。独立したライフサイクルを持たないため jsonb 配列で十分
4. **商談を引き合い（Inquiry）に紐づけを採用、顧客（Client）に直接紐づけを却下** — 商談は特定の引き合い（案件の種）に関する活動記録。顧客に直接紐づけると、どの案件についての商談か不明確になる。将来的に Deal（案件）に紐づけを変更する場合も、Inquiry → Deal の変換で自然に移行できる
5. **商談ページを引き合い詳細のネストルートに配置を採用、独立したトップレベルルートを却下** — 商談は引き合いに従属するため、`/inquiries/[id]/meetings/...` のネスト構造が自然。引き合いのコンテキストを維持したまま遷移できる
