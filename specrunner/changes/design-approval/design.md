# Design: 承認画面のデザイン適用

## Context

承認一覧・詳細画面のレイアウトをデザイン仕様（`docs/design/screens/approval.md`）に合わせて更新する。

現状の実装:

- **一覧** (`requests/page.tsx`): `BulkApprovalPanel` 内の 10 カラムテーブル（No., 件名, 金額, 状態, 承認経路, 申請者, 申請日, 期限, 操作 + 一括チェック）。タブなし。全件表示。
- **詳細** (`requests/[id]/page.tsx`): `PageToolbar` + `SectionCard` レイアウト。承認ステップは `DataTable`（横テーブル）で表示。承認/却下ボタンは `requestStatus` のみで表示判定。`originType` による表示分岐なし。

デザイン仕様が要求する主な差分:

1. 一覧にタブ（要対応/自分の申請/すべて）を追加
2. テーブルを 5 カラムに簡素化（件名, 申請者, ステータス, 手動/自動, 申請日）
3. 詳細にステータスバッジ付きヘッダー・システム連動バナー・縦ステッパー UI を導入
4. 承認/却下ボタンを該当ステップの承認者のみに表示

既存の型・ユースケース状況:

- `Request` モデルに `originType: OriginType`（`"manual" | "system"`）、`originTriggerAction`、`originTriggerEntityId` が存在
- `listRequests(organizationId)` は `RequestWithSteps[]` を返す（`approvalSteps: ApprovalStepSummary[]` を含む）
- `getRequest` + `getApprovalSteps` で詳細データを取得
- `approveRequest` は `comment` パラメータを受け取らない
- `rejectRequest` は `comment` パラメータを受け取る
- `getInquiry` ユースケースは存在しない（`inquiryRepository.findById` は存在）
- `getContract` ユースケースは存在する
- `canApprove(step, actorRole)` ドメインサービスが role ベースの承認権限チェックを提供

## Goals / Non-Goals

**Goals**:

- 一覧に 3 タブ切替を導入し、ロールに応じたデフォルトタブと認可制御を実装する
- テーブルカラムを 5 列（件名, 申請者, ステータスバッジ, 手動/自動ラベル, 申請日）に変更する
- 詳細ページにステータスバッジ付きヘッダー、システム連動バナー、縦ステッパー UI、承認者限定の操作ボタンを実装する
- 既存の一括承認機能を維持する

**Non-Goals**:

- 手動申請フォーム（`requests/new/page.tsx`）のデザイン変更
- `BulkApprovalPanel` コンポーネントの廃止
- ビジネスロジック（usecase / domain service）の変更
- `approveRequest` ユースケースへの `comment` パラメータ追加

## Decisions

### D1: タブ切替は URL searchParams で制御し、Server Component でフィルタリングする

**選択**: `?tab=action-required|my-requests|all` の URL パラメータを使用。`page.tsx`（Server Component）でパラメータを読み取りサーバーサイドでフィルタリングし、フィルタ済みデータをクライアントコンポーネントに渡す。タブ UI は `<Link>` で実装する。

**却下**: クライアントサイドでの全件フィルタリング（`useState` でタブ管理し全データをクライアントに送る方式）

**Rationale**: Server Component でフィルタリングすることで、クライアントに渡すデータ量を最小限にできる。URL パラメータによりブックマーク・共有も可能。タブ切替は `<Link>` コンポーネントで実現でき、追加のクライアント JS が不要。

### D2: タブ認可は Server Component でサイレントフォールバック方式とする

**選択**: `?tab=all` で admin/manager 以外がアクセスした場合、デフォルトタブにフォールバックする。403 は返さない。

**却下**: 403 エラーレスポンスを返す方式

**Rationale**: デザイン仕様では「すべて」タブ自体が admin/manager 以外に表示されない。URL 直打ちへの対処としてはサイレントフォールバックが UX に優れる。Server Action の認可チェックとは異なり、閲覧権限の制御のためエラーよりフォールバックが適切。

### D3: 「要対応」タブのフィルタは ApprovalStepSummary の approverRole で判定する

**選択**: `RequestWithSteps.approvalSteps` 内の pending ステップの `approverRole` がログインユーザーの `role` に一致するリクエストを抽出する。

**却下**: 新規 `listRequestsForApprover` ユースケースの作成 / `approverId` ベースのみのフィルタ

