# Spec: ドメインモデルの設計整合

## Requirements

### Requirement: inquiries テーブルに budget / timeline カラムが存在する

inquiries テーブルには `budget` (integer, nullable) と `timeline` (text, nullable) カラムが存在しなければならない（MUST）。Inquiry モデル型にも budget / timeline が含まれなければならない。

#### Scenario: 引き合い作成時に budget と timeline を指定する

**Given** 引き合い作成フォームで budget=5000000, timeline="2026年Q3" を入力する
**When** createInquiry usecase を実行する
**Then** inquiries テーブルに budget=5000000, timeline="2026年Q3" のレコードが作成される

#### Scenario: budget / timeline 未指定で引き合いを作成する

**Given** 引き合い作成フォームで budget と timeline を入力しない
**When** createInquiry usecase を実行する
**Then** inquiries テーブルに budget=null, timeline=null のレコードが作成される

---

### Requirement: inquiries.source が pgEnum 型で 7 値を持つ

inquiries.source は pgEnum `inquiry_source` として定義され、`web | phone | email | referral | agent_service | exhibition | other` の 7 値を持たなければならない（MUST）。

#### Scenario: email ソースで引き合いを作成する

**Given** source="email" で引き合いを作成する
**When** createInquiry usecase を実行する
**Then** inquiries テーブルに source='email' のレコードが作成される

#### Scenario: 既存の text 型データがマイグレーションで変換される

**Given** inquiries テーブルに source="unknown_value" のレコードが存在する
**When** マイグレーションが実行される
**Then** 当該レコードの source が 'other' に変換される

#### Scenario: enum に含まれない値の挿入が拒否される

**Given** マイグレーションが完了している
**When** source="invalid" で INSERT を試みる
**Then** DB が型制約エラーを返す

---

### Requirement: meetings テーブルに inquiry_id カラムが存在し dealId が nullable である

meetings テーブルには `inquiry_id` (uuid, nullable, FK → inquiries.id) が存在し、`deal_id` は nullable でなければならない（MUST）。CHECK 制約 `deal_id IS NOT NULL OR inquiry_id IS NOT NULL` が存在しなければならない。

#### Scenario: 引合に紐づく商談を作成する（Deal なし）

**Given** inquiryId が指定され dealId が未指定の状態
**When** createMeeting usecase を実行する
**Then** meetings テーブルに inquiry_id=指定値, deal_id=null のレコードが作成される

#### Scenario: Deal に紐づく商談を作成する（引合なし）

**Given** dealId が指定され inquiryId が未指定の状態
**When** createMeeting usecase を実行する
**Then** meetings テーブルに deal_id=指定値, inquiry_id=null のレコードが作成される

#### Scenario: dealId も inquiryId も未指定で商談作成が拒否される

**Given** dealId と inquiryId の両方が未指定の状態
**When** createMeeting usecase を実行する
**Then** エラーが返され、商談は作成されない

#### Scenario: CHECK 制約により両方 null の INSERT が拒否される

**Given** マイグレーションが完了している
**When** deal_id=null かつ inquiry_id=null で INSERT を試みる
**Then** DB が CHECK 制約エラーを返す

---

### Requirement: meetings の attendees JSON 構造が新形式に準拠する

meetings.attendees の JSON 構造は `Array<{ userId: string | null, contactId: string | null, name: string, isExternal: boolean }>` でなければならない（MUST）。

#### Scenario: 既存データがマイグレーションで新形式に変換される

**Given** meetings テーブルに `{ internal: ["田中"], external: ["鈴木"] }` の attendees レコードが存在する
**When** マイグレーションが実行される
**Then** attendees が `[{ userId: null, contactId: null, name: "田中", isExternal: false }, { userId: null, contactId: null, name: "鈴木", isExternal: true }]` に変換される

#### Scenario: 新形式で商談を作成する

**Given** 新しい attendees 構造で商談を作成する
**When** createMeeting usecase を実行する
**Then** attendees が配列形式で保存される

---

### Requirement: deals テーブルに description カラムが存在する

deals テーブルには `description` (text, nullable) カラムが存在しなければならない（MUST）。Deal モデル型にも description が含まれなければならない。

#### Scenario: description 付きで案件を作成する

**Given** description="大規模システム刷新案件" で案件を作成する
**When** createDeal usecase を実行する
**Then** deals テーブルに description="大規模システム刷新案件" のレコードが作成される

---

### Requirement: contracts.amount と contracts.start_date が NOT NULL である

contracts テーブルの amount と start_date は NOT NULL でなければならない（MUST）。既存の null データにはマイグレーションでデフォルト値（amount=0, startDate=createdAt）が設定されなければならない。

