# Tasks: 削除機能とフォーム整備

## T-01: 各 repository に deleteById メソッドを追加

- [x] `src/infrastructure/repositories/inquiryRepository.ts` に `deleteById(id, organizationId, tx?)` を追加する。`and(eq(inquiries.id, id), eq(inquiries.organizationId, organizationId))` で WHERE 条件を付与。戻り値は `void`。既存の `approvalTemplateRepository.deleteById` と同じパターン
- [x] `src/infrastructure/repositories/dealRepository.ts` に `deleteById(id, organizationId, tx?)` を追加する。同上のパターンで `deals` テーブルから削除
- [x] `src/infrastructure/repositories/contractRepository.ts` に `deleteById(id, organizationId, tx?)` を追加する。同上のパターンで `contracts` テーブルから削除

**Acceptance Criteria**:
- 3 つの repository に `deleteById` が export されている
- 全メソッドに `organizationId` 条件が含まれている
- 全メソッドがオプション引数 `tx?: Transaction` を受け取る
- `bun run build` が通る

---

## T-02: dealContactRepository に deleteAllByDeal メソッドを追加

- [x] `src/infrastructure/repositories/dealContactRepository.ts` に `deleteAllByDeal(dealId, organizationId, tx?)` を追加する
- [x] 実装: 既存の `deleteByDealAndContact` と同じテナント検証パターンを使う。`deals.organizationId` を経由して対象レコードの ID を取得し、`inArray` で全件削除する。対象が0件の場合は何もしない

**Acceptance Criteria**:
- `deleteAllByDeal(dealId, organizationId, tx?)` が export されている
- `deals.organizationId` によるテナント検証が含まれている
- `bun run build` が通る

---

## T-03: deleteInquiry usecase を追加

- [x] `src/application/usecases/deleteInquiry.ts` を作成する。引数: `{ id, organizationId, actorId }`。戻り値: `{ ok: true } | { ok: false; reason: string }`
- [x] `dealRepository.findByInquiryId(id, organizationId)` で案件の存在を確認する。存在する場合は `{ ok: false, reason: "案件が紐づいている引き合いは削除できません" }` を返す
- [x] チェック通過後、トランザクション内で `inquiryRepository.deleteById(id, organizationId, tx)` + `auditLogRepository.create({ action: "inquiry.delete", targetType: "inquiry", targetId: id, actorId, organizationId }, tx)` を実行する
- [x] `src/application/usecases/index.ts` に re-export を追加する

**Acceptance Criteria**:
- 案件が存在する場合にエラーを返す
- トランザクション内で削除 + 監査ログ記録が行われる
- index.ts に re-export がある
- `bun run build` が通る

---

## T-04: deleteDeal usecase を追加

- [x] `src/application/usecases/deleteDeal.ts` を作成する。引数: `{ id, organizationId, actorId }`。戻り値: `{ ok: true } | { ok: false; reason: string }`
- [x] `meetingRepository.findAllByDeal(id, organizationId)` で商談の存在を確認する。存在する場合は `{ ok: false, reason: "商談が紐づいている案件は削除できません" }` を返す
- [x] `contractRepository.findAllByDealId(id, organizationId)` で契約の存在を確認する。存在する場合は `{ ok: false, reason: "契約が紐づいている案件は削除できません" }` を返す
- [x] `dealRepository.findById(id, organizationId)` で案件を取得する。存在しない場合は `{ ok: false, reason: "案件が見つかりません" }` を返す
- [x] トランザクション内で以下を順次実行する:
  1. `dealContactRepository.deleteAllByDeal(id, organizationId, tx)` — 担当者を全件削除
  2. 案件に `inquiryId` がある場合、`inquiryRepository.updateStatus(inquiryId, organizationId, "new", inquiry.version, tx)` で引き合いステータスを `new` に戻す。引き合いの取得は `inquiryRepository.findById` で行い、version を取得する
  3. `dealRepository.deleteById(id, organizationId, tx)` — 案件を削除
  4. `auditLogRepository.create({ action: "deal.delete", targetType: "deal", targetId: id, actorId, organizationId }, tx)` — 監査ログ記録
