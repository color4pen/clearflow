# Domain Invariants Review — client-contact-tenant-isolation — iter 001

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
- Findings table MUST have exactly 7 columns in this order:
  # | Severity | Category | File | Description | How to Fix | Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
-->

- **verdict**: approved
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | LOW | audit-log | `src/application/usecases/deleteClientContact.ts` | `deleteContact` と `recordAudit` が同一トランザクション内で実行されていない。認可設計 §6「監査ログの記録は、対象操作と同一トランザクション内で行う」に反する。削除は成功しても audit 記録が失敗した場合、監査ログに穴が生じる。**本変更が導入した問題ではなく、変更前から存在する pre-existing 問題**（本変更で変更されたのは `deleteContact` の引数に `data.organizationId` を追加したのみ）。 | `db.transaction(async (tx) => { await clientRepository.deleteContact(..., tx); await recordAudit({...}, tx); })` に包む。本リクエストのスコープ外のため、別リクエストで対応することを推奨。 | no |
| 2 | LOW | audit-log | `src/app/actions/clients.ts` `updateClientContactAction` | `updateClientContactAction` には `recordAudit` 呼び出しが存在しない。担当者の更新操作が監査ログに記録されない。**本変更が導入した問題ではなく pre-existing**（本変更で変更されたのは `validatePrimaryUniqueness` と `updateContact` への `organizationId` 引数追加のみ）。 | `updateContact` の後に `recordAudit({ action: "client_contact.update", ... })` を追加する（別リクエスト推奨）。 | no |
| 3 | LOW | invariant | `src/app/actions/clients.ts` `updateClientContactAction` | `validatePrimaryUniqueness` と `updateContact` がトランザクション外で逐次呼び出されており、isPrimary 一意性に TOCTOU が潜在する（`createClientContact` はトランザクション済み）。**pre-existing 問題**。spec-review-result-001 Finding #3 でも指摘済み。 | `db.transaction` に包んで原子性を確保（別リクエスト推奨）。 | no |

## Invariant Verification

### テナント分離の不変条件

| 対象メソッド | 実装方式 | 他テナントの遮断 | 判定 |
|---|---|---|---|
| `findContactsByClientId` | `clientContacts` → `clients` innerJoin + `clients.organizationId` 条件 | ✅ 他 org の clientId では空配列 | PASS |
| `countContactsByClientIds` | `clientContacts` → `clients` innerJoin + `clients.organizationId` 条件 | ✅ 他 org の clientId はカウントされない | PASS |
| `updateContact` | `inArray(clientContacts.clientId, SELECT id FROM clients WHERE organizationId = ?)` サブクエリ（Drizzle ORM の UPDATE/JOIN 非対応のため）| ✅ 他 org の担当者は更新されない（null 返却）| PASS |
| `deleteContact` | 同上サブクエリ方式 | ✅ 他 org の担当者は削除されない（false 返却）| PASS |

- `findAllContactsByOrganization`（既存 / 変更なし）と同一の設計方針（clients への join）に統一された。確立済みパターンへの準拠は正しい。
- `updateContact` / `deleteContact` のサブクエリ内 `db` 参照（`queryRunner` でなく `db` を使用）は Drizzle ORM の仕様上問題なし。サブクエリは SQL フラグメントとして親クエリに埋め込まれ、外側の `queryRunner` によって実行される。

### organizationId の出所検証

すべての呼び出し箇所で `organizationId` は `session.user.organizationId`（Auth.js セッション由来）から取得されており、クライアント入力を経由しない。サーバーサイドで管理され改ざん不可。

| 呼び出し元 | organizationId の出所 | 判定 |
|---|---|---|
| `clients/[id]/page.tsx` | `session!.user.organizationId` | ✅ |
| `deals/[id]/page.tsx` | `session!.user.organizationId` | ✅ |
| `deals/[id]/meetings/new/page.tsx` | `session!.user.organizationId` | ✅ |
| `deals/[id]/meetings/[meetingId]/page.tsx` | `session!.user.organizationId` | ✅ |
| `updateClientContactAction` | `session.user.organizationId` | ✅ |
| `deleteClientContactAction` → `deleteClientContact` usecase | `session.user.organizationId` | ✅ |
| `addClientContactAction` → `createClientContact` usecase | `session.user.organizationId` | ✅ |

### 多重防御（3 層防御）の維持確認

認可設計 §5「テナント分離はインフラストラクチャ層で強制する」が実現されつつ、既存の caller 側事前検証（多重防御）が維持されていることを確認した。

| 操作 | Action 層 | Usecase 層 | Repository 層 |
|---|---|---|---|
| 担当者一覧 | session 認証 + role check | `findById(clientId, orgId)` による親 client 検証 → `findContactsByClientId(clientId, orgId)` | innerJoin で org 強制 |
| 担当者作成 | session 認証 + role check | `findById(clientId, orgId)` → `validatePrimaryUniqueness(clientId, orgId, ...)` → `createContact` | — （createContact は親 client 検証を usecase に委ねる設計、スコープ外） |
| 担当者更新 | session 認証 + role check + `findById(clientId, orgId)` 検証 | — | `updateContact(contactId, clientId, orgId, ...)` サブクエリで org 強制 |
| 担当者削除 | session 認証 + role check | `findById(clientId, orgId)` による親 client 検証 → `deleteContact(contactId, clientId, orgId)` | サブクエリで org 強制 |

### 承認ワークフロー不変条件

本変更は `clientContact` の CRUD 操作のみを対象とし、承認ワークフロー（`request` / `approval` / `delegation` / `policy` 系）には一切変更を加えていない。承認ワークフローの不変条件（申請→承認ステップ遷移、委任、ポリシー評価）は本変更の影響を受けない。

### 認可設計 §5（テナント分離）への適合

> テナント分離はインフラストラクチャ層（リポジトリ）で強制する。

本変更により `clientContact` 系 4 メソッドすべてがリポジトリ自身でテナント分離を強制するようになった。変更前の「caller 規約依存」状態は解消され、設計ドキュメントに明記された不変条件に完全に適合する。

## Summary

テナント分離の不変条件はすべて満たされている。本変更は OWASP A01（Broken Access Control）に対する正当な修正であり、リポジトリ層が最終防衛線として機能する設計を復元する。

指摘事項 3 件はいずれも pre-existing（本変更前から存在）であり、本変更が新たに導入した問題はない。承認ワークフローの不変条件に変更はない。

受け入れ基準のすべてが充足されており（verification-result.md: build / typecheck / test / lint すべて passed）、HIGH/CRITICAL 相当の問題なし。
