# MCP サーバー基盤とコア CRM ツール（引合・案件・顧客）

## Meta

- **type**: new-feature
- **slug**: mcp-server-core
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: MCP という新しいプロトコル adapter の導入。transport 方式・ツール集約方針・Server Action とのパリティ規約は後続の全ツール領域を拘束する設計選択 → true -->

## 背景

clearflow の機能を AI エージェント（MCP クライアント）から使えるようにする。目標は**人間が UI で使える機能のパリティ**であり、領域ごとに段階的にツールを載せる。本 request はその第一弾として、MCP サーバー基盤（エンドポイント・認証・ツール登録・エラー変換）とコア CRM 領域（引合・案件・顧客）のツールを作る。

前提: api-token-foundation（Bearer トークンからユーザー・組織を解決する機構）がマージ済みであること。

## 現状コードの前提

- `src/app/actions/inquiries.ts` / `deals.ts` / `clients.ts` / `dealContacts.ts`: 対象領域の Server Action（人間の書き込み入口）。引合 5・案件 5・顧客 6・案件担当者 2 操作。
- Server Action は入力の Zod 検証・セッション認証・認可・レート制限を行い、ユースケースに委譲する（ビジネスロジックを持たない）。
- `src/application/usecases/`: 1 業務操作 1 関数。トランザクション・監査記録・イベント発行はここで完結する。
- `src/domain/authorization.ts`: `canPerform` によるロール × 操作の一元判定。
- `src/app/api/`: 既存 API は cron / エクスポート / 認証コールバックのみ。MCP エンドポイントは存在しない。
- Next.js 16 の route handler の制約・ストリーミング対応は `node_modules/next/dist/docs/` に正本がある（本リポジトリの Next.js は破壊的変更を含む — AGENTS.md）。

## 設計要素引用

[[mod-api]], [[mod-action]], [[mod-usecase]], [[mod-authz]], [[mod-auth]], [[mod-repo]], [[mod-model]], [[ent-inquiry]], [[ent-deal]], [[ent-client]], [[ent-client-contact]], [[ent-deal-contact]], [[ent-audit-log]], [[inv-all-tenant-scoped]], [[inv-one-deal-per-inquiry]], [[inv-system-approval-blocks-action]], [[term-tenant-isolation]], [[term-timeline]]

新規要素: `mod-mcp` を design/static に追加する（要件 7）。

## 要件

1. **MCP エンドポイント `/api/mcp`**: MCP Streamable HTTP transport（stateless、セッション ID なし）。`initialize` / `tools/list` / `tools/call` / `ping` に応答する。実装方式（公式 TypeScript SDK の採用か、プロトコル部分の最小実装か）は Next.js 16 route handler の制約（`node_modules/next/dist/docs/` を確認）を踏まえて design で決定し、判断根拠を記録する。
2. **認証**: `Authorization: Bearer cfp_...` を api-token-foundation の解決機構で検証する。無認証・無効トークンは 401。以後の全処理はトークンのユーザーとして実行する。検証はトークン種別に依存しないインターフェース（Bearer 値 → `{ userId, organizationId, role } | 拒否`）として切り、後続の OAuth 2.1 アクセストークン検証を加算的に差し込めるようにする。
3. **パリティ規約（アダプタの核）**: 各ツールは対応する Server Action と**同じユースケース・同じ認可判定（canPerform）・同等の入力検証（Zod スキーマを可能な限り共有）・同じ監査記録**を通す。Server Action と MCP で挙動差・権限差を作らない。ツール専用のビジネスロジックを書かない。
4. **ツール設計**: リソース単位のツール + operation 引数で集約し、ツール総数を抑える（全 85 操作を 1 操作 1 ツールにすると MCP クライアントのコンテキストを圧迫する）。本 request の範囲:
   - `inquiries`: list（フィルタ）/ create / update / update_status / delete。案件化は承認ポリシーに該当すると pending になる（[[inv-system-approval-blocks-action]]）— この結果をツール結果として明示的に表現する
   - `deals`: list（フィルタ）/ get（詳細 + 担当 + タイムライン（[[term-timeline]]の厳選表示））/ create / update / update_phase / delete
   - `clients`: list / get（担当者含む）/ create / update、client_contact の add / update / delete、deal_contact の add / remove
5. **エラー変換**: ユースケースの Result 失敗・認可拒否・検証エラーを MCP ツール結果（isError）に写像する。スタックトレース・内部識別子を漏らさない。
6. **レート制限**: Server Action と同等の既存レート制限機構を MCP 呼び出しにも適用する。
7. **設計 delta**: `mod-mcp`（責務: MCP プロトコルの受付・ツール登録・Bearer 認証・ユースケース委譲。実装: src/app/api/mcp/）を design/static/modules.md に追加し、許可依存を列挙、rules.json を再生成する（architecture test が強制）。

## スコープ外

- 残り領域のツール（接点・タスク・ウォッチ・通知 / 契約・請求・売上 / 承認 / 管理系）— 後続 request で同じパリティ規約に載せる
- MCP resources / prompts（tools のみ）、SSE によるサーバー起点通知
- OAuth 2.1、トークンの権限スコープ

## 受け入れ基準

- [ ] `initialize` → `tools/list` → `tools/call` の一連の JSON-RPC 交換をテストで固定する（プロトコルレベルの統合テスト）
- [ ] 無認証・無効トークンが 401 になることをテストで固定する
- [ ] 権限外の操作（例: member による delete）が canPerform どおり拒否されることをテストで固定する（Server Action と同一の判定結果）
- [ ] 引合の案件化が承認ポリシー該当時に pending となり、その旨がツール結果に現れることをテストで固定する
- [ ] 全ツールが他テナントのデータに触れられないことをテストで固定する
- [ ] 書き込みツールの操作が監査ログに記録されることをテストで固定する
- [ ] `typecheck && test` が green（既存テスト無変更で green）・`aozu check` exit 0・architecture test green（mod-mcp 宣言込み）

## architect 評価済みの設計判断

- **リソース単位ツール + operation 引数を採用、1 操作 1 ツールは却下**: パリティ目標では最終的に 80+ 操作になる。ツール数がクライアントのコンテキストを圧迫し、選択精度も落ちる。リソース単位（inquiries / deals / clients …）に operation を持たせ、ツール数を領域あたり 1〜3 に抑える。
- **usecase 共有のアダプタ方式を採用、Server Action の直接再利用は却下**: Server Action はセッション認証（Cookie）前提で Bearer 認証と両立しない。ユースケース・認可・検証スキーマを共有する薄いアダプタを MCP 側に置き、挙動パリティを構造で担保する。
- **stateless transport を採用**: ツール呼び出しのみの用途にセッション状態は不要。スケールと実装単純性を優先し、サーバー起点通知が必要になったら別途拡張する。
