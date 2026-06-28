# 顧客担当者（clientContact）のテナント分離を repository で強制する

## Meta

- **type**: spec-change
- **slug**: client-contact-tenant-isolation
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 既存の「全リポジトリ操作を organizationId で絞る」確立済みパターンに clientContact を合わせるだけで、新しい port/adapter や設計選択の導入は無いため false -->

## 背景

本システムはマルチテナントで、テナント分離は「全リポジトリ操作を organizationId で絞る」ことで担保する設計（認可設計 docs/design/03-authorization-design.md §5「テナント分離はインフラストラクチャ層（リポジトリ）で強制する」）。しかし顧客担当者（clientContact）系のメソッドだけは clientId のみで絞り、organizationId を条件に含めていない。テナント分離は「呼び出し側が事前に親 client を `findById(clientId, organizationId)` で検証する」という caller 規約に依存している。現状の呼び出し側は全てこの規約を守っているため実害は無いが、テナント分離の最終防衛線が repository ではなく caller の規律に置かれており、将来呼び出しが追加された際にクロステナントのリグレッションを起こし得る。最終防衛線を repository に戻す。

## 現状コードの前提

- src/infrastructure/repositories/clientRepository.ts:139 `findContactsByClientId(clientId)` — clientContacts を clientId のみで絞る。organizationId 条件なし。JSDoc に「呼び出し前に findById で確認すること」と明記
- src/infrastructure/repositories/clientRepository.ts:174 `updateContact(contactId, clientId, data)` — (id, clientId) で絞る。organizationId なし
- src/infrastructure/repositories/clientRepository.ts:200 `deleteContact(contactId, clientId)` — (id, clientId) で絞る。organizationId なし
- src/infrastructure/repositories/clientRepository.ts:155 `countContactsByClientIds(clientIds)` — clientId の inArray のみ。organizationId なし
- src/infrastructure/repositories/clientRepository.ts:222 `findAllContactsByOrganization(organizationId)` — clientContacts を clients に innerJoin し `clients.organizationId` で絞る（既に org 分離済みの正しい例。これに倣う）
- clientContacts テーブルは organization_id カラムを持たない（src/infrastructure/schema.ts の clientContacts 定義）。org は親 clients 経由でのみ辿れる
- 呼び出し側は親 client を org スコープで検証してから上記を呼ぶ規約（例 src/application/usecases/deleteClientContact.ts、createClientContact、src/app/actions/clients.ts の updateClientContactAction）

## 要件

1. clientContact 系のデータアクセス（`findContactsByClientId` / `updateContact` / `deleteContact` / `countContactsByClientIds`）に organizationId を必須引数として加え、clientContacts を clients に join して `clients.organizationId` で絞る（`findAllContactsByOrganization` と同じ方式）。これによりテナント分離を repository 自身で強制し、caller 規約依存を解消する。clientContacts へのカラム追加・マイグレーションはしない（org は親 clients 経由で解決し、既存データに触らない）
2. 上記メソッドの全呼び出し元（usecase / action）を、session 由来の organizationId を渡すよう更新する。呼び出し側に既にある親 client の org 検証は多重防御として維持してよい
3. JSDoc の「呼び出し前に findById で確認すること」という caller 規約の記述を、repository が organizationId で強制する旨に更新する

## スコープ外

- clientContacts テーブルへの organization_id カラム追加（join で解決するため不要。データ移行を避ける）
- clientContact 以外のリポジトリ（既に organizationId で絞っている）
- 認可（ロール権限）の変更（本リクエストはテナント分離のみ。ロール認可は別リクエスト authorization-consistency で扱う）

## 受け入れ基準

- [ ] `findContactsByClientId` / `updateContact` / `deleteContact` / `countContactsByClientIds` が organizationId を受け取り、他組織に属する clientId / contactId を渡しても結果が返らない・更新/削除されないことをテストで固定する
- [ ] 上記メソッドの呼び出し元が全て organizationId を渡している（`typecheck` green）
- [ ] 顧客担当者の追加・編集・削除・一覧の既存の振る舞いが従来どおりであることをテストで確認する
- [ ] 依存方向 actions/RSC → usecases → domain / infrastructure を遵守する
- [ ] 既存テスト無変更で `bun test` green、`typecheck` green、`bun run build` 成功

## architect 評価済みの設計判断

1. **org 解決は join、カラム追加はしない** — clientContacts に organization_id を非正規化追加する案は、スキーマ変更＋既存データのバックフィルが必要で「既存データに触らない」方針に反する。clients への innerJoin で `clients.organizationId` を絞れば、`findAllContactsByOrganization` と同じ確立済みの方式で、スキーマ変更なしに repository 強制を実現できる。
2. **caller の事前検証は残す（多重防御）** — repository で強制した後も usecase 側の親 client org 検証は撤去しない。3層防御（action→usecase→repository）の一貫性を保つ。
3. **認可とテナント分離を分離** — 本リクエストはテナント分離（organizationId）のみを対象とし、ロール認可は別リクエストで扱う。1 リクエストの収束ループを小さく保つ。
