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

- **verdict**: needs-fix

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | HIGH | Requirement contradiction | design.md D3 / tasks.md T-04 | `design.md` D3 の Rationale は「リトライ時は attempts をリセットし、`deliverToEndpoint` の exponential backoff を最初から適用する」と記述し、`tasks.md` T-04 の受け入れ基準にも「リトライ実行後に exponential backoff が適用される」とある。しかし `request.md` 要件3は「手動で1回のみ再試行できる（exponential backoff は適用しない）」と明示しており、`request-review-result-002.md` でも iteration 1 の MEDIUM 指摘が「解消確認」と記録されている。設計が要件を上書きした状態になっており、実装者は design.md に従って全4回試行を実装してしまう。 | `design.md` D3 の実装方針を修正し、手動リトライでは `deliverToEndpoint` を再利用せず単発1回の fetch のみ行う方式に変更する（例: `deliverToEndpoint` に `maxAttempts: 1` オプションを渡す、または `webhookDelivery.ts` に `singleRetry(endpoint, payload, deliveryId)` 関数を追加する）。D3 の Rationale を「手動リトライは1回のみ、exponential backoff 不適用」に改める。`tasks.md` T-04 の受け入れ基準「リトライ実行後に exponential backoff が適用される」を「単発1回のみ試行される」に修正する。 |
| 2 | MEDIUM | Spec incompleteness | spec.md | 手動リトライが「1回のみ」かつ「exponential backoff なし」であることを明示した Requirement/Scenario が `spec.md` に存在しない。現状の「Requirement: 手動リトライが admin ロールのみ実行可能」は認可のみを記述しており、試行回数の振る舞いが欠落している。test-case-gen と implementer が spec.md のみを参照した場合、単発リトライの制約が伝わらない。 | `spec.md` に「Requirement: 手動リトライは1回のみ試行され exponential backoff は適用されない」を追加する。Scenario として「admin が手動リトライを実行した場合、リトライは1回のみ行われ終了後 nextRetryAt が null になる」を Given/When/Then 形式で記述する。 |
| 3 | MEDIUM | Security (CWE-1236) | tasks.md T-07 | `escapeCsvValue` はカンマ・ダブルクォート・改行の CSV 構造的エスケープのみを定義しているが、Excel の数式インジェクション（Formula Injection）への対策がない。`audit_logs` の `metadata` フィールドはユーザー操作によって生成されるため（例: リクエストタイトルや金額等が metadata に含まれる場合）、値が `=`, `+`, `-`, `@` で始まると Excel で数式として評価されるリスクがある。管理者のみがエクスポートするとはいえ、エクスポートされた CSV を内部の別システムやレポートツールに取り込む運用では被害が生じうる。 | `escapeCsvValue` の実装仕様に「値が `=`, `+`, `-`, `@` で始まる場合はダブルクォートで囲む（既存のエスケープ処理と組み合わせ）か、先頭に空白またはシングルクォートを付与する」を追記する。`tasks.md` T-07 の `escapeCsvValue` 定義に当該条件を明記する。 |
| 4 | MEDIUM | Input validation | tasks.md T-07 | Route Handler の `startDate`/`endDate` クエリパラメータを `new Date(param)` で変換しているが、無効な文字列（例: `?startDate=abc`）を渡すと `Invalid Date` オブジェクトが生成され、Drizzle の `gte`/`lte` に渡されて SQL レベルのランタイムエラーが発生する可能性がある。バリデーション処理の記述がない。 | T-07 に「`startDate`/`endDate` パラメータは `new Date(param)` 変換後に `isNaN(date.getTime())` で有効性を確認し、無効な場合は 400 を返す」バリデーション手順を追加する。`spec.md` の CSV エクスポート認証・認可 Requirement にも「無効な日付パラメータで 400 を返す SHALL」を追記することを推奨する。 |
| 5 | LOW | Test coverage gap | tasks.md T-11 | `request.md` の受け入れ基準「手動リトライが1回のみの単発試行であることをテストで確認する」が `tasks.md` T-11 のテスト一覧に反映されていない。`nextRetryAt が null` のテストは存在するが、「1回のみ」の静的検証（例: `retryWebhookDeliveryAction` が exponential backoff ループを呼ばないことの確認）が欠落している。 | Finding #1/#2 の修正に合わせて、T-11 に「手動リトライの実装が単発1回の fetch 呼び出しのみであることを検証するテスト」を追加する（例: `deliverToEndpoint` の `maxAttempts: 1` パラメータの存在、または `singleRetry` 関数の存在確認）。 |

## 検証メモ

### コードベース照合

- `src/infrastructure/webhookDelivery.ts` — 現状コードは `deliverToEndpoint` が単発1回試行。既存テスト `webhookWorkflow.test.ts` の `AbortSignal.timeout` / `5000` チェックはリトライ追加後も各試行で同タイムアウトを使用するため、引き続き pass する見込み（リスクなし）。
- `src/infrastructure/schema.ts:134-146` — `nextRetryAt` カラムが存在しないことを確認。T-01 の追加が必要（設計と整合）。
- `src/infrastructure/repositories/auditLogRepository.ts` — `create` のみ。`findByOrganization` 未実装を確認（D4/T-06 と整合）。
- `src/domain/models/webhookDelivery.ts` — `nextRetryAt` フィールドなし（D2/T-01 と整合）。
- `src/app/actions/webhooks.ts` — 既存アクションすべてに admin ロールチェックが適用済み。`retryWebhookDeliveryAction` 追加先として適切。

### Finding #1 の補足

`request-review-result-002.md` の「前回（iteration 1）指摘事項の解消確認」では MEDIUM #1 を「解消確認」と記録している。つまり request.md 側では「1回のみ」に確定している。design フェーズが要件を解釈し直して「全 attempts を再消費すべき」という異なる設計を採用したが、これは spec-fixer が修正すべき仕様矛盾である。escalation ではなく needs-fix とする（修正方向が明確なため）。

### Finding #3 の補足

`metadata` は `Record<string, unknown> | null` 型であり、JSON.stringify によって全体が `{"key":"value"}` 形式に変換される。JSON オブジェクト文字列は `{` で始まるため直接の数式インジェクションリスクは低い。ただし `action` フィールド（文字列）や `targetType` が将来的にユーザー入力由来になる可能性を考慮すると、防御的実装として対策を明記しておくことが適切。

### テナント分離・アーキテクチャ整合

- `findByOrganization` が `organizationId` で必ずフィルタする設計（D4）: テナント分離 OK ✅
- Route Handler の auth() + admin ロールチェック（D5）: 認証・認可 OK ✅
- `retryWebhookDeliveryAction` のテナント分離（D3: endpointId 経由の organizationId 検証）: OK ✅
- domain 層から infrastructure への import がないこと（T-12 grep チェック）: spec 上の記述に問題なし ✅
