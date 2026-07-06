# ADR-026: MCP サーバー基盤 — プロトコルアダプタ方式とツール集約設計

- **Status**: accepted
- **Date**: 2026-07-07
- **Change**: mcp-server-core
- **Deciders**: architect

---

## Context

clearflow を AI エージェント（MCP クライアント）から操作可能にする第一弾として、MCP（Model Context Protocol）サーバー基盤を導入する。目標は「人間が UI で使える機能のパリティ」であり、後続 request で領域ごとにツールを追加していく。

本 ADR が対象とする設計判断は、後続の全ツール領域を拘束する基盤的な選択である:
- プロトコル transport 方式の選択
- ツール集約の粒度
- Server Action とのパリティを構造的に担保する方式
- 認証インターフェースの抽象化
- エラー変換の統一ルール

前提: api-token-foundation（ADR-025）により `resolveBearer(authorizationHeader) → { userId, organizationId, role } | null` が利用可能な状態になっている。

---

## Decisions

### D1: MCP SDK の `WebStandardStreamableHTTPServerTransport` を採用

**Decision**: `@modelcontextprotocol/sdk` v1.29.0 の `WebStandardStreamableHTTPServerTransport` を使用して `/api/mcp` エンドポイントを実装する。プロトコル最小実装（JSON-RPC 手書き）は採用しない。SDK を `package.json` の `dependencies` に明示的に追加する（従来は devDependency の推移的依存として存在しており、本番ビルドでの可用性が保証されていなかった）。

**Rationale**:
- Next.js 16 の route handler は Web Standard `Request` / `Response` を受け渡す。SDK の `StreamableHTTPServerTransport`（Node.js `http.IncomingMessage` 前提）は使えない
- `WebStandardStreamableHTTPServerTransport` は `Request` → `Response` インターフェースで動作し、Next.js route handler と直接嵌合する
- JSON-RPC パース・バリデーション・初期化ハンドシェイク・プロトコルバージョン交渉を SDK に委譲でき、手書き実装に比べてプロトコル準拠の信頼性が高い
- MCP 仕様の変更追従コストを SDK 更新で吸収できる

#### Alternative 1: プロトコル最小実装（JSON-RPC 手書き）

| | |
|---|---|
| **Pros** | 外部依存が増えない。transport 層の実装が完全に管理下に置かれる |
| **Cons** | 初期化ハンドシェイク・プロトコルバージョン交渉・メソッド分岐を自前で書く必要がある。MCP 仕様変更時の追従コストが高い |
| **Why not** | SDK の `WebStandardStreamableHTTPServerTransport` が Next.js 16 と直接嵌合するため、プロトコル実装の重複が不要 |

#### Alternative 2: SDK の `StreamableHTTPServerTransport`（Node.js 版）

| | |
|---|---|
| **Pros** | 同一 SDK の別クラス。切り替えが容易 |
| **Cons** | Node.js の `http.IncomingMessage` / `http.ServerResponse` を要求する。Next.js 16 route handler では使えない |
| **Why not** | Next.js 16 の route handler 制約と非互換 |

---

### D2: stateless transport（セッション ID なし）

**Decision**: `sessionIdGenerator: undefined` を指定し、セッション状態を持たない stateless transport を採用する。

**Rationale**:
- 本スコープはツール呼び出しのみで、1 リクエスト完結の操作のみを扱う
- サーバーからのプッシュ通知やストリーミング結果は不要
- セッション管理を省くことで route handler のステートレス性と合致し、スケール特性が単純になる
- SSE によるサーバー起点通知が必要になった場合は別途 ADR を立て、stateful transport への移行または並存を評価する

#### Alternative: stateful transport

| | |
|---|---|
| **Pros** | サーバー起点イベント（SSE）でツール完了通知等が可能 |
| **Cons** | セッション状態を in-memory に保持するため、複数インスタンス構成で一貫性確保が必要になる。現スコープにはオーバーキル |
| **Why not** | ツール呼び出しのみの用途でセッション管理は不要。将来の需要が立ったときに追補する |

---

### D3: リソース単位ツール + `operation` 引数で集約

**Decision**: 1 操作 1 ツールではなく、リソース単位でツールを集約し、`operation` 引数（discriminated union）で操作を分岐する。ツール数を領域あたり 1〜3 に抑える。

本変更のツール構成（全 3 ツール・20 操作）:
- `inquiries`（operation: list / create / update / update_status / delete → 5 操作）
- `deals`（operation: list / get / create / update / update_phase / delete → 6 操作）
- `clients`（operation: list / get / create / update / add_contact / update_contact / delete_contact / add_deal_contact / remove_deal_contact → 9 操作）

