# Tasks: タスク紐づけ先の検索選択モーダル（案件・引合・会議）

## T-01: リポジトリに検索メソッドを追加する

- [ ] `src/infrastructure/repositories/dealRepository.ts` に `searchByTitle` 関数を追加する
  - シグネチャ: `searchByTitle(organizationId: string, query: string): Promise<Deal[]>`
  - `drizzle-orm` から `ilike` をインポートする（既存の import 行に追加）
  - WHERE: `eq(deals.organizationId, organizationId)` AND `ilike(deals.title, '%${query}%')`（SQL インジェクション対策として `%${query}%` を文字列連結ではなく Drizzle のパラメータバインドで渡す）
  - ORDER BY: `desc(deals.createdAt)`
  - LIMIT: 20（定数 `LINK_SEARCH_LIMIT` をファイル先頭に定義、`const LINK_SEARCH_LIMIT = 20`）
  - 返却: `result.map(mapRow)`
- [ ] `src/infrastructure/repositories/inquiryRepository.ts` に `searchByTitle` 関数を追加する
  - シグネチャ: `searchByTitle(organizationId: string, query: string): Promise<Inquiry[]>`
  - `drizzle-orm` から `ilike` をインポートする
  - WHERE: `eq(inquiries.organizationId, organizationId)` AND `ilike(inquiries.title, '%${query}%')`
  - ORDER BY: `desc(inquiries.createdAt)`
  - LIMIT: 20（定数 `LINK_SEARCH_LIMIT`）
  - 返却: `result.map(mapRow)`
- [ ] `src/infrastructure/repositories/meetingRepository.ts` に `searchBySummary` 関数を追加する
  - シグネチャ: `searchBySummary(organizationId: string, query: string): Promise<Meeting[]>`
  - `drizzle-orm` から `ilike`, `isNotNull` をインポートする
  - WHERE: `eq(meetings.organizationId, organizationId)` AND `isNotNull(meetings.summary)` AND `ilike(meetings.summary, '%${query}%')`
  - ORDER BY: `desc(meetings.date)`
  - LIMIT: 20（定数 `LINK_SEARCH_LIMIT`）
  - 返却: `result.map(mapRow)`

**Acceptance Criteria**:
- 3 リポジトリすべてに検索メソッドが存在する
- 各検索は `organizationId` でフィルタされている（テナント分離）
- LIMIT が 20 に設定されている
- `typecheck` が green

## T-02: 検索用 usecase を新設する

- [ ] `src/application/usecases/searchDeals.ts` を新規作成する
  - シグネチャ: `searchDeals(organizationId: string, query: string): Promise<{ id: string; label: string }[]>`
  - `dealRepository.searchByTitle(organizationId, query)` を呼び出す
  - 結果を `{ id: deal.id, label: deal.title }` にマッピングして返す
- [ ] `src/application/usecases/searchInquiries.ts` を新規作成する
  - シグネチャ: `searchInquiries(organizationId: string, query: string): Promise<{ id: string; label: string }[]>`
  - `inquiryRepository.searchByTitle(organizationId, query)` を呼び出す
  - 結果を `{ id: inquiry.id, label: inquiry.title }` にマッピングして返す
- [ ] `src/application/usecases/searchMeetings.ts` を新規作成する
  - シグネチャ: `searchMeetings(organizationId: string, query: string): Promise<{ id: string; label: string }[]>`
  - `meetingRepository.searchBySummary(organizationId, query)` を呼び出す
  - 会議ごとに label を組み立てる:
    - `formatDateJP(meeting.date)` と `meetingTypeLabels[meeting.type]` を結合
    - meeting に `dealId` がある場合は `dealRepository.findById(meeting.dealId, organizationId)` で親案件の title を取得し `（${deal.title}）` を追記
    - meeting に `inquiryId` がある場合は `inquiryRepository.findById(meeting.inquiryId, organizationId)` で親引合の title を取得し `（${inquiry.title}）` を追記
    - `formatDateJP` は `listActionItems.ts` と同じロジック（重複を避けるため共通化を検討するが、スコープ内では各ファイル内にヘルパーとして定義する）
    - `meetingTypeLabels` は `src/app/(dashboard)/labels.ts` からインポートする
  - 結果を `{ id: meeting.id, label }` にマッピングして返す
- [ ] `src/application/usecases/index.ts` に `searchDeals` / `searchInquiries` / `searchMeetings` の 3 export を追加する

**Acceptance Criteria**:
- 3 つの usecase ファイルが存在する
- searchMeetings の label が「日付 種別（親名）」形式である
- usecases/index.ts から export されている
- `typecheck` が green

## T-03: searchLinkTargetsAction Server Action を新設する

