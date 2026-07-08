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
| 1 | LOW | Completeness | spec.md | keyword シナリオは `clients`・`inquiries`・`deals`・`contracts`・`invoices` の 5 件のみ記載。残り 14 ツールのキーワード対応は tasks.md（T-03）にのみ存在する。spec が最低限の受け入れ基準を示す設計であれば問題ないが、test-case-gen が参照する一次情報として spec.md に 19 件全マッピングを載せると裁量誤差が減る。 | 必須ではない。test-case-gen は T-03 の全件マッピングテーブルを参照できるため実害は小さい。 |
| 2 | LOW | Implementation hint | tasks.md / T-03 | 新テスト `mcpToolDescriptions.test.ts` で `tools/list` レスポンスから各ツールの `description` を取得するには、型定義に `description?: string` を追加する必要がある。既存の `listToolSchemas()` ヘルパーの `ToolSchema` 型はツールレベルの `description` を含まない（inputSchema のみ）。 | 実装者は新テストで独自の取得ヘルパーを定義するか、既存型を拡張すること。spec/design への影響はない。 |

## Summary

**スコープ・目標**は明確かつ一貫している。変更対象は `description` 文字列と `.describe()` アノテーションのみであり、`name`・スキーマ構造・認可・usecase 委譲・戻り値には一切触れない pure metadata change である。

### 各文書の評価

**request.md**: 問題定義（均質な description による発見性の低下）、要件（同義語・operation リスト・distinct 保証）、スコープ外の明示、aozu 影響判定がすべて揃っている。

**design.md**: 4 つの設計決定（D1〜D4）がそれぞれ Rationale と Alternatives considered を備えている。特に以下は適切:
- D3: `approval_requests` の既存 filter 補足テキストを新 description に統合することを明示的に決定している。行動不変性の観点から重要な配慮である。
- D4: test を `tools/list` 経由の実行検証とし、ソース grep を禁止している。既存 `mcpInputSchemaAdvertisement.test.ts` のパターンと整合する。

**spec.md**: 全 Requirement が SHALL/MUST NOT の normative keyword を含み、Given/When/Then 形式の Scenario を備えている。行動不変性（挙動変更ゼロ）の要件が `MUST NOT` で明示されており、実装者への拘束力が明確。

**tasks.md**: 19 ツール全件の description 語彙要件（T-01）と `.describe()` 付与対象（T-02）が網羅的に列挙されており、実装ガイドとして十分な詳細度がある。特に以下の明示が適切:
- T-02 の `notifications.ts`：operation のみで追加不要と明記（過剰付与を防ぐ）。
- T-03：モック設計でバレル経由モック禁止・`afterAll` 復元を指定している（既存テストパターンと整合）。
- 全ツール共通の定型文除去指示が明示されている。

### セキュリティ評価

変更はメタデータのみで、認証・認可・入力検証・データフロー・レスポンス内容に変更がない。OWASP Top 10 の観点では:
- A01（認可）: `canPerform` 呼び出しや organizationId スコープは無変更。
- A03（インジェクション）: description はサーバー側で静的に登録されるリテラル文字列。ユーザー入力を含まない。
- ツール `name` は不変であり、クライアントのルーティングロジックに影響なし。

セキュリティリスクは実質ゼロ。

### 既存テストへの影響確認

`mcpInputSchemaAdvertisement.test.ts`（TC-001〜TC-020）は inputSchema の `properties`・`enum`・`type` のみを検証しており、ツールレベルの `description` 文字列をアサートするテストケースは存在しない。description 変更後も全テストが無変更で green になる見通しが明確。

HIGH/MEDIUM 相当の blocking 事項なし。実装フェーズへの移行に支障はない。
