# Test Cases: 複数段階承認と差し戻し・再申請

## Summary

- **Total**: 62 cases
- **Automated** (unit/integration): 52 (unit: 35, integration: 17)
- **Manual**: 10
- **Priority**: must: 55, should: 7, could: 0

---

## Domain Model

### TC-001: RequestStatus に "revision" が含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01 AC

**GIVEN** `src/domain/models/request.ts` が存在する
**WHEN** `RequestStatus` 型のユニオン値を列挙する
**THEN** `"draft" | "pending" | "approved" | "rejected" | "revision"` の 5 状態が含まれる

---

### TC-002: ApprovalStep 型が全必須フィールドを持つ

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01 AC

**GIVEN** `src/domain/models/approvalStep.ts` が存在する
**WHEN** `ApprovalStep` 型のフィールドを確認する
**THEN** `id`, `requestId`, `stepOrder`, `approverRole`, `status (ApprovalStepStatus)`, `approvedBy (string | null)`, `approvedAt (Date | null)`, `comment (string | null)`, `organizationId` がすべて含まれる

---

### TC-003: ApprovalTemplate 型が全必須フィールドを持つ

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01 AC

**GIVEN** `src/domain/models/approvalTemplate.ts` が存在する
**WHEN** `ApprovalTemplate` 型のフィールドを確認する
**THEN** `id`, `name`, `organizationId`, `steps (ApprovalTemplateStep[])`, `createdAt` がすべて含まれ、`ApprovalTemplateStep` は `{ stepOrder: number; approverRole: string }` 型である

---

### TC-004: domain/models 配下に ORM import がない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01 AC

**GIVEN** `src/domain/models/approvalStep.ts` および `src/domain/models/approvalTemplate.ts` が存在する
**WHEN** 各ファイルの import 文を解析する
**THEN** `drizzle` または `@/infrastructure` を参照する import が一切存在しない

---

## State Transition

### TC-005: pending → revision 遷移が許可される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02 AC

**GIVEN** `src/domain/services/requestTransition.ts` の `VALID_TRANSITIONS` が `revision` 遷移を含む状態で更新されている
**WHEN** `validateTransition("pending", "revision")` を呼び出す
**THEN** `{ ok: true }` が返される

---

### TC-006: revision → pending 遷移が許可される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02 AC

**GIVEN** `src/domain/services/requestTransition.ts` の `VALID_TRANSITIONS` に `revision → pending` が定義されている
**WHEN** `validateTransition("revision", "pending")` を呼び出す
**THEN** `{ ok: true }` が返される

---

### TC-007: revision → approved 遷移が拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 差し戻し操作で申請が revision 状態に遷移する > Scenario: revision 状態から approved への遷移は拒否される

---

### TC-008: revision → rejected 遷移が拒否される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02 AC

**GIVEN** `revision` は終端状態ではないが `rejected` への直接遷移は定義されていない
**WHEN** `validateTransition("revision", "rejected")` を呼び出す
**THEN** `{ ok: false, reason: ... }` が返される

---

### TC-009: draft → pending 遷移が後方互換で維持される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-02 AC

**GIVEN** `VALID_TRANSITIONS` に `revision` 関連の遷移が追加されている
**WHEN** `validateTransition("draft", "pending")` を呼び出す
**THEN** `{ ok: true }` が返され、既存の遷移ルールが破壊されていない

---

## Domain Service

### TC-010: getCurrentStep が pending 最小 stepOrder のステップを返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03 AC

**GIVEN** `status: "pending"` で `stepOrder: 2` のステップと `status: "approved"` で `stepOrder: 1` のステップが混在する配列
**WHEN** `getCurrentStep(steps)` を呼び出す
**THEN** `status: "pending"` かつ `stepOrder` が最小 (2) のステップが返される

---

### TC-011: getCurrentStep が全ステップ approved 時に null を返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03 AC

**GIVEN** 全ステップが `status: "approved"` の配列
**WHEN** `getCurrentStep(steps)` を呼び出す
**THEN** `null` が返される

---

### TC-012: isAllApproved が全ステップ approved 時に true を返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03 AC

