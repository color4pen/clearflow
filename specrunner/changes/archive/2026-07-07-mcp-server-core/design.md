# Design: MCP サーバー基盤とコア CRM ツール（引合・案件・顧客）

## Context

clearflow を AI エージェント（MCP クライアント）から操作可能にする第一弾。人間が UI 経由で使う Server Action と同じユースケース・認可・検証を通す薄いアダプタ層を MCP 側に設け、挙動パリティを構造的に担保する。

現状:
- Server Action（`src/app/actions/`）が書き込み入口。Cookie セッション認証 → `canPerform` → usecase への委譲。
- `src/application/usecases/` に 1 業務操作 1 関数。トランザクション・監査・イベント発行はここで完結。
- `src/infrastructure/apiTokenResolver.ts`（api-token-foundation）が `Bearer cfp_...` → `{ userId, organizationId, role }` の解決を提供済み。
- `@modelcontextprotocol/sdk` v1.29.0 が devDependency に存在し、`WebStandardStreamableHTTPServerTransport`（Web Standard API ベース）を提供。
- Next.js 16 の route handler は Web Standard `Request` / `Response` を受け渡す。

制約:
- Next.js 16 の route handler 仕様は `node_modules/next/dist/docs/` が正本（AGENTS.md）。
- architecture test が `design/rules.json` と実装の依存一致を強制する。新モジュール `mod-mcp` の宣言と rules 再生成が必須。
- Zod v4（プロジェクトは `zod ^4.4.3`）。MCP SDK は zod-compat で v3/v4 両対応。

## Goals / Non-Goals

**Goals**:
- MCP Streamable HTTP（stateless）エンドポイント `/api/mcp` の確立
- Bearer トークン認証（`resolveBearer`）の MCP 層への統合。トークン種別に依存しないインターフェース設計
- コア CRM 領域（引合・案件・顧客・顧客担当者・案件担当者）の MCP ツール提供
- Server Action とのパリティ（同一ユースケース・同一認可・同等検証・同一監査）の構造的担保
- `mod-mcp` モジュール宣言と architecture test 対応

**Non-Goals**:
- 残り領域のツール（接点・タスク・ウォッチ・通知 / 契約・請求・売上 / 承認 / 管理系）
- MCP resources / prompts（tools のみ）
- SSE によるサーバー起点通知
- OAuth 2.1、トークンの権限スコープ

## Decisions

### D1: MCP SDK（`@modelcontextprotocol/sdk`）の `WebStandardStreamableHTTPServerTransport` を採用

**Rationale**: Next.js 16 の route handler は Web Standard `Request` → `Response` を基盤とし、Node.js の `http.IncomingMessage` を提供しない。SDK の `StreamableHTTPServerTransport`（Node.js http 前提）は直接使えない。`WebStandardStreamableHTTPServerTransport` は `Request` → `Response` インターフェースで動作し、Next.js route handler と直接嵌合する。プロトコルレベルの JSON-RPC パース・バリデーション・エラー応答を SDK に委譲でき、手書きの最小実装に比べてプロトコル準拠の信頼性が高い。

**Alternatives considered**:
- プロトコル最小実装（JSON-RPC の手書き）: transport 層がシンプルにはなるが、初期化ハンドシェイク・プロトコルバージョン交渉・メソッド分岐を自前で書く必要がある。MCP 仕様の変更追従コストが高い。
- SDK の `StreamableHTTPServerTransport`（Node.js 版）: Node.js `http.IncomingMessage` / `http.ServerResponse` を要求する。Next.js 16 route handler では使えない。

### D2: stateless transport（セッション ID なし）

**Rationale**: 本 request のスコープはツール呼び出しのみ。ツール呼び出しは 1 リクエスト完結で、サーバーからのプッシュ通知やストリーミング結果は不要。セッション管理を省くことでスケール特性が単純になり、route handler のステートレス性と合致する。

`sessionIdGenerator: undefined` で WebStandardStreamableHTTPServerTransport を生成する。

