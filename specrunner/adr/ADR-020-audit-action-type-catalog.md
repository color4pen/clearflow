# ADR-020: 監査ログ action / targetType の型カタログ化

- **Status**: accepted
- **Date**: 2026-06-27
- **Change**: audit-action-catalog
- **Deciders**: architect

---

## Context

監査ログは全ドメインの状態変更を記録する横断的基盤であり、43 usecase と 1 infrastructure handler（計 44 箇所）が `auditLogRepository.create` を呼び出し、6 箇所が `action` / `targetType` 語彙を消費している。しかし `AuditLog.action` / `targetType` は `string` 型で、許可値の型制約が存在しなかった。

この構造が次の問題を引き起こしていた。

1. **タイポ・表記ドリフトをコンパイラが検出できない**: 実際に `invoice.update_status`（snake_case）と `contract.updateStatus` / `user.updateRole`（camelCase）の混在が存在し、規約が不統一のまま凍結されていた
2. **消費側の語彙が記録側とドリフトする**: `activityLabels.ts` 等の消費側は語彙を grep で手作業再現するしかなく、過去にアクティビティのアクションラベル不一致バグが発生している
3. **将来の消費側拡張で負債が拡大する**: 通知チャネル（ADR-017）など消費側が増えるほど、未構造の文字列語彙との接点が増加する

本変更では、`AuditAction`（46 種）と `AuditTargetType`（15 種）をドメイン層の型として一元定義し、記録側と消費側の両方をその型に従わせることで、許可外の値をコンパイルエラーにする。

---

## Decisions

### D1: カタログの配置場所 — `src/domain/models/auditLog.ts` に共存

**Decision**: `AuditAction` / `AuditTargetType` / `AuditMetadataMap` を `AuditLog` モデルと同一ファイル（`src/domain/models/auditLog.ts`）に定義する。

**Rationale**:
- カタログは `AuditLog` モデルの語彙そのものであり、モデル定義と不可分
- 46 action + 15 targetType は同一ファイルに収まる量であり、分離のメリットがない
- 利用箇所は常に `auditLog.ts` と一緒に参照するため、別ファイルへの分離は import パスを増やすだけになる

#### Alternative: `src/domain/models/auditCatalog.ts` として分離

| | |
|---|---|
| **Pros** | 単一ファイルの行数を抑えられる |
| **Cons** | モデルとカタログを常に一緒に参照するため import パスが増え、「カタログの場所」というトリビアルな知識が必要になる |
| **Why not** | 分離のメリットがなく、認知負荷を増やすのみ |

---

### D2: 型表現 — 文字列リテラルユニオン型

**Decision**: `AuditAction` / `AuditTargetType` を TypeScript の文字列リテラルユニオン型として定義する。

```typescript
export type AuditAction =
  | "deal.create"
  | "deal.update"
  | ...;

export type AuditTargetType =
  | "deal"
  | "contract"
  | ...;
```

**Rationale**:
- 本変更の目的はコンパイル時の型制約のみであり、ランタイムでの語彙一覧取得は不要
- シンプルなユニオン型で要件を満たせ、実装者の認知負荷が低い
- 将来ランタイム検証が必要になれば `as const` 配列に移行可能

#### Alternative: `as const` 配列 + `typeof arr[number]`

| | |
|---|---|
| **Pros** | ランタイムで語彙一覧を取得できる（バリデーション・UI 列挙等に有用） |
| **Cons** | 本変更ではランタイム語彙取得の用途がなくオーバースペック |
| **Why not** | 必要になれば後から追加可能。現時点では不要な複雑性を増やさない |

---

### D3: `getActionLabel` の引数型 — `string` を維持

**Decision**: `getActionLabel` の `action` パラメータを `string` 型のまま維持し、`AuditAction` に狭めない。

**Rationale**:
- `getActionLabel` は DB から読み取った `AuditLog` データを処理する。DB カラムは `text` 型であり、歴史的にカタログ外の値が含まれる可能性がある
- 既存の `"unknown.action"` フォールバックテストがこの動作を前提としており、引数型を `AuditAction` に狭めるとコンパイルエラーになる
- DB 読み取り値を渡す際にキャストが必要になり、型安全性の見た目が上がる一方で実質的なリスクが増す
- ラベル表のキー制約（D4）により「記録側とラベル側のドリフト防止」は達成されるため、引数型を狭める必要がない

