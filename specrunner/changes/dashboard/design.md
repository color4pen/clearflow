# Design: ダッシュボードの実装

## Context

Clearflow のエントリーポイント `/` は `/requests` にリダイレクトしており、ログイン直後に全体状況を把握する画面がない。ロールによって関心事が異なるため（営業系: 承認待ち・パイプライン・活動、経理: 請求管理）、ロール別のダッシュボードが必要。

現状のデータアクセス状況:

- `listRequests(organizationId)` — 承認ステップ付きリクエスト一覧。`approvalSteps[].approverRole` と `status` でロール別フィルタが可能
- `listDeals(organizationId)` — 案件一覧。`DealWithDetails` 型で `phase`, `estimatedAmount`, `updatedAt` を持つ
- `meetingRepository.findAllByOrganization(organizationId)` — 全商談。`actionItems: ActionItem[]` を JSON カラムで保持（`done`, `assignee`, `dueDate` フィールド）
- `listInquiries(organizationId)` — 引合一覧。`status` で `new` フィルタが可能
- `auditLogRepository.findByOrganization(organizationId, { limit })` — 監査ログ取得。`limit` オプション対応済み
- `invoiceRepository` — 組織レベルのクエリが存在しない。`findAllByContract` のみ

セッションから `session.user.role`（`"admin" | "member" | "manager" | "finance"`）と `session.user.organizationId` が取得可能。

## Goals / Non-Goals

**Goals**:

- `/dashboard` にロール別ダッシュボードを実装する（営業系: member/manager/admin、経理: finance）
- `/` のリダイレクト先を `/dashboard` に変更する
- 営業ダッシュボードにアクション待ちリスト、パイプラインサマリ、直近の活動、停滞案件リスト（manager/admin のみ）を表示する
- 経理ダッシュボードに期日超過請求、未入金請求、今月の売上サマリ、請求予定を表示する
- `invoiceRepository` に組織レベルクエリを追加し、`listInvoicesByOrganization` ユースケースを新設する
- グローバルナビゲーションにダッシュボードリンクを追加する

**Non-Goals**:

- 売上ダッシュボード（R09 スコープ）
- 通知機能（メール、プッシュ通知）
- ダッシュボードのカスタマイズ機能
- `phaseChangedAt` カラムの追加（`updatedAt` で近似）

## Decisions

### D1: ダッシュボードのデータ取得は Server Component で直接ユースケースを呼び出す

**選択**: `src/app/(dashboard)/dashboard/page.tsx` を Server Component として実装し、既存ユースケース（`listRequests`, `listDeals`, `listInquiries` 等）と新設ユースケースを直接呼び出す。取得データをロール判定後にクライアントコンポーネントへ props で渡す。
**却下**: Server Action 経由でのデータ取得、API Route の新設

**Rationale**: 既存の一覧ページ（`/deals`, `/requests` 等）が全て Server Component からユースケースを直接呼ぶパターンを採用しており、一貫性を維持する。ダッシュボードは表示専用（書き込みなし）のため Server Action は不要。

### D2: アクション待ちリストの統合表示に判別可能ユニオン型を使用する

**選択**: 3 種類のアクション待ちアイテム（承認リクエスト、アクションアイテム、新規引合）を統合する `DashboardActionItem` 型を定義する。`type: "approval" | "action_item" | "inquiry"` フィールドで種別を判別し、各種別に応じた `dueDate` をソートキーとする。
**却下**: 3 つの別セクションに分割表示する方式

**Rationale**: 「今やるべきこと」を一目で把握するには、期日順の統合リストが効果的。種別ごとに分割すると優先度の横断比較ができない。

### D3: アクション待ちリストの組み立ては専用ユースケースで行う

**選択**: `src/application/usecases/getDashboardActions.ts` を新設する。内部で `listRequests`, `meetingRepository.findAllByOrganization`, `listInquiries` を呼び、フィルタ・マージ・ソートを行って `DashboardActionItem[]` を返す。
**却下**: ページコンポーネント内でフィルタ・マージ・ソートを行う方式

