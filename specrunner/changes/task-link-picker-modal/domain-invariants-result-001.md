# Domain Invariants Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:    All domain invariants intact. No blocking findings.
  - needs-fix:   One or more invariant violations require correction before merge.
  - escalation:  Unresolvable conflicts or requires human architectural judgment.
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | File | Description | How to Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
  - CRITICAL: production outage, data loss, security breach, tenant data leak
  - HIGH:     invariant violated, auth bypass, missing audit log for mutation
  - MEDIUM:   soft invariant gap, audit log incompleteness, minor auth inconsistency
  - LOW:      informational, pre-existing limitation, hardening suggestion
-->

- **verdict**: approved

## Scope

変更対象ファイル: dealRepository / inquiryRepository / meetingRepository (検索メソッド追加), searchDeals / searchInquiries / searchMeetings (新設 usecase), searchLinkTargetsAction (新設 Server Action), LinkTargetPicker / ActionItemModal / ActionItemRow / TaskList (UI), linkTargetSearch.test.ts

レビュー観点:
1. **テナント分離** — 検索エンドポイントが組織を越えてエンティティを返さないこと
2. **監査ログ完全性** — FK 変更を含む更新操作が audit log に記録されること
3. **承認ワークフロー不変条件** — タスク紐づけ変更が承認ワークフローの状態機械を破壊しないこと
4. **単一紐づけ不変条件** — 設計判断 D1（soft invariant, UI 層強制）が正しく実装されていること

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | LOW | Audit log metadata — pre-existing | `updateActionItem.ts:94-104` | `updateActionItem` の audit log metadata は `updateData`（partial update object）のみを記録しており、変更前の FK 値（旧 dealId/inquiryId/meetingId）が含まれない。ピッカーで「案件A → 引合B」へ変更した場合、audit log は `{dealId: null, inquiryId: "B", meetingId: null}` を記録するが、変更前値（dealId: "A"）は記録されない。この制約は本変更以前から存在しており、本変更が問題を悪化させてはいない。 | 本変更のスコープ外。将来的に改善が必要な場合は `existing` の FK 値も metadata に含めることで "before/after diff" 形式にできる（例: `metadata: { before: { dealId: existing.dealId, ... }, after: updateData }`）。今回は対応不要。 |
| 2 | LOW | Rate limit key — search vs create | `actionItems.ts:328-334` | `searchLinkTargetsAction` のレートリミットは `RATE_LIMITS.createRequest` を使用している。検索（読み取り専用）と作成操作を同一ウィンドウ・同一上限でカウントしているため、ユーザーが検索を多用した場合に createActionItemAction のレートが圧迫される可能性がある。ただし `key` 値は `searchLinkTargets:${userId}` と `createActionItem:${userId}` で独立しているため、実際には互いに影響しない（別カウンタ）。安全側への保守実装として許容範囲。 | 将来、検索専用の `RATE_LIMITS.search` 定数（例: 60req/分）を設けることで意図をより明示できる。現時点では機能・セキュリティ上の問題なし。今回は対応不要。 |

## Invariant-by-Invariant Assessment

### 1. テナント分離 ✅ 完全

| チェック項目 | 実装 | 判定 |
|------------|------|------|
| `searchLinkTargetsAction` が organizationId をセッションから取得する | `session.user.organizationId` を使用。リクエストボディから受け取っていない | ✅ |
| `dealRepository.searchByTitle` が organizationId でフィルタする | `eq(deals.organizationId, organizationId)` を WHERE に含む | ✅ |
| `inquiryRepository.searchByTitle` が organizationId でフィルタする | `eq(inquiries.organizationId, organizationId)` を WHERE に含む | ✅ |
| `meetingRepository.searchBySummary` が organizationId でフィルタする | `eq(meetings.organizationId, organizationId)` を WHERE に含む | ✅ |
| `searchMeetings` usecase の親エンティティ取得が organizationId を渡す | `dealRepository.findById(meeting.dealId, organizationId)` / `inquiryRepository.findById(meeting.inquiryId, organizationId)` | ✅ |
| 未認証リクエストを拒否する | `auth()` → session null チェック → 即時 return | ✅ |
| 権限不足ユーザーを拒否する | `canPerform(session.user.role, "actionItem", "create")` — actionItem.create と actionItem.edit は同一ロールセット (ADMIN_MANAGER_MEMBER) のため、編集権限のあるユーザーは検索可能 | ✅ |

### 2. 監査ログ完全性 ✅ 維持

| 操作 | Audit Log | 判定 |
|------|-----------|------|
| `createActionItem` — タスク作成 | `action_item.create` (transaction 内) | ✅ 変更なし |
| `updateActionItem` — FK 変更を含む更新 | `action_item.update` with `metadata: updateData`（新 FK 値を含む） | ✅ FK 変更が記録される |
| `deleteActionItem` — タスク削除 | `action_item.delete` (transaction 内) | ✅ 変更なし |
| `toggleActionItemDone` — 完了トグル | `action_item.toggle` with `metadata: { done }` | ✅ 変更なし |
| `searchLinkTargetsAction` — 検索（読み取り専用） | Audit log なし | ✅ 正当。他の list/search 系 usecase と一致 |

### 3. 承認ワークフロー不変条件 ✅ 影響なし

- 本変更は ActionItem（タスク）エンティティのみを操作する
- 承認ワークフローの状態機械（`approval.approve` / `approval.reject` / `resubmitRequest` 等）はいずれも変更されていない
- ActionItem と承認 Request は独立したエンティティであり、FK による結合もない
- `/requests` の revalidatePath は呼ばれず、承認キャッシュへの干渉はない

### 4. 単一紐づけ不変条件 ✅ 設計判断 D1 に準拠

設計判断 D1: 「単一紐づけ強制は usecase に追加しない。ピッカー経由の呼び出し元（TaskList / ActionItemRow）が FK マッピングを担う」

| チェック項目 | 実装 | 判定 |
|------------|------|------|
| `createActionItem.ts` に FK 優先ロジックがない | usecase は dealId / inquiryId / meetingId を独立に受け取り、そのまま保存。`dealId: null` 等の強制コードなし | ✅ |
| `updateActionItem.ts` に FK 優先ロジックがない | 同様に、渡された値をそのまま `updateData` に格納 | ✅ |
| TaskList.tsx（作成パス）で FK を単一化している | `dealId = linkTarget?.type === "deal" ? linkTarget.id : null` のパターン（3 FK 全て） | ✅ |
| ActionItemRow.tsx（更新パス）で FK を単一化している | `handleSave` 内で同パターン。linkTarget が null の場合は全 FK null | ✅ |
| MeetingActionItemsSection からの作成で meetingId+dealId が両立できる | createActionItem usecase が FK 排他強制をしないため、既存動作を破壊しない | ✅ |
| テストが usecase 非改変を静的検証する | `createActionItem.ts` に `dealId: null` / `meetingId: null` 等のコードが含まれないことを assert | ✅ |
