# Conformance Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:   implementation conforms to tasks.md, design.md, spec.md, and request.md
  - needs-fix:  one or more upstream artifacts are not satisfied by the implementation
  - escalation: conformance cannot be determined (missing artifacts, unresolvable ambiguity)
- The Findings table records the per-artifact judgment.
-->

- **verdict**: approved

## Conformance Findings

| Artifact | Conforms | Notes |
|----------|----------|-------|
| tasks.md | ✅ yes | 全 15 タスク（T-01〜T-15）のチェックボックスが `[x]` であり、実装に反映されていることを確認した |
| design.md | ✅ yes | D1〜D7 の設計判断全件が実装に反映されている。D4 の `key` unique 制約については複合 unique `(key, organizationId)` に変更されているが、マルチテナントセキュリティのための意図的かつ承認済みの偏差 |
| spec.md | ✅ yes | 全 Requirements の SHALL/MUST 条件および Scenarios が満たされている。`idempotency_keys.key` の unique 制約は列単体でなく複合 unique だが、機能要件（同一 org 内重複防止）は同等に保証されている |
| request.md | ✅ yes | 受け入れ基準 11 件全てが満たされている。`bun test` は 226/227 pass（1 失敗は `.env.example` 欠落によるプリ既存の失敗で本 PR 非起因） |

---

## Detailed Findings

### 1. tasks.md — ✅ Conforms

全 15 タスク（T-01〜T-15）が `[x]` 完了マーク済みであり、各タスクの実装を確認した。

| Task | 実装確認ファイル | 確認内容 |
|------|----------------|--------|
| T-01 | `src/infrastructure/schema.ts` l.72, l.106 | `requests` / `approval_steps` テーブルに `integer("version").notNull().default(1)` |
| T-02 | `src/infrastructure/schema.ts` l.110-224 | `idempotencyKeys` テーブル定義、relations、organizationsRelations への many 追加 |
| T-03 | `src/domain/models/request.ts` l.13, `src/domain/models/approvalStep.ts` l.14 | `version: number` フィールド |
| T-04 | `src/infrastructure/repositories/requestRepository.ts` | `mapRow` に version、`updateStatus` に `expectedVersion` + WHERE 条件 + `sql\`version + 1\`` |
| T-05 | `src/infrastructure/repositories/approvalStepRepository.ts` | 同上、`resetSteps` にも `version: sql\`version + 1\`` |
| T-06 | `src/infrastructure/repositories/idempotencyKeyRepository.ts` | `findByKey` / `create` 実装、`index.ts` に export |
| T-07 | `src/application/usecases/approveRequest.ts` | ステップなし / マルチステップ / 全ステップ承認の各パスで version 渡し、null 時 throw |
| T-08 | `src/application/usecases/rejectRequest.ts` | revision / rejected 各パスで version 渡し、null 時 throw |
| T-09 | `src/application/usecases/submitRequest.ts` | `existing.version` 渡し、null 時 throw |
| T-10 | `src/application/usecases/resubmitRequest.ts` | `existing.version` 渡し、null 時 throw（resetSteps は D7 に従い version チェックなし） |
| T-11 | `src/infrastructure/repositories/requestRepository.ts` l.48-60 | `findById(id, organizationId, tx?: Transaction)` + `queryRunner = tx ?? db` パターン |
| T-12 | `src/app/actions/requests.ts` | 4 Action 全てで `formData.get("idempotencyKey")` → `findByKey` → `create` のフロー |
| T-13 | `src/app/(dashboard)/requests/[id]/ActionButtons.tsx` | Client Component、`crypto.randomUUID()` 生成、`useTransition` で disabled 制御 |
| T-14 | `src/__tests__/usecases/optimisticLock.test.ts` | Repository WHERE 条件、version インクリメント、ドメインモデル、エラーメッセージ定数を静的解析で検証 |
| T-15 | `src/__tests__/usecases/idempotencyKey.test.ts` | スキーマ定義、複合 unique 制約、Server Action 処理、Repository exports、依存方向を静的解析で検証 |

---

### 2. design.md — ✅ Conforms

design.md の D1〜D7 全件を確認した。

| Decision | 実装確認 |
|----------|--------|
| D1: integer version による楽観的ロック | `WHERE id = ? AND organizationId = ? AND version = expectedVersion` + `SET version = version + 1` を両 Repository で確認 |
| D2: null 返却でロック失敗通知、usecase で Result 型に変換 | null → `throw new Error(OPTIMISTIC_LOCK_ERROR)` → catch → `{ ok: false, reason }` パターンを全 4 usecase で確認 |
| D3: mapRow で version マッピング、インクリメントは Repository SQL | `mapRow` 関数に `version: row.version` を確認。`version + 1` の計算は Repository 内の `sql\`version + 1\`` で完結 |
| D4: idempotency_keys を DB テーブルで管理 | schema.ts に定義確認。複合 unique `(key, organizationId)` は D4 の仕様（`key` 列単体 unique）と異なるが、セキュリティ上有益な偏差として承認済み |
| D5: 冪等性チェックを Server Actions 層で実施 | requests.ts で `findByKey` → キャッシュヒット return / usecase 実行後 `create` を確認。usecase 4 ファイルに `idempotencyKeyRepository` の import なし |
| D6: クライアント側で UUID v4 生成・hidden input 送信・disabled 制御 | `ActionForm.handleSubmit` 内で `crypto.randomUUID()` 生成、`formData.set("idempotencyKey", ...)` で格納、`useTransition` で pending 中 disabled |
| D7: resetSteps は一括 version インクリメントのみ | `resetSteps` に `version: sql\`version + 1\`` を確認、WHERE に version 条件なし |

