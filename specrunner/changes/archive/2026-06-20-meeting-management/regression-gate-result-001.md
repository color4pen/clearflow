# Regression Gate Result — Iteration 1

- **verdict**: needs-fix

## Summary

4件の指摘のうち、1件は修正が確認された。残り3件は修正が適用されていない（リグレッション）。

---

## Finding 1: updateMeetingAction にレート制限がない
- **Status**: FIXED
- **Verification**: `src/app/actions/meetings.ts:187-194` に `checkRateLimit({ key: \`updateMeeting:${session.user.id}\`, ... })` が追加されており、`updateMeetingAction` がレート制限保護を受けている。

---

## Finding 2: 編集フォームのヒアリング項目表示条件が DB の現在値に固定されている
- **Status**: REGRESSION
- **severity**: medium
- **resolution**: fixable
- **File**: `src/app/(dashboard)/inquiries/[id]/meetings/[meetingId]/MeetingDetail.tsx:174`
- **Detail**: `{meeting.type === "hearing" && (` のままで、`selectedType` を管理する `useState` が追加されていない。ユーザーが種別セレクトを `hearing` に変更しても、ヒアリング項目フォームが表示されない問題は未解消。フォーム送信時の action ハンドラ（line 32）は `formData.get("type")` で選択値を読んでいるが、フィールド表示側の条件は依然として DB 値固定。

---

## Finding 3: toggleActionItemDone にサーバーエラー時のロールバックなし
- **Status**: REGRESSION
- **severity**: low
- **resolution**: fixable
- **File**: `src/app/(dashboard)/inquiries/[id]/meetings/[meetingId]/MeetingDetail.tsx:59`
- **Detail**: `setActionItems(updated)` による楽観更新（line 63）の後、`updateMeetingAction({}, formData).then(() => { router.refresh(); })` で `.catch` ／エラーハンドリングブロックが存在しない（line 70-72）。サーバー呼び出し失敗時に UI 状態を元に戻すロジックがない点は未解消。

---

## Finding 4: JSON パース失敗時に空の errors オブジェクトを返す
- **Status**: REGRESSION
- **severity**: low
- **resolution**: fixable
- **File**: `src/app/actions/meetings.ts:79, 88, 206, 215`
- **Detail**: `createMeetingAction` の `internalAttendees`（line 79）・`externalAttendees`（line 88）の JSON パース失敗時に `return { errors: {} }` を返す点が未修正。`actionItems`（line 97）・`hearingData`（line 106）は適切なメッセージが追加されているが、参加者フィールドは修正漏れ。同じ問題が `updateMeetingAction` の line 206・215 にも存在する。
