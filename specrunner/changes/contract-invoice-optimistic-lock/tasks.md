# Tasks: 契約・請求の楽観的ロック

## T-01: schema.ts に contracts / invoices の version カラムを追加する

- [ ] `src/infrastructure/schema.ts` の `contracts` テーブル定義に `version: integer("version").notNull().default(1)` を追加する（`updatedAt` の直後）
- [ ] `src/infrastructure/schema.ts` の `invoices` テーブル定義に `version: integer("version").notNull().default(1)` を追加する（`updatedAt` の直後）

**Acceptance Criteria**:
- contracts テーブル定義に `integer("version").notNull().default(1)` が含まれる
- invoices テーブル定義に `integer("version").notNull().default(1)` が含まれる
- `bun run build` と typecheck が通る

## T-02: Drizzle マイグレーションを生成する

- [ ] `bunx drizzle-kit generate` を実行して差分マイグレーション SQL を生成する
- [ ] 生成されたマイグレーションが `ALTER TABLE ... ADD COLUMN "version" integer DEFAULT 1 NOT NULL` であることを確認する（contracts と invoices の両方）
- [ ] テーブル再作成や DROP が含まれていないことを確認する

**Acceptance Criteria**:
- `drizzle/` 配下に新しいマイグレーション SQL ファイルが生成されている
- マイグレーション SQL は ADD COLUMN のみで、既存データを破壊しない
- 既存行に DEFAULT 1 が適用される SQL になっている

## T-03: Contract ドメインモデルに version フィールドを追加する

- [ ] `src/domain/models/contract.ts` の `Contract` 型に `version: number` を追加する

**Acceptance Criteria**:
- Contract 型に `version: number` が存在する
- ContractWithClient 型は Contract を拡張しているため自動的に version を含む
- typecheck が通る

## T-04: Invoice ドメインモデルに version フィールドを追加する

- [ ] `src/domain/models/invoice.ts` の `Invoice` 型に `version: number` を追加する

**Acceptance Criteria**:
- Invoice 型に `version: number` が存在する
- typecheck が通る

## T-05: contractRepository の mapRow に version を追加する

- [ ] `src/infrastructure/repositories/contractRepository.ts` の `mapRow` 関数に `version: row.version` を追加する

**Acceptance Criteria**:
- mapRow が `version: row.version` を含む
- findById / findAllByDealId / findAllByClientId / findAllByOrganization の戻り値に version が含まれる
- typecheck が通る

## T-06: invoiceRepository の mapRow に version を追加する

- [ ] `src/infrastructure/repositories/invoiceRepository.ts` の `mapRow` 関数に `version: row.version` を追加する

**Acceptance Criteria**:
- mapRow が `version: row.version` を含む
- findById / findAllByContract / findAllByOrganization の戻り値に version が含まれる
- typecheck が通る

## T-07: contractRepository.update に楽観的ロックを実装する

- [ ] `contractRepository.update` のシグネチャに `expectedVersion: number` パラメータを追加する（`data` の後、`tx` の前）
- [ ] WHERE 条件に `eq(contracts.version, expectedVersion)` を追加する
- [ ] SET に `version: sql\`version + 1\`` を追加する
- [ ] `sql` を drizzle-orm の import に追加する（未 import の場合）

**Acceptance Criteria**:
- `contractRepository.update` が `expectedVersion: number` を受け取る
- WHERE に `eq(contracts.version, expectedVersion)` が含まれる
- SET に `version: sql\`version + 1\`` が含まれる
- version 不一致時は更新行数 0 → null が返る（既存の `.returning()` + `result[0] ? ... : null` ロジックで実現）
- typecheck が通る

## T-08: invoiceRepository.update に楽観的ロックを実装する

- [ ] `invoiceRepository.update` のシグネチャに `expectedVersion: number` パラメータを追加する（`data` の後、`tx` の前）
- [ ] WHERE 条件に `eq(invoices.version, expectedVersion)` を追加する
- [ ] SET に `version: sql\`version + 1\`` を追加する

**Acceptance Criteria**:
- `invoiceRepository.update` が `expectedVersion: number` を受け取る
- WHERE に `eq(invoices.version, expectedVersion)` が含まれる
- SET に `version: sql\`version + 1\`` が含まれる
- version 不一致時は null が返る
- typecheck が通る

## T-09: invoiceRepository.updateStatus に楽観的ロックを実装する

- [ ] `invoiceRepository.updateStatus` のシグネチャに `expectedVersion: number` パラメータを追加する（`additionalFields` の後、`tx` の前）
- [ ] WHERE 条件に `eq(invoices.version, expectedVersion)` を追加する
- [ ] SET に `version: sql\`version + 1\`` を追加する

**Acceptance Criteria**:
- `invoiceRepository.updateStatus` が `expectedVersion: number` を受け取る
- WHERE に `eq(invoices.version, expectedVersion)` が含まれる
- SET に `version: sql\`version + 1\`` が含まれる
- version 不一致時は null が返る
- typecheck が通る

## T-10: updateContract usecase に楽観的ロックを統合する

- [ ] `src/application/usecases/updateContract.ts` で findById から取得した `contract.version` を保持する
- [ ] `contractRepository.update` 呼び出し時に `contract.version` を `expectedVersion` として渡す
- [ ] `updatedContract` が null の場合（既存の `!updated` チェックの前）に `{ ok: false, reason: "この契約は他のユーザーによって更新されました。画面を更新してください" }` を返す

