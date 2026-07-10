# Design: 商談記録の社外参加者を顧客担当者参照に変更

## Context

商談記録（Interaction, kind=meeting）の社外参加者は自由入力の氏名文字列で保存され、`MeetingAttendee.contactId` は型定義に存在するが全書き込み経路で `null` 固定である。このため同一人物の表記ゆれが防げず、顧客担当者マスタ（client_contacts）との突合ができない。

設計正本（`design/domain/model.md` [[ent-interaction]] および `design/domain/invariants.md` [[inv-interaction-external-attendee-from-contact]]）は既に「社外参加者は登録済み ClientContact からの選択制、氏名はスナップショット保持」と定めており、本変更はこの設計と実装を整合させる。

### 現状の書き込み経路

| 経路 | 社外参加者入力 | contactId |
|------|---------------|-----------|
| Server Action `createMeetingAction` | `externalAttendees: string[]`（氏名文字列） | 常に `null` |
| Server Action `updateMeetingAction` | `externalAttendees: string[]`（氏名文字列） | 常に `null` |
| MCP `create_meeting` | `externalAttendees: string[]`（氏名文字列） | 常に `null` |
| MCP `update_meeting` | `externalAttendees: string[]`（氏名文字列） | 常に `null` |

### 現状の付随機構

- `contactRegistrations`（作成時）: 社外参加者の自由入力氏名を顧客担当者として即時登録するチェックボックス＋best-effort の `createClientContact` 呼び出し。
- `registerContacts`（更新時）: 同上の編集画面版。

これらは自由入力を前提とした機構であり、選択制への移行に伴い削除する。

### 永続化構造

`interactions.attendees` は JSONB カラムで `MeetingAttendee[]` を格納する。テーブルスキーマの変更は不要。既存の `contactId` スロットに値を入れるだけで参照が成立する。

## Goals / Non-Goals

**Goals**:

1. 全書き込み経路（Server Action × 2、MCP × 2）で社外参加者を `contactId`（UUID）ベースの入力に変更し、氏名はサーバ側で `listClientContacts` から解決してスナップショット保存する。
2. UI の社外参加者入力を「顧客担当者から追加」select のみに変更し、自由入力行・「顧客担当者として登録」チェックを削除する。
3. MCP の `externalAttendees`（名前リスト）を `externalContactIds`（UUID リスト）に置き換え、describe に制約を明記する。
4. 既存データから `isExternal=true` かつ `contactId=null` の参加者要素を除去するデータ移行を作成する。
5. 懸垂参照の許容: 担当者が削除されても商談記録の氏名スナップショットは保持する（削除時の付随処理なし）。

**Non-Goals**:

- 社内参加者の参照化（userId の充填・ユーザー select 必須化）。
- 案件担当者（[[ent-deal-contact]]）の役割管理との統合。
- 商談フォームからの顧客担当者インライン新規登録。
- 顧客詳細画面の担当者編集可否の変更。

## Decisions

### D1: contactId の解決はサーバ側で完結させる

**決定**: クライアント（UI / MCP）は `contactId` のみ送信し、氏名文字列は送信しない。サーバ（Action / MCP ハンドラ）が `listClientContacts` で contactId → name を解決し、`MeetingAttendee` の `name` フィールドにスナップショットとして設定する。

**Rationale**: クライアント送信の氏名を信用すると、存在しない担当者名を紐づけるなどのデータ不整合が起こりうる。サーバ側で解決すれば、contactId のバリデーション（存在確認・テナント分離）と氏名確定が同時に行える。

**Alternatives**: クライアントが contactId + name を同時送信 → サーバは contactId だけ検証。シンプルだが氏名の正確性がクライアント依存になるため不採用。

### D2: contactId → name 解決は usecase ではなく入口層（Action / MCP ハンドラ）で行う

**決定**: `createMeeting` / `updateMeeting` usecase の `attendees` 引数は既存の `MeetingAttendee[]` のまま変更しない。入口層が contactId を受け取り、`listClientContacts` で解決した `MeetingAttendee[]`（contactId + name 充填済み）を usecase に渡す。

**Rationale**: usecase は `MeetingAttendee[]` を受け取って永続化する責務のみ。contactId → name の解決は入力の正規化であり、バリデーション（未登録 contactId の拒否）と同じ層で行うのが自然。usecase のシグネチャを変えないことで、社内参加者やテスト側への影響を最小化する。

