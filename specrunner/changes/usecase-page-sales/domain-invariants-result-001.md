# Domain Invariants Review — usecase-page-sales — iter 1

- **verdict**: approved

---

## 観点

- テナント分離：全 usecase が organizationId で正しくスコープされているか
- 監査ログの完全性：書き込み経路の監査ログが迂回されていないか
- 承認ワークフロー不変条件：既存の状態遷移・ロック・イベント発火が破壊されていないか

---

## 確認結果

### テナント分離

#### 新規 usecase 12 種（organizationId あり）

| usecase | 引数 | 判定 |
|---|---|---|
| `getClient` | `(clientId, organizationId)` | ✅ |
| `getMeeting` | `(meetingId, organizationId)` | ✅ |
| `getDealByInquiry` | `(inquiryId, organizationId)` | ✅ |
| `listDealsByClient` | `(clientId, organizationId)` | ✅ |
| `listDealContacts` | `(dealId, organizationId)` | ✅ |
| `listMeetingsByInquiry` | `(inquiryId, organizationId)` | ✅ |
| `listContractsByClient` | `(clientId, organizationId)` | ✅ |
| `listContractsByDeal` | `(dealId, organizationId)` | ✅ |
| `listInquiriesByClient` | `(clientId, organizationId)` | ✅ |
| `getInvoiceSumByContract` | `(contractId, organizationId)` | ✅ |
| `findPendingApprovalByTrigger` | `(organizationId, triggerAction, triggerEntityId)` | ✅ |
| `hasPendingApproval` | `(organizationId, triggerEntityId)` | ✅ |

#### `listClientContacts` — organizationId なし（設計決定 D2）

設計 D2 として受理済み。全呼び出し箇所で親エンティティの所属検証が先行している：

| 呼び出し元 | 先行する所属検証 | 判定 |
|---|---|---|
| `clients/[id]/page.tsx` | `getClient(id, organizationId)` が null のとき `notFound()` | ✅ |
| `deals/[id]/page.tsx` | `getDeal(id, organizationId)` が null → `notFound()` 後に `deal.clientId` で呼び出し | ✅ |
| `deals/[id]/meetings/[meetingId]/page.tsx` | `getMeeting(meetingId, organizationId)` + `meeting.dealId !== id` チェック後に呼び出し | ✅ |
| `deals/[id]/meetings/new/page.tsx` | `getDeal(id, organizationId)` が null → `notFound()` 後に呼び出し | ✅ |

`clients/[id]/page.tsx` では `Promise.all` 内で `getClient` と `listClientContacts` が並行実行されるため、
テナント所属未確認のまま DB クエリが発火する。ただし取得データはユーザーに届かず (`notFound()` で早期終了)、
かつ本変更以前から同じ repository 呼び出しパターンが存在していたため **退行なし**。
D2 の JSDoc は `listClientContacts.ts` に正しく記載されている。

#### 営業系ページからの repository 直接 import 残存チェック

```
grep "@/infrastructure/repositories" src/app/(dashboard)/{clients,deals,inquiries,contracts}/**/page.tsx
→ 0 件
```

残存は `/settings/` 配下のみ（スコープ外、F01b で対応）。受け入れ基準を満たす。

---

### 監査ログの完全性

本変更はすべて **読み取り専用** のリファクタリングである。

- 書き込み usecase（`createRequest`, `approveRequest`, `rejectRequest`, `submitRequest`, `resubmitRequest` 等）は一切変更されていない
- 監査ログ書き込み（`auditLogRepository.create`）は書き込み usecase 内のトランザクション内部に閉じており、本変更のスコープ外
- 新規 usecase 13 種はいずれも副作用・トランザクション・イベント発火を含まない（仕様 Requirement 2 準拠）

**監査ログ完全性への影響なし。**

---

### 承認ワークフロー不変条件

#### 読み取り専用 usecase の導入

`hasPendingApproval` と `findPendingApprovalByTrigger` はいずれも:

- `requestRepository` の読み取りメソッドのみを呼ぶ
- organizationId で正しくスコープされている
- 状態遷移・ステップ更新・イベント発火を行わない
- バナー表示など UI のためのデータ取得にのみ使用されている

#### 命名衝突の解決（`contracts/[id]/page.tsx`）

既存ローカル変数 `hasPendingApproval` を `isPending` にリネームし、import 名と衝突しないよう処置されている。
JSX 内の参照も全箇所 `isPending` に更新済み（TypeScript strict モードで型チェック通過済み）。

#### 承認フロー書き込みパスへの影響

`approveRequest`（楽観的ロック・TOCTOU 対策・委譲検証・auditLog 書き込み・イベント発火を含む）は未変更。
`submitRequest`, `rejectRequest`, `resubmitRequest` も未変更。

**承認ワークフローの不変条件は破壊されていない。**

---

### 検証結果の確認

| フェーズ | 結果 |
|---|---|
| build | passed (14.7s) |
| typecheck | passed |
| test | 970 pass / 0 fail |
| lint | 0 errors, 10 warnings（既存ファイルの警告のみ、本変更に起因するものなし） |

---

## 所見まとめ

| # | 重要度 | 内容 |
|---|---|---|
| F-1 | info | `listClientContacts` は organizationId を取らない（D2 受理済み）。全呼び出し元で先行検証あり。DB クエリは並行発火するが、データ漏洩は発生しない |
| F-2 | info | `/settings/` 配下に repository 直接 import が残存するが、スコープ外（F01b 対応）のため問題なし |

要修正指摘なし。
