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
| 1 | LOW | Completeness | tasks.md T-11 | **T-11 に `dispatch()` を `runInContext` スコープ外で呼び出した場合のエラースロー検証が含まれていない。** T-02 は「`runInContext` スコープ外で呼び出した場合はエラーをスローする」と定義しているが、T-11 のテスト一覧にこの境界ケースのテストが明記されていない。本番ユースケースはすべて `runInContext` 内で `dispatch()` を呼ぶため実害は生じにくいが、実装者が `dispatch()` のガード条件を省略しても気づかれないリスクがある。 | T-11 のテスト一覧に「`runInContext` スコープ外で `dispatch()` を呼び出すとエラーがスローされること」を追加する。実装コストは低い（`expect(() => dispatcher.dispatch(event)).toThrow()` で検証可能）。 |
| 2 | LOW | Ambiguity | tasks.md T-05 | **ハンドラ登録初期化の方式 A / B の選択が実装者に委ねられている。** T-05 は「方式 A（`instrumentation.ts`）または方式 B（モジュール副作用）のいずれかを採用する」と記載しており、どちらを採用するかを未決定のまま実装者に委ねている。AGENTS.md が「Next.js 16 の API は破壊的変更を含む可能性がある」と警告していることを踏まえると、`instrumentation.ts` の挙動がトレーニングデータと異なる場合、実装者が動作確認なしに方式 A を選ぶと initialization が呼ばれない可能性がある。 | 実装者が `node_modules/next/dist/docs/` で `instrumentation` フックの動作を確認してから方式を決定することを T-05 に補足する。既知の動作が確認できれば方式 A を推奨する旨を明記してもよい（本レビュー時点では仕様レベルで決定する情報が不足しているため、実装時判断で問題ない）。 |

## Review Summary

spec-review-003 で指摘された 4 件の findings（HIGH 2 件、MEDIUM 2 件）はすべて解消されている。

**spec-review-003 Finding #1（HIGH）解消確認**: T-04 は新規ドメインイベントの配信に `deliverToEndpoint` を使用するよう更新済み（L94）。`deliverSingleAttempt` はリトライ専用であり使用不可という理由説明も追記された。Acceptance Criteria（L105）に「`deliverSingleAttempt` が新規ドメインイベントの配信に使用されていない」という否定検証も明記されており、実装者が誤った関数を使う余地がない ✅

**spec-review-003 Finding #2（HIGH）解消確認**: T-02 に `runInContext<T>(callback: () => Promise<T>): Promise<T>` が追加され（L43）、`AsyncLocalStorage` によるリクエストスコープ分離が API レベルで仕様化された。T-06〜T-09 はすべてユースケース全体を `dispatcher.runInContext(async () => { ... })` で囲む実装パターンに更新されており、並行リクエスト間のバッファ汚染が構造的に防止される ✅

**spec-review-003 Finding #3（MEDIUM）解消確認**: T-06〜T-09 から null リターン時の明示的 `discardBuffer()` 呼び出し指示が削除され、「`runInContext` スコープ終了時に自動破棄」に一本化された（例: T-06 L130, L140）。design.md D3 との整合が取れている ✅

**spec-review-003 Finding #4（MEDIUM）解消確認**: T-06〜T-09 の例外パターンが「例外の再スローは行わない。既存のエラーハンドリング規約（`{ ok: false, reason: ... }` を返す）を維持する」に統一された（例: T-06 L132）。design.md D3 の記述とも一致している ✅

新規 findings は LOW 2 件のみ。いずれも実装時の参照情報・軽微なテスト補足であり、仕様の整合性・正確性には影響しない。

セキュリティ評価: 前回レビューからの変更に起因する新規セキュリティリスクはなし。HMAC 署名（`deliverWebhookEvent` / `deliverToEndpoint` 経由）は新旧いずれの配信経路でも維持される。`organizationId` / `actorId` はセッション由来で外部入力から注入されない。ドメインイベントの `payload` は内部ドメインオブジェクトから構築されるため、OWASP Top 10 上の新規リスクは確認されない。
