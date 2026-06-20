# Regression Gate Result — Iteration 001

- **change**: deal-management
- **iteration**: 1
- **verdict**: approved
- **date**: 2026-06-20

## Summary

全 11 件の Finding を確認。すべてのフィックスが現行ブランチに存在することを検証した。回帰なし。

## Verification Results

### [HIGH] TC-008: templateId 未指定で internal_approval 遷移時のエラー検証テスト

- **status**: fixed
- **file**: `src/__tests__/usecases/dealManagement.test.ts:76-85`
- **evidence**: `updateDealPhase describe` 内に TC-008 テストケースが追加されている。`!data.templateId` ガードの存在と `テンプレートの指定が必要` エラー文字列を静的検証。`src/application/usecases/updateDealPhase.ts:35-36` で `if (!data.templateId)` が実装済み。

### [HIGH] deals.inquiry_id に UNIQUE 制約なし（TOCTOU）

- **status**: fixed
- **file**: `src/infrastructure/schema.ts:332-335`, `drizzle/0011_deal_inquiry_unique.sql`
- **evidence**: `pgTable("deals", ..., (table) => [unique("deals_inquiry_id_unique").on(table.inquiryId)])` が追加され、DB レベルで 1:1 不変条件を保護。マイグレーション SQL も対応。

### [HIGH] 楽観ロック失敗時に承認リクエストが孤立する

- **status**: fixed
- **file**: `src/application/usecases/updateDealPhase.ts:92-94`
- **evidence**: `dealRepository.updatePhase` が null を返した場合、`throw new Error(...)` でトランザクションをロールバックするよう修正。承認リクエスト・承認ステップの孤立を防止。

### [MEDIUM] TC-030: deals.estimateRequestId の onDelete:"set null" 静的テストなし

- **status**: fixed
- **file**: `src/__tests__/static/projectStructure.test.ts:1029-1038`
- **evidence**: `TC-030` テストが追加され、`estimate_request_id` カラム定義周辺 200 文字以内に `set null` が含まれることを検証。`schema.ts:324-326` で `onDelete: "set null"` 実装済み。

### [MEDIUM] 案件一覧の「担当者」列が assigneeId UUID を表示している

- **status**: fixed
- **file**: `src/app/(dashboard)/deals/page.tsx:99`, `src/infrastructure/repositories/dealRepository.ts:77-103`, `src/domain/models/deal.ts:30-34`
- **evidence**: `DealWithInquiry` 型に `assigneeName: string | null` が追加。`dealRepository.findAllByOrganization` が users テーブルを LEFT JOIN し `assigneeName` を返す。一覧ページが `row.assigneeName ?? '-'` を表示。

### [MEDIUM] TC-027: formData の "想定金額" 静的テストなし

- **status**: fixed
- **file**: `src/__tests__/usecases/dealManagement.test.ts:87-93`
- **evidence**: `TC-027` テストが追加され、`updateDealPhase.ts` ソースに `"想定金額"` ラベルが含まれることを検証。実装 `updateDealPhase.ts:48` で `{ amount: { value: deal.estimatedAmount, label: "想定金額" } }` が渡されている。

### [MEDIUM] assigneeId / technicalLeadId のテナント帰属を検証していない

- **status**: fixed
- **file**: `src/application/usecases/createDeal.ts:40-52`, `src/application/usecases/updateDeal.ts:25-37`
- **evidence**: `createDeal` / `updateDeal` の両方で `userRepository.findById(id, organizationId)` による組織帰属検証を追加。他組織の UUID を渡した場合にエラーを返す。

### [LOW] seed.ts ログメッセージが実態と不一致（Finding #4 / #7）

- **status**: fixed
- **file**: `src/infrastructure/seed.ts:449,463`
- **evidence**: `inProgressInquiry` の `status` が `"converted"` に設定済み。ログが `"✅ Created inquiries (3 total: new, converted×2)"` に修正済み。

### [LOW] TC-044: listDeals が DealWithInquiry を返すことの静的テストなし

- **status**: fixed
- **file**: `src/__tests__/usecases/dealManagement.test.ts:97-107`
- **evidence**: `dealRepository 静的検証` describe 内に TC-044 テストが追加され、`dealRepository.ts` に `inquiryTitle`, `clientName`, `inquiries`, `clients` が含まれることを検証。

### [LOW] updateDeal の監査ログに metadata がない

- **status**: fixed
- **file**: `src/application/usecases/updateDeal.ts:59-79`
- **evidence**: 変更されたフィールドを `changedFields` として収集し、`auditLogRepository.create` の `metadata: { updatedFields: changedFields }` に記録するよう修正。

## Findings

回帰・矛盾なし。

## Regressions

なし。

## Contradictions

なし。
