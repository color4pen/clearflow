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
| 1 | MEDIUM | Security / Inconsistency | tasks.md T-01, T-03 | T-01 は「usecase の reason をそのまま返す（usecase 側でメッセージは制御されている）」と記述しているが、この前提は `createMeeting`・`createContractAdjustment`・`watchDeal`・`unwatchDeal` に対して成立しない。これらは `catch (err) { reason: err instanceof Error ? err.message : "固定文言" }` パターンを使用しており、DB 例外（制約名・スキーマ情報を含む）が `result.reason` に混入しうる。T-03 AC「usecase が返すエラーがそのままツール結果に反映される」に従うと、この DB エラー詳細がクライアントに到達し、spec.md の「素通ししない MUST」要件と矛盾する。request.md 必須事項 #3「usecase の Result `reason` に例外メッセージが入る経路をツール結果へ素通ししない」も同様に違反する。 | T-01 の "reason をそのまま返す" の前提説明を次のように修正する: 「usecase が返す reason のうち、ドメインバリデーション起因（`"案件が見つかりません"` 等）はそのまま返してよい。ただし watchDeal/createMeeting/createContractAdjustment/createInvoiceAdjustment/markNotificationsAsRead は例外メッセージを reason に混入させうるため、`{ ok: false }` の場合は `toToolError` に reason をそのまま渡さず固定文言（例: `"操作に失敗しました"` ）を使うか、あるいは usecase を修正して例外を reason に漏らさないようにする。」T-03 AC の「そのままツール結果に反映される」は `isError: true` になること（内容ではなく型）を指すよう明確化する。 |
| 2 | MEDIUM | Test Coverage / Audit | tasks.md T-06, T-11 | T-06/T-11 の監査記録テストは usecase 全体をモックするため、実際には `recordAudit` が一度も呼ばれない。T-06 は「usecase が呼ばれること = 監査記録されること（usecase 実装から推論）」と明記しており、これは request.md 必須事項 #1「監査呼び出しを assert する」に反する。usecase モックが差し込まれた状態では usecase 内のトランザクション（`recordAudit` を含む）は実行されず、将来 usecase から `recordAudit` 呼び出しが削除されてもこのテストは検出できない。 | T-06/T-11 を修正して、usecase 全体をモックするのではなく、インフラ依存（`interactionRepository.create`・`actionItemRepository.create` 等）と `@/application/services/auditRecorder` の `recordAudit` を個別にモックし、ハンドラ → usecase → `recordAudit` の実行経路全体を検証する。`recordAudit` が `action: "interaction.create"`（または `"action_item.create"`）で呼ばれたことを直接 assert する。この方式はテスト複雑度が上がるが、受け入れ基準「書き込みが監査ログに記録される」を実行検証で固定するために必要。 |
| 3 | LOW | Security / Coverage Gap | spec.md | 「エラー変換で内部詳細を漏らさない」のシナリオが「usecase が DB 例外をスローする」ケースのみを対象とし、「usecase が例外を catch して `result.reason` に格納するケース」を記述していない。本コードベースの実装パターン（`catch (err) { reason: err.message ... }`）では、後者のケースが DB エラー露出の主要経路であり、spec のシナリオが示すケースより発生頻度が高い。 | シナリオに次のケースを追加: 「Given usecase が DB 例外を catch して `{ ok: false, reason: err.message }` を返す / When ツールハンドラがその result を受け取る / Then クライアントには固定文言が返り、`err.message` の内容は含まれない」。これにより、実装者が `result.reason` の素通しを防ぐべき経路を明確に把握できる。 |
| 4 | LOW | Robustness | tasks.md T-04 | `notifications` の `list` operation で `userRepository.findById` が `null` を返すケース（認証済みだがユーザーレコードが存在しない edge case）の処理が未定義。T-04 はユーザーレコード取得後に `notificationsLastSeenAt` を参照するが、`null` の場合のフォールバックが指定されていない。 | T-04 に「`userRepository.findById` が `null` を返す場合は `notificationsLastSeenAt: null` として `getNotifications` を呼ぶ（認証済みユーザーは存在するはずだが、race condition 保護として null をそのまま渡す）」と明記する。または `null` の場合は `toToolError("ユーザー情報の取得に失敗しました")` でエラーを返す方針を明確にする。 |

## Summary

仕様は mcp-server-core で確立した方針（リソース単位 + operation・usecase 共有・canPerform 認可・テナント分離・behavioral test）を一貫して踏襲しており、4 ツール分の受け入れ基準・シナリオ・タスクが整合している。HIGH/CRITICAL 級の致命的欠陥はなく、実装可能な状態。

MEDIUM 2 件はいずれも実装指示（tasks.md）と仕様要件（spec.md / request.md）の矛盾であり、実装者が tasks.md の記述を優先すると security 要件違反になる。`result.reason` の素通し問題（Finding #1）と監査テストの間接検証（Finding #2）は実装フェーズで混乱を招く可能性があるため、tasks.md の該当箇所を修正することを推奨する。LOW 2 件は実装者向けの補足事項であり、承認を阻害しない。
