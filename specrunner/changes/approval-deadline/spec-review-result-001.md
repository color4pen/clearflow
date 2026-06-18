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
| 1 | MEDIUM | Performance | tasks.md (T-05, T-13) | `approval_steps.deadline` カラムへの DB インデックス作成が tasks に含まれていない。`expireOverdueRequests` の `WHERE deadline < NOW() AND status = 'pending'` クエリはインデックスなしで全行スキャンとなり、申請数増加時に cron タイムアウトを引き起こす可能性がある | T-13 に「`deadline` カラムへの部分インデックス（`CREATE INDEX ON approval_steps (deadline) WHERE status = 'pending'`）を drizzle-kit generate に含める」を追記する |
| 2 | MEDIUM | Completeness | tasks.md (T-10) | cron Route Handler が `expireOverdueRequests` からエラー（`SYSTEM_USER_ID` 未設定時のエラー返却など）を受け取った場合の HTTP ステータスコードが未定義。`expireOverdueRequests` が失敗した場合に 200 + エラー body が返ると監視アラートで検知されない | T-10 acceptance criteria に「`expireOverdueRequests` がエラーを返した場合は 500 を返す」を追記する |
| 3 | MEDIUM | Architecture | tasks.md (T-05) | `findOverdueRequestIds` はテナントスコープなしのグローバルクエリであり、プロジェクトの domain-invariants 原則（全クエリは `organizationId` で制約）の意図的な例外にあたる。tasks.md にその旨の注記がなく、将来の実装者が誤ってフィルタを追加するリスクがある | T-05 の `findOverdueRequestIds` 説明に「cron global scan: 意図的に organizationId フィルタなし。返り値の organizationId を以降の per-request TX で使用する」と注記する |
| 4 | LOW | Consistency | spec.md | `expired` への遷移時の webhook イベント発火が spec に含まれていない。`approved`・`rejected`・`revision` はすべて webhook イベントを発火するが、`expireOverdueRequests` には対応するイベント定義がない | 意図的スコープ外であれば spec.md の Non-Goals に「期限切れ時の webhook イベント発火」と明記する。イベント発火を意図するなら `request.expired` イベントをシナリオに追加する |
| 5 | LOW | Completeness | tasks.md (T-09) | `auditLogRepository.create` に必要な `organizationId` の取得元が T-09 に明示されていない。`findOverdueRequestIds` の返り値 `{ requestId, organizationId }` から取得することは自明だが、実装指示として抜けている | T-09 の auditLogRepository.create の列挙に `organizationId: result.organizationId` を追記する |
| 6 | LOW | Security | tasks.md (T-12) | `.env.example` の `CRON_SECRET` に推奨エントロピーの記載がない。短いシークレット（例: `secret123`）を設定してもビルドエラーにならないため、運用ミスが発生しうる | `.env.example` のコメントに「# 最低 32 文字のランダム文字列を推奨（例: openssl rand -hex 32）」を追記する |
