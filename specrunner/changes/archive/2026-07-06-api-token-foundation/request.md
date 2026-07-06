# MCP 連携の土台 — API トークンの発行・失効と Bearer 認証

## Meta

- **type**: new-feature
- **slug**: api-token-foundation
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: 外部クライアント向けのユーザー単位認証という新しい adapter の導入であり、トークン形式・保管方式（ハッシュ）・失効モデルは以後の外部 API 全般を拘束する設計選択 → true -->

## 背景

clearflow を AI エージェント（MCP クライアント）から操作できるようにする。その第一歩として、外部クライアントが**ユーザーとして**認証する手段を作る。現状の認証は Cookie セッション（ブラウザ専用）と cron 用の環境変数共有シークレット（ユーザー単位でない・失効管理できない）のみで、MCP サーバーを載せる土台が無い。

ユーザーが自分の API トークンを発行・失効でき、Bearer トークンからユーザー（と組織）を解決する機構を作る。解決後の操作は既存の認可（canPerform）とテナント分離にそのまま乗せる。MCP サーバー本体は後続 request で本機構の上に載せる。

## 現状コードの前提

- `src/app/api/cron/expire-requests/route.ts:5-26`: 唯一の Bearer 認証。`CRON_SECRET`（環境変数の共有シークレット）と `timingSafeEqual` で比較する。ユーザー単位ではない。
- `src/app/api/audit-logs/export/route.ts:19-25`: セッション認証（`auth()`）+ admin ロール検査。Cookie 前提。
- `src/infrastructure/schema.ts:87`: `users` テーブル。API トークンを保持するテーブルは存在しない（`pgTable` 定義一覧に該当なし）。
- `src/app/(dashboard)/account/`: アカウント設定画面（`page.tsx` / `ProfileForm.tsx` / `PasswordForm.tsx`）。トークン管理 UI の追加先。
- `src/app/actions/account.ts`: アカウント系 Server Action の置き場。
- `src/domain/authorization.ts`: ロール × 操作の権限マトリクス一元定義（`canPerform`）。トークン認証後の操作判定はここを再利用する（本 request では変更しない）。

## 設計要素引用

[[mod-db]], [[mod-repo]], [[mod-usecase]], [[mod-action]], [[mod-ui]], [[mod-auth]], [[ent-organization]], [[ent-audit-log]], [[inv-all-tenant-scoped]], [[inv-audit-log-append-only]], [[term-tenant-isolation]]

新規要素: `ent-api-token` を design/domain/model.md に追加する（要件 7）。

## 要件

1. **api_tokens テーブル（差分マイグレーション）**: id / organizationId / userId / name（用途表示名）/ tokenHash / tokenPrefix（一覧表示用）/ lastUsedAt / expiresAt（nullable）/ revokedAt（nullable）/ createdAt。organizationId・userId は必須（[[inv-all-tenant-scoped]]）。DB リセット・既存データ変更はしない。
2. **トークン形式と保管**: 平文は `cfp_` + 32 バイト乱数（base64url）。保存は SHA-256 ハッシュのみ。平文は**発行レスポンスで一度だけ**返し、以後どの画面・API からも取得できない。一覧には tokenPrefix（先頭 8 文字程度）だけを表示する。
3. **発行・失効ユースケース**: createApiToken / revokeApiToken / listApiTokens。**本人のみ**が自分のトークンを一覧・発行・失効できる（admin でも他人のトークンは操作・閲覧不可）。
4. **Bearer 解決機構**: `Authorization: Bearer cfp_...` からユーザーを解決する関数（infrastructure）。ハッシュ照合・revokedAt / expiresAt の拒否・lastUsedAt 更新を行い、`{ userId, organizationId, role }` を返す。後続の MCP エンドポイントがこれを呼ぶ公開インターフェースにする。
5. **アカウント設定 UI**: トークンの一覧（名前・prefix・最終使用・作成日）・発行（名前入力 → 平文を一度だけ表示）・失効。
6. **監査ログ**: `api_token.create` / `api_token.revoke` を記録する（[[inv-audit-log-append-only]]。平文・ハッシュはメタデータに含めない）。
7. **設計 delta**: `ent-api-token`（本人が発行する外部クライアント認証の資格情報。ユーザー・組織を参照、失効・期限を持つ）を design/domain/model.md に追加する。同一 PR に含める（`aozu check` exit 0 を維持）。

## スコープ外

- MCP サーバー本体（後続 request: エンドポイント・ツール群）
- OAuth 2.1 / 動的クライアント登録
- トークンの権限スコープ（read-only 制限など）— 当面はトークン = ユーザー本人の権限
- API のレート制限強化（既存機構のまま）

## 受け入れ基準

- [ ] 発行したトークンで Bearer 解決がユーザー・組織を返すことをテストで固定する
- [ ] 失効済み・期限切れ・不正形式トークンが拒否されることをテストで固定する
- [ ] 他ユーザーのトークンを一覧・失効できないことをテストで固定する
- [ ] 発行・失効が監査ログに記録されることをテストで固定する
- [ ] `typecheck && test` が green（既存テストは無変更で green）
- [ ] `aozu check` exit 0（ent-api-token 追加を含む）・architecture test green

## architect 評価済みの設計判断

- **PAT（Personal Access Token）を採用、OAuth 2.1 は却下**: MCP の HTTP 認証標準は OAuth 2.1 だが、認可サーバー実装・Auth.js との統合コストが初期スコープに対して過大。PAT は Bearer 互換で主要 MCP クライアントの静的トークン設定に対応でき、失効・監査が単純。OAuth は需要が立ってから別 request で追補する。
- **ハッシュは SHA-256、bcrypt は却下**: トークンは 32 バイト乱数で辞書攻撃・総当たりが成立しないため、低コストな SHA-256 で十分。bcrypt はリクエスト毎の検証コストが高く API 認証に不向き。
- **CRON_SECRET 方式の拡張は却下**: 共有シークレットではユーザー同定・個別失効・監査ができない。
