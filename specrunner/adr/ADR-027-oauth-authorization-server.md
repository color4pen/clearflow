# ADR-027: MCP クライアント向け OAuth 2.1 認可サーバー

- **Status**: accepted
- **Date**: 2026-07-07
- **Change**: oauth-authorization-server
- **Deciders**: architect

---

## Context

PAT（ADR-025）は `Authorization: Bearer` ヘッダを任意に設定できる MCP クライアント（Claude Code 等）には十分だが、claude.ai の custom connector はブラウザ起点の OAuth フロー（Protected Resource Metadata 発見 → 動的クライアント登録 → 認可コード + PKCE → トークン取得）を前提としており、静的な PAT を設定する手段を持たない。非技術者がブラウザで「接続」するだけで clearflow の MCP を使えるようにするため、clearflow 自身に OAuth 2.1 認可サーバーを構築する。

前提:
- `api-token-foundation`（ADR-025）により `resolveBearer` が Bearer → `{ userId, organizationId, role }` を解決する公開インターフェースとして存在する
- `mcp-server-core`（ADR-026）の D6 により、MCP route handler は `resolveBearer` のインターフェースを通じてトークン解決を行い、OAuth 追補時の MCP 層変更が不要になるよう設計済み
- Auth.js v5 セッション管理（Cookie）が同意画面のユーザー認証基盤として存在する
- OAuth クライアント・認可コード・トークンのスキーマは未存在

本 ADR が対象とする設計判断は、今後の外部クライアント連携全般を拘束する基盤的な選択である:
- 認可サーバーの実装方針（自前構築 vs 外部 IdP 委譲）
- アクセストークンの形式（opaque vs JWT）
- OAuth クライアントのテナントスコープ方針
- リフレッシュトークンの失効モデル
- PAT との共存方針
- `resolveBearer` の拡張方式

---

## Decisions

### D1: clearflow 自身に OAuth 2.1 認可サーバーを構築する（外部 IdP 委譲を却下）

**Decision**: clearflow の Next.js アプリケーション内に OAuth 2.1 認可サーバーエンドポイント（メタデータ・動的クライアント登録・authorize・token）を直接実装する。Google 等の外部 IdP を認可サーバーとして委譲する構成は採用しない。

**Rationale**:
- clearflow は credentials 認証の自己完結型マルチテナント SaaS であり、外部 IdP を挟むとテナント（`organizationId`）とユーザーの対応付けが複雑になる。同意画面のユーザー認証は既存の Auth.js セッションで賄えるため、新規の認証メカニズムを導入する必要がない
- 認可サーバーとリソースサーバーが同一プロセス・同一ホストに収まる self-hosted 構成であり、インターフェースは bounded。外部 IdP が提供する水平スケール・フェデレーション等の付加価値が本構成では不要
- 外部 IdP の SLA やレート制限に依存することなく、clearflow が OAuth フロー全体を管理できる

#### Alternative: 外部 IdP（Auth0・Keycloak 等）を認可サーバーとして委譲

| | |
|---|---|
| **Pros** | 認可サーバーの実装コストがゼロ。外部 IdP が提供するフロー管理・セキュリティ更新を受けられる |
| **Cons** | テナント・ユーザーの対応付けが外部 IdP のユーザー属性に依存し、マルチテナント分離の管理が複雑になる。外部サービスへの依存増加 |
| **Why not** | マルチテナント SaaS の自己完結型認証基盤に外部 IdP を差し込む設計上の複雑さが、実装コスト削減の利益を上回る |

---

### D2: アクセストークンは opaque 文字列（JWT 不採用）

**Decision**: アクセストークンは `oat_` プレフィクス + 32 バイトランダム（base64url）の opaque 文字列とする。リフレッシュトークンは `ort_` プレフィクスで同形式。DB には SHA-256 ハッシュのみを保存し、検証時は DB 照合する。JWT は採用しない。

**Rationale**:
- clearflow は認可サーバーとリソースサーバーが同一プロセスであり、JWT の主要な利点（署名検証のみで DB 不要な stateless 検証）がこの構成では意味をなさない
- opaque トークンは DB レコードの `revokedAt` を設定するだけで即時失効できる。JWT は有効期限内の即時失効ができず、接続解除後もトークンが有効な状態が残る
- PAT（`cfp_` prefix + SHA-256 保存）と同じパターンを踏襲することで実装の一貫性を保ち、`resolveBearer` の dispatch 拡張が単純になる
- `oat_` / `ort_` prefix によりログ・シークレットスキャナーでのトークン識別が可能

