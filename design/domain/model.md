# ドメインモデル

各見出しは用語定義を兼ねる。属性は値オブジェクトも含めエンティティ単位にまとめ、関係は `[[ent-*]]` 参照で表す。状態遷移ルールは不変条件（invariants.md）に切り出す。

## 引合 {#ent-inquiry}
受託案件の起点となる顧客からの問い合わせ。案件化の判断に至るまでの情報を保持する。status は new / converted / declined を取り、source（web / phone / email / referral / agent_service / exhibition / other）で流入経路を表す。agent_service は [[term-agent-service]]。[[ent-client]] を参照する（受付時点では未特定でありうる）。案件化により [[ent-deal]] を 1 つ生成する。楽観的ロック（[[term-optimistic-lock]]）を持つ。

## 案件 {#ent-deal}
受注を目指して営業活動を行う対象。[[ent-inquiry]] から転換されるか直接作成される。phase は hearing（初期フェーズ）/ proposal_prep / proposed / negotiation / won / lost / passed の 7 値を取る。新規作成・引合転換の両経路とも phase 未指定で hearing が初期値となる。won / lost / passed は終端（[[inv-deal-terminal-irreversible]]）。contractType（quasi_delegation / fixed_price / ses）・想定金額・想定期間・営業担当・技術リードを保持する。[[ent-client]] を必須参照する。won 到達後に [[ent-contract]] を作成できる。

## 案件担当者 {#ent-deal-contact}
案件における顧客側担当者の役割付与。[[ent-deal]] と [[ent-client-contact]] を参照し、role（key_person / decision_maker / technical / other）をこの案件について定める。同一担当者が案件ごとに異なる役割を持ちうる。

## 顧客接点 {#ent-interaction}
顧客との接点の記録。kind（チャネル: meeting / call / email / note）で接触手段を、関連先 relatedTo で文脈を表す。関連先が案件/引合なら [[term-shodan]]（営業文脈、営業ステージ meetingType とヒアリング情報 HearingData を持つ）、契約なら契約調整、請求なら請求調整。[[ent-deal]] / [[ent-inquiry]] / [[ent-contract]] / [[ent-invoice]] / [[ent-client]] のいずれかを関連先として参照する。参加者（社内ユーザーまたは社外）を保持する。

## 顧客 {#ent-client}
取引先企業。[[ent-inquiry]] と [[ent-deal]] を通じて共有される。企業名・業種・規模・所在地を保持する。

## 顧客担当者 {#ent-client-contact}
顧客企業における担当者（個人）。複数案件で共有される。[[ent-client]] を参照し、氏名・部署・役職・連絡先・主担当フラグを保持する。案件ごとの役割は [[ent-deal-contact]] で表す。

## 契約 {#ent-contract}
受注した案件に対する契約。1 案件に複数存在しうる。status は active / completed / cancelled。契約金額（必須。売上の起点）・期間・支払条件・更新種別（one_time / recurring）を保持する。[[ent-deal]] を必須参照し（phase が won のときのみ作成可）、[[ent-client]] を非正規化保持する。

## 請求 {#ent-invoice}
契約に基づく請求。1 契約に複数存在しうる。status は scheduled / invoiced / paid / overdue。請求金額・請求予定日・支払期日・発行日時・入金日を保持する。[[ent-contract]] を必須参照する。

## アクションアイテム {#ent-action-item}
営業活動で発生するタスク（UI 呼称「タスク」）。内容・担当者・期日・完了状態を持つ。[[ent-interaction]] / [[ent-deal]] / [[ent-inquiry]] のいずれかに紐づくか、どこにも紐づかない個人タスクとして作成できる。[[term-timeline]] には表示しない別概念。

## ウォッチ {#ent-watch}
ユーザーが特定案件を購読し配下の更新を通知として受け取る登録。[[ent-deal]] を参照し、ユーザーと案件の組に対して 1 つ。

## 承認ポリシー {#ent-approval-policy}
どのドメインアクションが、どの条件下で承認を必要とするかの設定。triggerAction（inquiry.convert / contract.create / contract.cancel）と条件（field / operator / value、null なら常時）を持ち、[[ent-approval-template]] を参照する。明示的に一覧・管理できる設定であり、コードに埋め込む条件分岐ではない。

