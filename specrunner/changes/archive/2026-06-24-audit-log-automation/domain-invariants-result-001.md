# Domain-Invariants Review — audit-log-automation — iter 1

- **reviewer**: domain-invariants
- **verdict**: approved

---

## 観点と判定基準

本レビューは以下の 4 つの不変条件を検証する。

1. **テナント分離** — organizationId が常にセッション由来で伝播し、クロステナント書き込みが発生しないこと
2. **監査ログの完全性** — submitRequest のイベント→ハンドラ経路で全必須フィールドが記録されること
3. **承認ワークフロー不変条件** — validateTransition・楽観ロック・TOCTOU 防止が変更後も維持されること
4. **トランザクション境界** — 状態変更と監査ログが同一トランザクションに含まれること

---

## 不変条件ごとの検証結果

### 1. テナント分離

**判定: 維持**

`auditLogHandler.ts` は `organizationId: event.organizationId` を監査ログに書く。  
`event.organizationId` は `submitRequest.ts` で `data.organizationId` として設定され、これは Server Action がセッション (`session.user.organizationId`) から取得する値である。フォームデータからは取得していない（TC-009 により静的解析で検証済み）。

`auditLogRepository.findByOrganization` は `eq(auditLogs.organizationId, organizationId)` による WHERE 条件を持つ。読み取り側のテナント境界も維持されている。

本変更によってクロステナント書き込みが可能になるパスは存在しない。

### 2. 監査ログの完全性

**判定: 維持**

`auditLogHandler.ts` が記録するフィールド:

| フィールド | 値 | 評価 |
|---|---|---|
| `action` | `"request.submit"` | 仕様通り ✓ |
| `targetType` | `"request"` | 仕様通り ✓ |
| `targetId` | `event.payload.requestId` | DB 保存後の ID を使用 ✓ |
| `actorId` | `event.actorId` | イベントに埋め込まれたセッション由来 ID ✓ |
| `organizationId` | `event.organizationId` | 上記テナント分離に準じる ✓ |
| `metadata` | `null` | 仕様通り ✓ |

他ユースケース（approveRequest, rejectRequest 等）の手動 `auditLogRepository.create` 呼び出しは変更されていない。TC-012, TC-013 が引き続き green であることを verification-result.md で確認。

### 3. 承認ワークフロー不変条件

**判定: 維持**

- `validateTransition` は全ユースケースで状態更新より前に呼ばれており、本変更による順序の変動なし（TC-039, TC-040 で静的解析確認済み）。
- 楽観ロック（version チェック）は `requestRepository.updateStatus` 内に実装されており、本変更はその呼び出し経路を変えない。
- `approveRequest` の多段承認 TOCTOU 防止（TX 内で approvalStep と delegation を再取得する二重チェック）は完全に手付かず。
- `rejectRequest` の差し戻しフローも同様に変更なし。
- 全 22 箇所の `dispatcher.dispatch(...)` に `await` が追加されており、Promise が捨てられる（fire-and-forget）状態が解消された。`grep -rn 'dispatcher\.dispatch(' src/application/usecases/` で非 await 呼び出しがゼロであることを確認。

### 4. トランザクション境界

**判定: 維持**

`submitRequest.ts` の構造:

```
db.transaction(async (tx) => {
  requestRepository.updateStatus(...)   // 状態変更
  await dispatcher.dispatch(event, { tx })
    → handleAuditLog(event, { tx })     // sync ハンドラ — TX 内で実行
      → auditLogRepository.create(data, tx)  // 同一 TX で記録
})
dispatcher.flushAsync()                 // webhook は TX 外 (async)
```

`handleAuditLog` は `"sync"` モードで登録されており、`dispatch()` 内の同期ループで `await` される。これにより、`auditLogRepository.create` が失敗した場合は例外が `dispatch()` → `db.transaction()` へ伝播し、トランザクション全体がロールバックする。状態変更と監査ログは常にアトミック。

設計ドキュメント (design.md D5) が意図する「TX 境界内で書く必要があるため sync ハンドラを使用」という判断を実装が正確に反映している。

---

## 情報事項（verdict に影響しない観察）

**[INFO] domainEvents.test.ts の非 await dispatch 呼び出し**

`domainEvents.test.ts` では、`d.dispatch(...)` が `await` なしで呼ばれている箇所が複数ある（行 75, 128, 139, 153, 176, 190 等）。`dispatch()` が async 化されたことで、これらは unresolved Promise を返す。ただし:
- 全 890 テストが green（verification-result.md 確認）
- 当該テストは新規作成した `EventDispatcher` インスタンスを使用し、global `dispatcher` に影響しない
- sync ハンドラ本体は `await` の前に同期的に実行されるため、直後の `expect()` が正しい状態を検証できている

本変更の不変条件違反ではなく、テストスタイルの改善余地として記録するにとどめる。

---

## 総括

テナント分離・監査ログ完全性・承認ワークフロー不変条件・トランザクション境界のいずれも維持されている。本変更は既存の不変条件を破壊せず、むしろ Promise 捨て（全 22 箇所 await 追加）を修正することで信頼性を向上させる。
