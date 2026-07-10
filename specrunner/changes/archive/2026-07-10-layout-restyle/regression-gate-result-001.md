# Regression Gate Result — Iteration 1

- **change**: layout-restyle
- **iteration**: 1
- **verdict**: needs-fix

## Summary

6 件の Findings Ledger を検証した。Finding 1（import 順序）は修正済みで現在も維持されている。Finding 2〜6（テストカバレッジ追加）は code-fixer コミット（188cf71）で未適用のまま残存しており、テストファイルに対応するアサーションが存在しない。

---

## Finding Verification

### F1 [MEDIUM] Import 文がモジュールレベルコードの後に配置されている

- **File**: `src/app/(dashboard)/deals/[id]/page.tsx`
- **Status**: FIXED ✓
- **Evidence**: `isActivityFeedEnabled`（L22）・`import type { Interaction }`（L23）が import ブロック内（L1–23）に移動されており、`CONTRACT_STATUS_VARIANT`・`PHASE_VARIANT` 定数（L25〜）より前に配置されている。

---

### F2 [LOW] TC-006: proposal_prep / proposed / negotiation / passed の variant マッピングが未テスト

- **File**: `src/__tests__/components/dealDetailHeroHeader.test.ts`
- **Status**: REGRESSION ✗
- **Evidence**: テストファイルには `won→green`・`lost→red`・`hearing→gray` の 3 テストのみ存在する。`proposal_prep=blue`・`proposed=blue`・`negotiation=blue`・`passed=gray` の 4 フェーズに対するアサーションが追加されていない。

---

### F3 [LOW] TC-003/TC-009: WatchToggle がステッパーカード内に存在しないことの構造検証がない

- **File**: `src/__tests__/components/dealDetailHeroHeader.test.ts`
- **Status**: REGRESSION ✗
- **Evidence**: 「WatchToggle が存在する」テスト（存在チェック）のみ。ステッパー `SectionCard` 内に WatchToggle が存在しないことを検証するテスト（例: ファイル内出現数が 1 件のみ）が追加されていない。

---

### F4 [LOW] TC-010: 見積承認リンクの href パターンと文言「見積承認を表示」が未アサート

- **File**: `src/__tests__/components/dealDetailHeroHeader.test.ts`
- **Status**: REGRESSION ✗
- **Evidence**: `estimateRequestId` のキーワード存在チェックのみ。`/requests/${deal.estimateRequestId}` の href パターンと「見積承認を表示」の文言不変性を検証するアサーションが追加されていない。

---

### F5 [LOW] TC-017: h2 文言「アクション待ちリスト」「停滞案件リスト」「直近の活動」の不変性テストがない

- **File**: `src/__tests__/components/salesDashboardKpi.test.ts`
- **Status**: REGRESSION ✗
- **Evidence**: h2 色統一 describe では `text-sm font-semibold text-text-muted` の不在チェックのみ。3 つの h2 文言が残存することを確認する `toContain` テストが追加されていない。

---

### F6 [LOW] TC-011/TC-018: ハードコード hex チェックが text-[# のみで bg-[# / border-[# が未検証

- **File**: `src/__tests__/components/dealDetailHeroHeader.test.ts`, `src/__tests__/components/salesDashboardKpi.test.ts`
- **Status**: REGRESSION ✗
- **Evidence**: 両ファイルとも `text-[#` 不在チェックのみ。`bg-[#`・`border-[#` の不在チェックが追加されていない。
