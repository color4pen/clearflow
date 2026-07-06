# Request Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approve | needs-discussion | reject
  - approve:          No blocking findings (no HIGH, no decision-needed). Request is ready for pipeline execution.
  - needs-discussion: One or more blocking findings (HIGH or decision-needed) resolvable through discussion.
  - reject:           Multiple blocking findings AND requirement contradictions or structural breakdown.
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | Location | Description | Recommendation
- Valid Severity values (uppercase): HIGH | MEDIUM | LOW
  - HIGH:   Request-level defect — goal unclear, acceptance criteria absent/untestable, or critical external constraint unspecified
  - MEDIUM: Scope ambiguity, recommended additions
  - LOW:    Clarity improvements, expression refinements
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approve

## Findings

| # | Severity | Category | Location | Description | Recommendation |
|---|----------|----------|----------|-------------|----------------|
| 1 | MEDIUM | Architecture | R2 / design/domain/invariants.md | OAuth クライアントを「プラットフォームレベル（組織非所属）」と定義することは `inv-all-tenant-scoped`（全エンティティを organizationId でテナント分離する）の意図的な例外となる。request.md にその旨の記述はあるが、design step が model.md / invariants.md をどう更新するかの指針が request 内に明示されていない。 | design step で oauth_clients テーブルが組織スコープ外であることを不変条件の注釈または新規不変条件として明記すること。同意（oauth_tokens）側は userId + organizationId を持つため、同意レコードがテナント分離を担保する旨を design で整理すると実装上の混乱を防げる。 |
| 2 | MEDIUM | Implementation constraint | R5 / src/__tests__/mcp/mcpAuth.test.ts | 既存の静的検証テスト（TC-004相当）は「route.ts が `resolveBearer` を呼び出している」「`apiTokenResolver.ts` が `hasApiTokenPrefix` を使用している」を文字列照合でアサートしている。受け入れ基準「既存テスト無変更で green」を満たすには、OAuth resolver 追加後も関数名 `resolveBearer` と `hasApiTokenPrefix` がそれぞれのファイルに残る必要がある。設計段階でこの制約を意識しないと実装者が clean refactoring を試みた時点でテスト破壊が発生する。 | design step または spec で「`resolveBearer` を PAT / OAuth トークンを統合的に解決する dispatcher として拡張する」方針を明記し、実装者が関数名を変更しないよう誘導すること。 |
| 3 | LOW | Clarity | R4 / 要件 | アクセストークン「短寿命」・リフレッシュトークン「長寿命」の具体的な期限が未定義のため、テストケース生成 step でタイムアウト境界テストの時間設定が曖昧になる可能性がある。 | spec で具体的な有効期限（例: アクセストークン 1 時間、リフレッシュトークン 30 日）を定義すること。RFC 9700（OAuth 2.1）を参考に設定すると MCP クライアントとの相性も取りやすい。 |
| 4 | LOW | Clarity | R2 / 要件 | 動的クライアント登録の「登録レート制限」の粒度（per-IP / per-グローバル / per-User-Agent など）が未指定。既存の `rateLimitRecords` テーブルを再利用するかどうかも不明。 | design step で制限粒度と閾値を決定し、spec に記載すること。既存 `rateLimitRecords` テーブルの key 命名規則で対応できる可能性が高い。 |

## Summary

要件の網羅性・受け入れ基準の検証可能性・スコープ外の明確な定義のいずれも問題なし。設計判断（自前認可サーバー・ローテーション採用・PAT 併存）の根拠が request 内に文書化されており、design step の起動要件を満たしている。

RFC 準拠（RFC 9728、RFC 8414、RFC 7591、PKCE S256 必須）の言及が適切で、MCP 認可仕様の最新版確認を design step に委譲している点も正しい判断。

HIGH/decision-needed 相当の所見なし。MEDIUM 2 件はいずれも design step または spec 作成時に解決可能な設計上の補足であり、pipeline 続行を妨げない。
