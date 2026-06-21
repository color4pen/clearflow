# Test Cases: deal-flexibility

<!-- FORMAT REQUIREMENTS:
Test Case heading format: `### TC-{NNN}: {Name}` (3-digit zero-padded, e.g. TC-001)

Required fields per test case:
  **Category**: unit | integration | manual
  **Priority**: must | should | could
  **Source**: reference to spec Scenario (spec.md > Requirement: <name> > Scenario: <name>) or design.md / tasks.md section

GIVEN/WHEN/THEN structure (mixed format — depends on TC type):
  Scenario 由来 TC (Source = spec.md > Requirement: <name> > Scenario: <name>):
    GWT は記述しない。Source 参照のみ。behavior の正典は spec の Scenario。
  非 Scenario 由来 TC (Source = design.md or tasks.md section):
    GWT は必須:
    **GIVEN** <preconditions>
    **WHEN** <action>
    **THEN** <expected result>

Category determination:
  unit        — pure logic, validation, helper functions (automated)
  integration — DB operations, API endpoints, multi-module interaction (automated)
  manual      — UI/UX confirmation, visual verification, build artifact check (not automated)

Priority determination:
  must   — core functionality; if broken, the feature does not work
  should — important but core still works; edge cases, error handling
  could  — nice to have; performance, UX details

Summary section MUST appear immediately after the title with ALL 4 items:
  ## Summary
  - **Total**: {count} cases
  - **Automated** (unit/integration): {count}
  - **Manual**: {count}
  - **Priority**: must: {count}, should: {count}, could: {count}

Result section MUST appear at the very end as a YAML code block:
  ## Result
  ```yaml
  result: completed | partial | failed
  total: {count}
  automated: {count}
  manual: {count}
  must: {count}
  should: {count}
  could: {count}
  blocked_reasons: []
  ```

  result determination:
    completed — all testable behaviors are documented
    partial   — some cases could not be derived due to design ambiguity
    failed    — spec is absent AND design.md / tasks.md are also missing
-->

## Summary

- **Total**: 57 cases
- **Automated** (unit/integration): 37
- **Manual**: 20
- **Priority**: must: 48, should: 9, could: 0

---

## A. ドメインサービス（dealTransition）

### TC-001: proposal_prep から negotiation へのスキップ遷移が許可される

- **Category**: unit
- **Priority**: must
- **Source**: spec.md > Requirement: フェーズ遷移は終端状態からのみ拒否する > Scenario: proposal_prep から negotiation への直接遷移が許可される

---

### TC-002: proposed から proposal_prep への巻き戻し遷移が許可される

- **Category**: unit
- **Priority**: must
- **Source**: spec.md > Requirement: フェーズ遷移は終端状態からのみ拒否する > Scenario: proposed から proposal_prep への巻き戻し遷移が許可される

---

### TC-003: won からの遷移が拒否される

- **Category**: unit
- **Priority**: must
- **Source**: spec.md > Requirement: フェーズ遷移は終端状態からのみ拒否する > Scenario: won からの遷移が拒否される

---

### TC-004: lost からの遷移が拒否される

- **Category**: unit
- **Priority**: must
- **Source**: spec.md > Requirement: フェーズ遷移は終端状態からのみ拒否する > Scenario: lost からの遷移が拒否される

---

### TC-005: 同一フェーズへの遷移が拒否される

- **Category**: unit
- **Priority**: must
- **Source**: spec.md > Requirement: フェーズ遷移は終端状態からのみ拒否する > Scenario: 同一フェーズへの遷移が拒否される

---

### TC-006: 終端以外のフェーズから won / lost への遷移は許可される

- **Category**: unit
- **Priority**: should
- **Source**: tasks.md > T-03

**GIVEN** 案件のフェーズが `proposal_prep`、`proposed`、または `negotiation` である  
**WHEN** `canTransition(from, "won")` または `canTransition(from, "lost")` を呼び出す  
**THEN** `true` が返される

---

### TC-007: VALID_TRANSITIONS マップが廃止されている

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-03

