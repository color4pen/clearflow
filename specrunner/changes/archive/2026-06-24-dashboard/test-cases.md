# Test Cases: ダッシュボードの実装

## Summary

- **Total**: 70 cases
- **Automated** (unit/integration): 57
- **Manual**: 13
- **Priority**: must: 44, should: 22, could: 4

---

## カテゴリ1: ルーティング / ナビゲーション

### TC-001: ルートアクセスで `/dashboard` にリダイレクトされる

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: `/` が `/dashboard` にリダイレクトされる > Scenario: ルートアクセスでダッシュボードにリダイレクトされる

### TC-002: ナビゲーションにダッシュボードリンクが表示される

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: グローバルナビゲーションにダッシュボードリンクが存在する > Scenario: ナビゲーションにダッシュボードリンクが表示される

### TC-003: 未認証ユーザーが `/dashboard` にアクセスすると `/login` にリダイレクトされる

- **Category**: integration
- **Priority**: must
- **Source**: tasks.md > T-05
- **GIVEN** 未認証の状態（セッションなし）
- **WHEN** `/dashboard` にアクセスする
- **THEN** `/login` にリダイレクトされる

### TC-004: 既存のナビゲーションリンクが維持されている

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-07
- **GIVEN** ユーザーがログインしている
- **WHEN** いずれかのページを表示する
- **THEN** 既存のナビゲーションリンク（顧客・引き合い・案件・契約・売上・申請一覧）が変わらず表示される

### TC-005: ダッシュボードリンクがナビゲーションの先頭に配置されている

- **Category**: manual
- **Priority**: should
- **Source**: tasks.md > T-07
- **GIVEN** ユーザーがログインしている
- **WHEN** グローバルナビゲーションを確認する
- **THEN** 「ダッシュボード」リンクがナビゲーション内の最初のリンクとして配置されている

---

## カテゴリ2: ロール別表示切替

### TC-011: member ロールで営業ダッシュボードが表示される

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: `/dashboard` にアクセスするとロール別ダッシュボードが表示される > Scenario: member ロールで営業ダッシュボードが表示される

### TC-012: manager ロールで営業ダッシュボード + 停滞案件が表示される

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: `/dashboard` にアクセスするとロール別ダッシュボードが表示される > Scenario: manager ロールで営業ダッシュボード + 停滞案件が表示される

### TC-013: admin ロールで営業ダッシュボード + 停滞案件が表示される

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: `/dashboard` にアクセスするとロール別ダッシュボードが表示される > Scenario: admin ロールで営業ダッシュボード + 停滞案件が表示される

### TC-014: finance ロールで経理ダッシュボードが表示される

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: `/dashboard` にアクセスするとロール別ダッシュボードが表示される > Scenario: finance ロールで経理ダッシュボードが表示される

### TC-015: finance ロールのユーザーには営業ダッシュボードのセクションが表示されない

- **Category**: integration
- **Priority**: should
- **Source**: design.md > D6
- **GIVEN** finance ロールのユーザーがログインしている
- **WHEN** `/dashboard` にアクセスする
- **THEN** アクション待ちリスト・パイプラインサマリ・直近の活動セクションが表示されない

### TC-016: 営業系ロールのユーザーには経理ダッシュボードのセクションが表示されない

- **Category**: integration
- **Priority**: should
- **Source**: design.md > D6
- **GIVEN** member ロールのユーザーがログインしている
- **WHEN** `/dashboard` にアクセスする
- **THEN** 期日超過請求・未入金請求・売上サマリ・請求予定セクションが表示されない

---

## カテゴリ3: 営業ダッシュボード — アクション待ちリスト

### TC-021: ロール一致の承認リクエストが表示される

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: アクション待ちリストが 3 種類のアイテムを統合表示する > Scenario: ロール一致の承認リクエストが表示される

### TC-022: ロール不一致の承認リクエストは表示されない

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: アクション待ちリストが 3 種類のアイテムを統合表示する > Scenario: ロール不一致の承認リクエストは表示されない

