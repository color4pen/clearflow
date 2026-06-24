# Regression Gate Result — iteration 001

- **verdict**: approved
- **date**: 2026-06-24
- **branch**: change/domain-model-alignment-699413c2

## Findings Verification

全 10 件をコードで確認した結果、すべて修正済み。リグレッションなし。

### [HIGH] updateInquiryAction が budget/timeline を FormData から読み取らずデータ消失
- **File**: src/app/actions/inquiries.ts:215
- **Status**: ✅ FIXED
- **Evidence**: L215-216 で `budgetRaw = formData.get("budget")` / `timelineRaw = formData.get("timeline")` を取得し、L223-224 の raw オブジェクトに渡している。L241-242 では `budget: parsed.data.budget` / `timeline: parsed.data.timeline` と `?? null` なしで usecase に渡している。

### [HIGH] createInquiryAction が budget/timeline を FormData から読み取らず UI 経由で設定不可
- **File**: src/app/actions/inquiries.ts:62
- **Status**: ✅ FIXED
- **Evidence**: L62-63 で `budgetRaw = formData.get("budget")` / `timelineRaw = formData.get("timeline")` を取得し、L71-72 で safeParse に渡している。L101-102 で usecase 呼び出し時に `budget: parsed.data.budget ?? null` / `timeline: parsed.data.timeline ?? null` を渡す（create 時は null へのフォールバックが適切）。

### [LOW] updateClientContact usecase がトランザクション未使用（Finding 3 & 5）
- **File**: src/application/usecases/updateClientContact.ts:40
- **Status**: ✅ FIXED
- **Evidence**: L40-63 で `db.transaction(async (tx) => { ... })` を使用。`clientRepository.updateContact` と `auditLogRepository.create` の両方に `tx` を渡している。

### [LOW] seed に inquiryId のみを持つ商談（引合段階の商談）のデモデータがない（Finding 4 & 6）
- **File**: src/infrastructure/seed.ts:804
- **Status**: ✅ FIXED
- **Evidence**: L804-828 に `inquiryId: inProgressInquiry1.id`（dealId なし）の hearing 商談を追加。L896-920 に `inquiryId: newInquiry1.id`（dealId なし）の hearing 商談を追加。計 2 件の引合段階商談が seed に存在する。

### [LOW] updateInquiryAction: budget/timeline の undefined が ?? null により null に変換され usecase ガードを迂回する（Finding 7）
- **File**: src/app/actions/inquiries.ts:241
- **Status**: ✅ FIXED
- **Evidence**: L241-242 が `budget: parsed.data.budget` / `timeline: parsed.data.timeline` となっており `?? null` を使用していない。usecase の `if (data.budget !== undefined)` ガードが正しく機能する。

### [LOW] seed.ts に未使用変数による lint 警告が 5 件ある（Finding 8）
- **File**: src/infrastructure/seed.ts:545
- **Status**: ✅ FIXED
- **Evidence**:
  - `newInquiry1` → L899 で `inquiryId: newInquiry1.id` として使用
  - `newInquiry2` → コードから削除済み（変数自体が存在しない）
  - `inProgressInquiry1` → L807 で `inquiryId: inProgressInquiry1.id` として使用
  - `inProgressInquiry2` → コードから削除済み（変数自体が存在しない）
  - `greenContact1` → L933 で `contactId: greenContact1.id` として使用
  - `financeContact1`, `financeContact2`, `yamatoContact2` も dealContacts で参照されており警告なし

### [HIGH] createClientContact: createContact と auditLogRepository.create がトランザクション外で呼ばれている（Finding 9）
- **File**: src/application/usecases/createClientContact.ts:37
- **Status**: ✅ FIXED
- **Evidence**: L37-57 で `db.transaction(async (tx) => { ... })` を使用。`clientRepository.createContact` と `auditLogRepository.create` の両方に `tx` を渡している。

### [LOW] deleteClientContact: deleteContact と auditLogRepository.create がトランザクション外で呼ばれている（Finding 10）
- **File**: src/application/usecases/deleteClientContact.ts:21
- **Status**: ✅ FIXED
- **Evidence**: L21-36 で `db.transaction(async (tx) => { ... })` を使用。`clientRepository.deleteContact` と `auditLogRepository.create` の両方に `tx` を渡している。

## Summary

| Severity | Total | Fixed | Regression |
|----------|-------|-------|------------|
| HIGH     | 3     | 3     | 0          |
| LOW      | 7     | 7     | 0          |
| **計**   | **10**| **10**| **0**      |

リグレッションなし。すべての修正が現在のコードに残存していることを確認した。
