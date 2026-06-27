# Spec: タスク紐づけ先の検索選択モーダル（案件・引合・会議）

## Requirements

### Requirement: リポジトリ検索 — 案件を title 部分一致で検索し LIMIT 件を返す

dealRepository SHALL provide a `searchByTitle` function that accepts `organizationId` and `query` (string), returns deals whose `title` contains `query` (case-insensitive), filtered by `organizationId`, limited to LINK_SEARCH_LIMIT (20) rows.

#### Scenario: title 部分一致で案件が絞り込まれる

**Given** organizationId=O1 に title="ABC案件", "DEF案件", "ABCプロジェクト" の 3 件が存在する
**When** `searchByTitle(O1, "ABC")` が呼ばれる
**Then** "ABC案件" と "ABCプロジェクト" の 2 件が返される

#### Scenario: 他テナントの案件は返されない

**Given** organizationId=O1 に title="ABC案件"、organizationId=O2 に title="ABC別案件" が存在する
**When** `searchByTitle(O1, "ABC")` が呼ばれる
**Then** O1 の "ABC案件" のみが返され、O2 の案件は含まれない

#### Scenario: 結果が LINK_SEARCH_LIMIT 件に制限される

**Given** organizationId=O1 に title に "テスト" を含む案件が 30 件存在する
**When** `searchByTitle(O1, "テスト")` が呼ばれる
**Then** 返却件数は 20 件以下である

### Requirement: リポジトリ検索 — 引合を title 部分一致で検索し LIMIT 件を返す

inquiryRepository SHALL provide a `searchByTitle` function that accepts `organizationId` and `query`, returns inquiries whose `title` contains `query` (case-insensitive), filtered by `organizationId`, limited to LINK_SEARCH_LIMIT rows.

#### Scenario: title 部分一致で引合が絞り込まれる

**Given** organizationId=O1 に title="新規引合A", "新規引合B", "既存案件C" の 3 件が存在する
**When** `searchByTitle(O1, "新規")` が呼ばれる
**Then** "新規引合A" と "新規引合B" の 2 件が返される

#### Scenario: 他テナントの引合は返されない

**Given** organizationId=O1 に title="引合X"、organizationId=O2 に title="引合X" が存在する
**When** `searchByTitle(O1, "引合")` が呼ばれる
**Then** O1 の引合のみが返される

### Requirement: リポジトリ検索 — 会議を summary 部分一致で検索し LIMIT 件を返す

meetingRepository SHALL provide a `searchBySummary` function that accepts `organizationId` and `query`, returns meetings whose `summary` contains `query` (case-insensitive) and `summary IS NOT NULL`, filtered by `organizationId`, limited to LINK_SEARCH_LIMIT rows.

#### Scenario: summary 部分一致で会議が絞り込まれる

**Given** organizationId=O1 に summary="要件定義の打合せ" と summary="設計レビュー" と summary=null の 3 件が存在する
**When** `searchBySummary(O1, "要件")` が呼ばれる
**Then** "要件定義の打合せ" の 1 件が返される

#### Scenario: summary が null の会議は対象外

**Given** organizationId=O1 に summary=null の会議が存在する
**When** `searchBySummary(O1, "")` が呼ばれる
**Then** summary=null の会議は結果に含まれない

### Requirement: searchLinkTargetsAction が type 別に検索し { id, label }[] を返す

searchLinkTargetsAction SHALL accept `{ type: "deal"|"inquiry"|"meeting", query: string }`, authenticate the caller, use the caller's organizationId, and return `{ id: string, label: string }[]`. The label format SHALL be:
- deal: `deal.title`
- inquiry: `inquiry.title`
- meeting: `${formatDateJP(date)} ${meetingTypeLabels[type]}`。親の案件または引合がある場合は `${formatDateJP(date)} ${meetingTypeLabels[type]}（${parentName}）`

#### Scenario: type="deal" で案件の title を label にした結果が返る

**Given** organizationId=O1 に title="ABC案件" の deal が存在する
**When** `searchLinkTargetsAction({ type: "deal", query: "ABC" })` が認証済みユーザーから呼ばれる
**Then** `[{ id: "<deal-id>", label: "ABC案件" }]` が返される

#### Scenario: type="meeting" で日付+種別+親名を label にした結果が返る

**Given** organizationId=O1 に date=2026-01-15, type="hearing", summary="要件確認", dealId=D1（title="案件X"）の meeting が存在する
**When** `searchLinkTargetsAction({ type: "meeting", query: "要件" })` が認証済みユーザーから呼ばれる
**Then** `[{ id: "<meeting-id>", label: "2026/01/15 ヒアリング（案件X）" }]` が返される

#### Scenario: 未認証ユーザーからの呼び出しはエラーを返す

**Given** セッションが存在しない
**When** `searchLinkTargetsAction(...)` が呼ばれる
**Then** `{ message: "認証が必要です" }` が返される

### Requirement: LinkTargetPicker が 3 タブで候補を検索表示し 1 件選択で確定する

LinkTargetPicker コンポーネント SHALL display 3 tabs (案件/引合/会議), each with a search input. Typing in the search input SHALL debounce and call `searchLinkTargetsAction` with the corresponding type. Clicking a result item SHALL confirm the selection as `{ type, id, label }`. A "なし" option SHALL clear the selection (return null).

#### Scenario: 案件タブで検索して 1 件選択する