- [x] `src/application/usecases/index.ts` に re-export を追加する

**Acceptance Criteria**:
- 商談が存在する場合にエラーを返す
- 契約が存在する場合にエラーを返す
- 担当者が自動削除される
- 引き合い経由の案件の場合、引き合いステータスが `new` に戻る
- トランザクション内で全操作が実行される
- 監査ログが記録される
- index.ts に re-export がある
- `bun run build` が通る

---

## T-05: deleteContract usecase を追加

- [x] `src/application/usecases/deleteContract.ts` を作成する。引数: `{ id, organizationId, actorId }`。戻り値: `{ ok: true } | { ok: false; reason: string }`
- [x] `invoiceRepository.findAllByContract(id, organizationId)` で請求の存在を確認する。存在する場合は `{ ok: false, reason: "請求が紐づいている契約は削除できません" }` を返す
- [x] チェック通過後、トランザクション内で `contractRepository.deleteById(id, organizationId, tx)` + `auditLogRepository.create({ action: "contract.delete", targetType: "contract", targetId: id, actorId, organizationId }, tx)` を実行する
- [x] `src/application/usecases/index.ts` に re-export を追加する

**Acceptance Criteria**:
- 請求が存在する場合にエラーを返す
- トランザクション内で削除 + 監査ログ記録が行われる
- index.ts に re-export がある
- `bun run build` が通る

---

## T-06: 削除用 Server Actions を追加

- [x] `src/app/actions/inquiries.ts` に `deleteInquiryAction(inquiryId: string)` を追加する。セッション取得 → admin / manager ガード → `deleteInquiry` usecase 呼び出し → `revalidatePath("/inquiries")`。戻り値: `ActionResult`
- [x] `src/app/actions/deals.ts` に `deleteDealAction(dealId: string)` を追加する。セッション取得 → admin / manager ガード → `deleteDeal` usecase 呼び出し → `revalidatePath("/deals")`。戻り値: `ActionResult`
- [x] `src/app/actions/contracts.ts` に `deleteContractAction(contractId: string)` を追加する。セッション取得 → admin / manager ガード → `deleteContract` usecase 呼び出し → `revalidatePath("/contracts")`。戻り値: `ActionResult`

**Acceptance Criteria**:
- 3 つのアクションが export されている
- 全アクションに `session.user.role !== "admin" && session.user.role !== "manager"` ガードがある
- organizationId はセッションから取得している
- `bun run build` が通る

---

## T-07: 引き合い詳細ページに削除ボタンを追加

- [x] `src/app/(dashboard)/inquiries/[id]/page.tsx` を修正する。`deal` が `null`（案件が紐づいていない）かつ `canChangeStatus` が `true` の場合に削除ボタンを表示する
- [x] 削除ボタン用の Client Component `DeleteInquiryButton.tsx` を `src/app/(dashboard)/inquiries/[id]/` に作成する。`deleteInquiryAction` を呼び出す。`window.confirm("この引き合いを削除しますか？")` で確認ダイアログを表示する。成功時に `router.push("/inquiries")` でリダイレクトする。エラー時はメッセージを表示する

**Acceptance Criteria**:
- 案件が紐づいていない引き合いの詳細ページに削除ボタンが表示される
- 案件が紐づいている場合は削除ボタンが表示されない
- 削除前に確認ダイアログが表示される
- 削除後に `/inquiries` にリダイレクトされる
- `bun run build` が通る

---

## T-08: 案件詳細ページに削除ボタンを追加

- [x] `src/app/(dashboard)/deals/[id]/page.tsx` を修正する。`dealMeetings.length === 0` かつ `dealContracts.length === 0` かつ `canChangePhase` が `true` の場合に削除ボタンを表示する
- [x] 削除ボタン用の Client Component `DeleteDealButton.tsx` を `src/app/(dashboard)/deals/[id]/` に作成する。`deleteDealAction` を呼び出す。`window.confirm("この案件を削除しますか？担当者は自動的に削除されます。")` で確認ダイアログを表示する。成功時に `router.push("/deals")` でリダイレクトする

