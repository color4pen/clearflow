# Spec: 案件アクティビティに対象エンティティ名とリンクを表示

## Requirements

### Requirement: getDealActivity は対象エンティティの情報マップを返す

`getDealActivity` SHALL return a `targetInfoMap` (keyed by `${targetType}:${targetId}`) alongside the `AuditLog[]` array. The map MUST be built from entities already fetched within the function (meetings, contracts, invoices, action items) without adding new repository calls.

#### Scenario: 全種別のエンティティがマップに含まれる

**Given** 案件に meeting（ヒアリング, 2026-06-15）、contract（title: "開発契約"）、invoice（title: "6月分請求"）、action_item（description: "資料作成"）が紐づいている
**When** `getDealActivity` を呼び出す
**Then** `targetInfoMap` に以下のエントリが含まれる:
  - `deal:{dealId}` → `{ label: "{dealTitle}", href: "/deals/{dealId}" }`
  - `meeting:{meetingId}` → `{ label: "ヒアリング 2026/06/15", href: "/deals/{dealId}/meetings/{meetingId}" }`
  - `contract:{contractId}` → `{ label: "開発契約", href: "/contracts/{contractId}" }`
  - `invoice:{invoiceId}` → `{ label: "6月分請求" }`（href なし）
  - `action_item:{actionItemId}` → `{ label: "資料作成" }`（href なし）

#### Scenario: deal_contact はマップに含まれない

**Given** 案件に deal_contact が紐づいている
**When** `getDealActivity` を呼び出す
**Then** `targetInfoMap` に `deal_contact:*` のキーが含まれない

#### Scenario: 新規リポジトリ取得を増やしていない

**Given** `getDealActivity.ts` のソースコード
**When** import 文を検査する
**Then** 既存の 6 つのリポジトリ import（meetingRepository, contractRepository, invoiceRepository, actionItemRepository, dealContactRepository, auditLogRepository）以外のリポジトリ import が存在しない

---

### Requirement: href は詳細ページがある対象のみに付与する

`targetInfoMap` の `href` フィールドは deal / meeting / contract の 3 種のみに付与し、invoice / action_item には付与しない（MUST NOT）。

#### Scenario: deal の href パターン

**Given** dealId = "d-001" の案件
**When** `targetInfoMap` の `deal:d-001` エントリを参照する
**Then** `href` が `/deals/d-001` である

#### Scenario: meeting の href パターン

**Given** dealId = "d-001" に紐づく meetingId = "m-001" の商談
**When** `targetInfoMap` の `meeting:m-001` エントリを参照する
**Then** `href` が `/deals/d-001/meetings/m-001` である

#### Scenario: contract の href パターン

**Given** contractId = "c-001" の契約
**When** `targetInfoMap` の `contract:c-001` エントリを参照する
**Then** `href` が `/contracts/c-001` である

#### Scenario: invoice に href が無い

**Given** invoiceId = "inv-001" の請求
**When** `targetInfoMap` の `invoice:inv-001` エントリを参照する
**Then** `href` が undefined である

#### Scenario: action_item に href が無い

**Given** actionItemId = "ai-001" のアクションアイテム
**When** `targetInfoMap` の `action_item:ai-001` エントリを参照する
**Then** `href` が undefined である

---

### Requirement: DealActivitySection は対象ラベルを表示する

`DealActivitySection` SHALL display the target entity label after the action text for each activity entry. When `href` is present, the label MUST be rendered as a navigable link.

#### Scenario: href ありの対象はリンクで表示

**Given** audit log の targetType = "contract", targetId = "c-001" で、targetInfoMap に `{ label: "開発契約", href: "/contracts/c-001" }` が存在する
**When** DealActivitySection がその行をレンダリングする
**Then** アクション文の後に「開発契約」がリンク（`/contracts/c-001`）として表示される

#### Scenario: href なしの対象はテキストで表示

**Given** audit log の targetType = "invoice", targetId = "inv-001" で、targetInfoMap に `{ label: "6月分請求" }` が存在する（href なし）
**When** DealActivitySection がその行をレンダリングする
**Then** アクション文の後に「6月分請求」がプレーンテキストとして表示される（リンクではない）

---

### Requirement: 対象が解決できない場合はアクション文のみで表示する

対象が `targetInfoMap` に存在しない場合（削除済み等）、DealActivitySection SHALL display only the action text without a target label. The display MUST NOT break or show an error.

#### Scenario: 削除済みエンティティのフォールバック

**Given** audit log の targetType = "action_item", targetId = "ai-deleted" で、targetInfoMap にそのキーが存在しない
**When** DealActivitySection がその行をレンダリングする
**Then** アクション文のみが表示され、対象ラベルは表示されない。表示が壊れない

---

### Requirement: 既存の表示要素と動作は不変

既存のアクティビティ表示（時刻・actor・アクション文）、env フィーチャーフラグ（`ACTIVITY_FEED_ENABLED`）、件数上限（`ACTIVITY_TIMELINE_LIMIT`）は変更しない（MUST NOT change）。

#### Scenario: 既存表示要素が維持される

**Given** アクティビティが 1 件以上ある状態
**When** DealActivitySection をレンダリングする
**Then** 各行に時刻・actor 名・アクション文が従来通り表示される（対象ラベルは追加されるが、既存要素は除去・変更されない）

#### Scenario: フィーチャーフラグが false のときセクション非表示

**Given** `ACTIVITY_FEED_ENABLED` が未設定または `"true"` 以外
**When** 案件詳細ページをレンダリングする
**Then** アクティビティセクションが表示されない（getDealActivity も呼び出されない）
