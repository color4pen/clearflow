# 設定画面のデザイン適用

## Meta

- **type**: spec-change
- **slug**: design-settings
- **base-branch**: main
- **adr**: false

## 背景

Claude Design（docs/design/Clearflow.dc.html の SETTINGS セクション）に合わせて設定画面（ポリシー、テンプレート、ユーザー、委任、Webhook、監査ログ）のレイアウトを更新する。

## 現状コードの前提

- `src/app/(dashboard)/settings/SettingsNav.tsx` — 設定ナビゲーション。タブバー
- `src/app/(dashboard)/settings/policies/` — ポリシー設定画面
- `src/app/(dashboard)/settings/templates/` — テンプレート設定画面
- `src/app/(dashboard)/settings/users/` — ユーザー管理
- `src/app/(dashboard)/settings/delegations/` — 委任設定
- `src/app/(dashboard)/settings/webhooks/` — Webhook 設定
- `src/app/(dashboard)/settings/audit-logs/` — 監査ログ
- `docs/design/Clearflow.dc.html` — 設定: 各サブセクションのテーブル・フォームレイアウト

## 要件

1. **SettingsNav**: タブの順序をデザインに合わせる（承認ポリシー / テンプレート / ユーザー / 代理承認 / Webhook / 監査ログ）。現在のスタイルを維持しつつ D01 のテーマに合わせる
2. **ポリシー一覧**: 5 カラムグリッド（ポリシー名, トリガーアクション, 条件, テンプレート名, 有効/無効トグル）
3. **テンプレート一覧**: 3 カラム（テンプレート名, ステップ数, 作成日）
4. **ユーザー一覧**: 3 カラム（ユーザー名, メールアドレス, ロール select）
5. **委任一覧**: 自分の委任 + admin 向け全ユーザー委任の 2 セクション
6. **Webhook 一覧**: 4 カラム（URL, イベント数, 有効/無効, 直近配信状態）+ 配信ログテーブル
7. **監査ログ**: フィルタ（操作者, 操作種別, 対象種別, 期間）+ 5 カラムテーブル + CSV エクスポート
8. **全テーブルのスタイル統一**: ヘッダー背景 #dcdde1、11px font-weight 500。データ行 12.5px。行ホバー bg-surface-alt。行ボーダー border-light

## スコープ外

- 設定画面のフォーム（作成/編集）のデザイン変更
- ビジネスロジックの変更

## 受け入れ基準

- [ ] SettingsNav のタブ順序がデザインに合っている
- [ ] 各設定画面のテーブルカラムがデザインに合っている
- [ ] テーブルスタイルが統一されている（ヘッダー/行/ホバー）
- [ ] 監査ログにフィルタと CSV エクスポートがある
- [ ] `typecheck && test` が green

## architect 評価済みの設計判断

1. **テーブルスタイルの統一** — 設定画面の全テーブルで同じヘッダー背景・フォントサイズ・行ホバーを適用する。DataTable コンポーネントを使用してスタイルを統一する
