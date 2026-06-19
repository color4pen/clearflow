# Code Review Feedback — iteration 001

- **verdict**: approved
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | medium | performance | `src/app/(dashboard)/clients/page.tsx:13-20` | N+1 クエリ: 顧客一覧の各顧客に対し `findContactsByClientId` を個別呼び出し。顧客数 N に対し N+1 クエリが発生する。`Promise.all` で並列化しているが DB コネクション使用量は線形に増加する | `clientRepository` に `findContactCountsByOrganization(organizationId)` を追加し、1 クエリの GROUP BY / count で集計する | yes |
| 2 | medium | performance | `src/app/(dashboard)/inquiries/new/page.tsx:16-21` | N+1 クエリ: `clients.map` 内で全顧客の担当者を個別取得。顧客数に比例して DB 往復が増加する | `clientRepository` に `findAllContactsByOrganization(organizationId)` を追加して一括取得し、クライアント側で clientId でグループ化する | yes |
| 3 | low | performance | `src/app/(dashboard)/clients/[id]/page.tsx:34-42` | 全組織引き合いを取得後、JS で `clientId` フィルタ: `findAllByOrganization` → `.filter(inq => inq.clientId === client.id)` で全件取得→メモリフィルタ。引き合い件数が多い組織で無駄なデータ転送が発生する | `inquiryRepository` に `findByClientId(clientId, organizationId)` を追加し、DB 側で絞り込む | yes |
| 4 | low | correctness | `src/application/usecases/updateInquiryStatus.ts:23-28` | TOCTOU: トランザクション外で `findById` → ステータス読み込み → トランザクション開始の間に別リクエストが同一引き合いを `converted` に遷移させた場合、重複する承認リクエストが生成される可能性がある。既存の `createRequest` ユースケースと同様のパターンではあるが、`converted` 遷移は承認リクエスト自動生成を伴うため影響が大きい | トランザクション内で引き合いを再取得（`FOR UPDATE` ロック相当）してステータスを再検証するか、`updateStatus` に現在ステータスの楽観ロック条件を追加する | yes |
| 5 | low | architecture | `src/app/(dashboard)/clients/page.tsx:4`, `clients/[id]/page.tsx:4-5`, `inquiries/[id]/page.tsx:5-8`, `inquiries/new/page.tsx:3` | ページコンポーネントが `@/infrastructure/repositories` を直接 import。アーキテクチャ規約（pages は UI のみ）に反するが、`settings/audit-logs/page.tsx` 等の既存ページでも同パターンが定着しており、本変更固有の問題ではない | 既存パターンなので本 PR では対応不要。ただし将来的には usecases または Server Actions 経由にリファクタすることが望ましい | no |

## Test Coverage Assessment (must TCs)

| TC | Priority | Status |
|----|----------|--------|
| TC-001 inquiryStatusEnum 定義 | must | build 検証で担保（静的チェックなし） |
| TC-002〜TC-010 状態遷移 | must | `inquiryTransition.test.ts` で全件カバー |
| TC-011 infrastructure import なし | must | `projectStructure.test.ts` でカバー |
| TC-012 ORM import なし | must | `projectStructure.test.ts` でカバー |
| TC-013 顧客一覧テナント分離 | must | 静的コード解析でカバー |
| TC-014 引き合い一覧テナント分離 | must | 静的コード解析でカバー |
| TC-017 updateStatus が requestId を更新 | must | 静的解析のみ（実 DB 統合テストなし） |
| TC-018〜TC-021 監査ログ記録 | must | 静的解析のみ（実 DB 統合テストなし） |
| TC-024 存在しない clientId でエラー | must | 静的解析のみ |
| TC-025 遷移ルール違反でエラー | must | 静的解析のみ |
| TC-026 converted 時テンプレート未指定エラー | must | 静的解析のみ |
| TC-027〜TC-029 converted 遷移の完全動作 | must | 静的解析のみ |
| TC-030〜TC-033 ロール権限 | must | 静的解析のみ |
| TC-036 organizationId はセッションから取得 | must | 静的解析でカバー |

`test-cases.md` が "integration" と分類している TC-017〜TC-033 の多くが静的コード解析テストとして実装されており、実際の DB 統合テストではない。テスト環境（DB 不要）の制約上やむを得ない選択ではあるが、将来的には Docker ベースの統合テスト追加が望ましい。

## Acceptance Criteria Checklist

- ✓ `bun run build` 成功（verification-result.md 確認）
- ✓ `bun test` 全件 green（440 pass, 0 fail）
- ✓ `clients`, `client_contacts`, `inquiries` テーブルが `schema.ts` に定義
- ✓ `inquiryStatusEnum` が `["new", "in_progress", "converted", "declined"]` で定義
- ✓ 全リポジトリ関数のクエリに `organizationId` 条件付与
- ✓ 状態遷移テスト 4 件（new→in_progress, in_progress→converted, converted→new 拒否, declined→in_progress 拒否）
- ✓ `converted` 遷移時に承認リクエスト自動作成・`requestId` 紐づけをテストで確認（静的解析）
- ✓ 監査ログ記録（静的解析）
- ✓ `converted` 変更は admin と manager のみ（コード実装 + 静的解析）
- ✓ ダッシュボードヘッダーに「顧客」「引き合い」ナビリンク（`layout.tsx` 確認）
- ✓ 依存方向遵守（pages の直接 import は既存パターン踏襲）
- ✓ `typecheck` green

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 10 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 6 | 0.10 |
| maintainability | 9 | 0.10 |
| testing | 8 | 0.10 |

- **total**: 8.85

## Summary

実装品質は全体的に高く、全受け入れ基準を満たしている。スキーマ定義・ドメインモデル・リポジトリ・ユースケース・Server Actions・UI ページの各レイヤーが既存パターンに整合して実装されており、セキュリティ面（`organizationId` はセッション固定、`converted` は admin/manager ロール限定、テナント分離）も堅実。

ブロッキング要因はなく **approved**。フォローアップ推奨事項:

1. **N+1 クエリ解消（Finding #1, #2）**: 顧客一覧の担当者数取得と引き合い新規登録フォームの担当者一括取得を GROUP BY / 一括 SELECT にリファクタする。組織規模が小さい間は許容範囲だが、中規模以上になる前に対応を検討する。
2. **クライアント詳細の引き合いフィルタ（Finding #3）**: `inquiryRepository.findByClientId` を追加して DB 側絞り込みに変える。実装コストが低く、早めに対応することを推奨。
3. **TOCTOU（Finding #4）**: `converted` 遷移の並行リクエストによる重複承認リクエスト生成リスク。商談化操作の頻度が低い初期段階では許容できるが、運用規模が拡大する前に楽観ロックを追加することを推奨。
