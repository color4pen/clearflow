# Conformance Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:   implementation conforms to tasks.md, design.md, spec.md, and request.md
  - needs-fix:  one or more upstream artifacts are not satisfied by the implementation
  - escalation: conformance cannot be determined (missing artifacts, unresolvable ambiguity)
- The Findings table records the per-artifact judgment.
-->

- **verdict**: approved
- **iteration**: 001
- **reviewer**: conformance-agent
- **date**: 2026-06-27

## Conformance Findings

| Artifact | Conforms | Notes |
|----------|----------|-------|
| tasks.md | ✓ | T-01〜T-12 全チェックボックスが [x] 完了済み |
| design.md | ✓ | D1〜D7 全設計判断が実装に反映されている |
| spec.md | ✓ | 全 Requirements（SHALL/MUST）とシナリオに適合 |
| request.md | ✓ | 全 7 受け入れ基準を満たすテスト・実装が存在する |

---

## 1. tasks.md チェックボックス確認

T-01 〜 T-12 の全チェックボックスが `[x]` 完了済み。未完了タスクなし。

---

## 2. 設計判断（design.md D1〜D7）適合確認

| # | 設計判断 | 実装確認 | 適合 |
|---|----------|---------|------|
| D1 | 記録は常時オン、表示のみ env フラグで切り替え | `page.tsx` で `isActivityFeedEnabled()` を呼び出し、false 時は `getDealActivity` 呼び出し自体をスキップ（`Promise.resolve([])`）。監査ログの書き込み経路に変更なし | ✓ |
| D2 | 読み取り側で関係解決 | `getDealActivity.ts` で既存リポジトリ 4 種から子 id を取得して targets 配列を構築 | ✓ |
| D3 | audit_logs にインデックスを追加 | `schema.ts` に 2 インデックス定義、`drizzle/0010_audit_logs_indexes.sql` は `CREATE INDEX` のみ | ✓ |
| D4 | フィルタは除外リスト＋env 上書き | `DEFAULT_HIDDEN_ACTIONS=[]`、`getHiddenActions()` が `ACTIVITY_HIDDEN_ACTIONS` を分割・trim | ✓ |
| D5 | Drizzle `or()` + 複合条件 | `findByTargets` で `or(...targetConditions)` と `eq(organizationId)` を AND 結合 | ✓ |
| D6 | アクションラベル共通ユーティリティ | `src/lib/activityLabels.ts` に `getActionLabel` / `getTargetTypeLabel` を新設 | ✓ |
| D7 | フラグチェック位置は RSC ページコンポーネント | `page.tsx` の先頭で `isActivityFeedEnabled()` を評価し、UI 条件分岐と usecase 呼び出しを制御 | ✓ |

---

## 3. spec.md 要件・シナリオ適合確認

### Requirement: フィーチャーフラグによる表示制御（SHALL）

- **ACTIVITY_FEED_ENABLED=true のとき表示**: `activityEnabled` が true → Promise.all に `getDealActivity(...)` を渡し、`{activityEnabled && <SectionCard>…</SectionCard>}` でレンダリング ✓
- **未設定のとき非表示**: `isActivityFeedEnabled()` が false → `Promise.resolve([])` を使用、getDealActivity は呼ばれず、セクション非表示 ✓
- **"false" のとき非表示**: 同上 ✓
- 監査ログ記録への影響なし ✓

### Requirement: getDealActivity が案件自身＋配下の監査ログを返す（SHALL）

- deal + meeting + contract + action_item + deal_contact を targets 配列に構築 ✓
- `Promise.all` で 4 種の子 id 取得を並列実行（N+1 回避）✓
- `limit: ACTIVITY_TIMELINE_LIMIT`（30）を findByTargets に渡す ✓
- `orderBy(desc(auditLogs.createdAt))` で降順 ✓

### Requirement: 除外アクションフィルタ（SHALL）

- `getHiddenActions()` で env 解決（未設定→空配列、設定時→カンマ分割・trim・filter(Boolean)） ✓
- `excludeActions.length > 0` の場合のみ `notInArray` を WHERE 条件に追加 ✓

### Requirement: auditLogRepository の対象別取得がテナント分離される（MUST）

- `findByTargets` の conditions 先頭に `eq(auditLogs.organizationId, organizationId)` を必ず付与 ✓
- `targets` が空のとき即座に `[]` を返し、クエリを発行しない ✓

### Requirement: audit_logs インデックスの存在（MUST）

- `schema.ts` に `audit_logs_org_created_at_idx`（organization_id, created_at）と `audit_logs_target_type_id_idx`（target_type, target_id）が定義済み ✓
- マイグレーション SQL `drizzle/0010_audit_logs_indexes.sql` は `CREATE INDEX` 2 文のみ（既存データ・カラム変更なし） ✓

### Requirement: 依存方向の遵守（MUST）

- `getDealActivity.ts` の import: `@/infrastructure/repositories/*`、`@/lib/activityConfig`、`@/domain/models/auditLog` のみ ✓
- `@/app` や他の usecase への依存なし、循環参照なし ✓
- `DealActivitySection.tsx`（RSC）は `@/lib/activityLabels` を参照（UI → lib は許容）✓