**GIVEN** 全ステップが `status: "approved"` の配列（例: 2件）
**WHEN** `isAllApproved(steps)` を呼び出す
**THEN** `true` が返される

---

### TC-013: isAllApproved が pending ステップを含む場合に false を返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03 AC

**GIVEN** `status: "approved"` のステップと `status: "pending"` のステップが混在する配列
**WHEN** `isAllApproved(steps)` を呼び出す
**THEN** `false` が返される

---

### TC-014: isAllApproved が空配列の場合に true を返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03 AC

**GIVEN** 承認ステップが 0 件の空配列
**WHEN** `isAllApproved([])` を呼び出す
**THEN** `true` が返される（ステップなし申請の後方互換動作）

---

### TC-015: getStepsToReset が指定 stepOrder 以降のステップのみを返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03 AC

**GIVEN** stepOrder が 1, 2, 3 の 3 件のステップ配列があり、差し戻しステップの stepOrder が 2
**WHEN** `getStepsToReset(steps, 2)` を呼び出す
**THEN** stepOrder: 2 と stepOrder: 3 の 2 件が返され、stepOrder: 1 は含まれない

---

### TC-016: canApprove が role 一致時に true を返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03 AC

**GIVEN** `approverRole: "admin"` のステップと `actorRole: "admin"` のアクター
**WHEN** `canApprove(step, "admin")` を呼び出す
**THEN** `true` が返される

---

### TC-017: canApprove が role 不一致時に false を返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03 AC

**GIVEN** `approverRole: "admin"` のステップと `actorRole: "member"` のアクター
**WHEN** `canApprove(step, "member")` を呼び出す
**THEN** `false` が返される

---

### TC-018: approvalStepService.ts に infrastructure import がない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03 AC

**GIVEN** `src/domain/services/approvalStepService.ts` が存在する
**WHEN** ファイルの import 文を解析する
**THEN** `@/infrastructure` を参照する import が一切存在しない（純粋関数のみで構成されている）

---

## Schema

### TC-019: approval_steps テーブルが schema.ts に定義されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04 AC

**GIVEN** `src/infrastructure/schema.ts` が更新されている
**WHEN** `approvalSteps` テーブル定義を確認する
**THEN** `id (uuid PK)`, `requestId (FK)`, `stepOrder (integer)`, `approverRole (text)`, `status (approvalStepStatusEnum)`, `approvedBy (uuid FK nullable)`, `approvedAt (timestamp nullable)`, `comment (text nullable)`, `organizationId (uuid FK)` の全カラムが定義されている

---

### TC-020: approval_templates テーブルが schema.ts に定義されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04 AC

**GIVEN** `src/infrastructure/schema.ts` が更新されている
**WHEN** `approvalTemplates` テーブル定義を確認する
**THEN** `id (uuid PK)`, `name (text)`, `organizationId (uuid FK)`, `steps (jsonb)`, `createdAt (timestamp)` の全カラムが定義されている

---

### TC-021: requestStatusEnum に "revision" が含まれている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04 AC

**GIVEN** `src/infrastructure/schema.ts` の `requestStatusEnum` が更新されている
**WHEN** enum の値を確認する
**THEN** `"draft"`, `"pending"`, `"approved"`, `"rejected"`, `"revision"` の 5 値が定義されている

---

### TC-022: approvalStepStatusEnum が定義されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04 AC

**GIVEN** `src/infrastructure/schema.ts` が更新されている
**WHEN** `approvalStepStatusEnum` の定義を確認する
**THEN** `"pending"`, `"approved"`, `"rejected"` の 3 値を持つ enum が存在する

---

### TC-023: requestsRelations に approvalSteps への many relation がある

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04 AC

**GIVEN** `src/infrastructure/schema.ts` の `requestsRelations` が更新されている
**WHEN** `requestsRelations` の定義を確認する
**THEN** `approvalSteps` への `many` relation が追加されている

---

## Repository

### TC-024: approvalStepRepository の 4 関数が export されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05 AC

