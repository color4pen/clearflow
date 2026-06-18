# Tasks: Approval Delegation

## T-01: Schema — `approval_delegations` テーブル定義

- [ ] `src/infrastructure/schema.ts` に `approvalDelegations` テーブルを追加する
  - カラム: `id` (uuid, PK, defaultRandom), `fromUserId` (uuid, FK → users.id), `toUserId` (uuid, FK → users.id), `organizationId` (uuid, FK → organizations.id), `startDate` (timestamp, notNull), `endDate` (timestamp, notNull), `isActive` (boolean, default true, notNull), `createdAt` (timestamp, defaultNow, notNull)
- [ ] `(to_user_id, organization_id, is_active)` の複合インデックスを追加する（`index()` を使用）
- [ ] `approvalDelegationsRelations` を追加する（`fromUser`, `toUser`, `organization` の 3 リレーション）
- [ ] `organizationsRelations` に `approvalDelegations: many(approvalDelegations)` を追加する
- [ ] `usersRelations` に委譲関連の `many` リレーションを追加する（`delegationsFrom`, `delegationsTo`）
- [ ] `bun run drizzle-kit generate` でマイグレーション SQL (`drizzle/0004_approval_delegation.sql`) を生成する

**Acceptance Criteria**:
- `bun run build` が成功する
- `typecheck` が green
- マイグレーション SQL が `drizzle/` に生成されている
- テーブル定義に上記全カラムと複合インデックスが含まれる

## T-02: Domain model — `ApprovalDelegation` 型定義

- [ ] `src/domain/models/approvalDelegation.ts` を作成する
  ```typescript
  export type ApprovalDelegation = {
    id: string;
    fromUserId: string;
    toUserId: string;
    fromUserRole: string;
    organizationId: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
    createdAt: Date;
  };
  ```
- [ ] `src/domain/models/index.ts` に `export type { ApprovalDelegation } from "./approvalDelegation"` を追加する

**Acceptance Criteria**:
- `typecheck` が green
- `ApprovalDelegation` 型が `src/domain/models/index.ts` からエクスポートされている

## T-03: Domain service — `canApprove` の拡張

- [ ] `src/domain/services/approvalStepService.ts` の `canApprove` を拡張する
  - 第3引数 `delegations?: ApprovalDelegation[]` を追加（optional で後方互換）
  - 直接のロール一致を先にチェック（既存動作を維持）
  - ロール不一致の場合、`delegations` が存在すれば委譲元ロールが `step.approverRole` と一致する委譲を検索
  - 複数マッチ時は `startDate` が最も新しいものを採用し、その委譲を返すか `true` を返す
- [ ] 代理承認時にどの委譲を使用したかを呼び出し元に伝えるため、戻り値を拡張する。`canApproveWithDelegation(step, actorRole, delegations)` を新規関数として追加し、`{ allowed: boolean; delegation?: ApprovalDelegation }` を返す。既存の `canApprove` はそのまま維持して後方互換を保つ
- [ ] `import type { ApprovalDelegation }` を追加する

**Acceptance Criteria**:
- 既存の `canApprove` テストが変更なしで全件 green
- `canApprove(step, "admin")` — delegations 引数なしの呼び出しが従来通り動作する
- `canApproveWithDelegation` が委譲経由の承認で `{ allowed: true, delegation }` を返す
- `canApproveWithDelegation` が委譲なし直接一致で `{ allowed: true, delegation: undefined }` を返す
- `canApproveWithDelegation` が不一致で `{ allowed: false }` を返す

## T-04: Domain service — `canApprove` / `canApproveWithDelegation` のユニットテスト

- [ ] `src/__tests__/domain/approvalStepService.test.ts` にテストケースを追加する
  - 委譲経由で承認可能（委譲元ロールが step の approverRole と一致）
  - 委譲期間外のユーザーが承認できない（`findActiveByToUserId` が返さないため delegations が空）
  - 複数委譲がマッチする場合、`startDate` が最新のものが採用される
  - 委譲なし・ロール不一致で `false`
  - `delegations` 引数なしで既存動作が維持される

**Acceptance Criteria**:
- `bun test src/__tests__/domain/approvalStepService.test.ts` が全件 green
- 上記 5 ケースがカバーされている

## T-05: Repository — `approvalDelegationRepository` 実装

- [ ] `src/infrastructure/repositories/approvalDelegationRepository.ts` を作成する
- [ ] `findActiveByToUserId(toUserId, organizationId, now, tx?)` — `to_user_id = toUserId AND organization_id = organizationId AND is_active = true AND start_date <= now AND end_date >= now` で検索。戻り値: `ApprovalDelegation[]`
- [ ] `findByOrganization(organizationId)` — 組織内の全委譲を返す（管理画面用）。`created_at DESC` でソート
- [ ] `findOverlapping(fromUserId, toUserId, organizationId, startDate, endDate)` — 同一 from→to ペアで期間重複するアクティブな委譲を検索。条件: `is_active = true AND start_date <= endDate AND end_date >= startDate`
- [ ] `create(data, tx?)` — 委譲レコードを挿入。戻り値: `ApprovalDelegation`
- [ ] `update(id, organizationId, data)` — 委譲レコードを更新（`isActive` の変更に使用）。`id AND organization_id` で WHERE。戻り値: `ApprovalDelegation | null`
- [ ] `mapRow` ヘルパー関数でスキーマ行をドメインモデルに変換する
- [ ] `src/infrastructure/repositories/index.ts` に `export * as approvalDelegationRepository from "./approvalDelegationRepository"` を追加する

