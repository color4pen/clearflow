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
| 1 | LOW | Spec 網羅性 | spec.md / tasks.md | SalesDashboard の `action_item` アイテムに対して `assigneeId` が null の場合の表示を spec のシナリオが明示していない。tasks.md T-03 は「assigneeId が null の場合は「未設定」等を表示する」と記載しているが、spec.md の受け入れシナリオにその分岐がなく、テスト生成時に見落とされる可能性がある。 | spec.md の Requirement 4 に「Given an undone action item with dealId "deal-1" and **assigneeId null** exists」のシナリオを 1 件追加し、「未設定」等が表示されることを Then で明記する。 |
| 2 | LOW | タスク記述の正確性 | tasks.md (T-03) | T-03 は「`item.assignee` の参照を `item.assigneeId` に変更し」と指示しているが、実際の SalesDashboard.tsx には `item.assignee` の参照箇所が存在しない（`assignee` フィールドは型定義にはあるが描画コードには使われていない）。担当者表示は既存にはなく、今回新規追加となる。 | T-03 の当該箇所を「担当者列を新規追加し、`userMap[item.assigneeId]` で名前を解決して表示する。assigneeId が null の場合は「未設定」と表示する」に修正する。実装上の問題にはならないが、誤解を避けるため記述を正確にすることが望ましい。 |
| 3 | LOW | dueDate フォーマット未定義 | tasks.md (T-02 / T-04) | T-02 のアクションアイテム dueDate 変換（`Date | null` → `string | null`）について「toISOString() または既存フォーマットに合わせる」とのみ記載されており、表示フォーマットが未定義。DealActionItemsSection (T-04) や SalesDashboard の getDateDisplay でも同様。 | tasks.md に「dueDate は `toLocaleDateString("ja-JP")` でフォーマットした文字列を使用する」と明記する。既存の formatDate ヘルパー（SalesDashboard.tsx）を共有ユーティリティとして抽出して統一するか、各コンポーネントで同一フォーマットを使用するよう指示する。 |

## レビューサマリ

### セキュリティ検証

| 項目 | 確認結果 |
|------|---------|
| 認証（Authentication） | `createActionItemAction` / `toggleActionItemAction` ともに `auth()` でセッション検証済み ✅ |
| 認可（Authorization） | `canPerform(role, "actionItem", "create"\|"toggle")` で RBAC チェック済み ✅ |
| テナント分離（Org Isolation） | すべての repository 呼び出しに `organizationId` を渡しており、他テナントデータへのアクセスを防止 ✅ |
| 入力検証（Input Validation） | Zod スキーマで `description.min(1)`, `assigneeId.uuid()`, `dealId.uuid()` を検証。assigneeId が UUID 形式でなければ 400 相当のエラーを返す ✅ |
| CSRF | Next.js Server Actions の組み込み保護が適用される ✅ |
| レートリミット | `createActionItemAction` に適用済み。`toggleActionItemAction` には未適用だが、これは AI-a からの既存設計であり本スコープ外 ⚠️（スコープ外） |
| OWASP Top 10 | 対象なし（SQL インジェクションは Drizzle ORM のパラメータバインドで防御、XSS は React の自動エスケープで防御） ✅ |

### 前提成果物（AI-a）の整合性確認

| 成果物 | 状態 |
|--------|------|
| `src/app/actions/actionItems.ts` | 全アクション（create / toggle / update / delete）実装済み ✅ |
| `src/application/usecases/listActionItemsByDeal.ts` | 実装済み。`{ ok: true; actionItems: ActionItem[] }` を返す ✅ |
| `src/application/usecases/listActionItemsByMeeting.ts` | 実装済み。`{ ok: true; actionItems: ActionItem[] }` を返す ✅ |
| `src/infrastructure/repositories/actionItemRepository.ts` | `findByOrganization(organizationId, filters?)` シグネチャを確認。design.md / tasks.md の呼び出し形式と一致 ✅ |
| `src/domain/models/actionItem.ts` | `ActionItem` 型（`assigneeId: string \| null`, `dealId: string \| null`）を確認 ✅ |

### Spec 品質確認

- 全 Requirement に `SHALL` キーワードあり ✅
- 全 Requirement に少なくとも 1 つの Given/When/Then シナリオあり ✅
- design.md の D1〜D6 の設計判断が tasks.md の T-01〜T-08 にすべてマッピングされており、実装経路が明確 ✅
- request-review-001 の MEDIUM 指摘（assigneeId 解決方法の未定義、orgUsers の取得欠落）は design.md D3/D5/D6 と tasks.md T-03/T-06/T-08 で解消済み ✅

### 総評

ブロッキング（HIGH / CRITICAL）の問題はなし。設計の判断根拠が明確で、実装者が迷わず着手できる粒度でタスクが記述されている。上記 3 件の LOW 指摘は実装に影響しないため、修正せず実装フェーズに進んで差し支えない。
