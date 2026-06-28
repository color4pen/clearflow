# データモデル設計

## 1. 概要

ドメイン設計で定義した集約・エンティティ・値オブジェクトを、リレーショナルデータベース（PostgreSQL）上のテーブルとして実現する。本書はドメイン設計の物理的な実装を定義する。

## 2. 設計方針

- 各集約ルートは独立したテーブルとする。
- 集約内のエンティティは集約ルートへの外部キーを持つ別テーブルとする。
- 値オブジェクトは原則として集約ルートのカラムまたは JSON 型として埋め込む。
- すべてのテーブルに `organization_id` カラムを持ち、テナント分離をクエリレベルで保証する。
- 主キーには UUID を使用する。
- 列挙型は pgEnum で定義する。ただし拡張頻度が高い値（trigger_action, contract_type 等）は text 型で柔軟性を持たせ、アプリケーション層の TypeScript 型で制約する。
- タイムスタンプは `timestamp with time zone` を使用する。
- CHECK 制約は DB レベルで実装可能なもののみ定義する。複雑なビジネスルールはアプリケーション層で検証する。

## 3. 列挙型定義

```sql
CREATE TYPE inquiry_source AS ENUM (
  'web', 'phone', 'email', 'referral', 'agent_service', 'exhibition', 'other'
);

CREATE TYPE inquiry_status AS ENUM (
  'new', 'converted', 'declined'
);

CREATE TYPE deal_phase AS ENUM (
  'proposal_prep', 'proposed', 'negotiation', 'won', 'lost'
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

CREATE TYPE webhook_delivery_status AS ENUM (
  'pending', 'delivered', 'failed'
);
```

text 型で管理する値（pgEnum にしない）:
- `trigger_action` — inquiry.convert, contract.create, contract.cancel 等。拡張時にマイグレーション不要
- `contract_type` — quasi_delegation, fixed_price, ses。TypeScript の union 型で制約
- `deal_contact_role` — key_person, decision_maker, technical, other
- `comparison_operator` — eq, neq, gt, gte, lt, lte, in
- `request_origin_type` — manual, system

## 4. テーブル定義

### 4.1 組織管理

#### organizations

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| name | text | NO | | 組織名 |
| created_at | timestamptz | NO | DEFAULT now() | |

#### users

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| organization_id | uuid | NO | FK → organizations.id | |
| name | text | NO | | ユーザー名 |
| email | text | NO | UNIQUE | メールアドレス |
| password_hash | text | NO | | パスワードハッシュ |
| role | user_role | NO | DEFAULT 'member' | ロール |
| notifications_last_seen_at | timestamptz | YES | | 通知を最後に確認した時刻（未読判定の基準） |
| created_at | timestamptz | NO | DEFAULT now() | |

---

### 4.2 顧客管理

#### clients

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| organization_id | uuid | NO | FK → organizations.id | |
| name | text | NO | | 企業名 |
| industry | text | YES | | 業種 |
| size | text | YES | | 企業規模 |
| address | text | YES | | 所在地 |
| notes | text | YES | | 備考 |
| created_at | timestamptz | NO | DEFAULT now() | |
| updated_at | timestamptz | NO | DEFAULT now() | |

#### client_contacts

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| client_id | uuid | NO | FK → clients.id ON DELETE CASCADE | |
| name | text | NO | | 氏名 |
| department | text | YES | | 部署 |
| position | text | YES | | 役職 |
| email | text | YES | | メールアドレス |
| phone | text | YES | | 電話番号 |
| is_primary | boolean | NO | DEFAULT false | 主担当者か |
| created_at | timestamptz | NO | DEFAULT now() | |

---

### 4.3 営業管理

#### inquiries

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| organization_id | uuid | NO | FK → organizations.id | |
| client_id | uuid | YES | FK → clients.id | 顧客 |
| title | text | NO | | 件名 |
| contact_note | text | YES | | 問い合わせ内容（原文・メモ） |
| description | text | YES | | 概要（営業の解釈） |
| source | inquiry_source | NO | | 引合経路 |
| status | inquiry_status | NO | DEFAULT 'new' | 状態 |
| assignee_id | uuid | YES | FK → users.id | 社内担当者 |
| budget | integer | YES | | 想定予算 |
| timeline | text | YES | | 希望時期 |
| created_at | timestamptz | NO | DEFAULT now() | |
| updated_at | timestamptz | NO | DEFAULT now() | |
| version | integer | NO | DEFAULT 1 | 楽観的ロック |

