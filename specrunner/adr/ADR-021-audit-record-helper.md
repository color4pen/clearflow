# ADR-021: 監査ログ記録の型付きヘルパへの集約

- **Status**: accepted
- **Date**: 2026-06-27
- **Change**: audit-record-helper
- **Deciders**: architect

---

## Context

監査ログの記録は 44 ファイル・50 呼び出し箇所（usecase 43 + infrastructure handler 1）が `auditLogRepository.create` を直接呼び出していた。ADR-020 で `AuditAction`（46 種）/ `AuditTargetType`（15 種）/ `AuditMetadataMap` を型カタログとしてドメイン層に定義したが、記録呼び出し自体の集約点は存在せず、次の課題があった。

1. **metadata 型強制の欠如**: `AuditMetadataMap` に `action_item.toggle: { done: boolean }` が定義されているにもかかわらず、各呼び出しサイトでは `Record<string, unknown>` として素通しされており、型の恩恵が記録時に適用されていない
2. **横断的関心事の差し込み口がない**: 将来の記録機構変更（usecase からの責務剥離、イベント駆動化）を行う際の単一変更点が存在しない

ADR-020 の型カタログを記録呼び出しにまで貫通させ、将来のイベント駆動化への足場を設ける。

---

## Decisions

### D1: ヘルパの配置 — `src/application/services/auditRecorder.ts`

**Decision**: `recordAudit` ヘルパを `src/application/services/auditRecorder.ts` に定義する。

**Rationale**:
- ヘルパは `auditLogRepository.create` を呼ぶため、ドメイン層（infrastructure を import できない）には置けない
- `application/services/` には既に `clientContactService.ts`（repository を呼ぶ非 usecase サービス）が配置されており、慣例に合致する
- usecase と同階層の `usecases/` や utilities ファイルに置くより、サービス層の方が発見性・再利用性が高い

#### Alternative: `src/domain/services/` に配置

| | |
|---|---|
| **Pros** | ドメイン層に近い |
| **Cons** | domain → infrastructure の依存方向制約に違反する。`auditLogRepository.create` を呼ぶには infrastructure を import する必要がある |
| **Why not** | 依存方向の制約違反であり採用不可 |

#### Alternative: `src/infrastructure/` 直下に配置

| | |
|---|---|
| **Pros** | repository と同一層に置ける |
| **Cons** | 監査記録のオーケストレーション（どの usecase がいつ記録するか）はアプリケーション層の関心事であり、インフラ層の責務ではない |
| **Why not** | 責務の配置が誤り。usecase から infrastructure/services を直接参照する形になり、依存関係が複雑化する |

---

### D2: 条件付き型による metadata 強制

**Decision**: `AuditMetadataMap` に定義済みの action（現時点では `action_item.toggle`）について、`recordAudit` の metadata 引数を型で必須にする。未定義の action は metadata を省略可能にする（`never` にしない）。

```typescript
type AuditRecordParams<A extends AuditAction> = {
  action: A;
  targetType: AuditTargetType;
  targetId: string;
  actorId: string;
  organizationId: string;
} & (A extends keyof AuditMetadataMap
  ? { metadata: AuditMetadataMap[A] }
  : { metadata?: Record<string, unknown> | null });
```

**Rationale**:
- 既存 44 呼び出しサイトへの影響を最小化しつつ、既知の action に対する型安全性を段階的に高められる
- `never` にすると未定義 action への metadata 渡しが全てコンパイルエラーになり、既存コードの変更量が不釣合いに大きくなる
- `AuditMetadataMap` を拡充するだけで自然に強制される action が増える設計

#### Alternative: 全 action の metadata 型を網羅的に定義して `auditLogRepository.create` に generic を追加

| | |
|---|---|
| **Pros** | 全 action の metadata 型推論が得られる |
| **Cons** | 46 種すべての metadata 形の定義・維持コストが高く、全 44 呼び出しサイトへの影響が大きい |
| **Why not** | 変更規模が本 change のスコープを大幅に超える。将来 `AuditMetadataMap` が充実してから対応する |

#### Alternative: オーバーロードで action ごとに分岐

| | |
|---|---|
| **Pros** | 型定義の記述が直感的に見える |
| **Cons** | conditional type と比べて型推論の精度が低く、DX が劣る。action 追加のたびにオーバーロードを追記する必要がある |
| **Why not** | conditional type の方が型安全性・拡張性ともに優れる |

---

### D3: ヘルパ内部は `auditLogRepository.create` への純粋な委譲

**Decision**: `recordAudit` は追加ロジックを持たず、`auditLogRepository.create` に引数をそのまま委譲する。