**GIVEN** `dealTransition.ts` の実装を参照する  
**WHEN** `VALID_TRANSITIONS` の識別子を検索する  
**THEN** `VALID_TRANSITIONS` が存在しない

---

## B. ユースケース（createDeal）

### TC-008: clientId のみで案件を作成できる（inquiryId なし）

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: 引き合いなしで案件を作成できる > Scenario: clientId のみで案件を作成する

---

### TC-009: inquiryId も clientId も未指定でバリデーションエラーが返る

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: 引き合いなしで案件を作成できる > Scenario: inquiryId も clientId も未指定で案件作成が拒否される

---

### TC-010: inquiryId 指定ありで正常に案件を作成できる（deal.clientId が inquiry.clientId に設定される）

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: 引き合い経由の案件作成で既存チェックを維持する > Scenario: inquiryId 指定ありで正常に案件を作成する

---

### TC-011: inquiry.clientId が null の場合エラーが返る（createDeal）

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: 引き合い経由の案件作成で既存チェックを維持する > Scenario: 引き合いの clientId が null の場合エラーを返す

---

### TC-012: 重複チェックが維持される（inquiryId ありで既存案件が存在する場合）

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: 引き合い経由の案件作成で既存チェックを維持する > Scenario: 重複チェックが維持される

---

### TC-013: inquiryId なし + clientId なしで usecase 層がエラーを返す

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-06

**GIVEN** `inquiryId` も `clientId` も指定しない  
**WHEN** `createDeal` usecase を直接実行する  
**THEN** `{ ok: false }` が返され、`dealRepository.create` は呼び出されない

---

### TC-014: テナント非所属の clientId を指定した場合エラーが返る

- **Category**: integration
- **Priority**: must
- **Source**: tasks.md > T-06

**GIVEN** `inquiryId` なし、指定した `clientId` が呼び出し元の組織に属さない  
**WHEN** `createDeal` を実行する  
**THEN** `{ ok: false, reason: "指定された顧客はこの組織に存在しません" }` が返される

---

### TC-015: 直接作成（inquiryId なし）で監査ログが記録される

- **Category**: integration
- **Priority**: should
- **Source**: tasks.md > T-06

**GIVEN** `inquiryId` なし、有効な `clientId` が指定されている  
**WHEN** `createDeal` を実行する  
**THEN** 監査ログが従来通り記録される

---

### TC-016: 引き合い経由作成（inquiryId あり）で監査ログが記録される

- **Category**: integration
- **Priority**: should
- **Source**: tasks.md > T-06

**GIVEN** 有効な `inquiryId` と非 null の `inquiry.clientId` が指定されている  
**WHEN** `createDeal` を実行する  
**THEN** 監査ログが従来通り記録される

---

## C. ユースケース（updateInquiryStatus）

### TC-017: converted 遷移で作成された Deal に clientId が設定される

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: 引き合いの案件化（converted 遷移）で clientId を渡す > Scenario: converted 遷移で Deal に clientId が設定される

---

### TC-018: inquiry.clientId が null の場合 converted 遷移が拒否される

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: 引き合いの案件化（converted 遷移）で clientId を渡す > Scenario: inquiry.clientId が null の場合 converted 遷移が拒否される

---

### TC-019: converted 遷移で既存の楽観ロック・監査ログが維持される

- **Category**: integration
- **Priority**: should
- **Source**: tasks.md > T-07

**GIVEN** 引き合いの `clientId` が非 null で、ステータスが `in_progress` である  
**WHEN** `updateInquiryStatus` で `converted` に遷移する  
**THEN** 楽観ロックが機能し、監査ログが記録される。既存の状態遷移チェックは従来通り動作する

---

## D. リポジトリ（dealRepository）

### TC-020: create に clientId を渡すと inquiryId なしでレコードが作成される

- **Category**: integration
- **Priority**: must
- **Source**: tasks.md > T-04

