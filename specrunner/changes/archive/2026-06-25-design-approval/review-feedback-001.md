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
| 1 | high | correctness | `src/app/(dashboard)/requests/[id]/ActionButtons.tsx` | **却下フォームにコメントが渡らない（TC-039 違反）**: `Textarea name="comment"` が両 `ActionForm` の外側（兄弟要素）に置かれているため、`new FormData(e.currentTarget)` ではどちらの form からも textarea の値が収集されない。結果として `rejectRequestAction` に `comment` が送信されず、D7・T-07 の「却下操作でコメントが送信される」要件が満たされない。 | コメント textarea を却下 `ActionForm` の内部（`<input type="hidden" name="targetStatus">` の隣）に移動する。承認フォーム側は表示不要なので削除してよい（D7: 承認の comment は送信保留のため表示のみで可、却下は送信必須）。あるいは textarea に `form="reject-form-id"` 属性を追加し、reject form に `id` を付与する HTML 標準のフォーム関連付けを使う。 | yes |
| 2 | low | maintainability | `src/app/(dashboard)/requests/[id]/page.tsx` | **未使用インポート `statusClass`（lint warning）**: `import { statusLabel, statusClass } from "../statusUtils"` の `statusClass` はファイル内で使用されていない（ローカル関数 `statusBadgeClass` で代替されている）。lint で `@typescript-eslint/no-unused-vars` warning として検出されている。 | `statusClass` を import リストから削除する。 | yes |
| 3 | low | maintainability | `src/app/(dashboard)/requests/BulkApprovalPanel.tsx` | **`<col style={{ width: "1.9fr" }}>` は無効な CSS**: `fr` 単位は CSS Grid 専用であり、HTML `<table>` の `<col>` 要素 style には適用されない。ブラウザは無効値を無視するため `table-fixed` レイアウトでは最初の列に残余幅が割り当てられ偶然に動作するが、仕様準拠ではない。 | `<col>` の幅指定として `1.9fr` を使う場合は、テーブルを CSS Grid に置き換えるか、または `width: calc(100% - 500px)` 等の有効な値に変更する。`table-fixed` の挙動上、現状は最初の列が残余幅を取るため視覚的には問題ないが、標準準拠のため修正を推奨する。 | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 7 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 7 | 0.10 |

- **total**: 8.00

## Summary

全体的に実装品質は高い。build/typecheck/test/lint がすべて通っており、受け入れ基準の大半を満たしている。アーキテクチャ面では `getInquiry` / `getActiveDelegationsForUser` ユースケースを正しく追加し、page.tsx から repository を直接呼ばない層分離を維持している。タブ認可の URL 直打ち対策（サイレントフォールバック）、委任を考慮した `canApproveWithDelegation` の利用、`SystemOriginBanner` のエラー耐性（エンティティ取得失敗時に null を返す）も適切に実装されている。

ブロッカーは 1 件のみ: **却下コメントが form 外に置かれているため `rejectRequestAction` に渡らない**（finding #1）。これは must-priority の TC-039「却下操作でコメントが rejectRequestAction に送信される」を満たさない correctness バグである。修正は textarea を reject ActionForm の内部に移動するだけで済む。

残り 2 件は low 相当の軽微な問題（未使用インポートと無効な CSS 単位）であり、finding #1 の修正と同時に対応することを推奨する。
