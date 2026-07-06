---
format-version: 0
enabled: static
---

# manifest

Clearflow の設計。導入は段階的に行う（索引: docs/design-asset-map.md）。

static（モジュール構成・許可依存）を有効化する。読む機械は rules export → architecture test（CI）。

domain（用語・エンティティ・不変条件・アクター）と dynamic（主要シナリオ）は書き起こし済みの素材が design/ 配下にあるが、読む機械（request 引用ゲート・prompt 注入）の結線とともに有効化する。ビュー型は named consumer が立つまで無効（permission が最初の候補）。loop（topic / plan / state）は実装パイプライン連携が立つまで無効。
