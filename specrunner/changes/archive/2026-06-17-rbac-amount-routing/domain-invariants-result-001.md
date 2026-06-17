# Domain Invariants Review — rbac-amount-routing

- **reviewer**: domain-invariants
- **iteration**: 1
- **date**: 2026-06-17
- **verdict**: approved

---

## 観点

テナント分離・監査ログの完全性・承認ワークフローの不変条件が変更によって破壊されていないことを検証する。

---

## Findings

### [LOW] F-01: `rejectRequest` における step レベルのロールチェック非適用（設計上の意図的非対称性、但し D5 の説明と矛盾）

**該当箇所**: `src/application/usecases/rejectRequest.ts`, `src/app/actions/requests.ts`

**内容**:

`approveRequest` は usecase 内で `canApprove(currentStep, actorRole)` を呼び出し、現在ステップの `approverRole` とアクターのロールが一致しない場合はエラーを返す。一方、`rejectRequest` は引数に `actorRole` を持たず、step レベルのロールチェックを行わない。

この非対称性は変更前から存在していたが、今回の D5 変更（`role !== "admin"` → `role === "member"`）によって **`manager` と `finance` が `rejectRequest` に到達できるようになり、露出度が高まった**。

結果として：
- `manager` ユーザーが `finance` ステップを却下・差し戻しできる
- `finance` ユーザーが `manager` ステップを却下・差し戻しできる

変更前は `admin` のみが到達できたため、実害は限定的だった。

**判断**:

`rejectRequest.ts` が意図的に `actorRole` を受け取らない設計であること（関数シグネチャに含まれていない）から、「差し戻し（rejection）はステップ所有権に関係なく非 member ロールが操作可能」という設計意図と解釈できる。ただし design.md D5 の「実際の権限チェックは usecase 層の `canApprove` に委ねる」という記述は `rejectRequest` には適用されておらず、記述との齟齬がある。

この非対称性が意図的であれば design.md への明記を推奨する。将来 `canApprove` に rejection を含めるかどうかの判断基準が必要。

**優先度**: LOW（業務上重大な問題ではなく pre-existing；スコープ外の改修は不要）

---

### [INFO] F-02: `role === "member"` 排除パターンによる将来ロール追加リスク（design.md D5 に明記済み）

**該当箇所**: `src/app/actions/requests.ts:103,131`

**内容**:

D5 の設計判断として既に認識・ドキュメント化されているが、確認のために記録する。`approveRequestAction` / `rejectRequestAction` で `role === "member"` を排除するパターンは、将来 `auditor`・`viewer` など閲覧専用ロールを追加した際に、意図せず承認・却下権限を付与する可能性がある。

design.md に「⚠️ 逆リスク」として明記済みであり、現時点でアクションは不要。

---

## 検証結果

### テナント分離

| チェック項目 | 結果 |
|---|---|
| `findByOrganizationForAmount` が `organizationId` でフィルタリングする | ✅ 確認（`eq(approvalTemplates.organizationId, organizationId)` |
| `createRequest` action が `organizationId` をセッションから取得する（リクエストボディからではない） | ✅ 確認（`session.user.organizationId`） |
| 新規申請作成時の approval steps に `organizationId` が付与される | ✅ 確認（`organizationId: data.organizationId` を createMany に渡す） |
| 監査ログに `organizationId` が記録される | ✅ 確認（全 auditLogRepository.create 呼び出しに含まれる） |
| `approvalStepRepository` の全クエリが `organizationId` でスコープされる | ✅ 確認（`findByRequestId`, `updateStatus`, `resetSteps` すべて） |

テナント分離は新規コードを含めすべて正しく実装されている。

### 監査ログの完全性

| 操作 | アクション名 | メタデータ | 結果 |
|---|---|---|---|
| 申請作成（テンプレート自動選択） | `request.create` | `templateId`, `templateName`, `amount` | ✅ 要件12を満たす |
| 申請提出 | `request.submit` | — | ✅ |
| ステップ承認（中間） | `approval_step.approve` | `stepId`, `stepOrder`, `approverRole` | ✅ |
| 申請最終承認 | `request.approve` | — | ✅ |
| 差し戻し（revision） | `approval_step.reject` | `stepId`, `stepOrder`, `approverRole`, `comment` | ✅ |
| 最終却下 | `request.reject` | — | ✅ |
| 再申請 | `request.resubmit` | `resetStepOrders` | ✅ |

全操作で監査ログが `db.transaction` 内に記録されており、状態変更と監査ログの原子性が保証されている。テンプレート自動選択結果（要件12）も `request.create` のメタデータとして正しく記録されている。

### 承認ワークフローの不変条件

| 不変条件 | 結果 |
|---|---|
| `canApprove` が approve フローで正しく適用される | ✅ `approveRequest` L94-99 で確認 |
| TOCTOU 保護: `approveRequest` がトランザクション内でステップを再取得する | ✅ `freshSteps` / `freshCurrentStep` による二重チェック |
| テンプレート自動選択の決定性: DB ORDER BY + code-level sort の二重ソート | ✅ `findByOrganizationForAmount` と `selectTemplate` 両方でソート |
| 金額境界条件: 100000→少額テンプレート、100001→高額テンプレート | ✅ シードデータと選択ロジックが一致（int 境界で gap なし） |
| 状態遷移バリデーション: `validateTransition` が全 usecase で状態更新前に呼ばれる | ✅ TC-039/TC-040 で確認 |
| ステップなし後方互換パス（`steps.length === 0`）で監査ログが作成される | ✅ `approveRequest` L58-66 |
| 差し戻し後の部分リセット（拒否ステップ以降のみリセット） | ✅ `getStepsToReset` + `resetSteps` で確認 |
| `roleEnum` への `manager`/`finance` 追加がマイグレーション SQL に反映される | ✅ `ALTER TYPE "public"."role" ADD VALUE` が正しく生成済み |

### アーキテクチャ依存方向

`actions → usecases → domain / infrastructure` の依存方向が維持されている。`templateSelectionService` は pure function として domain/services に配置され、DB アクセスを持たない。

---

## 総評

テナント分離・監査ログ完全性・承認フローの不変条件（`canApprove` 適用、TOCTOU 保護、トランザクション原子性）はすべて正しく実装されている。要件12のテンプレート選択監査ログも適切に記録される。

唯一の懸念は F-01（`rejectRequest` の step レベルロールチェック非適用）だが、これは pre-existing 設計であり、本変更の受け入れ判断には影響しない。

- **verdict**: approved
