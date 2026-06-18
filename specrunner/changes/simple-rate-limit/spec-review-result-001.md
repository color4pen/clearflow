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
| 1 | MEDIUM | Error handling | spec.md / design.md | `checkRateLimit` が DB 例外をスローした場合の挙動が未定義。fail-open（リクエストを通す）か fail-closed（リクエストをブロック）かが spec に明記されておらず、本番で DB 障害が発生した場合に Server Action が 500 エラーを返す可能性がある。既存コードパターンは DB 例外を伝播させるため fail-closed 相当になるが、セキュリティ上重要な機能であることを考慮すると明示が望ましい。 | spec.md の `checkRateLimit` Requirement に「DB 呼び出しが失敗した場合は例外を伝播させ、Action がエラーレスポンスを返す（fail-closed）」などの振る舞いを追記する。または tasks.md T-02 に try/catch の実装方針を記載する。 |
| 2 | LOW | Documentation consistency | request.md | 要件 2 の SQL 疑似コード `CASE WHEN window_start >= $windowStart` の `$windowStart` が何を指すか曖昧。design.md D2 と tasks.md T-02 では `threshold = NOW() - windowMs` を比較対象として正しく定義しており、実装には影響しないが、request.md の `$windowStart` を `threshold` と読んだ場合と `NOW()` と読んだ場合で意味が変わる。 | 実装への影響はなし（design.md・tasks.md が正確）。必要であれば request.md の SQL コメントに `$windowStart = threshold (= NOW() - windowMs)` と注釈を追加する。 |
| 3 | LOW | Test coverage | tasks.md (T-06) | T-06 のテストはすべてソースコード静的解析（文字列検索）で、実際の DB 接続による `checkRateLimit` の原子性・ウィンドウリセット・カウント正確性は検証されない。既存プロジェクトのテストパターンと一致しており許容範囲内だが、レート制限の中核ロジック（race condition 防止）が結合テストでカバーされない点は将来リスクとして残る。 | 現スコープでは許容。将来、DB テスト環境が整備された際に `checkRateLimit` の統合テスト（初回リクエスト・ウィンドウ内カウント・ウィンドウ期限切れ・上限超過）を追加することを推奨する。 |

## Review Summary

仕様は全体的に完成度が高く、実装可能な状態にある。主要な設計判断（原子的 upsert による TOCTOU 防止、冪等キーチェック後のレート制限配置、依存方向の維持）はいずれも適切であり、request-review での指摘事項も design.md・tasks.md で解消されている。

セキュリティ観点では以下を確認した：

- **A01 (Broken Access Control)**: rate limit key は `{category}:{session.user.id}` 形式。userId は認証済みセッションから取得するため、ユーザーが他者のカウンターを操作・汚染することは不可能。
- **A03 (Injection)**: Drizzle ORM のパラメータバインディングを使用するため SQL インジェクションリスクなし。userId は UUID（セッション由来）のため key に特殊文字が混入する余地がない。
- **A07 (Auth Failures)**: レート制限はすべて認証チェックの後に配置されており、未認証ユーザーはカウンターを消費できない設計になっている。
- **テナント分離**: `rate_limit_records` はテナント所有リソースではなく、key にユーザー UUID を含めることでテナント間の干渉を防止している。organizationId 不要の設計は適切。
- **監査ログ**: レート制限はビジネスエンティティの状態変更ではないため、監査ログは不要。

CRITICAL・HIGH 相当の問題は発見されなかった。MEDIUM 1 件（checkRateLimit の fail behavior 未定義）は既存パターンと整合しており実装をブロックするものではないため、`approved` とする。
