# Spec: 承認連携の撤去と直接遷移への移行

## Requirements

### Requirement: Inquiry converted 遷移で Deal を直接作成する

`updateInquiryStatus` の converted 遷移は、承認リクエストを経由せずに同一トランザクション内で `dealRepository.create` を呼び出し、Deal を直接作成しなければならない（MUST）。`requestRepository.create`、`approvalTemplateRepository`、`approvalStepRepository` の呼び出しを含んではならない（MUST NOT）。

#### Scenario: admin が引き合いを案件化する

**Given** `in_progress` 状態の引き合いが存在する
**When** admin が `updateInquiryStatus` を `newStatus: "converted"` で呼び出す
**Then** Deal が直接作成され、引き合いのステータスが `converted` になる。承認リクエストは生成されない。

#### Scenario: templateId を渡しても無視される（引数が存在しない）

**Given** `updateInquiryStatus` のシグネチャに `templateId` 引数が存在しない
**When** 呼び出し元が `templateId` を渡そうとする
**Then** TypeScript のコンパイルエラーになる

### Requirement: 案件フェーズ遷移が negotiation から won に直接遷移できる

`canTransition("negotiation", "won")` は `true` を返さなければならない（MUST）。`estimate_approval` は遷移の中継フェーズとして存在してはならない（MUST NOT）。

#### Scenario: negotiation から won への直接遷移が許可される

**Given** 案件のフェーズが `negotiation` である
**When** `canTransition("negotiation", "won")` を呼び出す
**Then** `true` が返る

#### Scenario: estimate_approval フェーズへの遷移が拒否される

**Given** `estimate_approval` が DealPhase 型から削除されている
**When** いずれかのフェーズから `estimate_approval` への遷移を試みる（型キャスト経由）
**Then** `canTransition` が `false` を返す（遷移マップにエントリが存在しない）

### Requirement: approveRequest が Deal・Inquiry の連動処理を行わない

`approveRequest` は承認完了後に Deal の作成やフェーズ進行などの連動処理を行ってはならない（MUST NOT）。`runPostApprovalLinkage`、`inquiryRepository`、`dealRepository` の参照を含まない（MUST）。

#### Scenario: 全ステップ承認後に Deal が自動作成されない

**Given** sourceType が設定されていた承認リクエストが存在する（仮定として）
**When** 最終ステップが承認されて全ステップが approved になる
**Then** `request.approved` の Webhook イベントが配信されるが、Deal の作成やフェーズ変更は行われない

#### Scenario: 連動失敗の audit log が記録されない

**Given** `approveRequest.ts` から `runPostApprovalLinkage` が削除されている
**When** 承認が完了する
**Then** `approval.linkage_failed` の audit log アクションは記録されない

### Requirement: updateDealPhase が estimate_approval フェーズへの遷移を処理しない

`updateDealPhase` は `estimate_approval` への遷移分岐を含んではならない（MUST NOT）。`approvalTemplateRepository`、`requestRepository`、`approvalStepRepository` を import してはならない（MUST NOT）。

#### Scenario: negotiation から won へのフェーズ更新が成功する

**Given** 案件のフェーズが `negotiation` である
**When** `updateDealPhase` を `newPhase: "won"` で呼び出す
**Then** 案件のフェーズが `won` に更新され、audit log が記録される。承認リクエストは生成されない。

### Requirement: 案件化 UI がテンプレート選択なしの確認ダイアログのみで動作する

`InquiryActions` コンポーネントは `templates` props を受け取ってはならない（MUST NOT）。案件化ボタンをクリックした際、テンプレート選択モーダルではなく確認ダイアログのみを表示しなければならない（MUST）。

#### Scenario: 案件化ボタンのクリックで確認ダイアログが表示される

**Given** 引き合い詳細ページが表示されており、引き合いが `in_progress` 状態である
**When** ユーザーが「案件化」ボタンをクリックする
**Then** 確認ダイアログ（「この引き合いを案件化しますか？」）が表示される。テンプレート選択 UI は存在しない。

#### Scenario: 確認後に案件化が実行される

**Given** 確認ダイアログが表示されている
**When** ユーザーが確認ボタンをクリックする
**Then** `updateInquiryStatusAction` が `templateId` なしで呼び出され、Deal が直接作成される

### Requirement: requests テーブルに sourceType と sourceId カラムが存在しない

`requests` テーブルの Drizzle スキーマ定義に `sourceType`（`text("source_type")`）と `sourceId`（`uuid("source_id")`）のカラム定義を含んではならない（MUST NOT）。データベースマイグレーションによりこれらのカラムが削除されなければならない（MUST）。

#### Scenario: マイグレーション SQL にカラム削除が含まれる

**Given** `schema.ts` から `sourceType`, `sourceId` のカラム定義が削除されている
**When** `bunx drizzle-kit generate` を実行する
**Then** 生成された SQL に `ALTER TABLE requests DROP COLUMN source_type` および `DROP COLUMN source_id` が含まれる

### Requirement: inquiries テーブルに conversionRequestId カラムが存在しない

`inquiries` テーブルの Drizzle スキーマ定義に `conversionRequestId`（`uuid("conversion_request_id")`）のカラム定義を含んではならない（MUST NOT）。データベースマイグレーションによりこのカラムが削除されなければならない（MUST）。

#### Scenario: マイグレーション SQL にカラム削除が含まれる

**Given** `schema.ts` から `conversionRequestId` のカラム定義が削除されている
**When** `bunx drizzle-kit generate` を実行する
**Then** 生成された SQL に `ALTER TABLE inquiries DROP COLUMN conversion_request_id` が含まれる
