# 組織設定（組織名の編集）

## Meta

- **type**: new-feature
- **slug**: organization-settings
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 既存パターン（canPerform 認可・repository・Server Action・settings 画面・recordAudit）に沿って組織の更新経路を1本足すだけで、新しい port/adapter や設計選択は無いため false -->

## 背景

組織（テナント）の情報を編集する手段がアプリ上に無い（`organizationRepository` は `findById` のみ）。組織は seed 生成後そのままで、組織名すら変更できない。内製ツールとして実運用するには、管理者が自組織の設定（組織名）を編集できる必要がある。本リクエストは「組織設定（組織名の編集）」を追加する。

## 現状コードの前提

- src/infrastructure/repositories/organizationRepository.ts — `findById` のみ。update は無い
- src/infrastructure/schema.ts organizations — id / name(NOT NULL) / created_at のみ（編集対象は name。スキーマ変更不要）
- src/domain/authorization.ts organization エンティティ操作: listUsers / viewAuditLog / changeRole / createUser / exportAuditLog / manageWebhooks。**updateOrganization は未定義**
- src/domain/models/auditLog.ts — AuditTargetType に `organization` は**無い**。AuditAction に `organization.update` も**無い**（追加が必要）
- src/app/(dashboard)/settings/SettingsNav.tsx — 設定タブ（承認ポリシー/テンプレート/ユーザー/代理承認/Webhook/監査ログ）。組織タブは無い
- settings 配下は管理者向け領域（admin/manager のみ到達する設計）

## 要件

1. `organizationRepository.update(organizationId, { name })` を追加する。WHERE は organizationId で絞る（自組織のみ更新）
2. `updateOrganization` usecase を新設する: `{ organizationId, actorId, name }` を受け取り、organizationRepository.update で更新し、`recordAudit({ action: "organization.update", targetType: "organization", targetId: organizationId, actorId, organizationId, metadata: { name } })` を同一トランザクションで記録する
3. `src/domain/models/auditLog.ts` の `AuditTargetType` に `"organization"` を、`AuditAction` に `"organization.update"` を追加する
4. `src/domain/authorization.ts` の organization に `updateOrganization: ADMIN_ONLY` を追加する
5. `src/app/actions/organization.ts`（新規）に `updateOrganizationAction` を追加する: `auth()` 認証、`canPerform(role, "organization", "updateOrganization")` 認可、zod で name 検証（必須・最大長）、organizationId/actorId は session 由来。成功時は組織設定画面を revalidate
6. settings に「組織」設定画面（組織名の表示・編集フォーム）を追加し、SettingsNav にタブを追加する

## スコープ外

- 組織（テナント）の新規作成・削除（スーパー管理者の領域。別リクエスト）
- name 以外の組織属性の追加（現状スキーマに無い。カラム追加＝別リクエスト）
- 組織をまたぐ操作

## 受け入れ基準

- [ ] 管理者が組織名を編集でき、変更が自組織のみに適用される（他組織に影響しない）ことをテストで固定する
- [ ] admin 以外（manager/finance/member）は更新できないことをテストで固定する
- [ ] 更新時に `organization.update` 監査ログが記録されることをテストで固定する
- [ ] 依存方向 actions/RSC → usecases → domain / infrastructure を遵守する
- [ ] 既存テスト無変更で `bun test` green、`typecheck` green、`bun run build` 成功

## architect 評価済みの設計判断

1. **編集対象は name のみ** — organizations テーブルは現状 name しか編集可能属性を持たない。新属性追加はスキーマ変更を伴うため別リクエストとし、本リクエストは既存カラムの編集に限定する。
2. **監査カタログに organization を追加** — AuditTargetType / AuditAction に organization 系を追加する。命名は `<対象>.<操作>` 規約（ユビキタス言語辞書）に従う。
3. **設定画面は管理者領域に配置** — 組織設定は admin 操作のため既存の settings（管理者向け）配下に置く。本人向けのアカウント設定（全ロール）とは別系統（別リクエスト account-settings）。
