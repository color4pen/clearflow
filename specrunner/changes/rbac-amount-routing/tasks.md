# Tasks: RBAC拡張と金額による承認経路の自動分岐

## T-01: スキーマ変更 — roleEnum 拡張と金額カラム追加

- [x] `src/infrastructure/schema.ts:14` — `roleEnum` に `"manager"` と `"finance"` を追加: `pgEnum("role", ["admin", "member", "manager", "finance"])`
- [x] `src/infrastructure/schema.ts:50-64` — `requests` テーブルに `amount: integer("amount")` カラムを追加（nullable、デフォルト null）
- [x] `src/infrastructure/schema.ts:100-108` — `approvalTemplates` テーブルに `minAmount: integer("min_amount")` と `maxAmount: integer("max_amount")` カラムを追加（共に nullable）
- [x] `bunx drizzle-kit generate` でマイグレーションを生成する。pgEnum への値追加が `ALTER TYPE role ADD VALUE 'manager'; ALTER TYPE role ADD VALUE 'finance';` として生成されることを確認する。正しく生成されない場合は手動でマイグレーション SQL を修正する

**Acceptance Criteria**:
- `roleEnum` の定義が `["admin", "member", "manager", "finance"]` になっている
- `requests` テーブル定義に `amount` カラムが nullable integer で存在する
- `approvalTemplates` テーブル定義に `minAmount` と `maxAmount` カラムが nullable integer で存在する
- `bunx drizzle-kit generate` が成功し、マイグレーションファイルが生成される

## T-02: ドメインモデル変更 — Role 型、Request 型、ApprovalTemplate 型

- [x] `src/domain/models/user.ts:1` — `Role` 型に `"manager"` と `"finance"` を追加: `type Role = "admin" | "member" | "manager" | "finance"`
- [x] `src/domain/models/request.ts:3-12` — `Request` 型に `amount: number | null` フィールドを追加する
- [x] `src/domain/models/approvalTemplate.ts:6-12` — `ApprovalTemplate` 型に `minAmount: number | null` と `maxAmount: number | null` フィールドを追加する

**Acceptance Criteria**:
- `Role` 型が `"admin" | "member" | "manager" | "finance"` のユニオン型
- `Request` 型に `amount: number | null` が存在する
- `ApprovalTemplate` 型に `minAmount: number | null` と `maxAmount: number | null` が存在する
- `bun run build` でコンパイルエラーが出ないこと（後続タスクとの整合性は後続タスクで対応）

## T-03: リポジトリ更新 — mapRow 関数と新クエリ

- [x] `src/infrastructure/repositories/requestRepository.ts` — `mapRow` 関数に `amount: row.amount ?? null` を追加する
- [x] `src/infrastructure/repositories/requestRepository.ts` — `create` 関数の引数に `amount?: number | null` を追加し、`.values()` に `amount: data.amount ?? null` を含める
- [x] `src/infrastructure/repositories/approvalTemplateRepository.ts` — `mapRow` 関数に `minAmount: row.minAmount ?? null` と `maxAmount: row.maxAmount ?? null` を追加する
- [x] `src/infrastructure/repositories/approvalTemplateRepository.ts` — `findByOrganizationForAmount` 関数を新設する。`organizationId` と `amount: number | null` を引数に取り、金額条件にマッチするテンプレート一覧を返す。金額が null の場合は `minAmount IS NULL AND maxAmount IS NULL` のテンプレートのみ返す。金額が指定されている場合は `(minAmount IS NULL OR minAmount <= amount) AND (maxAmount IS NULL OR maxAmount >= amount)` のテンプレートを返す。**並び順として `CASE WHEN min_amount IS NULL AND max_amount IS NULL THEN 1 ELSE 0 END ASC` を必ず ORDER BY に指定し、デフォルトテンプレート（minAmount・maxAmount 共に null）が最後に来るようにする**。これにより `selectTemplate` が「最初に見つかったものを使用」するアルゴリズムでも決定的に動作する

**Acceptance Criteria**:
- `requestRepository.mapRow` が `amount` フィールドを含む `Request` を返す
- `requestRepository.create` が `amount` を受け取り DB に保存する
- `approvalTemplateRepository.mapRow` が `minAmount` / `maxAmount` を含む `ApprovalTemplate` を返す
- `approvalTemplateRepository.findByOrganizationForAmount` が金額条件でフィルタリングされたテンプレート一覧を返す
- `findByOrganizationForAmount` の結果が「デフォルトテンプレートが最後」の順序で返される（ORDER BY 保証）

