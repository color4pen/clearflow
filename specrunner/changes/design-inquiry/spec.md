# Spec: 引合画面のデザイン適用

## Requirements

### Requirement: 一覧テーブルのカラム順序

一覧テーブル SHALL 件名（先頭、リンク）、顧客名、経路、ステータス、登録日の順でカラムを表示する。

#### Scenario: カラムが正しい順序で表示される

**Given** 引合が 1 件以上存在する
**When** 引合一覧ページを表示する
**Then** テーブルのカラムが左から 件名, 顧客名, 経路, ステータス, 登録日 の順で表示される

#### Scenario: 件名カラムが引合詳細へのリンクになっている

**Given** 引合が 1 件以上存在する
**When** 引合一覧ページを表示する
**Then** 件名カラムの値が `/inquiries/[id]` へのリンクとして表示される

#### Scenario: 登録日が右寄せ mono フォントで表示される

**Given** 引合が 1 件以上存在する
**When** 引合一覧ページを表示する
**Then** 登録日カラムの値が右寄せで monospace フォントで表示される

---

### Requirement: 一覧のフィルタ UI

一覧ページ SHALL ステータスタブボタン、経路ドロップダウン、検索入力の 3 つのフィルタコントロールを提供する。フィルタリングはクライアントサイドで行う。

#### Scenario: ステータスタブで全件が表示される

**Given** 引合が複数件存在し、ステータスが混在している
**When** 「全て」タブを選択する（デフォルト）
**Then** 全ての引合が表示される

#### Scenario: ステータスタブで新規のみフィルタされる

**Given** status=new の引合が 2 件、status=converted の引合が 1 件存在する
**When** 「新規」タブを選択する
**Then** status=new の引合 2 件のみが表示される

#### Scenario: 経路ドロップダウンでフィルタされる

**Given** source=web の引合が 1 件、source=phone の引合が 1 件存在する
**When** 経路ドロップダウンで「電話」を選択する
**Then** source=phone の引合 1 件のみが表示される

#### Scenario: 検索入力で顧客名が部分一致フィルタされる

**Given** clientName=「株式会社ABC」の引合が存在する
**When** 検索入力に「ABC」と入力する
**Then** clientName に「ABC」を含む引合が表示される

#### Scenario: 検索入力で件名が部分一致フィルタされる

**Given** title=「新規Webサイト構築」の引合が存在する
**When** 検索入力に「Web」と入力する
**Then** title に「Web」を含む引合が表示される

#### Scenario: 複数フィルタが AND 条件で適用される

**Given** status=new / source=web の引合 A と、status=new / source=phone の引合 B が存在する
**When** 「新規」タブを選択し、経路ドロップダウンで「Web」を選択する
**Then** 引合 A のみが表示される

---

### Requirement: 一覧のステータスバッジと案件リンク

ステータス列 SHALL バッジスタイルで表示する。converted 行 SHALL ステータスバッジの横に「→ 案件」リンクを表示する。

#### Scenario: ステータスがバッジとして表示される

**Given** status=new の引合が存在する
**When** 引合一覧ページを表示する
**Then** ステータス列に「新規」がバッジ（背景 #f5f5f5、ボーダー #e0e0e0、border-radius 3px）として表示される

#### Scenario: converted 行に案件リンクが表示される

**Given** status=converted の引合が存在し、紐づく deal がある
**When** 引合一覧ページを表示する
**Then** ステータスバッジの横に「→ 案件」リンクが表示され、リンク先は `/deals/[dealId]` である

---

### Requirement: 詳細ページの 2 カラムレイアウト

詳細ページ SHALL 左右 2 カラムのグリッドレイアウト（`1.5fr 1fr`、gap 24px）で表示する。

#### Scenario: 2 カラムグリッドで表示される

**Given** 引合詳細ページを開く
**When** ページが描画される
**Then** コンテンツ領域が `grid-template-columns: 1.5fr 1fr; gap: 24px` のグリッドで配置される

#### Scenario: 左カラムに基本情報・顧客・操作が表示される

**Given** 引合詳細ページを開く
**When** ページが描画される
**Then** 左カラムに上から 基本情報セクション、顧客セクション、操作セクション が表示される

#### Scenario: 右カラムに商談記録が表示される

**Given** 引合詳細ページを開く
**When** ページが描画される
**Then** 右カラムに商談記録セクション（ヘッダー + リスト + 追加ボタン）が表示される

---

### Requirement: 詳細の基本情報セクション（読み取り表示）

基本情報セクション SHALL ラベル（90px 幅）+ 値のグリッド表示とする。

#### Scenario: 基本情報がラベル＋値のグリッドで表示される

**Given** title=「Webサイト構築」、source=web、description=「概要テキスト」の引合が存在する
**When** 引合詳細ページを開く
**Then** 基本情報セクションに「件名: Webサイト構築」「経路: Web」「内容: 概要テキスト」がラベル + 値のグリッド形式（90px ラベル + 1fr 値）で表示される

