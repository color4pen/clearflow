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

- **verdict**: needs-fix

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | HIGH | Requirement contradiction | tasks.md / spec.md | T-05 の `update` 操作が `clientRepository.update` を直接呼ぶ指示になっており、requirement 4d（`updateClient` / `updateClientContact` ユースケース新設・MCP ツールと既存 Server Action 両方をユースケース経由に統一）および spec.md の MUST 要件（`update` / `update_contact` はユースケース経由で監査ログを記録しなければならない）と直接矛盾する。加えて tasks.md にはユースケース新設タスク・`updateClientAction` / `updateClientContactAction` のリファクタタスクが存在しない。T-12 の監査ログテストにも `clients update` / `clients update_contact` の経路が欠落しており、request.md 受け入れ基準「MCP ツール・既存 Server Action の両経路でテスト」を充足できない。コードベース確認: `src/application/usecases/` に `updateClient` / `updateClientContact` は存在せず、`src/app/actions/clients.ts` は現在も `clientRepository.update()` / `clientRepository.updateContact()` を直接呼んでおり監査記録がない（要件の前提と一致）。 | (1) tasks.md に新タスクを追加: `updateClient` ユースケース（監査記録 `client.update` 付き）の新設・`updateClientContact` ユースケース（監査記録 `client_contact.update` 付き）の新設・`updateClientAction` / `updateClientContactAction` を新設ユースケース経由に差し替え。(2) T-05 の `update` / `update_contact` 操作を新設ユースケース呼び出しに変更する。(3) T-12 に「MCP 経由の clients update → 監査ログ（client.update）が記録される」「Server Action 経由の clients update → 監査ログが記録される」テストケースを追加する。(4) spec.md の監査ログ Requirement に clients update を対象とする Scenario を 1 件追加する。 |
| 2 | MEDIUM | Spec coverage gap | spec.md | 監査ログ Requirement の MUST 文は `update` / `update_contact` を対象に含めているが、提示されている Scenario は `inquiries create` の 1 件のみ。requirement 4d で最も重点的に変更される `clients update` / `clients update_contact` 経路に対する Scenario がなく、test-case-gen が仕様から正確なテストケースを生成できない。 | spec.md の「Requirement: 書き込み操作は監査ログに記録される」に `#### Scenario: MCP 経由の顧客更新が監査ログに記録される` を追加する（Given: 新設 updateClient ユースケース / When: clients ツールを operation: "update" で呼び出す / Then: client.update 監査ログが記録される）。 |
| 3 | LOW | Spec coverage gap | spec.md / tasks.md | `inquiries update_status: "declined"` の認可パス（T-03 で `canPerform(role, "inquiry", "decline")` が指定されている）に対応する spec.md の Scenario と T-09 / T-11 のテストケースが存在しない。update_status は 3 値（new / converted / declined）を持つが、declined のカバレッジがゼロ。 | spec.md の `inquiries update_status` Requirement に Scenario（declined ステータスへの権限チェック）を追加するか、T-09 に「member による inquiry.decline → isError」「manager による inquiry.decline → 成功」のテストケースを追加する。 |
| 4 | LOW | Security | design.md / spec.md | D7 のエラー変換ルールで `usecase Result { ok: false, reason }` の `reason` をそのままクライアントに返す。`reason` はドメイン制御の文字列であり通常は安全だが、仕様上「安全な reason とは何か」の定義がなく、将来の usecase が内部 ID・エンティティ名・DB 制約メッセージを reason に混入した場合に情報漏洩になるリスクがある。spec.md は「スタックトレース・内部識別子を漏らさない」と述べるが reason の取り扱い規約がない。 | D7 に「usecase の reason は人間向けドメインメッセージのみを含むこと。内部 ID・DB エラー・スタックトレースを含む reason は `handleToolError` と同様に汎用メッセージに置き換える」を一文追加する。実装コスト低。 |

## Review Notes

### 承認根拠（前提確認済み）

- `src/infrastructure/apiTokenResolver.ts` の `resolveBearer` が `Bearer → { userId, organizationId, role } | null` インターフェースを提供済み（hash 照合・失効検査・deactivated ユーザー検査を含む）。D6 の認証抽象化設計と整合する。
- `src/domain/authorization.ts` の `canPerform` が inquiry / deal / client 全操作をカバー済み（ADMIN_ONLY の delete を含む）。T-03 〜 T-05 の `canPerform` 呼び出し組み合わせは既存マトリクスと整合する。
- `src/infrastructure/rateLimit.ts` の `checkRateLimit` が直接呼び出し可能。D6 が設計する per-request auth との組み合わせは実装可能。
- `@modelcontextprotocol/sdk` は node_modules に存在し、D1 で `WebStandardStreamableHTTPServerTransport`（Web Standard Request/Response ベース）を選択した根拠（Next.js 16 route handler との親和性）は妥当。`package.json dependencies` への追加要件（request.md 要件1）が design.md D1 に明記されており、implementer への伝達は完全。
- D8（per-request transport 生成 / module-level McpServer シングルトン）は stateless モードとの整合性があり、スケール特性・実装複雑性のトレードオフとして合理的。
- D3（リソース単位ツール + operation 引数）、D4（usecase 共有アダプタ）、D5（enableJsonResponse: true）は architect 評価済みであり、設計根拠が design.md に記録されている。

### 主要 finding の補足

Finding 1 は tasks.md の不整合であり、spec.md・design.md の構造自体は健全。`tasks.md` の `T-05` が request-review-result-002.md で「存在しないため直接呼び出す」とされていた旧来の記述をそのまま引き継いでしまっており、design step で requirement 4d が確定した後にタスクが更新されていない。spec-fixer での修正範囲は tasks.md（T-05 変更 + 新タスク追加 + T-12 補強）と spec.md（Scenario 1 件追加）に限定される。
