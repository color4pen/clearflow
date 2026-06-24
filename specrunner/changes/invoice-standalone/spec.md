# Spec: invoice-standalone

## Requirements

### Requirement: overdue → paid 遷移の許可

`invoiceTransition` ドメインサービスは overdue から paid への遷移を許可しなければならない（SHALL）。遅延入金の確認は業務上不可欠な操作である。

#### Scenario: overdue 状態の請求を paid に遷移する

**Given** 請求のステータスが overdue である
**When** `validateInvoiceTransition("overdue", "paid")` を呼び出す
**Then** `{ ok: true }` が返される

#### Scenario: overdue から paid 以外への遷移は不可

**Given** 請求のステータスが overdue である
**When** `validateInvoiceTransition("overdue", "invoiced")` を呼び出す
**Then** `{ ok: false, reason: "..." }` が返される

---

### Requirement: updateInvoiceStatus の paidAt パラメータ

`updateInvoiceStatus` ユースケースは `paidAt?: Date` パラメータを受け取らなければならない（MUST）。paid 遷移時にユーザーが指定した `paidAt` をレコードに保存する。未指定の場合は `new Date()` をフォールバックとする。

#### Scenario: paidAt を指定して入金確認する

**Given** 請求のステータスが invoiced である
**When** `updateInvoiceStatus` を `newStatus: "paid"`, `paidAt: new Date("2026-06-20")` で呼び出す
**Then** 更新後の請求の `paidAt` が `2026-06-20` である

#### Scenario: paidAt 未指定で入金確認する

**Given** 請求のステータスが invoiced である
**When** `updateInvoiceStatus` を `newStatus: "paid"`, `paidAt` なしで呼び出す
**Then** 更新後の請求の `paidAt` が呼び出し時点の現在日時である

#### Scenario: overdue から paidAt 指定で入金確認する

**Given** 請求のステータスが overdue である
**When** `updateInvoiceStatus` を `newStatus: "paid"`, `paidAt: new Date("2026-06-15")` で呼び出す
**Then** 更新後の請求の `paidAt` が `2026-06-15` であり、`invoice.paid` ドメインイベントが発行される

---

### Requirement: getInvoice ユースケース

`getInvoice(invoiceId, organizationId)` ユースケースは請求と紐づく契約情報を返さなければならない（MUST）。請求が存在しない場合は `null` を返す。

#### Scenario: 存在する請求を取得する

**Given** organizationId に属する請求と紐づく契約がデータベースに存在する
**When** `getInvoice` を `invoiceId`, `organizationId` で呼び出す
**Then** `{ invoice: Invoice, contract: Contract }` が返される

#### Scenario: 存在しない請求を取得する

**Given** 指定された invoiceId の請求がデータベースに存在しない
**When** `getInvoice` を `invoiceId`, `organizationId` で呼び出す
**Then** `null` が返される

---

### Requirement: 請求詳細ページの表示

`/contracts/[id]/invoices/[invoiceId]` ページは請求の基本情報を表示しなければならない（SHALL）。表示項目は金額、請求日、支払期日、入金日、ステータスである。紐づく契約へのリンクを含む。URL の `contractId` と請求の `contractId` が一致しない場合は 404 を返す。

#### Scenario: 請求詳細ページを表示する

**Given** ログインユーザーが存在し、有効な請求が存在する
**When** `/contracts/{contractId}/invoices/{invoiceId}` にアクセスする
**Then** 請求の金額、請求日、支払期日、入金日、ステータスが表示される

#### Scenario: URL の contractId と請求の contractId が不一致

**Given** 請求が存在するが、URL の contractId と請求の contractId が異なる
**When** `/contracts/{wrongContractId}/invoices/{invoiceId}` にアクセスする
**Then** 404 Not Found が返される

---

### Requirement: ステータスに応じた操作ボタン

請求詳細ページはステータスに応じた操作ボタンを表示しなければならない（SHALL）。scheduled → 「発行する」、invoiced → 「入金確認」「期日超過にする」、overdue → 「入金確認」、paid → 操作なし。

#### Scenario: scheduled 状態の操作ボタン

**Given** 請求のステータスが scheduled である
**When** 請求詳細ページを表示する
**Then** 「発行する」ボタンが表示される

#### Scenario: invoiced 状態の操作ボタン

**Given** 請求のステータスが invoiced である
**When** 請求詳細ページを表示する
**Then** 「入金確認」ボタンと「期日超過にする」ボタンが表示される

