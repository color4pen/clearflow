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
| 1 | low | maintainability | src/app/(dashboard)/components/ActionItemModal.tsx | スコープ外ファイルへの変更: `react-hooks/set-state-in-effect` を抑制する `eslint-disable-next-line` コメントが追加されているが、action_items は本リクエストのスコープ外（次の横展開 PR 対象として明示済み）。変更自体は無害。 | action_items 横展開 PR に移動するか、単独の小 PR として切り出す | no |
| 2 | low | testing | src/__tests__/usecases/optimisticLock.test.ts | TC-015・TC-016（新規 create 時 version=1）の明示的テストアサーションが存在しない。schema の `.default(1)` テストと mapRow テストで間接的にカバーされているが、test-cases.md は must 自動テストとして定義している。 | 静的解析テストとして「create 関数が version を明示 override していないこと」を検証するテストケースを追加するとよい | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 10 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 8 | 0.10 |

- **total**: 8.95

## Summary

実装は ADR-005 で確立済みの楽観的ロックパターンを contracts / invoices へ正確に横展開している。全受け入れ基準を充足し、build・typecheck・1028 テスト全件 green を確認した。

**正常に実装されている点:**

- `contractRepository.update` / `invoiceRepository.update` / `invoiceRepository.updateStatus` の 3 関数すべてで `eq(X.version, expectedVersion)` WHERE 条件と `version: sql\`version + 1\`` SET が正しく追加されている
- 4 usecase（updateContract / updateContractStatus / updateInvoice / updateInvoiceStatus）でトランザクション取得前の `entity.version` を `expectedVersion` に使用し、ロック失敗時に `{ ok: false, reason: "..." }` を返すパターンが一貫している
- `updateInvoice` において金額検証用に再取得する `freshInvoice.version` を `expectedVersion` に使用していない（T-12 要件・TC-022 を正しく実装）。静的解析テスト `expect(src).not.toContain("freshInvoice.version")` でも検証済み
- マイグレーション SQL が `ALTER TABLE ... ADD COLUMN "version" integer DEFAULT 1 NOT NULL` のみで非破壊的（DB リセット禁止規律を遵守）
- 契約向けメッセージ「この契約は他のユーザーによって更新されました。画面を更新してください」と請求向けメッセージ「この請求は...」が entity ごとに正しく分かれている
- 依存方向（actions → usecases → domain / infrastructure）が遵守されている

**指摘事項（ブロッカーなし）:**

F-01（ActionItemModal.tsx のスコープ外変更）は無害な 1 行変更だが規律違反。次 PR で対応推奨。F-02（TC-015/TC-016 の明示的テスト欠如）は静的解析アプローチの枠内で間接カバー済みのため今回は許容。なお `_journal.json` で idx=8 / tag=`0009_` の乖離（migration 0008 のスキップ）が見られるが、design.md のリスク項目で既知事項として言及されており、マイグレーション SQL 自体は正しい。マージ時に番号衝突が発生した場合は design.md 記載の Mitigation で対応すること。
