# データモデル設計

## 1. 概要

ドメイン設計で定義した集約・エンティティ・値オブジェクトを、リレーショナルデータベース（PostgreSQL）上のテーブルとして実現する。本書はドメイン設計の物理的な実装を定義する。

## 2. 設計方針

- 各集約ルートは独立したテーブルとする。
- 集約内のエンティティは集約ルートへの外部キーを持つ別テーブルとする。
- 値オブジェクトは原則として集約ルートのカラムまたは JSON 型として埋め込む。
- すべてのテーブルに `organization_id` カラムを持ち、テナント分離をクエリレベルで保証する。
- 主キーには UUID を使用する。
- 列挙型は PostgreSQL の `pgEnum` で定義する。
- タイムスタンプは `timestamp with time zone` を使用する。

## 3. 列挙型定義

```sql
CREATE TYPE inquiry_source AS ENUM (
  'web', 'phone', 'email', 'referral', 'agent_service', 'exhibition', 'other'
);

CREATE TYPE inquiry_status AS ENUM (
  'new', 'converted', 'declined'
);

CREATE TYPE deal_phase AS ENUM (
  'proposal_prep', 'proposed', 'negotiation', 'estimate_approval', 'won', 'lost'
);

CREATE TYPE contract_type AS ENUM (
  'quasi_delegation', 'fixed_price', 'ses'
);

CREATE TYPE deal_contact_role AS ENUM (
  'key_person', 'decision_maker', 'technical', 'other'
);

CREATE TYPE meeting_type AS ENUM (
  'hearing', 'proposal', 'negotiation', 'closing', 'followup'
);

CREATE TYPE contract_status AS ENUM (
  'active', 'completed', 'cancelled'
);

CREATE TYPE renewal_type AS ENUM (
  'one_time', 'recurring'
);

CREATE TYPE invoice_status AS ENUM (
  'scheduled', 'invoiced', 'paid', 'overdue'
);

CREATE TYPE approval_request_status AS ENUM (
  'draft', 'pending', 'approved', 'rejected', 'revision', 'expired'
);

CREATE TYPE approval_step_status AS ENUM (
  'pending', 'approved', 'rejected'
);

CREATE TYPE user_role AS ENUM (
  'admin', 'manager', 'finance', 'member'
);

CREATE TYPE trigger_action AS ENUM (
  'inquiry.convert', 'contract.create', 'contract.cancel'
);

CREATE TYPE comparison_operator AS ENUM (
  'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in'
);

CREATE TYPE request_origin_type AS ENUM (
  'manual', 'system'
);
```

## 4. テーブル定義

### 4.1 組織管理

#### organizations

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| name | varchar(255) | NO | | 組織名 |
| created_at | timestamptz | NO | DEFAULT now() | |

#### users

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| organization_id | uuid | NO | FK → organizations.id | |
| name | varchar(255) | NO | | ユーザー名 |
| email | varchar(255) | NO | UNIQUE | メールアドレス |
| password_hash | varchar(255) | NO | | パスワードハッシュ |
| role | user_role | NO | DEFAULT 'member' | ロール |
| created_at | timestamptz | NO | DEFAULT now() | |

**インデックス**: `(organization_id)`, `(email)` UNIQUE

---

### 4.2 顧客管理

#### clients

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| organization_id | uuid | NO | FK → organizations.id | |
| name | varchar(255) | NO | | 企業名 |
| industry | varchar(100) | YES | | 業種 |
| size | varchar(50) | YES | | 企業規模 |
| address | text | YES | | 所在地 |
| notes | text | YES | | 備考 |
| created_at | timestamptz | NO | DEFAULT now() | |

**インデックス**: `(organization_id)`

#### client_contacts

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| client_id | uuid | NO | FK → clients.id ON DELETE CASCADE | |
| name | varchar(255) | NO | | 氏名 |
| department | varchar(100) | YES | | 部署 |
| position | varchar(100) | YES | | 役職 |
| email | varchar(255) | YES | | メールアドレス |
| phone | varchar(50) | YES | | 電話番号 |
| is_primary | boolean | NO | DEFAULT false | 主担当者か |
| created_at | timestamptz | NO | DEFAULT now() | |

**インデックス**: `(client_id)`

---

