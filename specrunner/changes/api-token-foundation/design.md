# Design: API トークンの発行・失効と Bearer 認証

## Context

clearflow の認証は Cookie セッション（Auth.js v5 + JWT strategy）とcron 用共有シークレット（`CRON_SECRET`）の 2 系統のみ。MCP クライアント等の外部プログラムがユーザーとして操作する手段がない。

現状コードの前提:

- `src/infrastructure/auth.ts`: NextAuth の Credentials provider。JWT callback で `userId` / `organizationId` / `role` をトークンに載せ、session callback でクライアントに返す。Cookie/JWT 前提。
- `src/app/api/cron/expire-requests/route.ts`: 唯一の Bearer 認証。`CRON_SECRET` 環境変数と `timingSafeEqual` で比較する共有シークレット方式。ユーザー単位でない。
- `src/infrastructure/schema.ts`: `users` テーブルに `organizationId` / `role` がある。API トークン用のテーブルは存在しない。
- `src/domain/models/auditLog.ts`: `AuditAction` / `AuditTargetType` の union 型で監査ログ種別を型安全に管理。
- `src/application/services/auditRecorder.ts`: `recordAudit` がトランザクション内で audit_logs を記録するパターンが確立済み。
- `src/app/(dashboard)/account/page.tsx`: ProfileForm / PasswordForm を持つアカウント設定ページ。トークン管理 UI の追加先。
- `src/domain/authorization.ts`: `canPerform` によるロール × 操作の認可。トークン認証後もこの認可機構をそのまま再利用する（本 request で変更しない）。

## Goals / Non-Goals

**Goals**:

- `api_tokens` テーブルを差分マイグレーションで追加する（DB リセット・既存データ変更なし）
- `cfp_` prefix + 32 バイト乱数の PAT を生成し、SHA-256 ハッシュのみを保存する
- createApiToken / revokeApiToken / listApiTokens のユースケースを追加する（本人操作のみ）
- `Authorization: Bearer cfp_...` からユーザーを解決する infrastructure 関数を追加する
- アカウント設定 UI にトークン管理（一覧・発行・失効）を追加する
- `api_token.create` / `api_token.revoke` の監査ログを記録する
- `ent-api-token` を `design/domain/model.md` に追加する（`aozu check` exit 0 維持）

**Non-Goals**:

- MCP サーバー本体（後続 request）
- OAuth 2.1 / 動的クライアント登録
- トークンのスコープ制限（read-only 等）— トークン = ユーザー本人の権限
- API レート制限の強化（既存機構のまま）
- `CRON_SECRET` の廃止・変更（cron エンドポイントは既存のまま）

## Decisions

### D1: トークン形式 — `cfp_` + 32 バイト base64url（architect 決定済み）

**決定**: 平文トークンは `cfp_` prefix + `crypto.randomBytes(32)` の base64url エンコード。合計約 47 文字。

**理由**: prefix によりログや設定ファイル中でトークンを機械的に識別でき、シークレットスキャナーのパターン登録が容易。32 バイト = 256 ビットのエントロピーは総当たり耐性として十分。base64url は URL-safe で Bearer ヘッダにそのまま使える。

**代替案**: UUID v4（122 ビット）は entropy が半分。hex エンコードは文字列長が長い。

### D2: ハッシュ方式 — SHA-256（architect 決定済み）

**決定**: DB には `SHA-256(plainToken)` のみを保存する。bcrypt は採用しない。

**理由**: 32 バイト乱数は辞書攻撃・総当たりが成立しないため、低コストな SHA-256 で十分。bcrypt はリクエスト毎の検証コスト（~100ms）が API 認証に不向き。GitHub・Stripe 等の主要サービスも高エントロピートークンに対して SHA-256 を採用している。

### D3: PAT を採用、OAuth 2.1 は却下（architect 決定済み）

**決定**: Personal Access Token（Bearer 互換）を採用する。

**理由**: MCP の HTTP 認証標準は OAuth 2.1 だが、認可サーバー実装・Auth.js との統合コストが初期スコープに対して過大。PAT は主要 MCP クライアントの静的トークン設定に対応でき、失効・監査が単純。OAuth は需要が立ってから別 request で追補する。

### D4: Bearer 解決関数の配置 — infrastructure 層に独立モジュール

**決定**: `src/infrastructure/apiTokenResolver.ts` に `resolveBearer(authorizationHeader: string)` を配置する。戻り値は `{ userId, organizationId, role } | null`。

**理由**: Bearer 解決は DB アクセス（ハッシュ照合・lastUsedAt 更新）を伴う infrastructure の責務。auth.ts（NextAuth 設定）とは独立した認証経路であり、同一ファイルに混在させると関心が散る。後続の MCP エンドポイントがこの関数を直接呼ぶ公開インターフェースとする。

**代替案**: NextAuth のカスタム provider として組み込む案。JWT strategy 前提の NextAuth に Bearer トークン解決を混在させると session/callback の挙動が複雑化する。API エンドポイント用の軽量な認証は独立関数の方が明快。

### D5: トークン所有権 — 本人のみ（admin 含む他者は不可）

**決定**: createApiToken / revokeApiToken / listApiTokens は全て `session.user.id` をスコープとする。admin であっても他ユーザーのトークンを一覧・発行・失効できない。

**理由**: PAT はユーザーの認証情報であり、パスワードと同等の機密性を持つ。admin による代理操作は監査上の責任が曖昧になる。ユーザーが自身のトークンを管理できないケース（退職等）は、ユーザー deactivate 時にトークンも無効化する将来拡張で対応する。

### D6: lastUsedAt の更新 — Bearer 解決時に非同期更新

**決定**: `resolveBearer` 内でトークンの `lastUsedAt` を更新する。認証の成否判定には影響させず、更新失敗時もリクエストは通す（ベストエフォート）。

**理由**: lastUsedAt は管理画面での表示用であり、認証の正当性とは無関係。更新失敗でリクエストをブロックするのは過剰。ただし更新は同期的に `await` する（fire-and-forget にすると DB コネクション管理が複雑化するため）。

### D7: トークン prefix の保存方式

**決定**: `tokenPrefix` カラムに `cfp_` を含む先頭 8 文字を保存する（例: `cfp_Ab3x`）。一覧 UI ではこの値 + `...` を表示する。

**理由**: ハッシュからは元のトークンを復元できないため、ユーザーがどのトークンかを視覚的に区別するための手段が必要。先頭 8 文字は prefix `cfp_` + 4 文字のランダム部分であり、特定には不十分だが識別には十分。

## Risks / Trade-offs

**[Risk] DB 漏洩時にハッシュから平文トークンが復元されうるか**
→ Mitigation: 256 ビットエントロピーのランダムトークンに対する SHA-256 の原像攻撃は計算上不可能。レインボーテーブルも 32 バイト乱数空間には適用不能。

**[Risk] deactivated ユーザーのトークンが有効なまま残る**
→ Mitigation: `resolveBearer` でユーザーの `deactivatedAt` を検査し、deactivated ユーザーのトークンを拒否する。テーブル上の一括無効化（revokedAt 設定）は将来拡張とし、本 request ではリクエスト時検査で対応する。

**[Risk] tokenPrefix でトークンの一部が漏洩する**
→ Mitigation: prefix は 4 文字のランダム部分のみ（`cfp_` 除く）。256 ビット空間のうち約 24 ビットの情報であり、残り 232 ビットの探索は計算上不可能。

## Open Questions

なし（architect 評価済みの設計判断により主要な論点は解決済み）。
