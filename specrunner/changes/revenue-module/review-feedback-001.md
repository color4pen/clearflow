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
| 1 | medium | correctness | `src/application/usecases/getRevenueForecast.ts` | 複数目標が存在する場合に `actualAmount` が全期間合計で共有される。たとえば Q1・Q2 の 2 目標がある場合、両方とも年間実績合計が `actualAmount` に入るため進捗率が不正確になる。`totalActual` は 1 つの期間合計として算出されているが、各目標の `actualAmount` はその目標の `periodStart`〜`periodEnd` 内の実績のみで算出すべき。 | `monthlyRevenue`（月次データ）を各目標の `periodStart`〜`periodEnd` でフィルタして合算する。`periodTargets.map` 内で `monthlyRevenue.filter(m => targetPeriodContains(m.yearMonth, target)).reduce(sum + amount, 0)` のように per-target actual を算出する。 | yes |
| 2 | low | testing | `src/__tests__/domain/revenueUsecaseValidation.test.ts` | TC-021（`updateRevenueTarget` が存在しない ID でエラーを返す）のテストが疑似テストになっている。ローカル変数 `const existing = null` を直接評価しているだけで、実際の `updateRevenueTarget` 関数を呼び出していない。関数の実動作は検証されていない。 | `updateRevenueTarget` 関数を `findById` をモックした状態で直接呼び出してテストする（`setRevenueTargetInline` と同様のインライン依存注入パターン、または実際の usecase のモック差し替え）。 | yes |
| 3 | low | maintainability | `src/infrastructure/repositories/revenueTargetRepository.ts` | `findOverlapping` 内の `excludeId` 除外条件で raw SQL テンプレート `sql\`${revenueTargets.id} != ${excludeId}\`` を使用している。Drizzle ORM には型安全な `ne()` ヘルパーが存在する。 | `import { ne } from "drizzle-orm"` を追加し、`conditions.push(ne(revenueTargets.id, excludeId))` で置き換える。 | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 7 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 7 | 0.10 |

- **total**: 8.00

## Summary

全体的に高品質な実装。要件をすべてカバーし、レイヤードアーキテクチャに忠実で、セキュリティ（認証・認可・レート制限・CSV インジェクション対策）も適切に実装されている。ビルド・型チェック・テストもすべて green。

主要な指摘は 1 件（medium）：`getRevenueForecast` において複数の売上目標が存在する場合、各目標の `actualAmount` が期間全体の実績合計で共有されてしまい、個別の進捗率が不正確になる。「案件フェーズ × 月次実績データ」はすでに `monthlyRevenue` として月別に取得済みのため、各目標の `periodStart`〜`periodEnd` でフィルタして合算するだけで修正できる。

その他は低優先度の改善点（テストの疑似実装、Drizzle 型安全ヘルパーの未使用）のみで、機能への影響はない。critical/high ゼロのため verdict は **approved**。
