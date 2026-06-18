# シンプルなレート制限

## Meta

- **type**: new-feature
- **slug**: simple-rate-limit
- **base-branch**: main
- **adr**: false

## 背景

Server Actions にレート制限がなく、大量リクエストを送信できる状態。最小限のDB ベースレート制限を導入する。

## 現状コードの前提

- `src/app/actions/requests.ts` — 全 Server Actions にレート制限なし
- `src/app/actions/webhooks.ts` — Webhook 管理 Actions にレート制限なし
- レート制限関連のテーブル・モジュールは存在しない
- `src/app/actions/requests.ts` — 冪等キーチェック（`idempotencyKeyRepository.findByKey`）が承認/却下/再申請 Actions に存在する

## 要件

1. **rate_limit_records テーブル追加**: カラム: id (uuid PK), key (text, UNIQUE), count (integer, NOT NULL), windowStart (timestamp, NOT NULL), createdAt (timestamp, defaultNow)
2. **checkRateLimit 関数**: `src/infrastructure/rateLimit.ts` に実装する。PostgreSQL の `INSERT ... ON CONFLICT (key) DO UPDATE SET count = CASE WHEN window_start >= $windowStart THEN count + 1 ELSE 1 END, window_start = CASE WHEN window_start >= $windowStart THEN window_start ELSE $windowStart END RETURNING count` で原子的に upsert する。返り値: `{ allowed: boolean, remaining: number }`。count が limit 以下なら allowed: true
3. **RATE_LIMITS 定数**: `createRequest: { limit: 10, windowMs: 60000 }`, `approveReject: { limit: 30, windowMs: 60000 }`, `webhookManage: { limit: 10, windowMs: 60000 }`
4. **Server Actions への適用**: `createRequestAction` は認証チェック直後に checkRateLimit を追加。承認/却下/再申請 Actions は冪等キーチェックの後（キャッシュヒット時はレート消費なし）、usecase 呼び出しの前に追加。Webhook 管理 Actions は認証チェック直後に追加
5. **レート制限超過時のレスポンス**: `{ success: false, message: "リクエスト数の上限に達しました。しばらく待ってから再試行してください" }`

## スコープ外

- IP ベースのレート制限
- cron エンドポイントのレート制限
- CSV エクスポートのレート制限
- レート制限レコードのクリーンアップ
- Route Handler（429 レスポンス）
- カスタマイズ UI

## 受け入れ基準

- [ ] `bun run build` が成功する
- [ ] `bun test` が全件 green
- [ ] `rate_limit_records` テーブルが schema.ts に定義されている（key に UNIQUE 制約付き）
- [ ] `checkRateLimit` が `INSERT ... ON CONFLICT` による原子的 upsert で実装されている
- [ ] 申請作成 Action にレート制限が適用されている
- [ ] 承認/却下/再申請 Action にレート制限が冪等キーチェックの後に適用されている
- [ ] Webhook 管理 Action にレート制限が適用されている
- [ ] 依存方向 `actions → usecases → domain / infrastructure` を遵守
- [ ] `typecheck` が green

## architect 評価済みの設計判断

1. **DB ベースの原子的 upsert を採用** — `INSERT ON CONFLICT DO UPDATE ... RETURNING count` で race condition を防止。SELECT → UPDATE の2ステップ方式は TOCTOU 脆弱性があるため却下
2. **冪等キーチェックの後にレート制限を配置** — キャッシュヒット時はレート消費しない。逆順だと正当な再試行がブロックされる
3. **スコープを Server Actions のみに限定** — Route Handler のレート制限は別 request で対応。粒度を小さく保つ
