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
| 1 | HIGH | Functional gap / Authorization model mismatch | design.md D5, tasks.md T-03, T-07 | T-03 は「設定」ヘッダーリンクを全ロールに表示（`/settings/templates` へのリンク）するよう指定しているが、`settings/layout.tsx:18-20` は非 admin ユーザーを無条件で `/requests` にリダイレクトする。`settings/**` 配下の全ページも個別に同じチェックを持つ。tasks.md にはこの layout レベルの認可モデルを変更するタスクが存在しない。結果として、非 admin ユーザーが「設定」リンクをクリックすると即座にリダイレクトされる（機能しないリンク）。要件6で delegations リンクを SettingsNav に追加する意図が「非 admin ユーザーが自身の代理承認を管理できるようにする」であれば、認可変更タスクが全く欠如している。design.md D5 が「設定配下の各ページで admin チェックは個別に行われている」と記載しているが、これは現状の layout レベルガード（主要なアクセス制御）の役割を誤解させる記述である。 | 以下いずれかを選択して spec を修正する。(a) 「設定」ヘッダーリンクを admin のみに限定し、非 admin 表示要件を削除する（既存の認可モデルと整合）。(b) 非 admin に設定の一部（例: delegations のみ）を開放する場合は、tasks.md に `settings/layout.tsx` の admin リダイレクト撤去タスクを追加し、どのページをどのロールに開放するか per-page の認可方針を spec/design に明記する。 |
| 2 | MEDIUM | Requirements gap | spec.md, tasks.md T-05 | request.md 要件3 に「アクション（承認/却下）はインラインのテキストリンク（`text-blue-600 text-xs underline`）にする」と記載されているが、spec.md にこれを検証するシナリオが存在せず、tasks.md T-05 にも対応する実装ステップがない。request.md の受け入れ基準にも本要件は含まれていない。また、スコープ外セクションにも記載がなく、意図的に除外されたかどうか不明。 | (a) 一覧テーブルの各行に承認/却下のインラインテキストリンクを表示する spec シナリオとタスクを追加する。(b) または、この要件を明示的に「スコープ外」に移動し、設計根拠（一括承認 UI との競合等）を design.md に記載する。 |
| 3 | MEDIUM | Implementation ambiguity | tasks.md T-04 | `findAllWithStepsByOrganization` の実装方針が曖昧。「requests を取得後、approval_steps テーブルから該当リクエストのステップを JOIN で取得し」という記述は、単一 SQL LEFT JOIN か、2 段階クエリ（全 requests 取得後に全 requestId を IN句で approval_steps 取得）か、または N+1 クエリ（request ごとに個別クエリ）か判別できない。N+1 実装になった場合は申請件数に比例してクエリ数が増加し、パフォーマンス問題を引き起こす。 | T-04 に実装戦略を明記する。例: 「単一 SQL クエリで `requests LEFT JOIN approval_steps ON approval_steps.requestId = requests.id` を実行し、結果セットをアプリケーション層で requestId ごとにグループ化して `RequestWithSteps[]` に変換する」と具体化する。 |
| 4 | LOW | Minor inconsistency | spec.md (Requirement: フッター統計), request.md 要件7 | spec.md フッター統計シナリオは「24件中 1-24件表示」を使用しているが、request.md の例示フォーマットは「24件中 1-20件表示」（ページネーション前提の表記）。spec.md の表記はページネーション未実装の実態に合っており正しいが、request.md との差異が混乱を招く可能性がある。 | spec.md シナリオに「ページネーション未実装のため表示件数＝全件数（1-N件）」というコメントを追加し、request.md との差異が意図的であることを明示する。 |
