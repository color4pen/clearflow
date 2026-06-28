# Design: 認可の一貫性とロックアウト防止

## Context

認可設計は「認可ルールはドメイン層で一元的に定義する」と定める。`src/domain/authorization.ts` の `canPerform(role, entity, operation)` + RBAC マトリクスが中央判定を担う。`delegations.ts` や `users.ts` など多くのアクションは canPerform を経由しているが、承認系アクション 3 箇所（`approveRequestAction`, `rejectRequestAction`, `bulkApproveAction`）は `session.user.role === "member"` のインライン判定で member を弾いており、中央マトリクスから外れている。

マトリクス上 `approval.approve` / `approval.reject` は `ADMIN_MANAGER_FINANCE`（admin/manager/finance 許可）であり、インライン判定（member 拒否）と結果は等価だが、マトリクス変更が承認系に反映されない乖離リスクがある。

加えて `updateUserRole` usecase は自己降格を防ぐが、組織で最後の admin を non-admin に降格する操作を防げず、管理者ロックアウトのリスクがある。

### 変更対象ファイルの現状

| ファイル | 現状 | 問題 |
|---------|------|------|
| `src/app/actions/requests.ts` L216, L286, L322 | `role === "member"` インライン判定 | canPerform 不使用。中央マトリクスから乖離 |
| `src/application/usecases/updateUserRole.ts` L20 | 自己降格ガードのみ | 最後の admin 降格を防げない |

### 変更しないファイル

| ファイル | 理由 |
|---------|------|
| `src/domain/authorization.ts` | マトリクス値の変更なし。canPerform の呼び出し側を統一するのみ |
| `src/app/actions/delegations.ts` | 既に canPerform 使用済。`role !== "admin"` は所有権の追加条件でありスコープ外 |

## Goals / Non-Goals

**Goals**:

1. 承認系アクション（承認 / 却下 / 一括承認）のロールゲートを canPerform 経由に統一し、認可設計の中央化原則に整合させる
2. `updateUserRole` に最後の admin ロックアウト防止ガードを追加し、admin 不在状態を防ぐ
3. 新規振る舞いをテストで固定する

**Non-Goals**:

- canPerform / RBAC マトリクスの権限値の変更（値は現状維持）
- `delegations.ts` の所有権条件（`role !== "admin"`）の変更
- テナント分離の対応

## Decisions

### D1: 承認系アクションの canPerform 統一

`approveRequestAction` と `bulkApproveAction` は `canPerform(role, "approval", "approve")` に、`rejectRequestAction` は `canPerform(role, "approval", "reject")` に置き換える。

**Rationale**: インライン `role === "member"` はマトリクスの `approval.approve = ADMIN_MANAGER_FINANCE` と等価だが、マトリクスを変更した際に承認系だけ追従しないリスクがある。`delegations.ts` が既に canPerform を使用しており、同じパターンに揃える。

**Alternatives considered**:
- (A) インライン判定のまま維持 → マトリクス乖離リスクが残る。却下
- (B) canPerform 統一 → 採用。既存の `delegations.ts` と同じパターンで一貫性が取れる

### D2: エラーメッセージの変更

現在の承認系アクションは `"権限がありません"` を返すが、canPerform 経由に変更後もメッセージは維持する。`delegations.ts` では `"この操作を実行する権限がありません"` を使用しているが、既存の承認系テストやクライアントとの互換性を考慮し、承認系は既存メッセージ `"権限がありません"` をそのまま使う。

**Rationale**: メッセージ変更は本変更のスコープ外。振る舞い（認可判定結果）を変えずにゲート実装のみ差し替える。

**Alternatives considered**:
- (A) `"この操作を実行する権限がありません"` に統一 → メッセージ変更はスコープ外。既存のテストやフロントエンドへの影響を避ける
- (B) 既存メッセージ維持 → 採用

### D3: 最後の admin ガードの配置先

`updateUserRole` usecase 内に配置する。

**Rationale**: 組織内の admin 数を問い合わせる必要があるため、repository アクセスを伴う。`canPerform` は `(role, entity, operation)` の 3 引数で単一ロールを評価する純粋関数であり、組織全体の状態に依存するガードは置けない。usecase 層が domain + infrastructure を協調させる適切なレイヤー。

**Alternatives considered**:
- (A) canPerform を拡張してコンテキスト引数を追加 → canPerform のシンプルさ（純粋関数）を壊す。却下
- (B) domain service に新関数追加 → repository 依存が必要で domain 層の原則（副作用なし）に反する。却下
- (C) usecase 層に配置 → 採用。既存の自己降格ガードと同列に置ける

### D4: admin 数の取得方法

`userRepository.findByOrganization(organizationId)` で組織内全ユーザーを取得し、admin ロールのユーザーをフィルタしてカウントする。

**Rationale**: 既存の `findByOrganization` は組織内ユーザーを role 含むフルオブジェクトで返す。対象ユーザーを除外して admin が 0 人かを判定するだけなので、新しい repository メソッドは不要。

**Alternatives considered**:
- (A) `countAdminsByOrganization` のような専用メソッドを追加 → 既存メソッドで十分。過剰な最適化。却下
- (B) 既存 `findByOrganization` を利用 → 採用

### D5: ガードの評価順序

`updateUserRole` 内のガード順序: 自己降格ガード → ユーザー存在確認 → 最後の admin ガード → トランザクション実行。

**Rationale**: 最後の admin ガードは対象ユーザーの現在ロールを知る必要がある。`findById` で取得した `currentUser.role` を使えるため、ユーザー存在確認の後に配置する。自己降格ガードは repository アクセス不要の軽量チェックなので先に実行する。

## Risks / Trade-offs

- [Risk] `findByOrganization` で全ユーザーを取得するため、ユーザー数が極端に多い組織ではパフォーマンスに影響がある → [Mitigation] ロール変更は管理操作で頻度が低く、現時点では許容範囲。将来必要になれば `countByRole` を追加する
- [Risk] 承認系のエラーメッセージ `"権限がありません"` と delegations の `"この操作を実行する権限がありません"` が混在 → [Mitigation] メッセージ統一は別リクエストのスコープ。今回は振る舞い不変を優先

## Open Questions

なし。architect 評価済みの設計判断により主要な判断は確定している。
