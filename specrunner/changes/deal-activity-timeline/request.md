# 案件アクティビティ・タイムライン

## Meta

- **type**: new-feature
- **slug**: deal-activity-timeline
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: 監査ログ上に「アクティビティ」という読み取りモデルを新設し、表示の env フィーチャーフラグ・アクション除外フィルタ・audit_logs のインデックスという新パターンを導入するため true -->

## 背景

監査ログには全ドメインの状態変更が既に記録されている（deal / inquiry / contract / invoice / meeting / action_item / 承認 など）。これを案件単位で時系列に見せる「アクティビティ」が無い。案件詳細ページに、その案件と配下（商談・契約・アクションアイテム・案件連絡先）の出来事をタイムライン表示する。監査ログの記録自体は常時オンのまま（アクティビティ・監査証跡の土台）、表示機能を環境変数で切り替え可能にし、タイムラインに出すアクション種別を絞れるようにする。

## 現状コードの前提

- src/domain/models/auditLog.ts — AuditLog は action / targetType / targetId / actorId / organizationId / metadata / createdAt を持つ
- src/infrastructure/repositories/auditLogRepository.ts — findByOrganization は organizationId ＋ 任意 action/actorId/targetType で絞り createdAt desc・limit/offset。targetId 指定での取得手段は無い
- src/infrastructure/schema.ts — audit_logs テーブルにインデックス定義が無い
- 案件配下の子の取得は既存: contractRepository.findAllByDealId / meetingRepository.findAllByDeal / actionItemRepository.findByDeal（dealId から子 id を解決できる）
- 監査ログの action は deal.* / contract.* / invoice.* / meeting.* / action_item.* / deal_contact.* 等、案件配下の出来事を含む
- src/application/usecases/getRecentActivities.ts — 監査ログ（AuditLog[]）を返すのみ。人間可読な整形は表示側（最近のアクティビティ表示）で行っている
- src/app/(dashboard)/deals/[id]/page.tsx — SectionCard を並べてセクションを構成する

## 定数

- ACTIVITY_TIMELINE_LIMIT: 30   # タイムラインの表示件数上限

## 要件

1. **env フィーチャーフラグ**: `process.env.ACTIVITY_FEED_ENABLED === "true"` のときだけ案件詳細ページにアクティビティを表示する。未設定または "true" 以外なら非表示で取得もしない。監査ログの記録には一切影響しない（記録は常時オン）
2. **表示アクションの除外フィルタ**: タイムラインに出すアクションを絞れるようにする。除外する action のリストを定数で定義し（既定は空＝全アクション表示）、`process.env.ACTIVITY_HIDDEN_ACTIONS`（カンマ区切りの action 名）で上書きできる。除外指定された action はタイムラインに出さない
3. **監査ログの対象別取得メソッド**: auditLogRepository に、organizationId ＋ 複数の (targetType, targetId) で監査ログを取得するメソッドを追加する。createdAt desc・件数上限対応。全クエリに organizationId 条件（テナント分離）を必須とする
4. **案件アクティビティ取得 usecase**: `getDealActivity({ dealId, organizationId })` を新設する。案件自身（targetType=deal, targetId=dealId）＋配下の子（商談 / 契約 / アクションアイテム / 案件連絡先）の id を既存リポジトリで解決し、それらの監査ログをまとめて取得する。createdAt desc・ACTIVITY_TIMELINE_LIMIT 件・除外アクションを除いた結果を返す
5. **audit_logs インデックス追加**: `(organization_id, created_at)` と `(target_type, target_id)` のインデックスを追加する（差分マイグレーション。既存データに触らない）
6. **タイムライン UI**: 案件詳細ページに「アクティビティ」SectionCard を追加する。各行に「いつ・誰が・何をしたか」を人間可読に表示する（actor 名・アクションのラベル・対象）。アクションのラベル整形は既存のアクティビティ表示（最近のアクティビティ）のロジックを流用・拡張し、二重実装を避ける

## スコープ外

- 案件以外（引合・顧客など）のアクティビティ画面（本リクエストは案件のみ）
- 通知センター・watch/購読（別リクエスト）
- 続き読み込み/ページング（先頭 ACTIVITY_TIMELINE_LIMIT 件のみ。以降は後続）
- 監査ログ metadata への親 dealId 付与による最適化（読み取り時の関係解決で対応。性能が問題化したら後続で検討）
- 監査ログ記録自体の ON/OFF（記録は常時オン。env で切り替えるのは表示のみ）

## 受け入れ基準

- [ ] ACTIVITY_FEED_ENABLED=true のとき案件詳細にアクティビティが表示され、未設定/false のとき表示も取得もされないことをテストで確認する
- [ ] getDealActivity が案件自身＋配下（商談/契約/アクションアイテム/案件連絡先）の監査ログを createdAt desc で ACTIVITY_TIMELINE_LIMIT 件返すことをテストで確認する
- [ ] ACTIVITY_HIDDEN_ACTIONS で指定した action がタイムラインに含まれないことをテストで確認する
- [ ] auditLogRepository の対象別取得が organizationId で絞られる（テナント分離）ことをテストで確認する
- [ ] audit_logs に (organization_id, created_at) と (target_type, target_id) のインデックスが存在する（差分マイグレーション）
- [ ] 依存方向 actions/RSC → usecases → domain / infrastructure を遵守する
- [ ] 既存テスト無変更で `bun test` green、`typecheck` green、`bun run build` 成功

## architect 評価済みの設計判断

1. **記録は常時オン、表示のみ env フラグで切り替え** — 監査ログはアクティビティと監査証跡の土台。記録を切るとアクティビティが空になり監査証跡も欠落するため切らない。切り替えるのは読み取り側（表示）のみ。これにより通知など他のイベント消費者とも独立を保つ
2. **読み取り側で関係解決（option B）、書き込み側への dealId 付与を却下** — 配下の子イベントは子の dealId から id を解決して監査ログを引く。各 usecase の監査記録（書き込みパス）を横断改修せず、既存の監査ログもそのまま対象にできる。性能が問題化したら後続で metadata に dealId を付与する最適化を検討する
3. **audit_logs にインデックスを追加** — 追記専用で無制限に増えるため、(organization_id, created_at) と (target_type, target_id) を張り、件数増でも案件別/組織別の取得が効くようにする。アクティビティ機能と無関係に既存の監査ログ画面の性能も改善する
4. **アクションのフィルタは除外リスト＋env 上書き** — 既定は全表示とし、ノイズの多いアクションを env で除外できるようにして表示をチューニングする。含めるリストでなく除外リストにするのは、新しい action が増えても既定で出る方が監査・把握漏れ防止に向くため