**Acceptance Criteria**:
- `typecheck` が green
- `approvalDelegationRepository` が `index.ts` からエクスポートされている
- 各関数の引数・戻り値がドメインモデル型と一致する
- `findActiveByToUserId` が `tx` 引数を受け取りトランザクション内で使用可能

## T-06: Usecase — `createDelegation` 実装

- [ ] `src/application/usecases/createDelegation.ts` を作成する
- [ ] 入力: `{ fromUserId, toUserId, organizationId, startDate, endDate }`
- [ ] バリデーション:
  1. 自己委譲チェック: `fromUserId === toUserId` なら拒否
  2. クロスオーグチェック: `userRepository.findById` で両ユーザーを取得し、`organizationId` が入力値と一致するか確認
  3. 重複チェック: `approvalDelegationRepository.findOverlapping` で既存の重複委譲を検索。存在すれば拒否
  4. `startDate < endDate` のバリデーション
- [ ] バリデーション通過後、`approvalDelegationRepository.create` で委譲を作成する
- [ ] 委譲作成成功後、`auditLogRepository.create` で操作を記録する（失敗時は記録しない）
- [ ] 戻り値: `{ ok: true; delegation: ApprovalDelegation } | { ok: false; reason: string }`
- [ ] `src/application/usecases/index.ts` にエクスポートを追加する

**Acceptance Criteria**:
- 自己委譲が拒否される
- クロスオーグ委譲が拒否される
- 期間重複する委譲が拒否される
- `startDate >= endDate` の委譲が拒否される
- 正常系で委譲が作成される
- 正常系で `audit_logs` に記録される
- `typecheck` が green

## T-07: Usecase — `deactivateDelegation` 実装

- [ ] `src/application/usecases/deactivateDelegation.ts` を作成する
- [ ] 入力: `{ delegationId, organizationId }`
- [ ] `approvalDelegationRepository.update(delegationId, organizationId, { isActive: false })` を呼び出す
- [ ] 存在しない場合は `{ ok: false, reason: "Delegation not found." }` を返す
- [ ] 無効化成功後、`auditLogRepository.create` で操作を記録する（対象が存在しない場合は記録しない）
- [ ] 戻り値: `{ ok: true } | { ok: false; reason: string }`
- [ ] `src/application/usecases/index.ts` にエクスポートを追加する

**Acceptance Criteria**:
- 存在する委譲を無効化できる
- 無効化成功時に `audit_logs` に記録される
- 存在しない委譲に対してエラーが返る
- `typecheck` が green

## T-08: Usecase — `listDelegations` 実装

- [ ] `src/application/usecases/listDelegations.ts` を作成する
- [ ] 入力: `{ organizationId }`
- [ ] `approvalDelegationRepository.findByOrganization(organizationId)` を呼び出す
- [ ] 戻り値: `ApprovalDelegation[]`
- [ ] `src/application/usecases/index.ts` にエクスポートを追加する

**Acceptance Criteria**:
- 組織内の委譲一覧を取得できる
- `typecheck` が green

## T-09: Usecase — `approveRequest` への代理承認統合

- [ ] `src/application/usecases/approveRequest.ts` を修正する
- [ ] `approvalDelegationRepository` を import する
- [ ] `canApproveWithDelegation` を import する（`canApprove` と併用）
- [ ] Pre-TX の fast-fail チェック: `approvalDelegationRepository.findActiveByToUserId(data.actorId, data.organizationId, new Date())` で委譲データを取得し、`canApproveWithDelegation(currentStep, data.actorRole, delegations)` で判定する
- [ ] TX 内の再チェック: `approvalDelegationRepository.findActiveByToUserId(data.actorId, data.organizationId, new Date(), tx)` で TX 内の最新データを取得し、再度 `canApproveWithDelegation` で判定する
- [ ] 代理承認時の監査ログ: `canApproveWithDelegation` が返す `delegation` が存在する場合、audit_log の metadata に `delegatedFrom: delegation.fromUserId` を追加する
- [ ] ゼロステップフロー（`steps.length === 0`）では委譲チェックを追加しない（既存動作維持）

**Acceptance Criteria**:
- 委譲先ユーザーが委譲元のロールで承認できる
- TX 内で委譲データを取得している（TOCTOU 防止）
- 代理承認時の audit_log metadata に `delegatedFrom` が含まれる
- 通常承認時の audit_log metadata に `delegatedFrom` が含まれない
- 既存のゼロステップフローが影響を受けない
- `typecheck` が green

## T-10: rejectRequest はスコープ外（代理承認チェック追加なし）