### TC-023: 未完了アクションアイテムが表示される

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: アクション待ちリストが 3 種類のアイテムを統合表示する > Scenario: 未完了アクションアイテムが表示される

### TC-024: 完了済みアクションアイテムは表示されない

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: アクション待ちリストが 3 種類のアイテムを統合表示する > Scenario: 完了済みアクションアイテムは表示されない

### TC-025: ステータス new の引合が表示される

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: アクション待ちリストが 3 種類のアイテムを統合表示する > Scenario: ステータス new の引合が表示される

### TC-026: アクション待ちリストが期日昇順でソートされ null は末尾

- **Category**: unit
- **Priority**: must
- **Source**: spec.md > Requirement: アクション待ちリストが 3 種類のアイテムを統合表示する > Scenario: アクション待ちリストが期日の近い順にソートされる

### TC-027: アクションアイテムに assignee が表示される

- **Category**: integration
- **Priority**: should
- **Source**: tasks.md > T-05
- **GIVEN** 商談に `done: false`・`assignee: "山田 太郎"` のアクションアイテムが存在する
- **WHEN** 営業ダッシュボードを表示する
- **THEN** アクション待ちリストに担当者名「山田 太郎」が表示される

### TC-028: アクション待ちリストの各アイテムに対象エンティティへのリンクが含まれる

- **Category**: manual
- **Priority**: should
- **Source**: tasks.md > T-05
- **GIVEN** 承認リクエスト・アクションアイテム・引合がアクション待ちリストに表示されている
- **WHEN** 各アイテムを確認する
- **THEN** 承認リクエストは `/requests/{id}`、アクションアイテムは `/deals/{dealId}`、引合は `/inquiries/{id}` へのリンクを持つ

### TC-029: ステータスが new でない引合はアクション待ちリストに表示されない

- **Category**: unit
- **Priority**: should
- **Source**: design.md > D3
- **GIVEN** ステータスが `in_progress` の引合が存在する
- **WHEN** `getDashboardActions(orgId, userRole)` を呼ぶ
- **THEN** 当該引合は結果に含まれない

### TC-030: 承認済みの承認リクエストはアクション待ちリストに表示されない

- **Category**: unit
- **Priority**: should
- **Source**: design.md > D3
- **GIVEN** ステータスが `approved` の承認リクエストが存在し、`approverRole` はログインユーザーのロールと一致する
- **WHEN** `getDashboardActions(orgId, userRole)` を呼ぶ
- **THEN** 当該承認リクエストは結果に含まれない

---

## カテゴリ4: 営業ダッシュボード — パイプラインサマリ

### TC-031: フェーズ別に案件数と金額が集計される

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: パイプラインサマリがフェーズ別に案件数と金額を表示する > Scenario: フェーズ別に案件数と金額が集計される

### TC-032: フェーズクリックで案件一覧にフィルタ遷移する

- **Category**: manual
- **Priority**: should
- **Source**: spec.md > Requirement: パイプラインサマリがフェーズ別に案件数と金額を表示する > Scenario: フェーズクリックで案件一覧にフィルタ遷移する

### TC-033: 案件が 0 件のフェーズも全 5 フェーズ表示される

- **Category**: unit
- **Priority**: should
- **Source**: tasks.md > T-04
- **GIVEN** `proposal_prep` フェーズに案件が 0 件で、他フェーズに案件がある
- **WHEN** `getPipelineSummary(orgId)` を呼ぶ
- **THEN** `proposal_prep` が `count: 0`・`totalAmount: 0` で結果に含まれる（全 5 フェーズが返される）

### TC-034: estimatedAmount が null の案件は金額 0 として集計される

- **Category**: unit
- **Priority**: should
- **Source**: tasks.md > T-04
- **GIVEN** `negotiation` フェーズに `estimatedAmount: null` の案件が 2 件ある
- **WHEN** `getPipelineSummary(orgId)` を呼ぶ
- **THEN** `negotiation` の `totalAmount` が 0 として集計される

