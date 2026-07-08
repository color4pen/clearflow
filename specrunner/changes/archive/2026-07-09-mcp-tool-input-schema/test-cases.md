# Test Cases: MCP ツールの inputSchema をクライアントに正しく広告する

## Summary

- **Total**: 22 cases
- **Automated** (unit/integration): 20
- **Manual**: 2
- **Priority**: must: 12, should: 9, could: 1

---

### TC-001: 全 19 ツールの inputSchema.properties が空でない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 全ツールの広告 inputSchema が operation enum を含む > Scenario: 全 19 ツールの inputSchema.properties が空でない

---

### TC-002: operation プロパティが enum を持つ

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 全ツールの広告 inputSchema が operation enum を含む > Scenario: operation プロパティが enum を持つ

---

### TC-003: inquiries の budget が integer 型で広告される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: inquiries ツールの budget が integer 型として広告される > Scenario: budget が integer 型で広告される

---

### TC-004: inquiries の source が enum で広告される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: inquiries ツールの budget が integer 型として広告される > Scenario: source が enum で広告される

---

### TC-005: create で title 欠落時にエラーを返す

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 不正引数が従来どおり拒否される > Scenario: create で title 欠落時にエラーを返す

---

### TC-006: budget に文字列を渡した場合にエラーを返す

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 不正引数が従来どおり拒否される > Scenario: budget に文字列を渡した場合にエラーを返す

---

### TC-007: 正常な create 呼び出しが従来と同じ結果を返す

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 既存の振る舞いが不変である > Scenario: 正常な create 呼び出しが従来と同じ結果を返す

---

### TC-008: buildAdvertisementSchema が正しい z.object() を生成する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01: 広告用スキーマ自動生成ヘルパーの作成

**GIVEN** `buildAdvertisementSchema` に inquiries の 5 つの operation スキーマ（listSchema, createSchema, updateSchema, updateStatusSchema, deleteSchema）を渡す
**WHEN** 返却値のスキーマ定義を確認する
**THEN** 返却されたスキーマが `z.ZodObject` であり、`operation` プロパティが `z.ZodEnum(["list","create","update","update_status","delete"])` を含む

---

### TC-009: buildAdvertisementSchema の返却スキーマが SDK の normalizeObjectSchema を通過する

**Category**: unit
**Priority**: must
**Source**: design.md > D1: 広告用スキーマとして z.object() フラットオブジェクトを使用する

**GIVEN** `buildAdvertisementSchema` が返したスキーマ（inquiries ツールを例として）
**WHEN** SDK の `normalizeObjectSchema()` に渡す
**THEN** 返却値が `undefined` でなく、有効なスキーマオブジェクトが返る（`EMPTY_OBJECT_JSON_SCHEMA` へのフォールバックが発生しない）

---

### TC-010: tools/list で登録されるツール数が 19 件である

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03: 残り 18 ツールへの一括適用

**GIVEN** MCP サーバーに全ツール登録関数（`registerInquiriesTools` 等）を適用している
**WHEN** `tools/list` リクエストを送信する
**THEN** 返却されたツール配列の長さが 19 である

---

### TC-011: validateAndParse で不正引数を渡すとエラー結果が返る

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-01: 広告用スキーマ自動生成ヘルパーの作成

**GIVEN** `inquiriesInputSchema`（discriminatedUnion）と `{ operation: "create" }`（title 欠落の不正引数）を用意する
**WHEN** `validateAndParse(inquiriesInputSchema, { operation: "create" })` を呼び出す
**THEN** 返却値が `null` でなく、`isError: true` を含むツールエラー結果である

---

### TC-012: validateAndParse で正常引数を渡すと null が返る（エラーなし）

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-01: 広告用スキーマ自動生成ヘルパーの作成

**GIVEN** `inquiriesInputSchema`（discriminatedUnion）と全必須フィールドを含む正常な create 引数を用意する
**WHEN** `validateAndParse(inquiriesInputSchema, validArgs)` を呼び出す
**THEN** 返却値が `null`（エラーなし）であり、後続の switch 分岐に進める状態である

---

### TC-013: deals の estimatedAmount が integer 型として広告される

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-03: 残り 18 ツールへの一括適用

**GIVEN** MCP サーバーに `deals` ツールが `buildAdvertisementSchema` を用いて登録されている
**WHEN** `tools/list` で `deals` の `inputSchema` を取得する
**THEN** `inputSchema.properties.estimatedAmount.type` が `"integer"` である

