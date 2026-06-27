# Spec: 案件アクティビティ・タイムライン

## Requirements

### Requirement: フィーチャーフラグによる表示制御

案件詳細ページのアクティビティ表示は `process.env.ACTIVITY_FEED_ENABLED` で制御されなければならない（SHALL）。`"true"` のときのみアクティビティセクションを表示し、usecase を呼び出す。未設定または `"true"` 以外の場合、アクティビティセクションは表示されず、getDealActivity の呼び出しも発生してはならない。監査ログの記録には一切影響しない。

#### Scenario: ACTIVITY_FEED_ENABLED=true のとき表示される

**Given** `process.env.ACTIVITY_FEED_ENABLED` が `"true"` に設定されている
**When** ユーザーが案件詳細ページにアクセスする
**Then** アクティビティ SectionCard が表示され、getDealActivity が呼び出される

#### Scenario: ACTIVITY_FEED_ENABLED が未設定のとき非表示

**Given** `process.env.ACTIVITY_FEED_ENABLED` が未設定である
**When** ユーザーが案件詳細ページにアクセスする
**Then** アクティビティ SectionCard は表示されず、getDealActivity は呼び出されない

#### Scenario: ACTIVITY_FEED_ENABLED=false のとき非表示

**Given** `process.env.ACTIVITY_FEED_ENABLED` が `"false"` に設定されている
**When** ユーザーが案件詳細ページにアクセスする
**Then** アクティビティ SectionCard は表示されず、getDealActivity は呼び出されない

---

### Requirement: getDealActivity が案件自身＋配下の監査ログを返す

`getDealActivity` usecase は、案件自身（targetType=deal, targetId=dealId）および配下の子エンティティ（商談・契約・アクションアイテム・案件連絡先）の監査ログを createdAt desc で ACTIVITY_TIMELINE_LIMIT（30）件まで返さなければならない（SHALL）。

#### Scenario: 案件自身と配下の監査ログが統合して返る

**Given** 案件 A が存在し、配下に商談 M1・契約 C1・アクションアイテム AI1・案件連絡先 DC1 がある
**When** `getDealActivity({ dealId: A.id, organizationId })` が呼び出される
**Then** targetType=deal/targetId=A.id、targetType=meeting/targetId=M1.id、targetType=contract/targetId=C1.id、targetType=action_item/targetId=AI1.id、targetType=deal_contact/targetId=DC1.id の監査ログが createdAt desc で返される

#### Scenario: 件数が ACTIVITY_TIMELINE_LIMIT を超える場合

**Given** 案件 A に関連する監査ログが 50 件存在する
**When** `getDealActivity({ dealId: A.id, organizationId })` が呼び出される
**Then** 結果は createdAt desc で先頭 30 件のみ返される

---

### Requirement: 除外アクションフィルタ

タイムラインに表示するアクションは除外リストでフィルタされなければならない（SHALL）。既定の除外リストは空（全アクション表示）。`process.env.ACTIVITY_HIDDEN_ACTIONS` にカンマ区切りで action 名を指定すると、該当する action はタイムラインに含まれない。

#### Scenario: 除外アクション未指定（既定）

**Given** `process.env.ACTIVITY_HIDDEN_ACTIONS` が未設定
**When** getDealActivity が実行される
**Then** すべての action の監査ログがタイムラインに含まれる

#### Scenario: 除外アクション指定

**Given** `process.env.ACTIVITY_HIDDEN_ACTIONS` が `"deal.view,meeting.view"` に設定されている
**When** getDealActivity が実行される
**Then** action が `"deal.view"` および `"meeting.view"` の監査ログはタイムラインに含まれない

---

### Requirement: auditLogRepository の対象別取得がテナント分離される

`auditLogRepository.findByTargets` は organizationId を必須パラメータとし、すべてのクエリに organizationId 条件を含めなければならない（MUST）。異なる組織のデータが返されてはならない。

#### Scenario: organizationId 条件でフィルタされる

**Given** 組織 A と組織 B が存在し、同一 targetType/targetId の監査ログがそれぞれにある
**When** `findByTargets(orgA.id, targets, options)` が呼び出される
**Then** 組織 A の監査ログのみが返され、組織 B のログは含まれない

---

### Requirement: audit_logs インデックスの存在

`audit_logs` テーブルに `(organization_id, created_at)` と `(target_type, target_id)` のインデックスが差分マイグレーションで追加されなければならない（MUST）。既存データに変更を加えてはならない。

#### Scenario: インデックスがスキーマに定義されている

**Given** `src/infrastructure/schema.ts` の `auditLogs` テーブル定義
**When** スキーマファイルを確認する
**Then** `(organization_id, created_at)` と `(target_type, target_id)` のインデックス定義が存在する

#### Scenario: マイグレーション SQL にインデックス作成文がある

**Given** drizzle マイグレーションディレクトリ
**When** 最新のマイグレーション SQL を確認する
**Then** `CREATE INDEX` 文が 2 つ存在し、既存テーブルのデータ変更文（ALTER COLUMN, DROP 等）は含まれない

---

### Requirement: 依存方向の遵守

本変更で追加するコードは `actions/RSC → usecases → domain / infrastructure` の依存方向を遵守しなければならない（MUST）。usecase は repository を呼び出してよいが、repository が usecase を呼び出してはならない。UI コンポーネントは usecase を直接 import してよい（RSC のため）。

#### Scenario: getDealActivity usecase の依存

**Given** `src/application/usecases/getDealActivity.ts`
**When** import 文を確認する
**Then** `@/infrastructure/repositories` と `@/domain` 配下のみを import しており、`@/app` や他の usecase からの循環参照がない
