# MCP ツール: 活動系（顧客接点・タスク・ウォッチ・通知）

## Meta

- **type**: new-feature
- **slug**: mcp-tools-activity
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: mcp-server-core で確立したパリティ規約・ツール集約方針・エラー変換に従う追加ツール群であり、新しい設計選択を含まない → false -->

## 背景

MCP ツールの目標は「人間が UI で使える機能のパリティ」であり、mcp-server-core（基盤 + 引合・案件・顧客）に続く第二弾として、日常の営業活動を構成する操作 — 顧客接点の記録、タスク、ウォッチ、通知 — を載せる。AI エージェントが「商談を記録し、次のタスクを切り、通知を確認する」一連の活動を人間と同じ権限・同じ監査で行えるようになる。

前提: mcp-server-core がマージ済み（`/api/mcp`・Bearer 検証・ツール登録・パリティ規約・エラー変換が存在する）。

## 現状コードの前提

- `src/app/actions/meetings.ts`: createMeetingAction / updateMeetingAction（商談 = 関連先が案件/引合の顧客接点の記録・編集）。
- `src/app/actions/interactions.ts`: recordContractAdjustmentAction / recordInvoiceAdjustmentAction（契約調整・請求調整の接点記録）。
- `src/app/actions/actionItems.ts`: create / toggle / update / delete / updateStatus / searchLinkTargets の 6 操作。
- `src/app/actions/watches.ts`: watchDealAction / unwatchDealAction。
- `src/app/actions/notifications.ts`: markNotificationsAsReadAction。通知は独自テーブルを持たず監査ログから導出される（DerivedNotification）。
- Server Action はいずれも Zod 検証・認可・ユースケース委譲を行う。MCP ツールはこれと同じユースケースを共有する（mcp-server-core のパリティ規約）。

## 設計要素引用

[[mod-mcp]], [[mod-usecase]], [[mod-authz]], [[ent-interaction]], [[term-shodan]], [[ent-action-item]], [[ent-watch]], [[ent-deal]], [[ent-inquiry]], [[ent-contract]], [[ent-invoice]], [[ent-audit-log]], [[inv-interaction-requires-related]], [[inv-watch-unique]], [[inv-all-tenant-scoped]], [[term-timeline]]

## 要件

1. **interactions ツール**: 商談の記録・編集（relatedTo が案件/引合。[[term-shodan]]。営業ステージ・ヒアリング情報・参加者を含む）、契約調整・請求調整の記録。関連先必須（[[inv-interaction-requires-related]]）の検証は既存ユースケースに従う。
2. **tasks ツール**: list（自分の・関連先の）/ create / update / update_status / toggle / delete。リンク先候補検索（searchLinkTargets 相当）を含める。
3. **watches ツール**: 案件のウォッチ / 解除（[[inv-watch-unique]]）。
4. **notifications ツール**: 未読通知の一覧と既読化。エージェントが「自分宛の更新」を把握する入口。
5. すべて mcp-server-core のパリティ規約に従う: Server Action と同じユースケース・同じ canPerform 判定・同等の Zod 検証（スキーマ共有）・同じ監査記録。ツール専用ロジックを書かない。
6. ツール形状はリソース単位 + operation 引数（mcp-server-core の集約方針）。

## スコープ外

- 経理系（契約・請求・売上）・承認系・管理系ツール（後続 request）
- 通知のプッシュ配信（サーバー起点通知）— MCP は pull のみ

## 受け入れ基準

- [ ] 商談記録 → 案件タイムライン（[[term-timeline]]）に現れることをテストで固定する
- [ ] 関連先なしの接点記録が拒否されることをテストで固定する
- [ ] タスクの CRUD・ステータス遷移が Server Action と同一の認可判定になることをテストで固定する
- [ ] ウォッチ重複が既存の一意性（[[inv-watch-unique]]）どおり扱われることをテストで固定する
- [ ] 通知一覧がトークンのユーザー本人の通知のみ返すことをテストで固定する
- [ ] 書き込みが監査ログに記録され、他テナントに触れられないことをテストで固定する
- [ ] `typecheck && test` green（既存テスト無変更で green）・`aozu check` exit 0・architecture test green

## architect 評価済みの設計判断

mcp-server-core で確立した方針（リソース単位ツール・usecase 共有アダプタ・stateless）に従う。本 request 固有の新しい設計判断はない。通知を pull 型ツールとして载せるのは、MCP の stateless 方針（サーバー起点通知は将来拡張）との整合による。

## 実装上の必須事項（mcp-server-core の学びの反映）

以下は mcp-server-core（#158）の詳細レビューで検出・是正した問題の再発防止。本 request でも遵守する。

1. **テストは実行検証（behavioral）で固定する。ソース文字列照合で代替しない。** 各受け入れ基準は `mock.module` で依存を差し替えて対象コードを実際に実行し、結果・拒否・監査呼び出しを assert する。`readFile` + `toContain` によるソース走査はセキュリティ・監査の保証手段として認めない。
2. **mock.module の汚染を防ぐ。** バレル（`@/application/usecases` 等）をモックせず個別ファイルをモックする（バレルモックは全 re-export を truncate し他テストの import を壊す）。モックした実装は `import * as` で捕捉し `afterAll` で復元する。
3. **エラー変換で内部詳細を漏らさない。** usecase の Result `reason` に例外メッセージ（DB エラー文等）が入る経路をツール結果へ素通ししない。例外はサーバー側にのみ記録し、クライアントには固定文言を返す。
4. **部分更新で未指定フィールドを破壊しない。** MCP の update 系ツールは、省略された引数を既定値（false / null 等）で上書きせず「変更なし」として扱う（フォーム由来の Server Action と異なりフィールド省略は「未指定」であって「オフ」ではない）。null（クリア）と undefined（変更なし）を区別する。
5. **認可・テナント分離はハンドラ経路で実行検証する。** canPerform 行列の単体テストに加え、権限外ロールでツールを実行して isError で拒否され usecase に到達しないことを固定する。organizationId は per-request の authInfo からのみ取得し、ツール引数から受け取らない。
