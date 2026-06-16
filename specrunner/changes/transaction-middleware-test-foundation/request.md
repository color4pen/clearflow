# トランザクション導入・middleware接続・テナント分離強化

## Meta

- **type**: spec-change
- **slug**: transaction-middleware-test-foundation
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 新しい port/adapter 追加、既存パターンと異なる設計選択、振る舞い/契約を変える修正、構造的リファクタリング → true。いずれにも該当しない → false -->

## 背景

PR#3 で DB基盤・認証・基本ドメインモデルを導入した。コードレビューで以下の非ブロッカーが検出されている：

1. usecase 層のステータス更新と監査ログ記録がトランザクションで囲まれていない — 監査ログ insert 失敗時にステータスだけ変わり監査証跡が欠落する
2. `src/proxy.ts` に認証プロキシロジックがあるが `src/middleware.ts` が存在しない — Next.js が認識できず未認証ガードが middleware レベルで機能しない
3. `userRepository.findByEmail` に organizationId 条件がない — Credentials login の authorize 専用だが将来の呼び出し元でテナント跨ぎリスクがある
4. approve/reject/submit の Server Actions で認証失敗時にエラーメッセージなしの void return — クライアントに情報が伝わらない

本 request でこれらを一括修正する。

## 現状コードの前提

<!-- 現状のコードについての断定（「今のコードはこうなっている」）は file:line を伴ってこの節に書く。 -->

- `src/application/usecases/approveRequest.ts:27,37` — `requestRepository.updateStatus` と `auditLogRepository.create` を逐次呼び出し。トランザクションなし
- `src/application/usecases/rejectRequest.ts` — 同上の構造
- `src/application/usecases/submitRequest.ts` — 同上の構造
- `src/proxy.ts:1-29` — 認証プロキシロジックが定義されているが、`src/middleware.ts` が存在しないため Next.js に認識されない
- `src/infrastructure/repositories/userRepository.ts:8-15` — `findByEmail` は email のみで検索。organizationId 条件なし
- `src/app/actions/requests.ts` — `approveRequestAction`, `rejectRequestAction`, `submitRequestAction` で認証失敗時に `return;`（void）。`createRequestAction` は `{ message: "認証が必要です" }` を返している
- `src/infrastructure/db.ts` — `process.env.DATABASE_URL!` で non-null assertion。未設定時にランタイムエラー
- `src/__tests__/domain/requestTransition.test.ts:1` — テストは `bun:test` を使用

## 要件

<!-- コツ: 実装の最重量部（既存機構の一般化・暗黙の前提の変更）は行間に隠さず要件として名指しする。 -->

1. **トランザクション導入**: `approveRequest`, `rejectRequest`, `submitRequest` の各 usecase で、ステータス更新と監査ログ記録を `db.transaction()` で囲む。トランザクション内で失敗した場合はロールバックされること
2. **middleware.ts の作成**: `src/middleware.ts` を作成し、`proxy.ts` のロジックを移動または接続する。Next.js の middleware として認証ガードが機能するようにする。`src/proxy.ts` は削除する
3. **userRepository.findByEmail のリネーム**: `findByEmail` を `findByEmailForAuth(email: string)` にリネームして、ログイン専用であることを明示する。Auth.js の authorize は login 時点で organizationId を特定できないため、テナント条件は付与しない
4. **Server Actions のエラーレスポンス統一**: approve/reject/submit の認証失敗時に `{ success: false, message: "認証が必要です" }` 形式のレスポンスを返す。全 Server Actions で統一されたエラーレスポンス型を使う
5. **db.ts の環境変数チェック**: `DATABASE_URL` 未設定時に明示的なエラーメッセージで throw する

## スコープ外

- テストフレームワークの変更（bun:test を維持）
- UI の変更
- 新しいドメインモデルの追加
- organizationRepository の WHERE 条件修正（動作に影響なし、次回以降）

## 受け入れ基準

<!-- コツ: 機械検証できる文にする -->

- [ ] `bun run build` が成功する
- [ ] `bun test` が全件 green
- [ ] `src/middleware.ts` が存在し、`src/proxy.ts` が存在しない
- [ ] `src/application/usecases/approveRequest.ts`, `rejectRequest.ts`, `submitRequest.ts` 内に `db.transaction` の呼び出しがある
- [ ] `userRepository` に `findByEmail` 関数が存在しない（`findByEmailForAuth` に置き換え済み）
- [ ] 全 Server Actions の認証失敗レスポンスが `{ success: false, message: string }` 形式
- [ ] `src/infrastructure/db.ts` で `DATABASE_URL` 未設定時に明示的な Error を throw する
- [ ] 依存方向が `actions → usecases → domain / infrastructure` を遵守している
- [ ] `typecheck` が green

## architect 評価済みの設計判断

<!-- コツ: 採用した判断に加え、却下した代替案とその理由を書く。 -->

1. **findByEmail のリネーム方式を採用、引数追加方式を却下** — Auth.js の authorize コールバックは login 時点でユーザーの organizationId を知らない（email + password のみ）。organizationId を必須引数にすると login が壊れる。関数名で用途を限定し、テナント跨ぎの誤用を命名で防ぐ
2. **proxy.ts を middleware.ts に移動・削除を採用、re-export 方式を却下** — proxy.ts を残して middleware.ts から re-export する方式は不要なファイルが残る。middleware.ts に直接ロジックを置く
3. **エラーレスポンス型の統一**: Server Actions の戻り値を `{ success: boolean, message?: string, data?: T }` 形式に統一する
