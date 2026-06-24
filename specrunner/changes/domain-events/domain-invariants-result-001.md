# Domain Invariants Review Result — domain-events — iter 1

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:    all invariants are preserved; change is safe to proceed
  - needs-fix:   one or more invariants are violated; must be corrected before proceeding
  - escalation:  ambiguity or conflict that requires human judgment
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | File | Description | How to Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
  - CRITICAL: data loss, security breach, cross-tenant leakage
  - HIGH:     invariant violated with concrete failure path; blocks approval
  - MEDIUM:   latent risk or correctness gap; recommended fix
  - LOW:      informational, data quality, minor improvement
-->

- **verdict**: approved

## Reviewer Purpose

テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | LOW | Data Quality | `src/application/usecases/rejectRequest.ts` | **差し戻しフロー（revision）で `step.rejected` イベントが currentStep の有無に関わらず常に発行される。** `currentStep` が null の場合（承認ステップが存在しない申請の差し戻し）、イベント payload の `metadata.stepId`, `metadata.stepOrder`, `metadata.approverRole` がすべて `undefined` になる。不変条件は破壊されないが、Webhook 受信側が null/undefined を期待していない場合に処理エラーが起きる可能性がある。 | `if (currentStep)` が成立する場合のみ `step.rejected` を dispatch するよう修正するか、`currentStep` が null のときに適切なデフォルト値（`null`）を明示的にセットする。今回のスコープ内での修正は任意（LOW のため）。 |
| 2 | LOW | Pre-existing | `src/application/usecases/updateContractStatus.ts` | **`contractRepository.update` が楽観的ロックバージョンを使用していない（変更前から存在するパターン）。** `updated` が null/falsy を返した場合でも、`dispatcher.dispatch()` は既にバッファにイベントを蓄積している。ただし `if (!updated) return { ok: false }` が `flushAsync()` より前に評価されるため、非同期ハンドラの実行は正しくスキップされ Webhook は配信されない。本変更の範囲外であり不変条件には影響しないが、将来的に同ハンドラを同期モードで登録した場合は挙動が変わる可能性がある。 | スコープ外。参考として: `contractRepository.update` に楽観的ロックを追加し、失敗時に例外を throw させることで `dispatch()` 自体に到達しない設計にすることが理想的だが、この変更リクエストの対象外。 |

## Invariant Verification

### テナント分離

| チェック項目 | 結果 | 根拠 |
|------------|------|------|
| 全 18 種のドメインイベントに `organizationId` が含まれる | ✅ | `BaseDomainEvent.organizationId` が必須フィールドとして定義され、全ユースケースで `data.organizationId` をセット |
| Webhook 配信が organizationId でスコープされている | ✅ | `deliverWebhookEvent` および `deliverDomainEventToEndpoints` の両経路で `findActiveByOrganizationAndEvent(organizationId, ...)` によりエンドポイントを絞り込む |
| リポジトリ呼び出しが organizationId でスコープされている | ✅ | 全ユースケースの全リポジトリ呼び出しに `data.organizationId` を引数として渡している（変更なし） |
| クロステナントイベント配信のリスクなし | ✅ | ディスパッチャー自体はイベントをルーティングしない。配信はハンドラ側で organizationId フィルタを適用している |

### 監査ログの完全性

| チェック項目 | 結果 | 根拠 |
|------------|------|------|
| 全ユースケースで監査ログ作成がトランザクション内に残っている | ✅ | `updateInquiryStatus`, `updateDealPhase`, `createContract`, `updateContractStatus`, `updateInvoiceStatus`, `createRequest`, `submitRequest`, `approveRequest`, `rejectRequest`, `resubmitRequest` の全 10 ユースケースで `auditLogRepository.create()` が `db.transaction()` コールバック内にある |
| 監査ログ作成が削除・省略されていない | ✅ | 各ファイルを確認。既存の監査ログ記録ロジックは一切変更されていない |
| イベント発行と監査ログが同一トランザクションに含まれる | ✅ | `dispatcher.dispatch()` も `db.transaction()` コールバック内で呼ばれており、監査ログと同一原子的単位に含まれる |

### 承認ワークフローの不変条件

