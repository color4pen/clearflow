# MCP Conformance Review — mcp-field-contract — iter 001

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
- iteration line format (exact): `- **iteration**: NNN` (3-digit zero-padded integer)
- Findings table MUST have exactly 7 columns in this order:
  # | Severity | Category | File | Description | How to Fix | Fix
  - Fix column: yes = fixer should address this finding; no = skip (pre-existing / out-of-scope)
-->

- **verdict**: approved
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | low | contract-clarity | src/app/api/mcp/tools/interactions.ts | `buildAdvertisementSchema` の first-win ルールにより、広告スキーマの `summary.description` は `createMeetingSchema` 由来の "議事録・商談要約の本文。Markdown 記法・改行が反映される" に固定される。`record_contract_adjustment` / `record_invoice_adjustment` を呼ぶエージェントからも同じ description が見えるため、"議事録" という文言がこれらの operation では文脈ずれを起こす可能性がある。本変更以前の "要約" はより汎用的だったが、meeting 用途には不十分だった。 | 根本解決は flat advertisement schema の廃止と operation 別スキーマ公開だが、それは本 request のスコープ外（interaction-first-class に委ねる）。近傍対策として createMeetingSchema.summary の describe を "議事録・商談要約の本文（create_meeting / update_meeting）。Markdown 記法・改行が反映される" のように operation 限定を示す文言に変えることが可能だが、エージェントへの情報価値は現行でも十分。現状で low 以上の害はない。 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| contract-name | 10 | 0.25 |
| contract-description | 10 | 0.30 |
| contract-schema | 10 | 0.25 |
| test-coverage | 9 | 0.20 |

- **total**: 9.80

## Summary

### レビュー観点

MCP 境界に固有の失敗クラス（接続エージェントに対する API contract の正しさ・MCP 特有の実装落とし穴）を検証した。

### Contract Accuracy（name / description / inputSchema）

**ツール名・ツール description**: `deals` / `inquiries` / `interactions` の 3 ツールとも、ツール名・ツールレベルの description に変更なし。✅

**Markdown 対応フィールドの広告**:

| フィールド | 変更前 describe | 変更後 describe | 判定 |
|-----------|----------------|----------------|------|
| inquiries.description | (なし) | "引合の概要説明。Markdown 記法・改行が反映される" | ✅ |
| inquiries.contactNote | "連絡メモ" | "問い合わせ内容・連絡メモ。Markdown 記法・改行が反映される" | ✅ |
| deals.notes | (なし) | "案件の備考・共有メモ。Markdown 記法・改行が反映される" | ✅ |
| interactions.summary (create/update_meeting) | "要約" | "議事録・商談要約の本文。Markdown 記法・改行が反映される" | ✅ |

**Markdown 非対応フィールドの誤広告なし**:

- `deals.description` → "案件の概要説明"（"Markdown" を含まない）。TC-FC-08 でネガティブアサートされており、誤広告の防止が contract として固定されている。✅
- `interactions.details`（record_contract/invoice_adjustment）→ "補足・詳細情報"（Markdown 非対応、正しく広告なし）。✅

**用途不明フィールドの補完**:

| フィールド | 変更後 describe | 判定 |
|-----------|----------------|------|
| deals.description | "案件の概要説明" | ✅ |
| interactions.details | "補足・詳細情報" | ✅ |
| hearingDataSchema.notes | "ヒアリングのメモ・補足事項" | ✅ |
| recordContractAdjustmentSchema.summary | "契約調整の要約（必須）" | ✅ |
| recordInvoiceAdjustmentSchema.summary | "請求調整の要約（必須）" | ✅ |

### buildAdvertisementSchema の description 再適用

`schemaHelpers.ts` は `.nullable().optional()` ラッピング後に description を top-level で再適用している（`wrapped.describe(description)`）。これにより anyOf 構造内に description が埋没せず、MCP エージェントが `properties.<field>.description` で確実に取得できる。✅

`hearingData.notes` はネストフィールドであり、広告スキーマ上では `properties.hearingData.properties.notes.description` 経由でアクセスされる。TC-013 で anyOf traversal（`hearingData` が nullable の場合を考慮）を含む実行時検証がされている。✅

### first-win ルールと description の一貫性

`interactions` 広告スキーマの `summary.description` は `createMeetingSchema` 由来（first-win）で "議事録・商談要約の本文。Markdown 記法・改行が反映される" に確定する。この description は `record_contract_adjustment` / `record_invoice_adjustment` operation で使う場合に "議事録" という文言が文脈上ずれる（Finding #1）。

ただし:
1. `operation` enum が operation を明示するため、エージェントは context を判別できる
2. 本変更以前も "要約" という最小 describe しかなく、contract 上の情報量として後退はない（contract として改善）
3. per-operation スキーマ側（recordContractAdjustmentSchema.summary）には正確な describe が付いており、operation を知るエージェントは正しく理解できる
4. 根本解決は flat advertisement schema の廃止であり、本 request のスコープ外

### スキーマ構造の不変性

変更は `.describe()` のみ。フィールドの型・enum・required/optional・nullable・バリデーション・認可・usecase 委譲・戻り値はすべて不変。既存テスト（TC-001〜TC-020 / 2024 pass）への影響なし。✅

### Behavioral テスト

`mcpFieldDescribeContract.test.ts` が `tools/list` 経由の実行時検証（ソース文字列照合なし）で TC-FC-01〜TC-FC-08 および TC-013 を網羅。Markdown 対応・Markdown 非対応の正逆両方がアサートされており、誤広告の混入を contract として固定している。✅

verification-result.md: build ✅ / typecheck ✅ / test 2024 pass ✅ / lint ✅。
