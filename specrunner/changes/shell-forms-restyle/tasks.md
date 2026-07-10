# Tasks: シェルと共有部品の刷新（サイドバー装飾・フォーム規律・トースト/ダイアログ）

<!-- 実装順序の目安:
  T-01 〜 T-03: グローバル基盤（トークン・styles.ts・FormField）
  T-04 〜 T-06: サイドバー・通知パネル・ユーザー領域（layout）
  T-07 〜 T-08: フォームレイアウト・必須マーク適用
  T-09 〜 T-10: トースト刷新・成功トースト追加
  T-11 〜 T-12: ダイアログ整形
  T-13:         テスト追加（全 AC 固定）
-->

---

## T-01: globals.css にトーストトークンとキーフレームを追加する

- [x] `:root` ブロックの末尾に `--bg-toast: #1e293b;` を追加する
- [x] `[data-theme="dark"]` ブロックの末尾に `--bg-toast: #334155;` を追加する
- [x] `@theme inline` ブロックの末尾に `--color-bg-toast: var(--bg-toast);` を追加する
- [x] `globals.css` の末尾に以下の `@keyframes toast-slide-in` を追加する:
  ```css
  @keyframes toast-slide-in {
    from {
      transform: translateX(60px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  ```

**Acceptance Criteria**:
- `globals.css` の `:root` に `--bg-toast: #1e293b;` が存在する
- `globals.css` の `[data-theme="dark"]` に `--bg-toast: #334155;` が存在する
- `@theme inline` に `--color-bg-toast: var(--bg-toast)` が存在する
- `@keyframes toast-slide-in` が定義されている

---

## T-02: styles.ts の `FORM_LABEL` を更新する

- [x] `src/app/(dashboard)/styles.ts` の `FORM_LABEL` 定数を以下に変更する:
  ```ts
  export const FORM_LABEL = "text-xs font-semibold text-text-secondary";
  ```

**Acceptance Criteria**:
- `styles.ts` の `FORM_LABEL` が `"text-xs font-semibold text-text-secondary"` になっている
- `font-bold` と `text-text` の組み合わせが `FORM_LABEL` から除去されている

---

## T-03: FormField・Input・Select・Textarea に props 追加と FORM_LABEL 参照化を行う

対象ファイル: `src/app/components/FormField.tsx`

- [x] `import { FORM_LABEL } from "@/app/(dashboard)/styles";` を追加する
- [x] `FormField` の `Props` 型に `required?: boolean` を追加する
- [x] `FormField` のラベル要素のクラスを `FORM_LABEL` 定数参照に変更する（`"block ... mb-0.5"` 部分は維持）:
  ```tsx
  <label htmlFor={htmlFor} className={`block ${FORM_LABEL} mb-0.5`}>
    {label}
    {required && <span className="text-danger"> *</span>}
  </label>
  ```
- [x] `Input` の `Props` 型（`React.InputHTMLAttributes<HTMLInputElement>` に加えて）に `invalid?: boolean` を追加する。内部実装で `invalid` は HTML の `<input>` には渡さず（`rest` で展開しない）、クラスのみに使う:
  ```tsx
  export function Input({ invalid, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
    return (
      <input
        {...props}
        onKeyDown={...}
        className={`w-full border ${invalid ? "border-danger focus:border-danger" : "border-border focus:border-primary"} rounded px-2.5 py-1.5 text-xs text-text bg-bg-surface focus:outline-none placeholder:text-text-placeholder ${props.className ?? ""}`}
      />
    );
  }
  ```
- [x] `Select` に同様の `invalid?: boolean` を追加し、`border-danger focus:border-danger` を適用する
- [x] `Textarea` に同様の `invalid?: boolean` を追加し、`border-danger focus:border-danger` を適用する
- [x] `Textarea` に `min-h-20` クラスを追加する（既存クラスとスペース区切りで追記）

**Acceptance Criteria**:
- `FormField` が `FORM_LABEL` をインポートしている
- `FormField` に `required?: boolean` props が存在する
- `required=true` のとき `<span className="text-danger"> *</span>` が描画される
- `Input`, `Select`, `Textarea` に `invalid?: boolean` props が存在する
- `invalid=true` のとき各要素のクラスに `border-danger` が含まれる
- `Textarea` のクラスに `min-h-20` が含まれる

---

## T-04: MoneyInput に `invalid` props を追加する

