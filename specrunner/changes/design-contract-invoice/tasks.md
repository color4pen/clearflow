# Tasks: 契約・請求画面のデザイン適用

## T-01: ContractWithClient 型に dealTitle を追加し、リポジトリクエリを更新

- [ ] `src/domain/models/contract.ts` の `ContractWithClient` 型に `dealTitle: string` フィールドを追加
- [ ] `src/infrastructure/repositories/contractRepository.ts` の `findAllByOrganization` メソッドで `deals` テーブルを JOIN し、`deal.title` を `dealTitle` として返す
- [ ] 既存の `clients` JOIN に加え、`deals` テーブルの JOIN を追加（`contracts.dealId = deals.id`）
- [ ] `src/infrastructure/schema.ts` の deals テーブルインポートを確認（既に contracts テーブルのリレーションで使用されているはず）

**Acceptance Criteria**:
- `listContracts` usecase の戻り値に `dealTitle` が含まれる
- typecheck が通る

## T-02: 契約一覧に案件名・期間カラムを追加し 7 カラム化

- [ ] `src/app/(dashboard)/contracts/page.tsx` の DataTable columns に「案件名」カラムを追加（顧客名の後、契約種別の前）
  - `render`: `row.dealTitle` を表示。リンクは不要（テキスト表示のみ）
- [ ] 「期間」カラムを追加（金額の後、ステータスの前）
  - `render`: `startDate` 〜 `endDate` を `toLocaleDateString("ja-JP")` で表示。endDate が null の場合は「{startDate} 〜」と表示
- [ ] カラム順: 契約名, 顧客名, 案件名, 契約種別, 金額, 期間, ステータス

**Acceptance Criteria**:
- 契約一覧テーブルが 7 カラムで表示される
- 案件名が正しく表示される
- 期間が「YYYY/MM/DD 〜 YYYY/MM/DD」形式で表示される

## T-03: 契約一覧の終了日 30 日以内ハイライト

- [ ] `src/app/(dashboard)/contracts/page.tsx` の DataTable に `rowClass` prop を追加
- [ ] ハイライト判定ロジック: `endDate` が非 null かつ `endDate` が今日から 30 日以内（未来方向）かつ `status` が `active` の場合にハイライト
  - 過去日（既に終了済み）もハイライト対象とする（契約がまだ active なのに終了日を過ぎている場合は警告）
- [ ] ハイライトクラス: `bg-warning/10`（Tailwind のテーマカラーがあるか確認し、なければ `bg-amber-50` などで代替）
- [ ] `rowClass` 使用時は DataTable の既定ストライプ（偶数行 `bg-bg-surface` / 奇数行 `bg-bg-surface-alt`）が `rowClass` の戻り値で上書きされる点に注意。ハイライト非該当行にはストライプを維持するために `undefined` を返す（DataTable が既定のストライプを適用）

**Acceptance Criteria**:
- 終了日が 30 日以内の active 契約行が視覚的にハイライトされる
- 終了日が null の行や 30 日超の行はハイライトされない
- completed / cancelled の行はハイライトされない

## T-04: 契約詳細を 2 カラム（左 1.5fr / 右 1fr）レイアウトに再構成

- [ ] `src/app/(dashboard)/contracts/[id]/page.tsx` のメインレイアウトを `grid grid-cols-[3fr_2fr] gap-3` に変更
- [ ] **左カラム**:
  - 1 つ目の SectionCard: ContractInfoSection（契約情報フォーム、既存のまま）+ ステータス表示
  - ステータス変更セクション（ContractStatusActions）を左カラム内に統合（現在の独立 SectionCard を廃止）
  - 関連情報（案件リンク、顧客リンク）を左カラム内に統合（現在の右側 SectionCard から移動）
  - 削除ボタン（DeleteContractButton）は左カラム最下部に維持
- [ ] **右カラム**:
  - InvoiceSection を右カラムに配置（現在の 2 カラム外の下段から移動）
- [ ] 現在の独立した「ステータス変更」SectionCard を削除し、左カラムの契約情報 SectionCard 内に統合
- [ ] 現在の「関連情報」SectionCard を削除し、左カラムの契約情報 SectionCard 内に統合

