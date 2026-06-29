# Review Result — domain-invariants — activity-timeline-curation — iter 1

## Reviewer
domain-invariants

## Purpose
テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。

## Scope of Changes
- `src/domain/models/auditLog.ts` — `AuditMetadataMap` に 3 エントリ追加
- `src/application/usecases/updateInvoiceStatus.ts` — `recordAudit` に `{ fromStatus, toStatus }` metadata 追加
- `src/application/usecases/getDealActivity.ts` — 取得対象の絞り込み・集約ロジック組み込み
- `src/lib/activityAggregator.ts` — 新規：表示用集約の純粋関数
- `src/lib/activityConfig.ts` — `TIMELINE_ACTIONS` / `TRANSITION_ACTIONS` 定数追加
- `src/lib/activityLabels.ts` — `getActionLabel` を `TimelineEntry` 対応に拡張
- `src/app/(dashboard)/deals/[id]/DealActivitySection.tsx` — `TimelineEntry[]` 対応
- テスト一式

---

## Findings

### [INFO] I-01: テナント分離の連鎖が健全に維持されている

**対象**: `getDealActivity.ts` + `auditLogRepository.ts`

`getDealActivity` は `organizationId` を以下の全段階に渡している:

1. `meetingRepository.findAllByDeal(dealId, organizationId)` — DB で `organizationId` 絞り込み済み
2. `contractRepository.findAllByDealId(dealId, organizationId)` — 同上
3. `invoiceRepository.findAllByContract(c.id, organizationId)` — `invoiceRepository.ts:77` で `eq(invoices.organizationId, organizationId)` を AND 条件として適用
4. `auditLogRepository.findByTargets(organizationId, targets, ...)` — `auditLogRepository.ts:119` で `eq(auditLogs.organizationId, organizationId)` を AND 条件として適用

ターゲット IDs は上記のテナント済みエンティティから構築されるため、テナント境界を越えた監査ログ参照は発生しない。テナント分離は健全。

---

### [INFO] I-02: 監査ログの書き込みパスは変更なし（完全性は維持）

**対象**: `auditLogRepository.create` / `recordAudit` / 全 usecase の書き込みパス

この変更が触れるのは**読み取りパス** (`getDealActivity`) のみ。監査ログの書き込みパス (`recordAudit` → `auditLogRepository.create`) は `updateInvoiceStatus` の metadata 追加を除いて変更なし。

`updateInvoiceStatus` における metadata 追加（`{ fromStatus, toStatus }`）は：
- `db.transaction()` 内で `updateStatus` と同一トランザクションで実行される（原子性保証）
- `recordAudit` の呼び出し自体は既存と同一；追加されたのは `metadata` フィールドのみ
- 既存ログ（metadata: null の旧データ）は削除・変更されない

監査ログの追記専用性は保持されている。

---

### [INFO] I-03: 承認ワークフロー関連の不変条件に変更なし

**対象**: `request.*` / `approval_step.*` / `delegation.*` / `policy.*`

本変更は `TIMELINE_ACTIONS` ホワイトリストにこれらのアクションを含めておらず、読み取りパスでも書き込みパスでもワークフロー関連ロジックに一切触れていない。承認ワークフローの不変条件は変更なし。

---

### [INFO] I-04: AuditMetadataMap 拡張による型制約の強化

**対象**: `src/domain/models/auditLog.ts` / `src/application/services/auditRecorder.ts`

`AuditMetadataMap` への 3 エントリ追加により、`AuditRecordParams<A>` の条件型（`A extends keyof AuditMetadataMap ? { metadata: AuditMetadataMap[A] } : ...`）が `deal.updatePhase` / `contract.updateStatus` / `invoice.update_status` に対して metadata を**必須かつ型付き**にする。

verification（typecheck）が通過していることから、既存の `updateDealPhase` / `updateContractStatus` callsite はすでに正しい metadata を渡していることが確認済み。これは型制約の**弱体化ではなく強化**。

---

### [INFO] I-05: TimelineEntry から organizationId が省略されているが設計上安全

**対象**: `src/lib/activityAggregator.ts` — `TimelineEntry` 型定義

`TimelineEntry` は `organizationId` を持たない表示用読み取りモデルである。テナント分離は DB クエリ時点（`findByTargets` の WHERE 条件）で完結しているため、表示モデルに `organizationId` が不要であることは設計上正当。業務ロジックへの流用もない。

---

### [INFO] I-06: `(TRANSITION_ACTIONS as string[]).includes(log.action)` のキャストは安全

**対象**: `src/lib/activityAggregator.ts:67,80`

`log.action` は `AuditAction`（string のユニオン型）であり、`TRANSITION_ACTIONS` は `AuditAction[]` として定義されている。`Array<AuditAction>.includes(AuditAction)` に型エラーが出るため `as string[]` キャストが使われているが、実行時の動作に影響はない。軽微な型安全性の妥協だが、ドメイン不変条件には影響しない。

---

## Summary

| 観点 | 結果 |
|------|------|
| テナント分離（読み取りパス） | ✅ 全段階で organizationId を適用、健全 |
| テナント分離（書き込みパス） | ✅ 変更なし（metadata 追加のみ） |
| 監査ログの完全性・追記専用性 | ✅ 読み取り専用の集約で DB ログは変更なし |
| 承認ワークフローの不変条件 | ✅ 変更なし |
| 型安全性（AuditMetadataMap） | ✅ 型制約の強化（弱体化なし） |
| トランザクション境界 | ✅ invoice metadata 記録は同一 tx 内 |

ブロッカーとなるドメイン不変条件違反はなし。すべての所見は INFO レベル。

- **verdict**: approved
