# ADR-025: 外部クライアント向け PAT（Personal Access Token）と Bearer 認証基盤

- **Status**: accepted
- **Date**: 2026-07-06
- **Change**: api-token-foundation
- **Deciders**: architect

---

## Context

Clearflow の認証は Cookie セッション（Auth.js v5 + JWT strategy）と cron 用の共有シークレット（`CRON_SECRET` 環境変数）の 2 系統のみであった。MCP クライアント等の外部プログラムがユーザーとして操作する手段がなく、AI エージェント連携の基盤が存在しなかった。

本変更でユーザーが自分の API トークンを発行・失効でき、`Authorization: Bearer cfp_...` から `{ userId, organizationId, role }` を解決する機構を追加する。解決後の操作は既存の `canPerform` とテナント分離（`organizationId` スコープ）にそのまま乗せる。MCP サーバー本体は後続 request でこの機構の上に載せる。

主要な設計判断:
- トークン形式（prefix・エントロピー・エンコーディング）
- ハッシュ方式（SHA-256 vs bcrypt）
- 認証スタイル（PAT vs OAuth 2.1）
- Bearer 解決の配置（infrastructure 独立モジュール vs NextAuth 統合）
- トークン所有権（本人のみ vs admin 代理可）

---

## Decisions

### D1: トークン形式 — `cfp_` + 32 バイト base64url（合計約 47 文字）

**Decision**: 平文トークンは `cfp_` prefix + `crypto.randomBytes(32)` の base64url エンコード。DB には SHA-256 ハッシュのみを保存し、平文は発行レスポンスで一度だけ返す。一覧表示用に先頭 8 文字（`cfp_` + 4 文字乱数部）を `tokenPrefix` カラムに保存する。

**Rationale**:
- `cfp_` prefix によりログや設定ファイル中でトークンを機械的に識別でき、シークレットスキャナーのパターン登録が容易
- 32 バイト = 256 ビットのエントロピーは総当たり耐性として十分
- base64url は URL-safe で `Authorization: Bearer` ヘッダにそのまま使える
- tokenPrefix（24 ビット相当）は識別には十分だが残り 232 ビットの探索は計算上不可能であり、漏洩リスクは無視できる

#### Alternative 1: UUID v4

| | |
|---|---|
| **Pros** | 標準ライブラリで生成できる |
| **Cons** | 122 ビットのエントロピーしかなく、256 ビットの半分。`cfp_` prefix による機械的識別もできない |
| **Why not** | エントロピーと識別性の両面で劣る |

#### Alternative 2: hex エンコーディング

| | |
|---|---|
| **Pros** | 出力が単純な16進数文字列 |
| **Cons** | base64url に比べて文字列長が長くなる（64 文字 vs 43 文字）。Bearer ヘッダの可読性が低い |
| **Why not** | base64url の方がコンパクトかつ URL-safe |

---

### D2: ハッシュ方式 — SHA-256（bcrypt 却下）

**Decision**: DB には `SHA-256(plainToken)` のみを保存する。bcrypt・scrypt・Argon2 は採用しない。

**Rationale**:
- 32 バイト乱数トークンに対して辞書攻撃・総当たりは計算上成立しない。高コストな KDF（bcrypt 等）はパスワードを守るためのものであり、高エントロピーな乱数トークンには過剰
- bcrypt はリクエスト毎の検証コストが ~100ms であり、API 認証（高頻度・低レイテンシ）に不向き
- GitHub・Stripe 等の主要サービスも高エントロピートークンに対して SHA-256 を採用している

#### Alternative: bcrypt

| | |
|---|---|
| **Pros** | パスワード保護に対する確立された防御手段 |
| **Cons** | リクエスト毎の検証コストが高い（~100ms）。32 バイト乱数に対しては過剰で意味のないコスト |
| **Why not** | 高エントロピーな乱数トークンの脅威モデルに bcrypt は不要。API 認証のレイテンシに悪影響がある |

---

### D3: PAT（Personal Access Token）を採用、OAuth 2.1 を却下

**Decision**: Personal Access Token（Bearer 互換の静的トークン）を採用する。OAuth 2.1 / 動的クライアント登録は本変更のスコープ外とし、需要が立ってから別 request で追補する。

**Rationale**:
- MCP の HTTP 認証標準は OAuth 2.1 だが、認可サーバー実装・Auth.js との統合コストが初期スコープに対して過大
- PAT は Bearer 互換で主要 MCP クライアント（Claude Desktop 等）の静的トークン設定に対応できる
- 失効・監査が単純（`revokedAt` カラムの更新のみ）
- ユーザー単位の発行・失効・監査を最小実装で実現できる

#### Alternative: OAuth 2.1 + 動的クライアント登録

