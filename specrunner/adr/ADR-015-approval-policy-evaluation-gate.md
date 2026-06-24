# ADR-015: 承認ポリシー評価と引合案件化の承認ゲート

- **Status**: accepted
- **Date**: 2026-06-24
- **Change**: approval-policy-logic
- **Deciders**: architect

---

## Context

ADR-002（多段階承認ワークフロー）は手動起票の承認リクエストを対象としていた。R04a（approval-policy-schema）では承認ポリシーのテーブル・モデル・リポジトリを追加し、特定のビジネスアクション（`triggerAction`）に対して条件付きで承認フローを自動起動する基盤を整備した。

本変更（R04b）では以下を実装する:

- 引合 → 案件化（`inquiry.convert`）の遷移時にアクティブな承認ポリシーを評価する
- 合致ポリシーがある場合は承認リクエストを自動生成し、Deal の生成を保留する
- 承認完了後に非同期ハンドラが案件生成を再開する

この変更以前、`updateInquiryStatus` は `converted` 遷移時に Deal を直接生成し `InquiryConverted` イベントを発行するシンプルなフローだった。ポリシー評価は入っていなかった。

---

## Decisions

### D1: 条件評価を pure function としてドメインサービスに分離

**Decision**: `src/domain/services/conditionEvaluator.ts` に `evaluateCondition(field, operator, value, context): boolean` を配置する。リポジトリアクセスは含まない。`evaluatePolicies`（usecase 層）がこれを呼び出す。

**Rationale**:
- ドメイン層の pure function にすることでリポジトリ依存なしにユニットテストが可能
- 既存の `evaluateStepCondition`（approvalStepService）と同じ設計パターンに沿い、「domain/services はリポジトリを呼び出さない」という ADR-001 / ADR-014 D5 の原則を維持する
- `evaluateStepCondition` は `StepCondition` 型に依存しテンプレート用途に限定されているため、ポリシー用途（`neq`, `in` 演算子追加・文字列ベース入力）とは別関数とする

#### Alternative 1: evaluateStepCondition を拡張して共通化

| | |
|---|---|
| **Pros** | 条件評価ロジックが 1 ファイルに集約される |
| **Cons** | `StepCondition` 型と文字列ベースの引数形式が混在し、どちらのユースケースにも不適切な抽象化になる。演算子セットも異なる（`neq`, `in` の有無） |
| **Why not** | 入力形式・演算子セット・用途がいずれも異なるため、無理な統合はかえって複雑度を上げる |

---

### D2: ポリシー評価をユースケース内で直接呼び出す

**Decision**: `updateInquiryStatus` 内で `evaluatePolicies` を呼び出す。ポリシー合致時は Deal を生成せず、承認リクエストを生成して引合を `new` のまま返す。

**Rationale**:
- フローの分岐がユースケース内で完結するため追跡しやすい
- イベントハンドラからユースケースの振る舞いを制御するパターンは、戻り値でフロー分岐が必要になり設計が複雑になる

#### Alternative 1: InquiryConverted の同期ハンドラで評価

| | |
|---|---|
| **Pros** | `updateInquiryStatus` のロジックが変わらない |
| **Cons** | ハンドラの戻り値でメイントランザクションの結果を変える必要があり、イベントシステムの責務を超える。フロー追跡が困難 |
| **Why not** | イベントハンドラによるフロー制御は設計複雑度が高く、デバッグが難しいため |

---

### D3: 承認後アクションは非同期ハンドラとする

**Decision**: `ApprovalCompleted` の非同期ハンドラで案件生成を行う。承認完了と案件生成は別トランザクションとする。

**Rationale**:
- 承認の完了（リクエストステータスの更新）を案件生成の成否に依存させない
- `approveRequest` のトランザクション内では承認ステータスの更新のみを行い、案件生成は `flushAsync()` 後に非同期で実行する
- 障害発生時に承認結果がロールバックされるリスクを排除できる
- 引合が `new` のまま残るため、案件生成失敗時に手動で再試行できる

#### Alternative 1: 同期ハンドラで承認完了時に即座に案件生成

