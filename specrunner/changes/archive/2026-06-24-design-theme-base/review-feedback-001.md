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
| 1 | low | maintainability | `src/app/(dashboard)/SidebarNav.tsx` | 「申請一覧」（`/requests`）のナビ項目に承認バッジの表示スロットがない。T-10 では「初期状態では件数非表示」と記載されているが、「表示位置を確保する」という記述もあり、将来的に件数バッジを追加する際の差分が大きくなる可能性がある。現状はラベル文字列のみで badge 要素のプレースホルダーなし。 | `{item.label}` を `<span className="flex items-center justify-between w-full">{item.label}</span>` のようなラッパーで包んでおくか、バッジ表示用 props（`badge?: number`）を型定義に追加する。D02 以降での対応でも可。 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 9 | 0.10 |

- **total**: 8.9

## Summary

全 must テストケース（TC-001〜TC-003, TC-005〜TC-011, TC-015〜TC-017, TC-026〜TC-029, TC-031〜TC-032, TC-034〜TC-035）が実装で充足されている。verification フェーズ（build / typecheck / test / lint）はすべて pass 済み。

### 各要件の実装状況

**フォント変更（R1）**: `layout.tsx` で `Noto_Sans_JP` / `IBM_Plex_Mono` に切り替え済み。`globals.css` の `--font-sans` / `--font-mono` も新フォント変数を参照。`body { font-size: 13px }` 設定済み。旧 `font-family` 直接指定も削除されている。

**カスタムフォントサイズ（R2）**: `@theme inline` に `text-2xs`（0.625rem）/ `text-table-head`（0.6875rem）/ `text-base-app`（0.78125rem）/ `text-body`（0.8125rem）が line-height 込みで正しく定義されている。

**角丸統一（R3）**: `FormField.tsx`（Input / Select / Textarea）、`MoneyInput.tsx`、`LinkButton.tsx`（SubmitButton）、`styles.ts`（INPUT_BASE / SELECT_BASE / BTN_SUBMIT）のすべてで `rounded-none` → `rounded` に変更済み。`MarkdownTextarea.tsx` は `border-t-0` との組み合わせで `rounded-b` を採用しており、T-08 の設計注記と一致する。`src/` 配下に `rounded-none` の残存なし（TC-015 ✅）。

**SectionCard（R4）**: `border-border rounded shadow-sm` が `SectionCard.tsx` と `SECTION_CARD` 定数の両方に反映されている。

**FormField padding（R5）**: Input / Select が `px-2.5 py-1.5`、Textarea が `p-2.5` に変更済み。

**ボタン padding（R6）**: SubmitButton が `px-3.5 py-1.5 rounded font-medium` を持つ。

**サイドバーレイアウト（R7）**: `layout.tsx` から `<header>` 構造を完全に削除し、`<aside w-[210px]>` + `<main flex-1>` 構成に移行済み。`SidebarNav.tsx` を `"use client"` コンポーネントとして分離し、`usePathname` による active 判定を実装。ロゴ / ナビ / ユーザー情報 / ThemeToggle / ログアウトがすべてサイドバー内に配置されている。isAdmin 条件による管理者メニュー表示ロジックも維持されている。メインコンテンツは `style={{ maxWidth: 1260 }}` / `px-7 pt-[22px] pb-14` で仕様通り。

**DataTable（R8）**: th が `px-3.5 py-2 text-table-head font-medium`、td が `px-3.5 py-2.5 text-base-app`、データ行 tr が `border-b border-border-light` に更新済み。クリック可能行 / 非クリック行の hover 分岐も維持されている。

**カラートークン（R9）**: `:root` に `--bg-info` / `--bg-success-light` / `--border-success-light` / `--text-sidebar-muted` を追加。`@theme inline` にも対応する `--color-*` エントリを追加。ダークモードブロックへの追加なし（スコープ外方針を遵守）。

### 特記事項

- `MarkdownTextarea.tsx` の `Textarea` import が未使用のまま残っているが、git diff の確認によりこれは今回の変更ではなく事前から存在する pre-existing 警告であるため対応不要。
- lint は 10 件の warning（すべて `no-unused-vars`）があるが、0 errors で既存の warning は今回の変更スコープ外。
