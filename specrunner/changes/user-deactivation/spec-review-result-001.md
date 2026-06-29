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
| 1 | HIGH | Security / Correctness | tasks.md, design.md | **`updateUserRole` の最後の admin ガードが deactivated admin をカウントしてしまう**。`deactivatedAt` を User 型に追加すると `findByOrganization` は deactivated admin も返す。`updateUserRole.ts:39` の `otherAdmins` フィルターは `u.role === "admin" && u.id !== data.targetUserId` のみで、`u.deactivatedAt === null` を見ていない。このため「deactivated admin A（有効な JWT トークン残存）+ active admin B（唯一の有効 admin）」の状態で A の JWT が切れる前に A が `updateUserRole(target=B, newRole=member)` を呼ぶと、ガードが deactivated な A をカウントして通過し、B が降格されて組織に active admin がゼロになる。`deactivateUser` 側（T-07）は `deactivatedAt === null` フィルターを正しく指定しているのに対して対称性が欠けている。 | tasks.md に「`src/application/usecases/updateUserRole.ts` の `otherAdmins` フィルターに `&& u.deactivatedAt === null`（または `!u.deactivatedAt`）を追加する」タスクを追加する。対応するテスト（userManagement.test.ts）にも「最後の admin ガードが deactivated な admin をカウントしないこと」のアサーションを追加する。 |
| 2 | MEDIUM | Security | tasks.md (T-03) | **`findByIdForAuth` に `deactivated_at IS NULL` フィルターが追加されていない**。`src/application/usecases/changeOwnPassword.ts` が `findByIdForAuth` を利用しており、deactivated ユーザーが有効な JWT トークンを持っている間はパスワード変更を実行できる。T-02 は `deactivatedAt` を select に追加するが、T-03 は `isNull` 条件を `findByEmailForAuth` のみに適用する。既存セッションの即時失効がスコープ外である以上ゼロリスクにはできないが、`findByIdForAuth` 経由の操作を無条件に許容する設計意図を spec で明示すべきである。 | T-03 に `findByIdForAuth` の WHERE 句にも `isNull(users.deactivatedAt)` を追加するサブタスクを加える（認証目的の関数として一貫性を保つ）。または、スコープ外を理由に意図的に除外する場合は design.md の Risk セクションに「`findByIdForAuth` 経由の操作は JWT 寿命まで有効であることを許容する」と明記する。 |
| 3 | LOW | Correctness | tasks.md (T-08), spec.md | **`reactivateUser` は既に有効なユーザーへの呼び出しで誤った監査ログを生成する**。T-08 は `findById` で対象ユーザーを取得した後、現在の `deactivated_at` を確認せずに `reactivated_at = null`（no-op）を実行し `user.reactivate` 監査ログを記録する。spec.md に「すでに有効なユーザーを再有効化しようとした場合」のシナリオがなく、受け入れ可否が未定義。 | spec.md に「再有効化対象がすでに有効な場合は early return する（または no-op として許容する）」シナリオを追加する。T-08 に対応するガードを追記するか、意図的に no-op を許容する旨をコメントで明記する。テストにもこのケースを追加する。 |

---

## 総評

全体的な設計品質は高い。`deactivated_at` nullable timestamp によるソフト無効化、認証ゲートの `findByEmailForAuth` への集約、ロックアウト防止ガードの概念、tenant 分離（WHERE に organizationId）、監査ログの記録、`canPerform` による権限制御など、既存パターンへの整合性はよく取れている。

ただし **Finding 1** は放置すると「deactivated admin + 残存 JWT」の組み合わせで組織の全 active admin を失うシナリオを許してしまう。`deactivateUser` 側（T-07）は正しく `deactivatedAt === null` フィルターを課しているにもかかわらず、`updateUserRole` 側の同等ガードへの言及がなく対称性が壊れている。最小の修正（1 行のフィルター追加 + テスト）で解消できるため、tasks.md に追記して再提出すること。