## T-04: テンプレート自動選択ドメインサービス新設

- [x] `src/domain/services/templateSelectionService.ts` を新規作成する
- [x] `selectTemplate(templates: ApprovalTemplate[], amount: number | null): ApprovalTemplate | null` 関数を実装する。純粋関数としてテンプレート配列と金額を受け取り、マッチするテンプレートを返す。該当なしの場合は null を返す
- [x] 選択ロジック:
  - `amount` が null の場合: `minAmount === null && maxAmount === null` のテンプレートを返す（デフォルトテンプレート）
  - `amount` が指定されている場合: まず templates 配列を特定度の高い順（`minAmount !== null || maxAmount !== null` のテンプレートを先に）にソートしてから、`(minAmount === null || minAmount <= amount) && (maxAmount === null || maxAmount >= amount)` にマッチする最初のテンプレートを返す。この並び替えにより、デフォルトテンプレート（minAmount=null, maxAmount=null）は常に最後の候補となり、より特定的なテンプレートが優先される。ただし、`findByOrganizationForAmount` が ORDER BY によって既に正しい順序で返す実装であれば、selectTemplate 側での並び替えは省略可能（DB 順序に依存するため、ソートを selectTemplate 側でも行う方が純粋関数として安全）
- [x] `src/domain/services/index.ts` に `selectTemplate` を export に追加する

**Acceptance Criteria**:
- `templateSelectionService.ts` が `src/domain/services/` に存在する
- `selectTemplate` が純粋関数（副作用なし、DB アクセスなし）として実装されている
- 金額 null → デフォルトテンプレート選択
- 金額指定 → 範囲マッチするテンプレート選択（デフォルトテンプレートより特定的なテンプレートを優先）
- 金額 100000 に対し、デフォルト（null,null）と少額（null,100000）が共に配列に存在する場合、少額テンプレートが返される
- 該当なし → null 返却
- `src/domain/services/index.ts` から `selectTemplate` が export されている

## T-05: createRequest usecase の変更

- [x] `src/application/usecases/createRequest.ts` — `data` 引数から `templateId?: string` を削除し、`amount?: number | null` を追加する
- [x] usecase 内で `approvalTemplateRepository.findByOrganizationForAmount(data.organizationId, data.amount ?? null)` を呼び出してテンプレート候補を取得する
- [x] `selectTemplate(templates, data.amount ?? null)` でテンプレートを選択する。null の場合は `{ ok: false, reason: "適用可能な承認テンプレートが見つかりません。" }` を返す
- [x] `requestRepository.create` に `amount: data.amount ?? null` を渡す
- [x] 監査ログの metadata に `templateId` と `amount` を含める: `metadata: { templateId: selectedTemplate.id, templateName: selectedTemplate.name, amount: data.amount ?? null }`
- [x] テンプレートなし（テンプレート候補0件）の場合のフォールバックパスを削除する（テンプレート自動選択が必須になるため）

**Acceptance Criteria**:
- `createRequest` が `templateId` を受け取らず、`amount` を受け取る
- テンプレートが自動選択され、承認ステップが正しく生成される
- `amount` が `Request` レコードに保存される
- 監査ログに `templateId`、`templateName`、`amount` が記録される
- 該当テンプレートなしの場合にエラーが返される

## T-06: アクション層の変更

- [x] `src/app/actions/requests.ts` — `createRequestSchema` に `amount` フィールドを追加: `amount: z.coerce.number().int().nonnegative().optional()` （フォームからの文字列を数値に変換）
- [x] `createRequestAction` — `formData.get("amount")` を取得し、`createRequest` に `amount` を渡す。`templateId` の取得・送信を削除する
- [x] `CreateRequestState` の `errors` 型に `amount?: string[]` を追加する
- [x] `approveRequestAction` — `session.user.role !== "admin"` を `session.user.role === "member"` に変更する
- [x] `rejectRequestAction` — 同様に `session.user.role !== "admin"` を `session.user.role === "member"` に変更する
- [x] `listApprovalTemplatesAction` を削除する（テンプレート手動選択が不要になるため）