### TC-035: フェーズの想定金額合計が正確に算出される

- **Category**: unit
- **Priority**: should
- **Source**: tasks.md > T-04
- **GIVEN** `proposed` フェーズに `estimatedAmount: 100000` と `estimatedAmount: 200000` の案件が 2 件ある
- **WHEN** `getPipelineSummary(orgId)` を呼ぶ
- **THEN** `proposed` の `totalAmount` が 300000 として返される

---

## カテゴリ5: 営業ダッシュボード — 直近の活動

### TC-041: 最新 20 件の監査ログが時系列降順で表示される

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: 直近の活動が監査ログ 20 件を表示する > Scenario: 最新 20 件の監査ログが表示される

### TC-042: 監査ログからエンティティ詳細に遷移できる

- **Category**: manual
- **Priority**: should
- **Source**: spec.md > Requirement: 直近の活動が監査ログ 20 件を表示する > Scenario: 監査ログからエンティティ詳細に遷移できる

### TC-043: targetType が invoice の監査ログはリンクなしで表示される

- **Category**: integration
- **Priority**: should
- **Source**: tasks.md > T-05
- **GIVEN** 監査ログに `targetType: "invoice"` のエントリがある
- **WHEN** 営業ダッシュボードの直近の活動セクションを表示する
- **THEN** 当該ログはリンクなし（または非活性）で表示される

### TC-044: targetType が deal の監査ログは `/deals/{targetId}` リンクを持つ

- **Category**: integration
- **Priority**: should
- **Source**: tasks.md > T-05
- **GIVEN** 監査ログに `targetType: "deal"`, `targetId: "deal-001"` のエントリがある
- **WHEN** 営業ダッシュボードの直近の活動セクションを表示する
- **THEN** 当該エントリに `/deals/deal-001` へのリンクが存在する

### TC-045: 監査ログが 20 件未満の場合は全件表示される

- **Category**: integration
- **Priority**: could
- **Source**: tasks.md > T-05
- **GIVEN** 組織に監査ログが 10 件のみ存在する
- **WHEN** 営業ダッシュボードを表示する
- **THEN** 10 件全ての監査ログが表示される

---

## カテゴリ6: 営業ダッシュボード — 停滞案件（manager/admin）

### TC-051: updatedAt が 15 日前・進行中フェーズの案件が停滞案件として表示される

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: manager/admin ロールに停滞案件リストが表示される > Scenario: updatedAt が 14 日以上前の進行中案件が停滞案件として表示される

### TC-052: updatedAt が 10 日前の案件は停滞案件に含まれない

- **Category**: unit
- **Priority**: must
- **Source**: spec.md > Requirement: manager/admin ロールに停滞案件リストが表示される > Scenario: updatedAt が 14 日未満の案件は停滞案件に含まれない

### TC-053: won/lost フェーズの案件は updatedAt が 30 日前でも停滞案件に含まれない

- **Category**: unit
- **Priority**: must
- **Source**: spec.md > Requirement: manager/admin ロールに停滞案件リストが表示される > Scenario: won/lost フェーズの案件は停滞案件に含まれない

### TC-054: member ロールでは停滞案件セクションが表示されない

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: manager/admin ロールに停滞案件リストが表示される > Scenario: member ロールでは停滞案件リストが表示されない

### TC-055: 停滞案件リストの各行に案件詳細リンクが含まれる

- **Category**: manual
- **Priority**: should
- **Source**: tasks.md > T-05
- **GIVEN** manager ロールで停滞案件が 1 件以上存在する
- **WHEN** 停滞案件リストを表示する
- **THEN** 各行に案件名・フェーズ・最終更新日と `/deals/{id}` へのリンクが含まれる

### TC-056: updatedAt がちょうど 14 日前の案件は停滞案件に含まれる（境界値）

