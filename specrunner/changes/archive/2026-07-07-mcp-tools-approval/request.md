# MCP ツール: 承認系（申請・承認・委任・テンプレート・ポリシー）

## Meta

- **type**: new-feature
- **slug**: mcp-tools-approval
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: mcp-server-core のパリティ規約に従う追加ツール群 → false -->

## 背景

MCP ツール第四弾。業務に横断的に挟まる承認ワークフロー — 申請の作成・提出、承認・却下・一括承認、委任、テンプレートとポリシーの管理 — を AI エージェントから人間と同じ権限で行えるようにする。「承認待ちを確認して、内容に問題がなければ承認する」という管理職の日常業務や、「差し戻された申請を修正して再提出する」というメンバーの業務がエージェントで完結できるようになる。

前提: mcp-server-core がマージ済み。

## 現状コードの前提

- `src/app/actions/requests.ts`: create / listTemplatesForRequest / submit / approve / bulkApprove / reject / resubmit / getApprovalSteps の 8 操作。
- `src/app/actions/delegations.ts`: create / deactivate / list の 3 操作。
- `src/app/actions/templates.ts`: list / create / update / delete の 4 操作。
- `src/app/actions/policies.ts`: list / create / update / toggle の 4 操作。
- 承認リクエストには手動申請（manual）とシステム連動（system。引合案件化・契約作成などのアクションが承認ポリシーに該当したとき自動生成）の 2 系統がある。
- 承認ステップは order 昇順に処理され、承認者はロール指定または個人指名、委任により代理承認できる。

## 設計要素引用

[[mod-mcp]], [[mod-usecase]], [[mod-authz]], [[ent-approval-request]], [[ent-approval-step]], [[ent-approval-template]], [[ent-approval-policy]], [[ent-approval-delegation]], [[act-approver]], [[act-manager]], [[act-admin]], [[inv-approval-steps-sequential]], [[inv-approver-role-or-id]], [[inv-post-approval-same-tx]], [[inv-system-approval-blocks-action]], [[inv-approval-evaluate-all-policies]], [[term-terminal-state]], [[inv-all-tenant-scoped]]

## 要件

1. **approval_requests ツール**: list（自分が申請した・自分が承認すべき、状態フィルタ）/ get（ステップ状況含む）/ create / submit / approve / reject / bulk_approve / resubmit。承認の順序制約（[[inv-approval-steps-sequential]]）・承認者資格（[[inv-approver-role-or-id]]。委任による代理を含む）・終端状態（[[term-terminal-state]]）は既存ユースケースに従う。
2. **システム連動承認の可視性**: get の結果で、承認完了時に実行されるアクション（triggerAction / 対象）が分かるようにする（[[inv-post-approval-same-tx]] で承認完了と同一トランザクションで実行される旨を含め、エージェントが承認の影響を説明できる情報を返す）。
3. **delegations ツール**: list / create / deactivate。
4. **approval_templates ツール**: list / create / update / delete（admin/manager 権限は既存判定に従う）。
5. **approval_policies ツール**: list / create / update / toggle。
6. すべて mcp-server-core のパリティ規約（同一ユースケース・同一認可・スキーマ共有・同一監査）とツール集約方針に従う。

## スコープ外

- 管理系ツール（組織・ユーザー・Webhook。後続 request）
- 承認期限のリマインド通知（既存バッチのまま）

## 受け入れ基準

- [ ] 「自分が承認すべき申請」の一覧が承認者資格（ロール・指名・有効な委任）どおりに絞られることをテストで固定する
- [ ] 順序外のステップ承認が拒否されること（[[inv-approval-steps-sequential]]）をテストで固定する
- [ ] 資格のないユーザーの承認・却下が拒否されることをテストで固定する
- [ ] システム連動申請の承認で後続アクションが実行されること（既存挙動の維持）をテストで固定する
- [ ] bulk_approve が個別承認と同一の判定・記録になることをテストで固定する
- [ ] 書き込みが監査ログに記録され、他テナントに触れられないことをテストで固定する
- [ ] `typecheck && test` green（既存テスト無変更で green）・`aozu check` exit 0・architecture test green

## architect 評価済みの設計判断

mcp-server-core の確立方針に従う。本 request 固有の判断は「承認の影響（システム連動アクション）をツール結果で説明可能にする」ことのみ — エージェントは人間の画面文脈を持たないため、承認が何を引き起こすかをツール結果自体が語る必要がある（情報の追加であり、挙動パリティは崩さない）。

## 実装上の必須事項（mcp-server-core の学びの反映）

以下は mcp-server-core（#158）の詳細レビューで検出・是正した問題の再発防止。本 request でも遵守する。

1. **テストは実行検証（behavioral）で固定する。ソース文字列照合で代替しない。** 各受け入れ基準は `mock.module` で依存を差し替えて対象コードを実際に実行し、結果・拒否・監査呼び出しを assert する。`readFile` + `toContain` によるソース走査はセキュリティ・監査の保証手段として認めない。
2. **mock.module の汚染を防ぐ。** バレル（`@/application/usecases` 等）をモックせず個別ファイルをモックする（バレルモックは全 re-export を truncate し他テストの import を壊す）。モックした実装は `import * as` で捕捉し `afterAll` で復元する。
3. **エラー変換で内部詳細を漏らさない。** usecase の Result `reason` に例外メッセージ（DB エラー文等）が入る経路をツール結果へ素通ししない。例外はサーバー側にのみ記録し、クライアントには固定文言を返す。
4. **部分更新で未指定フィールドを破壊しない。** MCP の update 系ツールは、省略された引数を既定値（false / null 等）で上書きせず「変更なし」として扱う（フォーム由来の Server Action と異なりフィールド省略は「未指定」であって「オフ」ではない）。null（クリア）と undefined（変更なし）を区別する。
5. **認可・テナント分離はハンドラ経路で実行検証する。** canPerform 行列の単体テストに加え、権限外ロールでツールを実行して isError で拒否され usecase に到達しないことを固定する。organizationId は per-request の authInfo からのみ取得し、ツール引数から受け取らない。
