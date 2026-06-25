# Spec: ダイアログ・トーストのデザイン統一

## Requirements

### Requirement: ConfirmDialog の表示制御

ConfirmDialog SHALL render an overlay and centered modal when the `open` prop is `true`, and SHALL render nothing when `open` is `false`. The modal SHALL have max-width 420px, border-radius 4px, and shadow. The overlay SHALL be a semi-transparent black backdrop.

#### Scenario: ダイアログが開いている状態

**Given** ConfirmDialog に open=true, title="確認", message="続行しますか？" が渡されている
**When** コンポーネントがレンダリングされる
**Then** ビューポート全体にオーバーレイが表示され、中央に max-width 420px のモーダルが表示される。モーダルにはタイトル「確認」、メッセージ「続行しますか？」、キャンセルボタン、確認ボタンが含まれる

#### Scenario: ダイアログが閉じている状態

**Given** ConfirmDialog に open=false が渡されている
**When** コンポーネントがレンダリングされる
**Then** オーバーレイもモーダルも DOM に存在しない

### Requirement: ConfirmDialog のバリアント

ConfirmDialog SHALL support a `variant` prop with values "primary" and "danger". When variant is "danger", the confirm button MUST use danger styling (red/danger color). When variant is "primary" (default), the confirm button MUST use primary styling.

#### Scenario: danger バリアントの確認ボタン

**Given** ConfirmDialog に variant="danger", open=true が渡されている
**When** ユーザーがダイアログを確認する
**Then** 確認ボタンが danger（赤系）カラーでスタイルされている

#### Scenario: primary バリアント（デフォルト）の確認ボタン

**Given** ConfirmDialog に variant 未指定, open=true が渡されている
**When** ユーザーがダイアログを確認する
**Then** 確認ボタンが primary（青系）カラーでスタイルされている

### Requirement: ConfirmDialog の children スロット

ConfirmDialog SHALL accept an optional `children` prop. When provided, the children content MUST be rendered between the message text and the action buttons.

#### Scenario: 日付入力フィールドを含むダイアログ

**Given** ConfirmDialog に children として日付入力フィールドが渡されている
**When** ダイアログが開いている
**Then** メッセージの下、ボタンの上に日付入力フィールドが表示される

### Requirement: ConfirmDialog のローディング状態

ConfirmDialog SHALL support a `loading` prop. When loading is true, both the confirm and cancel buttons MUST be disabled, and the confirm button MUST indicate a loading state.

#### Scenario: 非同期操作中のダイアログ

**Given** ConfirmDialog に loading=true, open=true が渡されている
**When** ユーザーがダイアログを確認する
**Then** 確認ボタンとキャンセルボタンが無効化されており、ボタンのクリックは無視される

### Requirement: Toast の表示位置とスタイル

Toast SHALL render at a fixed position (top: 16px, right: 16px). Toast with variant "success" MUST have a green left border with white/surface background. Toast with variant "error" MUST have a red left border with white/surface background.

#### Scenario: 成功トーストの表示

**Given** showToast("保存しました", "success") が呼び出された
**When** トーストがレンダリングされる
**Then** 画面右上（fixed, top: 16px, right: 16px）に緑の左ボーダーと白背景のトーストが表示され、「保存しました」のテキストを含む

#### Scenario: エラートーストの表示

**Given** showToast("エラーが発生しました", "error") が呼び出された
**When** トーストがレンダリングされる
**Then** 画面右上（fixed, top: 16px, right: 16px）に赤の左ボーダーと白背景のトーストが表示され、「エラーが発生しました」のテキストを含む

### Requirement: Toast の自動消去

Toast SHALL automatically dismiss after 3 seconds.

#### Scenario: トーストが時間経過で消える

**Given** トーストが表示されている
**When** 3 秒が経過する
**Then** トーストが画面から消去される

### Requirement: Toast の Context アクセス

ToastProvider 内の任意のコンポーネントから useToast フックを通じて showToast 関数にアクセスできなければならない（MUST）。showToast は message（文字列）と variant（"success" | "error"）を引数に取る。

#### Scenario: コンポーネントからトーストを発行する

**Given** ToastProvider の子孫として配置されたコンポーネントがある
**When** そのコンポーネントが useToast().showToast("完了", "success") を呼び出す
**Then** 成功トーストが「完了」のメッセージで表示される

### Requirement: Toast のトースト置換

新しいトーストが発行された場合、表示中のトーストを即座に置き換えなければならない（MUST）。

#### Scenario: 連続トースト発行時の挙動

**Given** 成功トースト「A」が表示されている
**When** エラートースト「B」が発行される
**Then** トースト「A」は消え、トースト「B」が表示される

### Requirement: window.confirm の ConfirmDialog 置換

既存の window.confirm() 呼び出し（DeleteContractButton、DeleteDealButton、DeleteInquiryButton、ClientContactsSection の担当者削除、DealHeaderActions の受注/失注）は、すべて ConfirmDialog に置き換えなければならない（MUST）。削除操作には danger バリアントを使用する。

#### Scenario: 削除ボタンでの確認ダイアログ表示

**Given** 削除ボタンを含む画面が表示されている
**When** ユーザーが削除ボタンをクリックする
**Then** window.confirm ではなく ConfirmDialog（danger バリアント）が表示される。ユーザーが確認ボタンを押すと削除が実行され、キャンセルボタンを押すとダイアログが閉じて削除は実行されない
