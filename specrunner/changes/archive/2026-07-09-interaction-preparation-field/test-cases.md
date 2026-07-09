# Test Cases: 商談（interaction）に汎用「事前準備」フィールドを追加

## Summary

- **Total**: 25 cases
- **Automated** (unit/integration): 19
- **Manual**: 6
- **Priority**: must: 20, should: 5, could: 0

---

## Scenario 由来 TC（spec.md）

### TC-001: preparation 指定で商談作成すると値が永続化される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: create_meeting SHALL persist the preparation field > Scenario: create_meeting with preparation specified

---

### TC-002: preparation 未指定で商談作成すると null が保存される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: create_meeting SHALL persist the preparation field > Scenario: create_meeting without preparation

---

### TC-003: update_meeting で preparation を省略すると既存値が保持される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: update_meeting SHALL support partial update semantics for preparation > Scenario: update_meeting omitting preparation preserves existing value

---

### TC-004: update_meeting で preparation=null を指定すると値がクリアされる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: update_meeting SHALL support partial update semantics for preparation > Scenario: update_meeting with preparation=null clears the value

---

### TC-005: update_meeting で新しい preparation 値を指定すると値が置き換わる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: update_meeting SHALL support partial update semantics for preparation > Scenario: update_meeting with new preparation value replaces existing

---

### TC-006: tools/list の create_meeting inputSchema に preparation が含まれる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: MCP create_meeting and update_meeting SHALL advertise preparation in inputSchema > Scenario: tools/list includes preparation in create_meeting schema

---

### TC-007: MCP create_meeting が preparation を usecase に渡す

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: MCP create_meeting and update_meeting SHALL advertise preparation in inputSchema > Scenario: MCP create_meeting passes preparation to usecase

---

### TC-008: MCP update_meeting で preparation を省略すると usecase に undefined が渡る

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: MCP create_meeting and update_meeting SHALL advertise preparation in inputSchema > Scenario: MCP update_meeting distinguishes undefined from null for preparation

---

### TC-009: MCP update_meeting で preparation=null を指定すると usecase に null が渡る

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: MCP create_meeting and update_meeting SHALL advertise preparation in inputSchema > Scenario: MCP update_meeting distinguishes undefined from null for preparation

---

### TC-010: preparation なし商談作成が既存フィールドの挙動を変えない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Existing fields and invariants SHALL remain unchanged > Scenario: existing create_meeting without preparation behaves identically

---

### TC-011: update_meeting で他フィールドのみ更新しても preparation を含む全フィールドが保持される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Existing fields and invariants SHALL remain unchanged > Scenario: existing update_meeting partial update for other fields is unaffected

---

## 非 Scenario 由来 TC

### TC-012: マイグレーション SQL が ADD COLUMN のみで構成される

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `interactions` テーブルに既存データが存在する状態で
**WHEN** 生成されたマイグレーション SQL を確認する
**THEN** SQL は `ALTER TABLE "interactions" ADD COLUMN "preparation" text` のみで構成され、DROP / TRUNCATE / データ変更を含まない

---

### TC-013: マイグレーション適用後に既存行の preparation が NULL になる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `interactions` テーブルに preparation カラム追加前のレコードが存在する
**WHEN** `bun run db:migrate` を実行する
**THEN** 既存の全レコードの preparation が NULL であり、既存フィールド（summary / details 等）の値が変化していない

---

### TC-014: Interaction ドメイン型に preparation: string | null が定義される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `src/domain/models/interaction.ts` の `Interaction` 型
**WHEN** `bun run typecheck` を実行する
**THEN** `Interaction` 型が `preparation: string | null` プロパティを持ち、型エラーが発生しない

---

### TC-015: リポジトリの mapRow が DB 行の preparation をドメイン型にマッピングする

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `preparation = "顧客の課題を確認"` を持つ DB 行
**WHEN** `mapRow` 関数を呼び出す
**THEN** 返される `Interaction` の `preparation` が `"顧客の課題を確認"` である

