# 承認連携の撤去と直接遷移への移行

## Meta

- **type**: refactoring
- **slug**: remove-approval-coupling
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 機能の削除・簡素化であり新しい設計パターンの導入ではない → false -->

## 背景

案件管理と承認ワークフローを連携させていたが、運用上不要と判断した。案件化やフェーズ進行は管理者が直接操作すれば十分であり、承認が必要な場合は申請一覧から別途承認リクエストを作成する運用に切り替える。

承認連携に関わるコード（sourceType/sourceId、承認完了フック、テンプレート選択UI、conversionRequestId、estimate_approval フェーズ）を撤去し、シンプルな直接遷移に置き換える。

## 現状コードの前提

<!-- 現状のコードについての断定（「今のコードはこうなっている」）は file:line を伴ってこの節に書く。 -->

- `src/infrastructure/schema.ts:49-56` — `dealPhaseEnum` に `estimate_approval` が含まれている（line 53）
- `src/infrastructure/schema.ts:109-110` — `requests` テーブルに `sourceType` (text) と `sourceId` (uuid) カラムがある
- `src/infrastructure/schema.ts:276` — `inquiries` テーブルに `conversionRequestId` カラムがある
- `src/infrastructure/schema.ts:575-578` — `inquiriesRelations` に `conversionRequest` の one() 参照がある
- `src/domain/models/deal.ts:1-7` — `DealPhase` に `"estimate_approval"` が含まれている（line 5）
- `src/domain/models/request.ts:15-16` — `Request` 型に `sourceType: string | null` と `sourceId: string | null` がある
- `src/domain/models/inquiry.ts:15` — `Inquiry` 型に `conversionRequestId: string | null` がある
- `src/domain/services/dealTransition.ts:7-8` — 遷移ルールに `negotiation → [estimate_approval, lost]` と `estimate_approval → [won, lost]` がある
- `src/application/usecases/approveRequest.ts:28-125` — `runPostApprovalLinkage` 関数が sourceType を見て引き合い/案件の連動処理を実行する
- `src/application/usecases/approveRequest.ts:191,389` — `runPostApprovalLinkage` の呼び出し2箇所
- `src/application/usecases/approveRequest.ts:6-7` — `inquiryRepository`, `dealRepository` を import している（連動処理用）
- `src/application/usecases/updateInquiryStatus.ts:36-135` — converted 遷移で承認リクエスト作成 + 承認ステップ生成。`approvalTemplateRepository`（line 4）、`requestRepository`（line 5）、`approvalStepRepository`（line 6）、`filterStepsByCondition`（line 9）を import
- `src/application/usecases/updateDealPhase.ts:34-144` — estimate_approval 遷移で承認リクエスト作成。同様の import（line 4-6, 9）
- `src/app/(dashboard)/inquiries/[id]/InquiryActions.tsx:14` — `templates` props を受け取り、line 81-123 でテンプレート選択モーダルを表示
- `src/app/(dashboard)/inquiries/[id]/page.tsx:35` — `approvalTemplateRepository.findByOrganization` でテンプレート一覧を取得
- `src/app/(dashboard)/inquiries/[id]/page.tsx:74` — InquiryActions に `templates` props を渡している
- `src/app/(dashboard)/inquiries/[id]/page.tsx:38-40` — `requestRepository.findById` で conversionRequest を取得
- `src/app/(dashboard)/inquiries/[id]/page.tsx:104-119` — 案件化承認の表示（承認リクエストのステータスを表示）
- `src/app/actions/inquiries.ts:109` — FormData から `templateId` を取得
- `src/app/actions/inquiries.ts:127` — `templateId` を `updateInquiryStatus` に渡す
- `src/app/(dashboard)/labels.ts:28` — `estimate_approval: "見積承認中"` のラベル
- `src/infrastructure/repositories/requestRepository.ts:20-21` — `mapRow` で `sourceType`, `sourceId` をマッピング
- `src/infrastructure/repositories/requestRepository.ts:33-34` — `create` メソッドに `sourceType`, `sourceId` パラメータ
- `src/infrastructure/repositories/requestRepository.ts:48-49` — `create` の values 内で `sourceType`, `sourceId` をセット
- `src/infrastructure/seed.ts:197-208` — 案件化承認テンプレートのシードデータ
- `src/infrastructure/seed.ts:211-225` — 見積承認テンプレートのシードデータ
- `src/infrastructure/seed.ts:570-593` — 案件化承認リクエスト2件のシードデータ
- `src/infrastructure/seed.ts:779-792` — 見積承認リクエストのシードデータ
- `src/infrastructure/seed.ts:640,650` — 引き合いシードの `conversionRequestId` 参照