#### Alternative: JWT（RS256 署名）

| | |
|---|---|
| **Pros** | DB 照合なしで署名検証が完結。分散環境でリソースサーバーが独立してトークンを検証できる |
| **Cons** | 即時失効不可（有効期限内は接続解除後もトークンが有効）。鍵管理（ローテーション・配布）の複雑さが追加される。self-hosted 構成では DB 照合不要の利点がない |
| **Why not** | 認可・リソースサーバーが同一プロセスの構成で JWT の利点は享受できず、即時失効不可という本質的な制約だけが残る |

---

### D3: OAuth クライアントはプラットフォームレベル（組織スコープ外）で保持する

**Decision**: `oauth_clients` テーブルは `organizationId` を持たない。テナント分離は同意レコード（`oauth_tokens` テーブル）が `userId` + `organizationId` で担保する。これは `inv-all-tenant-scoped`（全テーブルが organizationId を持つ不変条件）の意図的な例外として `design/domain/invariants.md` に明記する。

**Rationale**:
- 動的クライアント登録（RFC 7591）はユーザーが未認証の段階で実行されうる。クライアントを組織に紐づけると、claude.ai のような単一クライアントが複数組織のユーザーに接続を提供できなくなり、動的登録の意味がなくなる
- `oauth_clients` はクライアントアプリのメタデータ（名称・リダイレクト URI）であり、テナントの機密ビジネスデータを含まない
- テナント分離の責任は `oauth_tokens`（同意レコード）が負い、各ユーザーは自分の組織内でのみトークンを取得・利用できる

#### Alternative: OAuth クライアントを組織スコープで管理する

| | |
|---|---|
| **Pros** | `inv-all-tenant-scoped` の例外を作らずに済む |
| **Cons** | claude.ai が組織ごとに別 client_id を動的登録する必要があり、同一クライアントが複数組織に接続する通常のユースケースに対応できない |
| **Why not** | 動的クライアント登録の仕様前提と根本的に相容れない |

---

### D4: リフレッシュトークンローテーション + 再利用検知で family 単位失効

**Decision**: リフレッシュトークンは `family_id`（UUID）で系列を管理する。リフレッシュ時に旧トークンを失効させ新トークンを発行する（ローテーション）。失効済みトークンでリフレッシュが試行された場合、同一 `family_id` の全トークン（アクセス + リフレッシュ）を失効させる（再利用検知）。

**Rationale**:
- MCP クライアントは public client（`client_secret` を保持できない）であり、盗難トークンの検知手段がローテーションしかない。OAuth 2.1 の推奨に従う
- 失効済みリフレッシュトークンの再利用は、トークンが盗まれて攻撃者と正当なクライアントが同一トークンを持っている状態を示す。系列一括失効で攻撃者のアクセスも切断できる
- `family_id` を単一テーブル（D5 参照）に持つことで、1 クエリでの系列失効が可能になる

**留意事項**: ネットワーク遅延等で正当なクライアントが旧リフレッシュトークンを再送した場合も系列失効が発生し、ユーザーは再認可が必要になる。OAuth 2.1 のセキュリティ推奨とのトレードオフとして受容する。

#### Alternative: リフレッシュトークンなし（アクセストークンのみ）

| | |
|---|---|
| **Pros** | 実装が単純。失効モデルも単純 |
| **Cons** | アクセストークンの短寿命（1 時間）ごとに再認可（ブラウザでの同意操作）が必要になり、実用に堪えない UX |
| **Why not** | 再認可なしの長期接続を実現するためにリフレッシュトークンは必須 |

---

### D5: 認可コード・アクセストークン・リフレッシュトークンを単一テーブル `oauth_tokens` で管理する

**Decision**: 認可コード・アクセストークン・リフレッシュトークンを `type` カラム（`authorization_code` / `access_token` / `refresh_token`）で区別する単一テーブル `oauth_tokens` とする。テーブルを type ごとに分割しない。

