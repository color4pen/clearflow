# Design: ダイアログ・トーストのデザイン統一

## Context

確認ダイアログとフィードバックメッセージの実装が画面ごとにばらついている。

**確認ダイアログの現状:**

- 5 箇所で `window.confirm()` を使用: DeleteContractButton、DeleteDealButton、DeleteInquiryButton、ClientContactsSection（担当者削除）、DealHeaderActions（受注/失注）
- 2 箇所でインラインのカスタムモーダルを手書き: InquiryActions（案件化確認）、InvoiceActions（入金日確認）
- ContractStatusActions は契約完了/解除に確認なしで直接遷移している
- 各実装でスタイル・構造がばらばら

**フィードバックメッセージの現状:**

- エラー表示は `{error && <p className="text-danger text-xs">}` パターンが 30 以上のファイルに散在
- 成功メッセージは WebhookCreateForm のみ（インラインの緑背景ボックス。Webhook secret 表示を兼ねるため特殊）
- 統一されたトースト通知の仕組みが存在しない

**デザインガイドの仕様:**

- ダイアログ: オーバーレイ + 中央モーダル（max-width 420px、border-radius 4px、shadow）
- トースト: 右上固定位置、成功（緑）/ エラー（赤）

## Goals / Non-Goals

**Goals**:

- ConfirmDialog 共通コンポーネントを新設し、全画面で再利用する
- Toast コンポーネント + Context を新設し、グローバルにトースト通知を発行できるようにする
- 既存の `window.confirm()` 呼び出し（5 箇所）を ConfirmDialog に置き換える
- 既存のインラインカスタムモーダル（InquiryActions、InvoiceActions）を ConfirmDialog で統一する
- ContractStatusActions の契約完了/解除に確認ダイアログを追加する
- ボタン操作由来のアクション結果メッセージ（成功/エラー）をトーストに移行する

**Non-Goals**:

- フェードイン/フェードアウト等のアニメーション
- 複数トーストのスタック表示
- フォームバリデーションエラーのトースト化（これらはフィールド近接のインライン表示を維持する）
- WebhookCreateForm の成功メッセージのトースト化（Webhook secret 表示を兼ねるため据え置き）
- ClientContactsSection の担当者編集モーダルの ConfirmDialog 化（フルフォームのため対象外）

## Decisions

### D1: ConfirmDialog は Props 制御のコンポーネントとし、children スロットを提供する

ConfirmDialog はグローバル Context を持たず、各呼び出し元が `open` state を管理する controlled component とする。Props として `open`, `title`, `message`, `variant`, `confirmLabel`, `cancelLabel`, `loading`, `onConfirm`, `onCancel`, `children` を受け取る。

`children` スロットにより、メッセージと操作ボタンの間にカスタムコンテンツ（日付入力など）を挿入できる。InvoiceActions の入金日入力ダイアログは、このスロットを活用して ConfirmDialog 上に構築する。別コンポーネント InputDialog は作らない。

**Rationale**: ダイアログは呼び出し元のローカル UI 状態に紐づく。Context で管理すると、表示中ダイアログの状態（ローディング、入力値）の受け渡しが複雑になる。Props 制御のほうがシンプルで、既存コードの `useState(false)` + `setShow(true)` パターンとも自然に統合できる。

**Alternatives considered**: グローバル Context で `confirm()` 関数を提供する案。Promise ベースの API は直感的だが、ダイアログ内にカスタム children を渡す設計と相性が悪く、型安全性も落ちる。

### D2: Toast は Context + Provider + useToast フックで管理する

ToastContext / ToastProvider / useToast フックを提供し、任意のコンポーネントから `showToast(message, variant)` でトーストを発行できるようにする。表示中のトーストは最大 1 件とし、新しいトーストが発行されたら既存のものを即座に置き換える。3 秒経過で自動消去する。

**Rationale**: トーストは画面遷移をまたいで表示される「通知」であり、特定のコンポーネントに紐づかない。Context で管理することで、削除後の `router.push` 先でもトーストが表示される。

**Alternatives considered**: DOM Portal で直接レンダリングする案。React のライフサイクル管理から外れるため保守性が低い。

### D3: ToastProvider はダッシュボードレイアウトに配置する

`src/app/(dashboard)/layout.tsx` の children を ToastProvider でラップする。App Router のレイアウトはルート遷移をまたいで永続するため、`router.push` 後もトースト表示が維持される。

ToastProvider は client component であるため、ダッシュボードレイアウト（server component）から使う場合はクライアントコンポーネントラッパーとして分離する。

**Rationale**: トーストを発行する全コンポーネントはダッシュボード内にある。ルートレイアウト（`src/app/layout.tsx`）に置く必要はない。

### D4: エラーメッセージのトースト移行はボタン操作アクションに限定する

トーストに移行する対象は、ボタンクリックで発火するアクション（削除、ステータス遷移）の結果メッセージに限定する。フォーム送信のバリデーションエラー、セクション編集の保存エラーはインライン表示を維持する。

**Rationale**: バリデーションエラーは入力フィールドの近くに表示されるべき（ユーザビリティ）。3 秒で消えるトーストは確認しづらい。一方、アクション結果（「削除しました」「エラーが発生しました」）はグローバル通知として適切。

**Alternatives considered**: 全エラーメッセージをトースト化する案。フォーム入力時の UX が悪化するため却下。

## Risks / Trade-offs

- [Risk] トーストの 3 秒自動消去により、ユーザーがエラーメッセージを読み切れない可能性がある → Mitigation: エラートーストの色（赤）で注意を引く。将来的に手動クローズボタンの追加を検討できる余地を残す
- [Risk] ContractStatusActions に確認ダイアログを追加することで、操作ステップが 1 つ増える → Mitigation: 契約完了/解除は不可逆操作であり、確認ステップの追加は安全性の向上に寄与する
- [Risk] ConfirmDialog への移行で既存コンポーネントの state 管理パターンが変わる（window.confirm は同期、ConfirmDialog は非同期） → Mitigation: 既存の InquiryActions / InvoiceActions が同じパターンで実装済みであり、移行パターンは実証済み

## Open Questions

なし（architect 評価済みの設計判断により主要な疑問は解消済み）
