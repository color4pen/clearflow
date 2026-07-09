# Domain-Invariants Review — mcp-inquiry-convert — iteration 001

- **verdict**: approved
- **iteration**: 001

## Scope

本レビューは以下の観点で変更を検証する。

1. **テナント分離**: `organizationId` がクライアント指定不可であること
2. **監査ログの完全性**: 全案件化経路（即時・承認ゲート）で監査記録が漏れなくトランザクション内に存在すること
3. **承認ワークフローの不変条件**: 案件化承認フローが新オペレーション追加によって迂回・破壊されていないこと
4. **`inv-inquiry-convert-requires-client`**: clientId 未設定引合の拒否が維持されていること

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | low | audit | `src/app/api/mcp/tools/inquiries.ts` | `convert` ハンドラの即時案件化成功パスで `result.deal?.id ?? ""` を使用している（L296）。`result.deal` は即時案件化パスで `dealRepository.create` の戻り値が常に設定されるため実害はないが、`??""` の fallback が残ると `message` が「案件を生成しました（dealId: ）」となる可能性が型上は存在する。監査ログや動作には影響しない。 | `result.deal?.id` の代わりに `result.deal!.id` または `result.deal?.id` のみ使用し、message を `result.deal ? \`案件を生成しました（dealId: ${result.deal.id}）\` : "案件を生成しました"` のように条件分岐すると意図が明確になる。 | no |

## Invariant Verification

### 1. テナント分離

**確認済み — 違反なし**

- `organizationId` は `getAuthInfo(extra)` から取得。`extra.authInfo?.extra` は `resolveBearer` が DB のトークンレコードから解決した値であり、クライアントが任意の `organizationId` を指定する手段がない（`src/app/api/mcp/route.ts`、`src/infrastructure/apiTokenResolver.ts`）。
- `updateInquiryStatus` に渡す `organizationId` は同一 auth コンテキストから取得（L275）。
- `inquiryRepository.findById(data.inquiryId, data.organizationId)` は `AND organizationId = ?` フィルタで DB 照会（`src/infrastructure/repositories/inquiryRepository.ts` L70）。クロステナントの引合参照は型・DB クエリの両レイヤーで遮断されている。
- 承認後の Deal 生成（`handleApprovalCompleted`）も `event.organizationId` を使用しており、イベントドリブン経路でのテナントリークは発生しない。

### 2. 監査ログの完全性

**確認済み — 違反なし**

即時案件化パス（ポリシー非合致）:
- トランザクション内で `recordAudit({ action: "inquiry.updateStatus", metadata: { fromStatus, toStatus, dealId } })` を記録（`updateInquiryStatus.ts` L207-220）。
- `dealId` が metadata に含まれており、Deal との紐付けが監査証跡に残る。

承認ゲートパス:
- トランザクション内で `recordAudit({ action: "request.create", ... })` を記録（L121-131）。
- 同トランザクション内で `recordAudit({ action: "inquiry.conversionPending", metadata: { fromStatus, pendingApprovalRequestId, policyId } })` を記録（L133-148）。誰がいつ案件化を試みてゲートが発動したかが引合側にも記録される。

`convert` MCP ハンドラは監査記録を自前で行わないが、spec.md の設計（「監査は usecase 内で記録されるため追加不要」）と一致しており、`update_status: converted` との対称性が保たれている。監査の空白は存在しない。

### 3. 承認ワークフローの不変条件

**確認済み — 違反なし**

**ポリシー評価のスキップなし**: `convert` ハンドラは `updateInquiryStatus(...)` を `options` 引数なしで呼んでおり、`skipPolicyCheck` は `false`（デフォルト）のまま。ポリシー評価は正常に実行される（`updateInquiryStatus.ts` L50）。

**重複防止チェックの有効性**: `requestRepository.findByOriginTriggerEntity(organizationId, "inquiry.convert", inquiryId)` による既存 pending リクエスト確認は `convert` / `update_status: converted` 両方に有効。両オペレーションは同一 usecase を呼ぶため、どちら経由で呼んでも重複申請は拒否される（L52-59）。

**承認後の Deal 生成ループ防止**: `handleApprovalCompleted` は `skipPolicyCheck: true` で `updateInquiryStatus` を呼ぶため、ポリシー再評価による無限ループは発生しない。この経路は `convert` の追加によって影響を受けない。

**楽観的ロック**: `inquiryRepository.updateStatus` は `inquiry.version` で楽観的ロックを実施。同時更新時は `{ ok: false, reason: "この引き合いは他のユーザーによって更新されました" }` を返す（L237-239）。`convert` も同一 usecase を通るため同様に保護される。

### 4. `inv-inquiry-convert-requires-client`

**確認済み — 違反なし**

`updateInquiryStatus` 内の `if (!inquiry.clientId) { return { ok: false, reason: "案件化するには顧客の登録が必要です" } }` チェック（L45-47）は clientId 確認の後にポリシー評価・Deal 生成を行う流れを強制している。`convert` オペレーションはこの usecase を経由するため、MCP ハンドラ側でバイパスする手段がない。TC-05 behavioral テストがこの経路を実 transport で固定している。

### 5. 認可

**確認済み — 違反なし**

`convert` ハンドラは `canPerform(role, "inquiry", "convert")` を usecase 呼び出し前に実行（L261-263）。`PERMISSION_MATRIX` の `inquiry.convert` は `ADMIN_MANAGER` のみ許可（`authorization.ts` L34）。`member` ロールは TC-06 behavioral テストで拒否を確認済み。

### 6. 情報漏洩

**確認済み — 違反なし**

`toToolError(result.reason)` が渡す `reason` は usecase が生成した日本語業務メッセージのみ（「引き合いが見つかりません」「案件化するには顧客の登録が必要です」等）。スタックトレース・SQL・内部パスは含まれない。予期しない例外は `handleToolError(error)` により処理される（L329-331）。

## Summary

本変更は既存の `updateInquiryStatus` usecase に MCP 専用入口（`convert` オペレーション）を追加するものであり、ドメイン不変条件のすべてが usecase 内で維持されている。変更によって追加されたコードが直接持つドメインロジックはなく、不変条件のオーナーシップは usecase に留まっている。

テナント分離・監査ログ完全性・承認ワークフロー不変条件・`inv-inquiry-convert-requires-client`・認可・情報漏洩防止のいずれも破壊されていない。

Low Finding #1（`result.deal?.id ?? ""`）は実動作に影響しない型上の観察であり、修正不要（`no` 扱い）。
