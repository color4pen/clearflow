# Domain-Invariants Review Result — optimistic-lock-idempotency — iter 2

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

- **verdict**: approved

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | LOW | 入力バリデーション（継続監視） | `src/app/actions/requests.ts` | `idempotencyKey` をサーバー側で UUID 形式検証せずに DB に書き込んでいる。spec-review-result-001.md finding #3 で指摘済みの事項が実装されていない。任意の非空文字列が `idempotency_keys.key` として保存される。スコープ内で明示的に要件化されていないため ブロッカーではないが、将来の攻撃面として認識すること。 | `idempotencyKey` に対して UUID v4 形式（RFC 4122 正規表現）かつ最大長 64 文字の Zod バリデーションを追加する。不正な形式の場合はキーなし（従来フロー）として扱うか `{ success: false, message: "Invalid idempotency key" }` を返す。 |

## Review Summary

### iter 1 指摘事項の解消確認

| iter 1 Finding | Severity | 解消状況 |
|---|---|---|
| #1: マルチステップ最終 request 更新が `freshRequest.version` を使用し状態遷移バイパス可能 | HIGH | **RESOLVED** — `existing.version`（トランザクション外取得値）を使用するよう変更済み（`approveRequest.ts` 行 187–194）。変更意図を説明するコメントも追加されており、設計意図が明確。 |
| #2: マルチステップ承認パスのロール検証がトランザクション内で再実行されない | HIGH | **RESOLVED** — `canApprove(freshCurrentStep, data.actorRole)` がトランザクション内（行 130–133）で再検証されている。外側の fast-fail チェックと内側の権限確定チェックの2段構成となっており、TOCTOU を正しく防止している。 |
| #3: `idempotency_keys.key` のユニーク制約がグローバルスコープでテナント間干渉が発生 | MEDIUM | **RESOLVED** — `unique("idempotency_keys_key_org_unique").on(table.key, table.organizationId)` の複合ユニーク制約に変更済み。制約変更の理由を記したコメントも schema.ts に追記されており、意図が明確。 |

### テナント分離

全リポジトリのクエリが `organizationId` を正しくスコープしている。

- `requestRepository.findById / findAllByOrganization / updateStatus` — WHERE に `organizationId` を含む ✓
- `approvalStepRepository.findByRequestId / updateStatus / resetSteps` — WHERE に `organizationId` を含む ✓
- `idempotencyKeyRepository.findByKey` — `(key, organizationId)` の AND 条件でクエリ ✓
- `idempotencyKeyRepository.create` — INSERT に `organizationId` を含む ✓
- `idempotencyKeys` テーブルの unique 制約は `(key, organizationId)` 複合制約 ✓（iter 1 finding #3 解消済み）

クロステナントのデータ漏洩経路は存在しない。

### 監査ログの完全性

全ての状態変更操作において、対応する audit log 生成が同一トランザクション内で原子的に保証されている。

| usecase | audit action | 原子性 |
|---|---|---|
| `submitRequest` | `request.submit` | 同一 TX ✓ |
| `approveRequest`（ステップなし） | `request.approve` | 同一 TX ✓ |
| `approveRequest`（ステップ承認） | `approval_step.approve` | 同一 TX ✓ |
| `approveRequest`（全ステップ承認） | `request.approve` | 同一 TX ✓ |
| `rejectRequest`（差し戻し） | `approval_step.reject` | 同一 TX ✓ |
| `rejectRequest`（却下） | `request.reject` | 同一 TX ✓ |
| `resubmitRequest` | `request.resubmit` | 同一 TX ✓ |

楽観的ロック競合時（`null` 返却 → `throw`）にはトランザクションがロールバックされ、半端な audit log は残らない。

### 承認ワークフローの状態機械不変条件

`validateTransition` が全 usecase で状態変更前に呼ばれており、無効な状態遷移は拒否される。楽観的ロック（`existing.version`）が `validateTransition` の TOCTOU 穴を DB レベルで閉じる構造となっている。

- `existing` を取得した後に並行操作がコミットし request の version が変化した場合、TX 内の `requestRepository.updateStatus(..., existing.version, tx)` は 0 行更新となり `null` を返す。これにより `throw new Error(OPTIMISTIC_LOCK_ERROR)` → TX ロールバックが発生し、無効な状態遷移が DB に書き込まれない ✓
- `approveRequest` マルチステップパスにおいて、ロール検証（`canApprove`）がトランザクション内で `freshCurrentStep`（TX 内の最新スナップショット）に対して再実行される ✓（iter 1 finding #2 解消済み）

### 冪等性キーと認可の順序

全 Server Action において `auth()` → ロールチェック（admin/manager のみ）→ 冪等性チェックの順序が守られており、未認証ユーザーや member ロールのユーザーがキャッシュ済みレスポンスを受け取ることはない ✓

### 全体評価

iter 1 で指摘した 2 件の HIGH finding（状態機械バイパス、ロール認可バイパス）および 1 件の MEDIUM finding（テナント分離の冪等性キー制約）が全て解消されている。iter 2 の実装は承認ワークフローの不変条件を正しく保護しており、ドメイン不変条件の観点からマージに支障はない。
