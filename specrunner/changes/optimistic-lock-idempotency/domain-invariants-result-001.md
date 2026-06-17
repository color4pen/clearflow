# Domain-Invariants Review Result — optimistic-lock-idempotency — iter 1

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:    no violations of domain invariants; safe to merge
  - needs-fix:   one or more invariant violations that must be corrected
  - escalation:  unresolvable conflict or ambiguity requiring human judgment
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | File | Description | How to Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
-->

- **verdict**: needs-fix

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | HIGH | 状態機械不変条件の破壊 | `src/application/usecases/approveRequest.ts` | **マルチステップ承認パスの最終 request 更新が `freshRequest.version`（トランザクション内再取得）を使用しているため、状態遷移チェックをバイパスできる。** `validateTransition` は `existing.status`（トランザクション外）で実行されるが、最終 UPDATE の楽観的ロックトークンは `freshRequest.version`（トランザクション内再取得）を使う。並行 `rejectRequest` がコミットした後（request が "rejected" / version 2 になった後）に本 transaction が開始した場合、`freshRequest.version = 2` を使った UPDATE が成功し、`rejected → approved` という無効な状態遷移が発生する。他の全 usecase（no-steps パス・submitRequest・rejectRequest・resubmitRequest）は `existing.version`（外側の取得値）を使用しており、このパスだけが例外である。spec-review-result-001.md finding #1 で MEDIUM として設計上の不整合が指摘されていたが、実装はその修正指示に従わなかった。ドメイン影響: 端末状態（rejected）から active 状態（approved）への遷移を招き、監査証跡と業務フローの整合性が損なわれる。 | マルチステップ最終 request 更新も `existing.version`（トランザクション開始前の取得値）に統一する。`requestRepository.findById(id, orgId, tx)` による内部再取得と `freshRequest.version` の使用を削除し、`existing.version` を渡す。`findById` の `tx` 対応（T-11）は `approvalStepRepository.findByRequestId` で活用されているため残してよい。 |
| 2 | HIGH | 承認ロール認可不変条件の破壊 | `src/application/usecases/approveRequest.ts` | **マルチステップ承認パスのロール検証は outer snapshot で 1 回のみ実施され、トランザクション内の `freshCurrentStep` に対して再検証されない。** 外側 `getCurrentStep(steps)` が返す `currentStep`（例: Step 1 / role="admin"）に対して `canApprove` が通過した後、Step 1 が別トランザクションで承認されると、内側 `getCurrentStep(freshSteps)` は Step 2（role="manager"）を返す。コードは `freshCurrentStep.id` を使って Step 2 を承認するが、"admin" ユーザーに manager ロールが必要な Step 2 を承認させてよいかの検証がない。コード中のコメントには "non-security-critical fast-fail" と注記されているが、このパターンは承認ステップのロール制約という業務不変条件を実質的に破壊する。 | `approvalStepRepository.updateStatus` 呼び出しの直前に `if (!canApprove(freshCurrentStep, data.actorRole)) { throw new Error(\`Unauthorized: role "${data.actorRole}" cannot approve this step (requires "${freshCurrentStep.approverRole}")\`); }` をトランザクション内に追加する。 |
| 3 | MEDIUM | テナント分離（冪等性保証の干渉） | `src/infrastructure/schema.ts` / `src/infrastructure/repositories/idempotencyKeyRepository.ts` | **`idempotency_keys.key` のユニーク制約がグローバルスコープ（`key` 単体）であり、`(key, organizationId)` の複合制約ではない。** spec-review-result-001.md finding #2 で設計段階から指摘されていたが未修正のまま実装が完了した。実装は `isUniqueConstraintError` ハンドリング（23505 エラーの swallow）を追加したが、これはクロステナント衝突シナリオの本質的な問題を解決しない。シナリオ: Org A が key="abc-xyz" を保存 → Org B が同じ key を INSERT しようとする → unique constraint 違反 (23505) → swallow → Org B 側の `findByKey("abc-xyz", orgBId)` は null を返し続ける → Org B は同じ key でも毎回 usecase を実行する（冪等性保証が機能しない）。UUID v4 の自然衝突確率は約 5×10⁻³⁷ であり実害は極めて低いが、テナント間で冪等性の保証が構造的に相互干渉しうる設計は tenant isolation の不変条件に反する。 | `key` の単体 unique 制約を `(key, organizationId)` の複合ユニーク制約に変更する（Drizzle: `uniqueIndex("idempotency_keys_key_org_idx").on(idempotencyKeys.key, idempotencyKeys.organizationId)`）。並行 INSERT 競合ハンドリング（23505 swallow）はそのまま活用できる。 |

## Review Summary

### テナント分離

`requestRepository`・`approvalStepRepository`・`idempotencyKeyRepository` の全クエリが `organizationId` を WHERE 条件に含めており、テナント間データ漏洩は発生しない。`idempotencyKeyRepository.findByKey` も `(key, organizationId)` で検索している。Finding #3 のグローバル unique 制約は冪等性保証のクロステナント干渉（データ漏洩ではなく機能干渉）であり、実データの混入は起こらない。

### 監査ログの完全性

全ての状態変更（submit / approve / reject / revision / resubmit）において、対応する audit log 生成が同一トランザクション内に含まれており、状態変更と監査ログが原子的に保証されている。楽観的ロック競合時（`null` 返却 → `throw`）にはトランザクションがロールバックされ、audit log の半端な記録は残らない。

### 冪等性キーと認可の順序

全 Server Action において `auth()` による認証・ロール検証が冪等性チェックより先に実行されており、未認証ユーザーや member ロールのユーザーがキャッシュ済みレスポンスを返されることはない。

### ブロッキング所見

**Finding #1**（状態機械バイパス）と **Finding #2**（ロール認可バイパス）はいずれも承認ワークフローの中核不変条件を破壊する。両所見とも `approveRequest` マルチステップパスの `freshCurrentStep`/`freshRequest` 使用パターンに起因しており、同一箇所の修正で解消可能。他の usecase（rejectRequest・submitRequest・resubmitRequest）は `existing.version`（外側取得値）を正しく使用しており問題ない。
