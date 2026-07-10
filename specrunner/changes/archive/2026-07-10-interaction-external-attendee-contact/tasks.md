# Tasks: 商談記録の社外参加者を顧客担当者参照に変更

## T-01: Server Action（createMeetingAction）を contactId ベースに変更

- [x] `createMeetingSchema` の `externalAttendees: z.array(z.string())` を `externalContactIds: z.array(z.string().uuid("社外参加者IDが不正です"))` に変更する（optional.default([])）
- [x] `contactRegistrationSchema` と `contactRegistrations` フィールドをスキーマから削除する
- [x] `CreateMeetingState.errors` から `externalAttendees` を `externalContactIds` に変更する
- [x] FormData パース処理で `externalAttendees` を `externalContactIds` に改名する（JSON パースのキー名・エラーメッセージ）
- [x] `contactRegistrations` の FormData パース処理を削除する
- [x] `externalContactIds` が 1 件以上あるとき `clientId` が必須であるバリデーションを追加する（未設定時はエラーメッセージを返す）
- [x] `listClientContacts`（usecase）を import し、`parsed.data.clientId` と `session.user.organizationId` で担当者リストを取得する
- [x] 取得した担当者リストから `contactId → name` のマップを作成し、`externalContactIds` の各 ID を解決する。未解決の ID がある場合はバリデーションエラーを返す
- [x] 社外参加者の `MeetingAttendee` 構築を `{ userId: null, contactId, name: resolvedName, isExternal: true }` に変更する（旧: name は入力文字列そのまま、contactId は null 固定）
- [x] `createMeeting` usecase 呼び出し後の `contactRegistrations` ループ（best-effort `createClientContact` 呼び出し）を削除する

**Acceptance Criteria**:
- `externalContactIds` に存在する contactId を指定した商談作成が成功し、attendees に contactId と解決済み氏名が保存される
- 存在しない contactId を指定した場合にバリデーションエラーが返る
- clientId なしで externalContactIds を 1 件以上指定した場合にバリデーションエラーが返る
- `contactRegistrations` 関連のコードが完全に削除されている
- 社内参加者（internalAttendees）の挙動は不変
- typecheck / lint green

## T-02: Server Action（updateMeetingAction）を contactId ベースに変更

- [x] `updateMeetingSchema` の `externalAttendees: z.array(z.string())` を `externalContactIds: z.array(z.string().uuid("社外参加者IDが不正です"))` に変更する（optional のまま — undefined=保持の意味論を維持）
- [x] `UpdateMeetingState.errors` から `externalAttendees` を `externalContactIds` に変更する
- [x] FormData パース処理で `externalAttendees` を `externalContactIds` に改名する
- [x] `externalContactIds` が指定された場合に `clientId` の解決が必要であるため、FormData から `clientId` を取得し `listClientContacts` で担当者リストを取得して contactId → name を解決する。未解決 ID がある場合はバリデーションエラーを返す
- [x] 社外参加者の `MeetingAttendee` 構築を contactId + 解決済み name に変更する
- [x] `externalContactIds` が未指定（undefined）の場合は `externalAttendees` 変数を `undefined` のままにし、既存参加者保持の挙動を維持する
- [x] `registerContacts` の FormData パース・`createClientContact` ループを削除する
- [x] attendees の組み立てロジックで `externalContactIds` の有無判定を `externalAttendees` から切り替える

**Acceptance Criteria**:
- `externalContactIds` 指定時に contactId + 氏名スナップショットで社外参加者が更新される
- `externalContactIds` 省略時に既存社外参加者が保持される
- 存在しない contactId を指定した場合にバリデーションエラーが返る
- `registerContacts` 関連のコードが完全に削除されている
- 社内参加者の部分更新は不変
- typecheck / lint green

## T-03: MCP create_meeting を externalContactIds に変更

- [x] `src/app/api/mcp/tools/interactions.ts` の `createMeetingSchema` で `externalAttendees: z.array(z.string()).optional()` を `externalContactIds: z.array(z.string().uuid()).optional().describe("社外参加者の顧客担当者ID（UUID）リスト。顧客に登録済みの担当者IDを指定する。未登録IDはエラー。氏名はサーバ側で解決される。")` に変更する
- [x] `create_meeting` ハンドラ内の社外参加者 MeetingAttendee 構築を変更する:
  - `typedArgs.externalContactIds` が指定されている場合、dealId または inquiryId から clientId を解決し、`listClientContacts` で担当者リストを取得する
  - contactId → name のマップを作成し、各 ID を解決する。未解決 ID がある場合は `toToolError` でエラーを返す
  - 解決済みの `{ userId: null, contactId, name, isExternal: true }` を attendees に追加する
- [x] `listClientContacts` と必要な repository（dealRepository / inquiryRepository）を import する
- [x] `create_meeting` で externalContactIds が 1 件以上あるとき clientId（deal.clientId or inquiry経由）の解決を行い、clientId が null の場合は `toToolError` でエラーを返す

