# Domain Invariants Review — invoice-standalone

- **reviewer**: domain-invariants
- **iteration**: 1
- **verdict**: approved

---

## 観点

テナント分離・監査ログの完全性・承認ワークフロー（ステータス遷移）の不変条件が変更によって破壊されていないことを検証する。

---

## 検証結果

### 1. テナント分離（Tenant Isolation）

**判定: ✅ OK**

全レイヤーでテナント分離が一貫して適用されていることを確認した。

| チェックポイント | 結果 |
|---|---|
| `invoiceRepository.findById(id, organizationId)` — WHERE に `organizationId` が含まれる | ✅ |
| `invoiceRepository.updateStatus(id, organizationId, ...)` — WHERE に `organizationId` が含まれる | ✅ |
| `invoiceRepository.findAllByContract(contractId, organizationId)` — WHERE に `organizationId` が含まれる | ✅ |
| `invoiceRepository.sumAmountByContract(contractId, organizationId)` — WHERE に `organizationId` が含まれる | ✅ |
| `contractRepository.findById(contractId, organizationId)` — 契約もテナントフィルタ済み | ✅ |
| `getInvoice` ユースケース — `session.user.organizationId` をユースケースに渡す（URL パラメータから取得しない）| ✅ |
| `updateInvoiceStatusAction` — `session.user.organizationId` を使用（user input から取得しない）| ✅ |
| 請求詳細ページ — `invoice.contractId !== contractId`（URL の contractId と不一致）の場合に `notFound()` | ✅ |

`getInvoice` の二段階防御が有効に機能している。`invoiceRepository.findById` が organizationId で請求を絞り込み、さらに `contractRepository.findById` も同じ organizationId で契約を絞り込む。請求詳細ページでは URL パラメータの `contractId` と請求の `contractId` を照合する第三の防御が追加されており、クロステナントアクセスを URL 操作でも突破できない構造になっている。

---

### 2. 承認ワークフロー不変条件（Status Transition Invariants）

**判定: ✅ OK**

`invoiceTransition.ts` の遷移ルールが正しく更新され、全操作経路で必ずドメインバリデーションを通ることを確認した。

**遷移テーブル（変更後）**:

| from → to | 結果 | 変更 |
|---|---|---|
| scheduled → invoiced | ✅ 許可 | 変更なし |
| invoiced → paid | ✅ 許可 | 変更なし |
| invoiced → overdue | ✅ 許可 | 変更なし |
| overdue → paid | ✅ 許可 | **新規追加** |
| paid → * | ❌ 拒否（終端） | 変更なし |
| overdue → invoiced | ❌ 拒否 | 変更なし |
| scheduled → paid | ❌ 拒否（スキップ不可） | 変更なし |

`updateInvoiceStatus` ユースケース内で `validateInvoiceTransition` が `updateStatus` 呼び出しより前に実行されることを確認した。ドメインバリデーションをバイパスして DB を直接更新する経路は存在しない。

テストカバレッジ（`invoiceTransition.test.ts`）:
- TC-007: overdue → paid の成功 ✅
- TC-008: overdue → invoiced の拒否 ✅
- TC-009: paid → overdue の拒否（終端状態） ✅

`overdue → paid` 遷移時も `invoice.paid` ドメインイベントが dispatch されることを確認した（`invoiced → paid` と同一のイベントタイプ。D6 設計判断と整合）。

---

### 3. 監査ログの完全性（Audit Log Completeness）

**判定: ✅ OK（警告あり）**

全てのミューテーション操作で監査ログがトランザクション内に記録されることを確認した。

| 操作 | 監査ログ | トランザクション内 |
|---|---|---|
| `createInvoice` | `action: "invoice.create"` | ✅ |
| `updateInvoiceStatus` | `action: "invoice.update_status"` | ✅ |

**⚠️ 警告: audit log に遷移詳細が記録されない（既存パターンの踏襲）**

`updateInvoiceStatus` の audit log 記録:

```typescript
await auditLogRepository.create({
  action: "invoice.update_status",
  targetType: "invoice",
  targetId: data.invoiceId,
  actorId: data.actorId,
  organizationId: data.organizationId,
  // metadata なし
}, tx);
```

`auditLogRepository.create` は `metadata?: Record<string, unknown>` を受け付けるが、現在は `metadata` が渡されていない。このため監査ログからは「誰が請求 X の status を更新した」ことしか分からず、「どのステータスからどのステータスへ変更したか」「paid 遷移時に記録した paidAt の値は何か」が記録されない。

- **影響**: 今回の変更で `paidAt` がユーザー指定に変わったため、入金日の設定値が監査ログに残らないことの影響が以前より大きくなった
- **リスク水準**: 低〜中（DB の `invoices.paidAt` カラムには値が保存されており、監査ログだけが欠落している）
- **スコープ**: 既存パターンの踏襲であり、このチェンジが新たに導入した問題ではない。また、仕様（spec.md / tasks.md）でも audit log の metadata 記録は要件定義されていない

今後の改善候補として `metadata: { from: invoice.status, to: data.newStatus, paidAt: data.paidAt?.toISOString() }` の記録を推奨するが、現時点では承認をブロックしない。

---

### 4. 権限チェック

**判定: ✅ OK（既存不整合の確認あり）**

| 操作 | 権限チェック | 方式 |
|---|---|---|
| `createInvoiceAction` | `canPerform(role, "invoice", "create")` | `ADMIN_FINANCE` ✅ |
| `updateInvoiceStatusAction` | `canPerform(role, "invoice", "changeStatus")` | `ADMIN_FINANCE` ✅ |
| 請求詳細ページ | `canPerform(role, "invoice", "changeStatus")` — false の場合は操作ボタン非表示 | ✅ |
| 請求登録ページ | `canPerform(role, "invoice", "create")` — false の場合は `notFound()` | ✅ |

**ℹ️ 情報: `updateInvoiceAction` の権限チェックに既存不整合（スコープ外）**

`updateInvoiceAction`（請求の基本情報更新）が `role !== "admin" && role !== "manager"` でチェックしているが、権限マトリクスでは `invoice.edit` は `ADMIN_FINANCE`（admin と finance のみ）。このため manager が請求を編集でき、finance が編集できない状態になっている。ただし、この問題は本チェンジで変更されていない既存コードであり、本レビューのスコープ外。

---

### 5. paidAt 未来日付バリデーション

**判定: ✅ OK**

- サーバーサイド（Server Action）: `z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(val => !val || val <= Intl.DateTimeFormat('sv', {timeZone: 'Asia/Tokyo'}).format(new Date()), ...)` — JST 基準で本日以前を強制
- クライアントサイド（InvoiceActions）: `<input type="date" max={todayString()}>` — UI での制約
- ユースケース側: `paidAt` は `newStatus === "paid"` の場合のみ使用。他のステータス遷移で `paidAt` が渡されても DB には書かれない

サーバーサイドでの強制がクライアントサイドに依存せず独立して機能している。

---

## 総括

テナント分離・承認ワークフロー不変条件・権限チェックの三軸で domain invariants が維持されている。監査ログはトランザクション内で記録されており、完全性の基本要件を満たす。遷移詳細の metadata 欠落は既存の技術的負債であり、本チェンジのスコープ外。

- **verdict**: approved
