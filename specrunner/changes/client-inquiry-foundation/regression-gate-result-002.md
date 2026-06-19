# Regression Gate Result — Iteration 2

- **date**: 2026-06-20
- **branch**: feat/client-inquiry-foundation-c3507b49
- **verdict**: approved

## Findings Verification

### [MEDIUM] N+1 クエリ: 顧客ごとに担当者数を個別取得
- **File**: src/app/(dashboard)/clients/page.tsx
- **Status**: fixed
- **Evidence**: `clientRepository.countContactsByClientIds(clients.map((c) => c.id))` を使った単一 GROUP BY クエリで担当者数を一括取得。`clientRepository.ts:155-168` に `countContactsByClientIds` 関数が実装済み。

### [MEDIUM] N+1 クエリ: 引き合い登録フォームで全顧客の担当者を個別取得
- **File**: src/app/(dashboard)/inquiries/new/page.tsx
- **Status**: fixed
- **Evidence**: `clientRepository.findAllContactsByOrganization(organizationId)` で全担当者を1クエリ取得後、クライアント側でグループ化。`clientRepository.ts:174-183` に inner join を使った実装が存在する。

### [LOW] 全組織引き合いを取得後に JS でクライアントフィルタ
- **File**: src/app/(dashboard)/clients/[id]/page.tsx
- **Status**: fixed
- **Evidence**: `inquiryRepository.findByClientId(id, organizationId)` を使用。`inquiryRepository.ts:146-156` に `and(eq(inquiries.clientId, clientId), eq(inquiries.organizationId, organizationId))` で DB 側フィルタが実装済み。

### [LOW] TOCTOU: トランザクション外でステータス読み込み後に converted 遷移
- **File**: src/application/usecases/updateInquiryStatus.ts
- **Status**: fixed
- **Evidence**: `updateInquiryStatus.ts:78-85` で `inquiryRepository.updateStatus` に `inquiry.version` を渡し、`inquiryRepository.ts:132-135` の WHERE 句に `eq(inquiries.version, currentVersion)` が含まれる。バージョン不一致時は null を返し、呼び出し元がエラー応答を返す。

### [MEDIUM] TOCTOU: converted 遷移に楽観ロックがなく concurrent 実行で orphaned approval request が発生しうる
- **File**: src/application/usecases/updateInquiryStatus.ts
- **Status**: fixed
- **Evidence**: `schema.ts:263` に `version: integer("version").notNull().default(1)` が追加済み。`updateStatus` の WHERE 句でバージョン一致チェックを行い、不一致なら更新をスキップして `{ ok: false, reason: "この引き合いは他のユーザーによって更新されました" }` を返す。1引き合い:1承認リクエストの不変条件を保護している。

### [LOW] findContactsByClientId に JSDoc がない（D8 リスク軽減策の未実装）
- **File**: src/infrastructure/repositories/clientRepository.ts
- **Status**: fixed
- **Evidence**: `clientRepository.ts:135-138` に JSDoc が追加済み。「テナント分離の前提: 呼び出し前に findById で clientId が organizationId に属することを確認すること。」と明記されている。

## Summary

全6件の指摘がすべて修正済みであることを確認した。リグレッションなし。
