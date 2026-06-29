# Code Review Feedback — iteration 001

- **verdict**: approved
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | low | maintainability | `src/infrastructure/schema.ts` | `interactionsRelations` に `contract` / `invoice` / `client` の one-relation が未定義。FK カラム（`contractId`, `invoiceId`, `clientId`）は追加されているが Drizzle relations に対応する one() 定義がない。現時点で Drizzle join クエリは使用していないため機能影響はないが、将来 kind=contract 等を追加した際に relations 経由のクエリが書けず混乱を招く可能性がある。 | `interactionsRelations` に `contract: one(contracts, ...)`, `invoice: one(invoices, ...)`, `client: one(clients, ...)` の 3 つを追加する。 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 9 | 0.10 |

- **total**: 8.80

## Summary

全受け入れ基準（must 11 件）を満たしており、実装品質は高い。主要な設計判断（D1〜D9）の実装を順を追って確認した。

### 確認済み項目

**スキーマ（T-01）**
- `interactionKindEnum`（5 種）・`interactions` テーブル・`kind` カラム（DEFAULT 'meeting'）・`meetingType` / `details` リネーム・CHECK 制約（5 FK のいずれか 1 つ以上）・5 本のインデックス・`action_items.interaction_id` がすべて正確に定義されている。
- `interactions` テーブルが `contracts` / `invoices` より前に定義されているが、FK は `() => contracts.id` のラムダ形式（Drizzle の遅延評価）を使っており typecheck も通過しているため問題なし。

**マイグレーション SQL（0017_interaction_generalization.sql）**
- `ALTER TABLE "meetings" RENAME TO "interactions"` および `ALTER TABLE "action_items" RENAME COLUMN "meeting_id" TO "interaction_id"` が使用されており、`DROP TABLE` / `DELETE FROM` / `TRUNCATE` を含まない。既存行を in-place で保持するデータ安全なマイグレーション（TC-018 確認済み）。

**ドメインモデル（T-02）**
- `interaction.ts` に `Interaction` 型・`InteractionKind`・`LegacyMeetingActionItem`・`HearingData`・将来拡張コメントがすべて揃っている。
- `meeting.ts` は `interaction.ts` への re-export のみに正しく変換。
- `auditLog.ts` に `interaction.create` / `interaction.update` が `AuditAction` と `AuditMetadataMap` に追加されている。

**リポジトリ（T-03・T-04）**
- `interactionRepository.ts` が create / findById / findAllByDeal / findAllByOrganization / findAllByInquiry / update / searchBySummary を完備。kind フィルタ不要の現状と TODO コメントも適切。
- `actionItemRepository.ts` の `meetingId` → `interactionId` / `findByMeeting` → `findByInteraction` 変換が完全。

**ユースケース（T-05〜T-07）**
- `createMeeting` / `updateMeeting` の監査ログが `interaction.create` / `interaction.update`（targetType="interaction", metadata.kind="meeting"）に正しく移行。
- `getDealActivity` / `getNotifications` の targets に各 interaction について `{ targetType: "interaction" }` と `{ targetType: "meeting" }` の両方が含まれ、`targetInfoMap` も両キーで登録されている（D6 完全実装）。
- `TIMELINE_ACTIONS` / `NOTIFICATION_ACTIONS` に `interaction.create` と `meeting.create` の両方が存在（後方互換維持）。
- `createMeeting.ts` の `dealId || inquiryId` バリデーションは kind=meeting に限定した要件として正当。

**Server Action（T-08）**
- `canPerform(..., "meeting", ...)` が維持されており D9 設計判断に準拠（認可エンティティ名の乖離は本リクエストのスコープ制限として許容）。
- `meetingId` / `hearingData` の FormData フィールド名が維持されており UI 互換性が保たれている。

**テスト（T-11・T-12）**
- `interactionManagement.dynamic.test.ts`（438 行）: create / update / getMeeting / listMeetings / listMeetingsByInquiry + 監査ログ metadata 検証が `mock.module` 方式で実行テストとして固定されている。
- `interactionActionItems.dynamic.test.ts`（229 行）: `findByInteraction` 呼び出し・`interactionId` 渡し・存在確認エラーを実行テストで固定。
- `dealActivity.dynamic.test.ts`: デュアルターゲット（targets と targetInfoMap）・`TIMELINE_ACTIONS` の interaction.create 含有を実行テストで固定（TC-012・013・015 対応）。
- `getNotifications.dynamic.test.ts`: デュアルターゲット・`NOTIFICATION_ACTIONS` の interaction.create 含有を実行テストで固定（TC-014・016 対応）。
- 検証結果: 1528 pass, 0 fail / typecheck / build / lint すべて通過。

### 指摘事項（低優先度）

`interactionsRelations` には `deal` / `inquiry` / `organization` の one-relation は定義されているが、今回追加された 3 つの FK カラム（`contractId`, `invoiceId`, `clientId`）に対する relation 定義が欠落している。現時点の実装はすべて直接 SQL クエリ（Drizzle ORM の `select().from()` 形式）を使用しており機能影響はない。ただし将来 kind=contract_adjustment 等を追加する際に relations 経由のクエリを書く開発者が混乱する可能性があるため、低優先度の改善候補として記録する。今反復での修正は不要。