**GIVEN** `src/infrastructure/repositories/approvalStepRepository.ts` が存在する
**WHEN** export される関数を確認する
**THEN** `createMany`, `findByRequestId`, `updateStatus`, `resetSteps` の 4 関数が export されている

---

### TC-025: approvalTemplateRepository の 2 関数が export されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05 AC

**GIVEN** `src/infrastructure/repositories/approvalTemplateRepository.ts` が存在する
**WHEN** export される関数を確認する
**THEN** `findByOrganization`, `findById` の 2 関数が export されている

---

### TC-026: リポジトリ関数にテナント分離が適用されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05 AC

**GIVEN** `approvalStepRepository` および `approvalTemplateRepository` の実装
**WHEN** 各クエリ関数の WHERE 条件を確認する
**THEN** `findByRequestId`, `resetSteps`, `findByOrganization`, `findById` の全関数に `organizationId` による絞り込み条件が含まれている

---

## Use Case: approveRequest

### TC-027: 2 段階承認の最初のステップを承認する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 承認ステップは stepOrder の昇順で順次進行する > Scenario: 2 段階の承認ステップで最初のステップを承認する

---

### TC-028: 最後のステップを承認すると申請が approved になる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 承認ステップは stepOrder の昇順で順次進行する > Scenario: 最後のステップを承認すると申請が approved になる

---

### TC-029: member ロールが admin 用ステップを承認しようとすると拒否される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 承認者の role がステップの approverRole と一致しない場合は承認できない > Scenario: member ロールのユーザーが admin 用ステップを承認しようとする

---

### TC-030: ステップなし申請の承認（後方互換）

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 承認ステップのない申請は従来通りの単一承認フローで動作する > Scenario: ステップなし申請の承認

---

### TC-031: ステップ承認時の監査ログ

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 各操作はトランザクション内で実行され監査ログが記録される > Scenario: ステップ承認時の監査ログ

---

## Use Case: rejectRequest

### TC-032: 差し戻し時にアクティブステップが rejected になる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 差し戻し操作で申請が revision 状態に遷移する > Scenario: 差し戻し時にアクティブステップが rejected になる

---

### TC-033: 最終却下で申請が rejected 終端状態に遷移する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 最終却下は rejected 終端状態に遷移し、その後の操作を拒否する > Scenario: 最終却下で申請が rejected 終端状態に遷移する

---

### TC-034: targetStatus 未指定時は従来通り rejected に遷移する（後方互換）

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-07 AC

**GIVEN** `pending` 状態の申請が存在し、`rejectRequest` usecase の `targetStatus` 引数にデフォルト値 `"rejected"` が設定されている
**WHEN** `targetStatus` を指定せずに `rejectRequest` を呼び出す
**THEN** 申請が `rejected` に遷移し、既存の呼び出し元（`rejectRequestAction`）は変更なしで従来動作を維持する

---

### TC-035: 差し戻し時の監査ログ

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 各操作はトランザクション内で実行され監査ログが記録される > Scenario: 差し戻し時の監査ログ

---

## Use Case: resubmitRequest

### TC-036: 未認証ユーザーが再申請を試みる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: resubmitRequest は認証済みユーザーのみが実行できる > Scenario: 未認証ユーザーが再申請を試みる

---

### TC-037: 2 段階目で差し戻された後の再申請

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 再申請は差し戻しステップ以降のみリセットする > Scenario: 2 段階目で差し戻された後の再申請

---

### TC-038: 1 段階目で差し戻された後の再申請

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 再申請は差し戻しステップ以降のみリセットする > Scenario: 1 段階目で差し戻された後の再申請

---

### TC-039: rejected 状態の申請への再申請は拒否される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 最終却下は rejected 終端状態に遷移し、その後の操作を拒否する > Scenario: rejected 状態の申請への再申請は拒否される

---

### TC-040: 再申請時の監査ログ

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 各操作はトランザクション内で実行され監査ログが記録される > Scenario: 再申請時の監査ログ

---

## Use Case: createRequest

### TC-041: テンプレート指定での申請作成

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 申請作成時にテンプレートを適用して承認ステップを自動生成する > Scenario: テンプレート指定での申請作成

