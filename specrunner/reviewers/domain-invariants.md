---
name: domain-invariants
maxIterations: 3
paths:
  - src/application/**
  - src/infrastructure/repositories/**
  - src/app/actions/**
  - src/domain/**
---

## 目的

テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。

## 観点

### テナント分離

- テナント所有リソースへのクエリは必ず organizationId で制約されている
- organizationId はセッション（認証済みユーザー）から取得し、リクエストボディから受け取らない
- リソース ID だけで認可判断をしていない（ID + organizationId の組み合わせで検証する）
- 新しいリポジトリ関数が追加された場合、テナント条件が付与されている

### 監査ログの完全性

- 状態変更（ステータス遷移、作成、削除）は append-only の監査ログを同一トランザクション内で記録する
- 監査レコードには actor（実行者）、target（対象リソース）、action（操作種別）、timestamp が含まれる
- 監査ログテーブルに対する UPDATE / DELETE 操作が存在しない
- 新しい状態変更操作が追加された場合、対応する監査ログ記録がある

## 判定基準

- **approved**: 全観点で違反がない
- **needs-fix**: テナント条件の欠落、監査ログの記録漏れ、トランザクション外での監査ログ記録のいずれかが検出された
