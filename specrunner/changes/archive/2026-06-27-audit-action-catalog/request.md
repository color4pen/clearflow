# 監査ログ action / targetType の型カタログ化

## Meta

- **type**: spec-change
- **slug**: audit-action-catalog
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: 監査の語彙（action/targetType）をドメイン層に型カタログとして一元定義し、記録・消費の両側をその型に従わせる構造的リファクタリングのため true -->

## 背景

監査ログは全ドメインの状態変更を記録する横断的な基盤で、43 の usecase が記録し、6 箇所が消費する。しかし `action` / `targetType` が型のない自由文字列で、各記録サイトにインライン文字列リテラルとして散在し、中央カタログが存在しない。このため次の問題がある。

- タイポや表記ドリフトをコンパイラが検出できない（実際、`invoice.update_status` だけが snake_case で、他は `updateStatus` / `updateRole` の camelCase）
- 消費側（アクティビティ表示など）は語彙を grep で手作業再現するしかなく、記録側とズレるとバグになる（過去にアクティビティのアクションラベル不一致が発生）
- 通知など消費側が増えるほど、この未構造の負債が拡大する

監査の語彙をドメイン層で型として一元定義し、記録側・消費側の両方をその型に従わせ、許可外の値をコンパイルエラーにする。

## 現状コードの前提

- src/domain/models/auditLog.ts — `AuditLog.action` / `targetType` は `string`、`metadata` は `Record<string, unknown> | null`。許可値の型制約が無い
- 記録は 43 の usecase が `auditLogRepository.create` を直接呼び、`action` / `targetType` をインライン文字列リテラルで渡す（例: src/application/usecases/createInvoice.ts で `action: "invoice.create"`, `targetType: "invoice"`）
- src/infrastructure/handlers/auditLogHandler.ts — `request.submitted` イベントを `action: "request.submit"` として記録。記録サイトは application だけでなく infrastructure にもある
- 実コード上の `action` は全 46 種（deal.* / contract.* / invoice.* / meeting.* / action_item.* / inquiry.* / request.* / approval_step.* / delegation.* / policy.* / template.* / revenue_target.* / client* / user.updateRole など）、`targetType` は 14 種（action_item / client / client_contact / contract / deal / deal_contact / delegation / inquiry / invoice / meeting / request / revenue_target / template / user）
- 命名不統一: `invoice.update_status`（snake）に対し `contract.updateStatus` / `inquiry.updateStatus` / `user.updateRole`（camel）
- 消費側が `action` / `targetType` の語彙に依存: src/lib/activityLabels.ts（action→ラベル表）, src/application/usecases/listAuditLogs.ts, src/application/usecases/getRecentActivities.ts, src/application/usecases/getDealActivity.ts, src/app/api/audit-logs/export/route.ts
- 中央の `AuditAction` / `AuditTargetType` に相当する型・定数は存在しない

## 要件

1. **語彙カタログの型定義**: ドメイン層に `AuditAction`（全記録サイト = application + infrastructure を網羅した action の型）と `AuditTargetType`（全 targetType の型）を定義する。語彙は実コードから網羅的に収集し、漏れが無いこと（handler の `request.submit` を含む）。これらが監査語彙の単一の正とする
2. **モデルとリポジトリの型付け**: `AuditLog.action` / `targetType` と `auditLogRepository.create` のパラメータをカタログ型に変更する。これにより既存の全記録サイトがコンパイル時にカタログと突き合わされ、許可外の値・タイポはコンパイルエラーになる
3. **消費側のカタログ参照**: src/lib/activityLabels.ts のラベル表のキーを `AuditAction` 型に制約し、カタログに無いキー（タイポ）はコンパイルエラーになるようにする。独自にハードコードした語彙を排除し、記録側とラベル側のドリフトを型で防ぐ
4. **metadata の既知形の型化**: 既知の metadata 形を可能な範囲で型として表す（最低限 `action_item.toggle` の `{ done: boolean }`）
5. **挙動不変**: audit_logs に実際に記録される `action` / `targetType` の文字列値、記録対象、記録件数は現状と完全に同一に保つ

## スコープ外

- 既存 audit_logs 行の `action` 文字列の書き換え（監査ログは追記専用の履歴。命名の正規化はしない。`invoice.update_status` 等は既存値のままカタログに含める。新規 action は `<entity>.<camelVerb>` 規約に従う方針のみ示す）
- 記録機構のイベント駆動化（usecase → ドメインイベント → 単一 handler への集約。別リクエストの「土台→上物」候補）
- 監査記録の対象範囲・粒度の変更（何を記録するかは変えない）
- 監査ログの保存・パーティショニング等のインフラ最適化

## 受け入れ基準

- [ ] `AuditAction` / `AuditTargetType` がドメイン層に定義され、`AuditLog.action` / `targetType` と `auditLogRepository.create` がその型を使うことを静的検証テストで固定する
- [ ] src/lib/activityLabels.ts のラベル表のキーが `AuditAction` 型に制約され、カタログに無いキーがコンパイルエラーになることをテストで固定する
- [ ] `action_item.toggle` の metadata が `{ done: boolean }` として型で表されることをテストで固定する
- [ ] 記録される文字列値・挙動が不変のため、既存テストが無変更で green であることを確認する
- [ ] typecheck で全記録サイト（application + infrastructure）がカタログ型に適合することを確認する