request.md 要件 5 に従い、`rejectRequest` には canApprove チェックを追加しない。却下は現在ロールチェックなしで動作しており、本 request ではスコープを維持する。将来のセキュリティ強化 request で対応する。

**このタスクは作業なし（スキップ）。**

## T-11: Server Action — 委譲管理用アクション

- [ ] `src/app/actions/delegations.ts` を作成する（`"use server"` 宣言）
- [ ] `createDelegationAction`: admin ロールチェック → `createDelegation` usecase 呼び出し → `revalidatePath("/settings/delegations")`
- [ ] `deactivateDelegationAction`: admin ロールチェック → `deactivateDelegation` usecase 呼び出し → `revalidatePath("/settings/delegations")`
- [ ] `listDelegationsAction`: admin ロールチェック → `listDelegations` usecase 呼び出し
- [ ] 入力バリデーションに zod スキーマを使用する（fromUserId, toUserId: uuid, startDate, endDate: date）
- [ ] `organizationId` はユーザー入力から受け取らず、認証セッション（`auth()` 等で取得したセッション情報）から取得する。ユーザー入力に organizationId を含めるとテナント境界バイパスが可能になるため、必ずサーバー側セッションから取得すること

**Acceptance Criteria**:
- admin 以外のロールでアクセスした場合にエラーが返る
- バリデーションエラー時に適切なメッセージが返る
- `typecheck` が green

## T-12: UI — 委譲管理ページ

- [ ] `src/app/(routes)/settings/delegations/page.tsx` を作成する
- [ ] 委譲一覧表示: 委譲元ユーザー名、委譲先ユーザー名、期間、状態（active/inactive）
- [ ] 委譲追加フォーム: fromUserId（ユーザー選択）、toUserId（ユーザー選択）、startDate、endDate
- [ ] 無効化ボタン: アクティブな委譲に対して無効化操作を実行
- [ ] admin ロール以外のアクセスを `redirect` でブロックする
- [ ] ユーザー一覧は同一組織内のユーザーを取得する usecase / repository を利用する

**Acceptance Criteria**:
- `/settings/delegations` で委譲一覧が表示される
- 委譲の追加・無効化が UI から操作できる
- admin 以外のユーザーがアクセスできない
- `bun run build` が成功する

## T-13: Usecase テスト — 委譲バリデーションのテスト

- [ ] `src/__tests__/usecases/approvalDelegation.test.ts` を作成する
- [ ] ソースコードの静的解析テスト（既存テストパターンに準拠）:
  - `createDelegation.ts` に自己委譲チェック (`fromUserId === toUserId` or equivalent) が存在する
  - `createDelegation.ts` にクロスオーグチェック（`userRepository.findById` の呼び出しと organizationId の一致確認）が存在する
  - `createDelegation.ts` に `findOverlapping` 呼び出しが存在する
  - `approveRequest.ts` に `findActiveByToUserId` 呼び出しが存在する
  - `approveRequest.ts` の TX 内（`db.transaction` コールバック内）に `findActiveByToUserId` 呼び出しが存在する
  - `approveRequest.ts` に `canApproveWithDelegation` 呼び出しが存在する
  - `approveRequest.ts` に `delegatedFrom` を含む metadata 記録が存在する
  - 注: `rejectRequest.ts` への代理承認統合は本 request のスコープ外（T-10 参照）

**Acceptance Criteria**:
- `bun test src/__tests__/usecases/approvalDelegation.test.ts` が全件 green
- 上記の静的解析チェックがカバーされている

## T-14: Schema テスト — `approval_delegations` テーブルの存在確認

- [ ] `src/__tests__/static/projectStructure.test.ts` に追加する（または新規テスト作成）
  - `schema.ts` に `approval_delegations` テーブル定義が存在する
  - `approvalDelegation.ts` ドメインモデルが存在する
  - `approvalDelegationRepository.ts` が存在する
  - `repositories/index.ts` に `approvalDelegationRepository` エクスポートが存在する

**Acceptance Criteria**:
- `bun test` でこれらの構造テストが green

## T-15: シードデータ — 委譲サンプル追加

- [ ] `src/infrastructure/seed.ts` を修正する
- [ ] `approvalDelegations` テーブルのインポートを追加する
- [ ] truncate 処理に `await db.delete(approvalDelegations)` を追加する（FK 制約を考慮し `users` 削除の前）
- [ ] managerUser → adminUser への委譲を1件追加する
  - `startDate`: 本日（seed 実行日）
  - `endDate`: 7日後
  - `isActive`: true
  - `organizationId`: org.id
- [ ] シードログに委譲作成のメッセージを出力する

**Acceptance Criteria**:
- `bun run seed` が成功する
- 委譲レコードが1件作成される
- `typecheck` が green

## T-16: 最終検証

- [ ] `bun run build` が成功する
- [ ] `bun test` が全件 green
- [ ] `typecheck` が green
- [ ] 依存方向 `actions → usecases → domain / infrastructure` が遵守されている（domain service が repository を呼び出していない）
