# Spec: deal-flexibility

## Requirements

### Requirement: 引き合いなしで案件を作成できる

`createDeal` usecase は `inquiryId` を指定せずに `clientId` のみで案件を作成できること SHALL support する。`inquiryId` も `clientId` も指定されていない場合はエラーを返す MUST。

#### Scenario: clientId のみで案件を作成する

**Given** 有効な `clientId` が指定されており、`inquiryId` は未指定である
**When** `createDeal` を実行する
**Then** `{ ok: true, deal }` が返され、作成された deal の `inquiryId` は null、`clientId` は指定値である

#### Scenario: inquiryId も clientId も未指定で案件作成が拒否される

**Given** `inquiryId` と `clientId` のどちらも指定されていない
**When** `createDealAction` を実行する
**Then** バリデーションエラーが返される

### Requirement: 引き合い経由の案件作成で既存チェックを維持する

`inquiryId` を指定して案件を作成する場合、引き合い存在確認・converted ステータスチェック・重複チェック SHALL be maintained。`inquiry.clientId` が null の場合はエラーを返す MUST。

#### Scenario: inquiryId 指定ありで正常に案件を作成する

**Given** 有効な `inquiryId` が指定されており、引き合いのステータスが `converted` で、`inquiry.clientId` が非 null で、重複案件がない
**When** `createDeal` を実行する
**Then** `{ ok: true, deal }` が返され、`deal.clientId` は `inquiry.clientId` の値である

#### Scenario: 引き合いの clientId が null の場合エラーを返す

**Given** 有効な `inquiryId` が指定されており、引き合いのステータスが `converted` で、`inquiry.clientId` が null である
**When** `createDeal` を実行する
**Then** `{ ok: false, reason: "案件化するには顧客の登録が必要です" }` が返される

#### Scenario: 重複チェックが維持される

**Given** `inquiryId` が指定されており、その引き合いに対して既に案件が存在する
**When** `createDeal` を実行する
**Then** `{ ok: false, reason: "この引き合いにはすでに案件が存在します" }` が返される

### Requirement: 引き合いの案件化（converted 遷移）で clientId を渡す

`updateInquiryStatus` で `converted` に遷移する際、`dealRepository.create` に `clientId: inquiry.clientId` を渡す MUST。`inquiry.clientId` が null の場合はエラーを返す MUST。

#### Scenario: converted 遷移で Deal に clientId が設定される

**Given** 引き合いの `clientId` が非 null で、ステータスが `in_progress` である
**When** `updateInquiryStatus` で `converted` に遷移する
**Then** 作成された Deal の `clientId` は `inquiry.clientId` の値である

#### Scenario: inquiry.clientId が null の場合 converted 遷移が拒否される

**Given** 引き合いの `clientId` が null である
**When** `updateInquiryStatus` で `converted` に遷移する
**Then** `{ ok: false, reason: "案件化するには顧客の登録が必要です" }` が返される

### Requirement: フェーズ遷移は終端状態からのみ拒否する

`canTransition(from, to)` は `from` が終端状態（`won` / `lost`）の場合のみ遷移を拒否 SHALL する。それ以外の全フェーズ間遷移は許可する MUST。

#### Scenario: proposal_prep から negotiation への直接遷移が許可される

**Given** 案件のフェーズが `proposal_prep` である
**When** `canTransition("proposal_prep", "negotiation")` を呼び出す
**Then** `true` が返される

#### Scenario: proposed から proposal_prep への巻き戻し遷移が許可される

**Given** 案件のフェーズが `proposed` である
**When** `canTransition("proposed", "proposal_prep")` を呼び出す
**Then** `true` が返される

#### Scenario: won からの遷移が拒否される

**Given** 案件のフェーズが `won` である
**When** `canTransition("won", "negotiation")` を呼び出す
**Then** `false` が返される

#### Scenario: lost からの遷移が拒否される

**Given** 案件のフェーズが `lost` である
**When** `canTransition("lost", "proposal_prep")` を呼び出す
**Then** `false` が返される

#### Scenario: 同一フェーズへの遷移が拒否される

**Given** 案件のフェーズが `proposed` である
**When** `canTransition("proposed", "proposed")` を呼び出す
**Then** `false` が返される

### Requirement: 案件一覧に新規作成ボタンを表示する

案件一覧ページの `PageToolbar` に新規作成リンク SHALL be present。リンク先は `/deals/new` とする。

#### Scenario: 案件一覧に新規作成ボタンが表示される

**Given** ユーザーが案件一覧ページにアクセスする
**When** ページが表示される
**Then** PageToolbar に `/deals/new` へのリンクが表示される

### Requirement: 案件作成ページで引き合いなし作成に対応する

案件作成ページは `inquiryId` パラメータの有無で動作を切り替える MUST。パラメータなしの場合は顧客選択プルダウンを表示する。

#### Scenario: inquiryId パラメータなしで顧客選択プルダウンが表示される

**Given** ユーザーが `/deals/new`（パラメータなし）にアクセスする
**When** 案件作成フォームが表示される
**Then** 顧客選択プルダウンが表示され、タイトルと想定金額の入力フィールドが表示される

#### Scenario: inquiryId パラメータありで既存動作を維持する

**Given** ユーザーが `/deals/new?inquiryId=<uuid>` にアクセスする
**When** 案件作成フォームが表示される
**Then** 顧客選択プルダウンは表示されず、inquiryId が hidden フィールドで保持される

### Requirement: 案件詳細ページで引き合いなし案件に対応する

案件詳細ページは `deal.inquiryId` が null の場合、引き合いリンクを非表示にし、顧客情報は `deal.clientId` から直接取得する MUST。

#### Scenario: 引き合いなし案件で引き合いリンクが非表示になる

**Given** 案件の `inquiryId` が null である
**When** 案件詳細ページを表示する
**Then** 引き合いリンクが表示されず、顧客情報は `deal.clientId` から取得されて表示される

#### Scenario: 引き合いあり案件で引き合いリンクが表示される

**Given** 案件の `inquiryId` が非 null である
**When** 案件詳細ページを表示する
**Then** 引き合いリンクが表示され、顧客情報も表示される
