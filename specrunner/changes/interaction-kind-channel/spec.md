# Spec: interaction-kind-channel

## Requirements

### Requirement: InteractionKind はチャネルのみを表す 4 値 enum であること

`InteractionKind` 型は `"meeting" | "call" | "email" | "note"` の 4 値で構成されなければならない（MUST）。`"contract_adjustment"` / `"invoice_adjustment"` は存在しない。DB の `interaction_kind` enum も同じ 4 値であること。

#### Scenario: InteractionKind 型が 4 値 union である

**Given** `src/domain/models/interaction.ts` が存在する
**When** `InteractionKind` の定義を確認する
**Then** `"meeting" | "call" | "email" | "note"` の 4 値 union であること

#### Scenario: DB enum が 4 値である

**Given** マイグレーション `0018_interaction_kind_channel.sql` が適用済みである
**When** `interaction_kind` enum の値を確認する
**Then** `meeting`, `call`, `email`, `note` の 4 値であること

---

### Requirement: 契約に紐づく接点の記録は kind=note + contractId で作成されること

`createContractAdjustment` usecase SHALL `kind: "note"` で Interaction を作成し、`contractId` を relatedTo として設定する。

#### Scenario: 契約調整を記録すると kind=note の Interaction が作成される

**Given** 有効な契約が存在する
**When** `createContractAdjustment` を呼び出す
**Then** `interactionRepository.create` に `kind: "note"` と `contractId` が渡されること

#### Scenario: 契約調整の監査ログは metadata.kind="note" で記録される

**Given** 有効な契約が存在する
**When** `createContractAdjustment` を呼び出す
**Then** `recordAudit` に `action: "interaction.create"`, `metadata: { kind: "note" }` が渡されること

---

### Requirement: 請求に紐づく接点の記録は kind=note + invoiceId で作成されること

`createInvoiceAdjustment` usecase SHALL `kind: "note"` で Interaction を作成し、`invoiceId` を relatedTo として設定する。

#### Scenario: 請求調整を記録すると kind=note の Interaction が作成される

**Given** 有効な請求が存在する
**When** `createInvoiceAdjustment` を呼び出す
**Then** `interactionRepository.create` に `kind: "note"` と `invoiceId` が渡されること

#### Scenario: 請求調整の監査ログは metadata.kind="note" で記録される

**Given** 有効な請求が存在する
**When** `createInvoiceAdjustment` を呼び出す
**Then** `recordAudit` に `action: "interaction.create"`, `metadata: { kind: "note" }` が渡されること

---

### Requirement: 認可は relatedTo 文脈ベースで権限値を維持すること

認可マトリクスの `interaction` エンティティの操作名は `recordContractInteraction` / `recordInvoiceInteraction` でなければならない（MUST）。権限値は以下を維持する:
- 契約に紐づく接点の記録: admin, manager, member（finance は不可）
- 請求に紐づく接点の記録: admin, manager, finance（member は不可）

#### Scenario: admin は契約に紐づく接点を記録できる

**Given** ユーザーのロールが `admin` である
**When** `canPerform("admin", "interaction", "recordContractInteraction")` を呼び出す
**Then** `true` が返ること

#### Scenario: finance は契約に紐づく接点を記録できない

**Given** ユーザーのロールが `finance` である
**When** `canPerform("finance", "interaction", "recordContractInteraction")` を呼び出す
**Then** `false` が返ること

#### Scenario: member は請求に紐づく接点を記録できない

**Given** ユーザーのロールが `member` である
**When** `canPerform("member", "interaction", "recordInvoiceInteraction")` を呼び出す
**Then** `false` が返ること

#### Scenario: finance は請求に紐づく接点を記録できる

**Given** ユーザーのロールが `finance` である
**When** `canPerform("finance", "interaction", "recordInvoiceInteraction")` を呼び出す
**Then** `true` が返ること

---

### Requirement: 差分マイグレーションはデータを安全に保持すること

マイグレーション SQL は以下をすべて満たさなければならない（MUST）:
1. 既存の `contract_adjustment` / `invoice_adjustment` 行を `kind = 'note'` に UPDATE する
2. `contract_id` / `invoice_id` / その他の列を変更しない
3. `DROP COLUMN` / `DELETE` / `TRUNCATE` を含まない
4. 商談行（kind=meeting）は不変

#### Scenario: マイグレーション SQL が旧値を note に寄せる

**Given** `interactions` テーブルに `kind = 'contract_adjustment'` の行が存在する
**When** マイグレーション SQL を適用する
**Then** その行の `kind` が `'note'` になり、`contract_id` は不変であること

#### Scenario: マイグレーション SQL が商談行を変更しない

**Given** `interactions` テーブルに `kind = 'meeting'` の行が存在する
**When** マイグレーション SQL を適用する
**Then** その行の `kind` が `'meeting'` のまま、全列不変であること

#### Scenario: マイグレーション SQL に破壊的操作が含まれない

**Given** マイグレーション SQL ファイルが存在する
**When** SQL の内容を確認する
**Then** `DROP COLUMN` / `DELETE FROM` / `TRUNCATE` が含まれないこと

---

### Requirement: 契約・請求に紐づく接点の一覧取得は relatedTo ベースで従来どおり動作すること

`listInteractionsByContract` / `listInteractionsByInvoice` は `contractId` / `invoiceId` で取得しており、kind に依存しない。kind 変更後も従来どおり動作しなければならない（MUST）。

#### Scenario: 契約に紐づく接点の一覧が取得できる

**Given** `contract_id` が設定された Interaction が存在する
**When** `listInteractionsByContract` を呼び出す
**Then** 該当する Interaction のリストが返ること

#### Scenario: 請求に紐づく接点の一覧が取得できる

**Given** `invoice_id` が設定された Interaction が存在する
**When** `listInteractionsByInvoice` を呼び出す
**Then** 該当する Interaction のリストが返ること

---

### Requirement: 商談（kind=meeting）の振る舞いは不変であること

商談の作成・更新・一覧・詳細は kind=meeting + relatedTo（deal_id / inquiry_id）で動作し、この変更の影響を受けてはならない（MUST NOT）。

#### Scenario: 商談の作成は kind=meeting で行われる

**Given** 有効な案件が存在する
**When** 商談を作成する
**Then** `kind: "meeting"` で Interaction が作成されること

---

### Requirement: getDealActivity のタイムラインラベルは relatedTo ベースの表現であること

`getDealActivity` の `targetInfoMap` で、契約経由の接点は「契約のやり取り」、請求経由の接点は「請求のやり取り」のラベルを返さなければならない（MUST）。

#### Scenario: 契約経由の接点ラベルが「契約のやり取り」である

**Given** 契約に紐づく Interaction がタイムラインに含まれる
**When** `getDealActivity` を呼び出す
**Then** targetInfoMap のラベルが「契約のやり取り YYYY/MM/DD」であること

#### Scenario: 請求経由の接点ラベルが「請求のやり取り」である

**Given** 請求に紐づく Interaction がタイムラインに含まれる
**When** `getDealActivity` を呼び出す
**Then** targetInfoMap のラベルが「請求のやり取り YYYY/MM/DD」であること