- [ ] `src/app/actions/actionItems.ts` に `searchLinkTargetsAction` を追加する
  - 入力スキーマ: `z.object({ type: z.enum(["deal", "inquiry", "meeting"]), query: z.string() })`
  - 戻り型: `Promise<{ data?: { id: string; label: string }[]; message?: string }>`
  - 認証チェック: `auth()` でセッション確認。未認証なら `{ message: "認証が必要です" }` を返す
  - 権限チェック: `canPerform(session.user.role, "actionItem", "create")` — タスクの作成/編集が可能なユーザーのみ検索を許可する
  - type に応じて `searchDeals` / `searchInquiries` / `searchMeetings` を `session.user.organizationId` と `parsed.data.query` で呼び出す
  - 結果を `{ data: results }` で返す

**Acceptance Criteria**:
- Server Action が `"use server"` 宣言を持つ
- 認証・権限チェックが含まれる
- organizationId はセッションから取得している（リクエストボディから受け取っていない）
- type 別に正しい usecase を呼んでいる
- `typecheck` が green

## T-04: 単一紐づけの不変条件を usecase に追加する

- [ ] `src/application/usecases/createActionItem.ts` を修正する
  - 入力パラメータの型は変更しない（既存の `meetingId` / `dealId` / `inquiryId` をそのまま使う）
  - FK セット前に、3 FK のうち非 null のものが最大 1 つであることをバリデーションする
  - 複数の FK が同時に非 null で渡された場合は `{ ok: false, reason: "紐づけ先は1つだけ指定できます" }` を返す
  - （注意: DealActionItemsSection は dealId のみ、MeetingActionItemsSection は meetingId + dealId を渡すが、meetingId + dealId の同時セットは既存動作であるため、この不変条件は「dealId のみ」「inquiryId のみ」「meetingId のみ」「meetingId + dealId のみ（会議の親案件）」を許容するか、要件に忠実に「最大 1 つ」のみ許容するか判断が必要）
  - 要件「タスクは案件・引合・会議のいずれか1つにのみ紐づく」に従い、3 FK のうち最大 1 つが非 null であることをチェックする。MeetingActionItemsSection は meetingId と dealId を同時に渡しているが、これはスコープ外のため、createActionItem の不変条件では「meetingId が指定された場合は dealId / inquiryId を無視する」ように調整する。具体的には:
    - `meetingId` が指定された場合: `dealId = null`, `inquiryId = null` として保存
    - `dealId` が指定された場合: `meetingId = null`, `inquiryId = null` として保存
    - `inquiryId` が指定された場合: `meetingId = null`, `dealId = null` として保存
    - いずれも指定されない場合: すべて null
  - この優先ロジックにより MeetingActionItemsSection の既存動作（meetingId + dealId 同時送信）を壊さず meetingId 優先で保存する
- [ ] `src/application/usecases/updateActionItem.ts` を修正する
  - 同様に、更新時に渡された FK から単一紐づけを強制する
  - `linkTarget` 情報（`type` + `id`）が渡された場合に、対象 type の FK をセットし他 2 つを null にするロジックを追加する
  - ただし usecase のシグネチャは既存のまま（`dealId` / `inquiryId` / `meetingId` を個別に受け取る）とし、呼び出し元（Server Action）で type に応じた FK マッピングを行う

**Acceptance Criteria**:
- createActionItem で 3 FK のうち最大 1 つが非 null になるように保証されている
- updateActionItem でも同様の保証がある
- MeetingActionItemsSection の既存動作（meetingId + dealId 同時送信）が壊れない
- `typecheck` が green

## T-05: LinkTargetPicker モーダルコンポーネントを新設する

- [ ] `src/app/(dashboard)/components/LinkTargetPicker.tsx` を新規作成する
  - `"use client"` 宣言
  - Props 型:
    ```
    type LinkTarget = { type: "deal" | "inquiry" | "meeting"; id: string; label: string };
    type Props = {
      open: boolean;
      initialValue: LinkTarget | null;
      onConfirm: (value: LinkTarget | null) => void;
      onCancel: () => void;
    };
    ```
  - 内部状態:
    - `activeTab`: `"deal" | "inquiry" | "meeting"`（デフォルト: initialValue の type、なければ "deal"）
    - `query`: 検索入力値（タブ切り替えでリセット）
    - `results`: `{ id: string; label: string }[]`
    - `isSearching`: 検索中フラグ
  - タブ UI: 「案件」「引合」「会議」の 3 タブ。タブ切り替えで query をリセットし results をクリアする
  - 検索ボックス: テキスト入力、300ms デバウンスで `searchLinkTargetsAction({ type: activeTab, query })` を呼び出す
  - 結果一覧: `results` を `<ul>` でリスト表示。各項目をクリックで `onConfirm({ type: activeTab, id: item.id, label: item.label })` を呼ぶ
  - 「なし」ボタン: `onConfirm(null)` を呼ぶ（紐づけ解除）
  - モーダル外クリックまたはキャンセルボタンで `onCancel()` を呼ぶ
  - スタイリング: 既存のモーダルパターン（ActionItemModal と同じ `fixed inset-0 bg-black/40` オーバーレイ、`bg-bg-surface` パネル）に準拠
  - デバウンスは `setTimeout` / `clearTimeout` で実装する（外部ライブラリ不使用）

