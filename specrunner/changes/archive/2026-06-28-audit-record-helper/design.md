# Design: 監査ログ記録の型付きヘルパへの集約

## Context

監査ログの記録は 44 ファイル・50 呼び出し箇所で `auditLogRepository.create` を直接呼んでいる。
action / targetType の型カタログ（`AuditAction` / `AuditTargetType`）は `src/domain/models/auditLog.ts` に定義済みだが、記録呼び出し自体に単一集約点がなく、以下の課題がある。

- metadata の型強制が効いていない（`AuditMetadataMap` に `action_item.toggle: { done: boolean }` が定義済みだが、呼び出し側では `Record<string, unknown>` として素通し）
- 横断的関心事（将来のイベント駆動化等）を差し込む起点がない

### 現行の呼び出しパターン

```
await auditLogRepository.create(
  { action, targetType, targetId, actorId, organizationId, metadata? },
  tx?
);
```

- 43 usecase ファイル（49 呼び出し）＋ 1 infrastructure handler（1 呼び出し）= 合計 50 呼び出し
- `updateInquiryStatus` は 4 呼び出し、`approveRequest` は 3、`rejectRequest` は 2。他は 1 呼び出し
- 7 テストファイルに `auditLogRepository.create` 文字列を検査する静的テスト（35 アサーション）が存在

### 読み取り側

`getRecentActivities.ts` / `getDealActivity.ts` / `listAuditLogs.ts` / `audit-logs/export/route.ts` は `auditLogRepository` の読み取り関数のみを使用。これらは移行対象外。

## Goals / Non-Goals

**Goals**:

- G1: 監査ログ記録の単一エントリポイント `recordAudit` を application service 層に新設する
- G2: `AuditMetadataMap` で既知形がある action について metadata 引数を型レベルで強制する
- G3: 全 50 呼び出しを `recordAudit` 経由に置き換える
- G4: 記録される値・トランザクション境界・挙動を完全に維持する

**Non-Goals**:

- 記録のイベント駆動化（usecase → ドメインイベント → handler 構成への移行は別リクエスト）
- 監査記録の対象範囲・粒度・文字列値の変更
- 読み取り側（`findByTargets` / `findByOrganization` / `activityLabels` 等）の変更

## Decisions

### D1: ヘルパの配置 — `src/application/services/auditRecorder.ts`

**Rationale**: ヘルパは `auditLogRepository.create` を呼ぶため、永続化を知らない `domain/services` には置けない。`application/services` には既に repository を呼ぶ `clientContactService.ts` が配置されており、慣例に合致する。

**Alternatives considered**:
- `domain/services/` — 依存方向の制約（domain → infrastructure は不可）に違反するため不可
- `infrastructure/` 直下 — 記録はアプリケーション層のオーケストレーション関心事であり、インフラ層の責務ではない
- usecase 同階層のユーティリティ — サービス層に置く方が発見性・再利用性が高い

### D2: 条件付き型による metadata 強制

**Rationale**: `AuditMetadataMap` に定義済みの action（現時点では `action_item.toggle`）について、metadata 引数を型で必須にする。未定義の action は従来通り任意 metadata を許す。これにより、既存コードの変更量を最小化しつつ、既知の action に対する型安全性を段階的に高められる。

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

**Alternatives considered**:
- 全 action に対する metadata 型の網羅定義 — 現時点では 1 action のみ定義済みであり、段階的に拡張する方が安全
- metadata をオーバーロードで分岐 — conditional type の方が型推論と DX に優れる

### D3: ヘルパ内部は `auditLogRepository.create` への純粋な委譲

**Rationale**: 挙動不変の制約上、ヘルパは追加ロジック（バリデーション等）を持たず `auditLogRepository.create` へそのまま委譲する。将来のイベント駆動化時にこのヘルパが拡張点となる。

**Alternatives considered**:
- ヘルパ内で action-targetType の整合性チェックを追加 — スコープ外（挙動変更を伴う）。型レベルでの安全性は D2 で確保

### D4: 静的テストの更新方針

**Rationale**: 既存の 7 テストファイル（35 アサーション）は `auditLogRepository.create` 文字列の存在をソースコード上で検査している。移行後、usecase ソースにはこの文字列が存在しなくなるため、これらのテストは `recordAudit` への参照検査に更新する。加えて、`auditLogRepository.create` がヘルパ実装以外に残っていないことを検証するガードテストを新設する。

**Alternatives considered**:
- テストを削除 — 監査ログ記録の存在保証は重要であり、削除は不適切

### D5: `auditLogRepository` の読み取り専用利用ファイルは変更しない

**Rationale**: `getRecentActivities.ts` / `getDealActivity.ts` / `listAuditLogs.ts` / `audit-logs/export/route.ts` は `auditLogRepository` の読み取り関数のみを使用する。import 文に `auditLogRepository` が残るのは正常であり、ガードテストでは `.create` 呼び出しの有無のみを検査する。

## Risks / Trade-offs

- [Risk] 50 呼び出しの機械的置換で引数の転記ミスが発生し得る → テスト全件 green + typecheck で検出。各サイトの引数は現行と同一のため、型エラーが出れば即座に気付ける
- [Risk] 静的テスト 35 アサーションの更新漏れ → ガードテスト（`auditLogRepository.create` がヘルパ以外に残っていないこと）を最初に書き、移行中に検出できるようにする
- [Trade-off] metadata の型強制は `AuditMetadataMap` に定義済みの action のみ。未定義の action は型的に自由 → 段階的に `AuditMetadataMap` を拡充すれば自然に強化される

## Open Questions

なし（調査で全容を確認済み）
