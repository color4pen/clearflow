# Test Cases: 楽観的ロックと冪等性キー

## Summary

- **Total**: 30 cases
- **Automated** (unit/integration): 26
- **Manual**: 4
- **Priority**: must: 25, should: 5, could: 0

---

## Category: スキーマ / ドメインモデル

### TC-001: 新規申請作成時に version が 1 で初期化される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: requests テーブルと approval_steps テーブルに version カラムが存在する > Scenario: 新規申請作成時に version が 1 で初期化される

---

### TC-002: 新規承認ステップ作成時に version が 1 で初期化される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: requests テーブルと approval_steps テーブルに version カラムが存在する > Scenario: 新規承認ステップ作成時に version が 1 で初期化される

---

### TC-003: Request 型に version フィールドが含まれる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: ドメインモデルに version フィールドが存在する > Scenario: Request 型に version が含まれる

---

### TC-004: ApprovalStep 型に version フィールドが含まれる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: ドメインモデルに version フィールドが存在する > Scenario: ApprovalStep 型に version が含まれる

---

### TC-005: requests テーブルの version カラムが NOT NULL・DEFAULT 1 で定義されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `src/infrastructure/schema.ts` の `requests` テーブル定義
**WHEN** `version` カラムの定義を確認する
**THEN** `integer("version").notNull().default(1)` として定義されており、型が `integer`・`NOT NULL`・デフォルト値 `1` である

---

### TC-006: approval_steps テーブルの version カラムが NOT NULL・DEFAULT 1 で定義されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `src/infrastructure/schema.ts` の `approval_steps` テーブル定義
**WHEN** `version` カラムの定義を確認する
**THEN** `integer("version").notNull().default(1)` として定義されており、型が `integer`・`NOT NULL`・デフォルト値 `1` である

---

### TC-007: idempotency_keys テーブルのスキーマ定義

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: idempotency_keys テーブルが存在する > Scenario: idempotency_keys テーブルのスキーマ定義

---

## Category: 楽観的ロック — Repository 層

### TC-008: version 一致で Request の状態更新が成功し version がインクリメントされる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 楽観的ロック — version 一致で更新が成功する > Scenario: version 一致で Request の状態更新が成功する

---

### TC-009: version 一致で ApprovalStep の状態更新が成功し version がインクリメントされる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 楽観的ロック — version 一致で更新が成功する > Scenario: version 一致で ApprovalStep の状態更新が成功する

---

### TC-010: version 不一致で Request の状態更新が拒否される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 楽観的ロック — version 不一致で更新が拒否される > Scenario: version 不一致で Request の状態更新が拒否される

---

### TC-011: version 不一致で ApprovalStep の状態更新が拒否される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 楽観的ロック — version 不一致で更新が拒否される > Scenario: version 不一致で ApprovalStep の状態更新が拒否される

---

### TC-012: version のインクリメントが Repository 内の SQL で行われ usecase 側では計算されない

**Category**: unit
**Priority**: must
**Source**: design.md > D3: version フィールドの Repository 責務

**GIVEN** `src/infrastructure/repositories/requestRepository.ts` と `approvalStepRepository.ts` の `updateStatus` 実装
**WHEN** `updateStatus` の SET 句を確認する
**THEN** `version: sql\`version + 1\`` が SQL で直接インクリメントされており、usecase 側で `version + 1` の計算を行っていない

---

### TC-013: 再申請時にリセットされたステップの version がインクリメントされる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: resetSteps で version がインクリメントされる > Scenario: 再申請時にリセットされたステップの version がインクリメントされる

---

## Category: 楽観的ロック — Usecase 層

### TC-014: approveRequest で楽観的ロック競合が発生したときユーザーフレンドリーなエラーが返る

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Usecase が楽観的ロック競合を検出してユーザーフレンドリーなエラーを返す > Scenario: approveRequest で楽観的ロック競合が発生する

---

### TC-015: submitRequest で楽観的ロック競合が発生したときユーザーフレンドリーなエラーが返る

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Usecase が楽観的ロック競合を検出してユーザーフレンドリーなエラーを返す > Scenario: submitRequest で楽観的ロック競合が発生する

---

### TC-016: rejectRequest（差し戻しパス）で楽観的ロック競合が発生したときエラーが返る

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** version = 1 の申請と承認ステップが存在し、差し戻しパス（revision）で rejectRequest を呼ぶ状況
**WHEN** `approvalStepRepository.updateStatus` または `requestRepository.updateStatus` が `null` を返す（version 不一致）
**THEN** `{ ok: false, reason: "この申請は他のユーザーによって更新されました。画面を更新してください" }` が返る

