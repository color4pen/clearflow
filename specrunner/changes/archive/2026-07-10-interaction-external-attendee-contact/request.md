# 商談記録の社外参加者を顧客担当者参照に変更

## Meta

- **type**: spec-change
- **slug**: interaction-external-attendee-contact
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 既存 ent-interaction の参加者表現の変更（値 → ent-client-contact 参照）。新しい port/adapter・層構造の選択は無いため false -->

## 背景

商談記録（顧客接点 interaction、kind=meeting）の社外参加者は自由入力の氏名文字列で登録されており、`MeetingAttendee.contactId` は型に存在するが常に null で保存されている。このため同一人物の表記ゆれが防げず、顧客担当者マスタ（client_contacts）と商談記録が突合できない。社外参加者を**顧客に登録済みの担当者（ClientContact）からの選択制**に変更し、参照（contactId）を保存する。

## 決定事項（設計合意済み）

1. 社外参加者は関連顧客の ClientContact からの**選択のみ**。自由入力は廃止する。
2. 選択された担当者は `contactId` を保存し、氏名は**記録時点のスナップショット**として非正規化併存する（表示は氏名）。
3. **懸垂参照は許容**: 担当者が後に削除されても商談記録は書き換えない（氏名スナップショットで読める）。削除時の参照クリア等の付随処理は行わない（契約の [[ent-client]] 非正規化保持と同型）。
4. **既存データ**: 氏名のみ（contactId=null）で登録済みの社外参加者はデータ移行で除去する。
5. 社内参加者は変更しない（氏名文字列のまま。userId は今回埋めない）。
6. MCP（create_meeting / update_meeting）も同じ契約に揃える。ツール名は不変。

## 現状コードの前提

- ドメイン型: `src/domain/models/interaction.ts` の `MeetingAttendee`（`{ userId, contactId, name, isExternal }`。contactId スロットは既存・全書き込み経路で null 固定）。
- 永続化: `interactions.attendees`（JSONB カラム）。**テーブルスキーマ変更は不要**。
- UI 作成: `src/app/(dashboard)/deals/[id]/meetings/new/DealMeetingForm.tsx`（自由入力行＋「顧客担当者から追加...」select＋「顧客担当者として登録」チェックの併存）。
- UI 編集: `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/MeetingAttendeesSection.tsx`（同構成）。
- Server Action: `src/app/actions/meetings.ts`（`externalAttendees: string[]` を受け、`contactRegistrations` / `registerContacts` で createClientContact を best-effort 呼び出し）。
- MCP: `src/app/api/mcp/tools/interactions.ts`（create_meeting / update_meeting。internalAttendees / externalAttendees とも名前文字列リスト。update は部分更新: undefined=保持 / null=クリア）。
- 顧客担当者の取得: `listClientContacts` usecase（clientId × organizationId）。
- 引合詳細からの商談作成は案件側フォームへのリンクであり、参加者入力の UI 経路は上記 2 箇所のみ。

## 設計要素引用

[[ent-interaction]], [[ent-client-contact]], [[ent-client]], [[inv-interaction-external-attendee-from-contact]], [[mod-ui]], [[mod-action]], [[mod-mcp]], [[mod-usecase]]

## aozu 影響判定（起票前判定・必須）: **要対応（設計 delta 反映済み）**

本 request が依拠する設計変更は正本に反映済みであり、本 request は実装をこれに整合させる:

- **[[ent-interaction]]**（`design/domain/model.md`）: 社外参加者は [[ent-client-contact]] から選択して参照し、氏名を記録時点のスナップショットとして非正規化保持する。社内参加者は氏名を保持する。
- **[[inv-interaction-external-attendee-from-contact]]**（`design/domain/invariants.md`）: 社外参加者は顧客に登録済みの [[ent-client-contact]] からの選択でなければならない。氏名はスナップショットであり、担当者削除後も記録は書き換えない。
- 新モジュール・新層間依存辺は導入しない（mod-action / mod-mcp → mod-usecase は既存辺）。`design/rules.json` 不変。
- `aozu check` exit 0・architecture test 緑（設計と実装の整合）。

