# Design: 引合の問い合わせ内容フィールド追加

## Context

引合（Inquiry）には `description`（概要）フィールドがあるが、これは営業の解釈・要約を記録するものであり、顧客からの問い合わせ原文やメモを記録する場所がない。メール原文、電話の聞き取りメモ、Web フォームの送信内容など、事実としての問い合わせ内容を保持する `contactNote` フィールドを追加する。

現状の関連コード:

- `src/infrastructure/schema.ts:320-338` — inquiries テーブル定義。`description text` のみ
- `src/domain/models/inquiry.ts` — `Inquiry` 型。`description: string | null`
- `src/infrastructure/repositories/inquiryRepository.ts` — `mapRow`, `create`, `update` で description を扱っている
- `src/application/usecases/createInquiry.ts` — description を受け取り repository に渡す
- `src/application/usecases/updateInquiry.ts` — description の更新に対応
- `src/app/actions/inquiries.ts` — Zod スキーマに description。createInquiryAction / updateInquiryAction で formData から取得
- `src/app/(dashboard)/inquiries/new/InquiryForm.tsx` — 「内容」ラベルで description を入力
- `src/app/(dashboard)/inquiries/[id]/InquiryInfoDisplay.tsx` — 「内容」ラベルで description を表示
- `src/app/(dashboard)/inquiries/[id]/InquiryInfoSection.tsx` — 「内容」ラベルで description を編集
- `src/app/(dashboard)/inquiries/[id]/InquiryCustomerSection.tsx` — updateInquiryAction 呼び出し時に `inquiryDescription` を formData にセットしている
- `src/app/(dashboard)/inquiries/[id]/page.tsx` — inquiry オブジェクトを各コンポーネントに渡す

## Goals / Non-Goals

**Goals**:

- inquiries テーブルに `contact_note text` (nullable) カラムをマイグレーションで追加する
- 全レイヤー（model → repository → usecase → action → UI）を contactNote に対応させる
- 登録フォーム・詳細表示・編集フォームで contactNote を扱えるようにする
- 既存の「内容」ラベルを「概要」に変更し、contactNote を「問い合わせ内容」として表示する
- 表示順序: 問い合わせ内容（事実）→ 概要（解釈）

**Non-Goals**:

- 問い合わせ内容の自動取得（メール連携、Web フォーム連携等）
- 問い合わせ内容のリッチテキスト対応
- 既存データへの contactNote のバックフィル

## Decisions

### D1: contactNote と description を別フィールドとして分離する

**選択**: inquiries テーブルに `contact_note text` カラムを新規追加し、既存の `description` と並置する
**却下**: description を contactNote に改名して使い回す

**Rationale**: 問い合わせの事実（原文・メモ）と営業の解釈（概要）は性質が異なる。1 フィールドに混ぜると案件化判断時にどこまでが顧客の言葉でどこからが営業の解釈かわからなくなる。architect 評価済み。

### D2: contactNote を description の上に配置する

**選択**: UI 上で「問い合わせ内容」を「概要」の上に配置する
**却下**: 「概要」を先に表示する

**Rationale**: 事実を先に読んでから解釈を読む方が判断しやすい。architect 評価済み。

### D3: Drizzle マイグレーション（generate）で ALTER TABLE を使用する

**選択**: `bun run db:generate` でマイグレーション SQL を生成し、`ALTER TABLE inquiries ADD COLUMN contact_note text;` を適用する
**却下**: schema.ts だけ変更して `db:push` で済ませる

**Rationale**: プロジェクトのメモリに「DB リセット禁止。差分マイグレーションのみ」の制約がある。既存データを保持したまま安全にカラムを追加するため、マイグレーションを使用する。

### D4: contactNote は nullable とし、Textarea で入力する

**選択**: `contact_note text` (nullable)。UI は `<Textarea>` を使用
**却下**: NOT NULL 制約を付ける / MarkdownTextarea を使用する

**Rationale**: 既存データにバックフィルしないため nullable が必須。登録時に必ず記入されるとは限らない（電話メモを後から追加するケースなど）。MarkdownTextarea は概要（description）の編集フォームで使用されているが、問い合わせ内容は原文記録であり Markdown プレビューの必要性が低いため、プレーンな Textarea を使用する。登録フォームの description も Textarea を使用しているため一貫性がある。

### D5: InquiryCustomerSection の updateInquiryAction 呼び出しに contactNote を追加する

**選択**: InquiryCustomerSection の Props に `inquiryContactNote` を追加し、handleSave 内の formData に `contactNote` をセットする
**却下**: InquiryCustomerSection は顧客変更専用なので contactNote を無視する

**Rationale**: InquiryCustomerSection は顧客変更時に `updateInquiryAction` を呼び出すが、description 等の既存値を formData に明示的にセットしている。contactNote をセットしないと、更新時に contactNote が空文字列として上書きされる。page.tsx から inquiry.contactNote を渡し、formData にセットすることで既存値を保持する。

## Risks / Trade-offs

**[Risk]** InquiryCustomerSection が updateInquiryAction を呼ぶ際に contactNote をセットし忘れると、顧客変更時に contactNote が消える
→ **Mitigation**: D5 で対処。InquiryCustomerSection の Props と handleSave 内の formData 設定を明示的に更新する。

**[Risk]** 既存データの contactNote が null のため、UI で null 表示になる
→ **Mitigation**: 表示コンポーネントで `contactNote ?? "-"` のフォールバックを使用する（description と同じパターン）。

## Open Questions

なし — architect により設計判断が評価済みであり、既存パターンの延長で実装可能。
