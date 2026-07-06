# Code Review Feedback — iteration 002

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
- **iteration**: 002

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | LOW | Test Coverage | `src/__tests__/mcp/mcpInteractions.dynamic.test.ts` | TC-004（`record_invoice_adjustment` 正常系）が未テスト。`createInvoiceAdjustment` usecase への到達は TC-023 で「呼ばれないこと」しか検証されておらず、成功パスの実行検証がない。TC-003（`record_contract_adjustment` 正常系）は iter 2 で追加済みだが、対称操作の TC-004 は iter 001 の Finding #2 で明示的に列挙されなかったため未対応のまま残っている。実装は TC-003 と全く同一パターンであり実質的リスクは低い。 | `mcpInteractions.dynamic.test.ts` に `record_invoice_adjustment` 正常系テストを追加する: `createInvoiceAdjustmentReturns = { ok: true, interaction: mockInteraction }` としてツールを呼び出し、usecase に `invoiceId / organizationId / actorId / summary` が渡ることを assert する。TC-003 の構造をそのまま踏襲できる。 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 8 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 8 | 0.10 |

- **total**: 8.50

## Summary

iter 001 の 2 件のブロッキング Finding（HIGH/Security: `result.reason` 素通し、MEDIUM/Test Coverage: 8 件の must テスト未カバー）が両方とも正しく修正されている。

**Finding #1（HIGH/Security）の解消確認**：

- `watches.ts` の `watch` / `unwatch` 双方で `toToolError(result.reason)` が固定文言に置換 ✅
- `interactions.ts` の全 4 operation で固定文言に変換（"商談の記録に失敗しました" 等） ✅
- `tasks.ts` の全書き込み operation でも固定文言を確認 ✅
- `errors.ts` の `handleToolError` が catch パスで `"内部エラーが発生しました"` を返すことを確認 ✅

**Finding #2（MEDIUM/Test Coverage）の解消確認**：

iter 001 で明示的に要求された 8 件のテストケースがすべて追加されている。

| テストケース | 追加ファイル | 確認 |
|---|---|---|
| TC-003 (record_contract_adjustment 正常系) | `mcpInteractions.dynamic.test.ts` | ✅ |
| TC-005 (update_meeting 部分更新) | `mcpInteractions.dynamic.test.ts` | ✅ |
| TC-006 (update_meeting location: null クリア) | `mcpInteractions.dynamic.test.ts` | ✅ |
| TC-012 (tasks update dueDate: null クリア) | `mcpTasks.dynamic.test.ts` | ✅ |
| TC-015 (unwatch 正常系) | `mcpWatches.dynamic.test.ts` | ✅ |
| TC-020 (organizationId 引数排除の行動検証) | `mcpInteractions.dynamic.test.ts` | ✅ |
| TC-024 (例外マスク検証 — throw / ok:false 双方) | `mcpInteractions.dynamic.test.ts` | ✅ |
| TC-025 (7 ツール登録確認) | `mcpToolsRegistration.test.ts` (新規) | ✅ |

**TC-024 実装の精度検証**：
- `createMeetingThrowsError = true` パスで `handleToolError` が `"内部エラーが発生しました"` を返すことを assert ✅（`errors.ts` の実装と整合）
- `ok: false` + DB エラー文字列が `reason` に入るパスで、固定文言 `"商談の記録に失敗しました"` が返り `reason` の内容が漏れないことを assert ✅
- `beforeEach` で `createMeetingThrowsError` が `false` にリセットされるためテスト間汚染なし ✅

**TC-012 の null/undefined 区別（tasks.ts）**：
```typescript
const dueDate = args.dueDate === undefined ? undefined
              : args.dueDate === null       ? null
              : new Date(args.dueDate);
```
3 値分岐が正しく実装されており、`null`（クリア）と `undefined`（変更なし）が区別される。テストで両ブランチを実行検証 ✅

**TC-006 の null/undefined 区別（interactions.ts update_meeting）**：
`location: args.location` をそのまま usecase に渡しており、Zod が `.nullable().optional()` で宣言しているため `null` は `null` として伝播する。テストで `null` が usecase に渡ることを確認 ✅

**TC-020 のアプローチ**：
スキーマの静的検査ではなく、攻撃者が `organizationId: "attacker-org"` をツール引数に渡しても `authInfo.extra.organizationId` が usecase に使われることを行動検証している。スキーマ検査より強力な保証を提供 ✅

**mcpToolsRegistration.test.ts の設計**：
`createMcpServer()` を直接呼ぶのではなく 7 つの register 関数を個別に呼ぶ実装になっているが、`tools/list` リクエストで登録ツール名を実際に検証しており TC-025 の受け入れ基準を満たす ✅。rateLimit のみモック（notifications の `userRepository` は `tools/list` では実行されないためモック不要）✅

**残存する非ブロッキング事項**：
- Finding #3（LOW, Fix=no from iter 001）: 監査テストの推論限界 — 変更なし、設計方針どおり
- Finding #4（LOW, Fix=no from iter 001）: attendees の null セマンティクスの曖昧性 — 変更なし、設計方針どおり
- Finding #1（本 iter, LOW）: TC-004 の正常系カバレッジ欠如 — Fix=no

全受け入れ基準が behavioral test で固定されており、request.md の実装上の必須事項（エラー内部詳細漏洩禁止・mock 汚染防止・部分更新セマンティクス・認可ハンドラ経路検証）はすべて正しく実装・検証されている。
