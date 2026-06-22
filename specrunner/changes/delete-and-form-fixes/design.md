# Design: 削除機能とフォーム整備

## Context

各エンティティ（引き合い・案件・契約）に削除機能がなく、誤って作成したデータを除去できない。また、案件フォームに担当者フィールドがない、商談作成フォームにヒアリングデータ入力がない、商談編集UIが存在しないなど、作成と編集のフォーム非対称が残っている。

現状のコードベース:
- `inquiryRepository` / `dealRepository` / `contractRepository` のいずれにも `deleteById` メソッドが存在しない
- `deals.inquiryId` は FK 参照（nullable, onDelete 指定なし）。`meetings.dealId`、`dealContacts.dealId`、`contracts.dealId`、`invoices.contractId` も同様に onDelete 指定なし
- `NewDealForm.tsx` と `DealEditForm.tsx` に `assigneeId` / `technicalLeadId` のフォームフィールドがない。Server Action 側の zod スキーマとバックエンド usecase は既に両フィールドに対応済み
- `DealMeetingForm.tsx` にヒアリングデータ入力フィールドがない。バックエンドは `hearingData` を受け付けている
- 商談編集ページが存在しない。`updateMeetingAction` と `updateMeeting` usecase はバックエンドに存在する
- 既存の `deleteTemplate` usecase と `approvalTemplateRepository.deleteById` が削除パターンの先行実装

## Goals / Non-Goals

**Goals**:
- 引き合い・案件・契約の各 repository に `deleteById(id, organizationId, tx?)` メソッドを追加する
- 各エンティティの削除 usecase を追加する（依存エンティティの存在チェック付き）
- 削除用 Server Action を追加し、admin / manager のみに制限する
- 各詳細ページに削除ボタンを追加する（依存エンティティが0件の場合のみ表示）
- 案件作成・編集フォームに `assigneeId` / `technicalLeadId` の選択プルダウンを追加する
- 商談作成フォームに種別が hearing の場合のヒアリングデータ入力フィールドを追加する
- 商談編集ページ（`/deals/[id]/meetings/[meetingId]/edit`）を新設する
- 全削除操作で監査ログを記録する
- 静的テストで削除 usecase のテナント分離と権限チェックを検証する

**Non-Goals**:
- 編集履歴（監査ログへの変更前値記録）— 全エンティティの update に影響するため別リクエスト
- 金額入力のカンマ区切り表示
- 関連情報のフロー表示（ステップインジケーター）
- 顧客の担当者編集・削除
- soft delete の導入

## Decisions

### D1: 物理削除を採用、soft delete を却下（architect 決定済み）

**決定**: `deleteById` はアプリケーション層で依存チェック後に物理削除する。`is_deleted` フラグは使わない。

**理由**: 削除は「間違えて作った」ケースに限定される。soft delete はすべてのクエリに条件追加が必要になり、複雑さが増す。

**代替案**: soft delete（`is_deleted` フラグ）。全クエリに条件追加が必要でスコープを大きく超える。

### D2: 案件削除時に担当者（deal_contacts）を自動削除、削除ブロックを却下（architect 決定済み）

**決定**: 案件削除時に `dealContacts` を usecase 内で先に全件削除してから案件を削除する。

**理由**: 担当者は案件に従属するデータであり、案件がなくなれば不要。商談・契約のようにユーザーが独立して作成したデータとは性質が異なる。

**代替案**: 担当者が存在する場合に削除をブロック。ユーザーに手動削除の手間を強いる。

### D3: 案件削除時に引き合いステータスを new に戻す（architect 決定済み）

**決定**: 引き合い経由の案件を削除した場合、引き合いの status を `new` に戻す（`updateStatus` を使用）。

**理由**: 案件が削除されたなら案件化の事実もなくなる。`converted` のまま残ると「案件化済みだが案件が存在しない」不整合が生じる。

**代替案**: `converted` のまま残す。不整合が生じる。

### D4: 削除 usecase の依存チェック — usecase 層で実行

**決定**: 各削除 usecase は依存エンティティの存在をチェックし、存在する場合はエラーを返す。チェック通過後にトランザクション内で削除 + 監査ログ記録を行う。既存の `deleteTemplate` usecase と同じパターン。

**理由**: 複数 repository にまたがる協調は usecase 層の責務。依存チェック → トランザクション（削除 + 監査ログ）の順序で、`deleteTemplate` の確立済みパターンを踏襲する。

### D5: 案件削除の担当者全件削除 — dealContactRepository に deleteAllByDeal メソッドを追加

**決定**: `dealContactRepository` に `deleteAllByDeal(dealId, organizationId, tx?)` を追加し、`deleteDeal` usecase のトランザクション内で呼び出す。既存の `deleteByDealAndContact`（1件削除）とは別メソッド。

**理由**: 既存の `deleteByDealAndContact` はテナント検証後に `inArray` で削除するパターン。全件削除も同様に deals の organizationId を経由してテナント分離を保証する。

### D6: 削除ボタンの条件付き表示 — Server Component で判定

**決定**: 各詳細ページ（Server Component）で依存エンティティの件数を事前に取得し、0件の場合のみ削除ボタンを表示する。削除ボタンは Client Component（確認ダイアログ付き）で実装する。

**理由**: 詳細ページは既に関連データを取得しているため、追加のデータフェッチなしで条件判定可能。引き合い詳細では `deal` を、案件詳細では `dealMeetings` と `dealContracts` を、契約詳細では `InvoiceSection` で請求を既に取得している。

### D7: 商談編集ページ — DealMeetingForm を参考に EditMeetingForm を新規作成

**決定**: `EditMeetingForm.tsx` を新規作成し、既存の `DealMeetingForm.tsx` のフォーム構造を踏襲する。作成フォームとは初期値の有無が異なるため、別コンポーネントとする。フォーム送信時は `updateMeetingAction` を呼び出す。

**理由**: `DealMeetingForm` は `createMeetingAction` に依存しており、contactRegistrations の処理など作成固有のロジックを含む。共通化するより分離した方がコードの見通しが良い。

### D8: 案件フォームの担当者フィールド — Server Component でユーザー一覧を取得してフォームに渡す

**決定**: 案件作成ページ（`NewDealPage`）と編集ページ（`EditDealPage`）の Server Component で `listOrganizationUsers` を呼び出し、ユーザー一覧をフォームコンポーネントに props として渡す。フォーム側では `<Select>` プルダウンとして表示する。

**理由**: Server Component でのデータフェッチは既存パターン（例: `NewDealPage` で `clientRepository.findAllByOrganization` を取得）に一致する。

## Risks / Trade-offs

**[Risk] 削除時の依存チェックと実際の削除の間にデータが変更される可能性**
→ Mitigation: チェックと削除を同一トランザクションではなく、チェック後にトランザクション内で削除するパターン（`deleteTemplate` と同一）。TOCTOU のウィンドウは小さく、本アプリの利用規模では問題にならない。

**[Risk] 案件削除時の引き合いステータス復帰と担当者削除が失敗した場合のデータ不整合**
→ Mitigation: 全操作をトランザクション内で実行する。部分的な状態変更は起こらない。

**[Trade-off] EditMeetingForm を DealMeetingForm と別コンポーネントにすることでコード重複が増える**
→ 作成フォームと編集フォームは初期値の設定・送信先アクション・contactRegistrations の有無が異なるため、共通化の複雑さを避け、コードの可読性を優先する。

## Open Questions

なし（architect 評価済みの設計判断により主要な論点は解決済み）。
