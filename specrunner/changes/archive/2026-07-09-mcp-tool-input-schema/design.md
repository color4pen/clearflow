# Design: MCP ツールの inputSchema をクライアントに正しく広告する

## Context

MCP サーバーの全 19 ツールは `z.discriminatedUnion("operation", [...])` を `inputSchema` として `server.registerTool()` に渡している。SDK 1.29 の `normalizeObjectSchema()` はオブジェクトスキーマまたは生シェイプしか受け付けず、discriminatedUnion を渡すと `undefined` を返す。結果、広告用 JSON Schema は `EMPTY_OBJECT_JSON_SCHEMA = { type:'object', properties:{} }` にフォールバックし、クライアント/LLM は型情報を一切取得できない。

一方、実行時の引数検証は `schemaToParse = inputObj ?? tool.inputSchema` で union にフォールバックするため正しく動作している。問題は「広告が空」であること一点に集約される。

既存コード構造:
- 各ツールファイルは per-operation の Zod オブジェクトスキーマ（`listSchema`, `createSchema` 等）を定義
- それらを `z.discriminatedUnion("operation", [...])` でまとめて `inputSchema` に渡す
- ハンドラ内は `switch (args.operation)` で分岐

## Goals / Non-Goals

**Goals**:

- 全 19 ツールの広告 `inputSchema` が空でなく、`operation` enum と全フィールドを含む JSON Schema を返すようにする
- per-operation の厳格な検証を維持する（SDK の暗黙検証に依存せず、ハンドラ内で明示的に safeParse する）
- 振る舞い不変（認可・レート制限・監査・usecase 委譲・戻り値・エラー文言は変更しない）

**Non-Goals**:

- `outputSchema` / `structuredContent` の付与
- ツール `annotations`（`readOnlyHint` 等）
- Prompts / Resources / Elicitation
- SDK のバグ修正やパッチ

## Decisions

### D1: 広告用スキーマとして `z.object()` フラットオブジェクトを使用する

`inputSchema` に渡すスキーマを `z.discriminatedUnion()` から `z.object()` に変更する。全 operation のフィールドを optional で union し、`operation` フィールドは `z.enum([...])` で全 operation 値を列挙する。

**Rationale**: SDK の `normalizeObjectSchema()` は `_zod.def.type === 'object'` または `shape !== undefined` を検出して JSON Schema を生成する。`z.object()` はこの条件を満たす唯一の安定形式。生シェイプ（Record<string, AnySchema>）も受け付けるが、`z.object()` の方がメタデータ（`.describe()`）を付与しやすく、型安全性も高い。

**Alternatives considered**:
- *生シェイプ直渡し*: SDK が `objectFromShape()` で包むが、`.describe()` の付与やネストオブジェクトで挙動が不安定になるリスクがある。却下。
- *SDK パッチ*: `normalizeObjectSchema()` に union 対応を追加する案。依存側の修正であり、SDK アップデートで上書きされる。却下。
- *`zodToJsonSchema` で手動変換して JSON Schema リテラルを渡す*: SDK が Zod スキーマ前提で動いておりリテラル JSON Schema はバリデーション経路との整合が取りにくい。却下。

### D2: ハンドラ内で既存の discriminatedUnion を明示的に safeParse する

広告用 `z.object()` は全フィールド optional のため、SDK のバリデーション（広告スキーマに基づく parse）を通過してしまう不正引数がある。ハンドラ先頭で既存の `discriminatedUnion` に対して `safeParse` し、失敗時は `handleToolError` 経由でフィールド別エラーを返す。

**Rationale**: SDK は `schemaToParse = inputObj ?? tool.inputSchema` で parse するが、`inputObj`（= `normalizeObjectSchema(inputSchema)`）が成功するようになるため、SDK は広告用の緩い `z.object()` で parse する。これは operation 別の必須制約を検証しない。よってハンドラ内での明示 parse が必須。

**Alternatives considered**:
- *SDK に parse 用スキーマを別途渡す*: SDK の `registerTool` API にそのような分離はない。却下。
- *広告用スキーマ自体を厳格にする（conditional required 等）*: JSON Schema の `oneOf` + `required` は Zod の `z.object()` では表現不可。却下。

### D3: 共通ヘルパー `buildAdvertisementSchema` を導入する

各ツールの per-operation スキーマ配列から広告用 `z.object()` を自動生成するヘルパー関数を `src/app/api/mcp/` に新設する。これにより 19 ツール全てで一貫した広告スキーマを保証し、手動構築のミスを防ぐ。

**Rationale**: 19 ツール × 2〜9 operation の手動マージは保守コストが高く、フィールド漏れのリスクがある。ヘルパーは既存の per-operation スキーマの shape を走査し、同名フィールドの型整合を検証しつつ `.optional()` でマージする。

**Alternatives considered**:
- *各ツールで手動で `z.object()` を書く*: 19 ファイルに重複ロジック。新 operation 追加時に広告スキーマの更新漏れが発生する。却下。
- *コード生成*: ビルドステップが増え、ランタイムの型整合検証ができない。却下。

### D4: `.describe()` で operation 別の説明とフィールド意味を付与する

`operation` の `z.enum()` に `.describe()` で各操作の説明を付与する。UUID フィールドには `"UUID形式"` 等の `.describe()` を付与し、クライアントが型・選択肢を判別できるようにする。

**Rationale**: JSON Schema の `description` フィールドは LLM がパラメータの意味を推測する主要な情報源。`.describe()` は SDK の `toJsonSchemaCompat` が自動的に `description` に変換する。

## Risks / Trade-offs

[Risk] **広告スキーマとバリデーションスキーマの二重管理** → Mitigation: `buildAdvertisementSchema` ヘルパーが per-operation スキーマから広告用を自動生成するため、ソースは per-operation スキーマの一箇所のみ。テストで広告スキーマの properties が空でないことを全ツールで検証する。

[Risk] **SDK の parse 経路変更（広告用 z.object で SDK が parse するようになる）** → Mitigation: ハンドラ内で discriminatedUnion による明示 safeParse を追加し、SDK の parse 結果に依存しない。SDK が広告スキーマで parse → 通過 → ハンドラ内の厳格 parse で reject、という二段構成で安全性を確保。

[Risk] **フラットスキーマ上のフィールド名衝突**（異なる operation で同名・異型のフィールド） → Mitigation: 既存コードを調査した結果、同名フィールドは同型（例: `clientId` は常に `z.string().uuid()`）。ヘルパーで型不一致時にビルドエラーを出す検証を入れる。

[Trade-off] **広告スキーマの全フィールド optional 化**: `create` の `title` 必須が広告上は optional に見える。これは意図的なトレードオフ — JSON Schema レベルで operation 別 required を表現できないため、`.describe("create時は必須")` で補完し、実行時検証で担保する。

## Open Questions

なし。SDK のソースコードを確認済みであり、`z.object()` が `normalizeObjectSchema()` を通過することは確定している。