対象ファイル: `src/app/components/MoneyInput.tsx`

- [x] `Props` 型に `invalid?: boolean` を追加する
- [x] 表示用 `<input>` の `className` 計算で、`invalid` が true のとき `border-danger focus:border-danger` に、false のとき `border-border focus:border-primary` に切り替える（既存の `baseClass` 文字列を分割して対応）

**Acceptance Criteria**:
- `MoneyInput` に `invalid?: boolean` props が存在する
- `invalid=true` のとき表示 input に `border-danger` が含まれる

---

## T-05: サイドバーをセクション分け・アイコン付きに刷新する（SidebarNav.tsx）

対象ファイル: `src/app/(dashboard)/SidebarNav.tsx`

- [x] `NavItem` 型を拡張し `icon: string` フィールドを追加する
- [x] `navItems` のフラット配列を `navSections` 配列に置き換える。各セクションは `{ label: string; items: NavItem[] }` 型とする:
  ```ts
  const navSections = [
    {
      label: "メイン",
      items: [{ href: "/dashboard", label: "ダッシュボード", icon: "📊" }],
    },
    {
      label: "営業",
      items: [
        { href: "/clients", label: "顧客", icon: "🏢" },
        { href: "/inquiries", label: "引き合い", icon: "📨" },
        { href: "/deals", label: "案件", icon: "💼" },
        { href: "/tasks", label: "タスク", icon: "📋" },
      ],
    },
    {
      label: "管理",
      items: [
        { href: "/contracts", label: "契約", icon: "📁" },
        { href: "/revenue", label: "売上", icon: "💰" },
        { href: "/requests", label: "申請一覧", icon: "📝", hasBadge: true },
      ],
    },
    {
      label: "個人・設定",
      items: [
        { href: "/account", label: "アカウント", icon: "👤" },
        { href: "/settings/templates", label: "設定", icon: "⚙️", adminOnly: true },
        { href: "/settings/audit-logs", label: "監査ログ", icon: "🧾", adminOnly: true },
      ],
    },
  ];
  ```
- [x] `Props` 型に `badgeCount?: number` を追加する
- [x] 描画ロジックを `navSections.map` に変更する。各セクションに見出しラベル（`text-2xs font-semibold uppercase tracking-wider text-text-sidebar-muted px-4 pt-4 pb-1`）を描画する
- [x] 各アイテムの描画: アイコンを `<span className="inline-block w-5">{item.icon}</span>` で先頭に配置、ラベルを続ける
- [x] active クラスを `bg-white/10 text-white border-l-[3px] border-primary` に変更する（`border-l-2 border-white` を削除）
- [x] `hasBadge` かつ `badgeCount` が 1 以上のとき、ラベル右端に `ml-auto` ピルを描画する:
  ```tsx
  {item.hasBadge && badgeCount != null && badgeCount > 0 && (
    <span className="ml-auto flex items-center justify-center bg-danger text-white text-2xs font-bold rounded-full min-w-4 h-4 px-1">
      {badgeCount > 99 ? "99+" : badgeCount}
    </span>
  )}
  ```

**Acceptance Criteria**:
- `navSections` 配列が 4 セクションを含む
- 各アイテムに `icon` フィールドが存在する
- `SidebarNav` が `badgeCount?: number` props を受け取る
- active 項目のクラスに `border-primary` が含まれる
- active 項目のクラスに `border-white` が含まれない（`border-l-2 border-white` 削除）
- `badgeCount >= 1` のとき申請一覧項目にピルが描画される
- `badgeCount === 0` のときピルが描画されない

---

## T-06: layout.tsx でサイドバー幅・ロゴ行・バッジ件数・ユーザー領域を更新する

対象ファイル: `src/app/(dashboard)/layout.tsx`

- [x] `listRequests` を `@/application/usecases` からインポートする
- [x] `layout.tsx` の `aside` の幅を `w-[210px] min-w-[210px]` → `w-[220px] min-w-[220px]` に変更する
- [x] ロゴ行を `h-14` 固定高さ・`border-b border-white/10` 付き・flex center レイアウトに変更する:
  ```tsx
  <div className="h-14 flex flex-col justify-center px-4 border-b border-white/10">
    <div className="text-[15px] font-bold text-white">Clearflow</div>
    <div className="text-2xs text-text-sidebar-muted">案件管理</div>
  </div>
  ```
