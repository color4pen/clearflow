# Domain-Invariants Review Result — Iteration 1

- **change**: domain-restructuring
- **reviewer**: domain-invariants
- **verdict**: needs-fix

## 観点サマリー

テナント分離・監査ログ完全性・承認ワークフロー不変条件の3軸でレビューした。

---

## PASS（不変条件が保持されていると確認した箇所）

| 観点 | 確認内容 |
|------|---------|
| テナント分離 — meetingRepository | `findAllByDeal`・`findAllByInquiryOrDeal` ともに外部クエリで `meetings.organizationId = organizationId` 条件あり |
| テナント分離 — dealContactRepository | `findByDeal` は `clientContacts → clients.organizationId` 経由でテナント検証。`deleteByDealAndContact` は `deals.organizationId` 経由で検証 |
| テナント分離 — テスト | `projectStructure.test.ts` に `meetingRepository.findAllByDeal`・`findAllByInquiryOrDeal`・`dealContactRepository.findByDeal` の organizationId テストが追加済み |
| 承認ワークフロー — estimate_approval 遷移 | `updateDealPhase.ts`: バージョン不一致時は `throw new Error(...)` でトランザクション全体をロールバックし、孤立承認リクエストを防止する設計が維持されている |
| 承認ワークフロー — 案件化承認タイトル | `updateInquiryStatus.ts`: 承認リクエストのタイトルが `"案件化承認: ${inquiry.title}"` に変更済み。`conversionRequestId` による参照も正しく更新済み |
| 承認ワークフロー — ロールチェック | `updateDealAction`（line 172–174）、`updateDealPhaseAction`（line 134–137）、`createDealAction`（line 59–61）の3関数すべてに admin/manager ロールガードあり |
| 承認ワークフロー — 遷移 FSM | `dealTransition.ts`: `estimate_approval` が `VALID_TRANSITIONS` に正しく設定済み。`internal_approval` キーは存在しない。`dealTransition.test.ts` にて T-05 〜 T-08 で全遷移を検証済み |
| 監査ログ — createMeeting | `createMeeting.ts`: `meeting.create` の audit log が `db.transaction` 内に正しく記録されている |

---

## FINDINGS

### F-01 (medium): `dealContactRepository.create` にテナント検証がない

**ファイル**: `src/infrastructure/repositories/dealContactRepository.ts`

**現状**:
```typescript
export async function create(
  data: {
    dealId: string;
    contactId: string;
    role: DealContactRole;
  },
  tx?: Transaction
): Promise<DealContact> {
  // organizationId を受け取らず、テナント検証なしで直接 INSERT
  const result = await queryRunner.insert(dealContacts).values({ ... }).returning();
  return mapRow(result[0]);
}
```

**問題**:
同じファイルの `findByDeal` は `clients.organizationId = organizationId` 経由でテナント検証し、`deleteByDealAndContact` は `deals.organizationId = organizationId` 経由で検証している。`create` のみがテナント境界を自己完結で保護しない設計になっており、パターンが非対称。

`deal_contacts` テーブルは `organizationId` カラムを持たず FK チェーン（`dealId → deals.organizationId`）でテナントを確定するため、`create` 呼び出し前に呼び出し側が `dealId`・`contactId` のテナント確認をしなければ cross-tenant association が生まれうる。

現在の呼び出し元は `seed.ts`（信頼環境）のみであり実害はないが、将来 UC/Action が接続された時点で脆弱性になる。`projectStructure.test.ts` も `findByDeal` の organizationId テストは存在するが、`create` の組織検証テストが存在しない。

**修正方針**（選択肢）:
- `create` に `organizationId` パラメータを追加し、`deals.organizationId = organizationId` を確認してから INSERT する
- 呼び出し側の UC で `dealRepository.findById(dealId, organizationId)` と `clientContactRepository.findById(contactId, organizationId)`（またはクライアント経由検証）を必須化する設計規約を tasks.md に明記する

---

### F-02 (informational): `updateInquiryStatus` のオプティミスティックロック処理が `updateDealPhase` と非対称（既存バグ、本 PR で悪化なし）

**ファイル**: `src/application/usecases/updateInquiryStatus.ts`

**現状** (`converted` 遷移):
```typescript
const updated = await inquiryRepository.updateStatus(..., inquiry.version, tx);
// updated が null（バージョン不一致）でも以下の audit log が書き込まれる
await auditLogRepository.create({ action: "inquiry.updateStatus", ... }, tx);
await auditLogRepository.create({ action: "request.create", ... }, tx);
return updated; // null を返してトランザクション commit → 孤立レコードが残る
```

`updateDealPhase` は同じシナリオで `throw new Error(...)` してロールバックしているため、孤立承認リクエスト・孤立 audit log は生まれない。`updateInquiryStatus` はバージョン不一致時にリクエスト・ステップ・audit log が孤立したまま commit される。

本 PR はこのコードのタイトル文言のみを変更しており、このバグを新規に導入していない。ただし本 PR が当該ファイルを変更した機会に合わせて修正することを推奨する。

**スコープ**: 本 PR での修正は必須ではないが、将来の技術的負債として記録する。

---

### F-03 (informational): `findAllByInquiryOrDeal` サブクエリが `organizationId` を参照しない

**ファイル**: `src/infrastructure/repositories/meetingRepository.ts` (line 111–114)

```typescript
const dealSubquery = db
  .select({ id: deals.id })
  .from(deals)
  .where(eq(deals.inquiryId, inquiryId)); // organizationId フィルタなし
```

外部クエリの `eq(meetings.organizationId, organizationId)` が最終的なテナント境界を保護しているため実際のデータ漏洩は発生しない。サブクエリに `and(eq(deals.inquiryId, inquiryId), eq(deals.organizationId, organizationId))` を追加することで意図の一貫性が高まる。

---

### F-04 (informational): `updateDealAction` ロールチェックのテストカバレッジ欠如

**ファイル**: `src/__tests__/usecases/dealManagement.test.ts`

`updateDealPhaseAction` のロールチェックはテスト済みだが、`updateDealAction`（line 163–224 の deals.ts）のロールチェック（admin/manager 必須）を検証するテストが存在しない。実装自体は正しく、spec の「案件更新は admin と manager のみ」要件を満たしているが、テストが実装を追跡していない。

---

## 判定根拠

- **F-01** は本 PR で新規追加された `dealContactRepository.ts` の設計一貫性の問題。同ファイルの他関数がテナント自己完結を実装しているにも関わらず `create` のみが例外となっており、将来 UC 接続時のリスクを抱えている。修正が必要と判断し `needs-fix` とする。
- **F-02〜F-04** は実害のない既存バグ・テスト欠如であり、ブロック要件ではない。

## 修正アクション

1. `dealContactRepository.create` に `organizationId` パラメータを追加してテナント検証ロジックを実装するか、呼び出し元 UC での事前検証を設計規約として明記する（F-01）
2. `projectStructure.test.ts` に `dealContactRepository.create` のテナント検証テストを追加する（F-01 に付随）
