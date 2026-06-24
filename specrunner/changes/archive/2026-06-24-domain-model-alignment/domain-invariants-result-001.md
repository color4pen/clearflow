# Domain-Invariants Review — domain-model-alignment — iteration 001

- **verdict**: approved
- **iteration**: 001

## Review Scope

テナント分離・監査ログの完全性・承認ワークフローの不変条件・新規ドメイン不変条件（isPrimary 一意性、Meeting の deal_or_inquiry 制約）を対象に検証した。

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | medium | invariant | `src/app/actions/clients.ts`, `src/application/services/clientContactService.ts` | `updateClientContactAction` 内の `validatePrimaryUniqueness` 呼び出しと `clientRepository.updateContact` 呼び出しが同一トランザクション内にない。並行リクエスト（同一 client への isPrimary=true の同時更新）では SELECT/UPDATE の間に別リクエストが割り込み、isPrimary=true が 2 件作成される TOCTOU が理論上成立する。`createClientContact` use case はトランザクション内で正しく保護しているが update 経路は未保護。 | `updateClientContactAction` の validate + updateContact を `db.transaction` ブロックで囲み、`validatePrimaryUniqueness(clientId, contactId, isPrimary, tx)` にトランザクションを渡す。ただし設計書 D5 で明示的に許容された既知制限のため、本イテレーションではスコープ外。DB レベルの部分 UNIQUE INDEX（後述 Finding 2）を追加することで完全に緩和できる。 | no |
| 2 | low | invariant | `src/infrastructure/schema.ts` | `client_contacts` テーブルに `(client_id) WHERE is_primary = true` の部分 UNIQUE INDEX が存在しない。アプリケーション層のみの isPrimary 一意性保証では、(a) Finding 1 の TOCTOU 経路、(b) 直接 SQL 操作、のいずれでも不変条件を破ることができる。受け入れ基準は「アプリケーション層での重複チェック」のみを要求しており仕様上は合格だが、DB レベルの保証がない点は将来のリスクとして残る。 | `CREATE UNIQUE INDEX CONCURRENTLY client_contacts_one_primary_per_client ON client_contacts (client_id) WHERE is_primary = true;` を追加マイグレーションとして計画する（本リクエストのスコープ外）。 | no |
| 3 | low | audit | `src/app/actions/clients.ts` | `updateClientContactAction` が `clientRepository.updateContact` を直接呼び出すため、担当者更新操作の監査ログが記録されない。`createClientContact` / `deleteClientContact` は use case 経由で `client_contact.create` / `client_contact.delete` を記録しているが、更新のみ欠落している。これは use case バイパスという既存問題に起因し、本変更で新たに導入されたものではない。 | `updateClientContactAction` 内で `auditLogRepository.create({ action: "client_contact.update", ... })` を呼び出すか、use case 経由の更新に切り替える。設計書 D5 でバイパス修正は本リクエストのスコープ外とされているため将来対応。 | no |

## Invariant Verification

### テナント分離

| 対象 | 検証方法 | 結果 |
|------|----------|------|
| `inquiryRepository.findById / update / updateStatus / deleteById` | WHERE に `eq(inquiries.organizationId, organizationId)` を確認 | ✅ |
| `inquiryRepository.findByClientId` | `AND eq(inquiries.organizationId, organizationId)` を確認 | ✅ |
| `meetingRepository.findById / update / findAllByDeal / findAllByInquiry` | WHERE に `eq(meetings.organizationId, organizationId)` を確認 | ✅ |
| `createMeeting` — dealId 指定時 | `dealRepository.findById(dealId, organizationId)` で所属検証 | ✅ |
| `createMeeting` — inquiryId 指定時 | `inquiryRepository.findById(inquiryId, organizationId)` で所属検証 | ✅ |
| `validatePrimaryUniqueness` — `findContactsByClientId` が organizationId 未含 | 呼び出し元（createClientContact use case / updateClientContactAction）が `clientRepository.findById(clientId, organizationId)` で事前確認済み。コメントに pre-condition として明記 | ✅（設計上許容） |
| `createMeetingAction` — contactRegistrations の clientId | `createClientContact` use case 内で `findById(clientId, organizationId)` 検証済み | ✅ |

