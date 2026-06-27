# Spec: audit-action-catalog

## Requirements

### Requirement: activityLabels のラベル表キーは AuditAction 型に制約される

`ACTION_LABELS` のキーとして `AuditAction` に含まれない文字列を使用した場合、TypeScript コンパイルエラーが発生しなければならない（SHALL）。ラベルが定義されていない action に対しては、既存のフォールバック挙動（`log.action` をそのまま返す）を維持する。

#### Scenario: カタログに存在する action キーでラベルを取得できる

**Given** `ACTION_LABELS` に `"deal.create": "案件を作成"` が定義されている
**When** `getActionLabel({ action: "deal.create", metadata: null })` を呼び出す
**Then** `"案件を作成"` が返される

#### Scenario: ラベル未定義の action はフォールバックで action 文字列をそのまま返す

**Given** `ACTION_LABELS` に `"request.create"` のエントリが存在しない
**When** `getActionLabel({ action: "request.create", metadata: null })` を呼び出す
**Then** `"request.create"` がそのまま返される

#### Scenario: action_item.toggle は metadata.done に応じたラベルを返す

**Given** `getActionLabel` は `action_item.toggle` を特別処理する
**When** `getActionLabel({ action: "action_item.toggle", metadata: { done: true } })` を呼び出す
**Then** `"アクションアイテムを完了"` が返される

### Requirement: getActionLabel は string 型の action を受け付ける

`getActionLabel` の `action` パラメータは `string` 型を受け付けなければならない（SHALL）。DB から読み取った歴史的データにカタログ外の値が含まれる可能性があるため、`AuditAction` に狭めない。

#### Scenario: カタログ外の action 文字列を渡してもコンパイルエラーにならない

**Given** `getActionLabel` の引数型が `{ action: string; metadata: ... }` である
**When** `getActionLabel({ action: "unknown.action", metadata: null })` を呼び出す
**Then** コンパイルエラーが発生せず、`"unknown.action"` がそのまま返される

### Requirement: action_item.toggle の metadata 型が AuditMetadataMap で定義される

`AuditMetadataMap` の `"action_item.toggle"` キーに対応する型は `{ done: boolean }` でなければならない（MUST）。この型定義がドメイン層（`src/domain/models/auditLog.ts`）に存在することを静的テストで検証する。

#### Scenario: AuditMetadataMap が action_item.toggle の metadata 形を { done: boolean } として定義している

**Given** `src/domain/models/auditLog.ts` に `AuditMetadataMap` 型が定義されている
**When** `AuditMetadataMap["action_item.toggle"]` の型を検査する
**Then** `{ done: boolean }` と一致する

### Requirement: 記録される文字列値と記録挙動は不変

本変更により、`audit_logs` テーブルに実際に INSERT される `action` / `targetType` の文字列値、記録対象、記録件数は現行と完全に同一でなければならない（MUST）。型制約の追加はコンパイル時のみの変更であり、ランタイム挙動に影響を与えない。

#### Scenario: 型制約追加後も audit_logs に記録される文字列値が変化しない

**Given** `deal.create` usecase が実行される
**When** `auditLogRepository.create` が呼び出される
**Then** `audit_logs` テーブルに `action = "deal.create"` / `targetType = "deal"` として INSERT される（型変更前と同一の文字列値）
