# Design: UIを業務システムスタイルにリデザイン

## Context

ダッシュボードUIは素のTailwindそのままで、情報密度が低く視覚的な優先順位がない。業務システムとして使うには以下の問題がある:

- **ヘッダー**: 64px相当（`py-4`）で画面を圧迫。白背景で目立たない
- **ステータス表示**: `rounded-full` バッジスタイル（背景色+テキスト）で視覚的にうるさい
- **テーブル密度**: 行高が大きい（`py-4`）。承認進捗は詳細画面に遷移しないと見えない
- **コード重複**: `statusLabel`/`statusClass` が `requests/page.tsx` と `requests/[id]/page.tsx` に重複定義。ボタン・inputのTailwindクラスが10箇所以上にコピペ
- **設定タブ**: active状態のスタイルがない。delegationsがナビゲーションに未追加
- **データ不足**: `listRequests` は `Request[]` のみ返し、承認ステップ情報を含まない

## Goals / Non-Goals

**Goals**:

- ヘッダーを36px以下に圧縮し、`bg-slate-900` の濃紺背景に変更
- ステータスをバッジから色テキストのみに統一
- 一覧テーブルを行高28px（`py-0.5`）の高密度化し、承認進捗列・期限列を追加
- `statusLabel`/`statusClass` を `statusUtils.ts` に共通化
- 設定タブにactive状態スタイルとdelegationsリンクを追加
- ボタン・inputのTailwindクラスを `styles.ts` に定数として切り出し
- 一覧テーブル下にフッター統計を表示

**Non-Goals**:

- レスポンシブ対応（モバイル）
- ダークモード
- アイコン・ロゴの追加
- ページネーション機能の実装（表示のみ）
- フィルタ機能の実装（表示のみ）
- フォームページ（申請作成、テンプレート編集等）のリデザイン

## Decisions

### D1: Tailwindクラス定数ファイル `styles.ts` を採用、コンポーネントラッパーを不採用

**Rationale**: `<Button variant="primary">` のようなコンポーネントは Server Component で `onClick` を使えない制約がある。文字列定数なら Server/Client どちらからでも `className={BTN_PRIMARY}` で参照でき、既存コードの変更量が最小。

**Alternatives considered**:
- コンポーネントラッパー方式 → Server Component で使えない制約あり。ボタンが多い Client Component（ActionButtons等）には有用だが、Server Component ページ（templates/page.tsx 等）のLinkタグにはクラス文字列が必要
- CSS Modules → Tailwind CSS 4 との併用で設定が複雑化

**配置**: `src/app/(dashboard)/styles.ts`

定義する定数:
- `BTN_PRIMARY` — `px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500`
- `BTN_SECONDARY` — `px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50`
- `BTN_DANGER` — `px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500`
- `BTN_SUCCESS` — `px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500`
- `BTN_WARNING` — `px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500`
- `INPUT_BASE` — `w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`
- `SELECT_BASE` — `block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`

### D2: `statusUtils.ts` でステータス表示を一元管理

**Rationale**: `statusLabel` と `statusClass` が `requests/page.tsx` と `requests/[id]/page.tsx` に重複しており、ステータス色変更（バッジ→色テキスト）の影響範囲が分散する。1ファイルに集約することで変更が1箇所で済む。

**Alternatives considered**:
- domain層に置く → UIの表示ロジック（Tailwindクラス名）を domain に置くのはレイヤ違反
- `styles.ts` に同居 → ステータスは型付きのマッピングロジックを含むため独立ファイルが適切

**配置**: `src/app/(dashboard)/requests/statusUtils.ts`

**エクスポート内容**:
- `statusLabel(status: RequestStatus): string` — 日本語ラベル
- `statusClass(status: RequestStatus): string` — 色テキストクラス（バッジスタイルなし）
- `stepStatusLabel(status: ApprovalStepStatus): string` — 承認ステップの日本語ラベル
- `stepStatusClass(status: ApprovalStepStatus): string` — 承認ステップの色テキストクラス
- `statusRowClass(status: RequestStatus): string` — テーブル行の背景色クラス（pending→`bg-amber-50`、revision→`bg-orange-50`）

