# Test Cases: 契約管理

## Summary

- **Total**: 46 cases
- **Automated** (unit/integration): 35
- **Manual**: 11
- **Priority**: must: 35, should: 11, could: 0

---

## Spec 由来テストケース

### TC-001: won フェーズの Deal に対して Contract を作成する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Contract 作成は Deal が won フェーズの場合のみ許可する > Scenario: won フェーズの Deal に対して Contract を作成する

---

### TC-002: negotiation フェーズの Deal に対して Contract を作成しようとする

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Contract 作成は Deal が won フェーズの場合のみ許可する > Scenario: negotiation フェーズの Deal に対して Contract を作成しようとする

---

### TC-003: 既に Contract が存在する Deal に対して2件目を作成しようとする

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 同一 Deal に対して2件目の Contract を作成できない > Scenario: 既に Contract が存在する Deal に対して2件目を作成しようとする

---

### TC-004: active から completed への遷移

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Contract ステータス遷移は active からのみ許可する > Scenario: active から completed への遷移

---

### TC-005: active から cancelled への遷移

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Contract ステータス遷移は active からのみ許可する > Scenario: active から cancelled への遷移

---

### TC-006: completed から active への遷移が拒否される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Contract ステータス遷移は active からのみ許可する > Scenario: completed から active への遷移が拒否される

---

### TC-007: cancelled から active への遷移が拒否される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Contract ステータス遷移は active からのみ許可する > Scenario: cancelled から active への遷移が拒否される

---

### TC-008: admin が契約を作成する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 契約操作は admin または manager ロールのみ実行可能 > Scenario: admin が契約を作成する

---

### TC-009: member が契約を作成しようとする

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 契約操作は admin または manager ロールのみ実行可能 > Scenario: member が契約を作成しようとする

---

### TC-010: member が契約一覧を取得する

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: 契約操作は admin または manager ロールのみ実行可能 > Scenario: member が契約一覧を取得する

---

### TC-011: 契約一覧が自組織のみ返る

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: テナント分離 — 全クエリに organizationId 条件を付与する > Scenario: 契約一覧が自組織のみ返る

---

### TC-012: 契約作成時に監査ログが記録される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 監査ログの記録 > Scenario: 契約作成時に監査ログが記録される

---

### TC-013: 契約更新時に監査ログが記録される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 監査ログの記録 > Scenario: 契約更新時に監査ログが記録される

---

### TC-014: ステータス変更時に監査ログが記録される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 監査ログの記録 > Scenario: ステータス変更時に監査ログが記録される

---

### TC-015: won フェーズで契約未作成の場合

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 案件詳細ページに契約セクションを表示する > Scenario: won フェーズで契約未作成の場合

---

### TC-016: won フェーズで契約が存在する場合

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 案件詳細ページに契約セクションを表示する > Scenario: won フェーズで契約が存在する場合

---

### TC-017: negotiation フェーズの場合

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: 案件詳細ページに契約セクションを表示する > Scenario: negotiation フェーズの場合

---

## 非 Scenario 由来テストケース

### TC-018: contractStatusEnum が正しい値で定義されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `src/infrastructure/schema.ts` が存在する
**WHEN** `contractStatusEnum` の定義を参照する
**THEN** `pgEnum("contract_status", ["active", "completed", "cancelled"])` として定義されている

---

### TC-019: renewalTypeEnum が正しい値で定義されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `src/infrastructure/schema.ts` が存在する
**WHEN** `renewalTypeEnum` の定義を参照する
**THEN** `pgEnum("renewal_type", ["one_time", "recurring"])` として定義されている

---

### TC-020: contracts テーブルの dealId に unique 制約がある

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `contracts` テーブルに Deal A の Contract が1件存在する
**WHEN** 同一 dealId で2件目の INSERT を試みる
**THEN** DB の unique 制約違反エラーが発生する

---

