# Code Review Feedback — iteration 001

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
- iteration line format (exact): `- **iteration**: NNN` (3-digit zero-padded integer)
- Findings table MUST have exactly 7 columns in this order:
  # | Severity | Category | File | Description | How to Fix | Fix
  - Fix column: yes = fixer should address this finding; no = skip (pre-existing / out-of-scope)
- Scores table columns: Category | Score | Weight
  - Valid Category values: correctness | security | architecture | performance | maintainability | testing
  - Score: integer 1-10
  - Weight: decimal as defined below
- total line format (exact): `- **total**: <decimal>`
- Default weights: correctness=0.30, security=0.25, architecture=0.15, performance=0.10, maintainability=0.10, testing=0.10
- Scores table is optional but recommended.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approved
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | medium | correctness | `src/app/(dashboard)/requests/[id]/ActionButtons.tsx` | 楽観的ロック失敗時のエラーメッセージが UI に伝達されない。`form action={serverAction}` パターンは Server Action の戻り値を自動表示しない。`useFormStatus` は `pending` のみを追跡し、`{ success: false, message }` はドロップされる。競合発生時、ユーザーにはボタンが一瞬 disabled になった後に再び有効化されるだけで、何のフィードバックも表示されない。設計書 Risk 欄では "ユーザーに「画面を更新してください」と表示するだけ" をミティゲーションとして記載しているが、その表示が実装されていない。 | `ActionButtons.tsx` を `useActionState`（旧 `useFormState`）ベースに書き直し、Server Action の戻り値を受け取れるようにする。エラー時は `state.message` を画面に表示する。または、Server Action がエラー時に `throw` するように変更し React の Error Boundary で捕捉する。 | yes |
| 2 | medium | correctness | `src/infrastructure/repositories/idempotencyKeyRepository.ts`, `src/app/actions/requests.ts` | 同一冪等性キーを持つ真に並行な2リクエストがあった場合、両者が `findByKey` → null、両者が usecase 実行、両者が `create` を試みる。2件目の INSERT で PostgreSQL unique constraint 違反が発生するが catch されておらずサーバーエラー（500）として伝播する。UI のボタン disabled 制御で通常のユーザー操作は防止されているが、HTTP レイヤーのリトライ（TCP 再送等）では発生し得る。 | `idempotencyKeyRepository.create` を try-catch で囲み、unique constraint 違反（`code === '23505'`）の場合は `findByKey` で既存結果を取得して返す。または `INSERT ... ON CONFLICT DO NOTHING` パターンを採用し、重複 INSERT を無害にする。 | yes |
| 3 | low | maintainability | `src/application/usecases/rejectRequest.ts` | `rejectRequest` の revision パスでは `requestRepository.updateStatus` に `existing.version`（トランザクション外で取得した値）を渡している。一方 `approveRequest` の全ステップ承認パスでは TX 内で `requestRepository.findById(..., tx)` を再実行し `freshRequest.version` を使っている。どちらも楽観的ロックとして正しく機能するが、パターンが非一貫であり、将来的な改修で混乱を招く可能性がある。 | `rejectRequest` の TX 内でも `requestRepository.findById(data.requestId, data.organizationId, tx)` で request を再取得し、その `version` を `updateStatus` に渡すよう統一する。 | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 8 | 0.30 |
| security | 8 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 7 | 0.10 |
| testing | 7 | 0.10 |

- **total**: 7.95

## Summary

### 全体評価

楽観的ロック（version カラム）と冪等性キー（DB テーブル管理）の実装は、仕様・設計書・タスクリストの要件を網羅的に満たしている。依存方向 `actions → usecases → domain / infrastructure` は厳守されており、usecase 層に冪等性の概念が混入していない点は設計意図通り。ビルド・lint は正常通過、静的解析テスト 226/227 pass（1件は `.env.example` 欠落によるプリ既存の失敗で本 PR と無関係）。

### 良い点

1. **楽観的ロックの実装精度**: `requestRepository.updateStatus` / `approvalStepRepository.updateStatus` のいずれも `WHERE version = expectedVersion AND SET version = version + 1` を SQL レベルで実装しており、型安全かつ正確。
2. **`approveRequest` のトランザクション整合性**: 全ステップ承認パスで `requestRepository.findById(..., tx)` をトランザクション内で再実行し、最新 version を取得してから更新する実装は TOCTOU 競合を防ぐ防御的設計として評価できる。
3. **冪等性キーの依存分離**: `idempotencyKeyRepository` の利用が Server Actions 層に閉じており、usecase ファイルには一切 import がない。依存方向検証テストも追加されている。
4. **UI の冪等性キー生成**: `addIdempotencyKey` を `onSubmit` で呼び出し、フォーム送信ごとに `crypto.randomUUID()` を生成する実装は正しい。`useFormStatus` による送信中の disabled 制御も機能している。
5. **テスト設計**: 静的解析テストで WHERE 条件・SET 句・エラーメッセージ定数の存在を検証する手法は、DB インフラなしで実装の意図を確認できる実用的なアプローチ。

### 要修正事項（2件 medium, 1件 low）

1. **[Finding #1 / medium]** 楽観的ロック競合エラーが UI に表示されない — Server Action は `{ success: false, message }` を返しているが、`ActionButtons.tsx` の `form action={}` パターンはその戻り値を捨てる。`useActionState` によるエラー表示が必要。
2. **[Finding #2 / medium]** 並行重複リクエスト時の一意制約エラーが未処理 — 実運用上の発生頻度は低いが、発生した場合にサーバーエラーが露出するため catch 処理が必要。
3. **[Finding #3 / low]** `rejectRequest` の request version 取得をトランザクション外で行っている点が `approveRequest` と非一貫。機能上の問題はないが、将来的な保守性のため統一を推奨。
