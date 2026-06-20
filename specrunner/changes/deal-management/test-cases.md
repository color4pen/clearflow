# Test Cases: 案件管理と見積承認フロー連携

## Summary

- **Total**: 45 cases
- **Automated** (unit/integration): 31
- **Manual**: 14
- **Priority**: must: 31, should: 12, could: 2

---

### TC-001: dealPhaseEnum がスキーマに存在する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: dealPhaseEnum は 6 値で定義される > Scenario: dealPhaseEnum がスキーマに存在する

---

### TC-002: proposal_prep から proposed への遷移が許可される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 案件のフェーズ遷移ルール > Scenario: proposal_prep から proposed への遷移が許可される

---

### TC-003: negotiation から internal_approval への遷移が許可される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 案件のフェーズ遷移ルール > Scenario: negotiation から internal_approval への遷移が許可される

---

### TC-004: won は終端状態であり遷移が拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 案件のフェーズ遷移ルール > Scenario: won は終端状態であり遷移が拒否される

---

### TC-005: lost は終端状態であり遷移が拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 案件のフェーズ遷移ルール > Scenario: lost は終端状態であり遷移が拒否される

---

### TC-006: 全フェーズから lost への遷移が許可される（終端状態除く）

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 案件のフェーズ遷移ルール > Scenario: 全フェーズから lost への遷移が許可される（終端状態除く）

---

### TC-007: internal_approval 遷移時に見積承認リクエストが作成される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: internal_approval 遷移時に見積承認リクエストを自動作成する > Scenario: internal_approval 遷移時に見積承認リクエストが作成される

---

### TC-008: テンプレート未指定で internal_approval 遷移時にエラーを返す

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: internal_approval 遷移時に見積承認リクエストを自動作成する > Scenario: テンプレート未指定で internal_approval 遷移時にエラーを返す

---

### TC-009: テンプレートが存在しない場合にエラーを返す

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: internal_approval 遷移時に見積承認リクエストを自動作成する > Scenario: テンプレートが存在しない場合にエラーを返す

---

### TC-010: converted の引き合いに対して案件を作成できる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 案件作成時に引き合いのステータスが converted であることを検証する > Scenario: converted の引き合いに対して案件を作成できる

---

### TC-011: converted でない引き合いに対して案件作成しようとした場合にエラーを返す

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 案件作成時に引き合いのステータスが converted であることを検証する > Scenario: converted でない引き合いに対して案件を作成しようとした場合にエラーを返す

---

### TC-012: 同一引き合いに対して 2 件目の案件を作成しようとした場合にエラーを返す

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 同一引き合いに対する案件の重複作成を禁止する > Scenario: 同一引き合いに対して 2 件目の案件を作成しようとした場合にエラーを返す

---

### TC-013: 案件一覧が自組織のみ返る

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 全リポジトリ関数に organizationId 条件を付与する > Scenario: 案件一覧が自組織のみ返る

---

### TC-014: 案件作成時に監査ログが記録される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 案件の作成・フェーズ変更・情報更新で監査ログを記録する > Scenario: 案件作成時に監査ログが記録される

---

### TC-015: 案件フェーズ変更時に監査ログが記録される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 案件の作成・フェーズ変更・情報更新で監査ログを記録する > Scenario: 案件フェーズ変更時に監査ログが記録される

---

### TC-016: 案件情報更新時に監査ログが記録される

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: 案件の作成・フェーズ変更・情報更新で監査ログを記録する > Scenario: 案件情報更新時に監査ログが記録される

---

### TC-017: admin が案件を作成できる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 案件作成・フェーズ変更は admin と manager のみ実行可能 > Scenario: admin が案件を作成できる

---

### TC-018: member が案件を作成しようとすると拒否される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 案件作成・フェーズ変更は admin と manager のみ実行可能 > Scenario: member が案件を作成しようとすると拒否される

---

### TC-019: member が案件情報を更新できる

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: 案件作成・フェーズ変更は admin と manager のみ実行可能 > Scenario: member が案件情報を更新できる

---

### TC-020: 全ロールのユーザーにナビリンクが表示される

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: ダッシュボードヘッダーに案件のナビリンクを表示する > Scenario: 全ロールのユーザーにナビリンクが表示される

---

### TC-021: 案件が存在する場合にリンクを表示する

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 引き合い詳細ページに案件セクションを表示する > Scenario: 案件が存在する場合にリンクを表示する

---

### TC-022: converted で案件未作成の場合に作成ボタンを表示する

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 引き合い詳細ページに案件セクションを表示する > Scenario: converted で案件未作成の場合に作成ボタンを表示する

---

### TC-023: dealTransition.ts に infrastructure import がない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 依存方向を遵守する > Scenario: dealTransition.ts に infrastructure import がない

---

### TC-024: ドメインモデルファイルに ORM import がない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 依存方向を遵守する > Scenario: ドメインモデルファイルに ORM import がない

