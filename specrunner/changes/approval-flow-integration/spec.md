# Spec: approval-flow-integration

## Requirements

### Requirement: requestRepository.create SHALL accept an optional status parameter

`requestRepository.create` のシグネチャに `status?: RequestStatus` を追加する。指定がなければ `"draft"` をデフォルトとする。既存の `createRequest` UC の挙動は変わらない。

#### Scenario: status パラメータ未指定時のデフォルト

**Given** `requestRepository.create` が呼ばれる
**When** `status` パラメータが省略されている
**Then** Request は `status: "draft"` で作成される

#### Scenario: status パラメータ指定時

**Given** `requestRepository.create` が `status: "pending"` で呼ばれる
**When** INSERT が実行される
**Then** Request は `status: "pending"` で作成される

---

### Requirement: requestRepository.create SHALL accept optional sourceType and sourceId parameters

`requestRepository.create` のシグネチャに `sourceType?: string | null` と `sourceId?: string | null` を追加する。指定がなければ `null` をデフォルトとする。

#### Scenario: sourceType/sourceId 未指定時のデフォルト

**Given** `requestRepository.create` が呼ばれる
**When** `sourceType` と `sourceId` が省略されている
**Then** Request は `sourceType: null`, `sourceId: null` で作成される

#### Scenario: sourceType/sourceId 指定時

**Given** `requestRepository.create` が `sourceType: "inquiry"`, `sourceId: "<inquiryId>"` で呼ばれる
**When** INSERT が実行される
**Then** Request は指定された `sourceType`, `sourceId` で作成される

---

### Requirement: updateInquiryStatus SHALL create Request with status pending and source metadata on converted transition

`updateInquiryStatus` の converted 遷移で `requestRepository.create` に `status: "pending"`, `sourceType: "inquiry"`, `sourceId: data.inquiryId` を渡す。

#### Scenario: converted 遷移時の Request 作成

**Given** 引き合いの status が `in_progress` である
**When** `updateInquiryStatus` で `newStatus: "converted"` が呼ばれる
**Then** 作成される Request の status は `"pending"` であり、`sourceType` は `"inquiry"`、`sourceId` は引き合いの ID である

---

### Requirement: updateDealPhase SHALL create Request with status pending and source metadata on estimate_approval transition

`updateDealPhase` の estimate_approval 遷移で `requestRepository.create` に `status: "pending"`, `sourceType: "deal"`, `sourceId: data.dealId` を渡す。

#### Scenario: estimate_approval 遷移時の Request 作成

**Given** 案件の phase が `negotiation` である
**When** `updateDealPhase` で `newPhase: "estimate_approval"` が呼ばれる
**Then** 作成される Request の status は `"pending"` であり、`sourceType` は `"deal"`、`sourceId` は案件の ID である

---

### Requirement: createRequest UC SHALL continue creating Request with status draft

通常の承認リクエスト（`createRequest` UC 経由）は引き続き `status: "draft"` で作成される。

#### Scenario: createRequest UC の後方互換

**Given** `createRequest` UC が呼ばれる
**When** `requestRepository.create` が実行される
**Then** Request は `status: "draft"` で作成される（`sourceType` と `sourceId` は `null`）

---

### Requirement: approveRequest SHALL create Deal when sourceType is inquiry on full approval

全ステップ承認完了後、承認済み Request の `sourceType === "inquiry"` の場合、`inquiryRepository.findById(sourceId)` で引き合いを取得し、`dealRepository.create` で Deal を作成し、audit log を記録する。この連動処理はトランザクション外で実行する。

#### Scenario: 案件化承認完了時の Deal 自動作成

**Given** 全承認ステップが完了し、Request の `sourceType` が `"inquiry"` で `sourceId` が引き合い ID である
**When** `approveRequest` で最後のステップが承認される
**Then** Deal が自動作成される（title は引き合いの title を使用し、`inquiryId` は `sourceId` を使用する）

#### Scenario: Deal 作成失敗時も承認は成功

**Given** 全承認ステップが完了し、Request の `sourceType` が `"inquiry"` である
**When** `dealRepository.create` が失敗する（例: 既に Deal が存在する）
**Then** エラーが audit log に記録されるが、`approveRequest` は `ok: true` を返す

---

### Requirement: approveRequest SHALL advance Deal phase to won when sourceType is deal on full approval

全ステップ承認完了後、承認済み Request の `sourceType === "deal"` の場合、`dealRepository.findById(sourceId)` で案件を取得し、`dealRepository.updatePhase` で `"won"` に遷移する。この連動処理はトランザクション外で実行する。

#### Scenario: 見積承認完了時の Deal フェーズ自動進行

**Given** 全承認ステップが完了し、Request の `sourceType` が `"deal"` で `sourceId` が案件 ID である
**When** `approveRequest` で最後のステップが承認される
**Then** Deal の phase が `"won"` に遷移する

#### Scenario: フェーズ進行失敗時も承認は成功

**Given** 全承認ステップが完了し、Request の `sourceType` が `"deal"` である
**When** `dealRepository.updatePhase` が楽観ロック失敗で null を返す
**Then** エラーが audit log に記録されるが、`approveRequest` は `ok: true` を返す

---

### Requirement: requests table SHALL have sourceType and sourceId columns

`requests` テーブルに `source_type`（text, nullable）と `source_id`（uuid, nullable）カラムを追加する。`Request` ドメインモデル型にも対応フィールドを追加する。

#### Scenario: マイグレーション適用後のカラム存在

**Given** マイグレーションが適用されている
**When** `requests` テーブルを参照する
**Then** `source_type` と `source_id` カラムが存在し、既存レコードの値は `null` である
