# Test Cases: 営業系ページの repository 直接呼び出しを usecase 経由に移行

## Summary

- **Total**: 25 cases
- **Automated** (unit/integration): 23
- **Manual**: 2
- **Priority**: must: 24, should: 1, could: 0

---

## Category 1: アーキテクチャ — import 構造

### TC-001: 営業系 page.tsx に `@/infrastructure/repositories` の import が残っていない

**Category**: integration  
**Priority**: must  
**Source**: spec.md > Requirement: 営業系ページから repository の直接 import を排除する > Scenario: repository import が残っていない

---

## Category 2: 新規 usecase の実装品質

### TC-002: 新規 usecase の関数本体が repository メソッド呼び出し 1 行のみである

**Category**: integration  
**Priority**: must  
**Source**: spec.md > Requirement: 新規 usecase は読み取り専用の薄いラッパーとする > Scenario: usecase の実装が repository メソッド呼び出しのみ

---

### TC-003: getClient.ts が正しいシグネチャと実装を持つ

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-01

**GIVEN** `src/application/usecases/getClient.ts` が作成されている  
**WHEN** ファイルを静的に検査する  
**THEN**
- 関数シグネチャが `getClient(clientId: string, organizationId: string)` である
- 戻り値の型が `Client | null` である
- `clientRepository.findById(clientId, organizationId)` の呼び出し 1 行のみで構成されている
- 型 import が `@/domain/models/client` から行われている

---

### TC-004: listClientContacts.ts が organizationId なしのシグネチャと JSDoc コメントを持つ

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-01, design.md > D2

**GIVEN** `src/application/usecases/listClientContacts.ts` が作成されている  
**WHEN** ファイルを静的に検査する  
**THEN**
- 関数シグネチャが `listClientContacts(clientId: string)` であり `organizationId` パラメータを含まない
- 戻り値の型が `ClientContact[]` である
- 関数定義直前に organizationId を取らない旨・テナント検証前提を記す JSDoc コメントが存在する

---

### TC-005: listDealContacts.ts が dealContactRepository を使用している

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-02

**GIVEN** `src/application/usecases/listDealContacts.ts` が作成されている  
**WHEN** ファイルを静的に検査する  
**THEN** `dealRepository` ではなく `dealContactRepository` を import・呼び出している

---

### TC-006: T-01 新規 usecase 2 ファイルが usecases ディレクトリに存在する

**Category**: integration  
**Priority**: must  
**Source**: tasks.md > T-01

**GIVEN** T-01 の実装が完了した状態  
**WHEN** `src/application/usecases/` を確認する  
**THEN** `getClient.ts` と `listClientContacts.ts` の 2 ファイルが存在する

---

### TC-007: T-02 新規 usecase 5 ファイルが usecases ディレクトリに存在する

**Category**: integration  
**Priority**: must  
**Source**: tasks.md > T-02

**GIVEN** T-02 の実装が完了した状態  
**WHEN** `src/application/usecases/` を確認する  
**THEN** `listDealsByClient.ts`, `listDealContacts.ts`, `getDealByInquiry.ts`, `getMeeting.ts`, `listMeetingsByInquiry.ts` の 5 ファイルが存在する

---

### TC-008: T-03 新規 usecase 6 ファイルが usecases ディレクトリに存在する

**Category**: integration  
**Priority**: must  
**Source**: tasks.md > T-03

**GIVEN** T-03 の実装が完了した状態  
**WHEN** `src/application/usecases/` を確認する  
**THEN** `listContractsByClient.ts`, `listContractsByDeal.ts`, `listInquiriesByClient.ts`, `getInvoiceSumByContract.ts`, `findPendingApprovalByTrigger.ts`, `hasPendingApproval.ts` の 6 ファイルが存在する

---

## Category 3: usecase の index.ts re-export

### TC-009: index.ts に 13 件の re-export が追加されている

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-04

**GIVEN** T-04 の実装が完了した状態  
**WHEN** `src/application/usecases/index.ts` を検査する  
**THEN** 以下 13 件すべての named export が存在する: `getClient`, `listClientContacts`, `listDealsByClient`, `listDealContacts`, `getDealByInquiry`, `getMeeting`, `listMeetingsByInquiry`, `listContractsByClient`, `listContractsByDeal`, `listInquiriesByClient`, `getInvoiceSumByContract`, `findPendingApprovalByTrigger`, `hasPendingApproval`

