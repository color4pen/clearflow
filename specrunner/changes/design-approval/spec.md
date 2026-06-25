# Spec: 承認画面のデザイン適用

## Requirements

### Requirement: 一覧ページにタブ切替を提供する

一覧ページ SHALL「要対応」「自分の申請」「すべて」の 3 タブを表示し、URL パラメータ `?tab=` でタブを切替できること。

#### Scenario: デフォルトタブがロールに応じて決定される

**Given** ユーザーがログインしている
**When** `?tab` パラメータなしで `/requests` にアクセスする
**Then** ロールが `member` の場合は「自分の申請」タブが、それ以外（`admin`/`manager`/`finance`）の場合は「要対応」タブがアクティブになる

#### Scenario: 「すべて」タブが admin/manager のみに表示される

**Given** ロールが `member` または `finance` のユーザーがログインしている
**When** 一覧ページを表示する
**Then** 「要対応」と「自分の申請」タブのみが表示され、「すべて」タブは表示されない

#### Scenario: 認可されていないタブへの URL 直打ちがフォールバックする

**Given** ロールが `member` のユーザーがログインしている
**When** `?tab=all` で `/requests` にアクセスする
**Then** デフォルトタブ（「自分の申請」）にフォールバックし、そのタブのデータが表示される

### Requirement: 「要対応」タブはユーザーの role に一致する pending ステップを持つリクエストを表示する

「要対応」タブ SHALL、approvalSteps に status が `pending` かつ `approverRole` がログインユーザーの role に一致するステップを持つリクエストのみを表示すること。

#### Scenario: 自分の role が承認者の pending リクエストが表示される

**Given** ロールが `manager` のユーザーがログインしている
**When** 「要対応」タブを表示する
**Then** approvalSteps 内に `status: "pending"` かつ `approverRole: "manager"` のステップを持つリクエストのみが表示される

#### Scenario: 承認済みリクエストは「要対応」タブに表示されない

**Given** ロールが `manager` のユーザーがログインしている
**When** 「要対応」タブを表示する
**Then** status が `approved` のリクエストは表示されない

### Requirement: 「自分の申請」タブは自分が作成したリクエストを表示する

「自分の申請」タブ SHALL、`creatorId` がログインユーザーの ID に一致するリクエストのみを表示すること。

#### Scenario: 自分が作成したリクエストのみ表示される

**Given** ユーザー A がログインしている
**When** 「自分の申請」タブを表示する
**Then** `creatorId` がユーザー A の ID に一致するリクエストのみが表示される

### Requirement: 一覧テーブルが 5 カラムで表示される

一覧テーブル SHALL 件名・申請者・ステータスバッジ・手動/自動ラベル・申請日の 5 カラムで表示すること。

#### Scenario: 5 カラムのヘッダーが表示される

**Given** 一覧ページを表示する
**When** テーブルヘッダーを確認する
**Then** 「件名」「申請者」「ステータス」「種別」「申請日」の 5 カラムが表示される

#### Scenario: 手動/自動ラベルが originType に応じて表示される

**Given** `originType` が `"system"` のリクエストがある
**When** 一覧テーブルに表示する
**Then** 種別カラムに「自動」ラベルが表示される

#### Scenario: 手動ラベルが表示される

**Given** `originType` が `"manual"` のリクエストがある
**When** 一覧テーブルに表示する
**Then** 種別カラムに「手動」ラベルが表示される

### Requirement: 詳細ページにステータスバッジ付きヘッダーを表示する

詳細ページ SHALL 件名・ステータスバッジ・申請者名・申請日時をヘッダーセクションに表示すること。

#### Scenario: ヘッダーにステータスバッジが表示される

**Given** status が `pending` のリクエスト詳細を表示する
**When** ヘッダーセクションを確認する
**Then** 件名の横にステータスバッジ（「審査中」）が表示される

### Requirement: system origin のリクエストにシステム連動バナーを表示する

