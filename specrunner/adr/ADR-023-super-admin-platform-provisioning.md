# ADR-023: スーパー管理者（プラットフォーム管理者）によるテナントプロビジョニング

- **Status**: accepted
- **Date**: 2026-06-29
- **Change**: super-admin
- **Deciders**: architect

---

## Context

Clearflow はマルチテナント SaaS であり、全リソースは `organizationId` でスコープされる（ADR-001 D8）。これまで組織（テナント）を作成する手段は seed のみで、運用上の組織追加ができなかった。

組織内 RBAC（`canPerform`）は `admin / member / manager / finance` の 4 ロールで構成されるが、組織をまたぐ権限概念は存在しない。複数組織を 1 基盤で運用するには、組織のプロビジョニング（新規組織＋初期 admin 発行）を担う「プラットフォーム管理者（スーパー管理者）」が必要になった。

本変更で「スーパー管理者」という新しい権限レイヤーを組織内 RBAC とは独立して導入し、組織プロビジョニング専用の機能を追加した。スーパー管理者は各組織の業務データ（案件・契約・請求・ユーザー管理等）には一切アクセスできない。

---

## Decisions

### D1: スーパー管理者の判定は env ベース純関数（DB に特権フラグを持たない）

**Decision**: `SUPER_ADMIN_EMAILS`（カンマ区切りのメールアドレス）環境変数を読み取り、`isSuperAdmin(email: string): boolean` を純関数として `src/domain/services/superAdmin.ts` に配置する。DB に `is_super_admin` カラムや `"superadmin"` ロールは作らない。

**Rationale**:
- DB に永続的な特権フラグを置くと、昇格経路の漏洩・誤設定がテナント分離を恒久的に脅かすリスクになる
- env は運用者が明示管理でき、スキーマ変更・マイグレーションが不要
- 純関数として domain layer に配置することで actions / usecases の双方から利用でき、依存方向（`actions → usecases → domain`）も正しい
- `SUPER_ADMIN_EMAILS` が未設定または空の場合は全ユーザーを非スーパー管理者と判定するため、設定ミスがデフォルトで安全側に倒れる

#### Alternative 1: users.is_super_admin カラム

| | |
|---|---|
| **Pros** | DB レベルで特権が記録され、アプリ再起動なしに昇格・剥奪ができる |
| **Cons** | 永続的な特権フラグが攻撃対象になる。昇格 API が存在すると昇格経路を通じたテナント分離破壊のリスクが生まれる。スキーマ変更・マイグレーションが必要 |
| **Why not** | 永続特権の footgun。env 指定で十分な要件に対してリスクが大きすぎる |

#### Alternative 2: Role に "superadmin" を追加

| | |
|---|---|
| **Pros** | 既存の RBAC 体系に統合できる |
| **Cons** | 組織内 RBAC（`canPerform`）と混線する。`roleEnum` の pgEnum 追加・マイグレーションが必要。既存の `canPerform` 全マトリクスに影響が波及する |
| **Why not** | 組織内 RBAC とプラットフォーム権限は別レイヤーであるべき。混線させると RBAC の意味が壊れる |

---

### D2: スーパー管理者の能力はプロビジョニング専用（組織横断の業務データアクセスを持たせない）

**Decision**: スーパー管理者が行える操作を「組織作成・初期 admin 発行・全組織メタ情報一覧」の 3 つのみに限定する。各組織の業務データ（案件・契約・請求・ユーザー管理等）には一切アクセスできない。

**Rationale**:
- ADR-001 D8 で確立したアプリケーション層テナント分離（`organizationId` WHERE 条件）を絶対に破らない
- スーパー管理者が業務データを参照できると、顧客データの意図しない流出リスクが生まれる
- プロビジョニング専用に絞ることで攻撃面を最小化できる
- 将来スコープを拡大する場合は別途 ADR が必要

**Constraint**: 新規追加する `organizationRepository.findAll()` を除き、既存のリポジトリメソッドに `organizationId` 条件を外すオーバーロードや非スコープ variant を追加してはならない。

---

### D3: organizationRepository.findAll は organizationId スコープの意図的な例外

**Decision**: `organizationRepository.findAll()` を追加し、`organizationId` 引数なしで全組織のメタ情報（id, name, createdAt）を返す。これは ADR-001 D8 の「全リポジトリメソッドは organizationId を引数に取る」方針の明示的な例外とする。

