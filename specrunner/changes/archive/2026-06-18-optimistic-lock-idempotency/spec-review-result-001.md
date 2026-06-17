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
| 1 | MEDIUM | Design inconsistency | tasks.md / T-07 | マルチステップ承認パスの「全ステップ承認時 request 更新」において、T-07 は「トランザクション内で `requestRepository.findById` を再度呼び出し、その version を expectedVersion に使う」と指示している。しかし、トランザクション内で取得した version は直前に自分が読んだ値と一致するため、`WHERE version = re_fetched_version` は常に成功し、楽観的ロックが無効化される。他の全 usecase（no-steps パス・submitRequest・rejectRequest・resubmitRequest）は `existing.version`（トランザクション開始前の取得値）を使用しており、マルチステップパスだけが異なる方針になっている。実用上は `getCurrentStep(freshSteps) === null` によるステップレベルの再フェッチが主防衛線となるが、request レベルの楽観的ロックがこのパスで機能しなくなることは設計意図に反する。 | T-07 のマルチステップパス request 更新も `existing.version`（トランザクション外で取得した version）を使用するよう記述を修正する。T-11 は `findByRequestId` の tx 対応として有用なので残して良いが、re-fetch して version を取得する手順は削除する。 |
| 2 | MEDIUM | Security / Multi-tenant design | design.md / tasks.md T-02 / spec.md | `idempotency_keys.key` カラムに global unique 制約を定義しているが、`idempotencyKeyRepository.findByKey` は `(key, organizationId)` の2条件でクエリする。UUID v4 の衝突確率は実質ゼロ（〜5×10⁻³⁷）だが、設計上の不整合がある。Org A の key が DB に存在する状態で Org B が同じ key を使おうとした場合、`findByKey(key, orgB)` は null を返し（Org B のレコードなし）、usecase を実行後に `create({key, orgId: orgB})` が unique 制約違反でサーバーエラーになる。このケースは「前回の結果を返す」フローに乗らずエラーになる。また、並行 INSERT（同一キーが同時到達）でも同様のエラーが発生し、spec にそのハンドリングが未定義。 | `idempotency_keys.key` の unique 制約を `(key, organizationId)` の複合ユニーク制約に変更する。`findByKey` のクエリパターン（`(key, organizationId)`）と制約スコープを一致させる。並行 INSERT 時の unique 制約違反を「前回の結果を返す」処理（ON CONFLICT または catch して再 findByKey）として扱う旨を spec または design に明記する。 |
| 3 | MEDIUM | Security / Input validation | tasks.md T-12 | Server Actions での `idempotencyKey` に対するサーバー側バリデーションが仕様化されていない。クライアント側で UUID v4 を生成することは要件定義されているが、サーバー側では FormData から取得した文字列をそのまま DB に書き込む実装になりうる。UUID 形式チェックや最大長チェックが欠如した場合、任意の文字列（空文字列、非常に長い文字列）が key として保存される可能性がある。 | T-12 に「`idempotencyKey` は UUID v4 形式（RFC 4122）かつ最大長 64 文字であることをサーバー側で検証する。不正な形式の場合はキーなし（従来フロー）として扱うかバリデーションエラーを返す」旨を追記する。 |
| 4 | LOW | Clarity | design.md D2 / spec.md | `updateStatus → null` の意味が「record not found」と「version 不一致（OL 競合）」の2通りに解釈できる。spec は「usecase が findById で存在確認済みであれば null は version 不一致と看做せる」という暗黙の前提に依存しているが、この前提が design.md・spec.md のいずれにも明記されていない。実装者が `updateStatus` の null 戻り値の意味を誤解するリスクがある。 | design.md D2 に「usecase が `findById` で存在確認した後に `updateStatus` が null を返した場合、それは version 不一致（楽観的ロック競合）として扱う。record not found は先行する `findById` で既に除外済み」と補足する。 |

## Review Summary

全体的に spec の品質は高く、Given/When/Then シナリオ・MUST キーワード・設計判断の根拠が丁寧に記述されている。CRITICAL・HIGH finding はなく、実装着手に支障はない。

**特に注意すべき実装上の落とし穴**:

- **Finding #1（T-07）**: 実装者は `approveRequest` マルチステップパスの request version に `existing.version` を使用すること。トランザクション内で `findById` を再呼出しして得た version は使わない。
- **Finding #2（複合 unique 制約）**: `idempotency_keys` テーブルの unique 制約は `(key, organizationId)` の複合制約とし、並行 INSERT 競合を明示的にハンドリングすること。

**セキュリティ観点（OWASP Top 10）**:
- A01 Broken Access Control: `findByKey` が `(key, organizationId)` でテナント分離している点は適切。ただし unique 制約が global のため cross-tenant 影響の可能性あり（Finding #2）。
- A03 Injection: Drizzle ORM によるパラメータ化クエリのため問題なし。
- A07 Auth/Access Control: 既存の auth check が Server Actions の先頭にあり、冪等性チェックはその後に実施されるため問題なし。
- その他 Top 10 項目はこの変更の影響範囲外。
