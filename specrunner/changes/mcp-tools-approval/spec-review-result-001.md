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
| 1 | HIGH | Spec/Design Contradiction | spec.md §Scenario: member ロールの action_required フィルタ | spec.md は「member ロールが filter="action_required" で呼ぶと空配列が返される（member のステップがないため）」と記述する。しかし design.md D2 および tasks.md T-01 は「ステップなし legacy リクエスト（approvalSteps=[]）も action_required に含む」と明記しており、tasks.md T-06 では同じ filter を member ロールで呼んだとき req-4（ステップなし legacy）が返されることをアサートする。spec.md の説明文はステップなし legacy を考慮していないため、spec を参照してテストを実装すると T-06 の期待値と矛盾する結果になる。「ステップなし legacy を member にも返すべきか否か」の policy が spec と design/tasks で不一致。 | spec.md の Scenario を修正して design.md/tasks.md と整合させる。ステップなし legacy を action_required に含む設計が採用済みであれば、Scenario の Given に「approvalSteps=[] の pending リクエスト（legacy）も存在する」ケースを追加し、Then を「legacy リクエストのみが返される」に改訂する。または、ステップなし legacy を action_required から除く設計に変更する場合は design.md D2 と tasks.md T-01/T-06 を修正する。 |
| 2 | MEDIUM | Test Consistency | tasks.md T-05/T-14 vs src/__tests__/mcp/mcpToolsRegistration.test.ts (TC-025) | TC-025 は「7 ツール」を期待しているが、route.ts はすでに 11 ツールを登録しており現時点で乖離している。T-05 の Acceptance Criteria は「15 ツール（既存 11 + 新規 4）を登録する」としているが、T-14 は「既存テスト無変更で green」と指定する。新規 4 ツール追加後に TC-025 は「7 ≠ 15」で失敗するため、「既存テスト無変更」と「T-05 の Acceptance Criteria」が両立しない。 | tasks.md の T-05 または T-14 に「TC-025 (mcpToolsRegistration.test.ts) を更新し、期待ツール数を 15 に変更してツール名リストを最新化する」を明示的なサブタスクとして追加する。T-14 の「既存テスト無変更」の定義から TC-025 を除外し、更新対象であることを明記する。 |
| 3 | MEDIUM | Security / Information Disclosure | tasks.md T-01〜T-04（`toToolError(result.reason)` の使用） | `approveRequest`, `rejectRequest` の catch ブロックは `err instanceof Error ? err.message : "固定文言"` パターンで reason を設定する（rejectRequest.ts L141, approveRequest.ts L322 等）。OPTIMISTIC_LOCK_ERROR や業務エラーは許容だが、try ブロック内で DB ドライバが直接 throw する例外（接続切断、constraint violation 等）が同じ catch に落ちると、DB ドライバ固有のメッセージが `err.message` 経由で reason に混入し、`toToolError(result.reason)` でクライアントに届く経路がある。D10 では「MCP 外側の catch で handleToolError を使う安全策」を採用しているが、これは usecase 外の例外のみを補足する。usecase 内 catch 経由の DB 例外はこの安全策で捕捉できない。 | tasks.md に「usecase の catch ブロックが返す result.reason に DB ドライバ固有の例外メッセージが混入しないことを確認する検証項目」を追加する。または、MCP ツールレイヤーで `result.reason` をそのまま `toToolError` に渡す前に、業務エラー（既知パターン）か否かを判定するホワイトリストフィルタを挟む安全策を tasks.md に明記する。 |
| 4 | MEDIUM | Authorization / Semantic Mismatch | tasks.md T-01（create operation の canPerform 判定） | approval_requests.create の認可判定に `canPerform(role, "approval", "listRequests")` を使用している。authorization.ts に `approval.create` が存在しないための代替措置だが、将来 `listRequests` の許可ロールが変更された場合に create 権限も意図せず変わるリスクがある。認可マトリクスの読者・審査者が「create が listRequests の権限を借用している」意図を把握できず、セキュリティレビュー時の混乱源になる。 | `src/domain/authorization.ts` の `approval` エントリに `create: ALL_ROLES` を追加して create 専用のエントリを設け、tasks.md T-01 で `canPerform(role, "approval", "create")` を参照するよう修正する。最低限、tasks.md にコメント形式で代替理由（「approval.create は ALL_ROLES のため listRequests を代替利用」）を明記する。 |
| 5 | LOW | Design / API Consistency | design.md D2, tasks.md T-01（filter="all" の挙動） | filter 未指定時は全件を返す（authorization のみチェック）が、filter="all" 明示時は admin/manager 以外は空配列を返す。同一データセットに対して filter の有無によって返り値が変わる非対称な設計はエージェントの混乱を招く（「なぜ filter なしでは全件見えるのに "all" を指定すると空配列になるのか」という疑問が生じる）。 | ツールの description に filter 各値の挙動の差異（特に未指定 vs "all"）を明記するか、filter 未指定のデフォルト挙動を role に応じた最適ビュー（my_requests 相当）に変更することを検討する。少なくとも tasks.md に「filter 未指定と "all" の返り値が異なる理由」をコメントで明記する。 |
| 6 | LOW | Performance Risk | tasks.md T-02（delegations deactivate operation） | admin 以外のユーザーの deactivate で `approvalDelegationRepository.findByOrganization(organizationId)` で組織内全委任を取得してから線形探索する（Server Action と同一ロジック）。委任数が多い組織では全件取得→線形探索のコストが増大する。直接 `findById(delegationId, organizationId)` を使えば効率的に解決できる。 | repository に `findById(delegationId, organizationId)` メソッドが存在するか確認し、あれば tasks.md T-02 でそれを使用するよう修正する。存在しない場合は現設計（findByOrganization）を許容し、将来の最適化候補として設計に記録する。 |
| 7 | LOW | Missing Idempotency / Retry Safety | tasks.md 全体（MCP ツールのべき等性） | Server Action には submit, approve, reject, resubmit に idempotencyKey による重複実行防止機構があるが、MCP ツールには実装されていない。エージェントのリトライや一時的なネットワーク障害時に submit/resubmit が二重実行される可能性がある。楽観的ロックが approve の二重実行は防ぐが、submit/resubmit の二重実行はステータスが draft→pending の遷移なので楽観的ロックが介在しない場合がある（version チェックあり）。 | MCP ツールのべき等性がスコープ外であることを tasks.md または design.md に明示し、エージェント利用者がリトライ戦略を把握できるようにする。将来課題として idempotencyKey 対応を記録する。 |
