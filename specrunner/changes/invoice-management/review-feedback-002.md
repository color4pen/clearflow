# Code Review Feedback — iteration 002

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
- iteration line format (exact): `- **iteration**: NNN` (3-digit zero-padded integer)
- Findings table MUST have exactly 7 columns in this order:
  # | Severity | Category | File | Description | How to Fix | Fix
  - Fix column: yes = fixer should address this finding; no = skip (pre-existing / out-of-scope)
- Scores table columns: Category | Score | Weight
  - Valid Category values: correctness | security | architecture | performance | maintainability | testing
  - Score: integer 1-10
  - Weight: decimal as defined below
- total line format (exact): `- **total**: <decimal>`
- Default weights: correctness=0.30, security=0.25, architecture=0.15, performance=0.10, maintainability=0.10, testing=0.10
- Scores table is optional but recommended.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approved
- **iteration**: 002

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | low | correctness | `src/app/actions/invoices.ts:111` | `updateInvoiceStatusAction` の `revalidatePath('/contracts')` はリスト画面のみを再検証。契約詳細ページのサーバー側キャッシュが他ユーザー向けに即座に更新されない。ただし `router.refresh()` でクライアント側は即座に更新されるため機能的欠陥ではない（iteration 001 より継続） | `updateInvoiceStatus` の戻り値 `result.invoice.contractId` を利用して `revalidatePath(`/contracts/${result.invoice.contractId}`)` に変更する | yes |
| 2 | low | testing | `src/__tests__/domain/invoiceTransition.test.ts:45` | TC-006 が `overdue → scheduled` を検証しているが、tasks.md の受け入れ基準は `overdue → invoiced` を例示している。どちらも「overdue は終端状態」という同一プロパティを検証しており機能的に問題なし | 必要に応じて `validateInvoiceTransition("overdue", "invoiced")` に統一してトレーサビリティを高める | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 10 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 9 | 0.10 |
| testing | 9 | 0.10 |

- **total**: 9.15

## Summary

### iteration 001 からの変更確認

- **[解消] Finding #1（high）**: `src/__tests__/domain/invoiceTransition.test.ts` が追加され、TC-001〜TC-006（scheduled→invoiced 許可、invoiced→paid 許可、invoiced→overdue 許可、scheduled→paid 拒否、paid→invoiced 拒否、overdue からの遷移拒否）が純粋関数テストとして網羅された ✓
- **[解消] Finding #2（low / 部分）**: `createInvoiceAction` の `revalidatePath` が `/contracts/${parsed.data.contractId}` に修正された ✓。`updateInvoiceStatusAction` は `/contracts` のまま残存（Finding #1 として継続）

### 合格領域

- **ドメインモデル・スキーマ**: `InvoiceStatus` 型（4値）、`invoices` テーブル（全カラム・FK制約）、`invoiceStatusEnum`、Relations（invoices / contracts / organizations 三者）すべて正確 ✓
- **リポジトリ**: 全6メソッドに `organizationId` 条件。`sumAmountByContract` が `COALESCE(SUM(...), 0)` による DB 集計 ✓
- **ユースケース**: `createInvoice` は `one_time`/`null amount`/`recurring` の3分岐が仕様通り。TOCTOU 防止のため `sumAmountByContract` とレコード作成が同一トランザクション内 ✓。`updateInvoiceStatus` は `validateInvoiceTransition` 呼び出し後に `invoicedAt`/`paidAt` を自動セット ✓
- **Server Actions**: `"use server"` 宣言、認証・ロール（admin/manager のみ）、レート制限（create）、Zod バリデーション（uuid / min(1) / max(255) / coerce.number().int().positive() / z.enum）が全て仕様通り ✓
- **UI**: `InvoiceSection` が請求サマリー算出（請求済・入金済・未請求合計）・DataTable・ステータスボタンを実装。`canManage` による権限制御が正確に伝播 ✓
- **テスト**: 遷移テスト6件（TC-001〜TC-006）、テナント分離テスト7件（invoiceRepository 全メソッド + action）、モデルファイル一覧（invoice.ts）が追加済み ✓
- **シード**: 着手金（paid）・中間金（invoiced）・残金（scheduled）の3件が合計3000万円で定義。truncation 順序は invoices → contracts の FK 安全順 ✓
- **マイグレーション**: `drizzle/0004_fixed_lorna_dane.sql` にて `invoice_status` enum 追加と `invoices` テーブル作成が確認済み ✓
- **依存方向**: `actions → usecases → domain / infrastructure` を遵守。`InvoiceSection.tsx` が `invoiceRepository` を直接参照するのは既存 Server Component パターン（deals / clients / inquiries ページ）と一致 ✓
- **build / typecheck / test / lint**: 全フェーズ pass（533 tests pass、lint 警告は本 PR 外の既存ファイルのみ）✓
