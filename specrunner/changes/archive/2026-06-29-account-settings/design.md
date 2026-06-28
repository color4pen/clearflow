# Design: アカウント設定（プロフィール編集・パスワード変更）

## Context

ログインユーザーが自分の表示名・パスワードを変更する手段が存在しない。既存の `/settings` 配下は `admin` 専用レイアウト（settings/layout.tsx で `role !== "admin"` をリダイレクト）であり、全ロールが到達できる本人向け設定経路は別途必要。

現状の関連コード:

- `userRepository` — `findById`（安全 projection: hashedPassword を返さない）、`findByEmailForAuth`（email ベースで hashedPassword を返す）、`updateRole`（tx 対応）、`updateNotificationsLastSeenAt`（tx 対応）。`updateProfile` / `updatePassword` は未実装。
- `createUser` usecase — `bcrypt.hash(pw, 12)` でハッシュ、`db.transaction` + `recordAudit` のパターンを実装済み。
- `AuditAction` — `user.create` / `user.updateRole` はあるが `user.updatePassword` は無い。
- `SidebarNav` — `adminOnly` フラグで表示制御。全ロール向け項目は `adminOnly` 無しで追加可能。

## Goals / Non-Goals

**Goals**:

- 全ロールのログインユーザーが自分の表示名を更新できる
- 全ロールのログインユーザーが現在パスワード照合の上で自分のパスワードを変更できる
- パスワード変更を `user.updatePassword` として監査ログに記録する
- `findById` の安全 projection（hashedPassword 非返却）を維持する

**Non-Goals**:

- email 変更（認証 identity に影響）
- パスワードリセット（メール基盤なし）
- 他人のアカウント編集（管理者によるユーザー管理は別領域）
- 2 要素認証・セッション管理

## Decisions

### D1: 本人スコープ固定 — Server Action が session.user.id を対象にする

**Rationale**: 入力から userId を受け取ると他人編集の経路が生まれる。`auth()` で取得した `session.user.id` を常に使い、ロールゲートは不要（全ロールが自分の設定を操作できる）。

**Alternatives considered**: usecase 側に本人ガードを置く方式 → Action 層で userId を入力から受け取る経路自体を排除する方がセキュリティ上確実であり、Action 層での固定を採用。

### D2: パスワード照合用の専用メソッド `findByIdForAuth` を追加

**Rationale**: 既存の `findByEmailForAuth` は email ベースであり、id ベースでの照合に流用すると不自然な呼び出しパターンになる（id → findById で email 取得 → findByEmailForAuth の 2 段）。`findById` の安全 projection は変更せず、`findByIdForAuth(id, organizationId)` で hashedPassword を含むレコードを返す専用メソッドを追加する。テナント分離のため WHERE は `(id, organizationId)` で絞る。

**Alternatives considered**: `findByEmailForAuth` を流用する方式 → id → email の変換が必要で非効率かつ組織境界をまたぐ可能性がある。`findById` に hashedPassword を追加する方式 → 安全 projection が崩れるため却下。

### D3: 配置は `/account` — 管理者領域 `/settings` の外

**Rationale**: `/settings` の layout.tsx が `admin` 以外をリダイレクトする。全ロールが到達可能にするため `(dashboard)/account/page.tsx` に配置する。

**Alternatives considered**: `/settings` 内に置きレイアウトのガードを条件付きにする方式 → 既存の admin 専用設定との境界が曖昧になるため却下。

### D4: 監査はパスワード変更のみ

**Rationale**: パスワード変更はセキュリティ上の重要イベント。表示名変更は本人の低リスク操作であり、監査ログのカタログ肥大を避けるため対象外とする。

**Alternatives considered**: 表示名変更も監査する方式 → AuditAction の増加に見合う効果がないため不採用。

### D5: repository メソッドは tx オプション引数を持つ

**Rationale**: 既存の `updateRole` / `create` と同じパターンに揃える。`updatePassword` は `changeOwnPassword` usecase 内で `db.transaction` と共に呼び出し、監査ログと同一トランザクションで記録する。`updateProfile` は監査不要のため tx 無しでも動作するが、パターン統一のため引数は残す。

### D6: SidebarNav に「アカウント」リンクを追加（全ロール表示）

**Rationale**: `navItems` 配列に `adminOnly` 無しで `{ href: "/account", label: "アカウント" }` を追加する。既存パターンに沿い、最小変更で導線を確保する。

## Risks / Trade-offs

- **[Risk] JWT セッションの name が古いまま残る** → パスワード変更と異なり、表示名変更はセッションキャッシュの更新タイミングに依存する。ただし本変更のスコープではセッション再発行は行わない（次回ログイン時に反映）。`revalidatePath` によりサーバー側の表示は即時更新される。
- **[Risk] パスワード照合の timing attack** → `bcrypt.compare` は定数時間比較を行うため、タイミング攻撃のリスクは低い。追加対策は不要。

## Open Questions

なし（architect 評価済みの設計判断に基づき、未決定事項はない）。
