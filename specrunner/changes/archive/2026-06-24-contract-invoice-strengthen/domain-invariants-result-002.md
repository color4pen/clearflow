# Domain Invariants Review Result — contract-invoice-strengthen — iter 002

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

- **verdict**: approved

## iter 001 Findings — 解消状況

| # | Severity | 解消状況 | 確認箇所 |
|---|----------|----------|---------|
| 1 | HIGH | ✅ FIXED | `createInvoice.ts:40` — `contract.renewalType === "one_time" && contract.amount > 0` に変更済み。`updateInvoice.ts:47` も同様に `contract.amount > 0` ガードが追加済み |
| 2 | MEDIUM | ✅ FIXED | `updateInvoice.ts:41–44` — `freshInvoice` を SERIALIZABLE トランザクション内で取得し、`freshInvoice.amount` を合計計算に使用している（L54）。stale amount の混入リスクが解消された |
| 3 | LOW | ⚠️ REMAINS | `updateInvoice.ts:63–87` — 非 amount 更新パスで `invoiceRepository.update` が null を返した場合（並行削除）でも監査ログがコミットされる。詳細は下記 Findings #1 参照 |

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | LOW | Audit Log Phantom Write | `src/application/usecases/updateInvoice.ts` L63–90 | `data.amount` が未指定（非 amount 更新）の場合、tx 内で `invoiceRepository.update`（L63）が null を返しても `auditLogRepository.create`（L76–85）が同一 tx でコミットされる。tx 外の `if (!updated)`（L90）チェックでは既に commit 済みのため、実際には更新が空振りした `invoice.update` 監査ログが永続化される。SERIALIZABLE 分離レベルは内側の `findById` なしでは存在確認の serialization conflict を検出できないため、この経路では保護されない。発生条件: 請求が L22 の outer fetch 後かつ tx 開始前に並行削除された稀なケースに限定される。 | `invoiceRepository.update` の結果を先に検証し、null の場合は `throw new Error(...)` でトランザクションを abort させてから `{ ok: false }` を返す。これにより監査ログは tx ロールバックで取り消される。または、すべての更新パスで tx 冒頭に `findById`（with tx）を追加して存在を再確認する。 |
| 2 | LOW | Date Validation Staleness | `src/application/usecases/updateInvoice.ts` L22–33 | `effectiveIssueDate`/`effectiveDueDate`（L28–29）を tx 外でフェッチした stale `invoice` から算出している。`issueDate` のみを更新する際に別セッションが `dueDate` を並行して新しい `issueDate` より前の日付に変更・コミットした場合、本セッションの事前バリデーションはパスするが、DB 上は `issueDate > dueDate` が成立しうる。`updateContract.ts` の `effectiveStartDate/EndDate`（L37–38）と同一のプレ tx パターンであり、既存コードの踏襲。財務不変条件（Finding #2 MEDIUM, iter 001）は SERIALIZABLE + freshInvoice で保護済みだが日付整合性は未保護。 | 高優先度は不要（既存 `updateContract.ts` と同パターン）。将来的な改善として、`dueDate`/`issueDate` を更新するパスでも tx 内で最新 invoice を再フェッチし、`effectiveDueDate = tx 内取得値` を用いてバリデーションを再実行する。 |

## テナント分離の検証

iter 001 から変更なし。追加の確認事項:

| 観点 | 評価 | 確認箇所 |
|------|------|---------|
| updateInvoice usecase — 全 DB 操作 | ✅ 問題なし | L22 `findById(invoiceId, organizationId)`、L41 `findById(invoiceId, organizationId, tx)`、L45 `contractRepository.findById(contractId, organizationId, tx)`、L49 `sumAmountByContract(contractId, organizationId, tx)`、L63 `update(invoiceId, organizationId, ..., tx)`、L76 `auditLogRepository.create({organizationId}, tx)` — 全操作に `organizationId` スコープ付与済み |
| updateInvoiceAction — organizationId 取得元 | ✅ 問題なし | `session.user.organizationId` から取得（L77）。リクエストボディからの受け取りなし |
| invoiceRepository.findById の tx 引数対応 | ✅ 問題なし | 第3引数で `tx?: Transaction` を受け取り、`queryRunner = tx ?? db` で tx スコープ内クエリが正しく動作する（L55–65） |

クロステナントアクセスを許容するコードパスは発見されなかった。

## 監査ログの完全性の検証

| 操作 | アクション名 | トランザクション内 | 評価 |
|------|------------|-----------------|------|
| createContract | `contract.create` | ✅ はい | 問題なし |
| updateContract | `contract.update` | ✅ はい | 同 LOW パターン（pre-existing）。今回変更スコープで新たな劣化なし |
| createInvoice | `invoice.create` | ✅ はい（SERIALIZABLE） | 問題なし |
| updateInvoice（新規） | `invoice.update` | ✅ はい（SERIALIZABLE） | Finding #1 参照（非 amount 更新の稀なケース） |

監査ログの記録漏れ（書くべきログが書かれない）は存在しない。Finding #1 は逆方向（書くべきでないログが書かれる稀なケース）であり、深刻度は LOW。

## 承認ワークフロー不変条件の検証

iter 001 から変更なし。今回の変更（`updateInvoice.ts` のコードフィクサー修正）は contracts / invoices のバリデーション・合計チェックに限定されており、`requests`・`approval_steps`・`approval_templates` テーブルおよびそれらの state machine には一切触れていない。承認ワークフロー不変条件は破壊されていない。

## 総評

iter 001 で指摘した HIGH（Finding #1）と MEDIUM（Finding #2）の両問題が正確に修正されている:

- `createInvoice.ts` と `updateInvoice.ts` の両方に `contract.amount > 0` ガードが追加され、マイグレーション後の `amount = 0` 契約に対する請求操作ブロックが解消された。
- `updateInvoice.ts` の合計金額計算が SERIALIZABLE トランザクション内の `freshInvoice.amount` を使用するよう修正され、並行 amount 更新による stale data 混入リスクが解消された。

残存する LOW 所見（Finding #1, #2）は:
- Finding #1: 非 amount 更新パスでの phantom 監査ログは、既存の `updateContract.ts` にも同様のパターンが存在する pre-existing 問題の延長。発生条件が極めて稀（並行削除タイミング）であり、財務不変条件には影響しない。
- Finding #2: 日付バリデーションの staleness は `updateContract.ts` と同一パターンの踏襲。財務的完全性（SERIALIZABLE 内の freshInvoice）は保護されており、日付整合性は低頻度の race condition でのみ影響する。

いずれも `needs-fix` 判定基準（テナント条件の欠落・監査ログ記録漏れ・トランザクション外での監査ログ記録）に該当しない。**approved**。