- [x] `badgeCount` を計算する:
  ```ts
  const requests = await listRequests(session.user.organizationId);
  const role = session.user.role;
  const badgeCount = requests.filter(
    (r) =>
      r.status === "pending" &&
      (r.approvalSteps.length === 0 ||
        r.approvalSteps.some((s) => s.status === "pending" && s.approverRole === role))
  ).length;
  ```
- [x] `<SidebarNav isAdmin={isAdmin} />` に `badgeCount={badgeCount}` を追加する
- [x] ユーザー領域を以下に置き換える（アバター・縦 2 段・danger ログアウト）:
  ```tsx
  <div className="border-t border-white/10 px-4 py-3 flex items-center gap-3">
    {/* 頭文字アバター */}
    <div className="w-8 h-8 rounded-full bg-primary text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
      {session.user.name?.charAt(0) ?? "?"}
    </div>
    {/* 縦 2 段テキスト */}
    <div className="flex-1 min-w-0">
      <div className="text-xs text-text-on-dark-secondary truncate">{session.user.name}</div>
      <div className="text-2xs text-text-on-dark-muted">{session.user.role}</div>
    </div>
    {/* ThemeToggle + ログアウト */}
    <div className="flex items-center gap-2 flex-shrink-0">
      <ThemeToggle />
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button
          type="submit"
          className="text-status-red-text hover:opacity-80 text-xs"
        >
          [ログアウト]
        </button>
      </form>
    </div>
  </div>
  ```

**Acceptance Criteria**:
- `aside` の幅クラスが `w-[220px]` である
- `listRequests` のインポートが存在する
- `badgeCount` が計算されて `SidebarNav` に渡されている
- ユーザー領域に `w-8 h-8 rounded-full bg-primary` のアバター要素が存在する
- ログアウトボタンのクラスに `text-status-red-text` が含まれる

---

## T-07: NotificationPanel.tsx を修正する

対象ファイル: `src/app/(dashboard)/NotificationPanel.tsx`

- [x] `dark:bg-bg-card` を `bg-white dark:bg-bg-surface` に変更する（flyout div のクラス）
- [x] パネル幅を `w-80` → `w-[340px]` に変更する
- [x] clip 領域の左オフセットを `left-[210px]` → `left-[220px]` に変更する（サイドバー幅追随）

**Acceptance Criteria**:
- `NotificationPanel.tsx` に `bg-bg-card` の文字列が存在しない
- `w-[340px]` が含まれる
- `left-[220px]` が含まれる

---

## T-08: deals/new と contracts/new を 2 カラムグリッドに変更する

### T-08a: NewDealForm.tsx

対象ファイル: `src/app/(dashboard)/deals/new/NewDealForm.tsx`

- [x] `<SectionCard className="p-4">` の直下（エラーメッセージ `p` の次）に `<div className="grid grid-cols-2 gap-x-6 gap-y-4">` を追加し、ボタン行より前の `</SectionCard>` との間を wrap する
- [x] 各 `FormField` は 1 カラム（デフォルト）とし、備考（`name="notes"`）の `Textarea` を持つ `FormField` のみ `<div className="col-span-2">` で包む
- [x] `FormField` に `required` props を追加する:
  - 顧客（`clientId` 選択時、新規顧客名入力）: `required`
  - 案件名: `required`
  - 想定金額・日付・担当者: required なし（任意）
  - 契約種別: required なし（任意）

### T-08b: NewContractForm.tsx

対象ファイル: `src/app/(dashboard)/contracts/new/NewContractForm.tsx`

- [x] フォームフィールド全体を `<div className="grid grid-cols-2 gap-x-6 gap-y-4">` で wrap する
- [x] 契約名・契約種別・金額・開始日・終了日・支払条件・更新種別: 各 1 カラム（デフォルト）
- [x] `renewalType === "recurring"` 時に表示される更新サイクルフィールドは `col-span-2` か 1 カラムのどちらでも可
- [x] `FormField` に `required` props を追加する:
  - 契約名: `required`
  - 残りは任意

**Acceptance Criteria**:
- `NewDealForm.tsx` のグリッドコンテナに `grid-cols-2` と `gap-x-6` が含まれる
- `NewContractForm.tsx` のグリッドコンテナに `grid-cols-2` と `gap-x-6` が含まれる
- 備考の `FormField` コンテナに `col-span-2` が含まれる（NewDealForm）

