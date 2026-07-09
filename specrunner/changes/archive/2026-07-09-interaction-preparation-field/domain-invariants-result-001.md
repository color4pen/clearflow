# Domain-Invariants Review Result — interaction-preparation-field — iter 1

- **reviewer**: domain-invariants
- **purpose**: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。
- **verdict**: approved

---

## Scope of Review

対象変更は `preparation`（nullable text）フィールドを `interactions` テーブルおよびレイヤー全層（domain → repository → usecase → MCP → Server Action → UI）に追加するものである。スキーマ変更は加算的（ADD COLUMN のみ）で、既存データへの影響はない。

---

## Findings

### ✅ INV-01: テナント分離（PASS）

`interactionRepository` の全クエリ（`findById` / `findAllByDeal` / `findAllByInquiry` / `findAllByContract` / `findAllByInvoice` / `findAllByOrganization` / `update`）は、変更前後ともに `eq(interactions.organizationId, organizationId)` を WHERE に含む。

新フィールド `preparation` は既存の `interactions` 行へのカラム追加にすぎず、別テーブルや別クエリを導入しないため、テナント境界を変える要素はない。MCP ハンドラは `getAuthInfo` から取得した `organizationId` を usecase に渡す実装であり、テナント分離の経路は変わっていない。

`mcpActivityAuditTenant.dynamic.test.ts` の「org-1 / org-2 でそれぞれの organizationId が usecase に渡される」テストが既存のまま通過していることも確認した（verification-result: 2029 pass / 0 fail）。

### ✅ INV-02: 監査ログの完全性（PASS）

`createMeeting.ts` と `updateMeeting.ts` の `recordAudit` 呼び出しは無変更であり、`preparation` フィールドの追加によって削除・バイパスされていない。

```
// createMeeting.ts — 変更なし
await recordAudit({ action: "interaction.create", targetType: "interaction",
  targetId: newMeeting.id, actorId, organizationId, metadata: { kind } }, tx);

// updateMeeting.ts — 変更なし
await recordAudit({ action: "interaction.update", targetType: "interaction",
  targetId: data.meetingId, actorId, organizationId, metadata: { kind: existing.kind } }, tx);
```

audit metadata に `preparation` 値を含めない設計は、`summary` / `details` / `attendees` 等の既存フィールドと同様の粒度である。`interaction.update` の監査記録は「誰がどの商談を更新したか」を記録することを責務としており、フィールド値の前後スナップショットを取得するスコープはこのシステムの設計方針外である。

### ✅ INV-03: createMeeting 不変条件（deal または inquiry 必須）（PASS）

`createMeeting.ts` の以下のガードは無変更：

```typescript
if (!data.dealId && !data.inquiryId) {
  return { ok: false, reason: "案件または引合のいずれかの指定が必要です" };
}
```

DB レベルのチェック制約 `interactions_related_entity_check`（`schema.ts` line 404–406）も無変更：

```sql
dealId IS NOT NULL OR inquiryId IS NOT NULL OR contractId IS NOT NULL
  OR invoiceId IS NOT NULL OR clientId IS NOT NULL
```

`preparation` フィールドはこの不変条件に影響しない。

### ✅ INV-04: HearingData / meetingType 不変条件（PASS）

`createMeeting.ts` の `details` ゲート（hearing 以外では null に強制）：

```typescript
const details = data.meetingType === "hearing" ? (data.details ?? null) : null;
```

`updateMeeting.ts` の `effectiveMeetingType` に基づく `details` 計算も無変更。`preparation` はこの判定から独立した汎用フィールドであり、`meetingType` による制約を持たない。設計決定 D1 の通り。

### ✅ INV-05: 楽観ロック（PASS）

`interactionRepository.update` の WHERE 条件：

```typescript
eq(interactions.version, expectedVersion)
```

が無変更。`preparation` が追加されても `version = sql\`version + 1\`` インクリメントは維持されており、並行更新時のデータ破損防止機構は健在。

### ✅ INV-06: 承認ワークフロー不変条件（PASS）

`interactions` エンティティは承認ワークフロー（`approvalRequests` / `approvalPolicies` / `approvalSteps` 等）と直接の依存関係を持たない。本変更は承認関連コードを一切変更しておらず、ワークフロー不変条件への影響はない。

### ✅ INV-07: 認可（Authorization）（PASS）

MCP ハンドラの `canPerform` チェックは無変更：

```typescript
// create_meeting
if (!canPerform(role, "meeting", "create")) { return toToolError("権限がありません"); }
// update_meeting
if (!canPerform(role, "meeting", "edit")) { return toToolError("権限がありません"); }
```

Server Action の `canPerform` チェックも無変更。`preparation` フィールドに対して独立した認可ロジックは不要（`meeting.create` / `meeting.edit` 権限が商談全体をカバーする）。

### ✅ INV-08: 部分更新セマンティクス（PASS）

`updateMeeting.ts` での `preparation` の取り扱い：

```typescript
...(data.preparation !== undefined && { preparation: data.preparation }),
```

`undefined`（省略） → DB 更新セットに含まれない → 既存値保持  
`null`（明示クリア） → `{ preparation: null }` → DB に null を書き込む  
`string` → `{ preparation: string }` → 値を更新する

この三値区別は `summary` 等の既存フィールドと同じパターンであり、behavioral テスト（TA-02 / TA-03）で固定されている。

### ℹ️ NOTE-01: UI での空文字と null の扱いの非対称性（informational）

`MeetingPreparationSection.tsx` は常に `formData.set("preparation", value)` を送信する。ユーザーがフィールドをクリアした場合、`value = ""` が送信され、Server Action 経由で `preparation: ""` が DB に保存される（null ではなく空文字）。

ただしこれは `MeetingSummarySection` の `summary` フィールドと同一の既存パターンであり、本変更で新たに導入した挙動ではない。null と空文字を区別する要件は request.md に記載されておらず、ドメイン不変条件の違反には該当しない。

---

## Summary

| 観点 | 判定 |
|------|------|
| テナント分離 | ✅ PASS |
| 監査ログの完全性 | ✅ PASS |
| createMeeting 不変条件 | ✅ PASS |
| HearingData / meetingType 不変条件 | ✅ PASS |
| 楽観ロック | ✅ PASS |
| 承認ワークフロー不変条件 | ✅ PASS |
| 認可（Authorization） | ✅ PASS |
| 部分更新セマンティクス | ✅ PASS |

加算的なカラム追加であり、既存の不変条件・テナント分離・監査ログ経路はすべて無変更で維持されている。`preparation` フィールドは既存パターン（summary と同レベル）に倣って正しく実装されている。
