# ADR-019: 案件アクティビティ・タイムライン

- **Status**: accepted
- **Date**: 2026-06-27
- **Change**: deal-activity-timeline
- **Deciders**: architect

---

## Context

監査ログ（`audit_logs`）には全ドメインの状態変更が既に記録されているが、案件単位で時系列に閲覧する手段がなかった。案件詳細ページにアクティビティ・タイムラインを追加するにあたり、以下の問題を解決する必要があった。

1. `auditLogRepository` は組織単位の取得（`findByOrganization`）のみ提供しており、複数の (targetType, targetId) ペアを一括取得するメソッドがない
2. `audit_logs` テーブルにインデックスが未定義であり、レコード増加に伴うフルスキャンコストが上がる
3. アクティビティの「表示」と監査証跡の「記録」を分離すべきか、同一フラグで制御すべきかの判断が必要
4. 監査ログの記録時には案件 dealId が子エンティティ（商談・契約・アクションアイテム・案件連絡先）に付与されておらず、表示時に関係を解決する方法を選ぶ必要がある
5. アクションラベルの人間可読整形ロジックをダッシュボードの「直近の活動」と二重実装せずに共用する方法が必要

---

## Decisions

### D1: 記録は常時オン、表示のみ env フラグで切り替え

**Decision**: `process.env.ACTIVITY_FEED_ENABLED === "true"` のときだけ案件詳細ページにアクティビティを表示する。監査ログの記録自体には一切影響しない。RSC ページコンポーネント内でフラグを確認し、false の場合は `getDealActivity` usecase の呼び出し自体を行わない。

**Rationale**:
- 監査ログはアクティビティと監査証跡の土台。記録を切ると両方が欠落するため、記録側にフラグを入れない
- 表示だけをフラグで制御することで、通知など他のイベント消費者と独立を保てる
- Server Component で env を直接参照できるため、usecase 呼び出しをスキップでき DB クエリも発生しない
- レイヤー責務の観点から、表示 ON/OFF の判断はビジネスロジック層（usecase）ではなく表示層（RSC）が持つべき

#### Alternative: 記録側にもフラグを入れる

| | |
|---|---|
| **Pros** | 記録と表示を完全に連動させて「機能をまるごと切る」が可能 |
| **Cons** | 監査証跡が欠落する。他のイベント消費者（通知など）も同時に無効化される |
| **Why not** | 監査証跡の欠落は運用リスクが高く受け入れられない |

---

### D2: 読み取り側で関係解決、書き込み側への dealId 付与を却下

**Decision**: `getDealActivity` usecase で案件配下の子エンティティ id を既存リポジトリから取得し（`contractRepository.findAllByDealId` / `meetingRepository.findAllByDeal` / `actionItemRepository.findByDeal` / `dealContactRepository.findByDeal`）、それらの (targetType, targetId) ペアで監査ログを検索する。

**Rationale**:
- 各 usecase の監査記録（書き込みパス）を横断改修せずに済む
- 既存の監査ログ（実装以前の記録）もそのまま対象にできる
- 子エンティティ数は通常数十以下であり、id 解決クエリのコストは実用上許容できる
- 性能が問題化した場合は、後続で監査ログ metadata に dealId を付与する最適化を検討する（スコープ外）

#### Alternative: 監査ログ書き込み時に metadata へ dealId を付与する

| | |
|---|---|
| **Pros** | 読み取り時に子エンティティの id 解決が不要になりシンプル |
| **Cons** | 全書き込み usecase（deal / contract / meeting / action_item / deal_contact）を横断改修が必要。既存の監査ログには dealId が無いため、旧レコードが対象外になる |
| **Why not** | 改修スコープが大幅に拡大し、既存監査ログの欠落が発生するため |

---

### D3: audit_logs に複合インデックスを追加

**Decision**: `audit_logs` テーブルに `(organization_id, created_at)` と `(target_type, target_id)` の 2 つのインデックスを差分マイグレーションで追加する。

