# ドメイン設計

## 1. システム概要

受託開発企業向けの案件管理システム。引合の受付から案件化・契約・請求・売上管理までの一連の業務プロセスを支援する。

対象ユーザーは受託開発企業の営業担当・マネージャー・経理・経営層であり、OSS として多様な受託企業が導入可能な汎用性を持つ。

## 2. ビジネスプロセスの全体像

```
引合 ──→ 案件 ──→ 契約 ──→ 請求 ──→ 売上
 │         │        │        │
 │         │        │        └─ 入金確認・売上計上
 │         │        └─ 1案件に対して複数契約が存在しうる
 │         └─ 受注（不可逆）で契約フェーズへ進む
 └─ 条件に応じて承認ゲートが挟まる場合がある
```

承認ワークフローはこの業務フローの任意の地点に条件付きで挟まる横断的な仕組みであり、特定のフェーズに固定されない。

## 3. 境界づけられたコンテキスト

```
┌─────────────────────────────────────────────────┐
│                  営業管理                         │
│  引合(Inquiry) ─→ 案件(Deal) ─→ 商談記録(Meeting) │
└────────────────────────┬────────────────────────┘
                         │ 受注
┌────────────────────────▼────────────────────────┐
│               契約・請求管理                       │
│       契約(Contract) ─→ 請求(Invoice)             │
└────────────────────────┬────────────────────────┘
                         │ 入金
┌────────────────────────▼────────────────────────┐
│                 売上管理                          │
│          売上実績 ─→ 予実分析                      │
└─────────────────────────────────────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│    顧客管理       │  │   承認ワークフロー  │  │     組織管理      │
│ 顧客 ─→ 担当者    │  │ ポリシー/テンプレート│  │ テナント/ユーザー   │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

| コンテキスト | 責務 |
|---|---|
| 営業管理 | 引合の受付から案件の受注・失注までの営業プロセスを管理する |
| 契約・請求管理 | 受注後の契約締結と請求発行・入金管理を担う |
| 売上管理 | 売上実績の集計、案件収益の分析、予実管理を行う |
| 顧客管理 | 取引先企業とその担当者の情報を管理する |
| 承認ワークフロー | 業務プロセスの任意の地点に挿入可能な承認ゲートを提供する |
| 組織管理 | マルチテナント環境におけるテナントとユーザーを管理する |

## 4. 集約定義

### 4.1 引合 (Inquiry)

受託案件の起点となる問い合わせ。顧客からの接触を記録し、案件化の判断に至るまでの情報を保持する。

**集約ルート: Inquiry**

| 属性 | 型 | 必須 | 説明 |
|---|---|---|---|
| id | ID | Yes | |
| organizationId | ID | Yes | テナント識別子 |
| title | string | Yes | 引合の件名 |
| contactNote | string | No | 問い合わせ内容（メール原文、電話メモなど事実の記録） |
| description | string | No | 概要（営業の解釈・要約） |
| source | InquirySource | Yes | 引合の経路 |
| budget | number | No | 顧客の想定予算 |
| timeline | string | No | 顧客の希望時期 |
| status | InquiryStatus | Yes | 引合の状態 |
| clientId | ID | No | 顧客（引合受付時点では未特定の場合がある） |
| assigneeId | ID | No | 社内担当者 |
| createdAt | datetime | Yes | |
| updatedAt | datetime | Yes | |
| version | number | Yes | 楽観的ロック用 |

**値オブジェクト: InquirySource**

引合の流入経路を表す。仲介サービス経由の場合はマッチング費用が発生しうるため、案件化時の承認要否判定に影響する。

```
web | phone | email | referral | agent_service | exhibition | other
```

`agent_service` は仲介サービス（レディクルなど）を指す。費用が発生する経路として他の経路と区別される。

**状態遷移**

```
new ──→ converted    案件化が決定した
 │
 └──→ declined       対応しないと判断した

