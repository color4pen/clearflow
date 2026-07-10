# Spec: 商談記録の社外参加者を顧客担当者参照に変更

## Requirements

### Requirement: 社外参加者は登録済み ClientContact の contactId で指定し、氏名はサーバ側で解決する

Server Action および MCP ハンドラは社外参加者を contactId（UUID）で受け取り、`listClientContacts` でテナント内の担当者を取得して氏名をスナップショットとして `MeetingAttendee.name` に設定しなければならない（MUST）。クライアント送信の氏名は受け付けない。

#### Scenario: contactId 指定の社外参加者を含む商談を Server Action で作成する

**Given** 顧客に担当者 A（id=contact-a, name="田中太郎"）が登録されている
**When** `createMeetingAction` を `externalContactIds: ["contact-a"]` で呼び出す
**Then** 作成された商談の attendees に `{ contactId: "contact-a", name: "田中太郎", isExternal: true }` が含まれる

#### Scenario: contactId 指定の社外参加者を含む商談を MCP create_meeting で作成する

**Given** 顧客に担当者 B（id=contact-b, name="鈴木花子"）が登録されている
**When** MCP `create_meeting` を `externalContactIds: ["contact-b"]` で呼び出す
**Then** 作成された商談の attendees に `{ contactId: "contact-b", name: "鈴木花子", isExternal: true }` が含まれる

### Requirement: 未登録 contactId はバリデーションエラーになる

指定された contactId が `listClientContacts` の結果に含まれない場合、Server Action および MCP ハンドラはバリデーションエラーを返さなければならない（MUST）。usecase には到達しない。

#### Scenario: 存在しない contactId で商談作成する

**Given** 顧客の担当者リストに id="nonexistent" は存在しない
**When** `createMeetingAction` を `externalContactIds: ["nonexistent"]` で呼び出す
**Then** バリデーションエラーが返り、商談は作成されない

#### Scenario: MCP で存在しない contactId を指定する

**Given** 顧客の担当者リストに id="nonexistent" は存在しない
**When** MCP `create_meeting` を `externalContactIds: ["nonexistent"]` で呼び出す
**Then** `isError: true` のツールエラーが返る

### Requirement: 顧客未設定で社外参加者を指定するとバリデーションエラーになる

社外参加者（externalContactIds が 1 件以上）を指定する場合、clientId の設定が必須である（MUST）。clientId なしで社外参加者を指定した場合はバリデーションエラーを返す。

#### Scenario: clientId なしで社外参加者を指定して商談作成する

**Given** dealId は設定されているが clientId は未設定
**When** `createMeetingAction` を `externalContactIds: ["some-id"]` で呼び出す
**Then** バリデーションエラーが返る

### Requirement: 担当者削除後も既存商談の氏名表示が維持される

氏名は MeetingAttendee の name フィールドにスナップショットとして保存されるため、担当者が後に削除されても商談記録の社外参加者表示は維持されなければならない（MUST）。削除に伴う参照クリアや氏名更新は行わない。

#### Scenario: 担当者削除後の商談表示

**Given** contactId="contact-x", name="山田次郎" の社外参加者を含む商談が存在する
**When** 担当者 contact-x が顧客担当者マスタから削除される
**Then** 当該商談の attendees には `{ contactId: "contact-x", name: "山田次郎", isExternal: true }` が残存し、表示に使える

### Requirement: MCP inputSchema から旧 externalAttendees が消え externalContactIds が広告される

MCP `tools/list` で取得される interactions ツールの inputSchema は `externalContactIds`（UUID 配列）を広告し、旧 `externalAttendees` を含んではならない（MUST NOT）。`externalContactIds` の describe には「顧客に登録済みの担当者 ID を指定」「未登録 ID はエラー」「氏名はサーバ側で解決」の趣旨が含まれなければならない（MUST）。

#### Scenario: tools/list で externalContactIds が広告される

