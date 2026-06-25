# 引合の問い合わせ内容フィールド追加

## Meta

- **type**: spec-change
- **slug**: inquiry-contact-note
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: カラム追加のみ。既存パターンの延長 → false -->

## 背景

引合の `description`（概要）フィールドは営業の解釈を含んだ要約だが、顧客からの問い合わせ原文やメモを記録する場所がない。メールの原文、電話の聞き取りメモ、Web フォームの送信内容など、事実としての問い合わせ内容を別フィールドとして保持する。

- **問い合わせ内容（contactNote）**: 誰が、いつ、何を言ってきたかの事実の記録。原文やメモ
- **概要（description）**: それを受けてどういう案件なのかの営業の解釈・要約

## 現状コードの前提

- `src/infrastructure/schema.ts:328` — inquiries テーブルに `description text` のみ。問い合わせ内容用のカラムなし
- `src/domain/models/inquiry.ts:18` — `description: string | null` のみ
- `src/app/(dashboard)/inquiries/new/InquiryForm.tsx` — 登録フォームに「内容」テキストエリアが description に紐づいている
- `src/app/(dashboard)/inquiries/[id]/InquiryInfoDisplay.tsx` — 詳細表示で description を表示
- `src/app/(dashboard)/inquiries/[id]/InquiryInfoSection.tsx` — 編集フォームで description を編集

## 要件

1. **inquiries テーブルに contactNote カラム追加**: `contact_note text` (nullable) をマイグレーションで追加する
2. **Inquiry モデル型に contactNote を追加**: `contactNote: string | null` を追加する
3. **inquiryRepository の mapRow / create / update を更新**: contactNote カラムの読み書きに対応する
4. **引合登録フォームの更新**: 「問い合わせ内容」テキストエリアを追加する。placeholder は「メール原文、電話メモなど」。既存の「内容」フィールドのラベルを「概要」に変更する
5. **引合詳細の表示更新**: InquiryInfoDisplay に contactNote を表示する。「問い合わせ内容」セクションを「概要」セクションの上に配置する（事実が先、解釈が後）
6. **引合詳細の編集更新**: InquiryInfoSection の編集フォームに contactNote フィールドを追加する
7. **createInquiry ユースケースの更新**: contactNote パラメータを受け取り、リポジトリに渡す
8. **updateInquiry ユースケースの更新**: contactNote の更新に対応する
9. **createInquiryAction / updateInquiryAction の更新**: Server Action で contactNote を受け取り、ユースケースに渡す。Zod スキーマに contactNote を追加する

## スコープ外

- 問い合わせ内容の自動取得（メール連携、Webフォーム連携等）
- 問い合わせ内容のリッチテキスト対応
- 既存データへの contactNote のバックフィル

## 受け入れ基準

- [ ] inquiries テーブルに contact_note カラムが存在する
- [ ] Inquiry モデル型に contactNote が含まれる
- [ ] 引合登録フォームに「問い合わせ内容」テキストエリアがある
- [ ] 引合登録フォームの既存「内容」ラベルが「概要」に変更されている
- [ ] 引合詳細に問い合わせ内容が表示される
- [ ] 引合詳細で問い合わせ内容を編集できる
- [ ] `typecheck && test` が green

## architect 評価済みの設計判断

1. **contactNote と description を分離** — 問い合わせの事実（原文・メモ）と営業の解釈（概要）は性質が異なる。1 フィールドに混ぜると案件化判断時にどこまでが顧客の言葉でどこからが営業の解釈かわからなくなる。却下案: description を使い回す — 情報の性質が混在する
2. **contactNote を上に、description を下に配置** — 事実を先に読んでから解釈を読む方が判断しやすい