- **Category**: unit
- **Priority**: could
- **Source**: request.md（境界値）
- **GIVEN** `updatedAt` が現在からちょうど 14 日前で `phase` が `negotiation` の案件が存在する
- **WHEN** アプリケーション層で停滞案件フィルタを適用する
- **THEN** 当該案件が停滞案件として含まれる（14 日以上前 = 14 日丁度を含む）

---

## カテゴリ7: listInvoicesByOrganization ユースケース

### TC-061: status フィルタで overdue のみ返される

- **Category**: unit
- **Priority**: must
- **Source**: spec.md > Requirement: listInvoicesByOrganization ユースケースが組織単位で請求を取得する > Scenario: status フィルタで請求を取得する

### TC-062: paidAt 期間フィルタで範囲内の paid 請求のみ返される

- **Category**: unit
- **Priority**: must
- **Source**: spec.md > Requirement: listInvoicesByOrganization ユースケースが組織単位で請求を取得する > Scenario: paidAt 期間フィルタで請求を取得する

### TC-063: issueDate 期間フィルタで範囲内の scheduled 請求のみ返される

- **Category**: unit
- **Priority**: must
- **Source**: spec.md > Requirement: listInvoicesByOrganization ユースケースが組織単位で請求を取得する > Scenario: issueDate 期間フィルタで請求を取得する

### TC-064: organizationId によって他テナントの請求が返されない

- **Category**: unit
- **Priority**: must
- **Source**: spec.md > Requirement: listInvoicesByOrganization ユースケースが組織単位で請求を取得する > Scenario: organizationId によるテナント分離

### TC-065: フィルタなしで組織の全請求が返される

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-01
- **GIVEN** 組織に overdue・invoiced・paid の請求が各 1 件存在する
- **WHEN** `findAllByOrganization(orgId)` をフィルタなしで呼ぶ
- **THEN** 3 件全ての請求が返される

### TC-066: 返却結果が dueDate 昇順でソートされている

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-01
- **GIVEN** 組織に dueDate が異なる複数の請求が存在する
- **WHEN** `findAllByOrganization(orgId)` を呼ぶ
- **THEN** 結果が `dueDate` の昇順で返される

### TC-067: listInvoicesByOrganization が usecases/index.ts からエクスポートされている

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-02
- **GIVEN** `src/application/usecases/index.ts` が存在する
- **WHEN** `import { listInvoicesByOrganization } from "@/application/usecases"` を実行する
- **THEN** モジュールが正常にインポートできる（typecheck が green）

### TC-068: paidAtTo は exclusive 境界として機能する

- **Category**: unit
- **Priority**: should
- **Source**: tasks.md > T-01
- **GIVEN** 組織に `paidAt: 2026-07-01T00:00:00Z`（翌月初）の paid 請求が存在する
- **WHEN** `findAllByOrganization(orgId, { status: "paid", paidAtFrom: 2026-06-01T00:00:00Z, paidAtTo: 2026-07-01T00:00:00Z })` を呼ぶ
- **THEN** 当該請求は返されない（`lt` による exclusive 境界）

---

## カテゴリ8: 経理ダッシュボード — 期日超過 / 未入金の請求

### TC-071: 期日超過の請求が支払期日昇順で表示される

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: 経理ダッシュボードに期日超過・未入金の請求が表示される > Scenario: 期日超過の請求が支払期日順に表示される

### TC-072: 未入金の請求が支払期日昇順で表示される

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: 経理ダッシュボードに期日超過・未入金の請求が表示される > Scenario: 未入金の請求が支払期日順に表示される

### TC-073: 各請求行に契約詳細（`/contracts/{contractId}`）へのリンクが含まれる

- **Category**: manual
- **Priority**: should
- **Source**: tasks.md > T-06
- **GIVEN** finance ロールで経理ダッシュボードを表示する
- **WHEN** 期日超過・未入金の請求リストを確認する
- **THEN** 各行に `/contracts/{contractId}` へのリンクが含まれる

### TC-074: 期日超過セクションに invoiced ステータスの請求は表示されない

