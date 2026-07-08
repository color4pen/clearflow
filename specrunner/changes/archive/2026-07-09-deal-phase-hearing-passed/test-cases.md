# Test Cases: 案件フェーズ hearing / passed 追加

## Summary

- **Total**: 35 cases
- **Automated** (unit/integration): 28
- **Manual**: 7
- **Priority**: must: 25, should: 6, could: 4

---

## TC-001: DealPhase 型が 7 値を持つ

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: DealPhase enum SHALL include hearing and passed > Scenario: DealPhase 型が 7 値を持つ

---

## TC-002: dealPhaseEnum が正しい順序で 7 値を持つ

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: DealPhase enum SHALL include hearing and passed > Scenario: dealPhaseEnum が正しい順序で 7 値を持つ

---

## TC-003: 直接作成の案件が hearing 起点になる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: New deals SHALL start at hearing phase > Scenario: 直接作成の案件が hearing 起点になる

---

## TC-004: 引合転換で作成された案件が hearing 起点になる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: New deals SHALL start at hearing phase > Scenario: 引合転換で作成された案件が hearing 起点になる

---

## TC-005: passed からの遷移が拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: passed SHALL be a terminal phase > Scenario: passed からの遷移が拒否される

---

## TC-006: hearing から passed への遷移が許可される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: passed SHALL be a terminal phase > Scenario: hearing から passed への遷移が許可される

---

## TC-007: passed への遷移に closePhase 権限が必要

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: passed SHALL be a terminal phase > Scenario: passed への遷移に closePhase 権限が必要

---

## TC-008: updateDealPhase で passed に遷移するとイベントが発火する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: passed transition SHALL emit deal.passed domain event > Scenario: updateDealPhase で passed に遷移するとイベントが発火する

---

## TC-009: Webhook ハンドラが deal.passed を配信する

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: passed transition SHALL emit deal.passed domain event > Scenario: Webhook ハンドラが deal.passed を配信する

---

## TC-010: getPipelineSummary が 7 フェーズを集計する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Pipeline summary SHALL include all 7 phases > Scenario: getPipelineSummary が 7 フェーズを集計する

---

## TC-011: revenueRepository.activePhases に hearing が含まれ passed が除外される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Pipeline summary SHALL include all 7 phases > Scenario: revenueRepository.activePhases に hearing が含まれ passed が除外される

---

## TC-012: passed フェーズの案件が停滞リストに含まれない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Stale deals filter SHALL exclude passed > Scenario: passed フェーズの案件が停滞リストに含まれない

---

## TC-013: hearing フェーズの案件が停滞リストに含まれる

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: Stale deals filter SHALL exclude passed > Scenario: hearing フェーズの案件が停滞リストに含まれる

---

## TC-014: update_phase enum に hearing と passed が含まれる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: MCP deals tool SHALL accept hearing and passed > Scenario: update_phase enum に hearing と passed が含まれる

---

## TC-015: passed が MCP の isTerminalPhase として扱われる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: MCP deals tool SHALL accept hearing and passed > Scenario: passed が MCP の isTerminalPhase として扱われる

---

## TC-016: 広告スキーマの newPhase enum に両値が反映される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: MCP deals tool SHALL accept hearing and passed > Scenario: 広告スキーマの newPhase enum に両値が反映される

---

## TC-017: phaseLabels に hearing と passed が存在する

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: UI labels and filters SHALL include hearing and passed > Scenario: phaseLabels に hearing と passed が存在する

---

## TC-018: DealsFilter の allPhases に hearing と passed が含まれる

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: UI labels and filters SHALL include hearing and passed > Scenario: DealsFilter の allPhases に hearing と passed が含まれる

---

## TC-019: DealPhaseStepper に見送りボタンが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: UI labels and filters SHALL include hearing and passed > Scenario: DealPhaseStepper に見送りボタンが表示される

---

## TC-020: passed のバッジが中立色で表示される

**Category**: manual
**Priority**: could
**Source**: spec.md > Requirement: UI labels and filters SHALL include hearing and passed > Scenario: passed のバッジが中立色で表示される

---

## TC-021: マイグレーション実行後に既存データが保持される

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-02: マイグレーション SQL の作成

**GIVEN** `proposal_prep`、`proposed`、`negotiation`、`won`、`lost` のフェーズ値を持つ既存の案件データが DB に存在する
**WHEN** `bun run db:migrate` を実行して `0021_deal_phase_hearing_passed.sql` を適用する
**THEN** 既存案件のフェーズ値が変化せず、全件が正常に保持される

---

## TC-022: hearing から proposal_prep への遷移が許可される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03: 状態機械の更新

**GIVEN** `dealTransition.ts` の更新済み状態機械
**WHEN** `canTransition("hearing", "proposal_prep")` を呼び出す
**THEN** `true` が返る

---

## TC-023: 各非終端フェーズから passed への遷移が許可される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03: 状態機械の更新

**GIVEN** 更新済み状態機械（`TERMINAL_PHASES` に `passed` が追加済み）
**WHEN** `canTransition` を `"proposal_prep" | "proposed" | "negotiation"` それぞれから `"passed"` へ呼び出す
**THEN** すべての組み合わせで `true` が返る

