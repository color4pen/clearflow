# Domain Invariants Review — domain-model-alignment — iteration 001

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
-->

- **verdict**: approved
- **iteration**: 001

## レビュー観点

テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。

---

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | MEDIUM | race-condition | `src/application/usecases/createClientContact.ts`, `src/app/actions/clients.ts` | `isPrimary` 一意性チェックと DB 書き込みが同一トランザクション内に収まっていない。`createClientContact` と `updateClientContactAction` は「既存の isPrimary=true 件数を読む → バリデーション → INSERT/UPDATE」の順で処理するが、この Read-Check-Write が非アトミック。同一 clientId に対して並行リクエストが来た場合、両者が `existingPrimaryCount=0` を読み込んで検証を通過し、isPrimary=true の担当者が 2 名生成される可能性がある。なお、変更前は isPrimary チェック自体が存在しなかったため、本変更は退行ではなく改善である。 | `clientContacts` テーブルに部分インデックス `UNIQUE WHERE is_primary = true` を追加し DB レベルで一意性を強制するか、`createClientContact` 内の読み取り〜書き込みをトランザクション内でロック（`SELECT ... FOR UPDATE`）して保護する。 | no |
| 2 | LOW | audit-log-gap | `src/app/actions/clients.ts` | `updateClientContactAction` は `clientRepository.updateContact()` を直接呼ぶ（usecase バイパス）ため、isPrimary 変更を含む担当者更新に対して `audit_logs` エントリが生成されない。主担当者の変更は承認ポリシーの評価基点となりうるため、監査証跡の欠如は将来的なコンプライアンスリスクとなる。本リクエストでは意図的にスコープ外とされており退行ではない。 | `updateClientContactAction` 内で `auditLogRepository.create({ action: "client_contact.update", ... })` を追加するか、usecase 経由に切り替える。 | no |
| 3 | LOW | tenant-isolation-pattern | `src/infrastructure/repositories/clientRepository.ts` | `findContactsByClientId` は `organizationId` を引数に取らず、WHERE 条件に `organizationId` を付与しない。テナント分離はリポジトリが直接保証せず、呼び出し元が事前に `findById(clientId, organizationId)` で所有権を確認することを前提とする。パターンはコメントで明文化されており (`テナント分離の前提: 呼び出し前に findById で clientId が organizationId に属することを確認すること`)、本変更で導入された設計ではなく既存パターンを引き継いだものである。 | 将来 `findContactsByClientId` に `organizationId` パラメータを追加し、JOIN で `clients.organization_id` を条件に加えることでリポジトリ層が単独でテナント境界を保証できるようにする。 | no |

---

## テナント分離の検証

### 新規・変更された repository メソッド

| メソッド | organizationId 条件 | 状態 |
|--------|-------------------|------|
| `meetingRepository.findAllByInquiry` (新規) | `and(eq(meetings.inquiryId, inquiryId), eq(meetings.organizationId, organizationId))` | ✅ |
| `meetingRepository.findById` | `and(eq(meetings.id, id), eq(meetings.organizationId, organizationId))` | ✅ |
| `meetingRepository.findAllByDeal` | `and(eq(meetings.dealId, dealId), eq(meetings.organizationId, organizationId))` | ✅ |
| `meetingRepository.update` | `and(eq(meetings.id, id), eq(meetings.organizationId, organizationId))` | ✅ |
| `inquiryRepository.findById` | `and(eq(inquiries.id, id), eq(inquiries.organizationId, organizationId))` | ✅ |
| `contractRepository.create` | `organizationId: data.organizationId` で INSERT | ✅ |
| `invoiceRepository.create` | `organizationId: data.organizationId` で INSERT | ✅ |
| `invoiceRepository.update` | `and(eq(invoices.id, id), eq(invoices.organizationId, organizationId))` | ✅ |

### createMeeting usecase — 外部エンティティ検証

```ts
// dealId 指定時: 組織スコープで case 確認
const deal = await dealRepository.findById(data.dealId, data.organizationId);  // ✅

// inquiryId 指定時: 組織スコープで引き合い確認
const inquiry = await inquiryRepository.findById(data.inquiryId, data.organizationId);  // ✅
```

inquiryId が他テナントの引き合いを指しても `findById` が null を返しエラーになる。テナント越えの紐付けは不可能。

---

## 監査ログ完全性の検証

