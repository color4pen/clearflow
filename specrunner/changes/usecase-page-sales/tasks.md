# Tasks: 営業系ページの repository 直接呼び出しを usecase 経由に移行

## T-01: Client 関連の読み取り専用 usecase を新設

- [ ] `src/application/usecases/getClient.ts` を作成する。`clientRepository.findById(clientId, organizationId)` を呼び、`Client | null` を返す。シグネチャ: `getClient(clientId: string, organizationId: string)`。既存 `getDeal.ts` と同じパターン
- [ ] `src/application/usecases/listClientContacts.ts` を作成する。`clientRepository.findContactsByClientId(clientId)` を呼び、`ClientContact[]` を返す。シグネチャ: `listClientContacts(clientId: string)`。organizationId は取らない（D2 決定に従う）

**Acceptance Criteria**:
- 2 ファイルが `src/application/usecases/` に存在する
- 各関数は repository メソッドの 1 行ラッパーである
- 型 import は `@/domain/models/client` から行っている
- `listClientContacts.ts` の関数定義直前に、repository JSDoc と同等のテナント分離前提を記す JSDoc コメントを追加すること（例: `/** @note organizationId を引数に取らない。呼び出し前に getClient 等でテナント検証を完了させること。 */`）
- `bun run build` が通る

---

## T-02: Deal / Meeting 関連の読み取り専用 usecase を新設

- [ ] `src/application/usecases/listDealsByClient.ts` を作成する。`dealRepository.findAllByClientId(clientId, organizationId)` を呼び、`Deal[]` を返す。シグネチャ: `listDealsByClient(clientId: string, organizationId: string)`
- [ ] `src/application/usecases/listDealContacts.ts` を作成する。`dealContactRepository.findByDeal(dealId, organizationId)` を呼び、`DealContact[]` を返す。シグネチャ: `listDealContacts(dealId: string, organizationId: string)`
- [ ] `src/application/usecases/getDealByInquiry.ts` を作成する。`dealRepository.findByInquiryId(inquiryId, organizationId)` を呼び、`Deal | null` を返す。シグネチャ: `getDealByInquiry(inquiryId: string, organizationId: string)`
- [ ] `src/application/usecases/getMeeting.ts` を作成する。`meetingRepository.findById(meetingId, organizationId)` を呼び、`Meeting | null` を返す。シグネチャ: `getMeeting(meetingId: string, organizationId: string)`
- [ ] `src/application/usecases/listMeetingsByInquiry.ts` を作成する。`meetingRepository.findAllByInquiry(inquiryId, organizationId)` を呼び、`Meeting[]` を返す。シグネチャ: `listMeetingsByInquiry(inquiryId: string, organizationId: string)`

**Acceptance Criteria**:
- 5 ファイルが `src/application/usecases/` に存在する
- 各関数は repository メソッドの 1 行ラッパーである
- `listDealContacts` は `dealContactRepository` を import している（`dealRepository` ではない）
- 型 import は `@/domain/models/deal` および `@/domain/models/meeting` から行っている
- `bun run build` が通る

---

## T-03: Contract / Invoice / Request 関連の読み取り専用 usecase を新設

