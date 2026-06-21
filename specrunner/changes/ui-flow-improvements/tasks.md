# Tasks: UI動線改善

## T-01: labels.ts に dealContactRoleLabels を追加

- [ ] `src/app/(dashboard)/labels.ts` に `dealContactRoleLabels` を追加する。値: `{ key_person: "キーマン", decision_maker: "決裁者", technical: "技術担当", other: "その他" }`
- [ ] 型は `Record<string, string>` とし、既存の `statusLabels` 等と同じ export パターンに揃える

**Acceptance Criteria**:
- `dealContactRoleLabels` が `labels.ts` から export されている
- 4つのロール（key_person, decision_maker, technical, other）のラベルが定義されている
- `bun run build` が通る

---

## T-02: createInquiryAction を拡張して新規顧客同時作成をサポート

- [ ] `src/app/actions/inquiries.ts` の `createInquirySchema` に `newClientName: z.string().min(1).optional()` を追加する
- [ ] `CreateInquiryState` の `errors` 型に `newClientName?: string[]` を追加する
- [ ] `createInquiryAction` のバリデーション後、`parsed.data.newClientName` が存在し `parsed.data.clientId` が未指定の場合、`createClient` UC を呼び出す。引数: `{ name: parsed.data.newClientName, organizationId, actorId }` （industry/size/address/notes は省略）
- [ ] `createClient` が `{ ok: false }` を返した場合、`{ message: result.reason }` を返す
- [ ] `createClient` が `{ ok: true }` を返した場合、得られた `client.id` を `createInquiry` の `clientId` に渡す
- [ ] `createClient` を `@/application/usecases` から import する（既に `createInquiry` と同じパスから export 済み）
- [ ] FormData から `newClientName` を取得するロジックを追加する。空文字列は `undefined` として扱う

**Acceptance Criteria**:
- `newClientName` が FormData に含まれる場合、`createClient` UC が呼ばれる
- `clientId` が指定されている場合は `newClientName` を無視し、既存の顧客紐づけロジックが動く
- `createClient` 失敗時にエラーメッセージが返される
- `createClient` 成功時に得られた `clientId` で `createInquiry` が呼ばれる
- 依存方向 `actions → usecases` を遵守している
- `bun run build` が通る

---

## T-03: InquiryForm の顧客選択に「新規登録」オプションを追加

- [ ] `src/app/(dashboard)/inquiries/new/InquiryForm.tsx` の顧客 `Select` に `<option value="__new__">新規登録</option>` を追加する（「未定」の次、既存顧客リストの前）
- [ ] `useState` で `clientMode: "existing" | "new"` を管理する。Select の `onChange` で `__new__` が選択されたら `"new"` に切り替える
- [ ] `clientMode === "new"` の場合、Select の下に企業名入力フィールド（`<Input name="newClientName" placeholder="企業名" required />`）を表示する
- [ ] `clientMode === "new"` の場合、`clientId` の hidden input には空文字列を設定するか、Select の value を `__new__` にしたまま FormData に含めない（Action 側で `clientId` が `__new__` や空文字列の場合は UUID バリデーションで除外される）
- [ ] `clientMode === "existing"` に戻った場合、`newClientName` フィールドを非表示にする
- [ ] `state.errors?.newClientName` がある場合にエラーメッセージを表示する

**Acceptance Criteria**:
- 顧客選択ドロップダウンに「新規登録」オプションが表示される
- 「新規登録」を選択すると企業名入力フィールドが表示される
- 既存顧客を選択し直すと企業名フィールドが非表示になる
- 新規顧客名を入力してフォーム送信すると、顧客と引き合いが同時に作成される
- `bun run build` が通る

---

## T-04: 案件詳細の商談履歴テーブルを拡充

- [ ] `src/app/(dashboard)/deals/[id]/page.tsx` の商談履歴 DataTable の columns に以下の列を追加する:
  - `location`（場所）: `row.location ?? "-"`
  - `attendees`（参加者数）: `String(row.attendees.internal.length + row.attendees.external.length)`、`align: "right"`
  - `actionItems`（AI件数）: `String(row.actionItems.length)`、`align: "right"`
  - `link`（詳細）: `row.inquiryId` が存在すれば `/inquiries/${row.inquiryId}/meetings/${row.id}`、そうでなければ `/deals/${id}/meetings/${row.id}` へのリンク
- [ ] 列の順序は引き合い詳細の商談テーブルに合わせる: type, date, location, attendees, actionItems, link
- [ ] `Link` コンポーネントの import を確認する（既に import 済み）

