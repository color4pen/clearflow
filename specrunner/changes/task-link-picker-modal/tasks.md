# Tasks: タスク紐づけ先の検索選択モーダル（案件・引合・会議）

## T-01: リポジトリに検索メソッドを追加する

- [x] `src/infrastructure/repositories/dealRepository.ts` に `searchByTitle` 関数を追加する
  - シグネチャ: `searchByTitle(organizationId: string, query: string): Promise<Deal[]>`
  - `drizzle-orm` から `ilike` をインポートする（既存の import 行に追加）
  - WHERE: `eq(deals.organizationId, organizationId)` AND `ilike(deals.title, '%${query}%')`（SQL インジェクション対策として `%${query}%` を文字列連結ではなく Drizzle のパラメータバインドで渡す）
  - ORDER BY: `desc(deals.createdAt)`
  - LIMIT: 20（定数 `LINK_SEARCH_LIMIT` をファイル先頭に定義、`const LINK_SEARCH_LIMIT = 20`）
  - 返却: `result.map(mapRow)`
- [x] `src/infrastructure/repositories/inquiryRepository.ts` に `searchByTitle` 関数を追加する
  - シグネチャ: `searchByTitle(organizationId: string, query: string): Promise<Inquiry[]>`
  - `drizzle-orm` から `ilike` をインポートする
  - WHERE: `eq(inquiries.organizationId, organizationId)` AND `ilike(inquiries.title, '%${query}%')`
  - ORDER BY: `desc(inquiries.createdAt)`
  - LIMIT: 20（定数 `LINK_SEARCH_LIMIT`）
  - 返却: `result.map(mapRow)`
- [x] `src/infrastructure/repositories/meetingRepository.ts` に `searchBySummary` 関数を追加する
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

- [x] `src/application/usecases/searchDeals.ts` を新規作成する
  - シグネチャ: `searchDeals(organizationId: string, query: string): Promise<{ id: string; label: string }[]>`
  - `dealRepository.searchByTitle(organizationId, query)` を呼び出す
  - 結果を `{ id: deal.id, label: deal.title }` にマッピングして返す
- [x] `src/application/usecases/searchInquiries.ts` を新規作成する
  - シグネチャ: `searchInquiries(organizationId: string, query: string): Promise<{ id: string; label: string }[]>`
  - `inquiryRepository.searchByTitle(organizationId, query)` を呼び出す
  - 結果を `{ id: inquiry.id, label: inquiry.title }` にマッピングして返す
- [x] `src/lib/dateUtils.ts` に `formatDateJP` 関数を切り出す（新規作成または既存ファイルへの追記）
  - `listActionItems.ts` の private `formatDateJP` 実装をここへ移動する
  - export: `export function formatDateJP(date: Date | string): string`
  - `listActionItems.ts` は `src/lib/dateUtils.ts` から import するよう修正する
- [x] `src/lib/meetingLabels.ts` に `meetingTypeLabels` を切り出す（新規作成）
  - `src/app/(dashboard)/labels.ts` に定義されている `meetingTypeLabels` マップをここへ移動する
  - export: `export const meetingTypeLabels: Record<MeetingType, string> = { ... }`
  - `src/app/(dashboard)/labels.ts` は `src/lib/meetingLabels.ts` から re-export するよう修正する
- [x] `src/application/usecases/searchMeetings.ts` を新規作成する
  - シグネチャ: `searchMeetings(organizationId: string, query: string): Promise<{ id: string; label: string }[]>`
  - `meetingRepository.searchBySummary(organizationId, query)` を呼び出す
  - 会議ごとに label を組み立てる:
    - `formatDateJP` は `src/lib/dateUtils.ts` からインポートする（重複実装禁止）
    - `meetingTypeLabels` は `src/lib/meetingLabels.ts` からインポートする（UI 層 `src/app/(dashboard)/` からのインポート禁止）
    - `formatDateJP(meeting.date)` と `meetingTypeLabels[meeting.type]` を結合
    - meeting に `dealId` がある場合は `dealRepository.findById(meeting.dealId, organizationId)` で親案件の title を取得し `（${deal.title}）` を追記
    - meeting に `inquiryId` がある場合は `inquiryRepository.findById(meeting.inquiryId, organizationId)` で親引合の title を取得し `（${inquiry.title}）` を追記
  - 結果を `{ id: meeting.id, label }` にマッピングして返す
- [x] `src/application/usecases/index.ts` に `searchDeals` / `searchInquiries` / `searchMeetings` の 3 export を追加する

