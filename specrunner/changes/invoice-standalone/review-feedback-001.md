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
| 1 | HIGH | Bug | src/app/actions/invoices.ts:30, src/app/(dashboard)/contracts/[id]/invoices/[invoiceId]/InvoiceActions.tsx:15 | spec-review-result-002.md Finding #1 で指摘されたタイムゾーン問題が未修正のまま実装された。Server Action の paidAt 上限バリデーション（`new Date().toISOString().slice(0, 10)`）は UTC 基準であり、JST ユーザーが 0:00〜9:00 JST に当日の日付を送信すると「入金日は本日以前の日付を指定してください」で拒否される。また InvoiceActions.tsx の `todayString()` も `new Date().toISOString().slice(0, 10)` で UTC 基準のため、JST 深夜帯はダイアログのデフォルト値（= 前日）を送信すると max 属性による HTML 制御（`max={todayString()}`）とも整合せず入金確認操作が失敗する。ユーザー側での回避策がない明確な機能不全。 | Server Action 側: refine の today 算出を `new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)` に変更するか、サーバー環境が `TZ=Asia/Tokyo` であることを前提に `new Date().toLocaleDateString("en-CA")` を使用する。InvoiceActions.tsx 側: `todayString` を `Intl.DateTimeFormat("sv", { timeZone: "Asia/Tokyo" }).format(new Date())` に変更して JST 日付を生成する。 | yes |
| 2 | MEDIUM | Testing | src/__tests__/usecases/（未作成） | test-cases.md で "must" 優先度の自動テスト 14 件中 11 件（integration: TC-004〜TC-009, TC-011, TC-022, TC-023, TC-027, TC-034）が未実装。作成済みは invoiceTransition の unit テスト 3 件のみ。他ユースケース（inquiry 等）と同様、ソースファイルの静的解析でパターンを確認するテストが想定されるが、invoice 向けのユースケーステストファイルが存在しない。具体的に欠落しているのは ①paidAt フォールバック動作（TC-004/TC-005）、②overdue→paid ドメインイベント発行（TC-006）、③getInvoice のマルチテナント分離（TC-009：organizationId を findById に渡す）、④contractId 不一致での 404（TC-011）、⑤未来日付 paidAt 拒否の refine（TC-022）、⑥revalidatePath が両パス（契約詳細＋請求詳細）を呼ぶ（TC-034）など。コードは動作しているが将来の回帰を検出できない品質低下。 | `src/__tests__/usecases/invoiceManagement.test.ts` を新規作成し、他ユースケーステスト（inquiryManagement.test.ts 等）と同様の静的解析パターンで各 TC を実装する。例: `expect(content).toContain("data.paidAt ?? new Date()")` で TC-004/005、`expect(content).toContain("data.organizationId")` で TC-009、`revalidatePath` を 2 回呼ぶことを検証して TC-034 を実装する。 | yes |
| 3 | LOW | Comment | src/domain/services/invoiceTransition.ts:13 | JSDoc コメントに「終端状態（paid / overdue）からの遷移、および定義外の遷移は不可」と残っているが、overdue は T-01 の変更で paid への遷移が追加され終端状態ではなくなっている。T-01 は 1 行目の inline コメントを「paid は終端状態」に修正したが JSDoc（`@description` 相当の行）は未修正のまま。 | JSDoc コメントを「終端状態（paid）からの遷移、および定義外の遷移は不可」に修正する。 | yes |
| 4 | LOW | Security | src/app/(dashboard)/contracts/[id]/invoices/new/page.tsx | spec-review-result-002.md Finding #2 で指摘された権限チェック欠如が未修正。`canPerform(role, "invoice", "create")` が false のユーザーにも請求登録フォームが表示される。`createInvoiceAction` サーバー側で権限チェックがあるため機能的な穴はないが、詳細ページ（`/contracts/[id]/invoices/[invoiceId]/page.tsx`）が `canPerform` を実装して操作ボタンを非表示にしているのに登録ページで省略するのは一貫性欠如。 | `session!.user.role` を参照し `!canPerform(session!.user.role, "invoice", "create")` の場合はフォームを表示せず「この操作を実行する権限がありません」メッセージを表示する。詳細ページの `canChangeStatus` 分岐と同様のパターンで実装する。 | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 8 | 0.30 |
| security | 7 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 3 | 0.10 |

- **total**: 7.50

## Summary

全体的な実装品質は高く、ドメインロジック・ページ構成・Server Action の流れはいずれも設計書（design.md / tasks.md / spec.md）に準拠している。`overdue → paid` 遷移の追加、`paidAt` パラメータの受け渡し、`getInvoice` ユースケース、請求詳細・登録ページ、`InvoiceSection` の簡素化はすべて正しく実装されており、build / typecheck / lint も green。

blocking 判定（needs-fix）の主因は Finding #1 の **integration テスト 11 件未実装**。test-cases.md が must 優先度として計画した自動テストのうち 78% が存在せず、マルチテナント分離・revalidatePath の両パス・未来日付拒否などセキュリティ・正確性に直結するパターンが静的解析でも確認されていない状態。他ユースケース（inquiry, deal 等）は同種の静的解析テストが作成されており、invoice だけ欠落するのは一貫性上問題がある。

Finding #2（タイムゾーン）は spec-review-result-002.md で既に指摘されていたが未修正のまま実装に進んでいる。JST 深夜帯のユーザーには入金確認操作がデフォルト値でも失敗するため MEDIUM 扱い。Finding #3/4 は LOW で code-fixer の軽微な修正で解消できる。
