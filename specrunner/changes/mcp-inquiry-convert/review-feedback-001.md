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
| 1 | low | testing | `src/__tests__/mcp/mcpApproval.test.ts` | TC-012 のモックが `updateInquiryStatus` から `deal` を返さない旧パターン（`{ ok: true, inquiry: mockInquiry }`）を使用しており、PR 後の実運用で `update_status: converted`（direct 変換パス）が `{ inquiry, deal }` を返すことを反映していない。テスト自体は green のまま通過する（モックに `deal` がないため既存コードパス `toToolSuccess(result.inquiry)` を通る）が、本番では常に deal が生成されるため、`update_status: converted` direct パスの実レスポンス構造は `mcpInquiryConvert.dynamic.test.ts` TC-10 のみで担保されている状態となる。 | TC-012 のモック戻り値を `{ ok: true, inquiry: mockInquiry, deal: mockDeal }` に更新し、`parsed.id` のフラット構造アサーションを `parsed.inquiry?.id` および `parsed.deal?.id` に変更する。または「deal なしシナリオは承認ゲート外の特殊ケーステスト用途」とコメントで明記しメンテ意図を伝える。 | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 10 | 0.25 |
| architecture | 10 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 8 | 0.10 |

- **total**: 9.2

## Summary

### 実装品質

実装は全体として高品質。要件を漏れなく満たしており、設計上の判断（D1〜D5）と実装が一致している。

**正当な点:**

- `UpdateInquiryStatusResult` の `deal?: Deal` 追加（T-01）は純粋な追加変更。承認ゲートパスは `pendingApproval` のみを返し `deal` を含まない。direct 変換パスは `deal` を必ず返す。型の変更は完全に後方互換。
- `case "convert"` ハンドラ（T-02）の実装は設計 D3 に忠実。認可チェック（`canPerform(role, "inquiry", "convert")`）がレート制限より前に実行される順序が正しい。
- レート制限キー `mcp:updateInquiryStatus:${userId}` を `convert` と `update_status: converted` で共有し、2 operation を交互呼び出しするバイパス攻撃を設計上防いでいる（D3）。
- エラー時の内部詳細漏洩なし。usecase の `reason` は日本語の業務メッセージであり、スタックトレース・SQL・パスが漏れる経路がない。
- description 更新（T-04）は MCP conformance 観点で適切。ツールレベル description に `convert` を列挙し、`update_status` の `newStatus` describe に `convert` 推奨注記を追記している。
- `mcpInputSchemaAdvertisement.test.ts` TC-019 の `expectedOperations.inquiries` に `"convert"` が追加されており、spec-review で指摘された MEDIUM Finding #1 が正しく対処されている。
- 全品質ゲート（build / typecheck / lint / test 2009 pass）が green（verification-result.md 確認済み）。

**セキュリティ（MCP conformance 観点）:**

- テナント隔離: `organizationId` は `getAuthInfo` から取得し usecase に渡す。クライアント指定不可。
- 認可: `canPerform(role, "inquiry", "convert")` は既存の `ADMIN_MANAGER` 定義を流用。member ロール拒否を TC-06 behavioral テストで固定。
- スキーマ広告: `inquiriesAdvertisementSchema` に `convertSchema` を追加済み。`tools/list` で `operation` enum に `"convert"` が出現することを TC-11 で確認。

**テストカバレッジ（test-cases.md 対照）:**

- must 12 件: TC-001〜TC-009/011/014/018/022 すべて behavioral テストまたは検証ゲートで担保。
- should 8 件: TC-008/010/013/015/017/019/020/021 のうち TC-013（監査ログ記録）のみ直接の behavioral assert がないが、設計上 usecase 内で記録される（MCP ハンドラ側では不要）ことが spec.md に明記されており許容範囲。
- could 2 件: TC-012/016（description 内容確認）は tools/list の静的 schema から検証可能だが未実装。優先度 could のため問題なし。

**Finding #1（low / testing）の詳細:**

`mcpApproval.test.ts` TC-012 は既存テストであり、今回の PR で変更されていない。しかし PR 後の実運用では `updateInquiryStatus` は direct 変換時に必ず `deal` を返すようになったため、このテストのモックが検証しているシナリオ（direct 変換で deal なし）は本番で発生しなくなった。テストは green を維持するが、将来の開発者が TC-012 を参照すると `update_status: converted` の成功レスポンスが flat inquiry であると誤解する可能性がある。Critical/High ではないが、テストドキュメントとして正確性を高める観点で修正を推奨する。