**Acceptance Criteria**:
- 商談・契約が0件の案件の詳細ページに削除ボタンが表示される
- 商談または契約が存在する場合は削除ボタンが表示されない
- 削除前に確認ダイアログが表示される
- 削除後に `/deals` にリダイレクトされる
- `bun run build` が通る

---

## T-09: 契約詳細ページに削除ボタンを追加

- [x] `src/app/(dashboard)/contracts/[id]/page.tsx` を修正する。請求件数を取得する必要がある。`invoiceRepository.findAllByContract(id, organizationId)` を呼び出し、結果が空の場合かつ `canManage` が `true` のときに削除ボタンを表示する
- [x] 削除ボタン用の Client Component `DeleteContractButton.tsx` を `src/app/(dashboard)/contracts/[id]/` に作成する。`deleteContractAction` を呼び出す。`window.confirm("この契約を削除しますか？")` で確認ダイアログを表示する。成功時に `router.push("/contracts")` でリダイレクトする

**Acceptance Criteria**:
- 請求が0件の契約の詳細ページに削除ボタンが表示される
- 請求が存在する場合は削除ボタンが表示されない
- 削除前に確認ダイアログが表示される
- 削除後に `/contracts` にリダイレクトされる
- `bun run build` が通る

---

## T-10: 案件作成・編集フォームに担当者フィールドを追加

- [x] `src/app/(dashboard)/deals/new/page.tsx` を修正する。`listOrganizationUsers` usecase（または `userRepository.findByOrganization`）でユーザー一覧を取得し、`NewDealForm` に `users` props として渡す
- [x] `src/app/(dashboard)/deals/new/NewDealForm.tsx` を修正する。`users` props（`{ id: string; name: string }[]`）を追加する。`assigneeId`（営業担当）と `technicalLeadId`（技術担当）の `<Select>` プルダウンを追加する。選択肢は `users` 配列から生成。空選択可（未設定）
- [x] `src/app/(dashboard)/deals/[id]/edit/page.tsx` を修正する。ユーザー一覧を取得して `DealEditForm` に `users` props として渡す
- [x] `src/app/(dashboard)/deals/[id]/DealEditForm.tsx` を修正する。`users` props を追加する。`assigneeId` と `technicalLeadId` の `<Select>` プルダウンを追加する。`defaultValue` に `deal.assigneeId` / `deal.technicalLeadId` を設定する

**Acceptance Criteria**:
- 案件作成フォームに営業担当・技術担当の選択プルダウンが表示される
- 案件編集フォームに営業担当・技術担当の選択プルダウンが表示される
- 編集フォームでは既存の担当者がデフォルト選択されている
- 未設定（空）の選択が可能
- `bun run build` が通る

---

## T-11: 商談作成フォームにヒアリングデータ入力フィールドを追加

- [x] `src/app/(dashboard)/deals/[id]/meetings/new/DealMeetingForm.tsx` を修正する。`selectedType` が `"hearing"` の場合に、ヒアリング専用フィールド（challenge, budget, decisionMaker, timeline, competitors, notes）のテキスト入力を表示する
- [x] フォーム送信時に、ヒアリングフィールドの値を `hearingData` オブジェクトとして JSON シリアライズし、`formData.set("hearingData", JSON.stringify(...))` で送信する。種別が hearing 以外の場合は `hearingData` を送信しない
- [x] 各フィールドは任意入力（空でも送信可能）

**Acceptance Criteria**:
- 種別に「ヒアリング」を選択した場合にヒアリング入力フィールドが表示される
- 種別が hearing 以外の場合はヒアリング入力フィールドが表示されない
- 入力されたヒアリングデータが `hearingData` としてサーバーに送信される
- `bun run build` が通る

---

## T-12: 商談編集ページを追加

