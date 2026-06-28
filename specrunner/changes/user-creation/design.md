# Design: 管理者によるユーザー作成

## Context

本システムはマルチテナント SaaS だが、ユーザーを作成する手段が seed スクリプトしかない。`userRepository` に create メソッドが存在せず、管理画面（settings/users）は一覧表示とロール変更のみ。内製ツールとして実運用するには、管理者が自組織にユーザーを追加できる必要がある。

既存の書き込み経路（repository → usecase → Server Action → UI）はすべて確立されたパターンがあり、ユーザー作成はそのパターンに沿って1本追加するだけで実現できる。スキーマ変更は不要（users テーブルの既存カラムで作成に必要な情報はすべて揃っている）。

## Goals / Non-Goals

**Goals**:

- 管理者（admin ロール）が settings/users 画面からユーザーを作成できるようにする
- email / name / role / 初期パスワードを指定してユーザーを作成する
- 作成されたユーザーは操作者と同一の組織に属する（テナント分離）
- 作成操作を監査ログに記録する（`user.create`）
- email の一意性を保証する（usecase での事前チェック + DB UNIQUE 制約の二段防御）

**Non-Goals**:

- ユーザーの無効化・削除（スキーマ変更が必要なため別リクエスト）
- メール招待・本人による初回パスワード設定フロー（メール基盤が無い）
- パスワードリセット
- 組織をまたぐユーザー管理（スーパー管理者は別リクエスト）

## Decisions

### D1: 初期パスワードは管理者が設定する

**Rationale**: メール基盤が無いため、招待メール＋本人設定フローは構築コストが高い。管理者が初期パスワードを設定し、本人は別リクエスト（アカウント設定画面）で変更する方式が最小構成で内製運用に足りる。

**Alternatives considered**:
- 招待メール方式: メール送信基盤の構築が必要。現時点では過剰。
- ランダムパスワード自動生成: 管理者に表示する UX が必要になり、ワンタイム表示の仕組みも要る。初期パスワード方式より複雑。

### D2: email 重複チェックは usecase の事前確認 + DB UNIQUE 制約の二段

**Rationale**: usecase で `findByEmailForAuth` を使って事前に重複を確認し、ユーザー向けの明確なエラーメッセージを返す。同時実行の競合に対しては DB の UNIQUE 制約が最終防衛線として機能する。

**Alternatives considered**:
- DB UNIQUE のみ: エラーメッセージが PostgreSQL のエラーコードに依存し、ユーザーフレンドリーでない。
- usecase チェックのみ: TOCTOU 競合に対して脆弱。

### D3: 監査アクションは `user.create` を新設

**Rationale**: 既存の命名規約 `<対象>.<操作>` に従う。`AuditTargetType` の `user` は既存なので追加不要。`AuditAction` に `"user.create"` を追加するのみ。

**Alternatives considered**:
- 既存の `user.updateRole` を流用: 意味が異なるため不適切。

### D4: 認可は `organization.createUser` として ADMIN_ONLY

**Rationale**: 既存の organization エンティティの認可マトリクスに `createUser: ADMIN_ONLY` を追加する。`changeRole` と同じ粒度。manager にユーザー作成権限を開放すると、ロール昇格の迂回リスクがある。

**Alternatives considered**:
- ADMIN_MANAGER: manager がユーザーを作成すると自分より高い権限のユーザーを作れてしまう可能性がある。ロール制限のバリデーションを追加する必要があり複雑化する。

### D5: パスワードハッシュは bcryptjs の salt round 12

**Rationale**: 既存の seed.ts および auth.ts の認証フローと同一の方式（`bcrypt.hash(password, 12)` / `bcrypt.compare`）を使用する。互換性を保証するために同一ライブラリ・同一パラメータを使う。

**Alternatives considered**:
- argon2 等の別アルゴリズム: 既存認証フローとの互換性が無くなる。移行は別リクエストで扱う。

### D6: UI はユーザー作成フォームコンポーネントを settings/users に追加

**Rationale**: 既存の WebhookCreateForm パターン（`useActionState` + Server Action）に従い、`CreateUserForm` クライアントコンポーネントを新設する。settings/users/page.tsx は admin ロールのみアクセス可能なため、フォームの表示制御は不要（ページ自体が admin ガード済み）。

**Alternatives considered**:
- モーダルダイアログ: 現在の settings 画面にモーダルパターンが無い。インラインフォームの方が既存パターンと一貫性がある。
- 別ページ（settings/users/new）: 入力項目が4つと少ないため、別ページにする必要性が低い。一覧と同一画面にフォームを配置する方が操作導線が短い。

## Risks / Trade-offs

- [Risk] 管理者が設定した初期パスワードがユーザーに安全に伝達されない可能性がある → 運用手順で対応する。パスワード変更機能は別リクエストで提供予定。
- [Risk] 同時リクエストによる email 重複 → DB UNIQUE 制約が最終防衛線として機能する。usecase で PostgreSQL エラーコード `23505` を捕捉してドメインエラーに変換する。
- [Trade-off] パスワードの最小長バリデーションのみ（複雑性要件なし） → 内製ツールとしてのセキュリティ要件と開発コストのバランス。複雑性要件は必要に応じて後から追加可能。

## Open Questions

なし。architect 評価済みの設計判断により、未決定事項は解消されている。
