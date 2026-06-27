# Domain Invariants Review: 案件アクティビティ・タイムライン

- **reviewer**: domain-invariants
- **iteration**: 1
- **date**: 2026-06-27
- **verdict**: approved

---

## 観点

テナント分離・監査ログの完全性・承認ワークフローの不変条件を検証する。

---

## 検証結果

### 1. テナント分離 — auditLogRepository.findByTargets

**✅ PASS**

```ts
// auditLogRepository.ts:115–118
const conditions = [
  eq(auditLogs.organizationId, organizationId),  // 常に第1条件
  or(...targetConditions),
];
.where(and(...conditions))
```

`organizationId` は必須パラメータであり、WHERE 句の第1条件として常に AND で適用される。`targetId` が万一別テナントのものであっても `organizationId` フィルタが遮断する（多層防御）。空 targets の場合は即座に `[]` を返しクエリが発行されない点も正しい。

---

### 2. テナント分離 — getDealActivity usecase

**✅ PASS**

```ts
// getDealActivity.ts:16–19
const [meetings, contracts, actionItems, dealContacts] = await Promise.all([
  meetingRepository.findAllByDeal(dealId, organizationId),
  contractRepository.findAllByDealId(dealId, organizationId),
  actionItemRepository.findByDeal(dealId, organizationId),
  dealContactRepository.findByDeal(dealId, organizationId),
]);
```

全子エンティティ取得に `organizationId` を渡している。`organizationId` は page.tsx で `session!.user.organizationId` から取得しており、セッション外から注入不可能。

---

### 3. テナント分離 — dealContactRepository.findByDeal

**✅ PASS**

`deal_contacts` テーブルには `organizationId` カラムがないが、`clients.organizationId` への JOIN でテナント境界を実現している（既存設計、本PR以前から確立済み）。

```ts
// dealContactRepository.ts:82–89
.innerJoin(clientContacts, eq(dealContacts.contactId, clientContacts.id))
.innerJoin(clients, eq(clientContacts.clientId, clients.id))
.where(and(
  eq(dealContacts.dealId, dealId),
  eq(clients.organizationId, organizationId)  // JOIN 経由でテナント分離
))
```

audit log クエリ側でも `organizationId` が二重に適用されるため、防御は多層になっている。

---

### 4. 監査ログの完全性（記録の常時オン）

**✅ PASS**

`auditLogRepository.create` は本変更で一切修正されていない（行 7–41 は元コードのまま）。フィーチャーフラグ `ACTIVITY_FEED_ENABLED` は表示側（RSC ページ）のみに適用され、監査ログの書き込みパスには影響しない。この点は設計判断 D1 に準拠している。

---

### 5. フィーチャーフラグ OFF 時のゼロ取得保証

**✅ PASS**

```ts
// page.tsx:46
activityEnabled ? getDealActivity({ dealId: deal.id, organizationId }) : Promise.resolve([]),
```

`activityEnabled` が false のとき `getDealActivity` は呼ばれず、DBクエリはゼロ。UI 側も `{activityEnabled && (...)}` で条件付きレンダリングされる。インポートは静的だが実行はされない（RSC の通常動作）。

---

### 6. 承認ワークフローの不変条件

**✅ PASS**

本変更は純粋な読み取り追加であり、以下はすべて未変更：

- `approveRequest.ts` / `rejectRequest.ts` / `submitRequest.ts` — 承認遷移ロジック不変
- `approvalStepRepository.ts` / `requestRepository.ts` — 承認ステップ・申請リポジトリ不変
- `requests` テーブル・`approval_steps` テーブル — スキーマ無変更
- 承認ポリシー自動起動ロジック — 無変更

差分マイグレーション (`drizzle/0010_audit_logs_indexes.sql`) は `CREATE INDEX` 2文のみで、既存テーブル・データ・カラムへの変更はない。

---

### 7. OR 展開と organizationId AND の構造

**✅ PASS**

```ts
and(
  eq(auditLogs.organizationId, organizationId),  // テナント境界
  or(
    and(eq(targetType, "deal"), eq(targetId, dealId)),
    and(eq(targetType, "meeting"), eq(targetId, meetingId)),
    ...
  )
)
```

SQL 的には `organizationId = ? AND (target_type/id IN ...)` の形になり、OR 展開がテナント境界を越える余地はない。

---

## 観察事項（問題なし）

- `activityLabels.ts` に `invoice.create`/`invoice.update` のラベルが定義されているが、`getDealActivity` の targets に invoice は含まれない。これはリクエスト仕様（配下: 商談・契約・アクションアイテム・案件連絡先）への準拠であり、意図的。将来 invoice を追加した際のラベルは準備済み。

---

## 総評

新設された全ての読み取りパスで `organizationId` によるテナント境界が維持されている。監査ログの記録パスは変更なく完全性が保たれる。承認ワークフローの不変条件を破るコード変更は存在しない。差分マイグレーションはインデックス追加のみで既存データへの影響なし。

- **verdict**: approved
