# Domain-Invariants Review — action-items-full-ui — iteration 001

- **verdict**: approved
- **iteration**: 001

## 観点

テナント分離・監査ログの完全性・承認ワークフローの不変条件の 3 軸でレビューする。

---

## Findings

| # | Severity | Category | File | Description | 判定根拠 |
|---|----------|----------|------|-------------|----------|
| 1 | info | permissions | src/app/(dashboard)/deals/[id]/DealActionItemsSection.tsx, src/app/(dashboard)/deals/[id]/meetings/[meetingId]/MeetingActionItemsSection.tsx | `canDelete={editable}` で member ロールにも削除ボタンが表示される。`actionItem.delete` は `ADMIN_MANAGER` のみ許可（authorization.ts:137）。code-review F01 でも指摘済み | Server Action 側で `canPerform(session.user.role, "actionItem", "delete")` によりブロックされる。ドメイン不変条件の破壊なし。UX の問題に留まる |

---

## テナント分離 (Tenant Isolation) 検証

### listActionItems ユースケース

- `actionItemRepository.findByOrganization(data.organizationId, { done })` — organizationId でフィルタ済み ✅
- 関連エンティティ取得: `dealRepository.findById(id, data.organizationId)`, `meetingRepository.findById(id, data.organizationId)`, `inquiryRepository.findById(id, data.organizationId)` — 全て organizationId を第2引数に渡し、他テナントのエンティティが混入しない ✅
- page.tsx: `session!.user.organizationId` を organizationId として使用（クライアントから受け取らない）✅

### Server Actions

- `createActionItemAction`: organizationId は `session.user.organizationId` から取得。assigneeId / dealId / meetingId / inquiryId の存在確認に organizationId を渡してクロステナントアクセスを防止 ✅
- `toggleActionItemAction`: organizationId はセッションから取得。usecase 内で `findById(id, organizationId)` によるオーナーシップ確認 ✅
- `updateActionItemAction`: organizationId はセッションから取得。usecase 内で所有権確認 + 紐づけ先エンティティの組織一致確認 ✅
- `deleteActionItemAction`: organizationId はセッションから取得。usecase 内で `findById(id, organizationId)` によるオーナーシップ確認 ✅

### Client Component (ActionItemRow)

- `toggleActionItemAction`, `updateActionItemAction`, `deleteActionItemAction` の呼び出し時に organizationId をクライアントから渡していない
- organizationId は Server Action 内で常に `session.user.organizationId` から取得される
- 他テナントの item.id を渡しても usecase 層で `findById(id, organizationId)` → null → early return でブロックされる ✅

### repository 層

- `actionItemRepository.findById`: `WHERE id = ? AND organizationId = ?` で複合条件 ✅
- `actionItemRepository.findByOrganization`: `WHERE organizationId = ?` が必須条件として常に付与 ✅
- `actionItemRepository.update`: `WHERE id = ? AND organizationId = ?` ✅
- `actionItemRepository.deleteById`: `WHERE id = ? AND organizationId = ?` ✅

**テナント分離: 全ての操作で organizationId フィルタが二重に（usecase + repository）担保されている。問題なし。**

---

## 監査ログの完全性 (Audit Log Completeness) 検証

変更を伴う全 usecase を確認した。

| Usecase | Action | db.transaction 内でアトミック | metadata |
|---------|--------|-------------------------------|----------|
| createActionItem | `action_item.create` | ✅ | — |
| toggleActionItemDone | `action_item.toggle` | ✅ | `{ done: !existing.done }` |
| updateActionItem | `action_item.update` | ✅ | updateData（変更フィールドのみ）|
| deleteActionItem | `action_item.delete` | ✅ | — |

- 全操作で `auditLogRepository.create` が `db.transaction` 内で呼ばれており、操作とログ記録がアトミック ✅
- `actorId`, `organizationId`, `targetId`, `targetType` が全ての log エントリに含まれる ✅
- 新設の `listActionItems` は read-only であり、監査ログは不要（他の list usecases と一致した方針）✅

**監査ログ: 全変更操作でアトミックに記録。完全性に問題なし。**

---

## 承認ワークフローの不変条件 (Approval Workflow Invariants) 検証

本変更（action-items-full-ui）は、承認ワークフローのコアロジックに一切触れていない。

- `approveRequest`, `rejectRequest`, `submitRequest`, `resubmitRequest` — 変更なし ✅
- `ApprovalPolicy`, `ApprovalTemplate`, `ApprovalStep` などの承認関連エンティティ — 変更なし ✅
- `createActionItem` は dealId / meetingId / inquiryId との紐づけを行うが、承認申請（Request）との紐づけは行わない ✅
- アクションアイテムは承認ワークフローから独立したエンティティであり、承認状態遷移（pending → approved/rejected/expired）に影響しない ✅

**承認ワークフローの不変条件: 本変更による影響なし。**

---

## 権限マトリクスとの整合性

`authorization.ts` の定義と Server Action 実装の対応:

| 操作 | 権限定義 | Server Action での確認 |
|------|---------|------------------------|
| create | `ADMIN_MANAGER_MEMBER` | `canPerform(role, "actionItem", "create")` ✅ |
| edit | `ADMIN_MANAGER_MEMBER` | `canPerform(role, "actionItem", "edit")` ✅ |
| toggle | `ADMIN_MANAGER_MEMBER` | `canPerform(role, "actionItem", "toggle")` ✅ |
| delete | `ADMIN_MANAGER` | `canPerform(role, "actionItem", "delete")` ✅ |
| list | `ALL_ROLES` | auth() でセッション確認のみ（Server Component）✅ |

UI 表示と権限マトリクスの不一致（DealActionItemsSection / MeetingActionItemsSection の `canDelete={editable}`）は、Server Action 側で正しくブロックされるため、ドメイン不変条件の侵害には当たらない（code-review F01 にて修正対象として記録済み）。

---

## 総合判断

- テナント分離: ✅ 全層で二重チェック
- 監査ログ完全性: ✅ 全変更操作でアトミック記録
- 承認ワークフロー不変条件: ✅ 影響なし
- 権限制御: ✅ Server Action でブロック（UI の過剰表示は code-review 修正対象）

ドメイン不変条件を破壊する変更は存在しない。