- [ ] `src/application/usecases/listContractsByClient.ts` を作成する。`contractRepository.findAllByClientId(clientId, organizationId)` を呼び、`Contract[]` を返す。シグネチャ: `listContractsByClient(clientId: string, organizationId: string)`
- [ ] `src/application/usecases/listContractsByDeal.ts` を作成する。`contractRepository.findAllByDealId(dealId, organizationId)` を呼び、`Contract[]` を返す。シグネチャ: `listContractsByDeal(dealId: string, organizationId: string)`
- [ ] `src/application/usecases/listInquiriesByClient.ts` を作成する。`inquiryRepository.findByClientId(clientId, organizationId)` を呼び、`Inquiry[]` を返す。シグネチャ: `listInquiriesByClient(clientId: string, organizationId: string)`
- [ ] `src/application/usecases/getInvoiceSumByContract.ts` を作成する。`invoiceRepository.sumAmountByContract(contractId, organizationId)` を呼び、`number` を返す。シグネチャ: `getInvoiceSumByContract(contractId: string, organizationId: string)`
- [ ] `src/application/usecases/findPendingApprovalByTrigger.ts` を作成する。`requestRepository.findByOriginTriggerEntity(organizationId, triggerAction, triggerEntityId)` を呼び、`Request | null` を返す。シグネチャ: `findPendingApprovalByTrigger(organizationId: string, triggerAction: string, triggerEntityId: string)`
- [ ] `src/application/usecases/hasPendingApproval.ts` を作成する。`requestRepository.existsPendingByTriggerEntityId(organizationId, triggerEntityId)` を呼び、`boolean` を返す。シグネチャ: `hasPendingApproval(organizationId: string, triggerEntityId: string)`

**Acceptance Criteria**:
- 6 ファイルが `src/application/usecases/` に存在する
- 各関数は repository メソッドの 1 行ラッパーである
- 型 import は `@/domain/models/contract`, `@/domain/models/inquiry`, `@/domain/models/invoice`, `@/domain/models/request` から行っている
- `bun run build` が通る

---

## T-04: 新規 usecase を index.ts に re-export する

- [ ] `src/application/usecases/index.ts` に以下 13 件の re-export を追加する:
  - `export { getClient } from "./getClient";`
  - `export { listClientContacts } from "./listClientContacts";`
  - `export { listDealsByClient } from "./listDealsByClient";`
  - `export { listDealContacts } from "./listDealContacts";`
  - `export { getDealByInquiry } from "./getDealByInquiry";`
  - `export { getMeeting } from "./getMeeting";`
  - `export { listMeetingsByInquiry } from "./listMeetingsByInquiry";`
  - `export { listContractsByClient } from "./listContractsByClient";`
  - `export { listContractsByDeal } from "./listContractsByDeal";`
  - `export { listInquiriesByClient } from "./listInquiriesByClient";`
  - `export { getInvoiceSumByContract } from "./getInvoiceSumByContract";`
  - `export { findPendingApprovalByTrigger } from "./findPendingApprovalByTrigger";`
  - `export { hasPendingApproval } from "./hasPendingApproval";`

**Acceptance Criteria**:
- 13 件の re-export 行が `index.ts` に追加されている
- `bun run build` が通る

---

## T-05: clients/page.tsx の import を usecase に切り替え

対象: `src/app/(dashboard)/clients/page.tsx`

- [ ] `import { dealRepository } from "@/infrastructure/repositories"` を削除する
- [ ] `import { listClients } from "@/application/usecases"` に `listDeals` を追加する: `import { listClients, listDeals } from "@/application/usecases"`
- [ ] `dealRepository.findAllByOrganization(organizationId)` を `listDeals(organizationId)` に置き換える。戻り値の型は `DealWithDetails[]`（`Deal` のスーパーセット）のため `deal.clientId` アクセスはそのまま動作する

**Acceptance Criteria**:
- `@/infrastructure/repositories` からの import がファイルに存在しない
- `listDeals` が `@/application/usecases` から import されている
- `bun run build` が通る

---

## T-06: clients/[id]/page.tsx の import を usecase に切り替え

対象: `src/app/(dashboard)/clients/[id]/page.tsx`

- [ ] `import { clientRepository, inquiryRepository, dealRepository, contractRepository } from "@/infrastructure/repositories"` を削除する
- [ ] `import { getClient, listClientContacts, listInquiriesByClient, listDealsByClient, listContractsByClient } from "@/application/usecases"` を追加する
- [ ] `clientRepository.findById(id, organizationId)` → `getClient(id, organizationId)` に置き換え
- [ ] `clientRepository.findContactsByClientId(id)` → `listClientContacts(id)` に置き換え
- [ ] `inquiryRepository.findByClientId(id, organizationId)` → `listInquiriesByClient(id, organizationId)` に置き換え
- [ ] `dealRepository.findAllByClientId(id, organizationId)` → `listDealsByClient(id, organizationId)` に置き換え
- [ ] `contractRepository.findAllByClientId(id, organizationId)` → `listContractsByClient(id, organizationId)` に置き換え

