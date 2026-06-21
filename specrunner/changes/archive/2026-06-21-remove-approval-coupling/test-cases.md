# Test Cases: 承認連携の撤去と直接遷移への移行

## Summary

- **Total**: 30 cases
- **Automated** (unit/integration): 23
- **Manual**: 7
- **Priority**: must: 26, should: 4, could: 0

---

### TC-001: admin が引き合いを案件化すると Deal が直接作成される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Inquiry converted 遷移で Deal を直接作成する > Scenario: admin が引き合いを案件化する

---

### TC-002: updateInquiryStatus に templateId 引数が存在しない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Inquiry converted 遷移で Deal を直接作成する > Scenario: templateId を渡しても無視される（引数が存在しない）

---

### TC-003: negotiation から won への直接遷移が許可される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 案件フェーズ遷移が negotiation から won に直接遷移できる > Scenario: negotiation から won への直接遷移が許可される

---

### TC-004: estimate_approval フェーズへの遷移が拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 案件フェーズ遷移が negotiation から won に直接遷移できる > Scenario: estimate_approval フェーズへの遷移が拒否される

---

### TC-005: 全ステップ承認後に Deal が自動作成されない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: approveRequest が Deal・Inquiry の連動処理を行わない > Scenario: 全ステップ承認後に Deal が自動作成されない

---

### TC-006: 連動失敗の audit log が記録されない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: approveRequest が Deal・Inquiry の連動処理を行わない > Scenario: 連動失敗の audit log が記録されない

---

### TC-007: negotiation から won へのフェーズ更新が成功する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: updateDealPhase が estimate_approval フェーズへの遷移を処理しない > Scenario: negotiation から won へのフェーズ更新が成功する

---

### TC-008: 案件化ボタンのクリックで確認ダイアログが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 案件化 UI がテンプレート選択なしの確認ダイアログのみで動作する > Scenario: 案件化ボタンのクリックで確認ダイアログが表示される

---

### TC-009: 確認後に案件化が実行される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 案件化 UI がテンプレート選択なしの確認ダイアログのみで動作する > Scenario: 確認後に案件化が実行される

---

### TC-010: マイグレーション SQL に requests テーブルのカラム削除が含まれる

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: requests テーブルに sourceType と sourceId カラムが存在しない > Scenario: マイグレーション SQL にカラム削除が含まれる

---

### TC-011: マイグレーション SQL に inquiries テーブルのカラム削除が含まれる

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: inquiries テーブルに conversionRequestId カラムが存在しない > Scenario: マイグレーション SQL にカラム削除が含まれる

---

### TC-012: dealPhaseEnum に estimate_approval が含まれない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01 Acceptance Criteria

**GIVEN** `src/infrastructure/schema.ts` の `dealPhaseEnum` 定義が変更されている
**WHEN** `dealPhaseEnum` の値リストを確認する
**THEN** 値が `["proposal_prep", "proposed", "negotiation", "won", "lost"]` の5値のみで、`estimate_approval` が含まれない

---

### TC-013: DealPhase 型に estimate_approval が含まれない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03 Acceptance Criteria

**GIVEN** `src/domain/models/deal.ts` の `DealPhase` union 型が変更されている
**WHEN** `DealPhase` 型の定義を確認する
**THEN** `"estimate_approval"` が存在せず、5値 union `"proposal_prep" | "proposed" | "negotiation" | "won" | "lost"` になっている

---

### TC-014: Request 型に sourceType と sourceId が存在しない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03 Acceptance Criteria

**GIVEN** `src/domain/models/request.ts` の `Request` 型が変更されている
**WHEN** `Request` 型のフィールド一覧を確認する
**THEN** `sourceType` フィールドも `sourceId` フィールドも存在しない

---

### TC-015: Inquiry 型に conversionRequestId が存在しない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03 Acceptance Criteria

**GIVEN** `src/domain/models/inquiry.ts` の `Inquiry` 型が変更されている
**WHEN** `Inquiry` 型のフィールド一覧を確認する
**THEN** `conversionRequestId` フィールドが存在しない

---

### TC-016: canTransition("negotiation", "lost") が true を返す（リグレッション）

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04 Acceptance Criteria

**GIVEN** `dealTransition.ts` の `VALID_TRANSITIONS` が変更されている
**WHEN** `canTransition("negotiation", "lost")` を呼び出す
**THEN** `true` が返る（既存の negotiation → lost 遷移がリグレッションしていない）

---

### TC-017: canTransition("negotiation", "estimate_approval") が false を返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04 Acceptance Criteria

**GIVEN** `dealTransition.ts` の `VALID_TRANSITIONS` から `estimate_approval` へのエントリが削除されている
**WHEN** `canTransition("negotiation", "estimate_approval")` を呼び出す
**THEN** `false` が返る

---

### TC-018: canTransition("estimate_approval", "won") が false を返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04 Acceptance Criteria

