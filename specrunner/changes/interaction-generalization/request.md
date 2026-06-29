# 商談（Meeting）を顧客接点（Interaction）に一般化

## Meta

- **type**: spec-change
- **slug**: interaction-generalization
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: 既存 Meeting エンティティを、ポリモーフィックな関連先と kind を持つ Interaction（顧客接点）に一般化する。スキーマ・テーブルの再編と既存データ移行を伴う設計選択であり ADR 対象。 -->

## 背景

設計（`docs/design/01-domain-design.md` §4.3 顧客接点、`docs/design/06-data-model-design.md` interactions、`docs/design/ユビキタス言語辞書.md`）に従い、商談（`meetings` / Meeting）を**顧客接点（Interaction）**に一般化する。Interaction は `kind`（meeting/call/email/contract_adjustment/invoice_adjustment）と、関連先（deal/inquiry/contract/invoice/client）へのポリモーフィックな参照を持つ。**商談は kind=meeting の一種**であり、UI/日本語表記は「商談」を維持する。本リクエストでは meeting=商談 までを実体化し、他 kind（電話・メール等）の作成 UI は対象外（型・関連先・移行の土台を作る）。

**最重要制約**: 既存の `meetings` 行は 1 件も欠落させない（データ不可侵）。`action_items` の紐づけも維持する。

## 現状コードの前提

- `src/infrastructure/schema.ts` `meetings`: `id` / `organization_id` / `deal_id`(nullable) / `inquiry_id`(nullable) / `type`(meetingTypeEnum: hearing/proposal/negotiation/closing/followup) / `date` / `location` / `attendees`(jsonb) / `summary` / `action_items`(jsonb, **レガシー・action_items テーブルに移行済**) / `hearing_data`(jsonb) / `created_by_id` / `created_at` / `updated_at` / `version`。CHECK `(deal_id IS NOT NULL OR inquiry_id IS NOT NULL)`、index `(org,deal)` `(org,inquiry)`。
- `action_items` テーブル: `meeting_id`(FK → meetings.id, ON DELETE SET NULL) / `deal_id` / `inquiry_id` を持つ。
- `src/infrastructure/repositories/meetingRepository.ts`: create / findById / findAllByDeal / findAllByOrganization / findAllByInquiry / update / searchBySummary。
- 商談の usecase: `createMeeting` / `updateMeeting` / `getMeeting` / `listMeetings` / `listMeetingsByInquiry` / `searchMeetings`、`listActionItemsByMeeting`。
- 監査: `meeting.create` / `meeting.update`（既存ログは追記専用で保持する）。
- タイムライン（R1 実装済）: `TIMELINE_ACTIONS`（`src/lib/activityConfig.ts`）に `meeting.create` を含む。`getDealActivity` は meeting を `findAllByDeal` で取得。
- 関連先テーブル: `deals` / `inquiries` / `contracts` / `invoices` / `clients`（いずれも uuid id）。
- 通知: `NOTIFICATION_ACTIONS` に `meeting.create`。

## 要件

