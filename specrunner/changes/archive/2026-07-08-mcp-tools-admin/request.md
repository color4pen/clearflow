# MCP ツール: 管理系（組織・ユーザー・Webhook・監査ログ）

## Meta

- **type**: new-feature
- **slug**: mcp-tools-admin
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: mcp-server-core のパリティ規約に従う追加ツール群 → false -->

## 背景

MCP ツール最終弾（パリティ完成）。組織設定・ユーザー管理・Webhook 管理・監査ログ検索という管理者業務を AI エージェントから行えるようにする。これらは admin ロール前提の操作が大半であり、トークン = ユーザー本人の権限という既存モデルのまま、canPerform が自然にアクセスを制限する（member のトークンでは実行できない）。

前提: mcp-server-core がマージ済み。

## 現状コードの前提

- `src/app/actions/organization.ts`: update / get の 2 操作（組織名の編集）。
- `src/app/actions/users.ts`: create / list / updateRole / deactivate / reactivate の 5 操作。
- `src/app/actions/webhooks.ts`: listWebhookEndpoints / create / delete / toggle / listWebhookDeliveries / retryWebhookDelivery の 6 操作。
- `src/app/api/audit-logs/export/route.ts`: 監査ログの CSV エクスポート（admin 限定・セッション認証）。監査ログの検索・閲覧画面が設定配下にある。
- `src/app/actions/platform.ts`（provisionOrganization / listAllOrganizations）は super-admin のプラットフォーム操作であり組織スコープ外 — 本 request の対象外。

## 設計要素引用

[[mod-mcp]], [[mod-usecase]], [[mod-authz]], [[mod-webhook]], [[ent-organization]], [[ent-audit-log]], [[ent-domain-event]], [[act-admin]], [[inv-audit-log-append-only]], [[inv-all-tenant-scoped]], [[term-tenant-isolation]]

## 要件

1. **organization ツール**: get / update（組織名）。
2. **users ツール**: list / create / update_role / deactivate / reactivate。自己ロックアウト防止など既存ユースケースの保護はそのまま効かせる。パスワードは作成時の初期設定のみ（変更は UI 専用のまま）。
3. **webhooks ツール**: エンドポイントの list / create / delete / toggle、配信履歴の list、失敗配信の retry。シークレットは作成時のみ返し、一覧には含めない（PAT と同じ一度だけ表示の原則）。
4. **audit_logs ツール（読み取り）**: 期間・対象種別・操作者でのフィルタ検索（admin 限定。[[inv-audit-log-append-only]] — 書き込み操作は提供しない）。エクスポート CSV 相当の情報をページネーション付きで返す。
5. すべて mcp-server-core のパリティ規約（同一ユースケース・同一認可・スキーマ共有・同一監査）とツール集約方針に従う。
6. 本 request で **Server Actions 表面のパリティが完成**する（除外 3 件 = login / パスワード変更 / super-admin プロビジョニングを除く）。README に MCP で可能な操作の全体像と除外一覧を記す。

## スコープ外

- super-admin のプラットフォーム操作（platform.ts）— 組織スコープ外であり、PAT も組織ユーザーに紐づくため対象にしない
- パスワード変更・login — 資格情報管理は UI 専用
- 監査ログの改ざん検知・署名

## 受け入れ基準

- [ ] admin 以外のトークンで users / organization / webhooks / audit_logs の操作が拒否されることをテストで固定する
- [ ] ユーザー無効化の既存保護（自己ロックアウト防止）が MCP 経由でも同一判定になることをテストで固定する
- [ ] Webhook シークレットが一覧・取得に現れないことをテストで固定する
- [ ] audit_logs 検索が自組織のログのみ返すことをテストで固定する
- [ ] 書き込みが監査ログに記録されることをテストで固定する
- [ ] `typecheck && test` green（既存テスト無変更で green）・`aozu check` exit 0・architecture test green

## architect 評価済みの設計判断

mcp-server-core の確立方針に従う。本 request 固有の判断は「audit_logs を読み取り専用ツールとして提供し、エクスポート API の複製ではなく検索ユースケースの共有にする」ことのみ（CSV 生成はファイル応答の問題を持ち込むため、構造化データで返す）。

## 実装上の必須事項（mcp-server-core の学びの反映）

以下は mcp-server-core（#158）の詳細レビューで検出・是正した問題の再発防止。本 request でも遵守する。

1. **テストは実行検証（behavioral）で固定する。ソース文字列照合で代替しない。** 各受け入れ基準は `mock.module` で依存を差し替えて対象コードを実際に実行し、結果・拒否・監査呼び出しを assert する。`readFile` + `toContain` によるソース走査はセキュリティ・監査の保証手段として認めない。
2. **mock.module の汚染を防ぐ。** バレル（`@/application/usecases` 等）をモックせず個別ファイルをモックする（バレルモックは全 re-export を truncate し他テストの import を壊す）。モックした実装は `import * as` で捕捉し `afterAll` で復元する。
3. **エラー変換で内部詳細を漏らさない。** usecase の Result `reason` に例外メッセージ（DB エラー文等）が入る経路をツール結果へ素通ししない。例外はサーバー側にのみ記録し、クライアントには固定文言を返す。
4. **部分更新で未指定フィールドを破壊しない。** MCP の update 系ツールは、省略された引数を既定値（false / null 等）で上書きせず「変更なし」として扱う（フォーム由来の Server Action と異なりフィールド省略は「未指定」であって「オフ」ではない）。null（クリア）と undefined（変更なし）を区別する。
5. **認可・テナント分離はハンドラ経路で実行検証する。** canPerform 行列の単体テストに加え、権限外ロールでツールを実行して isError で拒否され usecase に到達しないことを固定する。organizationId は per-request の authInfo からのみ取得し、ツール引数から受け取らない。
