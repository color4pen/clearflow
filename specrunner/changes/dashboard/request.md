# ダッシュボードの実装

## Meta

- **type**: new-feature
- **slug**: dashboard
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 既存の画面構成パターンの延長。新たな設計判断なし → false -->

## 背景

システムのエントリーポイントとなるダッシュボードが存在せず、`/` が `/requests` にリダイレクトされている。ユーザーがログイン直後に「今やるべきこと」を把握できる画面がない。

ロールに応じた営業ダッシュボードと経理ダッシュボードを実装する。

## 現状コードの前提

- `src/app/page.tsx` — `/` が `/requests` にリダイレクトしている
- `src/app/(dashboard)/layout.tsx:24-71` — グローバルナビゲーションにダッシュボードリンクなし
- 承認リクエストの一覧取得は `src/application/usecases/listRequests.ts` で実装済み
- 案件一覧の取得は `src/application/usecases/listDeals.ts` で実装済み
- 監査ログの取得は `src/infrastructure/repositories/auditLogRepository.ts` で実装済み
- 請求一覧の取得は `src/application/usecases/listInvoicesByContract.ts` で実装済み（契約単位のみ。組織全体の請求クエリは存在しない）

## 要件

1. **ダッシュボードページの新設**: `/dashboard` にページを作成する。`/` からのリダイレクト先を `/dashboard` に変更する
2. **ロール判定による表示切替**: ログインユーザーのロールに応じて営業ダッシュボード（member / manager / admin）または経理ダッシュボード（finance）を表示する
3. **営業ダッシュボード — アクション待ちリスト**: 以下を統合して期日の近い順に表示する。(a) approverRole がセッションユーザーのロールと一致する pending ステップを持つ承認リクエスト（ロール単位のフィルタ。個人指定の approverId は現時点では未実装のため対象外） (b) 全商談から集約した未完了アクションアイテム（assignee は現在 string 型のためユーザーフィルタせず全件表示） (c) ステータスが new の引合
4. **営業ダッシュボード — パイプラインサマリ**: フェーズごとの案件数と想定金額合計を表示する。フェーズをクリックすると案件一覧（該当フェーズでフィルタ済み）に遷移する
5. **営業ダッシュボード — 直近の活動**: 組織内の最新監査ログを 20 件程度表示する。対象エンティティへのリンクを含む
6. **営業ダッシュボード — マネージャー向け追加情報**: manager / admin ロールの場合、停滞案件リスト（deals.updatedAt が現在から 14 日以上前で phase が won/lost でない案件）を表示する。updatedAt はフェーズ変更日時の近似値として使用する（phaseChangedAt カラムは追加しない）
7. **組織レベル請求クエリの新設**: `invoiceRepository` に `findAllByOrganization(organizationId, filters?)` メソッドを追加する。`listInvoicesByOrganization` ユースケースを新設する。filters でオプションの status フィルタ、期間フィルタ（paidAt / issueDate の範囲）を受け付ける
8. **経理ダッシュボード — 期日超過の請求**: `listInvoicesByOrganization` で status = overdue の請求を取得し、支払期日順に表示する
9. **経理ダッシュボード — 未入金の請求**: `listInvoicesByOrganization` で status = invoiced の請求を取得し、支払期日順に表示する
10. **経理ダッシュボード — 今月の売上サマリ**: `listInvoicesByOrganization` で status = paid かつ paidAt が今月（月初 00:00:00 UTC 〜 翌月初 00:00:00 UTC）の請求を取得し、amount を合計する
11. **経理ダッシュボード — 請求予定**: `listInvoicesByOrganization` で status = scheduled の請求のうち、issue_date が今月初日〜翌月末日（UTC）の請求を取得して表示する
12. **ナビゲーション更新**: グローバルナビゲーションにダッシュボードリンクを追加する

## スコープ外

- 売上ダッシュボード（R09 で実施）
- 通知機能（メール、プッシュ通知）
- ダッシュボードのカスタマイズ機能
- phaseChangedAt カラムの追加（updatedAt で近似）

## 受け入れ基準

- [ ] `/dashboard` にアクセスするとダッシュボードが表示される
- [ ] `/` が `/dashboard` にリダイレクトされる
- [ ] member ロールで営業ダッシュボードが表示される
- [ ] finance ロールで経理ダッシュボードが表示される
- [ ] アクション待ちリストにロール一致の承認リクエスト・アクションアイテム・未対応引合が統合表示される
- [ ] パイプラインサマリがフェーズ別に案件数と金額を表示する
- [ ] manager ロールで停滞案件リスト（updatedAt 14 日以上前の non-terminal 案件）が表示される
- [ ] `listInvoicesByOrganization` ユースケースが存在する
- [ ] 経理ダッシュボードに期日超過・未入金の請求一覧が表示される
- [ ] ナビゲーションにダッシュボードリンクが存在する
- [ ] `typecheck && test` が green

## architect 評価済みの設計判断

1. **停滞案件検出に updatedAt を使用** — phaseChangedAt カラムを追加せず updatedAt で近似する。理由: スキーマ変更を最小化する。updatedAt はフェーズ以外の更新でも更新されるが、14 日以上更新がない案件は何らかの停滞と見なせる。却下案: phaseChangedAt カラム追加 — 精度は高いがマイグレーションと全フェーズ変更箇所の修正が必要
2. **アクションアイテムを全件表示** — assignee が string 型のため個人フィルタが不正確になる。全件表示して担当者を視覚的に確認する方式とする。却下案: 名前の完全一致フィルタ — 同名ユーザーで誤マッチする
3. **組織レベル請求クエリの新設** — 既存の listInvoicesByContract を拡張せず新規ユースケースを追加する。理由: 契約単位と組織単位は異なるアクセスパターンであり責務を分けた方が明確
