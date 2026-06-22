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
| 1 | HIGH | Security (OWASP A01 - Broken Access Control) | `spec.md` — Requirement: 権限制御 | 権限制御要件が「サーバーコンポーネントで editable boolean を算出してクライアントに渡す」UI 層のみを規定している。Server Actions (`updateInquiryAction`, `updateMeetingAction`) は現状サーバー側ロールチェックを持たず（`updateDealAction`/`updateContractAction` は admin/manager チェック済み）、spec もその追加を要求していない。member/finance ロールのユーザーが UI をバイパスして Server Action を直接呼び出すと書き込みが通る。 | `spec.md` の権限制御 Requirement に「`updateInquiryAction` および `updateMeetingAction` もサーバー側で admin/manager ロールを検証し、他ロールには `{ message: "権限がありません" }` を返すこと」を追記する。対応する Scenario（member が API を直接呼んでも拒否される）を追加する。 |
| 2 | HIGH | Security (OWASP A01 - Broken Access Control) | `tasks.md` — T-07, T-09, T-11 | T-07（引き合い）・T-09（案件アクションアイテム）・T-11（商談議事録/アクションアイテム）のいずれも、対応する Server Action にロールチェックを追加する作業が含まれていない。Finding #1 の対策を spec に追加しても、tasks がそれを実装対象として明示しなければ implementer が見落とす。 | T-07 に「`updateInquiryAction` に admin/manager ロールチェックを追加する」を、T-09 および T-11 に「`updateMeetingAction` に admin/manager ロールチェックを追加する」を追加する。 |
| 3 | MEDIUM | Inconsistency (request vs spec/tasks) | `spec.md` — Scenario: 完了済みアイテムの未完了への切り戻し | request.md §C-9 および tasks.md T-09 記述本文は「**未完了**アクションアイテムを集約表示する」と明示しているが、spec.md には「完了済みのアクションアイテムが表示されている状態でチェックボックスをクリックする」Scenario が存在する。完了済みアイテムを表示しないならこの Scenario は成立しない。tasks.md の受け入れ基準（「完了アイテムのチェックを外すと done=false で保存される」）も完了済みアイテム表示を前提にしており、request.md と矛盾している。 | 完了済みアイテムを表示するか否かを確定し、spec.md・tasks.md・request.md を一致させる。「完了済みも表示」にするなら request.md を修正し tasks.md の表現を合わせる。「未完了のみ表示」にするなら spec.md の該当 Scenario と tasks.md AC を削除する。 |
| 4 | MEDIUM | Spec gap (calling convention) | `tasks.md` — T-09, T-11 | `updateMeetingAction` のシグネチャは `(prevState: UpdateMeetingState, formData: FormData)` であり、meetingId は formData 内に埋め込む設計（`updateDealAction(dealId, formData)` とは異なる）。T-09 と T-11 は「`updateMeetingAction` を呼び出す」と記載するが、クライアントコンポーネント内での呼び出し方法（`bind(null, {})` で部分適用するか、ラッパー関数を定義するか）を指定していない。request-review-result-001.md でも指摘済みだが spec/tasks への反映がない。 | tasks.md T-09 と T-11 に「`updateMeetingAction.bind(null, {})` で部分適用した関数を Server Action として渡す（または `startTransition` 内で直接呼ぶ）」等、呼び出しパターンを明記する。 |
| 5 | LOW | Spec gap (full-form requirement) | `spec.md` — Scenario: 件名のインライン編集 | `updateInquiryAction` は `title`（min 1 必須）と `source`（enum 必須）が required なため、フィールド単体の保存では validation エラーになる。tasks.md T-07 は「変更しないフィールドも既存値をセットする」と注記しているが、spec.md の Scenario は `updateInquiryAction が呼ばれ、件名が更新される` のみで全フィールド送信の制約が見えない。テスト仕様生成時に抜け落ちるリスクがある。 | spec.md の件名インライン編集 Scenario の Then に「FormData には title 以外の既存フィールド（source 等）も含まれる」を追記するか、test-case-gen 向けに補足 Note を design.md に加える。 |