**Acceptance Criteria**:
- `createRequestAction` が `amount` をフォームデータから取得して usecase に渡す
- `templateId` 関連のコードが `createRequestAction` から削除されている
- `approveRequestAction` / `rejectRequestAction` が manager / finance ロールのユーザーに承認・却下を許可する
- member ロールのユーザーは引き続き拒否される
- `listApprovalTemplatesAction` が削除されている

## T-07: next-auth 型定義と auth.ts のキャスト更新

- [x] `src/types/next-auth.d.ts` — `Role` 型を import している箇所は変更不要（T-02 で Role 型を拡張済みのため自動的に反映される）。ただし型定義ファイルが正しく機能することを確認する
- [x] `src/infrastructure/auth.ts` — JWT コールバック内の `(user as { role: "admin" | "member" }).role` キャストを `(user as { role: Role }).role` または `(user as { role: "admin" | "member" | "manager" | "finance" }).role` に更新する（`Role` 型は `@/domain/models/user` から import する）
- [x] `src/infrastructure/auth.ts` — セッションコールバック内の `token.role as "admin" | "member"` キャストを `token.role as Role` または `token.role as "admin" | "member" | "manager" | "finance"` に更新する。これらのキャストを陳腐化させたまま放置すると、`"manager"` / `"finance"` ロールのユーザーがログイン時にセッションに正しいロールを持てない可能性があるため、**必ず更新すること**（request.md 要件9参照）

**Acceptance Criteria**:
- `session.user.role` が `"admin" | "member" | "manager" | "finance"` を受け入れる
- `auth.ts` のキャストが4値のロール体系に更新されている（`"admin" | "member"` のハードコードキャストが残っていない）
- TypeScript の型チェックが通る

## T-08: UI 変更 — 申請作成フォーム

- [x] `src/app/(dashboard)/requests/new/page.tsx` — テンプレート選択 UI（`templates` state, `listApprovalTemplatesAction` 呼び出し, `<select>` 要素）を削除する
- [x] 金額入力フィールドを追加する: `<input type="number" name="amount" min="0" step="1" />` を説明フィールドの後に配置する。ラベルは「金額（任意）」、placeholder は「金額を入力（任意）」
- [x] `amount` のバリデーションエラー表示を追加する（`state.errors?.amount`）
- [x] `listApprovalTemplatesAction` の import と `ApprovalTemplate` の import を削除する

**Acceptance Criteria**:
- テンプレート選択ドロップダウンが存在しない
- 金額入力フィールド（`name="amount"`, `type="number"`）が存在する
- 金額は任意入力（空欄で送信可能）
- `listApprovalTemplatesAction` / `ApprovalTemplate` の import が存在しない

## T-09: UI 変更 — 申請一覧・詳細画面の金額表示

- [x] `src/app/(dashboard)/requests/page.tsx` — テーブルヘッダーに「金額」列を追加する。金額が null の場合は「-」、値がある場合は `toLocaleString("ja-JP")` でカンマ区切り表示する（例: "150,000"）。「円」を後置する
- [x] `src/app/(dashboard)/requests/[id]/page.tsx` — 詳細画面のグリッドに金額セクションを追加する。金額が null の場合は「-」、値がある場合はカンマ区切りで表示する

**Acceptance Criteria**:
- 申請一覧テーブルに「金額」列が表示される
- 申請詳細画面に金額が表示される
- 金額 null の場合は「-」と表示される
- 金額がある場合はカンマ区切りの日本円表記で表示される

## T-10: シードデータ更新

- [x] `src/infrastructure/seed.ts` — manager ユーザーと finance ユーザーを追加する:
  - `{ email: "manager@example.com", name: "Manager User", role: "manager" }`
  - `{ email: "finance@example.com", name: "Finance User", role: "finance" }`
- [x] 既存の2テンプレートを削除し、3テンプレートに置き換える:
  - デフォルト: `{ name: "デフォルト（上長承認）", steps: [{ stepOrder: 1, approverRole: "manager" }], minAmount: null, maxAmount: null }`
  - 少額: `{ name: "少額申請（上長承認）", steps: [{ stepOrder: 1, approverRole: "manager" }], minAmount: null, maxAmount: 100000 }`
  - 高額: `{ name: "高額申請（上長→経理承認）", steps: [{ stepOrder: 1, approverRole: "manager" }, { stepOrder: 2, approverRole: "finance" }], minAmount: 100001, maxAmount: null }`
