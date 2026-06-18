# Design: Approval Delegation

## Context

承認者が休暇中・不在時に代理承認する仕組みが存在しない。`canApprove` は `step.approverRole === actorRole` の単純比較で、委譲の概念がない。

現在の承認フロー:
- `approveRequest` usecase が `canApprove(currentStep, data.actorRole)` でロール一致を判定
- `rejectRequest` usecase にはロールチェックがなく action 層で `role === "member"` のみ排除
- domain service は repository を呼ばない純粋関数の原則

新規テーブル `approval_delegations` を追加し、委譲関係を管理する。`canApprove` を拡張して委譲経由の承認を許可する。

## Goals / Non-Goals

**Goals**:
- `approval_delegations` テーブルで委譲関係（誰が誰に、いつからいつまで）を永続化する
- `canApprove` を拡張し、委譲元のロールで代理承認を可能にする
- TOCTOU 防止のため、usecase 内トランザクションで委譲データを取得する
- 代理承認時の監査ログに `delegatedFrom` を記録する
- バリデーション: 自己委譲禁止、クロスオーグ禁止、期間重複禁止
- admin ユーザー向けの委譲管理 UI (`/settings/delegations`)

**Non-Goals**:
- 代理承認の承認チェーン（代理の代理）
- 委譲の自動期限切れ処理（endDate を過ぎたら `isActive = false` にするバッチ）
- 委譲通知（メール・Webhook 等）

## Decisions

### D1: 専用テーブルで委譲関係を管理する

**採用**: `approval_delegations` テーブルに委譲関係を保持し、`canApprove` で参照する。

**却下**: ロールの一時付与方式 — ロールを一時変更すると期間終了時のロールバック処理が必要になり、障害時にロールが戻らないリスクがある。

**根拠**: 委譲関係を独立したデータとして管理することで、ロールマスタに副作用を与えない。`isActive` + 期間で有効性を判定でき、ロールバック処理が不要。

### D2: トランザクション内で委譲データを取得する

**採用**: `approveRequest` / `rejectRequest` の TX 内で `findActiveByToUserId` を呼び出し、最新の委譲データで `canApprove` を判定する。

**却下**: pre-TX スナップショット方式 — 承認操作中に委譲が無効化された場合、取り消し済みの委譲で承認が通る可能性がある。

**根拠**: 既存の `approvalStepRepository.findByRequestId` が TX 内で呼ばれるパターンと同一。TOCTOU を防止し、一貫性を保証する。

### D3: `canApprove` に `delegations` 引数を追加する

**採用**: `canApprove(step, actorRole, delegations?)` の形で optional 引数を追加。委譲データの取得責任は usecase が持つ。

**却下**: `canApprove` 内で repository を呼び出す方式 — domain service が infrastructure に依存してしまい、レイヤー原則に反する。

**根拠**: domain service を純粋関数として維持する既存原則を遵守。`delegations` を渡さない場合は従来通りロール一致のみで判定するため、後方互換性を保つ。

### D4: 委譲管理は admin ロール限定

**採用**: 委譲の作成・無効化は admin ロールのユーザーに限定する。

**根拠**: 委譲は承認権限の移譲であり、組織管理者が管理すべき。一般ユーザーが自由に委譲を設定できると、承認フローの信頼性が損なわれる。

### D5: 複合インデックスで検索性能を確保

**採用**: `(to_user_id, organization_id, is_active)` の複合インデックスを追加する。

**根拠**: `findActiveByToUserId` は承認操作のたびに呼ばれるホットパス。TX 内で実行されるため、インデックスによりロック競合時間を最小化する。

### D6: 代理承認時の監査ログ記録方式

**採用**: 既存の `auditLogRepository.create` の `metadata` フィールドに `{ delegatedFrom: userId }` を追加する。

**却下**: 専用の audit action を新設する方式 — 承認操作自体は同じであり、action を分けると集計・フィルタリングが複雑化する。

**根拠**: `metadata` は `jsonb` 型で柔軟。通常承認と代理承認を統一した `approval_step.approve` action のまま、代理承認時のみ追加情報を記録できる。

## Risks / Trade-offs

**[Risk]** `canApprove` の引数変更による既存テストへの影響 → **Mitigation**: optional 引数にすることで既存の呼び出しは変更不要。既存テストはそのまま通る。

**[Risk]** 代理承認で承認チェーン（代理の代理）が発生しうる → **Mitigation**: スコープ外として明示。`findActiveByToUserId` は `toUserId` で直接検索するため、チェーンは構造的に発生しない。

**[Risk]** `rejectRequest` usecase にはロールベースの `canApprove` チェックがない → **Mitigation**: `rejectRequest` でも委譲データを取得し、代理権限の検証を追加する。action 層の `role === "member"` チェックだけでなく、usecase 層で承認権限を確認する。

**[Trade-off]** `isActive` フラグと期間の二重管理 — `endDate < now` でも `isActive = true` のレコードが残る。自動期限切れ処理はスコープ外のため、クエリ時に `endDate >= now` を併用して判定する。

## Open Questions

なし（architect 評価済みの設計判断により解消済み）。
