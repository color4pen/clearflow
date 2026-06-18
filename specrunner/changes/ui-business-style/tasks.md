# Tasks: UIを業務システムスタイルにリデザイン

## T-01: 共通スタイル定数ファイル `styles.ts` の作成

- [ ] `src/app/(dashboard)/styles.ts` を新規作成する
- [ ] 以下の定数をエクスポートする:
  - `BTN_PRIMARY` = `"px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"`
  - `BTN_PRIMARY_DISABLED` = `"${BTN_PRIMARY} disabled:opacity-50 disabled:cursor-not-allowed"`（`disabled:opacity-50` を含むバリエーション）
  - `BTN_SECONDARY` = `"px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"`
  - `BTN_DANGER` = `"px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"`
  - `BTN_SUCCESS` = `"px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"`
  - `BTN_WARNING` = `"px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500"`
  - `INPUT_BASE` = `"w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"`
  - `SELECT_BASE` = `"block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"`

**Acceptance Criteria**:
- `src/app/(dashboard)/styles.ts` が存在し、上記の定数がすべてエクスポートされている
- `bun run build` が成功する

## T-02: statusUtils.ts の作成と重複定義の解消

- [ ] `src/app/(dashboard)/requests/statusUtils.ts` を新規作成する
- [ ] `statusLabel(status: RequestStatus): string` を定義（既存のラベルマッピングを移植）
- [ ] `statusClass(status: RequestStatus): string` を定義。バッジスタイルではなく色テキストのみに変更:
  - `draft` → `"text-gray-500 font-medium"`
  - `pending` → `"text-amber-700 font-bold"`
  - `approved` → `"text-emerald-700 font-medium"`
  - `rejected` → `"text-red-700 font-medium"`
  - `revision` → `"text-orange-600 font-bold"`
  - `expired` → `"text-gray-400 font-medium"`
- [ ] `stepStatusLabel(status: ApprovalStepStatus): string` を定義（`requests/[id]/page.tsx` から移植）
- [ ] `stepStatusClass(status: ApprovalStepStatus): string` を定義（色テキストのみに変更）
- [ ] `statusRowClass(status: RequestStatus): string` を定義:
  - `pending` → `"bg-amber-50"`
  - `revision` → `"bg-orange-50"`
  - その他 → `""`
- [ ] `src/app/(dashboard)/requests/page.tsx` から `statusLabel` と `statusClass` の関数定義を削除し、`statusUtils.ts` からインポートに変更
- [ ] `src/app/(dashboard)/requests/[id]/page.tsx` から `statusLabel`、`statusClass`、`stepStatusLabel`、`stepStatusClass` の関数定義を削除し、`statusUtils.ts` からインポートに変更

**Acceptance Criteria**:
- `statusUtils.ts` が存在し、5つの関数がエクスポートされている
- `requests/page.tsx` と `requests/[id]/page.tsx` に `statusLabel`/`statusClass` の関数定義が存在しない
- 両ファイルが `statusUtils.ts` からインポートしている
- `bun run build` が成功する

## T-03: ダッシュボードヘッダーの圧縮とリデザイン

- [ ] `src/app/(dashboard)/layout.tsx` のヘッダー要素を以下に変更:
  - 背景: `bg-white border-b border-gray-200 shadow-sm` → `bg-slate-900`
  - パディング: `py-4` → `py-1`
  - コンテナ: `max-w-6xl` を維持
- [ ] ロゴ「Clearflow」を `text-white text-[13px] font-bold` に変更。サブテキスト「承認ワークフロー」を削除
- [ ] ナビゲーションリンクをヘッダー内に追加:
  - 「申請一覧」(`/requests`) — 全ロール表示
  - 「設定」(`/settings/templates`) — 全ロール表示（各設定ページ側で admin チェック済み）
  - 「監査ログ」(`/settings/audit-logs`) — admin のみ表示
  - スタイル: `text-slate-300 hover:text-white text-xs`
- [ ] ユーザー情報を右端に配置: `text-slate-300 text-xs` でユーザー名とロールを1行に
- [ ] ログアウトボタンのスタイルを `text-slate-400 hover:text-white text-xs border-slate-600` に変更
- [ ] main 要素の `py-8` を `py-4` に変更（ヘッダー圧縮に合わせてコンテンツ開始位置を調整）

**Acceptance Criteria**:
- ヘッダーが `bg-slate-900` 背景で `py-1` パディング（36px以下）
- ナビゲーションリンクがヘッダー内にインライン配置されている
- admin 以外のロールで「監査ログ」リンクが表示されない
- admin 以外のロールで「設定」リンクが表示される
- `bun run build` が成功する

## T-04: 申請一覧のデータ取得拡張（承認ステップ情報の付加）

- [ ] `src/domain/models/request.ts` に `RequestWithSteps` 型を追加:
  ```ts
  export type ApprovalStepSummary = {
    approverRole: string;
    status: "pending" | "approved" | "rejected";
    deadline: Date | null;
  };
  export type RequestWithSteps = Request & {
    approvalSteps: ApprovalStepSummary[];
  };
  ```
