# Design: interaction-kind-channel

## Context

顧客接点（Interaction）の `kind` 列挙型は現在 `meeting | call | email | contract_adjustment | invoice_adjustment` の 5 値。`contract_adjustment` / `invoice_adjustment` は「チャネル（接触手段）」ではなく「文脈（何に紐づくか）」を表しており、CRM/SFA の定石に反する。設計文書（ユビキタス言語辞書、§4.3、データモデル設計）では kind をチャネル `meeting | call | email | note` に整理し、文脈は `relatedTo`（`contract_id` / `invoice_id` 等の FK）で独立に表現する方針が確定済み。

現行コードでは `contract_adjustment` / `invoice_adjustment` を以下の箇所で使用している:

- **schema.ts**: `interactionKindEnum` の値定義、`interactions.kind` 列の型
- **interaction.ts**: `InteractionKind` union 型
- **createContractAdjustment.ts / createInvoiceAdjustment.ts**: usecase が `kind: "contract_adjustment"` / `kind: "invoice_adjustment"` を固定で指定
- **authorization.ts**: `interaction.recordContractAdjustment` / `interaction.recordInvoiceAdjustment` 操作名
- **interactions.ts (actions)**: Server Action が上記認可キーで `canPerform` チェック
- **contracts/[id]/page.tsx / invoices/[invoiceId]/page.tsx**: RSC が認可キーを指定して `canRecord` を判定
- **getDealActivity.ts**: コメント内で `contract_adjustment` / `invoice_adjustment` を言及（ロジックは relatedTo ベースで kind に依存しない）
- **テスト 6 ファイル**: `contractAdjustment.dynamic.test.ts`, `invoiceAdjustment.dynamic.test.ts`, `interactions.dynamic.test.ts`, `interactionByRelation.dynamic.test.ts`, `interactionAuthorization.dynamic.test.ts`, `dealActivity.dynamic.test.ts`

既存データ: seed は全行 `kind=meeting`。`contract_adjustment` / `invoice_adjustment` 行は UI 経由のみで発生し得る。

PostgreSQL は `ALTER TYPE ... DROP VALUE` を**サポートしない**ため、enum 値の削除には enum 再作成が必要。

## Goals / Non-Goals

**Goals**:

1. `InteractionKind` を `meeting | call | email | note` に是正する（enum 再作成マイグレーション）
2. 既存の `contract_adjustment` / `invoice_adjustment` 行を `kind = 'note'` に寄せる（`relatedTo` は不変）
3. usecase・認可・Server Action・テストを新 kind に追従させる
4. 商談（kind=meeting）の振る舞いを不変に保つ

**Non-Goals**:

- チャネル選択 UI の追加（meeting/call/email/note を画面で選ばせる）
- 商談の作成・編集・一覧・詳細の振る舞い変更
- 監査ログの過去データ書き換え（追記専用・不可侵）
- AR / 債権管理

## Decisions

### D1: enum 再作成で `interaction_kind` を `meeting | call | email | note` にする

**方針**: PostgreSQL は enum 値の削除をサポートしないため、以下の手順で enum を再作成する。

1. 既存 `contract_adjustment` / `invoice_adjustment` 行を `UPDATE ... SET kind = 'note'`
2. `interactions.kind` の DEFAULT を DROP
3. 新 enum `interaction_kind_new` を `meeting | call | email | note` で作成
4. `ALTER COLUMN kind TYPE interaction_kind_new USING kind::text::interaction_kind_new`
5. DEFAULT を `'meeting'` で再設定
6. 旧 enum を DROP、新 enum を RENAME

**Rationale**: drizzle-kit の `bun run db:generate` は enum 値削除を安全に生成できない可能性があるため、手書きの SQL マイグレーションファイルを用意する。`drizzle-kit check` で整合性を確認する。

**Alternatives considered**:
- `ALTER TYPE ... ADD VALUE 'note'` のみで旧値を残す → 旧値が残ると型安全性を損なう。アプリケーション側で旧値をガードし続ける負担が永続する。
- text 型に変更 → DB レベルの制約が失われ、任意の文字列が混入するリスクが高まる。

### D2: `contract_adjustment` / `invoice_adjustment` 行は `kind = 'note'` に移行し relatedTo を保持する

**方針**: `UPDATE interactions SET kind = 'note' WHERE kind IN ('contract_adjustment', 'invoice_adjustment')`。`contract_id` / `invoice_id` は変更しない。

**Rationale**: 「契約に関するやり取り」「請求に関するやり取り」は relatedTo（FK）で十分に表現できる。kind=note は「メモ的なやり取り」を表し、チャネルが不明確な既存データの受け皿として適切。情報損失なし（relatedTo が文脈を保持）。

