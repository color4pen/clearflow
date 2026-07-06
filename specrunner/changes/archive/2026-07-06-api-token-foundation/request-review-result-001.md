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
| 1 | MEDIUM | Scope ambiguity | 要件 4（Bearer 解決機構） | `(infrastructure)` と記載されているが、具体的なモジュール配置（`mod-repo` 内に置く、`mod-auth` に追加する、または新規モジュールを設ける）が指定されていない。`aozu check exit 0` を維持するには、新規ファイルがいずれかのモジュールパスに属する必要があり、`mod-api -> <配置先>` の依存が `design/static/dependencies.md` に存在しない場合は追加が必要になる。 | 設計ステップで Bearer 解決関数の配置モジュールを明示し、必要なら `modules.md` と `dependencies.md` を更新すること。リクエスト文書の変更は不要。 |
| 2 | LOW | Clarity improvement | 要件 1・2（tokenPrefix） | `tokenPrefix（先頭 8 文字程度）` の「程度」が曖昧。文字数が実装者によって異なる可能性がある。 | 設計ステップで具体的な文字数（例：8 文字固定）を確定すること。 |
| 3 | LOW | Clarity improvement | 要件 1（スキーマ） | `tokenHash` カラムに対する一意インデックスの明示がない。Bearer 解決のたびにハッシュ照合が走るため、インデックスなしではフルスキャンになる。 | 実装時に `tokenHash` へ一意インデックスを付与することを設計ステップまたは tasks.md に明記すること。 |
| 4 | LOW | Clarity improvement | 要件 3（本人のみ） | ユーザーあたりのトークン発行上限が定義されていない。初期スコープとして無制限が許容されるのか、上限を設けるのかが不明。 | 初期実装では上限なしでよい場合はその旨をスコープ外に明記するか、上限を要件に追加すること。 |

## 評価根拠

**コードベース照合**（read-only 確認済み）:

- `src/infrastructure/schema.ts`：`api_tokens` テーブルは存在しない（要件 1 の前提を確認）。`users` テーブルは `id / email / organizationId / role` 等を持ち、FK 参照先として適切。
- `src/app/api/cron/expire-requests/route.ts`：`CRON_SECRET` + `timingSafeEqual` による共有シークレット方式の Bearer 認証を確認（ユーザー単位ではない現状の前提が正確）。
- `src/app/api/audit-logs/export/route.ts`：`auth()` によるセッション Cookie 認証のみ（API クライアント非対応の現状を確認）。
- `src/app/(dashboard)/account/`：`page.tsx` / `ProfileForm.tsx` / `PasswordForm.tsx` が存在し、トークン管理 UI の追加先として適切。
- `src/app/actions/account.ts`：プロファイル更新・パスワード変更の Server Action が実装済み。`createApiToken` / `revokeApiToken` の追加先として適切。
- `src/domain/authorization.ts`：`canPerform` 関数が存在し、ロール × 操作マトリクスで動作中。Bearer 解決後の操作判定はここを再利用できることを確認。
- `design/static/modules.md`：`mod-api -> mod-repo` の依存は `design/static/dependencies.md` に列挙済み。Bearer resolver を `mod-repo` 内に配置すれば追加の依存変更なしで `aozu check` を維持できる。

**設計判断の評価**:

- PAT 採用・OAuth 2.1 却下：MCP 初期スコープに対してコスト対効果が適切。後続 request での追補路も残されている。
- SHA-256 採用・bcrypt 却下：32 バイト乱数トークンは辞書攻撃が成立せず、低コストなハッシュで十分。API 認証の頻度を考えると bcrypt のコストは非現実的。
- CRON_SECRET 拡張却下：ユーザー同定・個別失効・監査の三要件を満たせないため、却下理由が明確。

**受け入れ基準の検証性**:

全 6 項目がユニットテストまたは統合テストで検証可能な具体的な振る舞いを指定している。`typecheck && test` および `aozu check` を gates として含めており、パイプライン品質ゲートとして十分。
