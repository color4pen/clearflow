# Tasks: audit-action-catalog

## T-01: AuditAction / AuditTargetType 型カタログの定義

`src/domain/models/auditLog.ts` に `AuditAction` と `AuditTargetType` の文字列リテラルユニオン型を定義する。

- [ ] `AuditAction` 型を定義する。全 48 種を網羅すること。既存の命名（`invoice.update_status` 等）はそのまま含める：
  - `deal.create` / `deal.update` / `deal.updatePhase` / `deal.delete`
  - `deal_contact.create` / `deal_contact.delete`
  - `contract.create` / `contract.update` / `contract.updateStatus` / `contract.delete`
  - `invoice.create` / `invoice.update` / `invoice.update_status`
  - `meeting.create` / `meeting.update`
  - `action_item.create` / `action_item.update` / `action_item.delete` / `action_item.toggle`
  - `inquiry.create` / `inquiry.update` / `inquiry.updateStatus` / `inquiry.conversionPending` / `inquiry.delete`
  - `request.create` / `request.approve` / `request.reject` / `request.resubmit` / `request.expire` / `request.submit`
  - `approval_step.approve` / `approval_step.reject`
  - `delegation.create` / `delegation.deactivate`
  - `policy.create` / `policy.update` / `policy.activate` / `policy.deactivate`
  - `template.create` / `template.update` / `template.delete`
  - `revenue_target.create` / `revenue_target.update` / `revenue_target.delete`
  - `client.create`
  - `client_contact.create` / `client_contact.delete`
  - `user.updateRole`
- [ ] `AuditTargetType` 型を定義する。全 15 種を網羅すること：
  - `action_item` / `approvalPolicy` / `client` / `client_contact` / `contract` / `deal` / `deal_contact` / `delegation` / `inquiry` / `invoice` / `meeting` / `request` / `revenue_target` / `template` / `user`
- [ ] `AuditMetadataMap` 型を定義する。最低限 `action_item.toggle` の metadata 形を含める：
  ```typescript
  export type AuditMetadataMap = {
    "action_item.toggle": { done: boolean };
  };
  ```
- [ ] 全型を `export` する

**Acceptance Criteria**:
- `AuditAction` が 48 種の文字列リテラルユニオンとして定義されている
- `AuditTargetType` が 15 種の文字列リテラルユニオンとして定義されている
- `AuditMetadataMap["action_item.toggle"]` が `{ done: boolean }` である
- 全型が `src/domain/models/auditLog.ts` から export されている

## T-02: AuditLog モデルの型付け

`AuditLog` 型の `action` / `targetType` フィールドをカタログ型に変更する。

- [ ] `AuditLog.action` の型を `string` → `AuditAction` に変更
- [ ] `AuditLog.targetType` の型を `string` → `AuditTargetType` に変更
- [ ] `AuditLog.metadata` の型は `Record<string, unknown> | null` のまま維持する（D5 の方針に従い、create のシグネチャ変更による全呼び出しサイトへの影響を回避）

**Acceptance Criteria**:
- `AuditLog` 型定義で `action: AuditAction` / `targetType: AuditTargetType` となっている
- `metadata` の型は変更されていない

## T-03: auditLogRepository の型付け

`auditLogRepository.create` のパラメータ型と DB マッピングの型変換を更新する。

- [ ] `create` 関数の `data` パラメータの `action` 型を `string` → `AuditAction` に変更
- [ ] `create` 関数の `data` パラメータの `targetType` 型を `string` → `AuditTargetType` に変更
- [ ] `create` 関数の返り値マッピングで `row.action as AuditAction` / `row.targetType as AuditTargetType` の型アサーションを追加
- [ ] `findByOrganization` の返り値マッピングに同様の型アサーションを追加
- [ ] `findByTargets` の返り値マッピングに同様の型アサーションを追加
- [ ] `findByOrganization` / `findByTargets` のフィルタパラメータ（`options.action`, `options.targetType`, `targets[].targetType`）は `string` のまま維持する
- [ ] `AuditAction` / `AuditTargetType` を `@/domain/models/auditLog` から import する

