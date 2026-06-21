# Design: 承認連携の撤去と直接遷移への移行

## Context

引き合い管理（inquiries）と案件管理（deals）は承認ワークフロー（requests/approvalSteps）と密に結合している。

- **converted 遷移**: 引き合いを案件化する際、`requestRepository.create` で承認リクエストを生成し、承認完了フック（`runPostApprovalLinkage`）が `dealRepository.create` を呼んで Deal を作成する
- **estimate_approval フェーズ**: 案件の negotiation → won 遷移が estimate_approval という中間フェーズを経由し、フェーズ遷移時に承認リクエストが生成される
- **conversionRequestId**: `inquiries` テーブルが案件化承認リクエストへの FK を持ち、UI に承認ステータスを表示する
- **sourceType / sourceId**: `requests` テーブルが発生元（"inquiry" | "deal"）と ID を持ち、`runPostApprovalLinkage` がこれを参照して Deal 作成 / フェーズ進行を行う

この結合は運用上不要と判断された。案件化やフェーズ進行は管理者が直接操作し、承認が必要な場合は申請一覧から別途リクエストを作成する運用に移行する。

現状の主要なコード位置:
- `src/infrastructure/schema.ts:49-56` — `dealPhaseEnum` に `estimate_approval` が含まれる
- `src/infrastructure/schema.ts:109-110` — `requests` テーブルの `sourceType`, `sourceId`
- `src/infrastructure/schema.ts:276` — `inquiries` テーブルの `conversionRequestId`
- `src/domain/services/dealTransition.ts:7-8` — `negotiation → estimate_approval → won` の遷移ルール
- `src/application/usecases/approveRequest.ts:28-125` — `runPostApprovalLinkage` 関数
- `src/application/usecases/updateInquiryStatus.ts:36-135` — converted 遷移での承認リクエスト作成
- `src/application/usecases/updateDealPhase.ts:34-144` — estimate_approval 遷移での承認リクエスト作成

## Goals / Non-Goals

**Goals**:

- 承認連携コード（sourceType/sourceId、`runPostApprovalLinkage`、estimate_approval フェーズ、conversionRequestId）を完全に撤去する
- converted 遷移で Deal を直接作成するシンプルなフローに置き換える
- negotiation → won を直接遷移可能にする
- 案件化ボタンにテンプレート選択なしの確認ダイアログを残す（誤操作防止）
- `bun run build` および `bun test` が全件 green の状態を維持する

**Non-Goals**:

- 承認ワークフロー自体の変更（Request/ApprovalStep/ApprovalTemplate テーブルとそれらのユースケースはそのまま維持する）
- `deals.estimateRequestId` カラムの削除（将来の手動紐づけ用に残す）
- 申請一覧 UI の変更

## Decisions

### D1: 承認連携を完全撤去する（オプション化を却下）

**選択**: `sourceType`/`sourceId`/`runPostApprovalLinkage`/`conversionRequestId`/`estimate_approval` を全削除する
**却下**: フラグで有効/無効を切り替えるオプション化

**Rationale**: フラグによる分岐は複雑さを残す。将来再実装が必要になれば、その時点で設計し直す方が保守コストが低い。

### D2: deals.estimateRequestId は残す

**選択**: `deals` テーブルの `estimateRequestId` カラムを維持する
**却下**: カラム削除

**Rationale**: 将来的に管理者が手動で承認リクエストを案件に紐づける用途がありうる。カラム自体は nullable なので存在しても害がない。今回のスコープは承認連携の撤去であり、このカラムは連携フック（`runPostApprovalLinkage`）とは独立している。

### D3: 案件化に確認ダイアログを残す

**選択**: テンプレート選択モーダルを確認ダイアログ（「この引き合いを案件化しますか？」）に置き換える
**却下**: 確認なしで即実行

**Rationale**: converted は不可逆な終端操作であり、誤操作防止のため最低限の確認が必要。

### D4: converted 遷移で Deal を直接作成する

**選択**: `updateInquiryStatus` の converted 遷移内で `dealRepository.create` を直接呼ぶ
**却下**: 別ユースケース（`createDeal`）へのリダイレクト

**Rationale**: converted 遷移は引き合いのステータス更新と Deal 作成を同一トランザクション内で行う必要がある。既存の `createDeal` ユースケースは converted ステータスのチェックを独自に行う別フローで、converted 遷移専用として同一 TX 内で dealRepository を直接呼ぶ方がシンプル。

### D5: updateInquiryStatus の templateId 引数を廃止する

**選択**: `updateInquiryStatus` のシグネチャから `templateId?: string` を削除し、converted 遷移の必須チェックも削除する
**却下**: templateId を残して unused にする

**Rationale**: 後方互換ハック（使われないパラメータの残置）は禁止。templateId はテンプレート選択連携が前提のパラメータであり、連携を撤去する以上不要。

## Risks / Trade-offs

**[Risk]** `approvalFlowIntegration.test.ts` が旧挙動の存在を静的解析で確認している（sourceType, sourceId フィールド存在など）
→ **Mitigation**: T-11 でテストを全面改訂する。削除すべきテストと置き換えるテストを明確に分類する。

**[Risk]** シードデータが案件化承認リクエスト（`conversionTemplate`）と `conversionRequestId` を参照しており、カラム削除後にシードが失敗する
→ **Mitigation**: T-10 でシードデータから承認連携データを先に削除する。

**[Risk]** マイグレーション（`bunx drizzle-kit generate`）の対話プロンプトで `estimate_approval` enum 値の既存データ処理を確認される場合がある
→ **Mitigation**: T-02 の手順にプロンプト対処を含める。開発環境のシードデータには `estimate_approval` フェーズの案件が存在しないため、generate 後に生成された SQL を確認して適宜 `USING` 句を調整する。

## Open Questions

なし — architect により設計判断が評価済みであり、未解決の技術的判断はない。

## Migration Plan

スキーマ変更はカラム削除と enum 値削除を伴うため、マイグレーションファイルの生成が必要。

1. `schema.ts` の変更（T-01）を先に行う
2. `bunx drizzle-kit generate` でマイグレーション SQL を生成する（T-02）
3. 生成された `drizzle/` 配下の SQL ファイルをレビューし、`ALTER TYPE deal_phase RENAME VALUE ... TO ...` ではなく `ALTER TYPE deal_phase DROP ATTRIBUTE ...` または `DROP TYPE + CREATE TYPE` の形式になっていることを確認する
4. 本番適用時は `bun run db:migrate`（または手動 `drizzle-kit migrate`）で SQL を順次適用する

開発環境では `bun run db:reset` でクリーンリセット + シード再実行を推奨。
