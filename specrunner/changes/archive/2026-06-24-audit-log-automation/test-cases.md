# Test Cases: dispatcher の async 化と submitRequest の監査ログハンドラ移行

## Summary

- **Total**: 18 cases
- **Automated** (unit/integration): 17
- **Manual**: 1
- **Priority**: must: 15, should: 3, could: 0

---

### TC-001: sync ハンドラが await される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: dispatch() が async でハンドラを await すること > Scenario: sync ハンドラが await される

---

### TC-002: options が sync ハンドラに伝播する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: dispatch() が async でハンドラを await すること > Scenario: options が sync ハンドラに伝播する

---

### TC-003: 既存ハンドラが options なしで動作する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: EventHandler 型が options 引数を受け取れること > Scenario: 既存ハンドラが options なしで動作する

---

### TC-004: await の追加が既存動作に影響しない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 全 dispatch 呼び出しに await が追加されていること > Scenario: await の追加が既存動作に影響しない

---

### TC-005: tx 付きの dispatch が呼ばれる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: submitRequest の dispatch 呼び出しに tx が渡されること > Scenario: tx 付きの dispatch が呼ばれる

---

### TC-006: submitRequest で監査ログが自動記録される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 監査ログハンドラが request.submitted イベントを処理すること > Scenario: submitRequest で監査ログが自動記録される

---

### TC-007: tx が未提供の場合でもハンドラが動作する

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: 監査ログハンドラが request.submitted イベントを処理すること > Scenario: tx が未提供の場合

---

### TC-008: submitRequest に auditLogRepository の直接呼び出しがない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: submitRequest から手動の auditLogRepository.create 呼び出しが削除されること > Scenario: submitRequest に auditLogRepository の直接呼び出しがない

---

### TC-009: approveRequest の監査ログが引き続き動作する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 他のユースケースの監査ログが引き続き動作すること > Scenario: approveRequest の監査ログが引き続き動作する

---

### TC-010: webhook 配信が引き続き動作する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 既存の Webhook ハンドラが引き続き動作すること > Scenario: webhook 配信が引き続き動作する

---

### TC-011: DispatchOptions 型が domain/events からエクスポートされている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `src/domain/events/dispatcher.ts` に `DispatchOptions = { tx?: unknown }` 型が定義され、`src/domain/events/index.ts` から re-export されている
**WHEN** `import { DispatchOptions } from "@/domain/events"` を実行する
**THEN** インポートが成功し、型が `{ tx?: unknown }` を持つオブジェクト型として解決される

---

### TC-012: auditLogHandler が request.submitted 以外のイベントを無視する

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** `handleAuditLog` 関数が実装されており、`auditLogRepository.create` をモックしている
**WHEN** `request.approved` など `request.submitted` 以外のイベントタイプで `handleAuditLog` を呼ぶ
**THEN** `auditLogRepository.create` が一切呼ばれない

---

### TC-013: handleAuditLog が sync モードで登録されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** `src/infrastructure/handlers/index.ts` が `registerHandlers()` を export している
**WHEN** `index.ts` のソースを静的に確認する
**THEN** `dispatcher.on("request.submitted", handleAuditLog, "sync")` の呼び出しが存在し、第 3 引数が `"sync"` である

---

### TC-014: 全 22 箇所の dispatch 呼び出しに await が追加されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** 全ユースケースファイルの dispatch 呼び出しが変更されている
**WHEN** `grep -rn 'dispatcher\.dispatch(' src/application/usecases/` を実行する
**THEN** 出力された全行が `await dispatcher.dispatch(` を含み、`await` なしの呼び出しが 0 件である

---

### TC-015: submitRequest.ts に auditLogRepository の import が残っていない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** `submitRequest.ts` から手動の `auditLogRepository.create` 呼び出しと import が削除されている
**WHEN** `submitRequest.ts` のソースを確認する
**THEN** `auditLogRepository` という文字列がファイル内に一切存在しない

---

### TC-016: auditLogHandler の例外がトランザクションをロールバックさせる

**Category**: integration
**Priority**: should
**Source**: design.md > Risks / Trade-offs

**GIVEN** `auditLogHandler` が `auditLogRepository.create` で例外をスローするようにモックされている
**WHEN** `submitRequest` が `dispatcher.dispatch(event, { tx })` を呼ぶ
**THEN** トランザクション全体がロールバックされ、リクエストステータスの変更も保存されない

---

### TC-017: typecheck && test が green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** T-01 から T-07 の全変更が適用されている
**WHEN** `bun run typecheck && bun test` を実行する
**THEN** 型エラーが 0 件、テスト失敗が 0 件で終了する

---

### TC-018: requestWorkflow.test.ts の TC-011 が auditLogHandler の検証に更新されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** `submitRequest.ts` から `auditLogRepository` が削除されており、`auditLogHandler.ts` に `request.submit` の処理が移っている
**WHEN** `requestWorkflow.test.ts` の TC-011 のアサーションを確認する
**THEN** `auditLogHandler.ts` のソースから `request.submit` の処理を検証する形に更新されており、`submitRequest.ts` に `auditLogRepository` が含まれることを期待するアサーションは存在しない

---

## Result

```yaml
result: completed
total: 18
automated: 17
manual: 1
must: 15
should: 3
could: 0
blocked_reasons: []
```
