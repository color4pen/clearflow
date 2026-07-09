# Test Cases: MCP フィールドの用途・形式を describe に明記

## Summary

- **Total**: 14 cases
- **Automated** (unit/integration): 13
- **Manual**: 1
- **Priority**: must: 12, should: 2, could: 0

---

### TC-001: inquiries.description の describe に「Markdown」または「改行」を含む

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Markdown 対応フィールドの describe に形式情報を明記する > Scenario: inquiries.description の describe に Markdown/改行の旨が含まれる

---

### TC-002: inquiries.contactNote の describe に「Markdown」または「改行」を含む

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Markdown 対応フィールドの describe に形式情報を明記する > Scenario: inquiries.contactNote の describe に Markdown/改行の旨が含まれる

---

### TC-003: deals.notes の describe に「Markdown」または「改行」を含む

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Markdown 対応フィールドの describe に形式情報を明記する > Scenario: deals.notes の describe に Markdown/改行の旨が含まれる

---

### TC-004: interactions.summary の describe に「Markdown」または「改行」を含む

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Markdown 対応フィールドの describe に形式情報を明記する > Scenario: interactions.summary の describe に Markdown/改行の旨が含まれる

---

### TC-005: interactions.summary の describe に議事録の用途が判別できる文言を含む

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: interactions のフィールド describe に用途を明記する > Scenario: interactions.summary の describe に議事録の用途が判別できる

---

### TC-006: interactions.details の describe に補足の用途が判別できる文言を含む

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: interactions のフィールド describe に用途を明記する > Scenario: interactions.details の describe に補足の用途が判別できる

---

### TC-007: deals.description の describe が空でない文字列として設定されている

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 用途が欠落しているフィールドの describe を補完する > Scenario: deals.description の describe が設定されている

---

### TC-008: deals.notes の describe が空でない文字列として設定されている

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 用途が欠落しているフィールドの describe を補完する > Scenario: deals.notes の describe が設定されている

---

### TC-009: inquiries.description の describe が空でない文字列として設定されている

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 用途が欠落しているフィールドの describe を補完する > Scenario: inquiries.description の describe が設定されている

---

### TC-010: 既存 inputSchema 広告テスト（TC-001〜TC-020）が無変更で green

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: スキーマ構造の不変性 > Scenario: 既存 inputSchema 広告テストが green

---

### TC-011: 全 19 ツールの名前が変更前と同一

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: スキーマ構造の不変性 > Scenario: ツール名が不変

---

### TC-012: deals.description の describe に「Markdown」を含まない（ネガティブ）

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-03 TC-FC-08

**GIVEN** describe 変更後のコードベースで MCP サーバーが起動し全ツールが登録されている
**WHEN** tools/list を呼び出して deals ツールの inputSchema を取得する
**THEN** inputSchema.properties.description.description に「Markdown」を含まない（deals.description は MarkdownTextarea 非対応のため誤った Markdown 広告をしていない）

---

### TC-013: hearingData.notes の describe が設定されている

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-02

**GIVEN** MCP サーバーが起動し全ツールが登録されている
**WHEN** tools/list を呼び出して interactions ツールの inputSchema を取得し、`properties.hearingData.properties.notes` のネストパスを traverse する
**THEN** hearingData.notes の description が空でない文字列として設定されている（ヒアリングのメモ・補足事項であることが読み取れる文言を含む）

---

### TC-014: typecheck / lint / build / aozu check が全て exit 0

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** describe 変更後のコードベース
**WHEN** `bun run typecheck`・`bun run lint`・`bun run build`・`bunx aozu check` を順に実行する
**THEN** 全コマンドが exit 0 で完了し、型エラー・lint エラー・ビルドエラー・アーキテクチャ違反のいずれも発生しない

---

## Result

```yaml
result: completed
total: 14
automated: 13
manual: 1
must: 12
should: 2
could: 0
blocked_reasons: []
```