---

### TC-025: フェーズ遷移の飛び越しが拒否される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04: ドメインサービス（dealTransition.ts）を追加する

**GIVEN** `dealTransition.ts` の `canTransition` が実装されている
**WHEN** `canTransition("proposal_prep", "negotiation")` および `canTransition("proposal_prep", "internal_approval")` を呼び出す
**THEN** いずれも `false` が返る

---

### TC-026: 見積承認リクエストのタイトルが "見積承認: ${deal.title}" 形式である

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-08: updateDealPhase usecase を追加する

**GIVEN** 案件のフェーズが `negotiation` であり、有効な承認テンプレートが存在する
**WHEN** `updateDealPhase` を `internal_approval` で実行する
**THEN** 作成された承認リクエストのタイトルが `"見積承認: " + deal.title` の形式である

---

### TC-027: 見積承認リクエストのフォームデータに estimatedAmount が含まれる

**Category**: integration
**Priority**: must
**Source**: design.md > D2: 見積承認時に estimatedAmount をフォームデータとして承認リクエストに渡す / tasks.md > T-08

**GIVEN** 案件の `estimatedAmount` が設定されており、フェーズが `negotiation` である
**WHEN** `updateDealPhase` を `internal_approval` で実行する
**THEN** 作成された承認リクエストの `formData` に `{ amount: { value: deal.estimatedAmount, label: "想定金額" } }` が含まれる

---

### TC-028: 楽観ロック失敗時に updateDealPhase がエラーを返す

**Category**: integration
**Priority**: should
**Source**: design.md > D10: deals テーブルに楽観ロック用 version カラムを持たせる / tasks.md > T-08

**GIVEN** 案件の `version` が 1 である
**WHEN** 別プロセスが先に案件を更新して `version` が 2 になった状態で、旧 version=1 で `updateDealPhase` を実行する
**THEN** `{ ok: false, reason: "この案件は他のユーザーによって更新されました" }` が返り、フェーズは変更されない

---

### TC-029: Server Action が organizationId をセッションから取得している

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-10: Server Actions（deals.ts）を追加する / T-17: テスト — テナント分離と usecase の検証

**GIVEN** `src/app/actions/deals.ts` が実装されている
**WHEN** ファイルの organizationId 参照箇所を確認する
**THEN** `session.user.organizationId` から取得しており、リクエストボディや formData から取得していない

---

### TC-030: deals.estimateRequestId FK に onDelete: "set null" が設定されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01: schema.ts に dealPhaseEnum と deals テーブルを追加する

**GIVEN** `src/infrastructure/schema.ts` が読み込まれる
**WHEN** `deals.estimateRequestId` の FK 定義を確認する
**THEN** `onDelete: "set null"` が設定されており、参照先 requests が削除されても deals レコードが壊れない

---

### TC-031: usersRelations に dealsAsAssignee と dealsAsTechnicalLead が relationName 付きで定義される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-02: schema.ts に deals の Relations 定義を追加する

**GIVEN** `src/infrastructure/schema.ts` が読み込まれる
**WHEN** `usersRelations` の定義を確認する
**THEN** `dealsAsAssignee: many(deals, { relationName: "dealsAsAssignee" })` と `dealsAsTechnicalLead: many(deals, { relationName: "dealsAsTechnicalLead" })` が両方定義されている

---

### TC-032: 案件一覧のフェーズラベルが日本語で表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-11: UI — 案件一覧ページ（/deals）

**GIVEN** 各フェーズの案件が存在する
**WHEN** `/deals` にアクセスする
**THEN** `proposal_prep` → 「提案準備」、`proposed` → 「提案済」、`negotiation` → 「交渉中」、`internal_approval` → 「内示」、`won` → 「受注」、`lost` → 「失注」と表示される

---

### TC-033: 案件一覧で 0 件の場合に空状態メッセージが表示される

**Category**: manual
**Priority**: could
**Source**: tasks.md > T-11: UI — 案件一覧ページ（/deals）

**GIVEN** 組織内に案件が 0 件である
**WHEN** `/deals` にアクセスする
**THEN** 空状態を示すメッセージが表示され、エラーや空テーブルのみでなく適切なフィードバックが表示される

---

### TC-034: 案件詳細で存在しない ID の場合に 404 が表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-12: UI — 案件詳細ページ（/deals/[id]）

**GIVEN** 存在しない案件 ID を用意する
**WHEN** `/deals/{存在しないID}` にアクセスする
**THEN** Next.js の 404 ページが表示される

---

### TC-035: 案件詳細でフェーズに応じた変更ボタンが表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-12: UI — 案件詳細ページ（/deals/[id]）

**GIVEN** 各フェーズの案件が存在する
**WHEN** `/deals/[id]` にアクセスする
**THEN** `proposal_prep` では「提案済に変更」「失注」、`proposed` では「交渉開始」「失注」、`negotiation` では「内示に変更」「失注」、`internal_approval` では「受注」「失注」、`won`/`lost` ではボタンなしと表示される

