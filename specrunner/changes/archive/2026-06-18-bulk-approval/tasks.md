# Tasks: bulk-approval

## T-01: bulkApprove usecase を新設する

- [x] `src/application/usecases/bulkApprove.ts` を作成する
- [x] 入力型を定義する: `{ requestIds: string[], actorId: string, actorRole: string, organizationId: string }`
- [x] 結果型を定義する: `BulkApproveResult = { results: Array<{ requestId: string, success: boolean, reason?: string }> }`
- [x] `requestIds` を `for...of` で順次ループし、各 ID に対して既存の `approveRequest` を呼び出す
- [x] `approveRequest` が `{ ok: true }` を返した場合は `{ requestId, success: true }` を results に追加する
- [x] `approveRequest` が `{ ok: false, reason }` を返した場合は `{ requestId, success: false, reason }` を results に追加する（ループは継続）
- [x] `src/application/usecases/index.ts` に `export { bulkApprove } from "./bulkApprove"` を追加する

**Acceptance Criteria**:
- `bulkApprove.ts` が存在し、`approveRequest` を import して呼び出している
- 結果型が `{ results: Array<{ requestId: string, success: boolean, reason?: string }> }` である
- `@/app/actions` からの import が存在しない（依存方向遵守）
- `index.ts` から `bulkApprove` が export されている

## T-02: bulkApproveAction Server Action を追加する

- [x] `src/app/actions/requests.ts` に `bulkApproveAction` を追加する
- [x] 関数シグネチャ: `export async function bulkApproveAction(requestIds: string[]): Promise<BulkApproveActionResult>`
- [x] 結果型を定義する: `BulkApproveActionResult = { success: boolean, message?: string, results?: Array<{ requestId: string, success: boolean, reason?: string }> }`
- [x] `auth()` で認証チェック。未認証時は `{ success: false, message: "認証が必要です" }` を返す
- [x] ロールチェック: `session.user.role === "member"` の場合 `{ success: false, message: "権限がありません" }` を返す
- [x] 入力バリデーション: `requestIds` が配列でない、空配列、または21件以上の場合はエラーを返す。上限超過時のメッセージ: `"一括承認は20件までです"`
- [x] 各 requestId が文字列であることを zod でバリデーションする
- [x] `bulkApprove` usecase を呼び出し、結果を返す
- [x] `revalidatePath("/requests")` を呼び出す
- [x] `import { bulkApprove } from "@/application/usecases"` を追加する

**Acceptance Criteria**:
- `bulkApproveAction` が `src/app/actions/requests.ts` に存在する
- member ロールが拒否される
- requestIds が 21 件以上でバリデーションエラーが返る
- requestIds が空配列でバリデーションエラーが返る
- 認証チェックが usecase 呼び出しより前に実行される
- `revalidatePath` が呼び出される

## T-03: 申請一覧画面に BulkApprovalPanel Client Component を新設する

- [x] `src/app/(dashboard)/requests/BulkApprovalPanel.tsx` を作成する（`"use client"` ディレクティブ付き）
- [x] props として申請リスト（id, status を含むオブジェクト配列）と `bulkApproveAction` を受け取る
- [x] `useState` で選択済み requestId の Set を管理する
- [x] テーブルのヘッダー行にチェックボックス列を追加する（全選択ボタンではなくヘッダーラベルのみ）
- [x] 各行に対し、status が `"pending"` の場合のみチェックボックスを表示する。それ以外の status では空セルとする
- [x] チェックボックスの onChange で選択 Set を更新する
- [x] 「一括承認」ボタンを表示する。選択件数が 0 の場合は `disabled` にする
- [x] ボタンラベルに選択件数を表示する（例: `一括承認（3件）`）
- [x] `useTransition` でボタン押下時の pending 状態を管理する
- [x] ボタン押下時に `bulkApproveAction(selectedIds)` を呼び出す
- [x] 既存のテーブル構造（タイトル・ステータス・金額・作成日時カラム）を維持する

**Acceptance Criteria**:
- `BulkApprovalPanel.tsx` が `"use client"` ディレクティブを持つ
- pending 状態の申請のみにチェックボックスが表示される
- 0 件選択時にボタンが disabled になる
- 選択件数がボタンラベルに表示される
- pending 中はボタンが disabled になる

## T-04: 申請一覧画面（page.tsx）を BulkApprovalPanel に統合する