#### Scenario: 既存の null amount データにデフォルト値が設定される

**Given** contracts テーブルに amount=null のレコードが存在する
**When** マイグレーションが実行される
**Then** 当該レコードの amount が 0 に更新される

#### Scenario: 既存の null startDate データにデフォルト値が設定される

**Given** contracts テーブルに start_date=null のレコードが存在する
**When** マイグレーションが実行される
**Then** 当該レコードの start_date が created_at の値に更新される

#### Scenario: amount=null の新規 INSERT が拒否される

**Given** マイグレーションが完了している
**When** amount=null で contracts に INSERT を試みる
**Then** DB が NOT NULL 制約エラーを返す

---

### Requirement: createContract usecase が amount を必須として検証する

createContract usecase は amount が未指定または 0 以下の場合にエラーを返さなければならない（SHALL）。Deal の estimatedAmount からのフォールバック後に null の場合もエラーとする。

#### Scenario: amount 未指定で契約を作成しようとする（Deal の estimatedAmount も null）

**Given** deal.estimatedAmount が null であり、amount パラメータが未指定
**When** createContract usecase を実行する
**Then** エラーメッセージが返り、契約は作成されない

---

### Requirement: invoices テーブルに issue_date カラムが存在する

invoices テーブルには `issue_date` (timestamp, nullable) カラムが存在しなければならない（MUST）。Invoice モデル型にも issueDate が含まれなければならない。invoicedAt は引き続き存在する。

#### Scenario: issueDate 付きで請求を作成する

**Given** issueDate="2026-07-01" で請求を作成する
**When** createInvoice usecase を実行する
**Then** invoices テーブルに issue_date='2026-07-01' のレコードが作成される

#### Scenario: issueDate 未指定で請求を作成する

**Given** issueDate を指定せずに請求を作成する
**When** createInvoice usecase を実行する
**Then** invoices テーブルに issue_date=null のレコードが作成される

---

### Requirement: isPrimary の重複チェックがアプリケーション層に存在する

同一顧客に isPrimary=true の担当者が既に存在する場合、新たに isPrimary=true の担当者を作成・更新しようとするとエラーを返さなければならない（MUST）。

#### Scenario: isPrimary=true の担当者が既に存在する状態で新たに isPrimary=true を追加する

**Given** client-A に isPrimary=true の担当者が既に 1 名存在する
**When** isPrimary=true で createClientContact を実行する
**Then** エラーメッセージが返り、担当者は作成されない

#### Scenario: isPrimary=false の担当者は制限なく作成できる

**Given** client-A に isPrimary=true の担当者が既に 1 名存在する
**When** isPrimary=false で createClientContact を実行する
**Then** 担当者が正常に作成される

#### Scenario: updateClientContactAction で isPrimary を true に変更しようとする

**Given** client-A に isPrimary=true の担当者が既に 1 名（contact-X）存在する
**When** 別の担当者 contact-Y を isPrimary=true に updateClientContactAction で更新する
**Then** エラーメッセージが返り、更新されない

#### Scenario: すでに isPrimary=true の担当者を isPrimary=true のまま更新する

**Given** client-A に isPrimary=true の担当者 contact-X が存在する
**When** contact-X 自身を isPrimary=true のまま updateClientContactAction で更新する
**Then** 更新が成功する（自己再設定は重複チェックの対象外）

---

### Requirement: テナント分離 — 全クエリに organizationId 条件を付与する

新規追加・変更される repository メソッドはすべて organizationId をパラメータに含み、WHERE 条件に organizationId を付与しなければならない（SHALL）。

#### Scenario: meetings の inquiryId 検索がテナント分離されている

**Given** 組織 A と組織 B のそれぞれに meetings レコードが存在する
**When** 組織 A のコンテキストで meetingRepository の検索を実行する
**Then** 組織 A のレコードのみが返る

---

### Requirement: 既存データのマイグレーションが正常に完了する

すべてのデータ変換マイグレーション（source enum フォールバック、attendees JSON 変換、amount/startDate デフォルト設定）が既存データを破壊せずに完了しなければならない（MUST）。

#### Scenario: マイグレーション後にアプリケーションが正常に動作する

**Given** 既存のシードデータが存在する
**When** マイグレーションを実行する
**Then** `typecheck && test` が green である

---

### Requirement: 型チェックとテストが green である

すべての変更完了後、`bun run build` と型チェックとテストが成功しなければならない（MUST）。

#### Scenario: ビルドが成功する

**Given** すべてのコード変更が完了している
**When** `bun run build` を実行する
**Then** ビルドエラーが発生しない