### TC-021: canContractTransition — active から completed は true

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** `src/domain/services/contractTransition.ts` の `canTransition` 関数がある
**WHEN** `canTransition("active", "completed")` を呼び出す
**THEN** `true` が返る

---

### TC-022: canContractTransition — active から cancelled は true

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** `src/domain/services/contractTransition.ts` の `canTransition` 関数がある
**WHEN** `canTransition("active", "cancelled")` を呼び出す
**THEN** `true` が返る

---

### TC-023: canContractTransition — completed から active は false

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** `src/domain/services/contractTransition.ts` の `canTransition` 関数がある
**WHEN** `canTransition("completed", "active")` を呼び出す
**THEN** `false` が返る

---

### TC-024: canContractTransition — cancelled から active は false

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** `src/domain/services/contractTransition.ts` の `canTransition` 関数がある
**WHEN** `canTransition("cancelled", "active")` を呼び出す
**THEN** `false` が返る

---

### TC-025: canContractTransition — 同一ステータスへの遷移は false

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** `src/domain/services/contractTransition.ts` の `canTransition` 関数がある
**WHEN** `canTransition("active", "active")` を呼び出す
**THEN** `false` が返る

---

### TC-026: canContractTransition — 終端ステータス同士の遷移は false

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** `src/domain/services/contractTransition.ts` の `canTransition` 関数がある
**WHEN** `canTransition("cancelled", "completed")` を呼び出す
**THEN** `false` が返る

---

### TC-027: Contract ドメインモデルが ORM 依存を持たない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `src/domain/models/contract.ts` が存在する
**WHEN** ファイルの import 文を確認する
**THEN** `drizzle`, `@auth`, `postgres` への import が一切ない

---

### TC-028: ContractWithClient 型が clientName フィールドを含む

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `src/domain/models/contract.ts` に `ContractWithClient` 型が定義されている
**WHEN** 型定義を参照する
**THEN** `Contract & { clientName: string }` として定義されている

---

### TC-029: contractRepository の全メソッドに organizationId 条件が含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05 / T-18

**GIVEN** `src/infrastructure/repositories/contractRepository.ts` が存在する
**WHEN** create, findById, findByDealId, findAllByOrganization, update の各メソッドのソースを解析する
**THEN** 全メソッドのソース内に `organizationId` が含まれる

---

### TC-030: contractRepository.findAllByOrganization が clients を JOIN して clientName を返す

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** 組織 A に Contract が存在し、対応する Client も存在する
**WHEN** `contractRepository.findAllByOrganization(orgA.id)` を呼び出す
**THEN** 返り値の各要素に `clientName` フィールドが含まれる

---

### TC-031: updateContract usecase — 存在しない contractId のエラー

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** 指定した contractId の Contract がデータベースに存在しない
**WHEN** `updateContract({ contractId, organizationId, actorId, title: "更新タイトル" })` を呼び出す
**THEN** `{ ok: false, reason: "契約が見つかりません" }` が返り、DB は更新されない

---

### TC-032: getContract usecase — 自組織外の Contract が返らない

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-09

**GIVEN** 組織 B の Contract が存在し、組織 A で検索する
**WHEN** `getContract({ contractId: orgBContract.id, organizationId: orgA.id })` を呼び出す
**THEN** `null` が返る

---

### TC-033: createContractAction が dealId 必須の Zod バリデーションを行う

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** `createContractAction` に dealId を含まない入力を渡す
**WHEN** アクションを呼び出す
**THEN** Zod バリデーションエラーが返り、usecase は呼び出されない

---

### TC-034: 作成・更新・ステータス変更 Server Action が organizationId をセッションから取得する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-10 / T-18

**GIVEN** `src/app/actions/contracts.ts` が存在する
**WHEN** createContractAction, updateContractAction, updateContractStatusAction のソースを解析する
**THEN** 全アクションのソース内に `session.user.organizationId` が含まれ、リクエストボディからの取得が行われない

