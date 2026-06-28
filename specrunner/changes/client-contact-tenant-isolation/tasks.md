# Tasks: 顧客担当者（clientContact）のテナント分離を repository で強制する

## T-01: findContactsByClientId に organizationId を追加し innerJoin で絞る

- [ ] `src/infrastructure/repositories/clientRepository.ts` の `findContactsByClientId(clientId, tx?)` のシグネチャを `findContactsByClientId(clientId, organizationId, tx?)` に変更する
- [ ] クエリを `clientContacts` 単体 SELECT から、`clientContacts` を `clients` に `innerJoin(clients, eq(clientContacts.clientId, clients.id))` し、`where` に `eq(clients.organizationId, organizationId)` を追加する構成に変更する（`findAllContactsByOrganization` と同じ join パターン）
- [ ] JSDoc の「テナント分離の前提: 呼び出し前に findById で clientId が organizationId に属することを確認すること。」を「organizationId による innerJoin でテナント分離を repository 自身で強制する。」に更新する

**Acceptance Criteria**:
- `findContactsByClientId` が `organizationId` を第 2 引数として受け取る
- クエリが `clients` テーブルへの innerJoin と `clients.organizationId` 条件を含む
- JSDoc が repository 強制の旨を記述している

## T-02: updateContact に organizationId を追加し innerJoin で絞る

- [ ] `src/infrastructure/repositories/clientRepository.ts` の `updateContact(contactId, clientId, data, tx?)` のシグネチャを `updateContact(contactId, clientId, organizationId, data, tx?)` に変更する
- [ ] Drizzle の `update().set().where()` チェーンにおいて、対象行の特定を innerJoin 相当で行う。Drizzle ORM の update は直接 join をサポートしないため、サブクエリで `clientContacts.clientId` が `clients` テーブルで `organizationId` に属することを検証する条件を追加する。具体的には `clientContacts.clientId` を `inArray` / `eq` で `clients` テーブルの該当行に限定するか、あるいは別の方式で org 条件を where に組み込む
- [ ] JSDoc の「テナント分離の前提: 呼び出し前に findById で clientId が organizationId に属することを確認すること。」を「organizationId による条件でテナント分離を repository 自身で強制する。」に更新する

**Acceptance Criteria**:
- `updateContact` が `organizationId` を第 3 引数として受け取る
- 他組織の clientId に属する担当者は更新されない（null が返る）
- JSDoc が repository 強制の旨を記述している

## T-03: deleteContact に organizationId を追加し innerJoin で絞る

- [ ] `src/infrastructure/repositories/clientRepository.ts` の `deleteContact(contactId, clientId, tx?)` のシグネチャを `deleteContact(contactId, clientId, organizationId, tx?)` に変更する
- [ ] T-02 と同様に、delete の where 条件に organizationId を組み込む（サブクエリ or exists で `clientContacts.clientId` が org 所属の clients に限定されることを保証する）
- [ ] JSDoc の「テナント分離の前提: 呼び出し前に findById で clientId が organizationId に属することを確認すること。」を「organizationId による条件でテナント分離を repository 自身で強制する。」に更新する

**Acceptance Criteria**:
- `deleteContact` が `organizationId` を第 3 引数として受け取る
- 他組織の clientId に属する担当者は削除されない（false が返る）
- JSDoc が repository 強制の旨を記述している

## T-04: countContactsByClientIds に organizationId を追加し innerJoin で絞る

- [ ] `src/infrastructure/repositories/clientRepository.ts` の `countContactsByClientIds(clientIds)` のシグネチャを `countContactsByClientIds(clientIds, organizationId)` に変更する
- [ ] クエリに `innerJoin(clients, eq(clientContacts.clientId, clients.id))` と `eq(clients.organizationId, organizationId)` の where 条件を追加する
- [ ] JSDoc に「organizationId による innerJoin でテナント分離を repository 自身で強制する。」を追加する

**Acceptance Criteria**:
- `countContactsByClientIds` が `organizationId` を第 2 引数として受け取る
- クエリが `clients` テーブルへの innerJoin と `clients.organizationId` 条件を含む
- 他組織の clientId の担当者はカウントされない

## T-05: validatePrimaryUniqueness に organizationId を伝搬する

- [ ] `src/application/services/clientContactService.ts` の `validatePrimaryUniqueness(clientId, contactId, isPrimary, tx?)` のシグネチャを `validatePrimaryUniqueness(clientId, organizationId, contactId, isPrimary, tx?)` に変更する
- [ ] 内部の `clientRepository.findContactsByClientId(clientId, tx)` 呼び出しを `clientRepository.findContactsByClientId(clientId, organizationId, tx)` に変更する

**Acceptance Criteria**:
- `validatePrimaryUniqueness` が `organizationId` を第 2 引数として受け取る
- 内部の `findContactsByClientId` 呼び出しに `organizationId` が渡されている

## T-06: listClientContacts usecase に organizationId を追加する