---

## TC-024: hearing → hearing 同一フェーズ遷移が拒否される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03: 状態機械の更新

**GIVEN** 更新済み状態機械
**WHEN** `canTransition("hearing", "hearing")` を呼び出す
**THEN** `false` が返る（同一フェーズへの遷移は不可）

---

## TC-025: DealPassed 型が DomainEvent union のメンバーである

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04: ドメインイベント型の追加（deal.passed）

**GIVEN** `src/domain/events/types.ts` の更新済み定義
**WHEN** `DomainEvent` 型の union メンバーを確認する
**THEN** `DealPassed`（`type: "deal.passed"`, `payload: { dealId: string; fromPhase: DealPhase }`）が含まれる

---

## TC-026: allEventTypes 配列に deal.passed が含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05: イベント発火とハンドラの更新

**GIVEN** `src/infrastructure/handlers/index.ts` の `allEventTypes` 配列
**WHEN** 配列の要素を確認する
**THEN** `"deal.passed"` が含まれる

---

## TC-027: member ロールで passed への遷移が拒否される

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-06: 権限判定の更新（isTerminalPhase）

**GIVEN** member ロールのユーザーが認証済みである
**WHEN** 案件のフェーズを任意のフェーズから `passed` に更新しようとする
**THEN** 権限不足エラー（`closePhase` 要求）が返り、遷移は実行されない

---

## TC-028: MCP tools/call で hearing/passed を指定してもバリデーションエラーにならない

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-07: MCP ツールの更新

**GIVEN** MCP サーバーが起動しており、`deals` ツールが登録されている
**WHEN** `tools/call` で `update_phase` アクションに `newPhase: "hearing"` または `newPhase: "passed"` を渡す
**THEN** Zod バリデーションエラーが発生せず、ユースケースの権限チェックまで到達する

---

## TC-029: deals/page.tsx と SalesDashboard.tsx のグリッドが 8 列になっている

**Category**: manual
**Priority**: could
**Source**: tasks.md > T-11: パイプライングリッドのレイアウト更新

**GIVEN** `deals/page.tsx` と `SalesDashboard.tsx` の更新後のソースコード
**WHEN** ブラウザで案件一覧ページとダッシュボードを表示する
**THEN** パイプライン集計グリッドが 8 列（7 フェーズ + 合計）で正しくレイアウトされ、列が崩れていない

---

## TC-030: DealPhaseStepper の PIPELINE 配列先頭に hearing が含まれる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-12: DealPhaseStepper の更新

**GIVEN** 更新済み `DealPhaseStepper.tsx` の `PIPELINE` 定数
**WHEN** 定数の内容を確認する
**THEN** 配列の先頭要素が `"hearing"` であり、`["hearing", "proposal_prep", "proposed", "negotiation"]` の 4 値で構成されている

---

## TC-031: passed フェーズではパイプライン遷移ボタンが無効化される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-12: DealPhaseStepper の更新

**GIVEN** phase が `passed` の案件詳細ページを開いている
**WHEN** DealPhaseStepper コンポーネントの表示を確認する
**THEN** パイプライン進行用の遷移ボタンがすべて表示されず（または無効化され）、終端バッジ（「見送り（確定）」、中立色）のみが表示される

---

## TC-032: passed の ConfirmDialog が正しいバリアントで表示される

**Category**: manual
**Priority**: could
**Source**: tasks.md > T-12: DealPhaseStepper の更新

**GIVEN** 非終端フェーズの案件詳細ページで「見送りにする」ボタンが表示されている
**WHEN** 「見送りにする」ボタンをクリックする
**THEN** ConfirmDialog が `variant=default（または primary）`、`title="フェーズ変更: 見送り"` で表示される

---

## TC-033: seed 実行後に hearing と passed のサンプル案件が存在する

**Category**: integration
**Priority**: could
**Source**: tasks.md > T-13: seed データの更新

**GIVEN** クリーンな開発 DB 環境
**WHEN** `bun run db:seed` を実行する
**THEN** `hearing` フェーズの案件と `passed` フェーズの案件が各 1 件以上 DB に存在し、ログに正しい件数が出力される

---

## TC-034: aozu check が exit 0 で終了する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-14: aozu 設計層の更新

**GIVEN** `design/domain/model.md`、`invariants.md`、`glossary.md` の設計層が更新済みである
**WHEN** `aozu check` を実行する
**THEN** exit code 0 で終了し、設計と実装の不整合が報告されない

---

## TC-035: typecheck / lint / build が green で通る

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-15: 既存テストの更新と新規テストの追加

**GIVEN** すべての実装変更が完了している
**WHEN** `bun run typecheck`、`bun run lint`、`bun run build` をそれぞれ実行する
**THEN** すべてがエラーなしで完了する（exit 0）

---

## Result

```yaml
result: completed
total: 35
automated: 28
manual: 7
must: 25
should: 6
could: 4
blocked_reasons: []
```
