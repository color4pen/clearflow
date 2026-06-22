# Conformance Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:   implementation conforms to tasks.md, design.md, spec.md, and request.md
  - needs-fix:  one or more upstream artifacts are not satisfied by the implementation
  - escalation: conformance cannot be determined (missing artifacts, unresolvable ambiguity)
- The Findings table records the per-artifact judgment.
-->

- **verdict**: approved

## Conformance Findings

| Artifact | Conforms | Notes |
|----------|----------|-------|
| tasks.md | yes | 全 14 タスク（T-01〜T-14）のチェックボックスが [x] 済み。ビルド・型チェック・テスト・lint も verification-result.md で全件 passed を確認 |
| design.md | yes | D1〜D8 の全設計判断が実装に反映されている（詳細は下記） |
| spec.md | yes | 全 Requirements の SHALL/MUST が実装済み（詳細は下記） |
| request.md | yes | 受け入れ基準 17 項目すべて満たしている |

---

## Judgment Item 1: tasks.md — 全タスク完了

全チェックボックスが `[x]` 状態。verification-result.md（iter 1）で以下を確認:

- build: passed（Next.js 16, Turbopack, exit 0）
- typecheck: passed（`tsc --noEmit`, exit 0）
- test: passed（546 pass / 0 fail）
- lint: passed（errors 0, warnings は本 PR 以前からの pre-existing のみ）

---

## Judgment Item 2: spec.md — Requirements 適合

### Requirement: Inquiry deletion blocked when deal linked
- `deleteInquiry.ts`: `findByInquiryId` を `deleteById` より前に呼び出し、deal が存在すれば `{ ok: false, reason: "案件が紐づいている引き合いは削除できません" }` を返す。
- 静的テストで `findByInquiryId` の出現位置 < `deleteById` の出現位置を検証済み。

### Requirement: Deal deletion blocked when meetings or contracts linked
- `deleteDeal.ts`: `findAllByDeal`（商談）→ `findAllByDealId`（契約）の順でチェックし、各存在時にエラーを返す。
- 静的テストで両メソッドが `deleteById` より前に出現することを `toBeLessThan` で検証済み。

### Requirement: deal_contacts auto-deleted on deal deletion
- `deleteDeal.ts`: トランザクション内の第 1 ステップで `dealContactRepository.deleteAllByDeal` を呼び出し。
- `dealContactRepository.ts`: `deals.organizationId` を経由したテナント分離付きの SELECT→DELETE パターン。

### Requirement: Inquiry status reverted to "new" when deal deleted
- `deleteDeal.ts`: `deal.inquiryId` が存在する場合、`inquiryRepository.findById` で version を取得し `updateStatus(..., "new", inquiry.version, tx)` を呼び出す。
- 戻り値が `null`（楽観的ロック競合）の場合は `throw new Error(...)` でロールバックさせる実装が確認できる（code-review finding #1 対応済み）。

### Requirement: Contract deletion blocked when invoices linked
- `deleteContract.ts`: `findAllByContract` を `deleteById` より前にチェックし、存在すれば `{ ok: false, reason: "請求が紐づいている契約は削除できません" }` を返す。

### Requirement: Delete actions restricted to admin/manager
- `deleteInquiryAction` / `deleteDealAction` / `deleteContractAction` の 3 件すべてで `role !== "admin" && session.user.role !== "manager"` ガードを確認。
- 静的テストで 3 件の Server Action それぞれを検証済み。

### Requirement: Audit logs recorded on all deletions
- 3 削除 usecase すべてで `auditLogRepository.create` がトランザクション内に存在。
- 静的テストで各 usecase に `auditLogRepository.create` が含まれることを検証済み。

### Requirement: Delete buttons conditionally rendered
- `inquiries/[id]/page.tsx`: `canChangeStatus && !deal` の条件で `DeleteInquiryButton` を表示。
- `deals/[id]/page.tsx`: `canChangePhase && dealMeetings.length === 0 && dealContracts.length === 0` の条件で `DeleteDealButton` を表示。
- `contracts/[id]/page.tsx`: 請求0件かつ canManage の条件で `DeleteContractButton` を表示。

### Requirement: Deal forms include assigneeId / technicalLeadId
- `NewDealForm.tsx`: `users` props を受け取り、「営業担当」「技術担当」の `<Select>` を実装。
- `DealEditForm.tsx`: 同様のプルダウンを実装し、`defaultValue` に既存値を設定。