**Rationale**:
- 「挙動不変」要件により、記録される値・トランザクション境界・件数を変えてはならない
- 純粋な委譲にしておくことで、将来のイベント駆動化時にこのヘルパを「差し込みポイント」として活用できる
- action-targetType 整合性チェック等の追加バリデーションはスコープ外であり、型レベルの安全性は D2 で確保済み

#### Alternative: ヘルパ内で action-targetType 整合性チェックを追加

| | |
|---|---|
| **Pros** | action と targetType の組み合わせ不整合（例: `action="deal.create"` かつ `targetType="invoice"`）をランタイムで検出できる |
| **Cons** | 「挙動不変」要件に違反する追加ロジックの混入になる。既存 50 呼び出しの引数はすべて整合しており、現時点でのリスクは低い |
| **Why not** | スコープ外。型レベルの安全性は D2 の conditional type で確保されている。action-targetType の整合性チェックを導入する場合は独立した change として設計すること |

---

### D4: 静的テストの更新方針

**Decision**: `auditLogRepository.create` の文字列存在を検査していた 7 テストファイル（35 アサーション）を `recordAudit` への参照検査に更新する。加えて、`auditLogRepository.create` がヘルパ実装以外のアプリ/インフラのソースに残っていないことを検証するガードテスト（`auditRecorder.test.ts`）を新設する。

**Rationale**:
- 移行後、usecase ソースから `auditLogRepository.create` が消えるため、既存の静的テストは意図を維持したまま検査対象を更新する必要がある
- ガードテストは移行完了の保証と将来の直接呼び出し再混入の防止を兼ねる
- テスト自体を削除すると監査ログ記録の存在保証が失われるため不適切

---

## Consequences

### Positive

- `recordAudit` が監査ログ記録の唯一の公式エントリポイントとして確立された。将来の記録機構変更（イベント駆動化・横断的処理の追加）は `auditRecorder.ts` 1 ファイルの変更で完結する
- `action_item.toggle` の metadata が型レベルで `{ done: boolean }` を必須とし、コンパイラが誤った metadata を検出する
- `AuditMetadataMap` を拡充するだけで型強制される action が自動的に増え、段階的な型安全化が実現できる
- 44 ファイル・50 呼び出しの機械的移行を typecheck + ガードテストで保証し、引数の転記ミスをコンパイルエラーとして検出できる

### Negative / Trade-offs

- **infrastructure → application の依存**: `infrastructure/handlers/auditLogHandler.ts` が `application/services/auditRecorder` を import しており、依存方向が逆向きになっている（通常は `actions → usecases → domain / repositories`）。D1 で conscious choice として選択されたが、構造的な例外が発生している
- **metadata の部分的型強制**: `AuditMetadataMap` に定義されていない 45 action の metadata は型的に自由であり、型の恩恵が限定的

### Risks

- **50 呼び出しの機械的置換での引数転記ミス**: typecheck + 既存テスト全件 green で検出。引数の型は現行と同一のため、型エラーが出れば即座に気付ける
- **静的テスト 35 アサーションの更新漏れ**: ガードテスト（`auditLogRepository.create` がヘルパ以外に残っていないこと）を最初に設置し、移行中に検出できるようにする

### Known Design Debt

- `infrastructure/handlers/auditLogHandler.ts` の依存方向（infrastructure → application）は、記録機構のイベント駆動化リファクタリング（別 change）で handler を `application/` 側へ移動することで自然解消される予定。現時点では即時修正不要（review-feedback-001 F-01）

---

## Constraints for Future Changes

- **監査ログを記録するコードは `recordAudit` 経由で行うこと**: `auditLogRepository.create` を usecase / handler から直接呼び出すことを禁止する。ガードテストが違反をコンパイル時に検出する
- **新 action の metadata 型化**: 新たに metadata 形が定まった action は `AuditMetadataMap` に追記すること。追記のみで `recordAudit` の型強制が自動的に有効になる
- **イベント駆動化への移行**: 本 change で確立した `recordAudit` を変更点として使用すること（ADR-017 参照）。`auditLogHandler.ts` の配置変更を合わせて検討すること

---

## References

- `specrunner/changes/audit-record-helper/design.md` — 詳細設計（D1〜D5）
- `specrunner/changes/audit-record-helper/request.md` — 要件定義
- `specrunner/changes/audit-record-helper/review-feedback-001.md` — コードレビュー所見（approved, score 9.30）
- `src/application/services/auditRecorder.ts` — `recordAudit` 実装
- `src/__tests__/static/auditRecorder.test.ts` — 型テスト・ガードテスト
- `specrunner/adr/ADR-020-audit-action-type-catalog.md` — 型カタログの確立（本変更の前提）
- `specrunner/adr/ADR-017-domain-event-dispatcher.md` — 記録機構のイベント駆動化（本変更の後継候補）
