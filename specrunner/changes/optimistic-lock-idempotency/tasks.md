# Tasks: 楽観的ロックと冪等性キー

## T-01: スキーマに version カラムを追加

- [ ] `src/infrastructure/schema.ts` — `requests` テーブルに `version: integer("version").notNull().default(1)` を追加（`updatedAt` の直後に配置）
- [ ] `src/infrastructure/schema.ts` — `approval_steps` テーブルに `version: integer("version").notNull().default(1)` を追加（`organizationId` の直後に配置）

**Acceptance Criteria**:
- `requests` テーブル定義に `version` カラムが存在し、型は `integer`、`NOT NULL`、デフォルト値 `1`
- `approval_steps` テーブル定義に `version` カラムが存在し、型は `integer`、`NOT NULL`、デフォルト値 `1`
- `bun run build` が成功する

---

## T-02: idempotency_keys テーブルをスキーマに追加

- [ ] `src/infrastructure/schema.ts` — `idempotencyKeys` テーブルを定義する。カラム:
  - `id`: uuid PK (defaultRandom)
  - `key`: text, notNull, unique
  - `action`: text, notNull
  - `result`: jsonb, notNull
  - `organizationId`: uuid FK → organizations, notNull
  - `createdAt`: timestamp, defaultNow, notNull
- [ ] `src/infrastructure/schema.ts` — `idempotencyKeys` の relations を追加（organization への many-to-one）
- [ ] `src/infrastructure/schema.ts` — `organizationsRelations` に `idempotencyKeys: many(idempotencyKeys)` を追加

**Acceptance Criteria**:
- `idempotencyKeys` テーブルが schema.ts に定義されている
- `key` カラムに unique 制約がある
- `organizationId` が organizations テーブルへの FK である
- relations が正しく設定されている
- `bun run build` が成功する

---

## T-03: ドメインモデルに version フィールドを追加

- [ ] `src/domain/models/request.ts` — `Request` 型に `version: number` フィールドを追加
- [ ] `src/domain/models/approvalStep.ts` — `ApprovalStep` 型に `version: number` フィールドを追加

**Acceptance Criteria**:
- `Request` 型に `version: number` が存在する
- `ApprovalStep` 型に `version: number` が存在する
- `typecheck` が green

---

## T-04: requestRepository に楽観的ロックを実装

- [ ] `src/infrastructure/repositories/requestRepository.ts` — `mapRow` 関数に `version: row.version` を追加
- [ ] `src/infrastructure/repositories/requestRepository.ts` — `create` 関数の返却値に version が含まれることを確認（schema の default で自動設定されるため、returning() で取得される）
- [ ] `src/infrastructure/repositories/requestRepository.ts` — `updateStatus` のシグネチャに `expectedVersion: number` パラメータを追加（`updatedAt` の後、`tx` の前）
- [ ] `src/infrastructure/repositories/requestRepository.ts` — `updateStatus` の `.set()` に `version: sql\`version + 1\`` を追加
- [ ] `src/infrastructure/repositories/requestRepository.ts` — `updateStatus` の `.where()` に `eq(requests.version, expectedVersion)` 条件を追加
- [ ] `src/infrastructure/repositories/requestRepository.ts` — `sql` を `drizzle-orm` から import に追加

**Acceptance Criteria**:
- `updateStatus` が `expectedVersion` パラメータを受け取る
- WHERE 条件に `version = expectedVersion` が含まれる
- 更新成功時に version がインクリメントされた行が返る
- version 不一致時に `null` が返る（更新行数 0）
- `mapRow` が `version` をマッピングしている
- `typecheck` が green

---

## T-05: approvalStepRepository に楽観的ロックを実装

- [ ] `src/infrastructure/repositories/approvalStepRepository.ts` — `mapRow` 関数に `version: row.version` を追加
- [ ] `src/infrastructure/repositories/approvalStepRepository.ts` — `createMany` の返却値に version が含まれることを確認
- [ ] `src/infrastructure/repositories/approvalStepRepository.ts` — `updateStatus` のシグネチャに `expectedVersion: number` パラメータを追加（`data` の後、`tx` の前）
- [ ] `src/infrastructure/repositories/approvalStepRepository.ts` — `updateStatus` の `.set()` に `version: sql\`version + 1\`` を追加
- [ ] `src/infrastructure/repositories/approvalStepRepository.ts` — `updateStatus` の `.where()` に `eq(approvalSteps.version, expectedVersion)` 条件を追加
- [ ] `src/infrastructure/repositories/approvalStepRepository.ts` — `resetSteps` の `.set()` に `version: sql\`version + 1\`` を追加（version もインクリメント）
- [ ] `src/infrastructure/repositories/approvalStepRepository.ts` — `sql` を `drizzle-orm` から import に追加

