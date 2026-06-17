# ADR-002: 複数段階承認・差し戻し・再申請ワークフローの設計判断

- **Status**: accepted
- **Date**: 2026-06-17
- **Change**: multi-stage-approval
- **Deciders**: architect

---

## Context

Clearflow の承認フローは ADR-001 時点で「単一承認者による一段階承認」のみをサポートしていた。具体的には:

- `RequestStatus` は `"draft" | "pending" | "approved" | "rejected"` の 4 状態
- 状態遷移は `draft → pending`, `pending → approved | rejected` のみ
- `requests` テーブルに承認段階の情報はなく、承認者は `audit_logs` のみに記録
- `approveRequest` は直接 `approved` に遷移、ステップの概念なし

実際の業務（例: 経費申請の「上長承認 → 経理承認」）では複数段階の承認と、差し戻し後に申請者が修正して再提出できるフローが必要である。本変更でこれらの核心機能を導入した。

---

## Decisions

### D1: 承認ステップを独立テーブル `approval_steps` で管理

**Decision**: `approval_steps` テーブルを新設する。カラム: `id` (uuid PK), `requestId` (uuid FK → requests), `stepOrder` (integer), `approverRole` (text), `status` (approvalStepStatusEnum), `approvedBy` (uuid FK → users, nullable), `approvedAt` (timestamp, nullable), `comment` (text, nullable), `organizationId` (uuid FK)。`approvalStepStatusEnum = pgEnum("approval_step_status", ["pending", "approved", "rejected"])` を新設する。

**Rationale**: ステップごとの承認者・コメント・タイムスタンプが記録でき、監査証跡の粒度が細かい。将来の拡張（承認者名表示、ステップ別通知等）にも対応可能な正規化設計。

#### Alternative 1: requests テーブルへのカラム追加 (`currentStep`, `totalSteps`)

| | |
|---|---|
| **Pros** | テーブル追加不要でシンプル |
| **Cons** | ステップごとの承認者・コメント・タイムスタンプが記録できない。承認履歴の監査証跡が失われる |
| **Why not** | 監査要件とステップ詳細の記録が実現できないため |

#### Alternative 2: requests テーブルの JSON カラムに承認ステップを保持

| | |
|---|---|
| **Pros** | スキーマ変更が最小 |
| **Cons** | DB レベルの整合性制約（FK, enum）が使えない。クエリが複雑化し型安全性も低下する |
| **Why not** | テナント分離（organizationId FK）や承認者 FK 等の DB 制約が適用できないため |

---

### D2: 承認テンプレートの `steps` を jsonb カラムで管理

**Decision**: `approval_templates` テーブルを新設する。カラム: `id` (uuid PK), `name` (text), `organizationId` (uuid FK), `steps` (jsonb — `[{ stepOrder: number, approverRole: string }]`), `createdAt` (timestamp)。テンプレートの steps 定義は jsonb で保持する。

**Rationale**: テンプレートのステップ定義は読み取り専用の構成データ。申請作成時にスナップショットとして `approval_steps` へ展開するため、結合クエリの必要がない。初期実装でテンプレートステップを個別テーブルで正規化する複雑さに見合うメリットがない。

#### Alternative 1: テンプレートステップ用の別テーブル (`approval_template_steps`)

| | |
|---|---|
| **Pros** | DB レベルの整合性制約が適用可能、型安全 |
| **Cons** | テンプレート取得に結合クエリが必要になる。テンプレートの読み取り専用用途に対して過剰な正規化 |
| **Why not** | テンプレートは読み取り専用の定義データであり、jsonb で十分に表現できるため |

---

### D3: 状態遷移モデルへの `revision` 状態追加

**Decision**: `RequestStatus` を `"draft" | "pending" | "approved" | "rejected" | "revision"` の 5 状態に拡張する。遷移ルール:

```
draft    → pending
pending  → approved | rejected | revision
revision → pending
```

`approved` と `rejected` は終端状態。`requestStatusEnum` への `"revision"` 追加は Drizzle Kit の `drizzle-kit generate` でマイグレーション SQL を生成する（PostgreSQL では enum への値追加はトランザクション外で実行される制約あり）。

**Rationale**: 差し戻し中（申請者が修正中）であることを明確に表現できる状態が必要。`rejected` は最終却下として確定させ、差し戻し（一時的な修正依頼）と意味を分離することでワークフローが明確になる。

#### Alternative 1: `rejected` 状態からの再申請を許可

