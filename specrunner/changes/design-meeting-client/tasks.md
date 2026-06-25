# Tasks: 商談・顧客画面のデザイン適用

## T-01: MeetingAttendeesSection を新規作成する

- [x] `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/MeetingAttendeesSection.tsx` を新規作成する
- [x] `"use client"` コンポーネントとして実装する
- [x] 現在の `MeetingInfoSection.tsx` の出席者セクション（L213-355）のロジックを移植する
- [x] Props: `meetingId`, `dealId`, `attendees: MeetingAttendee[]`, `editable`, `orgUsers`, `existingContacts`, `clientId`
- [x] 「社内」「外部」を見出し付きのサブセクションとして分離表示する
- [x] 社内: ユーザー選択ドロップダウン + テキスト入力 + 追加/削除ボタン
- [x] 外部: 顧客担当者選択ドロップダウン + テキスト入力 + 「顧客担当者として登録」チェックボックス + 追加/削除ボタン
- [x] 独立した保存ボタンを持ち、`updateMeetingAction` を呼び出す。FormData には `meetingId`, `dealId`, `internalAttendees`, `externalAttendees`, `registerContacts`, `clientId` をセットする
- [x] `SectionCard` でラップし、ヘッダーに「出席者」タイトルと保存ボタンを配置する

**Acceptance Criteria**:
- 社内と外部の出席者がサブセクションで分離表示される
- 出席者の追加・削除・保存が独立して動作する
- 外部出席者の「顧客担当者として登録」機能が維持される

## T-02: MeetingHearingSection を新規作成する

- [x] `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/MeetingHearingSection.tsx` を新規作成する
- [x] `"use client"` コンポーネントとして実装する
- [x] 現在の `MeetingInfoSection.tsx` のヒアリング項目セクション（L358-438）のロジックを移植する
- [x] Props: `meetingId`, `dealId`, `hearingData: HearingData | null`, `editable`
- [x] レイアウト: 100px ラベル + 1fr 値の CSS grid（`grid-template-columns: 100px 1fr`）
- [x] フィールド: 課題（Textarea）、予算感（Input）、決裁者（Input）、時期（Input）、競合状況（Textarea）、備考（Textarea）
- [x] 独立した保存ボタンを持ち、`updateMeetingAction` を呼び出す。FormData には `meetingId`, `dealId`, `hearingData` をセットする
- [x] `SectionCard` でラップし、ヘッダーに「ヒアリング項目」タイトルと保存ボタンを配置する

**Acceptance Criteria**:
- ヒアリング項目が 100px ラベル + 1fr 値の grid で表示される
- ヒアリングデータの編集・保存が独立して動作する
- 保存時に `hearingData` のみが送信される

## T-03: MeetingInfoSection を基本情報の表示/編集切替に変更する

- [x] `MeetingInfoSection.tsx` から出席者セクションとヒアリングセクションのコードを削除する
- [x] `useState<"display" | "edit">("display")` で表示モードと編集モードを管理する
- [x] **表示モード**: 種別（ラベル表示）、日時（フォーマット済みテキスト）、場所（テキスト）を `dl` リストで読み取り表示する。`editable` が true の場合「編集」ボタンを表示する
- [x] **編集モード**: 既存のフォーム（種別 Select、日時 Input[datetime-local]、場所 Input）を表示する。「保存」「キャンセル」ボタンを配置する
- [x] 「キャンセル」クリック時は state を初期値にリセットし表示モードに戻す
- [x] 保存成功時は表示モードに戻す
- [x] Props から `orgUsers`, `existingContacts`, `clientId` を削除する（出席者関連は不要になる）
- [x] FormData には `meetingId`, `dealId`, `type`, `date`, `location` のみをセットする
- [x] 不要になった import・state・handler を削除する（`internalAttendees`, `externalAttendees`, `hearingData` 関連）

**Acceptance Criteria**:
- 初期表示が読み取りモードで、種別・日時・場所がテキスト表示される
- 「編集」ボタンクリックでフォームに切り替わる
- 「キャンセル」で変更が破棄され表示モードに戻る
- 保存成功で表示モードに戻る
- 出席者・ヒアリング関連のコードが完全に除去されている

## T-04: 商談詳細ページのレイアウトを再構成する

- [x] `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/page.tsx` を編集する
- [x] `gridTemplateColumns` を `"1fr 2fr"` から `"1.6fr 1fr"` に変更する
- [x] `gap` を `"2"` (8px) から `24px` に変更する（`gap-6` または `style={{ gap: "24px" }}`）
- [x] ツールバーを拡張し、`MeetingInfoSection` をツールバーの下（グリッドの外、ヘッダー領域）に配置する。Props: `meetingId`, `dealId`, `meeting`（type, date, location のみ）, `editable`
- [x] **左カラム**: `MeetingSummarySection`（議事録）を配置する。その下に `meeting.type === "hearing"` の場合のみ `MeetingHearingSection` を配置する
- [x] **右カラム**: `MeetingAttendeesSection`（出席者）を配置する。その下に `MeetingActionItemsSection` を配置する
- [x] 新コンポーネント（`MeetingAttendeesSection`, `MeetingHearingSection`）を import する
- [x] `MeetingAttendeesSection` に必要な Props（`meetingId`, `dealId`, `attendees`, `editable`, `orgUsers`, `existingContacts`, `clientId`）を渡す
- [x] `MeetingHearingSection` に必要な Props（`meetingId`, `dealId`, `hearingData`, `editable`）を渡す