**Rationale**:
- 全組織一覧はそもそも組織をまたぐ操作であり、`organizationId` でスコープすることが意味をなさない
- 返却するのは `organizations` テーブルのメタ情報（id / name / createdAt）のみ。業務データへのジョインは一切行わない
- 呼び出し元を `listAllOrganizations` usecase 内に限定することで、スーパー管理者チェックを通らない経路からの呼び出しを防ぐ

**⚠️ 将来の実装への制約**: `organizationRepository.findAll()` の呼び出し元は `listAllOrganizations` usecase 経由のみとする。`findAll` を他の usecase や action から直接呼び出してはならない。組織横断クエリは新たに ADR を記録しない限り追加してはならない。

#### Alternative 1: organizationId=null のオーバーロードで全組織を返す

| | |
|---|---|
| **Pros** | 既存メソッドシグネチャの拡張で実現できる |
| **Cons** | nullable の organizationId が全リポジトリに波及する可能性があり、分離の前提が崩れる。意図しない全組織クエリが発生しやすくなる |
| **Why not** | 意図的な例外であることを明示するため、別名メソッドとして独立させた方が安全 |

---

### D4: provisionOrganization usecase が組織＋初期 admin を同一トランザクションで作成

**Decision**: `src/application/usecases/provisionOrganization.ts` に usecase を新設し、email 重複チェック → `db.transaction` 内で組織作成・ユーザー作成・監査ログ記録の順で実行する。既存の `createUser` usecase は再利用しない。

**Rationale**:
- 組織作成と初期 admin 作成を同一トランザクションにすることで、org のみ作成されて admin が不在になる不整合を防ぐ
- 既存の `createUser` usecase は actorId の `organizationId` と対象ユーザーの `organizationId` が同一である前提で設計されており、プロビジョニング（actorId の組織 ≠ 新組織）では使用できない
- `userRepository.create` と `recordAudit` は共通部品として再利用する

**Transaction order**:
1. `userRepository.existsByEmail(email)` — 事前チェック（TOCTOU は 23505 catch で補完）
2. `await bcrypt.hash(password)` — TX 外でハッシュ化（CPU バウンド処理を TX 内に入れない）
3. `db.transaction` 内:
   - `organizationRepository.create({ name })`
   - `userRepository.create({ organizationId: newOrg.id, role: "admin", ... })`
   - `recordAudit({ action: "organization.create", targetId: newOrg.id, organizationId: newOrg.id, actorId: superAdminUserId })`

#### Alternative 1: 既存 createUser usecase を呼び出す

| | |
|---|---|
| **Pros** | ユーザー作成ロジックの重複を避けられる |
| **Cons** | `createUser` は actorId と targetUser の organizationId が同一であることを前提としており、プロビジョニングの文脈（actorId の組織 ≠ 新組織）を想定していない。不正な前提を持ち込む形での再利用は危険 |
| **Why not** | 分離した usecase を設けることで、プロビジョニング専用の不変条件をコードで表現できる |

---

### D5: /platform ルートグループを (dashboard) と独立して新設

**Decision**: `src/app/(platform)/` ルートグループを新設し、`(platform)/layout.tsx` でスーパー管理者認証ゲートを行う。既存の `(dashboard)/` とは完全に独立したレイアウト階層とする。共通の root layout (`src/app/layout.tsx`) は共有する。

**Rationale**:
- `(dashboard)/layout.tsx` は組織内ユーザー向けのサイドバー・organizationId 依存のセッション構造を持つ
- スーパー管理者画面は organizationId に依存しない。異なるコンテキストを持つレイアウトを共有すると、将来 organizationId 依存のコードが混入するリスクがある
- ルートグループを分離することで、スーパー管理者専用の認証ゲートを layout レベルで完結させられる

**Auth gate in (platform)/layout.tsx**:
1. `const session = await auth()` — セッション取得
2. 未認証 → `/login` へリダイレクト
3. 認証済みだが非スーパー管理者 → `next()` でアクセス拒否（将来は `/dashboard` または 403 ページへのリダイレクトを検討）

#### Alternative 1: (dashboard)/platform/... に配置

