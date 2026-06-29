# Design: ユーザーの無効化・再有効化

## Context

管理者がユーザーを無効化（アカウント停止）する手段がなく、退職者等のアクセスを止められない。ユーザー作成（実装済み）の対になる「無効化／再有効化」を追加する。

現状の実装:

- `users` テーブルに無効/停止を表すカラムがない
- `findByEmailForAuth(email)` は email のみで検索し、無効ユーザーの除外条件がない
- `auth.ts` の `authorize` は `findByEmailForAuth` + `bcrypt.compare` で認証
- `updateUserRole` usecase に「組織で最後の admin を降格不可」ガードがあり、無効化でも同様のロックアウト防止が必要
- `authorization.ts` の organization に `deactivateUser` 操作は未定義
- `AuditAction` に `user.deactivate` / `user.reactivate` は未定義
- settings/users ページにユーザー一覧・ロール変更・作成が既存

## Goals / Non-Goals

**Goals**:

- 管理者が自組織のユーザーを無効化・再有効化できる
- 無効化済みユーザーは login 認証で拒否される（次回認証から遮断）
- 自己無効化・組織で最後の admin の無効化を防止する
- 操作を監査ログに記録する
- settings/users ページに無効化状態の表示と操作 UI を追加する

**Non-Goals**:

- ユーザーの物理削除
- 無効化ユーザーの高度なフィルタ・一括操作
- 既存セッションの即時失効（発行済み JWT の即時 revoke は対象外）

## Decisions

### D1: ソフト無効化 — `deactivated_at` nullable timestamp

`users` テーブルに `deactivated_at` (timestamp, nullable) を追加する。null = 有効、non-null = 無効（無効化日時を記録）。

**Rationale**: 物理削除は監査ログの `actorId` 参照や履歴整合を壊す。boolean フラグではなく timestamp にすることで無効化日時を保持でき、将来的な監査要件にも対応可能。既存行は null（有効）のままで backfill 不要。

**Alternatives considered**:
- 物理削除 → 監査ログの FK 整合性が壊れるため却下
- `status` enum カラム → 現時点では active/deactivated の 2 状態のみ。nullable timestamp のほうがシンプルかつ日時情報を保持できる
- `is_active` boolean → 無効化日時が失われる

### D2: 認証ゲートは `findByEmailForAuth` で強制

`findByEmailForAuth` の WHERE 句に `deactivated_at IS NULL` を追加し、無効化済みユーザーを認証経路から除外する。

**Rationale**: 認証の最上流で遮断することで、UI やアクション層に散在するガードを不要にする。`authorize` コールバックの前段（DB 問い合わせ）でユーザーが返らなくなるため、パスワード照合にすら到達しない。

**Alternatives considered**:
- `authorize` コールバック内での `deactivated_at` チェック → `findByEmailForAuth` が UserWithPassword を返した後に判定することも可能だが、不要なデータを取得するコストがあり、WHERE で絞るほうがクリーン

### D3: ロックアウト防止ガードを `updateUserRole` と共有

`deactivateUser` usecase で「自己無効化不可」「組織で最後の admin の無効化不可」を実装する。ガード条件は `updateUserRole` の最後の admin ガードと同一ロジック（`findByOrganization` で他 admin を数える）。

**Rationale**: admin が 1 人しかいない状態でその admin を無効化すると組織がロックアウトされる。同じ不変条件を別の usecase でも適用する。ロジック重複は少量のため、現時点では共通関数への抽出は不要。

**Alternatives considered**:
- domain service として不変条件を共通化 → 現時点では 2 箇所のみで、ロジックも単純。共通化の複雑さに対してメリットが薄い

### D4: User モデルに `deactivatedAt` を追加

`User` 型に `deactivatedAt: Date | null` を追加する。repository の select 句でも `deactivatedAt` を返す。`findByOrganization` は全ユーザー（無効含む）を返し、UI 側で表示を切り替える。

**Rationale**: 管理者がユーザー一覧で無効化状態を確認できる必要がある。リポジトリは無効フィルタをかけず、一覧で全員を表示する（有効/無効のバッジで区別）。

**Alternatives considered**:
- `findByOrganization` で無効ユーザーを除外 → 管理画面で無効ユーザーを確認・再有効化できなくなるため却下

### D5: authorization に `deactivateUser: ADMIN_ONLY` を追加

organization エンティティの権限マトリクスに `deactivateUser: ADMIN_ONLY` を追加する。再有効化も同じ `deactivateUser` 権限で判定する（別の操作名を分ける必要がない）。

**Rationale**: 無効化と再有効化は対の操作であり、同一の権限レベル（admin のみ）で管理するのが自然。canPerform の 1 エントリで両方をカバーする。

**Alternatives considered**:
- `deactivateUser` と `reactivateUser` を別々に定義 → 権限レベルが同じであり、エントリを増やすメリットがない

## Risks / Trade-offs

- **[Risk] 既存セッションの残存** → 無効化後も発行済み JWT は有効なまま残る。次回認証（JWT 再発行時）から遮断される。即時失効はスコープ外とし、要件が生じた場合は別リクエストで対応する。

- **[Risk] 無効化済みユーザーが承認ステップの approver に指定されている場合** → 無効化はユーザーの「認証可否」のみを変更し、既存の承認ステップ・委任設定のデータには影響しない。承認フロー上の影響は運用で対処する（スコープ外）。

- **[Trade-off] findByOrganization が無効ユーザーも返す** → 管理画面で再有効化するために必要だが、他の用途（承認者候補一覧など）で無効ユーザーが混入する可能性がある。現時点ではユーザー一覧は settings/users のみで使用されているため問題ない。

## Open Questions

なし（architect 評価済み設計判断により主要な論点は解決済み）。