- [ ] `src/infrastructure/repositories/requestRepository.ts` に `findAllWithStepsByOrganization(organizationId: string): Promise<RequestWithSteps[]>` を追加。requests を取得後、approval_steps テーブルから該当リクエストのステップを JOIN で取得し、リクエストごとにグループ化して返す
- [ ] `src/application/usecases/listRequests.ts` を更新:
  - 戻り値型を `RequestWithSteps[]` に変更
  - `requestRepository.findAllWithStepsByOrganization` を呼び出すように変更

**Acceptance Criteria**:
- `listRequests` が `RequestWithSteps[]` を返す
- 各 request に `approvalSteps` 配列（`approverRole`, `status`, `deadline`）が含まれる
- `bun run build` が成功する
- 既存のテストが通る（`bun test`）

## T-05: 申請一覧テーブルの高密度化とステータス表示変更

- [ ] `src/app/(dashboard)/requests/page.tsx` を更新:
  - `listRequests` の戻り値が `RequestWithSteps[]` であることを反映
  - `BulkApprovalPanel` に渡す props を拡張（`approvalSteps`, `currentDeadline` を追加）
  - ステータス表示に `statusClass` の新しい色テキストスタイルを使用（`rounded-full` バッジ廃止）
- [ ] `src/app/(dashboard)/requests/BulkApprovalPanel.tsx` を更新:
  - `RequestItem` 型に `approvalSteps: Array<{ approverRole: string; status: string }>` と `currentDeadline: Date | null` を追加
  - テーブルヘッダーのスタイルを `bg-slate-50 text-xs text-slate-500 font-medium uppercase` に変更
  - セルのパディングを `px-6 py-4` → `px-3 py-0.5` に圧縮。ヘッダーセルも `px-6 py-3` → `px-3 py-1` に圧縮
  - 行に `statusRowClass` を適用（pending → `bg-amber-50`, revision → `bg-orange-50`）
  - ステータス列から `rounded-full px-2 py-1` バッジスタイルを削除し、色テキストのみに変更
  - 「進捗」列を追加: `● ○ manager → finance` 形式で表示（approved=`●`, pending/rejected=`○`, ロール名をアロー `→` で連結）
  - 「期限」列を追加: 直近の pending ステップの deadline を表示。残り3日以内は `text-red-600 font-bold`、それ以外は `text-gray-500 text-xs`
  - 一括承認ボタンのスタイルを `styles.ts` の `BTN_SUCCESS` 定数に置換
- [ ] テーブル下にフッター統計を追加:
  - `text-xs text-slate-400` で `{total}件中 1-{total}件表示 | 承認待: {pending}件 承認済: {approved}件 却下: {rejected}件` 形式
  - ページネーション未実装のため、現時点では全件表示を前提とする

**Acceptance Criteria**:
- テーブル行のパディングが `py-0.5` で高密度
- テーブルヘッダーが `bg-slate-50 text-xs text-slate-500 font-medium uppercase`
- ステータス表示に `rounded-full` が使われていない
- 承認待ち行に `bg-amber-50`、差し戻し行に `bg-orange-50` が適用されている
- 承認進捗列が存在し、ステップのロールと状態が表示されている
- 期限列が存在し、残り3日以内は赤太字で表示
- テーブル下にフッター統計が表示されている
- `bun run build` が成功する

## T-06: 申請詳細画面のステータス表示変更

- [ ] `src/app/(dashboard)/requests/[id]/page.tsx` を更新:
  - ステータス表示から `rounded-full px-3 py-1` バッジスタイルを削除し、`statusClass` の色テキストのみに変更
  - `ApprovalStepsSection` 内の `stepStatusClass` もバッジスタイル（`rounded-full`）を廃止し色テキストのみに変更

**Acceptance Criteria**:
- 詳細画面のステータス表示に `rounded-full` が使われていない
- 承認ステップのステータスにも `rounded-full` が使われていない
- `bun run build` が成功する

## T-07: 設定タブの Client Component 化と active 状態スタイル

- [ ] `src/app/(dashboard)/settings/SettingsNav.tsx` を新規作成（`"use client"`）:
  - `usePathname()` を使用して現在のパスを取得
  - NAV_ITEMS を定義（既存 + delegations 追加）:
    ```ts
    const NAV_ITEMS = [
      { href: "/settings/webhooks", label: "Webhook" },
      { href: "/settings/templates", label: "テンプレート" },
      { href: "/settings/users", label: "ユーザー" },
      { href: "/settings/delegations", label: "代理承認" },
      { href: "/settings/audit-logs", label: "監査ログ" },
    ];
    ```
  - active 判定: `pathname.startsWith(item.href)`
  - active スタイル: `border-b-2 border-blue-600 text-blue-600 font-medium`
  - 非active スタイル: `text-gray-500 hover:text-gray-700`