### 4.3 営業管理

#### inquiries

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| organization_id | uuid | NO | FK → organizations.id | |
| title | varchar(255) | NO | | 件名 |
| description | text | YES | | 概要 |
| source | inquiry_source | NO | | 引合経路 |
| budget | integer | YES | | 想定予算 |
| timeline | varchar(255) | YES | | 希望時期 |
| status | inquiry_status | NO | DEFAULT 'new' | 状態 |
| client_id | uuid | YES | FK → clients.id | 顧客 |
| created_at | timestamptz | NO | DEFAULT now() | |

**インデックス**: `(organization_id)`, `(organization_id, status)`, `(client_id)`

#### deals

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| organization_id | uuid | NO | FK → organizations.id | |
| title | varchar(255) | NO | | 案件名 |
| description | text | YES | | 概要 |
| phase | deal_phase | NO | DEFAULT 'proposal_prep' | フェーズ |
| contract_type | contract_type | YES | | 想定契約形態 |
| estimated_amount | integer | YES | | 想定金額 |
| expected_close_date | date | YES | | 受注見込み時期 |
| client_id | uuid | NO | FK → clients.id | 顧客 |
| inquiry_id | uuid | YES | FK → inquiries.id, UNIQUE | 元の引合 |
| created_at | timestamptz | NO | DEFAULT now() | |

**インデックス**: `(organization_id)`, `(organization_id, phase)`, `(client_id)`, `(inquiry_id)` UNIQUE

**制約**: `inquiry_id` の UNIQUE 制約により 1 引合 1 案件を保証する。

#### deal_contacts

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| deal_id | uuid | NO | FK → deals.id ON DELETE CASCADE | |
| contact_id | uuid | NO | FK → client_contacts.id | 顧客担当者 |
| role | deal_contact_role | NO | | 案件における役割 |
| created_at | timestamptz | NO | DEFAULT now() | |

**インデックス**: `(deal_id)`, `(deal_id, contact_id)` UNIQUE

**制約**: 同一案件に同一担当者は 1 回のみ登録可能。

#### meetings

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| organization_id | uuid | NO | FK → organizations.id | |
| deal_id | uuid | YES | FK → deals.id | 案件 |
| inquiry_id | uuid | YES | FK → inquiries.id | 引合 |
| type | meeting_type | NO | | 商談種別 |
| date | timestamptz | NO | | 実施日時 |
| summary | text | YES | | 議事要旨 |
| body | text | YES | | 詳細議事録 |
| hearing_data | jsonb | YES | | ヒアリング固有情報 |
| action_items | jsonb | NO | DEFAULT '[]' | アクションアイテム |
| attendees | jsonb | NO | DEFAULT '[]' | 出席者 |
| created_at | timestamptz | NO | DEFAULT now() | |

**インデックス**: `(organization_id)`, `(deal_id)`, `(inquiry_id)`

**制約**: `deal_id` と `inquiry_id` の少なくとも一方が NOT NULL であること（CHECK 制約）。

```sql
CHECK (deal_id IS NOT NULL OR inquiry_id IS NOT NULL)
```

**JSON 構造: hearing_data**
```json
{
  "challenge": "string",
  "budget": "string",
  "decisionMaker": "string",
  "timeline": "string",
  "competitors": "string"
}
```

**JSON 構造: action_items**
```json
[
  {
    "description": "string",
    "assigneeId": "uuid | null",
    "dueDate": "date | null",
    "completed": "boolean"
  }
]
```

**JSON 構造: attendees**
```json
[
  {
    "userId": "uuid | null",
    "contactId": "uuid | null",
    "name": "string",
    "isExternal": "boolean"
  }
]
```

---

### 4.4 契約・請求管理

#### contracts

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| organization_id | uuid | NO | FK → organizations.id | |
| deal_id | uuid | NO | FK → deals.id | 案件 |
| title | varchar(255) | NO | | 契約名 |
| contract_type | contract_type | NO | | 契約形態 |
| amount | integer | NO | | 契約金額 |
| start_date | date | NO | | 契約開始日 |
| end_date | date | YES | | 契約終了日 |
| renewal_type | renewal_type | NO | | 更新種別 |
| status | contract_status | NO | DEFAULT 'active' | 状態 |
| created_at | timestamptz | NO | DEFAULT now() | |