`clients` ツールに顧客担当者（client_contact）と案件担当者（deal_contact）の操作を統合する理由: これらは顧客ドメインの従属エンティティで、単独のツールにするほどの独立性がない。

**Rationale**:
- パリティ目標では最終的に 80+ 操作になる。1 操作 1 ツールではクライアントの `tools/list` コンテキストを圧迫し、ツール選択精度が落ちる
- リソース単位に `operation` を持たせることで、クライアントが受け取るツール数を最小限に抑えつつ、操作の意味的まとまりを保てる
- `operation` が 10 を超える領域が出た場合はサブリソースへの分割を検討する（現在の最大は clients の 9 操作）

#### Alternative 1: 1 操作 1 ツール

| | |
|---|---|
| **Pros** | 各ツールの inputSchema が単純。ツール名から操作を直感的に把握できる |
| **Cons** | 20 本のツール（本変更分のみ）。80+ 操作をすべてツール化すると MCP クライアントのコンテキストを圧迫し、ツール選択精度が落ちる |
| **Why not** | スケール上の問題が確実に顕在化する設計 |

#### Alternative 2: ドメイン全体を 1 ツールにまとめる

| | |
|---|---|
| **Pros** | ツール数が最少（1 本）。クライアントの選択負荷ゼロ |
| **Cons** | inputSchema が肥大化し、LLM が必要なフィールドを推論する負荷が増大する |
| **Why not** | スキーマ複雑化によって LLM の呼び出し精度が低下する |

---

### D4: usecase 共有のアダプタ方式を採用、Server Action の直接再利用を却下

**Decision**: MCP ツールハンドラは Server Action を呼ばず、Server Action と同じユースケース・同じ認可（`canPerform`）・同等の入力検証（Zod スキーマ）・同じ監査記録を直接使う薄いアダプタとして実装する。

アダプタの責務:
1. `resolveBearer` で `{ userId, organizationId, role }` を取得（route handler レベル）
2. operation の Zod 検証
3. `canPerform` による認可チェック
4. usecase 呼び出し
5. Result → MCP ツール結果への変換

Server Action と共通するのは 2–4。認証方式（1: Cookie vs Bearer）と結果の表現（5: `revalidatePath` vs MCP ToolResult）だけが異なる。

これを**パリティ規約**として定める: 各ツールは対応する操作と同じユースケース・同じ認可判定・同等の検証・同じ監査記録を通す。MCP ツール固有のビジネスロジックを書いてはならない。

**Rationale**:
- Server Action は Cookie セッション認証（`auth()` 呼び出し）に依存しており、Bearer 認証を使う MCP 層から直接呼べない
- ユースケース・認可・検証を共有することで、Server Action と MCP の挙動差・権限差が構造的に生じない
- アダプタが薄いため、ユースケース側の変更が自動的に両方の入口に反映される

#### Alternative: Server Action の直接再利用

| | |
|---|---|
| **Pros** | コードの重複なし。Server Action をそのまま呼ぶだけ |
| **Cons** | Server Action は `auth()`（Cookie セッション）を呼ぶため、Bearer 認証環境では動作しない。Mock しようとすると Server Action の内部実装に依存することになる |
| **Why not** | 認証機構の根本的な非互換により再利用不可能 |

---

### D5: `enableJsonResponse: true` で JSON レスポンスを使用

**Decision**: `WebStandardStreamableHTTPServerTransport` を `enableJsonResponse: true` で生成し、JSON レスポンスを返す。

**Rationale**:
- stateless モードでは 1 リクエスト 1 レスポンスで完結するため、SSE ストリーミングのメリットがない
- JSON レスポンスにより HTTP クライアント・テストでのデバッグが容易になる
- 将来 SSE が必要になった場合（サーバー起点通知等）は、stateful transport への切り替えと同時に `enableJsonResponse` を無効にする

#### Alternative: SSE ストリーミングレスポンス（`enableJsonResponse: false`）

| | |
|---|---|
| **Pros** | MCP の進行中の処理をストリームで段階的にクライアントへ送信できる。長時間ツール呼び出しの中間状態を通知できる |
| **Cons** | stateless・1 リクエスト完結の用途では SSE ストリーミングに意味がない。HTTP クライアント・テストでのデバッグが JSON に比べて難しい |
| **Why not** | 本スコープのツール呼び出しはすべて同期完結。SSE が必要な用途（サーバー起点通知・長時間処理）は D2 の stateful transport 変更とセットで対応する |

---

### D6: 認証インターフェースの抽象化（後続 OAuth 2.1 対応）

