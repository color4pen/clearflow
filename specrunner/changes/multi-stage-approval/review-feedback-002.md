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

- **verdict**: needs-fix
- **iteration**: 002

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | high | security | `src/infrastructure/repositories/approvalStepRepository.ts:90-110` | `resetSteps` に `organizationId` フィルターが欠落。TC-026 (must) は `resetSteps` を含む全関数にテナント分離を要求するが、`WHERE` 句に `organizationId` 条件がない | 引数に `organizationId: string` を追加し `.where(and(eq(approvalSteps.requestId, requestId), eq(approvalSteps.organizationId, organizationId), gte(approvalSteps.stepOrder, fromStepOrder)))` とする。呼び出し元 `resubmitRequest.ts` でも渡す | yes |
| 2 | medium | correctness | `src/application/usecases/approveRequest.ts:82-173` | 多段階承認パス (`steps.length > 0`) で `validateTransition` が呼ばれない。`draft` 状態の申請や `revision` 状態の申請でも承認ステップが進行してしまう（設計 D4 「対象申請が `pending` 状態であることを確認する」が未実装）。TC-039 の静的テストは no-steps パスの `validateTransition` を検出するため偽陽性 | 多段階パスの先頭に状態チェックを追加: `if (existing.status !== "pending") { return { ok: false, reason: "..." }; }` または `validateTransition(existing.status, "approved")` を利用する | yes |
| 3 | low | correctness | `src/application/usecases/createRequest.ts:19-26` | テンプレート未発見時に `throw new Error()` しているが TC-043 (should) は `{ ok: false, reason }` を期待。`createRequestAction` がキャッチせず 500 エラーになる | `createRequest` の戻り値型を `Request \| { ok: false; reason: string }` に変更するか、`createRequestAction` で try-catch して `{ message: err.message }` を返す | yes |
| 4 | low | maintainability | `src/app/(dashboard)/requests/[id]/page.tsx:77-87` | TC-051 (manual) は「承認済みステップに承認者名と承認日時を表示」と定めるが、`ApprovalStep.approvedBy` は UUID のため名前が表示できない。承認日時のみ表示 | `getApprovalSteps` usecase で `approvedByName` を結合取得するか、`ApprovalStep` 型に `approvedByName: string \| null` を追加する | yes |
| 5 | low | testing | `specrunner/changes/multi-stage-approval/verification-result.md` | `bun test` と typecheck が verification でスキップ（`package.json` に test スクリプトなし）。受け入れ基準の「bun test 全件 green」「typecheck green」が未確認 | F1・F2 修正後に `bun test` を手動実行してグリーンを確認。必要であれば `package.json` に `"test": "bun test"` を追加する | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 6 | 0.30 |
| security | 7 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 7 | 0.10 |

- **total**: 7.35

## Summary

全体的な実装品質は高い。ドメインモデル・状態遷移ルール・usecase オーケストレーション・UI 拡張は設計（design.md）に忠実であり、依存方向違反も存在しない。55 件の must テストケースカバレッジも確認されている。

ただし、2 件の修正必須項目がある。

**F1（high・セキュリティ）**: `approvalStepRepository.resetSteps` に `organizationId` フィルターがなく、TC-026 のテナント分離 must 要件を満たしていない。他のすべてのリポジトリ関数が `organizationId` を含む中で `resetSteps` のみが例外になっている。

**F2（medium・正確性）**: `approveRequest` の多段階パスで設計 D4 が定める「`pending` 状態確認」が実装されていない。`draft` 状態や `revision` 状態の申請でも承認ステップが進行してしまう状態遷移バイパスが存在する。TC-039 の静的テストは no-steps パスの `validateTransition` を誤検出しており偽陽性。

F3・F4 は低優先だが、特に F3 はエラー時の UX 改善として対応を推奨する。F5 は F1・F2 修正後に `bun test` を実行して受け入れ基準を確認すること。
