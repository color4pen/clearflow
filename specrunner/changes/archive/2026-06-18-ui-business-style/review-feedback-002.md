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
| 1 | high | testing | `src/infrastructure/repositories/requestRepository.ts`, `src/app/(dashboard)/requests/statusUtils.ts`, `src/app/(dashboard)/styles.ts` | test-cases.md に計画した automated 7 件が引き続き未実装。TC-021（must）: `RequestWithSteps` 型の静的検証。TC-022（must）: `listRequests` が `RequestWithSteps[]` を返すことの検証（`findAllWithStepsByOrganization` のグルーピングロジックは非自明な新規コード）。TC-008/TC-011/TC-012（should）: statusUtils.ts の各関数の戻り値検証。TC-032/TC-033（should）: styles.ts の定数存在確認。 | (1) `projectStructure.test.ts` に静的ファイル検査テストを追加して TC-021/TC-032/TC-033 をカバー（`request.ts` が `RequestWithSteps` と `ApprovalStepSummary` をエクスポートすること、`styles.ts` が `BTN_PRIMARY_DISABLED` と `SELECT_BASE` を含むことを `readSrc` で検証）。(2) `src/__tests__/ui/statusUtils.test.ts` を新規作成し TC-008/TC-011/TC-012 をカバー（純粋関数のユニットテスト）。(3) TC-022 は実 DB なしでも対応可能: `findAllWithStepsByOrganization` 内の Map ベースグルーピングロジックを `groupRowsToRequestWithSteps(rows)` のような純粋関数として切り出してユニットテストする（複数 request × 複数 step 行が正しく集約されること、step のない request で `approvalSteps: []` が返ることを検証）。切り出しが困難な場合は `projectStructure.test.ts` の静的コード検査で代替し TC-022 を downgrade する。 | yes |
| 2 | low | correctness | `src/app/(dashboard)/requests/BulkApprovalPanel.tsx` | TC-020（should）: 要件 3「アクション（承認/却下）はインラインのテキストリンク（`text-blue-600 text-xs underline`）にする」が未実装。一覧テーブルにアクション列が存在せず、一括承認チェックボックスのみで提供されている。tasks.md T-05 のチェックリストにも記載がないため、スコープ外として明示的に除外されたかどうか不明。 | 次のいずれかで対処する。(A) テーブルに「アクション」列を追加し、`status === "pending"` の行に承認・却下の Server Action を呼び出すインラインテキストリンクを `text-blue-600 text-xs underline` スタイルで表示する。(B) スコープ外とする場合は tasks.md T-05 に「アクション列は今回スコープ外（一括承認で代替）」と明記し、test-cases.md の TC-020 を `could` 以下に降格する。 | yes |
| 3 | low | maintainability | `specrunner/changes/ui-business-style/design.md` | design.md D5 に「設定リンクも全ロールに表示する」と残っているが、spec.md Requirement 1・tasks.md T-03・実装（`layout.tsx`）はいずれも admin のみ表示。ドキュメント内の不整合。実装は正しい。 | design.md D5 の「設定リンクも全ロールに表示する」を「設定・監査ログリンクは admin のみ表示する（settings/layout.tsx が非 admin を /requests にリダイレクトするため全ロール表示は機能しない）」に修正する。 | no |

## Notes

- `src/app/(dashboard)/requests/[id]/page.tsx:51` の `rounded-full` はステップ順番号（`{step.stepOrder}`）を丸バッジで表示するためのものであり、ステータス表示に関連しない。受け入れ基準「ステータス表示に関連する箇所に `rounded-full` が使われていない」に違反しない。
- build / typecheck / lint / test は前回に引き続き全 green（verification-result.md 参照）。
- 実装の品質自体は高く、受け入れ基準（ヘッダー圧縮・statusUtils.ts 集約・styles.ts 定数・SettingsNav Client Component 化・findAllWithStepsByOrganization による N+1 回避・フッター統計）はすべて達成されている。

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 8 | 0.30 |
| security | 8 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 7 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 3 | 0.10 |

- **total**: 7.55

## Summary

実装の内容は前回レビュー（iteration 001）から変更なし。F-001（高優先度テスト不足）および F-002（インラインアクション列またはスコープ外の明示）は引き続き未対応。

ブロッカーは testing カテゴリのみ。特に `findAllWithStepsByOrganization` の Map ベースグルーピングロジックは非自明な新規コードパスであり、テストなしで本番に入れるリスクが高い。TC-021/TC-022 は must 優先度のため対応必須。TC-008/TC-011/TC-012/TC-032/TC-033 は should だが純粋関数かつ静的検査で容易にカバーできるため同時に対応を推奨する。

F-002（TC-020）については、実装するか tasks.md/test-cases.md でスコープ外を明示するかのいずれかで解消できる。

