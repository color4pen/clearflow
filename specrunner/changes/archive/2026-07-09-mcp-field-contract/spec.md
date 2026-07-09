# Spec: MCP フィールドの用途・形式を describe に明記

## Requirements

### Requirement: Markdown 対応フィールドの describe に形式情報を明記する

MarkdownTextarea で描画される MCP フィールドの describe は、そのフィールドが Markdown 記法と改行に対応していることを明示しなければならない（SHALL）。対象フィールドは UI binding に基づいて以下の 4 つに限定する:

- `inquiries.description`
- `inquiries.contactNote`
- `deals.notes`
- `interactions.summary` (create_meeting / update_meeting)

#### Scenario: inquiries.description の describe に Markdown/改行の旨が含まれる

**Given** MCP サーバーが起動し全ツールが登録されている
**When** tools/list を呼び出して inquiries ツールの inputSchema を取得する
**Then** inputSchema.properties.description.description に「Markdown」または「改行」を含む文字列が設定されている

#### Scenario: inquiries.contactNote の describe に Markdown/改行の旨が含まれる

**Given** MCP サーバーが起動し全ツールが登録されている
**When** tools/list を呼び出して inquiries ツールの inputSchema を取得する
**Then** inputSchema.properties.contactNote.description に「Markdown」または「改行」を含む文字列が設定されている

#### Scenario: deals.notes の describe に Markdown/改行の旨が含まれる

**Given** MCP サーバーが起動し全ツールが登録されている
**When** tools/list を呼び出して deals ツールの inputSchema を取得する
**Then** inputSchema.properties.notes.description に「Markdown」または「改行」を含む文字列が設定されている

#### Scenario: interactions.summary の describe に Markdown/改行の旨が含まれる

**Given** MCP サーバーが起動し全ツールが登録されている
**When** tools/list を呼び出して interactions ツールの inputSchema を取得する
**Then** inputSchema.properties.summary.description に「Markdown」または「改行」を含む文字列が設定されている

### Requirement: interactions のフィールド describe に用途を明記する

interactions ツールのフィールド describe は、各フィールドの用途が相互に判別できる文言を含まなければならない（SHALL）。エージェントが summary / details の使い分けを describe だけで判断できる状態にする。

#### Scenario: interactions.summary の describe に議事録の用途が判別できる

**Given** MCP サーバーが起動し全ツールが登録されている
**When** tools/list を呼び出して interactions ツールの inputSchema を取得する
**Then** inputSchema.properties.summary.description に議事録または要約の本文であることが読み取れる文言が含まれている

#### Scenario: interactions.details の describe に補足の用途が判別できる

**Given** MCP サーバーが起動し全ツールが登録されている
**When** tools/list を呼び出して interactions ツールの inputSchema を取得する
**Then** inputSchema.properties.details.description に補足情報であることが読み取れる文言が含まれている（"要約" とは異なる用途であることが明確）

### Requirement: 用途が欠落しているフィールドの describe を補完する

describe が欠落している主要フィールド（deals description / notes、inquiries description）の describe を補完しなければならない（SHALL）。describe はフィールドの用途を端的に示す文言とする。

#### Scenario: deals.description の describe が設定されている

**Given** MCP サーバーが起動し全ツールが登録されている
**When** tools/list を呼び出して deals ツールの inputSchema を取得する
**Then** inputSchema.properties.description.description が空でない文字列として設定されている

#### Scenario: deals.notes の describe が設定されている

**Given** MCP サーバーが起動し全ツールが登録されている
**When** tools/list を呼び出して deals ツールの inputSchema を取得する
**Then** inputSchema.properties.notes.description が空でない文字列として設定されている

#### Scenario: inquiries.description の describe が設定されている

**Given** MCP サーバーが起動し全ツールが登録されている
**When** tools/list を呼び出して inquiries ツールの inputSchema を取得する
**Then** inputSchema.properties.description.description が空でない文字列として設定されている

### Requirement: スキーマ構造の不変性

describe の変更はフィールドの型・enum・required/optional・スキーマ構造に影響してはならない（MUST NOT）。既存の inputSchema 広告テスト（TC-001〜TC-020）が無変更で green のままであること。

#### Scenario: 既存 inputSchema 広告テストが green

**Given** describe 変更後のコードベース
**When** `mcpInputSchemaAdvertisement.test.ts` の TC-001〜TC-020 を実行する
**Then** 全テストが green（PASS）である

#### Scenario: ツール名が不変

**Given** describe 変更後のコードベース
**When** tools/list を呼び出す
**Then** 全 19 ツールの name が変更前と同一である
