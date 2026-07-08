---
name: mcp-conformance
maxIterations: 3
paths:
  - src/app/api/mcp/**
---

## 目的

MCP 境界に固有の失敗クラスを検出する。汎用 code-review が主眼としない「接続エージェントに対する API contract（name / description / inputSchema）の正しさ」と「MCP 特有の実装上の落とし穴」を、MCP ツールを触るすべての変更で検証する。MCP はエージェントにとって contract がすべてであり、機能が実装されていても contract に表れなければ誤用される。

## 観点

### スキーマ広告（inputSchema）

- `registerTool` の `inputSchema` は SDK が JSON Schema 化できる object 形（生シェイプ or `z.object`）である。**トップレベルの `z.discriminatedUnion` を渡さない**（SDK が空 properties にフォールバックし、クライアントに型情報が一切見えなくなる）。
- `tools/list` で広告される inputSchema の `properties` が非空で、`operation` は有効な全 operation を含む enum、各フィールドが型・enum を伴って公開される。
- 広告 object を緩く（全フィールド optional 等）した場合でも、operation 別の必須制約はハンドラ内で厳格に検証し、失敗時は明確なエラーを早期 return する。

### 契約の明確さ（description / describe）

- ツール description は用途に加え発見性（同義語・意図語・日英併記）を持ち、全ツール同一の定型文だけになっていない（相互に distinct）。
- 各フィールドの `.describe()` に **用途**（何を入れるか）・**形式**（Markdown 可/改行反映・日時形式・UUID 等）・**enum 値の意味**・**必須/任意** が読み取れる。
- 描画・保存が既に対応している形式（Markdown/改行等）は、その旨がフィールド説明に明記されている。

### 部分更新（update 系）

- update 系ツールは未指定引数（undefined）を「変更なし」として**保持**し、既定値（false/null/空）で上書きしない。**null（明示クリア）と undefined（変更なし）を区別**する。
- 配列・サブ構造（例: 参加者の内部/外部リスト）を片方だけ指定したとき、他方を空で上書きしない。

### 認可・テナント分離

- `organizationId` は per-request の authInfo からのみ取得し、**ツール引数から受け取らない**。
- 対応する Server Action と同じ `canPerform` 認可を通す。権限外ロールでの呼び出しは usecase 到達前に拒否される。

### エラー・出力

- ツールエラーの `reason` に例外詳細（DB エラー文・スタックトレース・SQL）を載せない（固定文言またはサニタイズ済みのフィールドメッセージのみ）。

### サーバー構成・堅牢性

- `McpServer` は per-request 生成である（module-level singleton に毎回 `connect` しない＝2 リクエスト目以降の "Already connected" 500 を防ぐ）。
- 書き込み操作にレート制限がある。

### テスト

- behavioral である（実 transport で `tools/list`・`tools/call` を実行し、広告スキーマ・拒否・監査呼び出しを assert する）。ソース文字列照合（readFile + toContain）で代替していない。
- `mock.module` は個別ファイルをモックし（バレルをモックしない）、`afterAll` で復元している。

### 互換性・網羅

- ツール名（`registerTool` の識別子）を変更していない（コネクタの参照を壊す）。
- ドメイン enum（案件フェーズ・各種ステータス等）が増えたとき、MCP 側の該当 enum・終端判定などの分岐が網羅され、silent-drop していない。

### 監査パリティ

- 書き込み操作は対応する Server Action と同等の監査ログを記録する。

## 判定基準

- **approved**: 全観点で違反がない。
- **needs-fix**: 次のいずれかが検出された — 空/貧弱なスキーマ広告、フィールドの用途・形式・enum 意味・必須任意の記載欠落、部分更新でのフィールド破壊、ツール引数由来の organizationId（テナント越境）、Server Action との認可差、エラーへの内部詳細漏洩、module-level singleton サーバー、書き込みのレート制限欠落、文字列照合テスト、ツール名の変更、ドメイン enum 追加時の分岐網羅漏れ。
