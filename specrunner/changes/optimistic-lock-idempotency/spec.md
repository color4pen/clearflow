# Spec: 楽観的ロックと冪等性キー

## Requirements

### Requirement: requests テーブルと approval_steps テーブルに version カラムが存在する

requests テーブルと approval_steps テーブルは `version integer NOT NULL DEFAULT 1` カラムを持たなければならない (MUST)。新規レコード作成時の初期値は 1 とする。

#### Scenario: 新規申請作成時に version が 1 で初期化される

**Given** 申請を新規作成する
**When** `requestRepository.create` を実行する
**Then** 作成された申請の `version` は 1 である

#### Scenario: 新規承認ステップ作成時に version が 1 で初期化される

**Given** 承認ステップを新規作成する
**When** `approvalStepRepository.createMany` を実行する
**Then** 作成された各ステップの `version` は 1 である

---

### Requirement: ドメインモデルに version フィールドが存在する

`Request` 型と `ApprovalStep` 型は `version: number` フィールドを持たなければならない (MUST)。

#### Scenario: Request 型に version が含まれる

**Given** `src/domain/models/request.ts` の `Request` 型定義
**When** 型定義を確認する
**Then** `version: number` フィールドが存在する

#### Scenario: ApprovalStep 型に version が含まれる

**Given** `src/domain/models/approvalStep.ts` の `ApprovalStep` 型定義
**When** 型定義を確認する
**Then** `version: number` フィールドが存在する

---

### Requirement: 楽観的ロック — version 一致で更新が成功する

`requestRepository.updateStatus` と `approvalStepRepository.updateStatus` は WHERE 条件に `version = expectedVersion` を含まなければならない (MUST)。version が一致する場合、更新が成功し version がインクリメントされなければならない (MUST)。

#### Scenario: version 一致で Request の状態更新が成功する

**Given** `version = 1` の申請が存在する
**When** `expectedVersion = 1` で `requestRepository.updateStatus` を呼び出す
**Then** 更新が成功し、返却された申請の `version` は 2 である

#### Scenario: version 一致で ApprovalStep の状態更新が成功する

**Given** `version = 1` の承認ステップが存在する
**When** `expectedVersion = 1` で `approvalStepRepository.updateStatus` を呼び出す
**Then** 更新が成功し、返却されたステップの `version` は 2 である

---

### Requirement: 楽観的ロック — version 不一致で更新が拒否される

version が不一致の場合、`updateStatus` は `null` を返さなければならない (MUST)。更新行数が 0 であることで検出する。

#### Scenario: version 不一致で Request の状態更新が拒否される

**Given** `version = 2` の申請が存在する（他のトランザクションが先に更新済み）
**When** `expectedVersion = 1` で `requestRepository.updateStatus` を呼び出す
**Then** 戻り値は `null` であり、申請の状態は変更されない

#### Scenario: version 不一致で ApprovalStep の状態更新が拒否される

**Given** `version = 2` の承認ステップが存在する
**When** `expectedVersion = 1` で `approvalStepRepository.updateStatus` を呼び出す
**Then** 戻り値は `null` であり、ステップの状態は変更されない

---

### Requirement: Usecase が楽観的ロック競合を検出してユーザーフレンドリーなエラーを返す

`approveRequest`, `rejectRequest`, `submitRequest`, `resubmitRequest` の各 usecase は、エンティティ取得時の version を保持し更新時に渡さなければならない (MUST)。楽観的ロック失敗（`null` 戻り値）時は `{ ok: false, reason: "この申請は他のユーザーによって更新されました。画面を更新してください" }` を返さなければならない (MUST)。

#### Scenario: approveRequest で楽観的ロック競合が発生する

**Given** admin A と admin B が同じ承認ステップを閲覧している（version = 1）
**When** admin A が承認を実行し version が 2 になった後、admin B が version 1 で承認を実行する
**Then** admin B の操作は `{ ok: false, reason: "この申請は他のユーザーによって更新されました。画面を更新してください" }` を返す

#### Scenario: submitRequest で楽観的ロック競合が発生する

**Given** 申請者が申請を表示している（version = 1）
**When** 別のプロセスが先に申請を更新し version が 2 になった後、申請者が version 1 で提出する
**Then** 操作は `{ ok: false, reason: "この申請は他のユーザーによって更新されました。画面を更新してください" }` を返す