**Alternatives considered**:
- stateful transport: セッション状態を in-memory に保持。複数インスタンスでの一貫性確保が必要になる。現スコープにはオーバーキル。

### D3: リソース単位ツール + `operation` 引数で集約

**Rationale**: パリティ目標では最終的に 80+ 操作になる。1 操作 1 ツールではクライアントのコンテキストを圧迫し、ツール選択精度が落ちる。リソース単位に `operation` discriminated union を持たせ、ツール数を領域あたり 1〜3 に抑える。

本 request のツール構成:
- `inquiries`（operation: list / create / update / update_status / delete → 5 操作）
- `deals`（operation: list / get / create / update / update_phase / delete → 6 操作）
- `clients`（operation: list / get / create / update / add_contact / update_contact / delete_contact / add_deal_contact / remove_deal_contact → 9 操作）

合計 3 ツール・20 操作。クライアントが `tools/list` で受け取るツール数が 3 に収まる。

`clients` ツールに顧客担当者（client_contact）と案件担当者（deal_contact）の操作を統合する理由: これらは顧客ドメインの従属エンティティであり、単独のツールにするほどの独立性がない。

**Alternatives considered**:
- 1 操作 1 ツール: ツール数 20 本。コンテキスト圧迫。
- ドメイン全体を 1 ツールにまとめる: 入力スキーマが肥大化し、LLM の推論負荷が増す。

### D4: usecase 共有のアダプタ方式

**Rationale**: Server Action は Cookie セッション認証（`auth()`）に依存しており、Bearer 認証を使う MCP 層から直接再利用できない。認証解決後の usecase 呼び出し・`canPerform` 認可・Zod 検証スキーマを共有する薄いアダプタを MCP ツールハンドラとして実装する。

アダプタの責務:
1. Bearer → `resolveBearer` で `{ userId, organizationId, role }` を取得（route handler レベル）
2. operation の Zod 検証
3. `canPerform` による認可チェック
4. usecase 呼び出し
5. Result → MCP ツール結果への変換

Server Action と共通するのは 2–4 の組み合わせ。認証方式（1）と結果の表現（5: revalidatePath vs MCP ToolResult）だけが異なる。

### D5: `enableJsonResponse: true` で JSON レスポンスを使用

**Rationale**: stateless モードでは SSE ストリーミングのメリットがない（1 リクエスト 1 レスポンスで完結する）。`enableJsonResponse: true` を指定して JSON レスポンスを返す。これにより HTTP クライアントでのデバッグ・テストが容易になる。

### D6: 認証インターフェースの抽象化

**Rationale**: 現在は `resolveBearer`（PAT）のみだが、後続で OAuth 2.1 アクセストークンが加わる。route handler レベルで Bearer 値 → `{ userId, organizationId, role } | null` を返すインターフェースとして `resolveBearer` を呼び出し、将来的に OAuth トークン解決を加算的に差し込めるようにする。`resolveBearer` は既にこのインターフェースを満たしている。

MCP route handler 内での認証処理:
```
Authorization ヘッダ取得 → resolveBearer() → null なら 401 → 成功なら context に userId/organizationId/role を設定
```

後続の OAuth 対応時は、`resolveBearer` の前段または内部に OAuth トークンの解決パスを追加するだけで済む。MCP 層のコードは変更不要。

### D7: エラー変換の統一ルール

MCP ツール結果への変換ルール:
| 起因 | MCP ツール結果 |
|---|---|
| Zod 検証失敗 | `{ isError: true, content: [{ type: "text", text: フィールド別エラーメッセージ }] }` |
| `canPerform` 拒否 | `{ isError: true, content: [{ type: "text", text: "権限がありません" }] }` |
| usecase Result `{ ok: false, reason }` | `{ isError: true, content: [{ type: "text", text: reason }] }` |
| レート制限超過 | `{ isError: true, content: [{ type: "text", text: "レート制限超過" }] }` |
| 成功 | `{ content: [{ type: "text", text: JSON.stringify(結果) }] }` |

スタックトレース・内部 ID は含めない。