**インデックス**: `(organization_id)`, `(organization_id, status)`, `(deal_id)`

**制約**:
```sql
CHECK (end_date IS NULL OR start_date <= end_date)
CHECK (amount > 0)
```

#### invoices

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| organization_id | uuid | NO | FK → organizations.id | |
| contract_id | uuid | NO | FK → contracts.id | 契約 |
| amount | integer | NO | | 請求金額 |
| issue_date | date | NO | | 請求日 |
| due_date | date | NO | | 支払期日 |
| paid_at | timestamptz | YES | | 入金日 |
| status | invoice_status | NO | DEFAULT 'scheduled' | 状態 |
| created_at | timestamptz | NO | DEFAULT now() | |

**インデックス**: `(organization_id)`, `(organization_id, status)`, `(contract_id)`

**制約**:
```sql
CHECK (issue_date <= due_date)
CHECK (amount > 0)
```

---

### 4.5 承認ワークフロー

#### approval_policies

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| organization_id | uuid | NO | FK → organizations.id | |
| name | varchar(255) | NO | | ポリシー名 |
| description | text | YES | | 説明 |
| trigger_action | trigger_action | NO | | トリガーアクション |
| condition_field | varchar(100) | YES | | 条件フィールド |
| condition_operator | comparison_operator | YES | | 条件演算子 |
| condition_value | varchar(255) | YES | | 条件値 |
| template_id | uuid | NO | FK → approval_templates.id | 承認テンプレート |
| is_active | boolean | NO | DEFAULT true | 有効/無効 |
| created_at | timestamptz | NO | DEFAULT now() | |

**インデックス**: `(organization_id)`, `(organization_id, trigger_action, is_active)`

**制約**: 条件フィールドが設定されている場合は演算子と値も必須。
```sql
CHECK (
  (condition_field IS NULL AND condition_operator IS NULL AND condition_value IS NULL) OR
  (condition_field IS NOT NULL AND condition_operator IS NOT NULL AND condition_value IS NOT NULL)
)
```

#### approval_templates

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| organization_id | uuid | NO | FK → organizations.id | |
| name | varchar(255) | NO | | テンプレート名 |
| description | text | YES | | 説明 |
| steps | jsonb | NO | | ステップ定義 |
| form_fields | jsonb | NO | DEFAULT '[]' | フォームフィールド定義 |
| created_at | timestamptz | NO | DEFAULT now() | |

**インデックス**: `(organization_id)`

**JSON 構造: steps**
```json
[
  {
    "order": 1,
    "name": "部長承認",
    "approverRole": "manager",
    "approverId": null,
    "deadlineDays": 3
  }
]
```

**JSON 構造: form_fields**
```json
[
  {
    "key": "reason",
    "label": "申請理由",
    "type": "textarea",
    "required": true,
    "options": null
  }
]
```

#### approval_requests

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| organization_id | uuid | NO | FK → organizations.id | |
| template_id | uuid | NO | FK → approval_templates.id | テンプレート |
| title | varchar(255) | NO | | 件名 |
| applicant_id | uuid | NO | FK → users.id | 申請者 |
| status | approval_request_status | NO | DEFAULT 'draft' | 状態 |
| form_data | jsonb | YES | | 申請データ |
| origin_type | request_origin_type | NO | | 起動パターン |
| origin_policy_id | uuid | YES | FK → approval_policies.id | 適用ポリシー |
| origin_trigger_action | trigger_action | YES | | トリガーアクション |
| origin_trigger_entity_id | uuid | YES | | 対象エンティティ ID |
| created_at | timestamptz | NO | DEFAULT now() | |

**インデックス**: `(organization_id)`, `(organization_id, status)`, `(applicant_id)`, `(origin_trigger_entity_id)`

**制約**: システム連動の場合は origin の詳細が必須。
```sql
CHECK (
  (origin_type = 'manual' AND origin_policy_id IS NULL) OR
  (origin_type = 'system' AND origin_policy_id IS NOT NULL
    AND origin_trigger_action IS NOT NULL
    AND origin_trigger_entity_id IS NOT NULL)
)
```