**Rationale**: 既存の `listRequests` が返す `ApprovalStepSummary` に `approverRole` と `status` が含まれているため、追加のデータ取得なしでフィルタ可能。`ApprovalStepSummary` は `approverId` を含まないため、role ベースで判定する。委任（delegation）を考慮したフィルタは将来の拡張として位置付ける。

### D4: 承認ステップの表示を DataTable から縦ステッパーに変更する

**選択**: 新規コンポーネント `ApprovalStepper`（Server Component）を作成し、縦のタイムライン UI で各ステップを表示する。各ステップのアイコン状態: 待機（グレー丸）・承認済み（緑チェック）・却下（赤×）。現在のステップはボーダーハイライトで強調。

**却下**: 既存 `DataTable` コンポーネントのスタイルカスタマイズ

**Rationale**: architect 評価済みの設計判断 #1 に基づく。ステッパー UI は承認フローの進行方向（上→下）を直感的に表現でき、各ステップの状態を視覚的に区別しやすい。`DataTable` は一覧向きの汎用コンポーネントであり、フロー可視化には不向き。

### D5: システム連動バナーのエンティティ名取得は usecase 経由で行う

**選択**: `getInquiry` ユースケースを新規作成（`inquiryRepository.findById` のラッパー）し、`page.tsx` から呼び出す。`originTriggerAction` に応じて取得先を分岐:

- `inquiry.convert` → `getInquiry` で引合名を取得
- `contract.create` / `contract.cancel` → 既存 `getContract` で契約名を取得

**却下**: page.tsx から repository を直接呼び出す方式

**Rationale**: architect 評価済みの設計判断 #2 に基づき、ユースケース経由でのデータ取得を維持する。`getInquiry` は `inquiryRepository.findById` の薄いラッパーであり、ビジネスロジックの変更には該当しない。

### D6: 承認/却下ボタンの表示判定は Server Component で行う

**選択**: `page.tsx` で現在の pending ステップの `approverRole` とセッションユーザーの `role` を比較し、一致時のみ操作ボタンを表示する。判定には `canApprove` ドメインサービス（純関数）を利用する。実際の認可は Server Action 側でも二重チェックされる。

**却下**: クライアントサイドで判定する方式 / 常にボタンを表示してエラーハンドリングで対応する方式

**Rationale**: 承認権限の判定結果で UI を出し分けるため、Server Component で判定してクライアントに渡す。`canApprove` は純関数のため page.tsx からの呼び出しに問題なし。Server Action の認可チェックと合わせて二重防御となる。

### D7: 承認コメントは UI のみ実装し approve への送信は保留する

**選択**: 承認/却下操作にコメントテキストフィールドを表示する。却下は既存の `rejectRequest` が `comment` を受け付けるためそのまま送信する。承認は `approveRequest` が `comment` を受け付けないため UI フィールドは表示するが値は送信しない。

**却下**: `approveRequest` に `comment` を追加する

**Rationale**: request の実装方針に明記:「受け取らない場合はスコープ外とする（UI にフィールドは表示するがバックエンドへの送信は保留）」。ビジネスロジック変更はスコープ外。

## Risks / Trade-offs

**[Risk]** 「要対応」タブの approverRole ベースフィルタは delegation を考慮しない
→ **Mitigation**: delegation を持つ admin/manager は「すべて」タブで確認可能。MVP では role ベースで十分。将来的に `listRequestsForApprover` ユースケースを追加すればフィルタ精度を改善できる。

**[Risk]** 5 カラムへの変更で金額・期限・承認経路・操作列が失われる
→ **Mitigation**: これらの情報は詳細画面で確認可能。デザイン仕様に準拠した変更であり、情報の集約はデザイン上の意図。一括承認チェックボックスは「要対応」タブで維持する。

**[Risk]** 既存の差し戻し（revision）ボタンがデザイン仕様に含まれていない
→ **Mitigation**: デザイン仕様の操作定義は「承認する」「却下する」の 2 操作のみ。差し戻し機能自体はバックエンド（`rejectRequest` の `targetStatus: "revision"`）に残るため、将来のデザイン拡張で復活可能。現段階ではデザイン仕様に従い、pending 状態の操作を 2 ボタンに簡素化する。

## Open Questions

なし — architect 評価済みの設計判断と request の実装方針により、技術的判断は解決済み。
