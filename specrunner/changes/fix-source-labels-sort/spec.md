# Spec: 経路ラベル追加とテーブル並び順の修正

## Requirements

### Requirement: sourceLabels が inquirySourceEnum の全 7 値を網羅する

`sourceLabels` は inquirySourceEnum で定義された 7 値（web, phone, email, referral, agent_service, exhibition, other）すべてに対応する日本語ラベルを持つ辞書でなければならない（SHALL）。追加値は `email: "メール"` と `agent_service: "仲介サービス"` である。

#### Scenario: sourceLabels に email と agent_service が含まれる

**Given** `src/app/(dashboard)/labels.ts` の sourceLabels が定義されている
**When** sourceLabels のキーを列挙する
**Then** `email` と `agent_service` がキーに含まれ、それぞれの値が `"メール"` と `"仲介サービス"` である

#### Scenario: 引合一覧のフィルタドロップダウンに全経路が表示される

**Given** 引合一覧ページが sourceLabels からフィルタ選択肢を生成している
**When** 経路フィルタドロップダウンを展開する
**Then** 「メール」と「仲介サービス」が選択肢に表示される

#### Scenario: 引合詳細の編集フォームに全経路が表示される

**Given** 引合詳細ページの InquiryInfoSection が sourceLabels からオプションを生成している
**When** 流入経路の select を展開する
**Then** 「メール」と「仲介サービス」が選択肢に表示される

### Requirement: InquiryForm の sourceOptions が inquirySourceEnum の全 7 値を網羅する

InquiryForm の sourceOptions は enum 定義順（web, phone, email, referral, agent_service, exhibition, other）で全 7 値を含まなければならない（SHALL）。先頭のプレースホルダー「選択してください」は維持する。

#### Scenario: 引合新規登録フォームで email を選択できる

**Given** 引合新規登録フォーム（`/inquiries/new`）を開いている
**When** 流入経路のドロップダウンを展開する
**Then** web, 電話, メール, 紹介, 仲介サービス, 展示会, その他 の順に 7 つの選択肢が表示される

#### Scenario: email 経路で引合を登録できる

**Given** 引合新規登録フォームで流入経路に「メール」を選択している
**When** 必須項目を入力してフォームを送信する
**Then** source が `email` の引合が登録される

### Requirement: 一覧テーブルが createdAt 降順でソートされる

引合・案件・契約・承認申請・顧客の一覧取得関数は createdAt の降順（新しい順）でレコードを返さなければならない（SHALL）。対象は以下の関数:

- inquiryRepository: findAllByOrganization, findAllWithClientByOrganization, findByClientId
- dealRepository: findAllByOrganization, findAllByClientId
- contractRepository: findAllByClientId, findAllByOrganization
- requestRepository: findAllWithStepsByOrganization, findAllByOrganization
- clientRepository: findAllByOrganization

#### Scenario: 引合一覧が新しい順で表示される

**Given** 引合が複数件登録されている
**When** 引合一覧ページを表示する
**Then** createdAt が最も新しい引合が先頭に表示される

#### Scenario: 案件一覧が新しい順で表示される

**Given** 案件が複数件登録されている
**When** 案件一覧ページを表示する
**Then** createdAt が最も新しい案件が先頭に表示される

#### Scenario: 契約一覧が新しい順で表示される

**Given** 契約が複数件登録されている
**When** 契約一覧ページを表示する
**Then** createdAt が最も新しい契約が先頭に表示される

#### Scenario: 承認一覧が新しい順で表示される

**Given** 承認申請が複数件登録されている
**When** 承認一覧ページを表示する
**Then** createdAt が最も新しい承認申請が先頭に表示される

#### Scenario: 顧客一覧が新しい順で表示される

**Given** 顧客が複数件登録されている
**When** 顧客一覧ページを表示する
**Then** createdAt が最も新しい顧客が先頭に表示される

### Requirement: approvalSteps の stepOrder ソートは変更しない

`findAllWithStepsByOrganization` の orderBy で `approvalSteps.stepOrder` は昇順のまま維持しなければならない（SHALL）。承認ステップの論理順序（1→2→3）は業務上正しい。

#### Scenario: 承認ステップが stepOrder 昇順で返される

**Given** 承認申請に stepOrder 1, 2, 3 のステップが存在する
**When** findAllWithStepsByOrganization を呼び出す
**Then** 各申請の approvalSteps 配列が stepOrder 昇順で格納されている