#### Scenario: overdue 状態の操作ボタン

**Given** 請求のステータスが overdue である
**When** 請求詳細ページを表示する
**Then** 「入金確認」ボタンが表示される

#### Scenario: paid 状態は操作ボタンなし

**Given** 請求のステータスが paid である
**When** 請求詳細ページを表示する
**Then** 操作ボタンは表示されない

---

### Requirement: 入金確認時の入金日入力ダイアログ

「入金確認」ボタン押下時に入金日入力ダイアログを表示しなければならない（MUST）。デフォルト値は現在日時。確認ボタン押下で `paidAt` を含めてステータス更新を実行する。

#### Scenario: 入金確認ダイアログでデフォルト値を使用

**Given** 請求のステータスが invoiced である
**When** 「入金確認」ボタンを押し、入金日を変更せずに確認ボタンを押す
**Then** 現在日時が `paidAt` として送信され、ステータスが paid に更新される

#### Scenario: 入金確認ダイアログで日付を変更

**Given** 請求のステータスが invoiced である
**When** 「入金確認」ボタンを押し、入金日を 2026-06-20 に変更して確認ボタンを押す
**Then** 2026-06-20 が `paidAt` として送信され、ステータスが paid に更新される

---

### Requirement: 請求登録ページ

`/contracts/[id]/invoices/new` ページは契約に紐づく請求を新規作成できなければならない（SHALL）。contractId は URL パラメータから自動設定される。入力項目はタイトル、金額、請求日、支払期日、備考である。

#### Scenario: 請求を新規作成する

**Given** active 状態の契約が存在する
**When** `/contracts/{contractId}/invoices/new` でフォームを入力し送信する
**Then** 請求が作成され、契約詳細ページまたは請求詳細ページにリダイレクトされる

#### Scenario: active でない契約では作成不可

**Given** completed 状態の契約が存在する
**When** `/contracts/{contractId}/invoices/new` にアクセスする
**Then** 請求の作成が拒否される

---

### Requirement: 単発契約の残り請求可能金額表示

請求登録ページで単発契約（one_time）の場合、残り請求可能金額を表示しなければならない（MUST）。合計が契約金額を超過する場合はエラーを表示する。

#### Scenario: 単発契約で残り請求可能金額を表示

**Given** 契約金額 100 万円の one_time 契約があり、既存請求の合計が 60 万円である
**When** 請求登録ページを表示する
**Then** 残り請求可能金額 40 万円が表示される

#### Scenario: 合計が契約金額を超過する入力でエラー

**Given** 契約金額 100 万円の one_time 契約があり、既存請求の合計が 60 万円である
**When** 金額 50 万円の請求を作成しようとする
**Then** エラーメッセージが表示され、請求は作成されない

---

### Requirement: バリデーション表示

請求日が支払期日より後の場合にエラーを表示しなければならない（SHALL）。

#### Scenario: 請求日が支払期日より後

**Given** 請求登録ページを表示している
**When** 請求日を 2026-07-01、支払期日を 2026-06-30 で送信する
**Then** 「請求予定日は支払期限以前の日付を入力してください」エラーが表示される

---

### Requirement: 契約詳細の請求セクション簡素化

契約詳細の `InvoiceSection` は請求一覧と各請求の詳細ページへのリンクを表示しなければならない（SHALL）。インラインのステータス操作ボタンと作成モーダルは削除する。

#### Scenario: 請求一覧から詳細ページへ遷移

**Given** 契約に紐づく請求が存在する
**When** 契約詳細ページの請求セクションを表示する
**Then** 各請求に詳細ページへのリンクが表示され、インラインのステータス操作ボタンは表示されない

#### Scenario: 請求追加ボタンが登録ページへのリンクになる

**Given** active 状態の契約の詳細ページを表示している
**When** 「請求を追加」ボタンを押す
**Then** `/contracts/{contractId}/invoices/new` に遷移する

---

### Requirement: パンくずリスト

請求詳細ページおよび請求登録ページは「契約一覧 → 契約詳細 → 請求詳細（または新規登録）」のパンくずリストを表示しなければならない（SHALL）。

#### Scenario: 請求詳細ページのパンくずリスト

**Given** 請求詳細ページを表示している
**When** ページが描画される
**Then** 「契約一覧 > 契約詳細 > 請求詳細」のパンくずリストが表示され、各階層がリンクになっている