- **Category**: integration
- **Priority**: should
- **Source**: design.md > D7
- **GIVEN** status が `invoiced` の請求が複数存在する
- **WHEN** 経理ダッシュボードを表示する
- **THEN** `invoiced` 請求は「期日超過の請求」セクションに含まれず「未入金の請求」セクションのみに表示される

---

## カテゴリ9: 経理ダッシュボード — 今月の売上サマリ

### TC-081: 今月の入金済み請求の合計が表示される

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: 経理ダッシュボードに今月の売上サマリが表示される > Scenario: 今月の入金済み請求の合計が表示される

### TC-082: 前月に支払われた paid 請求は今月の売上サマリに含まれない

- **Category**: unit
- **Priority**: should
- **Source**: tasks.md > T-06
- **GIVEN** `paidAt` が前月の paid 請求が存在する
- **WHEN** `listInvoicesByOrganization({ organizationId, status: "paid", paidAtFrom: monthStart, paidAtTo: nextMonthStart })` を呼ぶ
- **THEN** 当該請求は返されない（今月の売上サマリに含まれない）

### TC-083: 今月の売上サマリが ¥xxx,xxx 形式で大きく表示される

- **Category**: manual
- **Priority**: should
- **Source**: tasks.md > T-06
- **GIVEN** 今月の paid 請求の合計が 600,000 円
- **WHEN** 経理ダッシュボードを表示する
- **THEN** 今月の売上サマリに「¥600,000」形式で金額が大きく表示される

### TC-084: 今月の paid 請求が 0 件の場合は ¥0 が表示される

- **Category**: integration
- **Priority**: could
- **Source**: tasks.md > T-06
- **GIVEN** 今月に `paidAt` が設定された paid 請求が 0 件
- **WHEN** 経理ダッシュボードを表示する
- **THEN** 今月の売上サマリに ¥0 が表示される（エラーにならない）

---

## カテゴリ10: 経理ダッシュボード — 請求予定

### TC-091: 今月・翌月の請求予定が表示される

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: 経理ダッシュボードに請求予定が表示される > Scenario: 今月・翌月の請求予定が表示される

### TC-092: 翌々月以降の請求予定は表示されない

- **Category**: unit
- **Priority**: must
- **Source**: spec.md > Requirement: 経理ダッシュボードに請求予定が表示される > Scenario: 翌々月以降の請求予定は表示されない

### TC-093: issueDateTo（翌々月初 UTC）は exclusive 境界として機能する

- **Category**: unit
- **Priority**: should
- **Source**: tasks.md > T-06
- **GIVEN** status が `scheduled` で `issueDate` が翌々月 1 日 00:00:00 UTC の請求が存在する
- **WHEN** `findAllByOrganization(orgId, { status: "scheduled", issueDateFrom: monthStart, issueDateTo: nextNextMonthStart })` を呼ぶ
- **THEN** 当該請求は返されない（`lt` による exclusive 境界）

### TC-094: 月初・翌月初・翌々月初が UTC ベースで計算される

- **Category**: unit
- **Priority**: could
- **Source**: tasks.md > T-06
- **GIVEN** UTC と日本時間で月をまたぐ日時（例: JST 月初 00:00〜08:59 は UTC では前月末）
- **WHEN** ダッシュボードページで月初・翌月初・翌々月初を計算する
- **THEN** `Date.UTC(year, month, 1)` で UTC 基準に計算され、タイムゾーンに依存しない

---

## カテゴリ11: ユニットテスト（T-08）

### TC-101: getDashboardActions — ロール一致の pending 承認リクエストのみ含まれる

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-08
- **GIVEN** `approverRole: "member"` の pending ステップと `approverRole: "manager"` の pending ステップが存在する
- **WHEN** `getDashboardActions(orgId, "member")` を呼ぶ
- **THEN** `approverRole: "member"` のリクエストのみが結果に含まれる