**Acceptance Criteria**:
- MCP `create_meeting` で `externalContactIds` に登録済み contactId を指定した商談作成が成功する
- 未登録 contactId を指定すると `isError: true` が返る
- `tools/list` の inputSchema に `externalContactIds` が存在し `externalAttendees` が存在しない
- `externalContactIds` の description に「登録済み担当者ID」の制約が含まれる
- `internalAttendees`（名前リスト）の挙動は不変

## T-04: MCP update_meeting を externalContactIds に変更

- [x] `updateMeetingSchema` の `externalAttendees` を `externalContactIds: z.array(z.string().uuid()).nullable().optional().describe("社外参加者の顧客担当者ID（UUID）リスト。指定した場合のみ外部参加者を差し替える。省略時は既存の外部参加者を保持する（internalAttendees とは独立して部分更新される）。null を指定すると外部参加者をクリアする。顧客に登録済みの担当者IDを指定する。未登録IDはエラー。氏名はサーバ側で解決される。")` に変更する
- [x] `update_meeting` ハンドラ内の externalAttendees 処理を変更する:
  - `typedArgs.externalContactIds === undefined` → `externalAttendees = undefined`（保持）
  - `typedArgs.externalContactIds === null` → `externalAttendees = []`（クリア — 既存と同じ）
  - `typedArgs.externalContactIds` が配列 → clientId を解決し `listClientContacts` で contactId → name を解決、`MeetingAttendee[]` に変換。未解決 ID は `toToolError`
- [x] clientId の解決のために、meetingId から既存 interaction を取得し clientId / dealId を参照するか、直接 deal/inquiry を引く。`interactionRepository.findById` は usecase 内で行われるが、MCP ハンドラでは contactId 解決のために事前取得が必要
- [x] 部分更新意味論: `internalAttendees` と `externalContactIds` が独立して動作することを確認する

**Acceptance Criteria**:
- `externalContactIds` に配列を指定すると社外参加者が差し替えられる（contactId + 氏名スナップショット）
- `externalContactIds` を省略すると既存社外参加者が保持される
- `externalContactIds: null` で社外参加者がクリアされる
- `internalAttendees` のみ指定しても社外参加者に影響しない
- 未登録 contactId で `isError: true` が返る
- `tools/list` の description に部分更新意味論の説明が含まれる

## T-05: UI 作成フォーム（DealMeetingForm）を select 選択制に変更

- [x] `ExternalAttendee` 型を `{ contactId: string; name: string }` に変更する（`registerAsContact` を削除）
- [x] `externalAttendees` state の初期値を空配列 `[]` にする
- [x] 「顧客担当者から追加...」select の onChange で、選択された contact の `{ contactId: c.id, name: c.name }` を state に追加する（重複判定は `contactId` ベース）
- [x] 社外参加者の自由入力行（`<Input>` + 氏名直接入力）を削除する
- [x] 「顧客担当者として登録」チェックボックスを削除する
- [x] 「+ 追加」ボタン（`addExternalAttendee`）を削除する
- [x] 選択済み社外参加者の表示を「氏名 + 削除ボタン」の行に変更する（Input ではなくテキスト表示）
- [x] formAction 内の FormData 設定で `externalAttendees`（氏名配列）を `externalContactIds`（contactId 配列）に変更する: `formData.set("externalContactIds", JSON.stringify(externalAttendees.map(a => a.contactId)))`
- [x] `contactRegistrations` の FormData 設定を削除する
- [x] 顧客未設定（`clientId === null`）時に「顧客が未設定のため社外参加者を追加できません」メッセージを表示する
- [x] 担当者未登録（`existingContacts.length === 0` かつ `clientId !== null`）時に顧客詳細ページ（`/clients/[clientId]`）への登録導線リンクを表示する
- [x] `updateExternalAttendeeName`, `toggleRegisterAsContact` 関数を削除する

**Acceptance Criteria**:
- 社外参加者は select からの選択のみで追加できる
- 自由入力の `<Input>` と「顧客担当者として登録」チェックが存在しない
- 選択済み参加者は氏名と削除ボタンで表示される
- 顧客未設定時にメッセージが表示される
- 担当者未登録時に登録導線が表示される
- FormData に `externalContactIds`（UUID 配列）が送信される
- typecheck / lint green

## T-06: UI 編集セクション（MeetingAttendeesSection）を select 選択制に変更

- [x] `externalAttendees` state の型を `Array<{ contactId: string; name: string }>` に変更する
- [x] 初期値を既存 attendees の社外参加者から `{ contactId: a.contactId!, name: a.name }` でマッピングする（contactId が null の旧データは除外する）
- [x] 「顧客担当者から追加...」select の onChange で contactId ベースの重複判定に変更する
- [x] 社外参加者の自由入力行（`<Input>` + 氏名直接入力）を削除し、氏名テキスト + 削除ボタンの表示に変更する
- [x] 「顧客担当者として登録」チェックボックスを削除する
- [x] 「+ 追加」ボタン（`addExternalAttendee`）を削除する
- [x] `handleSave` 内の FormData 設定で `externalAttendees`（氏名配列）を `externalContactIds`（contactId 配列）に変更する
- [x] `registerContacts` の FormData 設定を削除する
- [x] 顧客未設定時・担当者未登録時のメッセージ / 導線を追加する（T-05 と同等）

