# 営業系ページの repository 直接呼び出しを usecase 経由に移行

## Meta

- **type**: refactor
- **slug**: usecase-page-sales
- **base-branch**: main
- **adr**: false

## 背景

Server Component（page.tsx）から repository を直接 import して呼び出している箇所が営業系ページに 10 ファイルある。アーキテクチャの層分離を維持するため、usecase 経由に変更する。

## 現状コードの前提

- `src/app/(dashboard)/clients/page.tsx:4` — dealRepository を直接 import
- `src/app/(dashboard)/clients/[id]/page.tsx:4` — clientRepository, inquiryRepository, dealRepository, contractRepository を直接 import
- `src/app/(dashboard)/deals/[id]/page.tsx:11` — 複数の repository を直接 import
- `src/app/(dashboard)/deals/new/page.tsx:2` — clientRepository を直接 import
- `src/app/(dashboard)/inquiries/page.tsx:4` — dealRepository を直接 import
- `src/app/(dashboard)/inquiries/[id]/page.tsx:10` — 複数の repository を直接 import
- `src/app/(dashboard)/contracts/[id]/page.tsx:4` — contractRepository, invoiceRepository, requestRepository を直接 import
- `src/app/(dashboard)/contracts/new/page.tsx:4` — dealRepository を直接 import
- `src/app/(dashboard)/contracts/[id]/invoices/new/page.tsx:4` — contractRepository, invoiceRepository を直接 import
- `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/page.tsx:4` — meetingRepository, dealRepository, clientRepository を直接 import
- `src/app/(dashboard)/deals/[id]/meetings/new/page.tsx:4` — dealRepository, clientRepository を直接 import

## 要件

1. **不足 usecase の新設**: 以下の薄い usecase を新設する。organizationId でテナント分離し、データを返すだけの読み取り専用ユースケース
   - `getClient(clientId, organizationId)` — clientRepository.findById のラッパー
   - `getContract(contractId, organizationId)` — contractRepository.findById のラッパー
   - `getMeeting(meetingId, organizationId)` — meetingRepository.findById のラッパー
   - `listClients(organizationId)` — clientRepository.findAllByOrganization のラッパー
   - `listContractsByDeal(dealId, organizationId)` — contractRepository.findAllByDeal のラッパー（既存になければ）
   - `getDeal(dealId, organizationId)` — dealRepository.findById のラッパー（既存になければ）
   - その他、実装時に不足が見つかった usecase
2. **page.tsx の import 切り替え**: 全対象ファイルの repository import を usecase import に切り替える。呼び出し方はそのまま（引数と戻り値が同じため）
3. **既存 usecase の活用**: listDeals, listInquiries, listContracts, getInvoice, listInvoicesByContract 等の既存 usecase が使える箇所はそれを使う

## スコープ外

- usecase のビジネスロジック追加（純粋なラッパーとして作成）
- 設定系ページ（F01b で対応）
- テストの追加（薄いラッパーのため）

## 受け入れ基準

- [ ] 営業系の全 page.tsx から `@/infrastructure/repositories` の import がなくなっている
- [ ] 全ページが usecase 経由でデータを取得している
- [ ] 既存の画面動作に変更がない
- [ ] `typecheck && test` が green

## architect 評価済みの設計判断

1. **薄いラッパー usecase** — repository.findById を呼ぶだけの usecase は冗長に見えるが、層分離を維持する。将来ビジネスロジック（認可チェック等）を追加する際にページを変更せずに済む
