# Domain Invariants Review — domain-model-alignment — iter 1

- **verdict**: needs-fix
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | high | audit-log atomicity | `src/application/usecases/createClientContact.ts` | `clientRepository.createContact` と `auditLogRepository.create` が同一トランザクション外で呼ばれている。`createContact` 成功後に `auditLogRepository.create` が失敗した場合、担当者レコードは残るが監査ログが欠落する。本ファイルは本変更で +12 行修正されており、`updateClientContact.ts`（本変更で新設）が `db.transaction` を正しく使用しているのと一貫性を欠く。プロジェクト全体で `createClient`, `createMeeting`, `createDeal` など他の全 usecase がトランザクションを用いている中、本ファイルのみが例外となっている。 | `db.transaction(async (tx) => { ... })` で `clientRepository.createContact` と `auditLogRepository.create` の両呼び出しを囲む。`clientRepository.createContact` が `tx` を受け取れるようシグネチャを確認する（他の repository 関数と同様に `tx?: Transaction` 引数を追加する）。 |
| 2 | low | audit-log atomicity | `src/application/usecases/deleteClientContact.ts` | `clientRepository.deleteContact` と `auditLogRepository.create` が同一トランザクション外で呼ばれている（本変更の対象外 — diff に含まれない）。Finding 1 の修正時に合わせて対応することを推奨する。 | Finding 1 と同様に `db.transaction` で囲む。 |

## テナント分離 チェック結果

| 観点 | 結果 | 根拠 |
|------|------|------|
| 新規 `meetingRepository.findAllByInquiry` のテナント制約 | ✓ | `and(eq(meetings.inquiryId, inquiryId), eq(meetings.organizationId, organizationId))` で正しく organizationId 制約 |
| `createMeeting` の inquiryId 存在確認 | ✓ | `inquiryRepository.findById(inquiryId, organizationId)` で組織横断アクセスを防止 |
| `createMeeting` の dealId 存在確認 | ✓ | `dealRepository.findById(dealId, organizationId)` で組織横断アクセスを防止 |
| `createClientContact` のテナント検証 | ✓ | `clientRepository.findById(clientId, organizationId)` で clientId が対象テナントに属することを確認 |
| `updateClientContact` のテナント検証 | ✓ | `clientRepository.findById(clientId, organizationId)` で確認後に操作 |
| actions での organizationId 取得元 | ✓ | 全 action で `session.user.organizationId` から取得。リクエストボディから受け取っていない |
| `inquiryRepository` の全クエリ | ✓ | 全メソッドが `eq(inquiries.organizationId, organizationId)` を含む |

## 監査ログ完全性 チェック結果

| 操作 | ログ有無 | トランザクション | 結果 |
|------|----------|------------------|------|
| `createInquiry` — 新フィールド (budget/timeline) 追加 | ✓ `inquiry.create` | ✓ `db.transaction` | OK |
| `updateInquiry` — 新フィールド反映 | ✓ `inquiry.update` | ✓ `db.transaction` | OK |
| `createMeeting` — inquiryId 対応追加 | ✓ `meeting.create` | ✓ `db.transaction` | OK |
| `updateMeeting` — attendees 型変更 | ✓ `meeting.update` | ✓ `db.transaction` | OK |
| `createDeal` — description 追加 | ✓ `deal.create` | ✓ `db.transaction` | OK |
| `updateDeal` — description 追加 | ✓ `deal.update` | ✓ `db.transaction` | OK |
| `createClientContact` — isPrimary 重複チェック追加 | ✓ `client_contact.create` | **✗ トランザクションなし** | **NG** |
| `updateClientContact` — 新設 usecase | ✓ `client_contact.update` | ✓ `db.transaction` | OK |

## 承認ワークフロー不変条件 チェック結果

| 不変条件 | 実装 | 結果 |
|----------|------|------|
| Meeting は必ず dealId または inquiryId を持つ（CHECK 制約） | migration SQL で `ALTER TABLE meetings ADD CONSTRAINT meetings_deal_or_inquiry_check CHECK (deal_id IS NOT NULL OR inquiry_id IS NOT NULL)` を追加。アプリ層でも `!data.dealId && !data.inquiryId` でガード | ✓ |
| 同一 clientId 内で isPrimary = true は 1 件以下 | `domain/services/clientContactValidation.ts` に `validateIsPrimaryUniqueness` を実装。`createClientContact` と `updateClientContact` 双方で呼び出し。`updateClientContact` は `excludeContactId` で自身を除外 | ✓ |
| meetings CHECK 制約とマイグレーション順序の安全性 | Step 4 で deal_id の NOT NULL 解除後、Step 5 で CHECK 制約を追加。既存行は全て deal_id が非 null であるため、制約追加時に既存データは違反しない | ✓ |
| inquirySourceEnum の値制約 | pgEnum (`inquiry_source`) を DB レベルで定義。アプリ層の zod スキーマも同じ 7 値で統一 | ✓ |

## Summary

テナント分離については、本変更で追加されたすべての新規リポジトリ関数・usecase が `organizationId` で適切に制約されており、違反は確認されない。承認ワークフローの不変条件（Meeting の CHECK 制約、isPrimary 一意性）も正しく実装されている。

唯一のブロッカーは `createClientContact.ts` における監査ログのトランザクション外記録（Finding 1）。本ファイルは本変更で修正されており（isPrimary 重複チェックの追加）、同じ変更で新設された `updateClientContact.ts` が `db.transaction` を正しく使用しているのと一貫性を欠く。プロジェクト全体の規律として「状態変更と監査ログは同一トランザクション内」が確立されている中、本ファイルのみが例外となっている。修正は機械的であり、`db.transaction` でラップするだけでよい。
