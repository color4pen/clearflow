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

- **verdict**: needs-fix
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | high | correctness | src/app/(dashboard)/deals/page.tsx:12 | `allPhases` 配列に `"estimate_approval"` が残存している。`phaseLabels` から `estimate_approval` キーが削除済みのため `phaseLabels["estimate_approval"]` は `undefined` を返し、案件一覧フィルタに空ラベルのリンクが常に表示される。`phaseLabels` が `Record<string, string>` 型のため TypeScript が警告せず build が通っている | `allPhases` 配列から `"estimate_approval"` を削除し、5値 `["proposal_prep", "proposed", "negotiation", "won", "lost"]` にする | yes |
| 2 | medium | correctness | src/application/usecases/updateDealPhase.ts:35 | `dealRepository.updatePhase(…, null, …)` で `estimateRequestId` を常に `null` として渡している。設計判断 D2「deals.estimateRequestId を将来の手動紐づけ用に残す」と矛盾しており、フェーズ更新のたびに既存の `estimateRequestId` 値が上書きされる。また `updatePhase` シグネチャの `estimateRequestId: string | null` パラメータが常に `null` で呼ばれる「未使用引数の残置」になっており code-common.md の後方互換ハック禁止に抵触する | `dealRepository.updatePhase` のシグネチャから `estimateRequestId` 引数を削除し `.set()` 内の `estimateRequestId` 更新を除外する。または `deal.estimateRequestId` を現在値のまま引き渡す | yes |
| 3 | low | testing | src/__tests__/domain/dealTransition.test.ts:55 | `it("negotiation → estimate_approval が拒否される（フェーズ削除）", ...)` に T-XX ID が付与されていない。code-common.md では「設計書 `テスト仕様` の T-XX をケース名に埋め込む」が全テストで必須 | テスト名を `it("T-07: negotiation → estimate_approval が拒否される（フェーズ削除）", ...)` などの T-XX 形式に変更する | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 7 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 8 | 0.10 |

- **total**: 8.20

## Summary

承認連携の撤去は全体的に正確に実施されている。スキーマ（`estimate_approval` 列挙値削除・`sourceType`/`sourceId`/`conversionRequestId` カラム削除）、ドメインモデル（`DealPhase`・`Request`・`Inquiry` 型）、ドメインサービス（`negotiation → won` 直接遷移）、ユースケース（`runPostApprovalLinkage` 撤去・converted 遷移での `dealRepository.create` 直接呼び出し）、Server Actions、UI の各層で対象コードが適切に除去されており、build/typecheck/test（510件 all green）も通過している。マイグレーション SQL も正しく生成されている。

ただし、以下の修正が必要:

1. **UI 漏れ（high）**: `src/app/(dashboard)/deals/page.tsx` の `allPhases` から `"estimate_approval"` が除去されていない。フィルタリンクが常に空ラベルで表示される。TC-027 など既存テストはこのファイルをカバーしておらず、TypeScript も `Record<string, string>` 型のため検出できなかった。

2. **updatePhase シグネチャ不整合（medium）**: `updateDealPhase.ts` が `dealRepository.updatePhase` に `estimateRequestId: null` を常に渡しており、設計判断 D2「将来の手動紐づけ用に残す」と矛盾する。また `updatePhase` の `estimateRequestId` 引数が実質的に死んでいる（常に `null`）ため、コード規約違反にもなる。

3. **テスト ID 欠如（low）**: 追加テストの1件に T-XX ID が付与されていない。
