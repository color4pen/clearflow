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
| 1 | medium | testing | `src/__tests__/usecases/dealManagement.test.ts` | TC-008（must priority）が未カバー。`updateDealPhase({ newPhase: "internal_approval", templateId: undefined })` を呼んだとき `{ ok: false }` が返ることを検証するテストがない。現在の静的ソース検査では `requestRepository.create` の存在しか確認しておらず、guard の動作保証にならない | `dealManagement.test.ts` に「`internal_approval` 遷移でテンプレート未指定の場合エラーが返る」ことをソースの guard 行 (`!data.templateId`) の存在確認として静的テストを追加する。例: `expect(content).toContain("!data.templateId")` かつ `expect(content).toContain("内示フェーズへの遷移にはテンプレートの指定が必要です")` | yes |
| 2 | medium | testing | `src/__tests__/static/projectStructure.test.ts` | TC-030（must priority）が未カバー。`deals.estimateRequestId` FK の `onDelete: "set null"` が設定されていることを検証する静的テストがない。マイグレーション SQL（`0010_deal_management.sql`）では正しく生成されているが、schema.ts の実装正確性を自動検証しない | `projectStructure.test.ts` の「Tenant isolation — deal」または新セクションに `schema.ts` を読み込み `onDelete: "set null"` と `estimate_request_id` を同時に含むことを `toContain` で確認するテストを追加する | yes |
| 3 | high | correctness | `src/app/(dashboard)/deals/page.tsx` | 案件一覧の「担当者」列（L99）が `row.assigneeId ?? "-"` を描画しており UUID が表示される。T-11 仕様「担当者を表示する」の意図に反し、ユーザーが担当者を識別できない（回避策なし） | `DealWithInquiry` 型に `assigneeName: string \| null` を追加し、`dealRepository.findAllByOrganization` の JOIN で `users.name` を取得して描画する。または短期対応として担当者列を非表示にして別チケットで対処する（前者を推奨） | yes |
| 4 | low | maintainability | `src/infrastructure/seed.ts` | L463 の `console.log("✅ Created inquiries (3 total: new, in_progress, converted)")` が実態と不一致。`inProgressInquiry` の `status` が `"converted"` に変更されたため、実際は `(3 total: new, converted, converted)` である | コメントを `"(3 total: new, converted×2)"` など実態を反映した記述に修正する | yes |
| 5 | low | correctness | `src/application/usecases/updateDealPhase.ts` | 楽観ロック失敗時（`dealRepository.updatePhase` が null を返すケース）にトランザクションが commit され、Request と ApprovalStep の orphan レコードが残る可能性がある。`updateInquiryStatus.ts` の参照実装と同じパターンであり本 PR が新規導入した問題ではない | pre-existing パターンのため本 PR 範囲外。将来的にトランザクション内で `if (!updated) throw new Error(...)` としてロールバックを強制する対応を検討すること | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 8 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 6 | 0.10 |

- **total**: 8.2

## Summary

案件管理機能の実装は全体として高品質です。スキーマ定義・ドメインモデル・リポジトリ・ユースケース・Server Actions・UI ページがすべて揃い、`dealPhaseEnum`・楽観ロック・`estimateRequestId` FK（`onDelete: "set null"`）・テナント分離（全クエリに `organizationId` 条件）・依存方向（`actions → usecases → domain/infrastructure`）も仕様どおりに実装されています。ビルド・型チェック・lint・テスト（488件全 pass）も検証済みです。

修正が必要な点は 2 点のテストカバレッジ欠如と 1 点の UI 表示誤りです:

1. **TC-008（high）**: `updateDealPhase` でテンプレート未指定時のエラーガードは実装されているが、自動テストが存在しない。`must` 優先度の test-cases に定義されており、静的確認テストの追加が必要です。

2. **TC-030（medium）**: `deals.estimateRequestId` の `onDelete: "set null"` は正しく実装されているが（マイグレーション SQL で確認済み）、静的テストで検証されていません。

3. **担当者 UUID 表示（medium）**: 案件一覧ページで担当者が UUID で表示される。`DealWithInquiry` に `assigneeName` を追加してリポジトリの JOIN を拡張することで解決できます。

楽観ロックのトランザクションパターン（Finding #5）は参照実装 `updateInquiryStatus.ts` と同一パターンであり、本 PR の修正スコープ外として記録のみとします。