**Acceptance Criteria**:
- 3 タブ（案件/引合/会議）が表示される
- 検索入力がデバウンスされ searchLinkTargetsAction を呼ぶ
- 結果項目クリックで `{ type, id, label }` が onConfirm に渡される
- 「なし」で null が onConfirm に渡される
- `typecheck` が green

## T-06: ActionItemModal に紐づけ先欄を追加する

- [ ] `src/app/(dashboard)/components/ActionItemModal.tsx` の Props 型を拡張する
  - `defaultValues` に `linkTarget?: { type: "deal" | "inquiry" | "meeting"; id: string; label: string } | null` を追加する
  - `onSubmit` の values に `linkTarget: { type: "deal" | "inquiry" | "meeting"; id: string; label: string } | null` を追加する
  - `showLinkTarget?: boolean` プロパティを追加する（デフォルト false）。Deal/Meeting ページの既存利用箇所で紐づけ欄を非表示にするため
- [ ] 内部状態に `linkTarget` を追加する
  - `useState` で管理。初期値は `defaultValues?.linkTarget ?? null`
  - `useEffect` の reset 対象にも追加する（依存値に `defaultValues?.linkTarget` を含む）
- [ ] 紐づけ先の表示 UI を追加する（`showLinkTarget` が true の場合のみ）
  - 期日欄の下に配置
  - 現在の linkTarget がある場合: label テキストを表示
  - 現在の linkTarget がない場合: 「なし」を表示
  - 「変更」ボタンを配置。クリックで LinkTargetPicker を開く
- [ ] LinkTargetPicker の開閉を `showPicker` state で管理する
  - LinkTargetPicker の `onConfirm` で `linkTarget` state を更新し、`showPicker` を false にする
  - LinkTargetPicker の `onCancel` で `showPicker` を false にする
- [ ] `handleConfirm` の `onSubmit` 呼び出しに `linkTarget` を含める
- [ ] LinkTargetPicker コンポーネントをインポートする

**Acceptance Criteria**:
- `showLinkTarget={true}` で紐づけ先欄が表示される
- `showLinkTarget` 未指定・false で紐づけ先欄が非表示（既存動作維持）
- 「変更」クリックで LinkTargetPicker が開く
- onSubmit の values に linkTarget が含まれる
- DealActionItemsSection / MeetingActionItemsSection の既存利用が壊れない
- `typecheck` が green

## T-07: ActionItemRow から ActionItemModal へ紐づけ情報を渡す

- [ ] `src/app/(dashboard)/components/ActionItemRow.tsx` を修正する
  - ActionItemModal の `defaultValues` に現在の紐づけ先情報を渡す
  - 紐づけ情報の組み立て: ActionItemRow は `showSource` / `sourceName` / `sourceHref` を props として受け取っているので、これと item の `dealId` / `inquiryId` / `meetingId` から `linkTarget` を組み立てる:
    - `item.dealId` が非 null: `{ type: "deal", id: item.dealId, label: sourceName ?? item.dealId }`
    - `item.meetingId` が非 null: `{ type: "meeting", id: item.meetingId, label: sourceName ?? item.meetingId }`
    - `item.inquiryId` が非 null: `{ type: "inquiry", id: item.inquiryId, label: sourceName ?? item.inquiryId }`
    - すべて null: `null`
  - ActionItemModal に `showLinkTarget={showSource === true}` を渡す（タスク一覧での利用時のみ紐づけ欄を表示。Deal/Meeting 個別ページでは非表示）
- [ ] `handleSave` 関数を修正する
  - ActionItemModal の onSubmit から受け取る values に `linkTarget` が含まれるようになる
  - `updateActionItemAction` への引数に linkTarget を FK にマッピングして渡す:
    - `linkTarget.type === "deal"`: `dealId: linkTarget.id, inquiryId: null, meetingId: null`
    - `linkTarget.type === "inquiry"`: `inquiryId: linkTarget.id, dealId: null, meetingId: null`
    - `linkTarget.type === "meeting"`: `meetingId: linkTarget.id, dealId: null, inquiryId: null`
    - `linkTarget === null`: `dealId: null, inquiryId: null, meetingId: null`

**Acceptance Criteria**:
- 編集モーダルに現在の紐づけ先が表示される
- 紐づけ変更後の保存で updateActionItemAction に正しい FK が渡される
- Deal/Meeting ページの ActionItemRow では紐づけ欄が非表示
- `typecheck` が green

