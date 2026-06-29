# 重要な振る舞いの behavioral テスト補強

## Meta

- **type**: spec-change
- **slug**: behavioral-test-hardening
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 既存実装は変えずテストのみ追加。新しい port/adapter・設計選択は無いため false -->

## 背景

先行リクエストで追加された重要な振る舞い（管理者ロックアウト防止・ユーザー作成・パスワード変更・無効化）は、受け入れ基準を**ソースの静的検査（readSrc + toContain）**で満たしており、ロジックを**実行して検証していない**。これらをプロジェクトの `.dynamic.test.ts` 方式（`mock.module` で repository/db をモックし usecase を実行して戻り値・呼び出し引数・監査を assert）の **behavioral テスト**で固定する。**実装は一切変更しない（テストのみ追加）。**

## 現状コードの前提

- src/__tests__/usecases/provisionOrganization.dynamic.test.ts — 参照すべき作法。`mock.module("@/infrastructure/db", ...)` で transaction を即時実行モック、repository を個別ファイルモック（バレル `@/infrastructure/repositories` はモックしない）、usecase を実行して引数・結果を assert
- src/application/usecases/updateUserRole.ts — 自己降格ガード＋「組織で最後の admin を降格不可」ガード（findByOrganization で他 admin 数を数える）
- src/application/usecases/deactivateUser.ts / reactivateUser.ts — 自己無効化ガード、最後の“有効”admin 無効化不可、deactivated_at 設定、user.deactivate / user.reactivate 監査
- src/application/usecases/createUser.ts — email 重複事前チェック＋23505 フォールバック、bcrypt ハッシュ、user.create 監査、role/organizationId
- src/application/usecases/changeOwnPassword.ts — findByIdForAuth で現在パスワードを bcrypt.compare、不一致で拒否、一致で bcrypt.hash＋updatePassword＋user.updatePassword 監査
- 既存テスト（src/__tests__/usecases/userManagement.test.ts 等）には readSrc/toContain の静的検査が含まれる

## 要件

以下を `.dynamic.test.ts`（mock ベース・usecase を実行して assert。readSrc/toContain で代替しない）で固定する。

1. **updateUserRole**: (a) 組織で最後の admin を非 admin に降格しようとすると拒否される、(b) 他に有効な admin がいれば降格が成功し user.updateRole 監査が記録される、(c) 自分自身の降格は拒否される
2. **deactivateUser / reactivateUser**: (a) 組織で最後の有効 admin の無効化は拒否、(b) 自己無効化は拒否、(c) 無効化成功時に deactivated_at が設定され user.deactivate 監査が記録される、(d) 再有効化で deactivated_at=null・user.reactivate 監査
3. **createUser**: (a) email 重複時に拒否される、(b) 成功時に organizationId・role・bcrypt ハッシュ済みパスワードで作成され user.create 監査が記録される
4. **changeOwnPassword**: (a) 現在パスワード不一致で拒否、(b) 一致時に新パスワードが bcrypt.hash され updatePassword が呼ばれ user.updatePassword 監査が記録される
5. 既存の静的テスト（同一振る舞いを readSrc/toContain で検査しているもの）は、behavioral 版に**置換または整理**してよい（重複の残置も可だが、静的のみで behavioral が無い状態は解消する）

## スコープ外

- 実装（usecase / repository / UI）の変更。**テストのみ**
- A1 のテナント分離（clientContact の join）の検証 — repository クエリ構築のため mock ベースで固定しづらい。別途 DB バックテストで扱う（本リクエスト対象外）
- 新しいテストインフラの導入（既存の `bun:test` + `mock.module` 方式に従う）

## 受け入れ基準

- [ ] 上記 1〜4 が mock ベース behavioral テスト（usecase を実行し、戻り値・呼び出し引数・監査 action を assert）で固定される。**readSrc/toContain による静的検査で代替していない**
- [ ] 追加テストが既存の `.dynamic.test.ts` 作法（個別ファイルモック・バレル不使用）に従う
- [ ] 実装ファイルに差分が無い（テストのみの追加・整理）
- [ ] 既存テスト無変更で `bun test` green、`typecheck` green、`bun run build` 成功

## architect 評価済みの設計判断

1. **mock ベース behavioral を採用（実 DB は使わない）** — プロジェクトの `.dynamic.test.ts` は `mock.module` で repository/db をモックし usecase を実行する方式。ロジック（ガード・分岐・監査）を実行検証でき、実 DB 依存の不安定さも無い。静的検査（実行しない）からの脱却が目的。
2. **A1 のテナント分離は対象外** — repository の join はクエリ構築であり mock では意味のある検証になりにくい。別途 DB バックテストで扱う方が適切。
3. **実装は不変** — 既存実装は詳細レビュー済みで正しい。本リクエストは安全網（回帰検知）の強化のみ。