**Acceptance Criteria**:
- `contract.version` が `contractRepository.update` に渡されている
- ロック失敗時に「この契約は他のユーザーによって更新されました。画面を更新してください」が返る
- typecheck が通る

## T-11: updateContractStatus usecase に楽観的ロックを統合する

- [ ] `src/application/usecases/updateContractStatus.ts` で findById から取得した `contract.version` を保持する
- [ ] `contractRepository.update` 呼び出し時に `contract.version` を `expectedVersion` として渡す
- [ ] `updatedContract` が null の場合に `{ ok: false, reason: "この契約は他のユーザーによって更新されました。画面を更新してください" }` を返す

**Acceptance Criteria**:
- `contract.version` が `contractRepository.update` に渡されている
- ロック失敗時に統一メッセージが返る
- typecheck が通る

## T-12: updateInvoice usecase に楽観的ロックを統合する

- [ ] `src/application/usecases/updateInvoice.ts` で findById から取得した `invoice.version` を保持する
- [ ] `invoiceRepository.update` 呼び出し時に `invoice.version` を `expectedVersion` として渡す（金額検証で freshInvoice を再取得するパスでも、expectedVersion には必ずトランザクション開始前に取得した `invoice.version` を使用する。freshInvoice.version はトランザクション内の最新値であり、楽観的ロックの競合検出に使用してはならない）
- [ ] `updatedInvoice` が null の場合に `{ ok: false, reason: "この請求は他のユーザーによって更新されました。画面を更新してください" }` を返す

**Acceptance Criteria**:
- トランザクション開始前に findById で取得した `invoice.version` が、金額変更パスを含む全パスで `invoiceRepository.update` の `expectedVersion` に渡されている
- `freshInvoice.version` は `expectedVersion` として使用しない（freshInvoice は金額検証にのみ使用する）
- ロック失敗時に「この請求は他のユーザーによって更新されました。画面を更新してください」が返る
- typecheck が通る

## T-13: updateInvoiceStatus usecase に楽観的ロックを統合する

- [ ] `src/application/usecases/updateInvoiceStatus.ts` で findById から取得した `invoice.version` を保持する
- [ ] `invoiceRepository.updateStatus` 呼び出し時に `invoice.version` を `expectedVersion` として渡す
- [ ] `updatedInvoice` が null の場合に `{ ok: false, reason: "この請求は他のユーザーによって更新されました。画面を更新してください" }` を返す

**Acceptance Criteria**:
- `invoice.version` が `invoiceRepository.updateStatus` に渡されている
- ロック失敗時に統一メッセージが返る
- typecheck が通る

## T-14: 楽観的ロックの静的コード解析テストを追加する

既存の `src/__tests__/usecases/optimisticLock.test.ts` を拡張し、contracts / invoices の楽観的ロックを検証するテストケースを追加する。

- [ ] **Repository WHERE clause**: `contractRepository.update` に `eq(contracts.version, expectedVersion)` が含まれることを検証
- [ ] **Repository WHERE clause**: `invoiceRepository.update` に `eq(invoices.version, expectedVersion)` が含まれることを検証
- [ ] **Repository WHERE clause**: `invoiceRepository.updateStatus` に `eq(invoices.version, expectedVersion)` が含まれることを検証
- [ ] **Repository version increment**: `contractRepository.update` に ``version: sql`version + 1` `` が含まれることを検証
- [ ] **Repository version increment**: `invoiceRepository.update` に ``version: sql`version + 1` `` が含まれることを検証
- [ ] **Repository version increment**: `invoiceRepository.updateStatus` に ``version: sql`version + 1` `` が含まれることを検証
- [ ] **Repository mapRow**: `contractRepository.mapRow` に `version: row.version` が含まれることを検証
- [ ] **Repository mapRow**: `invoiceRepository.mapRow` に `version: row.version` が含まれることを検証
- [ ] **Usecase version passing**: `updateContract` が `contract.version` を参照していることを検証
- [ ] **Usecase version passing**: `updateContractStatus` が `contract.version` を参照していることを検証
- [ ] **Usecase version passing**: `updateInvoice` が `invoice.version` を `expectedVersion` として `invoiceRepository.update` に渡していることを検証（`freshInvoice.version` を expectedVersion に使用していないことも確認）
- [ ] **Usecase version passing**: `updateInvoiceStatus` が `invoice.version` を参照していることを検証
- [ ] **Usecase failure message**: 4 usecase に「他のユーザーによって更新されました」が含まれることを検証
- [ ] **Domain model**: Contract 型に `version: number` が含まれることを検証
- [ ] **Domain model**: Invoice 型に `version: number` が含まれることを検証
- [ ] **Schema**: contracts テーブルの schema に `integer("version")` が含まれることを検証
- [ ] **Schema**: invoices テーブルの schema に `integer("version")` が含まれることを検証

**Acceptance Criteria**:
- 全テストケースが pass する（`bun test` が green）
- 既存の optimisticLock.test.ts のテストが壊れていない
- version 不一致で更新が拒否されること、version 一致で更新が成功し version がインクリメントされることをコード解析で確認している

## T-15: 全体の検証

- [ ] `bun run build` が成功する
- [ ] typecheck が通る
- [ ] `bun test` が全件 green

**Acceptance Criteria**:
- 既存テストが無変更で全件 green
- 新規テストが全件 green
- ビルド・型チェックが通る
