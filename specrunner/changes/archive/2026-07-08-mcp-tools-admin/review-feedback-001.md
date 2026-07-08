# Code Review Feedback — iteration 001

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
- iteration line format (exact): `- **iteration**: NNN` (3-digit zero-padded integer)
- Findings table MUST have exactly 7 columns in this order:
  # | Severity | Category | File | Description | How to Fix | Fix
  - Fix column: yes = fixer should address this finding; no = skip (pre-existing / out-of-scope)
- Scores table columns: Category | Score | Weight
  - Valid Category values: correctness | security | architecture | performance | maintainability | testing
  - Score: integer 1-10
  - Weight: decimal as defined below
- total line format (exact): `- **total**: <decimal>`
- Default weights: correctness=0.30, security=0.25, architecture=0.15, performance=0.10, maintainability=0.10, testing=0.10
- Scores table is optional but recommended.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approved
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | low | testing | src/__tests__/mcp/mcpWebhooks.dynamic.test.ts | TC-020（must）: member ロールで webhooks 操作が拒否されることのテストが `list` と `create` の 2 operation のみ。`delete` / `toggle` / `list_deliveries` / `retry_delivery` の member 拒否は未 assert。実装上は canPerform チェックが switch 外の共通パスに存在するため正しいが、仕様は「各 operation」について明示している。 | 「member で delete / toggle / list_deliveries / retry_delivery を呼ぶと isError: true」を各 1 ケース追加する。repository に到達しないことも assert すると stronger。 | yes |
| 2 | low | testing | src/__tests__/mcp/mcpUsers.dynamic.test.ts | TC-014（must）: users create のレスポンスに password フィールドが含まれないことの明示的 assert がない。User 型に password フィールドが存在しないため型安全は保証されるが、動作検証として仕様に明示されている。 | create 成功テストに `const data = JSON.parse(result.text); expect(data).not.toHaveProperty("password")` を追加する。 | yes |
| 3 | low | testing | src/__tests__/mcp/mcpUsers.dynamic.test.ts | TC-010（must）: users reactivate の正常系テスト（admin で成功する）がない。member 拒否テストのみ存在し、reactivateUser usecase への到達が実行検証されていない。 | admin ロールで `{ operation: "reactivate", userId: TARGET_USER }` を呼び、isError: undefined・reactivateUserCalls が 1 件であることを assert するテストを追加する。 | yes |
| 4 | low | testing | src/__tests__/mcp/mcpUsers.dynamic.test.ts | TC-008（must）: users update_role の正常系テスト（admin で成功する）がない。member 拒否テストのみ存在し、updateUserRole usecase への到達が実行検証されていない。 | admin ロールで `{ operation: "update_role", userId: TARGET_USER, role: "manager" }` を呼び、isError: undefined・updateUserRoleCalls が 1 件であることを assert するテストを追加する。 | yes |
| 5 | low | testing | src/__tests__/mcp/mcpWebhooks.dynamic.test.ts | TC-018・TC-021（should）: webhooks create で HTTP URL（非 HTTPS）とプライベート IP アドレスの URL が拒否されることの動作検証テストがない。spec-review が MEDIUM 所見として要求し、validateWebhookUrl の呼び出しは実装済みだが、ハンドラ経路での実行検証が欠落している。 | `{ operation: "create", url: "http://example.com/hook", events: ["request.created"] }` → isError: true、および `{ operation: "create", url: "https://192.168.1.1/hook", events: ["request.created"] }` → isError: true のテストを追加する。 | yes |
| 6 | low | testing | src/__tests__/mcp/mcpToolsRegistration.test.ts | RATE_LIMITS モックに `webhookManage` キーが含まれていない（createRequest と search のみ）。登録テストはツール実行をしないため現状は問題ないが、将来テストが拡張された際に webhooks ツールの rate limit 参照で undefined アクセスが発生する可能性がある。 | RATE_LIMITS モックに `webhookManage: { limit: 10, windowMs: 60_000 }` を追加する。 | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 9 | 0.10 |
| testing | 7 | 0.10 |

- **total**: 8.70

## Summary

実装品質は全体的に高い。mcp-server-core の学び（behavioral テスト・個別ファイルモック・バレルモック禁止・エラー内部詳細非漏洩・テナント分離のハンドラ経路検証）が 4 ツールすべてに適切に反映されている。

**実装面で確認した主要点:**

- **認可**: canPerform チェックはすべての操作に適用されている。webhooks は switch 外の共通パスで一括チェックし、organization の get のみ全ロール許可という設計上の差異も正確に実装されている。
- **テナント分離**: organizationId はすべての操作で authInfo.extra から取得しており、ツール引数からは一切受け取らない。
- **シークレット秘匿**: webhooks list では destructuring `{ secret: _secret, ...rest }` でフィールドを除外し、create のみフルシークレットを返すという D3 の設計判断が正しく実装されている。
- **エラー変換**: handleToolError が外側 try-catch で例外をキャッチし固定文言を返す。result.reason は domain レベルの確定エラー文（「自分自身は無効化できません」等）のみを通し、インフラ例外はキャッチして内部に留める二層構造が機能している。
- **URL バリデーション共有**: webhookUrlValidator.ts への抽出と Server Actions 側の import 差し替えが完了しており、ロジック重複が排除されている。
- **型安全**: typecheck green、User 型に password フィールドが存在しないため create レスポンスの password 非漏洩は型レベルで保証されている。

**テスト面の所見**: acceptance criteria（admin 以外拒否・自己ロックアウト保護・シークレット秘匿・テナント分離・監査記録）はすべて実行検証で固定されている。発見された 6 件はいずれも low 所見であり、主に test-cases.md の "must"/"should" ケースの追加漏れ（正常系 assert・全 operation 網羅・URL バリデーション動作確認）。実装自体のバグは確認できなかった。
