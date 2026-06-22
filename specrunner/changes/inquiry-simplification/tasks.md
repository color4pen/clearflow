# Tasks: 引き合い簡素化と商談の案件専属化

## T-01: ドメインモデルを更新する

- [ ] `src/domain/models/inquiry.ts` の `InquiryStatus` 型から `"in_progress"` を削除し `"new" | "converted" | "declined"` にする
- [ ] `src/domain/models/meeting.ts` の `Meeting` 型から `inquiryId: string | null` フィールドを削除する
- [ ] `src/domain/models/meeting.ts` の `Meeting` 型の `dealId` を `string | null` から `string`（NOT NULL）に変更する
- [ ] `src/domain/models/meeting.ts` の `Meeting` 型コメント「inquiryId と dealId のどちらか一方は必須（アプリケーション層で検証）」を削除する

**Acceptance Criteria**:
- `InquiryStatus` 型が `"new" | "converted" | "declined"` のみからなる
- `Meeting` 型に `inquiryId` フィールドが存在しない
- `Meeting` 型の `dealId` が `string`（nullable なし）である
- `bun run typecheck` が T-01 の変更後に該当ファイルでエラーを報告しない（後続タスクで全体修正）

---

## T-02: 遷移ルールを更新する

- [ ] `src/domain/services/inquiryTransition.ts` の `VALID_TRANSITIONS` を以下に変更する
  - `new: ["converted", "declined"]`
  - `declined: ["new"]`
  - `in_progress` のキーおよび `in_progress` への参照を全て削除する

**Acceptance Criteria**:
- `canTransition("new", "converted")` が `true` を返す
- `canTransition("new", "declined")` が `true` を返す
- `canTransition("declined", "new")` が `true` を返す
- `canTransition("new", "in_progress")` が `false` を返す
- `canTransition("declined", "in_progress")` が `false` を返す
- `canTransition("in_progress", "converted")` が `false` を返す

---

## T-03: スキーマを更新する

- [ ] `src/infrastructure/schema.ts` の `inquiryStatusEnum` から `"in_progress"` を削除し `["new", "converted", "declined"]` にする
- [ ] `src/infrastructure/schema.ts` の `meetings` テーブル定義から `inquiryId: uuid("inquiry_id").references(() => inquiries.id)` カラムを削除する
- [ ] `src/infrastructure/schema.ts` の `meetings` テーブルの `dealId` を `.references(() => deals.id).notNull()` に変更する（nullable を削除）
- [ ] `src/infrastructure/schema.ts` の `meetings` テーブルコメント「inquiryId と dealId のどちらか一方は必須（アプリケーション層で検証）」を削除する
- [ ] `src/infrastructure/schema.ts` の `inquiriesRelations` から `meetings: many(meetings)` を削除する
- [ ] `src/infrastructure/schema.ts` の `meetingsRelations` から `inquiry: one(inquiries, {...})` を削除する

**Acceptance Criteria**:
- `inquiryStatusEnum` の値が `["new", "converted", "declined"]` のみである
- `meetings` テーブルに `inquiryId` カラムが存在しない
- `meetings` テーブルの `dealId` が `.notNull()` を持つ
- `inquiriesRelations` に `meetings` フィールドが存在しない
- `meetingsRelations` に `inquiry` フィールドが存在しない

---

## T-04: マイグレーションファイルを生成する

- [ ] `bunx drizzle-kit generate` を実行して差分マイグレーションファイルを生成する
- [ ] 生成されたマイグレーション SQL に以下が含まれることを目視で確認する
  - `ALTER TABLE meetings DROP COLUMN inquiry_id`（または等価な DROP）
  - `deal_id` への NOT NULL 制約追加
  - `inquiry_status` の enum 型から `in_progress` 削除
- [ ] 既存のマイグレーションファイルが変更されていないことを確認する（`git diff` で既存ファイルの変更がないこと）

**Acceptance Criteria**:
- 新しいマイグレーションファイルが `drizzle/` ディレクトリに追加されている
- 既存のマイグレーションファイルには変更が加えられていない

---

## T-05: meetingRepository を更新する

