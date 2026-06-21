# Domain Invariants Review — ui-flow-improvements

- **reviewer**: domain-invariants
- **iteration**: 1
- **date**: 2026-06-21
- **verdict**: needs-fix

## 観点

テナント分離の堅牢性、監査ログの原子性、承認ワークフロー不変条件への影響を確認する。

---

## 全体評価

承認ワークフロー（approve/reject/submit/resubmit）は本変更の影響を受けていない。`updateInquiryStatusAction` の `converted` ロールガードも維持されている。テナント分離の主要パスは概ね堅牢だが、2 件の不備が判明した。

---

## 所見

### F-01: `removeDealContact` — 削除と監査ログが非トランザクション [severity: medium]

**ファイル**: `src/application/usecases/removeDealContact.ts`

```typescript
// 現状: 2ステップが個別 await — 原子性なし
await dealContactRepository.deleteByDealAndContact(dealId, contactId, organizationId);
await auditLogRepository.create({ action: "deal_contact.delete", ... });
```

削除が成功した後に `auditLogRepository.create` が失敗すると、担当者は削除済みだが監査ログが残らない。データ変更の事後追跡が不可能になる。

`addDealContact` は `db.transaction` で両操作を包んでいる（正しい実装）。`deleteByDealAndContact` はすでに `tx?: Transaction` を受け付けるため、同様の修正が容易にできる。

**修正方針**: `db` を import し、`db.transaction` 内で `deleteByDealAndContact(dealId, contactId, organizationId, tx)` と `auditLogRepository.create({...}, tx)` を呼ぶ。

---

### F-02: `addDealContact` — `contactId` のテナント帰属を検証していない [severity: medium]

**ファイル**: `src/infrastructure/repositories/dealContactRepository.ts` → `create`  
**参照**: `src/application/usecases/addDealContact.ts`

`dealContactRepository.create` は `deals.organizationId` を JOIN して `dealId` のテナント帰属を検証しているが、`contactId`（`clientContacts.id`）が同一組織の顧客担当者であることは検証していない。

```typescript
// 現状: dealId のみ検証
const owningDeal = await queryRunner
  .select({ id: deals.id })
  .from(deals)
  .where(and(eq(deals.id, data.dealId), eq(deals.organizationId, data.organizationId)))
  .limit(1);
// contactId が organizationId に属するかは未検証
```

FormData の `contactId` は HTTP リクエストで偽装可能なため、別テナントの `clientContact.id` を UUID として送り込めば、クロステナントの `deal_contacts` レコードが作成される。

`findByDeal` は `clients.organizationId` JOIN でフィルタするため表示上は漏れないが、DB 上の参照整合性が壊れ、削除パスでの副作用が予測しにくい。

**修正方針**: `addDealContact` UC 内（repository 呼び出し前）で `clientRepository.findById(contactId の clientId, organizationId)` または `clientContacts → clients.organizationId` を検証する。または `dealContactRepository.create` の INSERT 前に `clientContacts INNER JOIN clients WHERE clients.organizationId = data.organizationId AND clientContacts.id = data.contactId` で存在確認を行う。

---

### F-03: `createClientContact` — 担当者作成と監査ログが非トランザクション [severity: low]

**ファイル**: `src/application/usecases/createClientContact.ts`

```typescript
const contact = await clientRepository.createContact({...});
await auditLogRepository.create({...}); // 失敗しても createContact は rollback されない
```

商談フォームからの呼び出しは best-effort（design.md に明記）であり、部分失敗は許容されている。ただし、`createClientContact` が将来 best-effort 以外の文脈で使われた場合に監査ギャップが生じる。

**修正方針**: 現フェーズでは許容範囲だが、将来の非 best-effort 呼び出しに備えて `db.transaction` でラップすることを推奨する。

---

### F-04: `createClient` + `createInquiry` — 別トランザクション [severity: info]

**ファイル**: `src/app/actions/inquiries.ts`

`createClient` 成功後に `createInquiry` が失敗すると顧客だけが作成されて孤立する。design.md に既定リスクとして記録され、「後から別の引き合いに紐づけ可能」というミティゲーションが明示されている。承認ワークフロー不変条件への影響はない。情報として記録する（ブロック不要）。

---

## 承認ワークフロー不変条件

変更はUI動線とデータ追加のみ。以下を確認した。

- `approveRequest` / `rejectRequest` / `submitRequest` / `resubmitRequest` — 未変更
- `requestTransition` / `approvalStepService` — 未変更
- `updateInquiryStatusAction` の `converted` ロールガード（admin/manager のみ）— 維持
- 新規 Action（`addDealContactAction`, `removeDealContactAction`）は承認フローと独立

**承認ワークフロー不変条件の破壊: なし**

---

## 修正が必要な項目

| ID | severity | ファイル | 内容 |
|----|----------|---------|------|
| F-01 | medium | `usecases/removeDealContact.ts` | 削除+監査ログを `db.transaction` で包む |
| F-02 | medium | `usecases/addDealContact.ts` または `repositories/dealContactRepository.ts` | `contactId` のテナント帰属検証を追加する |

F-03 は推奨修正（ブロッカーではない）。F-04 は既知リスクで対応不要。

- **verdict**: needs-fix