**Acceptance Criteria**:
- カラム比率が `1.6fr 1fr`、gap が 24px である
- 左カラムに議事録 + ヒアリング情報（hearing のみ）が配置されている
- 右カラムに出席者 + アクションアイテムが配置されている
- 基本情報がヘッダー領域に表示されている

## T-05: 顧客一覧を 4 カラムに変更し不要クエリを削除する

- [x] `src/app/(dashboard)/clients/page.tsx` を編集する
- [x] `columns` 配列から以下を削除する: `size`（規模）、`contacts`（担当者数）、`inquiries`（引き合い数）
- [x] `deals` カラムのヘッダーを「案件数」から「関連案件数」に変更する
- [x] 残るカラム: `name`（企業名）、`industry`（業種）、`deals`（関連案件数）、`createdAt`（登録日）
- [x] `contactCountMap` の取得ロジックを削除する（L13-16: `clientRepository.countContactsByClientIds` の呼び出し）
- [x] `inquiryCountMap` の取得ロジックを削除する（L19: `inquiryRepository.findAllByOrganization` の呼び出し、L24-28: 集計ロジック）
- [x] `Promise.all` から `inquiryRepository.findAllByOrganization` を除去し、`dealRepository.findAllByOrganization` のみ残す（Promise.all が不要になれば直接呼び出しに変更）
- [x] 不要になった import を削除する（`clientRepository` の `countContactsByClientIds` が他で使われていなければ import 自体を調整、`inquiryRepository` の import を削除）

**Acceptance Criteria**:
- テーブルカラムが企業名・業種・関連案件数・登録日の 4 つである
- `clientRepository.countContactsByClientIds` が呼び出されていない
- `inquiryRepository.findAllByOrganization` が呼び出されていない
- `dealCountMap` による案件数の取得・表示は維持されている

## T-06: 顧客詳細ページのレイアウトを再構成する

- [x] `src/app/(dashboard)/clients/[id]/page.tsx` を編集する
- [x] `grid grid-cols-2 gap-2` を `grid gap-6` + `style={{ gridTemplateColumns: "1.5fr 1fr" }}` に変更する
- [x] **左カラム**: `ClientInfoSection`（企業情報）を配置する。その下に `ClientContactsSection`（担当者）を配置する
- [x] `ClientInfoSection` の `dl` ラベル幅を現在の `w-16`（64px）から `w-20`（80px）に変更する（`ClientInfoSection.tsx` の `dt` 要素）
- [x] **右カラム**: 関連引合セクション + 案件一覧セクションを配置する
- [x] 現在のフルワイズ配置（`mb-3` で縦積み）から 2 カラムグリッド内に移動する
- [x] 契約一覧セクションは右カラムの案件一覧の下に配置する（デザインには明示されていないが、既存機能を維持する）
- [x] 左カラムの `ClientContactsSection` は `SectionCard` で直接ラップする（現在の `mb-3` のフルワイズ SectionCard を移動）

**Acceptance Criteria**:
- カラム比率が `1.5fr 1fr`、gap が 24px である
- 左カラムに企業情報 + 担当者が配置されている
- 右カラムに関連引合 + 案件一覧 + 契約一覧が配置されている
- 企業情報のラベル幅が 80px である

## T-07: 担当者テーブルを 4 カラムに簡素化する

- [x] `src/app/(dashboard)/clients/[id]/ClientContactsSection.tsx` を編集する
- [x] `<table>` 要素を CSS grid ベースの表示に変更する（`grid-template-columns: 1.2fr 1fr 1.4fr 120px`）
- [x] ヘッダー行: 「名前」「部署・役職」「連絡先」「アクション」の 4 カラム
- [x] **名前カラム**: `contact.name` をそのまま表示。`isPrimary` が true の場合は名前の横に `[主]` バッジを表示する
- [x] **部署・役職カラム**: `contact.department` と `contact.position` を統合表示する。両方ある場合は `"部署 / 役職"` 形式。片方のみの場合はその値のみ。両方 null の場合は `"-"`
- [x] **連絡先カラム**: `contact.email` と `contact.phone` を改行または `/` 区切りで表示する。両方 null の場合は `"-"`
- [x] **アクションカラム（editable 時のみ）**: 「削除」ボタンを配置する。行クリックで編集モーダルを開く動作は維持する
- [x] 既存の追加フォーム（`showForm`）と編集モーダル（`editingContact`）はそのまま維持する（フォームのフィールド構成は変更しない）

**Acceptance Criteria**:
- 担当者テーブルが 4 カラム（名前, 部署・役職, 連絡先, アクション）で表示される
- 部署と役職が 1 セルに統合されている
- メールと電話が 1 セルに統合されている
- 主担当フラグが名前カラムに表示されている
- 追加フォーム・編集モーダルの動作が維持されている

## T-08: 最終検証

- [x] `bun run typecheck` が型エラーなしで完了することを確認する
- [x] `bun test` が全テスト green であることを確認する
- [x] `bun run build` が成功することを確認する

**Acceptance Criteria**:
- `bun run typecheck` が exit 0 で完了する
- `bun test` が全テスト pass する
- `bun run build` が exit 0 で完了する