**Acceptance Criteria**:
- 案件詳細の商談テーブルに種別、日時、場所、参加者数、AI件数、詳細リンクの6列が表示される
- 引き合い経由の商談は `/inquiries/${inquiryId}/meetings/${meetingId}` へリンクする
- 案件直紐づきの商談は `/deals/${dealId}/meetings/${meetingId}` へリンクする
- 引き合い詳細の商談テーブルと同等の情報量になっている
- `bun run build` が通る

---

## T-05: 案件商談詳細ページの作成

- [ ] `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/page.tsx` を作成する（Server Component）
- [ ] `params` から `id`（dealId）と `meetingId` を取得する
- [ ] `auth()` でセッションを取得し、`meetingRepository.findById(meetingId, organizationId)` で商談を取得する。見つからない場合は `notFound()`。取得した `meeting.dealId !== id` の場合も `notFound()` を返す（URL の dealId と商談の紐づけが一致しない場合のリソース帰属検証）
- [ ] ツールバーに「商談詳細」のタイトルとパンくず（案件一覧 > 案件詳細 > 商談詳細）を表示する
- [ ] 商談情報（種別・日時・場所）、参加者（社内・社外）、議事録、ヒアリング項目（hearing の場合のみ）、アクションアイテムを表示する
- [ ] 表示構造は `inquiries/[id]/meetings/[meetingId]/page.tsx` に準じるが、編集機能（MeetingDetail Client Component）は含めない（表示のみ）
- [ ] `meetingTypeLabels` は `labels.ts` から import する（引き合い側ではローカル定義されているが、共通化する）
- [ ] `src/app/(dashboard)/inquiries/[id]/meetings/[meetingId]/page.tsx` のローカル `meetingTypeLabels` 定義を削除し、`labels.ts` からの import に統一する（既存ページとの並存を防ぐ）

**Acceptance Criteria**:
- `/deals/${dealId}/meetings/${meetingId}` にアクセスすると商談詳細が表示される
- 存在しない meetingId の場合 404 が表示される
- 種別、日時、場所、参加者、議事録、アクションアイテムが表示される
- hearing タイプの場合はヒアリング項目が表示される
- パンくずが案件側のパスを表示する
- `bun run build` が通る

---

## T-06: 案件担当者のユースケースを追加（addDealContact, removeDealContact）

- [ ] `src/application/usecases/addDealContact.ts` を作成する。引数: `{ dealId, contactId, role, organizationId, actorId }`。処理: `dealContactRepository.create` でテナント検証付きの担当者作成 + `auditLogRepository.create`（action: `deal_contact.create`, targetType: `deal_contact`）を同一トランザクション内で実行する。重複追加時（unique 制約違反）は `{ ok: false, reason: "この担当者はすでに登録されています" }` を返す。戻り値: `{ ok: true, dealContact } | { ok: false, reason: string }`
- [ ] `src/application/usecases/removeDealContact.ts` を作成する。引数: `{ dealId, contactId, organizationId, actorId }`。処理: `dealContactRepository.deleteByDealAndContact` で削除 + `auditLogRepository.create`（action: `deal_contact.delete`）を実行する。`deleteByDealAndContact` は内部でテナント検証済み。戻り値: `{ ok: true } | { ok: false, reason: string }`
- [ ] `src/application/usecases/index.ts` に両方を re-export する

**Acceptance Criteria**:
- `addDealContact` と `removeDealContact` が usecases/index.ts から export されている
- 両 UC がトランザクション内で監査ログを記録する（addDealContact は `dealContactRepository.create` が tx 引数を受け取るため tx 内で実行可能）
- `removeDealContact` は `deleteByDealAndContact` を呼び出しテナント検証が行われる
- `bun run build` が通る

---

## T-07: 案件担当者管理の Server Actions を追加

- [ ] `src/app/actions/dealContacts.ts` を新規作成する。`"use server"` ディレクティブを先頭に記述
- [ ] `addDealContactAction(dealId: string, formData: FormData)` を追加する。セッション取得 → zod バリデーション（contactId: UUID 必須、role: `"key_person" | "decision_maker" | "technical" | "other"` の enum） → `addDealContact` UC 呼び出し → `revalidatePath(\`/deals/${dealId}\`)`。戻り値: `ActionResult`
- [ ] `removeDealContactAction(dealId: string, formData: FormData)` を追加する。セッション取得 → zod バリデーション（`contactId: z.string().uuid()`）→ `checkRateLimit` → `removeDealContact` UC 呼び出し → `revalidatePath(\`/deals/${dealId}\`)`。戻り値: `ActionResult`
- [ ] `addDealContactAction` にも `checkRateLimit` を適用する（既存 Action と同様）
- [ ] `ActionResult` 型は `src/app/actions/requests.ts` から import する（既存パターン）

