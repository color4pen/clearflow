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

## Resolution of Prior Findings (spec-review-result-001)

| Prior # | Severity | Status | Resolution |
|---------|----------|--------|------------|
| 1 | HIGH | ✅ Resolved | design.md D4 に「UPDATE は ALTER COLUMN より前に置く」と明記。tasks.md T-07 に「`CREATE TYPE` の直後かつ `ALTER COLUMN` の直前に UPDATE を挿入する」と手順が具体化された。「末尾に追記」という曖昧な表現は削除済み |
| 2 | MEDIUM | ✅ Resolved | `validatePrimaryUniqueness` の配置先が `application/services/clientContactService.ts` に変更された。design.md D5 および tasks.md T-06 に「domain/services ではなく application/services に配置すること」と明示されている |
| 3 | MEDIUM | ✅ Resolved | design.md D5 および tasks.md T-06 に `createClientContact` use case を `db.transaction` ブロックで囲む旨が明記され、TOCTOU 競合が create パスで防止される |
| 4 | MEDIUM | ✅ Resolved | tasks.md T-04 に Drizzle `check()` ヘルパーでの CHECK 制約定義が明示された。design.md D2 でも同様に `schema.ts` の `check()` として定義することが確認されている |

## New Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | LOW | Consistency | `spec.md` L103–L105 | `### Requirement: isPrimary uniqueness SHALL be validated at the application layer`（ヘッダー）と `The validation SHALL be performed by \`validatePrimaryUniqueness\` in the domain service layer.`（本文）が矛盾する。spec-fixer が design.md・tasks.md を application/services に修正した際に spec.md の本文を更新し忘れたと考えられる。テストシナリオはすべて正しく振る舞いを記述しており、test-case-gen への影響は軽微だが、仕様文書としての一貫性が欠ける。 | spec.md L105 の `in the domain service layer` を `in the application service layer` に修正する。 |

## Security Review

OWASP Top 10 の観点でレビューを実施した。

- **A01 (Broken Access Control)**: `findAllByInquiry(inquiryId, organizationId)` が organizationId によるマルチテナント分離を正しく引数に含んでいる。新規フィールド（budget, timeline, description）は既存 Action の認証チェックを継承する設計となっており、スコープ内で問題なし。
- **A03 (Injection)**: `inquirySourceEnum` を pgEnum に変更することで source カラムへの任意文字列注入を DB 制約レベルで防止できる。これはセキュリティ面でも有効な改善。budget / timeline / description は Drizzle ORM のパラメータ化クエリで処理されるため SQL インジェクションリスクなし。Zod スキーマ（`z.coerce.number().int()` / `z.string()` / `z.enum`）でアクション入力を検証している。
- **A04 (Insecure Design / TOCTOU)**: `createClientContact` use case は db.transaction ブロックで SELECT と INSERT を囲み TOCTOU 競合を防止している。`updateClientContactAction` の TOCTOU リスクは設計上の既知問題として明示的に将来対応へ延期されており、仕様に明記されている。本リクエストのスコープ内での対応としては許容範囲。
- **A08 (Data Integrity)**: マイグレーション SQL は `COALESCE("attendees"->'internal', '[]'::jsonb)` で attendees が NULL / キー不在のエッジケースを処理している。source の enum 変換は ALTER COLUMN 前に UPDATE で不正値を `'other'` にフォールバックする順序が tasks.md T-07 に明確に定義されている。

CRITICAL / HIGH のセキュリティ所見なし。

## Summary

spec-review-001 で指摘した 4 件の所見（HIGH 1 件・MEDIUM 3 件）はすべて解消された。残存所見は spec.md の本文フレーズに留まる LOW 1 件のみ。テストシナリオの正確性・tasks.md と design.md の実装指針ともに問題なく、仕様は実装フェーズへ進める状態にある。
