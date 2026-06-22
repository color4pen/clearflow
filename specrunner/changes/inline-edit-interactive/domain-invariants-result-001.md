# Domain Invariants Review: inline-edit-interactive

- **reviewer**: domain-invariants
- **iteration**: 1
- **date**: 2026-06-22
- **verdict**: needs-fix

## 目的

テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。

---

## 調査範囲

`git diff main...HEAD` により確認したファイル（src/ 配下のみ）:

- `src/app/actions/inquiries.ts` (+4)
- `src/app/actions/deals.ts` (+30)
- `src/app/actions/contracts.ts` (+34)
- `src/app/actions/meetings.ts` (+11)
- `src/app/(dashboard)/deals/[id]/DealActionItemsSection.tsx` (新規)
- `src/app/(dashboard)/deals/[id]/DealInfoSection.tsx` (新規)
- `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/MeetingActionItemsSection.tsx` (新規)
- `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/MeetingSummarySection.tsx` (新規)
- `src/app/(dashboard)/contracts/[id]/ContractInfoSection.tsx` (新規)
- `src/app/(dashboard)/inquiries/[id]/InquiryInfoSection.tsx` (新規)
- `src/__tests__/actions/roleCheck.test.ts` (新規)

---

## 所見

### F-01: 引き合いフィールド更新で監査ログが記録されない [severity: high]

**場所**: `src/app/actions/inquiries.ts` — `updateInquiryAction`

`updateInquiryAction` は `inquiryRepository.update()` を直接呼び出している。usecase 層を経由しないため、引き合いのフィールド更新（件名・流入経路・内容）時に監査ログが一切記録されない。

```
src/app/actions/inquiries.ts:184–195
const { inquiryRepository } = await import("@/infrastructure/repositories");
const updated = await inquiryRepository.update(
  inquiryId,
  session.user.organizationId,
  { ... }
);
```

他の3エンティティとの比較:

| エンティティ | 更新パス | 監査ログ |
|---|---|---|
| deal | `updateDealAction` → `updateDeal` usecase | `deal.update` ✓ |
| contract | `updateContractAction` → `updateContract` usecase | `contract.update` ✓ |
| meeting | `updateMeetingAction` → `updateMeeting` usecase | `meeting.update` ✓ |
| inquiry | `updateInquiryAction` → `inquiryRepository.update()` 直接 | **なし** ✗ |

この違反はこの変更以前から存在する（edit ページでも同じコードパスを使用）。しかし本変更でインライン編集が追加されたことにより、件名・流入経路・内容の各フィールド保存のたびにこのパスが呼ばれ、**監査ログの欠損がより頻繁に発生する**状態となった。

他のエンティティはすべて usecase を経由して audit log を書いており、引き合いのみ欠落しているのは設計の一貫性を損なう。

**修正方針**: `updateInquiry` usecase を新規作成し（`updateDeal` と同様の構造）、`updateInquiryAction` から直接 repository を呼ぶ箇所をその usecase 呼び出しに置き換える。usecase 内でトランザクション内に `auditLogRepository.create({ action: "inquiry.update", ... })` を記録する。

---

### F-02: テナント分離は維持されている [severity: ok]

すべての Server Action は `session.user.organizationId` をサーバー側で取得し、repository および usecase 呼び出しに渡している。クライアントから organizationId を受け取るパスは存在しない。

- `updateInquiryAction` も `inquiryRepository.update(inquiryId, session.user.organizationId, ...)` の形式で WHERE 句に organizationId を含む — DB レベルのテナント分離は維持されている
- ページのサーバーコンポーネント（deals/page.tsx, inquiries/page.tsx 等）は `session!.user.organizationId` で全データフェッチを絞り込んでいる
- インライン編集コンポーネントへ渡す `editable` フラグはサーバーコンポーネントで算出し、クライアントには UI ヒントとして渡されるのみ。実際の権限チェックはサーバー側 Action で行われている

---

### F-03: ロールベースアクセス制御は正しく追加された [severity: ok]

本変更で `updateInquiryAction` と `updateMeetingAction` に admin/manager ロールチェックが追加された。

```typescript
// inquiries.ts (追加行)
if (session.user.role !== "admin" && session.user.role !== "manager") {
  return { message: "権限がありません" };
}
```

既存の `updateDealAction`・`updateContractAction` には変更前からロールチェックが存在しており、これで4アクション全てが統一された。`roleCheck.test.ts` で静的検証も追加されている。

---

### F-04: 案件フェーズ遷移の不変条件は維持されている [severity: ok]

`DealInfoSection` でフェーズ変更時に `updateDealAction` を呼び出しており、当 Action は `updateDealPhase` usecase を経由する。

```typescript
// deals.ts:246–256（変更前から存在）
const phaseRaw = formData.get("phase");
if (typeof phaseRaw === "string" && phaseRaw !== "") {
  const phaseResult = await updateDealPhase({
    dealId, organizationId, actorId,
    newPhase: phaseRaw as DealPhase,
  });
```

`updateDealPhase` usecase は `canDealTransition()` ドメインサービスで遷移可否を検証し、楽観的ロックを使用している。インライン編集への変更によってこのパスは迂回されていない。

won/lost 選択時の `window.confirm` はクライアント側の UX 保護であり、セキュリティの主軸ではない（サーバー側の domain rule が守護している）。

---

### F-05: 契約ステータス遷移の不変条件は維持されている [severity: ok]

契約ステータス変更（完了/解約）は `ContractStatusActions` ボタンのままであり、インライン編集対象外。`updateContractStatusAction` → `updateContractStatus` usecase → `canContractTransition()` の経路は変更されていない。

---

### F-06: 承認ワークフローは影響を受けていない [severity: ok]

承認リクエスト詳細のインライン化はスコープ外として明示されており、`src/app/actions/requests.ts` への変更はない。`approveRequest`・`rejectRequest`・`submitRequest` 等の承認 usecase は本変更の影響を受けていない。

---

## 判定

- **verdict**: needs-fix

### 必須修正

| # | 場所 | 内容 |
|---|---|---|
| R-01 | `src/application/usecases/updateInquiry.ts` (新規) | `updateDeal` と同様に、トランザクション内で `inquiryRepository.update()` と `auditLogRepository.create({ action: "inquiry.update" })` を呼ぶ usecase を作成する |
| R-02 | `src/app/actions/inquiries.ts:184–195` | `inquiryRepository.update()` 直接呼び出しを `updateInquiry` usecase 呼び出しに置き換える |

### 補足

F-02〜F-06 はすべて問題なし。R-01/R-02 の対応のみで承認可能。