## 要件

<!-- コツ: 実装の最重量部（既存機構の一般化・暗黙の前提の変更）は行間に隠さず要件として名指しする。 -->

### A. スキーマ変更

1. **dealPhaseEnum から `estimate_approval` を削除**: 値を `["proposal_prep", "proposed", "negotiation", "won", "lost"]` に変更する
2. **requests テーブルから `sourceType` と `sourceId` カラムを削除**: 承認連携用のカラムを撤去する
3. **inquiries テーブルから `conversionRequestId` カラムを削除**: 案件化承認リクエストへの参照を撤去する。`inquiriesRelations` の `conversionRequest` one() 参照も削除する
4. **マイグレーションファイルを生成する**: `bunx drizzle-kit generate` を実行して、カラム削除のマイグレーション SQL を生成する。対話的プロンプトが出た場合はカラム削除として処理する

### B. ドメインモデル変更

5. **DealPhase から `"estimate_approval"` を削除**: `src/domain/models/deal.ts` の union literal を5値に変更する
6. **Request 型から `sourceType` と `sourceId` を削除**: `src/domain/models/request.ts` からフィールドを削除する
7. **Inquiry 型から `conversionRequestId` を削除**: `src/domain/models/inquiry.ts` からフィールドを削除する

### C. ドメインサービス変更

8. **dealTransition.ts の遷移ルール変更**: `negotiation → [estimate_approval, lost]` を `negotiation → [won, lost]` に変更する。`estimate_approval → [won, lost]` のエントリを削除する

### D. リポジトリ変更

9. **requestRepository.ts の修正**: `create` メソッドから `sourceType` と `sourceId` パラメータを削除する。`mapRow` から `sourceType` と `sourceId` のマッピングを削除する
10. **inquiryRepository.ts の修正**: `mapRow` から `conversionRequestId` のマッピングを削除する。`updateStatus` メソッドから `conversionRequestId` パラメータを削除する（ステータス変更のみに簡素化）

### E. ユースケース変更

11. **updateInquiryStatus.ts の簡素化**: converted 遷移ブロック（line 36-135）から承認リクエスト作成ロジックを全て撤去する。代わりに `dealRepository.create` を呼び出して Deal を直接作成する。`approvalTemplateRepository`, `requestRepository`, `approvalStepRepository`, `filterStepsByCondition` の import を削除する。`dealRepository` を import に追加する。converted 遷移時に `inquiryRepository.updateStatus` の呼び出しから `conversionRequestId` 引数を削除する
12. **updateDealPhase.ts の簡素化**: estimate_approval 分岐（line 34-144）を全て撤去する。`approvalTemplateRepository`, `requestRepository`, `approvalStepRepository`, `filterStepsByCondition` の import を削除する。`negotiation → won` は通常の遷移として処理する（既存の非 estimate_approval 遷移ロジックと同じ）
13. **approveRequest.ts から連動処理を撤去**: `runPostApprovalLinkage` 関数（line 28-125）を削除する。呼び出し箇所（line 191, 389）を削除する。`inquiryRepository`, `dealRepository` の import を削除する

### F. Server Actions 変更