---

### TC-014: deals の contractType が enum として広告される

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-03: 残り 18 ツールへの一括適用

**GIVEN** MCP サーバーに `deals` ツールが `buildAdvertisementSchema` を用いて登録されている
**WHEN** `tools/list` で `deals` の `inputSchema` を取得する
**THEN** `inputSchema.properties.contractType` が `enum` 配列を持ち、`["quasi_delegation", "fixed_price", "ses"]` を含む

---

### TC-015: single-operation ツール（auditLogs）の operation enum が正しく 1 値のみを含む

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-03: 残り 18 ツールへの一括適用

**GIVEN** MCP サーバーに `audit_logs` ツールが `buildAdvertisementSchema` を用いて登録されている（operation は `search` のみ）
**WHEN** `tools/list` で `audit_logs` の `inputSchema.properties.operation` を取得する
**THEN** `enum` 配列が `["search"]` のみを含む（余分な値がない）

---

### TC-016: operation フィールドに description が付与されている

**Category**: integration
**Priority**: could
**Source**: design.md > D4: .describe() で operation 別の説明とフィールド意味を付与する

**GIVEN** 任意のツールが `buildAdvertisementSchema` で登録されている
**WHEN** `tools/list` でそのツールの `inputSchema.properties.operation` を取得する
**THEN** `description` フィールドが存在し、空文字列でない

---

### TC-017: 認証情報がない呼び出しで従来通りのエラーが返る

**Category**: integration
**Priority**: should
**Source**: design.md > D2: ハンドラ内で既存の discriminatedUnion を明示的に safeParse する

**GIVEN** MCP サーバーに `inquiries` ツールが登録されており、`extra.authInfo` が未設定の状態である
**WHEN** ツールを任意の operation 引数で呼び出す
**THEN** ツール結果が `isError: true` で、メッセージが `"認証情報が取得できません"` である（usecase に到達しない）

---

### TC-018: 不明な operation を渡した場合にエラーが返り usecase に到達しない

**Category**: integration
**Priority**: should
**Source**: design.md > D2: ハンドラ内で既存の discriminatedUnion を明示的に safeParse する

**GIVEN** MCP サーバーに `inquiries` ツールが登録されており、有効な認証情報がある
**WHEN** `{ operation: "unknown_operation" }` でツールを呼び出す
**THEN** ツール結果が `isError: true` であり、いずれの usecase（`createInquiry` 等）も呼び出されない

---

### TC-019: 全ツールの operation enum 値がハンドラ内 switch case と一致する

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-04: 全ツール広告スキーマのテスト

**GIVEN** 各ツールが `buildAdvertisementSchema` で登録されている
**WHEN** `tools/list` で各ツールの `inputSchema.properties.operation.enum` を取得し、実際の discriminatedUnion オプションの operation literal 値と比較する
**THEN** 広告された enum 値の集合と discriminatedUnion に含まれる operation literal 値の集合が完全に一致する（漏れ・余分な値なし）

---

### TC-020: 不正引数のエラー応答に内部詳細（スタックトレース・DB エラー文）が含まれない

**Category**: integration
**Priority**: should
**Source**: request.md > 実装上の必須事項 3: エラーで内部詳細を漏らさない

**GIVEN** MCP サーバーに `inquiries` ツールが登録されており、有効な認証情報がある
**WHEN** `operation: "create"` で `title` を欠落させた引数でツールを呼び出す
**THEN** ツール結果の `content[0].text` が `extractZodErrors` 経由のフィールド別メッセージのみを含み、スタックトレース・SQL・内部クラス名等を含まない

---

### TC-021: 既存の全テストが無変更で green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-05: 既存テスト・品質ゲート確認

**GIVEN** 全 19 ツールと schemaHelpers への変更実装後の codebase
**WHEN** `bun test` を実行する
**THEN** 既存テストファイルに一切変更を加えることなく、全テストが exit 0 で完了する

---

### TC-022: typecheck・lint・build が全て green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-05: 既存テスト・品質ゲート確認

**GIVEN** 全 19 ツールと schemaHelpers への変更実装後の codebase
**WHEN** `bun run typecheck` / `bun run lint` / `bun run build` をそれぞれ実行する
**THEN** 全てのコマンドが exit 0 で完了し、型エラー・lint 警告・ビルドエラーがない

---

## Result

```yaml
result: completed
total: 22
automated: 20
manual: 2
must: 12
should: 9
could: 1
blocked_reasons: []
```
