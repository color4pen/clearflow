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
| 1 | MEDIUM | Scope ambiguity | Req 3, Req 5 | `rejectRequest` の役割が二義的。Req 5 は「差し戻し時に申請のステータスを `revision` に変更」と述べるが、Req 3 の遷移表には `pending → rejected`（終端）も存在する。どのユースケース/アクションが最終却下（`rejected`）へ遷移させるのか未明示。実装者が「`rejectRequest` を `revision` 専用に変更する」か「パラメータで分岐する」か「最終却下用に別ユースケースを新設する」かを独自判断せざるを得ない。 | request.md の Req 5 に「差し戻し（`revision`）と最終却下（`rejected`）を同一ユースケースでパラメータ分岐させる／別ユースケースを新設する」のどちらを意図するか明示する。受け入れ基準に `pending → rejected` 遷移を呼び出せるユースケースのテストケースを追加するか、`rejected` が今回のスコープ外であれば Req 3 の遷移表から `pending → rejected` を削除する。 |
| 2 | MEDIUM | Scope ambiguity | Req 2, Req 10 | `createRequest` の変更が要件として明示されていない。Req 2 は「申請作成時にテンプレートを適用する」と述べ、Req 10 はUI上でのテンプレート選択を求めているが、`createRequest` usecase を `templateId` パラメータで拡張し `approval_steps` を生成する責務は番号付き要件に含まれていない。この暗黙の依存が不明確なため、実装者がどのレイヤーで steps を生成するかを独自判断することになる。 | 要件に「`createRequest` usecase は `templateId` を受け取り、テンプレートの steps 定義をもとに `approval_steps` レコードをトランザクション内で生成する」を追加する。受け入れ基準にも「申請作成後に `approval_steps` が生成されることをテストで確認する」を追記する。 |
| 3 | LOW | Clarity | Req 1, 設計判断 4 | `approverRole`（text 型）と既存 `roleEnum`（admin\|member）の認可マッピングルールが未定義。設計判断 4 では「初期実装では admin ロールのみが承認可能」とあるが、ステップの `approverRole = "admin"` のとき `user.role = "admin"` のみ許可するというルールが spec レベルで未記述のため、実装箇所（domain service か Server Action か）が実装者依存になる。 | `approvalStepService.ts` に配置するステップ進行判定の仕様として「`approverRole` が `user.role` と一致するユーザーのみ承認可能」であることを Req 8 に記述する。 |
| 4 | LOW | Clarity | Req 10 | 組織にテンプレートが1件も存在しない場合の申請作成フローが未規定。テンプレート選択 UI が必須項目として動作するのか、テンプレートなし（`approval_steps` を生成しない）での作成を許可するのかが不明。 | スコープ外として明示するか、「テンプレートが存在しない場合は申請作成を禁止しエラーメッセージを表示する」などの振る舞いを Req 10 または受け入れ基準に追記する。 |
