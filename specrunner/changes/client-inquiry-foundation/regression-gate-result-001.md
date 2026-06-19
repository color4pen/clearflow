# Regression Gate Result — Iteration 1

- **change**: client-inquiry-foundation
- **iteration**: 1
- **verdict**: needs-fix

## Summary

6件の修正対象のうち、2件は正しく修正済み。4件は修正が反映されておらず、リグレッション扱い。

---

## 検証結果

### Finding 1 — [MEDIUM] N+1 クエリ: 顧客ごとに担当者数を個別取得
- **File**: src/app/(dashboard)/clients/page.tsx
- **Status**: fixed
- **Detail**: `clientRepository.countContactsByClientIds(clients.map((c) => c.id))` による GROUP BY 単一クエリに置き換え済み（line 14）。`countContactsByClientIds` は clientRepository.ts:151 に実装され、`inArray` + `groupBy` で1クエリに集約している。

### Finding 2 — [MEDIUM] N+1 クエリ: 引き合い登録フォームで全顧客の担当者を個別取得
- **File**: src/app/(dashboard)/inquiries/new/page.tsx
- **Status**: fixed
- **Detail**: `clientRepository.findAllContactsByOrganization(organizationId)` による1クエリ取得に置き換え済み（line 14）。clients テーブルとの INNER JOIN で organizationId 絞り込みを行い、クライアント側で `Map` によるグループ化を実施。

### Finding 3 — [LOW] 全組織引き合いを取得後に JS でクライアントフィルタ
- **File**: src/app/(dashboard)/clients/[id]/page.tsx
- **Status**: regression
- **Severity**: high
- **Resolution**: fixable
- **Detail**: `inquiryRepository.findAllByOrganization(organizationId)` で全件取得後に `.filter((inq) => inq.clientId === client.id)` でメモリフィルタしている実装が残存（lines 34, 42）。`inquiryRepository` に `findByClientId(clientId, organizationId)` は追加されていない。元の問題が解消されていない。

### Finding 4 — [LOW] TOCTOU: トランザクション外でステータス読み込み後に converted 遷移
- **File**: src/application/usecases/updateInquiryStatus.ts
- **Status**: regression
- **Severity**: high
- **Resolution**: fixable
- **Detail**: `inquiryRepository.findById` によるステータス取得（line 23）がトランザクション開始（line 50）の外にある。トランザクション内での再取得・再検証も、楽観ロック条件追加も実装されていない。`converted` 遷移パス・その他遷移パス両方に未修正。

### Finding 5 — [MEDIUM] TOCTOU: converted 遷移に楽観ロックがなく concurrent 実行で orphaned approval request が発生しうる
- **File**: src/application/usecases/updateInquiryStatus.ts
- **Status**: regression
- **Severity**: high
- **Resolution**: fixable
- **Detail**: `inquiries` テーブルに `version` カラムが存在しない（schema.ts:245-262）。`requests` / `approvalSteps` テーブルは version による楽観ロックを実装しているが、`inquiries` は未実装。`updateStatus` に楽観ロック条件も SELECT FOR UPDATE による悲観ロックも追加されていないため、並行リクエストで承認リクエストが2件作成される恐れがある。

### Finding 6 — [LOW] findContactsByClientId に JSDoc がない
- **File**: src/infrastructure/repositories/clientRepository.ts
- **Status**: regression
- **Severity**: high
- **Resolution**: fixable
- **Detail**: `findContactsByClientId`（line 135）に JSDoc が実装されていない。同ファイルで新規追加された `countContactsByClientIds`（line 147）と `findAllContactsByOrganization`（line 166）には JSDoc が付与されているが、`findContactsByClientId` は素の export のままであり、テナント分離の前提（呼び出し前に `findById` で組織帰属確認が必要）が文書化されていない。

---

## 要対応事項

| # | File | 対応内容 |
|---|------|---------|
| 3 | src/infrastructure/repositories/inquiryRepository.ts | `findByClientId(clientId, organizationId)` を追加し DB 側で絞り込む |
| 3 | src/app/(dashboard)/clients/[id]/page.tsx | `findAllByOrganization` + JS フィルタを `findByClientId` 呼び出しに置き換え |
| 4 | src/application/usecases/updateInquiryStatus.ts | トランザクション内で inquiry を再取得し canTransition を再検証する、または楽観ロック条件を追加 |
| 5 | src/infrastructure/schema.ts | `inquiries` テーブルに `version` カラムを追加 |
| 5 | src/infrastructure/repositories/inquiryRepository.ts | `updateStatus` に version 一致チェックを追加（または converted パスを SELECT FOR UPDATE で保護） |
| 6 | src/infrastructure/repositories/clientRepository.ts | `findContactsByClientId` に JSDoc（テナント帰属確認の前提）を追加 |
