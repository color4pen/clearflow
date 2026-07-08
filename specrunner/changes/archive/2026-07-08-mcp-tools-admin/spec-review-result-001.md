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
| 1 | MEDIUM | Security / Test Coverage | spec.md (webhooks create シナリオ) / tasks.md T-10 | spec.md に「create で HTTPS 以外の URL が拒否される」シナリオが定義されているが、対応する T-10 のテストタスクリストに URL バリデーション（HTTPS 強制・プライベート IP 拒否）の実行検証項目が存在しない。T-04 の受け入れ基準に「URL バリデーション（HTTPS 必須・プライベート IP 拒否）が機能する」と明記されているが、保証するテストがタスクとして指示されていない。`validateWebhookUrl` が実際に呼ばれているか、誤った引数で呼ばれていないかを実行で確認できず、SSRF 保護が意図せず除去されても検出できない。T-01 の受け入れ基準は「typecheck green」のみであり、webhookUrlValidator 単体のふるまいテストも存在しない。 | T-10 のテストリストに以下 2 ケースを追加する。① `{ operation: "create", url: "http://example.com/hook", events: [...] }` → `isError: true`（HTTPS 強制）、② `{ operation: "create", url: "https://192.168.1.1/hook", events: [...] }` → `isError: true`（プライベート IP 拒否）。spec.md のシナリオ「create で HTTPS 以外の URL が拒否される」と対応させる。あわせて T-01 の受け入れ基準に `webhookUrlValidator.ts` の単体テスト（または TypeScript 型レベルの保証）を追加することを推奨する。 |
| 2 | LOW | Security / Auditability | spec.md（監査記録要件セクション） / tasks.md T-04 | spec.md で「webhooks の create / delete / toggle は Server Actions 同様に直接 repository 操作だが、現状 Server Actions でも監査記録されていないため、MCP でも同一挙動とする」と明示されている。admin が外部エンドポイントを追加・削除・無効化しても監査証跡が残らず、データ漏洩経路（外部 URL へのイベント転送設定）の内部不正検出が困難になる。MCP という新たなプログラム可能な操作面の追加でリスクが増大する。 | 現スコープでの対応は不要。今後のセキュリティ強化 backlog に「webhook 変更操作（create / delete / toggle）の監査ログ記録」を追加することを推奨する。 |
| 3 | LOW | Test Coverage | tasks.md T-09 | users.list は admin と manager の両ロールに許可されるが（T-03: `canPerform(role, "organization", "listUsers")` は admin / manager のみ）、T-09 のテストケースに「manager で list を呼ぶ → 成功」が含まれない。member の拒否は検証されるが、manager の許可パスが実行検証されない。manager ロールのトークンが list 操作で意図せず拒否されても T-09 では検出できない。 | T-09 に「manager ロール（role: "manager"）で `{ operation: "list" }` を呼ぶ → isError なし、usecase に到達する」ケースを追加する。または、既存の canPerform 行列単体テストで manager の listUsers 許可が保証される旨を T-09 の注釈に明記し、重複検証を避ける判断としてもよい。 |

## Summary

全体的な設計品質は高い。mcp-server-core の学びが design.md と tasks.md に反映されており、認可・テナント分離・シークレット秘匿・実行検証テストの方針は一貫している。また、前回の request-review での指摘（audit_logs の canPerform キー選択、webhook secret の扱い）は design.md D3・D4 と tasks.md T-04・T-05 で正しく解決されている。

ブロッキング修正が必要な点は Finding #1 の 1 件のみ。spec.md に webhook URL バリデーションのシナリオが存在するにもかかわらず、対応するテストタスクが T-10 に欠落しており、SSRF 保護（プライベート IP 拒否）の実行検証が保証されない。tasks.md T-10 への 2 ケース追加（HTTP URL 拒否・プライベート IP 拒否）で解消できる。

Finding #2・#3 は informational であり、実装前の spec 修正は任意。