**Alternatives considered**:
- kind=email に寄せる → 実際のチャネルが不明なため不正確
- kind=meeting に寄せる → 商談ではないやり取りを商談扱いにするのは誤り

### D3: usecase は kind を `'note'` に変更し、関数名・シグネチャは維持する

**方針**: `createContractAdjustment` / `createInvoiceAdjustment` の内部で `kind: "note"` を指定する。関数名は変更しない（呼び出し元の Server Action と 1:1 対応しており、リネームは広範な影響を伴う）。audit metadata も `{ kind: "note" }` に変更する。

**Rationale**: 関数の責務（契約/請求に紐づく接点を記録する）は不変。kind の値だけが変わる。関数名のリネームはスコープ外の Server Action・UI の変更を誘発するため、この変更では行わない。

**Alternatives considered**:
- 関数名を `recordContractInteraction` にリネーム → Server Action・テスト・UI まで波及し、スコープが肥大化する

### D4: 認可は relatedTo 文脈ベースの操作名にリネームする

**方針**: `interaction` エンティティの操作名を以下のようにリネームする:
- `recordContractAdjustment` → `recordContractInteraction`
- `recordInvoiceAdjustment` → `recordInvoiceInteraction`

権限値は維持: 契約=`ADMIN_MANAGER_MEMBER`、請求=`ADMIN_MANAGER_FINANCE`。

**Rationale**: 操作名に kind 固有の用語（adjustment）を含めると、kind 体系の変更のたびに認可定義を修正する必要がある。relatedTo ベースの命名にすることで、kind とは独立した認可体系を実現する。

**Alternatives considered**:
- 操作名を据え置く → kind に `adjustment` が存在しなくなるため、命名と実態が乖離する

### D5: `getDealActivity` の targetInfoMap ラベルを relatedTo ベースに変更する

**方針**: 契約経由の接点ラベルを「契約調整」→「契約のやり取り」、請求経由を「請求調整」→「請求のやり取り」に変更する。コメントの `contract_adjustment` / `invoice_adjustment` 言及も更新する。

**Rationale**: kind=contract_adjustment が廃止されるため、ラベルも relatedTo ベースの表現に統一する。

### D6: マイグレーション SQL は手書きで作成し、schema.ts は先に更新する

**方針**:
1. `schema.ts` の `interactionKindEnum` を `meeting | call | email | note` に更新
2. 手書きの SQL マイグレーションファイル `0018_interaction_kind_channel.sql` を作成
3. `bun run db:generate` で差分がないことを確認（schema.ts と SQL が一致）
4. `drizzle-kit check` で整合性を確認

**Rationale**: drizzle-kit は enum 値の削除を含むマイグレーションを安全に自動生成できない場合がある。手書きなら UPDATE→enum 再作成の安全な手順を制御できる。

## Risks / Trade-offs

**[Risk] drizzle-kit が手書き SQL を正しく認識しない** → `drizzle-kit check` で整合性を確認し、不整合がある場合は meta ファイルを調整する。マイグレーション適用はマージ後に `db:migrate` で行い、適用前に SQL を精査する。

**[Risk] 本番データに `contract_adjustment` / `invoice_adjustment` 行が存在する場合の UPDATE 漏れ** → マイグレーション SQL の先頭で UPDATE を実行し、enum 型変換の前に旧値を排除する。USING 句の cast で旧値が残っていれば型変換エラーで安全に失敗する。

**[Risk] 過去の監査ログ metadata に `kind: "contract_adjustment"` / `kind: "invoice_adjustment"` が残る** → スコープ外（監査ログは追記専用・不可侵）。UI の表示ラベルは kind に依存せず action ベースのため影響なし。

**[Trade-off] 関数名 `createContractAdjustment` / `createInvoiceAdjustment` を維持** → 実態は「kind=note の接点記録」だが、リネームの波及を避けるために据え置く。将来のリファクタリング候補。

## Open Questions

なし（設計判断は architect 評価済み）。

## Migration Plan

1. **コード変更を先行デプロイ**（kind=note で記録開始）— 旧 enum 値 `contract_adjustment` / `invoice_adjustment` は DB にまだ存在するが、新規作成では使用しない
2. **マイグレーション SQL を精査** — `0018_interaction_kind_channel.sql` の内容を確認し、DROP COLUMN / DELETE / TRUNCATE が含まれないことを検証
3. **`db:migrate` を実行** — UPDATE で旧値を note に寄せ、enum を再作成
4. **ロールバック戦略** — マイグレーション前にバックアップを取得。enum の再作成は逆方向（note → contract_adjustment/invoice_adjustment に戻す）の SQL で元に戻せる
