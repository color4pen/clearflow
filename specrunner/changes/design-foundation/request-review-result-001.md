# Request Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approve | needs-discussion | reject
  - approve:          No blocking findings (no HIGH, no decision-needed). Request is ready for pipeline execution.
  - needs-discussion: One or more blocking findings (HIGH or decision-needed) resolvable through discussion.
  - reject:           Multiple blocking findings AND requirement contradictions or structural breakdown.
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | Location | Description | Recommendation
- Valid Severity values (uppercase): HIGH | MEDIUM | LOW
  - HIGH:   Request-level defect — goal unclear, acceptance criteria absent/untestable, or critical external constraint unspecified
  - MEDIUM: Scope ambiguity, recommended additions
  - LOW:    Clarity improvements, expression refinements
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approve

## Findings

| # | Severity | Category | Location | Description | Recommendation |
|---|----------|----------|----------|-------------|----------------|
| 1 | MEDIUM | Test maintenance | `src/__tests__/domain/statusUtils.test.ts` | `statusClass()` の各テストケースが `"text-[#2980b9]"` 等の hardcoded hex を期待値として固定している。実装で `statusClass()` を廃止して `StatusBadge` に移行する場合、テストの「期待値更新」ではなく関数ごと削除・再作成になる。受け入れ基準の「クラス名固定テストの期待値追随は可」が関数廃止ケースも含むか明記されていない。 | 実装時は `statusClass()` を削除し、対応テストは `StatusBadge` の variant テストで代替する方針として進めてよい。受け入れ基準の「期待値追随は可」はこの解釈を包含すると判断する。 |
| 2 | LOW | Scope boundary | `BulkApprovalPanel.tsx` L146–153 | 一括承認の結果フィードバック alert（`bg-green-50 border-green-300 text-green-800` 等）が raw Tailwind を使用している。これらは申請ステータス enum の表示ではなく操作結果の一時通知であり、スコープ外と読めるが明示されていない。 | 一時フィードバック alert は「状態 enum の色表示」に該当しないため対象外として扱う。実装者への補足として request.md の 要件4 末尾注記に「通知・フィードバック alert は対象外」と一言あれば明確になる。 |
| 3 | LOW | Scope boundary | `contracts/[id]/InvoiceSection.tsx` `ProgressBarSummary` | 入金進捗バーが `bg-green-500` / `bg-blue-500` / `bg-gray-200` を直書きで使用している。請求ステータスの意味論と関係するが、バッジではなくチャート視覚要素であり、スコープ内か曖昧。 | 進捗バーは "薄背景＋濃文字バッジ体系" の対象外（チャート要素）と判断して現状維持を推奨する。凡例ドット（`bg-green-500 mr-1` 等）も同様。 |
| 4 | LOW | Implementation hint | `DealPhaseStepper.tsx` L127–135 | 終端フェーズ（won / lost / passed）の表示 span が `bg-green-50 text-green-700 border-green-300` 等を使用しており、要件4「案件フェーズ (deals 詳細ヘッダ・関連表示)」の対象。一方、同コンポーネント内のパイプライン進行ボタン群（"受注にする" 等）は選択 UI であり対象外。 | `isTerminal` ブロックの表示 span のみを `StatusBadge` に置き換える。パイプラインボタン・アクションボタンは挙動維持のため現状維持。 |
| 5 | LOW | Token completeness | `src/app/globals.css` dark section | `--border-success-light`（`:root` 値 `#cde6d8`）が `[data-theme="dark"]` セクションに存在せず、request.md のトークン表にも dark 値の指定がない。新設 `--bg-success-light` dark 値（`#14532d`）に対してボーダーが light 値のまま残り、コントラスト不整合が生じる可能性がある。 | `[data-theme="dark"]` に `--border-success-light: #166534;`（green-700 相当）を追加することを推奨する。 |
