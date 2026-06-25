# Spec: 設定画面のデザイン適用

## Requirements

### Requirement: SettingsNav のタブ順序

SettingsNav SHALL display tabs in the following order: 承認ポリシー, テンプレート, ユーザー, 代理承認, Webhook, 監査ログ.

#### Scenario: タブが正しい順序で表示される

**Given** ユーザーが設定画面にアクセスしている
**When** SettingsNav が描画される
**Then** タブが左から順に「承認ポリシー」「テンプレート」「ユーザー」「代理承認」「Webhook」「監査ログ」の順で表示される

---

### Requirement: ポリシー一覧のカラム構成

ポリシー一覧テーブル SHALL display 5 columns: ポリシー名, トリガーアクション, 条件, テンプレート名, 有効/無効.

#### Scenario: ポリシー一覧が正しいカラムで表示される

**Given** ポリシーが 1 件以上登録されている
**When** ポリシー一覧ページが表示される
**Then** テーブルに「ポリシー名」「トリガーアクション」「条件」「テンプレート名」「有効/無効」の 5 カラムが表示される

---

### Requirement: テンプレート一覧のカラム構成

テンプレート一覧テーブル SHALL display 3 columns: テンプレート名, ステップ数, 作成日.

#### Scenario: テンプレート一覧が正しいカラムで表示される

**Given** テンプレートが 1 件以上登録されている
**When** テンプレート一覧ページが表示される
**Then** テーブルに「テンプレート名」「ステップ数」「作成日」の 3 カラムが表示される
**Then** 「フィールド数」カラムは表示されない

---

### Requirement: ユーザー一覧のカラム構成

ユーザー一覧テーブル SHALL display 3 columns: 名前, メールアドレス, ロール.

#### Scenario: ユーザー一覧が正しいカラムで表示される

**Given** ユーザーが 1 名以上登録されている
**When** ユーザー一覧ページが表示される
**Then** テーブルに「名前」「メールアドレス」「ロール」の 3 カラムが表示される
**Then** 「作成日時」カラムは表示されない

---

### Requirement: 委任ページの 2 セクション構成

委任ページ SHALL display two sections: 自分の委任 and 全ユーザーの委任.

#### Scenario: 委任ページが 2 セクションで表示される

**Given** admin ユーザーが委任設定ページにアクセスしている
**When** ページが描画される
**Then** 「自分の委任」セクションにはログインユーザーが委任元である委任のみが表示される
**Then** 「全ユーザーの委任」セクションには全委任が表示される

#### Scenario: 自分の委任がない場合

**Given** admin ユーザーが委任設定ページにアクセスしている
**Given** ログインユーザーが委任元である委任が存在しない
**When** ページが描画される
**Then** 「自分の委任」セクションに空状態メッセージが表示される

---

### Requirement: Webhook 一覧のカラム構成

Webhook 一覧テーブル SHALL display 4 columns: URL, イベント数, 有効/無効, 直近配信状態.

#### Scenario: Webhook 一覧が正しいカラムで表示される

**Given** Webhook エンドポイントが 1 件以上登録されている
**When** Webhook 一覧ページが表示される
**Then** テーブルに「URL」「イベント数」「有効/無効」「直近配信状態」の 4 カラムが表示される
**Then** 「Secret」「作成日時」カラムは表示されない

#### Scenario: 直近配信状態の表示

**Given** Webhook エンドポイントに配信履歴が存在する
**When** Webhook 一覧が表示される
**Then** 直近配信状態カラムに最新の配信ステータス（成功/失敗/処理中）が表示される

#### Scenario: 配信履歴がない場合

**Given** Webhook エンドポイントに配信履歴が存在しない
**When** Webhook 一覧が表示される
**Then** 直近配信状態カラムに「配信なし」相当のテキストが表示される

---

### Requirement: 監査ログのフィルタ拡張

監査ログページ SHALL provide filters for 操作者, 操作種別, 対象種別, 期間.

#### Scenario: 操作者でフィルタする

**Given** admin ユーザーが監査ログページにアクセスしている
**When** 操作者フィルタで特定ユーザーを選択してフィルタを実行する
**Then** 選択したユーザーが実行したログのみが表示される

#### Scenario: 対象種別でフィルタする

**Given** admin ユーザーが監査ログページにアクセスしている
**When** 対象種別フィルタで「request」を選択してフィルタを実行する
**Then** 対象種別が「request」のログのみが表示される

#### Scenario: CSV エクスポートにフィルタが反映される

**Given** admin ユーザーがフィルタ条件を設定している
**When** CSV ダウンロードリンクをクリックする
**Then** エクスポート URL にフィルタ条件（操作者、操作種別、対象種別、期間）が含まれる

---

### Requirement: 監査ログのテーブルカラム構成

監査ログテーブル SHALL display 5 columns in order: 日時, 操作者, 操作内容, 対象種別, 対象名.

#### Scenario: 監査ログが正しいカラムで表示される

**Given** 監査ログが 1 件以上存在する
**When** 監査ログページが表示される
**Then** テーブルに「日時」「操作者」「操作内容」「対象種別」「対象名」の 5 カラムが左から順に表示される
**Then** 「メタデータ」カラムは表示されない

---

### Requirement: テーブルスタイルの統一

全設定画面のテーブル MUST use the DataTable component with unified styling: header background bg-bg-table-head (#dcdde1), header font text-table-head (11px) font-medium, data row font text-base-app (12.5px), row hover bg-bg-surface-alt, row border border-border-light.

#### Scenario: 全テーブルが統一スタイルで表示される

**Given** 設定画面のいずれかのサブページにアクセスしている
**When** テーブルが描画される
**Then** ヘッダー行の背景色が bg-bg-table-head である
**Then** ヘッダーのフォントサイズが text-table-head（11px）で font-medium である
**Then** データ行のフォントサイズが text-base-app（12.5px）である
**Then** データ行のホバー時に bg-bg-surface-alt が適用される
**Then** データ行のボーダーが border-border-light である
