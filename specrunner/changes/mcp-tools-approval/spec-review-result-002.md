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

## Previous Findings Resolution (001 → 002)

前回レビュー（001）の 7 件すべてが対処済みであることを確認した。

| # | Severity | 前回分類 | 解決状況 |
|---|----------|----------|---------|
| 1 | HIGH | Spec/Design Contradiction（member + legacy） | ✅ spec.md の member シナリオが修正済み。Given に legacy リクエストが追加され、Then が「ステップなし legacy リクエストのみが返される」に改訂。design.md D2 / tasks.md T-01/T-06 と整合 |
| 2 | MEDIUM | Test Consistency（TC-025） | ✅ tasks.md T-05 に「TC-025 を 15 ツールに更新する」サブタスクが追加。T-14 から TC-025 が「既存テスト無変更」の対象外として明示的に除外 |
| 3 | MEDIUM | Security / Information Disclosure | ✅ tasks.md T-01 の approve/reject/submit/resubmit 各 operation に result.reason のサニタイズ（既知業務エラー → 通過、未知メッセージ → 固定文言）が明記 |
| 4 | MEDIUM | Authorization / Semantic Mismatch（create で listRequests 代替） | ✅ tasks.md T-01 に代替理由（approval.create エントリ不在のため ALL_ROLES の listRequests を使用）と将来改善推奨がコメントで明記 |
| 5 | LOW | Design/API Consistency（filter="all" 非対称） | ✅ design.md D2 に「非対称挙動の注記」ブロックが追加され、T-01 実装時にツール description へ明記するよう指示 |
| 6 | LOW | Performance Risk（delegations deactivate） | ✅ tasks.md T-02 に findByOrganization の制約と将来の最適化候補が明記 |
| 7 | LOW | Missing Idempotency / Retry Safety | ✅ design.md Non-Goals に idempotencyKey 未実装の理由と将来課題が明記 |

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | LOW | Spec Completeness | spec.md §Scenario: manager ロールの action_required フィルタ | manager シナリオの Given は「manager ステップ pending / finance ステップ pending の 2 件」のみを含み、legacy（ステップなし）リクエストが存在しない。Then の「manager ステップが pending のリクエストのみが返される」の「のみ」が、legacy リクエストを除外する意図に誤読される可能性がある。tasks.md T-06 は同一 filter で manager が req-1（manager-step）と req-4（legacy）の両方を受け取ることをアサートしており、仕様は自己矛盾しないが legacy の扱いが spec から読み取れない。 | spec.md の manager シナリオに「legacy リクエスト（ステップなし pending）が存在する場合も manager に返される」旨を付記するか、legacy 含むシナリオを追加して tasks.md T-06 のテストフィクスチャと対応させる。 |
| 2 | LOW | Security / Implementation Clarity | tasks.md T-01（approve/reject/submit/resubmit サニタイズのホワイトリスト未定義） | tasks.md は「既知の業務エラーメッセージ（楽観的ロック衝突・期限切れ等）」をホワイトリストとして通過させ、未知メッセージを固定文言に差し替えると指定するが、ホワイトリストの具体的な文字列を列挙していない。spec.md のシナリオは「All approval steps are already completed.」が結果に含まれると明示する一方、tasks.md T-07 のテストアサーションは「拒否メッセージが含まれること」のみで当該文字列を検証しない。ホワイトリストが過小に定義された場合、spec が期待するメッセージが固定文言に差し替えられても T-07 は pass するため、spec との乖離が検出されない経路がある。 | tasks.md T-01 の approve operation に、ホワイトリスト例として「"All approval steps are already completed."（ステップ完了済み）」「"楽観的ロック衝突メッセージ"」を例示するか、T-07 のアサーションを「"All approval steps are already completed." を含む」と具体化する。 |
| 3 | LOW | Spec Completeness | tasks.md T-03, T-04（update/delete/toggle のレート制限キー未定義） | T-03 create では `key: "mcp:createTemplate:${userId}"` が明示されているが、T-03 update・delete と T-04 update・toggle は「checkRateLimit でレート制限」のみ記載されキー名がない。実装者は既存ツールのパターン（`mcp:<operation><Resource>:${userId}` 等）から推測する必要がある。 | tasks.md T-03/T-04 の update/delete/toggle に、他 operation と同形式のレート制限キーを明記する（例: `mcp:updateTemplate:${userId}`, `mcp:deleteTemplate:${userId}`, `mcp:updatePolicy:${userId}`, `mcp:togglePolicy:${userId}`, createRequest リミット使用）。 |
