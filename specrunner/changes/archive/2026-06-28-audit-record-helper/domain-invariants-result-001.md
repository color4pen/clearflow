# Domain-Invariants Review Result — audit-record-helper — iter 1

## Summary

- **reviewer**: domain-invariants
- **verdict**: approved
- **purpose**: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。

---

## Findings

### INV-001: テナント分離 — PASS

**観点**: `organizationId` がすべての `recordAudit` 呼び出しで正しく渡されているか。

`AuditRecordParams<A>` は `organizationId: string` を必須フィールドとして定義しており、型レベルで省略不可能。抜き取り確認した全サイトで `data.organizationId`（または `item.organizationId`）が引き渡されていた。

| ファイル | 確認結果 |
|--------|---------|
| `approveRequest.ts`（3 呼び出し） | `data.organizationId` ✅ |
| `rejectRequest.ts`（2 呼び出し） | `data.organizationId` ✅ |
| `updateInquiryStatus.ts`（4 呼び出し） | `data.organizationId` ✅ |
| `toggleActionItemDone.ts` | `data.organizationId` ✅ |
| `createRequest.ts` | `data.organizationId` ✅ |
| `expireOverdueRequests.ts` | `item.organizationId`（`findOverdueRequestIds()` 返却値より）✅ |
| `auditLogHandler.ts` | `event.organizationId` ✅ |

`expireOverdueRequests` はクロステナントのバッチ処理だが、`findOverdueRequestIds()` が返す各 `item` に `organizationId` を含むため、各テナントの監査ログが正しく分離されている。

### INV-002: 監査ログの完全性 — PASS

**観点**: リファクタリングによって監査ログの記録が欠落・重複・値変化しないか。

- `recordAudit` は `auditLogRepository.create` へ純粋委譲するだけで追加ロジックを持たない（設計決定 D3 に準拠）。
- `tx` の引き回しが全移行済みサイトで維持されている。トランザクション境界は変更前後で同一。
- 静的ガードテスト（`src/__tests__/static/auditRecorder.test.ts`）により、`auditLogRepository.create` の直接呼び出しが `auditRecorder.ts` 以外に残らないことを継続的に保証する構造になっている。
- verification フェーズで全 1129 テストが通過しており、挙動の変化がないことが確認されている。

### INV-003: 承認ワークフローの不変条件 — PASS

**観点**: 承認・否決・差し戻し各フローにおけるトランザクション境界と監査記録の順序が不変か。

`approveRequest.ts` を詳査した結果：
- 多ステップフロー：`approval_step.approve` の記録 → （全承認時）`request.approve` の記録、すべて同一 `db.transaction(...)` 内で実行 ✅
- 単一承認フロー：`request.approve` の記録が同一トランザクション内 ✅

`rejectRequest.ts` を詳査した結果：
- 差し戻しフロー（revision）：`approval_step.reject` 記録がトランザクション内 ✅
- 最終否決フロー（rejected）：`request.reject` 記録がトランザクション内 ✅

`updateInquiryStatus.ts` を詳査した結果：
- ポリシーゲート発動パス：`request.create` + `inquiry.conversionPending` が同一トランザクション内 ✅
- 直接変換パス・その他遷移パス：`inquiry.updateStatus` がそれぞれのトランザクション内 ✅

### OBS-001: `as` キャストによる型境界の緩和（観察事項・重要度: low）

`auditRecorder.ts` 内で以下のキャストが使われている:

```typescript
metadata: (params.metadata ?? null) as Record<string, unknown> | null,
```

`AuditMetadataMap[A]`（例: `{ done: boolean }`）を `Record<string, unknown> | null` に変換するための型キャストで、`auditLogRepository.create` の既存シグネチャ（`metadata?: Record<string, unknown> | null`）との整合に必要。ランタイムの値は変わらず、実害なし。

将来 `AuditMetadataMap` のエントリが増えた場合も同一パターンで対応可能。このリファクタリングの正確性には影響しない。

---

## 受け入れ基準との照合

| 基準 | 結果 |
|-----|------|
| 監査記録の単一ヘルパが定義され、型を静的検証テストで固定する | ✅ `auditRecorder.test.ts` が型シグネチャをソース検査 |
| `action_item.toggle` の metadata が `{ done: boolean }` を要求することを型テストで固定する | ✅ `@ts-expect-error` ガードで検証 |
| `auditLogRepository.create` の直接呼び出しがヘルパ実装以外に残っていないことをテストで固定する | ✅ ガードテストが全 usecases + handlers をスキャン |
| 既存テストが無変更で green | ✅ 1129 テスト全件 pass（verification-result より） |
| typecheck / lint が green | ✅ tsc / eslint 全件 pass（verification-result より） |

---

## 総評

このリファクタリングは構造的リファクタリングとして正確に実装されている。テナント分離の不変条件（`organizationId` の必須性）は型レベルで強化されており、既存の承認ワークフローのトランザクション境界と監査記録の完全性も維持されている。OBS-001 は将来の参考情報として記録するが、承認の妨げとならない。

- **verdict**: approved
