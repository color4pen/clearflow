# 認可の一貫性とロックアウト防止

## Meta

- **type**: spec-change
- **slug**: authorization-consistency
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 既存の canPerform 中央認可・RBAC マトリクスのパターンに揃えるだけで、新しい port/adapter や設計選択は無いため false -->

## 背景

認可設計（docs/design/03-authorization-design.md §1）は「認可ルールはドメイン層で一元的に定義する。アクション層やユースケース層に散在させない」と定める。実装でも `src/domain/authorization.ts` の `canPerform(role, entity, operation)` ＋ RBAC マトリクスで中央化している。しかし承認系アクション（承認 / 却下 / 一括承認）は canPerform を経由せず `session.user.role === "member"` のインライン判定になっており、中央マトリクスから外れている。結果は等価だが原則からの逸脱で、マトリクス変更が承認系に反映されない乖離リスクがある。あわせて `updateUserRole` は自己降格は防ぐが「組織で最後の admin を降格して admin 不在になる」ことを防げず、管理者ロックアウトのリスクがある。本リクエストは認可の一貫性回復とロックアウト防止に絞る。

## 現状コードの前提

- src/app/actions/requests.ts:216 / :286 / :322 — 承認 / 却下 / 一括承認の各アクションが `if (session.user.role === "member")` のインライン判定で member を弾く。canPerform 不使用
- src/domain/authorization.ts:92 approval.approve / approval.reject = ADMIN_MANAGER_FINANCE（admin/manager/finance 許可）。インライン判定（member 拒否）と等価
- src/domain/authorization.ts:145 `canPerform(role, entity, operation)` が中央判定。未定義は deny-by-default
- src/app/actions/delegations.ts:26 / :70 / :108 は既に canPerform を使用。:43 / :75 / :118 の `role !== "admin"` は「他人の委任は admin のみ操作可」という所有権の追加条件であり、ロールゲートではない
- src/application/usecases/updateUserRole.ts:20 自己降格ガードあり。最後の admin を守るガードは無い
- src/infrastructure/repositories/userRepository.ts `findByOrganization` で組織内ユーザー（role 含む）を取得できる

## 要件

1. requests.ts の承認 / 却下 / 一括承認のインライン `role === "member"` 判定を `canPerform(session.user.role, "approval", "approve")` ／ `canPerform(..., "approval", "reject")` に置き換える（一括承認は "approve"）。挙動（admin/manager/finance 許可・member 拒否）は不変。ステップ承認者ロール一致・委任の追加判定（usecase 側 canApproveWithDelegation）はそのまま維持する
2. `updateUserRole` に「組織で最後の admin を non-admin に降格できない」ガードを追加する。対象が admin かつ降格（newRole !== "admin"）で、同一 organizationId 内の他の admin が 0 人なら拒否する
3. 追加ガードの拒否メッセージは既存スタイル（例「自分自身のロールは変更できません」）に合わせる

## スコープ外

- delegations.ts の `role !== "admin"` 所有権条件（ロールゲートでなく所有権の追加条件。妥当なので変更しない）
- canPerform / RBAC マトリクスの権限内容そのものの変更（値は現状維持）
- テナント分離（別リクエスト client-contact-tenant-isolation で扱う）

## 受け入れ基準

- [ ] 承認 / 却下 / 一括承認が canPerform 経由になり、admin/manager/finance は可・member は不可という既存の振る舞いがテストで固定される
- [ ] 組織で最後の admin を降格しようとすると拒否され、他に admin がいれば降格できることをテストで固定する
- [ ] 既存の自己降格ガードが引き続き機能することをテストで確認する
- [ ] 依存方向 actions → usecases → domain を遵守する
- [ ] 既存テスト無変更で `bun test` green、`typecheck` green、`bun run build` 成功

## architect 評価済みの設計判断

1. **承認系を canPerform に統一** — 認可設計 §1 の中央化原則に揃える。インライン判定は等価でもマトリクス変更が反映されない乖離を生むため排除する。
2. **delegations の所有権条件は触らない** — `role !== "admin"`（他人の委任操作）はロールゲートでなく所有権の追加条件であり、マトリクスに載せる性質ではない。過剰な抽象化を避ける。
3. **最後の admin ガードは usecase 層で実装** — 組織内 admin 数の問い合わせを伴うため、role 単体判定の canPerform ではなく usecase（updateUserRole）に置く。ロックアウト防止という可用性条件であり、認可（権限）とは別軸として扱う。
