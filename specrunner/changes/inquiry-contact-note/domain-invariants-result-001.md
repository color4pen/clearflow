# Domain Invariants Review: inquiry-contact-note

- **reviewer**: domain-invariants
- **iteration**: 1
- **verdict**: approved

---

## 観点

テナント分離・監査ログの完全性・承認ワークフロー不変条件の維持を確認する。

---

## 1. テナント分離

### 結果: 問題なし

`contactNote` は `inquiries` テーブルの新規カラムであり、既存のテナント分離フィルターをそのまま継承する。変更後のすべてのリポジトリ関数において `organizationId` フィルターが維持されていることを確認した。

| 関数 | フィルター条件 |
|------|--------------|
| `findById` | `and(id, organizationId)` ✓ |
| `findAllByOrganization` | `organizationId` ✓ |
| `findAllWithClientByOrganization` | `organizationId` ✓ |
| `update` | `and(id, organizationId)` ✓ |
| `updateStatus` | `and(id, organizationId, version)` ✓ |
| `deleteById` | `and(id, organizationId)` ✓ |
| `findByClientId` | `and(clientId, organizationId)` ✓ |

`contactNote` の読み書きに独立したクエリパスや JOIN は存在しない。行取得時に常に `organizationId` で絞り込まれており、テナント越境は発生しない。

---

## 2. 監査ログの完全性

### 結果: 問題なし

**createInquiry**: `inquiry.create` 監査ログを INSERT と同一トランザクション内で発行している。`contactNote` の値は create 時にログメタデータに含まれないが、これは既存フィールド（`description` 等）と同じパターンであり一貫している。

**updateInquiry**: `inquiry.update` 監査ログを UPDATE と同一トランザクション内で発行しており、`metadata: { updatedFields: Object.keys(updatePayload) }` に更新されたフィールド名を記録する。`contactNote` が変更された場合は `updatedFields` に `"contactNote"` が含まれる。

```ts
// updateInquiry.ts:62
await auditLogRepository.create({
  action: "inquiry.update",
  targetType: "inquiry",
  targetId: data.inquiryId,
  actorId: data.actorId,
  organizationId: data.organizationId,
  metadata: { updatedFields: Object.keys(updatePayload) },
}, tx);
```

どちらの操作もトランザクション境界内で原子的に実行される。データ変更と監査ログの不一致（ファントム書き込み）は発生しない。

---

## 3. 承認ワークフロー不変条件

### 結果: 問題なし

引合のステータス遷移（`new → converted` / `new → declined`）は `updateInquiryStatus` ユースケースが独占的に管理しており、`updateStatus` リポジトリ関数（楽観ロック付き）を介する。

```ts
// inquiryRepository.ts:updateStatus
.set({ status, updatedAt: new Date(), version: sql`version + 1` })
.where(and(eq(inquiries.id, id), eq(inquiries.organizationId, organizationId), eq(inquiries.version, currentVersion)))
```

`contactNote` の追加はこの遷移ロジックに一切影響しない。`updateInquiry` の `updatePayload` ホワイトリストは `status` および `version` を含まないため、一般更新パスからステータスを書き換えることは不可能（変更なし・変更後ともに同様）。

承認リクエスト生成・Deal 作成トリガー・ポリシー評価のいずれも `contactNote` を参照しておらず、不変条件の破壊はない。

---

## 4. その他確認事項

### InquiryCustomerSection の contactNote 保護

`InquiryCustomerSection.handleSave` では `if (inquiryContactNote) formData.set("contactNote", inquiryContactNote)` という truthiness チェックを使用している。空文字列の場合はフォームデータにセットされないが、Action 側で `formData.get("contactNote") || undefined` → `undefined ?? null` = `null` と変換されるため、DB 上の `contactNote` は常に `null` か非空文字列のいずれかに正規化される。よって truthiness チェックで十分であり、既存値が消失するシナリオは存在しない。

### マイグレーション

`drizzle/0006_inquiry_contact_note.sql` は `ALTER TABLE "inquiries" ADD COLUMN "contact_note" text;` のみを発行する。`text`（nullable）であり、既存データへの影響はない。「差分マイグレーションのみ」制約を遵守している。

---

## 判定

- **verdict**: approved

テナント分離・監査ログ完全性・承認ワークフロー不変条件のいずれも維持されている。`contactNote` は既存パターンに忠実な additive 変更であり、ドメイン不変条件を破壊しない。