**Acceptance Criteria**:
- 社外参加者は select からの選択のみで追加・削除できる
- 自由入力と「顧客担当者として登録」チェックが存在しない
- 既存の社外参加者（contactId あり）が正しく初期表示される
- FormData に `externalContactIds`（UUID 配列）が送信される
- `registerContacts` が FormData に含まれない
- typecheck / lint green

## T-07: データ移行（JSONB 要素フィルタリング）

- [x] `drizzle/0022_remove_external_attendee_without_contact.sql` を作成する（連番は既存の最大 + 1）
- [x] SQL: `interactions.attendees` JSONB 内の各要素をフィルタリングし、`isExternal=true` かつ `(contactId IS NULL OR contactId = 'null')` の要素を除去する UPDATE 文を作成する
- [x] フィルタリングは `jsonb_agg` + `jsonb_array_elements` で実現し、除去対象以外の要素（社内参加者・contactId 保持の社外参加者）は保持する
- [x] フィルタリングの結果、attendees が空配列になる場合は `'[]'::jsonb` を設定する（`jsonb_agg` の NULL フォールバック）
- [x] 対象行のみ UPDATE する（WHERE 条件: attendees 内に条件合致の要素が存在する行のみ）
- [x] `drizzle/meta/_journal.json` にエントリを追加する

**Acceptance Criteria**:
- 移行適用後、`isExternal=true` かつ `contactId=null` の attendees 要素が全 interactions から除去されている
- 社内参加者（`isExternal=false`）は保持される
- `contactId` を保持する社外参加者は保持される
- attendees 以外のカラム（summary, details 等）は変更されない
- スキーマ変更（DDL）を含まない

## T-08: 既存テストの更新

- [x] `src/__tests__/usecases/meetingManagement.test.ts`: 静的検証テストの `externalAttendees` 参照を `externalContactIds` に更新する（ソースファイル内の文字列が変わるため）
- [x] `src/__tests__/mcp/mcpInteractions.dynamic.test.ts`: create_meeting / update_meeting のテストで `externalAttendees` を `externalContactIds` に変更する。mock の `createMeeting` / `updateMeeting` 呼び出し引数の attendees に contactId が設定されていることを検証する
- [x] `src/__tests__/mcp/mcpPartialUpdate.dynamic.test.ts`: update_meeting の externalAttendees 部分更新テストを externalContactIds に変更する
- [x] 既存の全テストファイルで `externalAttendees` を参照している箇所を検索し、必要に応じて更新する
- [x] `src/__tests__/actions/interactions.dynamic.test.ts`: Server Action テストの externalAttendees 参照を更新する

**Acceptance Criteria**:
- `bun test` で全テストが green
- 既存テストの意図（部分更新、テナント分離、監査ログ等）が維持される

## T-09: behavioral テストの追加

- [x] 社外参加者 contactId 指定の商談作成テスト（MCP create_meeting 経由）: contactId が attendees に保存され、氏名スナップショットが設定されることを検証する（実 transport で `tools/call`）
- [x] 未登録 contactId 指定時のエラーテスト（MCP create_meeting 経由）: `isError: true` が返ることを検証する
- [x] MCP update_meeting の部分更新テスト: externalContactIds の三値意味論（undefined/配列/null）を検証する
- [x] MCP `tools/list` の広告テスト: inputSchema に `externalContactIds` が存在し `externalAttendees` が存在しないことを検証する。description に「登録済み担当者ID」の制約が含まれることを検証する
- [x] `mock.module` は個別 usecase ファイルをモックし、`afterAll` で復元する（mock 汚染回避）
- [x] テストはソース文字列照合ではなく behavioral（実 transport 経由の `tools/call` / `tools/list` で assert）

**Acceptance Criteria**:
- contactId 保存・氏名スナップショット、未登録 ID エラー、部分更新意味論、広告スキーマのテストが green
- テストは behavioral（実 MCP transport 経由）
- mock.module は個別ファイルモック + afterAll 復元

## T-10: 表示系の確認と typecheck / lint / build 整合

- [x] 参加者表示コンポーネント（商談詳細画面等）で `attendee.name` を表示している箇所が氏名スナップショットで正しく動作することを確認する（変更不要のはず）
- [x] `bun run typecheck` green を確認する
- [x] `bun run lint` green を確認する
- [x] `bun run build` green を確認する
- [x] `bun test` 全テスト green を確認する

**Acceptance Criteria**:
- typecheck / lint / build / test 全て green
- 参加者表示は氏名スナップショットで成立している