---

### TC-017: rejectRequest（却下パス）で楽観的ロック競合が発生したときエラーが返る

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** version = 1 の申請が存在し、却下パスで rejectRequest を呼ぶ状況
**WHEN** `requestRepository.updateStatus` が `null` を返す（version 不一致）
**THEN** `{ ok: false, reason: "この申請は他のユーザーによって更新されました。画面を更新してください" }` が返る

---

### TC-018: resubmitRequest で楽観的ロック競合が発生したときエラーが返る

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** version = 1 の申請が存在し、resubmitRequest を呼ぶ状況
**WHEN** `requestRepository.updateStatus` が `null` を返す（version 不一致）
**THEN** `{ ok: false, reason: "この申請は他のユーザーによって更新されました。画面を更新してください" }` が返る

---

## Category: 冪等性キー — Repository・Server Actions

### TC-019: 承認操作の冪等性キー重複で前回の結果が返る

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 冪等性 — 同じキーで 2 回目のリクエストが前回の結果を返す > Scenario: 承認操作の冪等性キー重複

---

### TC-020: 却下操作の冪等性キー重複で前回の結果が返る

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 冪等性 — 同じキーで 2 回目のリクエストが前回の結果を返す > Scenario: 却下操作の冪等性キー重複

---

### TC-021: 異なるキーで同じ申請への承認操作がそれぞれ独立して実行される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 冪等性 — 異なるキーで同じ操作が正常に実行される > Scenario: 異なるキーで同じ申請への承認操作

---

### TC-022: approveRequestAction が FormData から idempotencyKey を受け取る

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Server Actions に idempotencyKey パラメータが追加されている > Scenario: approveRequestAction が idempotencyKey を受け取る

---

### TC-023: Server Action に冪等性キーなしで呼ばれた場合に従来通り usecase が実行される（後方互換性）

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-12

**GIVEN** `approveRequestAction`（または他の対象 Action）が冪等性キーを含まない FormData で呼ばれる
**WHEN** Server Action を実行する
**THEN** 冪等性チェックをスキップし、通常通り usecase が実行されて結果が返る

---

### TC-024: idempotencyKeyRepository が findByKey と create を持ち index.ts から export されている

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-06

**GIVEN** `src/infrastructure/repositories/idempotencyKeyRepository.ts` と `src/infrastructure/repositories/index.ts`
**WHEN** 実装と export を確認する
**THEN** `findByKey(key, organizationId)` と `create(data)` が実装されており、`index.ts` から `idempotencyKeyRepository` が export されている

---

## Category: 依存方向

### TC-025: usecase が冪等性キーの repository を直接参照しない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 依存方向の維持 > Scenario: usecase が冪等性キーの repository を直接参照しない

---

### TC-026: requestRepository.findById がオプショナルな tx パラメータを受け取れる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-11

**GIVEN** `src/infrastructure/repositories/requestRepository.ts` の `findById` 実装
**WHEN** シグネチャを確認する
**THEN** `tx?: Transaction` のオプショナルパラメータが存在し、`const queryRunner = tx ?? db` パターンが適用されており、既存の tx なし呼び出しが破壊されない

---

## Category: UI

### TC-027: 承認ボタンクリック時に冪等性キーが生成される

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: UI で冪等性キーが生成される > Scenario: 承認ボタンクリック時に冪等性キーが生成される

---

### TC-028: ActionButtons コンポーネントが送信中にボタンを disabled にする

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-13

**GIVEN** 申請詳細ページで ActionButtons コンポーネントが表示されている
**WHEN** 承認（または却下・差し戻し・再申請）ボタンをクリックして送信中の状態にする
**THEN** ボタンが disabled 状態になり、重複クリックができない。送信完了後にボタンが有効に戻る

---

## Category: ビルド / 全体検証

### TC-029: bun run build が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-01 AC / request.md 受け入れ基準

**GIVEN** 全ての実装変更が完了した状態
**WHEN** `bun run build` を実行する
**THEN** ビルドエラーなしで完了する

---

### TC-030: bun test が全件 green になる

**Category**: manual
**Priority**: must
**Source**: request.md 受け入れ基準

**GIVEN** 全ての実装変更が完了した状態
**WHEN** `bun test` を実行する
**THEN** 全テストケースが green で完了し、失敗・エラーがない

---

## Result

```yaml
result: completed
total: 30
automated: 26
manual: 4
must: 22
should: 5
could: 0
blocked_reasons: []
```
