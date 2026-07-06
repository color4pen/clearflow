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
| 1 | MEDIUM | Tasks completeness | tasks.md | T-02 に `@modelcontextprotocol/sdk` を `package.json` の `dependencies` に追加する checklist 項目がない。request.md 要件1・design.md D1 の両方で「公式 SDK を採用する場合は dependencies に明示的に追加する（現状は推移的依存のみ）」と記録されているが、T-02 の `- [ ]` 項目として抽出されていない。T-13 の品質ゲート（`typecheck && test`）は devDependencies が利用可能な開発環境で実行されるため、この누락が local の green を通過したまま production build/deployment 時に初めて顕在化するリスクがある。 | T-02 に `- [ ] \`@modelcontextprotocol/sdk\` を \`package.json\` の \`dependencies\` に追加する` を先頭 checklist 項目として追加する。実装コスト小。 |
| 2 | LOW | Spec clarity | tasks.md | T-03 の `inquiries: create` において `newClientName` 指定時の暗黙的顧客作成（`createClient` usecase 呼び出し）で、`canPerform(role, "client", "create")` チェックの要否が記述されていない。既存 Server Action の同パターンと整合する挙動を期待しているが、実装者は参照先 Server Action を読まないと判断できない。 | T-03 の当該箇所に「Server Action と同様に `canPerform(role, "client", "create")` をチェックしてから `createClient` を呼び出す」を一文追記する。 |

## Review Notes

### Round 1 Findings の解決確認

spec-review-result-001.md で報告した 4 件を全確認済み。

| Round 1 # | Severity | 解決状況 | 確認根拠 |
|---|---|---|---|
| 1 | HIGH | ✅ 解決済み | tasks.md に T-14（`updateClient` / `updateClientContact` ユースケース新設・Server Action リファクタ）が追加。T-05 の `update` / `update_contact` が T-14 前提でユースケース経由に変更。T-12 に MCP 経路・Server Action 経路の両監査ログテストケースが追加。 |
| 2 | MEDIUM | ✅ 解決済み | spec.md に「Scenario: MCP 経由の顧客更新が監査ログに記録される」（client.update）・「Scenario: MCP 経由の顧客担当者更新が監査ログに記録される」（client_contact.update）が追加。 |
| 3 | LOW | ✅ 解決済み | spec.md に「decline 権限を持たないロールによる引合の却下 → isError」「decline 権限を持つロールによる引合の却下は成功する」の Scenario が追加。T-09 に member/admin × declined のテストケース、T-11 に declined ステータス変更テストが追加。 |
| 4 | LOW | ✅ 解決済み | design.md D7 に「安全な reason の定義」セクションが追加。ORM 例外の汎用メッセージ変換義務・禁止事項（DB 制約エラー・内部 ID・スタックトレース断片等）が明文化。 |

### 今回の全体レビュー

**認証・認可の整合性**:
- D6 / T-02 の Bearer → `resolveBearer()` → 401 フローは api-token-foundation の既実装インターフェースと整合し、OAuth 2.1 の加算的差し込みに対応した抽象化になっている。
- 全ツール（T-03〜T-05）に `canPerform` チェックが operation 単位で明示されており、Server Action の権限マトリクス（inquiry.delete = admin only 等）と一致している。
- T-08 の認証テスト（無認証・無効トークン・失効済みトークン・無効化ユーザー）で認証境界が網羅されている。

**テナント分離**:
- D4 のアダプタ方式でユースケースを共有する構造上、`organizationId` は認証解決済みの `authInfo` から取得し、リクエストボディからは受け取らない設計になっている。
- T-10 がテナント A のトークンで テナント B のデータを操作するテストケースを固定しており、`inv-all-tenant-scoped` 不変条件に対する保護が担保されている。

**エラー変換・情報漏洩対策**:
- D7 に変換ルールと「安全な reason の定義」が明文化された（Round 1 F4 対応後）。スタックトレース・内部 ID の漏洩経路は仕様レベルで閉じている。
- T-06 の `handleToolError` が予期しない例外を汎用メッセージに変換するユーティリティとして分離されており、全ツールからの使用が義務付けられている。

**監査ログの完全性**:
- T-14 で `updateClient` / `updateClientContact` ユースケース新設と既存 Server Action リファクタが 1 タスクに集約されており、MCP 経路・Server Action 経路の両方で同一ユースケースを通す構造になっている。監査ログ漏れの潜在課題が本変更で閉じる。
- T-12 が MCP 経路・Server Action 経路の両方を対象とし、usecase 呼び出しのモック検証で監査記録が担保されることを確認する構造になっている。

**セキュリティ（OWASP Top 10）**:
- A1（アクセス制御の不備）: canPerform + テナント分離 + テスト網羅 ✅
- A3（インジェクション）: Zod 検証 + Drizzle ORM のパラメータ化クエリ ✅
- A7（認証の失敗）: HTTP レベル 401（JSON-RPC より前）✅
- A9（セキュリティのログ記録と監視の失敗）: usecase 経由の監査ログ ✅
- A6（脆弱・古いコンポーネント）: `@modelcontextprotocol/sdk` v1.29.0 の production dependencies への追加要件が request.md / design.md に明示済み（Finding 1 で tasks.md への反映を指摘）

**品質ゲートの有効性**:
- T-13 の `typecheck && test && aozu check && architecture test` は機能的な正確性・型安全性・モジュール依存規則を網羅している。
- Finding 1（tasks.md への依存追加 checklist 不在）は production deployment での実行時エラーの潜在リスクであり、typecheck/test では検出できないが、仕様情報（request.md・design.md）は充足しているため高優先度のブロッカーにはならない。

**承認根拠まとめ**: 仕様の整合性・セキュリティ設計・テスト網羅・ドメイン不変条件（テナント分離・監査ログ）のすべてが実装可能な品質に達している。Finding 1（MEDIUM）は implementer への注意事項として記録するが、仕様情報は request.md と design.md に完備しているため実装ブロッカーではない。
