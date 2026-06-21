# Regression Gate Result — deal-flexibility / Iteration 1

- **verdict**: needs-fix

## Summary

Ledger に記録された修正が適用されていない。コメントと実装の不一致が残存している。

## Regression Found

### [LOW] コメントと実装の不一致: 終端フェーズが遷移先候補に含まれる
- **File**: src/app/(dashboard)/deals/[id]/DealPhaseActions.tsx:59
- **Status**: regression (未修正)
- **Severity**: low
- **Resolution**: fixable

#### 詳細

Line 59 のコメントは以下の通り:

```typescript
// 終端状態と現在のフェーズを除いた全フェーズを遷移先候補として生成する
```

しかし Line 60 のフィルタは現在フェーズのみを除外しており、終端状態（won/lost）は除外されない:

```typescript
const options = ALL_PHASES.filter((p) => p !== deal.phase).map((phase) => ({
```

`TERMINAL_PHASES` 定数は Line 18 で定義されているが、このフィルタでは使用されていない。結果として won/lost が遷移先ボタンとして表示される実装になっており、コメントが実挙動を誤記している状態が継続している。

#### 必要な修正

コメントを実装に合わせて修正する。例:

```typescript
// 現在のフェーズを除いた全フェーズを遷移先候補として生成する（won/lost を含む）
```