| | |
|---|---|
| **Pros** | 状態数が増えない |
| **Cons** | `rejected` の意味が「最終却下」なのか「差し戻し」なのか曖昧になる。終端状態の意味が失われる |
| **Why not** | `rejected` は「最終却下（申請者が修正不可）」として意味を確定させるため |

#### Alternative 2: `pending` のまま差し戻しコメントのみ記録

| | |
|---|---|
| **Pros** | 状態数が増えない |
| **Cons** | 申請者が修正中であることを状態として表現できない。UI でのフィルタリングや通知のトリガーが困難 |
| **Why not** | 「修正待ち」状態を明示的に表現することでワークフローの可視性を確保するため |

---

### D4: 承認ロジック — ステップ順次進行と全ステップ完了判定

**Decision**: `approveRequest` usecase を拡張する。「現在アクティブなステップ」を `status === "pending"` かつ `stepOrder` 最小のステップと定義し、このステップのみ承認可能とする。全ステップ承認済みになったとき初めて申請を `approved` に遷移する。承認ステップが 0 件の申請は従来通り直接 `approved` に遷移（後方互換性）。全操作を `db.transaction()` 内で実行する。

**Rationale**: 承認順序を `stepOrder` の昇順で強制することで、フロー設計者の意図（上長 → 経理 等）が保証される。

#### Alternative 1: 並列承認（全ステップを同時に承認可能にする）

| | |
|---|---|
| **Pros** | 承認者全員が同時に承認できるため、承認完了までの時間が短縮される |
| **Cons** | 承認順序に依存するフロー（前の承認者の判断を見てから承認したい等）が実現できない。実装が複雑化し、全ステップ承認済み判定のトランザクション管理が難しくなる |
| **Why not** | 初期実装では上長 → 経理のような順序付きフローが主要ユースケースであり、並列承認はスコープ外。将来 `approvalStepService.ts` の `getCurrentStep` を拡張することで対応可能 |

#### Alternative 2: ステップのスキップを許可する

| | |
|---|---|
| **Pros** | 特定の条件下で中間ステップを省略でき、柔軟な承認フローが実現できる |
| **Cons** | スキップ条件の定義・管理が複雑になる。監査証跡に空白が生まれ、承認フローの透明性が低下する |
| **Why not** | 初期実装では全ステップの逐次処理で十分。スキップ要件は金額による承認経路分岐（次 request）と同時に検討する |

**Constraint for future changes**: 承認ステップのスキップや並列承認（将来要件）は本設計の変更ではなく、`approvalStepService.ts` のステップ選択ロジックを拡張することで対応する。

---

### D5: 差し戻しと最終却下の分離 — `targetStatus` 引数による分岐

**Decision**: 既存の `rejectRequest` usecase に `targetStatus: "rejected" | "revision"` と `comment?: string` 引数を追加する。`targetStatus === "rejected"` は従来通り終端状態への最終却下。`targetStatus === "revision"` は申請を `revision` に遷移し、アクティブステップに `comment` を記録する差し戻し操作。`targetStatus` のデフォルト値を `"rejected"` とし、既存の呼び出し元は変更不要。

**Rationale**: 差し戻しと最終却下は共通処理（存在確認・遷移検証・トランザクション・監査ログ）が多く、共通処理の重複を避けるため 1 つの usecase で引数分岐する設計を採用した。

#### Alternative 1: 差し戻し専用 usecase `reviseRequest` を新設

| | |
|---|---|
| **Pros** | usecase の責務が明確、引数が簡潔 |
| **Cons** | 共通処理（存在確認・遷移検証・トランザクション・監査ログ）が `rejectRequest` と重複する |
| **Why not** | コードの重複を避けるため引数分岐を採用。Server Action 側で `targetStatus` を明示することで呼び出し意図は十分に表現できる |

#### Alternative 2: `comment` の有無で自動判別

| | |
|---|---|
| **Pros** | 引数が少ない |
| **Cons** | コメントなしの差し戻しができなくなる。暗黙の判別ロジックは可読性が低い |
| **Why not** | 操作の種類は明示的な引数で指定すべき |

---

### D6: 再申請時の部分リセット（差し戻しステップ以降のみ）

**Decision**: `resubmitRequest` usecase を新設する。差し戻されたステップ（`status === "rejected"` のステップ）以降（`stepOrder` がそのステップ以上）の `approval_steps` のみを `pending` にリセットし、それ以前に完了したステップは維持する。

**Rationale**: 差し戻しステップ以前の承認者に再承認の負担をかけない。実務では既に承認した内容を覆す必要がないケースが多く、ユーザー体験と承認フローの効率性を優先する。

#### Alternative 1: 全ステップリセット

