# Design: audit-action-catalog

## Context

監査ログの `action` / `targetType` は全 usecase（43 箇所）と infrastructure handler（1 箇所）がインライン文字列リテラルで `auditLogRepository.create` に渡しており、中央カタログが存在しない。`AuditLog.action` / `targetType` は `string` 型で、許可値の制約がない。

消費側（`activityLabels.ts` 等 6 箇所）も独自に文字列リテラルをハードコードしており、記録側とのドリフトを型で防止できない。

コード走査の結果、実コードの語彙は以下のとおり：

- **action**: 46 種（deal.\* / contract.\* / invoice.\* / meeting.\* / action_item.\* / inquiry.\* / request.\* / approval_step.\* / delegation.\* / policy.\* / template.\* / revenue_target.\* / client.\* / client_contact.\* / user.\*）
- **targetType**: 15 種（action_item / approvalPolicy / client / client_contact / contract / deal / deal_contact / delegation / inquiry / invoice / meeting / request / revenue_target / template / user）

命名不統一（`invoice.update_status` = snake_case、他は camelCase）が存在するが、既存 DB データの書き換えはスコープ外のため、既存値をそのままカタログに含める。

## Goals / Non-Goals

**Goals**:

1. `AuditAction`（46 種）と `AuditTargetType`（15 種）を `src/domain/models/auditLog.ts` に型として一元定義し、監査語彙の単一の正（Single Source of Truth）とする
2. `AuditLog` モデルと `auditLogRepository.create` のパラメータを上記カタログ型で制約し、許可外の値をコンパイルエラーにする
3. `activityLabels.ts` のラベル表キーを `AuditAction` 型で制約し、記録側とラベル側のドリフトをコンパイルで検出可能にする
4. `action_item.toggle` の metadata 形を型として表す
5. 記録される文字列値と挙動を完全に不変に保つ

**Non-Goals**:

- 既存 audit_logs 行の `action` 文字列の書き換え
- 記録機構のイベント駆動化（usecase → ドメインイベント → 単一 handler）
- 監査記録の対象範囲・粒度の変更
- `findByOrganization` / `findByTargets` 等のクエリフィルタパラメータの型制約（外部入力を受け取るため `string` のまま維持）
- Drizzle スキーマ (DB カラム型) の変更

## Decisions

### D1: カタログの配置場所 — `src/domain/models/auditLog.ts` に共存

`AuditAction` / `AuditTargetType` を `AuditLog` モデルと同一ファイルに定義する。

**Rationale**: カタログは `AuditLog` モデルの語彙そのものであり、モデル定義と不可分。別ファイル（`auditCatalog.ts` 等）に分離するとインポート元が増え、「カタログの場所」というトリビアルな知識が必要になる。46 action + 15 targetType は同一ファイルに収まる量であり、分離のメリットがない。

**Alternatives considered**:
- `src/domain/models/auditCatalog.ts` — ファイル分離は可能だが、利用箇所は常に `auditLog.ts` と一緒に参照するため、分離のメリットがなく import パスが増える

### D2: 型表現 — 文字列リテラルユニオン型

`AuditAction` / `AuditTargetType` を TypeScript の文字列リテラルユニオン型として定義する。

```typescript
export type AuditAction =
  | "deal.create"
  | "deal.update"
  | ...;
```

**Rationale**: ランタイム配列（`as const` + `typeof arr[number]`）は反復・ランタイム検証に有用だが、本変更ではランタイム検証は不要（DB スキーマ側の制約ではなくコンパイル時の型制約のみ）。シンプルなユニオン型で十分であり、実装者の認知負荷が低い。

**Alternatives considered**:
- `as const` 配列 + `typeof arr[number]` — ランタイムで語彙一覧を取得できるが、本変更ではその用途がないためオーバースペック。将来必要になれば後から追加可能

### D3: `getActionLabel` の引数型 — `string` を維持

`getActionLabel` の `action` パラメータは `string` のまま維持し、`AuditAction` に狭めない。