**Acceptance Criteria**:
- `create` の `action` / `targetType` パラメータがカタログ型である
- クエリフィルタパラメータは `string` のまま維持されている
- 全 3 関数の返り値が `AuditLog` 型（`AuditAction` / `AuditTargetType`）に適合する
- `bun run build` で typecheck が通ること（全記録サイトがカタログ型に適合）

## T-04: activityLabels.ts のラベル表の型制約

`ACTION_LABELS` のキーを `AuditAction` 型で制約する。

- [ ] `AuditAction` を `@/domain/models/auditLog` から import する
- [ ] `ACTION_LABELS` の型を `Record<string, string>` → `Partial<Record<AuditAction, string>>` に変更
- [ ] `getActionLabel` の引数型は変更しない。現行の `Pick<AuditLog, "action" | "metadata">` で `AuditLog.action` が `AuditAction` になるが、`getActionLabel` は DB から読み取ったデータも処理するため、引数型を `{ action: string; metadata: Record<string, unknown> | null }` に緩和する。これにより既存の `"unknown.action"` フォールバックテストが無変更で通過する
- [ ] ラベル検索のインデクスアクセス `ACTION_LABELS[log.action]` が `string` キーで `Partial<Record<AuditAction, string>>` にアクセスするため、型エラーが出る場合はインデクスアクセスに型アサーション（`ACTION_LABELS[log.action as AuditAction]`）を使用する

**Acceptance Criteria**:
- `ACTION_LABELS` のキーとして `AuditAction` に含まれない文字列を追加するとコンパイルエラーになる
- `getActionLabel({ action: "unknown.action", metadata: null })` がコンパイルエラーにならない
- 既存の `activityLabels.test.ts` が無変更で green になる

## T-05: 静的検証テストの作成

カタログ型の定義・適用を静的検証テストで固定する。テストファイルは `src/__tests__/static/projectStructure.test.ts` に追記する（既存のテストパターンに倣う）。

- [ ] **テスト 1**: `AuditAction` 型が `src/domain/models/auditLog.ts` に export 定義されていることを検証
- [ ] **テスト 2**: `AuditTargetType` 型が `src/domain/models/auditLog.ts` に export 定義されていることを検証
- [ ] **テスト 3**: `AuditLog` 型の `action` フィールドが `AuditAction` 型を使用していることを検証（ソース文字列検査: `action: AuditAction` を含む）
- [ ] **テスト 4**: `AuditLog` 型の `targetType` フィールドが `AuditTargetType` 型を使用していることを検証（ソース文字列検査: `targetType: AuditTargetType` を含む）
- [ ] **テスト 5**: `auditLogRepository.create` の `action` / `targetType` パラメータがカタログ型を使用していることを検証
- [ ] **テスト 6**: `activityLabels.ts` の `ACTION_LABELS` が `Partial<Record<AuditAction, string>>` 型を使用していることを検証
- [ ] **テスト 7**: `AuditMetadataMap` 型が `src/domain/models/auditLog.ts` に export 定義されていることを検証
- [ ] **テスト 8**: `AuditMetadataMap` に `"action_item.toggle"` キーが含まれ、`done: boolean` を持つことを検証

**Acceptance Criteria**:
- 上記 8 テストが全て green である
- テストが既存のテスト構造（`readSrc` ヘルパー、`describe` ブロック）に適合している

## T-06: typecheck と既存テストの通過確認

全記録サイトがカタログ型に適合すること、および既存テストが無変更で通過することを確認する。

- [ ] `bun run build` を実行し、typecheck が通ることを確認する。特に以下の記録サイトが適合していること：
  - application/usecases/ 配下の全 usecase（43 箇所）
  - infrastructure/handlers/auditLogHandler.ts（1 箇所）
- [ ] 既存のテストスイートを実行し、全テストが green であることを確認する
- [ ] 新規の静的検証テスト（T-05）が green であることを確認する

**Acceptance Criteria**:
- `bun run build` が成功する（typecheck 通過）
- 既存テストが全て green（テスト変更なし）
- 新規静的検証テストが全て green
