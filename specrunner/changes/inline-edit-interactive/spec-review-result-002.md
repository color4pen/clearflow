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
| 1 | HIGH | Security (OWASP A01 - Broken Access Control) | `tasks.md` — T-07 | `updateMeetingAction` のロールチェックは T-09 で追加されたが、`updateInquiryAction` への同等の保護が T-07 に含まれていない。現状の `updateInquiryAction`（`src/app/actions/inquiries.ts:157`）は認証チェックのみで、admin/manager チェックを持たない。一方 `updateDealAction`・`updateContractAction` はどちらも `session.user.role !== "admin" && session.user.role !== "manager"` を持つ。spec の権限要件（member/finance は編集不可）は UI の `editable=false` のみで担保しており、member ユーザーが `updateInquiryAction` を HTTP 直呼び出しすれば引き合いを書き換えられる。 | T-07 に「`src/app/actions/inquiries.ts` の `updateInquiryAction` に admin/manager ロールチェックを追加する。member/finance には `{ message: "権限がありません" }` を返す」を追加し、`updateDealAction`・`updateContractAction` と一致させる。 |
| 2 | MEDIUM | Inconsistency (spec internal) | `spec.md` — Requirement と Scenario の矛盾 | Requirement 本文（line 87–89）は「全商談の**未完了**アクションアイテムを集約表示するセクションを含む MUST」と明記しているが、Scenario「完了済みアイテムの未完了への切り戻し」は「**完了済みの**アクションアイテムが表示されている」を Given にしており、同一仕様書内で矛盾する。tasks.md T-09 実装指示（「全アクションアイテム（完了・未完了とも）を抽出し」「完了済みアイテムは line-through スタイル」）も完全表示を前提としており、request.md の「未完了のみ表示」とも不一致。実装者がどちらに従うか判断できない。 | 「未完了のみ表示」か「完了済みも表示（グレーアウト）」かを決定し、spec.md の Requirement 文言・Scenario・tasks.md T-09 の実装指示・request.md を一致させる。 |
| 3 | LOW | Spec gap (validation constraint) | `spec.md` — Scenario: 件名のインライン編集 | Scenario の Then が「`updateInquiryAction` が呼ばれ、件名が更新される」のみで、`updateInquiryAction` が `title` に加えて `source` も必須フィールドとして要求することを示していない。tasks.md T-07 はフルフォーム送信を明記しているが、spec.md からテスト仕様を生成する場合に件名のみ送信するケースが作られ、バリデーションエラーに気づかないリスクがある。 | spec.md の件名インライン編集 Scenario の Then に「FormData には既存の `source`（および他の必須フィールド）も含めて送信される」を補足する。または spec.md に Note として「引き合い更新は全必須フィールドを送信すること（tasks.md T-07 参照）」を追記する。 |

## Progress from result-001

以下の指摘は今回のサイクルで解消された:

- ~~Finding #1 (HIGH): `updateMeetingAction` ロールチェック未定義~~ → T-09 で追加済み ✓
- ~~Finding #2 (HIGH): T-09/T-11 のロールチェックタスク不在~~ → T-09 に追加、T-11 が T-09 を参照 ✓
- ~~Finding #4 (MEDIUM): `updateMeetingAction` 呼び出し方式未定義~~ → T-09・T-11 に `bind(null, {})` パターン明記 ✓
