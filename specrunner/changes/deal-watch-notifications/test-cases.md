# Test Cases: 案件の watch とアクティビティ通知（監査ログから派生）

## Summary

- **Total**: 39 cases
- **Automated** (unit/integration): 35
- **Manual**: 4
- **Priority**: must: 30, should: 8, could: 1

---

### TC-001: 未 watch の案件を watch する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: ユーザーは案件を watch/unwatch できる > Scenario: 未 watch の案件を watch する

---

### TC-002: watch 中の案件を unwatch する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: ユーザーは案件を watch/unwatch できる > Scenario: watch 中の案件を unwatch する

---

### TC-003: 他テナントの watch は見えない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: ユーザーは案件を watch/unwatch できる > Scenario: 他テナントの watch は見えない

---

### TC-004: 案件作成時に作成者が自動 watch される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 案件の作成者は自動的に watch される > Scenario: 案件作成時に作成者が自動 watch される

---

### TC-005: 担当者設定時に担当者が自動 watch される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 案件の担当者変更時に担当者が自動 watch される > Scenario: 担当者が設定された案件で担当者が自動 watch される

---

### TC-006: 既に watch 済みの担当者は重複挿入されない

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: 案件の担当者変更時に担当者が自動 watch される > Scenario: 既に watch 済みの担当者は重複挿入されない

---

### TC-007: watch 中案件の他者による変更が通知に含まれる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: getNotifications は watch 中案件の活動を監査ログから導出する > Scenario: watch 中案件の他者による変更が通知に含まれる

---

### TC-008: 本人の操作は通知から除外される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: getNotifications は watch 中案件の活動を監査ログから導出する > Scenario: 本人の操作は通知から除外される

---

### TC-009: watch 開始前のログは通知に含まれない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: getNotifications は watch 中案件の活動を監査ログから導出する > Scenario: watch 開始前のログは通知に含まれない

---

### TC-010: 通知対象外のアクションは含まれない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: getNotifications は watch 中案件の活動を監査ログから導出する > Scenario: 通知対象外のアクションは含まれない

---

### TC-011: 通知に targetInfoMap が含まれる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: getNotifications は watch 中案件の活動を監査ログから導出する > Scenario: 通知に targetInfoMap が含まれる

---

### TC-012: 初回アクセスで全通知が未読

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 未読数は notifications_last_seen_at 以降の件数で導出される > Scenario: 初回アクセスで全通知が未読

---

### TC-013: 既読後の新しい通知のみ未読

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 未読数は notifications_last_seen_at 以降の件数で導出される > Scenario: 既読後の新しい通知のみ未読

---

### TC-014: 既読にすると未読が 0 になる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 「既読にする」で notifications_last_seen_at が更新され未読が 0 になる > Scenario: 既読にすると未読が 0 になる

---

### TC-015: アクティビティフィード無効でも通知は動作する

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: 通知は監査ログの env フラグと独立に動作する > Scenario: アクティビティフィード無効でも通知は動作する

---

### TC-016: watchRepository の全操作にテナント条件がある

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: watch と notification の全クエリにテナント分離条件がある > Scenario: watchRepository の全操作にテナント条件がある

---

### TC-017: watches テーブルに (userId, dealId) ユニーク制約が存在する

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-01 / design.md > D2

**GIVEN** マイグレーション適用後の DB
**WHEN** watches テーブルの制約一覧を確認する
**THEN** `watches_user_deal_unique`（userId, dealId）ユニーク制約と `organizationId` FK が存在する

---

### TC-018: watchRepository.create が重複挿入で冪等（ON CONFLICT DO NOTHING）

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-04 / design.md > D2

**GIVEN** ユーザー A・案件 X の watch レコードが既に存在する
**WHEN** `watchRepository.create({ userId: A, dealId: X, organizationId })` を再度呼び出す
**THEN** エラーにならず、watches テーブルのレコードは 1 件のまま

---

