# Domain Invariants Review: approval-deadline — iter 1

- **reviewer**: domain-invariants
- **purpose**: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。
- **verdict**: approved

---

## 検証観点サマリー

| 観点 | 結果 |
|------|------|
| expired 終端状態の完全性 | ✅ pass |
| テナント分離（新規クエリ） | ✅ pass |
| 監査ログの完全性・actorId NOT NULL | ✅ pass |
| 期限チェックの TOCTOU 防止 | ✅ pass |
| expireOverdueRequests の冪等性 | ✅ pass |
| cron 認証とシークレット比較 | ✅ pass |
| システムユーザーと FK 制約 | ✅ pass with note |

---

## 詳細所見

### [PASS] expired 終端状態の完全性

`src/domain/services/requestTransition.ts` の `VALID_TRANSITIONS` に `"expired"` エントリが存在しない。

```typescript
const VALID_TRANSITIONS: Partial<Record<RequestStatus, RequestStatus[]>> = {
  draft: ["pending"],
  pending: ["approved", "rejected", "revision", "expired"],
  revision: ["pending"],
};
```

`validateTransition("expired", X)` は `allowed` が `undefined` になるため、いかなる遷移先でも `{ ok: false }` を返す。`expired` は真の終端状態として実装されている。`pending → expired` は正しく許可されている。既存の状態遷移（`draft → pending`、`pending → approved/rejected/revision`、`revision → pending`）への影響なし。

### [PASS] テナント分離（新規クエリ）

新規追加された全 repository 操作を確認した。

- `approvalStepRepository.createMany` — `organizationId` を各 step に設定してインサート ✓
- `approvalStepRepository.findOverdueRequestIds` — `organizationId` を result に含んで返却し、呼び出し元の `expireOverdueRequests` が `requestRepository.findById(item.requestId, item.organizationId, tx)` および `auditLogRepository.create({ organizationId: item.organizationId })` に使用 ✓
- `expireOverdueRequests` — 各申請の `organizationId` を全操作に伝播 ✓

`findOverdueRequestIds` は全組織をまたいで集計するが、これは cron による system operation として設計上正しい。返却される `organizationId` は `approvalSteps.organizationId` であり、後続操作で適切に使用されている。

**軽微な観察**: `findOverdueRequestIds` の JOIN 条件に `approvalSteps.organizationId = requests.organizationId` の明示的な確認がない。現状の全インサートパスが一貫してテナント境界を守っているため実害はないが、compound FK が存在しない以上は理論上 step と request が別テナントに属するレコードが存在しうる。機能的影響なし。

### [PASS] 監査ログの完全性・actorId NOT NULL

`expireOverdueRequests` が `request.expire` アクションを `actorId: systemUserId` で記録する。`audit_logs.actorId` は `users.id` への NOT NULL FK であり、system user (`00000000-0000-0000-0000-000000000000`) がシードで作成されることで制約が満たされる。

`SYSTEM_USER_ID` 未設定時は `{ ok: false, reason: "SYSTEM_USER_ID is not set" }` を返し、DB 操作を一切行わない。audit log が actorId なしで書き込まれるリスクはない。

**観察 (LOW)**: system user は seed で作成した単一組織 (`org.id`) に所属するが、audit log には他組織の `organizationId` が記録される。`actorId` FK は `users.id` のみの参照（組織スコープなし）であるため DB 制約は満たされる。row-level security 非導入の現状では機能的問題なし。将来 RLS を導入する際には system user の組織帰属の扱いを再検討すること。

### [PASS] 期限チェックの TOCTOU 防止

三つのパス全てで期限チェックを確認した。

**`approveRequest` (multi-step)**:
1. TX 外の pre-check: `isStepExpired(currentStep)` → 期限切れなら即 `{ ok: false }` 返却
2. TX 内の re-check: `isStepExpired(freshCurrentStep)` → 期限切れなら `throw` (ロールバック)

pre-check と TX re-check の間にステップが期限切れになる TOCTOU に対応している。pre-check を通過した後の TX 内で `freshCurrentStep` を再取得して再チェックするため、cron による `pending → expired` 遷移と承認操作の競合も安全に処理される。

**`rejectRequest` (rejected path)**:
1. TX 外の pre-check: `isStepExpired(preCurrentStep)` → 期限切れなら即 `{ ok: false }` 返却
2. TX 内の re-check: `isStepExpired(freshCurrentStep)` → 期限切れなら `throw`

