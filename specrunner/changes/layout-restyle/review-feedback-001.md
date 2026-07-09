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
| 1 | MEDIUM | maintainability | `src/app/(dashboard)/deals/[id]/page.tsx` L43–44 | `import { isActivityFeedEnabled }` と `import type { Interaction }` の 2 行がモジュールレベル定数（`CONTRACT_STATUS_VARIANT` / `PHASE_VARIANT`）・関数（`phaseVariant`）の定義より後に配置されている。TypeScript は `import` を巻き上げるため動作は正しいが、import はファイル先頭に集約する標準慣習から逸脱しており可読性を損なう。`PHASE_VARIANT` ブロックを L23 以降に挿入した際に既存の 2 import が末尾に取り残された形。`import/first` ルール未設定のため lint は未検出。 | `import { isActivityFeedEnabled }` と `import type { Interaction }` を L1–21 の import ブロック末尾に移動する。 | yes |
| 2 | LOW | testing | `src/__tests__/components/dealDetailHeroHeader.test.ts` | TC-006 (must): `PHASE_VARIANT` のフェーズマッピング検証が不完全。`won→green` / `lost→red` / `hearing→gray` は検証しているが、`proposal_prep=blue` / `proposed=blue` / `negotiation=blue` / `passed=gray` の 4 フェーズが未アサート。TC-006 が明示的に列挙する全キーを網羅していない。実装コード自体は全フェーズ正しく定義済み。 | `proposal_prep.*blue` / `proposed.*blue` / `negotiation.*blue` / `passed.*gray` 各正規表現テストを追加する。 | yes |
| 3 | LOW | testing | `src/__tests__/components/dealDetailHeroHeader.test.ts` | TC-003/TC-009 (must): `WatchToggle` の存在チェックはあるが、**ステッパー `SectionCard` 内に WatchToggle が存在しないこと**の検証がない。将来の回帰（WatchToggle を誤ってステッパーに戻す変更）を検出できない。実装は正しくヒーロー行に配置済み。 | ステッパーカードのコンテキストで WatchToggle 不在を確認する（例：ファイル内での WatchToggle 出現が 1 箇所のみであることを `match(/WatchToggle/g)?.length` で検証）。 | yes |
| 4 | LOW | testing | `src/__tests__/components/dealDetailHeroHeader.test.ts` | TC-010 (must): 見積承認リンクの `href` パターン（`/requests/${deal.estimateRequestId}`）と文言「見積承認を表示」が未アサート。`estimateRequestId` 条件チェックの存在のみ確認しており、リンク先と文言の不変性が固定されていない。 | `expect(content).toContain("見積承認を表示")` および `expect(content).toMatch(/requests\/\$\{deal\.estimateRequestId\}/)` を追加する。 | yes |
| 5 | LOW | testing | `src/__tests__/components/salesDashboardKpi.test.ts` | TC-017 (must): h2 文言の不変性検証が未実装。T-04 の色変更後、「アクション待ちリスト」「停滞案件リスト」「直近の活動」の各文字列が残っていることを確認するテストがない。実装では文言変更なし。 | h2 色統一 describe ブロック内に `toContain` で 3 文字列を追加する。 | yes |
| 6 | LOW | testing | `src/__tests__/components/dealDetailHeroHeader.test.ts` / `salesDashboardKpi.test.ts` | TC-011/TC-018 (must): ハードコード hex チェックが `text-[#` のみ。TC-011/TC-018 は `bg-[#` / `border-[#` の排除も要求している。実装ファイルに hex 直書きは存在しないが、テストがこれを捕捉しない。 | 各テストに `bg-[#` / `border-[#` のチェックを追加する。 | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 10 | 0.30 |
| security | 10 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 10 | 0.10 |
| maintainability | 7 | 0.10 |
| testing | 7 | 0.10 |

- **total**: 9.25

## Summary

**実装の正確性**

仕様の全要件が正しく実装されている。

- **`deals/[id]/page.tsx`**: ヒーロー行（`flex items-center gap-2 flex-wrap`）に `h1` タイトル・`StatusBadge`（phaseVariant 使用）・`WatchToggle`・見積承認リンク（`estimateRequestId` 条件付き）が集約されている。ステッパー `SectionCard` は `DealPhaseStepper` のみを内包し `WatchToggle` は除去済み。`PHASE_VARIANT` マッピングは全 7 フェーズ（hearing/proposal_prep/proposed/negotiation/won/lost/passed）を網羅し `?? "gray"` フォールバックを備える。deals/page.tsx との同期コメントも付与されている。
- **`SalesDashboard.tsx`**: `grid-cols-8` 廃止・`repeat(auto-fill,minmax(150px,1fr))` グリッド採用・各フェーズと合計列の独立 `SectionCard` 化が正しく実装されている。値スタイル（`text-2xl font-bold text-text`）・ラベルスタイル（`text-xs text-text-secondary mb-1`）・サブ表示（`text-2xs text-text-muted font-mono`）・単位 span（`text-xs font-normal ml-0.5`）すべて仕様通り。アクション待ちリスト・停滞案件リスト・直近の活動の全 3 箇所 h2 が `text-text` に統一されている。`hover:bg-bg-page` 維持・`border-r` 削除も正しく適用済み。
- 生パレット・hex 直書きは `src/app/(dashboard)` 配下全体で 0 件（`text-[#` / `bg-[#` / `border-[#` すべて）。

**品質ゲート**

`bun run typecheck` / `bun run lint` / `bun run build` / `bun test` すべて exit 0（verification-result.md 確認済み）。2090 テスト pass、0 fail。既存の挙動アサーションへの影響なし。

**ブロッカー**

なし。F1 は MEDIUM（動作に影響しないコード整理）、F2–F6 はすべて LOW のテストカバレッジギャップであり、実装の正確性には影響しない。
