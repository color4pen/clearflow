# Code Review Feedback — iteration 001

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

- **verdict**: needs-fix
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | high | testing | `src/__tests__/domain/` (missing) | `invoiceTransition.ts` に対応する単体テストファイルが存在しない。request.md の受け入れ基準に「ステータス遷移テスト: scheduled → invoiced が許可される」等が明示されており、TC-001〜TC-006 が must 判定の自動テストとして計画されているが、`invoiceTransition.test.ts` が未作成。既存の `inquiryTransition.test.ts` / `dealTransition.test.ts` / `requestTransition.test.ts` と同等のテストファイルが必要。 | `src/__tests__/domain/invoiceTransition.test.ts` を作成し、`validateInvoiceTransition` の6ケース（TC-001〜TC-006）を純粋関数として検証する。 | yes |
| 2 | low | correctness | `src/app/actions/invoices.ts:111` | `updateInvoiceStatusAction` の `revalidatePath('/contracts')` はリスト画面しか再検証しない。contractId がシグネチャにないため `/contracts/${contractId}` を指定できず、他テナントが直接 URL でアクセスした際の Server Component キャッシュが即座に更新されない。動作上は `router.refresh()` でクライアント側更新が行われるため機能的欠陥ではない。 | アクション引数に `contractId` を追加するか、`revalidatePath('/contracts/[id]', 'page')` を呼んで全契約詳細ページを再検証する。コスト対効果を考慮して判断すること。 | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 10 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 9 | 0.10 |
| testing | 5 | 0.10 |

- **total**: 8.85

## Summary

### 合格領域

- **ドメインモデル**: `InvoiceStatus` 型・`Invoice` 型ともに仕様のフィールドを完全に網羅。ORM 依存なし。
- **スキーマ**: `invoiceStatusEnum`（4値）、`invoices` テーブル（全カラム、FK制約）、Relations（invoices/contracts/organizations 三者向け）すべて正確に定義。マイグレーションファイルも生成済み。
- **リポジトリ**: 全6メソッドに `organizationId` 条件付き。`sumAmountByContract` が `COALESCE(SUM(...), 0)` による DB 側集計を正しく実装。
- **ユースケース**: `createInvoice` は TOCTOU 防止のため `sumAmountByContract` とレコード作成を同一トランザクション内に配置。`one_time` / `null amount` の分岐が仕様通り。`updateInvoiceStatus` は `validateInvoiceTransition` 呼び出し後に `invoicedAt` / `paidAt` を自動セット。
- **Server Actions**: `"use server"` 宣言、認証・ロール確認（admin/manager のみ）、レート制限（create）、Zod バリデーション（`z.coerce.number().int().positive()`、`z.string().min(1).max(255)`、`z.string().max(1000).optional()`、`z.enum([...])`）が全て仕様通り。
- **UI**: `InvoiceSection` がサマリー算出（請求済/入金済/未請求合計）・DataTable・ステータスボタンを正しく実装。`CreateInvoiceModal` はエラー表示・送信中ロックを含む。権限制御（`canManage`）の伝播も正確。
- **テスト**: テナント分離テスト7ケース（invoiceRepository 全メソッド + action）が追加済み。`invoice.ts` がモデル一覧に追記済み。
- **検証結果**: build/typecheck/test/lint 全フェーズ pass。lint 警告は本 PR とは無関係の既存ファイルのみ。

### 要修正

- **`invoiceTransition.test.ts` の未作成**（Finding #1）: `validateInvoiceTransition` は純粋関数であり、DB・モックなしで即座に実装できる。受け入れ基準の遷移テスト6件（TC-001〜TC-006）が自動テストとして機能していない状態であり、このまま merge すると受け入れ基準未達となる。

### 参考

- `revalidatePath` の scope（Finding #2）は動作上の欠陥ではなく、`router.refresh()` によるクライアント側更新で補完されている。contractId を渡す設計変更コストとのトレードオフで判断してよい。