**Rationale**: `getActionLabel` は DB から読み取った `AuditLog` データを処理する。DB カラムは `text` 型で、歴史的にカタログ外の値が入る可能性がある（既存の「unknown.action フォールバック」テストがこれを想定）。引数型を `AuditAction` に狭めると：
1. 既存の `activityLabels.test.ts` の `"unknown.action"` テストがコンパイルエラーになる（AC4 違反）
2. DB から読み取った値を渡す際にキャストが必要になり、型安全性が低下する

ラベル表のキー制約（D4）で「記録側とラベル側のドリフト防止」は達成される。

**Alternatives considered**:
- `action: AuditAction` — 型安全だが、フォールバック処理と既存テストが壊れる。DB 読み取り側は `string` が自然

### D4: ラベル表の型制約 — `Partial<Record<AuditAction, string>>`

`ACTION_LABELS` を `Partial<Record<AuditAction, string>>` として型付けする。

**Rationale**: 全 46 action のうちラベルが定義されているのは 17 種のみ。`Record<AuditAction, string>` では全キー必須になるため不適切。`Partial<...>` により、ラベルを持つ action のみ定義しつつ、カタログ外のキー（タイポ等）はコンパイルエラーにできる。

### D5: metadata 型化のアプローチ — 最小限の型マップ

`AuditMetadataMap` 型を定義し、`action_item.toggle` の metadata 形を `{ done: boolean }` として表す。

```typescript
export type AuditMetadataMap = {
  "action_item.toggle": { done: boolean };
};
```

他の action の metadata は `Record<string, unknown> | null` のまま維持する。`auditLogRepository.create` のパラメータ型は `metadata?: Record<string, unknown> | null` を維持し、`action_item.toggle` の metadata 型は静的テストで検証する。

**Rationale**: 全 action の metadata 形を網羅的に型化すると、46 種それぞれの形を定義・維持するコストが高く、本変更のスコープを大幅に超える。要件は「最低限 `action_item.toggle`」と明示しており、段階的に拡張可能な設計とする。`create` のシグネチャを conditional type にすると全呼び出しサイトに影響し、変更規模が不釣合いに大きくなる。

**Alternatives considered**:
- 全 action の metadata 型を discriminated union で定義し、`create` に generic 型パラメータを追加 — 本変更の規模を大幅に超え、全 44 箇所の呼び出しサイトに影響する
- `create` のシグネチャに `A extends AuditAction` ジェネリクスを追加 — action ごとの metadata 型推論は便利だが、既存コードへの影響が大きい

### D6: DB ⇔ ドメインモデル境界の型変換

Drizzle スキーマの `action: text(...)` は変更しない。リポジトリの DB → ドメインモデルマッピングで `row.action as AuditAction` / `row.targetType as AuditTargetType` の型アサーションを使用する。

**Rationale**: DB カラムは `text` 型のままで十分。書き込みパス（`create`）がカタログ型で制約されているため、DB に格納される値は常にカタログ内の値となる。読み取り時のアサーションは安全である（自身が書いた値を読み戻すだけ）。Drizzle の `text(...)` を enum に変更する方法もあるが、DB マイグレーションが必要になりスコープ外。

**Alternatives considered**:
- Drizzle スキーマで `pgEnum` を使用 — DB マイグレーションが必要になり、「挙動不変」の制約との整合が難しい

## Risks / Trade-offs

- **[Risk] 型アサーション (`as AuditAction`) の安全性** → Mitigation: 書き込みパスがカタログ型で制約されているため、DB に格納される値は常にカタログ内。万一の歴史的不整合は `getActionLabel` のフォールバック処理が吸収する

- **[Risk] 新 action 追加時の手順増加** → Mitigation: カタログへの追加漏れはコンパイルエラーとして即座に検出される。手順書（コメント or ADR）で「action 追加時はカタログに追記」を明示する

- **[Trade-off] metadata の部分的型化** → 最低限（`action_item.toggle`）のみ型化し、残りは `Record<string, unknown> | null`。全型化は将来の拡張に委ねる。型の恩恵が限定的だが、変更規模を抑制できる

## Open Questions

（なし — request-review で指摘された 3 点は D3, D4, D5 で解決済み）
