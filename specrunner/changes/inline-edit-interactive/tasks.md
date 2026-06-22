# Tasks: 詳細画面のインタラクティブ編集

## T-01: InlineEditText コンポーネントを作成する

- [ ] `src/app/components/InlineEditText.tsx` を新規作成する（`"use client"`）
- [ ] props: `value: string`, `onSave: (newValue: string) => Promise<{ success: boolean; message?: string }>`, `editable: boolean`, `placeholder?: string`, `className?: string`
- [ ] 表示モード: テキスト表示。`editable=true` のとき、クリック（またはホバー時の編集アイコン表示）で編集モードに切り替え
- [ ] 編集モード: `Input` コンポーネント（`src/app/components/FormField.tsx`）を使用。Enter で保存、Escape でキャンセル、ブラーで保存
- [ ] 保存中は `disabled` 状態にし、「保存中...」等のフィードバックを表示
- [ ] `onSave` が `{ success: false }` を返した場合、エラーメッセージをフィールド下部に赤字で表示
- [ ] 保存成功時に `router.refresh()` を呼ばない（呼び出し元で制御）。ただし `isEditing` を false にして表示モードに戻す
- [ ] `editable=false` のときはテキスト表示のみで、クリックしても反応しない
- [ ] 値が空文字の場合は `placeholder` または `-` を薄い色で表示

**Acceptance Criteria**:
- `editable=true` でクリック→Input 表示→Enter で onSave 呼び出し→成功時に表示モード復帰
- `editable=false` でクリックしても編集モードに切り替わらない
- onSave が失敗を返した場合、エラーメッセージが表示される

## T-02: InlineEditTextarea コンポーネントを作成する

- [ ] `src/app/components/InlineEditTextarea.tsx` を新規作成する（`"use client"`）
- [ ] props: `value: string | null`, `onSave: (newValue: string) => Promise<{ success: boolean; message?: string }>`, `editable: boolean`, `placeholder?: string`, `rows?: number`
- [ ] 表示モード: `whitespace-pre-wrap` でテキスト表示。`editable=true` のとき、クリックで編集モードに切り替え
- [ ] 編集モード: `Textarea` コンポーネントを使用。保存ボタンとキャンセルボタンを表示（DealNotesSection のパターンと同様）
- [ ] ブラーでは保存しない（Textarea の操作性を損なうため）。保存ボタンクリックのみで保存
- [ ] Escape でキャンセル（元の値に復帰して表示モードに戻す）
- [ ] 値が null/空の場合は `placeholder` または「未入力」を薄い色で表示

**Acceptance Criteria**:
- クリック→Textarea 表示→保存ボタンで onSave 呼び出し→成功時に表示モード復帰
- ブラーでは保存されない
- キャンセルボタンで編集前の値に戻る

## T-03: InlineEditSelect コンポーネントを作成する

- [ ] `src/app/components/InlineEditSelect.tsx` を新規作成する（`"use client"`）
- [ ] props: `value: string`, `options: Array<{ value: string; label: string }>`, `onSave: (newValue: string) => Promise<{ success: boolean; message?: string }>`, `editable: boolean`, `onBeforeSave?: (newValue: string) => boolean | Promise<boolean>`
- [ ] 表示モード: ラベルテキスト表示（`options` から `value` に対応する `label` を表示）。`editable=true` のとき、クリックで Select 表示に切り替え
- [ ] 編集モード: `Select` コンポーネントを使用。値変更（onChange）で即保存
- [ ] `onBeforeSave` が指定されている場合、保存前に呼び出す。`false` を返したら保存をキャンセルし元の値に戻す（won/lost 時の confirm 用）
- [ ] 保存後にブラーまたは保存成功で表示モードに戻す
- [ ] `editable=false` のときはラベルテキスト表示のみ

**Acceptance Criteria**:
- クリック→Select 表示→値変更で onSave 呼び出し→成功時に表示モード復帰
- `onBeforeSave` が false を返すと保存されず元の値に戻る
- `editable=false` でテキスト表示のみ

## T-04: InlineEditDate コンポーネントを作成する

- [ ] `src/app/components/InlineEditDate.tsx` を新規作成する（`"use client"`）
- [ ] props: `value: string | null`（ISO 日付文字列）, `onSave: (newValue: string) => Promise<{ success: boolean; message?: string }>`, `editable: boolean`, `displayFormat?: (date: string) => string`
- [ ] 表示モード: フォーマット済み日付テキスト。デフォルトは `toLocaleDateString("ja-JP")` 形式。null の場合は `-` を表示
- [ ] 編集モード: `<input type="date">` を使用。値変更で保存
- [ ] `editable=false` のときは日付テキスト表示のみ

**Acceptance Criteria**:
- 日付テキストをクリック→date input 表示→日付選択で onSave 呼び出し
- null 値で `-` が表示される
- `editable=false` でテキスト表示のみ

## T-05: InlineEditMoney コンポーネントを作成する