| | |
|---|---|
| **Pros** | 1 トランザクションで承認と案件生成が完結する |
| **Cons** | 案件生成の失敗が承認トランザクションをロールバックしてしまう。承認完了という事実が消える |
| **Why not** | 承認の完了を案件生成の成否に依存させてはならないため |

---

### D4: skipPolicyCheck フラグで再帰呼び出しの無限ループを防止

**Decision**: `updateInquiryStatus` のオプション引数に `skipPolicyCheck?: boolean` を追加する。`true` の場合はポリシー評価をスキップし、従来通り Deal を直接生成する。Server Action からは渡せない内部引数として扱う。

**Rationale**:
- 承認後ハンドラが `updateInquiryStatus` を再呼び出しする際、ポリシー評価が再度トリガーされると無限ループになる
- フラグで明示的にスキップすることで安全にフローを完結させる
- Server Action からは渡せない設計とすることで、外部から誤ってスキップされるリスクを排除する

#### Alternative 1: 専用の createDealFromApproval ユースケースを作成

| | |
|---|---|
| **Pros** | 責務が明確に分離される |
| **Cons** | Deal 生成ロジック・状態遷移チェック・監査ログ記録が `updateInquiryStatus` と重複する |
| **Why not** | ロジック重複がメンテナンスコストを高めるため |

---

### D5: ConditionOperator に neq と in を追加

**Decision**: `ConditionOperator` 型に `"neq"` と `"in"` を追加する。DB の `condition_operator` カラムは varchar のためスキーマ変更不要。`approvalPolicyRepository` の `CONDITION_OPERATORS` バリデーションセットにも追加する。`in` 演算子では `conditionValue` にカンマ区切りで値リストを格納する（例: `"web,phone,email"`）。

**Rationale**:
- `neq`（不等価）は除外条件、`in`（包含）はソース種別のフィルタリングに必要
- DB カラムが varchar のためマイグレーション不要。アプリケーション層の型定義とバリデーションの追加のみで対応できる
- カンマ区切り格納は実装が単純で、現時点のユースケース（source 種別フィルタ等）では値にカンマを含むケースがないため許容できる

**Trade-off**: `in` 演算子用の `conditionValue` にカンマを含む値はパースできない。将来的に値にカンマが必要なユースケースが生じた場合、JSON 配列への格納形式変更またはセパレータ変更が必要になる。

---

### D6: システム起因リクエストを requestRepository.create で status=pending で直接生成

**Decision**: `updateInquiryStatus` 内で `requestRepository.create`（status: `"pending"`）と `approvalStepRepository.createMany` を直接呼び出す。`createRequest` / `submitRequest` ユースケースは経由しない。テンプレートの `filterStepsByCondition` は適用せず全ステップを含める。

**Rationale**:
- `createRequest` は status を `"draft"` で作成し、`submitRequest` で `"pending"` に遷移する 2 ステップのフロー。システム起因の承認リクエストは人間の介入なく即座に承認フローを開始するため `"pending"` で直接生成する必要がある
- 中間の `draft` 状態が不要で、不要なイベント（`request.created` の draft 段階）の発行も回避できる
- システム起因リクエストは formData を持たないため、formData を評価する `filterStepsByCondition` を適用すると全ステップが除外される可能性がある

#### Alternative 1: createRequest → submitRequest の 2 段階呼び出し

| | |
|---|---|
| **Pros** | 既存のユースケースを再利用できる |
| **Cons** | 中間の draft 状態が不要。不要なイベントが発行される。formData なしで `filterStepsByCondition` を通すと全ステップが除外される可能性がある |
| **Why not** | システム起因リクエストの要件（即時 pending・全ステップ含む）に適合しないため |

---

### D7: UpdateInquiryStatusResult 型を拡張してポリシーゲート結果を伝達

**Decision**: `UpdateInquiryStatusResult` の `ok: true` バリアントに `pendingApproval?: { requestId: string }` を追加する。ポリシー合致時は引合の status を変更せず、`{ ok: true, inquiry: <status=new のまま>, pendingApproval: { requestId } }` を返す。

