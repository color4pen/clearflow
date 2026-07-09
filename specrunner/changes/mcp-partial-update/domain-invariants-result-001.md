# Domain-Invariants Review Result — mcp-partial-update — Iter 1

- **reviewer**: domain-invariants
- **purpose**: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。
- **verdict**: approved

---

## 検証サマリー

| 観点 | 判定 | 詳細 |
|------|------|------|
| テナント分離（repository 層） | ✅ PASS | 全 repository 操作が `organizationId` でスコープされている |
| テナント分離（usecase 層） | ✅ PASS | `authInfo.extra` から取得した `organizationId` をそのまま使用。ユーザー指定不可 |
| 監査ログ完全性（イベント必達） | ✅ PASS | 全 mutation で `recordAudit` がトランザクション内で確実に呼ばれる |
| 承認ワークフロー不変条件 | ✅ PASS | ApprovalPolicy ドメインモデルの必須フィールド保護・条件三つ組整合性を維持 |
| 楽観的ロック（updateMeeting） | ✅ PASS | `existing.version` → `expectedVersion` の伝達は変更なし |
| テンプレートクロステナントガード | ✅ PASS | `templateId !== undefined` の場合のみ `organizationId` で検証 |
| 監査メタデータ内容 | ⚠️ LOW | 後述 F-1 参照 |

---

## Finding 一覧

### F-1 [LOW] updatePolicy の監査メタデータが PATCH 化により空になりうる

**対象**: `src/application/usecases/updatePolicy.ts` — `recordAudit` の metadata

**観察内容**:

変更前（PUT セマンティクス）では `name` と `triggerAction` が必須フィールドだったため、監査メタデータには常に `{ name: "...", triggerAction: "..." }` が含まれていた。変更後（PATCH セマンティクス）では、例えば `description` のみ更新する場合、これら両フィールドが `undefined` になり、メタデータが `{}` になる。

```typescript
// 現行コード（updatePolicy.ts:63-66）
metadata: {
  ...(data.name !== undefined && { name: data.name }),
  ...(data.triggerAction !== undefined && { triggerAction: data.triggerAction }),
},
```

**影響範囲**:
- 監査**イベント自体**は必ず作成される（action / targetId / actorId / organizationId / 日時は常に記録）。完全性（mutation ごとにイベントが存在すること）は維持されている。
- `description` / `conditionField` 等の変更は PATCH 化前から metadata に含まれていなかった。metadata に `{}` が入るのは name / triggerAction 以外だけを更新するケース（PATCH 化で初めて生じるパターン）に限られる。
- `AuditMetadataMap` は `policy.update` に対して強制構造を定義しておらず、スキーマ上の違反はない。

**リスク評価**: 監査ログの「存在」は保証されており、アクター・対象・タイムスタンプから変更の追跡は可能。メタデータの詳細度が一部ケースで低下するが、コンプライアンス上の必達要件（誰が・いつ・何のポリシーを更新した）は満たされる。

**推奨対応** (任意): `description` / `conditionField` なども metadata に含めるか、変更フィールド一覧 (`changedFields`) を記録する。ただし本 request のスコープ（データ破壊是正）から外れるため、別 request で対応することが望ましい。

---

## テナント分離 詳細検証

### interactions / updateMeeting

- `interactionRepository.findById(data.meetingId, data.organizationId)` — 取得時に `AND organizationId = ?` ✓
- `interactionRepository.update(id, organizationId, ...)` — UPDATE 時に `AND organizationId = ?` ✓
- handler は `authInfo.extra.organizationId` を使用。ユーザー入力の `organizationId` はなし ✓
- 新規追加の `internalAttendees` / `externalAttendees` マージロジックは `existing.attendees` (テナント内取得済み) のみを参照 ✓

### approvalPolicies / updatePolicy

