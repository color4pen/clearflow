# Tasks: 設定画面のデザイン適用

## T-01: SettingsNav のタブ順序をデザインに合わせる

- [x] `src/app/(dashboard)/settings/SettingsNav.tsx` の `NAV_ITEMS` 配列の順序を変更する
  - 現在: Webhook / テンプレート / 承認ポリシー / ユーザー / 代理承認 / 監査ログ
  - 変更後: 承認ポリシー / テンプレート / ユーザー / 代理承認 / Webhook / 監査ログ
  ```ts
  const NAV_ITEMS = [
    { href: "/settings/policies", label: "承認ポリシー" },
    { href: "/settings/templates", label: "テンプレート" },
    { href: "/settings/users", label: "ユーザー" },
    { href: "/settings/delegations", label: "代理承認" },
    { href: "/settings/webhooks", label: "Webhook" },
    { href: "/settings/audit-logs", label: "監査ログ" },
  ];
  ```

**Acceptance Criteria**:
- SettingsNav のタブが承認ポリシー → テンプレート → ユーザー → 代理承認 → Webhook → 監査ログの順に表示される
- 既存のアクティブタブのハイライト動作が維持される

## T-02: ポリシー一覧のカラムをデザインに合わせる

- [x] `src/app/(dashboard)/settings/policies/page.tsx` のカラム構成を確認
  - 現在の 5 カラム（ポリシー名, トリガーアクション, 条件, テンプレート, 状態）はデザインの 5 カラム（ポリシー名, トリガーアクション, 条件, テンプレート名, 有効/無効トグル）と一致している
  - 「状態」カラムのヘッダーテキストを「有効/無効」に変更する
- [x] admin 用の「操作」カラム（編集リンク + 有効化/無効化ボタン）はデザインに明示記載はないが、管理操作として必要なため維持する

**Acceptance Criteria**:
- ポリシー一覧が 5 カラム（ポリシー名, トリガーアクション, 条件, テンプレート名, 有効/無効）+ admin 操作カラムで表示される
- 「状態」ヘッダーが「有効/無効」に変わっている

## T-03: テンプレート一覧のカラムをデザインに合わせる

- [x] `src/app/(dashboard)/settings/templates/page.tsx` の columns 配列から「フィールド数」カラムを削除する
  - 削除対象: `{ key: "fields", header: "フィールド数", ... }`
- [x] 残りの 3 カラム: テンプレート名, ステップ数, 作成日時
- [x] 「作成日時」のヘッダーテキストを「作成日」に変更する
- [x] admin 用の「操作」カラム（編集 + 削除）は維持する

**Acceptance Criteria**:
- テンプレート一覧が 3 カラム（テンプレート名, ステップ数, 作成日）+ 操作カラムで表示される
- 「フィールド数」カラムが表示されない

## T-04: ユーザー一覧のカラムをデザインに合わせる

- [x] `src/app/(dashboard)/settings/users/page.tsx` の columns 配列から「作成日時」カラムを削除する
  - 削除対象: `{ key: "createdAt", header: "作成日時", ... }`
- [x] 残りの 3 カラム: 名前, メールアドレス, ロール

**Acceptance Criteria**:
- ユーザー一覧が 3 カラム（ユーザー名, メールアドレス, ロール）で表示される
- ロール select の動作が維持される

## T-05: 委任ページを 2 セクション構成にする

- [x] `src/app/(dashboard)/settings/delegations/page.tsx` を 2 セクションに分割する
  - セクション 1: 「自分の委任」 — `delegations` を `session.user.id` で `fromUserId` がマッチするものにフィルタ
  - セクション 2: 「全ユーザーの委任」 — admin 向けに全委任を表示（現在の表示と同じ）
- [x] 各セクションに PageToolbar 相当のサブヘッダーを付ける（SectionCard のヘッダー部分を利用）
- [x] 委任追加フォームは現状維持（スコープ外）
- [x] データ取得ロジックは変更しない（既存の `listDelegationsAction` をそのまま使用）

**Acceptance Criteria**:
- 委任ページに「自分の委任」セクション（ログインユーザーが委任元の委任のみ）が表示される
- その下に「全ユーザーの委任」セクション（全委任）が表示される
- 委任追加フォームが維持される

