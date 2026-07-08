# Design: MCP ツール 管理系（組織・ユーザー・Webhook・監査ログ）

## Context

MCP server-core（#158）で確立した「パリティ規約」に従い、Server Actions 表面の残りを MCP ツールとして提供する最終弾。対象は組織設定・ユーザー管理・Webhook 管理・監査ログ検索の 4 領域。

現状の MCP ツール数は 15（inquiries, deals, clients, interactions, tasks, watches, notifications, contracts, invoices, revenue, revenue_targets, approval_requests, delegations, approval_templates, approval_policies）。本 change で 4 ツールを追加し、計 19 ツールになる。

管理系操作は大半が admin ロール限定であり、canPerform の既存行列がそのまま適用される。ユースケース層は全操作について既に存在するため、新規ユースケースの作成は不要。MCP ツールハンドラ層の追加とテストが主体となる。

**前提**:
- MCP server-core がマージ済み（route.ts, errors.ts, ツール集約方針が確立済み）
- 認証は Bearer PAT → resolveBearer → authInfo.extra（userId, organizationId, role）の既存経路
- organizationId はツール引数から受け取らず、authInfo.extra から取得（テナント分離の原則）

## Goals / Non-Goals

**Goals**:

1. `organization` ツール（get / update）を追加し route.ts に登録する
2. `users` ツール（list / create / update_role / deactivate / reactivate）を追加し route.ts に登録する
3. `webhooks` ツール（list / create / delete / toggle / list_deliveries / retry_delivery）を追加し route.ts に登録する
4. `audit_logs` ツール（search：読み取り専用）を追加し route.ts に登録する
5. 全ツールの認可・テナント分離・監査記録・シークレット秘匿を実行検証テストで固定する
6. ツール登録テスト（mcpToolsRegistration.test.ts）を 15 → 19 に更新する
7. README に MCP で可能な操作の全体像と除外一覧を記す

**Non-Goals**:

- super-admin のプラットフォーム操作（platform.ts の provisionOrganization / listAllOrganizations）
- パスワード変更・login のツール化（資格情報管理は UI 専用）
- 監査ログの書き込み・改ざん検知
- 新規ユースケースの作成（全 usecase は既存）
- 新規 DB マイグレーション

## Decisions

### D1: ツール名は Server Actions のエンティティ名に揃える

ツール名: `organization`, `users`, `webhooks`, `audit_logs`

**Rationale**: 既存ツール命名規則（`clients`, `contracts`, `invoices` 等）に倣い、エンティティ複数形を採用する。`organization` のみ単数形（対象が常に自組織 1 件のため）。`audit_logs` はスネークケース維持（`revenue_targets`, `approval_requests` と同一方針）。

**Alternatives considered**: `admin` という 1 ツールに全操作を集約する案 → 操作数が多すぎ（15+）、discriminatedUnion のスキーマが巨大になり LLM にとって不親切。既存パターン（エンティティ単位）を踏襲する。

### D2: audit_logs は読み取り専用（search 1 操作のみ）

operation 値は `search` のみ。CSV エクスポート API の複製ではなく、listAuditLogs usecase を共有し、構造化 JSON で返す。

**Rationale**: CSV 生成はファイル応答の問題を持ち込む（MCP レスポンスはテキスト/JSON 前提）。構造化データで返せば LLM 側で集計・フィルタが容易。audit_logs への書き込み操作は inv-audit-log-append-only に違反するため提供しない。

**Alternatives considered**: CSV 文字列をそのまま返す案 → パース不要で既存 export と同一だが、エスケープ処理を二重に持つことになり、構造化データの優位性に劣る。

### D3: Webhook シークレットの表示方針

- `create` 操作のレスポンスでのみフルシークレットを返す（PAT と同じ「一度だけ表示」原則）
- `list` 操作では secret フィールドを除外する（マスクも返さない）

**Rationale**: Server Actions の listWebhookEndpointsAction は `ep.secret.slice(0, 8) + "..."` でマスクしているが、MCP ではマスク済み文字列を返しても用途がない。シークレットフィールド自体を除外する方が安全かつ明確。

**Alternatives considered**: マスク済み文字列を返す案 → LLM がマスク文字列を本物のシークレットと誤認する可能性があり、セキュリティ上の混乱を避ける。

### D4: webhooks の URL バリデーションは Server Actions 既存ロジックを関数抽出して共有する

`validateWebhookUrl` は現在 `src/app/actions/webhooks.ts` 内にクロージャとして存在する。MCP ツール側でも同一バリデーション（HTTPS 必須・プライベート IP 拒否）を適用する必要がある。

**Rationale**: バリデーションロジックの重複は乖離リスクを生む。共有関数化する。

**Alternatives considered**: (a) ツールハンドラ内に複製する → 乖離リスク、(b) usecase 層に移動する → URL バリデーションはプレゼンテーション層の責務であり usecase には不適。共有ユーティリティとして `src/domain/services/webhookUrlValidator.ts` に抽出する。

### D5: users の create 操作でパスワードをツール引数として受け取る

Server Actions と同様、初期パスワードは作成時にのみ設定する。MCP 経由でのパスワード変更は提供しない。

**Rationale**: ユーザー作成時の初期パスワード設定は管理者の業務要件。パスワード変更は本人操作であり UI 専用のまま。

### D6: ハンドラのレート制限は Server Actions と同一キーを使用する

webhooks の書き込み操作は `webhookManage` レート制限を使用する。users / organization の書き込み操作は `createRequest` レート制限を使用する。audit_logs の search は `search` レート制限を使用する。

**Rationale**: MCP と Server Actions で同一ユーザーのレート制限を共有し、一方から他方への迂回を防ぐ。キー接頭辞 `mcp:` で MCP 経由を区別する（既存パターン）。

### D7: テストは全て実行検証（behavioral）で固定する

mcp-server-core の学び（#158 レビュー）に従い、`readFile` + `toContain` によるソース走査は使わない。`mock.module` で依存を差し替えてツールハンドラを実際に実行し、結果・拒否・監査呼び出しを assert する。

テストファイル構成:
- `mcpOrganization.dynamic.test.ts` — organization ツールの認可・テナント分離・監査
- `mcpUsers.dynamic.test.ts` — users ツールの認可・自己ロックアウト保護・監査
- `mcpWebhooks.dynamic.test.ts` — webhooks ツールの認可・シークレット秘匿・監査
- `mcpAuditLogs.dynamic.test.ts` — audit_logs ツールの認可・テナント分離

## Risks / Trade-offs

[Risk] webhookUrlValidator の抽出で Server Actions 側の import パスが変わる → **Mitigation**: Server Actions のインポート元を更新し、既存テストが green であることを確認する。

[Risk] users の create でパスワードがツール引数に平文で渡される → **Mitigation**: MCP 通信は Bearer 認証済みの HTTPS 経路でのみ使用される前提。パスワードハッシュは usecase 層（createUser）で行われるため、ツールハンドラは平文を保持しない。監査ログにもパスワードは記録されない（createUser の metadata にパスワードは含まれない）。

[Risk] ツール数 19 への増加で tools/list の応答サイズが増える → **Mitigation**: 各ツールの description は簡潔に保ち、inputSchema は discriminatedUnion で operation ごとの引数を明示する。

## Open Questions

なし。設計判断は全て既存パリティ規約の適用であり、新規の判断は D2（audit_logs 読み取り専用）のみ。これは architect 評価済み。