---

## T-09: clients/new と inquiries/new の gap を統一する

### T-09a: ClientForm.tsx

対象ファイル: `src/app/(dashboard)/clients/new/ClientForm.tsx`

- [x] `grid grid-cols-2 gap-3` → `grid grid-cols-2 gap-x-6 gap-y-4` に変更する
- [x] 担当者セクション内のグリッドも `grid grid-cols-2 gap-2` → `grid grid-cols-2 gap-x-4 gap-y-3` に変更する（担当者ブロック内は比較的コンパクトでよい）
- [x] 手書きの `<span className="text-danger">*</span>` を `FormField required` prop に置き換える:
  - 企業名（`name`）: `required`
  - 担当者の氏名（各 `contact_name_i`）: `required`

### T-09b: InquiryForm.tsx

対象ファイル: `src/app/(dashboard)/inquiries/new/InquiryForm.tsx`

- [x] `grid grid-cols-2 gap-3` → `grid grid-cols-2 gap-x-6 gap-y-4` に変更する
- [x] 手書きの `<span className="text-danger">*</span>` を `FormField required` prop に置き換える:
  - 件名（`title`）: `required`
  - 流入経路（`source`）: `required`

**Acceptance Criteria**:
- `ClientForm.tsx` のグリッドに `gap-x-6` が含まれる
- `InquiryForm.tsx` のグリッドに `gap-x-6` が含まれる
- `ClientForm.tsx` に手書きの `<span className="text-danger">*</span>` が残っていない
- `InquiryForm.tsx` に手書きの `<span className="text-danger">*</span>` が残っていない

---

## T-10: Toast.tsx を刷新する

対象ファイル: `src/app/components/Toast.tsx`

- [x] 位置クラスを `fixed top-4 right-4` → `fixed bottom-4 right-4` に変更する
- [x] Toast 要素本体のクラスを以下に変更する:
  ```tsx
  className="fixed bottom-4 right-4 z-[60] bg-bg-toast px-4 py-3 min-w-[240px] max-w-[360px] rounded shadow-lg"
  style={{ animation: "toast-slide-in 0.25s ease" }}
  ```
- [x] 左カラーバー（`border-l-4 border-l-success` / `border-l-4 border-l-danger` の `variant` 分岐）を削除する
- [x] メッセージ表示を variant ごとのプレフィックス付きに変更する:
  ```tsx
  <p className="text-xs text-text-on-dark flex items-center gap-1.5">
    {toast.variant === "success" ? (
      <span className="text-status-green-text font-bold">✓</span>
    ) : (
      <span className="text-status-red-text font-bold">✗</span>
    )}
    {toast.message}
  </p>
  ```
- [x] `key` を `toast.id` として React の再マウントでアニメーションを毎回発火させる（`<div key={toast.id} ...>`）

**Acceptance Criteria**:
- `Toast.tsx` に `bottom-4 right-4` が含まれる
- `Toast.tsx` に `top-4` が含まれない
- `bg-bg-toast` が含まれる
- success 時に `✓` テキストが含まれる
- error 時に `✗` テキストが含まれる
- `border-l-4` が含まれない（左カラーバー廃止）
- `toast-slide-in` アニメーション参照が含まれる

---

## T-11: 4 フォームに成功時トーストを追加する

### T-11a: ClientForm.tsx

対象ファイル: `src/app/(dashboard)/clients/new/ClientForm.tsx`

- [x] `useToast` を `@/app/components` からインポートする
- [x] コンポーネント内で `const { showToast } = useToast();` を呼ぶ
- [x] `router.push("/clients")` の直前に `showToast("顧客を登録しました", "success")` を追加する

### T-11b: InquiryForm.tsx

対象ファイル: `src/app/(dashboard)/inquiries/new/InquiryForm.tsx`

- [x] `useToast` を `@/app/components` からインポートする
- [x] コンポーネント内で `const { showToast } = useToast();` を呼ぶ
- [x] `router.push("/inquiries")` の直前に `showToast("引き合いを登録しました", "success")` を追加する

### T-11c: NewDealForm.tsx

対象ファイル: `src/app/(dashboard)/deals/new/NewDealForm.tsx`

- [x] `useToast` を `@/app/components` からインポートする
- [x] コンポーネント内で `const { showToast } = useToast();` を呼ぶ
- [x] `useEffect` 内の `router.push(...)` の直前に `showToast("案件を作成しました", "success")` を追加する