---

### TC-035: contractStatusLabels が正しいラベル値を持つ

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-11

**GIVEN** `src/app/(dashboard)/labels.ts` に `contractStatusLabels` が存在する
**WHEN** 各キーの値を参照する
**THEN** `active: "契約中"`, `completed: "完了"`, `cancelled: "解約"` が定義されている

---

### TC-036: renewalTypeLabels が正しいラベル値を持つ

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-11

**GIVEN** `src/app/(dashboard)/labels.ts` に `renewalTypeLabels` が存在する
**WHEN** 各キーの値を参照する
**THEN** `one_time: "スポット"`, `recurring: "定期"` が定義されている

---

### TC-037: ダッシュボードヘッダーに「契約」リンクが正しい位置に配置される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-12

**GIVEN** ダッシュボードにログイン済みの状態
**WHEN** ヘッダーナビを確認する
**THEN** 「契約」リンク（href="/contracts"）が「案件」の後かつ「申請一覧」の前に表示される

---

### TC-038: /contracts 一覧ページが DataTable で契約情報を表示する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-13

**GIVEN** 組織に Contract が存在する状態でログイン済み
**WHEN** `/contracts` にアクセスする
**THEN** DataTable に契約名・顧客名・契約種別・金額（¥フォーマット）・ステータスが表示され、各行に契約詳細へのリンクがある

---

### TC-039: /contracts/[id] で存在しない ID の場合 404 が表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-14

**GIVEN** 存在しない Contract ID を URL に含める
**WHEN** `/contracts/{存在しないid}` にアクセスする
**THEN** Next.js の 404 ページが表示される

---

### TC-040: /contracts/[id]/edit で admin/manager 以外はリダイレクトされる

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-15

**GIVEN** ロールが `member` のユーザーでログイン済み
**WHEN** `/contracts/{id}/edit` にアクセスする
**THEN** 編集フォームは表示されず、別ページにリダイレクトされる

---

### TC-041: /deals/[id] で「契約を作成」ボタンが admin/manager にのみ表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-16

**GIVEN** Deal が won フェーズで Contract が未作成の状態
**WHEN** `member` ロールのユーザーが `/deals/{id}` を表示する
**THEN** 「契約を作成」ボタンは表示されない（admin/manager には表示される）

---

### TC-042: projectStructure.test.ts のドメインモデルファイル一覧に contract.ts が含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-18

**GIVEN** `src/__tests__/static/projectStructure.test.ts` が更新されている
**WHEN** ドメインモデルファイル一覧テスト（TC-031）を参照する
**THEN** `"domain/models/contract.ts"` がファイル一覧に含まれる

---

### TC-043: マイグレーションファイルが drizzle/ に生成されている

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-19

**GIVEN** `bunx drizzle-kit generate` が実行済み
**WHEN** `drizzle/` ディレクトリを確認する
**THEN** `contractStatusEnum`, `renewalTypeEnum`, `contracts` テーブルの CREATE 文を含むマイグレーションファイルが存在する

---

### TC-044: シードデータに won 案件の Contract が追加されている

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-17

**GIVEN** `bun run db:seed` を実行する
**WHEN** `contracts` テーブルを確認する
**THEN** DX推進プロジェクトの won 案件に紐づく Contract が1件存在し、`amount: 30000000`, `status: "active"`, `renewalType: "one_time"` である

---

### TC-045: bun run build が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-20

**GIVEN** 全実装ファイルが変更済み
**WHEN** `bun run build` を実行する
**THEN** ビルドがエラーなしで完了する

---

### TC-046: typecheck が green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-20

**GIVEN** 全実装ファイルが変更済み
**WHEN** `bunx tsc --noEmit` を実行する
**THEN** 型エラーが0件で終了する

---

## Result

```yaml
result: completed
total: 46
automated: 35
manual: 11
must: 35
should: 11
could: 0
blocked_reasons: []
```