14. **inquiries.ts の修正**: `updateInquiryStatusAction` から `templateId` の FormData 取得と渡しを削除する。`updateInquiryStatus` の呼び出しから `templateId` 引数を削除する

### G. UI 変更

15. **InquiryActions.tsx の簡素化**: `templates` props を削除する。テンプレート選択モーダル（line 81-123）を撤去する。「案件化」ボタンは確認ダイアログ（「この引き合いを案件化しますか？」）のみにする。`handleTransition("converted")` を直接呼ぶ（templateId 不要）
16. **inquiries/[id]/page.tsx の修正**: `approvalTemplateRepository` と `requestRepository` の import を削除する。templates と conversionRequest の取得を削除する。InquiryActions への `templates` props 渡しを削除する。案件化承認の表示セクション（line 104-119）を削除する
17. **labels.ts から `estimate_approval` ラベルを削除**: line 28 を削除する

### H. シードデータ修正

18. **シードデータから承認連携データを削除**: 案件化承認テンプレート（line 197-208）を削除する。見積承認テンプレート（line 211-225）を削除する。案件化承認リクエスト2件（line 570-593）を削除する。見積承認リクエスト（line 779-792）を削除する。引き合いシードの `conversionRequestId` 参照を削除する。案件シードの `estimateRequestId` 参照を削除する

### I. テスト修正

19. **既存テストの追従修正**: 承認連携テストを削除する。converted 遷移でDeal が直接作成されることをテストする。estimate_approval 関連のテストを削除し、negotiation → won の直接遷移テストに置き換える。dealTransition のテストを更新する

## スコープ外

- 承認ワークフロー自体の変更（既存の Request/ApprovalStep/ApprovalTemplate はそのまま維持）
- deals テーブルの estimateRequestId カラムの削除（将来的に手動で承認リクエストを紐づける用途で残す）

## 受け入れ基準

<!-- コツ: 機械検証できる文にする -->

- [ ] `bun run build` が成功する
- [ ] `bun test` が全件 green
- [ ] `dealPhaseEnum` に `estimate_approval` が含まれない
- [ ] `requests` テーブルに `sourceType` と `sourceId` カラムが存在しない
- [ ] `inquiries` テーブルに `conversionRequestId` カラムが存在しない
- [ ] `DealPhase` 型に `"estimate_approval"` が含まれない
- [ ] `Request` 型に `sourceType` と `sourceId` が存在しない
- [ ] `Inquiry` 型に `conversionRequestId` が存在しない
- [ ] `updateInquiryStatus` の converted 遷移で Deal が直接作成される（承認リクエスト作成なし）
- [ ] `updateDealPhase` に estimate_approval 分岐が存在しない
- [ ] `approveRequest` に `runPostApprovalLinkage` が存在しない
- [ ] `InquiryActions` に `templates` props が存在しない
- [ ] 案件化ボタンがテンプレート選択なしで動作する
- [ ] `canDealTransition("negotiation", "won")` が true を返す
- [ ] マイグレーションファイルが生成されている
- [ ] 依存方向 `actions → usecases → domain / infrastructure` を遵守
- [ ] `typecheck` が green

## architect 評価済みの設計判断

<!-- コツ: 採用した判断に加え、却下した代替案とその理由を書く。 -->

1. **承認連携を完全撤去を採用、オプション化（フラグで切り替え）を却下** — フラグによる分岐は複雑さを残す。承認が必要な場合は申請一覧から独立して承認リクエストを作成するのが最もシンプル。将来必要になれば再実装する
2. **deals.estimateRequestId は残すを採用、削除を却下** — 将来的に手動で承認リクエストを案件に紐づける用途がありうる。カラム自体は nullable なので存在しても害がない
3. **案件化時に確認ダイアログを表示を採用、確認なしで即実行を却下** — 案件化は引き合いの終端操作（converted は不可逆）であり、誤操作防止のため最低限の確認は必要