---

### TC-016: リポジトリの mapRow が DB 行の NULL preparation を null にマッピングする

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03

**GIVEN** `preparation = NULL` の DB 行
**WHEN** `mapRow` 関数を呼び出す
**THEN** 返される `Interaction` の `preparation` が `null` である（undefined ではなく null）

---

### TC-017: tools/list の update_meeting inputSchema に preparation が含まれる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** MCP サーバーが起動している
**WHEN** `tools/list` を呼び出す
**THEN** `interactions` ツールの `update_meeting` 操作の `inputSchema.properties` に `preparation` が含まれ、description に「事前準備」と「Markdown」が両方含まれる

---

### TC-018: Server Action が FormData の空文字 preparation を null として扱う

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-06, spec-review-result-001.md > Finding #1

**GIVEN** `preparation = ""` （空文字）を含む FormData でフォームを送信する
**WHEN** `createMeetingAction` がリクエストを処理する
**THEN** usecase に渡る `preparation` が `null` であり（空文字ではなく）、DB に `null` が格納される（既存の summary 処理パターンと一致）

---

### TC-019: preparation フィールドが改行付き Markdown コンテンツを保持する

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-04, design.md > D3

**GIVEN** `preparation = "## 事前確認\n- 予算確認\n- 担当者確認"` を含む商談作成リクエスト
**WHEN** `createMeeting` を実行して、取得した商談を確認する
**THEN** 返される `Interaction` の `preparation` が入力値と完全一致する（改行・Markdown 記法が保持される）

---

### TC-020: 商談作成フォームに事前準備の入力欄が議事録の前に表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-07, design.md > D4, D5

**GIVEN** 商談作成フォーム（`DealMeetingForm.tsx`）をブラウザで表示する
**WHEN** 作成フォームをレンダリングする
**THEN** ラベル「事前準備」の Textarea が summary（議事録）フィールドより前に配置され、placeholder に「Markdown 記法可」が示されている

---

### TC-021: 商談詳細ページに事前準備セクションが議事録セクションの前に表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-08, design.md > D4, D6

**GIVEN** 商談詳細ページ（`/deals/[id]/meetings/[meetingId]`）をブラウザで表示する
**WHEN** ページをレンダリングする
**THEN** `MeetingPreparationSection` が `MeetingSummarySection` より前（上）に配置されている

---

### TC-022: 商談詳細の事前準備セクションが Markdown プレビュー付きインライン編集をサポートする

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-08, design.md > D6

**GIVEN** 編集権限を持つユーザーが商談詳細ページを開いている
**WHEN** 事前準備セクションの編集ボタンをクリックして内容を変更し保存する
**THEN** `MarkdownTextarea` による編集（Markdown プレビュー付き）ができ、保存後に `updateMeetingAction` 経由で値が永続化される

---

### TC-023: preparation が null の商談詳細ページがエラーなく表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-08

**GIVEN** `preparation = null` の商談が存在する
**WHEN** 商談詳細ページをブラウザで表示する
**THEN** `MeetingPreparationSection` がエラーなく表示され、空欄または「未入力」プレースホルダーが適切に表示される

---

### TC-024: design/domain/model.md の ent-interaction に preparation の記述が追加され aozu check が通る

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** `design/domain/model.md` の `ent-interaction` セクションに `preparation` の説明が追記されている
**WHEN** `bun run aozu check` を実行する
**THEN** exit code が 0 でアーキテクチャテストが green になる

---

### TC-025: typecheck / lint / build がすべて green になる

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** 全実装タスク（T-01〜T-09）と既存テストの mock オブジェクト更新（T-10）が完了している
**WHEN** `bun run typecheck`、`bun run lint`、`bun run build` を順に実行する
**THEN** すべてのコマンドがエラーなく完了する

---

## Result

```yaml
result: completed
total: 25
automated: 19
manual: 6
must: 20
should: 5
could: 0
blocked_reasons: []
```