- [ ] `src/infrastructure/repositories/meetingRepository.ts` の `mapRow` 関数から `inquiryId: row.inquiryId ?? null` のマッピングを削除する
- [ ] `create` 関数のパラメータ型から `inquiryId?: string | null` を削除する
- [ ] `create` 関数の `.values({...})` から `inquiryId: data.inquiryId ?? null` を削除する
- [ ] `findAllByInquiry` 関数全体を削除する
- [ ] `findAllByInquiryOrDeal` 関数全体を削除する

**Acceptance Criteria**:
- `meetingRepository` に `findAllByInquiry` 関数が存在しない
- `meetingRepository` に `findAllByInquiryOrDeal` 関数が存在しない
- `create` 関数の引数に `inquiryId` が存在しない
- `mapRow` 関数が `inquiryId` をマッピングしない

---

## T-06: createMeeting ユースケースを更新する

- [ ] `src/application/usecases/createMeeting.ts` の引数型から `inquiryId?: string | null` を削除する
- [ ] `dealId` を `string`（必須、`?: string | null` ではない）に変更する
- [ ] `if (!data.inquiryId && !data.dealId)` の条件チェックを `if (!data.dealId)` に変更する（または dealId 必須チェックのみに変更）
- [ ] `inquiryId` による引き合い存在確認ブロック（`if (data.inquiryId) { ... }` 全体）を削除する
- [ ] `meetingRepository.create` 呼び出しから `inquiryId: data.inquiryId ?? null` を削除する

**Acceptance Criteria**:
- `createMeeting` の引数型に `inquiryId` フィールドが存在しない
- `createMeeting` の引数型の `dealId` が `string`（必須）である
- `inquiryRepository.findById` を `inquiryId` で呼ぶロジックが存在しない

---

## T-07: updateInquiryStatus ユースケースを更新する

- [ ] `src/application/usecases/updateInquiryStatus.ts` の引数型の `newStatus` から `in_progress` を含む型注釈を `InquiryStatus` に統一する（型が自動的に3値になる）
- [ ] `converted` 遷移処理を `in_progress → converted` 前提から `new → converted` を受け付けるよう変更する（`canTransition` チェックが既に `new → converted` を許可するため、主に既存ロジックの前提コメント等を整理する）
- [ ] `converted` 以外の遷移処理で `in_progress` を特別扱いしているコードがあれば削除する

**Acceptance Criteria**:
- `newStatus` の型が `InquiryStatus`（`"new" | "converted" | "declined"`）である
- `new` ステータスの引き合いで `updateInquiryStatus({ newStatus: "converted" })` を呼んだ時、`canTransition` チェックを通過して Deal 作成まで進む

---

## T-08: Server Action（meetings.ts）を更新する

- [ ] `src/app/actions/meetings.ts` の `createMeetingSchema` から `inquiryId: z.string().uuid(...).optional()` を削除する
- [ ] `createMeetingSchema` の `dealId` を `z.string().uuid("案件IDが不正です")` （optional なし・必須）に変更する
- [ ] `CreateMeetingState.errors` 型から `inquiryId?: string[]` を削除する
- [ ] `createMeetingAction` 内の `inquiryIdRaw` の読み取り・`parsed` への引き渡しを削除する
- [ ] `createMeetingAction` 内の `if (!parsed.data.inquiryId && !parsed.data.dealId)` チェックを削除する（dealId 必須は schema で保証済み）
- [ ] `createMeeting` 呼び出しから `inquiryId: parsed.data.inquiryId ?? null` を削除する
- [ ] `createMeetingAction` 末尾の `if (parsed.data.inquiryId)` ブロック（`revalidatePath` 呼び出し）を削除する
- [ ] `updateMeetingSchema` から `inquiryId: z.string().uuid(...).optional()` を削除する
- [ ] `UpdateMeetingState.errors` 型から `inquiryId?: string[]` を削除する
- [ ] `updateMeetingAction` 末尾の `revalidatePath(`/inquiries/${parsed.data.inquiryId}`)` と `revalidatePath(`/inquiries/${parsed.data.inquiryId}/meetings/${parsed.data.meetingId}`)` を削除する（代わりに `dealId` ベースの revalidatePath があれば維持）

