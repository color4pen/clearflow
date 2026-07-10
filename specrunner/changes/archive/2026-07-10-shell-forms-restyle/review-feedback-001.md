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
| 1 | low | maintainability | `src/app/components/Toast.tsx` | `showToast` は `ToastProvider` 内で通常の関数として定義されており、レンダリングごとに新しいオブジェクト参照が生成される。`NewDealForm.tsx` の `useEffect` deps に `showToast` が列挙されており（ESLint 準拠として正しい）、`ToastProvider` が再レンダリングされると `state.dealId` が設定された状態で副作用が再実行される可能性がある。ナビゲーション（コンポーネントアンマウント）により実害はないが、将来的な競合の温床となりうる。 | `showToast` を `useCallback` でメモ化し、参照を安定させる。 | no |
| 2 | low | testing | `src/__tests__/components/ConfirmDialog.test.ts` | TC-049 の仕様（"`bg-black/45` が含まれ、`bg-black/40` は含まれない"）に対し、テストは `bg-black/45` の存在のみ検証しており、`bg-black/40` の不在アサーションが欠落している。実装は正しく `bg-black/40` を含まないが、テストカバレッジが仕様より弱い。 | `expect(content).not.toContain("bg-black/40")` を `ConfirmDialog.test.ts` に追加する。 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 10 | 0.25 |
| architecture | 10 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 9 | 0.10 |
| testing | 8 | 0.10 |

- **total**: 9.3

## Summary

実装は仕様の全要件を満たしている。ビルド・型チェック・テスト・lint がすべて green（2223 テスト全通過）。受け入れ基準を以下のとおり確認した。

**確認済み受け入れ基準**

- SidebarNav: 4 セクション・11 絵文字アイコン・`border-primary` active・`border-l-2 border-white` 削除・`badgeCount` props・バッジ表示/非表示ロジック — すべて実装済みかつコンポーネントテストで固定
- FormField: `required` で `*` 描画、`invalid` で `border-danger`（Input/Select/Textarea/MoneyInput）— 単体テスト固定
- Toast: 右下配置・`✓`/`✗` プレフィックス・`bg-bg-toast`・`toast-slide-in` アニメーション・左カラーバー廃止 — テスト固定
- ConfirmDialog: BTN_SECONDARY/BTN_PRIMARY/BTN_DANGER・`rounded-lg`・3分割区切り線 — テスト固定
- 4 フォームの成功トースト文言 — 静的解析テストで固定
- `NotificationPanel.tsx` から `bg-bg-card` 除去 — テスト固定
- `src/app` 配下に新規 hex 直書き・生パレットクラスの持ち込みなし（globals.css の `--bg-toast` トークン定義は適正）
- `mock-fidelity-check.md` が change folder に存在し、sidebar・form-group・toast・dialog の各部品について突き合わせ記録あり

**特記事項**

- `NewDealForm.tsx` の clientId 欄はカラムグリッド内で pre-existing の生 `<select>` を維持している（T-08a のスコープ外）。`<input type="hidden">` は CSS Grid に参加しないため表示への影響なし。
- `layout.tsx` の `listRequests` 呼び出しは全組織リクエストを取得後に role フィルタリングする設計で、仕様の「既存 list 系の結果 count で可」に準拠している。
- 2 件の findings はいずれも low であり、実際の挙動・セキュリティ・アーキテクチャに影響を与えない。fixer 対応不要（Fix: no）と判定。