- [ ] `src/application/usecases/listClientContacts.ts` の `listClientContacts(clientId)` のシグネチャを `listClientContacts(clientId, organizationId)` に変更する
- [ ] 内部の `clientRepository.findContactsByClientId(clientId)` 呼び出しを `clientRepository.findContactsByClientId(clientId, organizationId)` に変更する
- [ ] JSDoc の「organizationId を引数に取らない。呼び出し前に getClient 等でテナント検証を完了させること。」を削除または「organizationId で repository がテナント分離を強制する。」に更新する

**Acceptance Criteria**:
- `listClientContacts` が `organizationId` を第 2 引数として受け取る
- 内部の `findContactsByClientId` 呼び出しに `organizationId` が渡されている

## T-07: deleteClientContact usecase の repository 呼び出しに organizationId を追加する

- [ ] `src/application/usecases/deleteClientContact.ts` の `clientRepository.deleteContact(data.contactId, data.clientId)` 呼び出しを `clientRepository.deleteContact(data.contactId, data.clientId, data.organizationId)` に変更する

**Acceptance Criteria**:
- `deleteContact` 呼び出しに `data.organizationId` が第 3 引数として渡されている

## T-08: createClientContact usecase の validatePrimaryUniqueness 呼び出しに organizationId を追加する

- [ ] `src/application/usecases/createClientContact.ts` の `validatePrimaryUniqueness(data.clientId, null, isPrimary, tx)` 呼び出しを `validatePrimaryUniqueness(data.clientId, data.organizationId, null, isPrimary, tx)` に変更する

**Acceptance Criteria**:
- `validatePrimaryUniqueness` 呼び出しに `data.organizationId` が第 2 引数として渡されている

## T-09: updateClientContactAction の repository / service 呼び出しに organizationId を追加する

- [ ] `src/app/actions/clients.ts` の `updateClientContactAction` 内の `validatePrimaryUniqueness(clientId, contactId, isPrimary)` 呼び出しを `validatePrimaryUniqueness(clientId, session.user.organizationId, contactId, isPrimary)` に変更する
- [ ] 同関数内の `clientRepository.updateContact(contactId, clientId, { ... })` 呼び出しを `clientRepository.updateContact(contactId, clientId, session.user.organizationId, { ... })` に変更する

**Acceptance Criteria**:
- `validatePrimaryUniqueness` 呼び出しに `session.user.organizationId` が渡されている
- `updateContact` 呼び出しに `session.user.organizationId` が第 3 引数として渡されている

## T-10: RSC ページの listClientContacts 呼び出しに organizationId を追加する

- [ ] `src/app/(dashboard)/clients/[id]/page.tsx` の `listClientContacts(id)` を `listClientContacts(id, organizationId)` に変更する
- [ ] `src/app/(dashboard)/deals/[id]/page.tsx` の `listClientContacts(deal.clientId)` を `listClientContacts(deal.clientId, organizationId)` に変更する
- [ ] `src/app/(dashboard)/deals/[id]/meetings/new/page.tsx` の `listClientContacts(deal.clientId)` を `listClientContacts(deal.clientId, organizationId)` に変更する
- [ ] `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/page.tsx` の `listClientContacts(deal.clientId)` を `listClientContacts(deal.clientId, organizationId)` に変更する

**Acceptance Criteria**:
- 4 つの RSC ページすべてで `listClientContacts` に `organizationId` が渡されている
- `organizationId` は各ページの session から取得した値である

## T-11: テナント分離テストの追加

- [ ] `src/__tests__/infrastructure/clientContactTenantIsolation.test.ts` を新規作成する
- [ ] repository の 4 メソッドが organizationId を引数として受け取ることを静的検証する（ソースコードの文字列マッチ。既存テストパターンに準拠）
- [ ] `findContactsByClientId` のソースに `innerJoin` と `clients.organizationId` が含まれることを検証する
- [ ] `updateContact` のソースに `organizationId` パラメータと org 条件が含まれることを検証する
- [ ] `deleteContact` のソースに `organizationId` パラメータと org 条件が含まれることを検証する
- [ ] `countContactsByClientIds` のソースに `innerJoin` と `clients.organizationId` が含まれることを検証する
- [ ] 呼び出し元（`listClientContacts`, `deleteClientContact`, `updateClientContactAction`）が `organizationId` を渡していることを静的検証する

**Acceptance Criteria**:
- テナント分離の静的検証テストが全件 pass する
- 既存テスト（`clientContactService.test.ts` 等）も pass する

## T-12: 最終検証

- [ ] `bun run typecheck` が型エラーなしで完了することを確認する
- [ ] `bun test` が全テスト pass することを確認する
- [ ] `bun run build` が成功することを確認する

**Acceptance Criteria**:
- `bun run typecheck` が exit 0 で完了する
- `bun test` が全テスト pass する
- `bun run build` が exit 0 で完了する
