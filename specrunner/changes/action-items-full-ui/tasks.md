# Tasks: アクションアイテムの編集 UI・タスク一覧ページ・サイドバーメニュー追加

## T-01: listActionItems ユースケースを新設する

- [ ] `src/application/usecases/listActionItems.ts` を作成する
- [ ] `ActionItemWithSource` 型を定義する: `ActionItem` に `sourceName: string`（案件名 / 商談日 / 引合名 / 「個人タスク」）と `sourceHref: string | null`（紐づけ先へのリンク URL）を付加した型
- [ ] `listActionItems` 関数を実装する。引数: `{ organizationId: string; done?: boolean }`。`actionItemRepository.findByOrganization(organizationId, { done })` でアクションアイテムを取得する
- [ ] 取得したアクションアイテムの `dealId` / `meetingId` / `inquiryId` の一意集合を抽出し、各 repository（`dealRepository.findById`, `meetingRepository.findById`, `inquiryRepository.findById`）を `Promise.all` で並列取得する。結果を `Map<string, string>` に変換して名前解決する
- [ ] `sourceName` の優先順位: dealId が存在すれば案件名（`deal.title`）、meetingId が存在すれば商談日（`meeting.date` を `YYYY/MM/DD` 形式で表示）、inquiryId が存在すれば引合名（`inquiry.title`）、いずれもなければ「個人タスク」
- [ ] `sourceHref` の設定: dealId → `/deals/${dealId}`, meetingId → `/deals/${meeting.dealId}/meetings/${meetingId}`（dealId がない場合は null）, inquiryId → `/inquiries/${inquiryId}`, 個人タスク → `null`
- [ ] 戻り値: `ActionItemWithSource[]`
- [ ] `src/application/usecases/index.ts` に `listActionItems` を re-export する

**Acceptance Criteria**:
- `listActionItems` が `ActionItemWithSource[]` を返す
- `sourceName` が紐づけ先に応じて正しい値を返す（案件名 / 商談日 / 引合名 / 「個人タスク」）
- `sourceHref` が紐づけ先に応じて正しいリンクを返す
- `done` フィルタが機能する
- page.tsx から repository を直接呼ばない方針に従っている
- `bun run build` が通る

---

## T-02: サイドバーに「タスク」メニューを追加する

- [ ] `src/app/(dashboard)/SidebarNav.tsx` の `navItems` 配列に `{ href: "/tasks", label: "タスク" }` を追加する
- [ ] 配置位置: `{ href: "/deals", label: "案件" }` の直後、`{ href: "/contracts", label: "契約" }` の直前

**Acceptance Criteria**:
- サイドバーに「タスク」メニューが表示される
- 「案件」と「契約」の間に配置されている
- `/tasks` に遷移する
- `bun run build` が通る

---

## T-03: ActionItemRow 共通コンポーネントを作成する

- [ ] `src/app/(dashboard)/components/ActionItemRow.tsx` を作成する（`"use client"`）
- [ ] Props 型を定義する: `{ item: ActionItem; orgUsers: { id: string; name: string }[]; editable: boolean; canDelete: boolean; showSource?: boolean; sourceName?: string; sourceHref?: string | null }`
- [ ] 表示モード: チェックボックス（完了切替）、description、担当者名、期日、`showSource` が true なら紐づけ先、editable なら「編集」ボタン、canDelete なら「削除」ボタン
- [ ] 編集モード: 「編集」ボタン押下で行がインライン編集モードに切り替わる。`useState` で `isEditing` を管理する。description はテキスト入力（`Input`）、assigneeId はドロップダウン（`select`）、dueDate は date 入力（`Input type="date"`）
- [ ] 編集保存: 「保存」ボタンで `updateActionItemAction` を呼び出す。`useTransition` で pending 管理する。成功時は `router.refresh()` で再描画する
- [ ] 編集キャンセル: 「キャンセル」ボタンで元の値にリセットし `isEditing = false` にする
- [ ] 完了切替: チェックボックスの `onChange` で `toggleActionItemAction` を呼び出す
- [ ] 削除: 「削除」ボタン押下で `ConfirmDialog` を表示する。`useState` で `showDeleteConfirm` を管理。確認時に `deleteActionItemAction` を呼び出す。variant は `"danger"`。確認メッセージ: 「このアクションアイテムを削除しますか？」
- [ ] エラーハンドリング: 各操作のエラーは `useToast` でエラーメッセージを表示する

