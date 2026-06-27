<!-- このファイルは specrunner rules new で生成されました。
CLI はこのファイルの中身を解釈しません。書き手の自然文で自由に書いてください。
推奨見出しは強制ではありません — 削除・追加・並べ替えは自由です。
番号 prefix (NN-) が follow-up の実行順序を決めます。
順序の方針: 重要度が高いルールを末尾に配置すると recency bias により効果的です。 -->

DB マイグレーションは drizzle-kit の生成フローだけを正とする。手作業でマイグレーションや追跡情報を作らない。これを外れると、ファイル番号・journal・適用記録の整合が崩れて `db:migrate` が壊れる。

## やめてほしいこと

- `drizzle/` ディレクトリに生のマイグレーション SQL ファイルを手で作成・配置する（`db:generate` を通さないと journal に登録されず、以降の番号がずれる）。
- `drizzle/meta/_journal.json` を手で編集する。
- DB の `drizzle.__drizzle_migrations` テーブルを手で編集する。
- 既存のマイグレーションファイルの中身や `when` を後から書き換える。

## こうしてほしいこと

- スキーマ変更（テーブル / カラム / 制約 / インデックス）は `bun run db:generate` で生成する。`drizzle/<NNNN>_<name>.sql` と journal エントリが自動で正しく作られる。
- データ移行など SQL を自分で書く必要がある場合も、`bunx drizzle-kit generate --custom` で **journal 付きの空マイグレーション**を生成してから、その中に SQL を書く。生 SQL ファイルを `drizzle/` に直接置かない。
- 生成後、`drizzle/<NNNN>_*.sql` のファイル番号が連続し、`drizzle/meta/_journal.json` のエントリと一致していることを確認する。
- マイグレーションの**適用は実装ステップで行わない**。適用は `bun run db:migrate` の責務であり、生成物（SQL と journal）をコミットするところまでが実装の範囲。

## 例外

- なし。SQL を直接書くケースも、必ず `db:generate` または `generate --custom` を経由してファイルと journal を生成する。
