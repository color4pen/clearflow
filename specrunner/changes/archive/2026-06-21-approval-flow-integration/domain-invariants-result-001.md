# Domain Invariants Review: approval-flow-integration

- **reviewer**: domain-invariants
- **iteration**: 1
- **date**: 2026-06-21
- **verdict**: approved

## 観点

テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。

---

## 判定サマリー

- **verdict**: approved

変更全体にわたってテナント分離は一貫して維持されており、監査ログの完全性も要件の範囲内で担保されている。承認ワークフローの不変条件（状態遷移ルール・楽観ロック・TOCTOU 防止）は破壊されていない。

---

## 詳細所見

### [PASS] テナント分離

`runPostApprovalLinkage` 内の全リポジトリ呼び出しに `organizationId` が渡されており、テナント越境アクセスを防いでいる。

| 呼び出し | 渡される organizationId | 評価 |
|---|---|---|
| `inquiryRepository.findById(sourceId, organizationId)` | `data.organizationId`（承認操作の呼び出し元） | PASS |
| `dealRepository.create({ organizationId, inquiryId: sourceId, ... })` | 同上 | PASS |
| `dealRepository.findById(sourceId, organizationId)` | 同上 | PASS |
| `dealRepository.updatePhase(sourceId, organizationId, ...)` | 同上 | PASS |
| `auditLogRepository.create({ organizationId, ... })` | 同上（全4件） | PASS |

`sourceId` が別テナントの引き合い/案件 ID を指す場合、`findById` が `null` を返してエラーが投げられ、`approval.linkage_failed` として記録される。DB レイヤーで横断アクセスをブロックする構造になっており、テナント越境リークはない。

### [PASS] 監査ログの完全性

承認操作の監査ログはすべてトランザクション内で記録される。連動処理の監査ログはトランザクション外（best-effort）だが、失敗時も `approval.linkage_failed` が確実に記録される。

| イベント | action | トランザクション | 評価 |
|---|---|---|---|
| 単一承認（no-steps） | `request.approve` | 内（必須） | PASS |
| ステップ部分承認 | `approval_step.approve` | 内（必須） | PASS |
| 全ステップ承認完了 | `request.approve` | 内（必須） | PASS |
| 案件化承認→Deal 作成成功 | `deal.create` | 外（best-effort） | PASS |
| 見積承認→フェーズ進行成功 | `deal.updatePhase` | 外（best-effort） | PASS |
| 連動処理失敗 | `approval.linkage_failed` | 外（best-effort） | PASS |

`approval.linkage_failed` の記録自体が失敗した場合、内側の `catch` 節で無音に破棄される（二重 try-catch 構造）。これにより audit log write 失敗が承認結果に伝播しないことが保証されており、D3 の設計判断と整合している。

`approval.linkage_failed` の metadata には `sourceType`、`sourceId`、`error`（エラーメッセージ）が含まれ、運用リカバリに必要な情報が揃っている。

### [PASS] 承認ワークフローの不変条件

既存の不変条件が破壊されていないことを確認した。

**状態遷移ルール**:
- `approveRequest` 入口で `validateTransition(existing.status, "approved")` を呼び出す構造は変更なし。
- `updateInquiryStatus` / `updateDealPhase` では Request を `pending` 直接 INSERT しており `validateTransition` を経由しない。これは設計判断 D2 で承認済みの意図的な省略であり、新規エンティティへの状態機械適用外である（既存レコードの遷移ではないため）。

**楽観ロック**:
- Request 更新: `existing.version`（トランザクション外スナップショット）を楽観ロックトークンとして使用する既存の実装を変更していない。concurrent reject/approve 競合を検出できる。
- Deal フェーズ更新: `deal.version` を用いた楽観ロック失敗は `updatePhase` の `null` 戻り値で検出し、`approval.linkage_failed` として記録する。

**TOCTOU 防止**:
- ステップと委任情報のトランザクション内再取得・再検証は変更なし。
- 期限切れチェックのトランザクション内再実行も変更なし。

### [PASS] `deals` テーブルの UNIQUE 制約との整合

`deals` テーブルには `unique("deals_inquiry_id_unique").on(table.inquiryId)` 制約があり、同一引き合いに対して Deal が重複作成されると DB エラーになる。このエラーは `runPostApprovalLinkage` の try-catch で捕捉され、`approval.linkage_failed` として記録される。承認はロールバックされない。設計 Risk 3 の緩和策が正しく実装されている。

---

## 観察（ブロッカーなし）

### [INFO] `request.create` 監査ログに初期 status が記録されない

`updateInquiryStatus` および `updateDealPhase` で記録される `request.create` 監査ログの metadata に `status: "pending"` が含まれない。監査ログだけでは Request が `pending` で作成されたか `draft` で作成されたかを判別できない。

ただし:
- `requests` テーブルの `status` カラム自体に値が保持されている。
- `request.create` 監査ログへの `status` 記録は既存の `createRequest` UC でも行われていない（事前からのパターン）。
- 本変更が導入した新しいギャップではない。

ブロッカーとしない。将来 status の初期値の監査要件が生じた場合は metadata に追加することを推奨する。

### [INFO] `sourceType` が非 union 型（`string | null`）

`sourceType` は `"inquiry" | "deal" | null` ではなく `string | null` で実装されている。将来未知の `sourceType` 値が設定された場合、`runPostApprovalLinkage` は何も処理せず正常終了する（サイレントスキップ）。設計判断 D5 で承認済みのトレードオフであり、現時点では `approveRequest` のみが消費者であるためリスクは低い。
