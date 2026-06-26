# Spec: 営業系ページの repository 直接呼び出しを usecase 経由に移行

## Requirements

### Requirement: 営業系ページから repository の直接 import を排除する

営業系の全 page.tsx（clients, deals, inquiries, contracts 配下）は `@/infrastructure/repositories` を直接 import してはならず（SHALL NOT）、`@/application/usecases` 経由でデータ取得しなければならない（SHALL）。

#### Scenario: repository import が残っていない

**Given** 全タスクの実装が完了した状態
**When** `src/app/(dashboard)/clients/`, `src/app/(dashboard)/deals/`, `src/app/(dashboard)/inquiries/`, `src/app/(dashboard)/contracts/` 配下の全 `page.tsx` を検査する
**Then** `@/infrastructure/repositories` からの import 文が 0 件である

### Requirement: 新規 usecase は読み取り専用の薄いラッパーとする

新規作成する usecase は対応する repository メソッドの呼び出しのみを行い（SHALL）、ビジネスロジック・副作用・トランザクションを含んではならない（SHALL NOT）。

#### Scenario: usecase の実装が repository メソッド呼び出しのみ

**Given** 新規作成された usecase ファイル（getClient.ts, listClientContacts.ts, getMeeting.ts 等）
**When** ファイルの内容を検査する
**Then** 関数本体が `return xxxRepository.methodName(args)` の 1 行のみである

### Requirement: 既存の画面動作に変更がない

リファクタリング後の各ページは、リファクタリング前と同一のデータを同一の形式で表示しなければならない（SHALL）。

#### Scenario: ビルドと型チェックが通る

**Given** 全ページの import 切り替えが完了した状態
**When** `bun run build` と型チェックを実行する
**Then** エラーなしで完了する

#### Scenario: 既存テストが全件パスする

**Given** 全ページの import 切り替えが完了した状態
**When** `bun test` を実行する
**Then** 全テストケースが green である