**Acceptance Criteria**:
- `src/lib/dateUtils.ts` に `formatDateJP` が export されている
- `src/lib/meetingLabels.ts` に `meetingTypeLabels` が export されている
- `listActionItems.ts` が `src/lib/dateUtils.ts` から `formatDateJP` を import している（ファイル内 private 定義を削除）
- `src/app/(dashboard)/labels.ts` が `src/lib/meetingLabels.ts` から re-export している
- 3 つの usecase ファイルが存在する
- searchMeetings.ts が `src/lib/dateUtils.ts` と `src/lib/meetingLabels.ts` から import しており、`src/app/(dashboard)/` 以下からは import していない
- searchMeetings の label が「日付 種別（親名）」形式である
- usecases/index.ts から export されている
- `typecheck` が green

## T-03: searchLinkTargetsAction Server Action を新設する

- [x] `src/app/actions/actionItems.ts` に `searchLinkTargetsAction` を追加する
  - 入力スキーマ: `z.object({ type: z.enum(["deal", "inquiry", "meeting"]), query: z.string() })`
  - 戻り型: `Promise<{ data?: { id: string; label: string }[]; message?: string }>`
  - 認証チェック: `auth()` でセッション確認。未認証なら `{ message: "認証が必要です" }` を返す
  - レートリミット: 認証確認直後に `checkRateLimit(session.user.id)` を呼び出す。既存の `createActionItemAction` 等と同じパターンで実装する。超過時は `{ message: "リクエストが多すぎます。しばらく待ってから再試行してください。" }` を返す
  - 権限チェック: `canPerform(session.user.role, "actionItem", "create")` — タスクの作成/編集が可能なユーザーのみ検索を許可する
  - type に応じて `searchDeals` / `searchInquiries` / `searchMeetings` を `session.user.organizationId` と `parsed.data.query` で呼び出す
  - 結果を `{ data: results }` で返す

**Acceptance Criteria**:
- Server Action が `"use server"` 宣言を持つ
- 認証・権限チェックが含まれる
- `checkRateLimit` の呼び出しが含まれる（他の actionItems アクションと同様）
- organizationId はセッションから取得している（リクエストボディから受け取っていない）
- type 別に正しい usecase を呼んでいる
- `typecheck` が green

## T-04: 単一紐づけ FK マッピングを呼び出し元（Server Action / UI）で行う

createActionItem および updateActionItem usecase は変更しない。単一紐づけの FK マッピングは、ピッカーを使う経路の呼び出し元が一貫して担う。

- [x] `src/application/usecases/createActionItem.ts` は変更しない
  - usecase は `dealId` / `inquiryId` / `meetingId` を既存のまま独立に受け取り、渡された値をそのまま保存する
  - 単一紐づけの強制を usecase 内に追加しない（MeetingActionItemsSection が meetingId+dealId を同時送信する動作を保持するため）
- [x] `src/application/usecases/updateActionItem.ts` は変更しない
  - 同様に、usecase のシグネチャと保存ロジックは既存のまま維持する
- [x] ピッカー経由のタスク作成（TaskList → createActionItemAction）で FK マッピングを行う（T-08 で実装）
  - `linkTarget.type === "deal"`: `dealId: linkTarget.id, inquiryId: null, meetingId: null`
  - `linkTarget.type === "inquiry"`: `inquiryId: linkTarget.id, dealId: null, meetingId: null`
  - `linkTarget.type === "meeting"`: `meetingId: linkTarget.id, dealId: null, inquiryId: null`
  - `linkTarget === null`: `dealId: null, inquiryId: null, meetingId: null`
- [x] ピッカー経由のタスク更新（ActionItemRow → updateActionItemAction）で FK マッピングを行う（T-07 で実装）
  - 同上の FK マッピングロジックを適用する
- [x] MeetingActionItemsSection は引き続き `createActionItemAction({ meetingId, dealId, ... })` を同時送信し、usecase がその値をそのまま保存することを確認する

**Acceptance Criteria**:
- `createActionItem.ts` と `updateActionItem.ts` に FK 排他ロジック・優先ロジックが追加されていない
- ピッカー経由の作成・更新では呼び出し元が単一の FK のみをセットして送信する
- MeetingActionItemsSection からの作成で meetingId+dealId が両方保持される
- `typecheck` が green

## T-05: LinkTargetPicker モーダルコンポーネントを新設する

