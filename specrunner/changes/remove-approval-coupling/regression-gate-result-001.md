# Regression Gate Result — Iteration 001

- **change**: remove-approval-coupling
- **iteration**: 1
- **verdict**: approved

## Verification Summary

全5件の finding について現在のコードを確認した。いずれも修正済みで回帰なし。

## Finding 検証結果

### [HIGH] estimate_approval が allPhases 配列に残存
- **file**: src/app/(dashboard)/deals/page.tsx
- **status**: fixed
- **detail**: `allPhases` は `["proposal_prep", "proposed", "negotiation", "won", "lost"]` の5値のみ。`estimate_approval` は含まれない。

### [MEDIUM] updatePhase に estimateRequestId: null を常に渡しており設計判断 D2 と矛盾
- **file**: src/application/usecases/updateDealPhase.ts
- **status**: fixed
- **detail**: `dealRepository.updatePhase` の呼び出しは `(dealId, organizationId, newPhase, version, tx)` の5引数のみ。`estimateRequestId` 引数はリポジトリ側のシグネチャから削除済みで、UPDATE SET 句も `phase` / `updatedAt` / `version` のみを更新する。

### [LOW] 追加テストに T-XX ID が付与されていない
- **file**: src/__tests__/domain/dealTransition.test.ts
- **status**: fixed
- **detail**: 対象テストは `it("T-07: negotiation → estimate_approval が拒否される（フェーズ削除）", ...)` として line 55 に存在する。T-XX プレフィックスが付与されている。

### [LOW] TC-017 テストに T-XX ID が付与されていない（iter 001 から未修正）
- **file**: src/__tests__/domain/dealTransition.test.ts
- **status**: fixed
- **detail**: Finding 3 と同一箇所。T-07 として修正済み。

### [LOW] TC-018（estimate_approval → won が false）が未実装
- **file**: src/__tests__/domain/dealTransition.test.ts
- **status**: fixed
- **detail**: `it("T-08: estimate_approval → won が拒否される（フェーズ削除）", ...)` が line 63–69 に追加済み。`canTransition("estimate_approval" as DealPhase, "won")` が `false` を返すことを検証している。

## 回帰・矛盾

なし。
