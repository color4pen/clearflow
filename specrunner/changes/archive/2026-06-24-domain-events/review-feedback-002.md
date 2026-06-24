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

- **verdict**: approved
- **iteration**: 002

## Resolved Findings from iteration 001

| # | Original Severity | File | Resolution |
|---|-------------------|------|------------|
| F-001 | high | `src/instrumentation.ts` | **FIXED** — 静的 import が動的 import + `NEXT_RUNTIME === "nodejs"` ガードに置き換えられた。`bun run build` で Edge Instrumentation 警告が消滅し、警告ゼロでビルドがグリーンであることを確認。 |

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | low | testing | `src/__tests__/usecases/webhookWorkflow.test.ts` | TC-027（must）と TC-028（must）の静的解析テストが未追加のまま。`webhookHandler.ts` 内で新規ドメインイベント系（`inquiry.*`, `deal.*`, `contract.*`, `invoice.*`）が `deliverToEndpoint` を使用し `deliverWebhookEvent` / `deliverSingleAttempt` を使用しないこと（TC-027）、承認系（`request.*`, `step.*`）が `deliverWebhookEvent` 経由であること（TC-028）の自動検証がない。実装コードは正しいが、将来の退行を自動検知できない。 | `webhookWorkflow.test.ts` に `describe("webhookHandler.ts static analysis")` ブロックを追加し、(1) `webhookHandler.ts` に `deliverSingleAttempt` が含まれないこと、(2) 新規イベント系で `deliverWebhookEvent` が含まれないこと（`deliverDomainEventToEndpoints` 等の内部ヘルパー経由を確認）、(3) 承認系で `deliverWebhookEvent` が呼ばれることを文字列検索で検証する。 | yes |
| 2 | low | maintainability | `src/__tests__/domain/domainEvents.test.ts:96` | テスト名 `"sync handler exception does NOT prevent event from being buffered for other handlers"` が実際の検証内容と逆の意味になっている。コメント（`// the buffer is NOT populated`）とテストロジックは「sync 例外後にイベントがバッファされないこと」を正しく検証しているが、テスト名は「バッファへの蓄積を妨げない」という誤った印象を与える。 | テスト名を `"sync handler exception prevents buffering — async handler does not run after dispatch throws"` など実際の検証内容を反映した表現に修正する。 | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 8 | 0.10 |

- **total**: 8.90

## Summary

iteration 001 で検出された唯一の阻止要因（F-001 high: `instrumentation.ts` が Edge Runtime に `crypto` を静的 import するリスク）が正しく修正されている。現在の `instrumentation.ts` は `await import()` + `NEXT_RUNTIME === "nodejs"` ガードを使用しており、`bun run build` から Edge Instrumentation 警告が完全に消滅した。`bun test` は 591 pass / 0 fail でグリーン。

残る 2 件はいずれも low 重大度であり、実装の正しさを損なわない。

- **F-1（low）**: TC-027/TC-028 は test-cases.md で must 優先度に指定されているが、`webhookHandler.ts` の実装はコード検査で正しいことを確認済み（新規イベントは `deliverToEndpoint`、承認系は `deliverWebhookEvent`、`deliverSingleAttempt` は不使用）。静的解析テストの追加が望ましいが承認のブロック要因ではない。
- **F-2（low）**: テスト名の誤りは可読性の問題のみで機能上の問題ではない。

受け入れ基準の全 must 項目（18 種イベント型定義・ディスパッチャー同期/非同期分離・5 ユースケースへのイベント発行・Webhook 配信のハンドラ統一・WEBHOOK_EVENT_TYPES 18 種拡張）はすべて実装されており、`bun run build && bun test` がグリーン。本変更は **approved** と判定する。