| | |
|---|---|
| **Pros** | 実装がシンプル |
| **Cons** | 差し戻し前に承認済みのステップの承認者に再承認の負担をかける。承認フローの効率が著しく低下する |
| **Why not** | 不必要な再承認コストをユーザーに課すため |

---

### D7: 承認者判定 — approverRole ベースのロールマッチング

**Decision**: 承認ステップの `approverRole` と実行ユーザーの `role` が一致するユーザーのみ承認・差し戻し操作を実行可能とする。`approverRole` は text 型（`roleEnum` ではない）とし、将来のロール拡張（`manager`, `finance` 等）に対応可能にする。初期実装では `admin` ロールのみが承認可能。

**Rationale**: 特定ユーザーへの指名方式は組織変更時のメンテナンスコストが高い。ロールベースにすることで組織の人事変更が承認フロー定義に影響しない。

#### Alternative 1: 承認者を特定ユーザー（userId）で指名

| | |
|---|---|
| **Pros** | 承認者が明確 |
| **Cons** | 組織変更（担当者の異動・退職）の都度テンプレート更新が必要。代理承認との組み合わせも複雑化する |
| **Why not** | 組織変更時のメンテナンスコストが高く、スケールしないため |

---

### D8: ドメインサービスとして承認ステップロジックを純粋関数で分離

**Decision**: `src/domain/services/approvalStepService.ts` を新設し、以下の純粋関数を配置する:
- `getCurrentStep(steps)` — アクティブステップの取得
- `isAllApproved(steps)` — 全ステップ完了判定
- `getStepsToReset(steps, rejectedStepOrder)` — リセット対象ステップの取得
- `canApprove(step, actorRole)` — 承認権限の判定

これらは ORM・DB 非依存の純粋関数であり、ADR-001 の「domain 層は infrastructure を import しない」制約に従う。

**Rationale**: ステップ進行ロジックをドメインサービスに集約することで、usecase 層の実装が薄くなり、ビジネスルールのテストが容易になる。

---

## Consequences

### Positive

- 複数段階承認が実現し、実業務の承認フロー（上長 → 経理等）に対応できる
- 差し戻し（`revision`）と最終却下（`rejected`）の意味が明確に分離された
- 部分リセットにより、差し戻し前の承認者の再承認負担を排除できる
- 承認ステップの独立テーブルにより、ステップごとの監査証跡が詳細に記録される
- ロールベース承認者判定により、組織変更に対して承認フロー定義が堅牢になる
- 承認ステップ 0 件の後方互換性維持により、既存の申請・テストに影響しない

### Negative / Trade-offs

- `requestStatusEnum` への `"revision"` 追加は PostgreSQL の制約上トランザクション外で実行される（Drizzle Kit が対応）
- `rejectRequest` usecase が `targetStatus` 引数で 2 つの異なる操作（却下・差し戻し）を担うため、usecase の名称と責務がやや乖離する
- `approverRole` が text 型のため、存在しないロール名を設定してもコンパイル時には検出されない（シードデータの `admin` 固定で初期実装は問題なし）
- 承認者名の表示には `approvedBy` (UUID) から name への結合が必要（初期実装では UUID のみ表示、次 request で対応）

### Constraints for future changes

- 新規 `approvalStepRepository` メソッドはすべて `organizationId` 引数を受け取り WHERE 条件に付与すること（ADR-001 D8 の制約を継承）
- 承認順序ロジック（並列承認、スキップ等）の変更は `approvalStepService.ts` の `getCurrentStep` を起点とする
- `revision` 状態を前提とした UI・usecase 追加時は `requestTransition.ts` の遷移マップを参照すること
- 金額による承認経路の自動分岐（将来 request）は `approvalTemplateRepository` のテンプレート選択ロジックで対応し、`approval_steps` の構造変更は不要なように設計すること
- `roleEnum` を拡張する場合、`approval_steps.approverRole` の既存レコードとの整合性確認が必要

---

## References

- `specrunner/changes/multi-stage-approval/design.md` — 詳細設計（D1〜D13）
- `specrunner/changes/multi-stage-approval/spec.md` — ビヘイビア仕様
- `specrunner/changes/multi-stage-approval/request.md` — 要件定義
- `src/infrastructure/schema.ts` — Drizzle スキーマ（approval_steps, approval_templates）
- `src/domain/services/approvalStepService.ts` — 承認ステップドメインロジック
- `src/domain/services/requestTransition.ts` — 拡張された状態遷移ルール
- `src/application/usecases/approveRequest.ts` — 多段階承認ロジック
- `src/application/usecases/resubmitRequest.ts` — 再申請・部分リセットロジック
