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
| 1 | HIGH | Catalog completeness | `tasks.md` T-01 / `design.md` | `deal_contact.create` と `deal_contact.delete` がカタログから欠落している。実コードを走査した結果、`addDealContact.ts:30` が `action: "deal_contact.create"`、`removeDealContact.ts:25` が `action: "deal_contact.delete"` を記録しており、`activityLabels.ts` も両キーのラベルを定義している。T-01 の AuditAction リストに含まれていないため、T-03 の型制約を適用すると addDealContact / removeDealContact でコンパイルエラーが発生し、T-04 の `Partial<Record<AuditAction, string>>` 適用後は activityLabels.ts の deal_contact.* エントリもコンパイルエラーになる。T-06 の typecheck は必ず失敗する。 | T-01 の `AuditAction` 一覧に `"deal_contact.create"` / `"deal_contact.delete"` を追加し、カウントを「46 種」→「48 種」に修正する。T-01 の受け入れ基準の「46 種」も「48 種」に修正する。design.md の「46 種」と deal.\* 列挙にも `deal_contact.*` を追加し 48 種に修正する。request.md の「実コード上の action は全 46 種」も 48 種に修正する。 |
| 2 | LOW | Spec precision | `spec.md` > 「記録される文字列値と記録挙動は不変」Requirement | "既存のテストスイートを実行する / 全テストが変更なしで green になる" は挙動の仕様ではなく確認手順の記述であり、spec.md の Scenario として不適切。spec は実装後のシステムの振る舞いを Given/When/Then で記述すべきで、「テストが green」はテスト手順であってシステムの Layer-1 振る舞いではない。 | Scenario を「`auditLogRepository.create` を呼ぶと `audit_logs` テーブルに指定した action / targetType の文字列が INSERT される」のような振る舞い形式に書き換えるか、または「既存テスト green」を受け入れ基準（tasks.md T-06）の確認手順として残し、spec.md からは削除する。致命的ではないため修正は任意。 |

## 検証サマリー

### アクション語彙の実地走査

実コードから全 `auditLogRepository.create` 呼び出しの `action` 値を網羅的にグレップし、T-01 カタログとの突き合わせを行った。

**T-01 カタログに存在するが実コードで確認できたもの (46 → 検証済)**

| プレフィックス | 実コード確認済み action |
|---|---|
| deal.* | create / update / updatePhase / delete |
| contract.* | create / update / updateStatus / delete |
| invoice.* | create / update / update_status |
| meeting.* | create / update |
| action_item.* | create / update / delete / toggle |
| inquiry.* | create / update / updateStatus / conversionPending / delete |
| request.* | create / approve / reject / resubmit / expire / submit（handler） |
| approval_step.* | approve / reject |
| delegation.* | create / deactivate |
| policy.* | create / update / activate / deactivate（togglePolicy.ts で条件分岐）|
| template.* | create / update / delete |
| revenue_target.* | create / update / delete |
| client.* | create |
| client_contact.* | create / delete |
| user.* | updateRole |

**実コードに存在するが T-01 カタログに欠落しているもの（Finding #1）**

| action | 記録箇所 | activityLabels.ts のラベル |
|---|---|---|
| `deal_contact.create` | `addDealContact.ts:30` | `"担当者を追加"` |
| `deal_contact.delete` | `removeDealContact.ts:25` | `"担当者を削除"` |

`deal_contact` は `AuditTargetType` の 15 種リストには正しく含まれているが、action 側が漏れている。

### spec.md の妥当性確認

| Requirement | 判定 | 備考 |
|---|---|---|
| activityLabels ラベル表キーの型制約 | ✅ 実装可能（Finding #1 修正後） | deal_contact.* 欠落が修正されれば問題なし |
| getActionLabel が string 型 action を受け付ける | ✅ 適切 | D3 の方針と一致。フォールバックテストも green |
| action_item.toggle の metadata 型定義 | ✅ 実装可能 | AuditMetadataMap["action_item.toggle"] = { done: boolean } |
| 挙動不変 | ✅ 型制約はコンパイル時のみ | Finding #2 は soft（spec の記法の問題） |

### セキュリティ確認

- 本変更は型制約の追加のみであり、ランタイム挙動・認証・認可・DB スキーマに影響しない
- `auditLogRepository.create` の書き込みパスに型制約を設けることで、任意文字列の監査ログへの混入をコンパイル時に防止できる（セキュリティ観点では改善）
- OWASP Top 10 の観点で新たな攻撃面は導入されない
- `getActionLabel` の引数を `string` のまま維持する設計（D3）は、DB 読み取り側に型キャストを強いることを回避しており妥当

### tasks.md の実装可能性確認

T-01〜T-06 のタスク構成は合理的。Finding #1 を修正し `deal_contact.*` 2 件をカタログに追加すれば、T-03 typecheck (T-06) は通過可能になる。T-05 の静的テストは既存の `projectStructure.test.ts` の `readSrc` ヘルパーパターンと整合しており実装上の問題なし。
