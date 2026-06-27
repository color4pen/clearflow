# Design: 案件アクティビティ・タイムライン

## Context

監査ログ（audit_logs）には全ドメインの状態変更が記録されている。案件詳細ページでこれらを時系列に閲覧する手段がない。

現状のコードベース:

- `auditLogRepository` は `findByOrganization` のみ提供し、organizationId + 任意フィルタで検索する。特定の (targetType, targetId) ペア群を指定して横断取得するメソッドがない
- `audit_logs` テーブルにインデックスが未定義。レコード増加に伴いフルスキャンのコストが上がる
- 案件配下の子エンティティは既存リポジトリ経由で id を取得できる: `contractRepository.findAllByDealId`, `meetingRepository.findAllByDeal`, `actionItemRepository.findByDeal`, `dealContactRepository.findByDeal`
- ダッシュボードの「直近の活動」（`SalesDashboard`）は `AuditLog[]` を受け取り、`log.action` をそのまま表示している。人間可読ラベルへの変換は行っていない
- `formatRelativeTime` が `dashboardUtils.ts` に定義済み
- 案件詳細ページは `SectionCard` を並べた 2 カラムレイアウト

## Goals / Non-Goals

**Goals**:

- `auditLogRepository` に複数 (targetType, targetId) ペアで監査ログを取得するメソッドを追加する
- `audit_logs` に `(organization_id, created_at)` と `(target_type, target_id)` のインデックスを差分マイグレーションで追加する
- `getDealActivity` usecase を新設し、案件自身＋配下子エンティティの監査ログを createdAt desc で上限 30 件取得する
- env フィーチャーフラグ `ACTIVITY_FEED_ENABLED` で表示の ON/OFF を制御する
- env `ACTIVITY_HIDDEN_ACTIONS` で除外アクションを指定できるようにする
- 案件詳細ページにアクティビティ SectionCard を追加し、各行に「いつ・誰が・何をしたか」を人間可読に表示する
- アクションラベルの整形ロジックをダッシュボードのアクティビティ表示と共用可能な形で実装する

**Non-Goals**:

- 案件以外（引合・顧客など）のアクティビティ画面
- 通知センター・watch/購読
- 続き読み込み/ページング（先頭 30 件のみ）
- 監査ログ metadata への親 dealId 付与による最適化
- 監査ログ記録自体の ON/OFF

## Decisions

### D1: 記録は常時オン、表示のみ env フラグで切り替え（architect 決定済み）

**決定**: `process.env.ACTIVITY_FEED_ENABLED === "true"` のときだけ案件詳細ページにアクティビティを表示する。監査ログの記録は一切影響を受けない。

**理由**: 監査ログはアクティビティと監査証跡の土台。記録を切ると両方が欠落する。表示だけをフラグで制御すれば、通知など他のイベント消費者とも独立を保てる。

**代替案**: 記録側にもフラグを入れる案 — 監査証跡の欠落リスクがあり却下。

### D2: 読み取り側で関係解決、書き込み側への dealId 付与を却下（architect 決定済み）

**決定**: `getDealActivity` usecase で、案件配下の子エンティティ id を既存リポジトリから取得し、それらの (targetType, targetId) ペアで監査ログを検索する。

**理由**: 各 usecase の監査記録（書き込みパス）を横断改修せずに済む。既存の監査ログもそのまま対象にできる。性能が問題化したら後続で metadata に dealId を付与する最適化を検討する。

**代替案**: 監査ログの metadata に dealId を付与して書き込み時に関連付ける案 — 全書き込み usecase の改修が必要でスコープが大きい。

### D3: audit_logs にインデックスを追加（architect 決定済み）

**決定**: `(organization_id, created_at)` と `(target_type, target_id)` のインデックスを差分マイグレーションで追加する。

**理由**: audit_logs は追記専用で無制限に増える。インデックスにより案件別・組織別の取得が件数増でも効く。アクティビティ機能と無関係に既存の監査ログ画面の性能も改善する。

