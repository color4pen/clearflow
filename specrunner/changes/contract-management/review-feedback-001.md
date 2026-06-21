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
| 1 | low | testing | `src/__tests__/static/projectStructure.test.ts` | TC-034（domain 層に @/infrastructure import がない）のファイルリストに `domain/services/contractTransition.ts` と `domain/models/contract.ts` が含まれていない。現状は問題ないが、将来の誤った import を検出できない。 | TC-034 の files 配列に `"domain/services/contractTransition.ts"` と `"domain/models/contract.ts"` を追加する。 | yes |
| 2 | low | maintainability | `src/app/(dashboard)/contracts/[id]/ContractStatusActions.tsx` | `TERMINAL_STATUSES` 定数が `contractTransition.ts` と `ContractStatusActions.tsx` の2箇所に独立して定義されている。Server/Client 境界の制約上やむを得ないが、終端ステータスが追加された場合に両方を更新し忘れるリスクがある。 | Client Component から直接 import できないため、`"completed" | "cancelled"` の union 型を `ContractStatus` から導出する代替実装を検討する。現状はコメントで同期が必要な旨を記載することで許容範囲。 | no |
| 3 | low | maintainability | `src/app/actions/contracts.ts` | `createContractAction` のレート制限に `RATE_LIMITS.createRequest` を流用している。機能的に問題はないが、リクエスト作成と契約作成が別の上限を持つ場合に対応できない。 | `RATE_LIMITS` に `createContract` エントリを追加するか、既存の値を再利用する意図をコメントで明示する。 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 8 | 0.10 |

- **total**: 8.85

## Summary

実装全体を通じて仕様への準拠度が高く、受け入れ基準を全て満たしている。

**検証済み項目**:
- `contractStatusEnum` (`["active", "completed", "cancelled"]`) / `renewalTypeEnum` (`["one_time", "recurring"]`) が正しく定義されている
- `contracts` テーブルに全カラム・FK・`dealId` unique 制約が揃っている
- `canTransition` が `active → completed / cancelled` のみ許可し、終端状態からの遷移・同一ステータス遷移を正しく拒否する
- `createContract` がフェーズ（won）チェック・重複チェック・Deal 情報引き継ぎをトランザクション内で実行する
- 全リポジトリメソッドに `organizationId` 条件が付与されている（TC-029 でテスト済み）
- Server Actions の `organizationId` はセッションから取得しており、リクエストボディからは取得していない
- ナビゲーションに「契約」リンクが「案件」と「申請一覧」の間に正しく配置されている
- 案件詳細（won フェーズのみ）に契約セクションが表示される
- build / typecheck / test (526件) / lint がいずれも green
- マイグレーションファイルが `drizzle/0003_magenta_red_ghost.sql` として生成されている
- 依存方向 `actions → usecases → domain / infrastructure` が遵守されている

**指摘事項**:
- Finding 1（testing/low）: TC-034 への新ドメインファイル追加は軽微な修正で対応可能。fixer 対象とする。
- Finding 2・3（maintainability/low）: Server/Client 境界と既存パターンの制約に起因するもので、現状設計上許容範囲。fixer 対象外とする。