**`rejectRequest` (revision path)**:
TX 内のみのチェック: `isStepExpired(currentStep)` → 期限切れなら `throw`。tasks.md の設計通りであり、TX 内チェックが認可上のトラストポイントとして機能している。

### [PASS] expireOverdueRequests の冪等性

`expireOverdueRequests` は `findOverdueRequestIds()` (TX 外) で対象を取得した後、各申請を個別 TX で処理する。

TX 内で `requestRepository.findById` によって最新状態を取得し、`validateTransition(existing.status, "expired")` で遷移可能性を再確認する。すでに `approved` や `expired` に遷移済みの申請は `validateTransition` が `{ ok: false }` を返してエラー扱いになり、`failed` カウントに記録される。

複数の cron インスタンスが同時実行された場合も、`requestRepository.updateStatus` の楽観ロック (`existing.version` の一致確認) によりダブル expire が防止される。一方が成功すると他方は version 不一致で null 返却 → `throw` → `failed` カウント。二重更新なし。

### [PASS] cron 認証とシークレット比較

`/api/cron/expire-requests/route.ts` の認証実装を確認した。

1. `CRON_SECRET` 未設定 → 即 401 ✓
2. `Authorization` ヘッダーなし / `Bearer ` プレフィックス不一致 → 401 ✓
3. トークンとシークレットのバイト長比較 → 不一致なら `timingSafeEqual` を呼び出さずに 401 ✓ (`RangeError` 回避)
4. `crypto.timingSafeEqual(tokenBuf, secretBuf)` で定数時間比較 ✓

タイミング攻撃への対処が正しく実装されている。なお現実装では `Buffer.from(token)` と `Buffer.from(cronSecret)` を使用しており、UTF-8 エンコードでバイト列を生成している。ASCII 以外の文字を含む場合にバイト長と文字数が一致しないケースがあるが、cron シークレットが ASCII のみで構成されることが前提であれば実用上問題ない。

### 観察: approval_steps のステータスが期限切れ後も pending のまま

`expireOverdueRequests` は `requests.status` を `expired` に更新するが、対象申請の `approval_steps.status` は `pending` のまま変更されない。

機能的影響:
- `findOverdueRequestIds` の WHERE 条件が `requests.status = 'pending'` を含むため、次回 cron 実行時に同じ申請が再取得されることはない。二重処理の心配なし ✓
- `approveRequest` / `rejectRequest` は `validateTransition("expired", ...)` で即リジェクトされるため、期限切れ後のユーザー操作は状態遷移ルールで一律ブロックされる ✓

ただし、`approval_steps` に対して直接クエリを行うレポート系処理や将来機能が、期限切れ申請の pending ステップを「未処理」として誤認する可能性がある。仕様上 step ステータスの更新は明示的に除外されているため、現 iteration の invariant 違反ではないが、将来の変更の際に注意が必要。

---

## 受け入れ基準との照合

| 受け入れ基準 | 判定 |
|---|---|
| `RequestStatus` に `"expired"` が含まれる | ✅ |
| 状態遷移テスト: `pending → expired` が許可される | ✅ |
| 状態遷移テスト: `expired → pending` が拒否される | ✅ |
| 期限切れステップへの承認操作が拒否される | ✅ |
| 期限切れステップへの却下操作（revision / rejected）が拒否される | ✅ |
| `/api/cron/expire-requests` が `CRON_SECRET` 認証付きで動作する | ✅ |
| `CRON_SECRET` のトークン長不一致時に 401 が返される | ✅ |
| audit_logs の actorId NOT NULL 制約を維持 | ✅ |
| `SYSTEM_USER_ID` 未設定時は処理中断 | ✅ |
| テナント分離の維持 | ✅ |

---

## 総評

承認ワークフローの核心不変条件（終端状態からの遷移禁止、監査ログの actorId NOT NULL、テナント分離）はすべて適切に保たれている。TOCTOU 対策も pre-check + TX re-check のパターンで一貫して実装されている。

挙げた観察事項（approval_steps 未更新、system user のテナント帰属）はいずれも仕様の設計判断 D5・D6 の範囲内であり、現時点での不変条件違反ではない。修正を求める事項なし。