**Acceptance Criteria**:
- 表示モードで description、担当者名、期日、完了チェックボックスが表示される
- 「編集」ボタンでインライン編集モードに切り替わる
- 編集モードで description / assigneeId / dueDate を変更して保存できる
- 「キャンセル」で編集モードが解除される
- 「削除」ボタンで ConfirmDialog が表示され、確認後に削除される
- editable=false の場合、編集ボタンが表示されない
- canDelete=false の場合、削除ボタンが表示されない
- `bun run build` が通る

---

## T-04: DealActionItemsSection にインライン編集・削除 UI を追加する

- [ ] `src/app/(dashboard)/deals/[id]/DealActionItemsSection.tsx` を修正する
- [ ] アクションアイテムの一覧表示部分を T-03 の `ActionItemRow` コンポーネントに置き換える
- [ ] `ActionItemRow` に渡す props: `item`, `orgUsers`, `editable`, `canDelete`（editable と同じ判定か、権限に応じて分離）。`showSource` は `false`（案件詳細では紐づけ先表示不要）
- [ ] 既存の追加フォーム部分はそのまま維持する
- [ ] `canDelete` の判定: props から受け取る、または既存の `editable` と同等に扱う（権限チェックは Server Action 側で行われるため、UI 上は `editable` に合わせる）

**Acceptance Criteria**:
- 案件詳細のアクションアイテム一覧で編集・削除ボタンが表示される
- インライン編集で description / assigneeId / dueDate を変更できる
- 削除で確認ダイアログが表示され、確認後に削除される
- 既存の追加フォーム・完了切替が引き続き動作する
- `bun run build` が通る

---

## T-05: MeetingActionItemsSection にインライン編集・削除 UI を追加する

- [ ] `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/MeetingActionItemsSection.tsx` を修正する
- [ ] アクションアイテムの一覧表示部分を T-03 の `ActionItemRow` コンポーネントに置き換える
- [ ] `ActionItemRow` に渡す props: `item`, `orgUsers`, `editable`, `canDelete`。`showSource` は `false`
- [ ] 既存の追加フォーム部分はそのまま維持する

**Acceptance Criteria**:
- 商談詳細のアクションアイテム一覧で編集・削除ボタンが表示される
- インライン編集で description / assigneeId / dueDate を変更できる
- 削除で確認ダイアログが表示され、確認後に削除される
- 既存の追加フォーム・完了切替が引き続き動作する
- `bun run build` が通る

---

## T-06: タスク一覧ページを新設する

- [ ] `src/app/(dashboard)/tasks/page.tsx` を作成する（Server Component）
- [ ] `auth()` でセッションを取得する
- [ ] URL searchParams から `status` を取得する（`"done"` or `"todo"`、デフォルト: `"todo"`）
- [ ] `listActionItems({ organizationId: session.user.organizationId, done: status === "done" })` でデータを取得する
- [ ] `listOrganizationUsers({ organizationId })` で組織のユーザー一覧を取得する（担当者ドロップダウン用）
- [ ] `PageToolbar` でタイトル「タスク」を表示する
- [ ] フィルタ切替 UI: 「未完了」「完了」の 2 つのタブ（リンク）を配置する。`/tasks?status=todo` と `/tasks?status=done`。現在のステータスに対応するタブにアクティブスタイルを適用する
- [ ] テーブル部分は Client Component `TaskList` として分離する（インタラクション用）
- [ ] テーブル列: 完了チェック、内容、担当者、期日、紐づけ先（`sourceName`、`sourceHref` がある場合はリンク）
- [ ] 各行に T-03 の `ActionItemRow` を使用する。`showSource` は `true`
- [ ] 新規作成ボタン: 「個人タスク追加」ボタンを配置し、クリックでフォームを表示する
- [ ] 新規作成フォーム: description（必須）、assigneeId（任意、デフォルト: 自分 `session.user.id`）、dueDate（任意）。送信は `createActionItemAction` を呼び出す（dealId / meetingId / inquiryId は渡さない）
- [ ] アクションアイテムが 0 件の場合、「アクションアイテムはありません」と表示する

