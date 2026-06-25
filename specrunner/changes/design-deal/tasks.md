# Tasks: design-deal

## T-01: 一覧 — パイプラインサマリを追加する

`src/app/(dashboard)/deals/page.tsx` にパイプラインサマリを追加する。

- [x] `getPipelineSummary` を import し、`listDeals` の代わりに呼び出す。返却値 `{ summary, deals }` から `summary` と `deals` の両方を使用する
- [x] `allDeals` の取得を `getPipelineSummary` の返却値 `deals` に置き換える（クエリを 1 回に統合）
- [x] ダッシュボード（`SalesDashboard.tsx` L122-159）と同じスタイルのパイプラインサマリ（`grid-cols-6`）をテーブル上部に追加する。各セルは `Link` で `?phase=<phase>` に遷移。合計セルは `/deals` に遷移
- [x] サマリのセル構成: フェーズラベル（text-xs text-text-muted）、件数（text-xl font-bold）、金額（text-xs font-mono）

**Acceptance Criteria**:
- 一覧ページ上部に 6 カラム（提案準備, 提案済, 交渉中, 受注, 失注, 合計）のサマリが表示される
- 各セルに件数と金額が表示される
- セルクリックで対応フェーズのフィルタが適用される

## T-02: 一覧 — フィルタを 3 つの select ドロップダウンに変更する

フェーズタブ（Link ベース）を 3 つの select ドロップダウンに変更する。

- [x] `DealsFilter` Client Component を `src/app/(dashboard)/deals/DealsFilter.tsx` に作成する。3 つの select（フェーズ / 顧客 / 契約形態）を横並び（flex gap-2）で配置
- [x] `searchParams` を `{ phase?: string; client?: string; contractType?: string }` に拡張する
- [x] `DealsFilter` の props: `currentPhase`, `currentClient`, `currentContractType`, `clients`（一意な顧客名リスト）, `contractTypes`（一意な契約形態リスト）
- [x] 各 select の onChange で `router.push` を呼び、URL searchParams を更新する。「すべて」オプション（value=""）を先頭に配置
- [x] 顧客リストと契約形態リストは `deals` 配列から一意な値を抽出して生成する
- [x] Server Component 側で `searchParams` の `client` と `contractType` によるフィルタを追加する（phase フィルタは既存を維持）
- [x] 既存のフェーズタブ Link UI（L44-59 の `div.mt-2.mb-2.flex.gap-2`）を削除する

**Acceptance Criteria**:
- フェーズタブが 3 つの select ドロップダウンに置き換わっている
- フェーズ / 顧客 / 契約形態 それぞれでフィルタが動作する
- 複数フィルタの組み合わせが正しく動作する
- 「すべて」を選択するとフィルタが解除される

## T-03: 一覧 — テーブルカラムを変更する

DataTable のカラム定義を変更する。

- [x] カラム順序を変更: 案件名, 顧客名, フェーズ, 契約形態, 想定金額
- [x] 「担当者」カラムを削除する
- [x] 「フェーズ」カラムの位置を先頭から 3 番目に移動する
- [x] 「契約形態」カラムを追加する。`contractTypeLabels` を使用してラベル表示。null の場合は "-"
- [x] 「想定金額」カラムに `font-mono` を追加する（render 関数内の span に className を追加）
- [x] `contractTypeLabels` を import に追加する

**Acceptance Criteria**:
- テーブルカラムが 案件名, 顧客名, フェーズ, 契約形態, 想定金額 の 5 列になっている
- 担当者カラムが表示されない
- 契約形態が日本語ラベルで表示される
- 想定金額が mono フォントで右寄せ表示される

## T-04: 詳細 — ヘッダーを変更する

パンくず + タイトル + サブテキスト + 受注/失注ボタンのヘッダーに変更する。

