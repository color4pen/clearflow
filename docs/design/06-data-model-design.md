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

CREATE TYPE interaction_kind AS ENUM (
  'meeting', 'call', 'email', 'contract_adjustment', 'invoice_adjustment'
);

-- meeting_type は kind = meeting（商談）の商談種別を表す。
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

CREATE TYPE request_status AS ENUM (
  'draft', 'pending', 'approved', 'rejected', 'revision', 'expired'
);

CREATE TYPE approval_step_status AS ENUM (
  'pending', 'approved', 'rejected'
);

CREATE TYPE role AS ENUM (
  'admin', 'member', 'manager', 'finance'
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
| email_verified | timestamptz | YES | | メール確認日時（Auth.js 互換） |
| image | text | YES | | プロフィール画像 URL（Auth.js 互換） |
| hashed_password | text | NO | | パスワードハッシュ |
| role | role | NO | DEFAULT 'member' | ロール |
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
| client_id | uuid | NO | FK → clients.id | |
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

#### interactions（顧客接点）

顧客との接点（商談・電話・メール・契約調整・請求調整など）を記録する。商談は `kind = meeting` の一種で、既存 `meetings` テーブルを一般化したもの。

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| organization_id | uuid | NO | FK → organizations.id | |
| kind | interaction_kind | NO | | 接点種別（meeting = 商談 / call = 電話 / email = メール / contract_adjustment = 契約調整 / invoice_adjustment = 請求調整） |
| deal_id | uuid | YES | FK → deals.id | 関連先: 案件 |
| inquiry_id | uuid | YES | FK → inquiries.id | 関連先: 引合 |
| contract_id | uuid | YES | FK → contracts.id | 関連先: 契約 |
| invoice_id | uuid | YES | FK → invoices.id | 関連先: 請求 |
| client_id | uuid | YES | FK → clients.id | 関連先: 顧客 |
| meeting_type | meeting_type | YES | | 商談種別（kind = meeting のときのみ。ヒアリング/提案/交渉/クロージング/フォローアップ） |
| date | timestamptz | NO | | 実施日時 |
| location | text | YES | | 場所 |
| attendees | jsonb | NO | DEFAULT '[]' | 参加者 |
| summary | text | YES | | 要旨（Markdown） |
| details | jsonb | YES | | kind 固有情報（商談のヒアリング情報など） |
| created_by_id | uuid | NO | FK → users.id | 作成者 |
| created_at | timestamptz | NO | DEFAULT now() | |
| updated_at | timestamptz | NO | DEFAULT now() | |
| version | integer | NO | DEFAULT 1 | 楽観的ロック |

**制約**: 関連先（deal / inquiry / contract / invoice / client）のうち少なくとも 1 つが NOT NULL（CHECK）。既存 `meetings` の `deal_id OR inquiry_id` を関連先全体へ一般化したもの。

```sql
CHECK (deal_id IS NOT NULL OR inquiry_id IS NOT NULL OR contract_id IS NOT NULL OR invoice_id IS NOT NULL OR client_id IS NOT NULL)
```

なお `kind = contract_adjustment` は `contract_id`、`kind = invoice_adjustment` は `invoice_id` を要する（DB の CHECK では表現せず、アプリケーション層で検証する）。

**移行（データ不可侵）**: 既存 `meetings` を `kind = meeting` として `interactions` に移行する。`deal_id`/`inquiry_id`・`type → meeting_type`・`date`・`location`・`attendees`・`summary` はそのまま、`hearing_data → details` に保持する。列挙した以外の共通列（`organization_id` / `created_by_id` / `created_at` / `updated_at` / `version` 等）はそのまま継承し、新規の関連先列（`contract_id` / `invoice_id` / `client_id`）は `kind = meeting` の移行行では NULL とする。レガシーの `meetings.action_items`（jsonb）は移さない（`action_items` テーブルが正）。`action_items.meeting_id` は `interaction_id` に置き換える。監査ログは追記専用のため既存 `meeting.*` 行は書き換えず、`kind = meeting` の顧客接点として扱う（新規は `interaction.create` / `interaction.update` に kind を付して記録）。

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
| assignee_id | uuid | YES | FK → users.id ON DELETE SET NULL | 担当者 |
| due_date | timestamptz | YES | | 期日 |
| done | boolean | NO | DEFAULT false | 完了状態 |
| interaction_id | uuid | YES | FK → interactions.id ON DELETE SET NULL | 顧客接点（商談） |
| deal_id | uuid | YES | FK → deals.id ON DELETE SET NULL | 案件 |
| inquiry_id | uuid | YES | FK → inquiries.id ON DELETE SET NULL | 引合 |
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

#### requests

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| organization_id | uuid | NO | FK → organizations.id | |
| template_id | uuid | YES | FK → approval_templates.id ON DELETE SET NULL | テンプレート |
| title | text | NO | | 件名 |
| creator_id | uuid | NO | FK → users.id | 申請者 |
| status | request_status | NO | DEFAULT 'draft' | 状態 |
| form_data | jsonb | NO | DEFAULT '{}' | 申請データ |
| origin_type | text | NO | DEFAULT 'manual' | 起動パターン |
| origin_policy_id | uuid | YES | FK → approval_policies.id | 適用ポリシー |
| origin_trigger_action | text | YES | | トリガーアクション |
| origin_trigger_entity_id | uuid | YES | | 対象エンティティ ID |
| created_at | timestamptz | NO | DEFAULT now() | |
| updated_at | timestamptz | NO | DEFAULT now() | |
| version | integer | NO | DEFAULT 1 | 楽観的ロック |

**制約**:
```sql
CHECK (
  (origin_type = 'manual' AND origin_policy_id IS NULL
    AND origin_trigger_action IS NULL
    AND origin_trigger_entity_id IS NULL) OR
  (origin_type = 'system' AND origin_policy_id IS NOT NULL
    AND origin_trigger_action IS NOT NULL
    AND origin_trigger_entity_id IS NOT NULL)
)
```

#### approval_steps

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| request_id | uuid | NO | FK → requests.id | 承認リクエスト |
| step_order | integer | NO | | 実行順序 |
| name | text | YES | | ステップ名 |
| approver_role | text | NO | | 承認者ロール |
| approver_id | uuid | YES | FK → users.id | 承認者ユーザー |
| status | approval_step_status | NO | DEFAULT 'pending' | 状態 |
| approved_by | uuid | YES | FK → users.id | 実際の承認者 |
| comment | text | YES | | コメント |
| organization_id | uuid | NO | FK → organizations.id | テナント |
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
| target_id | text | NO | | 対象 ID |
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

---

### 4.8 認証・基盤

認証（Auth.js アダプタ）と基盤機能（冪等性・レート制限）のテーブル。Auth.js アダプタ系とレート制限は framework・横断機能の都合上 `organization_id` を持たない（§2 方針の例外）。

#### accounts

Auth.js アダプタ用。外部プロバイダのアカウント連携を保持する。

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| user_id | uuid | NO | FK → users.id ON DELETE CASCADE | |
| type | text | NO | | |
| provider | text | NO | | プロバイダ |
| provider_account_id | text | NO | | プロバイダ側アカウント ID |
| refresh_token | text | YES | | |
| access_token | text | YES | | |
| expires_at | integer | YES | | |
| token_type | text | YES | | |
| scope | text | YES | | |
| id_token | text | YES | | |
| session_state | text | YES | | |

**制約**: PRIMARY KEY `(provider, provider_account_id)`

#### sessions

Auth.js アダプタ用のセッション。

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| session_token | text | NO | PK | セッショントークン |
| user_id | uuid | NO | FK → users.id ON DELETE CASCADE | |
| expires | timestamptz | NO | | 有効期限 |

#### verification_tokens

Auth.js アダプタ用の検証トークン。

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| identifier | text | NO | | |
| token | text | NO | | |
| expires | timestamptz | NO | | 有効期限 |

**制約**: PRIMARY KEY `(identifier, token)`

#### idempotency_keys

操作の冪等性を保証するための記録。

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| key | text | NO | | 冪等キー |
| action | text | NO | | 対象アクション |
| result | jsonb | NO | | 実行結果（再実行時に返す） |
| organization_id | uuid | NO | FK → organizations.id | テナント |
| created_at | timestamptz | NO | DEFAULT now() | |

**制約**: `(key, organization_id)` UNIQUE

#### rate_limit_records

レート制限のカウンタ。

| カラム | 型 | NULL | 制約 | 説明 |
|---|---|---|---|---|
| id | uuid | NO | PK, DEFAULT gen_random_uuid() | |
| key | text | NO | UNIQUE | レート制限キー |
| count | integer | NO | | カウント |
| window_start | timestamptz | NO | | ウィンドウ開始時刻 |
| created_at | timestamptz | NO | DEFAULT now() | |

## 5. ER 図（概要）

```
organizations ─┬── users
               ├── clients ──── client_contacts
               ├── inquiries
               ├── deals ──── deal_contacts
               ├── interactions
               ├── action_items
               ├── contracts ──── invoices
               ├── approval_policies
               ├── approval_templates
               ├── requests ──── approval_steps
               ├── approval_delegations
               ├── audit_logs
               ├── revenue_targets
               ├── webhook_endpoints ──── webhook_deliveries
               ├── idempotency_keys
               └── watches

inquiries ──→ clients (任意)
deals ──→ clients (必須)
deals ──→ inquiries (任意, 1:1)
deal_contacts ──→ client_contacts
interactions ──→ deals / inquiries / contracts / invoices / clients (各任意, CHECK で少なくとも 1 つ必須)
contracts ──→ deals
contracts ──→ clients (非正規化)
invoices ──→ contracts
approval_policies ──→ approval_templates
requests ──→ approval_templates
requests ──→ approval_policies (システム連動の場合)
deals ──→ requests (見積承認, 任意)
action_items ──→ interactions (任意)
action_items ──→ deals (任意)
action_items ──→ inquiries (任意)
action_items ──→ users (担当者, 任意)
action_items ──→ users (作成者, 必須)
watches ──→ users
watches ──→ deals
accounts ──→ users (Auth.js アダプタ)
sessions ──→ users (Auth.js アダプタ)
idempotency_keys ──→ organizations
verification_tokens / rate_limit_records は FK を持たない独立テーブル
```