| | |
|---|---|
| **Pros** | 既存のレイアウト階層を再利用でき、ファイル数が増えない |
| **Cons** | `(dashboard)/layout.tsx` の organizationId 依存が `/platform` ルートにも適用される。スーパー管理者は organizationId を保持しない前提で動作する可能性があり、dashboard layout との不整合が生じる |
| **Why not** | コンテキストが異なるルートを同一レイアウトに押し込めるのは誤用 |

---

### D6: AuditAction に "organization.create" を追加

**Decision**: `src/domain/models/auditLog.ts` の `AuditAction` 型に `"organization.create"` を追加する。監査ログの `actorId` にはスーパー管理者の user id を使用し、`organizationId` には新規作成した組織の id を使用する。

**Rationale**:
- 組織作成はプラットフォームレベルの重要操作であり、監査証跡が必須
- `actorId` にスーパー管理者の user id を使うことで、どのスーパー管理者が操作したかを追跡できる
- `organizationId` に新組織 id を使うことで、既存の監査ログ参照パターン（組織スコープでのログ検索）と整合する

**AuditAction catalog（本変更時点）**:  
`"organization.create"` を ADR-020（AuditAction タイプカタログ）で定義済みのアクション群に追加する。

---

## Consequences

### Positive

- 組織を seed に頼らずプロビジョニングできるようになり、マルチテナント運用が実用的になる
- スーパー管理者の指定が env のみであり、スキーマ変更なし・攻撃面最小で実現された
- テナント分離（ADR-001 D8）を一切破らずに組織横断操作を導入できた
- 組織作成が監査ログに記録され、プロビジョニング履歴が追跡可能になった
- `(platform)` ルートグループの分離により、将来のプラットフォーム機能拡張の土台ができた

### Negative / Trade-offs

- スーパー管理者は通常ユーザーとして `users` テーブルに登録されている必要がある（Auth.js で認証するため）。どの組織にも属さないスーパー管理者は認証できない
- `organizationRepository.findAll()` は `organizationId` スコープなしのクエリであり、意図的な例外として維持が必要。新メンバーが例外の存在を知らずに類似クエリを追加するリスクがある
- `SUPER_ADMIN_EMAILS` が未設定の場合に `/platform` にアクセスできるユーザーがいなくなる。初期セットアップ時の設定漏れに注意

### Constraints for future changes

- **新しい組織横断クエリを追加するとき**: `organizationRepository.findAll()` と同様の意図的例外が必要な場合は、必ず ADR を記録し、呼び出し元をスーパー管理者チェック済みの usecase に限定すること
- **スーパー管理者機能の拡張時**: スーパー管理者に業務データ（案件・契約・請求・ユーザー管理等）へのアクセスを付与することは D2 の設計原則に反する。拡張する場合は改めて ADR を作成し、テナント分離への影響を評価すること
- **provisionOrganization の変更時**: 組織作成と初期 admin 作成は同一トランザクションで行うことを維持すること（D4）。監査ログの記録もトランザクション内で行うこと
- **`isSuperAdmin` の呼び出し場所**: Server Action 内では `auth()` + `isSuperAdmin` の二重チェックを必ず実施すること。layout のゲートのみに依存してはならない（defense-in-depth）
- **新規 `(platform)` 配下ルートの追加時**: `(platform)/layout.tsx` の認証ゲートがスーパー管理者チェックを行っているが、個別の Server Action でも `auth()` + `isSuperAdmin` チェックを行うこと

---

## References

- `specrunner/changes/super-admin/request.md` — 要件定義
- `specrunner/changes/super-admin/design.md` — 詳細設計（D1〜D7）
- `specrunner/changes/super-admin/spec.md` — ビヘイビア仕様
- `src/domain/services/superAdmin.ts` — isSuperAdmin 純関数
- `src/application/usecases/provisionOrganization.ts` — 組織プロビジョニング usecase
- `src/application/usecases/listAllOrganizations.ts` — 全組織一覧 usecase
- `src/infrastructure/repositories/organizationRepository.ts` — create / findAll 追加
- `src/app/(platform)/layout.tsx` — プラットフォームルートの認証ゲート
- `src/app/actions/platform.ts` — スーパー管理者向け Server Actions
- `src/domain/models/auditLog.ts` — AuditAction への "organization.create" 追加
- `specrunner/adr/ADR-001-foundation-db-auth-domain.md` — テナント分離（D8）・依存方向（D5）の根拠
- `specrunner/adr/ADR-020-audit-action-type-catalog.md` — AuditAction カタログ
