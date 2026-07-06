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

- **verdict**: needs-fix
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | HIGH | Security / Error Masking | `src/app/api/mcp/tools/watches.ts` L56, `src/app/api/mcp/tools/interactions.ts` L160 L228 L256 L285 | `result.reason` が DB 例外メッセージを含む場合でもクライアントへ素通しされる。`watchDeal.ts:27` にて `err instanceof Error ? err.message : "..."` パターンを確認済み（DB の一意制約違反メッセージ等が reason に入る）。`createMeeting.ts:94` でも同パターンを確認。`watches.ts` の `watch`/`unwatch`、`interactions.ts` の全 4 operation が `toToolError(result.reason)` をそのまま返しており、request.md 必須事項 #3「usecase の Result reason に例外メッセージが入る経路をツール結果へ素通ししない」および spec.md「内部詳細を漏らさない MUST」に違反する。`tasks.ts` の各 operation も同一構造のため、対象 usecase に catch→reason パターンがないか確認を要する。 | `watches.ts` と `interactions.ts` の `if (!result.ok) { return toToolError(result.reason); }` を固定文言に変更する: `return toToolError("操作に失敗しました");`。ドメインバリデーション由来（"案件が見つかりません" 等）と DB 例外由来の reason を区別できない現状では全パスを固定文言にするのが最も安全。`tasks.ts` についても `createActionItem`/`updateActionItem`/`deleteActionItem`/`toggleActionItemDone`/`updateActionItemStatus`/`updateActionItem` の usecase 実装を確認し、catch→reason パターンがあれば同様に固定文言に変更する。 | yes |
| 2 | MEDIUM | Test Coverage | `src/__tests__/mcp/` (全テストファイル) | test-cases.md の must 優先度ケースのうち 8 件が behavioral test で固定されていない。TC-003 (record_contract_adjustment 正常系)、TC-005 (update_meeting 部分更新: summary のみ更新時に他フィールドが変更なしとして渡る)、TC-006 (update_meeting null クリア: location: null が updateMeeting usecase に null として渡る)、TC-012 (tasks update null クリア: dueDate: null が updateActionItem usecase に null として渡る)、TC-015 (unwatch 正常系)、TC-020 (organizationId がスキーマに含まれない単体確認)、TC-024 (usecase 例外がマスクされる — Finding #1 の修正の回帰防止テスト)、TC-025 (7 ツール登録確認)。TC-024 は Finding #1 の修正が正しく機能することを検証する唯一の手段であり、Finding #1 と合わせて追加が必須。TC-006/TC-012 は null/undefined 区別の実装が正しいことを固定する重要なテスト。 | (a) `mcpInteractions.dynamic.test.ts` に TC-003 (record_contract_adjustment モックして正常系を確認)、TC-005 (summary のみ指定して updateMeeting に渡る args を assert)、TC-006 (location: null を渡して updateMeeting に null が到達することを assert)、TC-024 (createMeeting が `throw new Error("DB internal detail")` するモックを設定し、ツール result.text に "DB internal detail" が含まれないことを assert) を追加する。(b) `mcpTasks.dynamic.test.ts` に TC-012 (dueDate: null を渡して updateActionItem に null が渡ることを assert) を追加する。(c) `mcpWatches.dynamic.test.ts` に TC-015 (unwatchDeal モックして unwatch の正常系を確認) を追加する。(d) 任意ファイルに TC-020 (interactionsInputSchema の shape に organizationId キーが存在しないことを assert) と TC-025 (createMcpServer を呼び出して登録されたツール数を assert) を追加する。 | yes |
| 3 | LOW | Audit / Test Fidelity | `src/__tests__/mcp/mcpActivityAuditTenant.dynamic.test.ts` L237–242 | 受け入れ基準「書き込みが監査ログに記録される」の検証は usecase が organizationId/actorId を受け取ることの確認のみで行われており、usecase をモックしているため `recordAudit` は実際には呼ばれない。`createMeeting.ts` の実装では `recordAudit` は db.transaction 内で呼ばれ、今後 usecase から `recordAudit` 呼び出しが削除されてもテストは pass し続ける。spec-review でも同一問題が指摘されている（Finding #2）。 | 必須ではないが品質向上のため: `@/application/services/auditRecorder` を個別モックしてキャプチャし、createMeeting の実際の実装パスを通じて recordAudit が `action: "interaction.create"` で呼ばれることを assert するテストに変更することを検討する。テスト複雑度が上がる場合は現状のまま TC-019 のコメントに「usecase のモック境界内では recordAudit は実行されない（推論による確認）」を明示する。 | no |
| 4 | LOW | Behavior / Null Semantics | `src/app/api/mcp/tools/interactions.ts` L180–194 | `update_meeting` で `internalAttendees: null` を渡すと条件 `args.internalAttendees !== undefined` が true になり `null ?? []` により空配列として処理される。スキーマが `.nullable().optional()` を宣言しているため API 利用者は null に意味（例: クリア）を期待しうるが、実装は undefined（変更なし）と null（空配列として結合）を区別しない。attendees の "クリア" セマンティクスが usecase レベルで必要かどうかに依存するが、D6（null/undefined 区別）の原則と一貫しない可能性がある。 | `internalAttendees`/`externalAttendees` のスキーマから `.nullable()` を除去して `z.array(z.string()).optional()` にする（null を受け付けない）か、null を「このカテゴリの全参加者を削除する」と明示的に定義してコードコメントに記載する。いずれかの方針を選択し、スキーマと動作の意味を一致させる。 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 8 | 0.30 |
| security | 4 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 6 | 0.10 |

- **total**: 7.05

## Summary

実装の全体的な品質は高く、mcp-server-core で確立したパターン（個別ファイル import・afterAll 復元・discriminatedUnion・per-request authInfo）を一貫して踏襲している。テナント分離（organizationId は authInfo.extra からのみ取得）、レート制限、canPerform による認可判定の実行検証、ウォッチ重複の扱い、通知の userId 分離はいずれも正しく実装されており、request.md の 7 つの受け入れ基準はすべて behavioral test で固定されている。aozu の依存ルール（`mod-mcp → mod-repo` の追加）も適切に更新されている。build / typecheck / test / lint は全フェーズ pass 済み。

ブロッキング Finding は 2 件。

**Finding #1（HIGH / Security）**: `watchDeal.ts:27` および `createMeeting.ts:94` で `catch (err) { reason: err.message }` パターンが確認された。これらの usecase を呼ぶ `watches.ts` / `interactions.ts` はその reason を `toToolError(result.reason)` でそのまま MCP クライアントへ返しており、request.md 必須事項 #3（素通し禁止）に直接違反する。DB 一意制約名・スキーマ情報等の内部詳細が外部に漏れうる。

**Finding #2（MEDIUM / Test Coverage）**: TC-024（例外マスクのテスト）が存在しないため、Finding #1 の修正が正しく機能することを回帰防止する手段がない。Finding #1 の修正と TC-024 の behavioral test 追加を合わせて行うこと。TC-006 / TC-012（null クリアの実行検証）も must 優先度だが未カバー。

Finding #3 / #4 は LOW であり、fixer への修正依頼対象外（no）。

