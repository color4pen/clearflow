# Domain Invariants Review Result — contract-invoice-strengthen — iter 001

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:    invariants are upheld; change is safe to proceed
  - needs-fix:   one or more invariants are violated or at risk; must be resolved
  - escalation:  unresolvable conflicts or ambiguity requiring human judgment
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | File | Description | How to Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
  - CRITICAL: data corruption, tenant cross-contamination, audit log suppression
  - HIGH:     domain invariant violated or functional regression with no workaround
  - MEDIUM:   narrow race condition or edge-case invariant breach; workaround exists
  - LOW:      informational; consistent with existing patterns; non-blocking
-->

- **verdict**: needs-fix

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | HIGH | Contract Amount Invariant | `src/application/usecases/createInvoice.ts`, `src/application/usecases/updateInvoice.ts` | `contract.amount > 0` ガードがなく、マイグレーションで `amount = null → 0` になった one_time 契約に対して請求の作成・更新が完全にブロックされる。`createInvoice` の合計チェック条件は `if (contract.renewalType === "one_time")` だけで `contract.amount > 0` がないため、`existingTotal + data.amount > 0` が任意の正値 amount で常に true になりエラーとなる。`updateInvoice` も同様（`newTotal > 0` が常に true）。移行前は `contract.amount !== null` 条件でこのケースはスキップされていたが、NOT NULL 化によりスキップが消滅した。spec-review Finding #2 で `contract.amount > 0` への変更を明示推奨したが未実装。 | `createInvoice.ts` の条件を `if (contract.renewalType === "one_time" && contract.amount > 0)` に変更する。`updateInvoice.ts` も同様に `if (contract && contract.renewalType === "one_time" && contract.amount > 0)` に変更する。 |
| 2 | MEDIUM | Financial Invariant Race Condition | `src/application/usecases/updateInvoice.ts` L22, L48 | `invoice` をトランザクション外でフェッチ（L22）し、その `invoice.amount`（古い値）をトランザクション内の合計計算（L48: `existingTotal - invoice.amount + data.amount`）に使用している。並行する別セッションが同一 invoice の amount をトランザクション開始前に減額してコミットした場合、`existingTotal`（SERIALIZABLE スナップショット、最新）と `invoice.amount`（スナップショット外、古い値）が乖離し、`existingTotal - stale_amount` が「他請求の合計」として過大評価される。最悪ケース: 別 tx が invoice A を大きく減額後に本 tx が invoice A を大幅増額する際、実際の新合計が契約金額を超えても本チェックをパスする可能性がある。 | `invoiceRepository.findById` の呼び出しをトランザクション内（`db.transaction` コールバック冒頭）に移動し、`invoice` と `existingTotal` を同一 SERIALIZABLE スナップショット内で取得する。 |
| 3 | LOW | Audit Log Completeness | `src/application/usecases/updateInvoice.ts` L57–79 | `invoiceRepository.update` が null を返した場合（invoice が並行削除された稀なケース）でも、監査ログがトランザクション内で書き込まれてから外側の `if (!updated)` チェックに進む。更新が空振りした操作の `invoice.update` 監査ログが残る。影響範囲は極めて稀だが、監査ログの正確性に関わる。 | `invoiceRepository.update` の結果を先に検証し、null の場合はトランザクションを `throw` で abort してから `{ ok: false }` を返す（audit log はロールバックされる）。あるいは update 後の null チェックを `throw` に変更して tx を abort させる。 |

## テナント分離の検証

以下の観点でコード全体を確認した。

| 観点 | 評価 | 根拠 |
|------|------|------|
| contractRepository — 全 CRUD 操作 | ✅ 問題なし | `findById`, `findAllByDealId`, `findAllByClientId`, `findAllByOrganization`, `deleteById`, `update` の全クエリに `eq(contracts.organizationId, organizationId)` が付加されている |
| invoiceRepository — 全 CRUD 操作 | ✅ 問題なし | `findById`, `findAllByContract`, `update`, `updateStatus`, `sumAmountByContract` の全クエリに `eq(invoices.organizationId, organizationId)` が付加されている |
| updateInvoice usecase | ✅ 問題なし | `findById`・`contractRepository.findById`・`sumAmountByContract`・`update`・`auditLogRepository.create` の全呼び出しに `organizationId` が渡されている |
| createContract / updateContract usecase | ✅ 問題なし | Deal 取得・Contract 作成・更新・監査ログのすべてで `organizationId` スコープが維持されている |
| createInvoice usecase | ✅ 問題なし | Contract 取得・`sumAmountByContract`・Invoice 作成・監査ログに `organizationId` が付加されている |
| 新規 Server Action（updateInvoiceAction） | ✅ 問題なし | `session.user.organizationId` を usecase に渡している。認証・認可（admin\|manager ロール）・レート制限チェックが実装されている |

クロステナントアクセスを許容するコードパスは発見されなかった。

## 監査ログの完全性の検証

| 操作 | アクション名 | トランザクション内 | 評価 |
|------|------------|-----------------|------|
| createContract | `contract.create` | ✅ はい | 問題なし |
| updateContract | `contract.update` | ✅ はい | 問題なし |
| createInvoice | `invoice.create` | ✅ はい（SERIALIZABLE） | 問題なし |
| updateInvoice（新規） | `invoice.update` | ✅ はい（SERIALIZABLE） | Finding #3 参照（稀な空振りのリスク） |

監査ログはすべてトランザクション内で書かれており、DB 操作失敗時のファントムログはない（Finding #3 の稀なケースを除く）。変更フィールドのメタデータ（before/after 値）は記録されていないが、これは既存パターンと一致しており今回の変更スコープ外である。

## 承認ワークフロー不変条件の検証

今回の変更はコントラクト・インボイスのスキーマとバリデーションに限定されており、`requests`・`approval_steps`・`approval_templates` テーブルおよびそれらの state machine（requestTransition, approvalStepService など）には一切触れていない。マイグレーション SQL（`0002_early_nicolaos.sql`）も `contracts` と `invoices` テーブルのみを変更しており、承認ワークフロー不変条件は破壊されていない。

## 総評

テナント分離と承認ワークフロー不変条件は保たれている。発見された主要問題は契約金額不変条件に関するもの:

- Finding #1（HIGH）は機能的後退であり、マイグレーションで amount = 0 になった one_time 契約に対して請求操作が不可能になる。spec-review で明示推奨された `contract.amount > 0` ガードが未実装であり、修正が必要。
- Finding #2（MEDIUM）は SERIALIZABLE 分離レベルの恩恵を部分的に損なう設計であり、`invoice` フェッチをトランザクション内に移すことで解消できる。
- Finding #3（LOW）は監査ログの正確性に関する稀なエッジケースであり、緊急性は低い。
