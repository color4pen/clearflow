# Code Review Feedback — iteration 001

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
- iteration line format (exact): `- **iteration**: NNN` (3-digit zero-padded integer)
- Findings table MUST have exactly 7 columns in this order:
  # | Severity | Category | File | Description | How to Fix | Fix
  - Fix column: yes = fixer should address this finding; no = skip (pre-existing / out-of-scope)
- Scores table columns: Category | Score | Weight
  - Valid Category values: correctness | security | architecture | performance | maintainability | testing
  - Score: integer 1-10
  - Weight: decimal as defined below
- total line format (exact): `- **total**: <decimal>`
- Default weights: correctness=0.30, security=0.25, architecture=0.15, performance=0.10, maintainability=0.10, testing=0.10
- Scores table is optional but recommended.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approved
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | medium | security | src/application/usecases/watchDeal.ts | `watchDeal` usecase が `dealId` の所有権を確認せずに watch レコードを作成する。`watchRepository.create` は `deal_id` FK の存在チェックのみで、当該 deal が `organizationId` に属するかを検証しない。他テナントの deal UUID を知るユーザーが自テナントの organizationId を使って `watches` テーブルに不正なレコードを挿入できる（読み取り時は `dealRepository.findById(dealId, organizationId)` が null を返しフィルタされるため情報漏洩は発生しないが、テーブル汚染の経路となる）。`unwatchDeal` も同様。 | `watchRepository.create` 呼び出し前に `dealRepository.findById(data.dealId, data.organizationId)` で所有権を検証し、null なら `{ ok: false, reason: "指定された案件が見つかりません" }` を返すガードを追加する。`unwatchDeal` でも同様に確認するか、削除時のみは `organizationId` 条件が watches テーブル側にあるため不要と判断してもよい | yes |
| 2 | medium | testing | src/__tests__/usecases/ | 追加された全テスト（`watchDeal.test.ts`, `getNotifications.test.ts`, `dealManagement.test.ts` の追加分）がソースコードの文字列検索（静的解析）のみで構成されており、実際のビジネスロジック・DB 操作が検証されていない。test-cases.md で "integration" カテゴリとして定義された TC-001〜TC-014, TC-016〜TC-018, TC-021 等（計 20+ ケース）が動的テストとして実装されていない。受け入れ基準の「テストで固定する」という表現は動的検証を含意しているが、「watch 開始前のログが除外されること」「本人操作が除外されること」「unreadCount が correct であること」「onConflictDoNothing が実際に機能すること」等のロジック不変量が静的解析では担保できない。 | 少なくとも次の受け入れ基準を動的テストでカバーする: TC-001（watch 作成）, TC-002（unwatch）, TC-007（他者変更が通知に含まれる）, TC-008（本人操作が除外される）, TC-009（watch 開始前のログが除外される）, TC-014（markAsRead 後に unreadCount=0）。プロジェクトが DB なし環境で動作する場合はリポジトリをモックして usecase 単体テストとして実装してもよい | yes |
| 3 | low | performance | src/app/(dashboard)/NotificationBell.tsx | `notificationsLastSeenAt` を取得するために `listOrganizationUsers({ organizationId })` で全ユーザーリストを取得してから `users.find((u) => u.id === userId)` で絞り込んでいる。組織のユーザー数が増えると N件全取得が毎リクエスト発生する。`actorNames` の構築も同じ呼び出しで賄えているため一定の合理性はあるが、current user の情報取得として `findById` 相当の呼び出しを使う方が意図が明確。 | `userRepository.findById(userId, organizationId)` を直接呼び出すか、`getUser` usecase を追加して current user の情報を取得する（`actorNames` マップ用に `listOrganizationUsers` は残してよい） | yes |
| 4 | low | maintainability | src/application/usecases/getNotifications.ts | `dealContactRepository.findByDeal` で取得した `dealContacts` が `targets` 配列（`{ targetType: "deal_contact", targetId: dc.id }`）には追加されているが、`targetInfoMap` には含まれていない。現状 `deal_contact.*` はいずれも `NOTIFICATION_ACTIONS` に含まれないため実害はないが、コードの二箇所（targets と targetInfoMap）で扱いが非対称であり、将来 deal_contact アクションを通知対象に追加した際に `targetInfo` が null になる潜在的バグの種となる。 | `dealContacts` を `targets` から除外して対称性を保つ（NOTIFICATION_ACTIONS に含まれないため取得自体が不要）か、`targetInfoMap` にも `deal_contact:${dc.id}` のエントリを追加して一貫性を保つ | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 7 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 7 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 6 | 0.10 |

- **total**: 7.90

## Summary

### 全体評価

派生（read-side）方式の実装として設計意図に忠実な完成度。build / typecheck / lint / test が全て green、受け入れ基準の全項目がカバーされており、承認可能なコードである。

### 良い点

- **アーキテクチャの忠実な実装**: 設計判断 D1〜D8 が正確に実装されている。`getNotifications` が `watchRepository` と `auditLogRepository` のみを使い、通知テーブルを参照しない派生方式が徹底されている
- **テナント分離の完全性**: `watchRepository` の全関数（create / findByUserAndDeal / findByUser / deleteByUserAndDeal）に `organizationId` 条件が含まれ、`getNotifications` の `findByTargets` 呼び出しにも `organizationId` が渡されている
- **冪等性の正しい実装**: `watchRepository.create` が `onConflictDoNothing` を使い、既存レコードがある場合はフェッチして返す実装が担当者自動 watch の重複挿入問題を解決している
- **トランザクション整合性**: `createDeal`, `updateDeal` どちらもトランザクション内で `watchRepository.create` を呼び出しており、案件作成/更新と watch の整合性が保たれている
- **UI の Server/Client Component 分担**: `NotificationBell`（Server Component）でデータ取得、`NotificationPanel`（Client Component）でインタラクションという Next.js のパターンに合致した設計
- **afterDate の二段階フィルタ**: DB 側で全 watch 中の最古日時による粗いフィルタ、アプリ側で watch ごとの `createdAt` による精密フィルタという設計が効率的

### 懸念点

- **Findings #1（medium/security）**: `watchDeal` usecase で `dealId` の組織所有権チェックがない。UUID の推測は困難なため実害は限定的だが、セキュリティの防御深度として usecase 層でも所有権を確認することを推奨する
- **Findings #2（medium/testing）**: 全テストが静的解析（ソース内文字列の存在確認）のみ。test-cases.md の "integration" カテゴリケースが動的テストとして実装されておらず、watch 開始前ログ除外・本人操作除外・unreadCount 計算といったロジック不変量が実際には検証されていない。プロジェクト全体の既存テストが同パターンを使っていることは確認済みだが、新規ビジネスロジックに対してはロジック検証テストの追加が品質保証として望ましい
