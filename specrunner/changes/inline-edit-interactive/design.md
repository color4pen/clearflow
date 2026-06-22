# Design: 詳細画面のインタラクティブ編集

## Context

現在の詳細画面（引き合い・案件・契約・商談）は「表示専用」で、フィールドを変更するには別の編集画面（`/xxx/[id]/edit`）に遷移する必要がある。業務システムとして「見る画面＝触る画面」が自然であり、詳細画面から直接フィールドを編集できるようにする。

DealNotesSection（`src/app/(dashboard)/deals/[id]/DealNotesSection.tsx`）で既にインライン編集パターンが実装されている。`isEditing` state でトグルし、`updateDealAction` に FormData で部分送信、`router.refresh()` で反映する方式。このパターンを汎用コンポーネントとして抽出し、全詳細画面に展開する。

各 Server Action（`updateDealAction`, `updateInquiryAction`, `updateContractAction`, `updateMeetingAction`）は既に部分更新に対応しており、送信しないフィールドは既存値を維持する。

なお `updateInquiryAction` は `useActionState` 互換のシグネチャ（`(id, prevState, formData)`）を持つ。インライン編集では直接呼び出し方式を採用するため、`updateInquiryAction` の呼び出し元で prevState にダミー値 `{}` を渡す。

権限制御は各詳細ページのサーバーコンポーネントでセッションの `user.role` を参照して `editable` boolean を算出し、クライアントコンポーネントに渡す。既存の `canChangeStatus` / `canChangePhase` / `canManage` の判定パターンと統一する（admin/manager = editable）。

アクションアイテムの集約表示は案件詳細ページに新セクションとして追加する。案件に紐づく全商談の未完了アクションアイテムを一覧し、チェックボックスで完了/未完了をトグルする。トグル操作は `updateMeetingAction` を経由して該当商談の actionItems を更新する。

## Goals / Non-Goals

**Goals**:

- 汎用インライン編集コンポーネント群（InlineEditText, InlineEditTextarea, InlineEditSelect, InlineEditDate, InlineEditMoney）を `src/app/components/` に作成する
- 引き合い・案件・契約・商談の詳細画面で各フィールドをインライン編集可能にする
- 案件詳細に全商談のアクションアイテム集約セクションを追加し、ワンクリックで完了トグルできるようにする
- admin/manager ロールのみ編集可能とし、member/finance は表示専用のまま維持する

**Non-Goals**:

- 編集ページ（`/xxx/[id]/edit`）の削除（一括編集として残す）
- 参加者のインライン編集（構造が複雑なため編集ページに委ねる）
- 顧客詳細のインライン化
- 承認リクエスト詳細のインライン化
- Server Action のシグネチャ変更（既存の FormData ベースのインターフェースをそのまま利用する）

## Decisions

### D1: isEditing トグル + 部分更新パターンを汎用化する

**選択**: DealNotesSection の `isEditing` state + FormData 部分送信 + `router.refresh()` パターンを、各インライン編集コンポーネントに内包する。各コンポーネントは `onSave(newValue: string): Promise<ActionResult>` コールバックを受け取り、保存ロジックはページ側で定義する。
**却下**: contentEditable を使う方式。ブラウザ間の挙動差が大きく、FormData 送信パターンと合わない。

**Rationale**: DealNotesSection で既に動作実績があり信頼性が高い。`onSave` コールバック方式にすることで、コンポーネントは値の表示/入力のみを担い、保存先の Server Action の違いを吸収できる。

### D2: onSave コールバックは `Promise<{ success: boolean; message?: string }>` を返す

**選択**: 各インライン編集コンポーネントの `onSave` は `Promise<{ success: boolean; message?: string }>` を返す。コンポーネントは結果に応じて error 表示 / 編集モード解除を制御する。
**却下**: `onSave` を void にして親側でトースト表示する方式

**Rationale**: エラーをフィールド直下に表示するのが業務システムの UX として自然。コンポーネント内で完結させることで、親側のステート管理が不要になる。`updateDealAction` は `{ success, message }` を返すためそのまま渡せる。`updateInquiryAction` は異なる戻り値型だが、呼び出し側のラッパーで統一する。