**Acceptance Criteria**:
- `createMeetingSchema` に `inquiryId` フィールドが存在しない
- `createMeetingSchema` の `dealId` が必須フィールドである
- `createMeetingAction` 内に `/inquiries/` を参照する `revalidatePath` が存在しない
- `updateMeetingSchema` に `inquiryId` フィールドが存在しない

---

## T-09: Server Action（inquiries.ts）を更新する

- [ ] `src/app/actions/inquiries.ts` の `updateInquiryStatusAction` で `newStatus` の型キャストを `"new" | "converted" | "declined"` に変更する（`"in_progress"` を含む型キャストを削除）

**Acceptance Criteria**:
- `updateInquiryStatusAction` が `newStatus: "in_progress"` を型レベルで受け付けない

---

## T-10: InquiryActions UI を更新する

- [ ] `src/app/(dashboard)/inquiries/[id]/InquiryActions.tsx` の `inquiry.status === "new"` の `onClick={() => handleTransition("in_progress")}` ブロック（「対応開始」ボタン）を削除する
- [ ] `inquiry.status === "new"` かつ `canChangeStatus` での「案件化」ボタン表示条件を `inquiry.status === "new"` に変更する（`in_progress` 条件不要）
- [ ] `inquiry.status === "declined"` の「対応再開」ボタン（`handleTransition("in_progress")`）を「再開」ボタン（`handleTransition("new")`）に変更する
- [ ] `inquiry.status !== "declined"` の「見送り」ボタンは現状のまま維持する（`new` と `in_progress` 以外で表示という意味だったが、`in_progress` がなくなるため `new` のみで表示される）
- [ ] 不要になった `inquiry.status === "in_progress"` 条件ブロックがあれば削除する

**Acceptance Criteria**:
- `new` 状態で「対応開始」ボタンが存在しない
- `new` 状態で「案件化」と「見送り」ボタンが表示される（`canChangeStatus` を条件として）
- `declined` 状態で「再開」ボタンが `handleTransition("new")` を呼ぶ
- `in_progress` への遷移を呼ぶコードが存在しない

---

## T-11: 引き合い一覧ページを更新する

- [ ] `src/app/(dashboard)/inquiries/page.tsx` の `inProgressCount` 変数の宣言と計算を削除する
- [ ] `<Link href="?status=in_progress" ...>対応中 {inProgressCount}</Link>` とその前後の `{" · "}` セパレータを削除する

**Acceptance Criteria**:
- `inProgressCount` の計算が存在しない
- `?status=in_progress` へのリンクが存在しない

---

## T-12: labels.ts を更新する

- [ ] `src/app/(dashboard)/labels.ts` の `statusLabels` から `in_progress: "対応中"` エントリを削除する

**Acceptance Criteria**:
- `statusLabels` に `in_progress` キーが存在しない

---

## T-13: 引き合い詳細ページから商談履歴セクションを削除する

- [ ] `src/app/(dashboard)/inquiries/[id]/page.tsx` で `meetingRepository.findAllByInquiry(id, organizationId)` の呼び出しを削除する
- [ ] `meetings` 変数の宣言と `meetingRows` のマッピングを削除する（`Promise.all` から `meetings` を取り除く）
- [ ] `MeetingTable` コンポーネントのインポートを削除する
- [ ] 商談履歴セクション（「商談履歴」`SectionCard` 全体）の JSX を削除する
- [ ] `meetingRepository` のインポートを（`meetingRepository` が `page.tsx` で他に使われていなければ）削除する

**Acceptance Criteria**:
- `page.tsx` に「商談履歴」セクションの JSX が存在しない
- `page.tsx` に `meetingRepository.findAllByInquiry` の呼び出しが存在しない
- `page.tsx` に `MeetingTable` コンポーネントが存在しない

---

## T-14: 引き合い経由の商談ルートディレクトリを削除する

