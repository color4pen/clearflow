# Test Cases: fix-server-action-cast

## Summary

- **Total**: 8 cases
- **Automated** (unit/integration): 6
- **Manual**: 2
- **Priority**: must: 7, should: 1, could: 0

---

### TC-001: バインド済み Server Action が型安全に ActionButtons へ渡される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Server Action バインド結果はキャストなしで ActionButtons に渡される > Scenario: バインド済み Server Action が型安全に ActionButtons へ渡される

---

### TC-002: 承認操作の動作が維持される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Server Action バインド結果はキャストなしで ActionButtons に渡される > Scenario: 承認操作の動作が維持される

---

### TC-003: `as unknown as ServerAction` が 4 箇所すべて削除されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `src/app/(dashboard)/requests/[id]/page.tsx` が修正済みである
**WHEN** ファイル内容を静的検索する（`grep "as unknown as"` 相当）
**THEN** `as unknown as` という文字列がファイル内に 0 件である

---

### TC-004: 未使用の `ServerAction` import が削除されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `src/app/(dashboard)/requests/[id]/page.tsx` が修正済みである
**WHEN** ファイル内容を静的検索する（`grep "ServerAction"` 相当）
**THEN** `ServerAction` への参照がファイル内に 0 件である（import 文・型アノテーション含め）

---

### TC-005: `ActionButtons.tsx` の `ServerAction` 型定義・export が変更されていない

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-01

**GIVEN** リファクタリング前の `ActionButtons.tsx` が基準状態である
**WHEN** `src/app/(dashboard)/requests/[id]/ActionButtons.tsx` 内の `ServerAction` 定義を確認する
**THEN** `ServerAction` 型の定義が存在し、export されており、シグネチャが変更されていない

---

### TC-006: `tsc --noEmit` がエラーなしで完了する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** キャスト削除・import 削除後のコードがチェックアウト済みである
**WHEN** `npx tsc --noEmit` を実行する
**THEN** exit code 0 で完了し、型エラーが出力されない

---

### TC-007: `bun run build` が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** キャスト削除・import 削除後のコードがチェックアウト済みである
**WHEN** `bun run build` を実行する
**THEN** ビルドがエラーなしで完了し、成果物が生成される

---

### TC-008: 既存テストスイートが green を維持する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** キャスト削除・import 削除後のコードがチェックアウト済みである
**WHEN** プロジェクトのテストスイートを実行する
**THEN** すべてのテストが PASS し、新たな失敗が発生しない

---

## Result

```yaml
result: completed
total: 8
automated: 6
manual: 2
must: 7
should: 1
could: 0
blocked_reasons: []
```
