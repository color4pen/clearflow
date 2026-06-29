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
| 1 | LOW | Clarity | spec.md | reactivateUser の Requirement 見出しと deactivateUser Scenario の Then 句に「deactivatedAt=null となり」「deactivated_at が設定され」という表現があるが、mock ベーステストではリポジトリがスタブのため DB フィールド値を直接 assert できない。実際に検証可能なのは「userRepository.reactivate / deactivate が呼ばれたこと」と「監査 action が記録されたこと」。 | Then 句はすでに「userRepository.reactivate/deactivate が呼ばれ、auditLogRepository.create が … で呼ばれる」と正確に記述されており、実装者への混乱は軽微。実装時は DB フィールド値 assert を試みず、repository 呼び出し引数と監査 action の assert に集中すればよい。 |

## Review Notes

### 仕様とソースの整合確認

各 usecase の実装を直接読み込み、spec.md のシナリオと突合した。

- **updateUserRole.ts**: 自己降格ガード（actorId === targetUserId）→ findById 存在確認 → 最後の admin ガード（findByOrganization + `deactivatedAt === null` フィルター）→ db.transaction 内で updateRole + recordAudit の順。spec.md のシナリオ 3 つとすべて対応している。
- **deactivateUser.ts**: 自己無効化ガード → findById → 最後の有効 admin ガード → db.transaction 内で deactivate + recordAudit の順。spec.md シナリオ 3 つと対応。
- **reactivateUser.ts**: findById → `deactivatedAt === null` で既に有効なら early return → db.transaction 内で reactivate + recordAudit の順。spec.md シナリオ 2 つと対応。
- **createUser.ts**: existsByEmail 事前チェック → bcrypt.hash → db.transaction 内で userRepository.create + recordAudit → 23505 catch の順。spec.md シナリオ 3 つ（事前チェック拒否・23505 フォールバック・成功パス）と対応。
- **changeOwnPassword.ts**: findByIdForAuth → bcrypt.compare 不一致で即 reject → bcrypt.hash → db.transaction 内で updatePassword + recordAudit の順。actorId / targetId 両方が data.userId。spec.md シナリオ 2 つと対応。

### spec.md 形式確認

- 各 Requirement に `### Requirement:` ヘッダー ✓
- 各 Requirement に `#### Scenario:` が 1 つ以上 ✓
- Requirement 本文（ヘッダー直後〜最初の Scenario の前）に normative keyword `SHALL NOT` ✓（全 5 Requirement）

### tasks.md 実装可能性確認

- T-01〜T-05 の mock 対象メソッド（findById, findByOrganization, updateRole, deactivate, reactivate, existsByEmail, create, findByIdForAuth, updatePassword）はすべて `userRepository.ts` に実装済み。
- changeOwnPassword の `findByIdForAuth` は `UserWithPassword`（hashedPassword を含む）を返す型が必要であり、T-05 の state.authUser 定義でこの型を使うことで対応可能。
- T-04 の `state.throwCode` による 23505 シミュレーションは `provisionOrganization.dynamic.test.ts` で動作確認済みのパターンと同一。
- 全 usecase が barrel（`@/infrastructure/repositories`）から import しているが、個別ファイルモック（`mock.module("@/infrastructure/repositories/userRepository", ...)`）が barrel 再エクスポートを通じて機能することは `provisionOrganization.dynamic.test.ts` の動作で実証済み。

### 受け入れ基準カバレッジ

| 要件 | spec.md シナリオ | tasks.md テストケース | 対応 |
|------|----------------|----------------------|------|
| updateUserRole: 自己降格拒否 | ✓ | T-01 | ✓ |
| updateUserRole: 最後の admin 降格拒否 | ✓ | T-01 | ✓ |
| updateUserRole: 他 admin あり降格成功 + 監査 | ✓ | T-01 | ✓ |
| deactivateUser: 自己無効化拒否 | ✓ | T-02 | ✓ |
| deactivateUser: 最後の有効 admin 無効化拒否 | ✓ | T-02 | ✓ |
| deactivateUser: 成功 + deactivate 呼び出し + 監査 | ✓ | T-02 | ✓ |
| reactivateUser: 成功 + reactivate 呼び出し + 監査 | ✓ | T-03 | ✓ |
| reactivateUser: 既に有効なユーザーへの拒否 | ✓ | T-03 | ✓ |
| createUser: email 重複拒否（事前チェック） | ✓ | T-04 | ✓ |
| createUser: 23505 フォールバック | ✓ | T-04 | ✓ |
| createUser: 成功 + bcrypt hash assert + 監査 | ✓ | T-04 | ✓ |
| changeOwnPassword: 現在パスワード不一致拒否 | ✓ | T-05 | ✓ |
| changeOwnPassword: 成功 + bcrypt hash assert + 監査 + actorId=targetId=userId | ✓ | T-05 | ✓ |

### セキュリティ観点

本変更はテストファイルのみの追加であり、実装コードへの変更はない。テストファイルに本番認証情報・シークレットを含まない（mock 値のみ）。OWASP Top 10 に対して本変更が新たなリスクを導入することはない。

### 総合判定

仕様・設計・タスクの三者間に矛盾なし。request.md の受け入れ基準 1〜4 をすべてカバー。参照実装（`provisionOrganization.dynamic.test.ts`）との整合性も確認済み。CRITICAL / HIGH 所見なし。実装フェーズへの移行に問題ない。
