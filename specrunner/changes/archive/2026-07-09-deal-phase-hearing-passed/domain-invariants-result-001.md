# Domain Invariants Review: deal-phase-hearing-passed

- **reviewer**: domain-invariants
- **iteration**: 1
- **verdict**: approved

---

## Purpose

テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。

---

## Scope of Changes

46 ファイル変更（6,029 行追加、39 行削除）。影響範囲はドメインモデル・インフラ・UI・テスト・設計文書に及ぶ。

---

## Findings

### INV-01: `inv-deal-terminal-irreversible` — passed の不可逆性 ✅ PASS

- `dealTransition.ts`: `TERMINAL_PHASES = ["won", "lost", "passed"]` — `passed` が正しく終端に追加されている
- `canTransition()`: `TERMINAL_PHASES.includes(from)` で `passed` からの全遷移を拒否
- `DealPhaseStepper.tsx`: `isTerminal = phase === "won" || phase === "lost" || phase === "passed"` — 終端判定に `passed` を含み、遷移ボタンを非表示にする
- `ConfirmDialog`: `"確定後はフェーズを戻せません。"` を `passed` でも表示
- テスト: `dealTransition.test.ts` で `passed → *` の全拒否（T-00f〜T-00i）、全非終端 → `passed` の全許可（T-00j）を網羅

**判定**: won/lost と同等の不可逆保護が passed に適用されている。

---

### INV-02: `inv-all-tenant-scoped` — テナント分離 ✅ PASS

- `dealRepository.ts`: `findById` / `findAllByOrganization` / `updatePhase` / `deleteById` / `searchByTitle` 全関数で `eq(deals.organizationId, organizationId)` を WHERE に必ず含む
- `updateDealPhase.ts`: `findById(data.dealId, data.organizationId)` / `updatePhase(id, data.organizationId, ...)` — organizationId を境界として双方で適用
- `deal.passed` イベントのディスパッチにも `organizationId` を含む（L80–89）
- `webhookHandler.ts`: `deliverDomainEventToEndpoints(organizationId, "deal.passed", ...)` — Webhook 配信はテナント別エンドポイントのみに限定
- `mcp/tools/deals.ts`: `organizationId` をセッションの `authInfo` から取得し、ユーザー入力から受け付けない設計を維持

**判定**: 既存のテナント分離パターンを逸脱する変更は一切なし。

---

### INV-03: `inv-audit-log-append-only` — 監査ログの追記専用性 ✅ PASS

- `updateDealPhase.ts`: `recordAudit({ action: "deal.updatePhase", ..., metadata: { fromPhase, toPhase } }, tx)` — `passed` 遷移を含む全フェーズ変更でトランザクション内に同期記録
- `auditLogRepository.ts`: `create` のみ。`update` / `delete` 操作は存在しない（既存パターン）
- 記録には `organizationId` / `actorId` / `fromPhase` / `toPhase` が含まれ、見送りの経緯を再現可能な粒度で保存

**判定**: `passed` 遷移の監査証跡は他フェーズと同等の完全性で記録される。

---

### INV-04: `inv-contract-requires-won-deal` — 契約は受注済み案件のみ ✅ PASS

- `createContract.ts` L33: `if (deal.phase !== "won")` — 厳格等価比較。`passed` を含む won 以外のフェーズは契約作成を拒否
- `passed` は lost と同様に「死んだ案件」であり、契約作成経路に到達できない

**判定**: 既存の不変条件は破壊されていない。

---

### INV-05: 承認ワークフローの不変条件 ✅ PASS (変更なし)

- `inv-approval-evaluate-all-policies` / `inv-system-approval-blocks-action` / `inv-post-approval-same-tx` / `inv-approval-steps-sequential` / `inv-approver-role-or-id` のいずれも本変更の影響範囲外
- 承認関連ユースケース・ドメインモデルへの変更なし

**判定**: 承認ワークフローの不変条件は維持される。

---

### INV-06: `passed` の権限 — closePhase 要求 ✅ PASS

- `app/actions/deals.ts`: `isTerminalPhase = newPhase === "won" || newPhase === "lost" || newPhase === "passed"` → `closePhase`（admin/manager）を要求
- `mcp/tools/deals.ts`: 同一パターンで `closePhase` を要求
- `authorization.ts`: `deal.closePhase` = `ADMIN_MANAGER` = `["admin", "manager"]`
- テスト: `mcpAuthorization.test.ts` TC-033 / TC-015 で静的検証

**判定**: `passed` へのフェーズ変更は admin/manager のみが実行可能。member は changePhase では passed に到達できない。

---

### INV-07: イベントの整合性と Webhook 配信 ✅ PASS

- `events/types.ts`: `DealPassed` 型と `DomainEvent` union への追加
- `webhookEvent.ts`: `WEBHOOK_EVENT_TYPES` に `"deal.passed"` を追加（19 → 19 要素, 既存テストに合致）
- `webhookHandler.ts`: `case "deal.passed":` が `default: never` の前に追加され、exhaustive switch の網羅性を維持
- `handlers/index.ts`: `allEventTypes` に `"deal.passed"` を追加
- テスト: `webhookWorkflow.test.ts` の `newDomainEvents` 配列に `"deal.passed"` を含む。`deliverDomainEventToEndpoints` 経由配信のテストが通過する

**判定**: `deal.passed` イベントはトランザクション内でディスパッチされ、フラッシュ後に非同期配信される正しいパターンで実装されている。

---

### INV-08: 設計層（aozu）との整合 ✅ PASS

- `design/domain/model.md` [`ent-deal`]: phase 7 値列 / 初期フェーズ hearing / 終端 won/lost/passed を明記
- `design/domain/invariants.md` [`inv-deal-terminal-irreversible`]: `won / lost / passed は終端` に更新
- `design/domain/glossary.md` [`term-terminal-state`]: `案件の won/lost/passed（見送り）` を追記。lost との意味的区別も記載
- `design/domain/model.md` [`ent-domain-event`]: `deal.passed（見送り）` を業務イベントとして明記

**判定**: 実装と設計文書が整合している。

---

## Minor Observations (非ブロッカー)

1. **`ConfirmDialog` variant の微差**: `pendingTerminal === "passed"` のとき `variant="primary"` が使用される。design では `"default" または "primary"` と記載されており実装は適法。中立色の意図には `"default"` がより自然かもしれないが、機能的問題はない。
2. **静的解析テストの比率**: テストの多くはソース静的解析（`readFile` + `toContain`）。ドメイン状態機械テスト（`dealTransition.test.ts`）のみ純粋関数の動作検証。データベースを伴う統合テストは本変更のスコープ外であり、設計の意図（verification-result.md 参照）と一致する。

---

## Summary

本変更において、ドメイン不変条件の違反は検出されなかった。

| 不変条件 | 状態 |
|---|---|
| `inv-deal-terminal-irreversible` — passed の不可逆 | ✅ PASS |
| `inv-all-tenant-scoped` — テナント分離 | ✅ PASS |
| `inv-audit-log-append-only` — 監査ログ追記専用 | ✅ PASS |
| `inv-contract-requires-won-deal` — 契約は won のみ | ✅ PASS |
| 承認ワークフロー不変条件 | ✅ PASS (変更なし) |
| `passed` の権限（closePhase） | ✅ PASS |
| イベント整合性と Webhook 配信 | ✅ PASS |
| 設計層との整合 | ✅ PASS |

- **verdict**: approved
