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
| 1 | LOW | Spec incompleteness | spec.md | `escapeCsvValue` への BOM 付与（Excel 対応）が T-07 で定義されているが、spec.md には対応する Requirement/Scenario がない。テスト生成器が spec.md のみを参照した場合、BOM の検証が漏れる可能性がある。ただし BOM は UI 動作（ファイルダウンロード）に関わる実装詳細であり、行動仕様として必須ではない。 | 対応不要（LOW）。必要であれば spec.md の CSV エクスポート Requirement に「BOM 付き UTF-8 で出力する SHALL」を追記するが、デモ用途では省略可能。 |
| 2 | LOW | Ambiguity | tasks.md T-04 | ステップ3でテナント分離のためにエンドポイントを取得し、ステップ6で「エンドポイント情報から url、secret を取得し」と再記述されている。実装者がステップ3の取得結果を再利用するか再クエリするか判断を要する。動作は同一だが DB クエリが2回発行される可能性がある。 | 対応不要（LOW）。T-04 ステップ6の記述を「ステップ3で取得したエンドポイントの url、secret を使用し」と明示すれば実装者の迷いをなくせるが、機能正確性には影響しない。 |
| 3 | LOW | Incompleteness | tasks.md T-08 | 監査ログ一覧の action フィルタ `<select>` の選択肢が「例: request.create, request.submit, ...」と例示のみで、コードベース内の全 action 文字列の正規リストが定義されていない。実装者が既存の audit log 生成箇所を grep して値を収集する必要がある。 | 対応不要（LOW）。デモ用途では例示の値で十分機能する。正規リストが必要な場合は `domain/models/auditLog.ts` に `AuditLogAction` 定数を定義し T-08 から参照することを推奨するが、受け入れ基準への影響はない。 |

## 検証メモ

### spec-review-001 指摘事項の解消確認

| Finding | 前回 Severity | 解消状況 |
|---------|-------------|---------|
| #1 design.md D3 要件矛盾（手動リトライに exponential backoff を適用） | HIGH | ✅ 解消。design.md D3 が `deliverSingleAttempt`（単発試行）採用に書き換えられ、Rationale も「1回のみ、exponential backoff 不適用」に修正済み。tasks.md T-04 の受け入れ基準も「単発1回のみ試行」に整合。 |
| #2 spec.md に手動リトライ単発試行の Requirement なし | MEDIUM | ✅ 解消。spec.md に「Requirement: 手動リトライは1回のみの単発試行であり exponential backoff は適用しない」が追加され、「手動リトライが1回のみ試行される」「手動リトライ後の nextRetryAt が null である」シナリオが Given/When/Then 形式で記述された。 |
| #3 CSV Formula Injection 対策なし（CWE-1236） | MEDIUM | ✅ 解消。tasks.md T-07 の `escapeCsvValue` に「値が `=`, `+`, `-`, `@` で始まる場合にシングルクォートを先頭付与」が明記され、受け入れ基準にも検証項目が追加された。 |
| #4 startDate/endDate の無効値でランタイムエラー | MEDIUM | ✅ 解消（方針変更）。400 返却ではなく「`isNaN(date.getTime())` で無効と判断した場合はパラメータを無視して undefined 扱い」に変更。T-07 の実装仕様・受け入れ基準・spec.md の記述なし（実装詳細として処理）。内部整合性あり。 |
| #5 手動リトライ単発確認のテストカバレッジ不足 | LOW | ✅ 解消。T-11 に「`deliverSingleAttempt` が export されていることを検証する」「`retryWebhookDeliveryAction` 以降に `deliverSingleAttempt` 呼び出しが存在することを検証する」テストが追加された。 |

### コードベース照合（最終確認）

- `src/infrastructure/webhookDelivery.ts` — `deliverToEndpoint` は単発1回試行（`attempts: 1` で固定）。リトライループなし。設計 D1/T-02 の追加対象として正確。
- `src/domain/models/webhookDelivery.ts` — `WebhookDelivery` 型に `nextRetryAt` フィールドなし。D2/T-01 の追加対象として正確。
- `src/infrastructure/repositories/webhookDeliveryRepository.ts` — `create`, `updateStatus`, `findByEndpointId` の3関数のみ。`findById`, `resetForRetry` は未実装（T-03 で追加）。`updateStatus` の引数に `nextRetryAt` なし（T-01 で拡張）。
- `src/infrastructure/repositories/auditLogRepository.ts` — `create` のみ。`findByOrganization` 未実装（T-06 で追加）。
- `src/app/actions/webhooks.ts` — 既存パターンで全アクションに admin ロールチェック済み（design.md 記載と整合）。`retryWebhookDeliveryAction` の追加先として適切。

### セキュリティレビュー

- **テナント分離** — `retryWebhookDeliveryAction`（T-04）はエンドポイントの `organizationId` とセッションの `organizationId` を照合する。`findByOrganization`（T-06）は `organizationId` を WHERE 必須条件とする。Route Handler（T-07）はセッションの `organizationId` のみでフィルタ。IDOR リスクなし ✅
- **認証・認可** — Route Handler（T-07）は `auth()` + admin ロールチェック（未認証 401、非 admin 403）。手動リトライ Server Action（T-04）は既存パターンと同じ admin チェック ✅
- **CSV Formula Injection（CWE-1236）** — `escapeCsvValue` で `=`, `+`, `-`, `@` 先頭値にシングルクォート付与。`metadata` は `JSON.stringify` 後に `{` 始まりのためインジェクションリスク低。`action`, `targetType` 等の文字列フィールドも対策適用 ✅
- **CSV 構造エスケープ** — カンマ・ダブルクォート・改行のエスケープ処理が定義済み ✅
- **CSRF** — 手動リトライは Server Action（form POST）で実装。Next.js Server Actions の組み込み CSRF 保護が適用される ✅
- **アーキテクチャ規律** — `domain/models/` からの `@/infrastructure` import がないことは T-12 の grep で検証される。新規追加ファイルはすべて正しいレイヤーに配置 ✅

### 総評

spec-review-001 で報告した HIGH 1件・MEDIUM 3件・LOW 1件はすべて解消された。現在の spec は request.md の全要件・受け入れ基準を網羅しており、design.md・tasks.md・spec.md 間の内部整合性に矛盾がない。残存指摘はすべて LOW であり、実装者の判断で対応できる範囲。仕様は実装フェーズに進める状態にある。