**Acceptance Criteria**:
- `@/infrastructure/repositories` からの import がファイルに存在しない
- 5 つの usecase が `@/application/usecases` から import されている
- `Promise.all` の構造が維持されている
- `bun run build` が通る

---

## T-07: deals/[id]/page.tsx の import を usecase に切り替え

対象: `src/app/(dashboard)/deals/[id]/page.tsx`

- [ ] `import { dealRepository, inquiryRepository, clientRepository, meetingRepository, dealContactRepository, contractRepository } from "@/infrastructure/repositories"` を削除する
- [ ] `import { getDeal, getInquiry, listMeetings, listDealContacts, listContractsByDeal, getClient, listClientContacts } from "@/application/usecases"` を追加する
- [ ] `dealRepository.findById(id, organizationId)` → `getDeal(id, organizationId)` に置き換え
- [ ] `inquiryRepository.findById(deal.inquiryId, organizationId)` → `getInquiry({ inquiryId: deal.inquiryId, organizationId })` に置き換え（既存 usecase は object args シグネチャ — D4 決定）
- [ ] `meetingRepository.findAllByDeal(deal.id, organizationId)` → `listMeetings(deal.id, organizationId)` に置き換え
- [ ] `dealContactRepository.findByDeal(deal.id, organizationId)` → `listDealContacts(deal.id, organizationId)` に置き換え
- [ ] `contractRepository.findAllByDealId(deal.id, organizationId)` → `listContractsByDeal(deal.id, organizationId)` に置き換え
- [ ] `clientRepository.findById(deal.clientId, organizationId)` → `getClient(deal.clientId, organizationId)` に置き換え
- [ ] `clientRepository.findContactsByClientId(deal.clientId)` → `listClientContacts(deal.clientId)` に置き換え

**Acceptance Criteria**:
- `@/infrastructure/repositories` からの import がファイルに存在しない
- 7 つの usecase が `@/application/usecases` から import されている
- `getInquiry` の呼び出しが object args 形式 `{ inquiryId, organizationId }` に変更されている
- `bun run build` が通る

---

## T-08: deals/new/page.tsx の import を usecase に切り替え

対象: `src/app/(dashboard)/deals/new/page.tsx`

- [ ] `import { clientRepository } from "@/infrastructure/repositories"` を削除する
- [ ] 既存の `import { listOrganizationUsers } from "@/application/usecases"` に `listClients` を追加する: `import { listOrganizationUsers, listClients } from "@/application/usecases"`
- [ ] `clientRepository.findAllByOrganization(organizationId)` → `listClients(organizationId)` に置き換え

**Acceptance Criteria**:
- `@/infrastructure/repositories` からの import がファイルに存在しない
- `listClients` が `@/application/usecases` から import されている
- `bun run build` が通る

---

## T-09: inquiries/page.tsx の import を usecase に切り替え

対象: `src/app/(dashboard)/inquiries/page.tsx`

- [ ] `import { dealRepository } from "@/infrastructure/repositories"` を削除する
- [ ] 既存の `import { listInquiries } from "@/application/usecases"` に `listDeals` を追加する: `import { listInquiries, listDeals } from "@/application/usecases"`
- [ ] `dealRepository.findAllByOrganization(organizationId)` → `listDeals(organizationId)` に置き換え

**Acceptance Criteria**:
- `@/infrastructure/repositories` からの import がファイルに存在しない
- `listDeals` が `@/application/usecases` から import されている
- `bun run build` が通る

---

## T-10: inquiries/[id]/page.tsx の import を usecase に切り替え

対象: `src/app/(dashboard)/inquiries/[id]/page.tsx`

