# 残りの更新系エンティティの楽観的ロック（会議・アクションアイテム・売上目標）

## Meta

- **type**: new-feature
- **slug**: optimistic-lock-remaining-entities
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 新しい port/adapter 追加、既存パターンと異なる設計選択、振る舞い/契約を変える修正、構造的リファクタリング → true。本リクエストは ADR-005 で確立済みの楽観的ロックパターンを残りのエンティティへ横展開するもので新規設計判断がないため false -->

## 背景

楽観的ロックは requests / approval_steps / inquiries / deals / contracts / invoices に導入済み。更新 usecase を持つ残りのエンティティ meetings / action_items / revenue_targets は未対応で、2人が同じ会議・アクションアイテム・売上目標を同時更新すると後勝ちで一方の変更が無言で失われる。同パターンを適用し、update usecase を持つ全エンティティに楽観的ロックを行き渡らせてロールアウトを完了する。

## 現状コードの前提

- src/infrastructure/schema.ts — meetings / action_items / revenue_targets テーブルに version カラムがない
- src/domain/models/meeting.ts / actionItem.ts / revenueTarget.ts — version フィールドがない
- src/infrastructure/repositories/meetingRepository.ts:102 / actionItemRepository.ts:106 / revenueTargetRepository.ts:124 — update は id + organizationId で WHERE し、version チェックなし
- src/application/usecases/updateMeeting.ts / updateActionItem.ts / toggleActionItemDone.ts / updateRevenueTarget.ts — findById → update で version を保持しない
- updateActionItem と toggleActionItemDone は両方 actionItemRepository.update を経由する

## 要件

1. **meetings に version カラム追加**: version integer NOT NULL DEFAULT 1。差分マイグレーションで既存行に 1 を付与（DB リセット禁止）
2. **action_items に version カラム追加**: 同上
3. **revenue_targets に version カラム追加**: 同上
4. **ドメインモデル更新**: Meeting / ActionItem / RevenueTarget 型に version: number を追加
5. **リポジトリの楽観的ロック**: meetingRepository.update / actionItemRepository.update / revenueTargetRepository.update の WHERE に version = expectedVersion を追加し、SET で version + 1。更新行数0でロック失敗をシグナル。mapRow に version を含める
6. **usecase での統合**: updateMeeting / updateActionItem / toggleActionItemDone / updateRevenueTarget で findById 時の version を保持し update に渡す。ロック失敗時は { ok: false, reason: "この<対象>は他のユーザーによって更新されました。画面を更新してください" } を返す
7. **テスト**: version 不一致で更新拒否、version 一致で成功・インクリメントを3エンティティで確認する

## スコープ外

- update usecase を持たないエンティティ（clients / client_contacts / deal_contacts 等）— 更新経路がなく競合が起きないため対象外
- version 衝突時の UI 側マージ・自動再取得（ロック失敗メッセージ表示のみ）
- クライアント側の version 持ち回り
- ペシミスティックロック

## 受け入れ基準

- [ ] meetings / action_items / revenue_targets に version カラムが存在する（差分マイグレーション、既存行は 1）
- [ ] Meeting / ActionItem / RevenueTarget 型に version: number が存在する
- [ ] 楽観的ロック: version 不一致で更新が拒否されることを3エンティティでテストで確認する
- [ ] 楽観的ロック: version 一致で更新が成功し version がインクリメントされることをテストで確認する
- [ ] ロック失敗時に統一メッセージの Result（ok: false）が返ることをテストで確認する
- [ ] 依存方向 actions → usecases → domain / infrastructure を遵守する
- [ ] 既存テスト無変更で `bun test` が green、`typecheck` が green、`bun run build` が成功する

## architect 評価済みの設計判断

1. **version(integer) を踏襲、updatedAt ベースを却下** — ADR-005 と同一根拠。既存の楽観的ロック実装と一貫させる
2. **差分マイグレーション（ADD COLUMN ... DEFAULT 1）を採用、テーブル再作成を却下** — 既存データ保持が必須（DB リセット禁止）
3. **ロック失敗は Result の ok: false で返す、例外送出を却下** — usecase は Result 型が規約。例外はインフラ障害に限定
4. **対象を「update usecase を持つエンティティ」に限定** — clients / contacts 等は更新経路がなく楽観的ロック不要。これで更新可能な全エンティティに行き渡りロールアウトが完了する
5. **action_items はリポジトリ1メソッドの version 化で update / toggleDone 両 usecase をカバー** — 両者とも actionItemRepository.update を経由するため
