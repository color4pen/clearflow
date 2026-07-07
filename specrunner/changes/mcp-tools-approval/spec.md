# Spec: MCP ツール — 承認系（申請・承認・委任・テンプレート・ポリシー）

## Requirements

### Requirement: approval_requests ツールの list operation は承認者資格に基づいて絞り込みを行う

approval_requests ツールの `list` operation は `filter: "action_required"` を指定した場合、status=pending かつ現在ユーザーのロールに該当する pending ステップがあるリクエストのみを返す。これにより「自分が承認すべき申請」が正しく絞られることが SHALL 担保される。

#### Scenario: manager ロールの action_required フィルタ

**Given** organizationId=org-1 に pending リクエストが 2 件あり、1 件は manager ステップが pending、もう 1 件は finance ステップが pending である
**When** manager ロールのユーザーが approval_requests ツールの list を filter="action_required" で呼ぶ
**Then** manager ステップが pending のリクエストのみが返される

#### Scenario: member ロールの action_required フィルタ

**Given** organizationId=org-1 に pending リクエストが 2 件あり、1 件は manager ステップが pending、もう 1 件は承認ステップなしの legacy リクエスト（approvalSteps=[]）である
**When** member ロールのユーザーが approval_requests ツールの list を filter="action_required" で呼ぶ
**Then** ステップなし legacy リクエストのみが返される（ステップなし legacy リクエストは action_required に含まれる。manager ステップが pending のリクエストは member ロールには該当ステップがないため除外される）

### Requirement: 順序外のステップ承認は拒否される

approval_requests ツールの `approve` operation は、承認ステップの順序制約に従い、現在のステップ以外のステップの承認を拒否する。getCurrentStep が返すステップのみが承認可能であることを SHALL 担保する。

#### Scenario: 全ステップ承認済みの場合

**Given** requestId=req-1 の全承認ステップが approved 状態である
**When** admin ロールのユーザーが approve operation を呼ぶ
**Then** isError=true で「All approval steps are already completed.」を含むエラーが返される
**And** approveRequest usecase が呼ばれた結果として拒否される

### Requirement: 資格のないユーザーの承認・却下は拒否される

approval_requests ツールの `approve` と `reject` operation は、canPerform による認可チェックを行い、権限のないロールからの操作を拒否する。member ロールは approve/reject 権限を持たないため、usecase に到達せず isError で拒否されることを SHALL 担保する。

#### Scenario: member ロールが approve を試みる

**Given** member ロールのユーザーが approval_requests ツールの approve operation を呼ぶ
**When** ハンドラが canPerform(role, "approval", "approve") を評価する
**Then** isError=true で「権限がありません」が返される
**And** approveRequest usecase は呼ばれない

#### Scenario: member ロールが reject を試みる

**Given** member ロールのユーザーが approval_requests ツールの reject operation を呼ぶ
**When** ハンドラが canPerform(role, "approval", "reject") を評価する
**Then** isError=true で「権限がありません」が返される
**And** rejectRequest usecase は呼ばれない

### Requirement: システム連動承認の承認完了で後続アクションが実行される

approval_requests ツールの `approve` operation は、既存の approveRequest usecase をそのまま呼ぶ。originType="system" のリクエストが全ステップ承認完了した場合、usecase 内で approval.completed イベントが発行され、後続アクション（引合の案件化等）が実行される。MCP ツールはこの既存挙動を SHALL 維持する。

#### Scenario: システム連動承認の完了

**Given** originType="system", originTriggerAction="inquiry.convert" の承認リクエストが存在する
**When** admin ロールのユーザーが approve operation を呼び、全ステップが承認完了する
**Then** approveRequest usecase が呼ばれ、usecase 内の approval.completed イベント発行を含む既存の挙動が維持される

### Requirement: approval_requests の get でシステム連動承認の影響情報が返される

approval_requests ツールの `get` operation は、リクエストの詳細に加えて承認ステップ情報を含む。originType="system" の場合、triggerAction と triggerEntityId が結果に含まれ、エージェントが承認の影響を説明できることを SHALL 担保する。

#### Scenario: システム連動リクエストの get

**Given** originType="system", originTriggerAction="inquiry.convert", originTriggerEntityId="inq-123" のリクエストが存在する
**When** ユーザーが get operation を requestId で呼ぶ
**Then** 結果に originType="system", originTriggerAction="inquiry.convert", originTriggerEntityId="inq-123" が含まれる
**And** 結果に approvalSteps 配列が含まれる

### Requirement: bulk_approve は個別承認と同一の判定・記録になる

approval_requests ツールの `bulk_approve` operation は、既存の bulkApprove usecase を呼ぶ。bulkApprove は内部で個別の approveRequest を順次呼び出すため、個別承認と同一の判定ロジック・監査記録が適用されることを SHALL 担保する。

#### Scenario: bulk_approve が usecase を呼ぶ

**Given** requestIds=["req-1", "req-2"] で bulk_approve operation を呼ぶ
**When** bulkApprove usecase が実行される
**Then** 各リクエストに対して個別の判定結果（success/failure + reason）が返される
**And** organizationId は authInfo.extra から取得され、usecase に渡される

### Requirement: 書き込みが監査ログに記録され、他テナントに触れられない

全ての書き込み operation（create, submit, approve, reject, bulk_approve, resubmit, delegation create/deactivate, template create/update/delete, policy create/update/toggle）において、organizationId は authInfo.extra からのみ取得し、ツール引数から受け取らないことを SHALL 担保する。usecase 内で recordAudit が呼ばれるため、organizationId が正しく伝播されれば監査記録とテナント分離が担保される。

#### Scenario: 異なるテナントの organizationId がツール引数で指定できない

**Given** organizationId="org-A" の authInfo で approval_requests の create を呼ぶ
**When** createRequest usecase が呼ばれる
**Then** usecase に渡される organizationId は "org-A" である（authInfo.extra 由来）

#### Scenario: 異なるテナントの操作

**Given** organizationId="org-B" の authInfo で delegations の create を呼ぶ
**When** createDelegation usecase が呼ばれる
**Then** usecase に渡される organizationId は "org-B" である

### Requirement: delegations ツールの create は admin 以外の場合 fromUserId が自分自身でなければ拒否される

delegations ツールの `create` operation は、admin 以外のロールの場合、fromUserId が自分自身のユーザー ID と一致しない場合に拒否する。これは Server Action と同一の制約であり、SHALL 遵守される。

#### Scenario: manager が他人を fromUserId に指定

**Given** manager ロール（userId="user-mgr-1"）のユーザーが delegations の create を fromUserId="user-other" で呼ぶ
**When** fromUserId と自分の userId の一致チェックが行われる
**Then** isError=true で権限エラーが返される
**And** createDelegation usecase は呼ばれない

#### Scenario: admin が他人を fromUserId に指定

**Given** admin ロール（userId="user-admin-1"）のユーザーが delegations の create を fromUserId="user-other" で呼ぶ
**When** fromUserId と自分の userId の一致チェックが行われる
**Then** createDelegation usecase が呼ばれる（admin は制限なし）