- [x] `src/app/(dashboard)/components/LinkTargetPicker.tsx` を新規作成する
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
  - 検索ボックス: テキスト入力、300ms デバウンスで `searchLinkTargetsAction({ type: activeTab, query })` を呼び出す。デバウンスは `useEffect` で管理し、cleanup 関数内で `clearTimeout` を呼ぶ（コンポーネントのアンマウント時やクエリ変更時にタイマーをキャンセルする）
  - 結果一覧: `results` を `<ul>` でリスト表示。各項目をクリックで `onConfirm({ type: activeTab, id: item.id, label: item.label })` を呼ぶ
  - 「なし」ボタン: `onConfirm(null)` を呼ぶ（紐づけ解除）
  - モーダル外クリックまたはキャンセルボタンで `onCancel()` を呼ぶ
  - スタイリング: 既存のモーダルパターン（ActionItemModal と同じ `fixed inset-0 bg-black/40` オーバーレイ、`bg-bg-surface` パネル）に準拠
  - デバウンスは `setTimeout` / `clearTimeout` で実装する（外部ライブラリ不使用）
  - 実装パターン:
    ```ts
    useEffect(() => {
      const timerId = setTimeout(() => {
        // searchLinkTargetsAction を呼ぶ
      }, 300);
      return () => clearTimeout(timerId); // cleanup: アンマウント時・query 変更時にタイマーキャンセル
    }, [query, activeTab]);
    ```

**Acceptance Criteria**:
- 3 タブ（案件/引合/会議）が表示される
- 検索入力がデバウンスされ searchLinkTargetsAction を呼ぶ
- デバウンスの `useEffect` に cleanup 関数（`clearTimeout`）が存在する
- 結果項目クリックで `{ type, id, label }` が onConfirm に渡される
- 「なし」で null が onConfirm に渡される
- `typecheck` が green

## T-06: ActionItemModal に紐づけ先欄を追加する

- [x] `src/app/(dashboard)/components/ActionItemModal.tsx` の Props 型を拡張する
  - `defaultValues` に `linkTarget?: { type: "deal" | "inquiry" | "meeting"; id: string; label: string } | null` を追加する
  - `onSubmit` の values に `linkTarget: { type: "deal" | "inquiry" | "meeting"; id: string; label: string } | null` を追加する
  - `showLinkTarget?: boolean` プロパティを追加する（デフォルト false）。Deal/Meeting ページの既存利用箇所で紐づけ欄を非表示にするため
- [x] 内部状態に `linkTarget` を追加する
  - `useState` で管理。初期値は `defaultValues?.linkTarget ?? null`
  - `useEffect` の reset 対象にも追加する（依存値に `defaultValues?.linkTarget` を含む）
- [x] 紐づけ先の表示 UI を追加する（`showLinkTarget` が true の場合のみ）
  - 期日欄の下に配置
  - 現在の linkTarget がある場合: label テキストを表示
  - 現在の linkTarget がない場合: 「なし」を表示
  - 「変更」ボタンを配置。クリックで LinkTargetPicker を開く
- [x] LinkTargetPicker の開閉を `showPicker` state で管理する
  - LinkTargetPicker の `onConfirm` で `linkTarget` state を更新し、`showPicker` を false にする
  - LinkTargetPicker の `onCancel` で `showPicker` を false にする
- [x] `handleConfirm` の `onSubmit` 呼び出しに `linkTarget` を含める
- [x] LinkTargetPicker コンポーネントをインポートする

**Acceptance Criteria**:
- `showLinkTarget={true}` で紐づけ先欄が表示される
- `showLinkTarget` 未指定・false で紐づけ先欄が非表示（既存動作維持）
- 「変更」クリックで LinkTargetPicker が開く
- onSubmit の values に linkTarget が含まれる
- DealActionItemsSection / MeetingActionItemsSection の既存利用が壊れない
- `typecheck` が green

## T-07: ActionItemRow から ActionItemModal へ紐づけ情報を渡す

- [x] `src/app/(dashboard)/components/ActionItemRow.tsx` を修正する
  - ActionItemModal の `defaultValues` に現在の紐づけ先情報を渡す
  - 紐づけ情報の組み立て: ActionItemRow は `showSource` / `sourceName` / `sourceHref` を props として受け取っているので、これと item の `dealId` / `inquiryId` / `meetingId` から `linkTarget` を組み立てる:
    - `item.dealId` が非 null: `{ type: "deal", id: item.dealId, label: sourceName ?? item.dealId }`
    - `item.meetingId` が非 null: `{ type: "meeting", id: item.meetingId, label: sourceName ?? item.meetingId }`
    - `item.inquiryId` が非 null: `{ type: "inquiry", id: item.inquiryId, label: sourceName ?? item.inquiryId }`
    - すべて null: `null`
  - ActionItemModal に `showLinkTarget={showSource === true}` を渡す（タスク一覧での利用時のみ紐づけ欄を表示。Deal/Meeting 個別ページでは非表示）
