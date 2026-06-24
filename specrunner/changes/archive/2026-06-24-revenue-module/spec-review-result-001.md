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
| 1 | MEDIUM | Functional Ambiguity | tasks.md (T-07) | `getRevenueForecast` usecase の引数 `{ organizationId, periodStart, periodEnd }` と実装記述が不整合。`findByOrganization` は全目標を返すが、"各目標に対して実績金額を算出" するには目標ごとの期間で個別に実績を集計する必要がある。単一の `getMonthlyRevenue(periodStart, periodEnd)` 呼び出しでは複数目標の期間が異なる場合に正しく実績を紐付けられず、進捗率・着地予測が誤った値になる。 | オプション A（推奨）: usecase の引数から `periodStart, periodEnd` を除去し、取得した各目標の `target.periodStart/periodEnd` を使って個別に `getMonthlyRevenue` を呼び出す（目標数分の追加クエリ）。オプション B: `findByOrganization` を `findByPeriod` に変更し、usecase に渡す単一期間に絞って 1 目標を対象とする（ページ設計を「1 期間を選んで表示」に統一する場合）。どちらかを tasks.md に明記する。 |
| 2 | MEDIUM | Security / Auditability | tasks.md (T-07, T-08) | `setRevenueTarget`, `updateRevenueTarget`, `deleteRevenueTarget` の各 usecase に監査ログ（`auditLogRepository.create`）の記録が指定されていない。既存の財務系・権限系の write 操作（`createDelegation`, `createContract` 等）は全て audit log に記録しており、売上目標の作成・変更・削除は経営上の重要変更であるため、このパターンを踏襲しないと監査証跡が欠落する。 | T-07 の各 write usecase（`setRevenueTarget`, `updateRevenueTarget`, `deleteRevenueTarget`）に `auditLogRepository.create` の呼び出しを追記する。action は `"revenue_target.create"`, `"revenue_target.update"`, `"revenue_target.delete"` とし、`targetType: "revenue_target"`, `targetId`, `actorId`, `organizationId` を記録する。`createDelegation.ts` の実装を参照してトランザクション内でまとめる。 |
| 3 | LOW | Specification Completeness | spec.md | CSV エクスポートエンドポイント（`/api/revenue/export`）の scenarios に、無効な `axis` 値が渡されたケースの振る舞いが定義されていない。`axis` が `monthly / customer / deal` 以外の場合、未定義の分岐が 500 エラーになりえる。 | spec.md の CSV エクスポート requirement に "Scenario: Invalid axis parameter" を追加し、`axis` が不正値の場合は 400 を返す旨を記載する。tasks.md T-11 にも Zod による `axis` enum バリデーション（失敗時 400）を追加する。 |
| 4 | LOW | Specification Completeness | spec.md | `/revenue/forecast` ページの requirement に「指定期間に目標が存在しない場合」のシナリオが定義されていない。初期状態や目標未設定の組織でページを表示したとき、空状態の UI がどうあるべきかが実装者の裁量に委ねられている。 | spec.md の forecast page requirement に "Scenario: No target exists for the selected period" を追加し、空状態（空リスト表示・目標設定フォームのみ表示 等）の振る舞いを明示する。 |

## Summary

設計判断（D1〜D9）はいずれも request-review の指摘に対応済みで根拠が明示されており、アーキテクチャ上の問題はない。セキュリティ面では、認証（`auth()` + 401）・認可（`canPerform` + PERMISSION_MATRIX）・マルチテナント分離（全クエリの `organizationId` フィルタ）・CSV インジェクション対策（`escapeCsvValue` の踏襲）がいずれも適切に仕様化されている。OWASP Top 10 の主要リスク（A01: アクセス制御, A03: インジェクション, A07: 認証）は仕様レベルで対処されている。

高優先度の懸念は 2 点。**Finding #1**（MEDIUM）は `getRevenueForecast` のデータ取得ロジックの記述不足で、期間が異なる複数目標が存在するケースで進捗率の誤算を引き起こしうる。実装前に tasks.md を補足すれば防止できる。**Finding #2**（MEDIUM）は財務変更の監査ログ欠落で、プロジェクトの全 write usecase が踏んでいる確立済みパターンの適用漏れ。いずれも tasks.md への追記で解消可能な水準であり、仕様全体の構造・整合性は健全なため approval とする。
