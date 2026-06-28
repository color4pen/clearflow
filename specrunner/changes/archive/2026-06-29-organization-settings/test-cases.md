# Test Cases: 組織設定（組織名の編集）

## Summary

- **Total**: 25 cases
- **Automated** (unit/integration): 18
- **Manual**: 7
- **Priority**: must: 17, should: 7, could: 1

---

### TC-001: Admin successfully updates organization name

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Admin SHALL be able to update the organization name > Scenario: Admin successfully updates organization name

---

### TC-002: Update is scoped to own organization only

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Admin SHALL be able to update the organization name > Scenario: Update is scoped to own organization only

---

### TC-003: Manager is denied organization update

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Non-admin roles SHALL be denied organization update > Scenario: Manager is denied organization update

---

### TC-004: Member is denied organization update

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Non-admin roles SHALL be denied organization update > Scenario: Member is denied organization update

---

### TC-005: Finance is denied organization update

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Non-admin roles SHALL be denied organization update > Scenario: Finance is denied organization update

---

### TC-006: Audit log is recorded on successful update

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Organization update SHALL record an audit log > Scenario: Audit log is recorded on successful update

---

### TC-007: Audit log is atomically recorded with update

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Organization update SHALL record an audit log > Scenario: Audit log is atomically recorded with update

---

### TC-008: Empty name is rejected

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Organization name input SHALL be validated > Scenario: Empty name is rejected

---

### TC-009: Name exceeding 100 characters is rejected

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: Organization name input SHALL be validated > Scenario: Name exceeding 100 characters is rejected

---

### TC-010: Organization tab is visible in settings navigation

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: Organization settings tab SHALL appear in SettingsNav > Scenario: Organization tab is visible in settings navigation

---

### TC-011: organizationId and actorId come from session

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: organizationId and actorId SHALL be derived from session > Scenario: organizationId comes from session

---

### TC-012: AuditTargetType includes "organization"

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01: 監査カタログに organization を追加

**GIVEN** `src/domain/models/auditLog.ts` が更新されている
**WHEN** `AuditTargetType` 型を参照する
**THEN** `"organization"` がユニオン型のメンバーに含まれる

---

### TC-013: AuditAction includes "organization.update"

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01: 監査カタログに organization を追加

**GIVEN** `src/domain/models/auditLog.ts` が更新されている
**WHEN** `AuditAction` 型を参照する
**THEN** `"organization.update"` がユニオン型のメンバーに含まれる

---

### TC-014: canPerform("admin", "organization", "updateOrganization") returns true

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02: 認可マトリクスに updateOrganization を追加

**GIVEN** `PERMISSION_MATRIX.organization.updateOrganization` が `ADMIN_ONLY` に設定されている
**WHEN** `canPerform("admin", "organization", "updateOrganization")` を呼ぶ
**THEN** `true` を返す

---

### TC-015: organizationRepository.update WHERE には organizationId が含まれる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03: organizationRepository.update を追加 / design.md > D1

**GIVEN** 2つの組織が存在し、それぞれ別の organizationId を持つ
**WHEN** `organizationRepository.update(orgA_id, orgA_id, { name: "新名称" })` を呼ぶ
**THEN** org-A のみ更新され、org-B は更新されない

---

### TC-016: organizationRepository.update は対象が存在しない場合 null を返す

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-03: organizationRepository.update を追加

**GIVEN** 存在しない organizationId を用意する
**WHEN** `organizationRepository.update(nonexistentId, nonexistentId, { name: "test" })` を呼ぶ
**THEN** 戻り値が `null` になる（例外を投げない）

---

### TC-017: updateOrganization usecase は db.transaction 内で update と recordAudit を呼ぶ

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04: updateOrganization usecase を新設 / design.md > D3

**GIVEN** `src/application/usecases/updateOrganization.ts` が実装されている
**WHEN** ファイルのソースコードを静的解析する
**THEN** `db.transaction` の呼び出しが存在する
**AND** `organizationRepository.update` と `recordAudit` がそのコールバック内に含まれる
**AND** `recordAudit` の `action` が `"organization.update"`、`targetType` が `"organization"` である

---

### TC-018: updateOrganization は組織が見つからない場合 { ok: false } を返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04: updateOrganization usecase を新設

**GIVEN** `organizationRepository.update` が `null` を返すよう mock する
**WHEN** `updateOrganization({ organizationId, actorId, name })` を呼ぶ
**THEN** `{ ok: false, reason: "組織が見つかりません" }` が返る
**AND** `recordAudit` は呼ばれない

---

### TC-019: updateOrganizationAction に "use server" ディレクティブが含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05: updateOrganizationAction Server Action を追加

**GIVEN** `src/app/actions/organization.ts` が実装されている
**WHEN** ファイルの先頭行を確認する
**THEN** `"use server"` ディレクティブが含まれる

---

### TC-020: 組織設定ページは admin 以外を /requests にリダイレクトする

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-06: 組織設定画面を追加

**GIVEN** manager ロールのユーザーがログインしている
**WHEN** `/settings/organization` に直接アクセスする
**THEN** `/requests` にリダイレクトされる
**AND** 組織設定フォームは表示されない

---

### TC-021: OrganizationForm の初期値に現在の組織名が表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-06: 組織設定画面を追加

**GIVEN** 組織名が "Acme Corp" として登録されている
**AND** admin ユーザーが `/settings/organization` にアクセスする
**WHEN** ページが表示される
**THEN** 組織名フィールドの初期値が "Acme Corp" になっている

---

### TC-022: OrganizationForm が送信結果に応じて成功・エラーメッセージを表示する

**Category**: manual
**Priority**: could
**Source**: tasks.md > T-06: 組織設定画面を追加

**GIVEN** admin ユーザーが `/settings/organization` を表示している
**WHEN** 有効な組織名でフォームを送信する
**THEN** 成功メッセージが表示される
**AND** 空文字でフォームを送信したときはバリデーションエラーメッセージが表示される

---

### TC-023: SettingsNav の「組織」タブが最初の項目として表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-07: SettingsNav に「組織」タブを追加

**GIVEN** admin ユーザーが設定ページにアクセスしている
**WHEN** SettingsNav が描画される
**THEN** 「組織」タブが一番左（先頭）に表示される
**AND** タブのリンク先が `/settings/organization` である

---

### TC-024: bun run typecheck が green になる

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-08: テストを追加

**GIVEN** 全タスク（T-01〜T-07）の実装が完了している
**WHEN** `bun run typecheck` を実行する
**THEN** 型エラーがゼロで終了する

---

### TC-025: bun run build が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-08: テストを追加

**GIVEN** 全タスク（T-01〜T-07）の実装が完了している
**WHEN** `bun run build` を実行する
**THEN** ビルドエラーなく成功する

---

## Result

```yaml
result: completed
total: 25
automated: 18
manual: 7
must: 17
should: 7
could: 1
blocked_reasons: []
```