### Requirement: Hearing fields shown when type = "hearing"
- `DealMeetingForm.tsx`: `selectedType === "hearing"` の条件で challenge / budget / decisionMaker / timeline / competitors / notes フィールドを表示。送信時は `hearingData` を JSON シリアライズして FormData にセット。

### Requirement: Meeting edit page provided
- `/deals/[id]/meetings/[meetingId]/edit/page.tsx` が存在。Server Component として `meetingRepository.findById` で商談を取得し `EditMeetingForm` に渡す。
- `meeting.dealId !== id` の場合は `notFound()` でリジェクト。
- 商談詳細ページのヘッダーに編集リンクを確認（`/deals/${id}/meetings/${meetingId}/edit`）。

### Requirement: deleteById methods enforce tenant isolation
- `inquiryRepository.deleteById`: `and(eq(inquiries.id, id), eq(inquiries.organizationId, organizationId))` を確認。
- `dealRepository.deleteById` / `contractRepository.deleteById`: 同パターン。
- 静的テストで 3 件の `deleteById` に `organizationId` が含まれることを検証済み。

---

## Judgment Item 3: design.md — 設計判断適合

| Decision | Status | Evidence |
|----------|--------|---------|
| D1: 物理削除（soft delete 却下） | 適合 | 各 repository の `deleteById` は物理 DELETE 文。`is_deleted` フラグなし |
| D2: dealContacts 自動削除（削除ブロック却下） | 適合 | `deleteDeal.ts` でトランザクション冒頭に `deleteAllByDeal` を呼び出す |
| D3: 引き合いステータスを new に戻す | 適合 | `deleteDeal.ts` の `deal.inquiryId` 分岐で `updateStatus(…, "new", …)` を実行 |
| D4: 依存チェックは usecase 層 | 適合 | チェックロジックは全て usecase ファイル内に閉じている |
| D5: `deleteAllByDeal` を dealContactRepository に追加 | 適合 | `dealContactRepository.ts` に実装あり、deals テーブル JOIN でテナント分離 |
| D6: 削除ボタンの条件付き表示を Server Component で判定 | 適合 | 各詳細ページ（Server Component）で依存件数を取得してボタン表示を制御 |
| D7: EditMeetingForm を別コンポーネントとして新規作成 | 適合 | `EditMeetingForm.tsx` を独立実装（DealMeetingForm とは別ファイル） |
| D8: Server Component でユーザー一覧を取得してフォームに渡す | 適合 | `new/page.tsx` と `edit/page.tsx` で `listOrganizationUsers` を呼び出し `users` props として渡す |

---

## Judgment Item 4: request.md — 受け入れ基準

| 基準 | 判定 |
|------|------|
| `bun run build` が成功する | pass |
| `bun test` が全件 green | pass（546/0） |
| 案件が紐づいている引き合いを削除しようとするとエラーが返る | pass |
| 案件が紐づいていない引き合いを削除できる | pass |
| 商談・契約が紐づいている案件を削除しようとするとエラーが返る | pass |
| 商談・契約が紐づいていない案件を削除できる | pass |
| 案件削除時に引き合い経由の場合、引き合いのステータスが new に戻る | pass |
| 案件削除時に担当者（deal_contacts）が自動削除される | pass |
| 請求が紐づいている契約を削除しようとするとエラーが返る | pass |
| 請求が紐づいていない契約を削除できる | pass |
| 案件作成・編集フォームに営業担当・技術担当の選択がある | pass |
| 種別が hearing の商談作成時にヒアリング項目を入力できる | pass |
| 商談詳細ページに編集リンクがある | pass |
| 商談編集ページで議事録・参加者・アクションアイテムを変更できる | pass |
| 削除操作で監査ログが記録される | pass |
| 削除は admin / manager のみ実行可能 | pass |
| 依存方向 `actions → usecases → domain / infrastructure` を遵守 | pass |
| `typecheck` が green | pass |

---

## 補足: code-review findings の対応状況

| Finding | 内容 | 対応状況 |
|---------|------|---------|
| #1 (medium) | `deleteDeal.ts` の `updateStatus` 戻り値未検査 | 対応済み — `if (!updated) throw new Error(...)` が実装に含まれている |
| #2 (low) | `deleteDeal` 静的テストに順序検証なし | 対応済み — `expect(findMeetingIdx).toBeLessThan(deleteIdx)` 等の assertion が含まれている |
| #3 (low) | `deals/[id]/page.tsx` の未使用インポート（pre-existing） | スコープ外 — code-review で `Fix: no` と判定済み |