**Rationale**:
- 認可コード → トークン交換・リフレッシュ → ローテーション・接続解除による系列一括失効など、これらのレコードは密接に連携する操作を持つ。単一テーブルなら `family_id` での系列一括失効が 1 クエリで完結する
- マイグレーションが 1 本で済み、`JOIN` なしにすべての操作が同テーブルへのクエリで実装できる
- type ごとの固有カラム（認可コードの `codeChallenge` / `codeChallengeMethod`、トークンの `familyId`）は nullable で保持する

#### Alternative: `oauth_authorization_codes` / `oauth_access_tokens` / `oauth_refresh_tokens` の 3 テーブル分割

| | |
|---|---|
| **Pros** | 各テーブルのスキーマが型固有のカラムのみを持ち、NULL カラムがない |
| **Cons** | 系列失効時に 3 テーブルへのトランザクション UPDATE が必要。マイグレーションが 3 本。JOIN を伴うクエリが増加 |
| **Why not** | 系列一括失効の複雑さが単一テーブルの NULL カラムより大きなデメリット |

---

### D6: `resolveBearer` を PAT / OAuth トークン統合 dispatcher として拡張する

**Decision**: `resolveBearer` の既存シグネチャ・関数名を維持したまま、内部で「`cfp_` prefix → PAT 解決パス」「`oat_` prefix → OAuth アクセストークン解決パス」に分岐する dispatcher として拡張する。

**Rationale**:
- ADR-026 D6 の方針に従い、MCP route handler のコードは変更しない。`resolveBearer` を拡張するだけで OAuth トークンが透過的に処理できる
- 既存テスト（`mcpAuth.test.ts`）が `resolveBearer` と `hasApiTokenPrefix` の関数名を文字列照合でアサートしており、関数名変更はテスト破壊を招く
- prefix による dispatch で PAT と OAuth の解決パスが明確に分離され、将来の追加トークン種別への拡張も同パターンで対応できる

#### Alternative: 別関数 `resolveOAuthBearer` を `route.ts` 側で呼び分ける

| | |
|---|---|
| **Pros** | 関数ごとの責務が明確に分離される |
| **Cons** | `route.ts` の変更が必要。認証判定ロジックが route 層に漏出し、テスト影響の調査範囲が広がる。ADR-026 D6 の「MCP 層を変更しない」制約に反する |
| **Why not** | 既存テストの保護と MCP 層の不変性の両方を満たせない |

---

### D7: PAT との共存を維持する（OAuth 一本化を却下）

**Decision**: PAT（`cfp_` prefix）と OAuth アクセストークン（`oat_` prefix）を `resolveBearer` 内で共存させる。PAT を廃止・非推奨にしない。

**Rationale**:
- ヘッダ設定可能なクライアント（Claude Code・スクリプト・CI）には PAT が単純で確実。Bearer ヘッダに静的文字列を設定するだけで動作し、OAuth フローの複雑さが不要
- `resolveBearer` の dispatch 拡張により共存のランタイムコストは無視できる
- OAuth 導入後も既存 PAT ユーザーの操作環境を壊さない

#### Alternative: PAT を廃止して OAuth に一本化

| | |
|---|---|
| **Pros** | トークン管理の一元化 |
| **Cons** | ヘッダ設定型クライアント・CI/CD パイプラインが OAuth フロー（ブラウザ同意が必要）に移行できない。既存ユーザーへの破壊的変更になる |
| **Why not** | 各クライアント種別の特性に合わせて両形式を維持することが正しい設計 |

---

## Consequences

### Positive

- ブラウザベースの MCP クライアント（claude.ai custom connector 等）が OAuth フロー経由で clearflow を利用できる基盤が整った
- ADR-026 D6 の設計（`resolveBearer` 抽象化）が活用され、MCP 層のコードを変更せずに OAuth 対応を実現した
- opaque トークン + 即時失効可能な設計により、接続解除が確実にアクセスを遮断する
- リフレッシュトークンローテーション + 再利用検知で盗難トークンの影響範囲を限定できる
- PAT との共存により既存ユーザーの操作環境を壊さず新規クライアント対応を追加した
- 動的クライアント登録でクライアント側の事前設定不要なゼロタッチ接続を実現した

### Negative / Trade-offs

