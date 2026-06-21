# Spec: UI動線改善

## Requirements

### Requirement: 引き合い作成時に新規顧客を同時登録できること

引き合い作成フォームの顧客選択で「新規登録」を選択した場合、企業名の入力フィールドが表示され、フォーム送信時に顧客と引き合いが同時に作成される。`createInquiryAction` は `createClient` UC を呼び出して顧客を作成し、得られた `clientId` で `createInquiry` UC を呼ぶ。新規顧客の industry/size/address/notes は入力 SHALL NOT する。

#### Scenario: 新規登録オプションの表示

**Given** 引き合い作成フォームが表示されている
**When** 顧客選択ドロップダウンを開く
**Then** 「未定」「新規登録」および既存顧客のリストが選択肢として表示される

#### Scenario: 新規顧客名入力フィールドの表示切り替え

**Given** 引き合い作成フォームが表示されている
**When** 顧客選択で「新規登録」を選択する
**Then** 企業名の入力フィールドが表示される

#### Scenario: 既存顧客に戻した場合のフィールド非表示

**Given** 「新規登録」が選択されて企業名フィールドが表示されている
**When** 顧客選択を既存顧客に変更する
**Then** 企業名入力フィールドが非表示になる

#### Scenario: 新規顧客名を入力して引き合いを作成

**Given** 「新規登録」が選択されて企業名に「テスト株式会社」が入力されている
**When** フォームを送信する
**Then** 「テスト株式会社」という顧客が作成され、その clientId が紐づいた引き合いが作成される

### Requirement: 案件詳細の商談履歴が引き合い詳細と同等の情報を表示すること

案件詳細ページの商談履歴 DataTable は、引き合い詳細の商談履歴と同等の列（種別、日時、場所、参加者数、AI件数、詳細リンク）を MUST 表示する。

#### Scenario: 案件詳細の商談テーブルに拡充された列が表示される

**Given** 商談記録が存在する案件の詳細ページを表示している
**When** 商談履歴セクションを確認する
**Then** 種別、日時、場所、参加者数、AI件数、詳細リンクの列が表示される

#### Scenario: 引き合い経由の商談に正しい詳細リンクが表示される

**Given** inquiryId を持つ商談が案件の商談履歴に含まれている
**When** 詳細リンクをクリックする
**Then** `/inquiries/${inquiryId}/meetings/${meetingId}` に遷移する

#### Scenario: 案件直紐づきの商談に正しい詳細リンクが表示される

**Given** dealId のみを持つ商談が案件の商談履歴に含まれている
**When** 詳細リンクをクリックする
**Then** `/deals/${dealId}/meetings/${meetingId}` に遷移する

### Requirement: 案件担当者の一覧表示・追加・削除ができること

案件詳細ページに「担当者」セクションを設け、現在の担当者一覧（名前・部署・役職・ロール）を表示する。ClientContact をプルダウンで選択し、ロールを指定して追加できる。削除は確認なしで即時実行 SHALL する。

#### Scenario: 担当者セクションの表示

**Given** 案件詳細ページを表示している
**When** 担当者セクションを確認する
**Then** 現在の担当者一覧が名前、部署、役職、ロールとともに表示される

#### Scenario: 担当者の追加

**Given** 案件に紐づく顧客の ClientContact が存在する
**When** ClientContact をプルダウンで選択し、ロールを「キーマン」に指定して追加ボタンをクリックする
**Then** 選択した ClientContact が指定ロールで案件担当者として追加される

#### Scenario: 担当者の削除

**Given** 案件に担当者が1人以上登録されている
**When** 担当者の削除ボタンをクリックする
**Then** 確認ダイアログなしで即座に担当者が削除される

#### Scenario: 顧客未紐づけ時の追加フォーム非表示

**Given** 案件の引き合いに顧客が紐づいていない（clientId が null）
**When** 担当者セクションを確認する
**Then** 担当者追加フォームが非表示になる

### Requirement: 商談記録時に外部参加者を顧客担当者として登録できること

MeetingForm/DealMeetingForm の外部参加者ごとに「顧客担当者として登録」チェックボックスを表示する。チェックされた参加者は `createClientContact` UC を経由して ClientContact として登録 SHALL する。clientId が null の場合はチェックボックスを非表示にする。

#### Scenario: チェックボックスの表示（clientId あり）

**Given** clientId が null でない引き合いの商談記録フォームを表示している
**When** 外部参加者セクションを確認する
**Then** 各外部参加者の入力行に「顧客担当者として登録」チェックボックスが表示される

#### Scenario: チェックボックスの非表示（clientId なし）

**Given** clientId が null の引き合いの商談記録フォームを表示している
**When** 外部参加者セクションを確認する
**Then** 「顧客担当者として登録」チェックボックスは表示されない

#### Scenario: チェックされた参加者が担当者として登録される

**Given** 外部参加者に「田中太郎」を入力し「顧客担当者として登録」にチェックを入れている
**When** フォームを送信する
**Then** 商談が作成され、「田中太郎」が ClientContact として登録される

### Requirement: labels.ts に dealContactRoleLabels が定義されていること

`labels.ts` に `dealContactRoleLabels` を MUST 定義する。key_person, decision_maker, technical, other の4ロールに対応するラベルを含む。

#### Scenario: dealContactRoleLabels の定義

**Given** labels.ts を確認する
**When** dealContactRoleLabels を参照する
**Then** `{ key_person: "キーマン", decision_maker: "決裁者", technical: "技術担当", other: "その他" }` が定義されている

### Requirement: シードデータに1案件あたり複数ロールの担当者が紐づくこと

シードデータの deal_contacts に、1つの案件に対して key_person と technical のロールで担当者が MUST 紐づいていること。

#### Scenario: シードデータの検証

**Given** seed.ts を実行済み
**When** deal_contacts テーブルを確認する
**Then** 同一案件に key_person と technical の2つのロールで担当者が存在する