- [x] シードの申請データに `amount` を追加する（例: 備品購入 50000、出張 150000、ソフトウェアライセンス 30000）
- [x] 承認ステップのシードデータの `approverRole` を `"admin"` から `"manager"` に変更する
- [x] シード完了メッセージに manager / finance ユーザーのログイン情報を追加する

**Acceptance Criteria**:
- シードスクリプト実行後に manager / finance ロールのユーザーが存在する
- 3つのテンプレートが金額条件付きで存在する
- テンプレートの `approverRole` が `"manager"` / `"finance"` になっている
- 申請データに `amount` が設定されている

## T-11: テスト追加・更新

- [x] `src/__tests__/domain/templateSelectionService.test.ts` を新規作成する:
  - 金額 100000 → 少額テンプレート（maxAmount=100000）が選択される
  - 金額 200000 → 高額テンプレート（minAmount=100001）が選択される
  - 金額 null → デフォルトテンプレート（minAmount=null, maxAmount=null）が選択される
  - 該当テンプレートなし → null が返される
  - 金額 100001 → 高額テンプレートが選択される（境界値）
  - 金額 0 → 少額テンプレートが選択される（境界値）
- [x] `src/__tests__/domain/approvalStepService.test.ts` — `canApprove` テストケースを追加する:
  - `approverRole: "manager"`, `actorRole: "manager"` → true
  - `approverRole: "finance"`, `actorRole: "manager"` → false
  - `approverRole: "finance"`, `actorRole: "finance"` → true
  - `approverRole: "manager"`, `actorRole: "finance"` → false
- [x] `src/__tests__/usecases/requestWorkflow.test.ts` — TC-018, TC-019, TC-020, TC-023 のテストを新しい権限モデルに合わせて更新する:
  - `role !== "admin"` の検証を `role === "member"` の検証に変更する
- [x] `src/__tests__/usecases/requestWorkflow.test.ts` — createRequest のテストを更新: `templateId` ではなく `amount` を使用するコードパターンを検証する
- [x] `src/__tests__/usecases/requestWorkflow.test.ts` — **TC-047 を削除または更新する**。T-06 で `listApprovalTemplatesAction` を削除するため、`listApprovalTemplatesAction` の存在を `expect(src).toContain("listApprovalTemplatesAction")` で検証している TC-047（L341–357）は `bun test` を失敗させる。TC-047 のテスト内容を「`listApprovalTemplatesAction` が存在しないこと」の検証に書き換えるか、または TC-047 ごと削除する
- [x] `src/__tests__/static/projectStructure.test.ts` — **TC-054 を削除または更新する**。T-08 でテンプレート選択 UI（`<select name="templateId">`）と `listApprovalTemplatesAction` の import を除去するため、これらの存在を検証している TC-054（L422–434）は `bun test` を失敗させる。TC-054 のテスト内容を新しい申請フォームの仕様（`<input type="number" name="amount">`が存在する、`listApprovalTemplatesAction` が存在しない）の検証に書き換える
- [x] `src/__tests__/static/projectStructure.test.ts` — `templateSelectionService.ts` が `src/domain/services/` に存在することを検証するテストケースを追加する（既存の構造テストパターンに準拠）

**Acceptance Criteria**:
- `templateSelectionService` のテストが全件 green
- `canApprove` の新ロールに関するテストが全件 green
- 既存テストが新しい権限モデルに合わせて更新され全件 green
- TC-047 が削除または更新され、`listApprovalTemplatesAction` 削除後も `bun test` が通る
- TC-054 が削除または更新され、テンプレート選択 UI 除去後も `bun test` が通る
- `bun test` が全件 green

## T-12: ビルド・型チェック・lint 確認

- [x] `bun run build` が成功することを確認する
- [x] TypeScript の型チェックが全て通ることを確認する（`bunx tsc --noEmit`）
- [x] `bun run lint` が成功することを確認する
- [x] `bun test` が全件 green であることを確認する

**Acceptance Criteria**:
- `bun run build` 成功
- `bunx tsc --noEmit` 成功
- `bun run lint` 成功
- `bun test` 全件 green
