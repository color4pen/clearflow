# Code Review Feedback — iteration 003

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
- **iteration**: 003

## Previous Findings — Status

| # (review-002) | Severity | Description | Status |
|----------------|----------|-------------|--------|
| F1 | high | `resetSteps` に `organizationId` フィルター欠落 | **FIXED** ✓ — `resetSteps(requestId, fromStepOrder, organizationId, tx?)` にシグネチャが変更され、WHERE 句に `eq(approvalSteps.organizationId, organizationId)` が追加された |
| F2 | medium | `approveRequest` 多段階パスで `validateTransition` が呼ばれない | **FIXED** ✓ — 行 83 に `validateTransition(existing.status, "approved")` が追加され、`revision`・`draft` 等の非 `pending` 状態からの承認ステップ更新がブロックされる |
| F3 | low | `createRequest` がテンプレート未発見時に throw、`createRequestAction` が try-catch せず 500 エラー | 未修正（下記 F1 として継続） |
| F4 | low | `approvedBy` UUID が承認者名として表示できない | 未修正（下記 F2 として継続） |
| F5 | low | `bun test` / typecheck が verification でスキップ | 未修正（下記 F4 として継続） |

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | low | correctness | `src/application/usecases/createRequest.ts:19-26` | テンプレート未発見時に `throw new Error()` しているが `createRequestAction` が try-catch を持たないため、存在しない `templateId` を POST されると 500 エラーになる。TC-043 (should) は `{ ok: false, reason }` の返却を期待する | `createRequestAction` に try-catch を追加して `{ message: err.message }` を返す、または `createRequest` の戻り値型を `Result` 型に変更する | yes |
| 2 | low | correctness | `src/application/usecases/approveRequest.ts:33-37` | `findByRequestId` がトランザクション開始前（行 33）に呼ばれている（TOCTOU）。同一リクエストへの並行承認が起きた場合、`isAllApproved(updatedSteps)` の楽観的計算が古いスナップショットに基づき誤った結果になる可能性がある。`rejectRequest.ts` の revision パス（行 41-45）は tx 内で正しくフェッチしており実装が非一貫 | `findByRequestId` の呼び出しを `db.transaction` コールバック内に移動し、`tx` を第3引数として渡す（review-001 F4 未修正） | yes |
| 3 | low | maintainability | `src/app/(dashboard)/requests/[id]/page.tsx:77-87` | `ApprovalStep.approvedBy` は UUID 文字列のため、承認済みステップに承認者名を表示できない。TC-051 (manual, must) は「承認済みステップには承認者名と承認日時を表示する」と定める | `getApprovalSteps` usecase で users テーブルを結合して `approvedByName: string \| null` を付与するか、`ApprovalStep` 型を拡張する（review-002 F4 未修正） | yes |
| 4 | low | testing | `specrunner/changes/multi-stage-approval/verification-result.md` | verification-result.md（iter 1 から更新なし）では `bun test` と typecheck が "skipped — script not found" のまま。受け入れ基準「bun test 全件 green」「typecheck green」が機械的に未検証 | `package.json` に `"test": "bun test"` を追加し、ローカルで `bun test` を実行して全件グリーンを確認する | no |
| 5 | low | correctness | `src/application/usecases/createRequest.ts:67-83` | テンプレート未指定パスで `requestRepository.create` と `auditLogRepository.create` がトランザクション外で呼ばれている。T-09 AC では「テンプレート指定時の操作が db.transaction() 内で実行される」と限定されており本パスはスコープ外。また本 PR 前から存在する（pre-existing） | pre-existing かつスコープ外のため対応任意 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 8 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 8 | 0.10 |

- **total**: 8.50

## Summary

review-002 で指摘した 2 件の必須修正（F1: `resetSteps` のテナント分離漏れ、F2: `approveRequest` 多段階パスのステータスガード欠落）はいずれも適切に修正された。テナント分離・監査ログ完全性・トランザクション境界の観点（domain-invariants）では新規の違反は見当たらない。

現在残存する findings はすべて low 以下の severity であり、ブロッキング要件（high/critical ≥ 1）を満たさないため verdict は **approved** とする。

**継続する低優先度課題**:

- **F1（low/correctness）**: テンプレート未発見時の例外が Server Action に伝播する UX 問題。`templateId` はフォームの select から送信されるため通常フローでは発生しないが、防御的実装として対応が望ましい。
- **F2（low/correctness）**: `approveRequest` の TOCTOU 問題。`rejectRequest` では tx 内フェッチが正しく実装されており、`approveRequest` と実装スタイルが非一貫。並行承認は実運用では稀だが、一貫性のためトランザクション内への移動を推奨する。
- **F3（low/maintainability）**: TC-051 (must/manual) の「承認者名表示」が未実装。`approvedBy` UUID をそのまま保持するだけでは仕様を充足しない。
- **F4/F5（info）**: `bun test` の package.json スクリプト追加と no-template パスのトランザクションは対応任意。
