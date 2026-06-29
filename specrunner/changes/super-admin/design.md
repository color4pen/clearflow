# Design: スーパー管理者による組織プロビジョニング

## Context

Clearflow はマルチテナント SaaS であり、全リソースは `organizationId` でスコープされる。現状、組織（テナント）を作成する手段は seed のみで、運用上の組織追加ができない。組織内 RBAC（`canPerform`）は admin/member/manager/finance の 4 ロールで構成されるが、組織をまたぐ権限概念は存在しない。

本変更は「プラットフォーム管理者（スーパー管理者）」という新しい権限レイヤーを導入し、組織プロビジョニング（新規組織＋初期 admin ユーザーの発行）を可能にする。スーパー管理者は組織内の業務データには一切アクセスできず、プロビジョニング専用とする。

### 既存コード上の制約

- `organizations` テーブルは `id / name / created_at` の 3 カラムのみ。スキーマ変更不要
- `organizationRepository` には `findById` / `update` のみ。`create` がない
- `userRepository.create` は存在し、トランザクション対応済み
- `AuditAction` に `"organization.create"` がない（`"organization.update"` は存在）
- `AuditTargetType` に `"organization"` は存在する
- セッション型は `DefaultSession["user"]`（email を含む）+ `{ id, organizationId, role }` に拡張済み
- 認証は Auth.js v5 (JWT strategy)。`auth()` でセッションを取得し、Server Action / RSC でゲートする既存パターン

## Goals / Non-Goals

**Goals**:

- 環境変数 `SUPER_ADMIN_EMAILS` でスーパー管理者をカンマ区切りで指定できる
- スーパー管理者が `/platform` ルートから新規組織と初期 admin ユーザーをプロビジョニングできる
- 全組織の一覧（メタ情報のみ）を閲覧できる
- 組織作成操作が `organization.create` として監査ログに記録される
- テナント分離（`organizationId` スコープ）を一切破らない

**Non-Goals**:

- スーパー管理者による組織横断の業務データアクセス（案件・契約・請求・各組織のユーザー管理等）
- 組織の削除・無効化
- スーパー管理者の DB ロール化・UI 上での昇格（env 指定のみ）
- 課金・プラン・セルフサインアップ

## Decisions

### D1: スーパー管理者の判定は env ベース純関数

`SUPER_ADMIN_EMAILS` 環境変数（カンマ区切り）を読み取り、`isSuperAdmin(email: string): boolean` を純関数として `src/domain/services/superAdmin.ts` に配置する。

- **Rationale**: DB に `is_super_admin` カラムや `"superadmin"` ロールを作ると、誤設定・昇格経路がテナント分離を恒久的に脅かす。env は運用者が明示管理でき、スキーマ変更が不要。domain layer に置くことで actions / usecases の双方から利用でき、依存方向も正しい。
- **Alternatives considered**:
  - `users.is_super_admin` カラム — 永続特権の footgun。却下。
  - `Role` に `"superadmin"` 追加 — 組織内 RBAC と混線し、`canPerform` の全マトリクスに影響。却下。

### D2: organizationRepository.create は新規組織 ID を DB が生成

`organizationRepository.create({ name }, tx?)` を追加する。`organizations.id` は `uuid().defaultRandom()` のため、DB がデフォルト値で ID を生成し、`.returning()` で返す。既存の `findById` / `update` と同じファイルに追加する。

- **Rationale**: 既存パターン（`userRepository.create`）に準拠。`organizationId` をアプリ側で生成する必要がない。
- **Alternatives considered**: なし（自然な拡張）。

### D3: provisionOrganization usecase が組織＋初期 admin を同一トランザクションで作成

`src/application/usecases/provisionOrganization.ts` に usecase を配置する。

1. email 重複チェック（`userRepository.existsByEmail`）
2. `db.transaction` 内で:
   - `organizationRepository.create({ name })`
   - `userRepository.create({ organizationId: 新組織.id, ... role: "admin", hashedPassword })`
   - `recordAudit({ action: "organization.create", ... })`

- **Rationale**: 組織だけ作成されて admin が不在になる不整合を防ぐ。`createUser` usecase を直接再利用しない理由は、actorId（スーパー管理者）の organizationId と新組織の organizationId が異なるため。既存 `createUser` は同一組織内の操作を前提としている。ただし `userRepository.create` と `recordAudit` は共通部品として再利用する。
- **Alternatives considered**:
  - 既存 `createUser` usecase の呼び出し — actorId の organizationId と targetUser の organizationId が異なるケースを想定していない。分離した方が安全。

### D4: listAllOrganizations usecase はメタ情報のみ返却

`src/application/usecases/listAllOrganizations.ts` に配置。`organizationRepository.findAll()` を呼び、`{ id, name, createdAt }` のみを返す。業務データ（ユーザー数やリソース件数等）は一切含めない。

- **Rationale**: テナント分離を破らない最小 API。組織一覧は organizationId でスコープしない唯一のクエリだが、返却するのは organizations テーブルのメタ情報のみ。
- **Alternatives considered**: なし（要件が明確）。

### D5: /platform ルートグループは (dashboard) とは独立

`src/app/(platform)/platform/page.tsx` を新設し、`(platform)/layout.tsx` でスーパー管理者認証ゲートを行う。`(dashboard)` とは別ルートグループにする。

- **Rationale**: `(dashboard)/layout.tsx` は組織内ユーザー用のサイドバー・セッション構造を持つ。スーパー管理者向けプラットフォーム画面は組織コンテキストに依存しないため、別レイアウトが適切。共通の root layout (`src/app/layout.tsx`) は共有する。
- **Alternatives considered**:
  - `(dashboard)/platform/...` に配置 — dashboard レイアウトの organizationId 依存が不適切。却下。

### D6: Server Action は src/app/actions/platform.ts に集約

`auth()` + `isSuperAdmin(session.user.email)` の二重チェックを全 Action で実施する。`canPerform` は組織内 RBAC であり、スーパー管理者判定には使わない。

- **Rationale**: 既存の action パターン（auth → 権限チェック → zod 検証 → usecase 呼び出し）に準拠。スーパー管理者は組織内 RBAC とは別レイヤーなので `canPerform` は不使用。
- **Alternatives considered**: なし（既存パターンの自然な適用）。

### D7: .env.example に SUPER_ADMIN_EMAILS を追記

`.env.example` にキーと説明コメントを追加し、未設定時は空配列として扱う（スーパー管理者なし = `/platform` に誰もアクセスできない）。

- **Rationale**: 既存の env パターン（DATABASE_URL, AUTH_SECRET 等）に準拠。

## Risks / Trade-offs

- **[Risk] スーパー管理者がどの組織にも属さない可能性** → スーパー管理者は通常ユーザーとして *いずれかの* 組織に属している前提（Auth.js で認証するため `users` テーブルに登録が必要）。スーパー管理者はその組織の業務ユーザーとしても機能しうるが、`/platform` 上では自分が属する組織のコンテキストを使わず、プロビジョニング操作のみ行う。actorId として自分の user.id を監査ログに記録する。
- **[Risk] SUPER_ADMIN_EMAILS の env が未設定** → `isSuperAdmin` は空文字列/未設定を空配列として扱い、全ユーザーを非スーパー管理者と判定する。`/platform` にアクセスできるユーザーがゼロになるだけで安全。
- **[Risk] organizationRepository.findAll が organizationId スコープを持たない** → これは意図的な設計。返却するのは organizations テーブルのメタ情報のみで、テナント固有の業務データには一切アクセスしない。

## Open Questions

なし（architect 評価済みの設計判断により主要な設計選択は確定済み）。
