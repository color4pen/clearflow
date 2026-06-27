# 契約・請求の楽観的ロック

## Meta

- **type**: new-feature
- **slug**: contract-invoice-optimistic-lock
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 新しい port/adapter 追加、既存パターンと異なる設計選択、振る舞い/契約を変える修正、構造的リファクタリング → true。本リクエストは ADR-005 で確立済みの楽観的ロックパターンを contracts / invoices へ横展開するもので新規設計判断がないため false -->

## 背景

楽観的ロック（version カラムによる競合検出）は承認系（requests / approval_steps）と deals / inquiries に導入済みだが、金額を扱う contracts / invoices は未対応。2人の担当者が同じ契約・請求を同時に更新した場合、後勝ちで一方の変更が無言で失われる。財務エンティティに同パターンを適用し、同時更新の競合を検出して更新者にフィードバックする。

## 現状コードの前提

- src/infrastructure/schema.ts:426-451 — contracts テーブルに version カラムがない（updatedAt のみ）
- src/infrastructure/schema.ts:454-470 — invoices テーブルに version カラムがない
- src/domain/models/contract.ts — Contract 型に version フィールドがない
- src/domain/models/invoice.ts — Invoice 型に version フィールドがない
- src/infrastructure/repositories/contractRepository.ts:142,162 — update は id + organizationId で WHERE し、version チェックなし
- src/infrastructure/repositories/invoiceRepository.ts:81,102 — update / updateStatus とも id + organizationId で WHERE し、version チェックなし
- src/application/usecases/updateContract.ts / updateContractStatus.ts / updateInvoice.ts / updateInvoiceStatus.ts — findById → update の流れで version を保持しない

## 要件

1. **contracts テーブルに version カラム追加**: version integer NOT NULL DEFAULT 1 を追加する。差分マイグレーションで既存行に 1 を付与する（DB リセット禁止）
2. **invoices テーブルに version カラム追加**: 同上
3. **ドメインモデル更新**: Contract 型・Invoice 型に version: number を追加する
4. **リポジトリの楽観的ロック**: contractRepository.update / invoiceRepository.update / invoiceRepository.updateStatus の WHERE 条件に version = expectedVersion を追加し、SET で version + 1 する。更新行数が0（=他のトランザクションが先に更新済み）の場合はロック失敗をシグナルする
5. **usecase での楽観的ロック統合**: updateContract / updateContractStatus / updateInvoice / updateInvoiceStatus で、エンティティ取得時の version を保持し、更新時にその version を WHERE 条件に含める。ロック失敗時は { ok: false, reason: "この契約は他のユーザーによって更新されました。画面を更新してください" }（請求は文言を請求向けに調整）を返す
6. **作成時の初期値**: contract / invoice の create 経路で version が 1 で始まることを保証する
7. **テスト**: version 不一致で更新が拒否されること、version 一致で更新が成功し version がインクリメントされることを、contracts・invoices の双方でテストで確認する

## スコープ外

- meetings / clients / action_items など他エンティティへの横展開（同パターンで後続リクエストにて実施）
- version 衝突時の UI 側マージ・自動再取得 UX（ロック失敗メッセージの表示のみ）
- 古いフォームからの上書き防止のためのクライアント側 version 持ち回り
- ペシミスティックロック（SELECT FOR UPDATE）
- 冪等性キー（本リクエストは楽観的ロックのみを対象とする）

## 受け入れ基準

- [ ] contracts / invoices テーブルに version カラムが存在する（差分マイグレーション、既存行は 1）
- [ ] Contract 型・Invoice 型に version: number が存在する
- [ ] 楽観的ロック: version 不一致で更新が拒否されることを contracts / invoices 双方でテストで確認する
- [ ] 楽観的ロック: version 一致で更新が成功し version がインクリメントされることをテストで確認する
- [ ] ロック失敗時に統一メッセージの Result（ok: false）が返ることをテストで確認する
- [ ] 依存方向 actions → usecases → domain / infrastructure を遵守する
- [ ] 既存テスト無変更で `bun test` が全件 green、`typecheck` が green、`bun run build` が成功する

## architect 評価済みの設計判断

1. **version(integer) による楽観的ロックを踏襲、updatedAt ベースを却下** — ADR-005 と同一根拠。timestamp ベースはミリ秒以下の同時更新で精度に依存し信頼性が低い。既存の requests / approval_steps / deals / inquiries と一貫した方式にする
2. **差分マイグレーション（ADD COLUMN ... DEFAULT 1）を採用、テーブル再作成を却下** — 既存データの保持が必須（プロジェクト規律: DB リセット禁止）。DEFAULT 1 で既存行に安全に version を付与できる
3. **ロック失敗は Result の ok: false で返す、例外送出を却下** — usecase の戻り値は Result 型が規約。例外はインフラ障害に限定する
4. **対象を contracts / invoices に限定、全エンティティ一括を却下** — 1 request = 1 レビュー収束ループの粒度に収める。金額を扱う財務エンティティを優先し、他エンティティは後続で横展開する
