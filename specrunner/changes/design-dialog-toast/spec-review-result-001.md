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
| 1 | MEDIUM | Spec coverage gap | spec.md | T-05 の ContractStatusActions への確認ダイアログ追加（既存コードに window.confirm なし、純新規動作）と InquiryActions/InvoiceActions のインラインモーダル置換について、spec.md に対応する Requirement/Scenario がない。tasks.md の Acceptance Criteria は存在するが、spec-level の振る舞い仕様が欠落しているため、自動シナリオテストの対象にならない。 | spec.md に「ContractStatusActions の確認ダイアログ」「InquiryActions/InvoiceActions のインラインモーダル→ConfirmDialog 移行」に対応する Requirement セクションと Given/When/Then シナリオを追加する。最低限、「完了ボタン押下で primary variant ダイアログが表示される」「解除ボタン押下で danger variant ダイアログが表示される」をシナリオ化する。 |
| 2 | MEDIUM | Spec coverage gap | spec.md | T-06 のトースト移行（8 コンポーネントのインラインエラー/成功表示をトーストに置き換える）に対応する Requirement が spec.md に存在しない。「ボタン操作アクションの結果はトーストで通知される」という振る舞いは spec.md §Toast の Context アクセス要件には含まれていない。 | spec.md に「アクション結果のトースト表示」Requirement を追加する。例: 削除ボタンで成功した場合 showToast が呼ばれ success トーストが表示される、失敗した場合 error トーストが表示される。インライン表示の削除も受け入れ基準に加える。 |
| 3 | LOW | Implementation risk | tasks.md > T-02 | Toast の showToast で「前回の timer は clearTimeout でキャンセル」と記述されているが、timer ID を保持するための useRef の使用が明示されていない。state に timer ID を持つと再レンダリングがループし、クロージャのキャプチャ問題でキャンセルが機能しない場合がある。 | tasks.md T-02 に `const timerRef = useRef<ReturnType<typeof setTimeout> \| null>(null)` を使用し `timerRef.current` で clearTimeout/setTimeout を管理することを明記する。 |
| 4 | LOW | Under-specification | tasks.md > T-04 | DealHeaderActions の ConfirmDialog 置換で `title はフェーズ名を含む` と記述されているが、具体的なタイトル文字列が未指定。他の 4 ファイルはすべて title/message が明示されており、一貫性が欠ける。 | 受注時: `title="受注確認", message="フェーズを「受注」に変更しますか？"` 失注時: `title="失注確認", message="フェーズを「失注」に変更しますか？"` のように具体的な文字列を tasks.md に追記する。 |
| 5 | LOW | Missing preservation note | tasks.md > T-05 | InvoiceActions の ConfirmDialog children 実装について、既存の日付入力に `max={todayString()}` 制約（未来日付の入力防止）が存在するが、tasks.md にこの制約の保持に関する明示的な記述がない。 | tasks.md T-05 の InvoiceActions 項目に「children 内の日付入力には既存の `max={todayString()}` 制約を維持すること」を追記する。 |
| 6 | LOW | Accessibility gap | spec.md / tasks.md | ConfirmDialog の spec/tasks にアクセシビリティ要件（`role="dialog"`, `aria-modal="true"`, `aria-labelledby`, ESC キーでの閉じる動作、フォーカストラップ）の記述がない。モーダルダイアログとして WCAG 2.1 AA の基準を将来的に満たすうえでの技術的負債になりうる。 | 本 spec-change のスコープ外とすることを明示的に Non-Goals に追記するか、LOW priority の TODO として tasks.md に記録する。放置するよりも明示的に defer した記録を残す。 |