## 要件

1. **Server Action（作成）**: `createMeetingAction` の社外参加者入力を `externalContactIds`（uuid 配列）に変更。1 件以上あるとき clientId 必須。`listClientContacts` で解決し**氏名はサーバ側で確定**する（クライアント送信の氏名を信用しない）。未登録 id・顧客未設定はバリデーションエラー。`contactRegistrations`（自由入力の担当者即時登録機構）は削除。
2. **Server Action（更新）**: `updateMeetingAction` も同様に contactId ベースへ。`registerContacts` 機構は削除。部分更新（社外参加者の指定が無ければ既存保持）は維持。
3. **UI 作成フォーム**: 社外参加者は「顧客担当者から追加...」select のみ。自由入力行・「顧客担当者として登録」チェックを削除。選択済みは氏名＋削除ボタンの行表示。顧客未設定時は「顧客が未設定のため社外参加者を追加できません」、担当者未登録時は顧客詳細（`/clients/[id]`）への登録導線を案内する。
4. **UI 編集セクション**: 同様に select 追加＋行削除のみ。attendees の contactId を保持して往復させる。
5. **MCP**: create_meeting / update_meeting の `externalAttendees` パラメータを `externalContactIds`（uuid 配列）に置き換え、describe に用途・制約（顧客に登録済みの担当者 ID を指定・未登録 id はエラー・氏名はサーバ側で解決）を明記。update の部分更新意味論（undefined=保持 / null=クリア）は維持。`internalAttendees` は名前リストのまま不変。
6. **データ移行**: `interactions.attendees` JSONB から `isExternal=true` かつ `contactId=null` の要素を除去する**データのみの差分マイグレーション**（スキーマ不変・対象条件の要素に限定・リセット禁止）。
7. **表示系**: 参加者表示は氏名スナップショットのまま成立することを確認する（表示コードの変更は原則不要）。

## スコープ外

- 社内参加者の参照化（userId の充填・ユーザー select の必須化）。
- 案件担当者（[[ent-deal-contact]]）の役割管理との統合。
- 商談フォームからの顧客担当者インライン新規登録（登録は顧客詳細で行う）。
- 顧客詳細画面の担当者編集可否（editable 判定）の変更。

## 受け入れ基準

- [ ] contactId 指定の社外参加者を含む商談作成が永続化され、氏名スナップショットが保存・表示されることを behavioral テストで固定する。
- [ ] 未登録 contactId、および顧客未設定での社外参加者指定がバリデーションエラーになることを固定する。
- [ ] 担当者削除後も既存商談記録の社外参加者の氏名表示が維持されることを固定する（懸垂参照の許容）。
- [ ] MCP create_meeting / update_meeting が `externalContactIds` を受理し、広告 inputSchema から旧 `externalAttendees` が消え、describe に「顧客に登録済み」の制約が含まれることを固定する（tools/list から取得）。部分更新意味論の維持を固定する。
- [ ] 移行適用後、attendees 内に `isExternal=true` かつ `contactId=null` の要素が存在しないこと。
- [ ] 既存の全テストが更新後 green（社内参加者・関連先・その他フィールドの挙動不変）。`typecheck`/`lint`/`build` green。
- [ ] `aozu check` exit 0・architecture test green。
- [ ] mcp-conformance レビュワー（スキーマ広告・契約明確さ・部分更新）を満たす。

## 実装上の必須事項

1. **移行は差分のみ**。スキーマ不変・除去は上記条件に合致する JSONB 要素に限定し、社内参加者・contactId 保持要素・他フィールドに触れない。
2. **behavioral テスト**（実 transport で MCP create/update を叩き、参照保存・エラー系・部分更新・広告を assert）。ソース文字列照合で代替しない。
3. **mock.module 汚染回避**（個別ファイル・afterAll 復元）。
4. **成果物は単体で読めること**（describe・設計・コメントに会話文脈を含めない）。
5. **ツール名・kind・関連先の不変条件（[[inv-interaction-requires-related]]）は不変**。
