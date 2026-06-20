# Spec: ドメインモデル再構築と用語統一

## Requirements

### Requirement: 引き合いは顧客未確定で作成できる

引き合いの `clientId` は nullable であり、顧客が未確定の状態でも引き合いを作成できなければならない（SHALL）。

#### Scenario: 顧客未選択で引き合いを作成する

**Given** ユーザーが引き合い作成フォームで顧客を選択していない
**When** フォームを送信する
**Then** 引き合いが `clientId = null` で作成され、エラーは返らない

#### Scenario: 顧客を選択して引き合いを作成する

**Given** ユーザーが引き合い作成フォームで顧客を選択している
**When** フォームを送信する
**Then** 引き合いが指定の `clientId` で作成される

---

### Requirement: 商談は引き合いまたは案件のどちらか一方に必ず紐づく

商談（Meeting）を作成する際、`inquiryId` と `dealId` のどちらか一方は必須でなければならない（MUST）。両方が null の場合はエラーを返す。

#### Scenario: inquiryId のみで商談を作成する

**Given** `inquiryId` が有効な引き合いIDで `dealId` が未指定
**When** `createMeeting` を呼び出す
**Then** 商談が `inquiryId` に紐づいて作成される

#### Scenario: dealId のみで商談を作成する

**Given** `dealId` が有効な案件IDで `inquiryId` が未指定
**When** `createMeeting` を呼び出す
**Then** 商談が `dealId` に紐づいて作成される

#### Scenario: inquiryId と dealId の両方が null

**Given** `inquiryId` も `dealId` も null または未指定
**When** `createMeeting` を呼び出す
**Then** `{ ok: false, reason: "引き合いまたは案件のどちらかを指定してください" }` が返る

---

### Requirement: 案件化への遷移は「案件化」という用語で統一される

案件化操作（引き合いの `converted` への遷移）に関連するすべての UI テキスト・エラーメッセージ・承認リクエストタイトルは「案件化」という用語を使用しなければならない（SHALL）。

#### Scenario: 案件化承認リクエストのタイトル

**Given** 引き合いが `converted` ステータスへの遷移リクエストを受ける
**When** `updateInquiryStatus` が承認リクエストを作成する
**Then** 承認リクエストのタイトルが `"案件化承認: {inquiry.title}"` で作成される

#### Scenario: 案件化済み引き合いへの案件重複作成

**Given** すでに案件が存在する converted 引き合い
**When** `createDeal` を呼び出す（1件目）
**Then** `"案件化済みの引き合いにのみ案件を作成できます"` ではなく、重複エラーが返る（2件目は `"この引き合いにはすでに案件が存在します"` が返る）

注: `createDeal` のエラーメッセージ `"商談化済みの引き合いにのみ"` を `"案件化済みの引き合いにのみ"` に変更する

---

### Requirement: 見積承認フェーズへの遷移はテンプレートが必要

案件フェーズが `estimate_approval` に遷移する際、承認テンプレートが指定されていなければエラーを返さなければならない（MUST）。

#### Scenario: テンプレートなしで見積承認フェーズへ遷移する

**Given** 案件が `negotiation` フェーズにある
**When** `templateId` を指定せずに `updateDealPhase` で `estimate_approval` に遷移しようとする
**Then** `{ ok: false, reason: "見積承認フェーズへの遷移にはテンプレートの指定が必要です" }` が返る

#### Scenario: テンプレートありで見積承認フェーズへ遷移する

**Given** 案件が `negotiation` フェーズにある
**When** 有効な `templateId` を指定して `estimate_approval` に遷移する
**Then** 承認リクエストが作成され案件のフェーズが `estimate_approval` に更新される

---

### Requirement: 案件更新は admin と manager のみが実行できる

`updateDealAction` は admin または manager ロールのユーザーのみが実行できなければならない（MUST）。

#### Scenario: member ロールによる案件更新

**Given** ログインユーザーのロールが `"member"` である
**When** `updateDealAction` を呼び出す
**Then** `{ success: false, message: "権限がありません" }` が返る

#### Scenario: admin ロールによる案件更新

**Given** ログインユーザーのロールが `"admin"` である
**When** 有効なデータで `updateDealAction` を呼び出す
**Then** 案件が更新されて `{ success: true }` が返る

---

### Requirement: UIラベルは単一ソースから供給される

引き合いステータス・引き合い経路・商談種別・案件フェーズ・契約種別のラベルは `src/app/(dashboard)/labels.ts` のみで定義され、各ページはそこから import しなければならない（SHALL）。

#### Scenario: 用語の一括変更

**Given** `labels.ts` の `phaseLabels.estimate_approval` が `"見積承認中"` である
**When** 案件一覧ページと案件詳細ページを表示する
**Then** 両ページで `estimate_approval` が `"見積承認中"` と表示される（ページ固有のラベル定義からではなく）
