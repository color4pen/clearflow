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
| 1 | MEDIUM | Scope accuracy | request.md > 背景・要件 | "update usecase を持つ全エンティティにロールアウトを完了する" と記述しているが、`updatePolicy.ts`（`approval_policies` テーブル）と `updateTemplate.ts`（`approval_templates` テーブル）も update usecase を持ち、かつ `version` カラムを持たない。これら2エンティティは本リクエストのスコープ外かつ除外理由の明示もない。受け入れ基準は3エンティティに限定されており実装上は問題ないが、「完了」という表現が誤解を招く。 | スコープ外 4. の節に「approval_policies / approval_templates は管理者専用かつ同時競合頻度が極めて低いため今回対象外」等の除外理由を明記するか、対象エンティティを追加することを検討する。 |
| 2 | LOW | Clarity | request.md > 要件 6 | ロック失敗時のメッセージが「この<対象>は他のユーザーによって更新されました。画面を更新してください」と角括弧付きプレースホルダーになっており、3エンティティそれぞれの実際の文言が不明確。 | 「この商談は〜」「このアクションアイテムは〜」「この売上目標は〜」のように各エンティティの具体的な文言を明示するか、または「<対象>をエンティティ名に置換する」旨を補足する。 |

## Review Notes

### Validation summary

- **Schema facts**: `meetings` / `action_items` / `revenue_targets` テーブルに `version` カラムが存在しないことを `src/infrastructure/schema.ts` で確認済み。`requests`・`approval_steps`・`inquiries`・`deals`・`contracts`・`invoices` には既に `version integer NOT NULL DEFAULT 1` が存在し、既存ロールアウト範囲は正確。
- **Domain models**: `Meeting` / `ActionItem` / `RevenueTarget` 型に `version` フィールドが存在しないことを `src/domain/models/` 3ファイルで確認済み。
- **Repository lines**: `meetingRepository.update`（L102）・`actionItemRepository.update`（L106）・`revenueTargetRepository.update`（L124）のいずれも `version` チェックなしで `id + organizationId` のみの WHERE であることを確認済み。
- **Usecase routing**: `updateActionItem` と `toggleActionItemDone` が両方 `actionItemRepository.update` を経由することを確認済み。リポジトリ 1 メソッドの version 化で2 usecase をカバーするという設計判断 5 は正しい。
- **Migration pattern**: `drizzle/0009_contract_invoice_version.sql` が `ALTER TABLE ... ADD COLUMN "version" integer DEFAULT 1 NOT NULL` を使用しており、今回の差分マイグレーション方針は既存パターンと一致する。
- **ADR-005 conformance**: integer version + null 返却パターン + Result 型でのロック失敗通知は ADR-005 の決定 D1〜D3 に完全に準拠している。`invoiceRepository.ts` の実装が今回の参照実装として適切。
- **Acceptance criteria**: 3エンティティの version カラム追加・型追加・リポジトリ楽観的ロック・usecase 統合・テスト（不一致拒否・一致成功・インクリメント）の各項目は測定可能かつ実装指示として十分。

### Scope note

`updatePolicy.ts` と `updateTemplate.ts` が update usecase として存在し `approval_policies` / `approval_templates` テーブルには version がないことを確認した（Finding #1）。ただしこれは本リクエストの合否を左右するものではなく、「完了」表現の誤解リスクに関する指摘にとどまる。
