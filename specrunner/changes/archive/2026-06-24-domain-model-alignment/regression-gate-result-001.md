# Regression Gate Result — domain-model-alignment — iter 1

- **verdict**: approved
- **iteration**: 001

## Summary

6 件の所見を検証した。code fix が行われた Finding 4（validatePrimaryUniqueness の追加）は現在のコードで維持されている。残りの 5 件は review-feedback-001.md で Fix=no とされ、既知の制限として承認済みであり、状態に変化はない。リグレッションなし。

## Finding Verification

### Finding 1 — [LOW] テストが静的ソース解析のみで runtime 動作を検証しない

- **File**: `src/__tests__/usecases/meetingManagement.test.ts`
- **Status**: no-regression
- **Detail**: 本ブランチで新テスト（T-01b, T-01c, Meeting domain model, meetingRepository, createMeetingAction 静的検証）が追加されたが、すべて `readFile + toContain` による静的解析のまま。runtime 実行は行われていない。review-feedback-001.md にて Fix=no（スコープ外）と判断済み。現在のコードは review 承認時の状態と同一であり、リグレッションではない。

### Finding 2 — [LOW] source パラメータが string 型のまま（InquirySource 型未使用）

- **File**: `src/infrastructure/repositories/inquiryRepository.ts:31`, `src/application/usecases/createInquiry.ts:15`
- **Status**: no-regression
- **Detail**: `inquiryRepository.create()` の引数 `source` は `string` 型（line 31）のまま。内部で `as "web" | "phone" | ...` キャスト（line 46）が残存。`createInquiry` usecase の `source` も `string`（line 15）。review-feedback-001.md にて Fix=no（Zod バリデーション で入口保護済み、実害リスク低）と判断済み。リグレッションではない。

### Finding 3 — [LOW] updateMeetingAction が inquiryId パスの revalidatePath を欠く

- **File**: `src/app/actions/meetings.ts`
- **Status**: no-regression
- **Detail**: `updateMeetingAction`（lines 384-389）は `dealId` パスのみ `revalidatePath` しており、`inquiryId` パスの再検証は行われていない。`createMeetingAction` は両方を再検証しており非対称の状態が継続している。review-feedback-001.md にて Fix=no（UI キャッシュのみの問題、データ整合性に影響なし）と判断済み。リグレッションではない。

### Finding 4 — [MEDIUM] updateClientContactAction の isPrimary 検証がトランザクション外（TOCTOU リスク）

- **File**: `src/app/actions/clients.ts:292`
- **Status**: fix-present
- **Detail**: `validatePrimaryUniqueness(clientId, contactId, isPrimary)` の呼び出しが lines 291-295 に存在する。fix（バリデーション追加）は維持されている。トランザクション外での呼び出しによる TOCTOU リスクは設計書 D5 で明示的にスコープ外とされた既知制限であり、review-feedback-001.md の Summary でも確認済み。リグレッションなし。

### Finding 5 — [LOW] client_contacts テーブルに isPrimary 部分 UNIQUE INDEX が存在しない

- **File**: `src/infrastructure/schema.ts:260-272`
- **Status**: no-regression
- **Detail**: `clientContacts` テーブル定義（lines 260-272）に `(client_id) WHERE is_primary = true` の partial unique index は存在しない。受け入れ基準はアプリケーション層での検証のみを要求しており仕様上合格。本変更のスコープ外として承認済み。リグレッションではない。

### Finding 6 — [LOW] updateClientContactAction が監査ログを書かない（既存の use case バイパス問題）

- **File**: `src/app/actions/clients.ts:297`
- **Status**: no-regression
- **Detail**: `updateClientContactAction` は `clientRepository.updateContact` を直接呼び出し（line 297）、use case を経由せず監査ログを記録しない。本変更以前から存在する既存問題であり、設計書 D5 でバイパス修正は本リクエストのスコープ外とされている。リグレッションではない。

## Regressions

なし。

## Contradictions

なし。