**Acceptance Criteria**:
- `addDealContactAction` と `removeDealContactAction` が export されている
- 両 Action がセッションから organizationId を取得している
- `addDealContactAction` と `removeDealContactAction` の両方に zod バリデーションが適用されている
- 両 Action に `checkRateLimit` が適用されている
- revalidatePath で案件詳細ページが再検証される
- `bun run build` が通る

---

## T-08: 案件詳細ページに担当者セクションを追加

- [ ] `src/app/(dashboard)/deals/[id]/page.tsx` のデータ取得で `dealContactRepository.findByDeal(deal.id, organizationId)` と `clientRepository.findContactsByClientId(inquiry?.clientId)` を `Promise.all` に追加する（`clientId` が null の場合は空配列を返す）
- [ ] 「フェーズ変更」セクションの後、「商談履歴」セクションの前に「担当者」セクション（`SectionCard`）を追加する
- [ ] `src/app/(dashboard)/deals/[id]/DealContactsSection.tsx` を Client Component として作成する（`"use client"`）
- [ ] Props: `dealId: string`, `dealContacts: DealContact[]`, `clientContacts: ClientContact[]`, `clientId: string | null`
- [ ] 現在の担当者一覧を表示する。`dealContacts` と `clientContacts` を `contactId` で結合し、各行に名前、部署、役職、ロール（`dealContactRoleLabels` でラベル化）、削除ボタンを表示する
- [ ] 追加フォーム（`clientId` が null の場合は非表示）: ClientContact のプルダウン（既に追加済みの contact を除外）、ロールのプルダウン（`dealContactRoleLabels` から生成）、「追加」ボタン
- [ ] 追加ボタンのクリックで `addDealContactAction` を呼び出す（form の submit）
- [ ] 削除ボタンのクリックで `removeDealContactAction` を呼び出す（form の submit、確認なし）
- [ ] `dealContactRoleLabels` を `@/app/(dashboard)/labels` から import する
- [ ] 担当者がいない場合は「担当者が登録されていません」と表示する

**Acceptance Criteria**:
- 案件詳細に「担当者」セクションが表示される
- 担当者一覧に名前、部署、役職、ロールが表示される
- ClientContact を選択してロールを指定して追加できる
- 削除ボタンで担当者を即座に削除できる
- clientId が null の場合、追加フォームが非表示になる
- `bun run build` が通る

---

## T-09: createClientContact ユースケースを追加

- [ ] `src/application/usecases/createClientContact.ts` を作成する。引数: `{ clientId, name, organizationId, actorId, department?: string | null, position?: string | null, email?: string | null, phone?: string | null }`
- [ ] `clientRepository.findById(clientId, organizationId)` でテナント検証。見つからない場合は `{ ok: false, reason: "顧客が見つかりません" }` を返す
- [ ] `clientRepository.createContact` で担当者を作成する
- [ ] `auditLogRepository.create`（action: `client_contact.create`, targetType: `client_contact`）で監査ログを記録する
- [ ] 戻り値: `{ ok: true, contact: ClientContact } | { ok: false, reason: string }`
- [ ] `src/application/usecases/index.ts` に re-export する

**Acceptance Criteria**:
- `createClientContact` が usecases/index.ts から export されている
- テナント検証（clientId が organizationId に属するか）が行われている
- 担当者作成と監査ログ記録が行われている
- `bun run build` が通る

---

## T-10: createMeetingAction を拡張して担当者登録をサポート

- [ ] `src/app/actions/meetings.ts` の `createMeetingSchema` に `clientId: z.string().uuid().optional()` を追加する
- [ ] `createMeetingSchema` に `contactRegistrations: z.array(z.object({ name: z.string(), register: z.boolean() })).optional().default([])` を追加する
- [ ] `createMeetingAction` で FormData から `clientId` と `contactRegistrations`（JSON 文字列）を取得する
- [ ] 商談作成成功後、`contactRegistrations` の中で `register: true` のエントリについて、`clientId` が存在する場合に `createClientContact` UC を呼び出す。引数: `{ clientId, name: entry.name, organizationId, actorId }`
- [ ] 担当者登録が一部失敗しても商談作成の成功レスポンスを返す（担当者登録は best-effort）
- [ ] `createClientContact` を `@/application/usecases` から import する

**Acceptance Criteria**:
- `clientId` と `contactRegistrations` が FormData から受け取れる
- 商談作成後、`register: true` の参加者について `createClientContact` が呼ばれる
- `clientId` が未指定の場合は担当者登録をスキップする
- 担当者登録失敗時も商談作成は成功として返される
- 依存方向 `actions → usecases` を遵守している
- `bun run build` が通る

