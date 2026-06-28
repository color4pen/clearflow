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
| 1 | LOW | Spec coverage gap | spec.md | `approveRequestAction` のシナリオが admin / member の 2 ロールのみカバーしている。PERMISSION_MATRIX の `approval.approve` は `ADMIN_MANAGER_FINANCE` であり finance も許可されるが、approve に関する finance シナリオが無い。reject では finance シナリオが明示されているため、approve と非対称になっている。 | `approveRequestAction` に「finance が承認を実行できる」シナリオを 1 件追加することで、マトリクス全ロールの網羅性が揃う。blocking ではない。 |
| 2 | LOW | Spec concurrency boundary未定義 | spec.md, design.md | spec.md の「組織で最後の admin は降格できない」要件は `SHALL reject` と記述するが、`findByOrganization` によるカウントチェックはトランザクション外（設計 D5）に配置される設計のため、同時に 2 管理者が降格操作を実行した場合に両チェックが通過し 0-admin 状態になりうる。design.md Risk セクションはこれを認識し許容判断しているが、spec.md はその境界を明記していない。 | spec.md の当該 Requirement に「本ガードはトランザクション外の best-effort チェックであり、極低頻度の同時降格シナリオには保護を保証しない」旨の注記を追記することで実装者の判断基準が明確になる。blocking ではない。 |
| 3 | LOW | Test strategy — 静的解析のみ | tasks.md (T-06, T-07) | T-06 / T-07 はファイル読み取りによる静的コード解析でテストを行う（既存 roleCheck.test.ts パターンに準拠）。このアプローチは構造（import / 文字列の有無）は保証するが、canPerform の返り値が実際にアクションの返却値に反映されるかという実行時振る舞いを保証しない。セキュリティゲートの変更として振る舞いテストも補完できる。 | 任意改善。振る舞いテスト（usecase をモックして各ロールから action を呼び返却値を検証）を追加することで保証範囲が広がる。本変更スコープ内での必須要件ではない。 |

## Review Notes

### 仕様文書の整合性

**request.md ↔ spec.md**

- 要件 1（canPerform 統一）は `approveRequestAction` / `rejectRequestAction` / `bulkApproveAction` の 3 アクションすべてに対応するシナリオが存在する ✓
- 要件 2（最後の admin ガード）は「最後の 1 人を降格しようとすると拒否」「他に admin がいれば成功」「admin→admin は通過」の 3 シナリオで網羅 ✓
- 受け入れ基準の「既存の自己降格ガードが引き続き機能」にも対応シナリオがある ✓
- spec.md の返却メッセージ `"権限がありません"` は design.md D2 の判断（既存メッセージ維持）と一致 ✓
- spec.md の返却メッセージ `"組織に最低1人の管理者が必要です"` は tasks.md T-05 の記述と一致 ✓

**design.md ↔ tasks.md**

- D1（canPerform 統一）→ T-01〜T-04 の対応が明確 ✓
- D3（ガードは usecase 層）→ T-05 でも usecase への追加として実装 ✓
- D5（ガード順序：自己降格 → ユーザー存在確認 → 最後の admin → トランザクション）→ T-05 の Acceptance Criteria に明示 ✓
- D4（findByOrganization 利用）→ T-05 で既存メソッドを利用する記述と一致 ✓

### セキュリティ評価（OWASP Top 10 観点）

**A01 - Broken Access Control**

- `session.user.role === "member"` インライン判定から `canPerform` 中央マトリクスへの移行は access control の一元管理を強化する変更であり、回帰リスクなし。
- canPerform は deny-by-default（マトリクス未定義の組み合わせは false）であり、明示的許可リストの設計が正しく維持される。
- 最後の admin ガードは権限剥奪による管理者ロックアウトを防ぐ可用性・アクセス管理の改善。

**A04 - Insecure Design**

- 認可ルールをドメイン層に一元集約するアーキテクチャ判断は適切。`delegations.ts` で既に実績のある同じパターンへの統一。
- usecase 層での last-admin ガード配置は依存方向（actions → usecases → domain / repositories）に準拠し、canPerform の純粋関数性も保持する。

**その他**

- 新しい入力値処理・DB クエリ・外部 API 呼び出しはなく、注入系（A03）・設定誤り（A05）・シリアライズ（A08）の該当なし。

### 現行コード検証

- `requests.ts:216 / :286 / :322` のインライン `session.user.role === "member"` 判定を実コードで確認。仕様記載の前提と一致 ✓
- `authorization.ts:96-97` の `approval.approve = ADMIN_MANAGER_FINANCE` / `approval.reject = ADMIN_MANAGER_FINANCE` を確認。置き換え後の振る舞いが等価 ✓
- `updateUserRole.ts` の自己降格ガード（L20）は存在し、last-admin ガードは未実装。要件の前提と一致 ✓
- `userRepository.findByOrganization(organizationId)` が `User[]`（role フィールド含む）を返すことを確認。usecase からの利用に問題なし ✓

### 総評

spec.md は normative keyword（SHALL / MUST）を含む必須形式を満たしており、各 Requirement に 2〜3 件の Given/When/Then シナリオを備える。design.md の設計判断（D1〜D5）は request.md の architect 評価と整合し、tasks.md はファイル・関数粒度で実装手順を具体化している。ブロッキングとなる仕様欠陥・矛盾・不整合は検出されなかった。