**Rationale**:
- Server Action が結果を見てユーザーに適切なフィードバック（「承認待ちです」）を表示できる
- 戻り値の discriminant で分岐するだけでよく、Server Action の変更を最小限にできる
- ポリシーゲートは正常動作であり、エラーとして返すことは意味論的に不正確

#### Alternative 1: ok: false として返す

| | |
|---|---|
| **Pros** | 既存のエラーハンドリング分岐に乗れる |
| **Cons** | ポリシーゲートは正常動作。エラーとして扱うと UI 層でも「失敗」として表示されてしまう |
| **Why not** | 意味論的に不正確なため |

---

## Consequences

### Positive

- 引合→案件化フローに承認ゲートが挿入され、金額・ソース等の条件に基づいた自動承認フローが実現できる
- `conditionEvaluator` が pure function としてドメイン層に配置され、7 演算子・エッジケースを網羅したユニットテストで品質保証される
- 承認完了と案件生成が別トランザクションになるため、承認完了という事実が案件生成の失敗によって消えることがない
- `originType=system` の区別により、システム起因リクエストと手動リクエストのフローが明確に分離される

### Negative / Trade-offs

- 承認後の案件生成が非同期のため、承認完了後・案件生成前にサーバー障害が発生した場合に引合が `new` のまま残る。手動で案件化を再試行することで回復できるが、将来的にリトライ機構の導入を検討すること
- 複数ポリシー合致時は最初の 1 件のみを使用（`createdAt` 昇順の先頭）。ユーザーが複数ポリシーを設定した場合に予想外の挙動となる可能性がある。R08（設定画面）で優先度の明示を検討すること
- `in` 演算子の `conditionValue` はカンマ区切り文字列格納のため、値にカンマを含む場合は対応不可

### Constraints for future changes

- **新たなトリガーアクションの追加**: `contract.create` 等を承認ゲートに対応させる場合、`updateInquiryStatus` と同様のパターン（ポリシー評価 → 承認リクエスト生成 → `skipPolicyCheck` 付きの再呼び出し）を踏襲すること
- **domain/services への追加**: リポジトリアクセスを含む関数は `domain/services` に配置しないこと（ADR-014 D5、ADR-001 参照）。`conditionEvaluator` は pure function のままを維持すること
- **skipPolicyCheck の用途限定**: `skipPolicyCheck: true` は承認後アクションハンドラからの内部呼び出し専用。Server Action または外部 API からは渡せない設計を維持すること。将来のユースケース追加時も同様に内部フラグとして扱うこと
- **system origin リクエストの生成**: `originType=system` の承認リクエストは `requestRepository.create` で status=`"pending"` で直接生成すること。`createRequest` → `submitRequest` の 2 段階フローは経由しないこと
- **ApprovalCompleted のハンドラ追加**: 新しいトリガーアクションに対応するハンドラを `approvalCompletedHandler.ts` に追加する場合、`originTriggerEntityId === null` のガードと `skipPolicyCheck: true` の付与を必ず実装すること

---

## References

- `specrunner/changes/approval-policy-logic/design.md` — 詳細設計（D1〜D7）
- `specrunner/changes/approval-policy-logic/request.md` — 要件定義
- `src/domain/services/conditionEvaluator.ts` — 条件評価 pure function
- `src/application/usecases/evaluatePolicies.ts` — ポリシー評価ユースケース
- `src/application/usecases/updateInquiryStatus.ts` — 承認ゲート挿入・skipPolicyCheck 実装
- `src/application/usecases/approveRequest.ts` — ApprovalCompleted イベント発行
- `src/infrastructure/handlers/approvalCompletedHandler.ts` — 承認後アクションハンドラ
- `src/domain/events/types.ts` — ApprovalCompleted イベント型定義
- `ADR-001-foundation-db-auth-domain.md` — domain layer はリポジトリを呼び出さない原則
- `ADR-002-multi-stage-approval-workflow.md` — 多段階承認ワークフローの基盤
- `ADR-014-domain-model-alignment.md` — D5: DB 参照検証の application/services 配置