- [ ] `src/app/components/InlineEditMoney.tsx` を新規作成する（`"use client"`）
- [ ] props: `value: number | null`, `onSave: (newValue: string) => Promise<{ success: boolean; message?: string }>`, `editable: boolean`
- [ ] 表示モード: `¥` + カンマ区切り（`toLocaleString("ja-JP")`）。null の場合は `-` を表示
- [ ] 編集モード: `MoneyInput` コンポーネントの入力ロジック（数字のみ入力、hidden フィールドに数値を格納）を参考にしつつ、インライン編集用に Input を表示。Enter またはブラーで保存
- [ ] `onSave` には数値文字列を渡す（Server Action の FormData に合わせる）
- [ ] `editable=false` のときは金額テキスト表示のみ

**Acceptance Criteria**:
- `¥1,000,000` 形式で表示される
- クリック→数値入力→Enter で onSave 呼び出し
- null 値で `-` が表示される

## T-06: コンポーネントを index.ts に export 追加する

- [ ] `src/app/components/index.ts` に `InlineEditText`, `InlineEditTextarea`, `InlineEditSelect`, `InlineEditDate`, `InlineEditMoney` の export を追加する

**Acceptance Criteria**:
- `import { InlineEditText, InlineEditTextarea, InlineEditSelect, InlineEditDate, InlineEditMoney } from "@/app/components"` が動作する

## T-07: 引き合い詳細ページをインライン編集に対応させる

- [ ] `src/app/(dashboard)/inquiries/[id]/InquiryInfoSection.tsx` を新規作成する（`"use client"`）
- [ ] props: `inquiry: { id, title, source, description, clientId, assigneeId }`, `editable: boolean`, `clientName: string | null`
- [ ] 件名: InlineEditText で編集。`onSave` で `updateInquiryAction(inquiry.id, {}, formData)` を呼び出す。フルフォームの FormData を構築する（updateInquiryAction は全フィールド必須のため、変更しないフィールドも既存値をセットする）
- [ ] 流入経路: InlineEditSelect で編集。options は `sourceLabels` から生成
- [ ] 内容: InlineEditTextarea で編集
- [ ] ステータスはインライン編集対象外（InquiryActions がそのまま担当）
- [ ] 顧客はリンク表示のまま維持（変更は編集ページ）
- [ ] 作成日は表示のみ（変更不可）
- [ ] `src/app/(dashboard)/inquiries/[id]/page.tsx` を修正して、引き合い情報セクションの dl 部分を `InquiryInfoSection` に置き換える。`editable` は `session.user.role === "admin" || session.user.role === "manager"` で算出
- [ ] 「編集」リンクは残す

**Acceptance Criteria**:
- admin/manager で件名をクリック→Input→Enter→保存される
- member で件名クリック→反応なし
- 流入経路を Select で変更→即保存
- 内容を Textarea で編集→保存ボタンで保存

## T-08: 案件詳細ページをインライン編集に対応させる

- [ ] `src/app/(dashboard)/deals/[id]/DealInfoSection.tsx` を新規作成する（`"use client"`）
- [ ] props: `deal: { id, title, phase, estimatedAmount, estimatedStartDate, estimatedEndDate, contractType, createdAt }`, `editable: boolean`
- [ ] 案件名: InlineEditText で編集。`onSave` で `updateDealAction(deal.id, formData)` を呼ぶ（変更フィールドのみ FormData にセット）
- [ ] フェーズ: InlineEditSelect で編集。options は `phaseLabels` から生成。`onBeforeSave` で won/lost 時に `window.confirm("フェーズを「受注」に変更しますか？")` / `window.confirm("フェーズを「失注」に変更しますか？")` を挟む。FormData に `phase` をセットして `updateDealAction` を呼ぶ
- [ ] 想定金額: InlineEditMoney で編集
- [ ] 想定開始日 / 想定終了日: InlineEditDate で編集
- [ ] 契約種別: InlineEditSelect で編集。options は `contractTypeLabels` から生成。空の選択肢（`{ value: "", label: "-" }`）を先頭に追加
- [ ] 作成日は表示のみ
- [ ] `src/app/(dashboard)/deals/[id]/page.tsx` を修正して、案件情報セクションの dl 部分を `DealInfoSection` に置き換える。`editable` は既存の `canChangePhase` を流用

**Acceptance Criteria**:
- フェーズを「受注」に変更→確認ダイアログ→OK で保存
- フェーズを「交渉中」に変更→確認なしで即保存
- 想定金額をクリック→数値入力→保存
- 開始日をクリック→日付選択→保存

## T-09: 案件詳細にアクションアイテム集約セクションを追加する