| チェック項目 | 結果 | 根拠 |
|------------|------|------|
| TOCTOU 保護：ステップ情報をトランザクション内で再取得 | ✅ | `approveRequest` / `rejectRequest` の両方で `approvalStepRepository.findByRequestId(..., tx)` がトランザクション内で再実行されている（変更なし） |
| TOCTOU 保護：委任情報をトランザクション内で再取得 | ✅ | `approveRequest` の多段階フローで `approvalDelegationRepository.findActiveByToUserId(..., tx)` がトランザクション内で再実行されている（変更なし） |
| 期限チェックがトランザクション内で再実行される | ✅ | `approveRequest` / `rejectRequest` の両方で `isStepExpired(freshCurrentStep)` がトランザクション内で再チェックされている（変更なし） |
| 楽観的ロック：ステップ更新時にバージョン検証 | ✅ | `approvalStepRepository.updateStatus(..., freshCurrentStep.version, tx)` がトランザクション内で実行され、null リターン時に例外を throw してロールバック |
| 楽観的ロック：申請更新時にバージョン検証 | ✅ | `requestRepository.updateStatus(..., existing.version, tx)` がトランザクション内で実行され、null リターン時に例外を throw してロールバック |
| 状態遷移ルールが変更されていない | ✅ | `validateTransition`, `canTransition`, `canDealTransition`, `canContractTransition`, `validateInvoiceTransition` の呼び出しは全て変更前と同じ場所・同じ引数で維持されている |

### イベント配信と TC（トランザクション）境界の整合性

| チェック項目 | 結果 | 根拠 |
|------------|------|------|
| `dispatch()` が全ユースケースでトランザクション内から呼ばれている | ✅ | 全 10 ユースケースで `db.transaction(async (tx) => { ... dispatcher.dispatch(...); ... })` のパターンが守られている |
| `flushAsync()` がトランザクション成功後にのみ呼ばれている | ✅ | 全ユースケースで `flushAsync()` は `db.transaction()` の resolve 後かつ null/エラーチェック通過後に配置されている。catch ブロック内での呼び出しは存在しない |
| トランザクション失敗時にバッファが漏洩しない | ✅ | `AsyncLocalStorage` による `runInContext` スコープのバッファ分離が実装されている。スコープ終了時（成功・例外・null リターンのいずれでも）にバッファは自動破棄される |
| 並行リクエスト間でバッファが汚染されない | ✅ | `EventDispatcher` が `AsyncLocalStorage<DomainEvent[]>` を使用し、リクエストスコープごとに独立したバッファを管理する。シングルトンディスパッチャーでも `als.run([], callback)` により分離されている |
| 同期ハンドラ例外がトランザクションロールバックを引き起こす | ✅ | `dispatch()` 内の同期ハンドラ例外は呼び出し元（トランザクションコールバック）に伝播し、`db.transaction()` がロールバックされる設計になっている |

## Review Summary

本変更は **テナント分離・監査ログの完全性・承認ワークフローの不変条件のすべてを維持している**。

重要なポイントを以下に整理する:

**テナント分離**: 全ドメインイベントが `organizationId` を必須フィールドとして持ち、Webhook 配信の両経路（承認系: `deliverWebhookEvent`、新規ドメイン系: `deliverDomainEventToEndpoints`）ともに `organizationId` によるエンドポイント絞り込みを実施しているため、クロステナント配信は構造的に不可能。

**監査ログの完全性**: 全 10 ユースケースで `auditLogRepository.create()` はドメインイベントの `dispatch()` と同一トランザクション内にある。監査ログの記録タイミングと信頼性は変更前から変わっていない。

**承認ワークフローの不変条件**: TOCTOU 保護（ステップ・委任・期限の TX 内再取得）、楽観的ロック（バージョン検証 + null throw パターン）、状態遷移ルール（各 `can*Transition` サービス）はいずれも変更されていない。ドメインイベントの挿入はこれらの検証が完了した後に行われている。

**TC 境界の整合性**: `dispatch()` は常にトランザクション内、`flushAsync()` は常にトランザクション成功後という規律が全ユースケースで守られている。`AsyncLocalStorage` による実装により、仕様レビュー時に指摘されたシングルトンバッファの並行リクエスト汚染問題も構造的に解決されている。

特記事項として LOW 2 件を記録した: (1) `rejectRequest` revision フローで `currentStep` が null のとき `step.rejected` payload に undefined フィールドが含まれる、(2) `updateContractStatus` に楽観的ロックがない既存パターン。いずれも不変条件の違反には至らず、本変更のスコープ外である。
