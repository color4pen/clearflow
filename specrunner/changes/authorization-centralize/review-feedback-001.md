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
| 1 | low | testing | `src/__tests__/` | TC-025〜TC-032（委任 action 層の自己所有権チェック）および TC-038/TC-039（updateDealAction でのフェーズ変更権限検証）は test-cases.md で `must` / `integration` に分類されているが、静的コード検証に留まる自動テストが存在しない。委任の「自身のみ」制約（`delegations.ts:43,75` の `fromUserId === session.user.id` 判定）は実装として正しく、ユニットテストも `canPerform` 呼び出し後のガードを含むが、action 関数そのものの振る舞いを直接検証するテストがない | `delegations.ts` を対象とした静的解析テストを追加し、`fromUserId !== session.user.id` ガードが存在することを検証する（他の静的テストと同じパターン） | no |
| 2 | low | correctness | `src/app/actions/invoices.ts` | `PERMISSION_MATRIX` に `invoice.edit` が定義されているが、`invoices.ts` に `updateInvoiceAction` が存在しないため、当該パーミッションを使うコードパスがない。設計書 3.6「編集」行の権限（admin / finance）は宣言されているが、対応 action が未実装の状態 | 本 PR のスコープ外（action 未実装はプレエグジスティング）であれば変更不要。今後 `updateInvoiceAction` を追加する際に `invoice.edit` を使用すること | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 10 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 9 | 0.10 |
| testing | 7 | 0.10 |

- **total**: 9.05

## Summary

認可ポリシーの一元化リファクタリングとして高品質な実装。

**良かった点**:

- `src/domain/authorization.ts` が設計書 3.1〜3.9 の全 9 ドメインの権限マトリクスを一対一で忠実に実装している。deny-by-default（マトリクスに存在しない組み合わせは `false`）が正しく機能している。
- `canPerform` の呼び出しが全 10 アクションファイルで統一されており、インライン `session.user.role !== "admin" && ...` パターンが完全に排除されている（`delegations.ts` の残存 2 箇所は設計決定 D4 に基づく resource-ownership チェックであり、意図的かつコメントで明示されている）。
- `deals.ts` の `updateDealPhaseAction` / `updateDealAction` が、フェーズ値に応じて `changePhase` と `closePhase` を正しく選択するロジックを実装しており、「受注・失注は admin/manager のみ」という設計の意図を正確に表現している。
- `authorization.test.ts` が 9 ドメイン × 全ロール × 全操作を網羅的にカバーし、設計書との整合を直接検証している。
- 認可失敗メッセージが `"この操作を実行する権限がありません"` に統一され、認証エラー（`"認証が必要です"`）との区別が明確になった。
- build / typecheck / test（596 pass, 0 fail）/ lint すべて green。

**要注意点**:

- Finding #1（low）: 委任の `fromUserId` 自己所有権ガードを直接検証する静的テストが欠落。ロジック自体は正しいが、リグレッション防止の観点でテストがあると望ましい。今 PR のスコープでは code-fixer 対応不要と判断する。
- Finding #2（low）: `invoice.edit` permission は定義済みだが対応 action が未実装。将来の `updateInvoiceAction` 追加時に使用する前提として問題なし。

受け入れ基準は全項目充足を確認。
