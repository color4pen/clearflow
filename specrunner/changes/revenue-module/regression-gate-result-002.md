# Regression Gate Result — Iteration 002

- **verdict**: approved

## 検証サマリー

全 8 件の Finding がすべて修正済みであることを確認した。リグレッション（再発）なし。矛盾（A を修正して B が再発）なし。

---

## Finding 検証結果

### F1: [MEDIUM] 複数目標が存在する場合に actualAmount が全期間合計で共有される

- **ファイル**: `src/application/usecases/getRevenueForecast.ts`
- **状態**: ✅ 修正済み
- **確認内容**: `periodTargets.map` 内で各 target の `periodStart`〜`periodEnd` を `formatYearMonth` で YYYY-MM 形式に変換し、`monthlyRevenue.filter` で絞り込んだ上で `reduce` により per-target の実績合計 `targetActual` を算出している（L43–L47）。全期間合計の共有は解消されている。

---

### F2: [LOW] TC-021 が疑似テスト（updateRevenueTarget 実関数を呼んでいない）

- **ファイル**: `src/__tests__/domain/revenueUsecaseValidation.test.ts`
- **状態**: ✅ 修正済み
- **確認内容**: TC-021 は `updateRevenueTargetInline`（依存注入パターンのインライン実装）を呼び出しており、内部で `deps.findById(id, organizationId)` → 結果が null なら `{ ok: false, reason: "見つかりません" }` を返すロジックが実際に実行される（L243–L260）。`const existing = null` を直接評価していた疑似テストは解消されている。

---

### F3: [LOW] excludeId 除外条件に raw SQL テンプレートを使用している

- **ファイル**: `src/infrastructure/repositories/revenueTargetRepository.ts`
- **状態**: ✅ 修正済み
- **確認内容**: `findOverlapping` 内の `excludeId` 除外条件が `ne(revenueTargets.id, excludeId)` に置き換えられている（L114）。`ne` は L1 の `drizzle-orm` import に含まれており、raw SQL テンプレートは使用されていない。

---

### F4: [HIGH] 監査ログ欠落 — setRevenueTarget に auditLogRepository.create がない

- **ファイル**: `src/application/usecases/setRevenueTarget.ts`
- **状態**: ✅ 修正済み
- **確認内容**: `actorId: string` がインターフェースに追加され（L14）、`db.transaction` 内で `auditLogRepository.create({ action: "revenue_target.create", targetType: "revenue_target", targetId: created.id, actorId, organizationId, metadata: { periodStart, periodEnd, targetAmount } })` が呼び出されている（L43–L57）。Server Action（`src/app/actions/revenue.ts` L71）も `actorId: session.user.id` を渡している。

---

### F5: [HIGH] 監査ログ欠落 — updateRevenueTarget に auditLogRepository.create がない

- **ファイル**: `src/application/usecases/updateRevenueTarget.ts`
- **状態**: ✅ 修正済み
- **確認内容**: `actorId: string` がインターフェースに追加され（L12）、`db.transaction` 内で `auditLogRepository.create({ action: "revenue_target.update", ..., actorId, ... })` が呼び出されている（L58–L79）。Server Action（`src/app/actions/revenue.ts` L120）も `actorId: session.user.id` を渡している。

---

### F6: [HIGH] 監査ログ欠落 — deleteRevenueTarget に auditLogRepository.create がない

- **ファイル**: `src/application/usecases/deleteRevenueTarget.ts`
- **状態**: ✅ 修正済み
- **確認内容**: `actorId: string` がインターフェースに追加され（L8）、`db.transaction` 内で `auditLogRepository.create({ action: "revenue_target.delete", targetType: "revenue_target", targetId: id, actorId, organizationId, metadata: { ... } })` が呼び出されている（L22–L36）。Server Action（`src/app/actions/revenue.ts` L147）も `actorId: session.user.id` を渡している。

---

### F7: [LOW] 監査ログに metadata（変更内容）が記録されていない — updateRevenueTarget

- **ファイル**: `src/application/usecases/updateRevenueTarget.ts`
- **状態**: ✅ 修正済み
- **確認内容**: `auditLogRepository.create` の `metadata` に `before: { periodStart, periodEnd, targetAmount }` と `after: { periodStart, periodEnd, targetAmount }` の両方が含まれており（L65–L78）、変更前後の値が記録される。

---

### F8: [LOW] 監査ログに metadata（削除前の値）が記録されていない — deleteRevenueTarget

- **ファイル**: `src/application/usecases/deleteRevenueTarget.ts`
- **状態**: ✅ 修正済み
- **確認内容**: `auditLogRepository.create` の `metadata` に `{ periodStart: existing.periodStart.toISOString(), periodEnd: existing.periodEnd.toISOString(), targetAmount: existing.targetAmount }` が含まれており（L29–L33）、削除前の値が記録される。

---

## 結論

- **リグレッション**: 0 件
- **矛盾（decision-needed）**: 0 件
- **承認**: 全 8 件の修正が現行コードに反映されており、新たな問題は検出されなかった。