---

## Category 4: 各ページの import 切り替え

### TC-010: clients/page.tsx が listClients と listDeals を usecase から import している

**Category**: integration  
**Priority**: must  
**Source**: tasks.md > T-05

**GIVEN** T-05 の実装が完了した状態  
**WHEN** `src/app/(dashboard)/clients/page.tsx` を検査する  
**THEN**
- `@/infrastructure/repositories` の import が存在しない
- `listClients` と `listDeals` が `@/application/usecases` から import されている

---

### TC-011: clients/[id]/page.tsx が 5 つの usecase に切り替えられ Promise.all 構造が維持されている

**Category**: integration  
**Priority**: must  
**Source**: tasks.md > T-06

**GIVEN** T-06 の実装が完了した状態  
**WHEN** `src/app/(dashboard)/clients/[id]/page.tsx` を検査する  
**THEN**
- `@/infrastructure/repositories` の import が存在しない
- `getClient`, `listClientContacts`, `listInquiriesByClient`, `listDealsByClient`, `listContractsByClient` の 5 つが `@/application/usecases` から import されている
- `Promise.all` の構造が維持されている

---

### TC-012: deals/[id]/page.tsx が 7 つの usecase に切り替えられ getInquiry の呼び出しが object args 形式になっている

**Category**: integration  
**Priority**: must  
**Source**: tasks.md > T-07

**GIVEN** T-07 の実装が完了した状態  
**WHEN** `src/app/(dashboard)/deals/[id]/page.tsx` を検査する  
**THEN**
- `@/infrastructure/repositories` の import が存在しない
- `getDeal`, `getInquiry`, `listMeetings`, `listDealContacts`, `listContractsByDeal`, `getClient`, `listClientContacts` の 7 つが `@/application/usecases` から import されている
- `getInquiry` の呼び出しが `getInquiry({ inquiryId: deal.inquiryId, organizationId })` の object args 形式である

---

### TC-013: deals/new/page.tsx が listClients を usecase から import している

**Category**: integration  
**Priority**: must  
**Source**: tasks.md > T-08

**GIVEN** T-08 の実装が完了した状態  
**WHEN** `src/app/(dashboard)/deals/new/page.tsx` を検査する  
**THEN**
- `@/infrastructure/repositories` の import が存在しない
- `listClients` が `@/application/usecases` から import されている

---

### TC-014: inquiries/page.tsx が listDeals を usecase から import している

**Category**: integration  
**Priority**: must  
**Source**: tasks.md > T-09

**GIVEN** T-09 の実装が完了した状態  
**WHEN** `src/app/(dashboard)/inquiries/page.tsx` を検査する  
**THEN**
- `@/infrastructure/repositories` の import が存在しない
- `listDeals` が `@/application/usecases` から import されている

---

### TC-015: inquiries/[id]/page.tsx が 6 つの usecase に切り替えられ getInquiry の呼び出しが object args 形式になっている

**Category**: integration  
**Priority**: must  
**Source**: tasks.md > T-10

**GIVEN** T-10 の実装が完了した状態  
**WHEN** `src/app/(dashboard)/inquiries/[id]/page.tsx` を検査する  
**THEN**
- `@/infrastructure/repositories` の import が存在しない
- `getInquiry`, `getClient`, `getDealByInquiry`, `listClients`, `listMeetingsByInquiry`, `findPendingApprovalByTrigger` の 6 つが `@/application/usecases` から import されている
- `getInquiry` の呼び出しが `getInquiry({ inquiryId: id, organizationId })` の object args 形式である
- `Promise.all` の構造が維持されている

---

### TC-016: contracts/[id]/page.tsx がローカル変数リネーム済みで 3 つの usecase に切り替えられている

**Category**: integration  
**Priority**: must  
**Source**: tasks.md > T-11

**GIVEN** T-11 の実装が完了した状態  
**WHEN** `src/app/(dashboard)/contracts/[id]/page.tsx` を検査する  
**THEN**
- `@/infrastructure/repositories` の import が存在しない
- `getContract`, `listInvoicesByContract`, `hasPendingApproval` の 3 つが `@/application/usecases` から import されている
- `getContract` の呼び出しが `getContract({ contractId: id, organizationId })` の object args 形式である
- `listInvoicesByContract` の呼び出しが `listInvoicesByContract({ contractId: id, organizationId })` の object args 形式である
- ローカル変数 `hasPendingApproval` が存在せず `isPending` にリネームされている