**Rationale**:
- `audit_logs` は追記専用で無制限に増えるテーブル。インデックスなしでは件数増で組織別・対象別の取得がフルスキャンになる
- `(organization_id, created_at)` はテナント分離された時系列クエリ全般に有効
- `(target_type, target_id)` は複数ターゲットの OR 展開クエリに効き、N+1 回避の `findByTargets` と合わせて性能を確保する
- アクティビティ機能と無関係に、既存の監査ログ画面の性能も改善する副次効果がある

#### Alternative: インデックスを張らずアプリケーション側でキャッシュ

| | |
|---|---|
| **Pros** | スキーマ変更が不要 |
| **Cons** | データ量増加に伴う性能劣化が避けられない。キャッシュ実装は複雑度を増す |
| **Why not** | 追記専用テーブルにインデックスを張ることは適切であり、差分マイグレーションでリスクも低い |

---

### D4: アクションフィルタは除外リスト＋env 上書き

**Decision**: 既定は全アクション表示（除外リスト空）とし、`process.env.ACTIVITY_HIDDEN_ACTIONS`（カンマ区切り）でノイズとなるアクションを env レベルで除外できるようにする。設定は `src/lib/activityConfig.ts` の `getHiddenActions()` に集約する。

**Rationale**:
- 含めるリストではなく除外リストにすることで、新しい action が増えても既定でタイムラインに表示され、監査・把握漏れを防ぐ
- env による上書きで、本番・ステージング・開発環境ごとにノイズアクションを調整できる

#### Alternative: 含めるリスト（allowlist）方式にする

| | |
|---|---|
| **Pros** | 意図しない action が表示されない |
| **Cons** | 新 action 追加のたびにリストを更新しないと表示漏れが発生する。監査用途では把握漏れがリスク |
| **Why not** | 新 action の更新忘れが運用上の問題になるため、除外リストが適切 |

---

### D5: 複数ターゲット取得 — `findByTargets` に OR 展開クエリ

**Decision**: `auditLogRepository` に `findByTargets(organizationId, targets: Array<{targetType, targetId}>, options)` メソッドを追加する。Drizzle の `or()` で各 (targetType, targetId) ペアを `and(eq(target_type), eq(target_id))` として結合し、`organizationId` 条件を AND で付与する。`notInArray` で除外アクションをフィルタし、`createdAt desc` + `limit` で取得する。`targets` が空の場合は早期リターンで空配列を返す。

**Rationale**:
- 1 クエリで全ターゲットの監査ログを取得できるため N+1 問題を回避
- `(target_type, target_id)` インデックスが各 OR 条件のルックアップに有効
- 案件配下のエンティティ数は通常数十以下であり、OR 展開でも実用上問題なし
- `organizationId` を必須 AND 条件にすることでテナント分離を保証

#### Alternative: ターゲットごとに個別クエリを発行する

| | |
|---|---|
| **Pros** | 実装がシンプル |
| **Cons** | 子エンティティの種類数分のクエリが発生（N+1）。クエリ結果のマージと件数制限ロジックが複雑化 |
| **Why not** | N+1 は性能・コード複雑度の両面で不利 |

---

### D6: アクションラベル整形を `src/lib/` 共通ユーティリティとして新設

**Decision**: `src/lib/activityLabels.ts` に `getActionLabel(action: string): string` と `getTargetTypeLabel(targetType: string): string` を新設する。マッピングに存在しない action はそのまま返す（フォールバック）。既存のダッシュボード「直近の活動」コードの変更は本スコープ外とするが、共通ユーティリティとして将来の流用を可能にする。

**Rationale**:
- 案件アクティビティとダッシュボードで同じラベルマッピングを二重実装することを避ける
- `src/lib/` に置くことで UI 層・usecase 層から独立し、将来のラベル追加を 1 箇所で管理できる
- フォールバック（action をそのまま返す）により、新 action 追加時にラベル未定義でも表示が壊れない

#### Alternative: 案件アクティビティ UI コンポーネント内にインラインで定義する