### 監査ログの完全性

| 操作 | 監査ログ | 結果 |
|------|----------|------|
| `createMeeting` | `meeting.create` をトランザクション内で記録 | ✅ |
| `updateMeeting` | `meeting.update` をトランザクション内で記録 | ✅ |
| `createClientContact` | `client_contact.create` をトランザクション内で記録 | ✅ |
| `updateClientContactAction` | 記録なし（既存の use case バイパス問題） | ⚠️ Finding 3 |

### 承認ワークフロー不変条件

本変更は `requests` / `approvalSteps` / `approvalTemplates` テーブルを変更しない。承認ワークフローの状態遷移ロジックに直接影響する変更はない。

`inquirySourceEnum` の pgEnum 化により、承認ポリシー条件評価（例: `source = "agent_service"`）の入力値が DB レベルで 7 値に制約される。従来は text 型のため不正値が入るリスクがあったが、今後は enum 外の値が DB に保存されることはなく、ポリシー条件の評価が確実になる。**これは承認ワークフローの不変条件を強化する変更である。**

### Meeting の deal_or_inquiry 制約

- DB レベルの CHECK 制約 `meetings_deal_or_inquiry_check` が `schema.ts` の `check()` で定義されており、`drizzle-kit generate` が自動生成した。
- マイグレーション SQL (0004_rapid_chat.sql) にて `inquiry_id` カラム追加後に CHECK 制約が付与されていることを確認（行 18→20 の順序）。
- `createMeeting` use case でも `!data.dealId && !data.inquiryId` の場合に early return するアプリケーション層の二重保護が存在する。
- 制約は DB レベルで強制されるため、リポジトリを直接呼び出した場合も不変条件は維持される。

### isPrimary 一意性

- `createClientContact` use case: `db.transaction` 内で `validatePrimaryUniqueness` → `clientRepository.createContact` を直列実行（TOCTOU 対策あり）。
- `updateClientContactAction`: トランザクション外呼び出し（Finding 1 / TOCTOU リスク）。設計書 D5 の既知制限。
- DB レベルの部分 UNIQUE INDEX は存在しない（Finding 2 / 将来リスク）。
- 現時点での実運用リスクは低い（同一顧客の担当者を並行更新するシナリオは稀）。

### マイグレーション実行順序

`drizzle/0004_rapid_chat.sql` を検証した結果:

1. `CREATE TYPE "public"."inquiry_source"` ✅
2. `UPDATE "inquiries" SET "source" = 'other' WHERE "source" NOT IN (...)` — ALTER COLUMN の前 ✅
3. `ALTER TABLE "inquiries" ALTER COLUMN "source" SET DATA TYPE ... USING` ✅
4. `ALTER TABLE "meetings" ALTER COLUMN "deal_id" DROP NOT NULL` ✅
5. `UPDATE "meetings" SET "attendees" = (JSONB 変換)` ✅
6. カラム追加 DDL (description, budget, timeline, inquiry_id) ✅
7. FK 制約追加 ✅
8. CHECK 制約追加 — inquiry_id カラム追加後 ✅

Drizzle はマイグレーション全体をトランザクションで実行するため、部分適用による不整合は発生しない。

## Summary

受け入れ基準はすべて満たされており、新たに導入されたドメイン不変条件（Meeting の deal_or_inquiry 制約、InquirySource の enum 制約）は DB レベルで保証されている。テナント分離は全新規クエリで維持されている。承認ワークフローの不変条件は破壊されておらず、むしろ enum 強制により条件評価の信頼性が向上している。

`updateClientContactAction` の isPrimary TOCTOU（Finding 1）は設計書 D5 で明示的にスコープ外とされた既知制限であり、`needs-fix` を要する新規問題ではない。監査ログ欠落（Finding 3）も既存の use case バイパスに起因する既存問題であり本変更では導入されていない。DB レベルの部分 UNIQUE INDEX 欠如（Finding 2）は将来の改善推奨事項として記録する。

いずれの所見も本イテレーションでの `needs-fix` を要するものではない。
