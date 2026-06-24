# Review Result — domain-invariants — authorization-centralize — iter 1

## Summary

- **reviewer**: domain-invariants
- **verdict**: approved
- **scope**: テナント分離・監査ログの完全性・承認ワークフロー不変条件

---

## Findings

### [INFO] テナント分離: 全アクションで organizationId が正しくスコープされている

全アクションファイル（contracts.ts, invoices.ts, deals.ts, inquiries.ts, clients.ts, delegations.ts, templates.ts, users.ts, meetings.ts, webhooks.ts）において、ユースケース呼び出し時に `session.user.organizationId` が一貫して渡されており、テナント境界が維持されている。

委任操作（`deactivateDelegationAction`）において、非 admin ロールが他ユーザーの委任を操作しようとした場合の所有権チェックは、`approvalDelegationRepository.findByOrganization(session.user.organizationId)` でテナントスコープした後に `fromUserId === session.user.id` を検証している。クロステナント参照のリスクはない。

### [INFO] 監査ログの完全性: 新規許可操作を含む全 write ユースケースで記録されている

本変更によって新規許可されたロールの操作（finance による契約・請求、member による案件・引合・商談記録・顧客担当者）に対応するユースケースすべてに監査ログ記録が実装されている。

| 新規許可操作 | ユースケース | 監査ログ |
|---|---|---|
| finance: 契約 create/edit/changeStatus/delete | createContract, updateContract, updateContractStatus, deleteContract | ✓ |
| finance: 請求 create/changeStatus | createInvoice, updateInvoiceStatus | ✓ |
| member: 案件 edit/changePhase/delete | updateDeal, updateDealPhase, deleteDeal | ✓ |
| member: 引合 create/edit/delete | createInquiry, updateInquiry, deleteInquiry | ✓ |
| manager/finance: 委任 create/deactivate | createDelegation, deactivateDelegation | ✓ |

ユースケース層は本変更でいっさい修正されておらず、既存の監査ログ実装は完全に保持されている。

### [INFO] 承認ワークフローの不変条件: 承認ステップ認可は影響なし

`requests.ts`（承認操作）はスコープ外として変更されておらず、`approvalStepService` による承認者判定ロジックは変更されていない。

PERMISSION_MATRIX に `approval` エンティティ（approve/reject: admin/manager/finance）が定義されているが、`requests.ts` では `canPerform` の呼び出しは行われておらず、既存の承認者検証フローが維持されている。承認ワークフローの不変条件は破壊されていない。

### [INFO] 委任の「自身のみ」制約: アクション層で正しく実装されている

`createDelegationAction`・`deactivateDelegationAction`・`listDelegationsAction` の 3 つすべてで、非 admin ロールに対する `fromUserId === session.user.id` 検証が適切に実装されている。

- `createDelegationAction`: バリデーション後に `session.user.role !== "admin" && parsed.data.fromUserId !== session.user.id` を検証
- `deactivateDelegationAction`: 委任レコードを取得した上で `delegation.fromUserId !== session.user.id` を検証（委任レコードの取得自体は `organizationId` でスコープ済み）
- `listDelegationsAction`: admin 以外は `d.fromUserId === session.user.id` でフィルタ

### [INFO] 引合ステータス "new" へのリセットに認可ゲートなし（既存課題）

`updateInquiryStatusAction` において `newStatus === "new"` への遷移（declined → new のリセット）にはロールチェックが存在しない。ただし以下の理由からリスクは限定的：

1. この gap は本変更以前から存在する（本変更は `declined` への遷移チェックを新規追加した）
2. `updateInquiryStatus` usecase 内で `canTransition("declined", "new")` のみを許可する FSM 制約がドメイン層で実施されている
3. 設計書の権限マトリクスに "reset to new" の権限定義がなく、意図的に非制限とされている可能性がある

本変更によって導入された新たな gap ではないため、ブロッキング要因とはしない。次の設計レビューで「declined → new のロール要件」を明確化することを推奨する。

---

## Verdict

- **verdict**: approved

全 3 つの不変条件（テナント分離・監査ログの完全性・承認ワークフロー不変条件）が本変更によって破壊されていないことを確認した。委任の所有権制約も正しく実装されている。監査ログは新規許可されたすべての write 操作をカバーしている。
