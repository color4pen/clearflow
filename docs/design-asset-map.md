# 設計資産マップ

既存設計文書と `design/`（aozu 形式の設計正本）の対応の索引。aozu 導入手順（aozu リポジトリ docs/adoption.md）の Step 0 成果物であり、以後の需要駆動充填（Step 3〜4）で「どの既存文書のどの節を design/ に移すか」を引くために使う。

運用原則（adoption.md 三原則の適用）:

- 正本は**型ごと**に移る。manifest で enabled にした型が扱う事実は `design/` が正本となり、既存文書の該当節は `design/` へのポインタに置き換える（削除しない）
- enabled でない型の事実は既存文書（またはコード）が正本のまま
- 書き起こしは「その型を読む機械」の結線と同時にのみ行う

## 現状

- `design/` には書き起こし済みの素材 **74 要素**（mod 15 / act 5 / term 7 / ent 20 / inv 23 / seq 4）があり、2026-06-30 時点のコードと同期している（`aozu check` exit 0）
- manifest の enabled は **static のみ**（最小構成）。domain / dynamic の素材はファイルとして保持し、読む機械の結線とともに有効化する

型ごとの読む機械（結線先）:

| 型 | 読む機械 | 結線ステップ |
|---|---|---|
| static（mod / 許可依存） | `export rules` → architecture test（CI） | Step 1 |
| domain（term / ent / inv / act）・dynamic（seq） | `check --request`（request 引用ゲート）+ prompt 注入 | Step 2〜3 |
| permission ビュー | 権限マトリクスと `src/domain/authorization.ts` の突合テスト | Step 4（named consumer が立ったとき） |

## 資産マップ

### docs/design/ユビキタス言語辞書.md

| 節 | 対応する型 | 扱い |
|---|---|---|
| 全節（エンティティ / 読み取りモデル / タイムライン概念 / 命名 / 担当者の区別 / 表記の注意） | domain（term / ent） | 素材は `design/domain/glossary.md`・`model.md` に転写済み。domain 有効化時にポインタ化 |

### docs/design/01-domain-design.md

| 節 | 対応する型 | 扱い |
|---|---|---|
| §1 システム概要 | なし（散文） | そのまま残す |
| §2 ビジネスプロセスの全体像 | dynamic（seq） | 主要 4 シナリオは転写済み。残りは需要駆動 |
| §3 境界づけられたコンテキスト / §5 ドメイン間の関係 | static（mod）+ domain（ent 参照） | 転写済み。有効化時にポインタ化 |
| §4 集約定義 | domain（ent / inv） | 転写済み。有効化時にポインタ化 |
| §6 ドメインイベント一覧 | domain（`[[ent-domain-event]]`） | 総体は転写済み。イベント個別の形式化は evt ビュー（未実装・需要駆動） |
| §7 監査ログと派生情報 | domain（`[[ent-audit-log]]` / `[[term-timeline]]`） | 転写済み。有効化時にポインタ化 |
| §8 用語集 | domain（term） | 転写済み。有効化時にポインタ化 |

### docs/design/02-approval-design.md

| 節 | 対応する型 | 扱い |
|---|---|---|
| §2〜5 ポリシー / テンプレート / リクエスト / 委任 | domain（ent） | 転写済み。有効化時にポインタ化 |
| §6 状態遷移 | domain（inv） | 転写済み。有効化時にポインタ化 |
| §7 システム連動の承認フロー | dynamic（seq） | `approval-completion` として転写済み |
| §8 手動申請のフロー | dynamic（seq） | 未転写。該当領域を触る request の準備時に転写 |
| §9 ドメインイベント | domain | 01 §6 と同じ扱い |
| §10 設計上の判断 | なし（決定記録） | `specrunner/adr/` が正本のまま |

### docs/design/03-authorization-design.md

| 節 | 対応する型 | 扱い |
|---|---|---|
| §2 ロール定義 | domain（act） | `design/domain/actors.md` に転写済み |
| §3 操作権限マトリクス | **permission ビュー（未実装）** | 機械可読正本は `src/domain/authorization.ts`。perm ビューは named consumer（マトリクスとコード定義の突合テスト）が立つときに有効化。それまで本文書の §3 は参考情報であり、乖離時はコードが正 |
| §4 認可の判定フロー | static（`[[mod-authz]]` 責務）| 転写済み |
| §5 テナント分離 | domain（inv） | 転写済み |
| §6 監査ログ | domain | 01 §7 と同じ扱い |