---

### TC-036: 案件詳細で内示フェーズ遷移時にテンプレート選択 UI が表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-12: UI — 案件詳細ページ（/deals/[id]）

**GIVEN** フェーズが `negotiation` の案件詳細ページを表示している
**WHEN** 「内示に変更」ボタンをクリックする
**THEN** 承認テンプレートを選択する UI が表示される

---

### TC-037: 案件詳細で引き合い・顧客・見積承認リクエストへのリンクが表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-12: UI — 案件詳細ページ（/deals/[id]）

**GIVEN** `estimateRequestId` が設定された案件の詳細ページを表示する
**WHEN** `/deals/[id]` にアクセスする
**THEN** 関連する引き合いへのリンク（`/inquiries/[inquiryId]`）、顧客へのリンク（`/clients/[clientId]`）、見積承認リクエストへのリンク（`/requests/[estimateRequestId]`）がすべて表示される

---

### TC-038: 引き合い詳細で converted でなく案件もない場合に「案件はありません」メッセージが表示される

**Category**: manual
**Priority**: could
**Source**: tasks.md > T-13: UI — 引き合い詳細ページに案件セクションを追加する

**GIVEN** 引き合いのステータスが `in_progress`（converted でない）であり、案件も存在しない
**WHEN** 引き合い詳細ページ `/inquiries/[id]` にアクセスする
**THEN** 案件セクションに「案件はありません」等のメッセージが表示され、作成ボタンは表示されない

---

### TC-039: ダッシュボードヘッダーの「案件」リンクが「引き合い」の直後に配置される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-14: ダッシュボードヘッダーにナビゲーションを追加する

**GIVEN** ダッシュボードにログインしている
**WHEN** ヘッダーナビゲーションを確認する
**THEN** 「引き合い」リンクの直後に「案件」リンク（`/deals`）が配置されており、他のリンクと同一スタイルで表示される

---

### TC-040: シード実行後に案件 2 件が作成され truncation 順序が FK 制約に違反しない

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-15: シードデータを追加する

**GIVEN** `src/infrastructure/seed.ts` が実装されている
**WHEN** `bun run seed` を実行する
**THEN** 案件が 2 件作成され（`won` フェーズ 1 件、`proposed` フェーズ 1 件）、`won` フェーズの案件に `estimateRequestId` が設定されており、FK 制約違反なく完了する

---

### TC-041: マイグレーションに deal_phase enum と deals テーブルの CREATE 文が含まれる

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-18: Drizzle マイグレーション生成

**GIVEN** `src/infrastructure/schema.ts` に `dealPhaseEnum` と `deals` テーブルが定義されている
**WHEN** `bunx drizzle-kit generate` を実行する
**THEN** `drizzle/` に新しいマイグレーションファイルが生成され、`deal_phase` enum の CREATE TYPE 文と `deals` テーブルの CREATE TABLE 文が含まれる

---

### TC-042: ビルド・型チェック・lint が全て通る

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-19: 最終確認 — ビルド・型チェック・テスト

**GIVEN** 全実装タスク（T-01 〜 T-18）が完了している
**WHEN** `bun run build`、`bunx tsc --noEmit`、`bun run lint` を順に実行する
**THEN** いずれもエラーなしで完了する

---

### TC-043: 引き合いが存在しない場合に createDeal がエラーを返す

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-06: createDeal usecase を追加する

**GIVEN** 存在しない inquiryId を用意する
**WHEN** `createDeal({ inquiryId: 存在しないID, ... })` を実行する
**THEN** `{ ok: false, reason: "引き合いが見つかりません" }` が返り、案件は作成されない

---

### TC-044: listDeals が inquiryTitle と clientName を含む DealWithInquiry 一覧を返す

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-07: listDeals / getDeal usecase を追加する / T-05: dealRepository を追加する

**GIVEN** 組織内に案件が存在し、各案件に引き合いと顧客が紐づいている
**WHEN** `listDeals(organizationId)` を実行する
**THEN** 返却された配列の各要素に `inquiryTitle`（引き合いのタイトル）と `clientName`（顧客名）が含まれる `DealWithInquiry` が返る

---

### TC-045: manager が案件の作成とフェーズ変更を実行できる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-10: Server Actions（deals.ts）を追加する / design.md > D8: 案件作成・フェーズ変更は admin と manager のみ。情報更新は全ロールに許可する

**GIVEN** ログインユーザーのロールが `manager` である
**WHEN** `createDealAction` および `updateDealPhaseAction` を実行する
**THEN** いずれも正常に処理され、エラーメッセージが返らない

---

## Result

```yaml
result: completed
total: 45
automated: 31
manual: 14
must: 31
should: 12
could: 2
blocked_reasons: []
```
