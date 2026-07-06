# アクター

システムロールは `Role = admin | member | manager | finance`（src/domain/models/user.ts）に対応する。承認者は文脈的アクター。

## メンバー {#act-member}
組織の一般ロール。担当する [[ent-inquiry]] や [[ent-deal]] の日常操作（活動記録・アクションアイテム）に責任を持つ。

## マネージャ {#act-manager}
案件化・契約作成など、承認ポリシーの対象となる管理操作を行うロール。[[ent-approval-step]] の承認者ロールに指定されることが多い。

## 財務 {#act-finance}
[[ent-invoice]] の入金確認と [[ent-revenue]] の実績計上に責任を持つロール。

## 管理者 {#act-admin}
[[ent-organization]] の設定、ユーザーとロールの管理、[[ent-approval-policy]] の運用に責任を持つロール。

## 承認者 {#act-approver}
文脈的アクター。[[ent-approval-step]] の承認者ロールに合致するロールの保持者を指し、[[ent-approval-delegation]] により委任先が代理することがある。