- [ ] `src/app/(dashboard)/inquiries/[id]/meetings/` ディレクトリ全体を削除する（`new/`、`[meetingId]/` を含む全ファイル）
- [ ] 削除するファイル一覧:
  - `meetings/new/page.tsx`
  - `meetings/new/MeetingForm.tsx`（存在する場合）
  - `meetings/[meetingId]/page.tsx`
  - `meetings/[meetingId]/MeetingDetail.tsx`

**Acceptance Criteria**:
- `src/app/(dashboard)/inquiries/[id]/meetings/` ディレクトリが存在しない

---

## T-15: シードデータを更新する

- [ ] `src/infrastructure/seed.ts` の `inProgressInquiry1`、`inProgressInquiry2` のステータスを `"new"` に変更する（または文脈上 `converted` が適切であれば `converted` にし、対応する Deal も用意する）
- [ ] シード内の商談データで `inquiryId` フィールドを持つものを全て修正し、`dealId` のみ持つ形に変更する（対応する `dealId` が存在しない場合は商談を削除または既存 deal に紐づける）
- [ ] `meetings` の `insert` 呼び出しから `inquiryId` フィールドへの参照をすべて削除する

**Acceptance Criteria**:
- `seed.ts` に `"in_progress"` ステータスを持つ引き合いが存在しない
- `seed.ts` の商談 `insert` に `inquiryId` フィールドが存在しない

---

## T-16: テストを更新する

- [ ] `src/__tests__/domain/inquiryTransition.test.ts` の各テストを新しい遷移ルールに合わせて書き直す
  - T-01（旧: `new → in_progress` が許可される）→ 新: `new → converted` が許可される
  - T-02（旧: `new → declined` が許可される）→ 内容はそのまま維持
  - T-03（旧: `in_progress → converted` が許可される）→ 新: `declined → new` が許可される（対応再開）
  - T-04（旧: `in_progress → declined` が許可される）→ 新: `new → in_progress` が拒否される（廃止）
  - T-05（旧: `converted → new` が拒否される）→ 内容はそのまま維持
  - T-06（旧: `converted → in_progress` が拒否される）→ 新: `declined → in_progress` が拒否される（廃止）
  - T-07（旧: `declined → in_progress` が許可される）→ 削除または `declined → new` が許可されるに変更
  - T-08（旧: `declined → new` が拒否される）→ 新: `declined → new` が許可される（内容反転）
  - T-09（旧: `new → converted` が拒否される）→ 削除（T-01 と逆になる）
- [ ] テスト ID（T-NN）を採番し直して重複・欠番がないようにする
- [ ] `projectStructure.test.ts` に `inquiryId` 関連アサーションがあれば削除する

**Acceptance Criteria**:
- `bun test` が全件 green になる
- `in_progress` を参照するテストケースが存在しない

---

## T-17: ビルドと型検査で全体整合を確認する

- [ ] `bun run typecheck` を実行しエラーが0件であることを確認する
- [ ] `bun run build` を実行し成功することを確認する
- [ ] `bun test` を実行し全件 green であることを確認する

**Acceptance Criteria**:
- `bun run typecheck` がエラーなしで完了する
- `bun run build` が成功する
- `bun test` が全件 green になる
- `inquiryStatusEnum` に `in_progress` が含まれない
- `meetings` テーブルに `inquiryId` カラムが存在しない
- `meetings.dealId` が NOT NULL である
- `InquiryStatus` 型に `"in_progress"` が含まれない
- `Meeting` 型に `inquiryId` フィールドが存在しない
- `canTransition("new", "converted")` が true を返す
- `canTransition("new", "declined")` が true を返す
- `canTransition("declined", "new")` が true を返す
- `meetingRepository` に `findAllByInquiry` メソッドが存在しない
- `createMeeting` に `inquiryId` パラメータが存在しない
- InquiryActions に「対応開始」ボタンが存在しない
- 引き合い詳細ページに商談履歴セクションが存在しない
- `labels.ts` に `in_progress` が存在しない
- マイグレーションファイルが差分として追加されている（既存ファイルは変更なし）
- 依存方向 `actions → usecases → domain / infrastructure` を遵守
