# Tasks: 案件アクティビティの厳選表示（タイムライン）

## T-01: AuditMetadataMap に状態遷移系アクションのエントリを追加する

- [x] `src/domain/models/auditLog.ts` の `AuditMetadataMap` に以下 3 エントリを追加する:
  - `"deal.updatePhase": { fromPhase: string; toPhase: string }`
  - `"contract.updateStatus": { fromStatus: string; toStatus: string }`
  - `"invoice.update_status": { fromStatus: string; toStatus: string }`
- [x] `bun run typecheck` を実行し、既存の `recordAudit` 呼び出し（`updateDealPhase.ts` / `updateContractStatus.ts`）が型エラーにならないことを確認する（既に正しい metadata を渡している）

**Acceptance Criteria**:
- `AuditMetadataMap` に 3 エントリが追加されている
- `bun run typecheck` が成功する

## T-02: updateInvoiceStatus で metadata に fromStatus / toStatus を記録する

- [x] `src/application/usecases/updateInvoiceStatus.ts` の `recordAudit` 呼び出しに `metadata: { fromStatus: invoice.status, toStatus: data.newStatus }` を追加する
- [x] `bun run typecheck` を実行し型エラーがないことを確認する

**Acceptance Criteria**:
- `updateInvoiceStatus` が `invoice.update_status` の監査ログに `{ fromStatus, toStatus }` を記録する
- `AuditMetadataMap` のジェネリクス制約により、metadata の型が `{ fromStatus: string; toStatus: string }` に制約されている

## T-03: タイムライン表示対象アクションの定数定義を追加する

- [x] `src/lib/activityConfig.ts` にタイムライン表示対象アクションのホワイトリスト定数を追加する:
  ```
  TIMELINE_ACTIONS: AuditAction[] = [
    "meeting.create",
    "deal.create",
    "deal.updatePhase",
    "contract.create",
    "contract.updateStatus",
    "invoice.create",
    "invoice.update_status",
  ]
  ```
- [x] 状態遷移系アクションを識別する定数も追加する:
  ```
  TRANSITION_ACTIONS: AuditAction[] = [
    "deal.updatePhase",
    "contract.updateStatus",
    "invoice.update_status",
  ]
  ```

**Acceptance Criteria**:
- `TIMELINE_ACTIONS` が 7 アクションを含む
- `TRANSITION_ACTIONS` が 3 アクションを含む
- 型は `AuditAction[]` であり、タイポがコンパイル時に検出される

## T-04: TimelineEntry 型と集約ロジックを実装する

- [x] `src/lib/activityAggregator.ts` を新規作成し、以下を実装する:
  - `TimelineEntry` 型の定義:
    ```typescript
    type TimelineEntry = {
      id: string;
      action: AuditAction;
      targetType: AuditTargetType;
      targetId: string;
      actorId: string;
      createdAt: Date;
      count: number;
      transition: { from: string; to: string } | null;
    }
    ```
  - `aggregateTimeline(logs: AuditLog[]): TimelineEntry[]` 関数:
    - 入力: 新しい順にソートされた `AuditLog[]`
    - 連続する同一 `(actorId, action, targetId)` エントリを 1 件に集約し `count` を設定
    - 状態遷移系アクション（`TRANSITION_ACTIONS`）の連続集約時は、最古エントリの "from" と最新エントリの "to" を `transition` に設定（正味遷移）
    - 遷移 metadata のキー名を正規化: `deal.updatePhase` → `fromPhase`/`toPhase`、`contract.updateStatus` / `invoice.update_status` → `fromStatus`/`toStatus`
    - metadata がない（既存ログ）場合は `transition: null`
    - 非遷移系アクションの場合も `transition: null`
- [x] `aggregateTimeline` は純粋関数とし、外部依存を持たない

**Acceptance Criteria**:
- 連続する同一操作（actorId + action + targetId）が 1 件に集約され、`count` が正しい
- 連続する状態遷移が正味の遷移に集約される（最古の from → 最新の to）
- 非連続の操作は集約されない
- 遷移 metadata がないログは `transition: null` になる
- `bun run typecheck` が成功する

## T-05: getDealActivity を厳選表示に対応させる

- [x] `src/application/usecases/getDealActivity.ts` を改修する:
  - `actionItemRepository` / `dealContactRepository` の import と呼び出しを削除する
  - `targets` 配列から `action_item` / `deal_contact` を除去する
  - `targetInfoMap` から `action_item` のエントリ構築を除去する
  - `findByTargets` の呼び出しを変更:
    - `limit` を渡さない（全件取得）
    - `includeActions: TIMELINE_ACTIONS` を渡す（DB レベルのホワイトリストフィルタ）
  - `getHiddenActions()` による追加除外をアプリケーション層で適用する（`includeActions` フィルタ後、集約前）
  - `aggregateTimeline(filteredLogs)` で集約する
  - 集約結果に `ACTIVITY_TIMELINE_LIMIT` を適用する（`.slice(0, ACTIVITY_TIMELINE_LIMIT)`）
  - `DealActivityResult` の `logs` 型を `TimelineEntry[]` に変更する
- [x] `DealActivityResult` と `TimelineEntry` を適切に export する

**Acceptance Criteria**:
- `action_item` / `deal_contact` の取得・targets 構築が行われない
- DB 取得時に limit が渡されない
- `includeActions` で表示対象アクションのみ取得する
- `getHiddenActions()` が集約前に適用される
- 集約後に `ACTIVITY_TIMELINE_LIMIT` が適用される
- `DealActivityResult.logs` が `TimelineEntry[]` 型になっている
- `bun run typecheck` が成功する

