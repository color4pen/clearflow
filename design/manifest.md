---
format-version: 0
enabled: static, domain, dynamic
---

# manifest

Clearflow の設計。導入は段階的に行う（索引: docs/design-asset-map.md）。

static（モジュール構成・許可依存）の読む機械は rules export → architecture test（bun test）。domain（用語・エンティティ・不変条件・アクター）と dynamic（主要シナリオ）の読む機械は request 引用ゲート（spec-runner designLayer 経由の `check --request`）。

ビュー型は named consumer が立つまで無効（permission が最初の候補）。loop（topic / plan / state）は実装パイプライン連携が立つまで無効。
