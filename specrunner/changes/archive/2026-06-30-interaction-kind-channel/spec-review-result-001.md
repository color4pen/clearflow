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
| 1 | HIGH | Correctness / Runtime Failure Risk | `design.md` — Migration Plan | Migration Plan の Step 1「コード変更を先行デプロイ（kind=note で記録開始）」と Step 3「`db:migrate` を実行」の順序が逆。新コードは `kind: "note"` を INSERT するが、移行前の DB enum (`meeting \| call \| email \| contract_adjustment \| invoice_adjustment`) に `"note"` は存在しないため、マイグレーション未適用の状態でコードを稼働させると `createContractAdjustment` / `createInvoiceAdjustment` の呼び出しが PostgreSQL エラー（`invalid input value for enum interaction_kind: "note"`）で失敗する。 | Migration Plan の順序を「① `db:migrate` を実行（UPDATE → enum 再作成）→ ② コードをデプロイ」に修正する。ロールバック戦略は変わらない。コードが先行する必要がある場合は、先に `ALTER TYPE ... ADD VALUE 'note'` のみ実行して enum に値を追加し、その後コードをデプロイ、後日 enum 再作成マイグレーションを適用する 2 フェーズ戦略を検討すること。 |
| 2 | MEDIUM | Implementation Gap | `tasks.md` — T-03 | T-03 は `0018_interaction_kind_channel.sql` の作成と `drizzle/meta/_journal.json` へのエントリ追加を指示しているが、各マイグレーションに対応する Drizzle スナップショットファイル（`drizzle/meta/0018_snapshot.json`）の作成を明示していない。スナップショットがなければ `drizzle-kit check` が失敗し、`bun run db:generate` の「追加差分なし」確認も正しく機能しない（0017 スナップショットと schema.ts の乖離を新たな差分として検出し、重複マイグレーションを生成する）。 | T-03 に以下のステップを追加する: (a) schema.ts 更新後に `bun run db:generate` を実行して SQL・スナップショット・journal エントリを自動生成させる、(b) 生成された SQL を手書き版（7 ステップの安全な手順）で上書きする、(c) `0018_snapshot.json` はそのまま保持する。これにより「追加差分なし」確認は schema.ts と SQL が整合した状態で 2 回目の `db:generate` を実行して検証できる。 |
| 3 | LOW | Verification Gap | `tasks.md` — T-16 | T-16 の grep チェックは `contract_adjustment` / `invoice_adjustment`（kind 値）の残存を確認するが、旧認可操作名 `recordContractAdjustment` / `recordInvoiceAdjustment` の残存チェックが含まれていない。T-06/T-07/T-08 が 4 ファイルにわたるリネームを個別に指示しているが、1 ファイルでも漏れると `canPerform` の deny-by-default により全ロールが権限エラーになる（機能停止）。T-16 による横断チェックで確実性を高める必要がある。 | T-16 に「`recordContractAdjustment` / `recordInvoiceAdjustment` がソースコード（SQL を除く）から除去されていることを grep で確認する」ステップを追加する。 |
| 4 | LOW | Security — Authorization Consistency | `src/domain/authorization.ts`, `src/app/actions/interactions.ts`, `src/app/(dashboard)/contracts/[id]/page.tsx`, `src/app/(dashboard)/contracts/[id]/invoices/[invoiceId]/page.tsx` | 認可操作名のリネーム（`recordContractAdjustment` → `recordContractInteraction`、`recordInvoiceAdjustment` → `recordInvoiceInteraction`）は 4 ファイルで原子的に行う必要がある。partial リネームの場合、`canPerform` の deny-by-default によりその操作は全ロールに拒否される。specs は全 4 箇所を明示しているが、実装上のリスクとして明記する。 | T-07・T-08 実装後に T-16 の grep チェック（Finding 3 の修正後）で確認する。追加の対応は不要だが、実装者は 4 ファイルを同一コミットで変更することを推奨する。 |

## Review Notes

### 仕様の整合性（全体評価）

request.md・design.md・tasks.md・spec.md の 4 ファイルは高い整合性を持っており、要件・設計判断・タスク・シナリオが一貫して連携している。主要な設計判断（D1–D6）は architect 評価済みであり、CRM/SFA の定石に合致した enum 整理として合理的。

### マイグレーション安全性

T-03 の 7 ステップ手順（UPDATE → DEFAULT DROP → 新 enum 作成 → 列型差し替え → DEFAULT 再設定 → 旧 enum DROP → RENAME）は PostgreSQL の enum 削除不可制約に対する標準的な対処法であり、設計上正しい。`DROP COLUMN / DELETE / TRUNCATE` の排除要件も spec.md シナリオで検証可能な形式で記述されている。

### セキュリティ（OWASP Top 10 観点）

- **Injection (A03)**: マイグレーション SQL の UPDATE 文は固定リテラル（`'note'`）を使用し、ユーザー入力を含まない。usecase は Drizzle ORM のパラメータ化クエリを使用。問題なし。
- **Broken Access Control (A01)**: Finding 3/4 で指摘した 4 ファイル原子的リネームを実施すれば、権限値（契約=admin/manager/member、請求=admin/manager/finance）は維持される。`canPerform` の deny-by-default 設計は漏れに対するフェイルセーフとして機能する。
- **その他**: 新規入力サーフェス・認証変更・設定変更なし。既存の Zod バリデーション・セッションチェックは変更なし。

### テスト方針の適切性

6 本のテストファイルへの追従タスク（T-10〜T-15）は `.dynamic.test.ts` の `mock.module` 方式に準拠しており、受け入れ基準が「振る舞いを実行して assert」という方針を正しく反映している。静的ソース検査による代替は spec.md・request.md いずれも禁止しており、tasks もこれに従っている。