詳細ページ SHALL `originType` が `"system"` の場合、トリガー元エンティティへのリンク付きバナーを表示すること。

#### Scenario: inquiry.convert のシステム連動バナーが表示される

**Given** `originType: "system"`, `originTriggerAction: "inquiry.convert"`, `originTriggerEntityId` が引合 ID のリクエスト詳細を表示する
**When** ページがレンダリングされる
**Then** 「この承認は引合「{引合タイトル}」の案件化に必要です」テキストと引合詳細へのリンクが表示される

#### Scenario: manual origin ではバナーが表示されない

**Given** `originType: "manual"` のリクエスト詳細を表示する
**When** ページがレンダリングされる
**Then** システム連動バナーは表示されない

#### Scenario: エンティティが取得できない場合はバナーを非表示にする

**Given** `originType: "system"` だが `originTriggerEntityId` に対応するエンティティが存在しない
**When** ページがレンダリングされる
**Then** システム連動バナーは表示されない（エラーにはならない）

### Requirement: 承認ステップを縦ステッパー UI で表示する

詳細ページ SHALL 承認ステップを縦のステッパー（タイムライン）UI で表示し、各ステップの状態を視覚的に区別すること。

#### Scenario: 各ステップの状態アイコンが正しく表示される

**Given** 3 ステップの承認フローで、ステップ 1 が approved、ステップ 2 が pending、ステップ 3 が pending のリクエストを表示する
**When** ステッパー UI を確認する
**Then** ステップ 1 に承認済みアイコン（緑チェック）、ステップ 2 に待機アイコン（ハイライト付き）、ステップ 3 に待機アイコンが表示される

#### Scenario: 現在のステップがハイライトされる

**Given** ステップ 2 が現在の pending ステップであるリクエストを表示する
**When** ステッパー UI を確認する
**Then** ステップ 2 が視覚的にハイライト（強調表示）される

#### Scenario: 却下されたステップが区別して表示される

**Given** ステップ 2 が rejected のリクエストを表示する
**When** ステッパー UI を確認する
**Then** ステップ 2 に却下アイコン（赤×）が表示される

#### Scenario: ステップのコメントと日時が表示される

**Given** 承認済みステップにコメント「問題ありません」と承認日時がある
**When** ステッパー UI を確認する
**Then** 該当ステップにコメントテキストと処理日時が表示される

### Requirement: 承認/却下ボタンは該当ステップの承認者にのみ表示する

詳細ページ SHALL、リクエストが `pending` 状態かつログインユーザーが現在のステップの承認者である場合のみ「承認する」「却下する」ボタンを表示すること。

#### Scenario: 承認者に操作ボタンが表示される

**Given** status が `pending` でステップ 2 の `approverRole` が `manager` のリクエスト詳細を表示する
**When** ロールが `manager` のユーザーがアクセスする
**Then** 「承認する」（primary）ボタンと「却下する」（danger outline）ボタンが表示される

#### Scenario: 承認者でないユーザーには操作ボタンが表示されない

**Given** status が `pending` でステップ 2 の `approverRole` が `manager` のリクエスト詳細を表示する
**When** ロールが `member` のユーザーがアクセスする
**Then** 承認/却下ボタンは表示されない

#### Scenario: 承認/却下操作にコメントフィールドが表示される

**Given** 承認者が操作ボタンを確認する
**When** 操作セクションを確認する
**Then** コメント入力テキストエリアが表示される

### Requirement: エンティティ取得はユースケース経由で行う

page.tsx（Server Component）SHALL repository を直接呼び出さず、既存またはユースケース関数を経由してデータを取得すること。

#### Scenario: システム連動バナーの引合名取得が usecase 経由で行われる

**Given** `originTriggerAction: "inquiry.convert"` のリクエスト詳細を表示する
**When** 引合名を取得する
**Then** `getInquiry` ユースケース経由で取得し、`inquiryRepository` を page.tsx から直接呼び出さない