**Acceptance Criteria**:
- 契約詳細が左 1.5fr / 右 1fr の 2 カラムで表示される
- 左カラムに基本情報 + ステータス操作 + 案件・顧客リンク + 削除ボタンが配置される
- 右カラムに請求セクションが配置される
- 既存の機能（編集、ステータス変更、削除、請求一覧）が維持される

## T-05: InvoiceSection にプログレスバー風サマリを追加

- [ ] `src/app/(dashboard)/contracts/[id]/InvoiceSection.tsx` の Props に `contractAmount: number` と `renewalType: RenewalType` を追加
- [ ] `src/app/(dashboard)/contracts/[id]/page.tsx` から `contractAmount` と `renewalType` を InvoiceSection に渡す
- [ ] 単発契約（`renewalType === "one_time"`）の場合のサマリ表示を変更:
  - 現在の grid-cols-3 数値ブロックをプログレスバー風表示に置き換え
  - 横長バー: 契約金額を 100% として「入金済（green）+ 請求済（blue）+ 残り（gray）」をスタック表示
  - バーの下にラベルと金額を表示: 「入金済 ¥XX / 請求済 ¥XX / 残り ¥XX」
  - 「残り」= 契約金額 - (paidTotal + invoicedTotal + scheduledTotal)。負になる場合は 0 とする
  - バーの幅比率: 各セグメントを `(amount / contractAmount * 100)%` で計算。合計が 100% を超える場合は 100% にキャップ
- [ ] 定期契約（`renewalType === "recurring"`）の場合は既存の grid-cols-3 数値ブロックを維持

**Acceptance Criteria**:
- 単発契約の請求サマリがプログレスバー風で表示される
- バーの各セグメントが適切な色で表示される
- 定期契約では従来通りの数値ブロック表示
- 金額の合計が契約金額を超えてもバーが溢れない

## T-06: 承認待ちバナーを契約詳細に追加

- [ ] `src/app/(dashboard)/contracts/[id]/page.tsx` で、contract に紐づく pending 状態の承認リクエストを検索
  - `requestRepository` から `originTriggerEntityId === contract.id` かつ `status === "pending"` のリクエストを検索するメソッドを利用（既存メソッドの有無を確認し、なければ追加）
- [ ] pending リクエストが存在する場合、ページ上部（パンくずの下、2 カラムの上）にバナーを表示
  - スタイル: `bg-amber-50 border border-amber-300 px-3 py-2 text-xs text-amber-800 mb-2`
  - テキスト: 「この契約には承認待ちの申請があります」
- [ ] pending リクエストが存在しない場合はバナー非表示

**Acceptance Criteria**:
- 承認待ちリクエストが紐づく契約の詳細ページにバナーが表示される
- 承認待ちリクエストがない場合はバナーが表示されない

## T-07: 請求詳細を max-width 560px の狭幅レイアウトに変更

- [ ] `src/app/(dashboard)/contracts/[id]/invoices/[invoiceId]/page.tsx` のメインラッパーを `max-w-[560px] mx-auto` に変更
- [ ] 現在の `grid-cols-2` レイアウトを廃止し、1 カラムレイアウトに変更
- [ ] 請求情報の dl を `grid grid-cols-[90px_1fr] gap-y-1` に変更（現在の `flex gap-2` + `w-24` から変更）
  - `dt`: `text-text-muted text-xs`（90px 幅は grid で自動適用）
  - `dd`: `text-text text-xs`
- [ ] ステータス操作（InvoiceActions）を請求情報の下に配置（現在の右カラム内から移動）
- [ ] 関連情報セクション（紐づく契約リンク）を請求情報の下、ステータス操作の上に配置
- [ ] パンくずを更新: 「契約一覧 > 契約名 > 請求詳細」（現在の「契約一覧 > 契約詳細 > 請求詳細」から変更）
  - 契約名は `contract.title` を使用
  - 「契約詳細」テキストを `contract.title` に変更（リンク先は同じ `/contracts/${contractId}`）

**Acceptance Criteria**:
- 請求詳細が max-width 560px でセンタリングされて表示される
- 情報表示が 90px + 1fr の grid レイアウトになっている
- パンくずが「契約一覧 > {契約名} > 請求詳細」になっている
- ステータス操作ボタンが正しく動作する

## T-08: typecheck & test 確認

- [ ] `bun run build` が成功することを確認
- [ ] 既存テストが pass することを確認
- [ ] 型エラーがないことを確認

**Acceptance Criteria**:
- `typecheck && test` が green
