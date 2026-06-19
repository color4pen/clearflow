# Conformance Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:   implementation conforms to tasks.md, design.md, spec.md, and request.md
  - needs-fix:  one or more upstream artifacts are not satisfied by the implementation
  - escalation: conformance cannot be determined (missing artifacts, unresolvable ambiguity)
- The Findings table records the per-artifact judgment.
-->

- **verdict**: approved

## Conformance Findings

| Artifact | Conforms | Notes |
|----------|----------|-------|
| tasks.md | yes | T-01〜T-23 全 23 タスクが [x] 完了済み。未完了タスクなし。 |
| design.md | yes | D1〜D10 の全設計判断が実装に反映されている。 |
| spec.md | yes | 全 8 Requirements とそれぞれの Scenario を満足している。 |
| request.md | yes | 全受け入れ基準を満足。build/typecheck/test/lint が全フェーズ通過（440 pass, 0 fail）。 |

---

## 詳細所見

### tasks.md

T-01〜T-23 の全タスクが完了済み。チェックボックスの未完了項目なし。

### spec.md — Requirements 適合確認

**inquiryStatusEnum は 4 値で定義される**
`schema.ts` L36-41 に `pgEnum("inquiry_status", ["new", "in_progress", "converted", "declined"])` が定義されている。順序・値ともに仕様通り。

**引き合いのステータス遷移ルール**
`inquiryTransition.ts` に `VALID_TRANSITIONS = { new: ["in_progress", "declined"], in_progress: ["converted", "declined"] }` が定義されており、終端状態（converted, declined）はマップから除外されている。`inquiryTransition.test.ts` の T-01〜T-09（9 パターン）で全 Scenario をカバー。

**converted 遷移時に承認リクエストを自動作成する**
`updateInquiryStatus.ts` が `converted` 遷移時に `requestRepository.create()` → `approvalStepRepository.createMany()` → `inquiryRepository.updateStatus(…, newRequest.id, …)` → 監査ログ 2 件を単一 `db.transaction()` 内で完結させている（D3・D10 と一致）。テンプレート未指定・テンプレート不在の各エラーケースも適切に返却。

**全リポジトリ関数に organizationId 条件を付与する**
`clientRepository.ts`（create, findById, findAllByOrganization, update）および `inquiryRepository.ts`（create, findById, findAllByOrganization, findAllWithClientByOrganization, update, updateStatus）の全関数で `organizationId` 条件を付与。`organizationId` はセッションから取得しており、リクエストボディからは受け取っていない。

**引き合い作成・ステータス変更で監査ログを記録する**
`createInquiry.ts`: トランザクション内で `action: "inquiry.create"`, `targetType: "inquiry"`, `targetId: newInquiry.id` を記録。`updateInquiryStatus.ts`: 両分岐（converted・その他）ともトランザクション内で `action: "inquiry.updateStatus"`, `metadata: { fromStatus, toStatus }` を記録。converted 時はさらに `action: "request.create"` も同一トランザクション内に記録。`createClient.ts`: トランザクション内で `action: "client.create"`, `targetType: "client"`, `targetId: newClient.id` を記録。

**引き合いのステータス変更（converted）は admin と manager のみ実行可能**
`inquiries.ts` L102-106 で `if (newStatus === "converted") { if (session.user.role !== "admin" && session.user.role !== "manager") { return { success: false, message: "権限がありません" }; } }` — Server Action 層で制御（D9 と一致）。

**ダッシュボードヘッダーに顧客・引き合いのナビリンクを表示する**
`layout.tsx` に `/clients`（顧客）と `/inquiries`（引き合い）のリンクを `isAdmin` 条件なしで全ロールに表示。申請一覧の直後に配置し、同一スタイルクラスを使用。

**依存方向を遵守する**
`inquiryTransition.ts` は `../models/inquiry` からのみ import し `@/infrastructure` への参照なし。`client.ts`, `inquiry.ts` は ORM / drizzle への import がない純粋な type エイリアス。TC-034 テスト（domain 層 infrastructure import 禁止）に両ファイルが含まれ検証済み。