---

### TC-042: テンプレート未指定での申請作成

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 申請作成時にテンプレートを適用して承認ステップを自動生成する > Scenario: テンプレート未指定での申請作成

---

### TC-043: 存在しないテンプレート ID 指定時にエラーが返される

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-09 AC

**GIVEN** 存在しない templateId が `createRequest` usecase に渡される
**WHEN** `approvalTemplateRepository.findById` が `null` を返す
**THEN** `{ ok: false, reason: ... }` が返され、申請レコードと承認ステップレコードは作成されない

---

## Server Action

### TC-044: createRequestAction が templateId を createRequest usecase に渡す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-10 AC

**GIVEN** `src/app/actions/requests.ts` の `createRequestAction` が更新されている
**WHEN** ソースコードの `createRequest` usecase 呼び出し箇所を確認する
**THEN** `formData.get("templateId")` で取得した値が `createRequest` usecase の `templateId` 引数に渡されており、空文字列の場合は `undefined` として扱われている

---

### TC-045: rejectRequestAction が targetStatus と comment を rejectRequest usecase に渡す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-10 AC

**GIVEN** `src/app/actions/requests.ts` の `rejectRequestAction` が更新されている
**WHEN** ソースコードの `rejectRequest` usecase 呼び出し箇所を確認する
**THEN** `formData.get("targetStatus")` と `formData.get("comment")` が `rejectRequest` usecase の引数に渡されている

---

### TC-046: resubmitRequestAction が認証チェック後に resubmitRequest usecase を呼び出す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-10 AC

**GIVEN** `src/app/actions/requests.ts` に `resubmitRequestAction` が新設されている
**WHEN** ソースコードの実装を確認する
**THEN** 認証チェック（`auth()` 呼び出し）が `resubmitRequest` usecase 呼び出しより前に配置されており、未認証時はエラーを返す

---

### TC-047: listApprovalTemplatesAction が認証チェック後にテンプレート一覧を返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-10 AC

**GIVEN** `src/app/actions/requests.ts` に `listApprovalTemplatesAction` が新設されている
**WHEN** ソースコードの実装を確認する
**THEN** セッションから `session.user.organizationId` を取得し（URL パラメータからは取得しない）、`approvalTemplateRepository.findByOrganization` を呼び出している

---

### TC-048: approveRequestAction が session.user.role を actorRole として渡す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-10 AC

**GIVEN** `src/app/actions/requests.ts` の `approveRequestAction` が更新されている
**WHEN** ソースコードの `approveRequest` usecase 呼び出し箇所を確認する
**THEN** `session.user.role` が `approveRequest` usecase の `actorRole` 引数に渡されている

---

### TC-049: 全 mutation 系 action で revalidatePath が呼ばれる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-10 AC

**GIVEN** `createRequestAction`, `rejectRequestAction`, `resubmitRequestAction`, `approveRequestAction` の実装
**WHEN** 各 action の正常系フローを確認する
**THEN** usecase 呼び出し後に `revalidatePath` が呼ばれている

---

## UI

### TC-050: revision 状態が「差し戻し」ラベルとオレンジバッジで表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-12 AC

**GIVEN** `revision` 状態の申請が存在し、申請詳細画面および申請一覧画面を開く
**WHEN** 申請のステータスバッジを目視確認する
**THEN** 「差し戻し」ラベルがオレンジ色のバッジ（`bg-orange-100 text-orange-700`）で表示される

---

### TC-051: 承認ステップの進捗が申請詳細画面に一覧表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-12 AC

**GIVEN** 複数の承認ステップを持つ申請の詳細画面を開く
**WHEN** 承認ステップセクションを目視確認する
**THEN** 各ステップのステップ番号・approverRole・ステータス（承認済み / 差し戻し / 審査中）が一覧表示され、承認済みステップには承認者名と承認日時が、差し戻しステップにはコメントが表示される

---

### TC-052: 差し戻しボタンとコメント入力が pending 状態の申請に表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-12 AC

