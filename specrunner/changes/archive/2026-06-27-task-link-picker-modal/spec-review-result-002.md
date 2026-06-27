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

## Summary

spec-review-result-001 で指摘された 4 件の HIGH および 4 件の MEDIUM は全件解消済み。request.md・design.md・spec.md・tasks.md の一貫性が確認できた。テナント分離（organizationId はセッション取得、リポジトリ層で必ず絞り込み）・監査ログ（新規追加操作はすべて READ のみ、状態変更なし）・アーキテクチャ境界（usecases → lib、UI 層からの逆 import 禁止）の各不変条件を仕様が正しく保証している。新規発見事項は MEDIUM 2 件・LOW 2 件。いずれも実装開始を妨げるものではない。

## Previous Findings Resolution

| 旧 # | 旧 Severity | 解決状況 | 根拠 |
|------|------------|---------|------|
| 1 | HIGH | ✅ FIXED | design.md D1 が「usecase での不変条件強制は行わない」と明示し request.md 要件4と一致 |
| 2 | HIGH | ✅ FIXED | tasks.md T-04 が「createActionItem.ts / updateActionItem.ts は変更しない」と明確化 |
| 3 | HIGH | ✅ FIXED | spec.md 単一紐づけ Requirement の SHALL 文が呼び出し元（TaskList / ActionItemRow）を対象とし usecase を除外している |
| 4 | HIGH | ✅ FIXED | spec.md に MeetingActionItemsSection 保護シナリオ 2 件が追加された |
| 5 | MEDIUM | ✅ FIXED | T-02 が `src/lib/dateUtils.ts` への formatDateJP 切り出しと listActionItems.ts の import 切り替えを明示 |
| 6 | MEDIUM | ✅ FIXED | T-03 に `checkRateLimit` 呼び出し・AC 記述が追加された |
| 7 | MEDIUM | ✅ FIXED | T-02 が meetingTypeLabels を `src/lib/meetingLabels.ts` へ移動し labels.ts は re-export する設計に変更 |
| 8 | MEDIUM | ✅ FIXED | T-04 AC が「createActionItem.ts と updateActionItem.ts に FK 排他ロジックが追加されていない」「呼び出し元が単一 FK をセットして送信する」と統一 |
| 9 | LOW | ✅ FIXED | T-05 に `useEffect` cleanup（`clearTimeout`）のコードサンプルと AC が追加された |
| 10 | LOW | ✅ FIXED | T-09 に MeetingActionItemsSection 保護テスト（createActionItem.ts に dealId=null ロジックが無いことの静的検証）が追加された |

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | MEDIUM | Security — rate limit value ambiguity | `tasks.md` T-03 / `src/infrastructure/rateLimit.ts` | T-03 は「既存の createActionItemAction 等と同じパターン」と記述するが、実コードの `RATE_LIMITS.createRequest` は 10req/分に設定されている。300ms デバウンスの検索 UI では 1 回の入力セッションで数回の呼び出しが発生し得るが、複数タブ・素早い検索操作の組み合わせで容易に上限に達する。検索は可変的な操作頻度を持ち、CREATE アクションとは性質が異なる。実装者が `RATE_LIMITS.createRequest` をそのまま流用すると UX が壊れるリスクがある。 | `rateLimit.ts` の `RATE_LIMITS` に `search: { limit: 60, windowMs: 60_000 }` 等の検索専用エントリを追加する。T-03 の AC にも「`RATE_LIMITS.search`（または相当する寛容な値）を使用する」と明記し、実装者が迷わないようにする。 |
| 2 | MEDIUM | Security — input validation (OWASP A03) | `tasks.md` T-03 | `searchLinkTargetsAction` の Zod スキーマは `z.string()` のみで `query` の最大長を制限していない。意図的に長い文字列（数千文字）を渡すと `ilike('%<長文字列>%')` が高負荷な DB スキャンを引き起こす可能性がある。LIMIT 20 はヒット件数を抑制するが、検索文字列長自体は DB エンジンに渡る前に制限すべきである。 | T-03 の入力スキーマを `z.object({ type: z.enum(["deal", "inquiry", "meeting"]), query: z.string().max(100) })` のように修正する。100 文字程度で十分で、正常なユーザー操作の範囲を超えた入力をブロックできる。 |
| 3 | LOW | Implicit data loss — meeting-created task edit from global task list | `tasks.md` T-07 | meetingId+dealId を両方持つタスク（MeetingActionItemsSection 経由で作成）をグローバルタスク一覧から編集した場合、ActionItemRow が linkTarget を dealId 優先（dealId → meetingId の優先順）で組み立てる。ユーザーが紐づけ先を変更せずに説明のみを更新して保存しても、updateActionItemAction には `dealId=D1, meetingId=null` が送られ meetingId が暗黙に失われる。これは既知のアーキテクチャ上のトレードオフ（グローバルタスク一覧でのピッカー操作は単一紐づけに正規化する）だが、仕様上のドキュメントがない。 | T-07 に注記として「グローバルタスク一覧から meetingId+dealId 両方を持つタスクを編集した場合、dealId が優先されるため保存時に meetingId が null に更新される。これはピッカー経由の編集による設計上の正規化動作である」と明記する。また spec.md にシナリオ（「グローバルタスク一覧での編集後 meetingId は null になる」）を追記することで、実装者・テスト担当者が意図的な動作と認識できる。 |
| 4 | LOW | Unspecified empty-query behavior | `tasks.md` T-01 / `spec.md` | `searchByTitle(O1, "")` が呼ばれた場合、`ilike(title, '%%')` は全件にマッチし LINK_SEARCH_LIMIT（20）件を返す。これが意図した「タブ初期表示時に上位候補を出す」仕様なのか、クライアント側で空クエリ時は呼ばない前提なのかが spec.md / tasks.md のいずれにも明記されていない。LinkTargetPicker T-05 は「入力をデバウンスして呼ぶ」と記述するが空文字の取り扱いが未定義。 | T-05 または spec.md に「検索ボックスが空の場合はタスクの送信を行わない（または空クエリは全件返却として上位候補を表示する）」いずれかの動作を明示する。T-09 の静的テストにも関連する AC を追記することが望ましい。 |