**Rationale**: ビジネスロジック（ロール一致フィルタ、未完了フィルタ、期日ソート）を UI 層に置くのはレイヤー違反。ユースケース層に集約することで、テスト可能性とレイヤー整合性を確保する。

### D4: 停滞案件の検出はアプリケーション層でフィルタする

**選択**: `listDeals` で全案件を取得し、アプリケーション層で `updatedAt` が 14 日以上前かつ `phase` が `won`/`lost` でない案件をフィルタする。
**却下**: リポジトリに専用クエリを追加する方式

**Rationale**: 全案件はパイプラインサマリでも使用するため取得済み。追加クエリの N+1 を避けつつ、停滞判定ロジックをドメイン層に近い場所に置ける。案件数が数百件規模の想定であり、アプリ側フィルタで十分。

### D5: 組織レベル請求クエリは invoiceRepository に findAllByOrganization を追加する

**選択**: `invoiceRepository.findAllByOrganization(organizationId, filters?)` を追加。`filters` は `{ status?, paidAtFrom?, paidAtTo?, issueDateFrom?, issueDateTo? }` のオプショナルオブジェクト。既存の `findAllByContract` と並列に定義する。
**却下**: 既存の `findAllByContract` を拡張して `contractId` をオプショナルにする方式

**Rationale**: 契約単位と組織単位は異なるアクセスパターンであり、責務を分けた方が明確（architect 判断 #3）。`findAllByContract` のインターフェースを変更すると既存呼び出し元に影響が出る。

### D6: ダッシュボードページの内部構造はロール別コンポーネントに分離する

**選択**: `page.tsx` でロール判定と全データ取得を行い、`SalesDashboard` / `FinanceDashboard` クライアントコンポーネントに props で渡す。各コンポーネントは表示専用。
**却下**: `/dashboard/sales` と `/dashboard/finance` を別ルートにする方式

**Rationale**: ルートは `/dashboard` 一本にし、ロールに応じた表示切替をサーバー側で行う方が URL 設計がシンプル。ユーザーは自分のロールに対応するダッシュボードのみ閲覧するため、ルート分割の必要がない。

### D7: 経理ダッシュボードのデータ取得は listInvoicesByOrganization を複数回呼ぶ

**選択**: 経理ダッシュボードの 4 セクション（期日超過、未入金、今月売上、請求予定）それぞれで `listInvoicesByOrganization` を `status` / 期間フィルタ付きで呼ぶ。
**却下**: 全請求を一括取得してアプリ層で分類する方式

**Rationale**: 各セクションが異なるフィルタ条件を持ち、DB 側でフィルタする方がデータ転送量を削減できる。将来的にページネーション追加が容易。ただし 4 回の DB アクセスとなるため `Promise.all` で並列化する。

## Risks / Trade-offs

**[Risk]** アクション待ちリストで `meetingRepository.findAllByOrganization` が全商談を取得するため、商談数が多い組織でパフォーマンスに影響する
→ **Mitigation**: 現段階では数百件規模の想定。将来的に組織全体の未完了アクションアイテムのみ取得する専用クエリを追加可能。

**[Risk]** 停滞案件の判定に `updatedAt` を使用するため、メモ更新などフェーズ変更以外の操作で停滞判定がリセットされる
→ **Mitigation**: architect 判断 #1 で許容済み。14 日以上まったく更新がない案件は何らかの停滞と見なせる。

**[Risk]** アクションアイテムの `assignee` が string 型のため個人フィルタができず全件表示となる
→ **Mitigation**: architect 判断 #2 で許容済み。担当者名を表示して視覚的に確認する方式。

**[Risk]** 経理ダッシュボードで 4 回の DB クエリを発行する
→ **Mitigation**: `Promise.all` で並列化。請求テーブルに `organizationId` + `status` の複合インデックスがあればクエリは高速（インデックス追加は別途検討）。

## Open Questions

なし — architect により設計判断が評価済みであり、未解決の技術的判断はない。
