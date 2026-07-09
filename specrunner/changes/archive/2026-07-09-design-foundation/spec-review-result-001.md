# Spec Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:    specification is complete, consistent, and ready for implementation
  - needs-fix:   specification has issues that must be resolved before implementation
  - escalation:  unresolvable conflicts, missing context, or requires human judgment
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | File | Description | How to Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
  - CRITICAL: production outage, data loss, security breach
  - HIGH:     functional failure, clear bug, no workaround — blocks approval
  - MEDIUM:   quality degradation, maintainability issue, future risk
  - LOW:      informational, style, minor improvement
- If no findings, write a table row with "None" or omit the table body.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approved

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | LOW | completeness | tasks.md / T-07, T-05 | `contractStatusVariant` は `contracts/page.tsx` と `deals/[id]/page.tsx` の両方で必要だが、タスクは「参照/先行定義する」と曖昧に記述している。2 ファイルが同じマッピングを個別定義すると重複になる。 | `labels.ts` の近傍（例: `src/app/(dashboard)/contractStatusVariant.ts` または `labels.ts` 末尾）に共通ヘルパーとして定義し、両ファイルからインポートする方針を T-07 に明記する。 |
| 2 | LOW | correctness | tasks.md / T-11 | `ApprovalStepper` の現行実装は `isCurrent && status === "pending"` の場合を `bg-blue-100 text-blue-700` で描画しているが、`stepStatusVariant("pending") = "yellow"` に統一するとカレントステップのチップも yellow になる。この表示変化は T-11 に明記されておらず、実装者が意図的変更と気づきにくい。 | T-11 の記述に「カレントステップの pending チップは現行 blue から yellow に変わる（意図的な simplification）。行背景 `bg-status-blue-bg` によって現在ステップを識別する」旨を追記する。 |

## Review Notes

### Architecture

- 変更スコープは `src/app` 配下 UI ファイルおよび `globals.css` / `styles.ts` に厳格に限定されており、domain / application / infrastructure / api への波及はない。依存方向の逸脱なし。
- `StatusBadge` を `src/app/(dashboard)/components/` に置く配置は既存の共有コンポーネント慣習と一致。
- D1（トークン名維持）は変更波及を最小化する合理的選択。D6（DealPhaseStepper は StatusBadge を使わずトークン参照）は形状の差異を根拠とした適切な判断。
- カラーセマンティクス（意味論マッピング）を表示層（D5）に置く設計は正しく、domain 層への流出はない。

### Correctness

- T-01 のトークン値はすべて request.md の仕様表と一致。ダーク値（`--bg-info: #172554`、`--bg-success-light: #14532d` など）が `[data-theme="dark"]` ブロックに追加される点は既存の欠落を正しく補完している。
- T-02 の 6 系統 × text/bg × ライト/ダーク = 24 変数定義と `@theme inline` への 12 配線は spec.md の受け入れ基準を満たす。
- `stepStatusVariant("rejected") = "yellow"` は「差し戻し=注意/保留」のセマンティクスとして spec.md に説明があり意図的設計。
- T-15 のテスト更新は `statusClass` → `statusVariant`、`stepStatusClass` → `stepStatusVariant` の rename と期待値変更を正しくカバーしており、挙動アサーション（ステータス対応関係）は維持される。
- T-09 で `BulkApprovalPanel` の Props 型（`statusClass: string` → `statusVariant: StatusBadgeVariant`）と呼び出し側（`requests/page.tsx`）を同一タスクで変更する設計は型エラーを出さない正しい atomicity。
- `InquiryStatusBanner` の `border-left: 3px solid` → `border-l-4`（4px）は Tailwind に 3px クラスが存在しないための近似であり、refactoring スコープとして許容範囲内。

### Completeness (task decomposition)

- request.md セクション 1〜5 の全要件（トークン刷新・6 系統新設・StatusBadge 新設・7 対象バッジ統一・SECTION_CARD 更新）は T-01〜T-18 に漏れなくマップされている。
- `revenue/page.tsx` はリクエストの背景節に言及があるが、実コードを確認したところ請求ステータス enum の表示を持たず（月次推移テーブル・顧客ランキングのみ）、タスク不在は妥当。
- `contracts/[id]/InvoiceSection.tsx` の進捗バー（`bg-green-500` / `bg-blue-500`）はデータ可視化要素でありステータスバッジでないため、T-08 の対象外となっているのは正しい。
- `SystemOriginBanner.tsx` の info バナー、各種フォームの success/error バナー、`BulkApprovalPanel` のアクション結果アラートはいずれも status enum 表示ではなくスコープ外として正しく除外されている。