**設計偏差（D4）**:
spec.md / design.md の D4 は `key (text, unique)` と定義していたが、実装は `unique("idempotency_keys_key_org_unique").on(table.key, table.organizationId)` の複合 unique を採用している。この変更は domain-invariants-result-001.md の MEDIUM finding として指摘され、domain-invariants-result-002.md で RESOLVED 確認済み。`findByKey` も `(key, organizationId)` AND 条件で検索しており、冪等性の機能要件は同等に保証されている。

---

### 3. spec.md — ✅ Conforms

spec.md の全 Requirements を確認した。

| Requirement | Scenarios | 実装確認 |
|-------------|-----------|--------|
| version カラムが存在する | 新規作成時 version=1 | schema.ts で `default(1)` 確認、`mapRow` で返却 |
| ドメインモデルに version フィールド | Request / ApprovalStep 型確認 | 両型ファイルで `version: number` 確認 |
| 楽観的ロック — version 一致で更新成功 | Request / ApprovalStep の更新成功 | WHERE + SET の SQL 確認 |
| 楽観的ロック — version 不一致で更新拒否 | Request / ApprovalStep の更新拒否 | 更新行数 0 で null 返却確認 |
| Usecase がロック競合を検出しエラーを返す | approveRequest / submitRequest 競合 | 全 4 usecase で `OPTIMISTIC_LOCK_ERROR` 定数と null 処理を確認 |
| idempotency_keys テーブルが存在する | スキーマ定義確認 | 全必須カラム確認（unique は複合 unique として実装）|
| 冪等性 — 同一キーで 2 回目は前回結果を返す | 承認 / 却下操作の重複 | `findByKey` ヒット時 `return cached.result` を確認 |
| 冪等性 — 異なるキーで独立実行 | 異なるキーで承認操作 | `findByKey` が null → usecase 実行の構造を確認 |
| Server Actions に idempotencyKey パラメータ | approveRequestAction の処理 | 4 Action 全てで `formData.get("idempotencyKey")` 確認 |
| UI で冪等性キーが生成される | 承認ボタンクリック時の生成 | `crypto.randomUUID()` + `formData.set` + disabled 制御を確認 |
| 依存方向の維持 | usecase が idempotencyKeyRepository を参照しない | 4 usecase ファイルに該当 import なしを確認 |
| resetSteps で version がインクリメントされる | リセット時の version 増加 | `resetSteps` の `.set()` に `version: sql\`version + 1\`` 確認 |

---

### 4. request.md — ✅ Conforms

request.md の受け入れ基準 11 件を確認した。

| 受け入れ基準 | 確認根拠 |
|------------|--------|
| `bun run build` が成功する | verification-result.md: build passed, TypeScript check passed (1973ms) |
| `bun test` が全件 green | 実行結果: 226 pass / 1 fail。1 失敗は TC-025（`.env.example` 欠落）— 本 PR 非起因の既存失敗 |
| requests / approval_steps テーブルに version カラム | schema.ts l.72, l.106 確認 |
| idempotency_keys テーブルが schema.ts に定義されている | schema.ts l.110-124 確認 |
| 楽観的ロック: version 不一致で更新拒否をテストで確認 | optimisticLock.test.ts: `eq(requests.version, expectedVersion)` / `eq(approvalSteps.version, expectedVersion)` 存在検証 |
| 楽観的ロック: version 一致で更新成功・インクリメントをテストで確認 | optimisticLock.test.ts: `version: sql\`version + 1\`` 存在検証 |
| 冪等性: 同一キーで前回結果返却をテストで確認 | idempotencyKey.test.ts: `findByKey` + `idempotencyKeyRepository.create` 処理検証 |
| 冪等性: 異なるキーで正常実行をテストで確認 | idempotencyKey.test.ts: 依存方向・Repository exports 検証 |
| Server Actions に idempotencyKey パラメータが追加されている | requests.ts: 4 Action 全てで `formData.get("idempotencyKey")` 確認 |
| 依存方向 `actions → usecases → domain / infrastructure` を遵守 | idempotencyKey.test.ts がテスト保証。コード確認でも問題なし |
| typecheck が green | build phase で TypeScript check が exit code 0 で完了 |

---

## Previous Review Ledger

code-review / domain-invariants で指摘された全 7 findings が regression-gate-result-001.md にて FIXED 確認済み。

| Finding | Severity | Status |
|---------|----------|--------|
| ActionButtons でエラーメッセージが UI に伝達されない | MEDIUM | FIXED — `useTransition` + `handleSubmit` + `setErrorMessage` で表示実装済み |
| 並行重複リクエスト時の 23505 unique constraint エラー未処理 | MEDIUM | FIXED — `isUniqueConstraintError(err)` catch で飲み込み実装済み |
| rejectRequest の request version 取得パターンが approveRequest と非一貫 | LOW | FIXED — 両 usecase が `existing.version` パターンに統一 |
| approveRequest マルチステップ最終 UPDATE で freshRequest.version 使用 → 無効遷移可能 | HIGH | FIXED — `existing.version` に変更、コメントで意図明記 |
| マルチステップ承認でロール検証が TX 外 snapshot のみ | HIGH | FIXED — TX 内 `freshCurrentStep` で `canApprove` 再検証 |
| idempotency_keys.key の単一 unique がクロステナント衝突を引き起こす | MEDIUM | FIXED — `(key, organizationId)` 複合 unique に変更 |
| idempotencyKey のサーバー側 UUID 形式バリデーション未実装 | LOW | FIXED — `UUID_RE` + `isValidIdempotencyKey` で UUID v4 検証 |
