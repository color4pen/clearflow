# Regression Gate Result — Iteration 002

- **verdict**: approved

## Summary

Ledger 10 件を全件確認。いずれも修正済みであり、リグレッションなし。

## 検証詳細

### [HIGH] findByDeal が organizationId をクエリで使用していない
- **File**: src/infrastructure/repositories/dealContactRepository.ts:58-73
- **Status**: FIXED
- `clients.organizationId` を WHERE 句に追加（innerJoin clientContacts → clients 経由）。テナント分離を保証している。

### [MEDIUM] コメントに「商談化」が残存（InquiryActions.tsx:31）
- **File**: src/app/(dashboard)/inquiries/[id]/InquiryActions.tsx:31
- **Status**: FIXED
- コメントが「案件化ボタンが非表示になる可能性があるが、対応中→見送りは可能」に修正済み。

### [MEDIUM] wonDeal.estimateRequestId が経費申請リクエストを参照したまま
- **File**: src/infrastructure/seed.ts:638-646
- **Status**: FIXED
- seed 内で「見積承認: DX推進プロジェクト」として `estimateApprovalRequest` を作成し、`wonDeal.estimateRequestId: estimateApprovalRequest.id` として参照するよう修正済み。

### [LOW] テスト名・コメントに旧用語 internal_approval が残存
- **File**: src/__tests__/usecases/dealManagement.test.ts:61
- **Status**: FIXED
- 行 61: `（estimate_approval 時の見積承認リクエスト作成）`、行 75-76: `estimate_approval 遷移がエラー`、行 87: `estimate_approval 遷移時` に修正済み。

### [LOW] updateMeetingSchema.inquiryId が必須のまま（案件直紐づき商談の更新が不可）
- **File**: src/app/actions/meetings.ts:172
- **Status**: FIXED
- `inquiryId: z.string().uuid(...).optional()` に修正済み。

### [MEDIUM] deleteByDealAndContact がテナント分離を保証しない
- **File**: src/infrastructure/repositories/dealContactRepository.ts:80-106
- **Status**: FIXED
- `deals.organizationId` を WHERE 句に含めた select → delete の2ステップ実装に変更済み。`_organizationId` パターンを解消。

### [LOW] updateMeetingSchema.inquiryId が必須のまま（deal-only 商談の更新が不可）
- **File**: src/app/actions/meetings.ts:172
- **Status**: FIXED
- 上記と同一修正。`.optional()` 付与済み。

### [LOW] テスト名に旧用語 internal_approval が3箇所残存
- **File**: src/__tests__/usecases/dealManagement.test.ts:61,75-76,87
- **Status**: FIXED
- 上記と同一修正。3箇所全て `estimate_approval` に変更済み。

### [LOW] deals.contractType コメントに旧型制約 contract が残存
- **File**: src/infrastructure/schema.ts:319
- **Status**: FIXED
- コメントが `"quasi_delegation" | "fixed_price" | "ses"` に更新済み。

### [MEDIUM] dealContactRepository.create にテナント検証がない
- **File**: src/infrastructure/repositories/dealContactRepository.ts:21-51
- **Status**: FIXED
- `deals` テーブルから `organizationId` を SELECT して事前確認する処理を追加。対象 deal が見つからない場合はエラーを throw する。
