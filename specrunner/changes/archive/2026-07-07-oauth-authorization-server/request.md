# MCP クライアント向け OAuth 2.1 認可サーバー

## Meta

- **type**: new-feature
- **slug**: oauth-authorization-server
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: 認可サーバーという新しい adapter の導入。トークンモデル（アクセス/リフレッシュ・回転・失効）とクライアント登録方式は外部連携全般を拘束する設計選択 → true -->

## 背景

PAT（api-token-foundation）はヘッダを設定できる MCP クライアント（Claude Code 等）には十分だが、claude.ai の custom connector は OAuth フロー（保護リソースメタデータによる認可サーバー発見 → 動的クライアント登録 → ブラウザ同意 → トークン取得）を前提とし、任意ヘッダの PAT を設定できない。非技術者がブラウザで「接続」するだけで clearflow の MCP を使えるようにするため、clearflow 自身に OAuth 2.1 認可サーバーを立てる。

前提: api-token-foundation と mcp-server-core がマージ済み。MCP エンドポイントの Bearer 検証はトークン種別非依存のインターフェースになっている（mcp-server-core 要件 2）。

## 現状コードの前提

- `src/infrastructure/auth.ts`: Auth.js v5 のセッション管理（Cookie）。同意画面のユーザー認証に再利用する。Auth.js は OAuth クライアント機能のみで、認可サーバー（authorize / token エンドポイント）の機能は持たない。
- `src/app/api/auth/[...nextauth]/`: 既存の認証コールバックルート。認可サーバーのルートとは衝突しない配置にする。
- `src/app/api/`: MCP エンドポイント（mcp-server-core で追加）が Bearer 検証インターフェースを持つ。
- `src/infrastructure/schema.ts`: OAuth クライアント・認可コード・アクセス/リフレッシュトークンを保持するテーブルは存在しない。

## 設計要素引用

[[mod-db]], [[mod-repo]], [[mod-usecase]], [[mod-auth]], [[mod-api]], [[mod-ui]], [[mod-mcp]], [[ent-organization]], [[ent-audit-log]], [[inv-all-tenant-scoped]], [[inv-audit-log-append-only]], [[term-tenant-isolation]]

新規要素: OAuth クライアント・OAuth トークンのエンティティを design/domain/model.md に追加する（要件 8）。

## 要件

1. **メタデータエンドポイント**: MCP の認可仕様に従い、(a) 保護リソースメタデータ（RFC 9728。MCP エンドポイントが 401 の `WWW-Authenticate` で発見可能にする）、(b) 認可サーバーメタデータ（RFC 8414）を提供する。MCP 認可仕様の最新版（Streamable HTTP クライアントの実装が要求する discovery 経路）を design で確認し、準拠範囲を記録する。
2. **動的クライアント登録**（RFC 7591）: claude.ai 等が事前登録なしで client_id を取得できる。登録クライアントは組織に属さないプラットフォームレベルの記録として保持し、悪用対策（登録レート制限）を適用する。
3. **authorize エンドポイント**: 認可コードフロー + PKCE（S256 必須）。未ログインなら既存ログインへ誘導し、ログイン済みユーザーに同意画面（クライアント名・アクセス内容・ユーザー/組織の明示）を表示する。同意の拒否を正しくエラー応答する。
4. **token エンドポイント**: 認可コード交換とリフレッシュトークンローテーション（再利用検知で系列失効）。アクセストークンは短寿命、リフレッシュトークンは長寿命。すべてハッシュで保存し平文を永続化しない。
5. **Bearer 検証への接続**: MCP エンドポイントの検証インターフェースに OAuth アクセストークン検証を追加する。解決結果は PAT と同じ `{ userId, organizationId, role }`。失効・期限切れは 401。
6. **接続管理 UI**: アカウント設定に「接続済みアプリケーション」一覧（クライアント名・最終使用・許可日時）と接続解除（トークン系列の失効）を追加する。
7. **監査ログ**: 同意（接続）と接続解除を記録する（トークン値・コードはメタデータに含めない）。
8. **設計 delta**: OAuth クライアント / OAuth トークンのエンティティを design/domain/model.md に追加する（`aozu check` exit 0 を維持）。
9. **claude.ai 接続の実機確認**: 受け入れ確認として、claude.ai custom connector からの接続 → ツール実行の手順を README または docs に記す（自動テストで担保できない部分の手動確認手順）。

## スコープ外

- トークンの権限スコープ（scope による read-only 制限など）— 当面は接続 = ユーザー本人の全権限（PAT と同じ）
- 外部 IdP（Google 等）を認可サーバーとして使う構成
- PAT の廃止（併存させる。スクリプト・CI 用として恒久維持）

## 受け入れ基準

- [ ] メタデータ発見 → 動的登録 → 認可コード + PKCE → トークン取得 → MCP ツール実行の一連のフローを統合テストで固定する
- [ ] PKCE 不正（verifier 不一致・S256 以外）・認可コード再利用・リフレッシュトークン再利用が拒否されることをテストで固定する
- [ ] 失効（接続解除）後のアクセストークン・リフレッシュトークンが 401 になることをテストで固定する
- [ ] 同意画面が未ログイン時にログインへ誘導することをテストで固定する
- [ ] 他ユーザーの接続を一覧・解除できないことをテストで固定する
- [ ] `typecheck && test` が green（既存テスト無変更で green）・`aozu check` exit 0・architecture test green

## architect 評価済みの設計判断

- **自前認可サーバーを採用、外部 IdP 委譲は却下**: clearflow は credentials 認証の自己完結型マルチテナント SaaS で、外部 IdP を挟むとテナント・ユーザーの対応付けが複雑になる。同意画面は既存セッションで認証でき、実装は bounded。
- **リフレッシュトークンローテーション + 再利用検知を採用**: 公開クライアント（MCP クライアントは client_secret を保持できない）前提では盗難トークンの検知手段がローテーションしかない。OAuth 2.1 の推奨に従う。
- **PAT 併存を採用、OAuth 一本化は却下**: ヘッダ設定型クライアント・スクリプト・CI には PAT が単純で確実。検証インターフェースが共通なので併存コストは低い。
