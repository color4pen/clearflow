# Test Cases: 商談記録の社外参加者を顧客担当者参照に変更

## Summary

- **Total**: 33 cases
- **Automated** (unit/integration): 24
- **Manual**: 9
- **Priority**: must: 22, should: 10, could: 1

---

## Category: Server Action — Create (T-01)

### TC-001: contactId 指定の社外参加者を含む商談を Server Action で作成する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 社外参加者は登録済み ClientContact の contactId で指定し、氏名はサーバ側で解決する > Scenario: contactId 指定の社外参加者を含む商談を Server Action で作成する

---

### TC-002: 存在しない contactId で Server Action 商談作成するとバリデーションエラー

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 未登録 contactId はバリデーションエラーになる > Scenario: 存在しない contactId で商談作成する

---

### TC-003: clientId なしで社外参加者を指定すると Server Action がバリデーションエラーを返す

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 顧客未設定で社外参加者を指定するとバリデーションエラーになる > Scenario: clientId なしで社外参加者を指定して商談作成する

---

### TC-004: createMeetingAction のスキーマに contactRegistrations が存在しない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: contactRegistrations / registerContacts 機構を削除する > Scenario: createMeetingAction に contactRegistrations が含まれない

---

### TC-005: createMeetingAction で社内参加者（internalAttendees）の入力・保存が不変

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 社内参加者は氏名文字列のまま不変 > Scenario: 社内参加者の入力・保存が不変

---

### TC-006: createMeetingAction で externalContactIds に UUID でない文字列を指定するとバリデーションエラー

**Category**: unit
**Priority**: should
**Source**: tasks.md T-01

**GIVEN** createMeetingSchema の externalContactIds フィールドに `z.array(z.string().uuid())` バリデーションが設定されている
**WHEN** `externalContactIds: ["not-a-uuid"]` を指定して createMeetingAction を呼び出す
**THEN** Zod バリデーションエラーが返り、商談は作成されない

---

## Category: Server Action — Update (T-02)

### TC-007: updateMeetingAction のロジックに registerContacts パースが存在しない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: contactRegistrations / registerContacts 機構を削除する > Scenario: updateMeetingAction に registerContacts パースが含まれない

---

### TC-008: updateMeetingAction で externalContactIds 省略時に既存社外参加者が保持される

**Category**: integration
**Priority**: must
**Source**: tasks.md T-02

**GIVEN** 社外参加者 contact-a（name="田中太郎"）を含む商談が存在する
**WHEN** `updateMeetingAction` を `externalContactIds` フィールドなし（省略）で呼び出す
**THEN** 更新後の商談 attendees に `{ contactId: "contact-a", name: "田中太郎", isExternal: true }` が保持される

---

### TC-009: updateMeetingAction で未登録 contactId を指定するとバリデーションエラー

**Category**: integration
**Priority**: should
**Source**: tasks.md T-02

**GIVEN** 顧客の担当者リストに id="nonexistent" は存在しない
**WHEN** `updateMeetingAction` を `externalContactIds: ["nonexistent"]` で呼び出す
**THEN** バリデーションエラーが返り、商談は更新されない

---

## Category: MCP — create_meeting (T-03)

### TC-010: MCP create_meeting で contactId 指定の社外参加者を含む商談を作成する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 社外参加者は登録済み ClientContact の contactId で指定し、氏名はサーバ側で解決する > Scenario: contactId 指定の社外参加者を含む商談を MCP create_meeting で作成する

---

### TC-011: MCP create_meeting で未登録 contactId を指定するとツールエラーが返る

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 未登録 contactId はバリデーションエラーになる > Scenario: MCP で存在しない contactId を指定する

---

### TC-012: MCP create_meeting で clientId 未設定の案件に社外参加者を指定するとエラー

**Category**: integration
**Priority**: should
**Source**: tasks.md T-03

**GIVEN** clientId が設定されていない dealId に関連した商談作成リクエスト
**WHEN** MCP `create_meeting` を `externalContactIds: ["some-uuid"]` で呼び出す
**THEN** `isError: true` のツールエラーが返る

