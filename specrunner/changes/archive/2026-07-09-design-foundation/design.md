# Design: UI デザイン基盤の刷新（デザイントークン＋ステータスバッジ体系）

## Context

UI の現状は配色が `#2c3e50` 系の青灰基調で、ステータス/フェーズの表示手段が 4 つのパターンに散在している:

1. **素テキスト** — `phaseLabels[row.phase]`（deals 一覧列）、`contractStatusLabels[row.status]`（contracts 一覧）
2. **ハードコード hex の文字色** — `statusUtils.ts` の `text-[#2980b9]`・`text-[#d4880f]` 等（requests 一覧）
3. **ページローカルの pill バッジ** — `statusBadgeClass()` に `bg-amber-50 border-amber-300 text-amber-700` 等（requests 詳細）
4. **生 Tailwind パレットのチップ/アイコン** — `bg-blue-50 text-blue-700`（StatusChipSelect）、`bg-emerald-100 text-emerald-700`（ApprovalStepper）

ダークテーマは `[data-theme="dark"]` セレクタによる 3 段構成（`:root` → `[data-theme="dark"]` → `@theme inline`）が確立されているが、パターン 2〜4 はダーク時にライト値のまま背景色が浮いてしまう。

また、`InquiryStatusBanner.tsx` や `DealPhaseStepper.tsx` の終端表示にも `style={{ backgroundColor: "#eef5fb" }}` 等のインラインスタイルが残っており、トークン変更の恩恵を受けない。

変更ファイルは `src/app` 配下 UI ファイルおよび `src/app/globals.css`・`src/app/(dashboard)/styles.ts` に限定する。domain / application / infrastructure / api は不変。

## Goals / Non-Goals

**Goals**:
- `globals.css` のデザイントークン値を slate 基調に刷新する（トークン名は変更しない）
- ステータス 6 系統（gray/blue/green/yellow/red/navy）の text/bg トークンを追加し `@theme inline` に配線する
- 共有 `StatusBadge` コンポーネント（`src/app/(dashboard)/components/StatusBadge.tsx`）を新設し、全ステータス表示箇所をバッジに統一する
- `statusUtils.ts` の `text-[#` 形式ハードコード hex を全廃する
- `InquiryStatusBanner.tsx` のインラインスタイル hex をトークン参照クラスに置き換える
- `DealPhaseStepper.tsx` 終端フェーズのチップ色をシステムトークン参照に更新する
- `styles.ts` の `SECTION_CARD` を `rounded-lg` に更新する
- ライト/ダーク両テーマでコントラストが成立することを保証する

**Non-Goals**:
- ボタン・フォーム・フィルタバー・テーブルの再スタイル
- レイアウト再配置・フォントファミリ・文字サイズの変更
- 期限系の行ハイライトの変更
- 画面遷移・Server Actions・API/MCP・DB・権限・集計ロジックへの変更

## Decisions

### D1: トークン名を維持し値のみ更新する

**Rationale**: 既存のユーティリティクラス（`bg-bg-surface`・`border-border` 等）を参照しているファイルへの波及を防ぐ。値のみの変更は `globals.css` 1 ファイルで完結し差分を最小化できる。

**Alternatives considered**: トークン名ごと刷新（例 `--bg-surface` → `--surface`）はすべての参照ファイルのクラス置換が必要となりリグレッションリスクが高い。採用しない。

### D2: `StatusBadge` を 6 variant の pill 型コンポーネントとして新設する

**Rationale**: 各画面で重複している「薄背景＋濃文字」パターンを一元化する。variant 指定への抽象化により、将来のトークン変更がコンポーネント 1 箇所で完結する。`px-2 py-0.5 rounded-full text-2xs font-semibold whitespace-nowrap` の pill 形状は既存 `requests/[id]/page.tsx` の `statusBadgeClass` 実装と意味的に一致する。

**Alternatives considered**: 既存の `InquiryStatusBadge.tsx` を多目的コンポーネントに拡張する案は命名・責務が曖昧になる。新設 `StatusBadge` に統一して `InquiryStatusBadge.tsx` を廃止する。

### D3: `statusClass`/`stepStatusClass` を variant 返却関数に置き換える

**Rationale**: ハードコード hex 全廃が受け入れ基準。`statusClass` → `statusVariant` に rename し戻り値を `"gray" | "blue" | "green" | "yellow" | "red" | "navy"` に変更する。型の明確化により呼び出し側で `<StatusBadge>` に接続しやすくなる。

**Alternatives considered**: `statusClass` のシグネチャを維持しながら戻り値文字列をトークンクラスに変更する案は、`<span className={...}>` 参照が残り `StatusBadge` への統一が中途半端になる。

### D4: `statusRowClass` は行背景ハイライト用のまま維持し、クラスをトークン参照に更新する

**Rationale**: テーブル行のハイライト（pending/revision 行の背景色）は StatusBadge ではなく行レベルの CSS で表現する既存設計が適切。ただし `bg-amber-50`（Tailwind パレット直参照）は `bg-bg-row-pending` に、`bg-orange-50` は `bg-bg-row-revision` に揃えてトークン経由にする。

### D5: ステータス系統マッピング定義を表示層に配置する

**Rationale**: 色の意味論は表示規約であり業務ドメイン概念ではない。`statusVariant`/`stepStatusVariant` は `statusUtils.ts` に、phase/contract/inquiry/invoice の variant マッピング関数は `labels.ts` の近傍（または各画面ファイル内のヘルパー）に配置する。domain 層への変更は不要。

### D6: `DealPhaseStepper` の終端フェーズ表示は StatusBadge を使わずトークンクラス参照に更新する

**Rationale**: DealPhaseStepper の終端スパンはステッパーの一部として `px-3.5 py-1.5` の大きめパディングを持ち、StatusBadge の `px-2 py-0.5` とは形状が異なる。StatusBadge を使うとステッパーのビジュアルバランスが崩れる。色のみシステムトークン参照（`bg-status-green-bg text-status-green-text border-status-green-text/30` 等）に統一する。

## Risks / Trade-offs

- **[Risk] `statusUtils.test.ts` の期待値**: TC-008 が `text-[#2980b9]` 等のハードコード文字列を直接アサートしている。関数名変更（`statusClass` → `statusVariant`）と戻り値型変更に伴い、テスト期待値の更新が必要。挙動アサーション（ステータス対応の正当性）は維持する。Mitigation: T-17 で明示的に期待値更新タスクを定義する。

- **[Risk] ダークテーマのコントラスト**: ステータス bg トークンを `:root` のみに定義して `[data-theme="dark"]` に漏れると白飛びが発生する。Mitigation: T-01〜T-03 で両テーマ値の定義を必須要件として明示する。

- **[Risk] `BulkApprovalPanel` の prop 型変更**: `requests/page.tsx` が `statusClass: string` を生成して渡している。`statusVariant` への rename で Props 型の変更が発生する。Mitigation: T-11 で `statusClass: string` → `statusVariant: StatusBadgeVariant` への移行を一体で実施する。

- **[Risk] `InquiryStatusBadge.tsx` の廃止**: 既存ファイルを削除・置換するため、インポート参照を更新しないとビルドエラーになる。Mitigation: T-08 で `InquiryListView` の参照更新と廃止を一体で実施する。

## Open Questions

なし（要件・決定事項が明確）
