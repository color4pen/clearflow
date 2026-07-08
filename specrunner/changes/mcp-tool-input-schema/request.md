# MCP ツールの inputSchema をクライアントに正しく広告する

## Meta

- **type**: spec-change
- **slug**: mcp-tool-input-schema
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 既存 mod-mcp 内のツール定義の是正。新しい port/adapter・層構造の選択は無いため false -->

## 背景

MCP サーバーの全 19 ツール（inquiries / deals / clients / interactions / tasks / watches / notifications / contracts / invoices / revenue / revenueTargets / approvalRequests / approvalTemplates / approvalPolicies / delegations / organization / users / webhooks / auditLogs）が、`tools/list` でクライアントに返す **`inputSchema` を実質空**（`{ "type": "object", "properties": {} }`）で広告している。その結果、接続したクライアント／LLM は「どの `operation` が使えるか」「各フィールドの型・enum・必須／任意」を一切知ることができず、フィールドを推測で埋める→サーバー側の（正しい）検証に弾かれる、という手戻りが多発する。実運用でも、`budget` が整数型であることが広告されないため文字列で送られ `-32602` を繰り返し踏む事象が確認されている。

### 根本原因（コードで確定済み）

各ツールは `inputSchema` に **トップレベルの `z.discriminatedUnion("operation", [...])`** を渡している。`@modelcontextprotocol/sdk` 1.29 は広告用 JSON Schema を作る際 `normalizeObjectSchema()`（`server/zod-compat.js`）で **オブジェクト／生シェイプしか受け付けず**、union を渡すと `undefined` を返す。すると `server/mcp.js` の広告生成部が **`EMPTY_OBJECT_JSON_SCHEMA = { type:'object', properties:{} }` にフォールバック**する。一方、実行時の引数検証は別経路（`schemaToParse = inputObj ?? tool.inputSchema` で union にフォールバック）なので**検証自体は正しく効く**。つまり「型は厳格に検証するのに、その型情報をクライアントに一切見せていない」状態であり、`budget` の型ズレは検証バグではなく**広告スキーマが空**であることの症状である。

## 現状コードの前提

- `src/app/api/mcp/tools/*.ts`（19 ファイル）: いずれも per-operation の Zod サブスキーマ（例 `createSchema` / `updateSchema` …）を定義し、`z.discriminatedUnion("operation", [...])` にまとめ、`server.registerTool(name, { description, inputSchema: <その union> }, handler)` で登録している。ハンドラは `switch (args.operation)` で分岐し、`canPerform` 認可・`checkRateLimit`・usecase 委譲・監査を行う（この振る舞いは維持する）。
- 参考: `src/app/api/mcp/tools/inquiries.ts` の `createSchema` は `source: z.enum([...])`、`budget: z.number().int().optional()`、`title: z.string().min(1, "件名は必須です")` 等、**型・enum・必須は正しく定義されている**。問題は登録形（union）のみ。
- `src/app/api/mcp/errors.ts`: `handleToolError` → `extractZodErrors` が Zod issue をフィールド別メッセージに整形して返す（不正引数時のクライアント向けエラー経路。維持する）。
- SDK 挙動: `node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js`（広告 inputSchema 生成と `EMPTY_OBJECT_JSON_SCHEMA`）、`.../server/zod-compat.js`（`normalizeObjectSchema`）。

## 設計要素引用

[[mod-mcp]]

mod-mcp の責務は既に「MCP プロトコルの受付・**ツール登録**・Bearer 認証解決・認可チェック・ユースケース委譲。ビジネスロジックを持たない」と定義されており、本 request は**その責務範囲内でのツール登録の是正**である。新モジュール・新依存辺・新ドメイン概念・新シーケンスを導入しない（下記「aozu 影響判定」参照）。

## 要件

1. **全 19 ツールが、SDK が JSON Schema 化できる形の `inputSchema`（オブジェクト／生シェイプ。トップレベル union を渡さない）で登録される。** 広告される JSON Schema の `properties` は空でなく、少なくとも以下を含む:
   - `operation`: そのツールで有効な operation 値を列挙した **enum**（`.describe()` で各操作の説明）。
   - 各 operation で使う**全フィールド**を（オブジェクト階層では任意として）型付きで公開する。`z.number().int()` は integer、`z.enum([...])` は enum、UUID・必須の意味などを **`.describe()`** で明記し、クライアントが型・選択肢を判別できるようにする。
