# 引合画面のデザイン適用

## Meta

- **type**: spec-change
- **slug**: design-inquiry
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: UI レイアウトの変更のみ → false -->

## 背景

Claude Design（docs/design/Clearflow.dc.html の QUOTES LIST / QUOTE DETAIL セクション）に合わせて引合一覧・詳細画面のレイアウトを更新する。

## 現状コードの前提

- `src/app/(dashboard)/inquiries/page.tsx` — 一覧ページ。PageToolbar + DataTable。フィルタはステータスのみ（Link ベース）。検索・経路フィルタなし。カラム順: ステータス, 件名, 顧客名, 流入経路, 作成日
- `src/app/(dashboard)/inquiries/[id]/page.tsx` — 詳細ページ。縦積み SectionCard レイアウト。InquiryInfoSection（フォーム形式の編集）、InquiryActions（ステータス操作）、DeleteInquiryButton
- `src/app/(dashboard)/inquiries/[id]/InquiryInfoSection.tsx` — 基本情報のフォーム編集。顧客セクションがフォーム内に統合
- `src/app/(dashboard)/inquiries/[id]/InquiryActions.tsx` — ステータス変更ボタン
- `src/app/(dashboard)/inquiries/[id]/MeetingTable.tsx` — 商談テーブル（存在するが詳細ページで使用されていない可能性）
- `docs/design/Clearflow.dc.html:227-262` — デザインの一覧: タブフィルタ + 経路ドロップダウン + 検索。カラム順: 件名, 顧客名, 経路, ステータス, 登録日。converted 行に「→ 案件」リンク
- `docs/design/Clearflow.dc.html:264-365` — デザインの詳細: パンくず + タイトル横ステータスバッジ + 承認待ちバナー/案件化済みバナー + 2カラム（左: 基本情報 + 顧客 + 操作、右: 商談記録）

## 要件

1. **一覧 — カラム順変更**: 件名（先頭、リンク）, 顧客名, 経路, ステータス, 登録日（右寄せ mono）の順に変更する
2. **一覧 — フィルタ UI 変更**: ステータスをタブボタン（全て / 新規 / 案件化済み / 見送り）に変更する。経路フィルタ（select ドロップダウン）を追加する。検索入力（placeholder: 「顧客名・件名で検索」）を右寄せで追加する
3. **一覧 — ステータスバッジ**: ステータス列にバッジ（inline-block、padding 1px 7px、border-radius 3px、背景 #f5f5f5、ボーダー #e0e0e0）で表示する。converted の行には「→ 案件」リンクをステータスの横に表示する
4. **一覧 — テーブルレイアウト**: grid-template-columns を `1.7fr 1fr 110px 160px 110px` に設定する。行 padding は 10px 14px
5. **詳細 — 2 カラムレイアウト**: 縦積みから `grid-template-columns: 1.5fr 1fr; gap: 24px` のグリッドに変更する
6. **詳細 — 左カラム**: 基本情報セクション（90px ラベル + 1fr 値のグリッド。読み取り表示 + 編集ヒント）、顧客セクション（独立セクション。顧客リンク or 未設定時のエラーメッセージ + 選択ボタン）、操作セクション（ステータスに応じたボタン表示）
7. **詳細 — 右カラム**: 商談記録セクション。ヘッダーに「+ 商談を追加」ボタン。商談行: 種別 + 日時 + 要旨。クリックで商談詳細へ遷移
8. **詳細 — ステータスバナー**: 承認待ち時は青いバナー（背景 bg-info #eef5fb、ボーダー primary #2980b9）。案件化済み時は緑バナー（背景 bg-success-light #eef7f1、ボーダー border-success-light #cde6d8）+ 案件へのリンク
9. **詳細 — パンくず**: 「引合一覧 / {引合名}」のパンくず表示
10. **詳細 — タイトル横ステータスバッジ**: ページタイトルの横にステータスバッジを表示する

## スコープ外

- 引合登録フォーム（InquiryForm.tsx）のデザイン変更（後続で対応）
- 検索・経路フィルタのサーバーサイド実装（既存の取得ロジックにフィルタパラメータが無ければクライアントサイドフィルタで対応）
- ビジネスロジックの変更

## 受け入れ基準

- [ ] 一覧のカラム順が 件名, 顧客名, 経路, ステータス, 登録日 になっている
- [ ] フィルタにタブボタン + 経路ドロップダウン + 検索入力がある
- [ ] converted 行にステータスバッジと「→ 案件」リンクが表示される
- [ ] 詳細が 2 カラムレイアウトになっている
- [ ] 右カラムに商談記録リストと追加ボタンがある
- [ ] 承認待ち時に青いバナーが表示される
- [ ] 案件化済み時に緑バナー + 案件リンクが表示される
- [ ] `typecheck && test` が green

## architect 評価済みの設計判断

1. **基本情報を読み取り表示に変更** — デザインではフォームではなくラベル+値のグリッド表示で「クリックして編集」のヒント。現在のフォーム形式から変更する。却下案: フォーム維持 — デザインと乖離する
2. **検索はクライアントサイドフィルタ** — 既存の listInquiries がフィルタパラメータを受け付けない場合、全件取得してクライアントサイドでフィルタする。データ量が増えたら useMemo + debounce で対応。却下案: サーバーサイド検索の新設 — スコープが大きくなる