- [x] `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/edit/page.tsx` を作成する（Server Component）。URL パラメータ `id` と `meetingId` を取得。`meetingRepository.findById(meetingId, organizationId)` で商談を取得。`meeting.dealId !== id` の場合は `notFound()`。商談データを `EditMeetingForm` に渡す
- [x] `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/edit/EditMeetingForm.tsx` を作成する（`"use client"`）。`DealMeetingForm` のフォーム構造を踏襲し、以下のフィールドを持つ:
  - type: 種別選択（初期値: `meeting.type`）
  - date: 日時（初期値: `meeting.date`）
  - location: 場所（初期値: `meeting.location`）
  - summary: 議事録（初期値: `meeting.summary`）
  - internalAttendees: 社内参加者の動的追加・削除（初期値: `meeting.attendees.internal`）
  - externalAttendees: 社外参加者の動的追加・削除（初期値: `meeting.attendees.external`）。contactRegistrations は不要（編集時は担当者登録しない）
  - actionItems: アクションアイテムの追加・削除・内容変更・完了トグル（初期値: `meeting.actionItems`）
  - hearingData: 種別が hearing の場合のみ表示（初期値: `meeting.hearingData`）
- [x] フォーム送信時に `updateMeetingAction` を呼び出す。`useActionState` で状態管理。動的フィールドは JSON シリアライズして FormData に set する。成功時に `router.push(`/deals/${dealId}/meetings/${meetingId}`)` で商談詳細ページへ遷移する
- [x] `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/page.tsx` を修正する。ヘッダー領域に編集リンク（`/deals/${id}/meetings/${meetingId}/edit`）を追加する

**Acceptance Criteria**:
- `/deals/:id/meetings/:meetingId/edit` に既存商談の値が入ったフォームが表示される
- 種別、日時、場所、議事録、参加者、アクションアイテムを変更できる
- アクションアイテムの追加・削除・内容変更・完了トグルが可能
- 種別が hearing の場合にヒアリングデータを編集できる
- フォーム送信で `updateMeetingAction` が呼ばれる
- 商談詳細ページに編集リンクが表示される
- `bun run build` が通る

---

## T-13: 静的テスト — 削除 usecase のテナント分離と権限チェック

- [x] `src/__tests__/static/projectStructure.test.ts` に以下のテストを追加する
- [x] テスト: `inquiryRepository.ts` の `deleteById` メソッドのソースに `organizationId` が含まれることを確認する
- [x] テスト: `dealRepository.ts` の `deleteById` メソッドのソースに `organizationId` が含まれることを確認する
- [x] テスト: `contractRepository.ts` の `deleteById` メソッドのソースに `organizationId` が含まれることを確認する
- [x] テスト: `deleteInquiry.ts` のソースに `findByInquiryId`（案件存在チェック）が `deleteById` より前に呼ばれていることを確認する
- [x] テスト: `deleteDeal.ts` のソースに `findAllByDeal`（商談存在チェック）と `findAllByDealId`（契約存在チェック）が含まれることを確認する
- [x] テスト: `deleteContract.ts` のソースに `findAllByContract`（請求存在チェック）が `deleteById` より前に呼ばれていることを確認する
- [x] テスト: 3 つの削除 Server Action（`deleteInquiryAction` / `deleteDealAction` / `deleteContractAction`）のソースに `role !== "admin" && session.user.role !== "manager"` ガードまたは同等のロールチェックが含まれることを確認する
- [x] テスト: 3 つの削除 usecase のソースに `auditLogRepository.create` が含まれることを確認する

**Acceptance Criteria**:
- 全 deleteById の organizationId 条件がテストで検証される
- 依存チェックが削除より前に実行されていることがテストで検証される
- admin / manager ガードの存在がテストで検証される
- 監査ログ記録がテストで検証される
- `bun test` が全件 green

---

## T-14: 最終確認 — ビルド・型チェック・テスト

- [x] `bun run build` を実行し、ビルドが成功することを確認する
- [x] `bunx tsc --noEmit` を実行し、型チェックが通ることを確認する
- [x] `bun test` を実行し、全テストが green であることを確認する
- [x] `bun run lint` を実行し、lint エラーがないことを確認する

**Acceptance Criteria**:
- `bun run build` 成功
- `typecheck` green
- `bun test` 全件 green
- `bun run lint` エラーなし
