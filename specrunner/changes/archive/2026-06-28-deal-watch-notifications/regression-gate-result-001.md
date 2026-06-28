# Regression Gate Result — iteration 001

- **verdict**: needs-fix
- **iteration**: 001

## Summary

3件の指摘について現在のコードを検証した。1件は未修正のまま残存している。

## Findings Verification

### Finding 1 [MEDIUM] — watchDeal が dealId の組織所有権を検証していない

- **Status**: FIXED ✓
- **File**: src/application/usecases/watchDeal.ts
- **Evidence**: `watchRepository.create` の呼び出し前に `dealRepository.findById(data.dealId, data.organizationId)` で所有権を検証し、null の場合は `{ ok: false, reason: "指定された案件が見つかりません" }` を返すガードが実装されている（lines 11–15）。動的テスト `watchDeal.dynamic.test.ts` の TC-ownership-1〜TC-ownership-3 でビジネスロジックも検証されている。

### Finding 2 [MEDIUM] — 全テストが静的解析のみで実際のビジネスロジックが検証されていない

- **Status**: FIXED ✓
- **File**: src/__tests__/usecases/getNotifications.test.ts (+ 追加ファイル)
- **Evidence**: 以下の動的テストファイルが新規追加された。
  - `src/__tests__/usecases/watchDeal.dynamic.test.ts` — `mock.module` でリポジトリをモックし、組織所有権検証のビジネスロジックを動的に検証
  - `src/__tests__/usecases/getNotifications.dynamic.test.ts` — watch 0件時、TC-009（watch 開始前ログ除外）、TC-008（本人操作除外の引数確認）、TC-012（初回アクセスで全未読）、TC-013（unreadCount の正確性）等を動的に検証

### Finding 3 [LOW] — notificationsLastSeenAt 取得のために listOrganizationUsers で全ユーザーを取得している

- **Status**: NOT FIXED ✗
- **File**: src/app/(dashboard)/NotificationBell.tsx
- **Evidence**: 現在のコード（lines 13–15）は依然として `listOrganizationUsers({ organizationId })` で全ユーザーを取得し、`users.find((u) => u.id === userId)` で current user を絞り込んでいる。コメントで "既存の listOrganizationUsers からユーザー情報を取得してキャッシュを活用する" と記載されており、意図的に踏襲されているが、review-feedback-001.md Finding #3 の Fix=yes で要求された修正（`userRepository.findById` を直接呼び出す）は未適用のまま。`userRepository.findById` は同ブランチ内に追加済みだが `NotificationBell.tsx` では使用されていない。

## Regression

| # | Severity | File | Description | Resolution |
|---|----------|------|-------------|------------|
| 1 | high | src/app/(dashboard)/NotificationBell.tsx | Finding 3 が未修正のまま残存。`notificationsLastSeenAt` 取得に `listOrganizationUsers` + `find` を使い続けており、`userRepository.findById` への切り替えが適用されていない | fixable |