### TC-102: getDashboardActions — done === false のアクションアイテムのみ含まれる

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-08
- **GIVEN** `done: false` のアクションアイテムと `done: true` のアクションアイテムが混在する
- **WHEN** `getDashboardActions(orgId, "member")` を呼ぶ
- **THEN** `done: false` のアイテムのみ結果に含まれる

### TC-103: getDashboardActions — status === "new" の引合のみ含まれる

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-08
- **GIVEN** status が `new` と `in_progress` の引合が存在する
- **WHEN** `getDashboardActions(orgId, "member")` を呼ぶ
- **THEN** status が `new` の引合のみ結果に含まれる

### TC-104: getDashboardActions — 期日昇順でソートされ null は末尾

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-08
- **GIVEN** dueDate が `2026-07-01`・`2026-06-15`・`null` のアイテムが存在する
- **WHEN** `getDashboardActions(orgId, "member")` を呼ぶ
- **THEN** 結果の順序が [2026-06-15, 2026-07-01, null] となる

### TC-105: getPipelineSummary — 全 5 フェーズの集計結果が返される

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-08
- **GIVEN** `proposal_prep` と `won` にのみ案件が存在する
- **WHEN** `getPipelineSummary(orgId)` を呼ぶ
- **THEN** `proposed`・`negotiation`・`lost` も `count: 0`・`totalAmount: 0` で結果に含まれる

### TC-106: getPipelineSummary — estimatedAmount が null の案件は金額 0 扱い

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-08
- **GIVEN** `negotiation` フェーズの案件の `estimatedAmount` が null
- **WHEN** `getPipelineSummary(orgId)` を呼ぶ
- **THEN** `negotiation` の `totalAmount` が 0 として返される

### TC-107: listInvoicesByOrganization — status フィルタが適用される（ユニット）

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-08
- **GIVEN** 組織に overdue・invoiced・paid の請求が各 1 件
- **WHEN** `listInvoicesByOrganization({ organizationId, status: "overdue" })` を呼ぶ
- **THEN** overdue の請求のみ 1 件返される

### TC-108: listInvoicesByOrganization — paidAt 期間フィルタが適用される（ユニット）

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-08
- **GIVEN** `paidAt` が今月と先月の paid 請求が各 1 件存在する
- **WHEN** 今月の `paidAtFrom` / `paidAtTo` を指定して `listInvoicesByOrganization` を呼ぶ
- **THEN** 今月の請求のみ 1 件返される

### TC-109: listInvoicesByOrganization — issueDate 期間フィルタが適用される（ユニット）

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-08
- **GIVEN** `issueDate` が今月と 3 ヶ月後の scheduled 請求が各 1 件存在する
- **WHEN** 今月〜翌月の `issueDateFrom` / `issueDateTo` を指定して `listInvoicesByOrganization` を呼ぶ
- **THEN** 今月の請求のみ 1 件返される

---

## カテゴリ12: 型安全性 / ビルド

### TC-111: typecheck が green

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-09
- **GIVEN** 全タスクの実装が完了している
- **WHEN** `bun run typecheck` を実行する
- **THEN** 型エラーなしで完了する

### TC-112: 全テストが green

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-09
- **GIVEN** 全タスクの実装が完了している
- **WHEN** `bun run test` を実行する
- **THEN** 全テストが pass する

### TC-113: ビルドが成功する

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-09
- **GIVEN** 全タスクの実装が完了している
- **WHEN** `bun run build` を実行する
- **THEN** exit 0 で完了する

### TC-114: DashboardActionItem が判別可能ユニオン型として定義されている

- **Category**: unit
- **Priority**: should
- **Source**: design.md > D2
- **GIVEN** `src/domain/models/dashboard.ts` が存在する
- **WHEN** `DashboardActionItem` 型を確認する
- **THEN** `type: "approval" | "action_item" | "inquiry"` フィールドを持つ判別可能ユニオン型として定義されており、型ナローイングが機能する

---

## Result

```yaml
result: completed
total: 70
automated: 57
manual: 13
must: 44
should: 22
could: 4
blocked_reasons: []
```
