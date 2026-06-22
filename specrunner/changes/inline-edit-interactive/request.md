# 詳細画面のインタラクティブ編集

## Meta

- **type**: spec-change
- **slug**: inline-edit-interactive
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: UI パターンの変更（別ページ編集→インライン編集）。アーキテクチャ変更ではない → false -->

## 背景

現在の詳細画面は「表示だけ」で、変更するには別の編集画面に遷移する必要がある。業務システムとして使うには「見る画面＝触る画面」が自然であり、詳細画面から直接フィールドを編集できるようにする。

既に案件の備考（DealNotesSection）でインライン編集パターンが実装済み。このパターンを汎用化して全詳細画面に展開する。

また、アクションアイテムは商談の jsonb に埋め込まれているが、案件詳細で全商談のアクションアイテムを集約表示し、完了トグルをワンクリックで操作できるようにする。

## 現状コードの前提

<!-- 現状のコードについての断定（「今のコードはこうなっている」）は file:line を伴ってこの節に書く。 -->

- `src/app/(dashboard)/deals/[id]/DealNotesSection.tsx:1-86` — 既存のインライン編集パターン。`isEditing` boolean でトグル、`updateDealAction` に部分送信、`router.refresh()` で反映
- `src/app/actions/deals.ts:192-266` — `updateDealAction` は部分更新対応。送信しないフィールドは既存値維持
- `src/app/actions/inquiries.ts:157-200` — `updateInquiryAction` も部分更新対応（title, description, source, clientId, assigneeId）
- `src/app/actions/contracts.ts:104-158` — `updateContractAction` も部分更新対応
- `src/app/actions/meetings.ts:216-314` — `updateMeetingAction` も部分更新対応（actionItems を JSON で受け付ける）
- `src/app/(dashboard)/inquiries/[id]/page.tsx` — 表示フィールド: ステータス, 顧客, 流入経路, 作成日, 内容。編集は `/inquiries/${id}/edit` への遷移
- `src/app/(dashboard)/deals/[id]/page.tsx` — 表示フィールド: 案件名, フェーズ, 想定金額, 開始日, 終了日, 契約種別, 作成日。編集は `/deals/${id}/edit` への遷移。備考のみインライン編集済み
- `src/app/(dashboard)/contracts/[id]/page.tsx` — 表示フィールド: 契約名, ステータス, 種別, 金額, 開始日, 終了日, 支払条件, 更新種別, 更新サイクル。編集は `/contracts/${id}/edit` への遷移
- `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/page.tsx` — 左カラム: 種別, 日時, 場所, 参加者, ヒアリング項目。右カラム: 議事録, アクションアイテム。編集は別ページ遷移
- `src/app/components/index.ts` — 共有コンポーネント。インラインエディタブルの汎用コンポーネントは存在しない

## 要件

<!-- コツ: 実装の最重量部（既存機構の一般化・暗黙の前提の変更）は行間に隠さず要件として名指しする。 -->

### A. 汎用インライン編集コンポーネント

1. **InlineEditText コンポーネント**: テキストフィールドのインライン編集。表示時はテキスト、クリックで Input に切り替え、Enter またはブラーで保存。`value`, `onSave(newValue)`, `editable` props を持つ。`editable` が false ならテキスト表示のみ
2. **InlineEditTextarea コンポーネント**: 複数行テキストのインライン編集。表示時は `whitespace-pre-wrap` テキスト、クリックで Textarea に切り替え。保存ボタンで確定（ブラーでは保存しない、Textarea の操作性を損なうため）
3. **InlineEditSelect コンポーネント**: プルダウン選択のインライン編集。表示時はラベルテキスト、クリックで Select に切り替え、変更で即保存。`options: Array<{ value: string; label: string }>`, `value`, `onSave(newValue)`, `editable` props
4. **InlineEditDate コンポーネント**: 日付のインライン編集。表示時はフォーマット済みテキスト、クリックで date input に切り替え
5. **InlineEditMoney コンポーネント**: 金額のインライン編集。表示時はカンマ区切り + 円マーク、クリックで MoneyInput に切り替え
6. 全コンポーネントを `src/app/components/` に配置し、`"use client"` とする。`index.ts` に export 追加

### B. 引き合い詳細のインライン化