**Acceptance Criteria**:
- `/tasks` にアクセスするとタスク一覧ページが表示される
- デフォルトで未完了のアクションアイテムのみ表示される
- 完了タブに切り替えると完了済みのアクションアイテムが表示される
- 各行に紐づけ先（案件名 / 商談日 / 引合名 / 「個人タスク」）が表示される
- 各行で編集・削除が可能
- 個人タスク（紐づけ先なし）を新規作成できる
- `bun run build` が通る

---

## T-07: Server Actions に revalidatePath("/tasks") を追加する

- [ ] `src/app/actions/actionItems.ts` の `createActionItemAction` の成功パスに `revalidatePath("/tasks")` を追加する
- [ ] `toggleActionItemAction` の成功パスに `revalidatePath("/tasks")` を追加する
- [ ] `updateActionItemAction` の成功パスに `revalidatePath("/tasks")` を追加する
- [ ] `deleteActionItemAction` の成功パスに `revalidatePath("/tasks")` を追加する

**Acceptance Criteria**:
- 4 つの Server Actions すべてに `revalidatePath("/tasks")` が含まれる
- 案件詳細や商談詳細からのアクションアイテム操作後、タスク一覧のキャッシュが無効化される
- `bun run build` が通る

---

## T-08: テスト — listActionItems ユースケースの構造検証

- [ ] `src/__tests__/usecases/actionItemManagement.test.ts` を作成する
- [ ] テスト: `listActionItems` ユースケースのソースに `actionItemRepository.findByOrganization` の呼び出しが含まれることを静的解析で確認する
- [ ] テスト: `listActionItems` ユースケースのソースに `dealRepository` / `meetingRepository` / `inquiryRepository` の参照が含まれることを確認する（紐づけ先名前解決）
- [ ] テスト: `listActionItems` の返り値型定義に `sourceName` が含まれることを確認する

**Acceptance Criteria**:
- `listActionItems` が repository 経由でデータを取得していることがテストで検証される
- 紐づけ先の名前解決ロジックの存在がテストで検証される
- `bun test` が green

---

## T-09: テスト — Server Actions の revalidatePath("/tasks") 検証

- [ ] `src/__tests__/static/projectStructure.test.ts` にテストを追加する
- [ ] テスト: `src/app/actions/actionItems.ts` のソースに `revalidatePath("/tasks")` が含まれることを確認する
- [ ] テスト: `src/app/(dashboard)/SidebarNav.tsx` のソースに `"/tasks"` が含まれることを確認する
- [ ] テスト: `src/application/usecases/listActionItems.ts` が存在することを確認する

**Acceptance Criteria**:
- Server Actions が `/tasks` を revalidate していることがテストで検証される
- サイドバーにタスクメニューが含まれることがテストで検証される
- `listActionItems` ユースケースの存在がテストで検証される
- `bun test` が green

---

## T-10: テスト — ActionItemRow の UI パターン検証

- [ ] `src/__tests__/static/uiBusinessStyle.test.ts` にテストを追加する
- [ ] テスト: `ActionItemRow.tsx` のソースに `updateActionItemAction` の呼び出しが含まれることを確認する
- [ ] テスト: `ActionItemRow.tsx` のソースに `deleteActionItemAction` の呼び出しが含まれることを確認する
- [ ] テスト: `ActionItemRow.tsx` のソースに `ConfirmDialog` の使用が含まれることを確認する
- [ ] テスト: `ActionItemRow.tsx` のソースに `toggleActionItemAction` の呼び出しが含まれることを確認する

**Acceptance Criteria**:
- ActionItemRow が update / delete / toggle の Server Actions を呼び出していることがテストで検証される
- 削除確認ダイアログの使用がテストで検証される
- `bun test` が green

---

## T-11: 最終確認 — ビルド・型チェック・テスト

- [ ] `bun run build` を実行し、ビルドが成功することを確認する
- [ ] `bunx tsc --noEmit` を実行し、型チェックが通ることを確認する
- [ ] `bun test` を実行し、全テストが green であることを確認する
- [ ] `bun run lint` を実行し、lint エラーがないことを確認する

**Acceptance Criteria**:
- `bun run build` 成功
- `typecheck` green
- `bun test` 全件 green
- `bun run lint` エラーなし
