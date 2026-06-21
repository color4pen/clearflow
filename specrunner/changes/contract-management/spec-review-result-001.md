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
| 1 | MEDIUM | Input Validation | tasks.md (T-10) | `createContractAction` の Zod スキーマで `amount` を "非負整数" と規定しているが、`.min(0)` / `.nonnegative()` の明記がない。実装者が既存の deal パターン（`z.coerce.number().int().optional()` — `.min(0)` なし）を踏襲すると、負の契約金額が DB に保存される。 | T-10 の Zod スキーマ記述を `amount: z.coerce.number().int().min(0).optional()` と明示する。 |
| 2 | LOW | Input Validation | tasks.md (T-10) | `updateContractStatusAction` に Zod バリデーションステップが記述されていない。`newStatus` は formData から生文字列として取得され、usecase に渡される。`canContractTransition` が無効値を正しく拒否するため機能的影響は軽微だが、無効文字列がエラーメッセージ中にそのまま反映される（既存の `updateDealPhaseAction` と同パターン）。 | `newStatus: z.enum(["completed", "cancelled"])` の Zod バリデーションステップをアクションフローに追加するよう T-10 に明記する。または、既存 deal パターンとの整合を理由に意図的な省略である旨をコメントで示す。 |
| 3 | LOW | Spec Coverage | spec.md | テナント分離要件のシナリオが `listContracts` のみカバーしており、`getContract`（ID 指定取得）の組織横断アクセス拒否シナリオが明示されていない。リポジトリ設計（全メソッドに `organizationId` 条件）で防御されているため機能的リスクはないが、テストケース生成ステップへの入力として穴になりうる。 | spec.md テナント分離要件に `getContract(crossOrgContractId, orgA.id)` が `null` を返すシナリオを追加する。 |

## Review Notes

### 全体評価

設計は既存コードベースのパターン（dealRepository / createDeal / updateDealPhaseAction / dealTransition）を一貫して踏襲しており、新規導入のアーキテクチャリスクはない。以下の点について個別に確認した。

### セキュリティ（OWASP Top 10）

| 区分 | 評価 |
|------|------|
| A01 Broken Access Control | `organizationId` はセッション取得（request body 不可）、リポジトリ全メソッドに `organizationId` WHERE 条件、admin/manager ロールガードが write 系 Server Action に明示されている ✓ |
| A03 Injection | Zod バリデーション + Drizzle ORM パラメータ化クエリ ✓ |
| A04 Insecure Design | 状態遷移を domain service（`canContractTransition`）で一元管理、`dealId` unique 制約で二重 Contract を DB レベルでも防御 ✓ |
| A07 Auth Failures | 全 Server Action で `auth()` セッション検証、DashboardLayout でルート全体を保護 ✓ |
| A09 Logging | 作成・更新・ステータス変更を同一トランザクション内で audit_logs に記録 ✓ |

### 仕様整合性

- **request.md ↔ spec.md**: 要件 1〜7（won フェーズ検証、重複禁止、ステータス遷移、ロール制御、テナント分離、監査ログ、案件詳細 UI）が spec.md の Requirement/Scenario に対応 ✓
- **design.md ↔ tasks.md**: D1〜D8 の設計判断がすべてタスクに反映されている ✓
- **tasks.md 技術整合**:
  - T-04 `canContractTransition` の re-export 方式（`as canContractTransition`）は既存 `canDealTransition` パターンと一致 ✓
  - T-02 `dealsRelations.contract: one(contracts)` の fields/references 省略は Drizzle ORM の back-reference 仕様（FK 保有側からの逆引き）として有効 ✓
  - T-17 seed truncation 順序（contracts → deals）は FK 制約を尊重 ✓
- **spec.md 網羅性**: 全受け入れ基準に対応するシナリオが存在する ✓（finding #3 の軽微な欠落を除く）
