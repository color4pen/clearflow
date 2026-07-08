# Tasks: MCP ツールの inputSchema をクライアントに正しく広告する

## T-01: 広告用スキーマ自動生成ヘルパーの作成

`src/app/api/mcp/schemaHelpers.ts` を新規作成し、per-operation スキーマ配列から広告用 `z.object()` を自動生成するヘルパーを実装する。

- [ ] `buildAdvertisementSchema(operationSchemas: z.ZodObject[])` 関数を作成する。この関数は以下を行う:
  - 全 operation スキーマから `operation` の literal 値を収集し、`z.enum([...]).describe("実行する操作")` を生成する
  - 全 operation スキーマの shape を走査し、`operation` 以外の全フィールドを `.optional()` でマージする（同名フィールドは最初に出現した型を採用）
  - 各フィールドの既存 `.describe()` を保持する
  - 結果を `z.object({ operation: z.enum([...]), ...mergedFields })` として返す
- [ ] `validateAndParse(discriminatedUnion: z.ZodDiscriminatedUnion, args: unknown)` 関数を作成する。既存の discriminatedUnion で `safeParse` し、成功時は parsed data を返し、失敗時は `handleToolError` 互換のツールエラー結果を返す
- [ ] 型定義を export する: `AdvertisementSchemaResult` 型（`z.ZodObject` のサブタイプ）

**Acceptance Criteria**:
- `buildAdvertisementSchema` に `inquiries` の 5 つの operation スキーマを渡すと、`operation` が `z.enum(["list","create","update","update_status","delete"])` を含む `z.object()` が返る
- 返却されたスキーマを SDK の `normalizeObjectSchema()` に渡すと `undefined` でなくスキーマが返る（空広告フォールバックしない）
- `validateAndParse` で不正引数を渡すと `isError: true` のツール結果が返る

## T-02: inquiries ツールの inputSchema 変更とハンドラ内検証追加

`src/app/api/mcp/tools/inquiries.ts` を修正し、広告用スキーマとハンドラ内明示検証を適用する。このツールをパイロットとし、パターンを確立する。

- [ ] T-01 で作成したヘルパーを import する
- [ ] `inquiriesInputSchema`（discriminatedUnion）は**そのまま残す**（バリデーション用）
- [ ] `buildAdvertisementSchema([listSchema, createSchema, updateSchema, updateStatusSchema, deleteSchema])` で広告用スキーマを生成する
- [ ] `server.registerTool` の `inputSchema` 引数を広告用スキーマに変更する
- [ ] ハンドラの先頭（`switch` の前）で `validateAndParse(inquiriesInputSchema, args)` を呼び出し、失敗時は早期 return でエラーを返す
- [ ] `budget` フィールドに `.describe("予算（整数）")` を追加する（まだ無い場合）
- [ ] `source` の enum 値に `.describe()` を追加する（まだ無い場合）
- [ ] 既存の `switch (args.operation)` 分岐ロジック・認可・レート制限・usecase 委譲は一切変更しない

**Acceptance Criteria**:
- `tools/list` で `inquiries` の `inputSchema.properties` が空でなく、`operation`・`budget`・`source`・`title` 等の全フィールドを含む
- `budget` が `integer` 型として広告される
- `source` が enum として広告される
- 不正引数（`title` 欠落・`budget` に文字列）でエラーが返り、usecase は呼ばれない
- 正常な引数で従来と同じ結果が返る

## T-03: 残り 18 ツールへの一括適用

T-02 で確立したパターンを残り 18 ツールに適用する。

- [ ] `deals.ts` — `buildAdvertisementSchema` で広告用スキーマ生成、ハンドラ先頭に `validateAndParse` 追加
- [ ] `clients.ts` — 同上
- [ ] `interactions.ts` — 同上
- [ ] `tasks.ts` — 同上
- [ ] `watches.ts` — 同上
- [ ] `notifications.ts` — 同上
- [ ] `contracts.ts` — 同上
- [ ] `invoices.ts` — 同上
- [ ] `revenue.ts` — 同上
- [ ] `revenueTargets.ts` — 同上
- [ ] `approvalRequests.ts` — 同上
- [ ] `approvalTemplates.ts` — 同上
- [ ] `approvalPolicies.ts` — 同上
- [ ] `delegations.ts` — 同上
- [ ] `organization.ts` — 同上
- [ ] `users.ts` — 同上
- [ ] `webhooks.ts` — 同上
- [ ] `auditLogs.ts` — 同上

各ツールの変更パターン:
1. `import { buildAdvertisementSchema, validateAndParse } from "../schemaHelpers"` を追加
2. 既存の `xxxInputSchema`（discriminatedUnion）はそのまま残す
3. `const xxxAdvertisementSchema = buildAdvertisementSchema([...per-operation schemas...])` を追加
4. `server.registerTool` の `inputSchema` を `xxxAdvertisementSchema` に変更
5. ハンドラ先頭に `const parseResult = validateAndParse(xxxInputSchema, args); if (parseResult) return parseResult;` を追加
6. 既存の `switch`・認可・レート制限・usecase 委譲は一切変更しない

**Acceptance Criteria**:
- 全 19 ツールで `tools/list` の `inputSchema.properties` が空でない
- 全 19 ツールで `operation` プロパティが正しい enum 値を含む
- 各ツールの既存テストが全て green

## T-04: 全ツール広告スキーマのテスト

全 19 ツールの広告スキーマが正しいことを実行検証（behavioral test）で固定する。`src/__tests__/mcp/mcpInputSchemaAdvertisement.test.ts` を新規作成する。

- [ ] テストセットアップ: `McpServer` を作成し全 19 ツールを登録、`WebStandardStreamableHTTPServerTransport` 経由で `tools/list` を呼び出し、全ツールの `inputSchema` を取得する
- [ ] **全ツール走査テスト**: 全 19 ツールについて以下を assert する:
  - `inputSchema.type === "object"`
  - `inputSchema.properties` が空オブジェクトでない
  - `inputSchema.properties.operation` が存在し、`enum` 配列を持つ
  - `operation.enum` の要素数がそのツールの operation 数と一致する
- [ ] **inquiries 固有テスト**:
  - `budget` プロパティの `type` が `"integer"` である
  - `source` プロパティが `enum` 配列を持ち、`["web", "phone", "email", "referral", "agent_service", "exhibition", "other"]` を含む
- [ ] **バリデーション behavioral テスト（inquiries をサンプルとして）**:
  - `operation: "create"` で `title` 欠落 → `isError: true` で usecase 未到達
  - `operation: "create"` で `budget: "高い"` → `isError: true` で usecase 未到達
  - `operation: "create"` で全必須フィールド有 → `isError: false` で usecase 到達
- [ ] mock 設計: `@/infrastructure/rateLimit` を mock（DB 接続回避）。usecase は個別ファイル mock（バレル経由しない）。`afterAll` で復元

**Acceptance Criteria**:
- 全テストが green
- ソース文字列照合（`readFile` + `toContain`）を使用していない（全て実行検証）
- mock.module でバレル（`@/application/usecases` 等）をモックしていない

## T-05: 既存テスト・品質ゲート確認

既存テスト・ビルド・lint・型チェックが全て green であることを確認する。

- [ ] `bun test` — 全テスト green（新規テスト含む）
- [ ] `bun run typecheck` — 型エラーなし
- [ ] `bun run lint` — lint エラーなし
- [ ] `bun run build` — ビルド成功

**Acceptance Criteria**:
- 上記 4 コマンドが全て exit 0
- 既存テストに変更を加えていない（既存テストはそのまま green）