**Alternatives**: usecase に `externalContactIds` を渡して usecase 内で解決 → usecase が `listClientContacts` に依存する新しい辺を持つ。不変条件のバリデーションも usecase に入り、責務が膨らむため不採用。

### D3: MCP のパラメータ名は `externalContactIds` に変更、ツール名は不変

**決定**: `create_meeting` / `update_meeting` の `externalAttendees`（string 配列）を `externalContactIds`（UUID 配列）に置き換える。ツール名 `interactions` は不変。`internalAttendees`（社内参加者の名前リスト）は不変。

**Rationale**: フィールド名の変更は inputSchema の広告に反映され、接続エージェントが旧フィールド名を送信しても無視される。ツール名の不変はコネクタ参照を壊さない。

**Alternatives**: 旧フィールド名を nullable で残し並行期間を設ける → 移行期間の管理コストが発生し、契約が曖昧になるため不採用。

### D4: Server Action の社外参加者入力を `externalContactIds: uuid[]` に変更

**決定**: `createMeetingSchema` / `updateMeetingSchema` の `externalAttendees: z.array(z.string())` を `externalContactIds: z.array(z.string().uuid())` に変更する。`contactRegistrations` / `registerContacts` 関連のスキーマ・ロジック・FormData パースを削除する。

**Rationale**: 自由入力の廃止に伴い、氏名文字列ベースのフィールドと付随する担当者即時登録機構は不要になる。

### D5: UI は select による選択のみ、重複防止は contactId ベース

**決定**: 作成フォーム・編集セクションの社外参加者入力を、顧客担当者 select のみに変更する。自由入力行と「顧客担当者として登録」チェックを削除する。選択済みの重複防止は contactId で判定する（旧実装の氏名文字列比較を置き換え）。状態管理は `Array<{ contactId: string; name: string }>` に変更する。

**Rationale**: contactId ベースの重複判定により同姓同名の担当者を正しく区別できる。

### D6: データ移行は JSONB 内の要素フィルタリングのみ

**決定**: SQL マイグレーションファイルで `interactions.attendees` JSONB 内の `isExternal=true` かつ `contactId=null` の要素のみを除去する UPDATE 文を実行する。スキーマ変更は行わない。社内参加者・contactId 保持要素・他カラムには触れない。

**Rationale**: JSONB 内のフィルタリングは PostgreSQL の `jsonb_agg` + `jsonb_array_elements` で実現でき、テーブルスキーマの変更なしに完結する。条件を `isExternal=true AND contactId IS NULL` に限定することで、既に contactId を持つ社外参加者（将来的に移行済みデータがあった場合）を保護する。

### D7: update_meeting の部分更新意味論を維持する

**決定**: MCP `update_meeting` の `externalContactIds` は既存の `externalAttendees` と同じ三値意味論（undefined=保持 / 配列=差し替え / null=クリア）を維持する。`internalAttendees` との独立した部分更新も不変。Server Action の update も `externalContactIds` が FormData に含まれない場合は既存の社外参加者を保持する。

**Rationale**: 既存のテスト・エージェント挙動との互換性を維持する。

## Risks / Trade-offs

[Risk] **既存データの社外参加者が消失する** → Mitigation: 移行で除去されるのは `isExternal=true` かつ `contactId=null` の要素のみ。これは設計の決定事項 4「既存データは移行で除去」に基づく。移行前のバックアップを推奨。

[Risk] **顧客未設定の案件で社外参加者を追加できなくなる** → Mitigation: UI に「顧客が未設定のため社外参加者を追加できません」のメッセージを表示する。これは意図した制約であり、顧客設定を促す導線として機能する。

[Risk] **担当者が 0 件の顧客で select が空になる** → Mitigation: 担当者未登録時は顧客詳細への登録導線（リンク）を表示する。

[Risk] **contactId 解決の N+1 クエリ** → Mitigation: `listClientContacts` は clientId 単位で全担当者を 1 クエリで取得するため、N+1 は発生しない。Action / MCP ハンドラで 1 回呼び出し、結果からマップを作成して O(1) ルックアップする。

## Open Questions

なし。設計は正本で合意済み。
