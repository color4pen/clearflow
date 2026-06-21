# Regression Gate Result — Iteration 1

- **verdict**: needs-fix

## Summary

Ledger に記載された1件の修正を検証した結果、修正が適用されていないことを確認した。

## Findings

### [HIGH] TC-034 の domain 層分離テストに contract ファイルが未追加（リグレッション）

- **File**: src/__tests__/static/projectStructure.test.ts
- **Severity**: high
- **Resolution**: fixable
- **Detail**:
  TC-034（`no @/infrastructure import in domain layer`）のファイルリスト（行 139–159）に
  `domain/models/contract.ts` と `domain/services/contractTransition.ts` が含まれていない。
  両ファイルは本ブランチで追加されており実際に存在するが、TC-034 のカバレッジリストへの追加は行われていない。

  diff では `domain/models/contract.ts` は TC-031 相当のモデルファイル一覧（行 113 付近）に追加されているが、
  TC-034 のリストには追加されていない。`domain/services/contractTransition.ts` はどちらのリストにも追加されていない。

- **Fix**: TC-034 のファイルリストに以下の2行を追加する。

  ```typescript
  "domain/models/contract.ts",
  "domain/services/contractTransition.ts",
  ```
