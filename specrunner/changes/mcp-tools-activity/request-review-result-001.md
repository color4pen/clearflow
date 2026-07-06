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
| 1 | MEDIUM | Scope Ambiguity | 要件5「同じ canPerform 判定」/ watches ツール | `watches.ts` Server Action は `canPerform` を一切呼ばない（認証のみ）。権限マトリクスにも `watch` エンティティが存在しない。「同じ canPerform 判定」という表現が、deals.ts 等のパターンと混同して誤った canPerform 呼び出しを誘発する可能性がある。 | design.md に「watches は認証のみ（全認証ユーザーが自分のウォッチを操作可能。canPerform 不要）」と明記し、Server Action との整合を文書化すること。 |
| 2 | LOW | Implementation Clarity | notifications ツール / `getNotifications` ユースケース | `getNotifications` は第三引数に `notificationsLastSeenAt: Date \| null` を必要とするが、MCP authInfo（Bearer トークン）にはこの値が含まれない。Server Action はセッション経由で取得しているが、MCP 経路では `userRepository.findById(userId, organizationId)` を事前に呼ぶ追加ステップが必要。インフラは対応済み（`notificationsLastSeenAt` を返す `findById` が存在する）が、request に言及がない。 | 暗黙の実装要件として spec.md または design.md に「notifications ツールは userId から user を lookup し notificationsLastSeenAt を取得してから getNotifications を呼ぶ」を明記することを推奨。実装可能であり阻害要因ではない。 |
| 3 | LOW | Implementation Clarity | 実装上の必須事項 #3 / watches・interactions ツール | `watchDeal`・`unwatchDeal`・`createContractAdjustment`・`createMeeting` ユースケースはいずれも `reason: err instanceof Error ? err.message : "固定文言"` の形式で DB 例外メッセージを result.reason に格納する。必須事項 #3 でこの経路は素通し禁止とされているが、これらの具体的なユースケースで特に注意が必要。 | 実装時にこれらのユースケースからの `result.reason` を MCP クライアントへそのまま返さず、固定文言（例: "操作に失敗しました"）に置換すること。必須事項 #3 でカバー済みのため阻害要因ではない。 |

## Summary

mcp-server-core で確立したパターン（ユースケース共有・canPerform パリティ・エラー変換・behavioral テスト）を踏襲する構成として一貫性がある。要求する全ユースケース（`createMeeting`/`updateMeeting`/`createContractAdjustment`/`createInvoiceAdjustment`/`createActionItem`〜`searchMeetings`/`watchDeal`/`unwatchDeal`/`getNotifications`/`markNotificationsAsRead`）がコードベースに存在し、受け入れ基準はすべて behavioral テストで検証可能。HIGH findings なし。
