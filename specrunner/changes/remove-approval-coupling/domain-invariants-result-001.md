# Domain Invariants Review — remove-approval-coupling — iter 1

- **reviewer**: domain-invariants
- **purpose**: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。
- **verdict**: approved

---

## 確認対象

変更の核心は以下の 4 点:

1. `updateInquiryStatus` の converted 遷移を「承認リクエスト経由」→「Deal 直接作成」に置き換え
2. `updateDealPhase` から `estimate_approval` 分岐を撤去し、`negotiation → won` を直接遷移に変更
3. `approveRequest` から `runPostApprovalLinkage`（Deal 作成・フェーズ進行フック）を削除
4. スキーマから `sourceType`/`sourceId`/`conversionRequestId`/`estimate_approval` を削除

---

## 検証結果

### 1. テナント分離

| 操作 | 分離方法 | 結果 |
|------|---------|------|
| `inquiryRepository.findById(id, organizationId)` | WHERE + organizationId | OK |
| `dealRepository.create({ organizationId })` | INSERT に organizationId を渡す | OK |
| `dealRepository.findById(id, organizationId)` | WHERE + organizationId | OK |
| `inquiryRepository.updateStatus(id, organizationId, ...)` | WHERE + organizationId | OK |
| `dealRepository.updatePhase(id, organizationId, ...)` | WHERE + organizationId | OK |
| `requestRepository.findById(id, organizationId)` | WHERE + organizationId | OK |
| `auditLogRepository.create({ organizationId })` | INSERT に organizationId を渡す | OK |

converted 遷移で `dealRepository.create` に渡す `organizationId` は `session.user.organizationId`（Server Action 層）→ `data.organizationId` と一貫して受け渡されており、テナント間クロスアクセスは発生しない。

### 2. 監査ログ完全性

全ての状態遷移で `db.transaction` 内に `auditLogRepository.create` が配置されており、TX 失敗時のログ欠落がない。

| 操作 | audit action | metadata | TX 内 |
|------|-------------|---------|-------|
| `updateInquiryStatus` (converted) | `inquiry.updateStatus` | fromStatus, toStatus, dealId | OK |
| `updateInquiryStatus` (その他) | `inquiry.updateStatus` | fromStatus, toStatus | OK |
| `updateDealPhase` | `deal.updatePhase` | fromPhase, toPhase | OK |
| `approveRequest` (no-steps) | `request.approve` | — | OK |
| `approveRequest` (multi-step, step 承認) | `approval_step.approve` | stepId, stepOrder, approverRole, delegatedFrom? | OK |
| `approveRequest` (multi-step, 最終承認) | `request.approve` | — | OK |

委任承認（delegation）の場合、`delegatedFrom` が `approval_step.approve` の metadata に含まれる。旧 `approval.linkage_failed` アクションは削除されており、スキーマに存在しないフィールドへの参照も消えている。

### 3. フェーズ遷移不変条件

`dealTransition.ts` の `VALID_TRANSITIONS` は以下の通り:

```
proposal_prep → [proposed, lost]
proposed      → [negotiation, lost]
negotiation   → [won, lost]   ← estimate_approval を経由しない直接遷移
won, lost     → マップなし（終端状態）
```

- `canDealTransition` は `updateDealPhase` UC 層で強制され、UI バイパスがあってもサーバー側で拒否される
- `DealPhaseActions.tsx` の `nextPhaseOptions` からも `estimate_approval` が消えており、UI と FSM が一致している
- `estimate_approval` は DealPhase 型・DB enum・遷移マップ・UI・ラベル (`labels.ts`) から完全削除されている

### 4. 楽観ロックと重複防止

| 機構 | 対象 | 実装 |
|------|------|------|
| 楽観ロック | `inquiry.version` | `updateStatus` で `WHERE version = currentVersion` |
| 楽観ロック | `deal.version` | `updatePhase` で `WHERE version = currentVersion` |
| 楽観ロック | `request.version` | `updateStatus` で `WHERE version = expectedVersion` |
| DB UNIQUE 制約 | `deals_inquiry_id_unique` | 1 引き合い = 1 案件を DB レベルで保証 |
| TOCTOU 防止 | `approveRequest` multi-step | TX 内で step / delegation を再フェッチして再検証 |

Deal 直接作成（converted 遷移）では楽観ロック（`inquiry.version`）と DB UNIQUE 制約の二重保護により、並行リクエストによる重複 Deal 作成が防止されている。

### 5. 承認ワークフロー自体への影響

`runPostApprovalLinkage` 削除後も以下が維持されている:

- `request.approved` / `step.approved` の Webhook イベント配信
- `approval_step.approve` / `request.approve` の audit log
- TOCTOU 防止の TX 内ステップ再検証
- 委任承認（`approvalDelegationRepository`）の参照

承認ワークフロー自体（Request / ApprovalStep / ApprovalTemplate テーブルとそのユースケース）への副作用はない。

---

## 観察事項（ブロッカーではない）

### [info] converted 遷移で `deal.create` 独立 audit log が記録されない

`updateInquiryStatus` の converted 遷移では `dealRepository.create` を直接呼ぶため、`createDeal` UC が記録する `deal.create` audit log は生成されない。Deal の作成事実は `inquiry.updateStatus` ログの `metadata.dealId` から追跡可能であり、設計判断 D4（同一 TX 内で直接作成）と T-06 の受け入れ基準（`auditLogRepository.create が呼ばれている`）は満たしている。

将来的に Deal 作成経路を統一する場合、converted 遷移にも `deal.create` アクションを追加することで audit trail の一貫性が高まる。

---

## 総合判定

- **verdict**: approved

テナント分離・監査ログ完全性・楽観ロック・遷移不変条件・承認ワークフロー不変条件のすべてが維持されている。`estimate_approval` フェーズと承認連携コードは実装・型・スキーマ・UI・マイグレーション SQL から整合的に撤去されている。build / typecheck / test（510 件全 green）により機械的に確認済み。
