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

## Previous Findings Resolution (spec-review-result-001.md)

| # | Severity | Previous Finding | Status |
|---|----------|-----------------|--------|
| 1 | HIGH | `z.string().datetime()` が `<input type="date">` 出力を拒否する | **RESOLVED** — tasks.md T-02 が `z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()` に統一し `.datetime()` 使用禁止を明記 |
| 2 | MEDIUM | spec.md と tasks.md T-06 でリダイレクト先が不一致 | **RESOLVED** — spec.md は「契約詳細ページ（`/contracts/{contractId}`）」と明記し tasks.md T-06 と整合 |
| 3 | MEDIUM | `updateInvoiceStatusAction` にレートリミットがない | **RESOLVED** — tasks.md T-02 に `checkRateLimit` 追加が明記された |
| 4 | LOW | `paidAt` に未来日付バリデーションがない | **RESOLVED** — tasks.md T-02 に `.refine` バリデーションが追加され spec.md にシナリオも追記された |

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | MEDIUM | Functional Bug | tasks.md T-02 / spec.md | `paidAt` の未来日付バリデーションが `.refine(val => !val \|\| val <= new Date().toISOString().slice(0, 10), ...)` と規定されているが、`new Date().toISOString()` はサーバーの UTC 時刻を返す。サーバーが UTC 環境で動作する場合、JST ユーザーは 0:00–9:00 JST（= UTC 前日）にあたる 9 時間、今日の JST 日付を入力すると「入金日は本日以前の日付を指定してください」エラーで拒否される。デフォルト値（spec.md: 「現在日付」）を JST で生成するクライアントと UTC で比較するサーバーが不整合になり、ハッピーパス（デフォルト値そのまま確認）が失敗する | 検証式を JST 基準に修正する。例: `new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)` を today として使用する。またはサーバーのタイムゾーン設定 (`TZ=Asia/Tokyo`) を前提に `new Date().toLocaleDateString('en-CA')` を使用することを明記する。さらに spec.md の「デフォルト値は現在日付」も「JST 基準の現在日付」と明記し、クライアント側の実装指針と整合させる |
| 2 | LOW | Security | tasks.md T-06 | 請求登録ページ（`/contracts/[id]/invoices/new`）の Server Component で `canPerform(role, "invoice", "create")` チェックが指定されていない。`createInvoiceAction` はサーバーサイドで権限検証するため機能的な脆弱性ではないが、権限のないユーザーにフォームが表示される。詳細ページ（T-04）が `canPerform` 明記しているのに登録ページで省略するのは一貫性欠如 | T-06 の受け入れ基準に「`canPerform(role, "invoice", "create")` が false の場合はフォームを表示せず権限不足メッセージを表示する」を追加する |
| 3 | LOW | Completeness | tasks.md T-02 | Zod スキーマ `paidAt` は `z.string()` で検証されるが、`updateInvoiceStatus` ユースケースの入力型は `paidAt?: Date` を期待する。Server Action でパース済み文字列を Date に変換する手順（`paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : undefined`）が T-02 に記載されていない。既存コードの `issueDate` / `dueDate` では同様の変換が実施されており、実装者が見落とす可能性がある | T-02 の Action 変更項目に「`parsed.data.paidAt` を `new Date(parsed.data.paidAt)` に変換してユースケースに渡す」ことを明記する |

## Summary

spec-review-result-001.md で指摘した 4 件（HIGH 1 件、MEDIUM 2 件、LOW 1 件）はすべて tasks.md / spec.md に反映されており解消済み。新たに発見した問題は MEDIUM 1 件（タイムゾーン起因の paidAt バリデーション不整合）と LOW 2 件。

ドメイン不変条件の観点:
- `getInvoice` は `organizationId` を引数に取り `invoiceRepository.findById(id, organizationId)` でテナント分離される（T-03 AC で明示）
- `updateInvoiceStatus` / `createInvoice` はともにトランザクション内で `auditLogRepository.create` を呼び出す既存実装があり、今回の変更（paidAt 追加・overdue→paid）はそのコードパスを踏み続ける
- URL の contractId 照合（T-04）により IDOR 相当のアクセスが防止される
- `overdue → paid` 遷移追加はドメインサービスへの単純な遷移定義追加であり、承認ワークフローの不変条件に影響しない

CRITICAL / HIGH 相当の欠陥なし。MEDIUM の timezone 問題は次ステップ実装前に修正を推奨するが、blocking には至らないと判断する。