- [x] 既存のツールバー（L70-76 の `div.bg-bg-toolbar`）を新しいヘッダーに置き換える
- [x] パンくず: `案件一覧`（Link `/deals`）`>` `{deal.title}` のテキスト形式（text-xs text-text-muted）
- [x] タイトル: `deal.title`（text-lg font-bold text-text）
- [x] サブテキスト: `{client.name} · {phaseLabels[deal.phase]}`（text-sm text-text-muted）
- [x] 右側に受注/失注ボタンを配置する（flex justify-between で左右分離）
- [x] 「受注にする」ボタン: `border border-green-600 text-green-600 hover:bg-green-50 text-xs font-bold px-4 py-1.5`
- [x] 「失注にする」ボタン: `border border-danger text-danger hover:bg-red-50 text-xs font-bold px-4 py-1.5`
- [x] `deal.phase === "won" || deal.phase === "lost"` の場合はボタン非表示
- [x] ボタンの onClick で `window.confirm` → `updateDealPhaseAction` を呼ぶ。既存の DealPhaseActions の handleTransition ロジックと同様のパターン
- [x] ヘッダーのボタン部分は Client Component として分離する（`DealHeaderActions.tsx`）。Server Component の page.tsx からは deal.id, deal.phase, canChangePhase を渡す
- [x] `phaseLabels` を page.tsx に import する

**Acceptance Criteria**:
- ヘッダーにパンくず、タイトル、サブテキストが表示される
- 非終端フェーズの場合、受注/失注ボタンが右側に表示される
- won/lost の場合、受注/失注ボタンが非表示
- ボタンクリックで確認ダイアログ後にフェーズが変更される

## T-05: 詳細 — 2 カラムレイアウトを変更する

グリッドレイアウトを 1.5fr:1fr / gap 24px に変更し、セクション配置をデザインに合わせる。

- [x] `grid grid-cols-2 gap-2` を `grid gap-6` + `style={{ gridTemplateColumns: '1.5fr 1fr' }}` に変更する（Tailwind の `grid-cols-[1.5fr_1fr]` でも可）
- [x] 左カラムの内容: 基本情報（DealInfoSection）→ 関連情報 → フェーズ変更（DealPhaseActions）→ 商談記録
- [x] 右カラムの内容: 契約セクション → 担当者セクション → アクションアイテム
- [x] 備考（DealNotesSection）はグリッド外の下部に配置する（現在位置を維持）
- [x] 商談記録セクションをグリッド外から左カラム内に移動する
- [x] 担当者セクションをグリッド外から右カラム内に移動する
- [x] アクションアイテムセクションをグリッド外から右カラム内に移動する
- [x] 契約セクションは won 以外でも右カラムに表示する（ただし中身は現在のフェーズ判定を維持）
- [x] DealPhaseActions を左カラムに追加する。`canChangePhase` と `deal` の phase/id を渡す
- [x] `DealPhaseActions` を page.tsx の import に追加する

**Acceptance Criteria**:
- 2 カラムが 1.5fr:1fr の比率で表示される
- gap が 24px（gap-6）になっている
- 左カラムに基本情報、関連情報、フェーズ変更、商談記録が配置される
- 右カラムに契約、担当者、アクションアイテムが配置される

## T-06: 詳細 — DealInfoSection を表示/編集 2 モード化する

フォーム常時表示から、読み取り表示 + 編集ボタンクリックでフォーム切り替えに変更する。

- [x] `isEditing` state を追加する（初期値 `false`）
- [x] 表示モード（`!isEditing`）: 90px ラベル + 1fr 値のグリッドで各フィールドを読み取り表示する。セクションヘッダーに「編集」ボタンを配置（`editable` が true の場合のみ表示）
- [x] 表示モードのフィールド: 案件名, 想定金額（`¥` + toLocaleString）, 想定開始日, 想定終了日, 契約種別（contractTypeLabels）, 作成日
- [x] 表示モードではフェーズは表示しない（フェーズ変更は独立セクションに移動するため）
- [x] 編集モード（`isEditing`）: 既存のフォーム UI を維持。セクションヘッダーに「キャンセル」ボタンを追加。保存成功時に `setIsEditing(false)` を呼ぶ
- [x] 編集モードのフォームからフェーズ select を削除する（フェーズ変更は DealPhaseActions に委譲）
- [x] 「キャンセル」ボタンクリックで `setIsEditing(false)` を呼ぶ
- [x] 表示モードのラベル幅は `w-[90px]`、値部分は `flex-1` または grid の `1fr`

