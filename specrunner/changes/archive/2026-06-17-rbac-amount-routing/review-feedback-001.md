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
| 1 | low | testing | `verification-result.md` (test phase) | verification で `test` フェーズが skipped になっている（package.json に `test` スクリプトが存在しないため）。受け入れ基準「`bun test` が全件 green」は CI フェーズで自動検証されておらず、テストファイルの実行を手動確認が必要な状態。実装されたテストファイルは構文・ロジックともに正しく、test-coverage チェックでは 30/30 must TC が確認済みのため実態上の問題は低い。 | `package.json` に `"test": "bun test"` を追加してCIで自動実行できるようにする。または `bun test` を手動実行して全件 green を確認する。 | no |
| 2 | low | maintainability | `src/app/actions/requests.ts:73,97,159` | `_formData` の未使用パラメータ lint warning が 3 件（verification-result.md でも確認）。Server Action のシグネチャ要件で必要なパラメータだが、呼び出しコードでは使用しない。ビルドは通過しており警告のみ。 | プロジェクト eslint 設定に `{ "argsIgnorePattern": "^_" }` が設定されていれば警告は抑制される。既存パターン通りなので現状維持でも可。 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 10 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 9 | 0.10 |
| testing | 8 | 0.10 |

- **total**: 8.95

## Summary

実装は仕様・設計・タスクを忠実に反映しており、全受け入れ基準を満たしている。

**正しく実装された主要項目:**

- **スキーマ**: `roleEnum` が `["admin", "member", "manager", "finance"]` に拡張され、マイグレーション SQL（`ALTER TYPE ... ADD VALUE`）も正確に生成されている。`requests.amount`、`approval_templates.min_amount`/`max_amount` のカラム追加も正しい。
- **ドメインモデル**: `Role` 型、`Request` 型、`ApprovalTemplate` 型がすべて仕様通りに更新されており、`domain` 層に infrastructure 依存が入っていない。
- **templateSelectionService**: 純粋関数として実装済み。`amount=null` でデフォルトテンプレート選択、`amount` 指定時は特定的なテンプレート（minAmount/maxAmount を持つもの）をデフォルトより優先する sort ロジックが正しい。境界値（100000/100001）の処理も正確。
- **approvalTemplateRepository.findByOrganizationForAmount**: `amount=null` 時はデフォルトのみ返し、`amount` 指定時は `(minAmount IS NULL OR minAmount <= amount) AND (maxAmount IS NULL OR maxAmount >= amount)` でフィルタ。`ORDER BY CASE WHEN ... THEN 1 ELSE 0 END ASC` によりデフォルトテンプレートを末尾に配置し、`selectTemplate` の「最初に見つかったものを使用」アルゴリズムと整合。
- **createRequest usecase**: `templateId` 引数を完全に除去し `amount` を受け取る形に変更済み。`findByOrganizationForAmount` → `selectTemplate` の 2 段階選択フロー、`amount` の DB 保存、audit_log への `templateId`/`templateName`/`amount` 記録がすべて実装済み。
- **アクション層**: `approveRequestAction`/`rejectRequestAction` のロールガードが `role !== "admin"` から `role === "member"` に正しく変更され、manager/finance ロールが承認・却下操作を試行できる。`listApprovalTemplatesAction` は削除済み。
- **auth.ts**: JWT/セッションコールバックの型キャストが `(user as { role: Role }).role` / `token.role as Role` に更新され、旧来の `"admin" | "member"` ハードコードキャストが解消されている。manager/finance ロールがセッションに正しく保持される。
- **UI**: 申請作成フォームのテンプレート選択 UI が除去され、金額入力フィールド（`name="amount"`, `type="number"`, `min="0"`）に置換済み。申請一覧・詳細画面に金額カラム/セクションが追加されており、null の場合は「-」表示。
- **テスト**: `templateSelectionService.test.ts` が TC-003〜006/011/012 を網羅。`approvalStepService.test.ts` が TC-007〜010 をカバー。`requestWorkflow.test.ts` の TC-018/019/020/023 が `role === "member"` パターンで更新済み。TC-047（listApprovalTemplatesAction 削除確認）も逆向きの検証に書き換えられている。`projectStructure.test.ts` の TC-054/057b も新仕様に合わせて更新済み。
- **アーキテクチャ**: `templateSelectionService` に infrastructure import がなく、依存方向 `actions → usecases → domain / infrastructure` を遵守している。

**注意点（スコープ外・設計上の既知リスク）:**

- D5 の `role === "member"` 排除パターンは、将来 `auditor`/`viewer` 等の閲覧専用ロールを追加した際に承認権限が自動付与されるリスクがある。design.md に明示的に文書化されており、次のロール追加時に許可リスト方式への変更を検討すること（今回スコープ外）。
- `bun test` の CI 自動実行は未設定（finding #1）だが、手動実行による確認または `package.json` への `test` スクリプト追加を推奨する。
