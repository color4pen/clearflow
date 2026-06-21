# Design: approval-flow-integration

## Context

案件化承認・見積承認で作成される Request が `draft` 状態のままとなり、承認者のキューに載らない。加えて、承認完了後に引き合い・案件のステータスが自動更新されないため、手動での状態管理が発生している。

現状のコード:

- `requestRepository.create` は `status: "draft"` をハードコードしており、呼び出し側から status を指定できない
- `updateInquiryStatus`（converted 遷移）と `updateDealPhase`（estimate_approval 遷移）は `requestRepository.create` を status 指定なしで呼ぶため、Request は常に `draft` で作成される
- `approveRequest` は全ステップ承認後に Request を `approved` に遷移するが、引き合い・案件への連動処理は一切持たない
- Request にはどの引き合い・案件から生成されたかを示す情報がなく、承認完了時に連動先を特定できない

## Goals / Non-Goals

**Goals**:

- `requestRepository.create` に `status` パラメータを追加し、案件化承認・見積承認リクエストを `pending` で直接作成できるようにする
- `requests` テーブルに `sourceType`/`sourceId` カラムを追加し、Request の出自を永続化する
- `approveRequest` に承認完了後の連動処理を追加し、案件化承認→Deal 自動作成、見積承認→Deal フェーズ自動進行を実現する
- 連動処理の失敗が承認ロールバックを引き起こさないようにする

**Non-Goals**:

- 承認却下時の引き合い・案件へのステータス反映
- 承認リクエスト一覧での `sourceType` によるフィルタリング
- 引き合い作成時の顧客同時登録 UI
- 商談記録からの担当者登録 UI

## Decisions

### D1: requests テーブルに sourceType/sourceId を追加

Request が「どこから来たか」を Request 自身が保持する。`sourceType` は `"inquiry"` | `"deal"` | null、`sourceId` は引き合いID or 案件ID（nullable UUID）。

- **Rationale**: audit log の metadata から逆引きする方式は、append-only の記録を状態遷移のトリガーに使うことになり信頼性が低い。Request 自身が出自を持てば、連動処理のクエリがシンプルになる
- **Alternatives**: audit log metadata から `inquiryId`/`dealId` を検索 → 却下（audit log はイベント記録であり、ビジネスロジックの依存先にすべきでない）

### D2: 案件化承認・見積承認リクエストを pending で直接作成

`requestRepository.create` に `status` パラメータを追加し、`updateInquiryStatus`/`updateDealPhase` から `status: "pending"` で INSERT する。

- **Rationale**: `submitRequest` UC を自動呼び出しする方式は、webhook 配信・audit log 書き込みなどトランザクション外副作用が二重に発生する。status パラメータ追加で直接 pending INSERT するのが最もシンプル
- **Alternatives**: draft で作成後に `submitRequest` を内部呼び出し → 却下（副作用の二重実行、UC→UC 呼び出しは依存方向違反）

### D3: 連動処理をトランザクション外で実行し、失敗時も承認を成功させる

`approveRequest` の全ステップ承認完了後、トランザクション外で `sourceType` に応じた連動処理を実行する。失敗時は audit log にエラーを記録するが、承認のロールバックはしない。

- **Rationale**: 承認は承認として完了すべき。案件作成やフェーズ進行の失敗で承認をロールバックすると、承認者が同じ操作を繰り返す必要がある
- **Alternatives**: 連動処理をトランザクション内で実行 → 却下（連動先の障害で承認が巻き戻る UX 劣化）

### D4: approveRequest 内でリポジトリ層を直接呼び出す

連動処理は `approveRequest` 内で `inquiryRepository`/`dealRepository`/`auditLogRepository` を直接呼び出す。

- **Rationale**: UC→UC 呼び出しは依存方向（actions → usecases → domain/infrastructure）に違反する。リポジトリ層の直接利用なら usecase → infrastructure の正当な依存方向を保てる。イベントバスやキューはプロジェクト規模では過剰
- **Alternatives**: `createDeal` UC を呼び出す → 却下（依存方向違反）; ドメインイベント → 却下（プロジェクト規模で過剰）

### D5: Request ドメインモデルに sourceType/sourceId を追加

`Request` 型に `sourceType: string | null` と `sourceId: string | null` を追加する。`mapRow` 関数を更新して DB カラムをマッピングする。

- **Rationale**: 型安全性を保ちつつ、承認完了時に `sourceType` で分岐できるようにする
- **Alternatives**: `sourceType` を union 型 `"inquiry" | "deal" | null` で厳密に制約 → 今回は `string | null` で実装。利用箇所が `approveRequest` 1箇所のみであり、拡張性を優先

## Risks / Trade-offs

- [Risk] 連動処理が失敗した場合、承認は成功するが Deal 作成/フェーズ進行が行われない → **Mitigation**: audit log にエラーを記録し、運用で検知・リカバリ可能にする
- [Risk] `requestRepository.create` のシグネチャ変更が既存の呼び出し元に影響する → **Mitigation**: 新パラメータは全てオプショナルにし、デフォルト値で後方互換を維持
- [Risk] deals テーブルの `inquiryId` に UNIQUE 制約があるため、同一引き合いから重複 Deal 作成を試みると DB エラーになる → **Mitigation**: エラーをキャッチし audit log に記録。承認自体は成功扱い
- [Risk] `dealRepository.updatePhase` に楽観ロックがあるため、並行操作でフェーズ進行が失敗する可能性がある → **Mitigation**: 楽観ロック失敗も audit log に記録し承認を成功させる

## Open Questions

なし。設計判断は全て architect によって評価済み。