- `approvalTemplateRepository.findById(data.templateId, data.organizationId)` — templateId 指定時のみ、かつ `organizationId` スコープで検証 ✓
- `approvalPolicyRepository.updateById(id, organizationId, ...)` — UPDATE WHERE `id = ? AND organizationId = ?` ✓
- policy が見つからない場合（他テナント含む）、`{ ok: false, reason: "ポリシーが見つかりません" }` と一律応答（テナント存在の漏洩なし）✓

---

## 監査ログ完全性 詳細検証

### updateMeeting

```
recordAudit({
  action: "interaction.update",
  targetType: "interaction",
  targetId: data.meetingId,
  actorId: data.actorId,
  organizationId: data.organizationId,
  metadata: { kind: existing.kind },   ← 変更なし
}, tx)
```

- `db.transaction` 内で update と recordAudit が同一トランザクションにある ✓
- `updated` が null（他ユーザーによる並行更新）のとき audit は記録されない（正しい挙動: 変更が成立しなかったため）✓
- metadata の `kind` は既存ロジックからの変更なし ✓

### updatePolicy

- `db.transaction` 内で updateById と recordAudit が同一トランザクションにある ✓
- `p` が null（ポリシー未発見）のとき `return null` → audit 記録なし（正しい挙動）✓
- F-1 に記載の通りメタデータ内容は変化するが、イベント必達性は維持 ✓

---

## 承認ワークフロー不変条件 詳細検証

### ApprovalPolicy ドメインモデルの必須フィールド保護

`ApprovalPolicy` 型は `name: string`, `triggerAction: string`, `templateId: string` を非 nullable で定義している。PATCH 化後も:

- `name` は `.optional()` かつ `.min(1)` — null や空文字列を指定不可 ✓
- `triggerAction` は `.enum(...)` の `.optional()` — null を指定不可 ✓
- `templateId` は `.uuid()` の `.optional()` — null を指定不可 ✓
- `updateById` は `Partial<{...}>` を受け取り、undefined フィールドを SET 句に含めない — DB の既存値を保持 ✓

ゆえに PATCH 更新後も DB 上のポリシーは常に `name`, `triggerAction`, `templateId` を持つ。

### 条件三つ組（conditionField / conditionOperator / conditionValue）整合性

handler の条件ブロック:
```typescript
if (typedArgs.conditionField !== undefined) {
  const hasField = conditionField !== null && conditionField.trim() !== "";
  conditionField = hasField ? typedArgs.conditionField : null;
  conditionOperator = hasField ? (typedArgs.conditionOperator ?? null) : null;
  conditionValue   = hasField ? (typedArgs.conditionValue  ?? null) : null;
}
```

- `conditionField` が省略された場合 → 3 フィールドとも `undefined` → updateById で SET 句に含まれず、既存値を保持 ✓
- `conditionField` が null / 空文字列の場合 → 3 フィールドとも `null` → 条件をアトミックにクリア ✓
- `conditionField` が非空の場合 → `superRefine` により `conditionOperator` / `conditionValue` を必須化 ✓

いずれのケースでも三つ組の整合性（全部ある or 全部 null）が保たれる。

### 承認リクエスト FSM

`requestTransition.ts` による FSM (draft → pending → approved / rejected / revision / expired) は本変更から独立。ポリシー更新は承認リクエストの生成時点でのみ評価され、既存の in-flight リクエストに遡及しない。設計通り。

---

## 楽観的ロック（updateMeeting）

`interactionRepository.update` の WHERE 句:
```sql
WHERE id = ? AND organizationId = ? AND version = ?
```

`existing.version` が `expectedVersion` として渡されることは変更なし。並行更新時に `result = null` となり usecase が `{ ok: false, reason: "他のユーザーによって更新されました..." }` を返す挙動も変更なし ✓

---

## 結論

本変更はテナント分離・監査ログ完全性・承認ワークフロー不変条件のいずれも破壊していない。F-1 の監査メタデータ詳細度の低下は LOW のリスクであり、ブロッカーとはならない。

- **verdict**: approved