---

## T-11: MeetingForm / DealMeetingForm の外部参加者セクションを拡張

- [ ] `src/app/(dashboard)/inquiries/[id]/meetings/new/MeetingForm.tsx` の Props に `clientId: string | null` を追加する
- [ ] `externalAttendees` の型を `string[]` から `{ name: string; registerAsContact: boolean }[]` に拡張する。初期値: `[{ name: "", registerAsContact: false }]`
- [ ] 各外部参加者の行に「顧客担当者として登録」チェックボックスを追加する。`clientId` が null の場合はチェックボックスを非表示にする
- [ ] フォーム送信時、`externalAttendees` は従来通り名前の配列として FormData にセットし、別途 `contactRegistrations` に `{ name, register: registerAsContact }` の配列を JSON としてセットする
- [ ] `clientId` を hidden input としてフォームに含めるか、FormData に直接セットする
- [ ] `src/app/(dashboard)/inquiries/[id]/meetings/new/page.tsx` で引き合いの `clientId` を取得し、`MeetingForm` に `clientId={inquiry.clientId}` として渡す
- [ ] `src/app/(dashboard)/deals/[id]/meetings/new/DealMeetingForm.tsx` にも同様の変更を行う。Props に `clientId: string | null` を追加し、外部参加者にチェックボックスを追加する
- [ ] `src/app/(dashboard)/deals/[id]/meetings/new/page.tsx` で案件の引き合いを取得し、引き合いの `clientId` を `DealMeetingForm` に渡す。`inquiryRepository.findById(deal.inquiryId, organizationId)` で取得する

**Acceptance Criteria**:
- 引き合い商談フォームの外部参加者にチェックボックスが表示される（clientId が null でない場合）
- 案件商談フォームの外部参加者にチェックボックスが表示される（clientId が null でない場合）
- clientId が null の場合はチェックボックスが非表示
- チェックされた参加者の情報が `contactRegistrations` として FormData に含まれる
- clientId が FormData に含まれる
- `bun run build` が通る

---

## T-12: シードデータの修正

- [ ] `src/infrastructure/seed.ts` の deal_contacts セクションを修正する。`wonDeal` に `techContact1`（key_person）に加えて、`鈴木 花子`（techClient の2人目の担当者）を `technical` ロールで追加する
- [ ] `鈴木 花子` の insert 結果を変数に保持するよう修正する（`returning()` を追加して contactId を取得）
- [ ] ログメッセージを `"✅ Created deal contacts (3 total)"` に更新する

**Acceptance Criteria**:
- `wonDeal` に key_person と technical の2つのロールで担当者が紐づいている
- シードデータに合計3件の deal_contacts がある
- `bun run build` が通る

---

## T-13: テスト — 依存方向・テナント分離・認証ガードの静的検証

- [ ] `src/__tests__/static/projectStructure.test.ts` に以下のテストを追加する
- [ ] テスト: `src/app/actions/dealContacts.ts` が `session.user.organizationId` を使用していることを確認する
- [ ] テスト: `src/application/usecases/addDealContact.ts` のソースに `auditLogRepository` の呼び出しが含まれることを確認する
- [ ] テスト: `src/application/usecases/removeDealContact.ts` のソースに `auditLogRepository` の呼び出しが含まれることを確認する
- [ ] テスト: `src/application/usecases/createClientContact.ts` のソースに `findById` と `createContact` の呼び出しが含まれることを確認する
- [ ] テスト: `src/app/actions/inquiries.ts` のソースに `createClient` の import が含まれることを確認する（新規顧客同時作成機能）
- [ ] テスト: `src/app/(dashboard)/labels.ts` に `dealContactRoleLabels` が定義されていることを確認する

**Acceptance Criteria**:
- 新規 Action のテナント分離がテストで検証される
- 新規 UC の監査ログ記録がテストで検証される
- `labels.ts` の `dealContactRoleLabels` 定義がテストで検証される
- `bun test` が全件 green

---

## T-14: 最終確認 — ビルド・型チェック・テスト

- [ ] `bun run build` を実行し、ビルドが成功することを確認する
- [ ] `bunx tsc --noEmit` を実行し、型チェックが通ることを確認する
- [ ] `bun test` を実行し、全テストが green であることを確認する
- [ ] `bun run lint` を実行し、lint エラーがないことを確認する

**Acceptance Criteria**:
- `bun run build` 成功
- `typecheck` green
- `bun test` 全件 green
- `bun run lint` エラーなし