## T-06: アクションラベルを整備し TimelineEntry 対応にする

- [x] `src/lib/activityLabels.ts` を改修する:
  - `getActionLabel` を `TimelineEntry` を受け取れるように変更する（または `TimelineEntry` から必要な情報を渡す新しい関数を追加する）
  - 状態遷移の表示: `transition` が非 null の場合は「ラベル：変更前ラベル → 変更後ラベル」形式で返す
  - 遷移値の日本語化: `phaseLabels` / `contractStatusLabels` / `invoiceStatusLabels` を参照してラベル化する（`src/app/(dashboard)/labels.ts` から import）
  - タイムライン表示対象の 7 アクションすべてにラベルが定義されていることを確認する（現状すべて定義済み: `deal.create`, `deal.updatePhase`, `contract.create`, `contract.updateStatus`, `invoice.create`, `invoice.update_status`, `meeting.create`）
- [x] 集約件数の表示: `count > 1` の場合に「(N件)」を付加する処理は UI 側（`DealActivitySection`）で行う

**Acceptance Criteria**:
- タイムライン対象の 7 アクションすべてにラベルが定義されている
- 状態遷移のある `TimelineEntry` に対して「変更前ラベル → 変更後ラベル」が返される
- `bun run typecheck` が成功する

## T-07: DealActivitySection を TimelineEntry 対応に改修する

- [x] `src/app/(dashboard)/deals/[id]/DealActivitySection.tsx` を改修する:
  - `activities` props の型を `AuditLog[]` から `TimelineEntry[]` に変更する
  - `count > 1` の場合に「(N件)」を表示する
  - `transition` が非 null の場合に遷移ラベルを表示する
  - `AuditLog` の import を `TimelineEntry` の import に置き換える
- [x] `src/app/(dashboard)/deals/[id]/page.tsx` の `DealActivitySection` 呼び出し箇所で、型の不整合がないことを確認する（`getDealActivity` が `TimelineEntry[]` を返すようになるため自然に整合する）

**Acceptance Criteria**:
- `DealActivitySection` が `TimelineEntry[]` を受け取り、集約件数と遷移情報を表示する
- `bun run typecheck` が成功する
- `bun run build` が成功する

## T-08: 既存テストを新仕様に追従して改修する

- [x] `src/__tests__/usecases/dealActivity.test.ts` を改修する:
  - `actionItemRepository.findByDeal` / `dealContactRepository.findByDeal` の呼び出しを期待するテストを削除する
  - `ACTIVITY_TIMELINE_LIMIT` が DB 取得時ではなく集約後に適用されることを反映するテストに変更する
  - 静的検証（`readFile` + `toContain`）のアサーションを新仕様の実装に合わせて更新する
- [x] `src/__tests__/lib/activityLabels.test.ts` を新仕様に追従して改修する（`action_item.toggle` テストを削除し、7 アクションのラベル定義と状態遷移表示を検証するテストに更新する）
- [x] `bun test` を実行し全テストが通ることを確認する

**Acceptance Criteria**:
- `dealActivity.test.ts` が新仕様を反映している
- `bun test` が green になる

## T-09: 動的テストを追加する

- [x] `src/__tests__/usecases/dealActivity.dynamic.test.ts` を新規作成する（`getNotifications.dynamic.test.ts` を参考に `mock.module` 方式で実装）
- [x] 以下のテストケースを実装する:
  - **分類テスト**: 表示対象の 7 アクション（`meeting.create`, `deal.create`, `deal.updatePhase`, `contract.create`, `contract.updateStatus`, `invoice.create`, `invoice.update_status`）が結果に含まれることを検証する
  - **除外テスト**: 除外対象（`deal.update`, `contract.update`, `invoice.update`, `meeting.update`, `action_item.*`, `deal_contact.*`）がタイムラインに出ないことを検証する
  - **取得対象テスト**: `findByTargets` の targets 引数に `action_item` / `deal_contact` の targetType が含まれないことを検証する
  - **includeActions テスト**: `findByTargets` の `includeActions` オプションに `TIMELINE_ACTIONS` が渡されていることを検証する
  - **limit 未指定テスト**: `findByTargets` に `limit` が渡されていないことを検証する
  - **集約テスト**: 連続する同一操作が件数つき 1 件に集約されることを検証する
  - **状態遷移集約テスト**: 連続する状態遷移が正味遷移に集約されることを検証する
  - **件数上限テスト**: 集約後に `ACTIVITY_TIMELINE_LIMIT` が適用されることを検証する
  - **遷移表示テスト**: `transition` が正しく設定されることを検証する
  - **遷移 metadata なしテスト**: 遷移情報のない既存ログで `transition: null` になることを検証する
- [x] 集約ロジック単体のテストも追加する（`activityAggregator` の純粋関数テスト）
- [x] `bun test` を実行し全テストが通ることを確認する

**Acceptance Criteria**:
- 受け入れ基準のすべての項目が動的テスト（`mock.module` 方式）で検証されている
- 集約ロジックの純粋関数テストが存在する
- `bun test` が green になる

## T-10: 最終検証

- [x] `bun run typecheck` が成功することを確認する
- [x] `bun run build` が成功することを確認する
- [x] `bun test` が全テスト green であることを確認する
- [x] `bun run lint` が成功することを確認する
- [x] 依存方向（actions/RSC → usecases → domain / infrastructure）が遵守されていることを確認する: `activityAggregator.ts`（lib 層）が domain/infrastructure を直接参照していないこと

**Acceptance Criteria**:
- `bun run typecheck` / `bun run build` / `bun test` / `bun run lint` がすべて成功する
- 依存方向の違反がない