- [ ] `import { inquiryRepository, clientRepository, dealRepository, meetingRepository, requestRepository } from "@/infrastructure/repositories"` を削除する
- [ ] `import { getInquiry, getClient, getDealByInquiry, listClients, listMeetingsByInquiry, findPendingApprovalByTrigger } from "@/application/usecases"` を追加する
- [ ] `inquiryRepository.findById(id, organizationId)` → `getInquiry({ inquiryId: id, organizationId })` に置き換え（既存 usecase は object args）
- [ ] `clientRepository.findById(inquiry.clientId, organizationId)` → `getClient(inquiry.clientId, organizationId)` に置き換え
- [ ] `dealRepository.findByInquiryId(id, organizationId)` → `getDealByInquiry(id, organizationId)` に置き換え
- [ ] `clientRepository.findAllByOrganization(organizationId)` → `listClients(organizationId)` に置き換え
- [ ] `meetingRepository.findAllByInquiry(id, organizationId)` → `listMeetingsByInquiry(id, organizationId)` に置き換え
- [ ] `requestRepository.findByOriginTriggerEntity(organizationId, "inquiry.convert", id)` → `findPendingApprovalByTrigger(organizationId, "inquiry.convert", id)` に置き換え

**Acceptance Criteria**:
- `@/infrastructure/repositories` からの import がファイルに存在しない
- 6 つの usecase が `@/application/usecases` から import されている
- `getInquiry` の呼び出しが object args 形式に変更されている
- `Promise.all` の構造が維持されている
- `bun run build` が通る

---

## T-11: contracts/[id]/page.tsx の import を usecase に切り替え

対象: `src/app/(dashboard)/contracts/[id]/page.tsx`

> **注意**: このファイルには既に `let hasPendingApproval = false;` というローカル変数が存在する（line 31/33/48 付近）。
> `hasPendingApproval` という名前の usecase を import すると TypeScript strict モードで名前衝突によるコンパイルエラーが発生するため、
> **import 追加より先にローカル変数をリネームすること**。

- [ ] ローカル変数 `hasPendingApproval` を `isPending` にリネームする:
  - `let hasPendingApproval = false;` → `let isPending = false;`
  - `hasPendingApproval = await requestRepository.existsPendingByTriggerEntityId(organizationId, id);` → `isPending = await requestRepository.existsPendingByTriggerEntityId(organizationId, id);`
  - JSX 内の `{hasPendingApproval && (` → `{isPending && (`
- [ ] `import { contractRepository, invoiceRepository, requestRepository } from "@/infrastructure/repositories"` を削除する
- [ ] `import { getContract, listInvoicesByContract, hasPendingApproval } from "@/application/usecases"` を追加する
- [ ] `contractRepository.findById(id, organizationId)` → `getContract({ contractId: id, organizationId })` に置き換え（既存 usecase は object args）
- [ ] `invoiceRepository.findAllByContract(id, organizationId)` → `listInvoicesByContract({ contractId: id, organizationId })` に置き換え（既存 usecase は object args）
- [ ] `requestRepository.existsPendingByTriggerEntityId(organizationId, id)` の呼び出し（`isPending =` の右辺）→ `hasPendingApproval(organizationId, id)` に置き換え

**Acceptance Criteria**:
- `@/infrastructure/repositories` からの import がファイルに存在しない
- 3 つの usecase が `@/application/usecases` から import されている
- `getContract`, `listInvoicesByContract` の呼び出しが object args 形式に変更されている
- ローカル変数が `isPending` にリネームされており、`hasPendingApproval` という識別子がローカル変数として存在しない
- `bun run build` が通る

---

## T-12: contracts/new/page.tsx の import を usecase に切り替え

対象: `src/app/(dashboard)/contracts/new/page.tsx`

- [ ] `import { dealRepository } from "@/infrastructure/repositories"` を削除する
- [ ] `import { getDeal } from "@/application/usecases"` を追加する
- [ ] `dealRepository.findById(dealId, organizationId)` → `getDeal(dealId, organizationId)` に置き換え