**Decision**: MCP route handler では Bearer 値 → `{ userId, organizationId, role } | null` を返すインターフェースとして `resolveBearer` を呼ぶ。OAuth 2.1 アクセストークンへの対応は、このインターフェースに加算的に差し込む形で実現する。MCP 層のコードは変更不要。

route handler での認証処理:
```
Authorization ヘッダ取得 → resolveBearer() → null なら 401 → 成功なら authInfo.extra に userId/organizationId/role を設定
```

後続の OAuth 2.1 対応時は `resolveBearer` の前段または内部に OAuth トークンの解決パスを追加するだけで済む。

**Rationale**:
- 現在は PAT（`cfp_...`）のみだが、MCP の HTTP 認証標準は OAuth 2.1 であり後続で追補される可能性が高い
- インターフェースを抽象化することで、MCP 層の変更なしに認証方式を追加できる
- 各ツールハンドラは `authInfo.extra.userId` 等を参照するだけで認証方式を意識しない

---

### D7: エラー変換の統一ルールと `reason` の安全性定義

**Decision**: ユースケース・認可・検証・予期しない例外を以下のルールで MCP ツール結果に変換する。スタックトレース・内部識別子・DB エラー詳細はクライアントに漏らさない。

| 起因 | MCP ツール結果 |
|---|---|
| Zod 検証失敗 | `{ isError: true, content: [{ type: "text", text: フィールド別エラーメッセージ }] }` |
| `canPerform` 拒否 | `{ isError: true, content: [{ type: "text", text: "権限がありません" }] }` |
| usecase Result `{ ok: false, reason }` | `{ isError: true, content: [{ type: "text", text: reason }] }` |
| レート制限超過 | `{ isError: true, content: [{ type: "text", text: "レート制限超過" }] }` |
| 予期しない例外 | `{ isError: true, content: [{ type: "text", text: "内部エラーが発生しました" }] }` |
| 成功 | `{ content: [{ type: "text", text: JSON.stringify(結果) }] }` |

**`reason` の安全性定義（実装者への規律）**: ユースケースの `{ ok: false, reason }` の `reason` は、エンドユーザーに見せることを意図した文字列でなければならない。以下を `reason` に含めてはならない:
- ORM / DB 制約エラーメッセージ（生の `PostgresError.message` 等）
- 内部エンティティ ID、DB 行 ID、スキーマ名
- スタックトレース断片、ファイルパス
- 外部から受け取った入力値をそのまま埋め込んだ文字列

ORM 例外をキャッチした場合は汎用メッセージ（例: `"更新に失敗しました"`）に変換してから `reason` に設定する。

**Rationale**:
- MCP ツール結果は AI エージェントを経由してエンドユーザーに届く。内部情報の漏洩はセキュリティリスク
- `reason` を直接クライアントに返す設計を安全にするため、ユースケース実装者への規律として明文化する
- `handleToolError` ユーティリティが catch ブロックを統一的に処理し、予期しない例外からスタックトレースが漏れるのを防ぐ

---

### D8: McpServer シングルトン + per-request transport 生成

**Decision**: `McpServer` インスタンスとツール登録はモジュールレベルでシングルトン化する。`WebStandardStreamableHTTPServerTransport` はリクエストごとに生成・使用・破棄する。

**Rationale**:
- Next.js route handler はリクエストごとに関数が呼ばれる。transport をリクエストスコープにすることでステートレス性を維持できる
- stateless モードでは transport がセッション状態を保持しないため、per-request 生成のメモリコストは無視できる
- `McpServer` のツール登録をモジュールレベルで 1 回行うことで、登録コストをリクエスト処理から切り離す

**留意事項**: `McpServer.connect()` がイベントリスナーを内部登録する場合、リクエストごとにリスナーが蓄積するリスクがある（SDK 実装依存）。production 投入前に連続リクエストのスモークテストでリスナー数が増加しないことを確認すること。

#### Alternative: McpServer もリクエストごとに生成（ツール登録をリクエストスコープ）

| | |
|---|---|
| **Pros** | McpServer のライフサイクルが完全にリクエストスコープに収まり、リスナー蓄積の懸念がない。Next.js のエッジランタイムとの相性が良い |
| **Cons** | リクエストごとにツール登録（全操作の Zod スキーマ解析を含む）を実行するため、初期化コストがリクエスト処理時間に加算される。ツール数が増えるほどオーバーヘッドが線形に増大する |
| **Why not** | ツール登録はモジュール読み込み時に 1 回実行するのが自然。transport のみを per-request にすれば stateless 性は保てる。登録コストを毎リクエストに払う必要がない |

---

### D9: `mod-mcp` モジュールの定義

**Decision**: `design/static/modules.md` に `mod-mcp` を追加し、architecture test の依存一致強制の対象とする。