**GIVEN** `dealTransition.ts` の `VALID_TRANSITIONS` に `estimate_approval` を遷移元とするエントリが存在しない
**WHEN** `canTransition("estimate_approval" as DealPhase, "won")` を型キャスト経由で呼び出す
**THEN** `false` が返る

---

### TC-019: requestRepository.create に sourceType/sourceId パラメータが存在しない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05 Acceptance Criteria

**GIVEN** `src/infrastructure/repositories/requestRepository.ts` の `create` メソッドが変更されている
**WHEN** `create` メソッドの引数型定義を確認する
**THEN** `sourceType` パラメータも `sourceId` パラメータも存在せず、TypeScript の型エラーがない

---

### TC-020: inquiryRepository.updateStatus に conversionRequestId 引数が存在しない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05 Acceptance Criteria

**GIVEN** `src/infrastructure/repositories/inquiryRepository.ts` の `updateStatus` メソッドが変更されている
**WHEN** `updateStatus` メソッドのシグネチャを確認する
**THEN** `conversionRequestId` 引数が存在しない

---

### TC-021: converted 遷移で Deal 作成とステータス更新が同一トランザクション内で実行される

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-06 Acceptance Criteria

**GIVEN** `updateInquiryStatus.ts` の converted 遷移ブロックが書き換えられている
**WHEN** converted 遷移の実装コードを確認する
**THEN** `db.transaction` 内で `dealRepository.create` と `inquiryRepository.updateStatus` が呼ばれており、両操作が同一トランザクションで実行される

---

### TC-022: converted 遷移で auditLogRepository.create が呼ばれる

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-06 Acceptance Criteria

**GIVEN** `updateInquiryStatus.ts` の converted 遷移が実装されている
**WHEN** `newStatus: "converted"` で `updateInquiryStatus` が実行される
**THEN** `auditLogRepository.create` が呼ばれ、`inquiry.updateStatus` アクションと `{ fromStatus, toStatus, dealId }` を含む metadata が記録される

---

### TC-023: updateDealPhase が dealRepository.updatePhase を呼ぶ（estimate_approval 分岐撤去後）

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-07 Acceptance Criteria

**GIVEN** `updateDealPhase.ts` から estimate_approval 分岐が撤去されている
**WHEN** `updateDealPhase` を `newPhase: "won"` で呼び出す
**THEN** `dealRepository.updatePhase` が呼ばれ、案件フェーズが `won` に更新される

---

### TC-024: updateDealPhase が auditLogRepository.create を呼ぶ

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-07 Acceptance Criteria

**GIVEN** `updateDealPhase.ts` が簡素化されている
**WHEN** `updateDealPhase` でフェーズが変更される
**THEN** `auditLogRepository.create` が呼ばれ、フェーズ変更の audit log が記録される

---

### TC-025: 承認完了後に request.approved Webhook イベント配信が維持されている

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-08 Acceptance Criteria

**GIVEN** `approveRequest.ts` から `runPostApprovalLinkage` が削除されている
**WHEN** 最終承認ステップが承認されて全ステップが approved になる
**THEN** `request.approved` の Webhook イベント配信コードが残存しており、イベントが配信される

---

### TC-026: updateInquiryStatusAction が templateId を FormData から取得しない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-09 Acceptance Criteria

**GIVEN** `src/app/actions/inquiries.ts` の `updateInquiryStatusAction` が変更されている
**WHEN** `updateInquiryStatusAction` の実装を確認する
**THEN** FormData から `templateId` を取得するコードが存在せず、`updateInquiryStatus` の呼び出しに `templateId` 引数が渡されない

---

### TC-027: phaseLabels に estimate_approval キーが存在しない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-10 Acceptance Criteria

**GIVEN** `src/app/(dashboard)/labels.ts` の `phaseLabels` が変更されている
**WHEN** `phaseLabels` オブジェクトのキー一覧を確認する
**THEN** `estimate_approval` キーが存在しない

---

### TC-028: bun run db:seed が承認連携データなしで型エラーなしに完了する

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-11 Acceptance Criteria

**GIVEN** `src/infrastructure/seed.ts` から承認連携テンプレート・リクエスト・conversionRequestId 参照が削除されている
**WHEN** `bun run db:seed` を実行する
**THEN** 案件化承認テンプレート・見積承認テンプレート・承認リクエストの挿入がなく、TypeScript コンパイルエラーなしで完了する

---

### TC-029: bun run build が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-13 Acceptance Criteria / request.md > 受け入れ基準

**GIVEN** 全コード変更（T-01〜T-12）が適用されている
**WHEN** `bun run build` を実行する
**THEN** exit 0 で完了し、ビルドエラーが出力されない

---

### TC-030: bun run typecheck が green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-13 Acceptance Criteria / request.md > 受け入れ基準

**GIVEN** 全コード変更（T-01〜T-12）が適用されている
**WHEN** `bun run typecheck` を実行する
**THEN** 型エラーなしで完了する

---

## Result

```yaml
result: completed
total: 30
automated: 23
manual: 7
must: 26
should: 4
could: 0
blocked_reasons: []
```
