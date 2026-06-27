# Spec: lint-warning-cleanup

## Requirements

### Requirement: lint warning ゼロの維持

プロジェクトの `bun run lint` 実行結果は 0 error / 0 warning で SHALL ある。未使用の import・変数・引数は除去または eslint 設定で正当に許容され、disable コメントで隠蔽してはならない。

#### Scenario: 全 lint warning が解消されている

**Given** 未使用 import 3 件、未使用引数 2 件、未使用 const 5 件の warning が存在するコードベース
**When** `bun run lint` を実行する
**Then** 出力に error も warning も含まれない（exit code 0、"0 problems"）

### Requirement: 挙動の不変性

未使用シンボルの除去は SHALL コードの実行時挙動を変更しない。画面表示、seed によるデータ投入結果、既存テストの結果はすべて変更前と同一でなければならない。

#### Scenario: ビルドと型チェックが成功する

**Given** 未使用シンボルが除去されたコードベース
**When** `bun run build` を実行する
**Then** ビルドが成功する（exit code 0）

#### Scenario: seed のデータ投入件数が不変である

**Given** seed.ts から未使用 const 束縛が除去されたコードベース
**When** seed.ts の insert 文を確認する
**Then** 各 insert 文の `.values({...})` の内容と `.returning()` チェーンは変更前と同一であり、投入されるレコード件数に変化がない
