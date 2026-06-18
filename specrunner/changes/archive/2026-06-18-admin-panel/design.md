# Design: 管理画面（テンプレートCRUD・ユーザー管理）

## Context

承認テンプレートとユーザーの管理がシードデータに依存しており、アプリケーション上で変更できない。admin ロールのユーザーがテンプレート CRUD とユーザーロール変更を行える管理画面を追加する。

現状のコードベース:
- `approvalTemplateRepository` は `findByOrganization` と `findByOrganizationForAmount` のみ（CRUD なし）
- `userRepository` は `findByEmailForAuth` と `findById` のみ（一覧取得・ロール更新なし）
- `/settings/webhooks` に admin ロールチェックのパターンが確立済み（`session.user.role !== "admin"` ガード）
- `approval_templates` テーブルに name, organizationId, steps (jsonb), minAmount, maxAmount, createdAt がある
- `requests` テーブルに `templateId` カラムは存在しない。テンプレートとリクエストの関連は `audit_logs` の `metadata.templateId` でのみ追跡される
- `/settings` 配下にレイアウトファイルが存在しない。設定ページ間のナビゲーションは個別実装

## Goals / Non-Goals

**Goals**:
- approvalTemplateRepository に create / update / delete メソッドを追加する
- userRepository に findByOrganization / updateRole メソッドを追加する
- テンプレート管理用の usecase 層を追加する（createTemplate, updateTemplate, deleteTemplate）
- ユーザーロール変更用の usecase 層を追加する（updateUserRole）
- テンプレート管理・ユーザー管理の Server Actions を追加する
- `/settings/templates` にテンプレート一覧・作成・編集 UI を提供する
- `/settings/users` にユーザー一覧・ロール変更 UI を提供する
- `/settings` にサブナビゲーション付きレイアウトを導入する
- 全操作を audit_logs に記録する

**Non-Goals**:
- ユーザーの招待・作成・削除機能
- テンプレートのバージョン管理
- ロールの動的定義（固定 4 ロール: admin, member, manager, finance）

## Decisions

### D1: テンプレート削除時の使用中チェック — audit_logs 経由で判定

**決定**: テンプレート削除前に、`audit_logs` テーブルから `action='request.create'` かつ `metadata->>'templateId'` が一致するレコードを取得し、対応する `requests` の status が `pending` のものがあれば削除を拒否する。

**理由**: `requests` テーブルに `templateId` カラムが存在しないため、直接の FK 参照はできない。`createRequest` usecase は既に audit_logs の metadata に `templateId` を記録しているため、この情報を活用する。スキーママイグレーション（`requests` テーブルへの `templateId` カラム追加）は影響範囲が大きく、本変更のスコープを超える。

**代替案**: `requests` テーブルに `templateId` カラムを追加する案。クリーンだが、既存マイグレーションとの整合性管理が必要になり、本リクエストのスコープ外。

### D2: テンプレート使用中チェックの実装場所 — usecase 層に配置

**決定**: 使用中チェックロジックを `deleteTemplate` usecase に配置し、`requestRepository` に `existsPendingByTemplateId(templateId, organizationId)` メソッドを追加する。このメソッドは audit_logs と requests テーブルを JOIN して pending 状態のリクエストの存在を返す。

**理由**: 複数 repository にまたがるクエリの協調は usecase 層の責務。repository メソッドとしてカプセル化することで、SQL の詳細を usecase から隠蔽する。

**代替案**: domain service に配置する案。しかし本ロジックは DB アクセスを伴うため、domain layer（副作用なし）の原則に反する。

### D3: ユーザーロール変更 — 直接更新方式（architect 決定済み）

**決定**: admin が直接ユーザーのロールを変更する。承認フローによるロール変更管理は行わない。

**理由**: architect 評価済み。承認フローでのロール管理は過剰。

### D4: 自分自身のロール変更禁止 — usecase 層でガード（architect 決定済み）

**決定**: `updateUserRole` usecase で `actorId === targetUserId` の場合にエラーを返す。

**理由**: architect 評価済み。admin が自身を降格すると管理者不在リスクがある。

### D5: settings レイアウト — サブナビゲーション付き共通レイアウトを追加

**決定**: `src/app/(dashboard)/settings/layout.tsx` を新設し、Webhook / テンプレート / ユーザー / 監査ログへのナビゲーションリンクを配置する。admin ロール以外は `/requests` にリダイレクトする。

**理由**: 現状、各設定ページが個別に admin ガードを行っているが、レイアウト層で一括ガードする方が一貫性がある。ページ側の個別ガードも残すことでディープリンクに対する防御を維持する。

**代替案**: 既存の各ページにナビゲーションリンクを個別追加する案。DRY に反し、ナビ項目追加のたびに全ページ修正が必要。

### D6: テンプレート CRUD の usecase 層 — トランザクション + 監査ログを統一

**決定**: テンプレートの作成・更新・削除それぞれに usecase 関数を作成する。作成と更新はトランザクション内でテンプレート操作 + 監査ログ記録を行う。削除は使用中チェック → トランザクション（削除 + 監査ログ）の順。

**理由**: 既存の `createRequest` usecase がトランザクション内で audit_log を記録するパターンを踏襲する。依存方向 `actions → usecases → domain / infrastructure` を維持する。

### D7: テンプレートフォーム — ステップ配列の動的追加・削除

**決定**: テンプレート作成・編集フォームは Client Component として実装し、承認ステップ（approverRole + deadlineHours の配列）を動的に追加・削除できる UI を提供する。

**理由**: ステップ配列の動的操作には クライアントサイドの状態管理（useState）が必要。Webhook 管理の `WebhookCreateForm` と同様に `"use client"` コンポーネントで実装する。

### D8: ダッシュボードヘッダーのナビゲーション — 「設定」リンクを統合

**決定**: ダッシュボードレイアウトのヘッダーで、現状の「設定」（webhooks）と「監査ログ」の 2 リンクを「設定」1 リンク（`/settings/webhooks` へ）に統合する。設定内のナビゲーションは settings layout のサブナビに委譲する。

**理由**: 設定ページが増えるため、ヘッダーに個別リンクを置き続けるとスケールしない。

## Risks / Trade-offs

**[Risk] audit_logs 経由のテンプレート使用中チェックは間接参照**
→ Mitigation: `existsPendingByTemplateId` メソッドに明確な JSDoc を記述し、audit_logs の metadata 構造への依存を明示する。将来的に `requests.templateId` カラムを追加する際の移行先を限定する。

**[Risk] settings layout の admin ガードでページ個別ガードとの二重チェックが発生**
→ Mitigation: 冗長だが安全側に倒す。パフォーマンスへの影響は認証セッション読み取りのみで軽微。

**[Risk] テンプレートの steps (jsonb) のバリデーション不整合**
→ Mitigation: zod スキーマでバリデーションを統一し、Server Action 層で入力を検証する。repository 層では型を信頼する。

## Open Questions

なし（architect 評価済みの設計判断により主要な論点は解決済み）。
