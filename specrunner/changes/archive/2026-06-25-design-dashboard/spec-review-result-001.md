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
| 1 | MEDIUM | Spec-Design Consistency | request.md / tasks.md | request.md の受け入れ基準（「期日超過テーブルが 6 カラムグリッドで表示される」）と tasks.md T-08 の実装計画（5 カラムグリッド `grid-cols-[1fr_80px_100px_100px_80px]`）が矛盾する。design.md D7 で Invoice モデルに contractName / customerName がないため 5 カラムに変更することは明記・合理化されているが、request.md の受け入れ基準はそのまま残っており、実装後の検収チェックで誤検知が発生しうる。spec.md はこの列数を明示しないため spec 自体は整合している。 | tasks.md T-08 内のコメントに「D7 決定につき受け入れ基準の"6 カラム"は"5 カラム"として読み替える」旨を明記する、または request.md の受け入れ基準を更新する。spec-fixer フェーズで対応可。 |
| 2 | MEDIUM | Spec Coverage | spec.md | request.md の R1（Sales ヘッダーボタン: 「案件を見る」→ /deals、「引合を登録」→ /inquiries/new）および R7（Finance ヘッダーボタン: 「契約を見る」→ /contracts）に対応する `### Requirement:` セクションが spec.md に存在しない。ボタンクリック時のナビゲーションは Layer-1 の振る舞いであり test-case-gen が自動生成すべき対象だが、現状の spec.md では入力が提供されない。 | spec.md に「ダッシュボードヘッダーのアクションボタンは指定ルートへ遷移する」Requirement を追加し、各ボタンの Given/When/Then シナリオを記述する。spec-fixer フェーズで対応可。 |
| 3 | LOW | Spec Coverage | spec.md | 「金額と日付はモノスペースフォントで表示する」Requirement のシナリオはパイプラインサマリ金額と期日超過テーブルのみをカバーし、経理ダッシュボード KPI セル 1（今月の売上 `¥{monthlySalesTotal}`）の font-mono 適用が spec シナリオに含まれていない。tasks.md T-07 では `font-mono` 付与が明記されている。 | spec.md の同 Requirement に KPI カード金額の font-mono シナリオを追加するか、または既存シナリオの Given 条件を「両ダッシュボードの金額フィールド全般」に拡張する。 |
| 4 | LOW | Informational | design.md | design.md の Open Questions（actorName 解決、Invoice 名前解決）は未解決のままだが、いずれも本変更のスコープ外として明示されており、フォールバック表示が tasks.md に明記されている。実装ブロックにはならない。 | 対応は別リクエストに委ねる（design.md 記載通り）。本変更では措置不要。 |

## Review Notes

### spec.md 形式チェック

- `### Requirement:` ヘッダー: 全 5 要件に存在 ✓
- `#### Scenario:` 各要件に 1 つ以上存在 ✓
- normative keyword (`SHALL`): 全 5 要件の本文に含まれる ✓
- Layer-1 振る舞いのみ記述: ✓（型定義・FSM 強制の Layer-0 内容なし）

### セキュリティレビュー

本変更は純粋な UI プレゼンテーション層の変更であり、セキュリティリスクは最小限。

- **A01 (Broken Access Control)**: 変更なし。データ取得・権限チェックは既存の usecase に委任しており、新規 API ルート・Server Action なし。
- **A03 (Injection)**: React/Next.js は出力を自動エスケープ。`dangerouslySetInnerHTML` 使用なし。`phaseLabels[item.phase]` は `DealPhase` union 型で型安全。`actorId.slice(0, 8)` は単純な文字列切り出し。
- **A07 (XSS)**: 外部入力を DOM に直接挿入するパターンなし。リンク URL は内部固定パス（`/deals`, `/inquiries/new`, `/contracts`）またはサーバーサイドで取得した ID を組み合わせたパスのみ。
- **新規認証フロー・入力フォーム**: なし。

### 設計判断の妥当性確認

- **D1 (flex/grid 置換)**: デザイン要件（列幅比率 `1.55fr:1fr` 等）をテーブルで再現することは困難であり、置換判断は妥当。
- **D2 (DashboardHeader 共通コンポーネント)**: `PageToolbar` を拡張するより専用コンポーネントを新設する方が影響範囲を限定できる。妥当。
- **D3 (合計列フロントエンド算出)**: `usecase` 変更不要な単純加算。妥当。
- **D4 (タイプラベル色分け)**: テーマ semantic color token 使用によりダークモード互換性確保。`bg-warning/10`, `bg-primary/10`, `bg-success/10` はいずれも globals.css で定義されたトークンに対する Tailwind 不透明度修飾子。有効。
- **D5 (相対時間ローカル関数)**: プロジェクト全体で共有要件がない段階でのローカル実装は適切。
- **D6 (超過日数算出)**: 純粋表示ロジックとして `Math.floor((Date.now() - date.getTime()) / 86400000)` はシンプルかつ正確。
- **D7 (Invoice 5 カラム)**: データモデル制約に基づく合理的なトレードオフ。Open Question としてフォローアップが明記されている点も適切。

### テーマトークン検証

tasks.md で参照されるすべての Tailwind クラスが globals.css に定義されていることを確認:

| クラス | CSS 変数 | 値 (light) |
|--------|---------|-----------|
| `text-success` | `--color-success` → `--theme-success` | `#1a8a4a` |
| `text-danger` | `--color-danger` → `--theme-danger` | `#c0392b` |
| `text-warning` | `--color-warning` → `--theme-warning` | `#d4880f` |
| `text-primary` | `--color-primary` → `--theme-primary` | `#2980b9` |
| `border-border-light` | `--color-border-light` → `--border-light` | `#e0e0e0` |
| `text-2xs` | `--text-2xs` | `0.625rem` |
| `text-table-head` | `--text-table-head` | `0.6875rem` |
| `font-mono` | `--font-mono` → `--font-ibm-plex-mono` | IBM Plex Mono |
| `bg-bg-table-head` | `--color-bg-table-head` → `--bg-table-head` | `#dcdde1` |

全トークン有効 ✓。`bg-warning/10`, `bg-primary/10`, `bg-success/10` は Tailwind CSS 4 の opacity modifier として正常動作する。
