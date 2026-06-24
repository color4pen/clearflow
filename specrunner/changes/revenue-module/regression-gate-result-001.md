# Regression Gate Result — Iteration 1

- **verdict**: needs-fix

## 検証対象ファイル

| ファイル | 確認ステータス |
|---|---|
| src/application/usecases/getRevenueForecast.ts | ✅ FIXED |
| src/__tests__/domain/revenueUsecaseValidation.test.ts | ❌ REGRESSION |
| src/infrastructure/repositories/revenueTargetRepository.ts | ❌ REGRESSION |
| src/application/usecases/setRevenueTarget.ts | ✅ FIXED |
| src/application/usecases/updateRevenueTarget.ts | ❌ REGRESSION (metadata) |
| src/application/usecases/deleteRevenueTarget.ts | ❌ REGRESSION (metadata) |

---

## 修正済み（5件）

### [MEDIUM] actualAmount が全期間合計で共有される問題
- **File**: src/application/usecases/getRevenueForecast.ts
- **Status**: ✅ FIXED
- 各目標ごとに `formatYearMonth` で期間フィルタを行い、`monthlyRevenue` を `.filter()` してから集計する実装に変わっている。全期間合計を共有する問題は解消されている。

### [HIGH] setRevenueTarget 監査ログ欠落
- **File**: src/application/usecases/setRevenueTarget.ts
- **Status**: ✅ FIXED
- `actorId: string` がインターフェースに追加され、`db.transaction` 内で `auditLogRepository.create` が呼ばれている。`metadata` に `{ periodStart, periodEnd, targetAmount }` も含まれている。

### [HIGH] updateRevenueTarget 監査ログ欠落（actorId + create 自体）
- **File**: src/application/usecases/updateRevenueTarget.ts
- **Status**: ✅ FIXED（core invariant 部分）
- `actorId: string` がインターフェースに追加され、`db.transaction` 内で `auditLogRepository.create` が呼ばれている。

### [HIGH] deleteRevenueTarget 監査ログ欠落（actorId + create 自体）
- **File**: src/application/usecases/deleteRevenueTarget.ts
- **Status**: ✅ FIXED（core invariant 部分）
- `actorId: string` がインターフェースに追加され、`db.transaction` 内で `auditLogRepository.create` が呼ばれている。

---

## リグレッション（4件）

### [LOW] TC-021 が疑似テスト（updateRevenueTarget 実関数を呼んでいない）
- **File**: src/__tests__/domain/revenueUsecaseValidation.test.ts:184
- **Resolution**: fixable
- **Status**: ❌ REGRESSION
- テスト本体が `const existing = null` というローカル変数を直接評価するだけで、usecase 関数を一切呼び出していない。`setRevenueTargetInline` と同様の依存注入パターンで `updateRevenueTargetInline` 相当の関数を用意し、実ロジック（`findById` → null チェック → エラー返却）を経由させる必要がある。

### [LOW] excludeId 除外条件に raw SQL テンプレートを使用している
- **File**: src/infrastructure/repositories/revenueTargetRepository.ts:114
- **Resolution**: fixable
- **Status**: ❌ REGRESSION
- `conditions.push(sql\`${revenueTargets.id} != ${excludeId}\`)` が残存している。Drizzle ORM の型安全な `ne(revenueTargets.id, excludeId)` に置き換えていない。`ne` のインポートも追加されていない。

### [LOW] updateRevenueTarget の監査ログに metadata が記録されていない
- **File**: src/application/usecases/updateRevenueTarget.ts:58
- **Resolution**: fixable
- **Status**: ❌ REGRESSION
- `auditLogRepository.create` は呼ばれているが、`metadata` フィールドが含まれていない。`existing` で変更前の値が取得済みのため、`{ before: { periodStart, periodEnd, targetAmount }, after: { ... } }` を記録することは容易。

### [LOW] deleteRevenueTarget の監査ログに metadata（削除前の値）が記録されていない
- **File**: src/application/usecases/deleteRevenueTarget.ts:22
- **Resolution**: fixable
- **Status**: ❌ REGRESSION
- `auditLogRepository.create` は呼ばれているが、`metadata` フィールドが含まれていない。`existing` で削除前の値が取得済みのため、`{ periodStart, periodEnd, targetAmount }` を記録することは容易。