**Acceptance Criteria**:
- `updateStatus` が `expectedVersion` パラメータを受け取る
- WHERE 条件に `version = expectedVersion` が含まれる
- 更新成功時に version がインクリメントされた行が返る
- version 不一致時に `null` が返る
- `resetSteps` でも version がインクリメントされる
- `mapRow` が `version` をマッピングしている
- `typecheck` が green

---

## T-06: idempotencyKeyRepository を新設

- [ ] `src/infrastructure/repositories/idempotencyKeyRepository.ts` を新規作成
- [ ] `findByKey(key: string, organizationId: string): Promise<{ result: unknown } | null>` — key + organizationId で検索し、存在すれば result を返す。存在しなければ null
- [ ] `create(data: { key: string; action: string; result: unknown; organizationId: string }): Promise<void>` — 新しい冪等性キーレコードを INSERT する
- [ ] `src/infrastructure/repositories/index.ts` — `idempotencyKeyRepository` を export に追加

**Acceptance Criteria**:
- `idempotencyKeyRepository.ts` が存在する
- `findByKey` と `create` が実装されている
- `index.ts` から export されている
- `typecheck` が green

---

## T-07: approveRequest usecase に楽観的ロックを統合

- [ ] `src/application/usecases/approveRequest.ts` — エンティティ取得時（`requestRepository.findById` / `approvalStepRepository.findByRequestId`）の version を保持する
- [ ] ステップなしパス: `requestRepository.updateStatus` 呼び出しに `existing.version` を渡す
- [ ] マルチステップパス: `approvalStepRepository.updateStatus` 呼び出しに `freshCurrentStep.version` を渡す
- [ ] マルチステップパス: `requestRepository.updateStatus`（全ステップ承認時）呼び出しに、トランザクション内で再取得した request の version を使用する。再取得のために `requestRepository.findById` の tx 対応版が必要な場合は追加する
- [ ] 各 `updateStatus` の戻り値が `null` の場合、楽観的ロック失敗メッセージを返す: `{ ok: false, reason: "この申請は他のユーザーによって更新されました。画面を更新してください" }`

**Acceptance Criteria**:
- 全ての `updateStatus` 呼び出しに version が渡されている
- version 不一致時に適切なエラーメッセージが返される
- 既存のロジック（状態遷移チェック、ロール検証、監査ログ、webhook）は変更されない
- `typecheck` が green

---

## T-08: rejectRequest usecase に楽観的ロックを統合

- [ ] `src/application/usecases/rejectRequest.ts` — `existing.version` を保持する
- [ ] 差し戻し（revision）パス: `approvalStepRepository.updateStatus` に `currentStep.version` を渡す（トランザクション内で再取得した値を使用）
- [ ] 差し戻しパス: `requestRepository.updateStatus` に request の version を渡す
- [ ] 却下パス: `requestRepository.updateStatus` に `existing.version` を渡す
- [ ] 各 `updateStatus` の戻り値が `null` の場合、楽観的ロック失敗メッセージを返す

**Acceptance Criteria**:
- 全ての `updateStatus` 呼び出しに version が渡されている
- version 不一致時に適切なエラーメッセージが返される
- `typecheck` が green

---

## T-09: submitRequest usecase に楽観的ロックを統合

- [ ] `src/application/usecases/submitRequest.ts` — `existing.version` を保持する
- [ ] `requestRepository.updateStatus` に `existing.version` を渡す
- [ ] `updateStatus` の戻り値が `null` の場合、楽観的ロック失敗メッセージを返す

**Acceptance Criteria**:
- `updateStatus` 呼び出しに version が渡されている
- version 不一致時に適切なエラーメッセージが返される
- `typecheck` が green

---

## T-10: resubmitRequest usecase に楽観的ロックを統合

- [ ] `src/application/usecases/resubmitRequest.ts` — `existing.version` を保持する
- [ ] `requestRepository.updateStatus` に `existing.version` を渡す
- [ ] `updateStatus` の戻り値が `null` の場合、楽観的ロック失敗メッセージを返す
- [ ] 注: `resetSteps` は version チェック不要（D7 の設計判断に基づく）

**Acceptance Criteria**:
- `requestRepository.updateStatus` 呼び出しに version が渡されている
- version 不一致時に適切なエラーメッセージが返される
- `typecheck` が green

---

