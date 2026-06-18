# ADR-007: 承認権限委譲（代理承認）の設計判断

- **Status**: accepted
- **Date**: 2026-06-18
- **Change**: approval-delegation
- **Deciders**: architect

---

## Context

Clearflow の承認フローは ADR-002 〜 ADR-006 で多段階承認・差し戻し・期限切れ自動遷移を実装したが、承認者本人が不在・休暇中の場合に代わりに承認する手段がなかった。

本変更以前の問題点:

- `canApprove` は `step.approverRole === actorRole` の単純比較のみ（ADR-002 D7）
- 承認者ロールを持つユーザーが不在の場合、申請が `pending` 状態に滞留する（ADR-006 で期限切れとして `expired` 遷移するようになったが、根本的な不在対応はない）
- ロールを一時的に別ユーザーへ付与する手段もなく、組織の緊急対応が困難

本変更では「承認権限の委譲（delegation）」を導入し、特定ユーザーが一定期間、特定のロールを持つユーザーの承認権限を代行できる仕組みを構築する。

---

## Decisions

### D1: 専用テーブルで委譲関係を管理する

**Decision**: `approval_delegations` テーブルを新設し、委譲関係（誰から誰へ、いつからいつまで）を永続化する。`canApprove` は `delegations: ApprovalDelegation[]` を受け取り、委譲元のロールが `step.approverRole` と一致する場合に承認を許可する。

**Rationale**: 委譲関係を独立したデータとして管理することで、ロールマスタに副作用を与えない。`isActive` + 期間フィルタリングで有効性を判定でき、委譲終了時のロールバック処理が不要。

#### Alternative 1: ロールの一時付与方式（users テーブルのロールを一時変更）

| | |
|---|---|
| **Pros** | `canApprove` の変更が不要。既存の承認ロジックがそのまま動作する |
| **Cons** | 期間終了時に元のロールに戻すロールバック処理が必要。障害時にロールが元に戻らないリスクがある。ロール変更が他の権限チェック（管理画面アクセス等）にも波及する副作用がある |
| **Why not** | ロールバック処理の複雑さと障害時のリスクが、実装コストを正当化しないため |

---

### D2: トランザクション内で委譲データを取得する（TOCTOU 防止）

**Decision**: `approveRequest` usecase のトランザクション内で `approvalDelegationRepository.findActiveByToUserId` を呼び出し、最新の委譲データで `canApprove` を判定する。加えて、TX 開始前にも pre-check を実行し早期フィードバックを提供する（ADR-006 D3 のパターンと統一）。

**Rationale**: 承認操作中に委譲が無効化された場合、TX 内で最新データを参照することで委譲無効化を確実に反映できる。既存の `approvalStepRepository.findByRequestId` が TX 内で呼ばれるパターンと一貫性を保つ。

#### Alternative 1: pre-TX スナップショット方式（TX 開始前に委譲データを取得）

| | |
|---|---|
| **Pros** | 実装がシンプル。委譲取得と承認操作が分離されて読みやすい |
| **Cons** | 承認操作中に委譲が無効化された場合、取り消し済みの委譲で承認が通る可能性がある |
| **Why not** | 承認権限の一貫性を保証するため、TX 内での最新データ参照を優先する |

---

### D3: `canApprove` に `delegations` 引数を追加する純粋関数方式

**Decision**: `canApproveWithDelegation(step, actorRole, delegations)` を `approvalStepService.ts` に追加する。委譲データの取得責任は usecase が持ち、domain service は引数として受け取ったデータのみを参照する。既存の `canApprove(step, actorRole)` は後方互換性のために維持する。

**Rationale**: domain service が infrastructure（repository）に依存しない原則（ADR-001 D8 継承、ADR-002 D8）を遵守する。domain service を純粋関数として維持することで、ユニットテストが DB 非依存で記述できる。委譲データを渡さない従来の呼び出しは変更不要。

#### Alternative 1: `canApprove` 内で repository を呼び出す方式

| | |
|---|---|
| **Pros** | usecase 側の実装が簡潔になる |
| **Cons** | domain service が infrastructure を import することになり、レイヤー原則に反する。テストに DB モックが必要になり、テスト記述コストが増加する |
| **Why not** | domain 層は infrastructure を import しない原則（ADR-001 D8）を破壊するため |

---

### D4: 委譲管理は admin ロール限定

**Decision**: 委譲の作成・無効化（`createDelegationAction`, `deactivateDelegationAction`）は admin ロールのユーザーのみが実行可能とする。管理 UI は `/settings/delegations` に配置する。

**Rationale**: 委譲は承認権限の移譲であり、承認フローの信頼性に直接影響する。一般ユーザーが自由に委譲を設定できると、承認フローの改ざんリスクが高まる。組織管理者（admin）が一元管理することで、委譲の可視性と統制を確保できる。

代替案なし（要件で明示されている）。

---

### D5: 複合インデックス `(to_user_id, organization_id, is_active)` による検索性能確保

**Decision**: `approval_delegations` テーブルに `(to_user_id, organization_id, is_active)` の複合インデックスを追加する。

**Rationale**: `findActiveByToUserId` は承認操作のたびに呼ばれるホットパス。TX 内で実行されるため、インデックスによりロック競合時間を最小化できる。先頭カラムを `to_user_id` とすることで、代理承認者のアクティブ委譲を最も効率よく取得できる。

代替案なし（パフォーマンス要件から導出）。

---

### D6: 代理承認時の監査ログは `metadata.delegatedFrom` で記録する

