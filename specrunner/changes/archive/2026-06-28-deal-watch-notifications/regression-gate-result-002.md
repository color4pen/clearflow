# Regression Gate Result — iteration 002

- **verdict**: approved
- **iteration**: 002

## Summary

3件の指摘すべてが現在のコードで修正済みであることを確認した。リグレッションなし。

## Findings Verification

### Finding 1 [MEDIUM] — watchDeal が dealId の組織所有権を検証していない

- **Status**: FIXED ✓
- **File**: src/application/usecases/watchDeal.ts
- **Evidence**: `watchRepository.create` の呼び出し前に `dealRepository.findById(data.dealId, data.organizationId)` で所有権を検証し、null の場合は `{ ok: false, reason: "指定された案件が見つかりません" }` を返すガードが実装されている（lines 11–15）。動的テスト `watchDeal.dynamic.test.ts` の TC-ownership-1〜TC-ownership-3 でもビジネスロジックを検証済み。前回 iteration から変更なく修正済みのまま維持されている。

### Finding 2 [MEDIUM] — 全テストが静的解析のみで実際のビジネスロジックが検証されていない

- **Status**: FIXED ✓
- **File**: src/__tests__/usecases/getNotifications.test.ts (+ 追加ファイル)
- **Evidence**: 以下の動的テストファイルが存在する。
  - `src/__tests__/usecases/watchDeal.dynamic.test.ts` — `mock.module` でリポジトリをモックし、組織所有権検証のビジネスロジックを動的に検証（TC-ownership-1〜TC-ownership-3）
  - `src/__tests__/usecases/getNotifications.dynamic.test.ts` — watch 0件時の空結果、TC-009（watch 開始前ログ除外・境界値含む）、TC-008（本人操作除外の excludeActorId 伝達・organizationId 伝達・includeActions 内容）、TC-012（初回アクセスで全未読）、TC-013（unreadCount の正確性・全既読時 0）等を動的に検証している。前回 iteration から変更なく修正済みのまま維持されている。

### Finding 3 [LOW] — notificationsLastSeenAt 取得のために listOrganizationUsers で全ユーザーを取得している

- **Status**: FIXED ✓
- **File**: src/app/(dashboard)/NotificationBell.tsx
- **Evidence**: 前回 iteration で未修正と判定されていたが、現在のコード（lines 14–17）では `userRepository.findById(userId, organizationId)` を直接呼び出して `notificationsLastSeenAt` を取得している。`listOrganizationUsers` は引き続き `actorNames` マップの構築のみに使用されており、要求された修正が正しく適用されている。

```tsx
const [currentUser, orgUsers] = await Promise.all([
  userRepository.findById(userId, organizationId),
  listOrganizationUsers({ organizationId }),
]);
const notificationsLastSeenAt = currentUser?.notificationsLastSeenAt ?? null;
```

## Regression

リグレッションなし。前回 iteration の regression（Finding 3 未修正）は解消された。