## T-11: requestRepository.findById に Transaction 対応を追加

- [ ] `src/infrastructure/repositories/requestRepository.ts` — `findById` のシグネチャに `tx?: Transaction` パラメータを追加
- [ ] `const queryRunner = tx ?? db;` パターンを適用

**Acceptance Criteria**:
- `findById` がオプショナルな `tx` パラメータを受け取る
- トランザクション内から呼び出し可能
- 既存の呼び出し（tx なし）が破壊されない
- `typecheck` が green

---

## T-12: Server Actions に冪等性キーチェックを実装

- [ ] `src/app/actions/requests.ts` — `idempotencyKeyRepository` を import に追加
- [ ] `submitRequestAction` — FormData から `idempotencyKey` を取得。キーが存在する場合は `findByKey` で検索し、既存なら保存済み result を返す。存在しなければ usecase 実行後に `create` で結果を保存する
- [ ] `approveRequestAction` — 同上
- [ ] `rejectRequestAction` — 同上
- [ ] `resubmitRequestAction` — 同上
- [ ] 冪等性キーが FormData に含まれない場合は従来通り usecase を実行する（後方互換性）

**Acceptance Criteria**:
- 4 つの Server Action 全てで冪等性キーチェックが実装されている
- 同じキーで 2 回呼ばれた場合、2 回目は前回の結果を返し usecase を実行しない
- 冪等性キーなしでも動作する（後方互換性）
- 依存方向 `actions → usecases → infrastructure` を遵守
- `typecheck` が green

---

## T-13: UI にアクションボタンの Client Component を追加

- [ ] `src/app/(dashboard)/requests/[id]/ActionButtons.tsx` を新規作成（Client Component）
- [ ] 承認・却下・差し戻し・再申請の各フォームを実装
- [ ] 各フォーム送信時に `crypto.randomUUID()` で冪等性キーを生成し、hidden input `idempotencyKey` としてフォームに含める
- [ ] `useActionState`（または `useFormStatus`）を使い、送信中はボタンを disabled にする
- [ ] `src/app/(dashboard)/requests/[id]/page.tsx` — アクションボタン部分を `ActionButtons` コンポーネントに置き換える。Server Component のページからは props（requestId, status, Server Action 参照）を渡す

**Acceptance Criteria**:
- ボタンクリック時に UUID v4 の冪等性キーが生成される
- FormData に `idempotencyKey` フィールドが含まれる
- 送信中はボタンが disabled になる
- ページのレンダリングが従来と同じ見た目になる
- `bun run build` が成功する

---

## T-14: 楽観的ロックのテストを追加

- [ ] `src/__tests__/usecases/optimisticLock.test.ts` を新規作成
- [ ] テスト: `requestRepository.updateStatus` の WHERE 条件に version が含まれることをソースコード解析で確認
- [ ] テスト: `approvalStepRepository.updateStatus` の WHERE 条件に version が含まれることをソースコード解析で確認
- [ ] テスト: 各 usecase（approveRequest, rejectRequest, submitRequest, resubmitRequest）が `updateStatus` に version を渡していることをソースコード解析で確認
- [ ] テスト: usecase ソースに楽観的ロック失敗メッセージ「この申請は他のユーザーによって更新されました」が含まれることを確認
- [ ] テスト: `Request` 型と `ApprovalStep` 型に `version` フィールドが含まれることを確認

**Acceptance Criteria**:
- 全テストが green
- 楽観的ロック関連の仕様がテストでカバーされている
- 既存テストが壊れていない

---

## T-15: 冪等性キーのテストを追加

- [ ] `src/__tests__/usecases/idempotencyKey.test.ts` を新規作成
- [ ] テスト: `idempotency_keys` テーブルが schema.ts に定義されていることを確認
- [ ] テスト: `idempotency_keys` テーブルに `key` (unique), `action`, `result` (jsonb), `organizationId`, `createdAt` カラムが存在することを確認
- [ ] テスト: Server Actions（submitRequestAction, approveRequestAction, rejectRequestAction, resubmitRequestAction）が `idempotencyKey` を FormData から取得する処理を含むことをソースコード解析で確認
- [ ] テスト: `idempotencyKeyRepository` が `findByKey` と `create` を export していることをソースコード解析で確認
- [ ] テスト: usecase ファイルが `idempotencyKeyRepository` を import していないことを確認（依存方向の遵守）

**Acceptance Criteria**:
- 全テストが green
- 冪等性キー関連の仕様がテストでカバーされている
- 依存方向の遵守がテストで確認されている
- `bun test` が全件 green
