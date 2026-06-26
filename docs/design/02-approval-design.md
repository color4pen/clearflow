# 承認ワークフロー設計

## 1. 概要

承認ワークフローは、業務プロセスの任意の地点に挿入可能な承認ゲートを提供する横断的な仕組みである。

承認には 2 つの起動パターンがある:

| パターン | 説明 | 例 |
|---|---|---|
| **手動申請** | ユーザーが自ら承認を申請する。承認それ自体が目的 | 経費申請、稟議 |
| **システム連動** | ドメインアクションに応じて自動で承認が生成される。承認は元のアクションの実行を制御するゲートとして機能する | 仲介経由の案件化、高額契約の締結 |

承認の設計は以下の 3 つの関心事を分離する:

```
承認ポリシー（いつ承認が必要か）
    ↓ 参照
承認テンプレート（どう承認するか）
    ↓ 実体化
承認リクエスト（個別の承認案件）
```

## 2. 承認ポリシー (Approval Policy)

どのドメインアクションが、どの条件下で承認を必要とするかを定義する。ポリシーは明示的に一覧・管理できる設定であり、暗黙の条件分岐としてコードに埋め込まれるものではない。

**エンティティ: ApprovalPolicy**

| 属性 | 型 | 必須 | 説明 |
|---|---|---|---|
| id | ID | Yes | |
| organizationId | ID | Yes | テナント識別子 |
| name | string | Yes | ポリシー名 |
| description | string | No | ポリシーの説明 |
| triggerAction | TriggerAction | Yes | 承認を起動するドメインアクション |
| condition | PolicyCondition | No | 承認を要求する条件（null の場合は常に承認を要求） |
| templateId | ID | Yes | 使用する承認テンプレート |
| isActive | boolean | Yes | 有効/無効 |
| createdAt | datetime | Yes | |

**値オブジェクト: TriggerAction**

承認を起動するドメインアクションの識別子。

```
inquiry.convert       引合の案件化
contract.create       契約の作成
contract.cancel       契約の解除
```

新たな業務ポイントに承認を追加する場合は、TriggerAction を拡張する。

**値オブジェクト: PolicyCondition**

ポリシーが承認を要求する条件。ドメインアクションの実行コンテキストに対して評価される。

| 属性 | 型 | 説明 |
|---|---|---|
| field | string | 評価対象のフィールド |
| operator | ComparisonOperator | 比較演算子 |
| value | string \| number | 比較値 |

```
ComparisonOperator: eq | neq | gt | gte | lt | lte | in
```

**例: ポリシーの設定**

| ポリシー名 | TriggerAction | Condition | テンプレート |
|---|---|---|---|
| 仲介案件の承認 | inquiry.convert | source eq "agent_service" | 仲介費用承認 |
| 高額契約の承認 | contract.create | amount gte 5000000 | 高額契約承認 |
| 全契約の確認 | contract.create | (なし — 常に) | 契約確認 |

同一の TriggerAction に複数のポリシーが該当する場合、**すべてのポリシーが評価** され、該当するすべての承認リクエストが生成される。

**ポリシーの評価順序**

1. ドメインアクションが実行される
2. 該当する TriggerAction を持つ有効なポリシーをすべて取得する
3. 各ポリシーの condition をアクションのコンテキストに対して評価する
4. 条件に合致するポリシーごとに承認リクエストを生成する
5. 1 つ以上の承認リクエストが生成された場合、元のアクションはブロックされる
6. すべての承認リクエストが承認された時点で、元のアクションが実行される

## 3. 承認テンプレート (Approval Template)

承認プロセスの手順を定義する。誰が、何段階で承認するかのみを定義し、ビジネスロジックは持たない。

**集約ルート: ApprovalTemplate**

| 属性 | 型 | 必須 | 説明 |
|---|---|---|---|
| id | ID | Yes | |
| organizationId | ID | Yes | テナント識別子 |
| name | string | Yes | テンプレート名 |
| description | string | No | テンプレートの説明 |
| steps | StepDefinition[] | Yes | 承認ステップの定義（順序付き） |
| formFields | FormField[] | No | 申請時に入力するフォームの定義 |
| createdAt | datetime | Yes | |

**値オブジェクト: StepDefinition**

| 属性 | 型 | 必須 | 説明 |
|---|---|---|---|
| order | number | Yes | 実行順序 |
| name | string | Yes | ステップ名（例: 部長承認、経理確認） |
| approverRole | Role | No | 承認者のロール（ロール指定の場合） |
| approverId | ID | No | 承認者のユーザー ID（個人指定の場合） |
| deadlineDays | number | No | 承認期限（日数） |