## T-06: Webhook 一覧のカラムをデザインに合わせる

- [x] `src/app/(dashboard)/settings/webhooks/page.tsx` のカラムから「Secret」と「作成日時」を削除する
- [x] 「直近配信状態」カラムを追加する
  - 配信ステータスの表示: 成功（text-success）/ 失敗（text-danger）/ 処理中（text-warning）/ 配信なし（text-text-disabled）
- [x] カラム構成: URL, イベント数, 有効/無効, 直近配信状態 + 操作カラム

**Acceptance Criteria**:
- Webhook 一覧が 4 カラム（URL, イベント数, 有効/無効, 直近配信状態）+ 操作カラムで表示される
- Secret カラムと作成日時カラムが表示されない
- 直近配信状態が正しく表示される

## T-07: Webhook 一覧の「直近配信状態」取得ロジックを追加する

- [x] `src/infrastructure/repositories/webhookDeliveryRepository.ts` に `findLatestByEndpointIds(endpointIds: string[], organizationId: string)` メソッドを追加する
  - エンドポイント ID リストを受け取り、各エンドポイントの最新 delivery の status を返す
  - 返り値: `Map<string, { status: WebhookDeliveryStatus; lastAttemptAt: Date | null }>`
- [x] `src/app/actions/webhooks.ts` の `listWebhookEndpointsAction` を修正して、各 endpoint に `lastDeliveryStatus` を付与する
  - `webhookDeliveryRepository.findLatestByEndpointIds` を呼び出し、結果をマージする

**Acceptance Criteria**:
- `findLatestByEndpointIds` が各エンドポイントの最新配信ステータスを返す
- `listWebhookEndpointsAction` の返却値に `lastDeliveryStatus` フィールドが含まれる

## T-08: 監査ログに操作者フィルタと対象種別フィルタを追加する

- [x] `src/infrastructure/repositories/auditLogRepository.ts` の `findByOrganization` の `options` に `actorId?: string` と `targetType?: string` を追加する
  - 既存の `action` フィルタと同じパターンで `eq` 条件を追加する
- [x] `src/app/(dashboard)/settings/audit-logs/page.tsx` のフィルタ UI に以下を追加する
  - 「操作者」セレクト: `orgUsers` から生成。searchParams の `actorId` を使用
  - 「対象種別」セレクト: 選択肢は `request` / `step` / `policy` / `template` / `delegation` / `webhook` / `user` など。searchParams の `targetType` を使用
- [x] フィルタを 4 列グリッドに変更（操作者, 操作種別, 対象種別, 期間）
  - 期間は開始日と終了日を 1 セルにまとめるか、5 列に拡張する
- [x] CSV エクスポート URL に新しいフィルタパラメータ（`actorId`, `targetType`）を含める
- [x] `src/app/api/audit-logs/export/route.ts` でも `actorId` と `targetType` フィルタをサポートする

**Acceptance Criteria**:
- 監査ログのフィルタに「操作者」と「対象種別」が追加されている
- フィルタが正しく機能する（DB 側でフィルタされる）
- CSV エクスポートにフィルタ条件が反映される

## T-09: 監査ログのテーブルカラムをデザインに合わせる

- [x] `src/app/(dashboard)/settings/audit-logs/page.tsx` のカラム構成を調整する
  - デザイン: 日時, 操作者, 操作内容, 対象種別, 対象名
  - 現在: 日時, アクション, 対象種別, 対象 ID, 実行者, メタデータ
  - 変更: カラム順を「日時, 操作者（実行者）, アクション（操作内容）, 対象種別, 対象 ID（対象名）」に並べ替える
  - 「メタデータ」カラムを削除する
  - 「実行者」ヘッダーを「操作者」に変更
  - 「アクション」ヘッダーを「操作内容」に変更
  - 「対象 ID」ヘッダーを「対象名」に変更

**Acceptance Criteria**:
- 監査ログのテーブルが 5 カラム（日時, 操作者, 操作内容, 対象種別, 対象名）で表示される
- 「メタデータ」カラムが表示されない

## T-10: typecheck と test の確認

- [x] `bun run build` が成功する
- [x] 既存テストが green である

**Acceptance Criteria**:
- `typecheck && test` が green
