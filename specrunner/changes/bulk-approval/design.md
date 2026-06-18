# Design: bulk-approval

## Context

承認待ちの申請が大量に溜まった場合、承認者は1件ずつ申請詳細画面に遷移して承認ボタンを押す必要がある。20件の承認に40回以上のページ遷移が発生し、運用上の負荷が高い。

現在の承認フローは以下の構成で動作する:

- `approveRequest` usecase: 1件の申請に対し楽観的ロック・状態遷移検証・トランザクション・監査ログ・Webhook 配信を一貫して実行する
- `approveRequestAction` Server Action: 認証・ロールチェック・冪等性キーを処理し、usecase を呼び出す
- 申請一覧画面 (`requests/page.tsx`): Server Component。チェックボックスや一括操作 UI は存在しない

## Goals / Non-Goals

**Goals**:

- 承認者が申請一覧画面から複数の pending 申請を選択し、一括で承認できる
- 一括承認の結果（成功/失敗）を申請単位で返却し、失敗分のみ手動対応できる
- 既存の承認ロジック（楽観的ロック・監査ログ・Webhook）をバイパスしない

**Non-Goals**:

- 一括却下・一括差し戻し・一括再申請
- 全選択ボタン（ページ内の手動チェックのみ）
- ページネーション超えの一括選択
- レスポンスのストリーミング（一括承認はリクエスト/レスポンスで完結）

## Decisions

### D1: 既存 approveRequest を順次呼び出す方式を採用

**方式**: `bulkApprove` usecase は受け取った `requestIds` を `for...of` で順次ループし、各 ID に対して既存の `approveRequest` を呼び出す。

**Rationale**: 一括 SQL で `UPDATE requests SET status = 'approved' WHERE id IN (...)` とすると楽観的ロック検証・承認ステップ進行・冪等性キー・Webhook 配信・監査ログの全てをバイパスする。既存 usecase を呼ぶことで全ての不変条件が自動的に適用される。

**Alternatives considered**:
- 一括 SQL 方式: 高速だが、不変条件の再実装が必要でバグリスクが高い。却下。
- `Promise.all` による並列実行: DB トランザクションの競合リスクが増大し、楽観的ロックの衝突率が上がる。順次実行を採用。

### D2: Partial success（1件失敗でも他を続行）

**方式**: `approveRequest` が `{ ok: false }` を返した場合、その申請をスキップして次へ進む。全件の処理後に `{ results: Array<{ requestId, success, reason? }> }` を返す。

**Rationale**: 20件中1件だけ楽観的ロック失敗で全体ロールバックすると、成功した19件もやり直しになり UX が著しく悪い。個別結果を返して失敗した件のみ手動対応する方が実用的。

**Alternatives considered**:
- All-or-nothing 方式: 全体整合性は保てるが、大量承認の UX を大きく損ねる。却下。

### D3: requestIds の上限は 20 件

**方式**: `bulkApproveAction` で入力バリデーション時に `requestIds.length > 20` をチェックし、超過時はエラーを返す。

**Rationale**: 各承認がトランザクション + Webhook 配信を伴うため、件数が多いとレスポンスタイムアウトのリスクがある。20件は承認1件あたり最大1秒と仮定して20秒以内に完了する目安。

### D4: 申請一覧画面を Server Component + Client Component 分離で実装

**方式**: 既存の `requests/page.tsx`（Server Component）はデータ取得を担当し、新設の Client Component `BulkApprovalPanel` がチェックボックス選択状態管理と一括承認ボタンを担当する。

**Rationale**: Next.js App Router の規約に従い、Server Component でデータ取得、Client Component でインタラクティブ UI を分離する。既存の `ActionButtons.tsx` も同様の分離パターンを採用している。

**Alternatives considered**:
- 一覧画面全体を Client Component に変換: SSR の利点を失う。却下。

### D5: レート制限は requestIds.length 分を消費

**方式**: `bulkApproveAction` がレート制限チェックを行う際、`requestIds.length` 分のクォータを消費する。

**Rationale**: 1回の API 呼び出しで20件分の処理を行えるため、レート制限を1回分として計算すると制限の実効性が低下する。件数分を消費することで公平性を保つ。

### D6: bulkApprove usecase は approveRequest の返却型を活用

**方式**: `approveRequest` は `ApproveRequestResult` (`{ ok: true, request } | { ok: false, reason }`) を返す。`bulkApprove` はこの結果を `BulkApproveResultItem` に変換して集約する。

**Rationale**: 新しいエラーハンドリングロジックを追加せず、既存の `approveRequest` が返すエラー reason をそのまま呼び出し元に透過する。

## Risks / Trade-offs

- **[Risk] 大量承認時のレスポンス時間** → 上限20件で軽減。承認1件あたりの処理時間が想定を超える場合は上限を下げる調整が可能。
- **[Risk] 部分成功時のユーザー混乱** → 結果表示で成功件数・失敗件数・失敗理由を明示することで軽減。
- **[Trade-off] 順次実行による処理時間の増加** → 並列実行すれば高速化できるが、DB トランザクション競合とデバッグ複雑性の増大を避けるため順次実行を採用。
- **[Risk] チェックボックス UI が Server Component に混在するリスク** → Client Component として分離することで回避（D4）。

## Open Questions

なし。architect 評価済みの設計判断により主要な技術的意思決定は完了している。
