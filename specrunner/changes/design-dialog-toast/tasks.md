# Tasks: ダイアログ・トーストのデザイン統一

## T-01: ConfirmDialog コンポーネントの作成

- [x] `src/app/components/ConfirmDialog.tsx` を新設する
- [x] Props: `open`, `title`, `message?`, `confirmLabel?`（デフォルト: "確認"）, `cancelLabel?`（デフォルト: "キャンセル"）, `variant?`（"primary" | "danger", デフォルト: "primary"）, `loading?`, `onConfirm`, `onCancel`, `children?`
- [x] `open=false` のとき何もレンダリングしない（早期 return で `null`）
- [x] オーバーレイ: `fixed inset-0 bg-black/40 flex items-center justify-center z-50`
- [x] モーダル: `bg-bg-surface border border-border rounded p-4` + `max-width: 420px` + `shadow-md` + `w-full`
- [x] タイトル: `text-sm font-bold text-text mb-3`
- [x] メッセージ: `text-xs text-text-muted mb-4`（message が指定された場合のみ表示）
- [x] children: メッセージの下、ボタンの上に配置（`mb-4`）
- [x] ボタン行: `flex gap-2 justify-end`
- [x] キャンセルボタン: `border border-border text-text text-xs px-3 py-1.5 cursor-pointer disabled:opacity-50`
- [x] 確認ボタン（primary）: `bg-primary text-white text-xs px-3 py-1.5 cursor-pointer disabled:opacity-50`
- [x] 確認ボタン（danger）: `bg-danger text-white text-xs px-3 py-1.5 cursor-pointer disabled:opacity-50`
- [x] `loading=true` 時: 両ボタンを disabled にする
- [x] `"use client"` ディレクティブを付与する
- [x] `src/app/components/index.ts` に ConfirmDialog を export に追加する

**Acceptance Criteria**:
- ConfirmDialog.tsx が存在し、上記 Props を受け取れる
- variant="primary" と variant="danger" で確認ボタンの色が異なる
- open=false で何もレンダリングされない
- children を渡すとメッセージとボタンの間にレンダリングされる
- `bun run build` が通る

## T-02: Toast システムの作成（Context + Provider + コンポーネント + Hook）

- [x] `src/app/components/Toast.tsx` を新設する
- [x] ToastVariant 型: `"success" | "error"`
- [x] Toast 内部状態の型: `{ id: string; message: string; variant: ToastVariant }`
- [x] `ToastContext` を作成: `{ showToast: (message: string, variant: ToastVariant) => void }`
- [x] `ToastProvider` コンポーネントを作成: children を受け取り、Context.Provider でラップする
- [x] `showToast` 実装: 新しい toast state をセットする。既存トーストがあれば置き換える。`setTimeout` で 3 秒後に消去する（前回の timer は `clearTimeout` でキャンセル）
- [x] Toast 表示要素: `fixed top-4 right-4 z-[60]`、`bg-bg-surface border border-border shadow-md px-4 py-3 min-w-[240px] max-w-[360px]`
- [x] 成功バリアント: `border-l-4 border-l-success`
- [x] エラーバリアント: `border-l-4 border-l-danger`
- [x] メッセージテキスト: `text-xs text-text`
- [x] `useToast` フックを作成: Context から `showToast` を取得して返す。Provider 外で呼ばれた場合はエラーをスローする
- [x] `"use client"` ディレクティブを付与する
- [x] `src/app/components/index.ts` に `ToastProvider` と `useToast` を export に追加する

**Acceptance Criteria**:
- Toast.tsx が存在し、ToastProvider / useToast がエクスポートされている
- showToast("msg", "success") で緑左ボーダーのトーストが右上に表示される
- showToast("msg", "error") で赤左ボーダーのトーストが右上に表示される
- 3 秒後にトーストが自動消去される
- `bun run build` が通る

## T-03: ToastProvider をダッシュボードレイアウトに統合する

- [x] `src/app/(dashboard)/DashboardProviders.tsx` を新設する（"use client"）
- [x] DashboardProviders コンポーネント: `{ children: ReactNode }` を受け取り、`<ToastProvider>{children}</ToastProvider>` を返す
- [x] `src/app/(dashboard)/layout.tsx` で DashboardProviders を import し、`<main>` 内の children を `<DashboardProviders>` でラップする

**Acceptance Criteria**:
- ダッシュボード内の任意のページから useToast() が使用可能になっている
- ダッシュボードレイアウトが server component のまま維持されている
- `bun run build` が通る

## T-04: window.confirm() を ConfirmDialog に置換する

以下の 5 ファイルで `window.confirm()` を ConfirmDialog に置き換える。各ファイルで `useState<boolean>(false)` の confirm 表示 state を追加し、ボタンクリックで state を true にし、onCancel で false にする。onConfirm で元の処理を実行する。