- `approverRole` と `approverId` のいずれか一方は必須。
- `approverRole` を指定した場合、そのロールを持つユーザーであれば誰でも承認できる。
- `approverId` を指定した場合、指定されたユーザーのみが承認できる。

**値オブジェクト: FormField**

手動申請時にユーザーが入力するフォームのフィールド定義。

| 属性 | 型 | 必須 | 説明 |
|---|---|---|---|
| key | string | Yes | フィールド識別子 |
| label | string | Yes | 表示ラベル |
| type | FieldType | Yes | フィールドの型 |
| required | boolean | Yes | 必須か |
| options | string[] | No | 選択肢（type が select の場合） |

```
FieldType: text | number | date | textarea | select
```

## 4. 承認リクエスト (Approval Request)

個別の承認案件。テンプレートから承認ステップが実体化される。

**集約ルート: ApprovalRequest**

| 属性 | 型 | 必須 | 説明 |
|---|---|---|---|
| id | ID | Yes | |
| organizationId | ID | Yes | テナント識別子 |
| templateId | ID | Yes | 元となったテンプレート |
| title | string | Yes | 承認リクエストの件名 |
| creatorId | ID | Yes | 申請者 |
| status | RequestStatus | Yes | 承認リクエストの状態 |
| formData | FormData | Yes | 申請時の入力データ（デフォルト: 空オブジェクト） |
| origin | RequestOrigin | Yes | 起動パターン（手動 or システム連動） |
| createdAt | datetime | Yes | |

**値オブジェクト: RequestOrigin**

承認リクエストの起動元を示す。

```typescript
// 手動申請
{ type: "manual" }

// システム連動
{
  type: "system",
  policyId: ID,           // 適用されたポリシー
  triggerAction: string,   // トリガーとなったアクション
  triggerEntityId: ID,     // 対象エンティティの ID
}
```

システム連動の場合、`triggerAction` と `triggerEntityId` により、承認完了後にどのアクションを実行すべきかが特定される。

**値オブジェクト: FormData**

```
Record<string, { label: string; value: unknown }>
```

テンプレートの `formFields` に基づいて入力されたデータ。

**値オブジェクト: RequestStatus**

```
draft | pending | approved | rejected | revision | expired
```

**エンティティ: ApprovalStep**

承認リクエスト内の個々の承認ステップ。テンプレートの StepDefinition から実体化される。

| 属性 | 型 | 必須 | 説明 |
|---|---|---|---|
| id | ID | Yes | |
| requestId | ID | Yes | 承認リクエスト |
| order | number | Yes | 実行順序 |
| name | string | Yes | ステップ名 |
| approverRole | Role | No | 承認者ロール |
| approverId | ID | No | 承認者ユーザー |
| status | StepStatus | Yes | ステップの状態 |
| approvedBy | ID | No | 実際に承認/却下したユーザー |
| comment | string | No | 承認/却下時のコメント |
| deadline | datetime | No | 承認期限 |
| approvedAt | datetime | No | 承認/却下の日時 |

```
StepStatus: pending | approved | rejected
```

## 5. 承認委任 (Approval Delegation)

承認者が一時的に承認権限を他のユーザーに委任する仕組み。休暇や出張など、承認者が不在の期間に承認が滞ることを防ぐ。

**エンティティ: ApprovalDelegation**

| 属性 | 型 | 必須 | 説明 |
|---|---|---|---|
| id | ID | Yes | |
| organizationId | ID | Yes | テナント識別子 |
| fromUserId | ID | Yes | 委任元ユーザー |
| toUserId | ID | Yes | 委任先ユーザー |
| fromUserRole | Role | Yes | 委任元のロール（このロールでの承認権限を委任する） |
| startDate | date | Yes | 委任開始日 |
| endDate | date | Yes | 委任終了日 |
| isActive | boolean | Yes | 有効/無効 |
| createdAt | datetime | Yes | |

**委任の適用ルール**

1. 承認ステップの `approverRole` が委任の `fromUserRole` と一致する場合に適用される。
2. 委任期間（`startDate` 〜 `endDate`）内かつ `isActive = true` の場合に有効。
3. 委任先ユーザーは、委任元ユーザーと同じ承認権限で承認操作を行える。
4. 委任が複数存在する場合は、最も新しい（`startDate` が最新の）委任が優先される。
5. 委任は承認・却下の両方に適用される。

## 6. 状態遷移

### 承認リクエストの状態遷移

