# ADR-006: 承認フローへの時間制約と expired 終端状態の導入

- **Status**: accepted
- **Date**: 2026-06-18
- **Change**: approval-deadline
- **Deciders**: architect

---

## Context

Clearflow の承認ワークフローは従来、人間の操作（承認・却下・差し戻し）のみで状態が変化する純粋なイベント駆動型であった。承認者が不在または無応答の場合、申請が `pending` 状態に無期限に滞留するという問題があった。

本変更以前の問題点:

- `RequestStatus` は `draft | pending | approved | rejected | revision` の5状態で、`pending` からの脱出には人間の操作が必須
- `approval_steps` テーブルに時間制約のカラムが存在しない
- 承認テンプレート (`approval_templates.steps` jsonb) にステップ単位の期限設定がない
- `audit_logs.actorId` は `users.id` への NOT NULL FK であり、システム起因の操作を記録するには実在するユーザー行が必要

本変更では承認フローに時間制約を導入し、期限切れ申請を自動で `expired` 状態に遷移させる仕組みを構築する。これにより承認ワークフローは「人間の操作」と「時間経過による自動遷移」の両方で状態が変化するハイブリッド型に移行する。

---

## Decisions

### D1: `expired` を `RequestStatus` の終端状態として追加

**Decision**: `RequestStatus` に `"expired"` を追加し、`pending → expired` の遷移を許可する。`expired` からの遷移は不可（終端状態）。期限切れ申請への承認・却下操作は `validateTransition` の既存メカニズムで一律拒否する。

**Rationale**: 終端状態にすることで、期限切れ申請への操作を状態遷移ルールで一律拒否できる。usecase ごとに期限切れフラグを個別チェックする必要がなく、漏れが生じにくい。

#### Alternative 1: `pending` のまま `isExpired` フラグを付与

| | |
|---|---|
| **Pros** | スキーマ変更が `RequestStatus` の型定義のみで済む |
| **Cons** | 各 usecase（`approveRequest`、`rejectRequest` 等）でフラグチェックが必要になり、チェック漏れのリスクがある。状態遷移図が「ステータス × フラグ」の組み合わせで複雑化する |
| **Why not** | 漏れのリスクと複雑性のコストが、状態遷移ルールで一律拒否する簡潔さを正当化しないため |

---

### D2: `deadline` を `approval_steps` テーブルのカラムとして管理

**Decision**: `approval_steps` に `deadline timestamp` (nullable) カラムを追加する。承認テンプレートの `deadlineHours` は申請作成時の算出元として使い、具体的な datetime をステップテーブルに保持する。申請作成時に `createdAt + deadlineHours` で deadline を算出して挿入する。

**Rationale**: バッチ処理で `WHERE deadline < NOW() AND status = 'pending'` のような単純なクエリで期限切れステップを取得できる。計算が不要でインデックスが有効に機能する。`deadline` が null の場合は期限なし（従来動作）として扱い、既存データとの互換性を維持する。

#### Alternative 1: `deadlineHours` のみをステップテーブルに保持し毎回計算

| | |
|---|---|
| **Pros** | スキーマがシンプルで、期限変更時に再計算できる |
| **Cons** | バッチ処理のクエリで `approval_steps.createdAt + deadlineHours * interval '1 hour'` のような計算が必要になり、インデックスが効かない。クエリが複雑化する |
| **Why not** | クエリの複雑化とパフォーマンス低下のコストが、スキーマの単純さを上回るため |

---

### D3: deadline チェックを `approveRequest` / `rejectRequest` に組み込む（TOCTOU 防止付き）

**Decision**: 各 usecase でトランザクション開始前（pre-check）とトランザクション内（re-check）の二段階で現在のステップの `deadline` を確認する。deadline 超過時は `{ ok: false, reason: "この承認ステップの期限が切れています" }` を返す。

**Rationale**: ユーザー操作に即時フィードバックを返せる。cron による `expireOverdueRequests` の実行を待たずに期限切れを検知し、cron 実行間隔のギャップ（期限切れから次回 cron 実行まで）の影響を最小化する。既存の pre-check / TX 内 re-check パターンとの一貫性も確保できる。

代替案なし（要件で明示されている）。

---

### D4: cron エンドポイントを Route Handler + Bearer トークン + `crypto.timingSafeEqual` で実装

**Decision**: `/api/cron/expire-requests` POST Route Handler を追加する。認証は `Authorization: Bearer <CRON_SECRET>` ヘッダーで行う。トークン比較に `crypto.timingSafeEqual` を使用してタイミング攻撃を防止する。トークン長不一致時は `timingSafeEqual` の前に長さチェックで 401 を返す（`RangeError` 回避）。

**Rationale**: 外部 cron サービス（Vercel Cron、Railway Cron 等）からの定期呼び出しに対応できる。`timingSafeEqual` でサイドチャネル攻撃（タイミング攻撃）を防止する。サーバレス環境では内部 cron ライブラリが動作しないため、HTTP エンドポイントが唯一の現実的な選択肢となる。

#### Alternative 1: 内部 cron ライブラリ（node-cron 等）

| | |
|---|---|
| **Pros** | HTTP エンドポイントを公開する必要がない |
| **Cons** | サーバレス環境（Vercel 等）ではプロセスが常駐しないため動作しない |
| **Why not** | デプロイ環境の制約により技術的に実現できないため |

---

### D5: system user をシードで作成し、cron 操作の `actorId` に使用

**Decision**: シードスクリプトで固定 UUID の system user を作成する（name: "System"、email: "system@clearflow.internal"、デフォルト組織所属）。環境変数 `SYSTEM_USER_ID` にその UUID を設定し、`expireOverdueRequests` usecase が `audit_logs.actorId` として使用する。`SYSTEM_USER_ID` 未設定時は処理を中断してエラーを返す。