| | |
|---|---|
| **Pros** | MCP の HTTP 認証標準に準拠。スコープ制限や有効期限の自動更新が可能 |
| **Cons** | 認可サーバーの実装、Auth.js との統合、クライアント登録フロー等、初期スコープに対して実装コストが過大 |
| **Why not** | MCP 連携の初期フェーズでは静的トークンで十分。OAuth は需要が立ってから別途 ADR を立て追補する |

---

### D4: Bearer 解決関数の配置 — infrastructure 独立モジュール

**Decision**: `src/infrastructure/apiTokenResolver.ts` に `resolveBearer(authorizationHeader: string): Promise<{ userId, organizationId, role } | null>` を配置する。NextAuth の `auth.ts` とは独立したモジュールとする。後続の MCP エンドポイントはこの関数を直接呼ぶ公開インターフェースとする。

**Rationale**:
- Bearer 解決は DB アクセス（SHA-256 ハッシュ照合・lastUsedAt 更新）を伴う infrastructure の責務
- NextAuth は Cookie/JWT strategy を前提とした設定オブジェクトであり、Bearer トークン解決を混在させると session/callback の挙動が複雑化する
- 独立関数として配置することで、MCP エンドポイントが NextAuth のセッション機構を経由せずに直接 Bearer を解決できる

解決順序:
1. `Authorization: Bearer <token>` の形式検証
2. `cfp_` prefix の検証
3. SHA-256 ハッシュを算出して DB 照合
4. `revokedAt` / `expiresAt` の検査
5. ユーザーの `deactivatedAt` の検査
6. `lastUsedAt` の更新（ベストエフォート）
7. `{ userId, organizationId, role }` を返す

#### Alternative: NextAuth カスタム provider に統合

| | |
|---|---|
| **Pros** | 既存の `auth()` 呼び出しで Bearer を透過的に解決できる |
| **Cons** | NextAuth の JWT strategy と Bearer 認証のセッション/callback 管理が混在し、挙動が複雑化する。MCP エンドポイントが NextAuth セッション構造に強く依存するようになる |
| **Why not** | Cookie セッションと Bearer トークンは独立した認証経路であるべき。独立モジュールの方が明快で後続の MCP エンドポイント実装が単純になる |

---

### D5: トークン所有権 — 本人のみ（admin 含む他者は不可）

**Decision**: `createApiToken` / `revokeApiToken` / `listApiTokens` は全て `session.user.id`（認証済みユーザーの id）をスコープとする。admin であっても他ユーザーのトークンを一覧・発行・失効できない。

**Rationale**:
- PAT はユーザーの認証情報であり、パスワードと同等の機密性を持つ
- admin による代理操作は監査上の責任が曖昧になる（誰が操作したかの追跡が困難）
- ユーザーが自身のトークンを管理できないケース（退職等）は、ユーザー deactivate 時にトークンも拒否する `deactivatedAt` 検査で対応する

#### Alternative: admin が他ユーザーのトークンを管理できる

| | |
|---|---|
| **Pros** | admin が退職ユーザーのトークンを即時失効できる |
| **Cons** | 監査の責任が admin に転嫁される。PAT はユーザーの認証情報であり、他者の代理操作はパスワード変更に近いセキュリティリスクを持つ |
| **Why not** | ユーザー deactivate による `deactivatedAt` 検査で十分。admin による代理操作の必要性は将来 ADR で評価する |

---

### D6: lastUsedAt の更新 — Bearer 解決時にベストエフォート

**Decision**: `resolveBearer` 内でトークンの `lastUsedAt` を現在時刻に更新する。更新は `await` するが、更新失敗時もリクエストは通す（エラーをログ出力して継続）。

**Rationale**:
- `lastUsedAt` は管理画面での表示用であり、認証の正当性とは無関係
- 更新失敗でリクエストをブロックするのは過剰（管理用メタデータのために業務リクエストを止めるべきでない）
- `await` して例外を握り潰す方式により、DB コネクション管理を単純に保ちつつ更新失敗時もリクエストを継続できる

#### Alternative: fire-and-forget（Promise を `await` しない）

| | |
|---|---|
| **Pros** | `lastUsedAt` 更新をリクエスト処理と完全に切り離せる。更新の遅延がレイテンシに影響しない |
| **Cons** | `await` しない Promise は DB コネクションのライフサイクルがリクエストスコープを外れる可能性がある。Next.js / Node.js ランタイムでは応答送信後に未完了の非同期処理が中断されるリスクがある |
| **Why not** | DB コネクション管理の複雑化リスクを避けるため、`await` して例外を無視する方式を採用した |

---

### D7: CRON_SECRET 方式の拡張を却下

