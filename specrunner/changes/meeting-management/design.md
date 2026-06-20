# Design: 商談管理

## Context

第1リクエスト（client-inquiry-foundation）で顧客（`clients`）・引き合い（`inquiries`）管理基盤を導入済み。引き合い詳細ページ（`/inquiries/[id]`）には「引き合い情報」と「承認情報」の 2 セクションが SectionCard で配置されている。

商談活動の記録機能が存在しないため、営業担当者はヒアリング内容や提案経緯を体系的に蓄積できない。本変更は引き合いに紐づく商談記録（Meeting）の CRUD を追加する。

現状のコードベース:
- `schema.ts` に `inquiryStatusEnum`, `clients`, `clientContacts`, `inquiries` テーブルが定義済み（L36-264）。Auth.js adapter テーブルは L266 以降
- Relations は L305-484。`organizationsRelations` に `clients: many(clients)`, `inquiries: many(inquiries)` が含まれる。`usersRelations` に `inquiries: many(inquiries)` が含まれる。`inquiriesRelations` は L463-484
- `inquiryRepository` は `mapRow()` + optional `tx` パラメータ + organizationId 条件パターンが確立（L1-156）
- ユースケースは `db.transaction()` 内で業務操作 + `auditLogRepository.create()` を実行。Result 型 `{ ok: true; data } | { ok: false; reason }` で返却（`createInquiry.ts` が典型例）
- Server Actions は `"use server"` 宣言、`auth()` 認証、Zod バリデーション、`checkRateLimit()`、`revalidatePath()` のパターンが確立（`inquiries.ts` が典型例）
- テスト: 静的解析（ソース文字列検証）による tenant isolation テスト + usecase パターン検証（`inquiryManagement.test.ts`）が定着
- `seed.ts` の truncation 順序は `auditLogs → approvalSteps → inquiries → clientContacts → clients → ...`（L33-48）。引き合い 3 件のシードデータあり（L425-457）
- `projectStructure.test.ts` のドメインモデル一覧（TC-031, L102-113）とドメインサービス一覧（TC-034, L136-153）に client/inquiry が追加済み

## Goals / Non-Goals

**Goals**:

- `meetings` テーブルと `meetingTypeEnum` を `schema.ts` に追加する
- `Meeting`, `MeetingType`, `HearingData`, `ActionItem`, `MeetingAttendees` ドメインモデルを定義する
- `meetingRepository` を追加し、全クエリに organizationId 条件を付与する
- `createMeeting`, `listMeetings`, `updateMeeting` ユースケースを追加する（全操作でトランザクション内監査ログ記録）
- Server Actions と Zod バリデーションを追加する
- 引き合い詳細ページに「商談履歴」セクションを追加する
- 商談記録ページ（`/inquiries/[id]/meetings/new`）と商談詳細ページ（`/inquiries/[id]/meetings/[meetingId]`）を追加する
- type が `hearing` の場合のみヒアリング項目入力フォームを表示する
- アクションアイテムの完了チェック（done フラグ更新）を可能にする
- シードデータに商談 4 件を追加する
- テナント分離テスト・usecase 静的検証テストを追加する

**Non-Goals**:

- 商談記録のファイル添付（提案書・見積書のアップロード）
- 商談のカレンダー連携
- 商談のリマインダー通知
- 商談テンプレート（定型議事録フォーマット）
- 商談の削除
- 案件（Deal）管理
- ページネーション・検索・ソート

## Decisions

### D1: meetingTypeEnum を pgEnum で定義する

**決定**: `meetingTypeEnum` を pgEnum `["hearing", "proposal", "negotiation", "closing", "followup"]` で定義する。

**理由**: 種別はヒアリングデータの表示制御に直結する有限状態であり、不正値の混入を DB レベルで防ぐべき。`inquiryStatusEnum` と同じ方式を踏襲する。

**代替案なし**: `requestStatusEnum`, `inquiryStatusEnum` と同じパターン。

### D2: ヒアリングデータを固定構造の jsonb で管理する（architect 決定済み）

