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
| 1 | MEDIUM | Correctness / Audit Integrity | tasks.md (T-07), spec.md | **`deactivateUser` usecase に「既に無効化済みユーザーへの再無効化」ガードがない。** `reactivateUser`（T-08）は「すでに有効なユーザーへの再有効化」を明示的に early return で拒否し、spec.md にもシナリオがある。しかし `deactivateUser`（T-07）には対称ガードが存在しない。T-07 の Guard 2 で `findById` が（deactivated_at フィルターなし）deactivated ユーザーを返すため、既に無効化済みのユーザーを再び無効化しようとすると: (a) `deactivated_at` が新しいタイムスタンプで上書きされる、(b) 重複する `user.deactivate` 監査ログが生成される。監査ログの整合性が壊れ、最初に無効化した日時が失われる。UI（T-10）は状態ボタンで自然に防ぐが、Server Action を直接呼んだ場合にこのパスが通る。 | tasks.md の T-07 に Guard 0 として「`findById` で取得したユーザーの `deactivatedAt` が non-null の場合は `{ ok: false, reason: "ユーザーはすでに無効化済みです" }` を返す早期リターン」を追加する。spec.md に対応するシナリオ「admin が既に無効化済みのユーザーを無効化しようとする → エラーが返り、DB 更新も監査ログ記録も行われない」を追加する。T-11 のテストリストにもこのケースを追加する。 |
| 2 | LOW | Correctness | tasks.md (T-07) | **`deactivate` の null 戻り値に対するトランザクション内チェックが未指定。** T-04 は `deactivate` が `Promise<User | null>` を返すと定義している。既存の `updateUserRole.ts`（参照実装）はトランザクション内で `if (!updated) throw new Error("ユーザーの更新に失敗しました")` を行う。T-07 のサブタスクはこのパターンに言及していないため、実装者が `deactivate` の null 戻りを確認せずに `recordAudit` まで進んでしまうリスクがある（`findById` と `deactivate` 呼び出しの間に対象ユーザーが削除された race condition シナリオ）。 | T-07 のトランザクション内サブタスクに「`deactivate` の戻り値が null の場合はエラーをスローする（`updateUserRole.ts` の `if (!updated) throw new Error(...)` パターンと同様）」を追記する。 |

---

## 前回指摘（spec-review-result-001.md）の解消確認

| # | 前回 Severity | 内容 | 解消状況 |
|---|--------------|------|---------|
| 1 | HIGH | `updateUserRole` の `otherAdmins` フィルターが deactivated admin をカウントしてしまう | ✅ 解消：T-07b にて `&& u.deactivatedAt === null` の追加タスクを明記。design.md D3 にも対称性修正の根拠を追記済み |
| 2 | MEDIUM | `findByIdForAuth` に `deactivated_at IS NULL` フィルターが追加されていない | ✅ 解消：T-03 が `findByEmailForAuth` と `findByIdForAuth` 両方に `isNull(users.deactivatedAt)` を適用するよう更新。design.md D2 も `findByIdForAuth` を明示的に対象に追加 |
| 3 | LOW | `reactivateUser` に「既に有効なユーザーへの呼び出し」ガードがない | ✅ 解消：T-08 に early return ガードを追加、spec.md に対応シナリオを追加済み |

---

## 総評

前回レビュー（spec-review-result-001.md）の HIGH・MEDIUM・LOW 全指摘が適切に解消されている。特に T-07b（`updateUserRole` の `otherAdmins` フィルター修正）と T-03（`findByIdForAuth` への `isNull` 適用）は、実装上重要なセキュリティ修正であり、design.md への根拠追記とともに丁寧に対応されている。

新たな Finding 1（MEDIUM）は `reactivateUser` との対称性の欠如に起因する監査ログ整合性の問題であり、最小の修正（早期リターンガード 1 件 + spec.md シナリオ 1 件）で解消できる。Finding 2（LOW）は実装パターンの注記漏れであり同様に軽微。これらを修正すれば仕様全体の品質は高く、実装に進める水準に達する。