#### deals

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| organization_id | uuid | NO | FK → organizations.id | |
| inquiry_id | uuid | YES | FK → inquiries.id, UNIQUE | 元の引合 |
| client_id | uuid | NO | FK → clients.id | 顧客 |
| title | text | NO | | 案件名 |
| description | text | YES | | 概要 |
| phase | deal_phase | NO | DEFAULT 'proposal_prep' | フェーズ |
| estimated_amount | integer | YES | | 想定金額 |
| estimated_start_date | timestamptz | YES | | 想定開始日 |
| estimated_end_date | timestamptz | YES | | 想定終了日 |
| contract_type | text | YES | | 想定契約形態 |
| assignee_id | uuid | YES | FK → users.id | 営業担当者 |
| technical_lead_id | uuid | YES | FK → users.id | 技術リード |
| estimate_request_id | uuid | YES | FK → requests.id ON DELETE SET NULL | 見積承認リクエスト |
| notes | text | YES | | 備考 |
| created_at | timestamptz | NO | DEFAULT now() | |
| updated_at | timestamptz | NO | DEFAULT now() | |
| version | integer | NO | DEFAULT 1 | 楽観的ロック |

**制約**: `inquiry_id` の UNIQUE 制約により 1 引合 1 案件を保証する。

#### deal_contacts

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| deal_id | uuid | NO | FK → deals.id | |
| contact_id | uuid | NO | FK → client_contacts.id | 顧客担当者 |
| role | text | NO | | 案件における役割 |
| created_at | timestamptz | NO | DEFAULT now() | |

**制約**: `(deal_id, contact_id)` UNIQUE

#### meetings

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| organization_id | uuid | NO | FK → organizations.id | |
| deal_id | uuid | YES | FK → deals.id | 案件 |
| inquiry_id | uuid | YES | FK → inquiries.id | 引合 |
| type | meeting_type | NO | | 商談種別 |
| date | timestamptz | NO | | 実施日時 |
| location | text | YES | | 場所 |
| attendees | jsonb | NO | DEFAULT '[]' | 出席者 |
| summary | text | YES | | 議事要旨（Markdown） |
| action_items | jsonb | NO | DEFAULT '[]' | アクションアイテム（非推奨: action_items テーブルに移行済み。後方互換のため残置） |
| hearing_data | jsonb | YES | | ヒアリング固有情報 |
| created_by_id | uuid | NO | FK → users.id | 作成者 |
| created_at | timestamptz | NO | DEFAULT now() | |
| updated_at | timestamptz | NO | DEFAULT now() | |
| version | integer | NO | DEFAULT 1 | 楽観的ロック |

