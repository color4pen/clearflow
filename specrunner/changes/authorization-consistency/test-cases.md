# Test Cases: 認可の一貫性とロックアウト防止

## Summary

- **Total**: 23 cases
- **Automated** (unit/integration): 21
- **Manual**: 2
- **Priority**: must: 12, should: 11, could: 0

---

### TC-001: admin が承認を実行できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 承認アクションは canPerform 経由でロールゲートを行う > Scenario: admin が承認を実行できる

---

### TC-002: member が承認を拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 承認アクションは canPerform 経由でロールゲートを行う > Scenario: member が承認を拒否される

---

### TC-003: finance が却下を実行できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 却下アクションは canPerform 経由でロールゲートを行う > Scenario: finance が却下を実行できる

---

### TC-004: member が却下を拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 却下アクションは canPerform 経由でロールゲートを行う > Scenario: member が却下を拒否される

---

### TC-005: manager が一括承認を実行できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 一括承認アクションは canPerform 経由でロールゲートを行う > Scenario: manager が一括承認を実行できる

---

### TC-006: member が一括承認を拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 一括承認アクションは canPerform 経由でロールゲートを行う > Scenario: member が一括承認を拒否される

---

### TC-007: 最後の admin を降格しようとすると拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 組織で最後の admin は降格できない > Scenario: 最後の admin を降格しようとすると拒否される

---

### TC-008: 他に admin がいれば降格できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 組織で最後の admin は降格できない > Scenario: 他に admin がいれば降格できる

---

### TC-009: admin を admin に変更する場合はガード不要

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: 組織で最後の admin は降格できない > Scenario: admin を admin に変更する場合はガード不要

---

### TC-010: 自分自身のロールを変更しようとすると拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 自己降格ガードは引き続き機能する > Scenario: 自分自身のロールを変更しようとすると拒否される

---

### TC-011: requests.ts が canPerform を使用している

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: requests.ts は canPerform を import する > Scenario: requests.ts が canPerform を使用している

---

### TC-012: manager が承認を実行できる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-02 Acceptance Criteria

**GIVEN** セッションユーザーのロールが `manager` である
**WHEN** `approveRequestAction` を呼び出す
**THEN** `canPerform(role, "approval", "approve")` が true を返し、usecase が実行される

---

### TC-013: finance が承認を実行できる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-02 Acceptance Criteria

**GIVEN** セッションユーザーのロールが `finance` である
**WHEN** `approveRequestAction` を呼び出す
**THEN** `canPerform(role, "approval", "approve")` が true を返し、usecase が実行される

---

### TC-014: admin が却下を実行できる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03 Acceptance Criteria

**GIVEN** セッションユーザーのロールが `admin` である
**WHEN** `rejectRequestAction` を呼び出す
**THEN** `canPerform(role, "approval", "reject")` が true を返し、usecase が実行される

---

### TC-015: manager が却下を実行できる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03 Acceptance Criteria

**GIVEN** セッションユーザーのロールが `manager` である
**WHEN** `rejectRequestAction` を呼び出す
**THEN** `canPerform(role, "approval", "reject")` が true を返し、usecase が実行される

---

### TC-016: admin が一括承認を実行できる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04 Acceptance Criteria

**GIVEN** セッションユーザーのロールが `admin` である
**WHEN** `bulkApproveAction` を呼び出す
**THEN** `canPerform(role, "approval", "approve")` が true を返し、usecase が実行される

---

### TC-017: finance が一括承認を実行できる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04 Acceptance Criteria

**GIVEN** セッションユーザーのロールが `finance` である
**WHEN** `bulkApproveAction` を呼び出す
**THEN** `canPerform(role, "approval", "approve")` が true を返し、usecase が実行される

---

### TC-018: 承認系アクションにインライン role === "member" 判定が残らない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-06 Acceptance Criteria

**GIVEN** `src/app/actions/requests.ts` のソースコード
**WHEN** 静的解析で `approveRequestAction`、`rejectRequestAction`、`bulkApproveAction` の各関数本体を検査する
**THEN** いずれの関数にも `role === "member"` または `role !== "member"` によるインライン認可判定が存在しない

---

### TC-019: 承認系アクションのエラーメッセージが変更されない

**Category**: unit
**Priority**: should
**Source**: design.md > D2: エラーメッセージの変更

**GIVEN** セッションユーザーのロールが `member` であり canPerform が false を返す
**WHEN** `approveRequestAction`、`rejectRequestAction`、`bulkApproveAction` のいずれかを呼び出す
**THEN** 返却値の `message` フィールドが `"権限がありません"` であり、変更前と同一のメッセージが維持される

---

### TC-020: 最後の admin ガードのエラーメッセージが正しい

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-05 Acceptance Criteria

**GIVEN** 組織に admin が対象ユーザー 1 人のみ存在し、actorId と targetUserId が異なる
**WHEN** `updateUserRole` を newRole `member` で呼び出す
**THEN** 返却値が `{ ok: false, reason: "組織に最低1人の管理者が必要です" }` であり、既存スタイル（「自分自身のロールは変更できません」と同形式）のメッセージになっている

---

### TC-021: ガード評価順序が設計通りである（自己降格 → 最後の admin）

**Category**: unit
**Priority**: should
**Source**: design.md > D5: ガードの評価順序 / tasks.md > T-05 Acceptance Criteria

**GIVEN** actorId と targetUserId が同一であり、かつ組織に admin が 1 人のみ存在する
**WHEN** `updateUserRole` を newRole `member` で呼び出す
**THEN** `findByOrganization` が呼ばれる前に `{ ok: false, reason: "自分自身のロールは変更できません" }` が返され、最後の admin ガードが評価されない（自己降格ガードが先に動作する）

---

### TC-022: ビルドと型チェックが成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-08 Acceptance Criteria

**GIVEN** すべての実装変更が完了した状態
**WHEN** `bun run typecheck` および `bun run build` を実行する
**THEN** 型エラーなし、ビルドエラーなしで両コマンドが正常終了する

---

### TC-023: 既存テストを含む全テストが green

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-08 Acceptance Criteria

**GIVEN** すべての実装変更および新規テストの追加が完了した状態
**WHEN** `bun test` を実行する
**THEN** 既存テストを含むすべてのテストが pass し、失敗が 0 件である

---

## Result

```yaml
result: completed
total: 23
automated: 21
manual: 2
must: 12
should: 11
could: 0
blocked_reasons: []
```
