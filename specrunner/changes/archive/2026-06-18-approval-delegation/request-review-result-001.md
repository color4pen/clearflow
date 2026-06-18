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

- **verdict**: needs-discussion

## Findings

| # | Severity | Category | Location | Description | Recommendation |
|---|----------|----------|----------|-------------|----------------|
| 1 | MEDIUM | Spec gap | 要件 2・3・4 | `canApprove` は「委譲元のロールが step の approverRole と一致するか」を検証するが、`approval_delegations` スキーマ（要件 1）は `fromUserId`（FK to users）のみ保持し fromUser の role を含まない。`canApprove(step, actorRole, delegations)` を実装するには delegation 内に fromUserRole が必要。repository の `findActiveByToUserId` が users テーブルと JOIN して `fromUserRole` を返す、または `ApprovalDelegation` ドメインモデルに `fromUserRole: string` を含める設計を明示してほしい。 | `ApprovalDelegation` ドメインモデルのフィールド一覧を要件 2 に追記するか、repository が JOIN 結果として `fromUserRole` を返す旨を要件 3 に明記する。 |
| 2 | MEDIUM | Scope ambiguity | 要件 5 (`rejectRequest`) | 「rejectRequest も同様」とあるが、現在の `rejectRequest` は `actorRole` パラメータを持たず `canApprove` を呼んでいない（`src/application/usecases/rejectRequest.ts` 全体、`src/app/actions/requests.ts:212-218` 参照）。TOCTOU 防止のために TX 内で委譲データを取得するという意図が「同様」であれば、委譲データを使う箇所がないため何もしなくて済む。一方「actorRole + canApprove + delegations チェックを rejectRequest にも追加する」という解釈ならば Server Action レイヤーの変更も含む非自明なスコープ拡張になる。どちらを意図するか明確にしてほしい。 | 要件 5 の `rejectRequest` に関する記述を「委譲データ取得のみ（実際の認可チェックは行わない）」または「canApprove チェックを追加する（actorRole パラメータ追加も含む）」のどちらかに絞って明示する。 |
| 3 | MEDIUM | Scope ambiguity | 要件 7・8・9 | 委譲の作成・無効化ユースケースが未定義。要件 7（重複チェック）・8（自己委譲禁止）・9（管理 UI）を実装するには `createDelegation` および `deactivateDelegation` ユースケースが必要になるが、名前・入出力・バリデーション配置が仕様にない。バリデーション（自己委譲・クロスオーグ・重複期間）を usecase 層に置くか domain service に置くかも未定義で、実装者が独自判断することになる。 | `createDelegation` / `deactivateDelegation` ユースケースの入出力と、自己委譲・クロスオーグ・期間重複の各バリデーションをどのレイヤーで行うかを要件に追記する。 |
| 4 | LOW | Clarity | 要件 4 | 「複数委譲がマッチする場合は startDate が最も新しいものを採用する」の「採用する」の意味が不明確。承認可否の boolean 判定としては、いずれか 1 件でも一致すれば true で十分であり、「最新を選ぶ」意図は監査ログへの `delegatedFrom` 記録（要件 6）に必要な 1 件特定のためと推測されるが、明示されていない。 | 「最新を採用する」のが承認判定ロジックか監査ログ用の選択かを明記する（例:「監査ログに記録する委譲を 1 件特定するため、最新 startDate の委譲を使用する」）。 |
| 5 | LOW | Implementation note | 要件 11 (seed) | 現在の `src/infrastructure/seed.ts` はテーブルを FK 安全な順序で削除している。`approval_delegations` テーブルを追加する場合、`users` および `organizations` より先に削除する必要があるが、その旨が要件に記載されていない。 | 要件 11 にシードスクリプトのテーブル削除順の更新（`approval_delegations` を `users` より先に削除）を明記するか、実装者へのメモとして追記する。 |
