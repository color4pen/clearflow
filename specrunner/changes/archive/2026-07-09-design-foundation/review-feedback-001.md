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
| 1 | low | maintainability | `src/app/(dashboard)/deals/[id]/DealPhaseStepper.tsx` | 終端アクションボタン（「受注にする」「失注にする」「見送りにする」、lines 143-162）に `border-green-600 text-green-700 hover:bg-green-50` 等の Tailwind パレット直参照が残存する。TC-052（should）はファイル全体を走査するため厳密にはテストが意図した通りに通らない。ただし T-13 が明示的に「ボタン類はスコープ外」と定義しており、実装は仕様に準拠している。 | 将来のボタン再スタイルリクエストで `hover:bg-green-50` → `hover:bg-status-green-bg/20` 等に置き換え。今回は対応不要。 | no |
| 2 | low | maintainability | `src/app/(dashboard)/contracts/[id]/InvoiceSection.tsx` | `ProgressBarSummary` コンポーネント（lines 63-86）が `bg-green-500`/`bg-blue-500`/`bg-gray-200` を使用。請求金額の可視化チャート要素でありステータス enum 表示ではないためスコープ外。ダークモード時にチャートが浮く可能性がある。 | 別リクエストでチャート色をトークン参照へ移行。今回は対応不要。 | no |
| 3 | low | maintainability | `src/app/(dashboard)/requests/BulkApprovalPanel.tsx` | 一括承認の結果通知アラート（lines 148-154）が `bg-green-50 border-green-300 text-green-800` 等 Tailwind 直参照を使用。操作結果のフィードバック UI でありステータスバッジとは異なる用途。ダークモード対応が不完全。 | 別リクエストで `bg-status-green-bg` 等へ移行。今回は対応不要。 | no |
| 4 | low | maintainability | `src/app/(dashboard)/deals/[id]/page.tsx` | line 27 に `import { isActivityFeedEnabled }` が `CONTRACT_STATUS_VARIANT` 定数定義（lines 22-26）の後に記述されており、import 文がトップレベルに集約されていない。lint/typecheck は通過しているが可読性がやや低下する。 | import 文をファイル冒頭に移動。今回は対応不要。 | no |
| 5 | low | testing | `src/__tests__/` | TC-028（`statusClass`/`stepStatusClass` の export が削除されていること）の静的チェックが自動テストとして実装されていない。関数名変更後に誤って旧名を再 export するリグレッションをテストが検知できない。 | `statusBadgeIntegration.test.ts` に `expect(content).not.toContain("export function statusClass")` を追加。今回は対応不要。 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 10 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 8 | 0.10 |

- **total**: 9.05

## Summary

全 T-01〜T-18 のタスクチェックボックスが完了しており、受け入れ基準をすべて満たしている。

**トークン層（T-01/T-02）**: `globals.css` の `:root` / `[data-theme="dark"]` / `@theme inline` 3 段構成が仕様値通りに更新されており、ステータス 6 系統 × text/bg × ライト/ダーク = 24 変数と `--color-status-*` 12 配線を確認。

**StatusBadge（T-03）**: `"use client"` なし・Server Component 対応・pill 形状・全 6 variant クラス・`StatusBadgeVariant` 型エクスポートが揃っている。実装品質は高い。

**statusUtils.ts（T-04）**: `statusClass`/`stepStatusClass` が削除され `statusVariant`/`stepStatusVariant` に rename 済み。`text-[#` 形式の残存なし。`statusRowClass` がトークン参照クラス返却に変更されている。

**各画面（T-05〜T-13）**: deals/inquiries/contracts/invoices/requests の全対象箇所で `StatusBadge` 移行が完了。`InquiryStatusBadge.tsx` 廃止・`InquiryStatusBanner.tsx` インライン hex 除去・`ApprovalStepper.tsx` のハードコード Tailwind パレット除去を確認。`StatusChipSelect.tsx` の CHIP/DOT マップはシステムトークン参照に統一済み。

**検証（T-18）**: build / typecheck / lint / test（2046 pass、0 fail）すべて green。architecture test は直接確認できないが変更対象が `src/app` 配下 UI 層のみであり境界違反はない。

検出した問題はすべてスコープ外または cosmetic であり、ブロッカーなし。