7. **引き合い詳細ページの修正**: 各フィールド（件名、流入経路、顧客、内容、担当者）をインラインエディタブルに変更する。`updateInquiryAction` を各フィールドの保存に使用する。ステータス変更（InquiryActions）はそのまま維持。編集ページ（`/inquiries/[id]/edit`）は残す（一括編集用途）

### C. 案件詳細のインライン化

8. **案件詳細ページの修正**: 案件情報セクションの各フィールド（案件名、フェーズ、想定金額、開始日、終了日、契約種別）をインラインエディタブルに変更する。`updateDealAction` を各フィールドの保存に使用する。フェーズ変更は InlineEditSelect で、won/lost 選択時に `window.confirm` で確認。編集ページは残す
9. **アクションアイテム集約表示**: 案件詳細に「アクションアイテム」セクションを追加する。全商談の未完了アクションアイテムを集約表示する。各アイテムにチェックボックスを配置し、クリックで完了/未完了をトグルする。トグルは `updateMeetingAction` で該当商談の actionItems を更新する。商談名（種別 + 日付）をアイテムの横に表示して、どの商談のアクションかわかるようにする

### D. 契約詳細のインライン化

10. **契約詳細ページの修正**: 各フィールドをインラインエディタブルに変更する。`updateContractAction` を使用する。ステータス変更（完了/解約）はボタンのまま維持

### E. 商談詳細のインライン化

11. **商談詳細ページの修正**: 議事録を InlineEditTextarea で編集可能にする。アクションアイテムの完了チェックをワンクリックで操作可能にする。他のフィールド（種別、日時、場所、参加者）は編集ページに委ねる（フィールド構造が複雑なため）

### F. 権限制御

12. **editable フラグ**: サーバーコンポーネントでセッションのロールを判定し、`editable` を boolean で各インラインコンポーネントに渡す。admin/manager は editable=true、member/finance は editable=false

## スコープ外

- 編集ページの削除（インライン化後も一括編集として残す）
- 参加者のインライン編集（構造が複雑なため編集ページに委ねる）
- 顧客詳細のインライン化（今回は引き合い・案件・契約・商談に絞る）
- 承認リクエスト詳細のインライン化

## 受け入れ基準

<!-- コツ: 機械検証できる文にする -->

- [ ] `bun run build` が成功する
- [ ] `bun test` が全件 green
- [ ] InlineEditText, InlineEditTextarea, InlineEditSelect, InlineEditDate, InlineEditMoney コンポーネントが存在する
- [ ] 引き合い詳細で件名をクリックして直接編集・保存できる
- [ ] 案件詳細でフェーズをプルダウンで変更でき、won/lost 時に確認ダイアログが出る
- [ ] 案件詳細にアクションアイテム集約セクションが表示される
- [ ] アクションアイテムのチェックボックスをクリックすると完了/未完了が即時切り替わる
- [ ] 契約詳細で金額をクリックして直接編集・保存できる
- [ ] 商談詳細で議事録をクリックして直接編集・保存できる
- [ ] member ロールでログインするとフィールドがテキスト表示のみで編集不可
- [ ] 依存方向 `actions → usecases → domain / infrastructure` を遵守
- [ ] `typecheck` が green

## architect 評価済みの設計判断

<!-- コツ: 採用した判断に加え、却下した代替案とその理由を書く。 -->

1. **DealNotesSection のパターン（isEditing トグル + 部分更新）を汎用化を採用、contentEditable を却下** — contentEditable はブラウザ間の挙動差異が大きく、フォームデータの送信パターンと合わない。isEditing トグルは既に動作実績がありシンプル
2. **InlineEditSelect でのフェーズ変更を採用、別セクションのボタン群を却下** — 業務システムとして「見る画面＝触る画面」を実現する。フェーズはプルダウンで選ぶほうが全選択肢が見えて自然
3. **アクションアイテムの集約表示を案件詳細に追加を採用、商談詳細だけに表示を却下** — アクションアイテムは案件の進捗管理に属する。各商談を開かないと見えない状態は非効率。案件詳細で横断的に一覧管理する
4. **editable prop でロールベースの表示切り替えを採用、別のコンポーネントを作るを却下** — 同じコンポーネントで表示/編集を切り替えるほうが、レイアウトの一貫性が保たれる。member 向けの別画面を作るとメンテコストが倍になる
