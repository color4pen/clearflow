# Spec: 顧客担当者（clientContact）のテナント分離を repository で強制する

## Requirements

### Requirement: findContactsByClientId は organizationId でテナント分離する

`findContactsByClientId` は `organizationId` を必須引数として受け取り、`clientContacts` を `clients` に innerJoin して `clients.organizationId` で絞り込むことにより、他組織に属する clientId の担当者を返してはならない（SHALL NOT）。

#### Scenario: 自組織の clientId で担当者を取得する

**Given** 組織 A に属する顧客 C1 が存在し、C1 に担当者 P1 が登録されている
**When** `findContactsByClientId(C1.id, orgA.id)` を呼び出す
**Then** P1 が結果に含まれる

#### Scenario: 他組織の clientId で担当者を取得しようとする

**Given** 組織 A に属する顧客 C1 が存在し、C1 に担当者 P1 が登録されている
**When** `findContactsByClientId(C1.id, orgB.id)` を呼び出す（orgB は組織 A と異なる組織）
**Then** 結果は空配列であり、P1 は返されない

### Requirement: updateContact は organizationId でテナント分離する

`updateContact` は `organizationId` を必須引数として受け取り、`clientContacts` を `clients` に innerJoin して `clients.organizationId` で絞り込むことにより、他組織に属する担当者を更新してはならない（SHALL NOT）。

#### Scenario: 自組織の担当者を更新する

**Given** 組織 A に属する顧客 C1 の担当者 P1 が存在する
**When** `updateContact(P1.id, C1.id, orgA.id, { name: "新名前" })` を呼び出す
**Then** P1 の name が「新名前」に更新され、更新後の担当者が返される

#### Scenario: 他組織の担当者を更新しようとする

**Given** 組織 A に属する顧客 C1 の担当者 P1 が存在する
**When** `updateContact(P1.id, C1.id, orgB.id, { name: "新名前" })` を呼び出す（orgB は組織 A と異なる組織）
**Then** 更新は行われず null が返される

### Requirement: deleteContact は organizationId でテナント分離する

`deleteContact` は `organizationId` を必須引数として受け取り、`clientContacts` を `clients` に innerJoin して `clients.organizationId` で絞り込むことにより、他組織に属する担当者を削除してはならない（SHALL NOT）。

#### Scenario: 自組織の担当者を削除する

**Given** 組織 A に属する顧客 C1 の担当者 P1 が存在する
**When** `deleteContact(P1.id, C1.id, orgA.id)` を呼び出す
**Then** P1 が削除され true が返される

#### Scenario: 他組織の担当者を削除しようとする

**Given** 組織 A に属する顧客 C1 の担当者 P1 が存在する
**When** `deleteContact(P1.id, C1.id, orgB.id)` を呼び出す（orgB は組織 A と異なる組織）
**Then** 削除は行われず false が返される

### Requirement: countContactsByClientIds は organizationId でテナント分離する

`countContactsByClientIds` は `organizationId` を必須引数として受け取り、`clientContacts` を `clients` に innerJoin して `clients.organizationId` で絞り込むことにより、他組織に属する clientId の担当者をカウントしてはならない（SHALL NOT）。

#### Scenario: 自組織の clientId で担当者数を取得する

**Given** 組織 A に属する顧客 C1 が存在し、C1 に担当者が 3 件登録されている
**When** `countContactsByClientIds([C1.id], orgA.id)` を呼び出す
**Then** Map の C1.id に対する値が 3 である

#### Scenario: 他組織の clientId で担当者数を取得しようとする

**Given** 組織 A に属する顧客 C1 が存在し、C1 に担当者が 3 件登録されている
**When** `countContactsByClientIds([C1.id], orgB.id)` を呼び出す（orgB は組織 A と異なる組織）
**Then** Map に C1.id のエントリが存在しない（0 件）

### Requirement: 全呼び出し元が organizationId を repository に伝搬する

repository メソッドのシグネチャ変更に伴い、全呼び出し元（usecase / action / service / RSC ページ）が session 由来の `organizationId` を引数として渡さなければならない（MUST）。TypeScript の型チェックにより伝搬漏れがコンパイル時に検出される。

#### Scenario: typecheck が通る

**Given** 全呼び出し元が organizationId を渡すよう更新されている
**When** `bun run typecheck` を実行する
**Then** 型エラーなしで完了する

### Requirement: 既存の振る舞いが維持される

担当者の追加・編集・削除・一覧の既存フローが、organizationId 引数追加後も従来どおり動作しなければならない（MUST）。

#### Scenario: 既存テストが通る

**Given** organizationId 引数の追加と呼び出し元の更新が完了している
**When** `bun test` を実行する
**Then** 全テストが pass する
