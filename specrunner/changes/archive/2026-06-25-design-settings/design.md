# Design: 設定画面のデザイン適用

## Context

設定画面（SettingsNav + 6 サブページ）を `docs/design/screens/settings.md` のデザイン仕様に合わせる。

現状:
- **SettingsNav**: タブ順が Webhook / テンプレート / 承認ポリシー / ユーザー / 代理承認 / 監査ログ（デザインと不一致）
- **DataTable コンポーネント**: `bg-bg-table-head`（#dcdde1）、`text-table-head`（11px）、`text-base-app`（12.5px）、`hover:bg-bg-surface-alt`、`border-b border-border-light` を既に適用済み。デザイン要件のスタイルトークンと一致している
- **ポリシー一覧**: 5 カラム + 操作カラム（デザインに近い構成）
- **テンプレート一覧**: 4 カラム + 操作カラム（デザインは 3 カラム）
- **ユーザー一覧**: 4 カラム（デザインは 3 カラム）
- **委任一覧**: 全委任の 1 テーブル（デザインは「自分の委任」+「全ユーザー委任」の 2 セクション）
- **Webhook 一覧**: 6 カラム（デザインは 4 カラム + 直近配信状態）
- **監査ログ**: フィルタは期間 + 操作種別のみ（デザインは操作者 + 対象種別も必要）

制約:
- フォーム（作成/編集）はスコープ外
- ビジネスロジックの変更はスコープ外
- DataTable のスタイル自体は既にデザイントークンに合致しているため、大規模な共通コンポーネント変更は不要

## Goals / Non-Goals

**Goals**:

1. SettingsNav のタブ順序をデザインに合わせる
2. 各設定画面のテーブルカラムをデザインに合わせる
3. 全テーブルのスタイルが DataTable 経由で統一されていることを確認する
4. 監査ログにフィルタ（操作者、対象種別）を追加する
5. 委任ページを 2 セクション構成にする
6. Webhook 一覧に「直近配信状態」カラムを追加する

**Non-Goals**:

- 設定画面のフォーム（作成/編集）のデザイン変更
- ビジネスロジックの変更
- DataTable コンポーネント自体のスタイル変更（既にデザインに合致）
- 新しい共通コンポーネントの作成

## Decisions

### D1: DataTable の既存スタイルをそのまま活用する

DataTable は既にデザイン要件のスタイルトークン（ヘッダー背景 `bg-bg-table-head` = #dcdde1、ヘッダーフォント `text-table-head` = 11px / font-medium、データ行 `text-base-app` = 12.5px、行ホバー `hover:bg-bg-surface-alt`、行ボーダー `border-b border-border-light`）を使用している。スタイル統一は各ページが DataTable を使っている限り自動的に達成されるため、DataTable 自体の修正は不要。

**Rationale**: 既に正しいトークンが適用されているため変更不要。不要な変更はリグレッションリスクを増やす。

**Alternatives**: DataTable にカスタムスタイル props を追加する案 → 現状で十分なため却下。

### D2: 監査ログの追加フィルタは repository 拡張で対応する

`auditLogRepository.findByOrganization` に `actorId` と `targetType` フィルタオプションを追加する。これはデータアクセス層の拡張であり、ビジネスロジックの変更ではない。

**Rationale**: フィルタ条件の追加は SQL WHERE 句の追加であり、既存の `action` フィルタと同じパターン。フロントエンドにフィルタ UI を追加し、クエリパラメータ経由で repository に渡す。

**Alternatives**: フロントエンド側でフィルタリングする案 → データ量が多い場合にパフォーマンス問題。DB 側フィルタが適切。

### D3: Webhook の「直近配信状態」は endpoint 取得時に最新 delivery を JOIN する

`listWebhookEndpointsAction` の返却値に `lastDeliveryStatus` フィールドを追加する。`webhookDeliveryRepository` に `findLatestByEndpointIds` メソッドを追加し、エンドポイント ID リストから各エンドポイントの最新配信ステータスを取得する。

**Rationale**: N+1 を避けるため、エンドポイント一覧取得時に一括で最新 delivery を取得する。

**Alternatives**: エンドポイントテーブルに `lastDeliveryStatus` カラムを追加する非正規化案 → マイグレーションが必要でスコープが膨らむ。クエリで対応する方がシンプル。

### D4: 委任ページは server component 内でデータを分割して 2 セクション描画する

現在のロジック（全委任取得 → 1 テーブル表示）を、「自分の委任」と「全ユーザー委任」に分割表示する。データ取得ロジックは変更せず、取得済みデータを `session.user.id` でフィルタリングして 2 つの DataTable に振り分ける。

**Rationale**: 既存の `listDelegationsAction` はすでに全委任を返しているため、フロントエンドでの分割で十分。新しい API は不要。

**Alternatives**: サーバー側で 2 つの API を呼ぶ案 → 不要な複雑さ。既存データの client-side filter で十分。

### D5: テンプレート一覧から「フィールド数」カラムを削除、ユーザー一覧から「作成日時」カラムを削除

デザインに記載のないカラムを削除し、デザイン通りのカラム構成にする。

**Rationale**: デザインドキュメントに忠実に従う。

### D6: Webhook 一覧から「Secret」「作成日時」カラムを削除

デザインの 4 カラム（URL, イベント数, 有効/無効, 直近配信状態）に合わせる。Secret はセキュリティ上も一覧に表示しない方が望ましい。

**Rationale**: デザイン仕様に合わせ、セキュリティ面でも改善。

## Risks / Trade-offs

- [Risk] 監査ログの `actorId`/`targetType` フィルタ追加は repository 変更を伴う → [Mitigation] 既存の `action` フィルタと同じパターンの WHERE 句追加のみ。テストで検証可能。
- [Risk] Webhook の `lastDeliveryStatus` 取得で N+1 問題 → [Mitigation] `findLatestByEndpointIds` でバッチ取得する設計を採用。
- [Risk] 委任ページの 2 セクション化でレイアウトが崩れる可能性 → [Mitigation] 既存の SectionCard + DataTable の組み合わせを使い、新規コンポーネントは作らない。

## Open Questions

なし。