---

### TC-017: contracts/new/page.tsx が getDeal を usecase から import している

**Category**: integration  
**Priority**: must  
**Source**: tasks.md > T-12

**GIVEN** T-12 の実装が完了した状態  
**WHEN** `src/app/(dashboard)/contracts/new/page.tsx` を検査する  
**THEN**
- `@/infrastructure/repositories` の import が存在しない
- `getDeal` が `@/application/usecases` から import されている

---

### TC-018: contracts/[id]/invoices/new/page.tsx が getContract と getInvoiceSumByContract を usecase から import している

**Category**: integration  
**Priority**: must  
**Source**: tasks.md > T-13

**GIVEN** T-13 の実装が完了した状態  
**WHEN** `src/app/(dashboard)/contracts/[id]/invoices/new/page.tsx` を検査する  
**THEN**
- `@/infrastructure/repositories` の import が存在しない
- `getContract`, `getInvoiceSumByContract` の 2 つが `@/application/usecases` から import されている
- `getContract` の呼び出しが `getContract({ contractId, organizationId })` の object args 形式である

---

### TC-019: deals/[id]/meetings/[meetingId]/page.tsx が getMeeting, getDeal, listClientContacts を追加して 4 つの usecase を import している

**Category**: integration  
**Priority**: must  
**Source**: tasks.md > T-14

**GIVEN** T-14 の実装が完了した状態  
**WHEN** `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/page.tsx` を検査する  
**THEN**
- `@/infrastructure/repositories` の import が存在しない
- `listOrganizationUsers`, `getMeeting`, `getDeal`, `listClientContacts` の 4 つが `@/application/usecases` から import されている

---

### TC-020: deals/[id]/meetings/new/page.tsx が getDeal と listClientContacts を追加して 3 つの usecase を import している

**Category**: integration  
**Priority**: must  
**Source**: tasks.md > T-15

**GIVEN** T-15 の実装が完了した状態  
**WHEN** `src/app/(dashboard)/deals/[id]/meetings/new/page.tsx` を検査する  
**THEN**
- `@/infrastructure/repositories` の import が存在しない
- `listOrganizationUsers`, `getDeal`, `listClientContacts` の 3 つが `@/application/usecases` から import されている

---

## Category 5: 設計決定の遵守

### TC-021: clients/page.tsx と inquiries/page.tsx が listDeals を再利用しており重複 usecase を作成していない

**Category**: unit  
**Priority**: should  
**Source**: design.md > D3

**GIVEN** T-05 および T-09 の実装が完了した状態  
**WHEN** 各ページの呼び出しと `src/application/usecases/` を確認する  
**THEN**
- 両ページで `dealRepository.findAllByOrganization` の代替として既存の `listDeals` usecase が使われている
- `listDealsRaw` 等の重複 usecase が新設されていない

---

### TC-022: 既存 usecase の object args シグネチャが変更されていない

**Category**: unit  
**Priority**: must  
**Source**: design.md > D4

**GIVEN** 全タスクの実装が完了した状態  
**WHEN** `getInquiry`, `getContract`, `listInvoicesByContract` の定義ファイルを検査する  
**THEN** 各 usecase のシグネチャが変更されておらず、object args 形式のままである

---

## Category 6: ビルド・型チェック・テスト

### TC-023: ビルドと型チェックが通る

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: 既存の画面動作に変更がない > Scenario: ビルドと型チェックが通る

---

### TC-024: 既存テストが全件パスする

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: 既存の画面動作に変更がない > Scenario: 既存テストが全件パスする

---

### TC-025: contracts/[id]/page.tsx の hasPendingApproval 名前衝突が型エラーを生じさせない

**Category**: integration  
**Priority**: must  
**Source**: tasks.md > T-11

**GIVEN** T-11 の実装が完了した状態（ローカル変数を `isPending` にリネーム済み）  
**WHEN** `bunx tsc --noEmit` を実行する  
**THEN** `hasPendingApproval` の識別子衝突に起因する型エラーが出力されない

---

## Result

```yaml
result: completed
total: 25
automated: 23
manual: 2
must: 24
should: 1
could: 0
blocked_reasons: []
```