**GIVEN** `clientId` あり、`inquiryId` なしで `dealRepository.create` を呼び出す  
**WHEN** データベースにレコードが挿入される  
**THEN** 作成されたレコードの `client_id` が指定値で、`inquiry_id` が null である

---

### TC-021: create に clientId と inquiryId 両方を渡せる

- **Category**: integration
- **Priority**: must
- **Source**: tasks.md > T-04

**GIVEN** `clientId` と `inquiryId` の両方を指定して `dealRepository.create` を呼び出す  
**WHEN** データベースにレコードが挿入される  
**THEN** 作成されたレコードの `client_id` と `inquiry_id` が指定値である

---

### TC-022: findAllByOrganization が inquiryId なし案件も返す

- **Category**: integration
- **Priority**: must
- **Source**: tasks.md > T-05

**GIVEN** `inquiry_id` が null の案件が組織内に存在する  
**WHEN** `dealRepository.findAllByOrganization` を呼び出す  
**THEN** `DealWithDetails[]` が返され、`inquiryTitle` が null の案件が含まれる

---

### TC-023: findAllByOrganization が clients を deals.clientId 経由で JOIN する

- **Category**: integration
- **Priority**: must
- **Source**: tasks.md > T-05

**GIVEN** 引き合いなし案件が存在し、`clients` テーブルに対応顧客がある  
**WHEN** `dealRepository.findAllByOrganization` を呼び出す  
**THEN** `clientName` が `deals.clientId` 経由で正しく取得され、`inquiries` は LEFT JOIN される

---

## E. Server Actions（createDealAction）

### TC-024: inquiryId なし + clientId ありでフォーム送信が成功する

- **Category**: integration
- **Priority**: must
- **Source**: tasks.md > T-08

**GIVEN** `inquiryId` なし、有効な `clientId` を含むフォームデータ  
**WHEN** `createDealAction` を実行する  
**THEN** 成功レスポンスが返され、`DealWithDetails` 型の案件が返却される

---

### TC-025: inquiryId なし時に /inquiries/ の revalidate がスキップされる

- **Category**: integration
- **Priority**: should
- **Source**: tasks.md > T-08

**GIVEN** `inquiryId` なしで案件が正常に作成された  
**WHEN** `createDealAction` が完了する  
**THEN** `/inquiries/` の `revalidatePath` が呼び出されず、エラーが発生しない

---

### TC-026: createDealSchema の inquiryId が optional、clientId が追加されている

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-08

**GIVEN** `createDealAction` の zod スキーマ定義を確認する  
**WHEN** 各フィールドの型定義を確認する  
**THEN** `inquiryId` が `z.string().uuid().optional()` で、`clientId` が `z.string().uuid().optional()` として追加されている

---

## F. UI — 案件一覧

### TC-027: 案件一覧に新規作成ボタンが表示される

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: 案件一覧に新規作成ボタンを表示する > Scenario: 案件一覧に新規作成ボタンが表示される

---

### TC-028: 新規作成ボタンのリンク先が /deals/new である

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-09

**GIVEN** ユーザーが案件一覧ページにアクセスする  
**WHEN** PageToolbar の新規作成リンクを確認する  
**THEN** リンクの `href` が `/deals/new` である

---

## G. UI — 案件作成ページ

### TC-029: inquiryId パラメータなしで顧客選択プルダウンが表示される

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: 案件作成ページで引き合いなし作成に対応する > Scenario: inquiryId パラメータなしで顧客選択プルダウンが表示される

---

### TC-030: inquiryId パラメータありで既存の動作が維持される

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: 案件作成ページで引き合いなし作成に対応する > Scenario: inquiryId パラメータありで既存動作を維持する

---

### TC-031: 顧客未選択でフォームを送信するとバリデーションエラーになる

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-10

**GIVEN** `/deals/new`（パラメータなし）を開き、顧客を選択せずにサブミットする  
**WHEN** フォームを送信する  
**THEN** バリデーションエラーが表示され、案件は作成されない

---

### TC-032: パラメータなしのキャンセルリンクが /deals に遷移する

- **Category**: manual
- **Priority**: should
- **Source**: tasks.md > T-10

