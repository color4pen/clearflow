# Tasks: 承認画面のデザイン適用

## T-01: getInquiry ユースケースを新規作成する

- [x] `src/application/usecases/getInquiry.ts` を新規作成する。`getInquiry({ inquiryId, organizationId }: { inquiryId: string; organizationId: string })` を named args シグネチャで定義し、`inquiryRepository.findById(inquiryId, organizationId)` を呼び出し `Inquiry | null` を返す（既存の `getContract` と同パターン）
- [x] `src/application/usecases/index.ts` に `export { getInquiry } from "./getInquiry"` を追加する

**Acceptance Criteria**:
- `getInquiry({ inquiryId, organizationId })` が `Inquiry | null` を返す
- `src/application/usecases/index.ts` から `getInquiry` がエクスポートされている
- 既存テストが破壊されていない

## T-02: タブ UI コンポーネントを作成する

- [x] `src/app/(dashboard)/requests/RequestTabs.tsx` を新規作成する（Server Component）
- [x] Props: `currentTab: string`, `tabs: { key: string; label: string; count: number }[]`
- [x] 各タブを `<Link href={"/requests?tab=" + key}>` で実装する
- [x] アクティブタブの視覚的区別（下線/太字/背景色など）を Tailwind CSS で実装する
- [x] 各タブにカウント数をバッジで表示する

**Acceptance Criteria**:
- タブが `<Link>` で実装され、クリックで URL パラメータが変わる
- アクティブタブが視覚的に区別される
- 各タブにリクエスト件数が表示される

## T-03: 一覧ページにタブフィルタリングと認可制御を実装する

- [x] `page.tsx` の関数シグネチャに `searchParams` を追加する: `{ searchParams: Promise<{ tab?: string }> }`
- [x] タブの認可チェックを実装する: `tab === "all"` かつ `role` が `admin`/`manager` 以外の場合、デフォルトタブにフォールバック
- [x] デフォルトタブを決定する: `role === "member"` → `"my-requests"`, それ以外 → `"action-required"`
- [x] タブごとのフィルタリングを実装する:
  - `action-required`: `requests.filter(r => r.status === "pending" && (r.approvalSteps.length === 0 || r.approvalSteps.some(s => s.status === "pending" && s.approverRole === role)))` — `approvalSteps` が空のレガシー申請（単一承認フロー）は role 判定をスキップし pending であれば表示する
  - `my-requests`: `requests.filter(r => r.creatorId === userId)`
  - `all`: フィルタなし（全件）
- [x] 表示タブリストを構築する: admin/manager には 3 タブ、それ以外は 2 タブ（「すべて」なし）
- [x] 各タブのカウントを算出してタブコンポーネントに渡す
- [x] `RequestTabs` コンポーネントを `BulkApprovalPanel` の上に配置する
- [x] ツールバーの既存ステータスカウント表示（承認待/承認済/却下 等）を削除し、タブ + カウントに置き換える

**Acceptance Criteria**:
- `?tab=action-required`, `?tab=my-requests`, `?tab=all` でそれぞれフィルタされたリクエストが表示される
- パラメータなしの場合、ロールに応じたデフォルトタブが適用される
- `member` ロールで `?tab=all` アクセス時にデフォルトタブにフォールバックする
- admin/manager に 3 タブ、member/finance に 2 タブが表示される

## T-04: 一覧テーブルを 5 カラムに変更する

