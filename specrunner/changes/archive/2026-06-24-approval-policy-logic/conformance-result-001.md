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
| tasks.md | ✅ | T-01〜T-11 全チェックボックスが [x] で完了 |
| design.md | ✅ | D1〜D7 全設計判断が実装に反映されている |
| spec.md | ✅ | 全 7 Requirement・全 Scenario が実装済み・テスト済み |
| request.md | ✅ | 全 12 受け入れ基準を充足。typecheck && test が green |

---

## Detailed Findings

### tasks.md

T-01〜T-11 の全タスクのチェックボックスが `[x]` で完了している。

### design.md — 設計判断 D1〜D7

| Decision | 判断 | 検証 |
|----------|------|------|
| D1: conditionEvaluator を domain 層の pure function に | ✅ | `src/domain/services/conditionEvaluator.ts` に実装。リポジトリ呼び出しなし |
| D2: ポリシー評価を updateInquiryStatus 内で直接呼び出す | ✅ | `evaluatePolicies()` を converted 遷移時に直接呼び出している |
| D3: 承認後アクションは非同期ハンドラ | ✅ | `dispatcher.on("approval.completed", handleApprovalCompleted, "async")` で登録 |
| D4: skipPolicyCheck フラグで無限ループ防止 | ✅ | `options?.skipPolicyCheck` が true の場合はポリシー評価ブロック全体をスキップ |
| D5: ConditionOperator に neq, in を追加 | ✅ | `approvalPolicy.ts` と `approvalPolicyRepository.ts` の両方で追加済み |
| D6: requestRepository.create で直接 status=pending で生成 | ✅ | `createRequest` / `submitRequest` を経由せず直接生成。`status: "pending"` を明示 |
| D7: UpdateInquiryStatusResult に pendingApproval を追加 | ✅ | `ok: true` バリアントに `pendingApproval?: { requestId: string }` が追加されている |

### spec.md — Requirements と Scenarios

#### Requirement: conditionEvaluator が全演算子で正しく動作する

- `evaluateCondition` が eq / neq / gt / gte / lt / lte / in の 7 演算子を実装 ✅
- 両辺が数値として解釈できる場合は数値比較、それ以外は文字列比較（gt/gte/lt/lte は数値のみ） ✅
- `context[field]` が undefined または null の場合は false を返す ✅
- `in` 演算子：`value` をカンマ区切りで分割し `String(contextValue)` を包含判定 ✅
- `conditionEvaluator.test.ts` が全 Scenario をカバー（849 pass） ✅

#### Requirement: evaluatePolicies がポリシーをフィルタする

- `approvalPolicyRepository.findActiveByTriggerAction` でアクティブポリシーを取得 ✅
- `conditionField=null` のポリシーは無条件合致 ✅
- アクティブポリシーなしで空配列を返す ✅
- `findActiveByTriggerAction` に `ORDER BY created_at ASC` を追加し、複数ポリシー合致時の先頭採用が決定的 ✅
- `conditionOperator` / `conditionValue` が null の場合のランタイムガードあり（コンソールエラーを出してスキップ）✅

#### Requirement: ApprovalCompleted イベント型が定義されている

- `types.ts` に `ApprovalCompleted` 型定義、payload に `requestId / originType / originTriggerAction / originTriggerEntityId` ✅
- `DomainEvent` union に追加済み ✅
- `OriginType` を `@/domain/models/approvalPolicy` から import ✅

#### Requirement: 案件化時にポリシーが評価される

- converted 遷移時に `evaluatePolicies` を呼び出す ✅
- `skipPolicyCheck=true` でポリシー評価全体をスキップし、従来フローを実行 ✅
- ポリシー合致時: `requestRepository.create`（origin_type=system, status=pending）+ `approvalStepRepository.createMany` を実行 ✅
- ポリシー合致時: Deal を生成せず、引合ステータスを変更しない ✅
- テンプレートが見つからない場合は従来フローへフォールバック ✅
- 重複防止: `findByOriginTriggerEntity` で既存 pending system リクエストを確認 ✅
- `{ ok: true, inquiry, pendingApproval: { requestId } }` を返す ✅
- Server Action (`inquiries.ts`) で `pendingApproval` を検出して承認待ちメッセージを返す ✅

#### Requirement: 承認完了時に ApprovalCompleted が発行される

- single-step フロー（ステップなし）で `originType === "system"` 時に `ApprovalCompleted` を dispatch ✅
- multi-step フローで全ステップ承認完了時に `originType === "system"` 時に dispatch ✅
- `originType === "manual"` の場合は発行しない ✅
- 既存の `request.approved` イベントは両フローで引き続き発行される ✅

#### Requirement: 承認後に案件が自動生成される

- `handleApprovalCompleted` が `originTriggerAction === "inquiry.convert"` を確認 ✅
- `updateInquiryStatus` を `skipPolicyCheck: true` で呼び出す ✅
- `originTriggerEntityId` が null の場合はエラーログを出力して安全に終了 ✅
- `updateInquiryStatus` 失敗時もエラーログのみで承認をロールバックしない ✅

#### Requirement: 既存の手動承認フローが引き続き動作する

- `origin_type=manual` のリクエストでは `ApprovalCompleted` を発行しない ✅
- 既存の `request.approved` イベントは変わらず発行される ✅

### request.md — 受け入れ基準

| 受け入れ基準 | 充足 |
|-------------|------|
| conditionEvaluator が全演算子（eq, neq, gt, gte, lt, lte, in）で正しく動作する | ✅ |
| evaluatePolicies がトリガーアクションと条件に基づいてポリシーをフィルタする | ✅ |
| ApprovalCompleted イベント型が定義されている | ✅ |
| 案件化時にポリシーが評価される | ✅ |
| ポリシー合致時に承認リクエストが origin_type=system で生成される | ✅ |
| ポリシー合致時に案件が生成されない（引合は new のまま） | ✅ |
| ポリシー非合致時に案件が即時生成される | ✅ |
| 承認完了時に ApprovalCompleted が発行される | ✅ |
| 承認後に案件が自動生成される | ✅ |
| skipPolicyCheck で無限ループしない | ✅ |
| 既存の手動承認フローが引き続き動作する | ✅ |
| `typecheck && test` が green | ✅ build/typecheck/test/lint すべて passed（849 pass, 0 fail） |

---

## Notes

### minor: evaluatePolicies の tx? パラメータ省略

`request.md` の要件では `evaluatePolicies(organizationId, triggerAction, context, tx?)` と `tx?` を含む署名を記載している。しかし `tasks.md`（T-03）では `tx` を省略した署名が定義されており、実装もこれに従っている。

`approvalPolicyRepository.findActiveByTriggerAction` が `tx` パラメータを受け付けない設計のため、`evaluatePolicies` に `tx?` を渡しても意味をなさない。`tasks.md` の精緻化段階で適切に整理されており、機能的な問題は生じていない。conformance には影響しない。

### lint warnings

lint フェーズで 10 件の warning（unused vars）が検出されているが、いずれも本変更とは無関係の既存コード（`BulkApprovalPanel.tsx`, `FormField.tsx` 等）に対するものであり、error は 0 件。
