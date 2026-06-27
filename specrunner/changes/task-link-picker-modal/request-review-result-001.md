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
| 1 | HIGH | Conflicting requirements | `MeetingActionItemsSection.tsx:35-42` / 要件 4 / スコープ外 | `MeetingActionItemsSection` は会議コンテキストでアクションアイテムを作成する際に `meetingId` と `dealId` の両方を送信している（`createActionItemAction({ ..., meetingId, dealId })`）。要件 4 は usecase レベルで「3 FK のうち最大1つが非 null」を保証することを求める。一方スコープ外では「MeetingActionItemsSection からのタスク作成は従来通り自動紐づけ（ピッカーは出さない）」とある。この2要件は矛盾する。usecase に単一紐づけ強制を入れると既存の MeetingActionItemsSection が壊れる。スコープ外の意図（変更しない）を守ると単一紐づけ不変条件が一貫しない。 | 次のいずれかを明示すること。(A) MeetingActionItemsSection を `meetingId` のみ送信に変更する（`dealId` を落とす）。その際グローバルタスク一覧の表示が「案件名」→「会議日付」に変わる点を許容するか確認する。(B) 単一紐づけ不変条件の強制を usecase ではなく UI（ピッカー送信時）のみに限定し、コンテキスト付き呼び出し（dealId＋meetingId 同時 OK）をサポートする。(C) usecase 引数に `allowDualLink?: true` のようなエスケープハッチを設けるが、その場合は不変条件の保証範囲も明記する。 |
| 2 | LOW | Code organization | `src/application/usecases/listActionItems.ts:14-19` / `src/app/actions/` (新設 searchLinkTargetsAction) | `formatDateJP` が `listActionItems.ts` のモジュール private 関数として定義されている。会議ラベル（`${formatDateJP(date)} ${種別ラベル}`）を生成する `searchLinkTargetsAction` でも同一ロジックが必要になり、関数の重複が生じる。 | `src/lib/dateUtils.ts`（または既存のユーティリティファイル）に `formatDateJP` を移動してから両箇所で import する。request.md への記載は不要だが、implementer が気づくよう spec にコメントするか、または設計フェーズで実施する。 |
