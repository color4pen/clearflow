# Spec: MCP ツールの発見性向上（description / フィールド説明の充実）

## Requirements

### Requirement: 全 19 ツールの description が相互に distinct である

全ツールの `description` は空でなく、他のいずれのツールとも完全一致しない固有の文字列でなければならない (SHALL)。全ツールが同一の定型文のみという状態を排除する。

#### Scenario: tools/list で取得した description が全て異なる

**Given** 全 19 ツールが登録された MCP サーバー
**When** `tools/list` で全ツールの description を取得する
**Then** 19 件の description が全て空でなく、Set に入れたサイズが 19 である（重複なし）

### Requirement: 各ツールの description にリソースの主要キーワードが含まれる

各ツールの `description` には、そのリソースを特定する主要キーワード（正式名）が最低 1 つ含まれなければならない (SHALL)。

#### Scenario: clients の description に「顧客」が含まれる

**Given** 全 19 ツールが登録された MCP サーバー
**When** `tools/list` で `clients` ツールの description を取得する
**Then** description に「顧客」が含まれる

#### Scenario: inquiries の description に「引合」が含まれる

**Given** 全 19 ツールが登録された MCP サーバー
**When** `tools/list` で `inquiries` ツールの description を取得する
**Then** description に「引合」が含まれる

#### Scenario: deals の description に「案件」が含まれる

**Given** 全 19 ツールが登録された MCP サーバー
**When** `tools/list` で `deals` ツールの description を取得する
**Then** description に「案件」が含まれる

#### Scenario: contracts の description に「契約」が含まれる

**Given** 全 19 ツールが登録された MCP サーバー
**When** `tools/list` で `contracts` ツールの description を取得する
**Then** description に「契約」が含まれる

#### Scenario: invoices の description に「請求」が含まれる

**Given** 全 19 ツールが登録された MCP サーバー
**When** `tools/list` で `invoices` ツールの description を取得する
**Then** description に「請求」が含まれる

### Requirement: description 変更後も inputSchema 広告テストが green である

`description` と `.describe()` の変更は inputSchema の構造（properties・enum・type）に影響を与えてはならない (MUST NOT)。#165 の inputSchema 広告テスト（`mcpInputSchemaAdvertisement.test.ts`）が無変更で green であることを保証する。

#### Scenario: 既存の inputSchema 広告テストが green

**Given** description と `.describe()` の変更が適用された状態
**When** `bun test src/__tests__/mcp/mcpInputSchemaAdvertisement.test.ts` を実行する
**Then** 全テストケース（TC-001〜TC-020）が green

### Requirement: 挙動は不変である

`description` / `.describe()` の文言のみを変更し、`name`・スキーマ構造・検証・認可・usecase 委譲・戻り値は一切変えてはならない (MUST NOT)。

#### Scenario: 既存の全テストが無変更で green

**Given** description と `.describe()` の変更が適用された状態
**When** `bun test` を実行する
**Then** 既存テストに変更を加えることなく全テストが green

#### Scenario: typecheck / lint / build が green

**Given** description と `.describe()` の変更が適用された状態
**When** `bun run typecheck && bun run lint && bun run build` を実行する
**Then** 全て exit 0
