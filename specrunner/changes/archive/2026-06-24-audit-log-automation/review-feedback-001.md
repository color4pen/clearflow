# Code Review Feedback — iteration 001

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
- iteration line format (exact): `- **iteration**: NNN` (3-digit zero-padded integer)
- Findings table MUST have exactly 7 columns in this order:
  # | Severity | Category | File | Description | How to Fix | Fix
  - Fix column: yes = fixer should address this finding; no = skip (pre-existing / out-of-scope)
- Scores table columns: Category | Score | Weight
  - Valid Category values: correctness | security | architecture | performance | maintainability | testing
  - Score: integer 1-10
  - Weight: decimal as defined below
- total line format (exact): `- **total**: <decimal>`
- Default weights: correctness=0.30, security=0.25, architecture=0.15, performance=0.10, maintainability=0.10, testing=0.10
- Scores table is optional but recommended.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approved
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | low | testing | src/__tests__/domain/domainEvents.test.ts | 10箇所（line 128, 139, 153, 176, 190, 204, 242, 255, 301/305, 320）で `d.dispatch()` を await なしで呼んでいる。特に line 139-145 は unawaited dispatch の直後に `d.flushAsync()` を呼んでおり、buffer.push がループ内の await より先に同期実行されることに依存している（sync ハンドラが存在しない場合に限り成立する実装詳細）。dispatcher 内部に先行 await が追加された場合に無音で壊れるリスクがある。line 75 は "sync handler runs immediately" を検証する intentional な非 await であり問題なし。 | 対象行に `await d.dispatch(...)` を追加する。line 75 は意図を示すコメント `// intentional: verifying synchronous invocation, not awaiting` を付け残す。 | yes |
| 2 | low | testing | src/__tests__/domain/domainEvents.test.ts | TC-002「options が sync ハンドラに伝播する」専用のユニットテストが存在しない。options.tx の伝播は TC-011/TC-018 の静的解析（auditLogHandler.ts のソース確認）で間接的にカバーされているが、dispatch(event, { tx: mockTx }) の呼び出し時に mockTx がハンドラに届くことを直接 assert するテストがない。 | `d.on` でモックハンドラを登録し `received_options` を記録するテストを追加。`await d.dispatch(event, { tx: "mock-tx" })` 後に `expect(received_options?.tx).toBe("mock-tx")` を assert する。 | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 10 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 8 | 0.10 |

- **total**: 8.95

## Summary

実装は正確かつ仕様に忠実。受け入れ基準全件を満たしている。

**確認済み項目**:
- `dispatch()` が `async` で `Promise<void>` を返す（dispatcher.ts L31）
- `EventHandler<T>` が `(event: T, options?: DispatchOptions) => void | Promise<void>` に拡張（L6）
- `DispatchOptions` が `{ tx?: unknown }` で domain 層から export（index.ts L25）
- sync ハンドラが `await entry.handler(event, options)` で呼ばれ tx が伝播（dispatcher.ts L46）
- 全 22 箇所の dispatch 呼び出しに `await` が付与されていることを grep で確認（5+3+3+3+2+2+1+1+1+1=22）
- submitRequest の dispatch 呼び出しに `{ tx }` が渡されている（submitRequest.ts L56）
- `auditLogHandler.ts` が `request.submitted` のみ処理し、`auditLogRepository.create` に action/targetType/targetId/actorId/organizationId/metadata=null を渡す（T-04 仕様通り）
- `handleAuditLog` が `"sync"` モードで登録（handlers/index.ts L52）
- submitRequest.ts に `auditLogRepository` の文字列が一切存在しない（T-06 完了）
- TC-011 が `auditLogHandler.ts` 側の検証に切り替わっている（requestWorkflow.test.ts L126-139）
- typecheck / test / build / lint 全 phase green（verification-result.md 参照）

**アーキテクチャ評価**: dispatcher をドメイン層に維持しつつ tx を `unknown` 型でトンネリングする D2 の判断は正しい。ハンドラ（インフラ層）で `tx as Transaction` にキャストする設計により、ドメイン層の依存逆転を回避している。flushAsync 側で options を渡さないのも D5「tx はトランザクション完了後に無効」の設計意図通りで問題なし。

**指摘事項はいずれも low** であり、機能的な不具合や回帰リスクは存在しない。
