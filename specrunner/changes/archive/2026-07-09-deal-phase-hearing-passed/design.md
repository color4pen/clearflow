# Design: 案件フェーズ hearing / passed 追加

## Context

案件（Deal）のフェーズは現在 5 値（`proposal_prep → proposed → negotiation → won / lost`）で構成される。営業プロセスの実態として、提案準備の前に顧客ヒアリングを行うフェーズと、ヒアリング後に当社都合で商談を追わないという判断（見送り）が欠落している。

`DealPhase` は素の string union であり、フェーズ値に対する `never` 網羅 switch が存在しない。フェーズ依存箇所は配列・Record・if-else フォールスルーで書かれ、新値を追加しても TypeScript の型チェックはエラーを出さない（silent-drop）。唯一の例外は `webhookHandler.ts` の exhaustive switch で、`deal.passed` イベント型の追加時にハンドラ case を強制する。

変更対象は 7 レイヤー 20 ファイル以上にまたがり、テストによる網羅担保が必須。

## Goals / Non-Goals

**Goals**:

- `hearing`（初期フェーズ）と `passed`（終端フェーズ・見送り）を DealPhase に追加し、7 値のフェーズ体系を確立する
- 新規作成・引合転換の両方が `hearing` 起点になる（schema default 変更のみ、コード分岐なし）
- `passed` を won/lost と対等の終端として扱う（不可逆・closePhase 権限・パイプライン除外）
- `deal.passed` ドメインイベントを won/lost と同構造で発火する
- MCP ツールの `update_phase` enum・`isTerminalPhase`・広告スキーマに反映する
- silent-drop 箇所を全数手修正し、テストで固定する
- aozu 設計層（model/invariants/glossary/event）を実装と整合させる

**Non-Goals**:

- 見送り理由（reason）の入力・保持（状態追加のみ。理由項目は別 request）
- 既存案件データの一括再分類
- inquiry の `declined` ラベル/enum の変更（別ライフサイクル）

## Decisions

### D1: Postgres enum の再作成パターンでマイグレーション

**決定**: `deal_phase` enum は型再作成パターン（default 退避 → 新 enum 作成 → 列を USING キャストで移行 → default 再設定 → 旧 enum drop → rename）で変更する。

**理由**: `ALTER TYPE ADD VALUE` はトランザクション内で追加した値を同一トランザクションで参照できない制約がある。また enum 値の並び順を `hearing, proposal_prep, proposed, negotiation, won, lost, passed` に決定的に制御する必要がある。リポジトリ前例（`0018_interaction_kind_channel.sql`）で同パターンが検証済み。

**代替案**: `ALTER TYPE ADD VALUE` を複数文 + 非トランザクション実行 → 並び順の保証が困難、かつ Drizzle の `db:generate` との整合が取りにくいため不採用。

### D2: column default を `hearing` に変更して初期フェーズを統一

**決定**: `deals.phase` の schema default を `proposal_prep` から `hearing` に変更する。`createDeal` / `updateInquiryStatus`（引合転換）の両経路とも phase を明示指定せず DB default を継承しているため、default 変更だけで両方が hearing 起点になる。

**理由**: コード分岐を追加しない設計。`dealRepository.create()` は phase をパラメータに取らず DB default に依存している。seed の明示指定行のみ更新が必要。

**代替案**: createDeal のパラメータに phase を追加して `hearing` を明示 → 呼び出し元全箇所の変更が必要になり、DB default との二重管理になるため不採用。

### D3: `deal.passed` を独立イベント型として追加

**決定**: `deal.passed` を `DealPassed` 型として `events/types.ts` の DomainEvent union に追加する。payload 構造は `DealWon` / `DealLost` と同一（`dealId` + `fromPhase`）。

**理由**: won/lost と対等の業務上の節目であり、Webhook 購読者が見送りを個別にフィルタできる必要がある。`deal.phase_changed` に包含すると購読粒度が粗くなる。

**代替案**: `deal.phase_changed` イベントで toPhase=passed を判定 → Webhook 購読者側の判定負荷が増し、won/lost との一貫性が失われるため不採用。

### D4: 停滞フィルタで passed を除外、hearing は停滞対象

**決定**: `dashboard/page.tsx` の停滞判定条件に `passed` を除外条件として追加する（`phase !== "won" && phase !== "lost" && phase !== "passed"`）。`hearing` は能動フェーズとして停滞対象に残す。

**理由**: `passed` は終端であり停滞とは無関係。`hearing` は初期フェーズだが 14 日以上放置されれば停滞と見なすべき。

### D5: DealPhaseStepper に「見送りにする」ボタンを追加

**決定**: ステッパーの終端ボタン群に「見送りにする」ボタンを追加する。ConfirmDialog は won/lost/passed の 3 分岐に拡張する。`passed` のバッジは中立色（gray 系）とし、失注の赤と区別する。PIPELINE 配列の先頭に `hearing` を追加し、isTerminal 判定に `passed` を含める。

**理由**: passed は closePhase 権限が必要な終端遷移であり、パイプラインの進行ステップではなく、受注/失注と同列の結論ボタンとして配置するのが適切。

### D6: revenueRepository の activePhases に hearing を追加

**決定**: `activePhases` を `["hearing", "proposal_prep", "proposed", "negotiation"]` に変更し、`passed` は含めない。

**理由**: hearing フェーズの案件も早期パイプラインとして金額集計対象とする。passed は won/lost と同様に死んだ案件であり、パイプライン集計から除外する。

### D7: パイプライングリッドを grid-cols-8 に変更

**決定**: `deals/page.tsx` と `SalesDashboard.tsx` のパイプライン集計グリッドを `grid-cols-6` から `grid-cols-8`（7 フェーズ + 合計列）に変更する。

**理由**: フェーズ数が 5 → 7 に増加するため、合計列を含めた 8 列レイアウトが必要。

## Risks / Trade-offs

**[Risk] silent-drop 漏れ** → 変更対象ファイルを request.md のサイト一覧で網羅し、各サイトにテストを対応付ける。テスト実行後に全テスト green + typecheck + lint + build を確認する。

**[Risk] 既存テストが 5 フェーズ前提でハードコード** → テスト内の「全フェーズ」前提の値を 7 フェーズに更新する。dealTransition.test.ts に hearing/passed のテストケースを追加する。

**[Risk] enum 再作成マイグレーションのロールバック** → 旧 enum は DROP 後に存在しない。ロールバックには逆方向のマイグレーション（新→旧の再作成）が必要。ただし hearing/passed のデータが存在する場合はデータ移行も必要になる。本番適用前に staging で検証する。

**[Trade-off] grid-cols-8 による UI 密度上昇** → フェーズ名がコンパクト（2〜4 文字）であるため 8 列でもレスポンシブの範囲内。モバイルでは横スクロールが発生しうるが、現時点ではモバイル最適化はスコープ外。

## Open Questions

なし。全決定事項は request.md で確定済み。