### design.md — 設計判断の実装反映確認

| 判断 | 確認結果 |
|------|----------|
| D1: clients / client_contacts 別テーブル | schema.ts に 2 テーブル定義済み ✓ |
| D2: inquiryTransition.ts をドメインサービスで管理 | `src/domain/services/inquiryTransition.ts` 実装済み ✓ |
| D3: converted 時に requestRepository / approvalStepRepository を直接呼ぶ | updateInquiryStatus.ts で再現済み ✓ |
| D4: inquiries.requestId で承認リクエストを参照 | schema に `requestId` FK（onDelete: "set null"）定義、updateStatus で更新 ✓ |
| D5: /clients, /inquiries をダッシュボード直下に配置 | ページ・ナビとも実装済み ✓ |
| D6: source は text、Zod enum でバリデーション | schema は `text("source")`、Action は `z.enum(["web","phone","referral","exhibition","other"])` ✓ |
| D7: inquiryStatusEnum を pgEnum で定義 | `pgEnum("inquiry_status", ...)` ✓ |
| D8: client_contacts に organizationId なし | schema で clientContacts に organizationId カラムなし ✓ |
| D9: converted の権限チェックを Server Action で実施 | `inquiries.ts` action で `role` チェック ✓ |
| D10: updateInquiryStatus から createRequest usecase を呼ばない | repository を直接操作、createRequest usecase の呼び出しなし ✓ |

### request.md — 受け入れ基準適合確認

| 基準 | 結果 |
|------|------|
| `bun run build` が成功する | passed (exit 0) ✓ |
| `bun test` が全件 green | 440 pass, 0 fail ✓ |
| 3 テーブルが schema.ts に定義されている | ✓ |
| `inquiryStatusEnum` が 4 値で定義されている | ✓ |
| 全リポジトリ関数に `organizationId` 条件が付与されている | ✓ |
| 状態遷移テスト（4 パターン） | T-01〜T-09 全通過 ✓ |
| converted 遷移時の承認リクエスト自動作成をテストで確認 | inquiryManagement.test.ts 静的検証テスト通過 ✓ |
| 監査ログ記録 | 実装確認・テスト通過 ✓ |
| converted 変更が admin/manager のみ実行可能 | ロールチェック・静的検証テスト通過 ✓ |
| ナビリンク表示 | layout.tsx 実装確認 ✓ |
| 依存方向遵守 | TC-034 等テスト通過 ✓ |
| `typecheck` が green | passed ✓ |

### コーディング規約

- 依存方向: domain 層から infrastructure への参照なし。usecase 層が domain + infrastructure を協調。適合。
- テスト記述: `inquiryTransition.test.ts` は T-01〜T-09 の ID 付与と `準備 / 実行 / 検証` マーカーを全テストで使用。`inquiryManagement.test.ts` は一部テストで `実行・検証 -` を結合した1マーカーを使用しているが、readFile（準備）と expect（実行＋検証が不可分）の静的解析テストとして実質的な違反度は低い。
- エラーハンドリング: 全 usecase が `{ ok: true; data } | { ok: false; reason }` Result 型を使用。catch-all でのステータスコード変換なし。
- コメント: ビジネスロジック上の判断（楽観ロック用 version カラムの理由、tenant 分離の前提条件）がコメントで記述されている。

### 仕様範囲外の追加実装（情報提供）

以下はいずれも仕様違反ではなく、受け入れ基準を超えた品質向上である。

- `inquiries` テーブルに `version` カラム（楽観ロック用）を追加。tasks.md T-01 仕様にはないが、D10 のリスク（converted 遷移での重複承認リクエスト生成防止）への対処として有益。
- `clientRepository` に `countContactsByClientIds`, `findAllContactsByOrganization` を追加。tasks.md T-05 にはないが、顧客一覧ページの N+1 回避および引き合い登録フォームの担当者選択に活用。
- `inquiryRepository` に `findByClientId` を追加。tasks.md T-06 にはないが、顧客詳細ページの関連引き合い一覧表示に活用。