**代替案**: インデックスを張らずクエリで対応する案 — データ量増加で性能劣化するリスクが高い。

### D4: アクションのフィルタは除外リスト＋env 上書き（architect 決定済み）

**決定**: 既定は全アクション表示とし、除外する action のリストを定数で定義（既定空）。`process.env.ACTIVITY_HIDDEN_ACTIONS`（カンマ区切り）で上書きできる。

**理由**: 含めるリストではなく除外リストにすることで、新しい action が増えても既定で表示され、監査・把握漏れを防ぐ。

**代替案**: 含めるリスト方式 — 新 action 追加時にリストの更新漏れが発生するリスクがある。

### D5: 複数ターゲット取得 — Drizzle の `or` + 複合条件

**決定**: `auditLogRepository` に `findByTargets(organizationId, targets: Array<{targetType, targetId}>, options)` メソッドを追加する。Drizzle の `or()` で各 (targetType, targetId) ペアを `and(eq(target_type), eq(target_id))` として結合し、`organizationId` 条件を AND で付与する。`notInArray` で除外アクションをフィルタし、`createdAt desc` + `limit` で取得する。

**理由**: 1 クエリで全ターゲットの監査ログを取得できるため、N+1 問題を回避する。`(target_type, target_id)` インデックスが効くため、OR 展開でも性能上問題がない。

**代替案**: ターゲットごとに個別クエリを発行する案 — 子の種類数 × クエリが発生し非効率。マージと件数制限のロジックも複雑化する。

### D6: アクションラベル整形 — 共通ユーティリティの新設

**決定**: `src/lib/activityLabels.ts` にアクション名から人間可読ラベルを返す `getActionLabel(action: string): string` と、targetType から日本語ラベルを返す `getTargetTypeLabel(targetType: string): string` を新設する。ダッシュボードの「直近の活動」でも利用可能だが、既存コードの変更はスコープ外とする。

**理由**: 案件アクティビティとダッシュボードで同じラベルマッピングを二重実装することを避ける。`lib/` に置くことで UI 層から独立させ、将来のラベル追加を 1 箇所で管理できる。

**代替案**: 案件アクティビティ UI コンポーネント内にインラインで定義する案 — ダッシュボードと二重実装になる。

### D7: フィーチャーフラグのチェック位置 — RSC ページコンポーネント

**決定**: 案件詳細ページ（RSC）で `process.env.ACTIVITY_FEED_ENABLED === "true"` を確認し、true のときのみ `getDealActivity` usecase を呼び出してアクティビティ SectionCard をレンダリングする。false のときはセクション自体を出力しない。

**理由**: Server Component で env を直接参照できる。usecase を呼ばないことで、フラグ OFF 時には DB クエリも発生しない。

**代替案**: usecase 内でフラグを確認する案 — 表示の判断をビジネスロジック層に持ち込むことになり、レイヤー責務が曖昧になる。

## Risks / Trade-offs

**[Risk] 子エンティティが多い案件では関係解決のクエリが増える**
→ Mitigation: 子の id 取得は既存リポジトリの `findAll*` を再利用する。結果から id のみ抽出するため、返却データの大半は不要だが、新メソッド追加のコストと比較して許容する。性能が問題化した場合は metadata に dealId を付与する最適化を後続で実施する。

**[Risk] OR 展開のクエリが大量ターゲットで遅くなる可能性**
→ Mitigation: `(target_type, target_id)` インデックスにより各条件のルックアップは効率的。案件配下のエンティティ数は通常数十以下であり、実用上問題にならない。

**[Risk] アクションラベルのマッピング漏れ**
→ Mitigation: `getActionLabel` はマッピングに存在しない action をそのまま返す（フォールバック）。新 action 追加時にラベルが未定義でも表示が壊れない。

## Open Questions

なし（architect 評価済みの設計判断により主要な論点は解決済み）。
