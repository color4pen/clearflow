# Spec: 商談管理

## Requirements

### Requirement: meetingTypeEnum は 5 値で定義される

`meetingTypeEnum` は pgEnum として `["hearing", "proposal", "negotiation", "closing", "followup"]` の 5 値で定義されなければならない（MUST）。

#### Scenario: meetingTypeEnum がスキーマに存在する

**Given** `src/infrastructure/schema.ts` が読み込まれる
**When** `meetingTypeEnum` の定義を確認する
**Then** `["hearing", "proposal", "negotiation", "closing", "followup"]` の 5 値が順に定義されている

---

### Requirement: meetings テーブルが必要なカラムを持つ

`meetings` テーブルは id, organizationId, inquiryId, type, date, location, attendees, summary, actionItems, hearingData, createdById, createdAt, updatedAt のカラムを持たなければならない（MUST）。

#### Scenario: meetings テーブルがスキーマに定義されている

**Given** `src/infrastructure/schema.ts` が読み込まれる
**When** `meetings` テーブルの定義を確認する
**Then** 上記の全カラムが定義されている

---

### Requirement: type が hearing の場合のみ hearingData が保存される

商談の type が `hearing` の場合のみ `hearingData` を保存しなければならない（MUST）。type が `hearing` 以外の場合、`hearingData` は null でなければならない。

#### Scenario: hearing タイプで hearingData が保存される

**Given** type が `hearing` の商談を作成する
**When** hearingData に `{ challenge: "課題A", budget: "500万", decisionMaker: "部長", timeline: "3ヶ月", competitors: "B社", notes: null }` を指定する
**Then** 商談が作成され、hearingData が保存される

#### Scenario: proposal タイプで hearingData が null になる

**Given** type が `proposal` の商談を作成する
**When** hearingData に値を指定する
**Then** 商談が作成され、hearingData は null になる

#### Scenario: hearing 以外の全 type で hearingData が null である

**Given** type が `negotiation`, `closing`, `followup` のいずれかの商談を作成する
**When** hearingData に値を指定する
**Then** 商談が作成され、hearingData は null になる

---

### Requirement: 商談作成時に引き合いの存在確認を行う

商談作成時に `inquiryRepository.findById` で引き合いの存在を確認しなければならない（MUST）。存在しない引き合い ID を指定した場合はエラーを返す。

#### Scenario: 存在しない引き合い ID で商談を作成するとエラーになる

**Given** 存在しない引き合い ID が指定される
**When** `createMeeting` を実行する
**Then** `{ ok: false, reason: "引き合いが見つかりません" }` が返る

#### Scenario: 存在する引き合い ID で商談が作成される

**Given** 有効な引き合い ID が指定される
**When** `createMeeting` を実行する
**Then** 商談が作成される

---

### Requirement: 全リポジトリ関数に organizationId 条件を付与する

`meetingRepository` の全クエリ関数は `organizationId` をパラメータに含み、WHERE 条件に付与しなければならない（SHALL）。

#### Scenario: 商談一覧が自組織のみ返る

**Given** 組織 A の商談が 2 件、組織 B の商談が 3 件存在する
**When** 組織 A のユーザーが `findAllByInquiry` を呼び出す
**Then** 組織 A の商談のみが返る

---

### Requirement: 商談作成・更新で監査ログを記録する

商談の作成および更新は、同一トランザクション内で `audit_logs` にレコードを記録しなければならない（MUST）。

#### Scenario: 商談作成時に監査ログが記録される

**Given** ユーザーが商談を作成する
**When** `createMeeting` usecase がトランザクションを完了する
**Then** `action='meeting.create'`, `targetType='meeting'`, `targetId=新商談ID` の監査ログが記録される

#### Scenario: 商談更新時に監査ログが記録される

**Given** ユーザーが商談を更新する
**When** `updateMeeting` usecase がトランザクションを完了する
**Then** `action='meeting.update'`, `targetType='meeting'`, `targetId=商談ID` の監査ログが記録される

---

### Requirement: 引き合い詳細ページに商談履歴セクションを表示する

引き合い詳細ページ（`/inquiries/[id]`）に「商談履歴」セクションを追加しなければならない（SHALL）。時系列で商談記録を表示し、「商談を記録」リンクボタンを配置する。

#### Scenario: 引き合い詳細ページに商談履歴が表示される

**Given** 引き合い ID に紐づく商談が 2 件存在する
**When** `/inquiries/[id]` にアクセスする
**Then** 「商談履歴」セクションに 2 件の商談が時系列で表示される

#### Scenario: 商談がない場合に空状態が表示される

**Given** 引き合い ID に紐づく商談が 0 件である
**When** `/inquiries/[id]` にアクセスする
**Then** 「商談履歴」セクションに商談がない旨のメッセージが表示される

---

### Requirement: 種別が hearing の場合にヒアリング項目フォームが表示される

商談記録ページ（`/inquiries/[id]/meetings/new`）で種別に `hearing` を選択した場合、ヒアリング項目入力フォーム（課題、予算感、決裁者、時期、競合状況、備考）を追加表示しなければならない（SHALL）。

#### Scenario: hearing 選択時にヒアリングフォームが表示される

**Given** 商談記録ページを開く
**When** 種別ドロップダウンで `hearing` を選択する
**Then** ヒアリング項目入力フォーム（課題、予算感、決裁者、時期、競合状況）が表示される

#### Scenario: hearing 以外の選択時にヒアリングフォームが非表示

**Given** 商談記録ページを開く
**When** 種別ドロップダウンで `proposal` を選択する
**Then** ヒアリング項目入力フォームは表示されない

---

### Requirement: アクションアイテムの done 状態を更新できる

商談詳細ページでアクションアイテムの完了チェックボックスを操作し、done 状態を更新できなければならない（SHALL）。更新は `updateMeeting` usecase 経由で行う。

#### Scenario: アクションアイテムを完了にする

**Given** done が false のアクションアイテムが含まれる商談が存在する
**When** 完了チェックボックスをオンにして更新する
**Then** そのアクションアイテムの done が true に更新される

---

### Requirement: 依存方向を遵守する

新規追加するコードは `actions → usecases → domain (services + models) / repositories (infrastructure)` の依存方向を遵守しなければならない（MUST）。domain 層は infrastructure を import しない。

#### Scenario: ドメインモデルファイルに ORM import がない

**Given** `src/domain/models/meeting.ts` が存在する
**When** ファイルの import 文を確認する
**Then** `drizzle` への import が含まれない

#### Scenario: ドメインモデルファイルに infrastructure import がない

**Given** `src/domain/models/meeting.ts` が存在する
**When** ファイルの import 文を確認する
**Then** `@/infrastructure` への import が含まれない