#### Alternative: `action: AuditAction` に狭める

| | |
|---|---|
| **Pros** | 関数シグネチャが型安全に見える |
| **Cons** | DB 読み取り値は `string` のため、渡す側でキャストが必要になる。既存のフォールバックテストが壊れる |
| **Why not** | DB 読み取り境界での型安全性は型アサーション（D6）で対処済み。`getActionLabel` での再度の狭め化は不要かつ有害 |

---

### D4: ラベル表の型制約 — `Partial<Record<AuditAction, string>>`

**Decision**: `ACTION_LABELS` を `Partial<Record<AuditAction, string>>` として型付けする。

```typescript
const ACTION_LABELS: Partial<Record<AuditAction, string>> = {
  "deal.create": "案件を作成",
  ...
};
```

**Rationale**:
- 全 46 action のうちラベルが定義されているのは 17 種のみ。`Record<AuditAction, string>` では全キー必須になるため不適切
- `Partial<...>` により、ラベルを持つ action のみ定義しつつ、カタログ外のキー（タイポ等）はコンパイルエラーにできる
- 記録側とラベル側のドリフトをコンパイル時に検出できるという要件を満たす

---

### D5: metadata 型化のアプローチ — 最小限の型マップ

**Decision**: `AuditMetadataMap` 型を定義し、`action_item.toggle` の metadata 形を `{ done: boolean }` として表す。他の action の metadata は `Record<string, unknown> | null` のまま維持する。

```typescript
export type AuditMetadataMap = {
  "action_item.toggle": { done: boolean };
};
```

`auditLogRepository.create` のシグネチャは `metadata?: Record<string, unknown> | null` を維持し、`action_item.toggle` の metadata 型は静的テストで検証する。

**Rationale**:
- 全 46 action の metadata 形を網羅的に型化すると定義・維持コストが高く、本変更のスコープを大幅に超える
- 要件は「最低限 `action_item.toggle`」と明示しており、段階的に拡張可能な設計とする
- `create` のシグネチャを conditional type にすると全 44 呼び出しサイトに影響し、変更規模が不釣合いに大きくなる

#### Alternative: discriminated union で全 action の metadata 型を定義し `create` に generic を追加

| | |
|---|---|
| **Pros** | action ごとの metadata 型推論が得られる |
| **Cons** | 全 44 呼び出しサイトへの影響。46 種それぞれの metadata 形の定義・維持コストが高い |
| **Why not** | 本変更の規模を大幅に超える。将来の別リクエストとして計画すること |

---

### D6: DB ⇔ ドメインモデル境界の型変換 — 型アサーションを使用

**Decision**: Drizzle スキーマの `action: text(...)` / `target_type: text(...)` カラムは変更しない。リポジトリの DB → ドメインモデルマッピングで `row.action as AuditAction` / `row.targetType as AuditTargetType` の型アサーションを使用する。

**Rationale**:
- 書き込みパス（`create`）が `AuditAction` / `AuditTargetType` 型で制約されているため、DB に格納される値は常にカタログ内の値となる。読み取り時のアサーションは安全
- Drizzle スキーマの `text(...)` を pgEnum に変更する方法もあるが、DB マイグレーションが必要になりスコープ外
- 「挙動不変」の要件（既存 audit_logs 行の値を変更しない）との整合が難しくなる

#### Alternative: Drizzle スキーマで `pgEnum` を使用

| | |
|---|---|
| **Pros** | DB レベルで無効な値が拒否される |
| **Cons** | マイグレーションが必要。既存の全 audit_logs 行が pgEnum の制約チェックの対象になる。スコープ外 |
| **Why not** | DB スキーマ変更は「挙動不変」の制約およびスコープ外定義と矛盾する |

---

## Consequences

### Positive