## T-08: TaskList 新規作成モーダルを LinkTargetPicker に置換する

- [ ] `src/app/(dashboard)/tasks/TaskList.tsx` を修正する
  - Props 型から `dealOptions` と `inquiryOptions` を削除する
  - 内部状態の `dealId` / `inquiryId` を削除し、`linkTarget` state（`LinkTarget | null`、初期値 null）を追加する
  - 新規作成モーダル内の案件 `<select>` と引合 `<select>` を削除する
  - 代わりに紐づけ先表示欄と「選択」ボタンを配置する
    - linkTarget がある場合: `${typeLabel}: ${linkTarget.label}` を表示（typeLabel: deal="案件", inquiry="引合", meeting="会議"）
    - linkTarget がない場合: 「なし」を表示
    - 「選択」ボタンで LinkTargetPicker を開く
  - `showPicker` state を追加して LinkTargetPicker の開閉を管理する
  - `handleOpenAdd` で `linkTarget` を null にリセットする
  - `handleAdd` の `createActionItemAction` 呼び出しを修正する:
    - `linkTarget?.type === "deal"`: `dealId: linkTarget.id`
    - `linkTarget?.type === "inquiry"`: `inquiryId: linkTarget.id`
    - `linkTarget?.type === "meeting"`: `meetingId: linkTarget.id`
    - `linkTarget === null`: FK を渡さない
  - LinkTargetPicker コンポーネントをインポートする
- [ ] `src/app/(dashboard)/tasks/page.tsx` を修正する
  - `listDeals` / `listInquiries` のインポートを削除する
  - `Promise.all` から `listDeals(organizationId)` と `listInquiries(organizationId)` の呼び出しを削除する
  - `dealOptions` / `inquiryOptions` の生成コードを削除する
  - `TaskList` への `dealOptions` / `inquiryOptions` props を削除する

**Acceptance Criteria**:
- TaskList の Props 型に `dealOptions` / `inquiryOptions` が存在しない
- 新規作成モーダルに `<select>` が存在しない
- LinkTargetPicker で案件・引合・会議を選択でき、作成時に正しい FK が渡される
- tasks/page.tsx が `listDeals` / `listInquiries` を呼ばない
- `typecheck` が green

## T-09: テスト — 検索のテナント分離・単一紐づけ・対象フィールドの静的検証

既存のテストパターン（ソースコード静的解析）に従い、テストファイルを作成する。

- [ ] `src/__tests__/usecases/linkTargetSearch.test.ts` を新規作成する
  - **リポジトリ検索の存在テスト**:
    - `dealRepository.ts` に `searchByTitle` 関数が存在する
    - `inquiryRepository.ts` に `searchByTitle` 関数が存在する
    - `meetingRepository.ts` に `searchBySummary` 関数が存在する
  - **テナント分離テスト**:
    - `dealRepository.ts` の `searchByTitle` 内に `organizationId` の条件が含まれる
    - `inquiryRepository.ts` の `searchByTitle` 内に `organizationId` の条件が含まれる
    - `meetingRepository.ts` の `searchBySummary` 内に `organizationId` の条件が含まれる
  - **検索上限テスト**:
    - 3 リポジトリの検索メソッドすべてに `.limit(` が含まれる
  - **対象フィールドテスト**:
    - `dealRepository.ts` の `searchByTitle` に `deals.title` への検索条件が含まれる
    - `inquiryRepository.ts` の `searchByTitle` に `inquiries.title` への検索条件が含まれる
    - `meetingRepository.ts` の `searchBySummary` に `meetings.summary` への検索条件が含まれる
  - **searchLinkTargetsAction テスト**:
    - `actionItems.ts` に `searchLinkTargetsAction` が存在する
    - `searchLinkTargetsAction` 内に認証チェック（`auth()`）が含まれる
  - **単一紐づけテスト**:
    - `createActionItem.ts` に 3 FK の排他ロジックが含まれる（`meetingId` / `dealId` / `inquiryId` の null 設定コードが存在する）
  - **UI 旧プルダウン除去テスト**:
    - `TaskList.tsx` に `dealOptions` が存在しない
    - `TaskList.tsx` に `inquiryOptions` が存在しない
    - `tasks/page.tsx` に `listDeals` が存在しない
    - `tasks/page.tsx` に `listInquiries` が存在しない

**Acceptance Criteria**:
- 全テストが `bun test src/__tests__/usecases/linkTargetSearch.test.ts` で green
- テストがソースコードの静的解析パターンに従っている

## T-10: 最終検証

- [ ] `bun run build` が成功する
- [ ] `typecheck` が green
- [ ] `bun test` が全体 green（既存テスト無変更で通ること）

**Acceptance Criteria**:
- ビルド・型チェック・全テストが green
- 既存テストに変更がないこと