### TC-019: createDeal 失敗時に watch レコードがロールバックされる

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-06

**GIVEN** createDeal のトランザクション内で案件挿入後にエラーが発生する状況
**WHEN** トランザクションがロールバックされる
**THEN** watches テーブルに該当のレコードが存在しない（トランザクション整合性）

---

### TC-020: assigneeId が指定されない updateDeal では watch が作成されない

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** 案件 X に担当者が未設定
**WHEN** assigneeId を含まない payload で `updateDeal` を呼び出す
**THEN** `watchRepository.create` が呼ばれず、watches テーブルに新規レコードが作成されない

---

### TC-021: 複数案件を watch 中のユーザーの通知が全案件をまたいで取得される

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-09 / design.md > D4

**GIVEN** ユーザー A が案件 X と案件 Y を watch しており、ユーザー B が案件 X を更新、ユーザー C が案件 Y 配下に商談を作成した
**WHEN** `getNotifications({ userId: A, organizationId })` を実行する
**THEN** 案件 X の `deal.update` ログと案件 Y の `meeting.create` ログが両方含まれる

---

### TC-022: deal.create と deal.delete は通知対象外

**Category**: unit
**Priority**: must
**Source**: design.md > D8 / tasks.md > T-03

**GIVEN** `NOTIFICATION_ACTIONS` 定数の定義
**WHEN** 定数値を確認する
**THEN** `deal.create` と `deal.delete` が含まれず、`deal.update`, `deal.updatePhase`, `meeting.create`, `action_item.create`, `contract.create` の5アクションのみが定義されている

---

### TC-023: invoice.create は通知対象外

**Category**: unit
**Priority**: must
**Source**: design.md > D8 / tasks.md > T-03

**GIVEN** ユーザー A が案件 X を watch しており、ユーザー B が案件 X 配下の請求書を作成した（`invoice.create`）
**WHEN** `getNotifications({ userId: A, organizationId })` を実行する
**THEN** 結果に `invoice.create` ログが含まれない

---

### TC-024: getNotifications が通知テーブルを使わない（派生方式の実装確認）

**Category**: unit
**Priority**: must
**Source**: design.md > D1 / tasks.md > T-09

**GIVEN** `src/application/usecases/getNotifications.ts` のソースコード
**WHEN** import・クエリ呼び出しを静的解析で確認する
**THEN** `notifications` テーブルへの参照が存在せず、`watchRepository` と `auditLogRepository` のみが参照されている

---

### TC-025: unwatch 後は該当案件の通知が取得されなくなる

**Category**: integration
**Priority**: should
**Source**: design.md > Risks / Trade-offs（unwatch すると過去通知も見えなくなる）

**GIVEN** ユーザー A が案件 X を watch しており、ユーザー B が案件 X を更新した（`deal.update` ログが存在する）
**WHEN** ユーザー A が案件 X を unwatch した後に `getNotifications` を実行する
**THEN** 案件 X に関する通知が結果に含まれない

---

### TC-026: auditLogRepository.findByTargets の afterDate オプションが機能する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05 / design.md > D7

**GIVEN** 監査ログに時刻 T1 と T2（T2 > T1）のログが存在する
**WHEN** `findByTargets` に `afterDate: T2` を渡す
**THEN** `createdAt` が T2 より前のログ（T1 のログ）は返されない

---

### TC-027: auditLogRepository.findByTargets の excludeActorId オプションが機能する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05 / design.md > D7

**GIVEN** ユーザー A とユーザー B の操作ログが混在している
**WHEN** `findByTargets` に `excludeActorId: A` を渡す
**THEN** `actorId` が A のログは返されず、B のログのみが返される

---

### TC-028: auditLogRepository.findByTargets の includeActions オプションが機能する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05 / design.md > D7

**GIVEN** `deal.update`, `deal.updatePhase`, `meeting.update` の各ログが存在する
**WHEN** `findByTargets` に `includeActions: ["deal.update", "deal.updatePhase"]` を渡す
**THEN** `meeting.update` ログが返されず、指定したアクションのログのみが返される

