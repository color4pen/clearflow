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
| 1 | medium | testing | src/__tests__/usecases/approvalDeadline.test.ts | usecase 統合テスト（TC-008/012/013/015/016/020-023/025）が全て静的ソース解析（ファイル読み込み＋文字列マッチ）で実装されており、実際のランタイム動作を検証しない。実装の配線ミス（例: `isStepExpired` 呼び出しはあるが戻り値を無視）があってもテストが通るため偽の安心感を生む | bun:test のモック機能（`mock()`）でリポジトリを差し替える軽量スタブパターンを導入し、少なくとも TC-008/012/013 の承認・却下拒否とTC-015/016 の expireOverdueRequests をランタイム呼び出しで検証するテストに置き換える | yes |
| 2 | low | testing | src/__tests__/domain/approvalStepService.test.ts | テスト名 `"returns true when deadline equals now (boundary: not strictly future)"` が期待値（`false`）と矛盾している。コメントは正しいが、テスト名を読んだだけでは期待値が分からない | テスト名を `"returns false when deadline equals now (strict less-than boundary)"` に修正 | yes |
| 3 | low | testing | src/__tests__/usecases/approvalDeadline.test.ts | `"checks deadline in rejected path before transaction"` テストが `src.indexOf("この承認ステップの期限が切れています")` で最初の出現位置（revision パス TX 内、line ~55）を取得しており、rejected パスの pre-check（line ~148）の位置ではなく revision パスの位置で検証している。テストは通るが検証対象と意図がズレている | `src.lastIndexOf("この承認ステップの期限が切れています")` で最後の出現（rejected pre-check）を取得するか、`src.indexOf("preCurrentStep && isStepExpired")` のような rejected パス固有のコードパターンで位置を検証する | yes |
| 4 | low | performance | src/infrastructure/repositories/approvalStepRepository.ts | `findOverdueRequestIds` が `new Date()` でアプリサーバ側のタイムスタンプを生成して比較している。アプリサーバと DB サーバで時刻ズレが発生した場合、処理対象件数に微小なズレが生じる可能性がある | `lt(approvalSteps.deadline, sql\`NOW()\`)` に変更して DB サーバの時刻を基準にする | yes |
| 5 | low | maintainability | src/infrastructure/seed.ts | seed 内で直接挿入する pending 申請（150,000 円：高額テンプレート対象）の approval_steps に `deadline` が設定されていない。`createRequest` usecase を経由しないためdeadline 算出がバイパスされており、シードデータが実運用時のデータ形状と乖離している | シード直接挿入のステップに `deadline` 値（例: `new Date(Date.now() + 72 * 60 * 60 * 1000)`）を追加するか、`createRequest` 経由でシード申請を作成するようリファクタリングする | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 7 | 0.10 |

- **total**: 8.60

## Summary

実装は全要件を正しく満たしている。ドメインモデル（`expired` 終端状態、`deadline` フィールド）、状態遷移ルール、`isStepExpired` ドメインサービス、`approveRequest`/`rejectRequest` の pre-check + TX 内 re-check（TOCTOU 防止）、`expireOverdueRequests` usecase、cron エンドポイントの `timingSafeEqual` 認証、UI の残り時間表示、seed / `.env.example` の更新、Drizzle マイグレーションいずれも仕様に沿って実装されている。アーキテクチャの依存方向（actions → usecases → domain / infrastructure）も遵守されている。

主要な懸念は usecase 統合テストの品質で、全て静的ソース解析（ファイル読み込み＋文字列マッチ）で実装されており、ランタイムの振る舞いを検証していない（Finding #1: medium）。ドメイン層の単体テスト（`requestTransition.test.ts`、`approvalStepService.test.ts`）は適切にランタイム検証されており、コアロジックの正確性は担保されている。その他の所見（Finding #2-#5）は低優先度の改善点である。

critical/high の所見がないため verdict は **approved**。