**制約**:
```sql
CHECK (deal_id IS NOT NULL OR inquiry_id IS NOT NULL)
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

**JSON 構造: action_items（非推奨）**
```json
[
  {
    "description": "string",
    "assignee": "string",
    "dueDate": "string | null",
    "done": "boolean"
  }
]
```

#### action_items

商談・案件・引合に紐づくタスク。紐づけ先なし（個人タスク）も許可する。

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| organization_id | uuid | NO | FK → organizations.id | テナント |
| description | text | NO | | 内容 |
| assignee_id | uuid | YES | FK → users.id | 担当者 |
| due_date | timestamptz | YES | | 期日 |
| done | boolean | NO | DEFAULT false | 完了状態 |
| meeting_id | uuid | YES | FK → meetings.id | 商談 |
| deal_id | uuid | YES | FK → deals.id | 案件 |
| inquiry_id | uuid | YES | FK → inquiries.id | 引合 |
| created_by_id | uuid | NO | FK → users.id | 作成者 |
| created_at | timestamptz | NO | DEFAULT now() | |
| updated_at | timestamptz | NO | DEFAULT now() | |
| version | integer | NO | DEFAULT 1 | 楽観的ロック |

---

### 4.4 契約・請求管理

#### contracts

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| organization_id | uuid | NO | FK → organizations.id | |
| deal_id | uuid | NO | FK → deals.id | 案件 |
| client_id | uuid | NO | FK → clients.id | 顧客（非正規化） |
| title | text | NO | | 契約名 |
| contract_type | text | YES | | 契約形態 |
| amount | integer | NO | | 契約金額 |
| start_date | timestamptz | NO | | 契約開始日 |
| end_date | timestamptz | YES | | 契約終了日 |
| payment_terms | text | YES | | 支払条件 |
| renewal_type | renewal_type | NO | DEFAULT 'one_time' | 更新種別 |
| renewal_cycle | text | YES | | 更新サイクル |
| status | contract_status | NO | DEFAULT 'active' | 状態 |
| created_at | timestamptz | NO | DEFAULT now() | |
| updated_at | timestamptz | NO | DEFAULT now() | |
| version | integer | NO | DEFAULT 1 | 楽観的ロック |

#### invoices

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| organization_id | uuid | NO | FK → organizations.id | |
| contract_id | uuid | NO | FK → contracts.id | 契約 |
| title | text | NO | | 請求名 |
| amount | integer | NO | | 請求金額 |
| issue_date | timestamptz | YES | | 請求予定日 |
| due_date | timestamptz | NO | | 支払期日 |
| invoiced_at | timestamptz | YES | | 実際の発行日時 |
| paid_at | timestamptz | YES | | 入金日 |
| status | invoice_status | NO | DEFAULT 'scheduled' | 状態 |
| notes | text | YES | | 備考 |
| created_at | timestamptz | NO | DEFAULT now() | |
| updated_at | timestamptz | NO | DEFAULT now() | |
| version | integer | NO | DEFAULT 1 | 楽観的ロック |

---

### 4.5 承認ワークフロー

#### approval_policies

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| organization_id | uuid | NO | FK → organizations.id | |
| name | text | NO | | ポリシー名 |
| description | text | YES | | 説明 |
| trigger_action | text | NO | | トリガーアクション |
| condition_field | text | YES | | 条件フィールド |
| condition_operator | text | YES | | 条件演算子 |
| condition_value | text | YES | | 条件値 |
| template_id | uuid | NO | FK → approval_templates.id | 承認テンプレート |
| is_active | boolean | NO | DEFAULT true | 有効/無効 |
| created_at | timestamptz | NO | DEFAULT now() | |

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
| name | text | NO | | テンプレート名 |
| steps | jsonb | NO | | ステップ定義 |
| fields | jsonb | NO | DEFAULT '[]' | フォームフィールド定義 |
| created_at | timestamptz | NO | DEFAULT now() | |

#### approval_requests

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| organization_id | uuid | NO | FK → organizations.id | |
| template_id | uuid | NO | FK → approval_templates.id | テンプレート |
| title | text | NO | | 件名 |
| creator_id | uuid | NO | FK → users.id | 申請者 |
| status | approval_request_status | NO | DEFAULT 'draft' | 状態 |
| form_data | jsonb | NO | DEFAULT '{}' | 申請データ |
| origin_type | text | NO | DEFAULT 'manual' | 起動パターン |
| origin_policy_id | uuid | YES | FK → approval_policies.id ON DELETE RESTRICT | 適用ポリシー |
| origin_trigger_action | text | YES | | トリガーアクション |
| origin_trigger_entity_id | uuid | YES | | 対象エンティティ ID |
| created_at | timestamptz | NO | DEFAULT now() | |
| updated_at | timestamptz | NO | DEFAULT now() | |
| version | integer | NO | DEFAULT 1 | 楽観的ロック |

**制約**:
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
| step_order | integer | NO | | 実行順序 |
| name | text | YES | | ステップ名 |
| approver_role | user_role | YES | | 承認者ロール |
| approver_id | uuid | YES | FK → users.id | 承認者ユーザー |
| status | approval_step_status | NO | DEFAULT 'pending' | 状態 |
| approved_by | uuid | YES | FK → users.id | 実際の承認者 |
| comment | text | YES | | コメント |
| deadline | timestamptz | YES | | 承認期限 |
| approved_at | timestamptz | YES | | 承認日時 |
| version | integer | NO | DEFAULT 1 | 楽観的ロック |

#### approval_delegations

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| organization_id | uuid | NO | FK → organizations.id | |
| from_user_id | uuid | NO | FK → users.id | 委任元 |
| to_user_id | uuid | NO | FK → users.id | 委任先 |
| from_user_role | text | NO | | 委任元のロール |
| start_date | timestamptz | NO | | 開始日 |
| end_date | timestamptz | NO | | 終了日 |
| is_active | boolean | NO | DEFAULT true | 有効/無効 |
| created_at | timestamptz | NO | DEFAULT now() | |

---

### 4.6 売上管理

#### revenue_targets

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| organization_id | uuid | NO | FK → organizations.id | |
| period_start | timestamptz | NO | | 期間開始 |
| period_end | timestamptz | NO | | 期間終了 |
| target_amount | integer | NO | | 目標金額 |
| created_at | timestamptz | NO | DEFAULT now() | |
| updated_at | timestamptz | NO | DEFAULT now() | |
| version | integer | NO | DEFAULT 1 | 楽観的ロック |

---

### 4.7 監査・通知

#### audit_logs

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| organization_id | uuid | NO | FK → organizations.id | |
| actor_id | uuid | NO | FK → users.id | 操作者 |
| action | text | NO | | 操作種別 |
| target_type | text | NO | | 対象種別 |
| target_id | uuid | NO | | 対象 ID |
| metadata | jsonb | YES | | 追加情報 |
| created_at | timestamptz | NO | DEFAULT now() | |

#### webhook_endpoints

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| organization_id | uuid | NO | FK → organizations.id | |
| url | text | NO | | 配信先 URL |
| events | text[] | NO | | 購読するイベント種別 |
| secret | text | NO | | 署名検証用シークレット |
| is_active | boolean | NO | DEFAULT true | 有効/無効 |
| created_at | timestamptz | NO | DEFAULT now() | |
| updated_at | timestamptz | NO | DEFAULT now() | |

#### webhook_deliveries

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| endpoint_id | uuid | NO | FK → webhook_endpoints.id ON DELETE CASCADE | エンドポイント |
| event | text | NO | | イベント種別 |
| payload | jsonb | NO | | 配信ペイロード |
| status | webhook_delivery_status | NO | DEFAULT 'pending' | 配信状態 |
| status_code | integer | YES | | レスポンスのステータスコード |
| attempts | integer | NO | DEFAULT 0 | 試行回数 |
| last_attempt_at | timestamptz | YES | | 最終試行日時 |
| next_retry_at | timestamptz | YES | | 次回リトライ予定日時 |
| created_at | timestamptz | NO | DEFAULT now() | |

#### watches

ユーザーが案件を購読（ウォッチ）し、その案件配下の更新を通知として受け取るための登録。

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| user_id | uuid | NO | FK → users.id | 購読するユーザー |
| deal_id | uuid | NO | FK → deals.id | 対象の案件 |
| organization_id | uuid | NO | FK → organizations.id | テナント |
| created_at | timestamptz | NO | DEFAULT now() | |

**制約**: `(user_id, deal_id)` UNIQUE（同一ユーザーの同一案件への重複ウォッチを防ぐ）

## 5. ER 図（概要）

```
organizations ─┬── users
               ├── clients ──── client_contacts
               ├── inquiries
               ├── deals ──── deal_contacts
               ├── meetings
               ├── action_items
               ├── contracts ──── invoices
               ├── approval_policies
               ├── approval_templates
               ├── approval_requests ──── approval_steps
               ├── approval_delegations
               ├── audit_logs
               ├── revenue_targets
               ├── webhook_endpoints ──── webhook_deliveries
               └── watches

inquiries ──→ clients (任意)
deals ──→ clients (必須)
deals ──→ inquiries (任意, 1:1)
deal_contacts ──→ client_contacts
meetings ──→ deals (任意)
meetings ──→ inquiries (任意, CHECK で少なくとも一方必須)
contracts ──→ deals
contracts ──→ clients (非正規化)
invoices ──→ contracts
approval_policies ──→ approval_templates
approval_requests ──→ approval_templates
approval_requests ──→ approval_policies (システム連動の場合)
deals ──→ approval_requests (見積承認, 任意)
action_items ──→ meetings (任意)
action_items ──→ deals (任意)
action_items ──→ inquiries (任意)
action_items ──→ users (担当者, 任意)
action_items ──→ users (作成者, 必須)
watches ──→ users
watches ──→ deals
```