### docs/design/04-architecture-design.md

| 節 | 対応する型 | 扱い |
|---|---|---|
| §3 レイヤードアーキテクチャ | static（mod / 許可依存） | `design/static/` に転写済み。**Step 1 のポインタ化対象** |
| §4 ドメインイベントの仕組み | static（`[[mod-event]]` / `[[mod-handler]]`）+ domain | 転写済み |
| §7 マルチテナント | domain（inv）+ static（`[[mod-repo]]` 責務） | 転写済み |
| §8 バッチ処理 / §10 Webhook | static（`[[mod-api]]` / `[[mod-webhook]]` 責務） | 転写済み。詳細（リトライ規則等）は実装規約として残す |
| §2 技術スタック / §5 トランザクション設計 / §6 エラーハンドリング / §9 監査ログ | なし（実装規約） | そのまま残す |

### docs/design/05-ux-journey.md

| 節 | 対応する型 | 扱い |
|---|---|---|
| 全節 | なし | scr / uc ビューに consumer が立つ見込みは低く（視覚・体験の詳細はコードが唯一の機械可読正本）、形式化しない。人が読む文書として維持するか、維持停止するかは別途判断 |

### docs/design/06-data-model-design.md

| 節 | 対応する型 | 扱い |
|---|---|---|
| §2 設計方針 | domain（inv、業務ルールに当たるもの） | 1 引合 1 案件・関連先必須などは転写済み。純粋な実装最適化（非正規化等）は型対応なし |
| §3 列挙型定義 / §4 テーブル定義 / §5 ER 図 | dat ビュー（未実装・需要駆動） | 機械可読正本は `src/infrastructure/schema.ts` + `drizzle/`。乖離時はコードが正 |

### docs/design/screens/（README + 11 画面仕様）

| 節 | 対応する型 | 扱い |
|---|---|---|
| 全ファイル | scr ビュー（立つ見込み低） | 視覚詳細はコードが正本。画面 ↔ ルート ↔ ユースケース ↔ アクター対応の骨格に突合の機械（例: ルート同期テスト）が要求された場合のみ有効化を検討。維持停止候補 |

### docs/usecases/（README + 9 本）

| 節 | 対応する型 | 扱い |
|---|---|---|
| 全ファイル | dynamic（seq）へ需要駆動で吸収 | uc ビューは未実装で追補の約束もない。act 型があるため「誰が何を達成するか」は seq で表現できる。該当領域を触る request の準備時に seq 化し、吸収した範囲をポインタ化 |

### その他

| 対象 | 扱い |
|---|---|
| docs/design/implementation-plan.md / design-implementation-plan.md | 完了済み計画の履歴文書。型対応なし。そのまま残す |
| docs/design/Clearflow.dc.html | 図表アーティファクト。型対応なし。そのまま残す |
| docs/_generated/ | spec-runner の自動生成物。対象外 |
| specrunner/adr/（ADR-001〜024） | プロジェクトの設計決定記録。当面正本のまま。loop 層の有効化時に `design/adr/`（C9 検証対象）への移管を判断 |
| src/domain/authorization.ts / src/infrastructure/schema.ts | ビュー未実装領域（権限・データモデル）の機械可読正本 |

## 導入ステップとの対応

1. **Step 1**: static の歯の結線 — `export rules` で rules.json を生成し、architecture test を CI に結線（未マップソースは fail-closed）。04 §3 のポインタ化。書き起こしと結線を同一 PR に載せる
2. **Step 2**: spec-runner の request 検証に `check --request` を結線（入口ゲート）
3. **Step 3**: domain / dynamic を有効化し、転写済み素材を正本化。上記マップの「有効化時にポインタ化」を該当 request の近傍から実施（term / inv は先行可）
4. **Step 4**: permission ビュー — `authorization.ts` との突合テストを consumer として有効化を検討（ビュー型追補の最有力候補）
