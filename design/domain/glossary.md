# 用語集

エンティティ（model.md）の見出しは用語定義を兼ねる。ここには構造（属性・状態）を持たない語彙のみを置く。

## 商談 {#term-shodan}
関連先 relatedTo が案件または引合である [[ent-interaction]]（営業文脈）。営業の打ち合わせを指す。チャネルは会議が主だが電話・メールもありうる。UI/日本語表記は「商談」で統一する。独立したテーブルは持たず interactions で表す。

## 終端状態 {#term-terminal-state}
不可逆な最終状態。到達後は他状態へ遷移できない。案件の won/lost/passed（見送り）、契約の completed/cancelled、請求の paid、承認リクエストの approved/rejected/expired、引合の converted が該当する。案件の passed は当社都合でヒアリング後に追わないと判断した終端であり、競合・先方都合で負ける lost とは区別する。

## 仲介サービス {#term-agent-service}
マッチング費用が発生する案件紹介サービス（レディクルなど）。[[ent-inquiry]] の source が agent_service のとき、案件化時の承認要否判定に影響する。

## テナント分離 {#term-tenant-isolation}
すべてのデータアクセスに organizationId フィルタを適用し、テナントをまたぐ参照を不可能にする性質。認可とは別の関心事で、リポジトリ層で強制する。

## タイムライン {#term-timeline}
案件配下で発生した顧客接点と業務イベントを監査ログから厳選・集約し新しい順に並べた読み取り表示。UI 呼称は「アクティビティ」。独立したエンティティではなく表示の選別基準として用いる。監査ログを無選別には流さない。

## 業務イベント {#term-business-event}
業務上意味のある節目・発生事実（フェーズ変更・受注・失注・契約締結・請求発行・入金）。専用テーブルを持たず [[ent-audit-log]] から読み取って [[term-timeline]] に構成する。ドメインイベント（[[ent-domain-event]]）とは別概念で、こちらは表示のための分類語である。

## 楽観的ロック {#term-optimistic-lock}
version カラムを比較して並行更新の衝突を検出する仕組み。状態遷移で重複更新（重複 Deal 生成など）を防ぐために用いる。
</content>
