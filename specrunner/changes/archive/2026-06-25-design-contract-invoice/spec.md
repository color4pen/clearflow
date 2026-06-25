# Spec: 契約・請求画面のデザイン適用

## Requirements

### Requirement: 契約一覧は 7 カラムで表示する

契約一覧テーブル SHALL display 7 columns in the following order: 契約名, 顧客名, 案件名, 契約種別, 金額, 期間, ステータス.

#### Scenario: 契約一覧に案件名と期間が表示される

**Given** 契約が 1 件以上存在する
**When** ユーザーが契約一覧ページ（`/contracts`）を表示する
**Then** テーブルヘッダーに「契約名」「顧客名」「案件名」「契約種別」「金額」「期間」「ステータス」の 7 カラムが表示される

#### Scenario: 期間カラムに開始日と終了日が表示される

**Given** 契約の startDate が 2025-04-01、endDate が 2026-03-31 である
**When** ユーザーが契約一覧ページを表示する
**Then** 期間カラムに「2025/04/01 〜 2026/03/31」形式で表示される

#### Scenario: 終了日が未設定の場合

**Given** 契約の endDate が null である
**When** ユーザーが契約一覧ページを表示する
**Then** 期間カラムに「{startDate} 〜」と表示される（終了日は省略）

### Requirement: 終了日が 30 日以内の active 契約行をハイライトする

契約一覧テーブル SHALL highlight rows where the contract's endDate is within 30 days from today and the contract status is "active".

#### Scenario: 終了日が今日から 15 日後の active 契約

**Given** 契約の endDate が今日から 15 日後で、status が "active" である
**When** ユーザーが契約一覧ページを表示する
**Then** 当該行が警告色でハイライトされる

#### Scenario: 終了日が今日から 45 日後の active 契約

**Given** 契約の endDate が今日から 45 日後で、status が "active" である
**When** ユーザーが契約一覧ページを表示する
**Then** 当該行はハイライトされない（通常表示）

#### Scenario: 終了日が 30 日以内だが completed の契約

**Given** 契約の endDate が今日から 10 日後で、status が "completed" である
**When** ユーザーが契約一覧ページを表示する
**Then** 当該行はハイライトされない

### Requirement: 契約詳細は左右 2 カラムレイアウトで表示する

契約詳細ページ SHALL display a two-column layout with a 3fr:2fr (approximately 1.5:1) ratio.

#### Scenario: 左カラムの構成

**Given** ユーザーが契約詳細ページ（`/contracts/{id}`）を表示する
**When** ページが描画される
**Then** 左カラムに基本情報（契約情報フォーム）、ステータス操作、案件リンク、顧客リンクが表示される

#### Scenario: 右カラムの構成

**Given** ユーザーが契約詳細ページを表示する
**When** ページが描画される
**Then** 右カラムに請求一覧、請求サマリ、請求作成ボタンが表示される

### Requirement: 単発契約の請求サマリにプログレスバー風表示を行う

InvoiceSection SHALL display a progress-bar style summary for one-time contracts (`renewalType === "one_time"`), showing paid, invoiced, and remaining amounts as stacked segments relative to the contract total amount.

#### Scenario: 単発契約でプログレスバーが表示される

**Given** 契約の renewalType が "one_time" で、contractAmount が 1,000,000 円
**When** 入金済合計が 300,000 円、請求済合計が 200,000 円、予定合計が 300,000 円
**Then** プログレスバーに入金済 30%（green）、請求済 20%（blue）のセグメントが表示される
**Then** 残り 200,000 円（= 1,000,000 - 300,000 - 200,000 - 300,000）がラベルで表示される

#### Scenario: 定期契約ではプログレスバーが表示されない

**Given** 契約の renewalType が "recurring" である
**When** ユーザーが契約詳細ページを表示する
**Then** 請求サマリは従来の数値ブロック（grid-cols-3）で表示される

#### Scenario: 請求合計が契約金額を超過した場合

**Given** 契約の renewalType が "one_time" で、contractAmount が 500,000 円
**When** 各請求の合計が 600,000 円を超える
**Then** プログレスバーは 100% でキャップされ、溢れない

### Requirement: 請求詳細は max-width 560px の狭幅レイアウトで表示する

請求詳細ページ SHALL render within a max-width of 560px, centered horizontally, with a single-column layout using a 90px label + 1fr value grid.

#### Scenario: 狭幅レイアウトで表示される

**Given** ユーザーが請求詳細ページ（`/contracts/{id}/invoices/{invoiceId}`）を表示する
**When** ページが描画される
**Then** コンテンツが max-width 560px でセンタリングされ、1 カラムで表示される

#### Scenario: パンくずに契約名が表示される

**Given** 契約名が「A社コンサル契約」である
**When** ユーザーが請求詳細ページを表示する
**Then** パンくずが「契約一覧 > A社コンサル契約 > 請求詳細」と表示される

### Requirement: 承認待ちバナーは該当時のみ表示する

契約詳細ページ SHALL display an approval-pending banner when a pending approval request is associated with the contract.

#### Scenario: 承認待ちリクエストが存在する場合

**Given** 契約に紐づく originTriggerEntityId を持つ Request が status "pending" で存在する
**When** ユーザーが契約詳細ページを表示する
**Then** ページ上部に「この契約には承認待ちの申請があります」バナーが表示される

#### Scenario: 承認待ちリクエストが存在しない場合

**Given** 契約に紐づく pending 状態の Request が存在しない
**When** ユーザーが契約詳細ページを表示する
**Then** バナーは表示されない