- [x] `BulkApprovalPanel.tsx` のテーブルヘッダーを 5 カラムに変更する: 件名, 申請者, ステータス, 種別, 申請日
- [x] 既存の No., 金額, 承認経路, 期限, 操作カラムを削除する
- [x] カラム幅を設定する: `1.9fr 90px 110px 90px 110px`（CSS grid または table の width 指定）
- [x] ステータスカラムにステータスバッジ（既存の `statusLabel` + `statusClass`）を表示する
- [x] 種別カラムに `originType` ベースのラベルを表示する: `"manual"` → 「手動」, `"system"` → 「自動」
- [x] 申請日カラムに `createdAt` を日本語フォーマット（YYYY/MM/DD）で表示する
- [x] `RequestItem` 型に `originType` プロパティを追加する
- [x] `page.tsx` から `originType` をマッピングして `BulkApprovalPanel` に渡す
- [x] 一括承認チェックボックスは既存機能として維持する（pending リクエストの先頭カラムに表示）
- [x] 行クリックで詳細ページに遷移するようにする（`<Link>` または `data-href` + `RowClickHandler`）
- [x] フッターのステータスカウント表示を維持する

**Acceptance Criteria**:
- テーブルが 5 カラムで表示される
- `originType` に応じた「手動」「自動」ラベルが表示される
- 一括承認チェックボックスが機能する
- 行クリックで詳細ページに遷移する
- 既存の `bulkApproveAction` が動作する

## T-05: ApprovalStepper コンポーネントを作成する

- [x] `src/app/(dashboard)/requests/[id]/ApprovalStepper.tsx` を新規作成する（Server Component）
- [x] Props: `steps: ApprovalStep[]`, `currentStepId: string | null`
- [x] ステップを `stepOrder` 順に縦に並べる
- [x] 各ステップに状態アイコンを表示する:
  - `approved`: 緑のチェックマーク（✓）
  - `rejected`: 赤の×マーク（✕）
  - `pending` かつ現在のステップ: ハイライトされた丸（青/primary 色のボーダー）
  - `pending` かつ未到達: グレーの丸
- [x] ステップ間を縦線（コネクタ）で接続する。完了ステップの線は緑、pending は灰色
- [x] 各ステップに表示する情報: ステップ名（`name` ?? `approverRole`）, 承認者名（`approvedByName`）, 状態ラベル, コメント（`comment`）, 処理日時（`approvedAt`）
- [x] 現在のステップを視覚的にハイライトする（背景色の変更やボーダーの強調）

**Acceptance Criteria**:
- 承認ステップが縦に並び、ステップ間が縦線で接続される
- 各ステップの状態が異なるアイコンで視覚的に区別される
- 現在のステップがハイライト表示される
- コメントと日時が該当ステップに表示される

## T-06: SystemOriginBanner コンポーネントを作成する

- [x] `src/app/(dashboard)/requests/[id]/SystemOriginBanner.tsx` を新規作成する（Server Component, `async`）
- [x] Props: `originType: OriginType`, `originTriggerAction: string | null`, `originTriggerEntityId: string | null`, `organizationId: string`
- [x] `originType !== "system"` の場合は `null` を返す
- [x] `originTriggerAction` に応じてエンティティ名とリンク先を解決する:
  - `"inquiry.convert"` → `getInquiry({ inquiryId: originTriggerEntityId, organizationId })` で引合を取得。テキスト: 「この承認は引合「{title}」の案件化に必要です」、リンク: `/inquiries/{id}`
  - `"contract.create"` → `getContract({ contractId: originTriggerEntityId, organizationId })` で契約を取得。リンク: `/contracts/{id}`
  - `"contract.cancel"` → 同上
- [x] エンティティが取得できない場合は `null` を返す（エラーにしない）
- [x] バナーのスタイル: 情報バナー（青系背景 + ボーダー + アイコン）

**Acceptance Criteria**:
- `originType: "system"` かつ `originTriggerAction: "inquiry.convert"` の場合にバナーが表示される
- バナーに引合タイトルと `/inquiries/{id}` へのリンクが含まれる
- `originType: "manual"` の場合はバナーが表示されない
- エンティティが見つからない場合はエラーにならずバナーが非表示になる

## T-07: ActionButtons を承認者限定の新デザインに変更する