- [ ] `src/app/(dashboard)/deals/[id]/DealActionItemsSection.tsx` を新規作成する（`"use client"`）
- [ ] props: `items: Array<{ meetingId: string; meetingLabel: string; actionItem: ActionItem; index: number }>`, `allMeetingActionItems: Array<{ meetingId: string; actionItems: ActionItem[] }>`, `editable: boolean`
- [ ] 各アイテムをチェックボックス付きで表示。チェックボックスの左に完了/未完了状態、右にアイテムの description、assignee、dueDate、商談名（meetingLabel）を表示
- [ ] 完了済みアイテムは `line-through` + `text-text-muted` スタイル
- [ ] チェックボックスクリックで `updateMeetingAction` を呼び出す。該当 meetingId の全 actionItems を取得し、対象 index の `done` を反転させた配列を FormData の `actionItems` フィールドに JSON で送信。`meetingId` も FormData にセット
- [ ] アイテムがない場合は「アクションアイテムはありません」を表示
- [ ] `editable=false` のとき、チェックボックスは `disabled`
- [ ] `src/app/(dashboard)/deals/[id]/page.tsx` を修正して、商談履歴セクションの前にアクションアイテム集約セクションを追加する
- [ ] サーバーコンポーネント側で `dealMeetings` から actionItems を抽出し、`meetingLabel` は `meetingTypeLabels[m.type] + " " + m.date.toLocaleDateString("ja-JP")` の形式で生成する

**Acceptance Criteria**:
- 案件詳細に「アクションアイテム」セクションが表示される
- 未完了アイテムにチェックを入れると done=true で保存される
- 完了アイテムのチェックを外すと done=false で保存される
- 各アイテムに商談名が表示される
- アイテム0件で「アクションアイテムはありません」が表示される
- member ロールでチェックボックスが disabled

## T-10: 契約詳細ページをインライン編集に対応させる

- [ ] `src/app/(dashboard)/contracts/[id]/ContractInfoSection.tsx` を新規作成する（`"use client"`）
- [ ] props: `contract: { id, title, contractType, amount, startDate, endDate, paymentTerms, renewalType, renewalCycle, createdAt }`, `editable: boolean`
- [ ] 契約名: InlineEditText で編集。`onSave` で `updateContractAction(contract.id, formData)` を呼ぶ
- [ ] ステータスはインライン編集対象外（ContractStatusActions がそのまま担当）
- [ ] 契約種別: InlineEditSelect。options は `contractTypeLabels` から生成
- [ ] 金額: InlineEditMoney で編集
- [ ] 開始日 / 終了日: InlineEditDate で編集
- [ ] 支払条件: InlineEditText で編集
- [ ] 更新種別: InlineEditSelect。options は `renewalTypeLabels` から生成
- [ ] 更新サイクル: InlineEditText で編集
- [ ] 作成日は表示のみ
- [ ] `src/app/(dashboard)/contracts/[id]/page.tsx` を修正して、契約情報セクションの dl 部分を `ContractInfoSection` に置き換える。`editable` は既存の `canManage` を流用

**Acceptance Criteria**:
- 金額をクリック→数値入力→保存
- 契約種別を Select で変更→即保存
- 開始日/終了日を日付選択→保存
- member ロールで全フィールドがテキスト表示のみ

## T-11: 商談詳細ページの議事録とアクションアイテムを編集可能にする

- [ ] `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/MeetingSummarySection.tsx` を新規作成する（`"use client"`）
- [ ] props: `meetingId: string`, `summary: string | null`, `editable: boolean`
- [ ] 議事録を InlineEditTextarea で編集。`onSave` で `updateMeetingAction` を呼ぶ。FormData に `meetingId` と `summary` をセット
- [ ] `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/MeetingActionItemsSection.tsx` を新規作成する（`"use client"`）
- [ ] props: `meetingId: string`, `actionItems: ActionItem[]`, `editable: boolean`
- [ ] 各アイテムにチェックボックスを配置。クリックで `updateMeetingAction` を呼び、対象アイテムの `done` を反転した全 actionItems を送信
- [ ] `editable=false` のときチェックボックスは `disabled`
- [ ] `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/page.tsx` を修正して、議事録セクションを `MeetingSummarySection` に、アクションアイテムセクションを `MeetingActionItemsSection` に置き換える。`editable` は `session.user.role === "admin" || session.user.role === "manager"` で算出

**Acceptance Criteria**:
- 議事録をクリック→Textarea→保存ボタンで保存
- アクションアイテムのチェックボックスをクリックで完了/未完了がトグル
- member ロールで議事録は表示のみ、チェックボックスは disabled

## T-12: 最終検証

- [ ] `bun run build` が成功することを確認する
- [ ] `bun run typecheck` が型エラーなしで完了することを確認する
- [ ] `bun test` が全件 green であることを確認する
- [ ] 各コンポーネント（InlineEditText, InlineEditTextarea, InlineEditSelect, InlineEditDate, InlineEditMoney）が `src/app/components/` に存在し、`index.ts` から export されていることを確認する

**Acceptance Criteria**:
- `bun run build` が exit 0 で完了する
- `bun run typecheck` が型エラーなしで完了する
- `bun test` が全件 pass する
- 5つのインライン編集コンポーネントが存在する