#### Scenario: 編集モードへの切り替え

**Given** 引合詳細ページを開いている（admin または manager でログイン）
**When** 「編集」ボタンをクリックする
**Then** 基本情報が編集可能なフォーム形式に切り替わる

---

### Requirement: 詳細の顧客セクション

顧客セクション SHALL 基本情報セクションと独立して表示する。

#### Scenario: 顧客が設定済みの場合にリンクが表示される

**Given** clientId が設定済みの引合が存在する
**When** 引合詳細ページを開く
**Then** 顧客セクションに顧客名が `/clients/[clientId]` へのリンクとして表示される

#### Scenario: 顧客が未設定の場合にエラーメッセージが表示される

**Given** clientId が null の引合が存在する
**When** 引合詳細ページを開く
**Then** 顧客セクションに「顧客が設定されていません」のメッセージと顧客選択ボタンが表示される

---

### Requirement: 詳細の商談記録セクション

右カラムの商談記録セクション SHALL 引合に紐づく商談を一覧表示し、追加ボタンを持つ。

#### Scenario: 商談が存在する場合にリストが表示される

**Given** inquiryId に紐づく商談が 2 件存在する（type=hearing, type=proposal）
**When** 引合詳細ページを開く
**Then** 右カラムに商談 2 件が 種別 + 日時 + 要旨 の形式でリスト表示される

#### Scenario: 商談が存在しない場合に空状態が表示される

**Given** inquiryId に紐づく商談が 0 件の引合が存在する
**When** 引合詳細ページを開く
**Then** 右カラムに「商談記録がありません」の空状態メッセージが表示される

#### Scenario: 追加ボタンが表示される

**Given** 引合詳細ページを開く
**When** ページが描画される
**Then** 商談記録セクションのヘッダーに「+ 商談を追加」ボタンが表示される

#### Scenario: status=new（deal なし）の引合で追加ボタンが disabled になる

**Given** status=new の引合が存在し、紐づく deal がない（dealId=null）
**When** 引合詳細ページを開く
**Then** 「+ 商談を追加」ボタンが disabled 状態（クリック不可、`cursor-not-allowed`）で表示される

#### Scenario: 案件化済みの引合で追加ボタンが案件の商談作成へリンクする

**Given** status=converted の引合が存在し、紐づく deal(id=deal-1) がある
**When** 引合詳細ページを開く
**Then** 「+ 商談を追加」ボタンのリンク先が `/deals/deal-1/meetings/new` である

#### Scenario: dealId を持つ商談行がリンクになる

**Given** dealId=deal-1 を持つ商談が存在する
**When** 引合詳細ページを開く
**Then** その商談行は `/deals/deal-1/meetings/[meetingId]` へのリンクとして表示される

#### Scenario: dealId を持たない商談行はリンクにならない

**Given** dealId=null の商談が存在する
**When** 引合詳細ページを開く
**Then** その商談行はリンクなし（クリック不可）で表示される

---

### Requirement: 詳細のステータスバナー

承認待ち時 SHALL 青いバナー、案件化済み時 SHALL 緑バナーを表示する。

#### Scenario: 承認待ちの青バナーが表示される

**Given** status=new の引合で、`requestRepository.findByOriginTriggerEntity` が pending の承認リクエストを返す
**When** 引合詳細ページを開く
**Then** タイトル下に「承認待ちです」の青いバナー（背景 #eef5fb、ボーダー #2980b9）が表示される

#### Scenario: 案件化済みの緑バナーが表示される

**Given** status=converted の引合で、紐づく deal(id=deal-1) がある
**When** 引合詳細ページを開く
**Then** タイトル下に「案件化済み」の緑バナー（背景 #eef7f1、ボーダー #cde6d8）と `/deals/deal-1` へのリンクが表示される

#### Scenario: バナーなしの通常状態

**Given** status=new の引合で、pending の承認リクエストが存在しない
**When** 引合詳細ページを開く
**Then** ステータスバナーは表示されない

---

### Requirement: 詳細のパンくずとタイトル横ステータスバッジ

詳細ページ SHALL パンくず「引合一覧 / {引合名}」とタイトル横にステータスバッジを表示する。

#### Scenario: パンくずが表示される

**Given** title=「Webサイト構築」の引合が存在する
**When** 引合詳細ページを開く
**Then** ページ上部に「引合一覧 / Webサイト構築」のパンくずが表示され、「引合一覧」は `/inquiries` へのリンクになっている

#### Scenario: タイトル横にステータスバッジが表示される

**Given** status=new の引合が存在する
**When** 引合詳細ページを開く
**Then** ページタイトルの横に「新規」のステータスバッジが表示される
