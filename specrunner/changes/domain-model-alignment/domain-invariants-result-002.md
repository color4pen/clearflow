# Domain Invariants Review — domain-model-alignment — iter 2

- **verdict**: approved
- **iteration**: 002

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| — | — | — | — | 指摘事項なし | — |

## テナント分離 チェック結果

| 観点 | 結果 | 根拠 |
|------|------|------|
| `meetingRepository.findAllByInquiry` のテナント制約 | ✓ | `and(eq(meetings.inquiryId, inquiryId), eq(meetings.organizationId, organizationId))` で organizationId 制約済み |
| `createMeeting` の inquiryId 存在確認 | ✓ | `inquiryRepository.findById(inquiryId, organizationId)` で組織横断アクセスを防止 |
| `createMeeting` の dealId 存在確認 | ✓ | `dealRepository.findById(dealId, organizationId)` で組織横断アクセスを防止 |
| `createClientContact` のテナント検証 | ✓ | `clientRepository.findById(clientId, organizationId)` で clientId が対象テナントに属することを確認 |
| `updateClientContact` のテナント検証 | ✓ | `clientRepository.findById(clientId, organizationId)` で確認後に操作 |
| `deleteClientContact` のテナント検証 | ✓ | `clientRepository.findById(clientId, organizationId)` で確認後に削除 |
| actions での organizationId 取得元 | ✓ | 全 action で `session.user.organizationId` から取得。リクエストボディから受け取っていない |
| `inquiryRepository` の全クエリ | ✓ | 全メソッドが `eq(inquiries.organizationId, organizationId)` を含む |

## 監査ログ完全性 チェック結果

| 操作 | ログ有無 | トランザクション | 結果 |
|------|----------|------------------|------|
| `createInquiry` — budget/timeline 追加 | ✓ `inquiry.create` | ✓ `db.transaction` | OK |
| `updateInquiry` — budget/timeline/source 反映 | ✓ `inquiry.update` | ✓ `db.transaction` | OK |
| `createMeeting` — inquiryId 対応追加 | ✓ `meeting.create` | ✓ `db.transaction` | OK |
| `updateMeeting` — attendees 型変更 | ✓ `meeting.update` | ✓ `db.transaction` | OK |
| `createDeal` — description 追加 | ✓ `deal.create` | ✓ `db.transaction` | OK |
| `updateDeal` — description 追加 | ✓ `deal.update` | ✓ `db.transaction` | OK |
| `createClientContact` — isPrimary 重複チェック追加 | ✓ `client_contact.create` | ✓ `db.transaction` | OK（iter 001 HIGH 修正済み） |
| `updateClientContact` — 新設 usecase | ✓ `client_contact.update` | ✓ `db.transaction` | OK（iter 002 code-review 修正済み） |
| `deleteClientContact` — トランザクション化 | ✓ `client_contact.delete` | ✓ `db.transaction` | OK（iter 001 LOW 修正済み） |

## 承認ワークフロー不変条件 チェック結果

| 不変条件 | 実装 | 結果 |
|----------|------|------|
| Meeting は必ず dealId または inquiryId を持つ（CHECK 制約） | マイグレーション SQL で `ALTER TABLE meetings ADD CONSTRAINT meetings_deal_or_inquiry_check CHECK (deal_id IS NOT NULL OR inquiry_id IS NOT NULL)` 追加。アプリ層 `createMeeting.ts` でも `!data.dealId && !data.inquiryId` でガード | ✓ |
| 同一 clientId 内で isPrimary = true は 1 件以下 | `domain/services/clientContactValidation.ts` に `validateIsPrimaryUniqueness` を実装。`createClientContact` と `updateClientContact` 双方で呼び出し。`updateClientContact` は `excludeContactId` で自身を除外 | ✓ |
| meetings CHECK 制約とマイグレーション順序の安全性 | Step 4 で deal_id の NOT NULL 解除後、Step 5 で CHECK 制約を追加。既存行は全て deal_id が非 null のため制約追加時に違反しない | ✓ |
| inquirySourceEnum の値制約 | pgEnum (`inquiry_source`) を DB レベルで定義（7 値）。アプリ層の zod スキーマも同じ 7 値で統一 | ✓ |
| contracts.amount NOT NULL | `schema.ts` で `integer("amount").notNull()` ✓。マイグレーションで既存 null → 0 変換済み | ✓ |
| contracts.startDate NOT NULL | `schema.ts` で `timestamp("start_date").notNull()` ✓。マイグレーションで既存 null → createdAt 変換済み | ✓ |

## iter 001 指摘の解消確認

| Finding | 重要度 | 解消状況 |
|---------|--------|---------|
| `createClientContact.ts` — `clientRepository.createContact` と `auditLogRepository.create` がトランザクション外 | HIGH | ✓ 解消：`db.transaction` でラップされ、両呼び出しが同一トランザクション内に統合された |
| `deleteClientContact.ts` — `clientRepository.deleteContact` と `auditLogRepository.create` がトランザクション外 | LOW | ✓ 解消：`db.transaction` でラップされ、両呼び出しが同一トランザクション内に統合された |

## Summary

iter 001 で報告した唯一のブロッカー（`createClientContact.ts` 監査ログのトランザクション外記録 — HIGH）は `db.transaction` ラップにより修正済みで確認した。iter 001 の LOW 指摘（`deleteClientContact.ts`）も同様に修正済み。さらに code-review iter 002 で報告された `updateClientContact.ts` のトランザクション欠落（LOW）も現行コードで解消されている。

テナント分離については、本変更で追加された全リポジトリ関数・usecase が `organizationId` で適切に制約されており、違反は確認されない。承認ワークフローの不変条件（Meeting の CHECK 制約、isPrimary 一意性、contracts の NOT NULL 制約）も正しく実装されている。監査ログの完全性について、新規追加・修正された全ての状態変更操作が `db.transaction` 内で監査ログを記録しており、プロジェクト全体の規律と一致している。

ブロッカーとなる指摘事項はなく、本変更をドメイン不変条件の観点から承認する。
