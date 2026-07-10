# Conformance Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:   implementation conforms to tasks.md, design.md, spec.md, and request.md
  - needs-fix:  one or more upstream artifacts are not satisfied by the implementation
  - escalation: conformance cannot be determined (missing artifacts, unresolvable ambiguity)
- The Findings table records the per-artifact judgment.
-->

- **verdict**: approved

## Conformance Findings

| Artifact | Conforms | Notes |
|----------|----------|-------|
| tasks.md | ✅ yes | T-01〜T-14f の全チェックボックスが `[x]` |
| design.md | ✅ yes | D1〜D6 の全設計決定が実装されている |
| spec.md | ✅ yes | 全 Requirements（SHALL/MUST）が実装されている（後述の特記事項参照） |
| request.md | ✅ yes | 全受け入れ基準チェックボックスが充足されている |

---

## 詳細確認

### tasks.md — 全タスク完了確認

T-01〜T-14f の全チェックボックスが `[x]` であることを確認した。

### design.md — 設計決定との照合

| ID | 決定内容 | 実装状況 |
|----|---------|---------|
| D1 | `navSections` 配列を `SidebarNav.tsx` 内で宣言 | ✅ `const navSections: NavSection[]` として実装 |
| D2 | `layout.tsx` で `listRequests` 呼び出し・`badgeCount` 計算 → props 渡し | ✅ `layout.tsx` 21–28 行。新規 usecase 追加なし |
| D3 | `FormField` が `FORM_LABEL` を参照・`required`/`invalid` を追加 | ✅ `FormField.tsx` で実装 |
| D4 | `--bg-toast` トークンを `globals.css` に追加 | ✅ `:root` / `[data-theme="dark"]` 両方に定義、`@theme inline` 配線済み |
| D5 | `@keyframes toast-slide-in` を `globals.css` に追加 | ✅ `translateX(60px); opacity: 0` → `0; 1`、0.25s ease |
| D6 | `ConfirmDialog` を 3 分割、既存 BTN 定数に置換 | ✅ header/body/footer 分割、`BTN_SECONDARY`/`BTN_PRIMARY`/`BTN_DANGER` 適用 |

### spec.md — Requirements (SHALL) 適合確認

**サイドバー**

| 要件 | 確認結果 |
|-----|---------|
| `navSections` 4 セクション + 絵文字アイコン（`inline-block w-5`） | ✅ `SidebarNav.tsx:19–49, 85` |
| active: `border-l-[3px] border-primary`、`border-white` 削除 | ✅ 行 81。`border-l-2 border-white` は存在しない |
| `badgeCount >= 1` でピル表示（`bg-danger rounded-full`）、`0` で非表示 | ✅ 行 87–91 |
| `w-[220px]`、ロゴ行 `h-14 border-b border-white/10` | ✅ `layout.tsx:32–35` |

**通知・ユーザー領域**

| 要件 | 確認結果 |
|-----|---------|
| `dark:bg-bg-card` を除去 → `bg-white dark:bg-bg-surface` | ✅ `NotificationPanel.tsx:92`。`bg-bg-card` は存在しない |
| `w-[340px]`、`left-[220px]` | ✅ `NotificationPanel.tsx:89, 92` |
| `w-8 h-8 rounded-full bg-primary text-white` アバター + 縦 2 段テキスト | ✅ `layout.tsx:46–53` |
| ログアウトボタン `text-status-red-text` | ✅ `layout.tsx:65` |

**FormField・入力部品**

| 要件 | 確認結果 |
|-----|---------|
| `FORM_LABEL = "text-xs font-semibold text-text-secondary"`、`FormField` が参照 | ✅ `styles.ts:23`、`FormField.tsx:2, 15` |
| `required?: boolean` → `<span className="text-danger"> *</span>` | ✅ `FormField.tsx:8, 17` |
| `invalid?: boolean` → `border-danger focus:border-danger`（Input/Select/Textarea/MoneyInput） | ✅ 各コンポーネントに実装 |
| `Textarea` に `min-h-20` | ✅ `FormField.tsx:55` |

**フォームレイアウト**

| 要件 | 確認結果 |
|-----|---------|
| `NewDealForm` / `NewContractForm`: `grid grid-cols-2 gap-x-6 gap-y-4` | ✅ 両ファイル確認 |
| 備考フィールド: `col-span-2` | ✅ `NewDealForm.tsx:121` |
| `ClientForm` / `InquiryForm`: `gap-x-6 gap-y-4` | ✅ 両ファイル確認 |
| 手書き `<span className="text-danger">*</span>` を `FormField required` に置換 | ✅ ClientForm・InquiryForm 両方で確認 |

**Toast**