## 承認テンプレート {#ent-approval-template}
承認プロセスの手順（誰が何段階で承認するか）の定義。ステップ定義（順序・承認者ロールまたは指名・期限日数）の順序付きリストと、手動申請時の入力フォーム定義を持つ。ビジネスロジックは持たない。[[ent-approval-request]] へ実体化される。

## 承認リクエスト {#ent-approval-request}
個別の承認案件。[[ent-approval-template]] から [[ent-approval-step]] が実体化される。status は draft / pending / approved / rejected / revision / expired。origin（手動 manual / システム連動 system）を持ち、システム連動の場合は triggerAction と triggerEntityId により承認完了後に実行すべきアクションが特定される。

## 承認ステップ {#ent-approval-step}
承認リクエスト内の個々の承認段階。[[ent-approval-request]] を参照し、順序・承認者ロールまたは指名・状態（pending / approved / rejected）・承認者・コメント・期限を持つ。order 昇順に処理される。

## 承認委任 {#ent-approval-delegation}
承認者が一時的に承認権限を他ユーザーに委任する仕組み。委任元ロール・委任先ユーザー・期間・有効フラグを持つ。承認ステップの承認者ロールが委任元ロールと一致し、期間内かつ有効なとき、委任先が委任元と同じ権限で承認・却下できる。

## 売上 {#ent-revenue}
契約と請求のデータから売上を集計・分析する読み取り専用のドメイン。独自の永続エンティティを持たず、[[ent-deal]]（想定金額 × phase）・[[ent-contract]]（金額 × status）・[[ent-invoice]]（paid の金額）を横断参照する。月次売上・案件別収益・予実管理・顧客別売上の観点で集計する。

## 売上目標 {#ent-revenue-target}
期間ごとの売上目標額。[[ent-revenue]] の予実管理で実績と比較される。

## テナント {#ent-organization}
マルチテナント環境における組織単位。全エンティティが organizationId で参照する分離の境界（[[term-tenant-isolation]]）。

## 監査ログ {#ent-audit-log}
全状態変更の追記専用記録。action（`<対象>.<操作>` 形式）・対象種別・対象 ID・操作者・メタデータを持つ。recordAudit を通じてユースケースのトランザクション内に同期記録され、[[term-timeline]] と通知の導出に読み取られる。ドメインイベント（[[ent-domain-event]]）とは別系統。

## ドメインイベント {#ent-domain-event}
ドメインで発生した業務上意味のある事実（受注・失注・見送り・入金・承認完了など）の表現。ユースケースで発行され、Webhook 配信・通知・承認ポリシー評価などの波及反応を駆動する。案件フェーズの終端遷移イベントとして deal.won / deal.lost / deal.passed（見送り）が対等に定義される。全操作を網羅記録する [[ent-audit-log]] とは語彙・関心事が異なり、混同しない。
</content>

## API トークン {#ent-api-token}
本人が発行する外部クライアント認証の資格情報。[[ent-organization]] と発行者（ユーザー）を必須参照し、用途表示名・失効日時・有効期限を持つ。平文は SHA-256 ハッシュとして保存され、発行時のみ返却される。先頭 8 文字（tokenPrefix）を一覧表示用に保持する。発行・失効は監査ログに記録される。

## OAuth クライアント {#ent-oauth-client}
動的クライアント登録（RFC 7591）で作成される MCP クライアントの識別情報。clientId（一意識別子）・クライアント名・リダイレクト URI・認証方式を保持する。組織に属さないプラットフォームレベルの記録であり、[[inv-all-tenant-scoped]] の意図的な例外。

## OAuth トークン {#ent-oauth-token}
OAuth 2.1 認可フローで発行される認可コード・アクセストークン・リフレッシュトークンの統合記録。type で種別を区別する。[[ent-oauth-client]] と発行先ユーザー・組織を参照する。familyId で系列を管理し、リフレッシュトークンローテーションと再利用検知による系列一括失効を実現する。平文は SHA-256 ハッシュとして保存され、発行時のみ返却される。