**Decision**: 代理承認で操作した場合、既存の `auditLogRepository.create` の `metadata` フィールドに `{ delegatedFrom: userId }` を追加する。通常承認では `metadata` に `delegatedFrom` を含めない。複数委譲がマッチする場合は `startDate` が最も新しい委譲を採用し、その委譲元 userId を記録する。

**Rationale**: `metadata` は jsonb 型で拡張が容易。通常承認と代理承認を統一した `approval_step.approve` action で管理し、フィルタリング・集計の複雑化を避ける。`startDate` 最新採用ルールにより、監査ログに記録する委譲が1件に確定する。

#### Alternative 1: 代理承認専用の audit action を新設する方式

| | |
|---|---|
| **Pros** | action 値でフィルタリングが容易になる |
| **Cons** | 承認操作自体は同じであり、action を分けると「承認操作の一覧」を取得する集計クエリが複雑化する。既存の監査ログビューアへの影響も大きい |
| **Why not** | 既存の action 体系を維持し、追加情報を metadata で表現する方が影響範囲が小さいため |

---

## Consequences

### Positive

- 承認者不在時でも、委譲設定によりフローが滞留しない（ADR-006 の Known Design Debt 解消）
- ロールマスタに副作用を与えずに委譲関係を管理できる
- domain service の純粋関数原則（ADR-002 D8）を維持し、委譲ロジックのユニットテストが容易
- TX 内での委譲データ取得により TOCTOU を防止できる
- 代理承認の audit trail が `delegatedFrom` で追跡可能
- admin 限定の委譲管理により、承認フローの完全性が組織管理者に統制される

### Negative / Trade-offs

- `isActive` フラグと `endDate` の二重管理 — `endDate < now` でも `isActive = true` のレコードが残る。`findActiveByToUserId` では `is_active = true AND end_date >= now` を併用して判定するが、データの意味と状態が乖離する
- `approveRequest` usecase が TX 内で `approvalDelegationRepository.findActiveByToUserId` を追加で呼び出すため、承認操作の処理が若干増加する
- `rejectRequest` usecase には委譲チェックを追加しない（スコープ外）。却下時のロールチェックは action 層の `role === "member"` 排除のみが維持される。将来、代理却下が必要になった場合は別途対応が必要

### Constraints for future changes

- **`canApproveWithDelegation` 呼び出し時**: `delegations` 引数は呼び出し元（usecase）が `findActiveByToUserId` で事前フィルタ済みのデータを渡す責任を持つ。domain service 内では `isActive` の再チェックを行わない
- **委譲チェーン（代理の代理）追加時**: 現行の `findActiveByToUserId` は `toUserId` で直接検索するため、チェーンは構造的に発生しない。チェーンを許容する場合は `canApproveWithDelegation` のロジックと repository クエリを合わせて変更すること
- **`rejectRequest` への委譲チェック追加時**: `approveRequest` の TOCTOU 防止パターン（pre-check + TX 内 re-check）を踏襲し、TX 内で `findActiveByToUserId` を呼び出すこと
- **委譲の自動期限切れ処理追加時**: `endDate` 超過で `isActive = false` に更新するバッチを追加する場合、`findActiveByToUserId` の `end_date >= now` 条件との重複（二重フィルタ）を整理すること
- **`startDate` 最新採用ルールの変更時**: 監査ログに記録する委譲の特定ロジックと `canApproveWithDelegation` の採用ロジックを同期して変更すること

### Known Design Debt

- `rejectRequest` への代理承認チェック追加が未実装（スコープ外）
- 委譲の自動期限切れ処理（`endDate` 超過時に `isActive = false` に更新するバッチ）が未実装（スコープ外）
- 委譲設定・無効化の通知（メール・Slack 等）が未実装（スコープ外）
- 委譲管理 UI のユーザー選択が `<select>` に改善済み（review-feedback-001 finding #2 対応後）

---

## References

- `specrunner/changes/approval-delegation/design.md` — 詳細設計（D1〜D6）
- `specrunner/changes/approval-delegation/spec.md` — ビヘイビア仕様
- `specrunner/changes/approval-delegation/request.md` — 要件定義
- `specrunner/adr/ADR-002-multi-stage-approval-workflow.md` — D7（ロールベース承認者判定）・D8（domain service 純粋関数）を継承
- `specrunner/adr/ADR-006-approval-deadline-expired-state.md` — Known Design Debt 「代理承認が未実装」の解消
- `src/infrastructure/schema.ts` — `approval_delegations` テーブル・複合インデックス追加
- `src/domain/models/approvalDelegation.ts` — `ApprovalDelegation` ドメインモデル
- `src/domain/services/approvalStepService.ts` — `canApproveWithDelegation` 追加
- `src/infrastructure/repositories/approvalDelegationRepository.ts` — `findActiveByToUserId` / `findByOrganization` / `findOverlapping` / `create` / `update`
- `src/application/usecases/approveRequest.ts` — TX 内委譲取得・TOCTOU 防止
- `src/application/usecases/createDelegation.ts` — バリデーション（自己委譲禁止・クロスオーグ禁止・期間重複禁止）・監査ログ記録
- `src/application/usecases/deactivateDelegation.ts` — isActive=false 更新・監査ログ記録
- `src/app/(dashboard)/settings/delegations/page.tsx` — 委譲管理 UI（admin 限定）
- `src/app/actions/delegations.ts` — Server Actions（createDelegationAction / deactivateDelegationAction / listDelegationsAction）
- `drizzle/0004_far_young_avengers.sql` — DB マイグレーション