**Rationale**: `audit_logs.actorId` が `users.id` への NOT NULL FK である不変条件を維持する。システム起因の操作も監査ログとして追跡可能になり、audit trail の完全性が保たれる。

#### Alternative 1: `audit_logs.actorId` を nullable にする

| | |
|---|---|
| **Pros** | system user のシード管理が不要になる |
| **Cons** | 既存の監査ログ不変条件を破壊する。全クエリに null チェックが必要になる。監査ログとしての追跡可能性が低下する |
| **Why not** | 既存の NOT NULL FK 不変条件と audit trail の完全性を破壊するため |

---

### D6: `expireOverdueRequests` のトランザクション戦略は 1 申請 = 1 トランザクション

**Decision**: 期限切れ対象の各申請を個別のトランザクションで処理する。失敗した申請はスキップし、成功・失敗の件数を結果として返す。

**Rationale**: 1 申請の失敗（楽観的ロック競合等）が他の申請の期限切れ処理をブロックしない。各申請は独立しており、部分的な処理完了で問題ない。次回 cron 実行時に未処理分が再試行される。

#### Alternative 1: 全申請を 1 トランザクションで処理

| | |
|---|---|
| **Pros** | 全件の原子性が保証される |
| **Cons** | 1 件の失敗で全件がロールバックされ、次回 cron まで残りの申請が `pending` に滞留する。長時間トランザクションによるロック競合リスクが増加する |
| **Why not** | 独立した申請間で障害が伝播することが、原子性のメリットを上回るコストになるため |

---

## Consequences

### Positive

- `expired` 終端状態により、期限切れ申請への操作を状態遷移ルールで一律拒否できる（usecase ごとの個別チェック不要）
- 承認フローに時間制約が導入され、承認者不在による申請の無期限滞留が解消される
- `approval_steps.deadline` カラムにより、バッチ処理クエリがシンプルかつ高速になる
- `audit_logs.actorId NOT NULL` 不変条件を維持したまま、システム起因の操作を監査ログに記録できる
- 1 申請 = 1 トランザクション戦略により、バッチ処理の障害が他の申請に伝播しない

### Negative / Trade-offs

- `SYSTEM_USER_ID` と `CRON_SECRET` という新しい環境変数の管理が必要になる
- cron 実行間隔（設定次第）のギャップ中は、期限切れ申請がまだ `pending` のままになる可能性がある（ただし usecase 内の deadline チェックで操作は即時拒否される）
- `deadline` が nullable であるため、`deadlineHours` 未設定のテンプレートから作成された approval_steps は deadline が null（期限なし）となり、データ形状が二種類に分岐する
- system user はシードで管理されるため、DB リセット時に再シードが必要

### Constraints for future changes

- **新規状態変更 usecase 追加時**: 承認フローに関わる新規 usecase を追加する場合、現在のステップの deadline チェック（pre-check + TX 内 re-check）を実装すること
- **承認テンプレートに時間制約を追加する際**: `deadlineHours` はテンプレートの計算元であり、具体的な deadline は申請作成時に `approval_steps` へ算出・保存すること。テンプレート変更が既存申請の deadline に遡及しないことに注意
- **期限延長機能追加時**: `approval_steps.deadline` を更新する際は楽観的ロック（`version`）と合わせて実装すること
- **cron 頻度変更時**: `timingSafeEqual` の前の長さチェックパターンを維持すること（`RangeError` 回避のため）
- **`expired` 状態からの再申請検討時**: `expired` は現時点で完全な終端状態。再申請を許容する場合は、ADR の状態遷移ルールを明示的に変更すること

### Known Design Debt

- 期限切れ時のメール・Slack 通知が未実装（スコープ外）
- 期限の延長機能が未実装（スコープ外）
- 代理承認（不在時の承認者委任）が未実装（次 request で対応予定）
- 自動エスカレーション（期限切れ前の督促等）が未実装（スコープ外）

---

## References

- `specrunner/changes/approval-deadline/design.md` — 詳細設計（D1〜D6）
- `specrunner/changes/approval-deadline/spec.md` — ビヘイビア仕様
- `specrunner/changes/approval-deadline/request.md` — 要件定義
- `src/domain/models/request.ts` — `RequestStatus` への `"expired"` 追加
- `src/domain/services/requestTransition.ts` — `pending → expired` 遷移ルール追加
- `src/domain/services/approvalStepService.ts` — `isStepExpired` ドメインサービス
- `src/domain/models/approvalStep.ts` — `deadline?: Date | null` フィールド追加
- `src/domain/models/approvalTemplate.ts` — `ApprovalTemplateStep.deadlineHours?: number` 追加
- `src/infrastructure/schema.ts` — `approval_steps.deadline` カラム追加
- `drizzle/0003_approval_deadline.sql` — DB マイグレーション
- `src/application/usecases/approveRequest.ts` — deadline pre-check + TX 内 re-check
- `src/application/usecases/rejectRequest.ts` — deadline pre-check + TX 内 re-check
- `src/application/usecases/createRequest.ts` — `deadlineHours` から `deadline` 算出
- `src/application/usecases/expireOverdueRequests.ts` — 期限切れ一括処理 usecase
- `src/app/api/cron/expire-requests/route.ts` — cron エンドポイント（`timingSafeEqual` 認証）
- `src/infrastructure/repositories/approvalStepRepository.ts` — `findOverdueRequestIds` 追加
- `src/infrastructure/seed.ts` — system user 追加、`deadlineHours: 72` 設定