**Given** MCP サーバーが起動している
**When** `tools/list` を呼び出す
**Then** interactions ツールの inputSchema.properties に `externalContactIds` が存在し、`externalAttendees` が存在しない

#### Scenario: externalContactIds の describe に制約が記載されている

**Given** MCP サーバーが起動している
**When** `tools/list` で interactions ツールの inputSchema を取得する
**Then** `externalContactIds` の description に登録済み担当者 ID の制約が含まれる

### Requirement: MCP update_meeting の部分更新意味論が維持される

`update_meeting` の `externalContactIds` は省略時（undefined）に既存社外参加者を保持し、null 指定時にクリアし、配列指定時に差し替えなければならない（MUST）。`internalAttendees` とは独立して部分更新される。

#### Scenario: externalContactIds を省略して internalAttendees のみ更新する

**Given** 社外参加者 contact-a と社内参加者"佐藤"を含む商談が存在する
**When** MCP `update_meeting` を `internalAttendees: ["高橋"]` のみ（externalContactIds 省略）で呼び出す
**Then** 社内参加者は"高橋"に差し替えられ、社外参加者 contact-a は保持される

#### Scenario: externalContactIds を null でクリアする

**Given** 社外参加者を含む商談が存在する
**When** MCP `update_meeting` を `externalContactIds: null` で呼び出す
**Then** 社外参加者がクリアされる（空配列）

#### Scenario: externalContactIds で差し替える

**Given** 社外参加者 contact-a を含む商談が存在する
**When** MCP `update_meeting` を `externalContactIds: ["contact-b"]` で呼び出す（contact-b は登録済み）
**Then** 社外参加者が contact-b に差し替えられる

### Requirement: データ移行で contactId=null の社外参加者を除去する

マイグレーションは `interactions.attendees` JSONB 内の `isExternal=true` かつ `contactId=null` の要素のみを除去しなければならない（MUST）。社内参加者、contactId を保持する社外参加者、他カラム・他フィールドには影響しない。

#### Scenario: 移行後に contactId=null の社外参加者が存在しない

**Given** attendees に `[{ isExternal: true, contactId: null, name: "旧担当" }, { isExternal: false, contactId: null, name: "社内太郎" }]` を持つ商談がある
**When** データ移行を適用する
**Then** attendees は `[{ isExternal: false, contactId: null, name: "社内太郎" }]` になる（社外の contactId=null のみ除去）

#### Scenario: contactId を持つ社外参加者は保持される

**Given** attendees に `[{ isExternal: true, contactId: "abc", name: "既存担当" }]` を持つ商談がある
**When** データ移行を適用する
**Then** attendees は変更されない

### Requirement: 社内参加者は氏名文字列のまま不変

社内参加者（`isExternal=false`）の入力・保存・表示は既存のまま変更しない（MUST NOT）。`internalAttendees` は名前文字列リストのまま。

#### Scenario: 社内参加者の入力・保存が不変

**Given** 商談作成で `internalAttendees: ["佐藤", "高橋"]` を指定する
**When** 商談を作成する
**Then** attendees に `{ name: "佐藤", isExternal: false }` と `{ name: "高橋", isExternal: false }` が含まれる

### Requirement: contactRegistrations / registerContacts 機構を削除する

Server Action の `contactRegistrations`（作成時）および `registerContacts`（更新時）のスキーマ・パース・best-effort 登録ロジックを削除しなければならない（MUST）。UI の「顧客担当者として登録」チェックボックスも削除する。

#### Scenario: createMeetingAction に contactRegistrations が含まれない

**Given** 変更適用後のコードベース
**When** `createMeetingAction` のスキーマを確認する
**Then** `contactRegistrations` フィールドが存在しない

#### Scenario: updateMeetingAction に registerContacts パースが含まれない

**Given** 変更適用後のコードベース
**When** `updateMeetingAction` のロジックを確認する
**Then** `registerContacts` の FormData パースおよび `createClientContact` 呼び出しが存在しない
