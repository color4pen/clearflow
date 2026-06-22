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
| 1 | MEDIUM | Correctness | tasks.md T-04 / spec.md | `deleteDeal` usecase でトランザクション内の `inquiryRepository.updateStatus` が null を返す（楽観的ロック version 不一致）場合の挙動が未定義。null 返却は例外ではないため、トランザクションがそのままコミットされると「案件は削除済み・引き合いが converted のまま」という不整合になる。spec.md の SHALL 要件（引き合いステータスを new に戻す）を満たせない。design.md のリスク緩和策「全操作をトランザクション内で実行」は楽観的ロック競合の 0 行更新を防げない | T-04 に「`updateStatus` が null を返した場合はエラーをスローしてトランザクションをロールバックする」と明記する。spec.md の該当シナリオ（inquiry status reverts）に競合失敗時の期待動作も追記する |
| 2 | MEDIUM | Cache Consistency | tasks.md T-06 | `deleteDealAction` の `revalidatePath` が `/deals` のみ。案件に `inquiryId` がある場合、削除時に引き合いのステータスが `new` に戻るが、`/inquiries` のキャッシュが無効化されない。他ユーザーが引き合い一覧を開いていると `converted` のままの古い表示が続く | T-06 の `deleteDealAction` に `revalidatePath("/inquiries")` を追加する。特定引き合いのパスも revalidate したい場合は、usecase の戻り値 `{ ok: true }` を `{ ok: true; inquiryId?: string }` に拡張し、Action 側で `revalidatePath(`/inquiries/${inquiryId}`)` を呼ぶ |
| 3 | LOW | Spec Typo | tasks.md T-13 | ロールチェックの検証パターンが `role !== "admin" && session.user.role !== "manager"` と不揃い（1 つ目が `session.user.` を欠く）。静的テストがこの文字列をソースコードで検索する場合、実際のコードパターン（`session.user.role !== "admin" && session.user.role !== "manager"`）とミスマッチして誤検知または未検知になる恐れがある | T-13 の記述を `session.user.role !== "admin" && session.user.role !== "manager"` に統一する |
| 4 | LOW | Spec Coverage | spec.md | `deleteInquiry` / `deleteContract` の「削除 + 監査ログがトランザクション内で実行される」という保証がシナリオとして明示されていない。削除は記載されているが監査ログを同一 tx に含める点は要件本文のみで、Given/When/Then シナリオがない | spec.md の audit log 要件のシナリオに「同一トランザクション内で記録される（削除失敗時は監査ログも記録されない）」ケースを追加するか、既存シナリオに `within the same transaction` を明示する |

## Security Review Summary

OWASP Top 10 の観点で主要リスクを確認した。

- **A01 Broken Access Control**: admin / manager ガードがすべての削除 Server Action に要求されており、`organizationId` はセッションのみから取得（入力由来なし）。リポジトリ層でも `organizationId` 条件を WHERE に付与するテナント分離が担保されている。削除ボタンの条件表示（`canChangeStatus` / `canChangePhase` / `canManage`）はコードベースで `role === "admin" || role === "manager"` と定義済みであり、Server Action 側の権限ガードと一致している。
- **A03 Injection**: Drizzle ORM のパラメータバインドを使用しており SQL インジェクションのリスクなし。`hearingData` は JSON シリアライズ後に FormData 送信される既存パターンを踏襲。
- **A04 Insecure Design**: TOCTOU リスクは design.md で明示的に認識・受容済み。finding #1 はその一形態であり MEDIUM として記載。
- **A09 Security Logging**: 全削除操作で監査ログ記録が仕様化されており、同一トランザクション内で実行される設計。
