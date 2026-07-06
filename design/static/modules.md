# モジュール構成

レイヤードアーキテクチャの一方向依存（プレゼンテーション → アプリケーション → ドメイン / インフラ）に沿う。層をまたぐ横断的関心事（認可・ドメインイベント・監査記録）は独立モジュールとして切り出す。

## Server Action {#mod-action}
責務: フォーム送信の受付、入力の構造バリデーション（Zod）、認証・認可チェック、レート制限、ユースケースへの委譲。ビジネスロジックを持たない。
実装: src/app/actions/

## 画面 {#mod-ui}
責務: Server / Client Component による UI の描画と入力受付。読み取り専用データはリポジトリを直接参照し、書き込みは Server Action を呼ぶ。
実装: src/app/(dashboard)/, src/app/(platform)/, src/app/(auth)/, src/app/components/, src/app/layout.tsx, src/app/page.tsx

## API ルート {#mod-api}
責務: 認証付き HTTP エンドポイント（Cron バッチ・監査ログ/売上のエクスポート・認証コールバック）の受付とユースケース委譲。
実装: src/app/api/

## リクエストプロキシ {#mod-proxy}
責務: 全リクエストの認証ガード。未認証アクセスをログインへ、認証済みの認証ページアクセスをダッシュボードへリダイレクトする。
実装: src/proxy.ts

## ユースケース {#mod-usecase}
責務: 1 業務操作のオーケストレーション。トランザクション境界を張り、ドメインサービス・リポジトリ・イベント発行・監査記録を協調させる。結果は Result 型で返す。
実装: src/application/usecases/

## アプリケーションサービス {#mod-appservice}
責務: 複数ユースケースで共有するアプリケーション横断処理（監査記録 recordAudit・顧客担当者サービスなど）。
実装: src/application/services/

## ドメインモデル {#mod-model}
責務: エンティティ・値オブジェクトの型と状態列挙の定義。永続化を知らず、ドメインの語彙を表す。
実装: src/domain/models/

## ドメインサービス {#mod-domainservice}
責務: 単一モデルに属さない純粋なビジネスルール（状態遷移の検証・金額整合性・承認ステップ判定・条件評価）。副作用を持たない。
実装: src/domain/services/

## 認可 {#mod-authz}
責務: ロール × 操作の権限マトリクスの一元定義と可否判定。定義漏れは拒否として扱う。テナント境界の検証は含まない（リポジトリの関心事）。
実装: src/domain/authorization.ts

## ドメインイベント {#mod-event}
責務: 業務上意味のある事実（受注・入金・承認完了など）の型定義と、同期/非同期ハンドラへのディスパッチ機構。
実装: src/domain/events/

## リポジトリ {#mod-repo}
責務: Drizzle 経由の永続化操作。すべての公開メソッドで organizationId によるテナント分離を強制する。
実装: src/infrastructure/repositories/

## DB スキーマ {#mod-db}
責務: テーブル定義・列挙型・制約・リレーション・コネクション管理。永続化構造の正本。
実装: src/infrastructure/schema.ts, src/infrastructure/db.ts

## 認証 {#mod-auth}
責務: Auth.js v5 によるセッション管理と資格情報検証。認可（権限判定）とは別関心事。
実装: src/infrastructure/auth.ts

## イベントハンドラ {#mod-handler}
責務: ドメインイベントへの波及反応（Webhook 配信・承認完了後アクション・監査ログ）の登録と実行。同期/非同期の別を管理する。起動時登録のエントリポイント（instrumentation）を含む。
実装: src/infrastructure/handlers/, src/instrumentation.ts

## Webhook 配信 {#mod-webhook}
責務: 外部システムへのイベント通知の配信・署名・リトライ（指数バックオフ）・配信結果の記録。レート制限記録を含む。
実装: src/infrastructure/webhookDelivery.ts, src/infrastructure/rateLimit.ts

## 共有ユーティリティ {#mod-lib}
責務: 層に属さない純粋な共有処理（日付整形・アクティビティ集約・表示ラベル）。
実装: src/lib/

## 開発スクリプト {#mod-devscript}
責務: 開発環境専用の初期データ投入と DB リセット。アプリケーション本体から参照されない。
実装: src/infrastructure/seed.ts, src/infrastructure/reset.ts
</content>