### D3: InlineEditSelect のフェーズ変更で won/lost 選択時に window.confirm で確認する

**選択**: InlineEditSelect で値変更後、`onSave` 呼び出し前にページ側で `window.confirm` を挟む。確認は InlineEditSelect の `onBeforeSave` コールバック（省略可能）で制御する。
**却下**: 別セクションのボタン群でフェーズ変更する方式

**Rationale**: 「見る画面＝触る画面」の原則に沿う。won/lost は不可逆ではないがビジネスインパクトが大きいため、confirm で誤操作を防ぐ。Select の onChange で即保存する設計を維持しつつ、重要な選択肢のみ確認を挟める柔軟性を確保する。

### D4: アクションアイテム集約表示は専用クライアントコンポーネントとして実装する

**選択**: `DealActionItemsSection` をクライアントコンポーネントとして作成する。サーバーコンポーネント側で全商談データから actionItems を抽出し、`{ meetingId, meetingLabel, actionItem, index }` の配列を props で渡す。トグル時は `updateMeetingAction` を呼び出して該当商談の全 actionItems（トグル対象の done を反転）を送信する。
**却下**: 個別のアクションアイテム更新 API を新規作成する方式

**Rationale**: actionItems は商談の jsonb カラムに埋め込まれており、個別更新 API を作るとスキーマの分離が必要になる。既存の `updateMeetingAction` で actionItems 全体を送信する方式は、現行アーキテクチャと整合する。

### D5: 各詳細ページのインライン化は部分的にクライアントコンポーネントを抽出する

**選択**: 各詳細ページ（page.tsx）はサーバーコンポーネントのまま維持する。インライン編集が必要なセクションのみクライアントコンポーネントに切り出す（例: `InquiryInfoSection`, `DealInfoSection`, `ContractInfoSection`, `MeetingSummarySection`）。サーバーコンポーネントが `editable` フラグを算出してクライアントコンポーネントに渡す。
**却下**: ページ全体を `"use client"` にする方式

**Rationale**: サーバーコンポーネントの利点（データフェッチの最適化、バンドルサイズ削減）を維持する。必要最小限のクライアントコンポーネント抽出で、既存のサーバーコンポーネント構造を破壊しない。

### D6: 保存後の反映は router.refresh() で行う

**選択**: DealNotesSection と同様に `router.refresh()` でサーバーコンポーネントを再レンダリングする。
**却下**: optimistic update（楽観的更新）でローカル状態を先に反映する方式

**Rationale**: `router.refresh()` は Server Component のデータ再取得を自動で行い、UI とサーバーの一貫性が保証される。DealNotesSection で既に確立されたパターンであり、フィールド単位の保存であればレイテンシも許容範囲。楽観的更新は実装の複雑度が上がり、ロールバック処理も必要になる。

## Risks / Trade-offs

**[Risk]** インライン編集フィールドが増えることで、1フィールドの保存ごとに Server Action が呼ばれ、DB アクセスが増加する
→ **Mitigation**: 既存の部分更新ロジックは軽量であり、フィールド単位の保存はユーザーアクション起点のため頻度は低い。パフォーマンス問題が顕在化した場合はデバウンスまたはバッチ更新を検討する。

**[Risk]** `updateInquiryAction` のシグネチャが他の Action と異なり（`(id, prevState, formData)`）、ラッパーが必要
→ **Mitigation**: インライン編集の onSave コールバック内で prevState に `{}` を渡すラッパー関数を定義する。Action のシグネチャ変更は本変更のスコープ外とする。

**[Risk]** アクションアイテムのトグルで商談の全 actionItems を送信するため、同時編集時にデータ損失の可能性がある
→ **Mitigation**: 単一テナント内のユーザー数は限定的で、同一商談の同時編集は稀。`router.refresh()` で最新データを再取得するため、次回操作時に矛盾は解消される。

**[Risk]** InlineEditSelect の即時保存で、意図しない値変更が保存される可能性がある
→ **Mitigation**: Select の onChange で即保存する設計は一般的な UI パターン。特にフェーズの won/lost は `window.confirm` で確認を挟む。

## Open Questions

なし — architect により設計判断が評価済みであり、未解決の技術的判断はない。
