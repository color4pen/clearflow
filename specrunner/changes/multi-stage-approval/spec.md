# Spec: 複数段階承認と差し戻し・再申請

## Requirements

### Requirement: 承認ステップは stepOrder の昇順で順次進行する

承認ステップは `stepOrder` の昇順で 1 つずつ進行 SHALL する。前のステップが完了していない状態で後のステップを承認することはできない MUST。

#### Scenario: 2 段階の承認ステップで最初のステップを承認する

**Given** 2 つの承認ステップ（stepOrder: 1, 2）を持つ `pending` 状態の申請が存在し、両ステップとも `status: "pending"` である
**When** admin ユーザーが `approveRequest` を実行する
**Then** stepOrder: 1 のステップが `approved` になり、申請は `pending` のまま維持される

#### Scenario: 最後のステップを承認すると申請が approved になる

**Given** 2 つの承認ステップを持つ `pending` 状態の申請が存在し、stepOrder: 1 は `approved`、stepOrder: 2 は `pending` である
**When** admin ユーザーが `approveRequest` を実行する
**Then** stepOrder: 2 のステップが `approved` になり、申請が `approved` に遷移する

### Requirement: 承認者の role がステップの approverRole と一致しない場合は承認できない

`approveRequest` は、アクターの role がアクティブステップの `approverRole` と一致しない場合にエラーを返す SHALL。

#### Scenario: member ロールのユーザーが admin 用ステップを承認しようとする

**Given** `approverRole: "admin"` の承認ステップが `pending` である申請が存在する
**When** role が `member` のユーザーが `approveRequest` を実行する
**Then** エラーが返され、ステップと申請のステータスは変更されない

### Requirement: 差し戻し操作で申請が revision 状態に遷移する

承認者が差し戻しを実行すると、申請は `revision` 状態に遷移 SHALL し、アクティブステップの `status` が `rejected` になり `comment` が記録される MUST。

#### Scenario: 差し戻し時にアクティブステップが rejected になる

**Given** 2 つの承認ステップを持つ `pending` 状態の申請が存在し、stepOrder: 1 が `pending` である
**When** admin ユーザーが `targetStatus: "revision"`, `comment: "金額を再確認してください"` で `rejectRequest` を実行する
**Then** 申請が `revision` に遷移し、stepOrder: 1 のステップの `status` が `"rejected"`、`comment` が `"金額を再確認してください"` になる

#### Scenario: revision 状態から approved への遷移は拒否される

**Given** `revision` 状態の申請が存在する
**When** `validateTransition("revision", "approved")` を実行する
**Then** `{ ok: false }` が返される

### Requirement: resubmitRequest は認証済みユーザーのみが実行できる

`resubmitRequestAction` は認証済みユーザーであれば実行可能 SHALL とする（初期実装）。未認証アクセスはエラーを返す MUST。

#### Scenario: 未認証ユーザーが再申請を試みる

**Given** 認証されていない状態で `resubmitRequestAction` が呼び出される
**When** アクションが実行される
**Then** エラーが返され、申請のステータスは変更されない

### Requirement: 再申請は差し戻しステップ以降のみリセットする

`resubmitRequest` は `revision` 状態の申請を `pending` に戻す際、差し戻されたステップ以降のステップのみをリセット SHALL し、差し戻し前に完了したステップは維持する MUST。

#### Scenario: 2 段階目で差し戻された後の再申請

**Given** 3 つの承認ステップを持つ `revision` 状態の申請が存在し、stepOrder: 1 は `approved`、stepOrder: 2 は `rejected`（差し戻し）、stepOrder: 3 は `pending` である
**When** 申請者が `resubmitRequest` を実行する
**Then** 申請が `pending` に遷移し、stepOrder: 1 は `approved` のまま維持され、stepOrder: 2 と 3 の `status` が `pending` にリセットされ、`approvedBy`, `approvedAt`, `comment` が null になる