---

### TC-029: 既存の findByTargets 呼び出しが新オプションなしで動作する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** `getDealActivity` などが `afterDate`, `excludeActorId`, `includeActions` を渡さずに `findByTargets` を呼び出している
**WHEN** 既存コードを変更せずに実行する
**THEN** 新オプションが全て optional のため既存動作が変わらない（既存テストが green）

---

### TC-030: users.notifications_last_seen_at が nullable で User 型に反映される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `src/domain/models/user.ts` のソースコードと `src/infrastructure/repositories/userRepository.ts`
**WHEN** 型定義と select リストを静的解析で確認する
**THEN** `User` 型に `notificationsLastSeenAt: Date | null` が存在し、`findById`・`findByOrganization` が該当カラムを select している

---

### TC-031: markNotificationsAsRead が organizationId 条件付きで notifications_last_seen_at を更新する

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** ユーザー A（organizationId: Org1）に未読通知が存在する
**WHEN** `markNotificationsAsRead({ userId: A, organizationId: Org1 })` を実行する
**THEN** `users.notifications_last_seen_at` が現在時刻付近に更新され、その後 `getNotifications` を実行すると `unreadCount` が 0 になる

---

### TC-032: WatchToggle が全ユーザー（role 問わず）に表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-12

**GIVEN** admin でも manager でもない一般ユーザーが案件詳細ページにアクセスしている
**WHEN** ページのヘッダーを確認する
**THEN** watch トグルボタンが表示される（role チェックによる非表示がない）

---

### TC-033: 未読数が 0 の場合はバッジが非表示

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-13

**GIVEN** `src/app/(dashboard)/NotificationBell.tsx` のソースコード
**WHEN** `unreadCount: 0` を渡してコンポーネントをレンダリングする（またはロジックを静的解析する）
**THEN** バッジ要素が非表示（レンダリングされない、または hidden 扱い）になる条件が実装されている

---

### TC-034: 通知一覧が新しい順に並ぶ

**Category**: integration
**Priority**: could
**Source**: tasks.md > T-09 / T-13

**GIVEN** ユーザー A の watch 中案件に時刻 T1 < T2 < T3 の順で 3 件の通知ログが存在する
**WHEN** `getNotifications` を実行し、通知一覧を取得する
**THEN** 返り値の `notifications` が T3 → T2 → T1 の降順で並んでいる

---

### TC-035: 未認証ユーザーが Server Actions を呼び出すとエラーになる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-11

**GIVEN** セッションなし（未認証）の状態
**WHEN** `watchDealAction`, `unwatchDealAction`, `markNotificationsAsReadAction` のいずれかを呼び出す
**THEN** 認証エラー（redirect to login または unauthorized エラー）が返され、DB 操作が行われない

---

### TC-036: Server Actions が organizationId をセッションから取得する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-11

**GIVEN** `src/app/actions/watches.ts` と `src/app/actions/notifications.ts` のソースコード
**WHEN** organizationId の取得方法を静的解析で確認する
**THEN** organizationId がリクエストボディや引数から受け取らず、セッション（auth）から取得されている

---

### TC-037: typecheck が green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-14

**GIVEN** 変更後のコードベース
**WHEN** `bunx tsc --noEmit` を実行する
**THEN** 型エラーがなく正常終了する

---

### TC-038: lint が green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-14

**GIVEN** 変更後のコードベース
**WHEN** `bun run lint` を実行する
**THEN** lint エラーがなく正常終了する

---

### TC-039: bun run build が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-14

**GIVEN** 変更後のコードベース
**WHEN** `bun run build` を実行する
**THEN** ビルドが正常に完了する

---

## Result

```yaml
result: completed
total: 39
automated: 35
manual: 4
must: 30
should: 8
could: 1
blocked_reasons: []
```