### T-11d: NewContractForm.tsx

対象ファイル: `src/app/(dashboard)/contracts/new/NewContractForm.tsx`

- [x] `useToast` を `@/app/components` からインポートする
- [x] コンポーネント内で `const { showToast } = useToast();` を呼ぶ
- [x] `router.push(...)` の直前（成功分岐 `result.contractId` および `deal.id` フォールバック両方）に `showToast("契約を作成しました", "success")` を追加する

**Acceptance Criteria**:
- `ClientForm.tsx` が `useToast` をインポートしており `showToast("顧客を登録しました", "success")` の呼び出しが存在する
- `InquiryForm.tsx` が `useToast` をインポートしており `showToast("引き合いを登録しました", "success")` の呼び出しが存在する
- `NewDealForm.tsx` が `useToast` をインポートしており `showToast("案件を作成しました", "success")` の呼び出しが存在する
- `NewContractForm.tsx` が `useToast` をインポートしており `showToast("契約を作成しました", "success")` の呼び出しが存在する

---

## T-12: ConfirmDialog を 3 分割・BTN 定数適用に整形する

対象ファイル: `src/app/components/ConfirmDialog.tsx`

- [x] `BTN_PRIMARY`, `BTN_SECONDARY`, `BTN_DANGER` を `@/app/(dashboard)/styles` からインポートする
- [x] overlay のクラスを `bg-black/40` → `bg-black/45` に変更する
- [x] 本体 `maxWidth` を `420` → `480` に変更する
- [x] 本体の `rounded` → `rounded-lg` に変更する
- [x] 本体内の構造を 3 分割に変更する:
  ```tsx
  {/* header */}
  <div className="px-4 py-3 border-b border-border">
    <p className="text-sm font-bold text-text">{title}</p>
  </div>
  {/* body */}
  <div className="px-4 py-4">
    {message && <p className="text-xs text-text-muted mb-3">{message}</p>}
    {children && <div>{children}</div>}
  </div>
  {/* footer */}
  <div className="px-4 py-3 border-t border-border flex gap-2 justify-end">
    <button type="button" onClick={onCancel} disabled={loading} className={BTN_SECONDARY}>
      {cancelLabel}
    </button>
    <button type="button" onClick={onConfirm} disabled={loading} className={variant === "danger" ? BTN_DANGER : BTN_PRIMARY}>
      {confirmLabel}
    </button>
  </div>
  ```
- [x] 既存のインラインクラスによるボタン（角丸なし）を上記に置き換える

**Acceptance Criteria**:
- `ConfirmDialog.tsx` が `BTN_PRIMARY`, `BTN_SECONDARY`, `BTN_DANGER` をインポートしている
- overlay に `bg-black/45` が含まれる（`bg-black/40` は残っていない）
- 本体に `rounded-lg` が含まれる（`rounded-lg` なしの `rounded` 単独は残っていない）
- 本体に `maxWidth: 480` 相当が含まれる
- `border-b border-border` と `border-t border-border` の区切り線が存在する
- キャンセルボタンのクラスに `BTN_SECONDARY` の内容（`rounded` を含む）が適用されている
- `variant="danger"` 時の確定ボタンのクラスに `BTN_DANGER` の内容（`bg-danger`）が適用されている

---

## T-13: ActionItemModal を FormField/Select/FORM_LABEL に統一する

対象ファイル: `src/app/(dashboard)/components/ActionItemModal.tsx`

- [x] `Select` を `@/app/components` からインポートに追加する（`Input` と並べる）
- [x] `FORM_LABEL` を `@/app/(dashboard)/styles` からインポートする
- [x] 担当者フィールドの生 `<select>` を共有 `Select` コンポーネントに置き換える:
  ```tsx
  <Select
    value={assigneeId}
    onChange={(e) => setAssigneeId(e.target.value)}
    disabled={loading}
  >
    <option value="">未設定</option>
    {orgUsers.map((u) => (
      <option key={u.id} value={u.id}>
        {u.name}
      </option>
    ))}
  </Select>
  ```
- [x] 各 `<label>` のクラスを `text-xs text-text-muted block mb-0.5` から `${FORM_LABEL} block mb-0.5` に変更する（内容・担当者・期日・紐づけ先の 4 箇所）
- [x] キャンセルボタンを `BTN_SECONDARY` に置き換える:
  ```tsx
  import { BTN_PRIMARY, BTN_SECONDARY } from "@/app/(dashboard)/styles";
  // ...
  <button type="button" onClick={onCancel} disabled={loading} className={BTN_SECONDARY}>
    キャンセル
  </button>
  ```

