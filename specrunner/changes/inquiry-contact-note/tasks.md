# Tasks: 引合の問い合わせ内容フィールド追加

## T-01: schema.ts に contact_note カラムを追加し、マイグレーションを生成する

- [x] `src/infrastructure/schema.ts` の inquiries テーブル定義に `contactNote: text("contact_note")` を追加する。`description` の直後に配置する
- [x] `bun run db:generate` を実行してマイグレーション SQL を生成する
- [x] 生成されたマイグレーション SQL が `ALTER TABLE "inquiries" ADD COLUMN "contact_note" text;` であることを確認する
- [x] `bun run db:push` でスキーマを開発 DB に反映する

**Acceptance Criteria**:
- `src/infrastructure/schema.ts` の inquiries テーブルに `contactNote: text("contact_note")` が定義されている
- `drizzle/` にマイグレーション SQL ファイルが生成されている
- マイグレーション SQL に `contact_note text` の ADD COLUMN が含まれている

## T-02: Inquiry モデル型に contactNote を追加する

- [x] `src/domain/models/inquiry.ts` の `Inquiry` 型に `contactNote: string | null` を追加する。`description` の直後に配置する

**Acceptance Criteria**:
- `Inquiry` 型に `contactNote: string | null` プロパティが存在する

## T-03: inquiryRepository の mapRow / create / update を更新する

- [x] `src/infrastructure/repositories/inquiryRepository.ts` の `mapRow` 関数に `contactNote: row.contactNote ?? null` を追加する。`description` の直後に配置する
- [x] `create` 関数の引数型に `contactNote?: string | null` を追加する
- [x] `create` 関数の `values` に `contactNote: data.contactNote ?? null` を追加する
- [x] `update` 関数の `data` 引数の Partial 型に `contactNote: string | null` を追加する

**Acceptance Criteria**:
- `mapRow` が contactNote を返す
- `create` が contactNote を受け取り、insert に含める
- `update` の Partial 型に contactNote が含まれ、更新可能である

## T-04: createInquiry ユースケースを更新する

- [x] `src/application/usecases/createInquiry.ts` の `data` 引数型に `contactNote?: string | null` を追加する
- [x] `inquiryRepository.create` への引数に `contactNote: data.contactNote` を追加する

**Acceptance Criteria**:
- `createInquiry` が contactNote を受け取り、repository に渡す

## T-05: updateInquiry ユースケースを更新する

- [x] `src/application/usecases/updateInquiry.ts` の `data` 引数型に `contactNote?: string | null` を追加する
- [x] `updatePayload` の型に `contactNote: string | null` を追加する
- [x] `if (data.contactNote !== undefined) updatePayload.contactNote = data.contactNote;` を追加する

**Acceptance Criteria**:
- `updateInquiry` が contactNote を受け取り、変更されたフィールドとして repository に渡す

## T-06: createInquiryAction / updateInquiryAction を更新する

- [x] `src/app/actions/inquiries.ts` の `createInquirySchema` に `contactNote: z.string().optional()` を追加する
- [x] `CreateInquiryState` の `errors` 型に `contactNote?: string[]` を追加する
- [x] `createInquiryAction` 内で `formData.get("contactNote")` を取得し、parsed オブジェクトに含める
- [x] `createInquiry` の呼び出しに `contactNote: parsed.data.contactNote ?? null` を追加する
- [x] `updateInquirySchema` に `contactNote: z.string().optional()` を追加する
- [x] `UpdateInquiryState` の `errors` 型に `contactNote?: string[]` を追加する
- [x] `updateInquiryAction` の `raw` オブジェクトに `contactNote: formData.get("contactNote") || undefined` を追加する
- [x] `updateInquiry` の呼び出しに `contactNote: parsed.data.contactNote ?? null` を追加する

**Acceptance Criteria**:
- Zod スキーマに contactNote が含まれる
- createInquiryAction が formData から contactNote を取得し usecase に渡す
- updateInquiryAction が formData から contactNote を取得し usecase に渡す

## T-07: 引合登録フォーム（InquiryForm）を更新する

- [x] `src/app/(dashboard)/inquiries/new/InquiryForm.tsx` の既存「内容」FormField のラベルを `"概要"` に変更する
- [x] 「概要」FormField の上に「問い合わせ内容」FormField を新規追加する
- [x] `<Textarea id="contactNote" name="contactNote" rows={6} placeholder="メール原文、電話メモなど" />` を使用する

**Acceptance Criteria**:
- 登録フォームに「問い合わせ内容」テキストエリアが存在する
- placeholder が「メール原文、電話メモなど」である
- 既存の「内容」ラベルが「概要」に変更されている
- 「問い合わせ内容」が「概要」の上に配置されている

## T-08: 引合詳細表示（InquiryInfoDisplay）を更新する

- [x] `src/app/(dashboard)/inquiries/[id]/InquiryInfoDisplay.tsx` の Props 型に `contactNote: string | null` を追加する
- [x] 既存の「内容」ラベルを「概要」に変更する
- [x] 「概要」行の上に「問い合わせ内容」行を追加する。`{inquiry.contactNote ?? "-"}` で表示し、`whitespace-pre-wrap` を適用する
- [x] InquiryInfoSection への props にも `contactNote` を含めて渡す

**Acceptance Criteria**:
- 詳細表示に「問い合わせ内容」行が存在する
- 「問い合わせ内容」が「概要」の上に表示される
- contactNote が null の場合「-」が表示される
- 既存の「内容」ラベルが「概要」に変更されている

## T-09: 引合詳細編集（InquiryInfoSection）を更新する

- [x] `src/app/(dashboard)/inquiries/[id]/InquiryInfoSection.tsx` の Props 型に `contactNote: string | null` を追加する
- [x] 既存の「内容」ラベルを「概要」に変更する
- [x] 「概要」フィールドの上に「問い合わせ内容」フィールドを追加する
- [x] `<Textarea name="contactNote" defaultValue={inquiry.contactNote ?? ""} disabled={!editable} rows={6} onChange={markDirty} />` を使用する

**Acceptance Criteria**:
- 編集フォームに「問い合わせ内容」Textarea が存在する
- 「問い合わせ内容」が「概要」の上に配置されている
- 既存の「内容」ラベルが「概要」に変更されている
- contactNote を編集して保存できる

## T-10: 引合詳細ページ（page.tsx）と InquiryCustomerSection を更新する

- [x] `src/app/(dashboard)/inquiries/[id]/page.tsx` の InquiryInfoDisplay に渡す props に `contactNote: inquiry.contactNote` を追加する
- [x] InquiryCustomerSection に渡す props に `inquiryContactNote={inquiry.contactNote}` を追加する
- [x] `src/app/(dashboard)/inquiries/[id]/InquiryCustomerSection.tsx` の Props 型に `inquiryContactNote: string | null` を追加する
- [x] handleSave 内の formData 設定に `if (inquiryContactNote) formData.set("contactNote", inquiryContactNote);` を追加する（`inquiryDescription` と同じパターン）

**Acceptance Criteria**:
- page.tsx が contactNote を InquiryInfoDisplay と InquiryCustomerSection に渡す
- InquiryCustomerSection が顧客変更時に contactNote を formData に含める
- 顧客変更後に contactNote が消えない

## T-11: 最終検証

- [x] `bun run typecheck` が型エラーなしで完了する
- [x] `bun test` が全テスト pass する
- [x] `bun run build` が成功する

**Acceptance Criteria**:
- `bun run typecheck` が exit 0 で完了する
- `bun test` が全テスト pass する
- `bun run build` が exit 0 で完了する