| 操作 | 監査ログ | 対象 action / usecase | 状態 |
|-----|---------|----------------------|------|
| 商談作成（deal）| `meeting.create` | `createMeeting` usecase 内 `auditLogRepository.create` | ✅ |
| 商談作成（inquiry only）| `meeting.create` | 同上（inquiryId パスでも同一 audit 処理を通る）| ✅ |
| 担当者作成（isPrimary 含む）| `client_contact.create` | `createClientContact` usecase 内 `auditLogRepository.create` | ✅ |
| 担当者更新（isPrimary 変更）| なし | `updateClientContactAction` が usecase をバイパス | ⚠️ 既存問題・スコープ外 |
| 契約作成 | `contract.create` | `createContract` usecase 内 `auditLogRepository.create` | ✅ |

---

## 承認ワークフロー不変条件の検証

### スキーマ不変条件

| テーブル / Enum | 変更有無 | 検証結果 |
|---------------|---------|---------|
| `requests` テーブル | 変更なし | ✅ |
| `approval_steps` テーブル | 変更なし | ✅ |
| `approval_templates` テーブル | 変更なし | ✅ |
| `requestStatusEnum` | 変更なし | ✅ |
| `approvalStepStatusEnum` | 変更なし | ✅ |
| `deals.estimateRequestId` (requests への FK) | 変更なし（スコープ外として明示）| ✅ |

### ビジネスルール不変条件

| ルール | 実装確認 | 状態 |
|-------|---------|------|
| 契約作成は `phase = "won"` の Deal のみ許可 | `createContract` usecase: `if (deal.phase !== "won")` チェックを維持 | ✅ |
| 契約 amount が 0 以下の場合はエラー（新規作成時） | `createContract`: `if (amount <= 0)` チェック追加 | ✅ |
| 契約 startDate 必須（新規作成時） | `createContract`: `if (!startDate)` チェック追加 | ✅ |
| Inquiry の `converted` 遷移は admin/manager のみ | `updateInquiryStatusAction` のロールチェックを維持 | ✅ |
| 楽観ロック（`inquiries.version`、`deals.version`）| スキーマ・リポジトリとも変更なし | ✅ |

### DB 制約による不変条件強化

| 制約 | SQL | 検証結果 |
|-----|-----|---------|
| meetings: dealId または inquiryId の一方は必須 | `CHECK (deal_id IS NOT NULL OR inquiry_id IS NOT NULL)` | ✅ migration 末尾で正しく追加 |
| inquiries.source: 列挙値のみ許可 | `pgEnum("inquiry_source", [...7値...])` | ✅ |
| contracts.amount: NOT NULL | `ALTER COLUMN "amount" SET NOT NULL` (UPDATE で 0 補完後) | ✅ |
| contracts.start_date: NOT NULL | `ALTER COLUMN "start_date" SET NOT NULL` (UPDATE で createdAt 補完後) | ✅ |

---

## マイグレーション安全性の確認

| チェック項目 | 結果 |
|------------|------|
| attendees 変換 UPDATE → deal_id nullable 変更の順序 | ✅ 変換は独立して先行実行、CHECK 制約は inquiry_id 追加後に追加 |
| CHECK 制約追加時、既存行は全て deal_id NOT NULL → 制約充足 | ✅ |
| source 正規化 UPDATE → `CREATE TYPE inquiry_source` → `ALTER COLUMN ... SET DATA TYPE` の順序 | ✅ |
| contracts.amount NULL 補完 UPDATE → `SET NOT NULL` の順序 | ✅ |
| contracts.start_date NULL 補完 UPDATE → `SET NOT NULL` の順序 | ✅ |
| `WHERE attendees ? 'internal'` による旧形式のみ対象変換 | ✅ 既存の空配列 `[]` は対象外で安全 |

---

## 総合評価

**テナント分離**: 新規追加・変更されたすべての repository メソッドで `organizationId` が WHERE 条件に含まれている。新フロー（inquiry-only meeting）でも usecase が参照先エンティティをテナントスコープ内で確認してから meeting を作成する設計となっており、クロステナント参照は不可能。

**監査ログ完全性**: 新フロー（inquiry-only meeting 作成）を含む全 write 操作で audit_logs エントリが生成される。`updateClientContactAction` の audit log 欠如は本変更で導入された退行ではなく、設計で明示的にスコープ外とされた既存課題。

**承認ワークフロー不変条件**: 承認関連テーブル・enum は一切変更されていない。`deal.phase = "won"` チェック、楽観ロック、admin/manager ロールゲートはすべて維持されている。

**主な非阻害リスク**: isPrimary の非アトミックな Read-Check-Write（Finding #1 MEDIUM）は変更前に比べ改善されているが、完全な一意性保証は DB 制約なしでは成立しない。isPrimary の一意性が承認ポリシーの評価基点となる将来ユースケースが追加される前に対処することを推奨する。