declined ──→ new     判断を撤回して再検討する
```

- `converted` は終端状態。一度案件化した引合は引合に戻せない。
- `declined` は `new` に戻すことができる。

**不変条件**

- 案件化（`new → converted`）には `clientId` が設定されていなければならない。
- 案件化時、引合に紐づく案件が既に存在してはならない（1引合1案件）。

**ドメインイベント**

| イベント | 発生条件 | 意味 |
|---|---|---|
| InquiryConverted | status が converted に遷移した | 案件化の判断がなされた。承認ポリシーの評価と案件の生成をトリガーする |
| InquiryDeclined | status が declined に遷移した | 引合が見送られた |

---

### 4.2 案件 (Deal)

受注を目指して営業活動を行う対象。引合から転換されるか、直接作成される。

**集約ルート: Deal**

| 属性 | 型 | 必須 | 説明 |
|---|---|---|---|
| id | ID | Yes | |
| organizationId | ID | Yes | テナント識別子 |
| title | string | Yes | 案件名 |
| description | string | No | 案件の概要 |
| phase | DealPhase | Yes | 案件のフェーズ |
| contractType | string | No | 想定される契約形態（quasi_delegation / fixed_price / ses） |
| estimatedAmount | number | No | 想定金額 |
| estimatedStartDate | datetime | No | 想定開始日 |
| estimatedEndDate | datetime | No | 想定終了日 |
| clientId | ID | Yes | 顧客 |
| inquiryId | ID | No | 元となった引合（直接作成の場合は null） |
| assigneeId | ID | No | 営業担当者 |
| technicalLeadId | ID | No | 技術リード |
| estimateRequestId | ID | No | 見積承認リクエスト |
| notes | string | No | 備考 |
| createdAt | datetime | Yes | |
| updatedAt | datetime | Yes | |
| version | number | Yes | 楽観的ロック用 |

**エンティティ: DealContact**

案件における顧客側の関係者。担当者ごとの役割を記録する。

| 属性 | 型 | 必須 | 説明 |
|---|---|---|---|
| id | ID | Yes | |
| dealId | ID | Yes | |
| contactId | ID | Yes | 顧客担当者への参照 |
| role | DealContactRole | Yes | この案件における役割 |

**値オブジェクト: DealPhase**

```
proposal_prep | proposed | negotiation | won | lost
```

- `won`（受注）と `lost`（失注）は終端フェーズ。
- それ以外のフェーズ間は自由に遷移できる。営業プロセスは必ずしも線形に進まないため、順序制約を設けない。

**値オブジェクト: ContractType**

```
quasi_delegation | fixed_price | ses
```

**値オブジェクト: DealContactRole**

```
key_person | decision_maker | technical | other
```

**状態遷移**

```
non-terminal ←──→ non-terminal    自由に遷移可能
non-terminal ───→ won             受注（不可逆）
non-terminal ───→ lost            失注（不可逆）
```

**不変条件**

- `won` / `lost` からの遷移は許可しない。
- `clientId` は必須。顧客が特定されていない案件は存在しない。
- 同一の `inquiryId` を持つ案件は 1 つだけ。

**ドメインイベント**

| イベント | 発生条件 | 意味 |
|---|---|---|
| DealWon | phase が won に遷移した | 受注が確定した。契約作成が可能になる |
| DealLost | phase が lost に遷移した | 失注した |
| DealPhaseChanged | phase が変更された | フェーズが進行または変更された |

---

### 4.3 商談記録 (Meeting)

営業活動における商談・打合せの記録。引合フェーズのヒアリングから案件フェーズの提案・交渉まで、一連の営業活動を時系列で記録する。

**集約ルート: Meeting**

| 属性 | 型 | 必須 | 説明 |
|---|---|---|---|
| id | ID | Yes | |
| organizationId | ID | Yes | テナント識別子 |
| dealId | ID | No | 案件（案件化後の商談） |
| inquiryId | ID | No | 引合（案件化前の商談） |
| type | MeetingType | Yes | 商談の種別 |
| date | datetime | Yes | 実施日時 |
| summary | string | No | 議事要旨（Markdown） |
| location | string | No | 場所 |
| hearingData | HearingData | No | ヒアリング固有の情報（type が hearing の場合） |
| createdById | ID | Yes | 作成者 |
| createdAt | datetime | Yes | |
| updatedAt | datetime | Yes | |

**値オブジェクト: MeetingType**

```
hearing | proposal | negotiation | closing | followup
```

**値オブジェクト: HearingData**

ヒアリング商談で収集する情報。

| 属性 | 型 | 説明 |
|---|---|---|
| challenge | string | 顧客の課題 |
| budget | string | 予算感 |
| decisionMaker | string | 意思決定者 |
| timeline | string | 導入時期 |
| competitors | string | 競合状況 |

**注**: アクションアイテムは独立エンティティとして切り出し済み（4.9 参照）。Meeting の JSON 埋め込みから action_items テーブルに移行された。

**値オブジェクト: Attendee**

商談の出席者。社内ユーザーまたは外部参加者を記録する。

| 属性 | 型 | 必須 | 説明 |
|---|---|---|---|
| userId | ID | No | 社内ユーザー（該当する場合） |
| contactId | ID | No | 顧客担当者（該当する場合） |
| name | string | Yes | 表示名 |
| isExternal | boolean | Yes | 社外参加者か |

**不変条件**

- `dealId` と `inquiryId` の少なくとも一方は設定されていなければならない。
- `hearingData` は `type` が `hearing` の場合にのみ意味を持つ。

---

### 4.4 顧客 (Client)

取引先企業を表す。引合・案件を通じて共有される。

**集約ルート: Client**

| 属性 | 型 | 必須 | 説明 |
|---|---|---|---|
| id | ID | Yes | |
| organizationId | ID | Yes | テナント識別子 |
| name | string | Yes | 企業名 |
| industry | string | No | 業種 |
| size | string | No | 企業規模 |
| address | string | No | 所在地 |
| notes | string | No | 備考 |
| createdAt | datetime | Yes | |

**エンティティ: ClientContact**

顧客企業における担当者。複数の案件で共有される。

| 属性 | 型 | 必須 | 説明 |
|---|---|---|---|
| id | ID | Yes | |
| clientId | ID | Yes | |
| name | string | Yes | 氏名 |
| department | string | No | 部署 |
| position | string | No | 役職 |
| email | string | No | メールアドレス |
| phone | string | No | 電話番号 |
| isPrimary | boolean | Yes | 主担当者か |

**不変条件**

- 同一顧客内で `isPrimary = true` の担当者は最大 1 名。

---

### 4.5 契約 (Contract)

受注した案件に対する契約。1 つの案件に対して複数の契約が存在しうる（フェーズ分割、別スコープ等）。

**集約ルート: Contract**

| 属性 | 型 | 必須 | 説明 |
|---|---|---|---|
| id | ID | Yes | |
| organizationId | ID | Yes | テナント識別子 |
| dealId | ID | Yes | 案件 |
| clientId | ID | Yes | 顧客（非正規化: Deal 経由でも取得可能だが JOIN 削減のため保持） |
| title | string | Yes | 契約名 |
| contractType | string | No | 契約形態（quasi_delegation / fixed_price / ses） |
| amount | number | Yes | 契約金額 |
| startDate | datetime | Yes | 契約開始日 |
| endDate | datetime | No | 契約終了日 |
| paymentTerms | string | No | 支払条件 |
| renewalType | RenewalType | Yes | 更新種別 |
| renewalCycle | string | No | 更新サイクル（継続契約の場合） |
| status | ContractStatus | Yes | 契約の状態 |
| createdAt | datetime | Yes | |
| updatedAt | datetime | Yes | |

**値オブジェクト: RenewalType**

```
one_time | recurring
```

**値オブジェクト: ContractStatus**

```
active | completed | cancelled
```

**状態遷移**

```
active ──→ completed    契約期間の完了または納品完了
active ──→ cancelled    契約の解除・中止
```

- `completed` と `cancelled` は終端状態。
- `active` のみ他の状態に遷移できる。

**不変条件**

- `amount` は必須。売上管理の起点となるため、金額のない契約は許可しない。
- `startDate ≤ endDate`（`endDate` が設定されている場合）。
- 契約の作成は `dealId` で参照する案件の phase が `won` である場合のみ許可する。

**ドメインイベント**

| イベント | 発生条件 | 意味 |
|---|---|---|
| ContractCreated | 契約が作成された | 売上見込みに反映される |
| ContractCompleted | status が completed に遷移した | 契約が完了した |
| ContractCancelled | status が cancelled に遷移した | 契約が解除された |

---

### 4.6 請求 (Invoice)

契約に基づく請求。1 つの契約に対して複数の請求が存在しうる（分割請求、月次請求等）。

**集約ルート: Invoice**

| 属性 | 型 | 必須 | 説明 |
|---|---|---|---|
| id | ID | Yes | |
| organizationId | ID | Yes | テナント識別子 |
| contractId | ID | Yes | 契約 |
| title | string | Yes | 請求名 |
| amount | number | Yes | 請求金額 |
| issueDate | datetime | No | 請求予定日 |
| dueDate | datetime | Yes | 支払期日 |
| invoicedAt | datetime | No | 実際の発行日時 |
| paidAt | datetime | No | 入金日 |
| status | InvoiceStatus | Yes | 請求の状態 |
| notes | string | No | 備考 |
| createdAt | datetime | Yes | |
| updatedAt | datetime | Yes | |

**値オブジェクト: InvoiceStatus**

```
scheduled | invoiced | paid | overdue
```

**状態遷移**

```
scheduled ──→ invoiced    請求書を発行した
invoiced  ──→ paid        入金が確認された
invoiced  ──→ overdue     支払期日を超過した
overdue   ──→ paid        遅延後に入金が確認された
```

- `paid` は終端状態。
- `scheduled → paid` への直接遷移は許可しない（発行を経る必要がある）。

**不変条件**

- `issueDate ≤ dueDate`。
- `paid` への遷移時に `paidAt` が設定されなければならない。
- 単発契約（`renewalType = one_time`）の場合、同一契約に紐づく請求の合計金額は契約金額を超えてはならない。

**ドメインイベント**

| イベント | 発生条件 | 意味 |
|---|---|---|
| InvoicePaid | status が paid に遷移した | 入金が確認された。売上実績に計上される |
| InvoiceOverdue | status が overdue に遷移した | 支払いが遅延している |

---

### 4.7 売上 (Revenue)

契約と請求のデータから売上を集計・分析する読み取り専用のドメイン。独自のエンティティは持たず、契約・請求・案件のデータを横断的に参照する。

**集計の観点**

| 観点 | 内容 |
|---|---|
| 月次売上 | 月ごとの入金実績の集計 |
| 案件別収益 | 案件に紐づく全契約の金額と入金状況 |
| 予実管理 | 案件パイプライン（フェーズ × 想定金額）からの売上予測と、入金実績の比較 |
| 顧客別売上 | 顧客ごとの売上集計 |

**データソース**

- 売上予測: Deal（phase × estimatedAmount）、Contract（amount × status）
- 売上実績: Invoice（status = paid の amount）
- 顧客帰属: Deal → Client の紐づけを経由

---

### 4.8 顧客担当者の役割 (Contact Roles)

顧客担当者（ClientContact）はクライアント企業に属する人物情報を管理する。案件における具体的な役割は DealContact を通じて案件ごとに定義する。

```
ClientContact（人物情報）──→ DealContact（案件における役割）
```

同一の担当者が異なる案件で異なる役割を持つことがある（A 案件では技術担当、B 案件ではキーパーソン等）。

### 4.9 アクションアイテム (ActionItem)

営業活動で発生するタスク。商談・案件・引合に紐づけられるほか、どこにも紐づかない個人タスクとしても作成できる。

**集約ルート: ActionItem**

| 属性 | 型 | 必須 | 説明 |
|---|---|---|---|
| id | ID | Yes | |
| organizationId | ID | Yes | テナント識別子 |
| description | string | Yes | 内容 |
| assigneeId | ID | No | 担当者 |
| dueDate | datetime | No | 期日 |
| done | boolean | Yes | 完了状態 |
| meetingId | ID | No | 商談（紐づく場合） |
| dealId | ID | No | 案件（紐づく場合） |
| inquiryId | ID | No | 引合（紐づく場合） |
| createdById | ID | Yes | 作成者 |
| createdAt | datetime | Yes | |
| updatedAt | datetime | Yes | |

**紐づけルール**

- meetingId, dealId, inquiryId は全て nullable。どれにも紐づかない個人タスクも許可する。
- 商談から作成した場合は meetingId と dealId の両方が設定される。
- 案件から直接作成した場合は dealId のみが設定される。

## 5. ドメイン間の関係

```
                  ┌──────────┐
                  │  顧客     │
                  │ (Client)  │
                  └────┬─────┘
                       │ clientId
              ┌────────┼────────┐
              ▼        ▼        ▼
        ┌──────────┐ ┌──────────┐
        │  引合     │ │  案件     │
        │(Inquiry) │→│ (Deal)   │
        └──────────┘ └────┬─────┘
              │            │ dealId
              │       ┌────▼─────┐
              │       │  契約     │
              │       │(Contract)│
              │       └────┬─────┘
              │            │ contractId
              │       ┌────▼─────┐
              │       │  請求     │
              │       │(Invoice) │
              │       └──────────┘
              │
         ┌────▼─────┐
         │ 商談記録   │
         │(Meeting) │←── dealId でも参照
         └──────────┘
