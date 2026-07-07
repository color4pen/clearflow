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
| 1 | medium | testing | `src/__tests__/mcp/mcpApprovalRequestsApprove.dynamic.test.ts` | TC-017（must）未カバー: `sanitizeApprovalReason` の「未知エラー→固定文言」パスが behavioral test で固定されていない。T-07 は `KNOWN_APPROVAL_REASONS` に含まれる既知メッセージのパス（そのまま通す）を検証するが、DB エラー文字列などの未知メッセージが「操作を完了できませんでした」に変換されることを確認する test がない。実装の sanitize ロジック自体は正しい。 | `approveMode: "db_error"` のモックパターンを追加し、`approveRequest` が `{ ok: false, reason: "DB connection error: ECONNREFUSED" }` を返すとき、ツール結果が `"操作を完了できませんでした"` を含み、DB エラー詳細を含まないことを assert するテストケースを追加する。 | yes |
| 2 | medium | testing | `src/__tests__/mcp/mcpApprovalAuthz.dynamic.test.ts` | TC-032（must）未カバー: delegations.list で admin/非admin のフィルタリング挙動が behavioral test で固定されていない。実装（`role === "admin" ? 全件 : fromUserId === userId のみ`）は正しいが、この挙動を実行検証するテストが存在しない。T-02 のタスク受け入れ基準「list で admin 以外は自身の委任のみ返される」が test で固定されていない。 | `listDelegations` をモックし、自分以外の fromUserId を持つ委任を含むデータを返す状態で manager ロールで list を呼び、自身の委任のみが返されることを assert するテストを追加する。admin ロールでは全件返ることも assert する。 | yes |
| 3 | medium | testing | `src/__tests__/mcp/mcpApprovalAuthz.dynamic.test.ts` | TC-033（must）未カバー: delegations.deactivate で非admin が他人の委任を無効化しようとした場合の拒否が behavioral test で固定されていない。実装（`findByOrganization` で取得→ `fromUserId !== userId` なら拒否）は正しいが、この認可チェックを実行検証するテストが存在しない。T-02 タスク受け入れ基準「admin 以外の deactivate で他人の委任が拒否される」が test で固定されていない。 | `approvalDelegationRepository.findByOrganization` をモックして他人の委任を返す状態で manager ロールの deactivate を呼び、`isError=true` で拒否され `deactivateDelegation` usecase に到達しないことを assert するテストを追加する。自身の委任では usecase に到達することも合わせて検証する。 | yes |
| 4 | low | testing | `src/__tests__/mcp/mcpApprovalRequestsList.dynamic.test.ts` | TC-005（should）未カバー: `filter="all"` を member ロールで呼んだ場合に空配列が返されることがテストされていない（design.md D2 の非対称挙動）。TC-006（should）未カバー: `statusFilter` による追加絞り込みもテストされていない。 | filter=all/statusFilter のテストを T-06 describe ブロックに追加する。優先度 should のため fixer の判断に委ねる。 | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 8 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 9 | 0.10 |
| testing | 7 | 0.10 |

- **total**: 8.55

## Summary

### 総評

実装品質は高い。mcp-server-core（#158）で確立した「リソース単位＋operation 引数・個別 import モック・外側 catch で handleToolError」のパターンを 4 ツールすべてで忠実に踏襲しており、設計の一貫性が保たれている。

### 実装の確認事項（全て正常）

- `organizationId` は全 operation で `authInfo.extra` からのみ取得しており、ツール引数から受け取っていない（テナント分離 ✅）
- `canPerform` による認可チェックが全 operation で usecase 呼び出し前に実施されている（✅）
- `sanitizeApprovalReason` が approve/reject/submit/resubmit の `result.reason` に適用され、KNOWN_APPROVAL_REASONS 以外の文字列は固定文言に変換される（実装 ✅）
- delegations.create の fromUserId チェック（admin 以外は自分自身のみ）が正しく実装されている（✅）
- delegations.deactivate の ownership チェック（admin 以外は自身の委任のみ）が正しく実装されている（✅）
- formData のテンプレートフィールド検証（required / number / select）が実装されており、usecase 到達前に弾く（✅）
- steps の stepOrder 自動付与（index + 1）が create/update 両方で機能している（✅）
- bulk_approve の上限 20 件は Zod スキーマの `.max(20)` で担保されており usecase 到達前に弾く（✅）
- approvalPolicies.create/update の conditionField superRefine が Server Action と同一ロジックで実装されている（✅）
- 全 operation の catch で `handleToolError` を使用しており、予期しない例外が固定メッセージに変換される（✅）
- バレルをモックせず個別ファイルをモック、`afterAll` で復元（#158 必須事項 2 準拠 ✅）
- verification: build/typecheck/test/lint 全フェーズ passed（1852 tests green ✅）

### request.md 受け入れ基準の対応状況

| 受け入れ基準 | テスト | 結果 |
|---|---|---|
| 承認者資格（ロール・指名・有効な委任）どおりの絞り込み | T-06（manager/finance/member 各ロールで action_required フィルタ検証） | ✅ |
| 順序外のステップ承認が拒否されること | T-07（usecase が ok:false を返すとき isError になる） | ✅ |
| 資格のないユーザーの承認・却下が拒否されること | T-08（member ロールで approve/reject/bulk_approve 拒否、admin/finance で到達） | ✅ |
| システム連動申請の承認で後続アクションが実行されること | T-09（originType=system の approve 成功、usecase 共有を実行検証） | ✅ |
| bulk_approve が個別承認と同一の判定・記録になること | T-10（bulkApprove usecase が正しい引数で呼ばれ、mixed 結果が返される） | ✅ |
| 書き込みが監査ログに記録され、他テナントに触れられない | T-11（全 4 ツールで org-A/org-B のテナント分離を実行検証） | ✅ |
| typecheck && test green・aozu check exit 0 | T-14（verification passed） | ✅ |

### 残存テストギャップ（medium × 3、low × 1）

TC-017（sanitize 未知エラー）・TC-032（delegations list フィルタ）・TC-033（delegations deactivate ownership）の 3 件はいずれも `must` 優先度の test-cases.md テストケースだが、現在の test suite にカバーが存在しない。実装自体はコードレビューで正確性を確認済み。テストを追加することで将来のリグレッション防止が担保される。
