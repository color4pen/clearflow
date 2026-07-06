# MCP ツール: 経理系（契約・請求・売上）

## Meta

- **type**: new-feature
- **slug**: mcp-tools-finance
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: mcp-server-core のパリティ規約に従う追加ツール群 → false -->

## 背景

MCP ツール第三弾。受注後の経理業務 — 契約の作成・管理、請求の発行・入金記録、売上の把握・予実管理 — を AI エージェントから人間と同じ権限で行えるようにする。finance ロールのユーザーのトークンなら入金記録ができ、member ならできない、という既存の権限マトリクスがそのまま効く。

前提: mcp-server-core がマージ済み。

## 現状コードの前提

- `src/app/actions/contracts.ts`: create / update / updateStatus / delete / list / get の 6 操作。契約作成・解約は承認ポリシーの対象になりうる。
- `src/app/actions/invoices.ts`: create / update / updateStatus / listByContract の 4 操作。
- `src/app/actions/revenue.ts`: setRevenueTarget / updateRevenueTarget / deleteRevenueTarget の 3 操作。
- 売上（Revenue）は読み取り専用ドメインで、独自テーブルを持たず案件・契約・請求を横断集計する。ダッシュボード・明細・予実・顧客別の観点がある。
- 契約・請求は楽観的ロック（version）を持つ。

## 設計要素引用

[[mod-mcp]], [[mod-usecase]], [[mod-authz]], [[ent-contract]], [[ent-invoice]], [[ent-revenue]], [[ent-revenue-target]], [[ent-deal]], [[act-finance]], [[inv-contract-requires-won-deal]], [[inv-contract-requires-amount]], [[inv-contract-date-order]], [[inv-invoice-must-be-issued-before-paid]], [[inv-invoice-paid-requires-date]], [[inv-invoice-date-order]], [[inv-invoice-sum-within-contract]], [[inv-system-approval-blocks-action]], [[term-optimistic-lock]], [[term-terminal-state]], [[inv-all-tenant-scoped]]

## 要件

1. **contracts ツール**: list / get / create / update / update_status / delete。won 案件必須（[[inv-contract-requires-won-deal]]）・金額必須（[[inv-contract-requires-amount]]）等の不変条件は既存ユースケースに従う。
   - **承認ゲートはスコープ外**: 現状の `createContract` / `updateContractStatus`（解約）usecase は承認ポリシー評価（`evaluatePolicies` → pending リクエスト生成）を実装していない（`contract.create` / `contract.cancel` は policy 定数に登録済みだが未配線で、Server Action も同様にゲートしない）。よって本 request では**現行の Server Action と同一挙動**とし、契約作成/解約に承認ゲートを追加しない。ツール結果の型は将来 pendingApproval を返せる形にしてよいが、現 usecase が返さないことを実装で注記する。契約系の承認ゲート配線は別 request の対象。
2. **invoices ツール**: list（契約別・組織全体）/ create / update / update_status（発行 → 入金・期日超過の遷移。[[inv-invoice-must-be-issued-before-paid]] / [[inv-invoice-paid-requires-date]]）。
3. **revenue ツール（読み取り）**: 人間の売上画面と同じ集計ユースケースを共有する。operation と対応 usecase を明示する:
   - `dashboard` → `getRevenueDashboard`（月次売上サマリ・パイプライン）
   - `details` → `getRevenueDetails`（軸引数で案件別/顧客別などの明細）
   - `forecast` → `getRevenueForecast`（予実: 目標 vs 実績）
4. **revenue_targets ツール**: set / update / delete。
5. 楽観的ロック衝突（[[term-optimistic-lock]]）はエラー変換規約に従い、再取得を促す明確なツールエラーとして返す。
6. すべて mcp-server-core のパリティ規約（同一ユースケース・同一認可・スキーマ共有・同一監査）とツール集約方針に従う。

## スコープ外

- 承認系・管理系ツール（後続 request）
- 請求書 PDF 生成・CSV エクスポート（ファイル応答は別途検討）

## 受け入れ基準

- [ ] won でない案件への契約作成が拒否されることをテストで固定する
- [ ] 未発行請求の入金記録が拒否されること（[[inv-invoice-must-be-issued-before-paid]]）をテストで固定する
- [ ] 入金記録に入金日が必須なこと（[[inv-invoice-paid-requires-date]]）をテストで固定する
- [ ] finance / member ロールの操作可否が Server Action と同一判定になることをテストで固定する
- [ ] version 不一致の更新が衝突エラーになることをテストで固定する
- [ ] 売上サマリが人間の売上画面と同じ集計値を返すことをテストで固定する
- [ ] 書き込みが監査ログに記録され、他テナントに触れられないことをテストで固定する
- [ ] `typecheck && test` green（既存テスト無変更で green）・`aozu check` exit 0・architecture test green

## architect 評価済みの設計判断

mcp-server-core の確立方針に従う。本 request 固有の判断は「revenue を書き込みなしの読み取りツールとして分離する」ことのみ（売上は読み取り専用ドメインであり、書き込みは revenue_targets に限られるという既存設計の反映）。

## 実装上の必須事項（mcp-server-core の学びの反映）

以下は mcp-server-core（#158）の詳細レビューで検出・是正した問題の再発防止。本 request でも遵守する。

1. **テストは実行検証（behavioral）で固定する。ソース文字列照合で代替しない。** 各受け入れ基準は `mock.module` で依存を差し替えて対象コードを実際に実行し、結果・拒否・監査呼び出しを assert する。`readFile` + `toContain` によるソース走査はセキュリティ・監査の保証手段として認めない。
2. **mock.module の汚染を防ぐ。** バレル（`@/application/usecases` 等）をモックせず個別ファイルをモックする（バレルモックは全 re-export を truncate し他テストの import を壊す）。モックした実装は `import * as` で捕捉し `afterAll` で復元する。
3. **エラー変換で内部詳細を漏らさない。** usecase の Result `reason` に例外メッセージ（DB エラー文等）が入る経路をツール結果へ素通ししない。例外はサーバー側にのみ記録し、クライアントには固定文言を返す。
4. **部分更新で未指定フィールドを破壊しない。** MCP の update 系ツールは、省略された引数を既定値（false / null 等）で上書きせず「変更なし」として扱う（フォーム由来の Server Action と異なりフィールド省略は「未指定」であって「オフ」ではない）。null（クリア）と undefined（変更なし）を区別する。
5. **認可・テナント分離はハンドラ経路で実行検証する。** canPerform 行列の単体テストに加え、権限外ロールでツールを実行して isError で拒否され usecase に到達しないことを固定する。organizationId は per-request の authInfo からのみ取得し、ツール引数から受け取らない。
