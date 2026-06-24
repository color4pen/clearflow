# Design: ダッシュボードの実装

## Context

システムのエントリーポイントとなるダッシュボードが存在しない。`/` は `/requests` にリダイレクトしており、ユーザーがログイン直後に「今やるべきこと」を俯瞰する手段がない。

ロールは 4 種類（`admin`, `manager`, `member`, `finance`）。営業系ロール（`member`, `manager`, `admin`）と経理ロール（`finance`）では関心が異なるため、ロールに応じた 2 種のダッシュボードを提供する。

### 既存資産

| データ | 取得手段 | 備考 |
|--------|---------|------|
| 承認リクエスト＋ステップ | `requestRepository.findAllWithStepsByOrganization` | approverRole でフィルタ可能 |
| 案件一覧 | `dealRepository.findAllByOrganization` | phase, updatedAt, estimatedAmount あり |
| 引合一覧 | `inquiryRepository.findAllWithClientByOrganization` | status = "new" でフィルタ |
| 商談アクションアイテム | `meetingRepository.findAllByOrganization` → `meeting.actionItems[]` | JSONB 配列。assignee は string 型 |
| 監査ログ | `auditLogRepository.findByOrganization` | limit/offset 対応済み |
| 請求一覧（契約単位） | `invoiceRepository.findAllByContract` | 組織レベルの取得は未実装 |

## Goals / Non-Goals

**Goals**:

1. `/dashboard` にロール分岐するダッシュボードページを新設する
2. `/` のリダイレクト先を `/requests` → `/dashboard` に変更する
3. 営業ダッシュボード: アクション待ちリスト、パイプラインサマリ、直近の活動、停滞案件（manager/admin のみ）
4. 経理ダッシュボード: 期日超過請求、未入金請求、今月の売上サマリ、請求予定
5. 組織レベルの請求クエリ（`invoiceRepository.findAllByOrganization` + `listInvoicesByOrganization` ユースケース）を新設する
6. グローバルナビゲーションにダッシュボードリンクを追加する

**Non-Goals**:

- 売上ダッシュボード（R09 で実施）
- 通知機能（メール、プッシュ通知）
- ダッシュボードのカスタマイズ機能
- phaseChangedAt カラムの追加（updatedAt で近似）

## Decisions

### D1: ダッシュボードのルーティング構成

`/dashboard` を `(dashboard)` route group 内に `dashboard/page.tsx` として配置する。既存の `(dashboard)/layout.tsx` がセッション認証・ナビゲーションを提供するため、新たなレイアウトは不要。

- **Rationale**: 既存の route group パターンに沿う。`(dashboard)` 内の他ページ（`/deals`, `/requests` 等）と同じ認証ガード・ナビゲーションを共有できる。
- **却下案**: トップレベル `/dashboard/page.tsx` — レイアウトの重複が発生する。

### D2: ロール分岐を Server Component で実施

`dashboard/page.tsx` で `session.user.role` を参照し、`finance` なら経理ダッシュボードコンポーネント、それ以外なら営業ダッシュボードコンポーネントを描画する。データフェッチもこの Server Component 内で行い、子コンポーネントに props で渡す。

- **Rationale**: Next.js App Router の Server Component パターンに合致。クライアントバンドルを最小化しつつ、ロール判定とデータ取得を 1 箇所で完結させる。
- **却下案**: ミドルウェアでのリダイレクト — URL が分かれるとブラウザ履歴が複雑になる。Client Component でのフェッチ — 不要な往復。

### D3: アクション待ちリストの統合表示

3 種類のアクションアイテム（承認リクエスト・商談アクションアイテム・新規引合）を統合して 1 つのリストとして表示する。各アイテムを共通の型（`ActionableItem`）に正規化し、期日の近い順にソートする。

- **Rationale**: ユーザーが「次にやること」を 1 箇所で把握できる。3 つのデータソースからのフェッチを `dashboard/page.tsx` で並列実行（`Promise.all`）し、ドメインサービス層の純粋関数で統合・ソートする。
- **却下案**: 3 セクション分離表示 — 視線移動が増え、優先度判断がユーザー任せになる。

### D4: 組織レベル請求クエリの新設

`invoiceRepository` に `findAllByOrganization(organizationId, filters?)` を追加する。既存の `findAllByContract` を拡張せず、独立メソッドとする。`listInvoicesByOrganization` ユースケースを新設する。

- **Rationale**: 契約単位と組織単位は異なるアクセスパターン。責務を分離し、将来のインデックス最適化を独立して行える。
- **却下案**: `findAllByContract` の拡張 — 引数の分岐が複雑になり、テスト容易性が低下する。

### D5: 停滞案件の検出に updatedAt を使用

`deals.updatedAt` が現在時刻から 14 日以上前、かつ `phase` が `won`/`lost` でない案件を停滞案件とする。

- **Rationale**: スキーマ変更を最小化する。updatedAt はフェーズ以外の更新でも更新されるが、14 日間一切更新がない案件は実質的に停滞している。
- **却下案**: `phaseChangedAt` カラム追加 — 精度は高いがマイグレーションと既存コードの修正範囲が大きい。

### D6: アクションアイテムを全件表示

商談のアクションアイテムは `assignee` が `string` 型（ユーザー ID ではなく自由入力テキスト）のため、ログインユーザーとの突合が不正確になる。全件表示し、担当者名をラベルとして視覚的に確認する方式とする。

- **Rationale**: 名前の完全一致フィルタは同名ユーザーで誤マッチし、部分一致は false positive が多い。全件表示が最も信頼性が高い。
- **却下案**: 名前の完全一致フィルタ — 同名ユーザーの誤マッチリスク。

### D7: ダッシュボード専用のデータ取得層を設けない

既存のユースケース／リポジトリを直接呼び出す。ダッシュボード用の集約ユースケース（`getDashboardData`）は作らない。例外として `listInvoicesByOrganization` のみ新設する（既存に組織単位クエリがないため）。

- **Rationale**: 既存のリポジトリ関数で必要なデータはすべて取得可能。ダッシュボード用の集約層は、既存クエリの再ラップに過ぎず責務が曖昧になる。Server Component が並列フェッチし、表示用の正規化はドメインサービスの純粋関数で行う。
- **却下案**: `getDashboardData` ユースケース — 全データを 1 関数で返す「God usecase」になり、個別テストが困難。

## Risks / Trade-offs

**[Risk] N+1 的な多クエリ実行** → ダッシュボード表示のために 5〜6 回の DB クエリが発行される。`Promise.all` で並列化し、レイテンシを最小化する。データ量が増大した場合は将来的にキャッシュ層の導入を検討する。

**[Risk] アクションアイテム全件表示のノイズ** → 組織内の全商談のアクションアイテムが表示されるため、担当外のアイテムも含まれる。担当者名の視覚的な識別で運用回避する。将来的に assignee を userId 参照に変更することで解決可能。

**[Risk] updatedAt による停滞判定の精度** → フェーズ以外の更新（notes 編集等）で updatedAt が更新されると、実質停滞している案件が検出されない。14 日という閾値は保守的であり、完全な見逃しリスクは低いと判断。

**[Trade-off] 経理ダッシュボードの月次集計を SQL でなくアプリケーション層で実行** → `findAllByOrganization` で全件取得後にアプリケーション層で合計を算出する。件数が少ない（組織あたり数百件以下を想定）初期段階では十分。大量データ時は SQL の `SUM` / `GROUP BY` に切り替える。

## Open Questions

なし（architect 評価済みの設計判断 3 件で主要な論点は解決済み）
