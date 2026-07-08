# Tasks: MCP ツールの発見性向上（description / フィールド説明の充実）

## T-01: 全 19 ツールの description 書き直し

全ツールの `description` 文字列を発見性重視で書き直す。各ツールファイルの `server.registerTool` 第 2 引数の `description` を変更する。`name`・`inputSchema`・ハンドラは一切変更しない。

以下は各ツールの新 description の要件（実装者はこの語彙要件を満たす description を作成する）:

- [ ] `src/app/api/mcp/tools/clients.ts` — description に以下を含める: 正式名「顧客」、英語名「Client」、同義語「取引先・クライアント・customer」、担当者管理（ClientContact / DealContact）への言及、operation リスト。
- [ ] `src/app/api/mcp/tools/inquiries.ts` — description に以下を含める: 正式名「引合」、英語名「Inquiry」、同義語「問い合わせ・見込み・リード・lead」、予算・ソース・ステータス管理への言及、operation リスト。
- [ ] `src/app/api/mcp/tools/deals.ts` — description に以下を含める: 正式名「案件」、英語名「Deal」、同義語「商談・opportunity」、フェーズ管理（proposal_prep〜won/lost）・見積金額・契約種別への言及、operation リスト。
- [ ] `src/app/api/mcp/tools/contracts.ts` — description に以下を含める: 正式名「契約」、英語名「Contract」、同義語「契約書・受注」、契約種別（準委任/請負/SES）・金額・期間・更新条件への言及、operation リスト。
- [ ] `src/app/api/mcp/tools/invoices.ts` — description に以下を含める: 正式名「請求」、英語名「Invoice」、同義語「請求書・インボイス・billing」、金額・発行日・支払期日・ステータスへの言及、operation リスト。
- [ ] `src/app/api/mcp/tools/interactions.ts` — description に以下を含める: 正式名「顧客接点」、英語名「Interaction」、同義語「商談・打ち合わせ・ミーティング・meeting」、商談記録・契約調整・請求調整への言及、operation リスト。
- [ ] `src/app/api/mcp/tools/tasks.ts` — description に以下を含める: 正式名「タスク」「アクションアイテム」、英語名「Task」、同義語「TODO・やること・action item」、案件/引合/商談とのリンク・期日・担当者への言及、operation リスト。
- [ ] `src/app/api/mcp/tools/watches.ts` — description に以下を含める: 正式名「ウォッチ」、英語名「Watch」、同義語「フォロー・お気に入り・bookmark」、案件の変更通知購読への言及、operation リスト。
- [ ] `src/app/api/mcp/tools/notifications.ts` — description に以下を含める: 正式名「通知」、英語名「Notification」、同義語「お知らせ・アラート・alert」、既読管理への言及、operation リスト。
- [ ] `src/app/api/mcp/tools/revenue.ts` — description に以下を含める: 正式名「売上」、英語名「Revenue」、同義語「売上実績・sales」、ダッシュボード・明細・予実（forecast）への言及、読み取り専用の明示、operation リスト。
- [ ] `src/app/api/mcp/tools/revenueTargets.ts` — description に以下を含める: 正式名「売上目標」、英語名「RevenueTarget」、同義語「売上予算・target・KPI」、期間・目標金額への言及、operation リスト。
- [ ] `src/app/api/mcp/tools/approvalRequests.ts` — description に以下を含める: 正式名「承認リクエスト」、英語名「ApprovalRequest」、同義語「申請・稟議・ワークフロー・approval」、ステータス（draft/pending/approved/rejected）・一括承認・再提出への言及、filter 引数の注意事項（既存補足テキストの内容を維持）、operation リスト。
- [ ] `src/app/api/mcp/tools/delegations.ts` — description に以下を含める: 正式名「承認委任」、英語名「Delegation」、同義語「代理承認・代行」、期間指定・委任元/委任先への言及、operation リスト。
- [ ] `src/app/api/mcp/tools/approvalTemplates.ts` — description に以下を含める: 正式名「承認テンプレート」、英語名「ApprovalTemplate」、同義語「承認フロー定義・ワークフローテンプレート」、承認ステップ・フォーム定義への言及、operation リスト。
- [ ] `src/app/api/mcp/tools/approvalPolicies.ts` — description に以下を含める: 正式名「承認ポリシー」、英語名「ApprovalPolicy」、同義語「自動承認ルール・トリガー」、トリガーアクション（inquiry.convert / contract.create / contract.cancel）・条件への言及、operation リスト。
- [ ] `src/app/api/mcp/tools/organization.ts` — description に以下を含める: 正式名「組織」、英語名「Organization」、同義語「テナント・会社・company」、組織名の取得・更新への言及、operation リスト。
- [ ] `src/app/api/mcp/tools/users.ts` — description に以下を含める: 正式名「ユーザー」、英語名「User」、同義語「メンバー・アカウント・member」、ロール（admin/member/manager/finance）・有効化/無効化への言及、operation リスト。
- [ ] `src/app/api/mcp/tools/webhooks.ts` — description に以下を含める: 正式名「Webhook」、同義語「Webフック・通知連携・HTTP コールバック」、エンドポイント管理・配信履歴・リトライへの言及、operation リスト。
- [ ] `src/app/api/mcp/tools/auditLogs.ts` — description に以下を含める: 正式名「監査ログ」、英語名「AuditLog」、同義語「操作履歴・証跡・audit trail」、読み取り専用の明示、日時範囲・アクション・対象タイプでの検索への言及、operation リスト。