2. **per-operation の厳格な検証を維持する。** ハンドラ内で受領した引数を、従来の per-operation 判別（既存の discriminatedUnion 相当）で `safeParse` し、失敗時は現行と同じくフィールド別メッセージのツールエラー（`-32602` 相当）を返す。`create` の `title` 必須などの**必須制約を緩めない**（オブジェクト広告上は任意でも、operation ごとの必須は内部検証で担保する）。
3. **振る舞いは不変。** 認可（`canPerform`）・レート制限・監査・usecase 委譲・戻り値・エラー文言は現状どおり。変わるのは「広告される inputSchema」と「明示的な内部検証の置き場所」のみ。
4. 実装形は設計ステップの判断に委ねるが、推奨は「`z.object({ operation: z.enum([...]).describe(...), ...全フィールドを optional + describe })` を `inputSchema` に渡し、ハンドラ先頭で既存の operation 別スキーマに `safeParse` して厳格化」。生シェイプ直渡しでも可。**トップレベル union を `inputSchema` に渡す現行形は不可**（空広告の原因）。

## スコープ外（follow-up）

- `outputSchema` / `structuredContent` の付与（現状 `toToolSuccess` はテキストのみ。SHOULD 級・別 request）
- ツール `annotations`（`readOnlyHint` 等。multi-operation ツールでは粒度が粗く効果限定）
- Prompts / Resources / Elicitation（OPTIONAL プリミティブ。クライアント対応依存・別 request）

## 受け入れ基準

- [ ] 全 19 ツールについて、登録された tool 定義の `inputSchema`（SDK が広告する JSON Schema）の `properties` が**空でなく** `operation`（有効な全 operation を含む enum）を含むことをテストで固定する。
- [ ] `inquiries` の `budget` が **integer 型**として、`source` が enum として広告されることをテストで固定する（型ズレ再発防止）。
- [ ] 不正な引数（例: `create` で `title` 欠落、`budget` に文字列）が従来どおり拒否され、usecase に到達しないことを behavioral テストで固定する。
- [ ] 既存の全テストが**無変更で green**（挙動不変）。`typecheck` / `lint` / `build` green。
- [ ] `aozu check` exit 0・architecture test green（設計層は不変のまま）。

## 実装上の必須事項（過去レビューの学びの反映）

1. **テストは実行検証（behavioral）で固定する。** ソース文字列照合（`readFile` + `toContain`）で広告スキーマや検証を保証しない。実際に tool を登録し、SDK が生成する inputSchema を取得して assert する。引数検証は実引数を渡して isError／到達有無を assert する。
2. **mock.module の汚染を防ぐ。** バレル（`@/application/usecases` 等）をモックせず個別ファイルをモックし、`import * as` で捕捉して `afterAll` で復元する。
3. **エラーで内部詳細を漏らさない。** 検証失敗メッセージは既存の `extractZodErrors` 経由のフィールド別文言に留め、スタックトレース・DB エラー文を出さない。
4. **19 ツール全てに一貫適用する。** 一部ツールだけ直して残りが空広告のまま、を避ける（受け入れ基準のテストで全ツールを走査する）。

## aozu 影響判定（起票前判定・必須）

**判定: 不要。** 理由:
- **新モジュール(mod)**: なし。既存 `mod-mcp`（責務に「ツール登録」を含む）内の是正。
- **新依存辺(deps)**: なし。既存 import（`zod`・SDK 型・authz・rateLimit・usecases・errors）のみで実装可能。`dependencies.md` の宣言済み依存で足りる。
- **新ドメイン概念(term/ent/inv/act)**: なし。inputSchema 広告はプロトコル配線であり業務概念でない（mod-mcp は「ビジネスロジックを持たない」）。
- **新シーケンス(seq)**: なし。受付→認証→認可→usecase→応答の順序は不変。

よって設計要素の新規追加は不要で、既存 `[[mod-mcp]]` の引用のみ。architecture test は緑のまま維持される。