- [x] `src/app/(dashboard)/contracts/[id]/DeleteContractButton.tsx`: variant="danger", title="削除確認", message="この契約を削除しますか？", loading=isDeleting
- [x] `src/app/(dashboard)/deals/[id]/DeleteDealButton.tsx`: variant="danger", title="削除確認", message="この案件を削除しますか？担当者は自動的に削除されます。", loading=isDeleting
- [x] `src/app/(dashboard)/inquiries/[id]/DeleteInquiryButton.tsx`: variant="danger", title="削除確認", message="この引き合いを削除しますか？", loading=isDeleting
- [x] `src/app/(dashboard)/clients/[id]/ClientContactsSection.tsx`: 担当者削除の handleDelete 内の window.confirm を置換。variant="danger", title="削除確認", message="この担当者を削除しますか？"。削除対象の contactId を state で保持する
- [x] `src/app/(dashboard)/deals/[id]/DealHeaderActions.tsx`: 受注/失注の handleTransition 内の window.confirm を置換。variant は受注="primary"/失注="danger"、title はフェーズ名を含む

**Acceptance Criteria**:
- プロジェクト内に `window.confirm` の呼び出しが 0 件である
- 各削除ボタンで ConfirmDialog が表示され、確認/キャンセルが機能する
- 削除系は danger バリアント、受注は primary バリアントが使われている
- `bun run build` が通る

## T-05: 既存インラインモーダルを ConfirmDialog に統一し、ContractStatusActions に確認を追加する

- [x] `src/app/(dashboard)/inquiries/[id]/InquiryActions.tsx`: 案件化確認のインラインモーダル（lines 82-105 付近）を ConfirmDialog に置き換える。title="案件化", message="この引き合いを案件化しますか？案件が作成され、ステータスが「案件化済」に変わります。", variant="primary", loading=isSubmitting
- [x] `src/app/(dashboard)/contracts/[id]/invoices/[invoiceId]/InvoiceActions.tsx`: 入金確認のインラインモーダル（lines 86-122 付近）を ConfirmDialog + children に置き換える。title="入金日を確認", children に日付入力フィールドを配置, variant="primary", loading=isSubmitting
- [x] `src/app/(dashboard)/contracts/[id]/ContractStatusActions.tsx`: handleTransition に確認ダイアログを追加する。遷移先ステータスに応じた state 管理（pendingStatus）を追加。completed は variant="primary"（title="契約完了", message="この契約を完了しますか？"）、cancelled は variant="danger"（title="契約解除", message="この契約を解除しますか？"）

**Acceptance Criteria**:
- InquiryActions のインラインモーダル HTML が ConfirmDialog に置き換わっている
- InvoiceActions のインラインモーダル HTML が ConfirmDialog（children 付き）に置き換わっている
- ContractStatusActions の完了/解除ボタン押下時に ConfirmDialog が表示される
- `bun run build` が通る

## T-06: アクション結果メッセージをトーストに移行する

ボタン操作アクション（削除、ステータス遷移）の結果メッセージをインライン表示からトースト表示に移行する。各ファイルで `useToast()` を import し、成功時に `showToast(msg, "success")`、エラー時に `showToast(msg, "error")` を呼び出す。不要になった `error` / `errorMessage` state とインライン表示 JSX を削除する。

対象ファイル:

- [x] `src/app/(dashboard)/contracts/[id]/DeleteContractButton.tsx`: 削除エラー → error toast、削除成功 → success toast（router.push 前に発行）
- [x] `src/app/(dashboard)/deals/[id]/DeleteDealButton.tsx`: 同上
- [x] `src/app/(dashboard)/inquiries/[id]/DeleteInquiryButton.tsx`: 同上
- [x] `src/app/(dashboard)/clients/[id]/ClientContactsSection.tsx`: 担当者の追加/削除/更新のエラー → error toast、成功 → success toast
- [x] `src/app/(dashboard)/deals/[id]/DealHeaderActions.tsx`: 遷移エラー → error toast、遷移成功 → success toast
- [x] `src/app/(dashboard)/contracts/[id]/ContractStatusActions.tsx`: 遷移エラー → error toast、遷移成功 → success toast
- [x] `src/app/(dashboard)/inquiries/[id]/InquiryActions.tsx`: 遷移エラー → error toast、遷移成功 → success toast
- [x] `src/app/(dashboard)/contracts/[id]/invoices/[invoiceId]/InvoiceActions.tsx`: 遷移エラー → error toast、遷移成功 → success toast

対象外（インライン維持）:
- フォーム送信画面（NewDealForm, NewContractForm, NewInvoiceForm, ClientForm, InquiryForm 等）のバリデーションエラー
- セクション編集（DealInfoSection, DealNotesSection, MeetingSummarySection 等）の保存エラー
- WebhookCreateForm の成功メッセージ（secret 表示を兼ねる）

**Acceptance Criteria**:
- 上記 8 ファイルでアクション結果がトーストで表示される
- 上記 8 ファイルからインラインのエラー/成功表示 JSX が削除されている（error state 自体は ConfirmDialog の loading 管理に必要なら残してよい）
- `typecheck && test` が green
