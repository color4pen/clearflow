# Domain Invariants Review — delete-and-form-fixes — iteration 001

- **verdict**: approved
- **iteration**: 001

## 観点と判定基準

| 観点 | 判定基準 |
|------|---------|
| テナント分離 | 全 deleteById / deleteAllByDeal に organizationId 条件が付与されている。organizationId はセッションから取得し、リクエストボディから受け取らない |
| 監査ログの完全性 | 全削除操作で `auditLogRepository.create` が同一トランザクション内で呼ばれる。actor / target / action / timestamp が含まれる。監査ログテーブルへの UPDATE / DELETE がない |
| 承認ワークフロー不変条件 | 依存エンティティが存在する場合に削除をブロックする。案件削除時の引き合いステータス復帰が原子的である。削除は admin / manager のみ実行可能 |

---

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| — | — | — | — | 違反なし | — | — |

---

## テナント分離 — 詳細検証

**新規追加の全リポジトリメソッドを確認した。**

| メソッド | WHERE 条件 | 判定 |
|---------|-----------|------|
| `inquiryRepository.deleteById` | `and(eq(inquiries.id, id), eq(inquiries.organizationId, organizationId))` | PASS |
| `dealRepository.deleteById` | `and(eq(deals.id, id), eq(deals.organizationId, organizationId))` | PASS |
| `contractRepository.deleteById` | `and(eq(contracts.id, id), eq(contracts.organizationId, organizationId))` | PASS |
| `dealContactRepository.deleteAllByDeal` | SELECT に `deals.organizationId = organizationId` JOIN 条件 → 取得 ID で DELETE（Drizzle の DELETE with JOIN 非対応による 2 ステップ、両操作とも同一 `tx` を使用） | PASS |

全 Server Action (`deleteInquiryAction` / `deleteDealAction` / `deleteContractAction`) において `organizationId` は `session.user.organizationId` から取得しており、リクエストボディ経由での混入はない。

---

## 監査ログの完全性 — 詳細検証

| usecase | 記録箇所 | tx 引数 | action 値 | 判定 |
|---------|---------|---------|-----------|------|
| `deleteInquiry` | `db.transaction` 内 | `tx` 渡し | `"inquiry.delete"` | PASS |
| `deleteDeal` | `db.transaction` 内 | `tx` 渡し | `"deal.delete"` | PASS |
| `deleteContract` | `db.transaction` 内 | `tx` 渡し | `"contract.delete"` | PASS |

全レコードに `action` / `targetType` / `targetId` / `actorId` / `organizationId` が含まれる。`createdAt` はスキーマ (`defaultNow()`) で自動付与される。`auditLogRepository` に UPDATE / DELETE 操作は存在しない。

---

## 承認ワークフロー不変条件 — 詳細検証

**依存チェック**:
- `deleteInquiry`: `dealRepository.findByInquiryId` → 案件が存在すれば即時エラー返却（トランザクション前）
- `deleteDeal`: `meetingRepository.findAllByDeal` → 商談存在でエラー。`contractRepository.findAllByDealId` → 契約存在でエラー
- `deleteContract`: `invoiceRepository.findAllByContract` → 請求存在でエラー

**案件削除時の不変条件**:
- `dealContactRepository.deleteAllByDeal` をトランザクション内で先に実行し、従属データを原子的にクリーンアップ ✅
- `deal.inquiryId` がある場合、`inquiryRepository.updateStatus` をトランザクション内で実行してステータスを `"new"` へ復帰。戻り値が `null`（楽観的ロック競合）の場合は `throw new Error(...)` でトランザクションをロールバックさせる ✅

**権限ガード**:
- 3 つの削除 Server Action すべてが `session.user.role !== "admin" && session.user.role !== "manager"` を先頭でチェック ✅

---

## Summary

テナント分離・監査ログ完全性・承認ワークフロー不変条件のいずれにも違反は検出されなかった。

- 新規 `deleteById` 3 件はすべて `organizationId` 二重条件付き
- `deleteAllByDeal` は Drizzle の制約上 SELECT → DELETE の 2 ステップだが、両操作が同一トランザクション内で実行されテナント分離が保証されている
- 全削除操作の監査ログがトランザクション内で記録され、append-only 性も維持されている
- `deleteDeal` の楽観的ロック競合時のロールバック処理（code-review 指摘 #1 の修正）が適切に実装されており、引き合いステータスの中間状態不整合は発生しない
