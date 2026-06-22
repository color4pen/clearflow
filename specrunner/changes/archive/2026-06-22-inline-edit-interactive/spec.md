# Spec: 詳細画面のインタラクティブ編集

## Requirements

### Requirement: 汎用インライン編集コンポーネントが存在する

InlineEditText, InlineEditTextarea, InlineEditSelect, InlineEditDate, InlineEditMoney の5つのクライアントコンポーネントが `src/app/components/` に存在し、`index.ts` から export されている MUST。

#### Scenario: InlineEditText が表示→編集→保存のライフサイクルを持つ

**Given** InlineEditText が `editable=true` でレンダリングされている
**When** テキスト表示部分をクリックする
**Then** Input に切り替わり、Enter またはブラーで `onSave` が呼ばれ、成功時に表示モードに戻る

#### Scenario: InlineEditTextarea がブラーでは保存しない

**Given** InlineEditTextarea が編集モードである
**When** Textarea からフォーカスが外れる
**Then** 保存は実行されず、保存ボタンクリックで `onSave` が呼ばれる

#### Scenario: InlineEditSelect が値変更で即保存する

**Given** InlineEditSelect が `editable=true` でレンダリングされている
**When** Select コントロールで値を変更する
**Then** `onSave` が即座に呼ばれる

#### Scenario: editable=false のとき編集不可

**Given** 任意のインライン編集コンポーネントが `editable=false` でレンダリングされている
**When** テキスト表示部分をクリックする
**Then** 編集モードに切り替わらず、テキスト表示のままである

### Requirement: InlineEditMoney が金額をカンマ区切り+円マークで表示する

InlineEditMoney SHALL 表示モードでは `¥1,000,000` 形式で表示し、編集モードでは MoneyInput を利用して数値入力を受け付ける MUST。

#### Scenario: 金額の表示フォーマット

**Given** InlineEditMoney に `value=1000000` が渡されている
**When** 表示モードである
**Then** `¥1,000,000` と表示される

#### Scenario: null 値の表示

**Given** InlineEditMoney に `value=null` が渡されている
**When** 表示モードである
**Then** `-` と表示される

### Requirement: 引き合い詳細でフィールドがインライン編集できる

引き合い詳細ページ SHALL 件名、流入経路、内容をインラインで編集・保存できる MUST。担当者も対応可能な場合は対応する。ステータス変更（InquiryActions）は既存のまま維持する。

#### Scenario: 件名のインライン編集

**Given** admin ロールで引き合い詳細ページを表示している
**When** 件名のテキストをクリックして新しい値を入力し Enter を押す
**Then** `updateInquiryAction` が呼ばれ、件名が更新される

#### Scenario: member ロールで編集不可

**Given** member ロールで引き合い詳細ページを表示している
**When** 件名のテキスト表示を見る
**Then** テキスト表示のみで、クリックしても編集モードにならない

### Requirement: 案件詳細でフィールドがインライン編集できる

案件詳細ページ SHALL 案件名、フェーズ、想定金額、開始日、終了日、契約種別をインラインで編集・保存できる MUST。

#### Scenario: フェーズの won 選択時に確認ダイアログ

**Given** admin ロールで案件詳細を表示している
**When** フェーズのプルダウンで「受注」を選択する
**Then** `window.confirm` で確認ダイアログが表示され、OK なら保存、キャンセルなら元の値に戻る

#### Scenario: フェーズの lost 選択時にも確認ダイアログ

**Given** admin ロールで案件詳細を表示している
**When** フェーズのプルダウンで「失注」を選択する
**Then** `window.confirm` で確認ダイアログが表示される

#### Scenario: 想定金額のインライン編集

**Given** admin ロールで案件詳細を表示している
**When** 想定金額の表示をクリックし、新しい金額を入力して確定する
**Then** `updateDealAction` が呼ばれ、金額が更新される

### Requirement: 案件詳細にアクションアイテム集約セクションが表示される

案件詳細ページ SHALL 全商談のアクションアイテム（完了・未完了とも）を集約表示するセクションを含む MUST。完了済みアイテムは取消線 + 淡色で表示する。

#### Scenario: アクションアイテムの集約表示

**Given** 案件に3つの商談があり、それぞれにアクションアイテムがある（完了・未完了混在）
**When** 案件詳細ページを表示する
**Then** 全商談のアクションアイテムが一覧表示され、各アイテムに商談名（種別 + 日付）が表示される。完了済みアイテムは取消線 + 淡色で区別される

#### Scenario: アクションアイテムの完了トグル

**Given** アクションアイテム集約セクションに未完了アイテムが表示されている
**When** チェックボックスをクリックする
**Then** `updateMeetingAction` が呼ばれ、該当アイテムの done が true に更新される

#### Scenario: 完了済みアイテムの未完了への切り戻し

**Given** 完了済みのアクションアイテムが表示されている
**When** チェックボックスをクリックする
**Then** 該当アイテムの done が false に更新される

#### Scenario: アクションアイテムが0件のとき

**Given** 案件の全商談にアクションアイテムがない
**When** 案件詳細ページを表示する
**Then** 「アクションアイテムはありません」と表示される

### Requirement: 契約詳細でフィールドがインライン編集できる

契約詳細ページ SHALL 契約名、契約種別、金額、開始日、終了日、支払条件、更新種別、更新サイクルをインラインで編集・保存できる MUST。ステータス変更（完了/解約）ボタンは既存のまま維持する。

#### Scenario: 金額のインライン編集

**Given** admin ロールで契約詳細を表示している
**When** 金額の表示をクリックし、新しい金額を入力して確定する
**Then** `updateContractAction` が呼ばれ、金額が更新される

### Requirement: 商談詳細で議事録とアクションアイテムが編集できる

商談詳細ページ SHALL 議事録を InlineEditTextarea でインライン編集でき、アクションアイテムの完了チェックをワンクリックで操作できる MUST。種別、日時、場所、参加者は編集ページに委ねる。

#### Scenario: 議事録のインライン編集

**Given** admin ロールで商談詳細を表示している
**When** 議事録テキストをクリックして Textarea に切り替え、保存ボタンを押す
**Then** `updateMeetingAction` が呼ばれ、議事録が更新される

#### Scenario: アクションアイテムの完了トグル

**Given** 商談詳細にアクションアイテムが表示されている
**When** アクションアイテムのチェックボックスをクリックする
**Then** 該当アイテムの done が反転して保存される

### Requirement: 権限制御が正しく機能する

admin と manager ロールのみ `editable=true` とし、member と finance は `editable=false` とする MUST。権限判定はサーバーコンポーネントで行い、クライアントコンポーネントに props として渡す。

#### Scenario: admin ロールでのアクセス

**Given** admin ロールでログインしている
**When** 各詳細ページを表示する
**Then** フィールドがインライン編集可能である

#### Scenario: member ロールでのアクセス

**Given** member ロールでログインしている
**When** 各詳細ページを表示する
**Then** フィールドはテキスト表示のみで編集不可である

### Requirement: ビルドと型チェックが成功する

変更後に `bun run build` と `typecheck` SHALL 成功する MUST。

#### Scenario: ビルド成功

**Given** 全変更が適用されている
**When** `bun run build` を実行する
**Then** exit 0 で完了する

#### Scenario: 型チェック成功

**Given** 全変更が適用されている
**When** `bun run typecheck` を実行する
**Then** 型エラーなしで完了する