**GIVEN** `pending` 状態の申請の詳細画面を管理者ユーザーで開く
**WHEN** 承認操作エリアを目視確認する
**THEN** 既存の「却下する」ボタンに加えて「差し戻す」ボタンとコメント入力テキストエリアが表示される

---

### TC-053: 再申請ボタンが revision 状態の申請に表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-12 AC

**GIVEN** `revision` 状態の申請の詳細画面を開く
**WHEN** 画面の操作エリアを目視確認する
**THEN** 再申請ボタンが表示され、クリックすると `resubmitRequestAction` が呼び出される

---

### TC-054: テンプレート選択セレクトボックスが申請作成画面に表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-13 AC

**GIVEN** 申請作成画面（`/requests/new`）を開く
**WHEN** フォームを目視確認する
**THEN** 承認テンプレート選択用のセレクトボックスが表示され、組織に属するテンプレートの一覧が選択肢として列挙されている。テンプレート未選択時は `templateId` が送信されない

---

### TC-055: 申請一覧画面で revision 状態のラベルが正しく表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-13 AC

**GIVEN** `revision` 状態の申請を含む申請一覧画面（`/requests`）を開く
**WHEN** ステータス列を目視確認する
**THEN** `revision` 状態の申請に「差し戻し」ラベルが表示され、表示が崩れていない

---

## Architecture & Build

### TC-056: domain 配下に @/infrastructure の import がない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-16 AC

**GIVEN** `src/domain/` 配下の全ファイルが実装されている
**WHEN** `src/domain/` 配下の全ファイルを `@/infrastructure` でグレップする
**THEN** 一致が 0 件であり、依存方向 `usecases → domain / infrastructure` が遵守されている

---

### TC-057: bun run build が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-16 AC / request.md > 受け入れ基準

**GIVEN** 全タスク（T-01 〜 T-15）の実装が完了している
**WHEN** `bun run build` を実行する
**THEN** エラーなく完了し、本番ビルド成果物が生成される

---

### TC-058: typecheck が green

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-16 AC

**GIVEN** 全タスクの実装が完了している
**WHEN** TypeScript 型チェック（`tsc --noEmit` または同等のコマンド）を実行する
**THEN** 型エラーが 0 件である（`Record<RequestStatus, string>` マッピングの `"revision"` 追加漏れも検出される）

---

### TC-059: 各 mutation 操作が db.transaction() 内で実行される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-16 AC / request.md > 受け入れ基準

**GIVEN** `approveRequest.ts`, `rejectRequest.ts`, `resubmitRequest.ts`, `createRequest.ts`（テンプレート指定時）の実装
**WHEN** 各ファイルの `db.transaction` 呼び出しを確認する
**THEN** 全ファイルに `db.transaction(` の呼び出しが存在し、ステップ更新・申請ステータス更新・監査ログ記録が同一トランザクション内で実行されている

---

## Seed Data

### TC-060: bun run seed でエラーなく完了する

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-14 AC

**GIVEN** `src/infrastructure/seed.ts` が `approvalSteps` と `approvalTemplates` のシードデータを含む状態で更新されている
**WHEN** `bun run seed` を実行する
**THEN** エラーなく完了し、FK 制約エラーや重複エラーが発生しない

---

### TC-061: approval_templates に 2 件のテンプレートが作成される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-14 AC

**GIVEN** `bun run seed` が正常完了した後
**WHEN** `approval_templates` テーブルのレコードを確認する
**THEN** 「上長承認のみ」（1 ステップ）と「上長承認 → 経理承認」（2 ステップ）の 2 件が作成されている

---

### TC-062: pending 申請に approval_steps が作成される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-14 AC

**GIVEN** `bun run seed` が正常完了した後
**WHEN** 既存の `pending` 申請（「出張申請 - 東京オフィス訪問」）に紐づく `approval_steps` レコードを確認する
**THEN** 「上長承認のみ」テンプレートに基づく 1 件の承認ステップ（`status: "pending"`, `approverRole: "admin"`）が作成されている

---

## Result

```yaml
result: completed
total: 62
automated: 52
manual: 10
must: 55
should: 7
could: 0
blocked_reasons: []
```
