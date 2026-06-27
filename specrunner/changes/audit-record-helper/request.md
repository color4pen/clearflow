# 監査ログ記録の型付きヘルパへの集約

## Meta

- **type**: spec-change
- **slug**: audit-record-helper
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: 監査記録の単一エントリポイント（ドメイン/アプリ層のヘルパ）を新設し、44 の記録サイトをそこに集約する構造的リファクタリングのため true -->

## 背景

監査ログの記録は 44 箇所の usecase / handler が `auditLogRepository.create` を直接呼び出している。action / targetType の型は既にカタログ化されているが（[[AuditAction]] / [[AuditTargetType]]）、記録の呼び出し自体は各サイトに重複して散在し、単一の集約点が無い。このため (a) 記録時の横断的関心事（metadata の型強制、共通処理）を一箇所で扱えず、(b) 将来のイベント駆動化（記録責務を usecase から剥がす）への土台が無い。記録を型付きの単一ヘルパに集約し、44 サイトをそれ経由にする。挙動は一切変えない。

## 現状コードの前提

- src/infrastructure/repositories/auditLogRepository.ts — `create({ action: AuditAction, targetType: AuditTargetType, targetId, actorId, organizationId, metadata? }, tx?)` を提供
- src/domain/models/auditLog.ts — `AuditAction` / `AuditTargetType` / `AuditMetadataMap`（`action_item.toggle` → `{ done: boolean }`）が定義済み
- 44 の usecase / handler が `auditLogRepository.create` を直接インライン呼び出し（例: src/application/usecases/updateInvoiceStatus.ts で `{ action: "invoice.update_status", targetType: "invoice", ... }` を tx 付きで渡す）
- `AuditMetadataMap` は型として定義されているが、記録時の metadata に対して強制されていない
- src/domain/services / src/application/services にドメイン/アプリのサービス層の慣例がある

## 要件

1. **型付き記録ヘルパの新設**: 監査ログ記録の単一エントリポイントを設ける。`action: AuditAction` / `targetType: AuditTargetType` / `targetId` / `actorId` / `organizationId` / `metadata?` を受け、`tx?` を引き回し、内部で `auditLogRepository.create` を呼ぶ。配置層は既存のサービス慣例に従う
2. **metadata の型強制**: `AuditMetadataMap` に既知形がある action（最低限 `action_item.toggle` の `{ done: boolean }`）について、ヘルパの metadata 引数を型で要求する。未定義の action は従来通り任意 metadata を許す
3. **44 記録サイトの移行**: 既存の `auditLogRepository.create` 直接呼び出しを、すべて新ヘルパ経由に置き換える（usecase + infrastructure/handlers の両方）。tx の引き回しを維持する
4. **挙動不変**: 記録される action / targetType / metadata の値・記録対象・件数・トランザクション境界は現状と完全に同一に保つ

## スコープ外

- 記録機構のイベント駆動化（usecase → ドメインイベント → 単一 handler。別リクエスト）
- 監査記録の対象範囲・粒度・文字列値の変更
- 読み取り側（findByTargets / activityLabels 等）の変更

## 受け入れ基準

- [ ] 監査記録の単一ヘルパが定義され、`AuditAction` / `AuditTargetType` を型に持つことを静的検証テストで固定する
- [ ] `action_item.toggle` の記録時に metadata が `{ done: boolean }` を要求されることを型テストで固定する
- [ ] `auditLogRepository.create` の直接呼び出しが、ヘルパ実装以外のアプリ/インフラのコードに残っていないことをテストで固定する
- [ ] 記録される値・挙動が不変のため、既存テストが無変更で green であることを確認する
- [ ] typecheck / lint が green であることを確認する