1. **interactions テーブル化（テーブルリネーム・データ不可侵）**: 既存 `meetings` テーブルを `interactions` に**リネーム**して一般化する（`ALTER TABLE meetings RENAME TO interactions` 相当）。**既存行を全て kind=meeting の interaction として in-place で保持する**（rename / ADD COLUMN 中心。全コピー＆drop や drop+create によるデータ欠落は厳禁）。
   - **マイグレーションの扱い（重要）**: drizzle-kit のテーブルリネームは対話確認を伴い、非対話では drop+create（データ消失）に化ける恐れがある。よって**マイグレーションファイルの生成・適用は本リクエストの実装/検証フローに含めず別途行う**（リネームとして対話生成し、SQL が RENAME であること＝DROP/DELETE/TRUNCATE を含まないことを確認のうえ適用）。実装ではスキーマ定義（`schema.ts`）とコードを `interactions` 前提に変更し、**振る舞いの検証は mock ベースの `.dynamic.test.ts`（実 DB 非依存）で行う**。実 DB 依存のテストはマイグレーション適用後に通る前提とする。
   - `kind`（`interaction_kind` enum: meeting/call/email/contract_adjustment/invoice_adjustment）を追加。既存行は `meeting`。
   - 関連先 FK を追加: `contract_id` / `invoice_id` / `client_id`（いずれも nullable）。既存の `deal_id` / `inquiry_id` は維持。
   - CHECK を一般化: `deal_id` / `inquiry_id` / `contract_id` / `invoice_id` / `client_id` の少なくとも 1 つが NOT NULL。
   - 既存 `type`（商談種別）は kind=meeting のときの `meeting_type` として保持（カラム名は実装判断。値は維持）。`hearing_data` は `details`（jsonb・kind 固有）に保持。`attendees` / `summary` / `location` は共通フィールドとして維持。レガシー `action_items`(jsonb) は移行不要。
   - `action_items.meeting_id` を `interaction_id`（FK → interactions.id, ON DELETE SET NULL）に置き換え、**既存の紐づけ値を維持する**。
   - index は (org, deal) / (org, inquiry) 相当を維持し、必要に応じ他関連先にも付す。
2. **ドメインモデル / リポジトリ**: `Interaction` 型（kind・関連先・meetingType・details 等）を定義し、`meetingRepository` を `interactionRepository` に一般化する（既存の find/create/update を維持しつつ kind / 関連先で扱えるよう拡張）。商談関連の usecase は kind=meeting の Interaction を扱うよう更新する（外部から見た商談の作成・更新・一覧の振る舞いは不変）。
   - **型の規定（型衝突回避）**: `details` は `HearingData | null` とする（現時点では kind=meeting のみ対象。将来 kind 追加時は discriminated union 等で拡張する方針をコメントで残す）。`src/domain/models/meeting.ts` の legacy `ActionItem`（jsonb 構造）は `src/domain/models/actionItem.ts` のエンティティ `ActionItem` と同名衝突するため、**`LegacyMeetingActionItem` に改名**してから Interaction で扱う（または Interaction からは export しない）。`actionItems`（レガシー jsonb）フィールドの型もこれに合わせる。
   - **kind フィルタ方針**: 現時点では全 interaction が kind=meeting のため、`listMeetings` 等は `findAllByDeal` を kind フィルタなしで呼ぶ。将来 kind が増えた際に kind=meeting フィルタを追加する旨の TODO コメントを残す。
3. **監査**: 顧客接点の作成・更新は `interaction.create` / `interaction.update`（metadata に `kind` を含む）で記録する。**既存の `meeting.*` 監査ログは書き換えない**（追記専用）。
4. **タイムライン整合（既存ログを失わない）**: `TIMELINE_ACTIONS` に `interaction.create` を追加する（既存 `meeting.create` も顧客接点として維持）。**重要**: `getDealActivity` の `auditLogRepository.findByTargets` に渡す `targets` には、各 interaction について `{ targetType: "interaction", targetId }` と `{ targetType: "meeting", targetId }` の**両方**を含める。既存の `meeting.create`/`meeting.update` 監査ログは targetType="meeting" で追記済みのため、`interaction` だけを引くと移行前の履歴が全件消える。`targetInfoMap` も `interaction:<id>` と `meeting:<id>` の両キーに同じ表示情報を登録する。
5. **通知整合（既存ログを失わない）**: `NOTIFICATION_ACTIONS` に `interaction.create`(kind=meeting) を含める（既存 `meeting.create` も維持）。`getNotifications` も #4 と同様に targets へ `interaction` と `meeting` の両 targetType を含め、既存の meeting 監査ログが通知から消えないようにする。
6. **UI**: 商談の作成・編集・一覧・詳細は従来どおり動作する（UI/日本語表記「商談」を維持）。データ参照は interactions（kind=meeting）に切り替える。