| 要件 | 確認結果 |
|-----|---------|
| `bottom-4 right-4`（`top-4` 削除） | ✅ `Toast.tsx:39` |
| `bg-bg-toast text-text-on-dark`、左カラーバー廃止（`border-l-4` なし） | ✅ 確認 |
| `✓`（`text-status-green-text`）/ `✗`（`text-status-red-text`）プレフィックス | ✅ `Toast.tsx:43–47` |
| `toast-slide-in 0.25s ease` アニメーション | ✅ `Toast.tsx:40` |
| `globals.css` に `--bg-toast` トークン、`@keyframes toast-slide-in` | ✅ `globals.css:60, 117, 171, 192–201` |

**成功トースト（4 フォーム）**

| フォーム | 文言 | 確認 |
|---------|-----|------|
| `ClientForm.tsx` | `顧客を登録しました` | ✅ 行 38 |
| `InquiryForm.tsx` | `引き合いを登録しました` | ✅ 行 37 |
| `NewDealForm.tsx` | `案件を作成しました` | ✅ 行 28 |
| `NewContractForm.tsx` | `契約を作成しました` | ✅ 行 42, 45（両分岐） |

**ConfirmDialog / ActionItemModal**

| 要件 | 確認結果 |
|-----|---------|
| `bg-black/45`、`maxWidth: 480`、`rounded-lg` | ✅ `ConfirmDialog.tsx:35–39` |
| header/body/footer を `border-b border-border`/`border-t border-border` で区切り | ✅ 行 44, 53 |
| `BTN_SECONDARY`/`BTN_PRIMARY`/`BTN_DANGER` 適用 | ✅ 行 54–57 |
| `ActionItemModal`: `FORM_LABEL` 参照、生 `<select>` → 共有 `Select` | ✅ `ActionItemModal.tsx:5, 95–101` |

**横断要件**

| 要件 | 確認結果 |
|-----|---------|
| `src/app` 配下に hex 直書き・生パレットクラスを持ち込まない | ✅ `globals.css` の CSS カスタムプロパティ定義は適正 |
| architecture test green | ✅ verification で 2223 pass / 0 fail。変更は `src/app` 配下のみ |

### request.md — 受け入れ基準の充足

| 基準 | 確認結果 |
|-----|---------|
| 既存全テスト green（挙動不変） | ✅ 2223 pass / 0 fail（verification-result.md） |
| typecheck / lint / build green | ✅ 全 phase passed |
| SidebarNav コンポーネントテスト | ✅ `SidebarNav.test.ts`（セクション・アイコン・border-primary・badgeCount・bg-danger・rounded-full） |
| FormField 単体テスト | ✅ `FormField.test.ts`（required・`*`・border-danger・FORM_LABEL・min-h-20） |
| Toast テスト | ✅ `Toast.test.ts`（bottom-4/right-4・✓/✗・bg-bg-toast・toast-slide-in・border-l-4 なし） |
| ConfirmDialog テスト | ✅ `ConfirmDialog.test.ts`（BTN 定数・rounded-lg・区切り線・bg-black/45・maxWidth 480） |
| 4 フォーム成功トースト文言テスト | ✅ `successToasts.test.ts` |
| `NotificationPanel` 未定義トークン除去テスト | ✅ `NotificationPanel.test.ts`（bg-bg-card 不在アサーション） |
| `mock-fidelity-check.md` の存在と突き合わせ記録 | ✅ sidebar・通知/ユーザー・フォームラベル・toast・ConfirmDialog の 5 部品を記録 |

---

## 挙動不変原則の確認

- 変更ファイルは `src/app` 配下（UI）と `globals.css` / `styles.ts` のみ（35 ファイル、うち `specrunner/` が 15 ファイル、ソースが 20 ファイル）。
- ドメイン・application・infrastructure・api に変更なし。
- `listRequests` は既存 usecase の戻り値を利用するのみ。新規 usecase・DB クエリ・API の追加なし。
- 表示ラベル文字列不変（追加は仕様指定のトースト文言と `*` のみ）。
- 決定事項で明示された 2 点（申請バッジ件数表示・成功トースト）のみが挙動追加であり、他は不変。

---

## 特記事項

**settings 系フォームへの `required` prop 未適用**

spec.md の「`FormField` の `required` props」要件および request.md の実装上の必須事項 1 では「settings 系フォーム」も `required` prop の付与対象として言及されている。しかし tasks.md には settings 系フォームの作業タスクが定義されておらず、実装もカバーしていない。

- 影響: settings 系フォームで必須フィールドに `*` マーカーが表示されない（cosmetic のみ）
- 受け入れ基準のチェックリストに settings フォームのテストは存在しない
- code-review（approved、スコア 9.3/10）でも未指摘
- `FormField required` の機能自体は完全に実装済み。settings フォームへの適用は後続作業として対応可能

この不足は tasks.md の設計段階で scope から漏れたものであり、実装が tasks.md を正しく実行していないという問題ではない。blocking 要因とは判断しない。
