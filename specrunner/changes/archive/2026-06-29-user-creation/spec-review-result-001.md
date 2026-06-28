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
| 1 | MEDIUM | Spec Inconsistency | spec.md — "createUser usecase" Requirement | spec.md の Requirement 本文で「perform the following **within a single database transaction**: (a) verify no existing user, (b) hash the password…」と記述されているが、tasks.md T-04 では (a) email 重複確認・(b) bcrypt.hash はトランザクション開始前のステップとして正しく分離されている。bcrypt.hash は意図的に低速な CPU 処理（cost 12 で ~100ms）であり、DB トランザクション内で実行するとコネクションプールを圧迫する。spec.md の文面通りに実装すると劣化実装になる。 | spec.md の当該 Requirement 本文を「(a) verify email（pre-transaction）、(b) hash password（pre-transaction）、(c)(d) create + recordAudit（within db.transaction）」の順序を明示する形に修正する。 |
| 2 | MEDIUM | Security | tasks.md T-05 / spec.md createUserAction Requirement | password の zod バリデーションに最小長（8文字）のみが指定されており、**最大長が未指定**。bcryptjs には 72 バイトの入力長上限があり、73 文字以上のパスワードは先頭 72 バイトと同等として扱われる。悪意ある操作者が長大な文字列で意図的に計算コストを増大させる DoS に加え、72 文字超の部分が認証をバイパスできるという微細な問題も発生しうる（OWASP A02）。 | zod スキーマに `.max(72, "パスワードは72文字以内で入力してください")` を追加する。あわせて spec.md の "入力バリデーション失敗" シナリオを「email 形式不正・password 最小長未満・password 最大長超過・name 空文字・role 不正値」の各ケースを例示する形に更新することを推奨する。 |
| 3 | LOW | Spec Completeness | spec.md — createUserAction "入力バリデーション失敗" Scenario | 当該シナリオは「不正な email 形式」のみを例示しており、name 必須・password 最小長・role enum 検証が明示されていない。tasks.md T-05 の zod スキーマとのカバレッジ差があり、テストケース生成 step で見落とされる可能性がある。 | Scenario の Given 節に「name が空文字の場合」「password が7文字以下の場合」「role が許可値外の場合」を追加し、すべてバリデーションエラーが返されることを明示する。 |
| 4 | LOW | Implementation Note | tasks.md T-04 | email 重複事前確認に `findByEmailForAuth` を使用しているが、同関数は `hashedPassword` を含む `UserWithPassword | null` を返す。存在確認には不要なカラムを取得しており、readability 上の軽微な懸念がある。現時点ではセキュリティ上の問題はなく、別途 `existsByEmail` ヘルパを用意するコストと見合わない。 | 現状のまま実装し、将来的に `existsByEmail` 等の専用関数を追加する際のリファクタリング候補として注記するにとどめる。 |

## Codebase Verification

仕様が参照しているコードベースの前提を確認した。

| 確認項目 | 結果 |
|---------|------|
| `authorization.ts` — `Entity` 型に `"organization"` が含まれ、`canPerform` がマトリクスを参照する | ✅ 確認。`PERMISSION_MATRIX.organization` に `createUser` を追加するだけで `canPerform("admin", "organization", "createUser")` が機能する |
| `AuditAction` 型ユニオン末尾は `"user.updateRole"` であり `"user.create"` は未追加 | ✅ 確認。追加先が明確 |
| `AuditTargetType` に `"user"` が既存 | ✅ 確認。追加不要 |
| `recordAudit` の第 2 引数 `tx?: Transaction` が存在し、トランザクション対応済み | ✅ 確認（auditRecorder.ts） |
| `updateUserRole.ts` が `db.transaction` 内で `recordAudit` を呼ぶパターンを実装済み | ✅ 確認。createUser usecase の参照実装として適切 |
| `users` テーブルに `hashed_password NOT NULL` / `email UNIQUE NOT NULL` / `organization_id FK NOT NULL` が存在し、スキーマ変更不要 | ✅ 確認（schema.ts） |
| `WebhookCreateForm.tsx` の `useActionState` パターンが UI 実装の参照として利用可能 | ✅ 確認。`CreateUserForm` の実装指針として適切 |
| settings/users page.tsx が admin ガード（`session.user.role !== "admin"` で redirect）を実装済み | ✅ 確認。T-07 でフォームを追加しても追加の権限チェックは不要 |
| `auditRecorder.test.ts` の `countWithRecordAudit >= 43` チェックは createUser.ts 追加後も通過する | ✅ 確認。閾値は現時点での下限であり、追加後も超過する |

## Security Assessment (OWASP Top 10)

| カテゴリ | 評価 | 備考 |
|---------|------|------|
| A01 Broken Access Control | ✅ 適切 | `ADMIN_ONLY` 認可。`organizationId` はセッション由来（クライアント入力不可）でテナント分離を保証 |
| A02 Cryptographic Failures | ⚠️ MEDIUM | bcrypt cost 12 は適切。72バイト上限の問題（Findings #2 参照） |
| A03 Injection | ✅ 適切 | Drizzle ORM のパラメタライズドクエリ。zod 入力検証あり |
| A04 Insecure Design | ✅ 適切 | email 重複は usecase 事前確認 + DB UNIQUE の二段防御 |
| A07 Identification and Authentication Failures | ✅ 適切 | `auth()` で認証チェック。初期パスワードは bcrypt でハッシュ保存 |
| A09 Security Logging | ✅ 適切 | `user.create` 監査ログをトランザクション内で記録 |

## Summary

仕様の全体構造は要件・設計・タスク・テストが整合している。ADMIN_ONLY 認可・セッション由来の organizationId によるテナント分離・bcrypt ハッシュ・監査ログ記録の設計はいずれも適切。

blocking 相当の HIGH/CRITICAL 指摘はなく、実装への移行は可能。MEDIUM 所見 2 件（spec.md のトランザクション境界の誤記、bcrypt 72 バイト上限への対処）は実装フェーズでの軽微リスクとして認識のうえ、spec-fixer または implementer フェーズで対処することを推奨する。
