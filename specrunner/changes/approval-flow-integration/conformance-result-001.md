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
| tasks.md | yes | 全タスク T-01〜T-08 が [x] 完了済み |
| design.md | yes | D1〜D5 すべての設計判断が実装で満たされている |
| spec.md | yes | 全 SHALL/MUST 要件および全シナリオが実装済み |
| request.md | yes | 全 14 受け入れ基準が実装とテストで充足されている |

---

## Detail

### tasks.md

T-01〜T-08 のチェックボックスがすべて `[x]` である。

### design.md — Decisions D1–D5

| Decision | 実装箇所 |
|----------|---------|
| D1: requests に sourceType/sourceId 追加 | `schema.ts:109-110`、migration `drizzle/0012_requests_source_columns.sql` |
| D2: pending で直接 INSERT | `updateInquiryStatus.ts:60`、`updateDealPhase.ts:64` |
| D3: 連動処理失敗が承認ロールバックを引き起こさない | `approveRequest.ts` の `runPostApprovalLinkage` 二重 try-catch 構造（行 36-124） |
| D4: approveRequest 内でリポジトリ直接呼び出し（UC→UC なし） | `inquiryRepository.findById`、`dealRepository.create`、`dealRepository.updatePhase` を直接使用 |
| D5: Request 型に sourceType/sourceId 追加 | `domain/models/request.ts:15-16`、`mapRow` 関数でマッピング済み |

### spec.md — SHALL/MUST 要件

**requestRepository.create SHALL accept status/sourceType/sourceId**
- `status?: RequestStatus`（デフォルト `data.status ?? "draft"`）— ✅ `requestRepository.ts:32,45`
- `sourceType?: string | null`（デフォルト `null`）— ✅ 行 33,48
- `sourceId?: string | null`（デフォルト `null`）— ✅ 行 34,49

**updateInquiryStatus SHALL create Request with pending/source on converted**
- `status: "pending" as const`、`sourceType: "inquiry"`、`sourceId: data.inquiryId` — ✅ `updateInquiryStatus.ts:60-63`

**updateDealPhase SHALL create Request with pending/source on estimate_approval**
- `status: "pending" as const`、`sourceType: "deal"`、`sourceId: data.dealId` — ✅ `updateDealPhase.ts:64-67`

**createRequest UC SHALL continue creating with draft**
- `requestRepository.create` 呼び出しに `status` パラメータなし — ✅ `createRequest.ts:42-51`

**approveRequest SHALL create Deal when sourceType is inquiry on full approval**
- `runPostApprovalLinkage` 内 `sourceType === "inquiry"` 分岐: `inquiryRepository.findById` → `dealRepository.create` → audit log — ✅ `approveRequest.ts:36-78`
- 失敗時に `approval.linkage_failed` を記録し例外を内部で捕捉 — ✅ 行 55-76
- no-steps フロー（行 191）および multi-step allApproved フロー（行 389）の両方で呼び出し — ✅

**approveRequest SHALL advance Deal phase to won when sourceType is deal on full approval**
- `runPostApprovalLinkage` 内 `sourceType === "deal"` 分岐: `dealRepository.findById` → `dealRepository.updatePhase(..., "won", deal.estimateRequestId, deal.version)` — ✅ `approveRequest.ts:80-124`
- 楽観ロック失敗時（`updated === null`）: Error をスローして catch ブロックで `approval.linkage_failed` 記録 — ✅
- `estimateRequestId` は既存値（`deal.estimateRequestId`）を引き継ぐ — ✅

**requests table SHALL have sourceType and sourceId columns**
- `schema.ts`: `text("source_type")`、`uuid("source_id")` — ✅
- migration SQL: `ALTER TABLE "requests" ADD COLUMN "source_type" text; ADD COLUMN "source_id" uuid;` — ✅

### request.md — 受け入れ基準（全 14 件）

| 基準 | 判定 | 根拠 |
|------|------|------|
| `bun run build` 成功 | ✅ | T-08 完了 |
| `bun test` 全件 green | ✅ | T-08 完了 |
| `requestRepository.create` が `status` 受け付け | ✅ | `requestRepository.ts:32` |
| converted 遷移 Request の status が `"pending"` | ✅ | `updateInquiryStatus.ts:60` |
| estimate_approval 遷移 Request の status が `"pending"` | ✅ | `updateDealPhase.ts:64` |
| `createRequest` UC が引き続き `"draft"` | ✅ | `createRequest.ts:42-51`（status パラメータなし、デフォルト draft） |
| `requests` テーブルに `sourceType`/`sourceId` カラム | ✅ | `schema.ts:109-110`、migration ファイル |
| converted 遷移 Request の `sourceType === "inquiry"` / `sourceId === inquiryId` | ✅ | `updateInquiryStatus.ts:61-62` |
| estimate_approval 遷移 Request の `sourceType === "deal"` / `sourceId === dealId` | ✅ | `updateDealPhase.ts:65-66` |
| 案件化承認後 Deal 自動作成テスト | ✅ | `approvalFlowIntegration.test.ts` T-06 静的解析 |
| 見積承認後 Deal フェーズ `won` テスト | ✅ | `approvalFlowIntegration.test.ts` T-06 静的解析 |
| 連動処理失敗時に承認成功テスト | ✅ | `approvalFlowIntegration.test.ts` T-06 |
| 依存方向 `actions → usecases → domain/infrastructure` 遵守 | ✅ | UC→UC 呼び出しなし、リポジトリ直接使用 |
| `typecheck` green | ✅ | T-08 完了 |

### Architecture compliance

- **連動処理のトランザクション外実行**: `runPostApprovalLinkage` は `db.transaction` resolve 後に `await` で呼ばれる — ✅
- **エラー隔離**: 二重 try-catch により audit log write 自体の失敗も吸収。`approveRequest` に例外が伝播しない — ✅
- **no-steps フローの sourceType 参照**: `requestRepository.updateStatus` の戻り値も `mapRow` を通るため `sourceType`/`sourceId` が正しく含まれる — ✅