**Acceptance Criteria**:
- `ActionItemModal.tsx` が `Select` をインポートしている
- `ActionItemModal.tsx` が `FORM_LABEL` をインポートしている
- 担当者フィールドに生 `<select>` が残っていない（`Select` コンポーネントが使われている）
- ラベルのクラスに `text-text-muted` が含まれない（`FORM_LABEL` 参照のため）

---

## T-14: テストを追加する

### T-14a: SidebarNav 静的検証テスト

新規ファイル: `src/__tests__/components/SidebarNav.test.ts`

- [x] `SidebarNav.tsx` のソースを読み込んで以下を assert する:
  - セクションラベル文字列「メイン」「営業」「管理」「個人・設定」が含まれる
  - 絵文字アイコン「📊」「🏢」「📨」「💼」「📋」「📁」「💰」「📝」「👤」「⚙️」「🧾」が含まれる
  - `border-primary` が含まれる（active スタイル）
  - `border-white` がクラス文字列として含まれない（旧 active スタイルの完全削除確認）
  - `badgeCount` という文字列が含まれる（props 定義確認）
  - `bg-danger` が含まれる（バッジピル）
  - `rounded-full` が含まれる（バッジ形状）

### T-14b: FormField 静的検証テスト

新規ファイル: `src/__tests__/components/FormField.test.ts`

- [x] `FormField.tsx` のソースを読み込んで以下を assert する:
  - `required` という文字列が含まれる（props 定義）
  - `text-danger` が含まれる（`*` スパンのクラス）
  - `FORM_LABEL` のインポートが含まれる
- [x] `Input` に関して: `invalid` という文字列が含まれる、`border-danger` が含まれる
- [x] `Textarea` に関して: `min-h-20` が含まれる

### T-14c: Toast 静的検証テスト

新規ファイル: `src/__tests__/components/Toast.test.ts`

- [x] `Toast.tsx` のソースを読み込んで以下を assert する:
  - `bottom-4` と `right-4` が含まれる
  - `top-4` が含まれない
  - `✓` が含まれる（success プレフィックス）
  - `✗` が含まれる（error プレフィックス）
  - `bg-bg-toast` が含まれる
  - `border-l-4` が含まれない（左カラーバー廃止）
  - `toast-slide-in` が含まれる（アニメーション参照）

### T-14d: ConfirmDialog 静的検証テスト

新規ファイル: `src/__tests__/components/ConfirmDialog.test.ts`

- [x] `ConfirmDialog.tsx` のソースを読み込んで以下を assert する:
  - `BTN_SECONDARY` が含まれる（キャンセルボタン）
  - `BTN_PRIMARY` が含まれる（確定ボタン）
  - `BTN_DANGER` が含まれる（danger 確定ボタン）
  - `rounded-lg` が含まれる（本体角丸）
  - `border-b border-border` が含まれる（header-body 区切り線）
  - `border-t border-border` が含まれる（body-footer 区切り線）

### T-14e: 成功トースト文言テスト

新規ファイル: `src/__tests__/components/successToasts.test.ts`

- [x] 以下の各ファイルを読み込んで、それぞれ指定の文言が含まれることを assert する:
  - `app/(dashboard)/clients/new/ClientForm.tsx` → `顧客を登録しました`
  - `app/(dashboard)/inquiries/new/InquiryForm.tsx` → `引き合いを登録しました`
  - `app/(dashboard)/deals/new/NewDealForm.tsx` → `案件を作成しました`
  - `app/(dashboard)/contracts/new/NewContractForm.tsx` → `契約を作成しました`
  - 各ファイルに `showToast` の呼び出しが存在する

### T-14f: NotificationPanel トークン修正確認テスト

既存テストに追加、または新規ファイル: `src/__tests__/components/NotificationPanel.test.ts`

- [x] `NotificationPanel.tsx` のソースを読み込んで `bg-bg-card` が含まれないことを assert する

**Acceptance Criteria**:
- `bun test` で上記テストがすべて pass する
- 既存テストが壊れていない（クラス名変更に追随した期待値修正は可、挙動アサーションの変更は不可）
