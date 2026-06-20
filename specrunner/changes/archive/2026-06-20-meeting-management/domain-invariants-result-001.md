# Domain Invariants Review — meeting-management — iter 1

- **reviewer**: domain-invariants
- **purpose**: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。
- **verdict**: approved

---

## 検証観点と結果

### 1. テナント分離（Tenant Isolation）

**結果: 問題なし**

`meetingRepository` の全メソッドにおいて `organizationId` 条件が付与されている。

| メソッド | 条件 | 評価 |
|---------|------|------|
| `create` | INSERT に `organizationId` を必須フィールドとして含む | OK |
| `findById` | `and(eq(meetings.id, id), eq(meetings.organizationId, organizationId))` | OK |
| `findAllByInquiry` | `and(eq(meetings.inquiryId, inquiryId), eq(meetings.organizationId, organizationId))` | OK |
| `findAllByOrganization` | `eq(meetings.organizationId, organizationId)` | OK |
| `update` | `and(eq(meetings.id, id), eq(meetings.organizationId, organizationId))` | OK |

Server Actions (`createMeetingAction`, `updateMeetingAction`) は `session.user.organizationId` をサーバー側で取得し usecase に渡している。クライアントから organizationId を受け取るパスは存在しない。

**クロステナント引き合い参照防止**: `createMeeting.ts` で `inquiryRepository.findById(data.inquiryId, data.organizationId)` を呼び出し、別テナントの inquiryId 指定をブロックしている。DB レベルで meetings.inquiryId が別テナントの inquiries を参照できる余地は usecase 層でふさがれている（設計判断D7 に対応）。

---

### 2. 監査ログ完全性

**結果: 問題なし**

| ユースケース | 操作 | トランザクション | 監査ログ記録 |
|------------|------|----------------|------------|
| `createMeeting` | `meetingRepository.create` | `db.transaction` 内 | `auditLogRepository.create` 同トランザクション内 |
| `updateMeeting` | `meetingRepository.update` | `db.transaction` 内 | `auditLogRepository.create` 同トランザクション内 |
| `listMeetings` | 読み取り専用 | — | 不要（設計通り） |

監査ログの各フィールド: `action: "meeting.create"/"meeting.update"`, `targetType: "meeting"`, `targetId: 商談ID`, `actorId`, `organizationId` — 必要情報が全て揃っている。

トランザクション内で業務操作と監査ログ記録を行っているため、どちらか一方だけが永続化される状態は発生しない。

---

### 3. 承認ワークフロー不変条件

**結果: 問題なし**

商談管理の実装は以下を変更しない:

- `inquiries.version`（楽観ロックカラム）: 一切触れていない
- `inquiries.requestId`（承認リクエスト紐づけ）: 変更なし
- `approvalSteps` テーブル: 書き込みなし
- `requests` テーブル: 書き込みなし

`meetings` → `inquiries` の FK は参照のみ（`meetings.inquiryId` で引き合いを読み取る）。引き合いのステータス遷移・承認ワークフローに影響しない構造であることを確認した。

---

### 4. hearingData 不変条件（type ≠ hearing → null）

**結果: 問題なし**

`createMeeting.ts`:
```ts
const hearingData = data.type === "hearing" ? (data.hearingData ?? null) : null;
```

`updateMeeting.ts`:
```ts
const effectiveType = data.type ?? existing.type;
const hearingData = effectiveType === "hearing"
  ? (data.hearingData !== undefined ? data.hearingData : existing.hearingData)
  : null;
```

- 更新時は「更新後の type」を基準に評価しており、type を hearing から他へ変更した場合も hearingData が確実に null になる。
- Server Action の Zod バリデーションと usecase 層の二重担保になっている。
- DB 制約による強制はないが、設計判断D7 で「アプリケーション層での制御で十分」と明示されており、テストで担保されている。

---

### 5. FK 整合性とシードデータ truncation 順序

**結果: 問題なし**

`seed.ts` truncation 順序:
```
auditLogs → approvalSteps → meetings → inquiries → clientContacts → clients → ...
```

`meetings.inquiryId` が `inquiries.id` を参照するため、meetings を先に削除する順序が正しく実装されている。

---

## 指摘事項

### INFO-01: updateMeetingAction のレート制限キーが createRequest を参照

`updateMeetingAction` が `RATE_LIMITS.createRequest` を参照している。機能上の問題はなく制限が効いているが、「更新」の文脈に合ったキー名ではない。今後 `RATE_LIMITS.updateRequest` を分離する場合の参考として記録する。

深刻度: info（対応不要）

---

## 総評

テナント分離・監査ログ完全性・承認ワークフロー不変条件・hearingData 型制約のいずれも設計通りに実装されている。重大な不変条件違反は検出されなかった。