#### approval_steps

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| request_id | uuid | NO | FK → approval_requests.id ON DELETE CASCADE | 承認リクエスト |
| "order" | integer | NO | | 実行順序 |
| name | varchar(255) | NO | | ステップ名 |
| approver_role | user_role | YES | | 承認者ロール |
| approver_id | uuid | YES | FK → users.id | 承認者ユーザー |
| status | approval_step_status | NO | DEFAULT 'pending' | 状態 |
| actor_id | uuid | YES | FK → users.id | 実際の承認者 |
| comment | text | YES | | コメント |
| deadline | timestamptz | YES | | 承認期限 |
| decided_at | timestamptz | YES | | 決定日時 |

**インデックス**: `(request_id)`, `(request_id, "order")`

**制約**: 承認者ロールまたは承認者ユーザーのいずれかは必須。
```sql
CHECK (approver_role IS NOT NULL OR approver_id IS NOT NULL)
```

#### approval_delegations

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| organization_id | uuid | NO | FK → organizations.id | |
| from_user_id | uuid | NO | FK → users.id | 委任元 |
| to_user_id | uuid | NO | FK → users.id | 委任先 |
| from_user_role | user_role | NO | | 委任元のロール |
| start_date | date | NO | | 開始日 |
| end_date | date | NO | | 終了日 |
| is_active | boolean | NO | DEFAULT true | 有効/無効 |
| created_at | timestamptz | NO | DEFAULT now() | |

**インデックス**: `(organization_id)`, `(to_user_id, is_active)`, `(from_user_id)`

**制約**:
```sql
CHECK (start_date <= end_date)
CHECK (from_user_id != to_user_id)
```

---

### 4.6 監査・通知

#### audit_logs

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| organization_id | uuid | NO | FK → organizations.id | |
| actor_id | uuid | NO | FK → users.id | 操作者 |
| action | varchar(100) | NO | | 操作種別 |
| target_type | varchar(50) | NO | | 対象種別 |
| target_id | uuid | NO | | 対象 ID |
| metadata | jsonb | YES | | 追加情報 |
| created_at | timestamptz | NO | DEFAULT now() | |

**インデックス**: `(organization_id, created_at)`, `(organization_id, target_type, target_id)`, `(actor_id)`

#### webhook_endpoints

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| organization_id | uuid | NO | FK → organizations.id | |
| url | varchar(2048) | NO | | 配信先 URL |
| events | jsonb | NO | | 購読イベント種別の配列 |
| secret | varchar(255) | NO | | 署名検証用シークレット |
| is_active | boolean | NO | DEFAULT true | 有効/無効 |
| created_at | timestamptz | NO | DEFAULT now() | |

**インデックス**: `(organization_id)`

#### webhook_deliveries

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| endpoint_id | uuid | NO | FK → webhook_endpoints.id | エンドポイント |
| event | varchar(100) | NO | | イベント種別 |
| payload | jsonb | NO | | 配信ペイロード |
| status | varchar(20) | NO | DEFAULT 'pending' | 配信状態 |
| response_status | integer | YES | | レスポンスコード |
| response_body | text | YES | | レスポンスボディ |
| attempts | integer | NO | DEFAULT 0 | 試行回数 |
| delivered_at | timestamptz | YES | | 配信完了日時 |
| created_at | timestamptz | NO | DEFAULT now() | |

**インデックス**: `(endpoint_id)`, `(endpoint_id, status)`

## 5. ER 図（概要）

```
organizations ─┬── users
               ├── clients ──── client_contacts
               ├── inquiries
               ├── deals ──── deal_contacts
               ├── meetings
               ├── contracts ──── invoices
               ├── approval_policies
               ├── approval_templates
               ├── approval_requests ──── approval_steps
               ├── approval_delegations
               ├── audit_logs
               └── webhook_endpoints ──── webhook_deliveries

inquiries ──→ clients (任意)
deals ──→ clients (必須)
deals ──→ inquiries (任意, 1:1)
deal_contacts ──→ client_contacts
meetings ──→ deals (任意)
meetings ──→ inquiries (任意, CHECK で少なくとも一方必須)
contracts ──→ deals
invoices ──→ contracts
approval_policies ──→ approval_templates
approval_requests ──→ approval_templates
approval_requests ──→ approval_policies (システム連動の場合)
```
