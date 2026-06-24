# Design: approval-policy-logic

## Context

R04a（approval-policy-schema）で承認ポリシーのテーブル・モデル・リポジトリを追加済み。`ApprovalPolicy` は `triggerAction`（例: `"inquiry.convert"`）と単一条件（`conditionField` / `conditionOperator` / `conditionValue`）を持ち、合致したときに指定テンプレートで承認リクエストを生成する。

現在の `updateInquiryStatus` は `converted` 遷移時に Deal を直接生成し `InquiryConverted` イベントを発行する。ポリシー評価は入っていない。

`requestRepository.create` は `originType`、`originPolicyId`、`originTriggerAction`、`originTriggerEntityId` を受け付けるが、まだどのユースケースからも system origin で生成されていない。

`ConditionOperator` は `gt | gte | lt | lte | eq` の 5 種で、`neq` と `in` が未定義。

## Goals / Non-Goals

**Goals**:

- 引合 → 案件化の遷移時にアクティブな承認ポリシーを評価し、合致ポリシーがあれば承認リクエストを自動生成する
- 承認完了後に案件を自動生成する（承認後アクションハンドラ）
- 条件評価を pure function としてドメイン層に分離する
- `ConditionOperator` に `neq` と `in` を追加する

**Non-Goals**:

- `contract.create` / `contract.cancel` のポリシー連動
- 承認ポリシー設定画面（R08）
- 複数ポリシー合致時の全承認完了待ち（最初の 1 件のみ使用）

## Decisions

### D1: 条件評価を pure function としてドメインサービスに分離

**選択**: `src/domain/services/conditionEvaluator.ts` に `evaluateCondition(field, operator, value, context): boolean` を配置する。リポジトリアクセスは含まない。`evaluatePolicies`（usecase 層）がこれを呼び出す。

**理由**: ドメイン層の pure function にすることでテストが容易。既存の `evaluateStepCondition`（approvalStepService）と同じ設計パターンに沿う。`evaluateStepCondition` は `StepCondition` 型に依存しテンプレート用途に限定されるため、ポリシー用は別関数とする。

**却下した代替案**: `evaluateStepCondition` を拡張 — 演算子が異なり（`neq`, `in` が追加）、入力形式も異なる（`StepCondition` vs 文字列ベース）。無理に統合するとどちらのユースケースにも不適切な抽象化になる。

### D2: ポリシー評価をユースケース内で直接呼び出す

**選択**: `updateInquiryStatus` 内で `evaluatePolicies` を呼び出す。ポリシー合致時は Deal を生成せず、承認リクエストを生成して引合を `new` のまま返す。

**理由**: フローの分岐がユースケース内で完結するため、追跡しやすい。イベントハンドラからユースケースの振る舞いを制御するパターンは戻り値での分岐が必要で複雑すぎる。

**却下した代替案**: `InquiryConverted` の同期ハンドラで評価 — 戻り値でフロー分岐が必要で設計が複雑。

### D3: 承認後アクションは非同期ハンドラ

**選択**: `ApprovalCompleted` の非同期ハンドラで案件生成。承認完了と案件生成は別トランザクション。

**理由**: 承認の完了を案件生成の成否に依存させない。`approveRequest` のトランザクション内では承認ステータスの更新のみを行い、案件生成は `flushAsync()` 後に非同期で実行する。障害時に承認結果がロールバックされるリスクを排除。

**却下した代替案**: 同期ハンドラ — 案件生成の失敗が承認トランザクションをロールバックしてしまう。

### D4: skipPolicyCheck フラグで再帰呼び出しの無限ループを防止

**選択**: `updateInquiryStatus` のオプション引数に `skipPolicyCheck?: boolean` を追加。`true` の場合はポリシー評価をスキップし、従来通り Deal を直接生成する。Server Action からは渡せない内部引数。

**理由**: 承認後ハンドラが `updateInquiryStatus` を再呼び出しする際、ポリシー評価が再度トリガーされると無限ループになる。フラグで明示的にスキップすることで安全にフローを完結させる。

**却下した代替案**: 専用の `createDealFromApproval` ユースケース — Deal 生成ロジック・状態遷移チェック・監査ログ記録が `updateInquiryStatus` と重複する。

### D5: ConditionOperator の拡張（neq, in の追加）

**選択**: `ConditionOperator` 型に `"neq"` と `"in"` を追加する。DB の `condition_operator` カラムは varchar のためスキーマ変更不要。`approvalPolicyRepository` の `CONDITION_OPERATORS` バリデーションセットにも追加。

**理由**: `neq`（不等価）は除外条件に、`in`（包含）はソース種別のフィルタリングに必要。conditionValue にカンマ区切りで値リストを格納する（例: `"web,phone,email"`）。

**代替案なし**: 要件で明示されている。

### D6: システム起因リクエストを requestRepository.create で直接生成

**選択**: `updateInquiryStatus` 内で `requestRepository.create`（status: `"pending"`）+ `approvalStepRepository.createMany` を直接呼び出す。`createRequest` / `submitRequest` ユースケースは経由しない。

**理由**: `createRequest` は status を `"draft"` で作成し、`submitRequest` で `"pending"` に遷移する 2 ステップのフロー。システム起因の承認リクエストは人間の介入なく即座に承認フローを開始するため、`"pending"` で直接生成する必要がある。不要なイベント（`request.created` の draft 段階）の発行も回避できる。テンプレートの `filterStepsByCondition` はリクエストの `formData` を評価するが、システム起因リクエストは formData を持たないため全ステップを含める。

**却下した代替案**: `createRequest` → `submitRequest` の 2 段階呼び出し — 中間の draft 状態が不要で、不要なイベント発行が発生する。

### D7: UpdateInquiryStatusResult の型を拡張してポリシーゲート結果を伝達

**選択**: `UpdateInquiryStatusResult` の `ok: true` バリアントに `pendingApproval?: { requestId: string }` を追加する。ポリシー合致時は引合の status を変更せず、`{ ok: true, inquiry: <status=new のまま>, pendingApproval: { requestId } }` を返す。

**理由**: Server Action が結果を見てユーザーに適切なフィードバック（「承認待ちです」）を表示できる。戻り値の discriminant で分岐するだけでよく、Server Action の変更は最小限。

**却下した代替案**: エラーとして返す（`ok: false`） — ポリシーゲートは正常動作であり、エラーではない。

## Risks / Trade-offs

- **[Risk] 承認後の案件生成失敗** → 非同期ハンドラのためエラーは `console.error` で記録され、承認自体はロールバックされない。引合が `new` のまま残り、再度案件化を試みることで回復可能。将来的にリトライ機構を検討。
- **[Risk] 複数ポリシー合致時の挙動** → スコープ外により最初の 1 件のみ使用。ポリシーの作成順（`createdAt` 昇順）で先頭を採用。ユーザーが複数ポリシーを設定した場合に予想外の挙動となる可能性がある。R08（設定画面）で優先度の明示を検討。
- **[Trade-off] トランザクション分離** → 承認完了と案件生成が別トランザクション。承認完了後・案件生成前にサーバー障害が発生した場合、承認は完了しているが案件が未生成の状態が一時的に発生する。引合が `new` のまま残るため、手動で案件化を再試行できる。
- **[Trade-off] conditionValue の文字列格納** → `in` 演算子用にカンマ区切りでリストを格納。値にカンマを含む場合は対応不可。現時点のユースケース（source 種別フィルタ等）では問題ない。

## Open Questions

なし（architect 評価済みの設計判断で主要論点が解決済み）。