- opaque トークンは MCP リクエストごとに DB 照合が発生する。PAT と同じパスを通るため既に受容済みのコストだが、将来の高頻度アクセスに備えてキャッシュ層追加の余地を残す
- `oauth_clients` が `inv-all-tenant-scoped` の例外となる。設計不変条件の揺らぎとして `design/domain/invariants.md` に明記する
- リフレッシュトークンの再利用検知による系列一括失効は、ネットワーク遅延等で正当なクライアントの接続を切断する可能性がある。ユーザーは再接続（再認可）で復旧できる
- 動的登録が悪用された場合のクライアントレコード増加は per-IP レート制限（10 件/時間）で抑制するが、古い未使用クライアントの定期クリーンアップは将来タスク

### Constraints for future changes

- **新しいトークン種別（スコープ付き・組織限定等）を追加するとき**: `oat_` / `ort_` prefix 体系と SHA-256 ハッシュ保存パターンを踏襲すること。独自の検証ロジックを `resolveBearer` の外に実装してはならない
- **トークン有効期限を変更するとき**: D8 の定数変更はセキュリティへの影響をレビューした上で ADR を更新すること。特にアクセストークンを 1 時間以上に伸ばすことは即時失効の意義を損なう
- **OAuth クライアントを組織スコープに移行するとき**: D3 の設計判断を覆す変更となる。動的クライアント登録の仕様上の前提（組織コンテキスト外での登録）との整合性を設計した上で ADR を更新すること
- **スコープ（read-only 制限等）を追加するとき**: 現在は接続 = ユーザー本人の全権限。スコープを実装する場合は `oauth_tokens` に `scope` カラムを追加し、`resolveBearer` の解決結果に scope を伝播させること。MCP route handler での権限チェックを `canPerform` と組み合わせて設計すること
- **refresh token の再利用検知で誤失効が頻発するとき**: D4 の「ネットワーク遅延による正当クライアントの誤失効」が問題になった場合は、grace period（旧トークンを短時間有効化）の導入を ADR で評価すること
- **認可サーバーとリソースサーバーを分離するとき**: D2 で JWT を却下した前提（同一プロセス）が崩れる。分離構成では JWT + 公開鍵配布への移行を改めて ADR で評価すること

---

## References

- `specrunner/changes/oauth-authorization-server/request.md` — 要件定義
- `specrunner/changes/oauth-authorization-server/design.md` — 詳細設計（D1〜D12）
- `specrunner/changes/oauth-authorization-server/spec.md` — ビヘイビア仕様
- `specrunner/changes/oauth-authorization-server/review-feedback-001.md` — コードレビュー所見 iter 1
- `specrunner/changes/oauth-authorization-server/review-feedback-002.md` — コードレビュー所見 iter 2
- `specrunner/adr/ADR-025-api-token-bearer-auth.md` — Bearer 認証基盤（前提）
- `specrunner/adr/ADR-026-mcp-server-protocol-adapter.md` — MCP サーバー基盤（前提）
- `specrunner/adr/ADR-001-foundation-db-auth-domain.md` — テナント分離・依存方向の根拠
- `specrunner/adr/ADR-012-authorization-centralization.md` — canPerform による認可集中管理
- `drizzle/0020_glossy_layla_miller.sql` — oauth_clients / oauth_tokens テーブルの差分マイグレーション
- `src/infrastructure/apiTokenResolver.ts` — resolveBearer の dispatcher 拡張
- `src/infrastructure/repositories/oauthClientRepository.ts` — oauth_clients リポジトリ
- `src/infrastructure/repositories/oauthTokenRepository.ts` — oauth_tokens リポジトリ（family 単位失効含む）
- `src/infrastructure/schema.ts` — oauth_clients / oauth_tokens テーブル定義
- `src/domain/models/oauthClient.ts` — OAuthClient ドメインモデル
- `src/domain/models/oauthToken.ts` — OAuthToken ドメインモデル
- `src/app/api/oauth/register/route.ts` — 動的クライアント登録エンドポイント
- `src/app/api/oauth/authorize/route.ts` — 認可エンドポイント
- `src/app/api/oauth/token/route.ts` — トークンエンドポイント
- `src/app/(auth)/oauth/consent/page.tsx` — 同意画面
- `src/app/(dashboard)/account/OAuthConnectionSection.tsx` — 接続管理 UI
- `design/domain/model.md` — ent-oauth-client / ent-oauth-token エンティティ追加
- `design/domain/invariants.md` — inv-all-tenant-scoped の oauth_clients 例外明記
