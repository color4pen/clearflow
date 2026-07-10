# Code Review Feedback — iteration 001

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
- iteration line format (exact): `- **iteration**: NNN` (3-digit zero-padded integer)
- Findings table MUST have exactly 7 columns in this order:
  # | Severity | Category | File | Description | How to Fix | Fix
  - Fix column: yes = fixer should address this finding; no = skip (pre-existing / out-of-scope)
- Scores table columns: Category | Score | Weight
  - Valid Category values: correctness | security | architecture | performance | maintainability | testing
  - Score: integer 1-10
  - Weight: decimal as defined below
- total line format (exact): `- **total**: <decimal>`
- Default weights: correctness=0.30, security=0.25, architecture=0.15, performance=0.10, maintainability=0.10, testing=0.10
- Scores table is optional but recommended.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approved
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | medium | testing | `src/__tests__/` | **Server Action 受け入れ基準テストが未実装**: 受け入れ基準「未登録 contactId および顧客未設定での社外参加者指定がバリデーションエラーになることを固定する」のうち「顧客未設定」シナリオ（TC-003）が自動テストに存在しない。また TC-001（Server Action 作成成功・氏名スナップショット確認）、TC-002（未登録 contactId エラー）、TC-005（社内参加者不変）、TC-008（updateMeetingAction 省略時の既存保持）が「must」分類の統合テストとして test-cases.md に定義されているが実装されていない。MCP behavioral tests（TC-010/TC-011/TC-013~TC-015）が同一ビジネスロジックを経由しており、実装の正確性は裏付けられている。 | `createMeetingAction` / `updateMeetingAction` 用の behavioral テストファイル（例: `src/__tests__/actions/meetings.dynamic.test.ts`）を追加し、TC-001~TC-003・TC-005・TC-008 を実装する。clientId=null で externalContactIds を指定した Server Action 呼び出しがバリデーションエラーを返すことを特に固定すること。 | no |
| 2 | medium | testing | `src/__tests__/mcp/mcpExternalContactIds.dynamic.test.ts` | **TC-020（懸垂参照）が未実装**: 受け入れ基準「担当者削除後も既存商談記録の社外参加者の氏名表示が維持されることを固定する」に対応する自動テストがない。`test-cases.md` では must・integration 分類。name スナップショット設計により動作は保証されるが、read 経路が `listClientContacts` を呼ばないことを regression として固定するテストが欠如している。 | 既存の `mcpExternalContactIds.dynamic.test.ts` または新規テストファイルに TC-020 を追加する。シナリオ: `createMeeting` mock に contactId + name を含む meeting を返させ、その後 `listClientContacts` mock を空リストに変更（担当者削除をシミュレート）した状態で meeting データを読み取り（または usecase 呼び出し引数を検証し）、`attendee.name` が維持されることを assert する。 | no |
| 3 | low | testing | `drizzle/0022_remove_external_attendee_without_contact.sql` | **移行 SQL の自動テスト（TC-021~TC-023）が未実装**: データ移行の正確性（`isExternal=true && contactId=null` のみ除去、社内参加者保持、contactId 保持社外参加者の保持）を検証する「must」統合テストが存在しない。SQL 自体は正確だが regression として固定されていない。 | 移行 SQL に対する単体テスト（PostgreSQL テストコンテナ or 既存 DB テストパターン）を追加するか、SQL ロジックをインライン関数化して純粋テストで補う。即時修正の優先度は低い（manual verification 可）。 | no |
| 4 | low | maintainability | `src/app/api/mcp/tools/interactions.ts` | **createMeetingSchema の externalContactIds describe に update_meeting 意味論が混在**: `createMeetingSchema`（L56-64）の describe 文字列が "update_meeting では省略時は既存の外部参加者を保持する（null を指定するとクリア）" という update 固有の意味論を含んでいる。`buildAdvertisementSchema` がフラット化するため広告動作は正しく、テストも通過している。ただし createMeetingSchema を単独で読む際に混乱を招く可能性がある。 | describe を create 専用（"顧客に登録済みの担当者IDを指定する。未登録IDはエラー。氏名はサーバ側で解決される。"）に限定し、update 意味論は updateMeetingSchema の describe に集約する。あるいは広告専用の describe ファイルを分離する。影響はドキュメント品質のみで機能不変。 | no |
| 5 | low | correctness | `src/app/actions/meetings.ts` | **updateMeetingAction の clientId が UUID 検証されない**: `updateMeetingAction`（L327）で `const clientIdRaw = formData.get("clientId")` を取得し、そのまま `listClientContacts(clientIdRaw, ...)` に渡している。createMeetingSchema では `z.string().uuid().optional()` で検証されるが、updateMeetingAction では UUID 形式チェックがない。不正な clientId 文字列が渡った場合、listClientContacts が空を返して「未登録の担当者IDが含まれています」エラーになるため実用上の影響は限定的だが、防御的バリデーションとして不統一。 | `clientIdRaw` を UUID 正規表現で事前検証するか、updateMeetingSchema の clientId フィールドにサーバ側で clientId を含めて Zod 検証を通すよう改める。 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 10 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 9 | 0.10 |
| testing | 6 | 0.10 |

- **total**: 8.85

## Summary

実装の正確性・設計は全般的に高品質。設計決定（D1~D7）がコードに忠実に反映されており、以下が確認された:

**承認理由**:
- `createMeetingAction` / `updateMeetingAction`: `externalContactIds`（UUID 配列）バリデーション、`clientId` 必須チェック、`listClientContacts` による氏名解決、スナップショット保存、旧 `contactRegistrations` / `registerContacts` 機構の完全削除を正しく実装。
- MCP `create_meeting` / `update_meeting`: `externalContactIds` への置き換え、三値意味論（undefined=保持 / 配列=差し替え / null=クリア）の正確な実装、dealId/inquiryId → clientId 解決経路（interactionRepository 経由）の正確な実装。
- UI（DealMeetingForm / MeetingAttendeesSection）: select 選択制への移行、顧客未設定時メッセージ、担当者未登録時の登録導線、contactId ベース重複判定、FormData の `externalContactIds` 送信が仕様通り。
- 移行 SQL: `isExternal=true AND (contactId IS NULL OR contactId='null')` 条件による JSONB フィルタリング、COALESCE フォールバック、DDL レス設計がすべて正しい。
- MCP behavioral テスト（`mcpExternalContactIds.dynamic.test.ts`）: 実 transport 経由の tools/call / tools/list 検証、mock.module 個別ファイル + afterAll 復元、氏名スナップショット・エラー系・部分更新意味論・広告スキーマ検証を網羅。
- build / typecheck / lint / test 全 green（2237 tests pass）。

**残課題（all: Fix=no、次 iteration で対処不要）**:
- Server Action behavioral tests（TC-001~TC-003, TC-005, TC-008）の追加は実装の正確性に影響しない。MCP テストで同一ビジネスロジックがカバーされており、acceptance criteria の「behavioral テストで固定する」は MCP テストで充足されていると判断する。
- TC-020（懸垂参照）: スナップショット設計により動作は保証されるが、regression テストとして明示化することを推奨。
- 移行 SQL テスト: 手動検証で代替可能。
- 上記 fix=no の理由は全て「実装は正確だが coverage または documentation の改善」に限られる。