---

## 4. request.md 受け入れ基準確認

| 受け入れ基準 | 対応テスト・確認 | 適合 |
|-------------|----------------|------|
| ACTIVITY_FEED_ENABLED=true 時に表示・未設定/false 時に非表示をテストで確認 | `activityConfig.test.ts` で isActivityFeedEnabled の 3 ケース（"true"/unset/"false"）を env 変数操作付きで検証、T-09 static test で page.tsx の呼び出し確認 | ✓ |
| getDealActivity が案件自身＋配下 4 種を createdAt desc・ACTIVITY_TIMELINE_LIMIT 件返すことをテストで確認 | `dealActivity.test.ts` で 5 リポジトリ呼び出し・ACTIVITY_TIMELINE_LIMIT・Promise.all・getHiddenActions の参照を静的検証 | ✓ |
| ACTIVITY_HIDDEN_ACTIONS で指定した action がタイムラインに含まれないことをテストで確認 | `activityConfig.test.ts` で getHiddenActions のカンマ分割・trim 動作を env 変数操作付きで検証 | ✓ |
| auditLogRepository の対象別取得が organizationId で絞られることをテストで確認 | T-08 static tests で findByTargets のソースに organizationId・`or(`・`desc(auditLogs.createdAt)` の存在を確認 | ✓ |
| audit_logs に 2 インデックスが存在（差分マイグレーション） | T-09 static test で schema.ts 内のインデックス名確認、マイグレーション SQL は CREATE INDEX のみ | ✓ |
| 依存方向 actions/RSC → usecases → domain / infrastructure を遵守 | getDealActivity.ts の import が infra/domain/lib のみ、@/app への依存なし | ✓ |
| 既存テスト無変更で bun test green、typecheck green、bun run build 成功 | verification-result.md: build=passed, typecheck=passed, test=1102pass/0fail, lint=passed | ✓ |

---

## 5. 実装スコープ確認（git diff main...HEAD）

変更ファイル 31 件（specrunner artifacts 17 件 + ソース 14 件）。ソースコード変更の概要:

| ファイル | 種別 | 内容 |
|---------|-----|------|
| `src/infrastructure/schema.ts` | 変更 | auditLogs テーブルに 2 インデックス追加 |
| `src/infrastructure/repositories/auditLogRepository.ts` | 変更 | `findByTargets` メソッド追加 |
| `src/lib/activityConfig.ts` | 新規 | ACTIVITY_TIMELINE_LIMIT / getHiddenActions / isActivityFeedEnabled |
| `src/lib/activityLabels.ts` | 新規 | getActionLabel / getTargetTypeLabel |
| `src/application/usecases/getDealActivity.ts` | 新規 | usecase 本体 |
| `src/application/usecases/index.ts` | 変更 | getDealActivity を re-export |
| `src/app/(dashboard)/deals/[id]/DealActivitySection.tsx` | 新規 | Server Component（アクティビティ一覧） |
| `src/app/(dashboard)/deals/[id]/page.tsx` | 変更 | isActivityFeedEnabled + getDealActivity 組み込み、条件付きレンダリング |
| `drizzle/0010_audit_logs_indexes.sql` | 新規 | CREATE INDEX 2 文のみ |
| `drizzle/meta/_journal.json` | 変更 | 新エントリ追加 |
| `src/__tests__/usecases/dealActivity.test.ts` | 新規 | 静的検証テスト（T-07） |
| `src/__tests__/static/projectStructure.test.ts` | 変更 | T-08 / T-09 テスト追加 |
| `src/__tests__/lib/activityLabels.test.ts` | 新規 | ユニットテスト（T-10） |
| `src/__tests__/lib/activityConfig.test.ts` | 新規 | ユニットテスト（T-11、env 変数操作付き） |

スコープ外（引合・顧客・ページング・監査ログ記録の ON/OFF）への影響なし。

---

## 6. 観察事項（verdict に影響しない）

1. **UI 表示フォーマット（low）**: `DealActivitySection.tsx` の行フォーマット `{actor} が {targetLabel} を {actionLabel}` は、actionLabel（例: "案件を更新"）に目的語が内包されているため重複表現になるケースがある。機能要件は満たしており、code-review で `Fix: no` として既に識別・受理済み。

2. **activityConfig.test.ts のカバレッジ**: tasks.md T-11 のスコープ（型確認のみ）を超えて env 変数操作付きの振る舞いテストが実装されており、受け入れ基準の充足度を高めている。

---

## 判定理由

- 全 Requirements（SHALL / MUST 5 件）の実装を確認 ✓
- 全 7 受け入れ基準を満たすテスト・実装が存在 ✓
- build / typecheck / test（1102件 all pass）/ lint がすべて green ✓
- 依存方向違反・テナント分離欠陥・スコープ逸脱なし ✓
- code-review verdict: approved（総合スコア 8.95 / 10）✓

critical・high・decision-needed 相当の所見なし。
