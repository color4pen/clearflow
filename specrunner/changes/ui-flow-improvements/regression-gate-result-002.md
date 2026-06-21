# Regression Gate Result — Iteration 2

- **change**: ui-flow-improvements
- **iteration**: 2
- **date**: 2026-06-21
- **verdict**: approved

## 検証対象

Findings Ledger の 3 件すべてが修正済みであることを確認した。

---

### Finding 1: [LOW] removeDealContact UC がトランザクション外で監査ログを記録する

- **File**: src/application/usecases/removeDealContact.ts
- **Status**: fixed — regression なし

`removeDealContact` は `db.transaction()` 内で `deleteByDealAndContact` と `auditLogRepository.create` を順次実行しており、削除と監査ログが原子的に処理される。

---

### Finding 2: [MEDIUM] 削除と監査ログが非トランザクション — 監査ログの完全性が保証されない

- **File**: src/application/usecases/removeDealContact.ts:14
- **Status**: fixed — regression なし

Finding 1 と同一の修正で解消。`db.transaction()` ブロック内に両操作が収まっており、削除成功後に監査ログ書き込みが失敗した場合もロールバックが保証される。

---

### Finding 3: [MEDIUM] contactId のテナント帰属を検証していない — クロステナント deal_contacts レコードが作成可能

- **File**: src/application/usecases/addDealContact.ts:9
- **Status**: fixed — regression なし

`dealContactRepository.create` 内で以下の 2 段階のテナント検証が追加された。

1. `deals.organizationId` による dealId 帰属確認
2. `clientContacts → clients.organizationId` JOIN による contactId 帰属確認

いずれかが不一致の場合は例外を投げるため、クロステナントの deal_contacts レコード作成は不可能になった。

---

## 矛盾・新規問題

なし。Finding 1/2 の修正（removeDealContact のトランザクション化）と Finding 3 の修正（contactId テナント検証追加）に相互干渉はない。

## 結論

全 3 件の Finding が正しく修正されており、regression は検出されなかった。
