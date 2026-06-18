# 一括承認

## Meta

- **type**: new-feature
- **slug**: bulk-approval
- **base-branch**: main
- **adr**: false

## 背景

承認待ちの申請が溜まった場合、1件ずつ承認する必要があり非効率。承認者が複数の申請を一括で承認できる機能を導入する。

## 現状コードの前提

- `src/application/usecases/approveRequest.ts` — 1件の申請に対する承認を処理。引数: `{ requestId, actorId, actorRole, organizationId }`
- `src/app/actions/requests.ts` — `approveRequestAction` は formData から requestId を取得して1件ずつ処理
- `src/app/(dashboard)/requests/page.tsx` — 申請一覧画面。チェックボックス等の一括選択UIなし
- `src/infrastructure/repositories/requestRepository.ts` — `findById` で1件取得。複数件一括取得なし

## 要件

1. **bulkApprove usecase 新設**: `src/application/usecases/bulkApprove.ts` を作成する。入力: `{ requestIds: string[], actorId, actorRole, organizationId }`。各申請に対して既存の `approveRequest` usecase を順次実行する。1件でも失敗した場合はその申請をスキップし、成功/失敗の結果を個別に返す（全体をロールバックしない）
2. **bulkApprove の結果型**: `{ results: Array<{ requestId: string, success: boolean, reason?: string }> }` を返す
3. **bulkApproveAction Server Action**: `src/app/actions/requests.ts` に追加する。admin / manager / finance ロールのみ実行可能。requestIds を受け取り `bulkApprove` usecase を呼び出す。レート制限を適用（1回の呼び出しで requestIds.length 分を消費）。requestIds の上限は20件
4. **一覧画面の一括選択UI**: 申請一覧画面にチェックボックスを追加する。pending 状態の申請のみ選択可能。「一括承認」ボタンを追加し、選択した申請を `bulkApproveAction` で送信する
5. **結果表示**: 一括承認後、成功件数と失敗件数（失敗理由含む）をトースト通知またはアラートで表示する
6. **監査ログ**: 各申請の承認は個別に audit_logs に記録される（既存の approveRequest が記録するため追加実装不要）
7. **Webhook**: 各申請の承認は個別に Webhook 配信される（既存の approveRequest が配信するため追加実装不要）

## スコープ外

- 一括却下
- 一括差し戻し
- 一括再申請
- 全選択ボタン（ページ内の手動選択のみ）
- ページネーション超えの一括選択

## 受け入れ基準

- [ ] `bun run build` が成功する
- [ ] `bun test` が全件 green
- [ ] `bulkApprove` usecase が存在し、複数 requestId を受け取る
- [ ] 一括承認で1件失敗しても他の承認が成功することをテストで確認する
- [ ] requestIds の上限が20件であることをテストで確認する（21件以上でエラー）
- [ ] 一括承認が admin / manager / finance ロールのみ実行可能
- [ ] 一覧画面に一括選択UIが存在する
- [ ] 依存方向 `actions → usecases → domain / infrastructure` を遵守
- [ ] `typecheck` が green

## architect 評価済みの設計判断

1. **既存 approveRequest を順次呼び出す方式を採用、専用の一括SQL方式を却下** — 一括SQLだと楽観的ロック・冪等性キー・Webhook配信・監査ログの既存ロジックをバイパスする。既存usecaseを呼ぶことで全ての不変条件が自動的に適用される
2. **1件失敗でも他を続行（partial success）を採用、all-or-nothing 方式を却下** — 20件中1件だけ楽観的ロック失敗で全体ロールバックはUXが悪い。個別結果を返して失敗した件のみ手動対応
3. **上限20件を採用** — レスポンスタイムアウト防止。各承認がトランザクション+Webhook配信を伴うため、20件で合計タイムアウトリスクを抑制
