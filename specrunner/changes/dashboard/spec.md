# Spec: ダッシュボードの実装

## Requirements

### Requirement: `/dashboard` にアクセスするとロール別ダッシュボードが表示される

`/dashboard` SHALL ログインユーザーのロールに応じて営業ダッシュボード（member / manager / admin）または経理ダッシュボード（finance）を表示すること。

#### Scenario: member ロールで営業ダッシュボードが表示される

**Given** member ロールのユーザーがログインしている
**When** `/dashboard` にアクセスする
**Then** 営業ダッシュボード（アクション待ちリスト、パイプラインサマリ、直近の活動）が表示される

#### Scenario: manager ロールで営業ダッシュボード + 停滞案件が表示される

**Given** manager ロールのユーザーがログインしている
**When** `/dashboard` にアクセスする
**Then** 営業ダッシュボードに加え、停滞案件リストが表示される

#### Scenario: admin ロールで営業ダッシュボード + 停滞案件が表示される

**Given** admin ロールのユーザーがログインしている
**When** `/dashboard` にアクセスする
**Then** 営業ダッシュボードに加え、停滞案件リストが表示される

#### Scenario: finance ロールで経理ダッシュボードが表示される

**Given** finance ロールのユーザーがログインしている
**When** `/dashboard` にアクセスする
**Then** 経理ダッシュボード（期日超過請求、未入金請求、今月の売上サマリ、請求予定）が表示される

### Requirement: `/` が `/dashboard` にリダイレクトされる

`/` SHALL `/dashboard` にリダイレクトすること。

#### Scenario: ルートアクセスでダッシュボードにリダイレクトされる

**Given** ユーザーがログインしている
**When** `/` にアクセスする
**Then** `/dashboard` にリダイレクトされる

### Requirement: アクション待ちリストが 3 種類のアイテムを統合表示する

営業ダッシュボードのアクション待ちリスト SHALL 以下の 3 種類を期日の近い順に統合表示すること:
(a) `approverRole` がセッションユーザーのロールと一致する pending ステップを持つ承認リクエスト
(b) 全商談の未完了アクションアイテム（`done === false`）
(c) ステータスが `new` の引合

#### Scenario: ロール一致の承認リクエストが表示される

**Given** pending ステータスの承認ステップが存在し、そのステップの `approverRole` がログインユーザーのロールと一致する
**When** 営業ダッシュボードを表示する
**Then** 当該承認リクエストがアクション待ちリストに表示される

#### Scenario: ロール不一致の承認リクエストは表示されない

**Given** pending ステータスの承認ステップが存在するが、その `approverRole` がログインユーザーのロールと異なる
**When** 営業ダッシュボードを表示する
**Then** 当該承認リクエストはアクション待ちリストに表示されない

#### Scenario: 未完了アクションアイテムが表示される

**Given** 商談に `done === false` のアクションアイテムが存在する
**When** 営業ダッシュボードを表示する
**Then** 当該アクションアイテムがアクション待ちリストに表示される（assignee 表示付き）

#### Scenario: 完了済みアクションアイテムは表示されない

**Given** 商談のアクションアイテムが全て `done === true`
**When** 営業ダッシュボードを表示する
**Then** 当該アクションアイテムはアクション待ちリストに表示されない

#### Scenario: ステータス new の引合が表示される

**Given** ステータスが `new` の引合が存在する
**When** 営業ダッシュボードを表示する
**Then** 当該引合がアクション待ちリストに表示される

#### Scenario: アクション待ちリストが期日の近い順にソートされる

**Given** 複数のアクション待ちアイテムが異なる期日を持つ
**When** 営業ダッシュボードを表示する
**Then** 期日が近い順（昇順）に表示される。期日なしのアイテムは末尾に表示される

### Requirement: パイプラインサマリがフェーズ別に案件数と金額を表示する

営業ダッシュボード SHALL フェーズごとの案件数と想定金額合計を表示し、フェーズクリックで案件一覧（フィルタ済み）に遷移できること。

#### Scenario: フェーズ別に案件数と金額が集計される

**Given** 複数の案件がそれぞれ異なるフェーズと想定金額を持つ
**When** 営業ダッシュボードを表示する
**Then** 各フェーズについて案件数と想定金額の合計が表示される

#### Scenario: フェーズクリックで案件一覧にフィルタ遷移する

**Given** パイプラインサマリに「提案準備: 3 件」が表示されている
**When** 「提案準備」をクリックする
**Then** `/deals?phase=proposal_prep` に遷移する

### Requirement: 直近の活動が監査ログ 20 件を表示する

営業ダッシュボード SHALL 組織内の最新監査ログを 20 件表示し、対象エンティティへのリンクを含むこと。

#### Scenario: 最新 20 件の監査ログが表示される

**Given** 組織に 30 件の監査ログが存在する
**When** 営業ダッシュボードを表示する
**Then** 最新の 20 件が時系列降順で表示される

#### Scenario: 監査ログからエンティティ詳細に遷移できる

**Given** 監査ログに `targetType: "deal"`, `targetId: "xxx"` のエントリがある
**When** 当該ログの対象リンクをクリックする
**Then** `/deals/xxx` に遷移する

### Requirement: manager/admin ロールに停滞案件リストが表示される

営業ダッシュボード SHALL manager / admin ロールのユーザーに対し、`updatedAt` が 14 日以上前かつ `phase` が `won`/`lost` でない案件を停滞案件として表示すること。

