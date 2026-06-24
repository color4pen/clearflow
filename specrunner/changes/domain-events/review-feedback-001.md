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
| 1 | high | correctness | `src/instrumentation.ts` | `register()` が Node.js 専用モジュール（`crypto`）を静的 import 経由で Edge Runtime に読み込む。Next.js docs によると `instrumentation.ts` は Node.js と Edge Runtime の両方で実行される。ビルドログに "Edge Instrumentation" トレース（`instrumentation.ts → handlers/index.ts → webhookHandler.ts → webhookDelivery.ts`）が新規追加されており、Edge Runtime での実行時クラッシュのリスクがある。 | 静的 import を削除し、`NEXT_RUNTIME === "nodejs"` ガード付きの動的 import に置き換える: `export async function register() { if (process.env.NEXT_RUNTIME === "nodejs") { const { registerHandlers } = await import("@/infrastructure/handlers"); registerHandlers(); } }` | yes |
| 2 | low | testing | `src/__tests__/usecases/webhookWorkflow.test.ts` | must 優先度の TC-027（新規ドメインイベントが `deliverToEndpoint` を使用し `deliverWebhookEvent` / `deliverSingleAttempt` を使用しない）と TC-028（承認系が `deliverWebhookEvent` 経由で `actorName` を解決する）に対応する自動テストが存在しない。コード検査で正しい実装を確認済みだが、将来の退行を自動検知できない。 | `webhookWorkflow.test.ts` に `webhookHandler.ts` の静的解析テストを追加: 新規イベント系で `deliverWebhookEvent` が含まれないこと、承認系で `deliverWebhookEvent` が含まれることを文字列検索で検証する。 | yes |
| 3 | low | maintainability | `src/__tests__/domain/domainEvents.test.ts` | L96 のテスト名 `"sync handler exception does NOT prevent event from being buffered for other handlers"` が誤解を招く。実際のテストは「sync 例外発生後にイベントがバッファされず async ハンドラが実行されないこと」を検証しており、テスト名と逆の意味になっている。 | テスト名を `"sync handler exception prevents buffering — async handler does not run"` など正確な表現に修正する。 | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 7 | 0.30 |
| security | 8 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 7 | 0.10 |

- **total**: 7.85

## Summary

ドメインイベント基盤の実装は全体的に高品質。AsyncLocalStorage によるリクエストスコープのバッファ分離、2 フェーズ実行モデル（dispatch → flushAsync）、承認系ユースケースからの `deliverWebhookEvent` 完全除去、すべてが仕様どおり正しく実装されている。受け入れ基準はすべて満たされており、591 テストが green。

唯一の阻止理由は F-001 のみ。`instrumentation.ts` が Node.js 専用モジュール（`crypto`）を Edge Runtime に静的 import するパターンは、Next.js 公式ドキュメントが明示的に警告するアンチパターンであり、Edge Runtime を利用する構成でデプロイした際に実行時クラッシュが発生する。修正は1ファイル・数行のみ。