- [x] `handleSave` 関数を修正する
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

- [x] `src/app/(dashboard)/tasks/TaskList.tsx` を修正する
  - Props 型から `dealOptions` と `inquiryOptions` を削除する
  - 内部状態の `dealId` / `inquiryId` を削除し、`linkTarget` state（`LinkTarget | null`、初期値 null）を追加する
  - 新規作成モーダル内の案件 `<select>` と引合 `<select>` を削除する
  - 代わりに紐づけ先表示欄と「選択」ボタンを配置する
    - linkTarget がある場合: `${typeLabel}: ${linkTarget.label}` を表示（typeLabel: deal="案件", inquiry="引合", meeting="会議"）
    - linkTarget がない場合: 「なし」を表示
    - 「選択」ボタンで LinkTargetPicker を開く
  - `showPicker` state を追加して LinkTargetPicker の開閉を管理する
  - `handleOpenAdd` で `linkTarget` を null にリセットする
  - `handleAdd` の `createActionItemAction` 呼び出しを修正する（T-07 と同じ FK マッピングパターンで他の FK を明示的に null にする）:
    - `linkTarget?.type === "deal"`: `dealId: linkTarget.id, inquiryId: null, meetingId: null`
    - `linkTarget?.type === "inquiry"`: `inquiryId: linkTarget.id, dealId: null, meetingId: null`
    - `linkTarget?.type === "meeting"`: `meetingId: linkTarget.id, dealId: null, inquiryId: null`
    - `linkTarget === null`: `dealId: null, inquiryId: null, meetingId: null`
  - LinkTargetPicker コンポーネントをインポートする
- [x] `src/app/(dashboard)/tasks/page.tsx` を修正する
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

- [x] `src/__tests__/usecases/linkTargetSearch.test.ts` を新規作成する
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
  - **単一紐づけ（呼び出し元）テスト**:
    - `TaskList.tsx` のコード内で `linkTarget` から `dealId` / `inquiryId` / `meetingId` をマッピングするコードが存在する（呼び出し元での FK マッピング）
    - `ActionItemRow.tsx` のコード内で `linkTarget` から `dealId` / `inquiryId` / `meetingId` をマッピングするコードが存在する（呼び出し元での FK マッピング）
  - **MeetingActionItemsSection 保護テスト**:
    - `createActionItem.ts` に `meetingId` を優先して `dealId` を `null` にするロジックが存在しない（MeetingActionItemsSection の dealId 保持を壊すリグレッション防止）
    - `createActionItem.ts` に `dealId` / `inquiryId` / `meetingId` の優先ロジック（片方を null にするコード）が存在しない
  - **アーキテクチャ境界テスト**:
    - `searchMeetings.ts` が `src/app/(dashboard)/` 以下のファイルを import していない
    - `searchMeetings.ts` が `src/lib/dateUtils` を import している
    - `searchMeetings.ts` が `src/lib/meetingLabels` を import している
  - **デバウンス cleanup テスト**:
    - `LinkTargetPicker.tsx` 内に `clearTimeout` が存在する（アンマウント時のタイマーキャンセル）
  - **UI 旧プルダウン除去テスト**:
    - `TaskList.tsx` に `dealOptions` が存在しない
    - `TaskList.tsx` に `inquiryOptions` が存在しない
    - `tasks/page.tsx` に `listDeals` が存在しない
    - `tasks/page.tsx` に `listInquiries` が存在しない

**Acceptance Criteria**:
- 全テストが `bun test src/__tests__/usecases/linkTargetSearch.test.ts` で green
- テストがソースコードの静的解析パターンに従っている
- MeetingActionItemsSection 保護テストが `createActionItem.ts` の usecase 内に dealId=null ロジックが無いことを確認している
- アーキテクチャ境界テストが searchMeetings.ts の import パスを検証している
- デバウンス cleanup テストが `LinkTargetPicker.tsx` 内に `clearTimeout` が存在することを確認している

## T-10: 最終検証

- [x] `bun run build` が成功する
- [x] `typecheck` が green
- [x] `bun test` が全体 green（既存テスト無変更で通ること）

**Acceptance Criteria**:
- ビルド・型チェック・全テストが green
- 既存テストに変更がないこと