**注意事項**:
- 全ツール共通の定型文「operation 引数で操作を切り替えます。」は除去する
- operation リストは `operation: list/get/create/...` の形式で末尾に短縮表記する
- 会話の文脈・経緯を含めない（成果物はそれ単体で読めること）
- `name` は変更しない

**Acceptance Criteria**:
- 全 19 ツールの description が空でない
- 全 19 ツールの description が相互に distinct（重複なし）
- 各ツールの description に上記で指定した主要キーワード（正式名）が含まれる
- `name`・`inputSchema`・ハンドラに変更がない

## T-02: 主要フィールドの `.describe()` 補強

全 19 ツールの per-operation スキーマ内の主要フィールドに `.describe()` を追加する。既存の `.describe()`（`inquiries` の `source` と `budget`）は維持する。

各ツールで追加する `.describe()` の対象:

- [ ] `clients.ts` — `clientId`（顧客ID）、`contactId`（担当者ID）、`dealId`（案件ID）、`name`（顧客名）、`industry`（業種）、`size`（企業規模）、`role` enum（担当者役割: key_person=キーパーソン, decision_maker=意思決定者, technical=技術担当, other=その他）、`isPrimary`（主担当フラグ）
- [ ] `inquiries.ts` — `inquiryId`（引合ID）、`clientId`（顧客ID）、`newClientName`（新規顧客名 — 顧客を同時作成する場合）、`title`（件名）、`contactNote`（連絡メモ）、`assigneeId`（担当者ID）、`timeline`（希望時期）、`newStatus` enum（new=新規, converted=案件化, declined=辞退）。既存の `source`・`budget` は維持。
- [ ] `deals.ts` — `dealId`（案件ID）、`inquiryId`（引合ID）、`clientId`（顧客ID）、`title`（案件名）、`estimatedAmount`（見積金額（整数、円））、`estimatedStartDate`（見積開始日）、`estimatedEndDate`（見積終了日）、`contractType` enum（quasi_delegation=準委任, fixed_price=請負, ses=SES）、`assigneeId`（営業担当ID）、`technicalLeadId`（技術担当ID）、`newPhase` enum（proposal_prep=提案準備, proposed=提案済, negotiation=交渉中, won=受注, lost=失注）
- [ ] `contracts.ts` — `contractId`（契約ID）、`dealId`（案件ID）、`amount`（契約金額（正の整数、円））、`startDate`（契約開始日）、`endDate`（契約終了日）、`contractType` enum（quasi_delegation=準委任, fixed_price=請負, ses=SES）、`paymentTerms`（支払条件）、`renewalType` enum（one_time=一回限り, recurring=自動更新）、`renewalCycle`（更新サイクル）、`newStatus` enum（active=有効, completed=完了, cancelled=解約）
- [ ] `invoices.ts` — `invoiceId`（請求ID）、`contractId`（契約ID）、`title`（請求タイトル）、`amount`（請求金額（正の整数、円））、`dueDate`（支払期日）、`issueDate`（発行日）、`status` enum（scheduled=予定, invoiced=請求済, paid=入金済, overdue=延滞）、`paidAt`（入金日（YYYY-MM-DD））、`paidAtFrom`/`paidAtTo`（入金日範囲）、`issueDateFrom`/`issueDateTo`（発行日範囲）
- [ ] `interactions.ts` — `dealId`（案件ID）、`inquiryId`（引合ID）、`meetingId`（商談ID）、`contractId`（契約ID）、`invoiceId`（請求ID）、`type` enum（hearing=ヒアリング, proposal=提案, negotiation=交渉, closing=クロージング, followup=フォローアップ）、`date`（実施日時）、`location`（場所）、`summary`（要約）、`details`（詳細）
- [ ] `tasks.ts` — `id`（タスクID）、`description`（タスク内容）、`assigneeId`（担当者ID）、`dueDate`（期日）、`interactionId`（関連商談ID）、`dealId`（関連案件ID）、`inquiryId`（関連引合ID）、`done`（完了フラグ）、`status` enum（todo=未着手, in_progress=進行中, done=完了）、`type` enum（deal=案件, inquiry=引合, meeting=商談）、`query`（検索キーワード）
- [ ] `watches.ts` — `dealId`（案件ID）
- [ ] `notifications.ts` — フィールドが `operation` のみのため追加不要
- [ ] `revenue.ts` — `startDate`（集計開始日）、`endDate`（集計終了日）、`axis` enum（monthly=月次, customer=顧客別, deal=案件別）、`periodStart`（予実開始日）、`periodEnd`（予実終了日）
- [ ] `revenueTargets.ts` — `id`（売上目標ID）、`periodStart`（対象期間開始日）、`periodEnd`（対象期間終了日）、`targetAmount`（目標金額（正の整数、円））
- [ ] `approvalRequests.ts` — `requestId`（承認リクエストID）、`templateId`（承認テンプレートID）、`title`（申請タイトル）、`formData`（申請フォームデータ）、`filter` enum（action_required=対応待ち, my_requests=自分の申請, all=全件）、`statusFilter` enum（draft=下書き, pending=承認待ち, approved=承認済, rejected=却下, revision=差戻し, expired=期限切れ）、`targetStatus` enum（rejected=却下, revision=差戻し）、`comment`（却下コメント）、`requestIds`（一括承認対象ID群）
- [ ] `delegations.ts` — `delegationId`（委任ID）、`fromUserId`（委任元ユーザーID）、`toUserId`（委任先ユーザーID）、`startDate`（委任開始日）、`endDate`（委任終了日）
- [ ] `approvalTemplates.ts` — `templateId`（テンプレートID）、`name`（テンプレート名）、`steps`（承認ステップ配列）、`fields`（フォーム定義配列）
- [ ] `approvalPolicies.ts` — `policyId`（ポリシーID）、`name`（ポリシー名）、`triggerAction` enum（inquiry.convert=引合の案件化, contract.create=契約作成, contract.cancel=契約解約）、`templateId`（適用する承認テンプレートID）、`conditionField`（条件対象フィールド名）、`conditionOperator` enum（gt=より大きい, gte=以上, lt=未満, lte=以下, eq=等しい, neq=等しくない, in=含む）、`conditionValue`（条件値）
- [ ] `organization.ts` — `name`（組織名）
- [ ] `users.ts` — `userId`（ユーザーID）、`email`（メールアドレス）、`name`（ユーザー名）、`role` enum（admin=管理者, member=一般メンバー, manager=マネージャー, finance=経理）、`password`（初期パスワード（8文字以上））
- [ ] `webhooks.ts` — `endpointId`（WebhookエンドポイントID）、`deliveryId`（配信ID）、`url`（配信先URL）、`events`（購読イベント種別の配列）、`isActive`（有効フラグ）
- [ ] `auditLogs.ts` — `startDate`（検索開始日時（ISO 8601））、`endDate`（検索終了日時（ISO 8601））、`action`（操作種別）、`actorId`（操作者ID）、`targetType`（操作対象の種別）、`limit`（取得件数上限（1〜1000、デフォルト100））、`offset`（取得開始位置）

