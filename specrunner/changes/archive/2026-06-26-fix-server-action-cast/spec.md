# Spec: fix-server-action-cast

## Requirements

### Requirement: Server Action バインド結果はキャストなしで ActionButtons に渡される

`requests/[id]/page.tsx` は Server Action を `.bind(null, id)` でバインドした結果を、型キャスト（`as`）なしで `ActionButtons` コンポーネントに渡さなければならない（SHALL）。TypeScript の型推論により `.bind()` の戻り値が `ServerAction` 型と互換であるため、明示的キャストは不要である。

#### Scenario: バインド済み Server Action が型安全に ActionButtons へ渡される

**Given** `submitRequestAction`, `approveRequestAction`, `rejectRequestAction`, `resubmitRequestAction` が `(requestId: string, formData: FormData) => Promise<ActionResult>` のシグネチャを持つ
**When** `.bind(null, id)` でバインドして `ActionButtons` に渡す
**Then** `as` キャストなしで TypeScript の型チェックが通る

#### Scenario: 承認操作の動作が維持される

**Given** 承認リクエスト詳細ページが表示されている
**When** 提出・承認・却下・再提出のいずれかの操作を実行する
**Then** 操作が正常に処理され、キャスト削除前と同一の動作結果となる
