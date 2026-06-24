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

## Summary

前回レビュー（spec-review-result-001.md）で報告した 5 件のうち HIGH 1 件・MEDIUM 2 件・LOW 2 件をすべて解消済みであることを確認した。今回のレビューで新たに HIGH/CRITICAL の問題は検出されなかった。委任操作の実装ガイダンスに MEDIUM 1 件の指摘を残すが、実装判断は可能であり仕様の正確さ自体に問題はない。

### 前回指摘の解消確認

| 前回 # | 内容 | 解消状況 |
|--------|------|----------|
| 1 (HIGH) | T-01 の権限マトリクスに `deleteTemplate` 未定義 | ✅ `createPolicy/editPolicy/createTemplate/editTemplate/deleteTemplate=admin` として追加済み |
| 2 (MEDIUM) | `createInquiryAction`・`createClientAction`・`updateClientAction` に認可チェックなし | ✅ T-06 に `inquiry.create`、T-07 に `client.create` / `client.edit` チェック追加の記述あり |
| 3 (MEDIUM) | `deleteClientContactAction` が `client.delete` を流用、T-01 に `deleteContact` 未定義 | ✅ T-01 に `deleteContact=admin+manager` 追加、T-07 は `client.deleteContact` を明示 |
| 4 (LOW) | `deactivateDelegation` の所有者確認シナリオが spec.md にない | ✅ 複数シナリオ追加済み（自身・他者の無効化、admin 例外） |
| 5 (LOW) | `listDelegations` フィルタシナリオが spec.md にない | ✅ manager・finance・admin それぞれのシナリオ追加済み |

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | MEDIUM | 実装ガイダンス不足（セキュリティ関連） | tasks.md (T-08) | `deactivateDelegationAction` の所有者確認について「委任レコードの取得が必要」と明記されているが、取得手段が未指定。`approvalDelegationRepository` に `findById` メソッドが存在せず、`deactivateDelegation` ユースケースも事前チェックを含まない。実装者がリポジトリをアクション層から直接呼ぶ（レイヤー違反）か、所有者確認を省略するリスクがある。現行コードを確認したところ `listDelegations` ユースケースは組織全体の委任を返すため、`delegationId` でフィルタする回避策は存在するが spec に明記されていない | T-08 に「`listDelegations` の結果から `delegationId` で対象レコードを特定して所有者を確認する」か「`getDelegation` ユースケースを新設して利用する」のいずれかを明記し、実装者が選択せずに済むようにする |
| 2 | LOW | 実装ガイダンス不足 | tasks.md (T-08) | `listDelegationsAction` の非 admin フィルタで「fromUserId でフィルタ」と記述されているが、`listDelegations` ユースケースは `organizationId` のみを引数に取る。ユースケース変更が必要なのか、アクション層で返却配列をフィルタするのかが明示されていない。誤ってユースケースにパラメータ追加を試みると不必要な変更が生じる | T-08 に「アクション層で `listDelegations` の返却配列を `delegation.fromUserId === session.user.id` でフィルタリングする（ユースケース変更不要）」を補足する |
| 3 | LOW | スペックカバレッジ | spec.md | `finance` ロールが `approvalSettings.listPolicies` を閲覧できないシナリオが spec.md に存在しない。`finance` の `listTemplates` 拒否シナリオは追加済みだが、`listPolicies`（ポリシー一覧）の拒否シナリオが欠けている | spec.md に「finance はポリシー一覧を閲覧できない — `canPerform("finance", "approvalSettings", "listPolicies")` が `false` を返す」シナリオを追加する（低優先度：T-01 の権限マトリクスで `listPolicies=admin+manager` として定義済みのためテスト漏れにとどまる） |

## セキュリティレビュー補足

OWASP Top 10 の観点で確認した主要ポイント：

- **A01 Broken Access Control**: 現行コードで確認された 30 箇所以上の不整合を仕様として正確に捕捉し、`canPerform` による一元化で修正する設計は妥当。deny-by-default（マトリクスに未定義の組み合わせは拒否）により新規操作追加時の権限漏れを防ぐ。
- **IDOR（委任）**: 前述 Finding 1 の通り、`deactivateDelegationAction` の所有者確認は IDOR 防止に直結する。spec の要件定義は正しく、実装ガイダンスの補完で対処可能。
- **引合の declined 遷移**: 現行コードに認可チェックがない `declined` 遷移への新規制限追加（T-06・D6）は、設計書との整合のために必要であり正しく仕様化されている。
- **商談記録**: `createMeetingAction` に現行認可チェックがない点を D7・T-11 で補足する設計は正しい（finance によるなりすまし的な商談記録作成を防ぐ）。
