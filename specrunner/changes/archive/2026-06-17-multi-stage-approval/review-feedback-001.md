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
| 1 | high | correctness | `src/application/usecases/approveRequest.ts` | **多段階承認パスでリクエストステータスのガードが欠落**。0-step パス（行 40）では `validateTransition(existing.status, "approved")` を呼び出してステータスを検証するが、1-step 以上の多段階パス（行 82 以降）には同等の検証がない。`revision` 状態のリクエストに承認待ちステップが残っている場合（例: 3 ステップ中 step2 差し戻し → step3 が pending のまま）、`approveRequest` を呼び出すと step3 が DB 上で `approved` に更新される。戻り値は `{ ok: true, request: existing }` となり `request.status === "revision"` のままだが、`approval_steps` テーブルは不整合状態に陥る。UI の承認ボタンは `pending` 時のみ表示するが、Server Action は直接呼び出せるため実際に起こりうる。 | 行 37 の `steps` フェッチ直後（`steps.length === 0` 分岐の前）に `if (existing.status !== "pending") { return { ok: false, reason: \`Cannot approve request in "${existing.status}" state.\` }; }` を追加する。これにより 0-step パスの `validateTransition` チェックと同等のガードが多段階パスにも適用される。 | yes |
| 2 | medium | security | `src/infrastructure/repositories/approvalStepRepository.ts` | **`resetSteps` 関数に `organizationId` 条件が欠落**。TC-026 および T-05 AC は「全関数にテナント分離（organizationId 条件）を適用すること」を要求しており、テストケース TC-026 にも `resetSteps` が明示的に列挙されている。現実装の WHERE 句は `requestId` と `stepOrder` のみ。`requestId` は UUID のため他テナントのレコードを誤って変更する実害は極めて低いが、ポリシー上の違反であり防御的設計の観点からも修正が必要。 | 関数シグネチャに `organizationId: string` 引数を追加し、WHERE 句に `eq(approvalSteps.organizationId, organizationId)` 条件を追加する。呼び出し元の `resubmitRequest.ts` で `data.organizationId` を渡すよう修正する。 | yes |
| 3 | low | testing | `specrunner/changes/multi-stage-approval/verification-result.md` | **`bun test` フェーズがスキップされ、受け入れ基準「bun test が全件 green」が未検証**。verification-result.md では `typecheck` と `test` フェーズがともに "skipped — script not found in package.json" で省略されている。`bun test` はスクリプト定義なしで実行可能（Bun ネイティブのテストランナー）なため、package.json への `"test": "bun test"` エントリ追加で CI 検証が可能になる。テストコードを確認した限り実装上の問題は見られないが、実行されていないため保証がない。 | `package.json` の `scripts` に `"test": "bun test"` を追加し、`bun test` を手動実行して全件 green を確認する。 | yes |
| 4 | low | correctness | `src/application/usecases/approveRequest.ts` | **ステップ一覧がトランザクション外でフェッチされている（TOCTOU）**。`findByRequestId`（行 33–36）はトランザクション開始前に呼ばれており、同一リクエストの並行承認が起きた場合、`isAllApproved(updatedSteps)` の楽観的計算が古いスナップショットに基づき誤った結果を返す可能性がある。具体的には、step1 が別のセッションで承認済みになった後でも「全ステップ未承認」と判断し `approved` 遷移が行われないケースが生じうる。承認フローの性質上、同一ステップへの並行承認は実運用では稀だが、厳密な正確性のためにはトランザクション内でフェッチすべき。 | `approvalStepRepository.findByRequestId` の呼び出しを `db.transaction` 内に移動し、`tx` を渡す形に変更する（`rejectRequest.ts` や `resubmitRequest.ts` の実装が参考になる）。 | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 7 | 0.30 |
| security | 8 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 9 | 0.10 |
| testing | 8 | 0.10 |

- **total**: 8.05

## Summary

全体として設計の完成度は高い。ドメイン層のクリーンな分離（`approvalStepService.ts` の純粋関数群）、`validateTransition` を一元化した状態遷移ルール、トランザクション境界の一貫した管理、監査ログの網羅的な記録はすべて適切に実装されている。`RequestStatus` への `revision` 追加、`approval_steps` / `approval_templates` テーブルの定義、再申請時の部分リセットロジックも spec 通りに実装されており、受け入れ基準の大半は充足している。

主要な修正点は Finding #1（高優先度）のみ。`approveRequest` 多段階パスにおけるステータスガード欠落は、`revision` 状態のリクエストに対して承認ステップを更新できてしまうデータ整合性の問題であり、必ず修正が必要。Finding #2 の `resetSteps` の `organizationId` 追加は実害は薄いが spec 要件への適合のために修正する。Finding #3 は CI 設定の補完、Finding #4 はトランザクション設計の厳密化でいずれも軽微。