- [ ] `src/app/(dashboard)/settings/layout.tsx` を更新:
  - NAV_ITEMS の定義と `<nav>` 内のリンク描画を削除
  - `SettingsNav` コンポーネントをインポートして使用
  - レイアウト本体は Server Component のまま維持

**Acceptance Criteria**:
- `SettingsNav.tsx` が `"use client"` で存在する
- active タブに `border-b-2 border-blue-600 text-blue-600 font-medium` が適用される
- 非active タブが `text-gray-500 hover:text-gray-700` である
- NAV_ITEMS に「代理承認」(`/settings/delegations`) が含まれる
- `settings/layout.tsx` が Server Component のまま
- `bun run build` が成功する

## T-08: ボタン・input スタイルの定数参照への置換

対象ファイル（ダッシュボード配下、スコープ内のページ）:

- [ ] `src/app/(dashboard)/requests/[id]/ActionButtons.tsx`:
  - `"px-4 py-2 bg-blue-600 ..."` → `BTN_PRIMARY` + `disabled:opacity-50`
  - `"px-4 py-2 bg-green-600 ..."` → `BTN_SUCCESS` + `disabled:opacity-50`
  - `"px-4 py-2 bg-red-600 ..."` → `BTN_DANGER` + `disabled:opacity-50`
  - `"px-4 py-2 bg-orange-500 ..."` → `BTN_WARNING` + `disabled:opacity-50`
  - `"w-full px-3 py-2 border border-gray-300 ..."` textarea → `INPUT_BASE` ベース
  - `styles.ts` からインポートを追加
- [ ] `src/app/(dashboard)/requests/BulkApprovalPanel.tsx`:
  - 一括承認ボタンのクラスを `BTN_SUCCESS` + `disabled:opacity-50 disabled:cursor-not-allowed` に置換
  - `styles.ts` からインポートを追加
- [ ] `src/app/(dashboard)/settings/templates/page.tsx`:
  - 「テンプレートを追加」リンクボタンのクラスを `BTN_PRIMARY` に置換
  - `styles.ts` からインポートを追加
- [ ] `src/app/(dashboard)/settings/templates/TemplateForm.tsx`:
  - 送信ボタンのクラスを `BTN_PRIMARY` + `disabled:opacity-50` に置換
  - キャンセルリンクのクラスを `BTN_SECONDARY` に置換
  - input 要素のクラスを `INPUT_BASE` に置換（テンプレート名、金額フィールド）
  - `styles.ts` からインポートを追加
- [ ] `src/app/(dashboard)/settings/webhooks/WebhookCreateForm.tsx`:
  - 送信ボタンのクラスを `BTN_PRIMARY` + `disabled:opacity-50` に置換
  - URL input のクラスを `INPUT_BASE` に置換
  - `styles.ts` からインポートを追加
- [ ] `src/app/(dashboard)/settings/audit-logs/page.tsx`:
  - 「CSV ダウンロード」リンクのクラスを `BTN_PRIMARY` に置換
  - フィルタボタンのクラスを `BTN_PRIMARY` ベースまたは適切な定数に置換
  - input/select のクラスを `INPUT_BASE`/`SELECT_BASE` に置換
  - `styles.ts` からインポートを追加
- [ ] `src/app/(dashboard)/settings/delegations/page.tsx`:
  - 「委譲を追加」ボタンのクラスを `BTN_PRIMARY` に置換
  - select/input のクラスを `SELECT_BASE`/`INPUT_BASE` に置換
  - `styles.ts` からインポートを追加
- [ ] `src/app/(dashboard)/settings/users/UserRoleSelect.tsx`:
  - select のクラスを `SELECT_BASE` に置換（`disabled:bg-gray-100 disabled:cursor-not-allowed` は追加で保持）
  - `styles.ts` からインポートを追加

注意: `src/app/(dashboard)/requests/new/page.tsx` はスコープ外（フォームページのリデザイン除外）のため変更しない。ただし `BTN_PRIMARY` と `INPUT_BASE` への置換は安全な変更であり、実装者の判断で含めてよい。

**Acceptance Criteria**:
- 上記の各ファイルでボタン・input のスタイルが `styles.ts` の定数を参照している
- Tailwind クラスのハードコードが対象ファイルから除去されている（disabled 等の追加修飾子は `\`${BTN_PRIMARY} disabled:opacity-50\`` 形式で許容）
- `bun run build` が成功する

## T-09: 最終検証

- [ ] `bun run build` が成功する
- [ ] `bun test` が全件 green
- [ ] `bun run lint` がエラーなし（型チェック含む）
- [ ] ステータス表示に `rounded-full` が使われていないことを grep で確認（ダッシュボード配下）
- [ ] `statusLabel` と `statusClass` が `requests/page.tsx` と `requests/[id]/page.tsx` に関数定義として存在しないことを確認
- [ ] 設定ナビゲーションに「代理承認」リンクが存在することを確認

**Acceptance Criteria**:
- すべてのビルド・テスト・lint が green
- 受け入れ基準の全項目を満たしている