## スコープ外

- 商談以外の kind（電話・メール・契約調整・請求調整）の作成 UI・導線（契約調整/請求調整は別リクエスト R3）。
- タイムライン表示ロジックの変更（R1 で実装済。本リクエストは meeting→interaction の参照切替と `interaction.create` 追加に限る）。
- 既存 meeting データの値変換・正規化（kind=meeting として保持するのみ）。
- AR/債権管理。

## 受け入れ基準

**テスト方針（必須）**: 振る舞いは `.dynamic.test.ts` の `mock.module` 方式で **実行して** assert する（usecase / repository を実行）。ソースの静的検査（readSrc / toContain）で代替しない。

- [ ] 商談の作成・更新・一覧・詳細（案件配下・引合配下）が従来どおり動作することを実行テストで固定する（kind=meeting の Interaction として）。
- [ ] 顧客接点の作成・更新で `interaction.create` / `interaction.update` 監査が `metadata.kind` 付きで記録されることを実行テストで固定する。
- [ ] `action_items` が引き続き商談（interaction）に紐づくこと（`interaction_id`）を実行テストで固定する。
- [ ] 差分マイグレーションが**既存データを保持**する（rename/add 中心でデータ欠落・全削除を含まない）こと、`drizzle-kit check` が通ることを確認する。**移行 SQL に既存 meetings 行や action_items の紐づけを失わせる DROP/DELETE/TRUNCATE が含まれないこと**を明記・確認する。
- [ ] CHECK 制約が関連先5種のいずれか1つ以上で成立することを確認する。
- [ ] `getDealActivity` が kind=meeting の interaction を取得し、タイムラインに商談として並ぶことを実行テストで固定する。
- [ ] **既存の `meeting.create`/`meeting.update` 監査ログ（targetType="meeting"）が移行後も `getDealActivity` / `getNotifications` に表示される**（targets に `interaction` と `meeting` の両 targetType が含まれる）ことを実行テストで固定する。
- [ ] スキーマ定義の検証は `typecheck` と `drizzle-kit check` で担保する（カラム存在確認のような静的シナリオは dynamic test の対象外とする）。
- [ ] 既存テストを新仕様に追従して改修し、`bun test` green / `typecheck` / `bun run build` 成功。
- [ ] 依存方向（actions/RSC → usecases → domain / infrastructure）を遵守する。

## architect 評価済みの設計判断

1. **Interaction は kind ＋ ポリモーフィック関連先（nullable FK ＋ CHECK）**。既存 `meetings_deal_or_inquiry_check` の素直な一般化であり、FK による参照整合性を保つ（discriminator 型より安全）。
2. **テーブルは `meetings → interactions` にリネーム（rename / ADD COLUMN 中心）**。全コピー＆drop や drop+create はデータ欠落リスクが高いため避け、既存行を kind=meeting として in-place で保持する。drizzle-kit のリネームは対話確認を伴うため、**マイグレーションは対話的にリネームとして生成し、生成 SQL が `ALTER ... RENAME` であって `DROP/DELETE/TRUNCATE` を含まないことを確認してからマージ後に `db:migrate` で適用する**（パイプラインは db:migrate しない）。`action_items.meeting_id` も `interaction_id` にリネームし紐づけ値を維持する。
3. **監査は追記専用**。既存 `meeting.*` 行は書き換えず、新規は `interaction.create` / `interaction.update`（kind を metadata）。タイムライン・通知は両方を顧客接点として扱う。
4. **UI/日本語表記「商談」を維持**。一般化は内部のデータモデル・型の明確化であり、利用者から見た商談の振る舞いは変えない。
5. **meeting 以外の kind の作成は本リクエスト対象外**。型・関連先・移行の土台のみ作り、契約調整・請求調整は R3、電話・メール等は将来。
