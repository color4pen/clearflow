# Domain Invariants Review — contract-invoice-optimistic-lock — iter 1

- **reviewer**: domain-invariants
- **purpose**: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。
- **verdict**: approved

---

## 確認スコープ

- `src/infrastructure/schema.ts` — contracts / invoices テーブルの version カラム
- `drizzle/0009_contract_invoice_version.sql` — マイグレーション SQL
- `src/domain/models/contract.ts` / `invoice.ts` — ドメインモデル
- `src/infrastructure/repositories/contractRepository.ts` / `invoiceRepository.ts` — リポジトリ
- `src/application/usecases/updateContract.ts` / `updateContractStatus.ts` / `updateInvoice.ts` / `updateInvoiceStatus.ts` — ユースケース
- `src/app/actions/contracts.ts` / `invoices.ts` — Server Actions
- `src/domain/events/types.ts` / `dispatcher.ts` — ドメインイベント
- `src/__tests__/usecases/optimisticLock.test.ts` — 静的コード解析テスト

---

## 不変条件チェック

### I-01: テナント分離 ✅

全更新経路で `organizationId` が WHERE 条件に保持されている。

| 経路 | WHERE 条件 |
|------|-----------|
| `contractRepository.update` | `id + organizationId + version` の三条件 AND |
| `invoiceRepository.update` | `id + organizationId + version` の三条件 AND |
| `invoiceRepository.updateStatus` | `id + organizationId + version` の三条件 AND |

楽観的ロック用に `version` 条件が追加された際も `organizationId` 条件は保持されており、テナント越境の書き込みは不可能。

Server Actions 層（`contracts.ts` / `invoices.ts`）は全アクションで `session.user.organizationId` をユースケースに渡しており、クライアントからの organizationId 偽装を防いでいる。

### I-02: 監査ログの完全性 ✅

全 usecase で「更新成功時のみ監査ログを記録する」パターンが正しく実装されている。

```
transaction {
  update() → null（version 不一致）
    → return null（監査ログ未作成）
  update() → entity（version 一致）
    → auditLogRepository.create(...)  ← トランザクション内
    → return entity
}

if (!updated) → { ok: false }  ← 監査ログなし、これは正しい
```

楽観的ロック失敗時に監査ログが生成されないのは意図通り。失敗した書き込み試行が audit trail に混入すると「変更が行われた」という誤解を招く。

### I-03: 承認ワークフローの不変条件 ✅

`requests` / `approval_steps` テーブルおよびそれらのユースケースは今回の変更に含まれない。既存の楽観的ロック実装（`requestRepository.updateStatus` / `approvalStepRepository.updateStatus`）への変更はゼロ。

`contract.completed`・`contract.cancelled`・`invoice.paid`・`invoice.overdue` のドメインイベントハンドラを調査したところ、これらは Webhook 配信（`webhookHandler.ts`）のみをトリガーし、`contractRepository.update` や `invoiceRepository.updateStatus` を再呼び出しするパスは存在しない。循環更新リスクは確認されない。

### I-04: ステータス遷移の整合性 ✅

`updateContractStatus` は `canContractTransition(contract.status, data.newStatus)` を findById の直後（トランザクション外）で評価し、その後トランザクション内で `contract.version` を expectedVersion として渡す。並行更新シナリオを検証する:

- User A が status=active, version=1 を読む
- User B が先に status=completed へ更新（version=2）
- User A が version=1 で UPDATE 実行 → WHERE `version=1` が不一致 → 0行 → null → `{ ok: false }` ✅

古い状態に基づくステータス遷移が DB に適用されることはない。

### I-05: updateInvoice の version 分離 ✅

`updateInvoice.ts` は金額検証用に SERIALIZABLE トランザクション内で `freshInvoice` を再取得するが、`invoiceRepository.update` の `expectedVersion` には **トランザクション開始前** に取得した `invoice.version` のみを使用する。

```typescript
const invoice = await invoiceRepository.findById(...);  // pre-tx: version=N

await db.transaction(async (tx) => {
  const freshInvoice = await invoiceRepository.findById(..., tx);  // 金額検証のみ
  // ...
  await invoiceRepository.update(..., invoice.version, tx);  // ← 正しい: invoice.version
  //                           NOT freshInvoice.version
}, { isolationLevel: 'serializable' });
```

`freshInvoice.version` を expectedVersion に使うと楽観的ロックが無効化される欠陥になるが、実装は正しく分離されている。テスト `optimisticLock.test.ts` も `freshInvoice.version` が渡されないことを `not.toContain` で検証している。

### I-06: イベントディスパッチの原子性 ✅

`updateContractStatus` / `updateInvoiceStatus` は `dispatcher.dispatch` をトランザクション内で呼ぶが、Webhook 配信（async ハンドラ）は `flushAsync()` が呼ばれて初めて実行される。楽観的ロック失敗時はトランザクションが null を返し、`flushAsync()` に到達しないため、失敗した更新に対して Webhook が配信されることはない。

### I-07: マイグレーションの安全性 ✅

```sql
ALTER TABLE "contracts" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;
ALTER TABLE "invoices" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;
```

`ADD COLUMN ... DEFAULT 1 NOT NULL` により既存行に version=1 が付与される。DROP/TRUNCATE/テーブル再作成は含まれない。プロジェクト規律（DB リセット禁止）に準拠している。

---

## 観察事項（defect ではない）

### O-01: 楽観的ロック失敗は audit log に残らない

楽観的ロック競合の頻発を後から分析する手段がない。本変更のスコープ外であり欠陥ではないが、将来的な運用監視の観点で検討余地がある。

### O-02: updateInvoice の SERIALIZABLE + 楽観的ロックの組み合わせ

SERIALIZABLE 分離レベルのトランザクション中に並行コミットがあると、`version` 不一致ではなく PostgreSQL の serialization error (40001) が `catch (err)` に落ちる場合がある。この場合のエラーメッセージは楽観的ロックの専用メッセージではなく汎用メッセージ（「請求の更新に失敗しました」）になる。いずれの場合も更新は拒否されるため、データ整合性への影響はない。

---

## 総評

楽観的ロックの追加は ADR-005 の確立済みパターンを忠実に横展開したもので、テナント分離・監査ログの完全性・承認ワークフローの不変条件のいずれも破壊していない。全更新経路で `organizationId` が維持され、ロック失敗時は適切に `{ ok: false }` で返されており、データ損失・テナント越境・不正な状態遷移は発生しない。
