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

## Review Summary

spec-review-001 で報告された 5 件の findings のうち、HIGH 1 件・MEDIUM 2 件・LOW 2 件の全件について対処が確認された。

- **Finding #1 (HIGH)**: 受け入れ基準の `reviseRequest` 言及が `rejectRequest が targetStatus で両操作をカバーする` に修正された。ただし要件5 の本文（`reviseRequest usecase を新設する`）が残存しており、下記 MEDIUM 項目として継続記録する。
- **Finding #2 (MEDIUM)**: spec.md に `resubmitRequest は認証済みユーザーのみ実行可能` の Requirement が追加され解消。
- **Finding #3 (MEDIUM)**: T-10 と T-11 に `organizationId は session.user.organizationId から取得し URL クエリ・リクエストパラメータから取得しない` の明記が追加され解消。
- **Finding #4 (LOW)**: spec.md に最終却下シナリオ（`rejected` 終端状態への遷移と `resubmitRequest` 拒否）が追加され解消。
- **Finding #5 (LOW)**: T-11 が `getApprovalSteps` usecase の新設を確定的な記述で指定しており解消。

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | MEDIUM | Spec inconsistency | request.md（行38）| 要件5の本文が `reviseRequest usecase を新設する` のまま残存している。受け入れ基準（行71）・design.md D5・tasks.md T-07・spec.md はすべて `rejectRequest を targetStatus で拡張する` 1-usecase 方式で統一されており、要件本文だけが旧来の 2-usecase 方式の記述を保持している。test-case-gen は spec.md を使用し実装者は tasks.md に従うため機能上の影響は最小限だが、request.md を参照した人間レビュアに混乱を与え、将来の変更時に不整合が再発するリスクがある。 | request.md 要件5の本文を `rejectRequest usecase を拡張する。targetStatus: "revision" で差し戻し（申請を revision に遷移しコメントを記録）、targetStatus: "rejected"（デフォルト）で最終却下（rejected 終端状態へ遷移）を処理する` に書き換え、design.md D5 と整合させる。 |
| 2 | MEDIUM | Test coverage gap | tasks.md T-15 | T-15 は `requestWorkflow.test.ts` への新規テスト追加を指定しているが、既存テスト TC-039（`approveRequest calls validateTransition before updateStatus`）の更新指示が欠落している。新実装では `approvalStepRepository.updateStatus`（ステップ更新）が `validateTransition` より先にソースコードに現れる実装パターン（例: ステップ数チェックを else ブランチより先に書く構造）が起きた場合、TC-039 の静的ソースコード順序チェックが失敗する。T-15 が TC-039 のレビューを要求しないため、実装者が見落とすリスクが高い。 | T-15 に「既存の TC-039（approveRequest calls validateTransition before updateStatus）をレビューし、0-steps 後方互換ブランチが multi-step ブランチより先に記述されることを確認するか、TC-039 をソースコード順序非依存のテスト（validateTransition が呼び出されること自体の検証）に更新する」旨を追記する。 |
| 3 | LOW | Spec coverage | spec.md / design.md D5 | `rejectRequest` で `targetStatus: "rejected"`（最終却下）を実行した際、処理中だった承認ステップ（status: "pending"）の扱いが spec.md にも design.md にも明示されていない。設計の意図は「ステップは変更せず申請のみ rejected に遷移」と読めるが、監査ビューにおいて `rejected` 申請に `pending` のステップが残存し混乱を招く可能性がある。 | spec.md の最終却下シナリオに「申請が `rejected` に遷移した後、残存する `approval_steps` の status は変更しない（またはキャンセル状態に更新する）」いずれかの振る舞いを Then 句に追記する。design.md D5 にも同様の記述を加える。 |
| 4 | LOW | Security | spec.md / tasks.md T-12 | `approval_steps.comment`（差し戻し理由）はユーザー入力テキストが DB に保存され申請詳細画面に表示される。Next.js + React の自動エスケープにより XSS リスクは低いが、spec.md に入力長制限（最大文字数）の要件が存在しない。異常に長いコメントが投稿された場合の UI 崩れおよびストレージ上限の問題が発生しうる。 | spec.md の差し戻しシナリオか tasks.md T-10 に、`comment` フィールドの最大文字数（例: 1000 文字）を Server Action の Zod スキーマで検証することを追記する。または設計上の既知制限として明示する。 |
