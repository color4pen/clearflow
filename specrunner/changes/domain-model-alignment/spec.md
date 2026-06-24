# Spec: ドメインモデルの設計整合

## Requirements

### Requirement: Inquiry に budget / timeline フィールドが存在する

inquiries テーブルおよび Inquiry ドメインモデル型に budget (integer, nullable) と timeline (text, nullable) が存在しなければならない (MUST)。

#### Scenario: budget / timeline 付きの引き合いを作成する

**Given** inquiries テーブルに budget / timeline カラムが追加されている
**When** budget: 5000000, timeline: "2026年度内" を指定して引き合いを作成する
**Then** 作成された引き合いの budget が 5000000、timeline が "2026年度内" である

#### Scenario: budget / timeline を省略して引き合いを作成する

**Given** inquiries テーブルに budget / timeline カラムが追加されている
**When** budget / timeline を指定せずに引き合いを作成する
**Then** 作成された引き合いの budget が null、timeline が null である

### Requirement: InquirySource は 7 値の pgEnum である

inquiries.source は pgEnum 型 `inquiry_source` として定義され、値は `web | phone | email | referral | agent_service | exhibition | other` の 7 値でなければならない (MUST)。

#### Scenario: 新しい enum 値 email で引き合いを作成する

**Given** inquirySourceEnum が 7 値で定義されている
**When** source: "email" を指定して引き合いを作成する
**Then** 作成された引き合いの source が "email" である

#### Scenario: 新しい enum 値 agent_service で引き合いを作成する

**Given** inquirySourceEnum が 7 値で定義されている
**When** source: "agent_service" を指定して引き合いを作成する
**Then** 作成された引き合いの source が "agent_service" である

#### Scenario: マイグレーションで既存データが enum にフォールバックされる

**Given** inquiries テーブルに source = "unknown_value" のレコードが存在する
**When** マイグレーションが実行される
**Then** そのレコードの source が "other" に変換される

### Requirement: Meeting は inquiryId または dealId の少なくとも一方を持つ

meetings テーブルに inquiry_id (uuid, nullable, FK → inquiries.id) が存在し、deal_id が nullable でなければならない (MUST)。CHECK 制約により deal_id IS NOT NULL OR inquiry_id IS NOT NULL が保証されなければならない (MUST)。

#### Scenario: 引合に紐づく商談を作成する

**Given** 引き合い（Inquiry）が存在する
**When** inquiryId を指定し dealId を省略して商談を作成する
**Then** 商談が作成され、inquiryId が設定され、dealId が null である

#### Scenario: 案件に紐づく商談を作成する

**Given** 案件（Deal）が存在する
**When** dealId を指定し inquiryId を省略して商談を作成する
**Then** 商談が作成され、dealId が設定され、inquiryId が null である

#### Scenario: 両方の FK が null の商談は作成できない

**Given** CHECK 制約が meetings テーブルに存在する
**When** dealId も inquiryId も指定せずに商談を作成しようとする
**Then** CHECK 制約違反エラーが発生し、商談は作成されない

### Requirement: Meeting の attendees は配列形式の JSON 構造を持つ

attendees の JSON 構造は `Array<{ userId: string | null, contactId: string | null, name: string, isExternal: boolean }>` でなければならない (MUST)。

#### Scenario: 新形式で参加者を登録する

**Given** attendees が配列形式で定義されている
**When** `[{ userId: "u1", contactId: null, name: "田中", isExternal: false }, { userId: null, contactId: "c1", name: "山田", isExternal: true }]` を指定して商談を作成する
**Then** 商談の attendees にその配列が格納される

#### Scenario: マイグレーションで既存の attendees が新形式に変換される

**Given** attendees が `{ internal: ["田中"], external: ["山田"] }` の旧形式で格納されている
**When** マイグレーションが実行される
**Then** attendees が `[{ userId: null, contactId: null, name: "田中", isExternal: false }, { userId: null, contactId: null, name: "山田", isExternal: true }]` に変換される

### Requirement: Deal に description フィールドが存在する

deals テーブルおよび Deal ドメインモデル型に description (text, nullable) が存在しなければならない (MUST)。

#### Scenario: description 付きの案件を作成する

**Given** deals テーブルに description カラムが追加されている
**When** description: "受託開発案件の詳細説明" を指定して案件を作成する
**Then** 作成された案件の description が "受託開発案件の詳細説明" である

#### Scenario: description を省略して案件を作成する

**Given** deals テーブルに description カラムが追加されている
**When** description を指定せずに案件を作成する
**Then** 作成された案件の description が null である

### Requirement: ClientContact の isPrimary は同一 client_id 内で一意である

同一 client_id 内で isPrimary = true の ClientContact が複数存在してはならない (MUST NOT)。アプリケーション層のバリデーション関数でこれを検証する。

#### Scenario: isPrimary = true を設定するとき既存の primary がなければ成功する

**Given** client_id = "c1" に isPrimary = true の担当者が存在しない
**When** client_id = "c1" に isPrimary = true で担当者を作成する
**Then** 担当者が正常に作成される

#### Scenario: isPrimary = true を設定するとき既存の primary があればエラーになる

**Given** client_id = "c1" に isPrimary = true の担当者が既に存在する
**When** client_id = "c1" に isPrimary = true で別の担当者を作成しようとする
**Then** バリデーションエラーが返され、担当者は作成されない

#### Scenario: isPrimary = true に更新するとき既存の primary があればエラーになる

**Given** client_id = "c1" に isPrimary = true の担当者（contact-A）が存在する
**When** 同じ client_id の別の担当者（contact-B）を isPrimary = true に更新しようとする
**Then** バリデーションエラーが返され、更新は行われない