- [x] `ActionButtons` コンポーネントの Props に `isCurrentApprover: boolean` を追加する
- [x] `requestStatus === "pending"` の分岐を変更する:
  - `isCurrentApprover === true` の場合のみ承認/却下セクションを表示
  - コメント入力テキストエリアを追加する（`name="comment"`）
  - 「承認する」ボタン: primary スタイル（`SubmitButton` コンポーネント使用）
  - 「却下する」ボタン: danger outline スタイル（赤ボーダー + 赤テキスト + 白背景）
  - 既存の差し戻しボタン・差し戻しコメントフォームを削除する
- [x] `requestStatus === "draft"` と `requestStatus === "revision"` の分岐は変更しない（既存の submit/resubmit ボタンを維持）
- [x] 承認ボタンのフォームに `comment` フィールドの値を含めるが、`approveRequestAction` は comment を使用しない（現状の usecase が未対応のため）
- [x] 却下ボタンのフォームでは `comment` を `rejectRequestAction` に送信する（既存機能で対応済み）
- [x] `rejectRequestAction` の呼び出しで `targetStatus` は `"rejected"` 固定とする

**Acceptance Criteria**:
- `isCurrentApprover === true` かつ `pending` 状態の場合に「承認する」「却下する」ボタンが表示される
- `isCurrentApprover === false` かつ `pending` 状態の場合にボタンが表示されない
- コメントテキストエリアが操作ボタンと共に表示される
- 却下操作でコメントが送信される
- draft/revision 状態の既存ボタンが引き続き動作する

## T-08: 詳細ページを新デザインに再構成する

- [x] `page.tsx` にセッションユーザーの `role` と `id` を追加で取得する
- [x] `getApprovalSteps` の結果から現在のステップを特定する（`getCurrentStep` ドメインサービス使用、または `steps.find(s => s.status === "pending")` を `stepOrder` 順で取得）
- [x] `getActiveDelegationsForUser` ユースケース（新規作成）でセッションユーザーの委任データを取得する
- [x] `canApproveWithDelegation(currentStep, role, delegations)` で承認者判定を行い、`result.allowed` から `isCurrentApprover` フラグを算出する
- [x] ヘッダーセクションを実装する:
  - 「← 申請一覧に戻る」リンク（既存維持）
  - 件名（大きめフォント）
  - ステータスバッジ（`statusLabel` + `statusClass` 使用、バッジ風スタイル: `rounded-full px-2 py-0.5 text-xs`）
  - 申請者名（`userNameMap` 使用、ユーザー名取得のため `listOrganizationUsers` を呼び出す）
  - 申請日時（`createdAt` のフォーマット表示）
- [x] `SystemOriginBanner` コンポーネントを配置する（T-06 で作成したもの）。Props に `request.originType`, `request.originTriggerAction`, `request.originTriggerEntityId`, `organizationId` を渡す
- [x] フォームデータセクション（既存）を維持する
- [x] `ApprovalStepsSection`（既存の `DataTable` 使用）を `ApprovalStepper`（T-05 で作成）に置き換える
- [x] `ActionButtons` に `isCurrentApprover` を渡す
- [x] 全体を `SectionCard` で囲むレイアウトを維持する

**Acceptance Criteria**:
- ヘッダーに件名・ステータスバッジ・申請者名・申請日時が表示される
- `originType === "system"` の場合にシステム連動バナーが表示される
- 承認ステップが縦ステッパー UI で表示される
- 承認者のみに承認/却下ボタンが表示される
- フォームデータセクションが引き続き表示される
- 既存の戻るリンクが動作する

## T-09: 最終検証

- [x] `bun run typecheck` が型エラーなしで完了する
- [x] `bun test` が全テスト pass する
- [x] `bun run build` が成功する
- [x] 手動申請ページ（`requests/new/page.tsx`）が変更されていないことを確認する

**Acceptance Criteria**:
- `bun run typecheck && bun test` が exit 0 で完了する
- `bun run build` が exit 0 で完了する
- `requests/new/page.tsx` に差分がない
