# Domain-Invariants Review — action-item-status — iter 1

## Summary

- **reviewer**: domain-invariants
- **purpose**: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。
- **verdict**: approved

---

## 観点別評価

### 1. テナント分離

**結論: 維持されている ✅**

全ての読み書きパスで `organizationId` スコーピングが徹底されている。

| チェックポイント | 実装 | 判定 |
|---|---|---|
| `findById` | `WHERE id = ? AND organization_id = ?` | ✅ |
| `update` | `WHERE id = ? AND organization_id = ? AND version = ?` | ✅ |
| `findByOrganization` | `WHERE organization_id = ?` | ✅ |
| `findByDeal` / `findByMeeting` | どちらも `organization_id` を必須条件に含む | ✅ |
| Action 層での `organizationId` 取得元 | `session.user.organizationId`（ユーザー入力から来ない） | ✅ |
| Usecase の `organizationId` 取得元 | Action から渡される（session 由来） | ✅ |
| 監査ログの `organizationId` | session 由来の値が `recordAudit` に渡される | ✅ |

**`updateActionItemStatusAction` の二重 `findById` について**: Action 層は `revalidatePath` 用に `findById` を呼ぶが、`session.user.organizationId` で適切にスコープされている。Usecase 内の `findById` が正規の存在確認を担い、テナント分離の本質的な保証はここにある。二重読み取りは非効率だが安全上の問題はない。

---

### 2. 監査ログの完全性

**結論: 完全 ✅**

| チェックポイント | 実装 | 判定 |
|---|---|---|
| 監査記録のトランザクション境界 | `db.transaction` 内で `recordAudit` を呼び出す。更新失敗時は監査も巻き戻される | ✅ |
| `AuditAction` への追加 | `"action_item.updateStatus"` が `auditLog.ts` に登録済み | ✅ |
| `AuditMetadataMap` への追加 | `"action_item.updateStatus": { status: string }` が登録済み | ✅ |
| `actorId` の来源 | `session.user.id` | ✅ |
| `organizationId` の来源 | `session.user.organizationId` | ✅ |
| `targetType` | `"action_item"` — 既存の `AuditTargetType` に含まれる | ✅ |
| `targetId` | `data.id`（ユーザー入力値、UUID 検証済み） | ✅ |
| `metadata.status` の型保証 | `AuditRecordParams` のジェネリクス制約で `AuditMetadataMap` 参照、型チェック通過 | ✅ |
| 既存の `action_item.toggle` 監査への影響 | `toggleActionItemDone` は `action_item.toggle` / `{ done: boolean }` のまま変更なし | ✅ |

---

### 3. 承認ワークフローの不変条件

**結論: 破壊なし ✅**

アクションアイテムは承認ワークフロー（`request.*` / `approval_step.*`）とは独立したエンティティであり、本変更はその境界を越えない。

- `request.*` / `approval_step.*` 監査アクション: 変更なし ✅
- 承認フロー関連のドメインモデル（`Request`, `ApprovalStep`）: 変更なし ✅
- `done` フィールドはダッシュボードの「未完了」集計に使われているが、`status === "done"` ↔ `done=true` の同期により従来の集計ロジックが保たれる ✅

---

### 4. 追加不変条件の検証

#### 楽観ロック (Optimistic Locking)

`update` は `eq(actionItems.version, expectedVersion)` と `version: sql\`version + 1\`` を含む。並行書き込みによる lost update を防止。`updateActionItemStatus` は `existing.version` を渡しており正しく動作する。✅

#### status 値の制約

- **アプリケーション層**: zod `z.enum(ACTION_ITEM_STATUSES)` で3値以外を拒否 ✅
- **DB層**: `status text` にはCHECK制約なし。直接SQL操作による不正値の混入は可能だが、これはプロジェクト全体の既存パターン（他のenum相当カラムも同様）であり、本変更の新規問題ではない
- **`mapRow` の型キャスト**: `(row.status as ActionItemStatus | null)` はランタイム検証ではなく型アサーション。既存パターンと一致

#### toggle と status の競合

`toggleActionItemDone` は `in_progress` 状態のアイテムを toggle した場合、`"in_progress" → "done"` または `"in_progress" → "todo"` に遷移する。設計判断 D3 で明示的に許容された挙動（「toggle は todo ↔ done の直接切替」）であり、不変条件違反ではない。✅

---

## 軽微な観察（ブロッカーなし）

| # | 観察 | 重要度 |
|---|---|---|
| O-1 | `status` カラムに DB レベルの CHECK 制約がない | low — 既存パターンと一致 |
| O-2 | Action 層と usecase 層の二重 `findById` | low — 安全、パフォーマンスのみ |
| O-3 | `mapRow` での型キャストはランタイム検証を行わない | low — 既存パターンと一致 |

---

## Findings

- **verdict**: approved

本変更はテナント分離・監査ログの完全性・承認ワークフローの不変条件のいずれも破壊していない。楽観ロックも適切に維持されている。軽微な観察はすべてプロジェクトの既存パターンの踏襲であり、今回の変更が新たに導入した問題ではない。
