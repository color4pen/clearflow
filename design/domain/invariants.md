# 不変条件

1 見出し 1 本。個別に引用される粒度で記す。

## 引合の案件化には顧客が必要 {#inv-inquiry-convert-requires-client}
[[ent-inquiry]] を new から converted に遷移するには clientId が設定されていなければならない。

## 1 引合 1 案件 {#inv-one-deal-per-inquiry}
同一の引合から生成される [[ent-deal]] は 1 つだけ。案件化時に既存の案件が存在してはならない。DB の一意制約と [[term-optimistic-lock]] で担保する。

## converted は終端 {#inv-inquiry-converted-terminal}
converted は [[ent-inquiry]] の [[term-terminal-state]]。一度案件化した引合は引合に戻せない。declined からは new に戻せる。

## 案件の終端フェーズは不可逆 {#inv-deal-terminal-irreversible}
[[ent-deal]] の won / lost は [[term-terminal-state]]。到達後は他フェーズへ遷移できない。won / lost 以外のフェーズ間は順序制約なく自由に遷移できる。

## 案件には顧客が必須 {#inv-deal-requires-client}
[[ent-deal]] の clientId は必須。顧客が特定されていない案件は存在しない。

## 契約作成は受注済み案件のみ {#inv-contract-requires-won-deal}
[[ent-contract]] の作成は、参照する [[ent-deal]] の phase が won である場合のみ許可する。

## 契約には金額が必須 {#inv-contract-requires-amount}
[[ent-contract]] の amount は必須。売上（[[ent-revenue]]）の起点となるため、金額のない契約は許可しない。

## 契約の期間整合 {#inv-contract-date-order}
[[ent-contract]] の endDate が設定されている場合、startDate ≤ endDate でなければならない。

## 契約の終端状態 {#inv-contract-terminal}
[[ent-contract]] の completed / cancelled は [[term-terminal-state]]。active のみ他状態へ遷移できる。

## 請求の発行経由 {#inv-invoice-must-be-issued-before-paid}
[[ent-invoice]] は scheduled から paid へ直接遷移できない。invoiced（発行）を経る必要がある。paid は [[term-terminal-state]]。

## 入金には入金日が必須 {#inv-invoice-paid-requires-date}
[[ent-invoice]] を paid に遷移するとき paidAt が設定されなければならない。

## 請求の期間整合 {#inv-invoice-date-order}
[[ent-invoice]] の issueDate ≤ dueDate でなければならない。

## 単発契約の請求総額上限 {#inv-invoice-sum-within-contract}
[[ent-contract]] の renewalType が one_time の場合、同一契約に紐づく [[ent-invoice]] の合計金額は契約金額を超えてはならない。

## 顧客接点は関連先を持つ {#inv-interaction-requires-related}
[[ent-interaction]] は関連先 relatedTo（[[ent-deal]] / [[ent-inquiry]] / [[ent-contract]] / [[ent-invoice]] / [[ent-client]]）の少なくとも 1 つを持たなければならない。

## 主担当者は 1 名まで {#inv-single-primary-contact}
同一 [[ent-client]] 内で isPrimary が true の [[ent-client-contact]] は最大 1 名。

## ウォッチは一意 {#inv-watch-unique}
同一ユーザー・同一 [[ent-deal]] の [[ent-watch]] は 1 つだけ。重複登録は不可。

## 承認は全ポリシーを評価する {#inv-approval-evaluate-all-policies}
同一 triggerAction に複数の [[ent-approval-policy]] が該当する場合、すべてを評価し、条件に合致するすべてについて [[ent-approval-request]] を生成する。

## システム連動承認はブロックする {#inv-system-approval-blocks-action}
システム連動の [[ent-approval-request]] が pending の間、対象エンティティの状態は変更されない。同一エンティティ・同一アクションへの重複した承認リクエストは生成しない。

## 承認後アクションは同一トランザクション {#inv-post-approval-same-tx}
システム連動の [[ent-approval-request]] が approved になった後の対象ドメインアクションの実行は、承認リクエストの状態遷移と同一トランザクション内で行い、不整合を防ぐ。

## 承認ステップは順次処理 {#inv-approval-steps-sequential}
[[ent-approval-step]] は order 昇順に処理され、現ステップが approved になるまで次ステップは開始されない。全ステップ approved で [[ent-approval-request]] が approved、いずれか rejected で rejected または revision になる。

## 承認者の指定はいずれか一方 {#inv-approver-role-or-id}
[[ent-approval-step]]（および [[ent-approval-template]] のステップ定義）は approverRole と approverId のいずれか一方を持たなければならない。ロール指定なら該当ロールの誰でも、個人指定なら当該ユーザーのみが承認できる。

## 監査ログは追記専用 {#inv-audit-log-append-only}
[[ent-audit-log]] は追記のみ。記録後の更新・削除はしない。すべての記録は organizationId でテナント分離される。

## 全操作はテナント分離される {#inv-all-tenant-scoped}
すべてのエンティティのデータアクセスは organizationId で [[term-tenant-isolation]] される。テナントをまたぐアクセスは不可能とする。
</content>
