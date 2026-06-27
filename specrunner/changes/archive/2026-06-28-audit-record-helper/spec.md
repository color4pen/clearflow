# Spec: 監査ログ記録の型付きヘルパへの集約

## Requirements

### Requirement: recordAudit は監査ログ記録の単一エントリポイントである

`recordAudit` 関数 SHALL `AuditAction` と `AuditTargetType` を型引数に持ち、`auditLogRepository.create` を内部で呼び出す。呼び出し元は `auditLogRepository.create` を直接使用してはならない。

#### Scenario: recordAudit 経由で監査ログが記録される

**Given** usecase 内でトランザクションが開始されている
**When** `recordAudit({ action: "deal.create", targetType: "deal", targetId, actorId, organizationId }, tx)` を呼び出す
**Then** `auditLogRepository.create` が同一の引数で呼び出され、`AuditLog` が返される

#### Scenario: tx を省略して recordAudit を呼び出す

**Given** トランザクション外のコンテキスト
**When** `recordAudit({ action: "request.expire", ... })` を tx なしで呼び出す
**Then** `auditLogRepository.create` が tx=undefined で呼び出される

### Requirement: AuditMetadataMap に既知形がある action は metadata を型で要求する

`AuditMetadataMap` にエントリがある action（`action_item.toggle`）について、`recordAudit` は metadata 引数の型を MUST 要求する。未定義の action は metadata を省略可能とする。

#### Scenario: action_item.toggle の metadata が型強制される

**Given** TypeScript のコンパイル環境
**When** `recordAudit({ action: "action_item.toggle", targetType: "action_item", targetId: "x", actorId: "a", organizationId: "o" })` を metadata なしで記述する
**Then** コンパイルエラーが発生する（`metadata: { done: boolean }` が必須）

#### Scenario: action_item.toggle に正しい metadata を渡す

**Given** TypeScript のコンパイル環境
**When** `recordAudit({ action: "action_item.toggle", targetType: "action_item", targetId: "x", actorId: "a", organizationId: "o", metadata: { done: true } })` を記述する
**Then** コンパイルエラーは発生しない

#### Scenario: 未定義の action は metadata を省略できる

**Given** TypeScript のコンパイル環境
**When** `recordAudit({ action: "deal.create", targetType: "deal", targetId: "x", actorId: "a", organizationId: "o" })` を metadata なしで記述する
**Then** コンパイルエラーは発生しない

### Requirement: auditLogRepository.create の直接呼び出しはヘルパ実装以外に存在しない

移行完了後、`auditLogRepository.create` を呼び出すコードは `src/application/services/auditRecorder.ts` のみに MUST 限定される。テストでこの制約を静的に検証する。

#### Scenario: ガードテストが直接呼び出しを検出する

**Given** `src/application/usecases/` 配下の全ファイルのソースコード
**When** ソースコード内に `auditLogRepository.create` の文字列が存在するか検査する
**Then** いずれのファイルにも `auditLogRepository.create` は存在しない

#### Scenario: ヘルパ実装には auditLogRepository.create が含まれる

**Given** `src/application/services/auditRecorder.ts` のソースコード
**When** ソースコード内の `auditLogRepository.create` 文字列を検査する
**Then** 文字列が存在する（ヘルパの実装として正当）

### Requirement: 記録される値・挙動は移行前後で不変である

移行により記録される action / targetType / targetId / actorId / organizationId / metadata の値、記録対象、件数、トランザクション境界 SHALL 現状と同一に維持される。

#### Scenario: toggleActionItemDone の監査ログ記録が不変

**Given** `toggleActionItemDone` usecase が `recordAudit` 経由で記録する
**When** 同一の入力で usecase を実行する
**Then** action=`action_item.toggle`, targetType=`action_item`, metadata=`{ done: <toggled value> }` が記録され、同一トランザクション内で実行される