---

## Category: MCP — update_meeting (T-04)

### TC-013: MCP update_meeting で externalContactIds 省略時に社外参加者が保持される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: MCP update_meeting の部分更新意味論が維持される > Scenario: externalContactIds を省略して internalAttendees のみ更新する

---

### TC-014: MCP update_meeting で externalContactIds=null を指定すると社外参加者がクリアされる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: MCP update_meeting の部分更新意味論が維持される > Scenario: externalContactIds を null でクリアする

---

### TC-015: MCP update_meeting で externalContactIds 配列を指定すると社外参加者が差し替えられる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: MCP update_meeting の部分更新意味論が維持される > Scenario: externalContactIds で差し替える

---

### TC-016: MCP update_meeting で未登録 contactId を指定するとツールエラーが返る

**Category**: integration
**Priority**: should
**Source**: tasks.md T-04

**GIVEN** 顧客の担当者リストに id="nonexistent" は存在しない
**WHEN** MCP `update_meeting` を `externalContactIds: ["nonexistent"]` で呼び出す
**THEN** `isError: true` のツールエラーが返る

---

## Category: MCP — Schema Advertisement (T-03, T-04)

### TC-017: MCP tools/list で externalContactIds が広告され externalAttendees が消えている

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: MCP inputSchema から旧 externalAttendees が消え externalContactIds が広告される > Scenario: tools/list で externalContactIds が広告される

---

### TC-018: MCP tools/list の externalContactIds describe に登録済み担当者 ID の制約が含まれる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: MCP inputSchema から旧 externalAttendees が消え externalContactIds が広告される > Scenario: externalContactIds の describe に制約が記載されている

---

### TC-019: MCP update_meeting の inputSchema describe に部分更新意味論（undefined/null/配列）が含まれる

**Category**: integration
**Priority**: should
**Source**: tasks.md T-04

**GIVEN** MCP サーバーが起動している
**WHEN** `tools/list` で update_meeting の inputSchema を取得する
**THEN** `externalContactIds` の description に undefined=保持 / null=クリア / 配列=差し替えの意味論が含まれる

---

## Category: 懸垂参照（Dangling Reference）

### TC-020: 担当者削除後も既存商談記録の社外参加者氏名表示が維持される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 担当者削除後も既存商談の氏名表示が維持される > Scenario: 担当者削除後の商談表示

---

## Category: データ移行（T-07）

### TC-021: 移行適用後に isExternal=true かつ contactId=null の社外参加者が全件除去される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: データ移行で contactId=null の社外参加者を除去する > Scenario: 移行後に contactId=null の社外参加者が存在しない

---

### TC-022: 移行適用後に contactId を保持する社外参加者は保持される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: データ移行で contactId=null の社外参加者を除去する > Scenario: contactId を持つ社外参加者は保持される

---

### TC-023: 移行適用後に社内参加者（isExternal=false）が保持される

**Category**: integration
**Priority**: must
**Source**: tasks.md T-07

**GIVEN** attendees に `[{ isExternal: true, contactId: null, name: "旧担当" }, { isExternal: false, contactId: null, name: "社内太郎" }]` を持つ商談がある
**WHEN** データ移行を適用する
**THEN** attendees に `{ isExternal: false, contactId: null, name: "社内太郎" }` が残存する（社内参加者は除去されない）

---

### TC-024: 移行適用後に attendees 以外のカラムは変更されない

**Category**: integration
**Priority**: should
**Source**: tasks.md T-07

**GIVEN** summary, details 等のカラムを持つ商談が存在し、attendees に isExternal=true かつ contactId=null の要素がある
**WHEN** データ移行を適用する
**THEN** 当該商談の summary, details, created_at 等 attendees 以外のカラムは変更されない

---

### TC-025: 移行 SQL ファイルにスキーマ変更（DDL）が含まれない

**Category**: manual
**Priority**: could
**Source**: tasks.md T-07