**注意事項**:
- `.describe()` はスキーマフィールドの定義に追加する（例: `z.string().uuid().describe("顧客ID（UUID）")`）
- 既に `.describe()` が付与されているフィールドは上書きしない（`inquiries` の `source`・`budget`）
- `operation` リテラルの `.describe()` は追加しない（`buildAdvertisementSchema` で enum レベルに既に付与済み）
- スキーマの構造（型・バリデーション・optional/required）は変更しない

**Acceptance Criteria**:
- 各ツールの主要フィールド（上記リスト）に `.describe()` が付与されている
- `tools/list` で取得した inputSchema の `properties` 内の該当フィールドに `description` が含まれる
- スキーマの `type`・`enum`・`required` 構造に変更がない（既存の inputSchema 広告テストが green）

## T-03: description 品質テストの作成

`src/__tests__/mcp/mcpToolDescriptions.test.ts` を新規作成し、description の品質を実行検証で固定する。

- [ ] テストセットアップ: 既存の `mcpInputSchemaAdvertisement.test.ts` と同様のパターンで `McpServer` を作成し全 19 ツールを登録する。`tools/list` で全ツールの description を取得する。
- [ ] **distinctness テスト**: 全 19 ツールの description を Set に入れ、サイズが 19 であることを assert する（重複がないことの検証）
- [ ] **keyword テスト**: 以下のマッピングで各ツールの description に主要キーワードが含まれることを assert する:
  - `clients` → "顧客"
  - `inquiries` → "引合"
  - `deals` → "案件"
  - `contracts` → "契約"
  - `invoices` → "請求"
  - `interactions` → "顧客接点"
  - `tasks` → "タスク"
  - `watches` → "ウォッチ"
  - `notifications` → "通知"
  - `revenue` → "売上"
  - `revenue_targets` → "売上目標"
  - `approval_requests` → "承認"
  - `delegations` → "委任"
  - `approval_templates` → "テンプレート"
  - `approval_policies` → "ポリシー"
  - `organization` → "組織"
  - `users` → "ユーザー"
  - `webhooks` → "Webhook"
  - `audit_logs` → "監査"
- [ ] mock 設計: `@/infrastructure/rateLimit` を mock（DB 接続回避）。`afterAll` で復元。バレル経由のモックは使用しない。

**Acceptance Criteria**:
- 全テストが green
- ソース文字列照合（`readFile` + `toContain`）を使用していない（全て tools/list 経由の実行検証）
- mock.module でバレル（`@/application/usecases` 等）をモックしていない

## T-04: 既存テスト・品質ゲート確認

既存テスト・ビルド・lint・型チェックが全て green であることを確認する。

- [ ] `bun test` — 全テスト green（新規テスト含む）
- [ ] `bun run typecheck` — 型エラーなし
- [ ] `bun run lint` — lint エラーなし
- [ ] `bun run build` — ビルド成功

**Acceptance Criteria**:
- 上記 4 コマンドが全て exit 0
- 既存テストに変更を加えていない（既存テストはそのまま green）
- `mcpInputSchemaAdvertisement.test.ts` の TC-001〜TC-020 が全て green（inputSchema 構造は不変）