**Acceptance Criteria**:
- 初期表示が読み取りモード（ラベル + 値のグリッド）になっている
- 「編集」ボタンクリックでフォームモードに切り替わる
- フォームモードで保存するとデータが更新され、表示モードに戻る
- 「キャンセル」で変更を破棄して表示モードに戻る
- フェーズ select が編集モードから削除されている

## T-07: 詳細 — DealPhaseActions を改修する

現在フェーズのハイライト表示 + 非終端フェーズのみのボタン群に変更する。

- [x] 全非終端フェーズ（proposal_prep, proposed, negotiation）をボタンとして表示する（won/lost を除外）
- [x] 現在のフェーズのボタンをハイライトする（`bg-primary text-white`）。他のフェーズは `border border-border text-text hover:bg-bg-page`
- [x] 現在フェーズのボタンは disabled にする（クリック不可）
- [x] 終端フェーズ（won/lost）の場合はセクション全体を非表示にする（既存の挙動を維持）
- [x] `canChangePhase` が false の場合もセクション全体を非表示にする

**Acceptance Criteria**:
- 非終端フェーズ（提案準備, 提案済, 交渉中）の 3 ボタンが表示される
- 現在フェーズのボタンがハイライト表示（primary 色）され、disabled
- 他フェーズボタンのクリックでフェーズが変更される
- won/lost の場合はセクション非表示

## T-08: 詳細 — 担当者セクションを簡素化する

4 カラムテーブルから、名前 + 役割ラベルの flex レイアウトに変更する。

- [x] table 要素（thead + tbody）を `div` ベースの flex レイアウトに変更する
- [x] 各担当者行: `flex items-center gap-2` で名前（text-xs text-text）+ 役割ラベル（text-2xs bg-bg-surface-alt px-1.5 py-0.5 rounded text-text-muted）+ 削除ボタン
- [x] 部署・役職カラムを非表示にする（データは残るが表示しない）
- [x] 追加フォームは既存を維持する（select + role select + 追加ボタン）

**Acceptance Criteria**:
- 担当者が名前 + 役割ラベルの flex レイアウトで表示される
- 部署・役職が非表示
- 削除ボタンが各行に表示される
- 追加フォームが動作する

## T-09: 詳細 — 契約セクションのヘッダーに緑背景を適用する

- [x] 契約セクションのヘッダー（`h2` を含む `div.flex.items-center.justify-between`）に背景色を適用する: `bg-[#eef7f1]`、テキスト色 `text-[#1a8a4a]`、パディング `px-3 py-2 -mx-3 -mt-3 mb-2 rounded-t`（SectionCard の padding を相殺）
- [x] ヘッダーの h2 テキスト色を `text-[#1a8a4a]` に変更する
- [x] 「契約を作成」ボタンのスタイルは維持する

**Acceptance Criteria**:
- 契約セクションのヘッダーが緑背景（#eef7f1）になっている
- ヘッダーのテキスト色が #1a8a4a になっている

## T-10: 詳細 — 商談記録のスタイルを統一する

商談記録の行スタイルを種別タグ + 日時で統一する。

- [x] DataTable の商談記録を簡略化する。各行のレンダリングを: 種別タグ（`text-2xs bg-primary/10 text-primary rounded px-1.5 py-0.5`）+ 日時（text-xs text-text-muted）+ 詳細リンク の構成にする
- [x] 不要なカラム（場所, 参加者数, AI件数）を削除する
- [x] カラム構成: 種別（タグスタイル）, 日時, 詳細リンク の 3 カラムにする

**Acceptance Criteria**:
- 商談記録が種別タグ + 日時 + 詳細リンクで表示される
- 場所・参加者数・AI件数カラムが非表示

## T-11: typecheck と test の確認

- [x] `bun run build` が成功する（型エラーなし）
- [x] 既存テストが通る

**Acceptance Criteria**:
- `typecheck && test` が green