#### Scenario: 1 段階目で差し戻された後の再申請

**Given** 2 つの承認ステップを持つ `revision` 状態の申請が存在し、stepOrder: 1 は `rejected`（差し戻し）、stepOrder: 2 は `pending` である
**When** 申請者が `resubmitRequest` を実行する
**Then** 申請が `pending` に遷移し、stepOrder: 1 と 2 の両方の `status` が `pending` にリセットされる

### Requirement: 承認ステップのない申請は従来通りの単一承認フローで動作する

承認ステップが 0 件の申請に対する `approveRequest` は、従来通り直接 `approved` に遷移 SHALL する。後方互換性を維持する MUST。

#### Scenario: ステップなし申請の承認

**Given** 承認ステップが 0 件の `pending` 状態の申請が存在する
**When** admin ユーザーが `approveRequest` を実行する
**Then** 申請が直接 `approved` に遷移する（従来の動作と同一）

### Requirement: 最終却下は rejected 終端状態に遷移し、その後の操作を拒否する

`rejectRequest` に `targetStatus: "rejected"` を指定した場合、申請は `rejected` 終端状態に遷移 SHALL する。`rejected` 状態の申請に対して `resubmitRequest` を実行しようとするとエラーが返される MUST。

#### Scenario: 最終却下で申請が rejected 終端状態に遷移する

**Given** 承認ステップを持つ `pending` 状態の申請が存在する
**When** admin ユーザーが `targetStatus: "rejected"` で `rejectRequest` を実行する
**Then** 申請が `rejected` に遷移し、`audit_logs` に `action: "request.reject"` のレコードが作成される

#### Scenario: rejected 状態の申請への再申請は拒否される

**Given** `rejected` 状態の申請が存在する
**When** 申請者が `resubmitRequest` を実行する
**Then** エラーが返され（`revision → pending` の遷移ルールにより `rejected → pending` は許可されない）、申請のステータスは変更されない

### Requirement: 各操作はトランザクション内で実行され監査ログが記録される

ステップ承認、差し戻し、再申請の各操作は `db.transaction()` 内で実行 SHALL し、`audit_logs` にレコードが記録される MUST。

#### Scenario: ステップ承認時の監査ログ

**Given** 承認ステップを持つ `pending` 状態の申請が存在する
**When** admin ユーザーがステップを承認する
**Then** `audit_logs` に `action: "approval_step.approve"` のレコードが作成され、metadata にステップ情報（stepId, stepOrder, approverRole）が含まれる

#### Scenario: 差し戻し時の監査ログ

**Given** 承認ステップを持つ `pending` 状態の申請が存在する
**When** admin ユーザーがコメント付きで差し戻す
**Then** `audit_logs` に `action: "approval_step.reject"` のレコードが作成され、metadata に差し戻しコメントが含まれる

#### Scenario: 再申請時の監査ログ

**Given** `revision` 状態の申請が存在する
**When** 申請者が再申請する
**Then** `audit_logs` に `action: "request.resubmit"` のレコードが作成される

### Requirement: 申請作成時にテンプレートを適用して承認ステップを自動生成する

`createRequest` に `templateId` が指定された場合、テンプレートの `steps` に基づいて `approval_steps` レコードを自動生成 SHALL する。

#### Scenario: テンプレート指定での申請作成

**Given** `steps: [{ stepOrder: 1, approverRole: "admin" }, { stepOrder: 2, approverRole: "admin" }]` のテンプレートが存在する
**When** 申請者がそのテンプレートを指定して申請を作成する
**Then** 申請が `draft` で作成され、2 件の `approval_steps`（stepOrder: 1, 2, 両方 `status: "pending"`）が作成される

#### Scenario: テンプレート未指定での申請作成

**Given** テンプレートが選択されていない
**When** 申請者が申請を作成する
**Then** 申請が `draft` で作成され、`approval_steps` は 0 件（従来動作）