**Decision**: 既存の `CRON_SECRET` 共有シークレット方式（`src/app/api/cron/expire-requests/route.ts`）は本変更で変更・廃止しない。cron エンドポイントは既存方式のまま維持する。

**Rationale**:
- 共有シークレットではユーザー同定・個別失効・監査ができない
- cron エンドポイントはユーザー単位の操作でないため、PAT 方式とは目的が異なる
- `CRON_SECRET` の廃止は本変更のスコープ外

---

## Consequences

### Positive

- 外部クライアント（MCP クライアント等）がユーザーとして認証できる基盤が整った
- `resolveBearer` の公開インターフェースにより、後続の MCP エンドポイントが一貫した Bearer 解決を使える
- トークン形式・ハッシュ方式・失効モデルが明文化され、将来の外部 API 認証の標準が確立された
- 発行・失効が監査ログに記録され、PAT の操作履歴が追跡可能になった
- テナント分離（`organizationId` スコープ）・認可（`canPerform`）を既存機構を変更せず再利用した

### Negative / Trade-offs

- OAuth 2.1 との非互換: 一部の MCP クライアントは OAuth 2.1 を要求する場合があり、その場合は静的トークン設定が必要になる
- `deactivatedAt` 検査はリクエスト時点での評価であり、deactivate されたユーザーのトークンは `api_tokens` テーブル上では revoke されていない状態が残る（論理的には無効だが物理的には有効なレコードが存在する）
- 静的テスト（ソース文字列検査）のみで実装を検証しており、Bearer 解決の条件分岐（revokedAt / expiresAt / deactivatedAt）は実行時テストで固定されていない（次期 PR での追加を推奨）

### Constraints for future changes

- **新しい外部 API エンドポイントを追加するとき（MCP サーバー等）**: Bearer 解決は必ず `resolveBearer(authorizationHeader)` を使うこと。独自のトークン検証を実装してはならない
- **トークン形式を変更するとき**: `cfp_` prefix はシークレットスキャナーのパターンに登録される前提で採用している。prefix を変更する場合は既存トークンの後方互換性を確保し、ADR を更新すること
- **OAuth 2.1 を追加するとき**: PAT と OAuth 2.1 の両立が必要な場合は、`resolveBearer` を拡張するか、OAuth 専用の resolver を追加すること。既存の PAT トークンを無効化してはならない
- **admin による代理トークン管理を追加するとき**: D5 の設計原則に反する。追加する場合は改めて ADR を作成し、監査責任の設計を評価すること
- **ユーザー deactivate 時の一括 revoke**: 現在は `resolveBearer` でリクエスト時に `deactivatedAt` を検査している。`api_tokens.revokedAt` への一括 revoke を追加する場合は差分マイグレーションで実施し、既存トークンレコードに影響を与えないこと
- **ランタイムテストの追加**: `resolveBearer` の revokedAt / expiresAt / deactivatedAt の各拒否条件は、DB モックを使った integration test でランタイムレベルで固定すること

---

## References

- `specrunner/changes/api-token-foundation/request.md` — 要件定義
- `specrunner/changes/api-token-foundation/design.md` — 詳細設計（D1〜D7）
- `specrunner/changes/api-token-foundation/spec.md` — ビヘイビア仕様
- `specrunner/changes/api-token-foundation/review-feedback-001.md` — コードレビュー所見（approved, score 7.95）
- `drizzle/0019_third_blonde_phantom.sql` — api_tokens テーブルの差分マイグレーション
- `src/infrastructure/apiTokenResolver.ts` — resolveBearer 関数
- `src/infrastructure/repositories/apiTokenRepository.ts` — api_tokens リポジトリ
- `src/application/usecases/createApiToken.ts` — トークン発行ユースケース
- `src/application/usecases/revokeApiToken.ts` — トークン失効ユースケース
- `src/application/usecases/listApiTokens.ts` — トークン一覧ユースケース
- `src/infrastructure/schema.ts` — api_tokens テーブル定義
- `src/domain/models/apiToken.ts` — ApiToken ドメインモデル
- `src/domain/models/auditLog.ts` — AuditAction への api_token.create / api_token.revoke 追加
- `src/app/(dashboard)/account/ApiTokenSection.tsx` — トークン管理 UI
- `src/app/actions/apiTokens.ts` — トークン管理 Server Actions
- `design/domain/model.md` — ent-api-token エンティティ追加
- `specrunner/adr/ADR-001-foundation-db-auth-domain.md` — テナント分離・依存方向の根拠
- `specrunner/adr/ADR-012-authorization-centralization.md` — canPerform による認可集中管理
- `specrunner/adr/ADR-020-audit-action-type-catalog.md` — AuditAction カタログ