| | |
|---|---|
| **Pros** | ファイル分割が不要でシンプル |
| **Cons** | ダッシュボードとのラベル定義が二重管理になり、一方を変更した際に他方が追随しない |
| **Why not** | 将来の label 追加・修正時に単一箇所管理できる方が保守性が高いため |

---

## Consequences

### Positive

- 案件詳細ページで案件自身＋配下エンティティの出来事を時系列タイムラインとして閲覧できるようになる
- 監査証跡の記録を一切変更せずに表示機能を追加したため、既存の監査ログ画面・通知など他の消費者に影響なし
- `ACTIVITY_FEED_ENABLED` フラグで環境ごとに表示 ON/OFF を制御でき、ロールアウトが柔軟
- `(organization_id, created_at)` / `(target_type, target_id)` インデックスが既存の監査ログ画面の性能も改善
- `findByTargets` パターンが確立され、他エンティティのアクティビティ機能（引合・顧客など）でも踏襲可能
- `src/lib/activityConfig.ts` / `src/lib/activityLabels.ts` が共有ユーティリティとして確立

### Negative / Trade-offs

- 子エンティティが多い案件では関係解決のリポジトリクエリが増える（Promise.all 並列実行で緩和）
- OR 展開クエリは子エンティティ種別が増えると条件が増加するが、`(target_type, target_id)` インデックスで許容範囲
- 表示側での関係解決のため、監査ログ記録以前のエンティティ削除後は targetId が孤立する可能性（参照解決せず id のみで表示）

### Constraints for future changes

- **監査ログの記録 ON/OFF**: 記録を env フラグで切ることは禁止。監査証跡が欠落する。表示のみを制御すること（D1 参照）
- **他エンティティへの拡張**: 引合・顧客などの別エンティティにアクティビティを追加する場合は、`findByTargets` + 対応 usecase + `ACTIVITY_FEED_ENABLED` フラグのパターンを踏襲すること
- **フィーチャーフラグのチェック位置**: `ACTIVITY_FEED_ENABLED` の確認は RSC ページコンポーネントで行い、usecase 内では行わないこと（D1 参照）
- **除外アクションの管理**: 新たな除外アクション設定を追加する場合は `src/lib/activityConfig.ts` の `getHiddenActions()` を経由すること。usecase や リポジトリに直接ハードコードしないこと（D4 参照）
- **テナント分離の保証**: `findByTargets` 呼び出し時は必ず `organizationId` を渡すこと。organizationId 条件を省略した取得メソッドは追加しないこと（D5 参照）
- **アクションラベルの共用**: 監査ログの action を人間可読に整形する新たな箇所では `src/lib/activityLabels.ts` の `getActionLabel` / `getTargetTypeLabel` を使い、重複実装を避けること（D6 参照）
- **パフォーマンス最適化**: アクティビティ取得が遅い場合の最適化として、監査ログ metadata に `dealId` を付与する方法を検討してよいが、その場合は全書き込み usecase の改修が必要になる。差分マイグレーションと合わせて後続リクエストとして計画すること（D2 参照）

---

## References

- `specrunner/changes/deal-activity-timeline/design.md` — 詳細設計（D1〜D7）
- `specrunner/changes/deal-activity-timeline/request.md` — 要件定義
- `specrunner/changes/deal-activity-timeline/review-feedback-001.md` — コードレビュー所見
- `src/application/usecases/getDealActivity.ts` — 案件アクティビティ取得 usecase
- `src/infrastructure/repositories/auditLogRepository.ts` — `findByTargets` 実装
- `src/lib/activityConfig.ts` — フィーチャーフラグ・除外アクション設定
- `src/lib/activityLabels.ts` — アクションラベル整形ユーティリティ
- `src/app/(dashboard)/deals/[id]/DealActivitySection.tsx` — タイムライン UI コンポーネント
- `drizzle/0010_audit_logs_indexes.sql` — インデックス追加マイグレーション