**GIVEN** `drizzle/0022_remove_external_attendee_without_contact.sql` が作成されている
**WHEN** SQL ファイルの内容を確認する
**THEN** CREATE TABLE / ALTER TABLE / DROP TABLE 等の DDL 文が含まれず、UPDATE 文のみで構成されている

---

## Category: UI — 作成フォーム（DealMeetingForm / T-05）

### TC-026: 社外参加者の追加は「顧客担当者から追加...」select のみで行える

**Category**: manual
**Priority**: must
**Source**: tasks.md T-05

**GIVEN** 顧客が設定済みの案件の商談作成フォームを開く
**WHEN** 社外参加者セクションを確認する
**THEN** 「顧客担当者から追加...」select が表示され、自由入力の Input 行・「顧客担当者として登録」チェックボックス・「+ 追加」ボタンが存在しない

---

### TC-027: 顧客未設定の案件で商談作成フォームを開くと案内メッセージが表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md T-05

**GIVEN** clientId が未設定の案件の商談作成フォームを開く
**WHEN** 社外参加者セクションを確認する
**THEN** 「顧客が未設定のため社外参加者を追加できません」のメッセージが表示され、社外参加者 select が表示されない

---

### TC-028: 担当者が未登録の顧客設定済み案件で商談作成フォームを開くと登録導線が表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md T-05

**GIVEN** clientId が設定されているが担当者が 0 件の顧客に紐付く案件の商談作成フォームを開く
**WHEN** 社外参加者セクションを確認する
**THEN** 顧客詳細ページ（`/clients/[clientId]`）への登録導線リンクが表示される

---

### TC-029: 商談作成フォームから送信される FormData に externalContactIds（UUID 配列）が含まれる

**Category**: manual
**Priority**: must
**Source**: tasks.md T-05

**GIVEN** 担当者が登録済みの顧客設定済み案件の商談作成フォームを開き、社外参加者を select から 1 名選択する
**WHEN** フォームを送信する
**THEN** FormData の `externalContactIds` に選択した担当者の UUID が JSON 配列として含まれ、`externalAttendees` および `contactRegistrations` は含まれない

---

## Category: UI — 編集セクション（MeetingAttendeesSection / T-06）

### TC-030: 既存の contactId を持つ社外参加者が編集セクションで正しく初期表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md T-06

**GIVEN** contactId="contact-a", name="田中太郎" の社外参加者を含む商談の編集セクションを開く
**WHEN** 社外参加者リストを確認する
**THEN** 「田中太郎」が氏名テキスト＋削除ボタンの行として表示される（Input 欄ではない）

---

### TC-031: 商談編集セクションから送信される FormData に externalContactIds が含まれ registerContacts が含まれない

**Category**: manual
**Priority**: must
**Source**: tasks.md T-06

**GIVEN** 社外参加者を含む商談の編集セクションを開き、社外参加者に変更を加える
**WHEN** 保存ボタンを押す
**THEN** FormData の `externalContactIds` に選択中の contactId の UUID 配列が含まれ、`registerContacts` が含まれない

---

## Category: 品質ゲート（T-10）

### TC-032: typecheck / lint / build / test がすべて green

**Category**: manual
**Priority**: should
**Source**: tasks.md T-10

**GIVEN** 全変更が適用された状態
**WHEN** `bun run typecheck`、`bun run lint`、`bun run build`、`bun test` を実行する
**THEN** すべてのコマンドが exit 0 で完了する（エラー・警告なし）

---

### TC-033: aozu check exit 0 かつ architecture test が green

**Category**: manual
**Priority**: should
**Source**: tasks.md T-10

**GIVEN** 全変更が適用された状態
**WHEN** `aozu check` を実行し、architecture test を実行する
**THEN** `aozu check` が exit 0 で完了し、architecture test が green になる

---

## Result

```yaml
result: completed
total: 33
automated: 24
manual: 9
must: 22
should: 10
could: 1
blocked_reasons: []
```