**安全な `reason` の定義**: `usecase Result { ok: false, reason }` の `reason` は、ユースケースが実装者の意図でユーザーへ返すことを明示的に定めたメッセージ文字列でなければならない。以下を `reason` に含めてはならない:
- ORM / DB 制約エラーメッセージ（生の `PostgresError.message` 等）
- 内部エンティティ ID、DB 行 ID、スキーマ名
- スタックトレース断片、ファイルパス
- 外部から受け取った入力値をそのまま埋め込んだ文字列

ユースケース実装者は `reason` を「エンドユーザーに見せても問題ないメッセージ」として設計する責任を負う。ORM 例外をキャッチした場合は汎用メッセージ（例: `"更新に失敗しました"`）に変換してから `reason` に設定する。これにより D7 の `reason` 直接クライアント返却が安全となる。

### D8: MCP ツールハンドラでの per-request transport 生成

**Rationale**: Next.js route handler はリクエストごとに関数が呼ばれる。stateless モードでは transport はリクエストスコープで生成・使用・破棄する。`McpServer` インスタンスとツール登録はモジュールレベルでシングルトン化し、transport のみリクエストごとに生成して `handleRequest` を呼ぶ。

### D9: `mod-mcp` モジュールの定義

`mod-mcp` を `design/static/modules.md` に追加する。

- 責務: MCP プロトコルの受付・ツール登録・Bearer 認証解決・認可チェック・ユースケース委譲。
- 実装パス: `src/app/api/mcp/`
- 許可依存:
  - `mod-mcp` → `mod-usecase`（ユースケース呼び出し）
  - `mod-mcp` → `mod-auth`（`resolveBearer` による認証）
  - `mod-mcp` → `mod-authz`（`canPerform` による認可）
  - `mod-mcp` → `mod-model`（ドメイン型の参照）
  - `mod-mcp` → `mod-webhook`（`checkRateLimit` によるレート制限）
  - `mod-mcp` → `mod-repo`（読み取り系操作の直接呼び出し — `listDealContacts` 等、Server Action と同様）
  - `mod-mcp` → `mod-appservice`（`validatePrimaryUniqueness` 等、Server Action と同様）
  - `mod-mcp` → `mod-lib`（ユーティリティの参照 — `activityConfig` 等）

これは既存の `mod-action` の依存パターンとほぼ同じ。MCP は Server Action と同じ「入口レイヤー」の役割を担うため、同等の依存が必要になる。

## Risks / Trade-offs

[Risk] **Zod v4 と MCP SDK の互換性**: SDK は zod-compat で v3/v4 両対応しているが、`registerTool` の `inputSchema` に Zod v4 の raw shape を渡す場合の動作確認が必要。
→ Mitigation: T-03（ツール実装）の最初の 1 ツールで動作確認し、問題があれば Zod v3 compat 経由に切り替える。

[Risk] **per-request transport の生成オーバーヘッド**: リクエストごとに `WebStandardStreamableHTTPServerTransport` を生成する。
→ Mitigation: transport 自体は軽量オブジェクト（stateless モードではメモリ保持なし）。McpServer のツール登録はモジュールレベルで 1 回。実測で問題が出たら対応する。

[Risk] **operation 引数の discriminated union が深くなるとスキーマが複雑化する**: 1 ツールに 9 操作（clients）を詰めると inputSchema が大きくなる。
→ Mitigation: 現時点では MCP クライアント（LLM）が operation を見て必要なフィールドだけ渡す想定。operation 数が 10 を超える領域が出た場合はサブリソースへの分割を検討する。

[Trade-off] **Server Action の Zod スキーマの直接共有 vs MCP 用スキーマの別定義**: Server Action のスキーマは FormData からの変換前提（`z.coerce.number()` 等）で、MCP の JSON 入力とは相性が悪い箇所がある。MCP 用に「JSON 入力に最適化した」スキーマを別定義し、フィールド名・型制約は Server Action と揃える。
→ スキーマの乖離リスクは、operation ごとに Server Action のフィールドと 1:1 で対応させることで管理する。

## Open Questions

（なし — architect 評価済みの設計判断で主要な選択は決定済み）
