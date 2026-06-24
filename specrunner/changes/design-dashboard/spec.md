# Spec: ダッシュボード画面のデザイン適用

## Requirements

### Requirement: パイプラインサマリは 6 カラムグリッドで合計列を含む

営業ダッシュボードのパイプラインサマリ SHALL 5 フェーズ + 合計の 6 カラムで表示する。合計列の件数は全フェーズの件数の合算、金額は全フェーズの金額の合算とする。

#### Scenario: 全フェーズに案件がある場合の合計表示

**Given** パイプラインサマリに proposal_prep=2件/100万、proposed=3件/200万、negotiation=1件/50万、won=4件/500万、lost=1件/30万 が存在する
**When** 営業ダッシュボードを表示する
**Then** 6 カラム目に「合計」が表示され、件数=11件、金額=880万 が表示される

#### Scenario: パイプラインセルクリックでフェーズフィルタ遷移

**Given** 営業ダッシュボードが表示されている
**When** 「提案準備」セルをクリックする
**Then** `/deals?phase=proposal_prep` に遷移する

#### Scenario: 合計セルクリックで全案件一覧遷移

**Given** 営業ダッシュボードが表示されている
**When** 「合計」セルをクリックする
**Then** `/deals` に遷移する（フェーズフィルタなし）

### Requirement: アクション待ちリストの超過アイテムは赤文字とラベルで強調する

アクション待ちリスト SHALL 期日超過のアイテムを赤文字 + 「超過」ラベルで視覚的に強調する。超過判定は approval の deadline と action_item の dueDate に基づく。

#### Scenario: 承認リクエストの期日が過去日

**Given** アクション待ちリストに deadline が昨日の approval アイテムがある
**When** 営業ダッシュボードを表示する
**Then** そのアイテムの日付が赤文字（text-danger）で表示され、「超過」ラベルが付与される

#### Scenario: アクションアイテムの期日が未来日

**Given** アクション待ちリストに dueDate が明日の action_item がある
**When** 営業ダッシュボードを表示する
**Then** そのアイテムの日付は通常色（text-text-secondary）で表示され、「超過」ラベルは付与されない

#### Scenario: ヘッダーに超過件数バッジ

**Given** アクション待ちリストに 3 件の超過アイテムがある
**When** 営業ダッシュボードを表示する
**Then** セクションヘッダーに赤色バッジで「3」が表示される

### Requirement: 停滞案件はフェーズ・金額・担当者をドット区切りで表示する

停滞案件リスト SHALL 各案件のサブテキストにフェーズ名、金額、担当者名を middle dot（`·`）区切りで表示する。null のフィールドは省略する。

#### Scenario: 全フィールドが揃った停滞案件

**Given** 停滞案件に phase=negotiation、estimatedAmount=500万、assigneeName=「田中太郎」の案件がある
**When** 営業ダッシュボードを表示する
**Then** サブテキストに「交渉中 · ¥5,000,000 · 田中太郎」と表示される

#### Scenario: 担当者が未設定の停滞案件

**Given** 停滞案件に phase=proposed、estimatedAmount=100万、assigneeName=null の案件がある
**When** 営業ダッシュボードを表示する
**Then** サブテキストに「提案済 · ¥1,000,000」と表示され、担当者部分は省略される

### Requirement: 直近の活動は相対時間で表示する

直近の活動セクション SHALL 各ログの時間を相対時間（「○分前」「○時間前」「○日前」）で表示する。

#### Scenario: 30 分前の活動

**Given** 直近の活動に createdAt が 30 分前の AuditLog がある
**When** 営業ダッシュボードを表示する
**Then** 時間表示が「30分前」と表示される

#### Scenario: 3 日前の活動

**Given** 直近の活動に createdAt が 3 日前の AuditLog がある
**When** 営業ダッシュボードを表示する
**Then** 時間表示が「3日前」と表示される

### Requirement: 経理ダッシュボードは KPI カードグリッドを表示する

経理ダッシュボード SHALL 4 カラムの KPI カードグリッドを表示する。今月の売上は green（text-success）、期日超過件数は赤（text-danger）で表示する。

#### Scenario: KPI 値の表示

**Given** 今月の売上=300万、期日超過=5件、未入金=8件、請求予定=12件
**When** 経理ダッシュボードを表示する
**Then** 4 カラムグリッドで「今月の売上 ¥3,000,000」（green）、「期日超過 5件」（赤）、「未入金 8件」、「請求予定 12件」が表示される

### Requirement: 金額と日付はモノスペースフォントで表示する

両ダッシュボード SHALL 金額フィールドと日付フィールドに `font-mono`（IBM Plex Mono）を適用する。

#### Scenario: パイプラインサマリの金額表示

**Given** パイプラインサマリに totalAmount=1,500,000 のフェーズがある
**When** 営業ダッシュボードを表示する
**Then** 金額「¥1,500,000」が font-mono で表示される

#### Scenario: 期日超過テーブルの金額と日付

**Given** 期日超過に amount=200,000、dueDate=2026-06-01 の請求がある
**When** 経理ダッシュボードを表示する
**Then** 金額「¥200,000」と日付「2026/06/01」が font-mono で表示される
