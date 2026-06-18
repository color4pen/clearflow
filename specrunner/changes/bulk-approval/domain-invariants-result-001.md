# Domain Invariants Review — bulk-approval — iter 001

- **verdict**: approved
- **iteration**: 001
- **reviewer**: domain-invariants
- **purpose**: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。

---

## Findings

| # | Severity | Category | File | Description | Recommendation |
|---|----------|----------|------|-------------|----------------|
| 1 | low | idempotency | `src/app/actions/requests.ts` | `bulkApproveAction` に冪等性キーが実装されていない。既存の `approveRequestAction` は `idempotencyKeyRepository` を使用してネットワーク再送・二重サブミットを防止しているが、`bulkApproveAction` には同機構がない。ただし、`approveRequest` 内部の `validateTransition`（pending 以外の申請を即座に `{ ok: false }` で返す）と楽観的ロック（version 不一致で UPDATE が 0 件となる）により、実際の二重承認は防止される。UI 側も `useTransition` で pending 中のボタンを disabled にしている。多段階承認でも同一ステップを 2 回 approve しようとすると optimistic lock でブロックされる。 | 実害を生じる二重承認リスクは既存の不変条件で排除されており、ブロッカーではない。将来的に 20 件一括のネットワーク信頼性要件が強まった場合にのみ対応を検討する。 |
| 2 | low | input-validation | `src/app/actions/requests.ts` | `bulkApproveSchema = z.array(z.string())` は各 requestId の UUID 形式を検証しない（`z.string().uuid()` ではない）。任意の文字列が `approveRequest` に渡されうるが、Drizzle ORM のパラメータ化クエリにより SQL インジェクションリスクはなく、DB で該当レコードが見つからない場合は `{ ok: false, reason: "Request not found." }` がパーシャルサクセスとして返る。既存の `approveRequestAction` も同様の検証のみ実施しており、パターンとして一貫している。 | 既存 Action と同水準。UUID バリデーション強化は全 Action 横断で検討するべきものであり、本 PR のスコープではない。 |
| 3 | info | defense-in-depth | `src/application/usecases/bulkApprove.ts` | `bulkApprove` のループは `approveRequest` が例外をスローした場合に中断する。ただし `approveRequest` は全体が try-catch で包まれており、例外を `{ ok: false, reason }` に変換して返すため、ループが中断するシナリオは実用上発生しない。 | 情報提供のみ。構造的に安全。 |

---

## 不変条件チェック詳細

### 1. テナント分離 (Tenant Isolation)

**結果: ✅ 維持**

`bulkApproveAction` は `organizationId` をセッション (`session.user.organizationId`) から取得し、ユーザー入力には依存しない（TC-009 パターンと一致）。この `organizationId` が `bulkApprove` usecase → `approveRequest` → `requestRepository.findById(requestId, organizationId)` まで連鎖して渡される。

`requestRepository.findById` は `and(eq(requests.id, id), eq(requests.organizationId, organizationId))` で両条件を AND 結合する。別テナントの `requestId` を送信しても `{ ok: false, reason: "Request not found." }` が返りパーシャルサクセスとして安全に処理される。`updateStatus` も `and(eq(requests.id, id), eq(requests.organizationId, organizationId), eq(requests.version, expectedVersion))` でテナント境界を保持する。

クロステナントの申請が誤って承認されるルートは存在しない。

---

### 2. 監査ログの完全性 (Audit Log Completeness)

**結果: ✅ 維持**

各申請の承認は `approveRequest` usecase の `db.transaction` ブロック内で `auditLogRepository.create` を呼び出す。監査ログ書き込みは状態更新と同一トランザクション内に置かれており、原子性が保証されている。

`bulkApprove` は `approveRequest` を順次呼び出すため、各申請に対して監査ログが個別に（かつトランザクション保護されて）記録される。`bulkApprove` 自体は監査ログを追加しない設計であり、これは仕様通り（要件 6「既存の approveRequest が記録するため追加実装不要」）。

監査ログが記録されずに承認が完了するルートは存在しない。

---

### 3. 状態遷移不変条件 (State Transition Invariants)

**結果: ✅ 維持**

`approveRequest` は `validateTransition(existing.status, "approved")` を呼び出してから `updateStatus` を実行する。`VALID_TRANSITIONS` において `pending → approved` のみが許可されており、`draft`・`approved`・`rejected`・`revision`・`expired` の申請に対する承認試行はすべて `{ ok: false, reason }` となり、`bulkApprove` のパーシャルサクセスとして結果に記録される。

無効な状態遷移が DB に書き込まれるルートは存在しない。

---

### 4. 楽観的ロック (Optimistic Locking)

**結果: ✅ 維持**

`approveRequest` は `requestRepository.updateStatus(..., existing.version, tx)` に楽観的ロックトークンを渡す。UPDATE WHERE version = expectedVersion が 0 件の場合は `throw new Error(OPTIMISTIC_LOCK_ERROR)` となり、try-catch が `{ ok: false, reason: OPTIMISTIC_LOCK_ERROR }` を返す。これが `bulkApprove` のパーシャルサクセスとして記録される。

多段階承認においても、`approvalStepRepository.updateStatus(…, freshCurrentStep.version, tx)` で各ステップの楽観的ロックが保護される。並列リクエストによる競合状態はロールバック + `{ ok: false }` 返却で安全に処理される。

---

### 5. 役割認可 (Role Authorization)

**結果: ✅ 二層防御**

- **Layer 1 (Action)**: `bulkApproveAction` は `session.user.role === "member"` チェックを `auth()` 直後に実施し、usecase 呼び出し前に弾く。
- **Layer 2 (Usecase)**: 多段階承認フローにおいて `approveRequest` は `canApproveWithDelegation(currentStep, data.actorRole, delegations)` でステップ要件ロールとの照合を行い、TX 内で再検証する（TOCTOU 防止）。

admin / manager / finance が `bulkApprove` を呼んでも、ステップが特定ロールを要求する場合は usecase 層でブロックされ、パーシャルサクセスとして記録される。

---

### 6. Webhook 配信の完全性

**結果: ✅ 維持**

`approveRequest` 内で `void deliverWebhookEvent(...)` が呼び出される。`bulkApprove` が各 `approveRequest` を順次呼び出すため、各申請に対して `request.approved` / `step.approved` が個別に配信される。仕様通り（要件 7）。

---

### 7. アーキテクチャ依存方向

**結果: ✅ 遵守**

`bulkApprove.ts` は `@/application/usecases/approveRequest` のみを import しており、`@/app/actions` への逆依存は存在しない。`actions → usecases → domain / infrastructure` の依存方向を維持している。

---

## 総合評価

**すべての主要な不変条件が維持されている。**

`bulkApprove` が既存の `approveRequest` を呼び出す設計（D1）により、テナント分離・監査ログ・状態遷移・楽観的ロック・役割認可・Webhook 配信のすべての不変条件が自動的に適用される。パーシャルサクセス設計（D2）も、失敗した申請を `{ ok: false }` として記録するのみで不変条件を破壊しない。

指摘事項はいずれも low / info であり、ドメイン不変条件の破壊には該当しない。
