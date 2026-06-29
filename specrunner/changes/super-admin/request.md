# スーパー管理者による組織プロビジョニング

## Meta

- **type**: new-feature
- **slug**: super-admin
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: 組織内 RBAC とは別レイヤーの「プラットフォーム管理者（スーパー管理者）」概念を新設し、組織をまたぐ操作（組織作成）を初めて導入する。既存パターンと異なる設計選択のため true -->

## 背景

組織（テナント）を作成する手段が無く、組織は seed でしか作れない。複数組織を1基盤で運用するには、組織をまたぐ「プラットフォーム管理者（スーパー管理者）」が新規組織とその初期管理者を発行できる必要がある。本リクエストはテナント分離を壊さない最小のスーパー管理者機能を追加する。**スーパー管理者であっても各組織の業務データ（案件・契約・請求・ユーザー管理等）には一切アクセスできない**（プロビジョニング専用）。

## 現状コードの前提

- src/infrastructure/schema.ts organizations — id / name / created_at（組織作成に必要なカラムは既存。スキーマ変更不要）
- src/infrastructure/repositories/organizationRepository.ts — findById / update のみ。**create は無い**
- src/infrastructure/repositories/userRepository.ts — create あり（別リクエストで追加済み。初期 admin の作成に使える）
- src/domain/authorization.ts — 認可は組織内 RBAC（canPerform）。**組織をまたぐ権限概念は無い**（admin は組織内 admin）
- 全リポジトリ操作は organizationId で絞る（テナント分離）。スーパー管理者でもこの分離を破らない
- src/domain/models/auditLog.ts — AuditTargetType に organization は追加済み。AuditAction に `organization.create` は**無い**
- env パターン: .env.example に DATABASE_URL / AUTH_SECRET / CRON_SECRET / SYSTEM_USER_ID

## 要件

1. スーパー管理者の指定を **env ベース**で行う: `SUPER_ADMIN_EMAILS`（カンマ区切りのメール）。`isSuperAdmin(email): boolean` 判定関数を用意する。DB に永続的な特権カラム（is_super_admin 等）は作らない
2. `organizationRepository.create({ name })` を追加する
3. `provisionOrganization` usecase: スーパー管理者が新規組織を作成し、その組織の**初期 admin ユーザー**を作成する（既存の userRepository.create を使用、role=admin、初期パスワードを設定）。組織作成と初期 admin 作成を同一トランザクションで行い、`recordAudit({ action: "organization.create", targetType: "organization", targetId: 新組織 id, actorId: スーパー管理者の user id, organizationId: 新組織 id })` を記録する
4. `listAllOrganizations` usecase: 全組織の一覧（id / name / created_at 等のメタのみ）。**各組織の業務データは含めない**
5. `src/domain/models/auditLog.ts` の AuditAction に `"organization.create"` を追加する
6. プラットフォーム用ルート（例 `/platform`）を新設し、`isSuperAdmin(session.user.email)` でゲートする（スーパー管理者以外はアクセス拒否）。組織一覧と「組織作成（組織名＋初期 admin の email/name/password）」フォームを置く
7. Server Action（例 src/app/actions/platform.ts）: `auth()` ＋ `isSuperAdmin` チェック、zod 検証、provisionOrganization / listAllOrganizations を呼ぶ。organizationId 等は入力から信用せず生成・取得する

## スコープ外

- **スーパー管理者による組織横断の業務データアクセス**（案件・契約・請求・各組織のユーザー管理等）。テナント分離を破る操作は一切作らない
- 組織の削除・無効化
- スーパー管理者の DB ロール化・UI 上での昇格（env 指定のみ）
- 課金・プラン・セルフサインアップ（商用 SaaS 外殻は対象外）

## 受け入れ基準

**テスト方針（必須）**: 以下の振る舞い系は **実 DB に対して usecase / repository を実行し、戻り値・DB 状態・監査ログを assert する**。ソースの文字列検査（readSrc / toContain による静的解析）で代替しない。プロジェクトの `*.dynamic.test.ts` / DB バックテスト規約（例 `optimisticLock.test.ts`, `watchDeal.dynamic.test.ts`）に倣う。純関数（isSuperAdmin 等）は通常の単体テストでよい。

- [ ] `SUPER_ADMIN_EMAILS` に含まれるユーザーのみ /platform に到達でき、それ以外（一般 admin 含む）は拒否されることをテストで固定する
- [ ] スーパー管理者が新規組織＋初期 admin を作成でき、初期 admin が新組織に属し role=admin であることをテストで固定する
- [ ] 組織作成時に `organization.create` 監査ログが記録されることをテストで固定する
- [ ] スーパー管理者でも既存の組織スコープ API（案件等のリポジトリ）に organizationId 分離を破る経路が無いことを確認する（業務データ横断アクセスを追加しない）
- [ ] 依存方向 actions/RSC → usecases → domain / infrastructure を遵守する
- [ ] 既存テスト無変更で `bun test` green、`typecheck` green、`bun run build` 成功

## architect 評価済みの設計判断

1. **env 指定のスーパー管理者（DB に特権フラグを作らない）** — DB に is_super_admin 等の永続フラグを置くと、誤設定や昇格経路がテナント分離を破る恒久的リスクになる。env（`SUPER_ADMIN_EMAILS`）で運用者が明示指定する方式はスキーマ変更不要かつ攻撃面が小さい。却下案: users.is_super_admin カラム（永続特権の footgun）、role に "superadmin" 追加（組織内 RBAC と混線）。
2. **能力はプロビジョニング専用（組織横断のデータアクセスを持たせない）** — スーパー管理者は組織作成・初期 admin 発行・組織一覧のみ。各組織の業務データには触れない。先行リクエストで強化したテナント分離（A1）を絶対に破らない。
3. **スキーマ変更なし** — organizations/users は既存テーブルで足り、組織作成・admin 作成は既存 repository.create で実現。マイグレーション不要。
4. **監査** — 組織作成を `organization.create` で記録する。actorId はスーパー管理者の user id を用いる。
