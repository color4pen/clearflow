# Design: 案件アクティビティの厳選表示（タイムライン）

## Context

案件詳細の「アクティビティ」セクションは、監査ログ（`auditLogRepository.findByTargets`）を無選別に全件表示している。`getDealActivity` usecase は `action_item` / `deal_contact` を含む全ターゲットを取得対象とし、`ACTIVITY_TIMELINE_LIMIT`(=30) を DB 取得時に適用しているため、フェーズ変更の連発やタスクのトグル往復が混在してノイズが多い。

設計文書（`docs/design/01-domain-design.md` §7.2）とユビキタス言語辞書の「タイムラインの構成概念」に従い、タイムラインを「顧客接点 + 業務イベントの厳選表示」に変更する。

現状の主要な課題:
1. `getDealActivity` が `action_item` / `deal_contact` を取得対象に含んでいる
2. DB 取得時に `limit` を適用しているため、集約前にエントリが切り捨てられる
3. `updateInvoiceStatus` は `recordAudit` で metadata（from/to）を記録していない
4. `AuditMetadataMap` に状態遷移系アクションのエントリがない（型安全でない）
5. 連続する同一操作や状態遷移を集約する仕組みがない
6. `DealActivitySection` は生の `AuditLog` をそのまま表示しており、集約結果を扱えない

## Goals / Non-Goals

**Goals**:

- 監査ログを「顧客接点」「業務イベント」「除外」に分類し、タイムラインには前者 2 つのみ表示する
- `getDealActivity` の取得対象から `action_item` / `deal_contact` を除外する（取得しない）
- 連続する同一操作の集約（件数表示）と連続する状態遷移の正味遷移への集約を行う
- 件数上限を「取得 → 厳選・集約 → 上限適用」の順で適用する
- 状態遷移系アクション（`deal.updatePhase` / `contract.updateStatus` / `invoice.update_status`）の「変更前 → 変更後」表示
- `invoice.update_status` の metadata に `{ fromStatus, toStatus }` を記録する
- `AuditMetadataMap` に状態遷移系 3 アクションのエントリを追加し型安全に扱う
- 表示対象アクションの全ラベル整備（生キー漏れ防止）
- 既存テストを新仕様に追従し、動的テスト（`.dynamic.test.ts`）で振る舞いを固定する

**Non-Goals**:

- スキーマ変更（テーブル / カラム / enum の追加・変更）
- 顧客接点（Interaction）のエンティティ化・Meeting の一般化
- 新しい顧客接点 type の追加
- 監査ログの別画面（履歴/監査ビュー）化
- 売掛金・督促・回収

## Decisions

### D1: タイムラインの表示対象分類をコードの固定定数で定義する

**決定**: 表示対象アクションのホワイトリストを `src/lib/activityConfig.ts` に定数として定義し、`getDealActivity` で `includeActions` オプションとして `findByTargets` に渡す。

**Rationale**: `excludeActions`（ブラックリスト）方式では新しいアクションが追加されるたびにメンテナンスが必要になる。ホワイトリスト方式なら表示対象を明示的に制御でき、新アクション追加時は意図的にリストに加えるまで表示されない。`findByTargets` は既に `includeActions` オプションを実装済みのため、追加の repository 変更は不要。

**Alternatives considered**:
- `excludeActions` ブラックリスト方式: 新アクション追加時にリスト漏れでノイズが混入するリスクがある。却下。
- DB ビューやマテリアライズドビュー: スキーマ変更に該当。スコープ外。

### D2: 集約は usecase 層で行い、TimelineEntry 型を導入する

**決定**: `getDealActivity` 内で取得した `AuditLog[]` を分類・集約し、新しい `TimelineEntry` 型の配列として返す。`DealActivityResult.logs` の型を `AuditLog[]` から `TimelineEntry[]` に変更する。集約ロジックは純粋関数として `src/lib/activityAggregator.ts` に分離する。

`TimelineEntry` 型:
```typescript
type TimelineEntry = {
  id: string;              // 代表ログの id
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  actorId: string;
  createdAt: Date;
  count: number;           // 集約件数（1 = 単独）
  transition: { from: string; to: string } | null;  // 状態遷移（集約後の正味遷移）
};
```

**Rationale**: 集約は表示用の読み取り処理であり、domain 層に配置する必要はない。lib 層の純粋関数として分離することで、テスタビリティを確保しつつ依存方向（actions/RSC → usecases → domain / infrastructure）を遵守する。`AuditLog` をそのまま拡張するのではなく、表示に必要な情報だけを持つ新型を導入することで、集約結果の意図を明確にする。

**Alternatives considered**:
- `AuditLog & { count: number; transition: ... }` 拡張型: metadata を二重に持つことになり冗長。集約時に複数ログが 1 エントリになるため、元の `AuditLog` 型のフィールド（特に metadata）が不要になるケースがある。却下。
- domain service として配置: 集約は表示のための読み取り処理であり、ビジネスルールではないため domain 層には不適。却下。