**Acceptance Criteria**:
- `@/infrastructure/repositories` からの import がファイルに存在しない
- `getDeal` が `@/application/usecases` から import されている
- `bun run build` が通る

---

## T-13: contracts/[id]/invoices/new/page.tsx の import を usecase に切り替え

対象: `src/app/(dashboard)/contracts/[id]/invoices/new/page.tsx`

- [ ] `import { contractRepository, invoiceRepository } from "@/infrastructure/repositories"` を削除する
- [ ] `import { getContract, getInvoiceSumByContract } from "@/application/usecases"` を追加する
- [ ] `contractRepository.findById(contractId, organizationId)` → `getContract({ contractId, organizationId })` に置き換え（既存 usecase は object args）
- [ ] `invoiceRepository.sumAmountByContract(contractId, organizationId)` → `getInvoiceSumByContract(contractId, organizationId)` に置き換え

**Acceptance Criteria**:
- `@/infrastructure/repositories` からの import がファイルに存在しない
- 2 つの usecase が `@/application/usecases` から import されている
- `bun run build` が通る

---

## T-14: deals/[id]/meetings/[meetingId]/page.tsx の import を usecase に切り替え

対象: `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/page.tsx`

- [ ] `import { meetingRepository, dealRepository, clientRepository } from "@/infrastructure/repositories"` を削除する
- [ ] 既存の `import { listOrganizationUsers } from "@/application/usecases"` に `getMeeting, getDeal, listClientContacts` を追加する: `import { listOrganizationUsers, getMeeting, getDeal, listClientContacts } from "@/application/usecases"`
- [ ] `meetingRepository.findById(meetingId, organizationId)` → `getMeeting(meetingId, organizationId)` に置き換え
- [ ] `dealRepository.findById(id, organizationId)` → `getDeal(id, organizationId)` に置き換え
- [ ] `clientRepository.findContactsByClientId(deal.clientId)` → `listClientContacts(deal.clientId)` に置き換え

**Acceptance Criteria**:
- `@/infrastructure/repositories` からの import がファイルに存在しない
- 4 つの usecase が `@/application/usecases` から import されている（`listOrganizationUsers` 含む）
- `bun run build` が通る

---

## T-15: deals/[id]/meetings/new/page.tsx の import を usecase に切り替え

対象: `src/app/(dashboard)/deals/[id]/meetings/new/page.tsx`

- [ ] `import { dealRepository, clientRepository } from "@/infrastructure/repositories"` を削除する
- [ ] 既存の `import { listOrganizationUsers } from "@/application/usecases"` に `getDeal, listClientContacts` を追加する: `import { listOrganizationUsers, getDeal, listClientContacts } from "@/application/usecases"`
- [ ] `dealRepository.findById(id, organizationId)` → `getDeal(id, organizationId)` に置き換え
- [ ] `clientRepository.findContactsByClientId(deal.clientId)` → `listClientContacts(deal.clientId)` に置き換え

**Acceptance Criteria**:
- `@/infrastructure/repositories` からの import がファイルに存在しない
- 3 つの usecase が `@/application/usecases` から import されている（`listOrganizationUsers` 含む）
- `bun run build` が通る

---

## T-16: 最終検証 — import 残存チェック・ビルド・型チェック・テスト

- [ ] `grep -r "from.*@/infrastructure/repositories" src/app/\(dashboard\)/clients/ src/app/\(dashboard\)/deals/ src/app/\(dashboard\)/inquiries/ src/app/\(dashboard\)/contracts/` を実行し、営業系ページに `@/infrastructure/repositories` の import が残っていないことを確認する（0 件であること）
- [ ] `bunx tsc --noEmit` を実行し、型チェックが通ることを確認する
- [ ] `bun test` を実行し、全テストが green であることを確認する
- [ ] `bun run build` を実行し、ビルドが成功することを確認する

**Acceptance Criteria**:
- 営業系ページに `@/infrastructure/repositories` の import が 0 件
- `typecheck` green
- `bun test` 全件 green
- `bun run build` 成功
