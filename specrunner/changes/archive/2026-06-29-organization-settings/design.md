# Design: 組織設定（組織名の編集）

## Context

組織（テナント）の情報を編集する手段がアプリ上に存在しない。`organizationRepository` は `findById` のみを提供し、update メソッドがない。組織は seed 生成後そのままで、組織名すら変更できない。内製ツールとして実運用するには、管理者が自組織の設定（組織名）を編集できる必要がある。

現状のコードベース:

- `src/infrastructure/repositories/organizationRepository.ts` — `findById` のみ
- `src/infrastructure/schema.ts` organizations テーブル — `id` / `name` (NOT NULL) / `created_at`。スキーマ変更不要
- `src/domain/authorization.ts` — organization エンティティに `listUsers` / `viewAuditLog` / `changeRole` / `createUser` / `exportAuditLog` / `manageWebhooks` を定義。`updateOrganization` は未定義
- `src/domain/models/auditLog.ts` — `AuditTargetType` に `"organization"` なし。`AuditAction` に `"organization.update"` なし
- `src/app/(dashboard)/settings/SettingsNav.tsx` — 設定タブ（承認ポリシー/テンプレート/ユーザー/代理承認/Webhook/監査ログ）。組織タブなし
- settings 配下は管理者向け領域（layout.tsx で `admin` ロールのみ許可）

## Goals / Non-Goals

**Goals**:

- 管理者（admin）が自組織の名前を変更できる組織設定画面を提供する
- 組織名の更新を監査ログに記録する（`organization.update`）
- 既存の認可パターン（`canPerform`）に沿った権限制御を適用する

**Non-Goals**:

- 組織（テナント）の新規作成・削除（スーパー管理者の領域。別リクエスト）
- `name` 以外の組織属性の追加（カラム追加 = 別リクエスト）
- 組織をまたぐ操作
- アカウント設定（全ロール向け。別リクエスト account-settings）

## Decisions

### D1: `organizationRepository.update` の設計

repository に `update(id, organizationId, data, tx?)` を追加する。`id` と `organizationId` の両方を WHERE 条件に指定し、自組織のみ更新可能にする。トランザクション対応のため `tx` を optional 引数で受ける。

- **Rationale**: 既存の `userRepository.updateRole(id, organizationId, role, tx?)` と同一パターンに合わせる。organizationId による絞り込みはマルチテナント分離を保証するプロジェクトの慣行
- **Alternative**: `id` のみで更新 → マルチテナント分離の保証が弱まるため不採用

### D2: 監査カタログへの `organization` 追加

`AuditTargetType` に `"organization"` を追加し、`AuditAction` に `"organization.update"` を追加する。

- **Rationale**: 命名は `<対象>.<操作>` 規約（既存パターン: `user.updateRole`, `deal.update` 等）に従う。`AuditTargetType` は他のエンティティと同列に追加
- **Alternative**: 既存の AuditAction で代用 → 監査ログのフィルタリングが不正確になるため不採用

### D3: usecase は 1 関数 `updateOrganization`

`src/application/usecases/updateOrganization.ts` を新設する。`db.transaction` 内で `organizationRepository.update` と `recordAudit` を呼ぶ。

- **Rationale**: プロジェクト慣行「1 usecase = 1 関数」に従う。`updateUserRole` usecase と同構造で、トランザクション内に更新と監査記録を同居させるパターンを踏襲
- **Alternative**: service 層に配置 → 組織更新は単一のオーケストレーションであり service に切り出す必要なし

### D4: Server Action `updateOrganizationAction`

`src/app/actions/organization.ts`（新規）に配置。`auth()` で認証、`canPerform(role, "organization", "updateOrganization")` で認可、zod で `name` を検証（必須・最大長 100 文字）。`organizationId` / `actorId` は session 由来。

- **Rationale**: 既存の `users.ts` Server Actions パターンを踏襲。formData から取得するのは `name` のみで、`organizationId` / `actorId` は session から参照する（セキュリティ上クライアントに委ねない）
- **Alternative**: Route Handler (API) → プロジェクト全体が Server Actions ベースのため不採用

### D5: 設定画面は `settings/organization/` に配置

`src/app/(dashboard)/settings/organization/page.tsx` に Server Component として配置。`SettingsNav` に「組織」タブを先頭に追加する。編集フォームは Client Component `OrganizationForm.tsx` に分離する。

- **Rationale**: settings 配下は admin 専用（layout.tsx でガード済み）。SettingsNav の先頭に配置するのは、組織設定が最も基本的な設定であるため。Server Component で組織データを取得し、Client Component にフォームを委譲するパターンは既存の settings ページ（users, webhooks 等）と一致
- **Alternative**: settings 外に配置 → 管理者設定の一貫性が損なわれるため不採用

### D6: 権限は `ADMIN_ONLY`

`authorization.ts` の organization エンティティに `updateOrganization: ADMIN_ONLY` を追加する。

- **Rationale**: 組織名の変更はテナント全体に影響する操作であり、admin に限定するのが妥当。既存の `changeRole` / `createUser` と同じ ADMIN_ONLY レベル
- **Alternative**: `ADMIN_MANAGER` → 組織名変更は影響範囲が広く、manager には不適切

## Risks / Trade-offs

- **[Risk] 組織名の空文字・極端に長い名前** → zod バリデーションで `min(1)` / `max(100)` を強制。repository 側は schema の NOT NULL 制約が最終防御
- **[Risk] 既存テストの破壊** → `AuditTargetType` / `AuditAction` への union 追加は後方互換。`authorization.ts` への操作追加も既存操作に影響しない。新テストのみ追加

## Open Questions

なし。既存パターンに沿った直線的な実装であり、設計上の未決定事項はない。
