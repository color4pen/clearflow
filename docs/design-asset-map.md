# 設計資産マップ

既存設計文書と `design/`（aozu 形式の設計正本）の対応の索引。aozu 導入手順（aozu リポジトリ docs/adoption.md）の Step 0 成果物であり、以後の需要駆動充填（Step 3〜4）で「どの既存文書のどの節を design/ に移すか」を引くために使う。

運用原則（adoption.md 三原則の適用）:

- 正本は**型ごと**に移る。manifest で enabled にした型が扱う事実は `design/` が正本となり、既存文書の該当節は `design/` へのポインタに置き換える（削除しない）
- enabled でない型の事実は既存文書（またはコード）が正本のまま
- 書き起こしは「その型を読む機械」の結線と同時にのみ行う

## 現状

- `design/` は **76 要素**（mod 17 / act 5 / term 7 / ent 20 / inv 23 / seq 4）。static / domain / dynamic を有効化済み（`aozu check` exit 0）
- 有効型が扱う事実は design/ が正本。既存文書の該当節のポインタ化は、該当領域を触る request の準備として需要駆動で行う（ユビキタス言語辞書と 04 §3 は移管済み）

型ごとの読む機械（結線先）:

| 型 | 読む機械 | 状態 |
|---|---|---|
| static（mod / 許可依存） | `export rules` → architecture test（`src/__tests__/static/architecture.test.ts`） | 結線済み |
| domain（term / ent / inv / act）・dynamic（seq） | `check --request`（spec-runner designLayer の request 引用ゲート） | 結線済み |
| permission ビュー | 権限マトリクスと `src/domain/authorization.ts` の突合テスト | named consumer が立ったとき（ビュー型は aozu 側未実装） |

## 資産マップ

### docs/design/ユビキタス言語辞書.md

| 節 | 対応する型 | 扱い |
|---|---|---|
| 意味・定義（エンティティ / 読み取りモデル / タイムライン概念） | domain（term / ent） | `design/domain/` に正本移管済み（ポインタ化済み） |
| コード識別子の対応 / 命名規約 / 表記規約 | なし（形式に載らない事実） | 本書が正本のまま |

### docs/design/01-domain-design.md

| 節 | 対応する型 | 扱い |
|---|---|---|
| §1 システム概要 | なし（散文） | そのまま残す |
| §2 ビジネスプロセスの全体像 | dynamic（seq） | 主要 4 シナリオは転写済み。残りは需要駆動 |
| §3 境界づけられたコンテキスト / §5 ドメイン間の関係 | static（mod）+ domain（ent 参照） | 転写済み（正本は design/）。ポインタ化は該当領域を触る request で行う |
| §4 集約定義 | domain（ent / inv） | 転写済み（正本は design/）。ポインタ化は該当領域を触る request で行う |
| §6 ドメインイベント一覧 | domain（`[[ent-domain-event]]`） | 総体は転写済み。イベント個別の形式化は evt ビュー（未実装・需要駆動） |
| §7 監査ログと派生情報 | domain（`[[ent-audit-log]]` / `[[term-timeline]]`） | 転写済み（正本は design/）。ポインタ化は該当領域を触る request で行う |
| §8 用語集 | domain（term） | 転写済み（正本は design/）。ポインタ化は該当領域を触る request で行う |

### docs/design/02-approval-design.md

| 節 | 対応する型 | 扱い |
|---|---|---|
| §2〜5 ポリシー / テンプレート / リクエスト / 委任 | domain（ent） | 転写済み（正本は design/）。ポインタ化は該当領域を触る request で行う |
| §6 状態遷移 | domain（inv） | 転写済み（正本は design/）。ポインタ化は該当領域を触る request で行う |
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
| §3 レイヤードアーキテクチャ | static（mod / 許可依存） | `design/static/` に正本移管済み（ポインタ化済み） |
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

1. **Step 1（済）**: static の歯の結線 — rules.json + architecture test（未マップソースは fail-closed）。04 §3 のポインタ化
2. **Step 2（済）**: spec-runner の request 検証に `check --request` を結線（入口ゲート。new-feature / spec-change は引用必須）
3. **Step 3（有効化まで済）**: domain / dynamic を有効化し design/ を正本化。ユビキタス言語辞書はポインタ化済み。残る節のポインタ化は該当領域を触る request の準備として継続する（定常運用）
4. **Step 4**: permission ビュー — `authorization.ts` との突合テストを consumer として有効化を検討（ビュー型追補の最有力候補。aozu 側の機構実装が前提）
