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
| 1 | LOW | Audit omission (architect-approved) | tasks.md T-05 / design.md D4 | `updateOwnProfile` usecase は name 更新を監査しない。`organization.update` や `user.updateRole` は監査対象である一方、表示名変更は対象外とする D4 決定は「低リスク操作」として architect 評価済み。既存の `updateNotificationsLastSeenAt`（監査なし）との一貫性は保たれており、重大な違反ではないが、監査カタログの一貫性指針からの明示的な逸脱として記録する。 | 現状の architect 判断を維持してよい。将来の監査方針見直し時に `user.updateProfile` を追加するか否かを再評価すること。 |
| 2 | LOW | Test file naming | tasks.md T-10 | `src/__tests__/infrastructure/accountRepository.test.ts` という名称は `userRepository.ts` の関数（`findByIdForAuth` / `updateProfile` / `updatePassword`）を検証するファイルを指す。"accountRepository" というリポジトリは存在しないため、命名が誤解を招く可能性がある。 | ファイル名を `userRepository.test.ts`（既存テストと統合可能）または `userAccountMethods.test.ts` など実態に合わせた名称に変更することを実装時に検討する。スペック上の記述は許容範囲であり、ブロッカーではない。 |
| 3 | LOW | Missing validation scenarios | spec.md | BDD シナリオが「正常系」と「現在パスワード誤り」のみを扱っており、`name` 空文字（min(1) 違反）・`newPassword` 7 文字以下（min(8) 違反）のバリデーション失敗シナリオが記載されていない。実装の検証自体は T-10 の静的テストで間接的にカバーされるが、シナリオとして明示されていない。 | 実装上の問題はない。今後の spec.md 拡充時にバリデーション失敗シナリオを追記することを推奨するが、現フェーズではブロッカーでない。 |

## Summary

**テナント分離：適合**

全ての新規リポジトリメソッド（`findByIdForAuth` / `updateProfile` / `updatePassword`）が `and(eq(users.id, id), eq(users.organizationId, organizationId))` による複合 WHERE 条件を規定している（T-02〜T-04）。Server Action は `organizationId` / `userId` を `session.user.*` からのみ取得し、クライアント入力から受け取らない設計が D1 で明示されており、IDOR のリスクが構造的に排除されている（T-07）。テストがこれらの条件の存在を静的検証で固定する（T-10）。

**監査ログ完全性：適合（逸脱 1 件、architect 承認済み）**

パスワード変更（`changeOwnPassword` usecase）は `db.transaction` 内で `updatePassword` と `recordAudit({ action: "user.updatePassword", actorId: userId, targetId: userId, organizationId })` を同一トランザクションで実行することが明示されており（T-06）、原子性と audit の対応が保証されている。`AuditAction` への `"user.updatePassword"` 追加も T-01 で指定済み。表示名変更の非監査は D4 として architect が評価済みの意図的な例外であり、`updateNotificationsLastSeenAt`（既存・非監査）との一貫性は保たれている。

**セキュリティ（追加確認）**

bcrypt.compare は定数時間比較のためタイミング攻撃リスクは低い。`findById` の安全 projection（`hashedPassword` 非返却）が変更されないことが T-02 / T-10 で固定されており、hashedPassword の漏洩経路が増加しない。Next.js Server Actions の CSRF 保護が適用される。