---

### Requirement: idempotency_keys テーブルが存在する

`idempotency_keys` テーブルが `src/infrastructure/schema.ts` に定義されなければならない (MUST)。カラム: `id` (uuid PK), `key` (text, unique), `action` (text), `result` (jsonb), `organizationId` (uuid FK → organizations), `createdAt` (timestamp)。

#### Scenario: idempotency_keys テーブルのスキーマ定義

**Given** `src/infrastructure/schema.ts` を確認する
**When** `idempotencyKeys` テーブル定義を検索する
**Then** 上記カラムが全て定義されており、`key` カラムに unique 制約がある

---

### Requirement: 冪等性 — 同じキーで 2 回目のリクエストが前回の結果を返す

Server Action は冪等性キーが既に存在する場合、usecase を実行せず保存済みの結果を返さなければならない (MUST)。

#### Scenario: 承認操作の冪等性キー重複

**Given** 冪等性キー "abc-123" で承認操作が成功し、結果が保存されている
**When** 同じ冪等性キー "abc-123" で再度承認操作が呼ばれる
**Then** usecase は実行されず、前回保存された結果 `{ success: true }` が返される

#### Scenario: 却下操作の冪等性キー重複

**Given** 冪等性キー "def-456" で却下操作が成功し、結果が保存されている
**When** 同じ冪等性キー "def-456" で再度却下操作が呼ばれる
**Then** usecase は実行されず、前回保存された結果が返される

---

### Requirement: 冪等性 — 異なるキーで同じ操作が正常に実行される

異なる冪等性キーを持つ同一操作は、それぞれ独立して実行されなければならない (MUST)。

#### Scenario: 異なるキーで同じ申請への承認操作

**Given** 冪等性キー "key-1" で申請 A への承認が成功している
**When** 異なる冪等性キー "key-2" で申請 A への承認を実行する
**Then** 2 回目の操作も独立して usecase が実行される

---

### Requirement: Server Actions に idempotencyKey パラメータが追加されている

`submitRequestAction`, `approveRequestAction`, `rejectRequestAction`, `resubmitRequestAction` は `idempotencyKey` を受け取らなければならない (MUST)。`idempotencyKey` は FormData から取得する。

#### Scenario: approveRequestAction が idempotencyKey を受け取る

**Given** フォームに `idempotencyKey` hidden input が設定されている
**When** `approveRequestAction` が呼ばれる
**Then** FormData から `idempotencyKey` を取得し、冪等性チェックに使用する

---

### Requirement: UI で冪等性キーが生成される

承認・却下・差し戻し・再申請ボタンのクリック時に UUID v4 の冪等性キーを生成し、hidden input として Server Action に渡さなければならない (MUST)。送信中はボタンを disabled にしなければならない (MUST)。

#### Scenario: 承認ボタンクリック時に冪等性キーが生成される

**Given** 申請詳細ページで承認ボタンが表示されている
**When** ユーザーが承認ボタンをクリックする
**Then** UUID v4 の冪等性キーが生成され、FormData に含まれてサーバーに送信される。ボタンは送信完了まで disabled になる。

---

### Requirement: 依存方向の維持

全ての変更は `actions → usecases → domain / infrastructure` の依存方向を遵守しなければならない (MUST)。domain layer は repository を呼び出さない。冪等性チェックは Server Actions 層で行い、usecase 層に冪等性の概念を持ち込まない。

#### Scenario: usecase が冪等性キーの repository を直接参照しない

**Given** `src/application/usecases/` 配下の全ファイル
**When** import 文を確認する
**Then** `idempotencyKeyRepository` への参照が存在しない

---

### Requirement: resetSteps で version がインクリメントされる

`approvalStepRepository.resetSteps` はリセット対象のステップの `version` もインクリメントしなければならない (MUST)。ただし個別の version チェックは行わない。

#### Scenario: 再申請時にリセットされたステップの version がインクリメントされる

**Given** `version = 2` の承認ステップがリセット対象である
**When** `resetSteps` が実行される
**Then** ステップの status は `pending` にリセットされ、`version` は 3 にインクリメントされる