**GIVEN** `/deals/new`（パラメータなし）を開く  
**WHEN** キャンセルリンクを確認する  
**THEN** キャンセルリンクの `href` が `/deals` である

---

### TC-033: タイトルと想定金額の入力フィールドが両パターンで共通して表示される

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-10

**GIVEN** `/deals/new`（パラメータなし）と `/deals/new?inquiryId=<uuid>` のどちらでアクセスする  
**WHEN** 案件作成フォームが表示される  
**THEN** タイトルと想定金額の入力フィールドが両パターンで表示される

---

## H. UI — 案件詳細ページ

### TC-034: 引き合いなし案件で引き合いリンクが非表示になる

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: 案件詳細ページで引き合いなし案件に対応する > Scenario: 引き合いなし案件で引き合いリンクが非表示になる

---

### TC-035: 引き合いあり案件で引き合いリンクが表示される

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: 案件詳細ページで引き合いなし案件に対応する > Scenario: 引き合いあり案件で引き合いリンクが表示される

---

### TC-036: 引き合いなし案件の詳細ページで顧客情報が deal.clientId 経由で取得される

- **Category**: integration
- **Priority**: must
- **Source**: tasks.md > T-11

**GIVEN** `inquiryId` が null の案件の詳細ページにアクセスする  
**WHEN** ページが表示される  
**THEN** 顧客情報が `deal.clientId` から直接取得され、正しく表示される（inquiry の null ガードが機能する）

---

### TC-037: 引き合いなし案件の詳細ページでランタイムエラーが発生しない

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-11

**GIVEN** `inquiryId` が null の案件の詳細ページにアクセスする  
**WHEN** ページをレンダリングする  
**THEN** null ガードが機能し、エラーなく表示される

---

## I. UI — DealPhaseActions

### TC-038: proposal_prep フェーズで negotiation へのスキップボタンが表示される

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-15

**GIVEN** 案件のフェーズが `proposal_prep` である  
**WHEN** DealPhaseActions を表示する  
**THEN** `negotiation` への遷移ボタンが表示される（スキップ可）

---

### TC-039: proposed フェーズで proposal_prep への巻き戻しボタンが表示される

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-15

**GIVEN** 案件のフェーズが `proposed` である  
**WHEN** DealPhaseActions を表示する  
**THEN** `proposal_prep` への遷移ボタンが表示される（巻き戻し可）

---

### TC-040: won / lost フェーズではフェーズ遷移ボタンが表示されない

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-15

**GIVEN** 案件のフェーズが `won` または `lost` である  
**WHEN** DealPhaseActions を表示する  
**THEN** フェーズ遷移ボタンが表示されない

---

## J. スキーマ・マイグレーション

### TC-041: deals.inquiry_id が nullable である

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-01

**GIVEN** マイグレーションを適用する  
**WHEN** deals テーブルのカラム定義を確認する  
**THEN** `inquiry_id` カラムに NOT NULL 制約が存在しない

---

### TC-042: deals テーブルに client_id カラム（NOT NULL、clients FK）が存在する

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-01

**GIVEN** マイグレーションを適用する  
**WHEN** deals テーブルのカラム定義を確認する  
**THEN** `client_id` カラムが NOT NULL で `clients.id` への外部キーを持つ

---

### TC-043: deals_inquiry_id_unique 制約が存在しない

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-01

**GIVEN** マイグレーションを適用する  
**WHEN** deals テーブルの制約一覧を確認する  
**THEN** `deals_inquiry_id_unique` 制約が存在しない

---

### TC-044: マイグレーションファイルが生成されている

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-14

**GIVEN** `bunx drizzle-kit generate` を実行する  
**WHEN** `drizzle/` ディレクトリを確認する  
**THEN** マイグレーション SQL ファイルが存在し、`client_id` 追加・`inquiry_id` nullable 化・`deals_inquiry_id_unique` 削除の SQL が含まれる

---

## K. 型整合性

### TC-045: DealWithInquiry が削除され DealWithDetails が存在する

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-02

