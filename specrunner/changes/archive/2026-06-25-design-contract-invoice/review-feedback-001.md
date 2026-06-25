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

- **verdict**: approved
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | medium | performance | `src/app/(dashboard)/contracts/[id]/page.tsx`, `src/app/(dashboard)/contracts/[id]/InvoiceSection.tsx` | `findAllByContract` を両ファイルで二重呼び出し。`page.tsx` は `invoices.length === 0`（削除ボタン表示条件）のためだけに取得し、`InvoiceSection` も同じクエリを独立実行するため、1 ページロードで DB クエリが 2 回発行される。 | `page.tsx` で取得した `invoices` を `InvoiceSection` に prop として渡し、`InvoiceSection` 内の `findAllByContract` 呼び出しを削除する。もしくは `invoices.length` のみを prop として切り出す。 | yes |
| 2 | low | maintainability | `src/__tests__/domain/contractHighlight.test.ts` | `isExpiringWithin30Days` 関数が `contracts/page.tsx` から export されておらず、テストファイルが同一ロジックをコピー再定義している（コメントに「同じロジック」と明記）。本番コードのロジックが変更された場合にテストが追従しない。 | `isExpiringWithin30Days` を `src/lib/contractUtils.ts` 等のユーティリティモジュールに export し、`page.tsx` とテストの両方からインポートする。 | yes |
| 3 | low | testing | `src/__tests__/domain/invoiceProgressBar.test.ts` | TC-013（「定期契約ではプログレスバーが表示されない」、priority: should）に対応する自動テストが存在しない。`InvoiceSection` の条件分岐 `isOneTime ? <ProgressBarSummary> : <div grid-cols-3>` が未検証。 | `invoiceProgressBar.test.ts` 内で `renewalType === "recurring"` の場合にプログレスバー関連の計算が呼ばれない（または表示されない）ことを示すテストケースを追加する。 | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 10 | 0.25 |
| architecture | 8 | 0.15 |
| performance | 7 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 8 | 0.10 |

- **total**: 8.70

## Summary

受け入れ基準はすべて充足している。

- **契約一覧 7 カラム化**: `dealTitle` の JOIN 追加・`ContractWithClient` 型拡張・カラム定義は正確。`DataTable.rowClass` の型シグネチャを `string | undefined` に拡張した変更も適切。
- **終了日ハイライト**: `isExpiringWithin30Days` のロジック（past dates 含む≤30日、active のみ、null 除外）は仕様通り。境界値（ちょうど 30 日後、cancelled）テストも追加されている。
- **契約詳細 2 カラム**: `grid-cols-[3fr_2fr]` 、左カラムへのステータス変更・関連情報統合、承認待ちバナー表示、右カラムへの InvoiceSection 配置—すべて仕様通り。`existsPendingByTriggerEntityId` は `organizationId` でテナント分離されており、セキュリティ上の問題なし。
- **プログレスバー**: `paidPct + invoicedPct ≤ 100%` のキャップ、`contractAmount = 0` の除算ガード、`remaining = max(0, ...)` の負値ガードがすべて実装・検証されている。単発/定期の分岐も正しい。
- **請求詳細 560px レイアウト**: `max-w-[560px] mx-auto`、`grid-cols-[90px_1fr]`、パンくず「契約一覧 > {契約名} > 請求詳細」—仕様通り。
- **ビルド・型チェック・テスト・lint**: verification-result.md にて全フェーズ pass 確認済み。

critical / high 相当の問題なし。`medium` が 1 件（二重 DB クエリ）、`low` が 2 件（テスト関数コピー、TC-013 未カバー）。いずれも動作の正確性・セキュリティには影響しない。