- `AuditAction`（46 種）と `AuditTargetType`（15 種）が単一の正（Single Source of Truth）として確立された。タイポや表記ドリフトはコンパイルエラーとして即座に検出される
- 全 44 記録サイト（application 43 + infrastructure handler 1）が typecheck を通じてカタログに適合することが保証される
- `activityLabels.ts` のラベル表キーが `AuditAction` 型で制約され、記録側とラベル側のドリフトがコンパイル時に検出可能になった
- 将来の消費側（通知・エクスポート等）が語彙を grep で再現する必要がなくなった
- 既存の audit_logs テーブルに記録される文字列値は完全に不変であり、ランタイム挙動への影響がない

### Negative / Trade-offs

- **新 action 追加時の手順が増加**: usecase に `action` を追加するだけでなく、`AuditAction` カタログへの追記が必要になる。ただし追記漏れはコンパイルエラーとして即座に検出される
- **型アサーション (`as AuditAction`) の安全性**: DB 読み取り時に型アサーションを使用している。書き込みパスがカタログ型で制約されているため安全だが、歴史的不整合が存在した場合は `getActionLabel` のフォールバック処理が吸収する
- **metadata の部分的型化**: `AuditMetadataMap` は `action_item.toggle` のみを型化しており、残りの 45 action の metadata は `Record<string, unknown> | null`。型の恩恵が限定的だが、変更規模を抑制できる

### Constraints for future changes

- **新 action の追加時**: `src/domain/models/auditLog.ts` の `AuditAction` ユニオン型にリテラルを追加すること。追記なしに usecase で使用するとコンパイルエラーになる。新規 action の命名は `<entity>.<camelVerb>` 規約に従うこと（例: `deal.archive`）。既存の `invoice.update_status` は歴史的値のため snake_case のまま維持する
- **新 targetType の追加時**: `src/domain/models/auditLog.ts` の `AuditTargetType` ユニオン型にリテラルを追加すること
- **消費側の新実装**: 監査ログの `action` / `targetType` 語彙を使用する新たな消費側（通知・集計・エクスポート等）は、独自にリテラルをハードコードせず `AuditAction` / `AuditTargetType` をインポートして使用すること
- **ラベル表への追加**: `activityLabels.ts` の `ACTION_LABELS` にキーを追加する場合、`AuditAction` に含まれるリテラルのみ使用できる。カタログ外のキーはコンパイルエラーになる
- **DB スキーマの変更禁止**: `audit_logs.action` / `audit_logs.target_type` を pgEnum に変更する場合は、既存全行の値がカタログに適合しているか検証した上で差分マイグレーションを計画すること（本変更のスコープ外）
- **記録機構のイベント駆動化**: 本変更は「usecase → ドメインイベント → 単一 handler への集約」への移行の土台となる。イベント駆動化を行う場合は本カタログ型を handler 側に引き継ぐこと（ADR-017 参照）
- **`getActionLabel` の引数型**: `getActionLabel` の引数型を `AuditAction` に狭めないこと。DB 読み取り値の型安全性は `as AuditAction` アサーション（D6）で確保されており、引数型を狭めると既存のフォールバックテストが壊れる（D3 参照）

---

## References

- `specrunner/changes/audit-action-catalog/design.md` — 詳細設計（D1〜D6）
- `specrunner/changes/audit-action-catalog/request.md` — 要件定義
- `specrunner/changes/audit-action-catalog/review-feedback-001.md` — コードレビュー所見（approved, score 9.40）
- `src/domain/models/auditLog.ts` — `AuditAction`（46 種）/ `AuditTargetType`（15 種）/ `AuditMetadataMap` 型定義
- `src/domain/repositories/auditLogRepository.ts` — `create` パラメータ型の `AuditAction` / `AuditTargetType` 制約
- `src/lib/activityLabels.ts` — `ACTION_LABELS: Partial<Record<AuditAction, string>>` 型制約
- `src/__tests__/static/projectStructure.test.ts` — 静的型検証テスト（監査ログ action/targetType 型カタログ）
- `specrunner/adr/ADR-017-domain-event-dispatcher.md` — 記録機構のイベント駆動化（本変更の「上物」候補）
- `specrunner/adr/ADR-019-deal-activity-timeline.md` — 監査語彙の消費側実装（`activityLabels.ts` の先行実装）