**GIVEN** 全型変更が完了している  
**WHEN** `DealWithInquiry` の参照をコードベース全体で検索し、typecheck を実行する  
**THEN** `DealWithInquiry` が存在せず `DealWithDetails` が存在する。typecheck が green

---

### TC-046: Deal.inquiryId が string | null 型である

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-02

**GIVEN** `deal.ts` の `Deal` 型を確認する  
**WHEN** typecheck を実行する  
**THEN** `inquiryId` の型が `string | null` であり typecheck が green

---

### TC-047: Deal.clientId が string 型として追加されている

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-02

**GIVEN** `deal.ts` の `Deal` 型を確認する  
**WHEN** typecheck を実行する  
**THEN** `clientId: string` フィールドが存在し typecheck が green

---

### TC-048: DealWithDetails.inquiryTitle が string | null 型である

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-02

**GIVEN** `deal.ts` の `DealWithDetails` 型を確認する  
**WHEN** typecheck を実行する  
**THEN** `inquiryTitle` の型が `string | null` であり typecheck が green

---

### TC-049: listDeals の返却型が DealWithDetails[] である

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-12

**GIVEN** `listDeals.ts` の返却型を確認する  
**WHEN** typecheck を実行する  
**THEN** 返却型が `DealWithDetails[]` で typecheck が green

---

## L. シードデータ

### TC-050: 全既存 deal に clientId が設定されている

- **Category**: manual
- **Priority**: should
- **Source**: tasks.md > T-13

**GIVEN** `seed.ts` を実行する  
**WHEN** deals テーブルを確認する  
**THEN** 全既存 deal レコードの `client_id` が非 null である

---

### TC-051: 引き合いなし案件が1件シードされている

- **Category**: manual
- **Priority**: should
- **Source**: tasks.md > T-13

**GIVEN** `seed.ts` を実行する  
**WHEN** deals テーブルを確認する  
**THEN** `inquiry_id` が null の deal が1件存在し、`client_id` が設定されている

---

## M. 既存テスト追従

### TC-052: dealTransition テストがスキップ・巻き戻し許可を検証する

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-16

**GIVEN** `dealManagement.test.ts` の dealTransition テストを確認する  
**WHEN** `bun test` を実行する  
**THEN** `canTransition("proposal_prep", "negotiation")` → `true` および `canTransition("proposed", "proposal_prep")` → `true` のアサーションが含まれ green

---

### TC-053: createDeal テストに直接作成パターンが追加されている

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-16

**GIVEN** `dealManagement.test.ts` を確認する  
**WHEN** `bun test` を実行する  
**THEN** `clientId` のみ指定の作成パターンのテストが存在し green

---

### TC-054: テナント分離テストが clientId に対応している

- **Category**: unit
- **Priority**: should
- **Source**: tasks.md > T-16

**GIVEN** `projectStructure.test.ts` の deal テナント分離テストを確認する  
**WHEN** `bun test` を実行する  
**THEN** `clientId` に関連するアサーションが適切に更新されており全件 green

---

## N. ビルド・全体検証

### TC-055: bun run build が成功する

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-16 (ビルド検証)

**GIVEN** 全実装が完了している  
**WHEN** `bun run build` を実行する  
**THEN** エラーなく成功する

---

### TC-056: bun test が全件 green

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-16 (ビルド検証)

**GIVEN** 全実装が完了している  
**WHEN** `bun test` を実行する  
**THEN** 全テストケースが green

---

### TC-057: 依存方向が actions → usecases → domain / infrastructure を遵守する

- **Category**: unit
- **Priority**: must
- **Source**: design.md > Goals / Non-Goals

**GIVEN** 全実装が完了している  
**WHEN** import 関係を確認する  
**THEN** `actions` が `usecases` を参照し、`usecases` が `domain` / `infrastructure` を参照する。逆方向の参照が存在しない

---

## Result

```yaml
result: completed
total: 57
automated: 37
manual: 20
must: 48
should: 9
could: 0
blocked_reasons: []
```