#### Scenario: updatedAt が 14 日以上前の進行中案件が停滞案件として表示される

**Given** `updatedAt` が現在から 15 日前で `phase` が `negotiation` の案件が存在する
**When** manager ロールで営業ダッシュボードを表示する
**Then** 当該案件が停滞案件リストに表示される

#### Scenario: updatedAt が 14 日未満の案件は停滞案件に含まれない

**Given** `updatedAt` が現在から 10 日前で `phase` が `negotiation` の案件が存在する
**When** manager ロールで営業ダッシュボードを表示する
**Then** 当該案件は停滞案件リストに表示されない

#### Scenario: won/lost フェーズの案件は停滞案件に含まれない

**Given** `updatedAt` が現在から 30 日前で `phase` が `won` の案件が存在する
**When** manager ロールで営業ダッシュボードを表示する
**Then** 当該案件は停滞案件リストに表示されない

#### Scenario: member ロールでは停滞案件リストが表示されない

**Given** member ロールのユーザーがログインしている
**When** 営業ダッシュボードを表示する
**Then** 停滞案件リストのセクションが表示されない

### Requirement: listInvoicesByOrganization ユースケースが組織単位で請求を取得する

`listInvoicesByOrganization` SHALL `organizationId` で請求を取得し、オプションの `status`, `paidAt` 期間, `issueDate` 期間フィルタを受け付けること。

#### Scenario: status フィルタで請求を取得する

**Given** 組織に status が `overdue`, `invoiced`, `paid` の請求がそれぞれ存在する
**When** `listInvoicesByOrganization(orgId, { status: "overdue" })` を呼ぶ
**Then** status が `overdue` の請求のみが返される

#### Scenario: paidAt 期間フィルタで請求を取得する

**Given** 組織に 2026-06-01 と 2026-05-15 に支払われた請求が存在する
**When** `listInvoicesByOrganization(orgId, { status: "paid", paidAtFrom: 2026-06-01T00:00:00Z, paidAtTo: 2026-07-01T00:00:00Z })` を呼ぶ（`paidAtTo` は翌月初を exclusive 境界として渡す）
**Then** 2026-06-01 に支払われた請求のみが返される

#### Scenario: issueDate 期間フィルタで請求を取得する

**Given** 組織に issueDate が 2026-06-15 と 2026-08-01 の予定請求が存在する
**When** `listInvoicesByOrganization(orgId, { status: "scheduled", issueDateFrom: 2026-06-01T00:00:00Z, issueDateTo: 2026-08-01T00:00:00Z })` を呼ぶ（`issueDateTo` は翌々月初を exclusive 境界として渡す）
**Then** issueDate が 2026-06-15 の請求のみが返される

#### Scenario: organizationId によるテナント分離

**Given** 組織 A と組織 B にそれぞれ請求が存在する
**When** `listInvoicesByOrganization(orgAId)` を呼ぶ
**Then** 組織 A の請求のみが返される

### Requirement: 経理ダッシュボードに期日超過・未入金の請求が表示される

経理ダッシュボード SHALL status = `overdue` の請求を支払期日順に、status = `invoiced` の請求を支払期日順にそれぞれ表示すること。

#### Scenario: 期日超過の請求が支払期日順に表示される

**Given** status が `overdue` の請求が複数存在する
**When** 経理ダッシュボードを表示する
**Then** 支払期日（dueDate）の昇順で表示される

#### Scenario: 未入金の請求が支払期日順に表示される

**Given** status が `invoiced` の請求が複数存在する
**When** 経理ダッシュボードを表示する
**Then** 支払期日（dueDate）の昇順で表示される

### Requirement: 経理ダッシュボードに今月の売上サマリが表示される

経理ダッシュボード SHALL status = `paid` かつ `paidAt` が今月（月初 00:00:00 UTC 〜 翌月初 00:00:00 UTC）の請求の `amount` 合計を表示すること。

#### Scenario: 今月の入金済み請求の合計が表示される

**Given** 今月に `paidAt` が設定された paid 請求が 3 件あり、金額がそれぞれ 100,000, 200,000, 300,000
**When** 経理ダッシュボードを表示する
**Then** 今月の売上サマリに ¥600,000 が表示される

### Requirement: 経理ダッシュボードに請求予定が表示される

経理ダッシュボード SHALL status = `scheduled` かつ `issueDate` が今月初日〜翌月末日（UTC）の請求を表示すること。

#### Scenario: 今月・翌月の請求予定が表示される

**Given** status が `scheduled` で issueDate が今月 15 日と翌月 10 日の請求が存在する
**When** 経理ダッシュボードを表示する
**Then** 両方の請求が請求予定セクションに表示される

#### Scenario: 翌々月以降の請求予定は表示されない

**Given** status が `scheduled` で issueDate が 3 ヶ月後の請求が存在する
**When** 経理ダッシュボードを表示する
**Then** 当該請求は請求予定セクションに表示されない

### Requirement: グローバルナビゲーションにダッシュボードリンクが存在する

グローバルナビゲーション SHALL ダッシュボードへのリンクを含むこと。

#### Scenario: ナビゲーションにダッシュボードリンクが表示される

**Given** ユーザーがログインしている
**When** いずれかのページを表示する
**Then** グローバルナビゲーションに「ダッシュボード」リンクが表示され、`/dashboard` に遷移する
