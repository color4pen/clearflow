# Test Cases: 案件アクティビティに対象エンティティ名とリンクを表示

## Summary

- **Total**: 24 cases
- **Automated** (unit/integration): 21
- **Manual**: 3
- **Priority**: must: 19, should: 3, could: 2

---

### TC-001: 全種別エンティティが targetInfoMap に含まれる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: getDealActivity は対象エンティティの情報マップを返す > Scenario: 全種別のエンティティがマップに含まれる

---

### TC-002: deal_contact はマップに含まれない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: getDealActivity は対象エンティティの情報マップを返す > Scenario: deal_contact はマップに含まれない

---

### TC-003: 新規リポジトリ取得を増やしていない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: getDealActivity は対象エンティティの情報マップを返す > Scenario: 新規リポジトリ取得を増やしていない

---

### TC-004: deal の href パターン

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: href は詳細ページがある対象のみに付与する > Scenario: deal の href パターン

---

### TC-005: meeting の href パターン

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: href は詳細ページがある対象のみに付与する > Scenario: meeting の href パターン

---

### TC-006: contract の href パターン

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: href は詳細ページがある対象のみに付与する > Scenario: contract の href パターン

---

### TC-007: invoice に href が無い

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: href は詳細ページがある対象のみに付与する > Scenario: invoice に href が無い

---

### TC-008: action_item に href が無い

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: href は詳細ページがある対象のみに付与する > Scenario: action_item に href が無い

---

### TC-009: href ありの対象はリンクで表示される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: DealActivitySection は対象ラベルを表示する > Scenario: href ありの対象はリンクで表示

---

### TC-010: href なしの対象はテキストで表示される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: DealActivitySection は対象ラベルを表示する > Scenario: href なしの対象はテキストで表示

---

### TC-011: 削除済みエンティティのフォールバック

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 対象が解決できない場合はアクション文のみで表示する > Scenario: 削除済みエンティティのフォールバック

---

### TC-012: 既存表示要素が維持される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 既存の表示要素と動作は不変 > Scenario: 既存表示要素が維持される

---

### TC-013: フィーチャーフラグが false のときセクション非表示

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: 既存の表示要素と動作は不変 > Scenario: フィーチャーフラグが false のときセクション非表示

---

### TC-014: TargetInfo / DealActivityResult 型が export されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `src/application/usecases/getDealActivity.ts` のソースコード
**WHEN** export 定義を静的解析で検査する
**THEN** `TargetInfo` と `DealActivityResult` が named export として存在する

---

### TC-015: getDealActivity のシグネチャに dealTitle パラメータが含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01 / design.md > D2

**GIVEN** `src/application/usecases/getDealActivity.ts` のソースコード
**WHEN** 関数シグネチャを静的解析で検査する
**THEN** `dealTitle` パラメータが存在する

---

### TC-016: meeting のラベルが meetingTypeLabels と日付の組み合わせで生成される

**Category**: unit
**Priority**: should
**Source**: design.md > D3 / tasks.md > T-02

**GIVEN** `src/application/usecases/getDealActivity.ts` のソースコード
**WHEN** meeting エントリのラベル生成ロジックを静的解析で検査する
**THEN** `meetingTypeLabels` の参照と `meeting.date` への `toLocaleDateString` 呼び出しが両方存在する

---

### TC-017: meeting 日付が ja-JP ロケールでフォーマットされる

**Category**: unit
**Priority**: could
**Source**: design.md > D3 / tasks.md > T-02

**GIVEN** `src/application/usecases/getDealActivity.ts` のソースコード
**WHEN** 日付フォーマット箇所を静的解析で検査する
**THEN** `toLocaleDateString("ja-JP")` の呼び出しが存在する

---

### TC-018: アクション文と対象ラベルの間に「：」区切りが使われる

**Category**: unit
**Priority**: should
**Source**: design.md > D6 / tasks.md > T-03

**GIVEN** `src/app/(dashboard)/deals/[id]/DealActivitySection.tsx` のソースコード
**WHEN** 対象ラベル表示箇所を静的解析で検査する
**THEN** アクション文と対象ラベルの間に「：」（全角コロン）区切りの記述が存在する

---

### TC-019: href あり対象のリンクに text-primary underline スタイルが付与される

**Category**: unit
**Priority**: could
**Source**: design.md > D6 / tasks.md > T-03

**GIVEN** `src/app/(dashboard)/deals/[id]/DealActivitySection.tsx` のソースコード
**WHEN** リンク表示箇所を静的解析で検査する
**THEN** `text-primary underline` の className が存在する

---

### TC-020: activityEnabled=false のときフォールバック値が新型に対応している

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** `src/app/(dashboard)/deals/[id]/page.tsx` のソースコード
**WHEN** `activityEnabled` が false のフォールバック値の定義を静的解析で検査する
**THEN** `{ logs: [], targetInfoMap: {} }` に相当するフォールバック値が使われている

---

### TC-021: page.tsx が DealActivitySection に targetInfoMap props を渡している

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** `src/app/(dashboard)/deals/[id]/page.tsx` のソースコード
**WHEN** DealActivitySection の JSX 呼び出し箇所を静的解析で検査する
**THEN** `targetInfoMap` prop が渡されている

---

### TC-022: typecheck が green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** 変更後のコードベース
**WHEN** `bunx tsc --noEmit` を実行する
**THEN** 型エラーがなく正常終了する

---

### TC-023: lint が green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** 変更後のコードベース
**WHEN** `bun run lint` を実行する
**THEN** lint エラーがなく正常終了する

---

### TC-024: bun run build が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** 変更後のコードベース
**WHEN** `bun run build` を実行する
**THEN** ビルドが正常に完了する

---

## Result

```yaml
result: completed
total: 24
automated: 21
manual: 3
must: 19
should: 3
could: 2
blocked_reasons: []
```