```

**参照の方向**

| From | To | 関係 | 備考 |
|---|---|---|---|
| Inquiry | Client | 多対1 | clientId は任意。引合受付時点で未特定の場合がある |
| Deal | Client | 多対1 | 必須 |
| Deal | Inquiry | 1対1 | 任意。直接作成の場合は null |
| DealContact | Deal | 多対1 | 必須 |
| DealContact | ClientContact | 多対1 | 必須 |
| Meeting | Deal | 多対1 | dealId または inquiryId の少なくとも一方が必要 |
| Meeting | Inquiry | 多対1 | 同上 |
| Contract | Deal | 多対1 | 必須。案件の phase が won の場合のみ作成可能 |
| Invoice | Contract | 多対1 | 必須 |

## 6. ドメインイベント一覧

| イベント | 発生元 | トリガー | 後続処理 |
|---|---|---|---|
| InquiryConverted | Inquiry | status → converted | 承認ポリシー評価 → 案件生成（承認不要の場合は即時、必要な場合は承認後） |
| InquiryDeclined | Inquiry | status → declined | 通知 |
| DealPhaseChanged | Deal | phase 変更 | 通知 |
| DealWon | Deal | phase → won | 契約作成の許可 |
| DealLost | Deal | phase → lost | 通知 |
| ContractCreated | Contract | 契約作成 | 売上見込みへの反映、承認ポリシー評価 |
| ContractCompleted | Contract | status → completed | 売上確定処理 |
| ContractCancelled | Contract | status → cancelled | 売上見込みからの除外 |
| InvoicePaid | Invoice | status → paid | 売上実績の計上 |
| InvoiceOverdue | Invoice | status → overdue | 督促通知 |

`InquiryConverted` は特に重要なイベントであり、以下の処理を連鎖させる:

1. 承認ポリシーの評価（この引合→案件化に承認が必要か判定）
2. 承認が不要 → 即座に Deal を生成
3. 承認が必要 → 承認リクエストを生成し、承認後に Deal を生成

## 7. 用語集

| 用語 | 英語名 | 定義 |
|---|---|---|
| 引合 | Inquiry | 顧客からの問い合わせ。案件化の判断前の段階 |
| 案件 | Deal | 受注を目指して営業活動を行う対象 |
| 商談記録 | Meeting | 営業活動における打合せの記録 |
| 顧客 | Client | 取引先企業 |
| 顧客担当者 | ClientContact | 顧客企業における担当者（個人） |
| 案件担当者 | DealContact | 案件における顧客担当者の役割付与 |
| 契約 | Contract | 受注後に締結する契約 |
| 請求 | Invoice | 契約に基づく請求 |
| 売上 | Revenue | 入金実績に基づく売上 |
| 承認 | Approval | 業務プロセスに挿入される承認ゲート |
| 承認ポリシー | Approval Policy | どの条件で承認を要求するかの定義 |
| 承認テンプレート | Approval Template | 承認のプロセス（段階・承認者）の定義 |
| テナント | Organization | マルチテナント環境における組織単位 |
| フェーズ | Phase | 案件の進捗段階 |
| 終端状態 | Terminal State | 不可逆な最終状態（受注・失注・支払済など） |
| 仲介サービス | Agent Service | マッチング費用が発生する案件紹介サービス |