- **責務**: MCP プロトコルの受付・ツール登録・Bearer 認証解決・認可チェック・ユースケース委譲
- **実装パス**: `src/app/api/mcp/`
- **許可依存**: `mod-usecase` / `mod-auth` / `mod-authz` / `mod-model` / `mod-webhook` / `mod-repo` / `mod-appservice` / `mod-lib`

この依存パターンは既存の `mod-action`（Server Action）とほぼ同じ。MCP は Server Action と同じ「入口レイヤー」の役割を担うため、同等の依存が必要になる。

---

## Consequences

### Positive

- AI エージェントが clearflow の CRM 機能（引合・案件・顧客）を Bearer トークンで操作できる基盤が整った
- パリティ規約（同一ユースケース・同一認可・同等検証・同一監査）が構造的に担保され、Server Action と MCP の挙動差が生じない
- リソース単位ツール集約により、80+ 操作のパリティを達成しても MCP クライアントのコンテキスト圧迫を抑えられる
- D6 の認証抽象化により、OAuth 2.1 追補時に MCP 層のコードを変更しなくてよい
- 顧客更新の監査漏れ（既存の潜在課題）を `updateClient` / `updateClientContact` usecase 新設で解消し、Server Action 経路でも同時に修正した

### Negative / Trade-offs

- リソース単位ツールの inputSchema は discriminated union が深くなると複雑化する。`clients` ツールの 9 操作が現時点の上限であり、10 を超える領域ではサブリソース分割を検討する
- MCP 用の Zod スキーマを Server Action のスキーマと別定義する（FormData coerce 前提の共有が困難なため）。フィールド名・型制約を 1:1 で対応させることで乖離を管理する
- Zod v4 と MCP SDK の `registerTool` 互換性は、ツール実装の最初の 1 ツールで確認している。問題が生じた場合は zod-compat 経由に切り替える

### Constraints for future changes

- **後続の MCP ツール領域を追加するとき**: 必ず本 ADR のパリティ規約（D4）に従い、ユースケース・`canPerform`・Zod 検証・監査記録を Server Action と共有すること。MCP ツール固有のビジネスロジックを書いてはならない
- **新しいツールのエラー変換を実装するとき**: D7 の変換ルールと `reason` の安全性定義に従うこと。ORM 例外を catch した場合は汎用メッセージに変換してから `reason` に設定すること
- **ツールを 1 操作 1 ツールに分割したいとき**: D3 の設計原則に反する。operation 数が 10 を超える領域でサブリソースへの分割が必要な場合は、改めて設計判断を記録すること
- **OAuth 2.1 を追加するとき**: D6 の方針に従い、`resolveBearer` を拡張または前段に OAuth 解決パスを追加すること。MCP 層（route handler・ツールハンドラ）のコードを変更してはならない
- **stateful transport（SSE）が必要になったとき**: D2 の設計判断を覆す変更となる。改めて ADR を更新し、セッション状態管理の方式・マルチインスタンス対応を設計すること
- **McpServer.connect() のリスナー蓄積問題**: D8 の留意事項として記録済み。production 投入前にスモークテストで確認すること

---

## References

- `specrunner/changes/mcp-server-core/request.md` — 要件定義
- `specrunner/changes/mcp-server-core/design.md` — 詳細設計（D1〜D9）
- `specrunner/changes/mcp-server-core/spec.md` — ビヘイビア仕様
- `specrunner/changes/mcp-server-core/review-feedback-001.md` — コードレビュー所見 iter 1（score 5.85）
- `specrunner/changes/mcp-server-core/review-feedback-002.md` — コードレビュー所見 iter 2（score 8.65、approved）
- `specrunner/adr/ADR-025-api-token-bearer-auth.md` — Bearer 認証基盤（前提）
- `specrunner/adr/ADR-012-authorization-centralization.md` — canPerform による認可集中管理
- `specrunner/adr/ADR-020-audit-action-type-catalog.md` — AuditAction カタログ
- `src/app/api/mcp/route.ts` — MCP エンドポイント（transport・認証）
- `src/app/api/mcp/errors.ts` — エラー変換ユーティリティ
- `src/app/api/mcp/tools/inquiries.ts` — inquiries ツールハンドラ
- `src/app/api/mcp/tools/deals.ts` — deals ツールハンドラ
- `src/app/api/mcp/tools/clients.ts` — clients ツールハンドラ
- `src/application/usecases/updateClient.ts` — 顧客更新ユースケース（新設）
- `src/application/usecases/updateClientContact.ts` — 顧客担当者更新ユースケース（新設）
- `design/static/modules.md` — mod-mcp モジュール定義追加
- `design/rules.json` — architecture test 依存ルール（mod-mcp 追加）
