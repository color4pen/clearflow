# Spec Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:    specification is complete, consistent, and ready for implementation
  - needs-fix:   specification has issues that must be resolved before implementation
  - escalation:  unresolvable conflicts, missing context, or requires human judgment
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | File | Description | How to Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
  - CRITICAL: production outage, data loss, security breach
  - HIGH:     functional failure, clear bug, no workaround — blocks approval
  - MEDIUM:   quality degradation, maintainability issue, future risk
  - LOW:      informational, style, minor improvement
- If no findings, write a table row with "None" or omit the table body.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approved

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | LOW | Test Coverage Gap | tasks.md T-08 | **T-08 が「将来日付の paidAt が拒否される」Scenario を検証していない。** spec.md の "Requirement: 入金記録に入金日が必要な場合のバリデーション" には MUST 規約付きの Scenario（`paidAt: "2099-12-31"` → MCP 層で `isError: true`、usecase は呼ばれない）が存在する。T-02 の実装仕様にも「`paidAt > todayJST` なら `toToolError` を返す」と明記されているが、T-08 はこの Scenario に対応する behavioral test を含まない（paidAt の Date 変換と undefined 伝播のみ検証）。承認ブロックではない理由: test-case-gen ステップが spec.md の Scenario から当該テストを生成するため、テストカバレッジは担保される。ただし tasks.md が不完全であり、実装者がタスク定義のみを参照した場合に見落とすリスクがある。 | T-08 の acceptance criteria に「`paidAt: "2099-12-31"` を指定した場合 `isError: true` が返り `updateInvoiceStatus` usecase が呼ばれないことを assert する」を追記し、T-08 のテストリストに 1 bullet 追加する（必須ではないが推奨）。test-case-gen が Scenario から生成するため、spec.md の変更は不要。 |
| 2 | LOW | Acknowledged Security Debt | design.md D10 / src/application/usecases/createInvoice.ts, updateInvoice.ts | **`createInvoice` / `updateInvoice` の catch ブロックが `err.message` をそのまま `reason` に設定しており、DB インフラエラー文字列が MCP クライアントに漏れる経路が残る。** D10 はこれを「ビジネスエラーと DB インフラエラーが catch で区別されないリスク」として明示的に記述し、将来の `UsecaseBusinessError` クラス導入を示唆している。実コードを確認: `createInvoice.ts:83-87` が `err instanceof Error ? err.message : "請求の作成に失敗しました"` を返す。PostgreSQL の "duplicate key value violates unique constraint …" や "Connection refused to localhost:5432" 等のインフラエラーが発生した場合、そのまま MCP クライアントに送出される。承認ブロックではない理由: (a) D10 が現状を正確に記述しており spec は一貫している; (b) 対象は 2 usecase（createInvoice / updateInvoice）に限定される; (c) spec.md の "エラー変換で内部詳細を漏らさない" Requirement の Scenario はツール外側 catch 経路（`handleToolError`）を対象とし、usecase 内部 catch 経路は D10 の例外事項として明記されている; (d) 情報漏洩はスキーマ詳細開示に留まり、データ窃取や SQL インジェクションには直結しない。 | 本 request のスコープ外であることが確認済み。将来の request で `UsecaseBusinessError` 等を導入してビジネス例外とインフラ例外を区別すること（D10 の推奨に従う）。実装者への注記: T-13 のテストは `createContract`（固定文言パス）を検証対象としており、`createInvoice` の `err.message` パスは別途テストしない — これは意図的な決定（D10 参照）。 |

## Summary

spec-review-001 の 2 件の指摘（HIGH: D10 前提の不正確さ、LOW: paidAt 将来日付バリデーションの欠落）がいずれも正確に修正されたことを確認した。

**review-001 HIGH 指摘の解消確認**: 実コードを全数検査した結果、`createContract` / `updateContract` / `updateContractStatus` / `deleteContract` / `updateInvoiceStatus` / `setRevenueTarget` / `updateRevenueTarget` / `deleteRevenueTarget` の catch ブロックは匿名 catch（`catch { return { ok: false, reason: "固定文言" } }`）を使用しており、DB エラー文字列は `reason` に混入しない。D10 の記述はこの実態と一致する。`createInvoice` / `updateInvoice` が `err instanceof Error ? err.message : "..."` パターンを維持することも D10 で正確に説明されており、spec の一貫性が保たれている。T-13 のテストシナリオも「usecase が throw する」から「usecase が `{ ok: false, reason }` を return する（固定文言）」に修正されており、実際のコードパスを正しく検証する設計になっている。

**review-001 LOW 指摘の解消確認**: spec.md に「`paidAt` が指定された場合、MCP ツールレイヤーで本日以前（JST）の日付であることを検証する MUST」が追記され、Scenario「将来日付の paidAt が拒否される」が追加されている。T-02 実装仕様にも `todayJST` 算出と `toToolError` 返却が明記されている。

**spec 全体評価**: 8 つの Requirement は Given/When/Then 形式で記述され、SHALL/MUST の normative keyword が適切に付与されている。認可マトリクス（contract: admin/manager/finance、invoice: admin/finance、revenue view: ALL_ROLES、setTarget: admin/manager）は `domain/authorization.ts` の実装と一致する。楽観的ロック衝突は全 update 系 usecase で「version 不一致 → repository が null を返す → 固定メッセージ」の経路で処理されており、D6 の設計と整合する。revenue 読み取り系 usecase（`getRevenueDashboard` / `getRevenueDetails` / `getRevenueForecast`）は内部 catch を持たないため、DB 例外はツール外側 catch（`handleToolError`）で正しくマスクされる。14 タスクはコードベース構造と整合しており、実装に必要な情報（import パス・スキーマ・認可操作名・エラー変換方針）が過不足なく記述されている。残存する 2 件の LOW 指摘は承認ブロックではなく、実装フェーズで対応可能。