**決定**: `hearingData` は `{ challenge, budget, decisionMaker, timeline, competitors, notes }` の固定構造 jsonb。type が `hearing` の場合のみ入力可能、それ以外では null。

**理由**: ヒアリング項目は業種・案件によらず共通性が高い（BANT-C に準拠）。固定構造の方が `HearingData` 型として型安全に扱える。

**却下した代替案**: 動的フォーム定義（テンプレート方式）— 初期段階でカスタマイズ性は不要。テンプレート管理のインフラが必要になり過剰。

### D3: 参加者を jsonb 構造で管理する（architect 決定済み）

**決定**: `attendees` カラムは `{ internal: string[], external: string[] }` の jsonb。ドメインモデル側で `MeetingAttendees` 型を定義する。

**理由**: 参加者は名前の記録が主目的で、ユーザーテーブルとの紐づけや参加者単位の検索は不要。

**却下した代替案**: 別テーブル `meeting_attendees` — FK 参照も検索も不要なため、正規化のメリットがない。

### D4: アクションアイテムを jsonb 配列で管理する（architect 決定済み）

**決定**: `actionItems` カラムは `Array<{ description, assignee, dueDate, done }>` の jsonb（default `[]`）。ドメインモデル側で `ActionItem` 型を定義する。

**理由**: アクションアイテムは商談に従属し、独立したライフサイクルを持たない。done フラグの更新は `updateMeeting` usecase 経由で商談全体の更新として行う。

**却下した代替案**: 別テーブル — 独立した CRUD が不要であり、jsonb で十分。

### D5: 商談を引き合い（Inquiry）に紐づける（architect 決定済み）

**決定**: `meetings.inquiryId` FK で引き合いに紐づける。顧客への直接紐づけは行わない。

**理由**: 商談は特定の引き合い（案件の種）に関する活動記録。顧客に直接紐づけると、どの案件についての商談か不明確になる。

**却下した代替案**: `meetings.clientId` で顧客直接紐づけ — 案件コンテキストが失われる。

### D6: 商談ページを引き合い詳細のネストルートに配置する（architect 決定済み）

**決定**: `/inquiries/[id]/meetings/new` と `/inquiries/[id]/meetings/[meetingId]` のネスト構造。

**理由**: 商談は引き合いに従属するため、URL 構造でもコンテキストを維持する。引き合い詳細ページから自然に遷移できる。

**却下した代替案**: `/meetings` トップレベルルート — 引き合いのコンテキストが URL から失われる。

### D7: hearingData の型制約をユースケース層で強制する

**決定**: `createMeeting` / `updateMeeting` ユースケースで、type が `hearing` でない場合は hearingData を null に強制する。DB 制約ではなくアプリケーション層で制御する。

**理由**: PostgreSQL の CHECK 制約で jsonb の nullability を type カラムに連動させるとマイグレーションが複雑化する。アプリケーション層のテストで十分に担保できる。

### D8: actionItems の done 更新は updateMeeting usecase で行う

**決定**: done フラグの更新専用のユースケースは作らず、`updateMeeting` で actionItems 配列全体を受け取って更新する。

**理由**: アクションアイテムは商談の一部であり、部分更新 API を分けると更新の競合リスクが増す。フロントエンドで配列を再構築して送信するシンプルなパターンを採用する。

## Risks / Trade-offs

**[Risk] meetings テーブルの jsonb カラムが多い（attendees, actionItems, hearingData の 3 カラム）**
→ Mitigation: いずれも商談単位で読み書きされるデータであり、独立した検索・集計の要件がない。将来的にレポーティング要件が出た場合は、必要なカラムを正規化する。

**[Risk] hearingData の null 制約がアプリケーション層のみで、DB レベルでは強制されない**
→ Mitigation: `createMeeting` / `updateMeeting` ユースケースで type チェックを行い、テストで担保する。Server Action の Zod バリデーションでも二重チェックする。

**[Trade-off] actionItems の done 更新が配列全体の置換になる**
→ 楽観ロックなしでの更新となるが、商談記録は単一ユーザーが編集する想定であり、同時編集のリスクは低い。

## Open Questions

なし — 全設計判断は architect 評価済み。