### D3: 設定タブを Client Component に分離

**Rationale**: `usePathname()` でactive判定するには Client Component が必要。タブナビゲーション部分のみを `SettingsNav` Client Component として切り出し、設定レイアウト本体は Server Component のまま維持する。

**Alternatives considered**:
- レイアウト全体を Client Component 化 → 認証チェック（`auth()`）が Server Component でしか動かない
- URLパラメータベース → `usePathname()` より複雑で不自然

**実装**: `src/app/(dashboard)/settings/SettingsNav.tsx`（`"use client"`）を新規作成し、`settings/layout.tsx` からインポートする。

### D4: 承認進捗列のためにデータ取得を拡張

**Rationale**: 一覧テーブルに承認進捗（`● ○ manager → finance`）を表示するには、各申請の承認ステップ情報が必要。現在の `listRequests` は `Request[]` のみ返す。

**方針**: `listRequests` usecase を拡張し、各 request に対する approval_steps のサマリ情報を含めて返す。リクエスト一覧の SQL で approval_steps を JOIN し、ステップごとの `approverRole` と `status` を集約する。

**Alternatives considered**:
- N+1 クエリ（1リクエストにつき1 getApprovalSteps）→ パフォーマンス問題
- フロント側で別途 fetch → Server Component でのデータ取得パターンに合わない

**具体的変更**:
1. `requestRepository.findAllByOrganization` を拡張するか、新しいリポジトリ関数 `findAllWithStepsByOrganization` を追加
2. `listRequests` usecase の戻り値型を拡張（`RequestWithSteps[]`）
3. 戻り値に各ステップの `approverRole` と `status` のリストを含める

### D5: ヘッダー内のナビゲーションリンク構成

**Rationale**: ヘッダーを濃紺に圧縮し、ナビゲーションリンクをインラインで配置する。設定リンクは admin のみに表示する。

**方針**: ヘッダー内にナビゲーションを配置する。全ロール共通で「申請一覧」リンクを表示。「設定」リンクは admin のみ表示する（`settings/layout.tsx` が非 admin を `/requests` にリダイレクトするため、全ロール表示にすると機能しないリンクになる）。「監査ログ」は admin 専用のため admin のみ表示。

ヘッダーは Server Component のまま維持。ログアウトフォームの Server Action もそのまま動く。

### D6: BulkApprovalPanel への新列追加

**Rationale**: `BulkApprovalPanel` は Client Component であり、props でデータを受け取る。承認進捗列・期限列を追加するには、親の `requests/page.tsx` から拡張されたデータを props として渡す。

**方針**:
- `RequestItem` 型に `approvalProgress`（ステップ配列のサマリ）と `currentDeadline`（直近の期限）を追加
- テーブルに「進捗」列と「期限」列を追加
- 期限は残り3日以内の場合 `text-red-600 font-bold` で表示

## Risks / Trade-offs

**[Risk] `listRequests` の JOIN 拡張でクエリが複雑化** → Mitigation: approval_steps テーブルへの JOIN は1:N で、order by `stepOrder` で取得すればシンプル。インデックスは `requestId` に既存。パフォーマンス問題が出た場合はサブクエリに切り替え可能。

**[Risk] ヘッダー36pxで要素が収まらない** → Mitigation: `py-1` + `text-xs`/`text-sm` でコンパクトに収める。ナビリンクとユーザー情報を `flex` で横並びにし、`gap-2`～`gap-4` で調整。

**[Risk] 高密度テーブル（行高28px）で可読性が低下** → Mitigation: 承認待・差戻し行に背景色を付けて視覚的メリハリを維持。テキストは `text-xs`～`text-sm` の範囲に統一。

**[Risk] styles.ts の定数参照への移行漏れ** → Mitigation: tasks でファイルごとに置換対象を明示。スコープ外のフォームページ（`requests/new`等）は今回の変更対象から除外を明記。

## Open Questions

（なし — architect 評価済みの設計判断により主要な論点は解決済み）