**Given** LinkTargetPicker が開かれている
**When** ユーザーが案件タブを選択し、検索ボックスに "ABC" と入力する
**Then** searchLinkTargetsAction({ type: "deal", query: "ABC" }) が呼ばれ、結果一覧が表示される

**When** ユーザーが結果一覧の "ABC案件" をクリックする
**Then** onConfirm が `{ type: "deal", id: "<id>", label: "ABC案件" }` で呼ばれる

#### Scenario: 「なし」で紐づけを外す

**Given** LinkTargetPicker が開かれ、初期値として `{ type: "deal", id: "D1", label: "既存案件" }` が設定されている
**When** ユーザーが「なし」ボタンをクリックする
**Then** onConfirm が `null` で呼ばれる

### Requirement: 単一紐づけ — ピッカー経由の操作で選択した type の FK のみ保持し他をクリアする

ピッカー（LinkTargetPicker）経由でタスクを作成または更新する呼び出し元（TaskList の createActionItemAction 呼び出し、ActionItemRow の updateActionItemAction 呼び出し）は、選択した linkTarget の type に対応する FK のみをセットし、他 2 つの FK を null にして Server Action に渡さなければならない（SHALL）。createActionItem usecase および updateActionItem usecase 自体はこの制約を強制しない。会議ページ（MeetingActionItemsSection）など、ピッカーを経由しないコンテキスト作成は meetingId と dealId を同時に送信でき、usecase はその値をそのまま保存する。

#### Scenario: 案件を選択すると inquiryId と meetingId が null になる

**Given** タスク作成時に LinkTargetPicker で dealId="D1" が選択される
**When** TaskList が createActionItemAction を呼ぶ
**Then** Server Action には dealId="D1"、inquiryId=null、meetingId=null が渡され、作成された ActionItem もその値を持つ

#### Scenario: 編集で紐づけ先を案件から引合に変更する

**Given** ActionItem に dealId="D1", inquiryId=null, meetingId=null が設定されている
**When** ActionItemModal で LinkTargetPicker を使い inquiryId="I1" を選択して保存する
**Then** ActionItemRow が updateActionItemAction に dealId=null、inquiryId="I1"、meetingId=null を渡し、更新後の ActionItem もその値を持つ

#### Scenario: 紐づけを解除する（なし）

**Given** ActionItem に dealId="D1" が設定されている
**When** ActionItemModal で「なし」を選択して保存する
**Then** ActionItemRow が updateActionItemAction に dealId=null, inquiryId=null, meetingId=null を渡し、更新後の ActionItem の 3 FK すべてが null である

### Requirement: MeetingActionItemsSection — meetingId と dealId を同時に保持して動作する

MeetingActionItemsSection からタスクを作成する際、createActionItemAction は meetingId と dealId の両方を受け取り、そのまま保存しなければならない（SHALL）。usecase は単一紐づけの不変条件を強制してはならない（SHALL NOT）。

#### Scenario: MeetingActionItemsSection から作成したタスクが meetingId+dealId を保持する

**Given** 会議ページの MeetingActionItemsSection が meetingId="M1"、dealId="D1" を持つコンテキストで動作している
**When** ユーザーがタスクを作成し MeetingActionItemsSection が createActionItemAction({ meetingId: "M1", dealId: "D1", ... }) を呼ぶ
**Then** 作成された ActionItem の meetingId="M1"、dealId="D1" である（両方が保持される）

#### Scenario: meetingId+dealId を保持したタスクが一覧で親案件名を表示する

**Given** ActionItem に meetingId="M1"、dealId="D1"（dealTitle="案件X"）が設定されている
**When** listActionItems で当該 ActionItem の sourceName を取得する
**Then** sourceName は "案件X"（dealId → meetingId → inquiryId の優先ロジックにより dealId が優先される）

### Requirement: ActionItemModal に紐づけ先の表示・変更機能を追加する

ActionItemModal SHALL display the current link target label and provide a "変更" button that opens LinkTargetPicker. The selected link target SHALL be included in the onSubmit values.

#### Scenario: 既存の紐づけ先が表示される

**Given** ActionItemModal が開かれ、defaultValues に linkTarget `{ type: "deal", id: "D1", label: "案件A" }` が含まれる
**When** モーダルが表示される
**Then** 紐づけ先欄に "案件A" が表示される

#### Scenario: 紐づけ先を変更して保存する

**Given** ActionItemModal が開かれている
**When** ユーザーが「変更」ボタンを押して LinkTargetPicker で引合 "引合B" を選択し、保存ボタンを押す
**Then** onSubmit の values に `linkTarget: { type: "inquiry", id: "I2", label: "引合B" }` が含まれる

### Requirement: TaskList 新規作成モーダルから旧プルダウンを除去し LinkTargetPicker に置換する

TaskList の新規作成モーダル SHALL replace the two `<select>` elements (案件/引合) with a single LinkTargetPicker trigger. The `dealOptions` and `inquiryOptions` props SHALL be removed from TaskList. The tasks/page.tsx SHALL no longer call `listDeals` / `listInquiries`.

#### Scenario: TaskList に dealOptions / inquiryOptions props が存在しない

**Given** TaskList コンポーネントの型定義
**When** Props 型を確認する
**Then** `dealOptions` と `inquiryOptions` プロパティが存在しない

#### Scenario: tasks/page.tsx が listDeals / listInquiries を呼ばない

**Given** tasks/page.tsx のソースコード
**When** インポートとデータ取得を確認する
**Then** `listDeals` と `listInquiries` の呼び出しが存在しない
