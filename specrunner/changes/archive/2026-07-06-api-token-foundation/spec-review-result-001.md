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
| 1 | LOW | Test Quality | tasks.md (T-12〜T-15) | テストがすべて静的解析（ソースファイルのパターン照合）のみ。「失効済みトークンを拒否する」「deactivatedAt を検査する」等のセキュリティ上重要な振る舞いは、条件式の論理ミス（`!==` → `===` 誤記など）があっても静的解析では検出できない。プロジェクトの確立したパターン（`.dynamic.test.ts`）で resolveBearer の正常系・異常系を関数レベルで呼び出すテストを T-12 に追加することで、仕様の振る舞いを実行時に保証できる。 | 実装後に `resolveBearer` を直接インポートし、モック DB で有効トークン/失効トークン/期限切れトークン/deactivated ユーザーの各ケースを動的テストで固定することを検討する。静的解析テストと両立させることで重複カバレッジになるが仕様保証が強化される。本 request の範囲内で対応可能。 |
| 2 | LOW | Spec Consistency | tasks.md (T-05, T-06) / design.md (D6) | D6「updateLastUsedAt 更新失敗時もリクエストは通す（ベストエフォート）」と記述されているが、T-05 のタスクステップに `try-catch` でエラーを吸収するパターンが明示されていない。実装者が T-05 のステップ通り素直に実装すると `await updateLastUsedAt(...)` が例外を投げた場合に認証が失敗する。 | T-05 の lastUsedAt 更新ステップに「更新失敗時は例外を吸収し、認証結果を返す」旨の注記を追加する。または acceptace criteria に「updateLastUsedAt 失敗時も resolveBearer が認証済み結果を返すこと」を追記する。 |
| 3 | LOW | Spec Consistency | tasks.md (T-06, T-09) | T-06 の `createApiToken` ユースケースは `expiresAt?` をオプション引数として受け取るが、T-09 の `createApiTokenAction` にはこのパラメータを受け取る処理が記述されていない。初期実装では UI から有効期限を設定できないデッドパラメータとなる。将来の拡張ポイントとして意図的に残すなら、その旨を tasks.md か design.md の Non-Goals に明記する方が実装者の混乱を防げる。 | T-06 の引数定義から `expiresAt?` を削除し必要になった際に別 request で追加する（推奨）、またはスコープ外として design.md Non-Goals に「expiresAt は UI 未公開・将来拡張」と記載する。どちらも LOW 対応であり現時点ではブロックしない。 |
| 4 | LOW | Security (A09) | tasks.md (T-07) | `revokeApiToken` は `revokeById` が null を返した場合（他ユーザーのトークン ID 指定・失効済みトークンを含む）に `{ ok: false }` で即 return するが、この失敗パスには監査ログが記録されない。他ユーザーのトークンを失効しようとする試みも同じパスを通るため、不正操作の試行が監査証跡に残らない。ただし設計 D5 でエラー種別を意図的に外部に漏らさない設計判断がなされており、失敗ログ追加は列挙攻撃リスクとのトレードオフがある（ログ内でトークン存在有無を隠す記法は取れる）。 | 将来の対応として、失敗時に targetId を省略した `{ action: "api_token.revoke_attempt", actorId, organizationId }` のような試行ログを記録する設計を検討する。本 request での対応は任意。現時点ではブロックしない。 |

## Summary

仕様全体（request.md / design.md / spec.md / tasks.md）を通じて HIGH / CRITICAL の問題は見つからなかった。

**セキュリティ評価（OWASP Top 10 観点）:**
- **A01 Broken Access Control**: `revokeById` の WHERE に `userId AND organizationId AND revokedAt IS NULL` を含め、Server Action がセッションから userId/organizationId を取得する設計は適切。他ユーザー操作・クロステナント操作のいずれも DB レベルで防がれる。
- **A02 Cryptographic Failures**: 256 ビットエントロピーの乱数トークンに SHA-256 を採用する判断は GitHub・Stripe 等の先行事例と一致し、architect 決定済み。平文は発行時のみ返し、以後 DB・API・UI のいずれからも取得不能とする設計は正しい。tokenPrefix は 24 ビット相当の情報に留まり実質的なリスクはない。
- **A03 Injection**: Drizzle ORM のパラメータ化クエリで保護。
- **A07 Identification & Authentication Failures**: ハッシュ照合は SQL WHERE（parameterized）で行われるため、アプリコード内でのタイミング攻撃面はない。revokedAt / expiresAt / deactivatedAt のチェックが resolveBearer に揃っており、トークン無効化の抜け穴は設計上ない。
- **A09 Security Logging & Monitoring**: 発行・失効を audit log に記録し、平文・ハッシュをメタデータに含めない設計は適切。失効失敗の未記録は Finding #4 として LOW で記録。

**仕様完全性:**
- spec.md の全 Requirement に SHALL/MUST キーワードと Given/When/Then シナリオが揃っている。
- Bearer 解決・失効・期限切れ・不正形式・deactivated ユーザー・他ユーザー操作禁止・監査ログ・テナント分離・lastUsedAt 更新の全ビヘイビアがシナリオで網羅されている。
- tasks.md の T-01〜T-16 が全要件をカバーし、acceptance criteria も具体的。

上記 4 件はいずれも LOW（情報提供・将来改善）であり実装の妨げにならない。仕様は実装フェーズへの移行に問題ない品質である。