- [x] `src/app/(dashboard)/requests/page.tsx` を修正する
- [x] 既存のテーブル描画部分を `BulkApprovalPanel` コンポーネントに置き換える
- [x] Server Component 側で `bulkApproveAction` を bind した関数を props として渡す
- [x] 申請リストデータ（id, title, status, amount, createdAt）を props として渡す
- [x] session からロール情報を取得し、member ロールの場合はチェックボックスを非表示にする（`showBulkApproval` prop）
- [x] 「新規申請」リンクは既存のまま維持する
- [x] 空状態の表示は既存のまま維持する

**Acceptance Criteria**:
- Server Component のまま data fetching を行っている
- `BulkApprovalPanel` に申請リストと action を渡している
- member ロールにはチェックボックス UI が表示されない
- 既存のテーブル構造（タイトル・ステータス・金額・作成日時）が維持されている

## T-05: 一括承認結果の表示を実装する

- [x] `BulkApprovalPanel` 内で一括承認の結果を状態管理する
- [x] 全件成功時: 成功件数を含むメッセージを緑色のアラートで表示する（例: 「3件の承認が完了しました」）
- [x] 一部失敗時: 成功件数と失敗件数を含むメッセージを表示し、失敗した申請の ID と理由をリストで表示する
- [x] 全件失敗時: エラーメッセージを赤色のアラートで表示する
- [x] 結果表示後、チェックボックスの選択状態をリセットする
- [x] アラートに閉じるボタンを付け、手動で非表示にできるようにする

**Acceptance Criteria**:
- 全件成功時に成功メッセージが表示される
- 一部失敗時に成功件数・失敗件数・失敗理由が表示される
- 結果表示後にチェックボックスがリセットされる
- アラートを閉じることができる

## T-06: テスト — bulkApprove usecase の静的コード解析テストを追加する

- [x] `src/__tests__/usecases/bulkApprove.test.ts` を作成する
- [x] テスト: `bulkApprove.ts` が存在し `approveRequest` を import している
- [x] テスト: `bulkApprove.ts` が `results` プロパティを持つオブジェクトを返す（ソース内に `results` 文字列が存在する）
- [x] テスト: `bulkApprove.ts` に `for` ループまたは反復処理が存在する（順次実行の確認）
- [x] テスト: `bulkApprove.ts` に `@/app/actions` からの import がない（依存方向テスト）

**Acceptance Criteria**:
- テストファイルが存在し `bun test` で実行される
- 全テストが green になる

## T-07: テスト — bulkApproveAction の静的コード解析テストを追加する

- [x] 既存の `src/__tests__/usecases/requestWorkflow.test.ts` または `src/__tests__/actions/requestValidation.test.ts` にテストを追加する
- [x] テスト: `bulkApproveAction` が `requests.ts` に存在する
- [x] テスト: `bulkApproveAction` 内で `auth()` が呼び出される（認証チェック）
- [x] テスト: `bulkApproveAction` 内で `role === "member"` チェックが存在する
- [x] テスト: `requests.ts` 内に requestIds 上限 20 のバリデーションが存在する（`20` という数値リテラルが `bulkApprove` 関連のコードに含まれる）
- [x] テスト: `requests.ts` から `bulkApproveAction` が export されている

**Acceptance Criteria**:
- テストが `bun test` で実行される
- 全テストが green になる

## T-08: テスト — 一覧画面の一括選択 UI の静的コード解析テストを追加する

- [x] 既存の `src/__tests__/static/projectStructure.test.ts` にテストを追加する
- [x] テスト: `BulkApprovalPanel.tsx` が存在する
- [x] テスト: `BulkApprovalPanel.tsx` が `"use client"` ディレクティブを持つ
- [x] テスト: `BulkApprovalPanel.tsx` 内に `checkbox` または `type="checkbox"` が存在する
- [x] テスト: `BulkApprovalPanel.tsx` 内に `disabled` が存在する（ボタンの無効化）
- [x] テスト: `requests/page.tsx` が `BulkApprovalPanel` を import している

**Acceptance Criteria**:
- テストが `bun test` で実行される
- 全テストが green になる

## T-09: ビルド・型チェック・既存テストの確認

- [x] `bun run build` が成功することを確認する
- [x] `bun test` が全件 green であることを確認する（TC-025 は .env.example 未存在による pre-existing failure）
- [x] 既存テスト（projectStructure, requestWorkflow 等）が壊れていないことを確認する

**Acceptance Criteria**:
- `bun run build` が exit code 0 で完了する
- `bun test` が全件 pass する
- 既存のテストケースに変更を加えていない（新規追加のみ）