### D3: DB 取得時の limit を除去し、集約後に上限を適用する

**決定**: `findByTargets` 呼び出し時に `limit` を渡さず全件取得し、`includeActions` で DB 側フィルタをかけた後、アプリケーション層で集約 → 上限適用の順で処理する。

**Rationale**: DB 取得時に limit をかけると、集約前にエントリが切り捨てられ、連続操作の集約結果が不正確になる。`includeActions` により DB レベルで対象アクションに絞り込んでいるため、全件取得のデータ量は限定的（1 案件の顧客接点 + 業務イベントのみ）。

**Alternatives considered**:
- DB 側で大きめの limit（例: 200）を設定: 集約精度を担保するために必要な件数が予測不能。要件の「厳選・集約後に上限適用」を正確に満たさない。却下。

### D4: ACTIVITY_HIDDEN_ACTIONS は固定分類に対する追加除外として維持する

**決定**: 設計文書 §7.2 に従い、表示対象はコードの固定分類（D1 のホワイトリスト）で決め、`ACTIVITY_HIDDEN_ACTIONS`（環境変数）は固定分類に含まれるアクションをさらに非表示にする補助設定として維持する。適用タイミングは `includeActions` による DB フィルタの後、集約前。

**Rationale**: 運用中に特定アクションを一時的に非表示にする柔軟性を維持しつつ、デフォルトの表示対象はコードで管理する。

**Alternatives considered**:
- `ACTIVITY_HIDDEN_ACTIONS` を廃止: 運用柔軟性を失う。却下。

### D5: invoice.update_status の metadata 記録は既存パターンに倣う

**決定**: `updateInvoiceStatus` usecase の `recordAudit` 呼び出しに `metadata: { fromStatus: invoice.status, toStatus: data.newStatus }` を追加する。`AuditMetadataMap` に `deal.updatePhase`・`contract.updateStatus`・`invoice.update_status` の 3 エントリを追加する。`updateDealPhase` は既に `{ fromPhase, toPhase }` を metadata に記録しており、`updateContractStatus` も `{ fromStatus, toStatus }` を記録済み。新規の型定義追加のみ。

**Rationale**: 既存の `updateDealPhase` / `updateContractStatus` と完全に同じパターンで実装でき、一貫性を保てる。`AuditMetadataMap` へのエントリ追加により、`recordAudit` のジェネリクス制約でコンパイル時にメタデータ漏れを検出できるようになる。ただし `deal.updatePhase` / `contract.updateStatus` はそれぞれキー名が異なる（`fromPhase`/`toPhase` vs `fromStatus`/`toStatus`）ため、集約ロジックでは `from`/`to` に正規化して扱う。

**Alternatives considered**: なし。既存パターンの踏襲であり、他の選択肢はない。

### D6: DealActivitySection を TimelineEntry 対応に改修する

**決定**: `DealActivitySection` の props を `AuditLog[]` から `TimelineEntry[]` に変更し、集約件数（count > 1 の場合「(N件)」表示）と状態遷移（transition が非 null の場合「変更前 → 変更後」表示）をレンダリングする。ラベル生成ロジックは `getActionLabel` を拡張して `TimelineEntry` を受け取れるようにする。

**Rationale**: UI コンポーネントは集約済みのデータを受け取って表示するだけの責務に留める。ラベル生成は既存の `activityLabels.ts` に集約する。

**Alternatives considered**:
- UI 側で集約: 表示ロジックとビジネスロジックが混在する。却下。

## Risks / Trade-offs

[Risk] 全件取得によるパフォーマンス影響 → `includeActions` による DB フィルタで対象を 7 アクションに限定しているため、1 案件あたりのデータ量は実用上問題ない水準。将来的に大量のアクティビティが蓄積される場合は、`afterDate` による期間制限を検討する。

[Risk] 既存の `DealActivityResult` 型を変更するため、型参照箇所が壊れる → `DealActivityResult` は `getDealActivity` からの export 型で、参照箇所は `page.tsx`（RSC）と `DealActivitySection`（UI）の 2 箇所のみ。影響範囲は限定的。

[Risk] `AuditMetadataMap` への 3 エントリ追加により、既存の `recordAudit` 呼び出しで型エラーが発生する可能性 → `deal.updatePhase` / `contract.updateStatus` は既に metadata を渡しているため影響なし。`invoice.update_status` は同時に metadata 追加を行うため問題なし。`AuditRecordParams` の条件型設計（`A extends keyof AuditMetadataMap ? { metadata: ... } : { metadata?: ... }`）により、マップに登録されたアクションは metadata が必須になる。

[Risk] 遷移情報を持たない既存の `invoice.update_status` ログで遷移表示ができない → 要件どおり遷移表示しない（`transition: null`）。ラベルは「請求ステータスを変更」のまま表示する。

## Open Questions

なし。設計判断は architect によりすべて評価済み。