```
draft ──→ pending         申請を提出した
pending ──→ approved      全ステップが承認された
pending ──→ rejected      いずれかのステップが却下された
pending ──→ revision      差し戻しされた（再提出を求める）
pending ──→ expired       承認期限を超過した
revision ──→ pending      修正して再提出した
```

- `approved`、`rejected`、`expired` は終端状態。
- `draft` は手動申請でのみ使用される。システム連動の場合は `pending` から開始する。

### 承認ステップの処理順序

1. ステップは `order` の昇順に処理される。
2. 現在のステップが `approved` になるまで、次のステップの処理は開始されない。
3. いずれかのステップが `rejected` になった場合、リクエスト全体が `rejected` または `revision` になる。
4. 全ステップが `approved` になった時点で、リクエスト全体が `approved` になる。

### 承認期限

- 各ステップに `deadline` が設定されている場合、その期限を過ぎたステップは期限切れとなる。
- 期限切れのステップが存在するリクエストは `expired` に遷移する。
- 期限切れの検知は定期的なバッチ処理で行う。

## 7. システム連動の承認フロー

システム連動の承認は、ドメインアクションの実行をブロックし、承認完了後に実行を再開する仕組みである。

### フロー詳細

```
1. ユーザーがドメインアクションを実行する
   （例: 引合を案件化する）

2. システムがポリシーを評価する
   - TriggerAction が一致するポリシーを検索
   - 条件に合致するポリシーを特定

3a. 該当ポリシーなし
   → アクションを即座に実行する

3b. 該当ポリシーあり
   → 承認リクエストを生成する（status: pending）
   → 元のアクションは実行しない
   → ユーザーに「承認待ち」であることを通知する

4. 承認者が承認/却下する

5a. 全承認リクエストが approved
   → 元のドメインアクションを自動実行する
   （例: 案件を生成する）

5b. いずれかが rejected
   → 元のアクションは実行されない
   → 申請者に却下を通知する
```

### ブロック中の制約

- システム連動で承認待ちの間、対象エンティティの状態は変更されない。
  - 例: 引合は `new` のまま、案件化は行われない。
- 同一エンティティ・同一アクションに対する重複した承認リクエストは生成しない。

### 承認後アクションの実行

承認リクエストの `origin` に記録された `triggerAction` と `triggerEntityId` に基づいて、対応するドメインアクションを実行する。

| triggerAction | 承認後の実行内容 |
|---|---|
| inquiry.convert | 引合を converted に遷移し、案件を生成する |
| contract.create | 契約を作成する |
| contract.cancel | 契約を cancelled に遷移する |

承認後アクションの実行は、承認リクエストの状態遷移と同一トランザクション内で行い、不整合を防ぐ。

## 8. 手動申請のフロー

```
1. ユーザーがテンプレートを選択する
2. フォームに必要事項を入力する
3. 下書き保存（draft）または直接提出（pending）
4. 承認者が順次承認/却下する
5. 全ステップ完了で approved / いずれか却下で rejected
```

手動申請には `origin: { type: "manual" }` が設定され、承認後に自動実行されるドメインアクションはない。

## 9. ドメインイベント

| イベント | 発生条件 | 後続処理 |
|---|---|---|
| ApprovalRequested | 承認リクエストが pending になった | 承認者への通知 |
| ApprovalStepApproved | ステップが承認された | 次ステップの承認者への通知 |
| ApprovalStepRejected | ステップが却下された | 申請者への通知 |
| ApprovalCompleted | 全ステップが承認されリクエストが approved になった | システム連動の場合は承認後アクションの実行。手動の場合は申請者への通知 |
| ApprovalRejected | リクエストが rejected になった | 申請者への通知。システム連動の場合は対象アクションの取り消し |
| ApprovalExpired | リクエストが expired になった | 申請者・承認者への通知 |

## 10. 設計上の判断

### ポリシーとテンプレートを分離する理由

「どの場面で承認が必要か（ポリシー）」と「どう承認するか（テンプレート）」を分離することで:

- 承認の発生条件が一覧として可視化され、管理可能になる
- 同一のテンプレートを異なるポリシーで再利用できる
- テンプレート内に条件分岐を持ち込む必要がなくなる
- 組織ごとに異なるポリシーを設定できる

### 手動申請とシステム連動を統一する理由

どちらのパターンも「承認リクエスト → ステップの順次処理 → 承認/却下」という同一のプロセスに帰着する。起動パターンの違いは `origin` で表現し、承認プロセス自体は共通化する。これにより:

- 承認リクエストの一覧画面で手動・自動を問わず一元管理できる
- 承認者にとって承認操作のインターフェースが統一される
- 委任・期限切れ等の横断的な仕組みが両方に適用される
