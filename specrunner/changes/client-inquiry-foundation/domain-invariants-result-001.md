# Domain Invariants Review — client-inquiry-foundation

- **reviewer**: domain-invariants
- **iteration**: 1
- **purpose**: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。
- **verdict**: needs-fix

---

## 検証サマリ

| カテゴリ | 結果 |
|---|---|
| テナント分離（repository層） | PASS |
| 監査ログの完全性（transaction内記録） | PASS |
| 状態遷移の不変条件 | PASS |
| converted 遷移の原子性 | PASS |
| ロールベースアクセス制御 | PASS |
| 楽観ロック（concurrent transition防止） | **FAIL** |
| JSDoc リスク軽減策の実装 | **FAIL** |

---

## PASS した項目

### テナント分離（repository層）

全クエリ関数に `organizationId` 条件が付与されている。

- `clientRepository.create`: `organizationId` を insert に含む ✓
- `clientRepository.findById`: `and(eq(id), eq(organizationId))` ✓
- `clientRepository.findAllByOrganization`: `eq(organizationId)` ✓
- `clientRepository.update`: `and(eq(id), eq(organizationId))` ✓
- `inquiryRepository.create`: `organizationId` を insert に含む ✓
- `inquiryRepository.findById`: `and(eq(id), eq(organizationId))` ✓
- `inquiryRepository.findAllByOrganization`: `eq(organizationId)` ✓
- `inquiryRepository.findAllWithClientByOrganization`: `eq(inquiries.organizationId)` ✓
- `inquiryRepository.update`: `and(eq(id), eq(organizationId))` ✓
- `inquiryRepository.updateStatus`: `and(eq(id), eq(organizationId))` ✓
- `clientRepository.findAllContactsByOrganization`: `innerJoin(clients, ...)` + `eq(clients.organizationId, organizationId)` ✓

Server Actions も全て `session.user.organizationId` を使用（リクエストボディからの取得なし）。

### 監査ログの完全性

全 write 操作が同一 `db.transaction()` 内で `auditLogRepository.create()` を呼び出している。

- `createClient.ts`: 顧客作成 + 担当者作成 + `audit_log` が単一 tx ✓
- `createInquiry.ts`: 引き合い作成 + `audit_log` が単一 tx ✓
- `updateInquiryStatus.ts` (converted 以外): `updateStatus` + `audit_log` が単一 tx ✓
- `updateInquiryStatus.ts` (converted): `requestRepository.create` + `approvalStepRepository.createMany` + `inquiryRepository.updateStatus` + `audit_log`（×2）が単一 tx ✓

metadata に `fromStatus` / `toStatus` が含まれており、ステータス変更の監査証跡として完全。

### 状態遷移の不変条件

`inquiryTransition.ts` の `VALID_TRANSITIONS` が仕様通りに定義されている。

```typescript
const VALID_TRANSITIONS: Partial<Record<InquiryStatus, InquiryStatus[]>> = {
  new: ["in_progress", "declined"],
  in_progress: ["converted", "declined"],
  // converted, declined はマップに含めない（終端状態）
};
```

- `new → in_progress`: 許可 ✓
- `new → declined`: 許可 ✓
- `in_progress → converted`: 許可 ✓
- `in_progress → declined`: 許可 ✓
- `converted → *`: 全て拒否（終端状態） ✓
- `declined → *`: 全て拒否（終端状態） ✓
- `new → converted`: スキップ不可、拒否 ✓

テスト（`inquiryTransition.test.ts` T-01〜T-09）が全パターンをカバー。

### converted 遷移の原子性

`updateInquiryStatus.ts` の converted パス（L50〜L119）を確認した。

1. `requestRepository.create(...)` — 承認リクエスト作成
2. `approvalStepRepository.createMany(...)` — 承認ステップ生成
3. `inquiryRepository.updateStatus(..., newRequest.id, tx)` — inquiries.requestId 更新
4. `auditLogRepository.create(... inquiry.updateStatus ...)` — 引き合い監査ログ
5. `auditLogRepository.create(... request.create ...)` — リクエスト監査ログ

全て単一 `db.transaction()` 内にあり、部分失敗が発生しない。`inquiries.requestId` の FK には `onDelete: "set null"` が設定されており、承認リクエスト削除時の整合性も保護されている。

### ロールベースアクセス制御

`updateInquiryStatusAction`（`inquiries.ts` L102〜L106）:

```typescript
if (newStatus === "converted") {
  if (session.user.role !== "admin" && session.user.role !== "manager") {
    return { success: false, message: "権限がありません" };
  }
}
```

`converted` への遷移は Server Action 層で admin / manager のみに制限されている。UI 側（`InquiryActions.tsx`）でも `canChangeStatus` フラグで商談化ボタンを非表示にしており、二重防御。その他の遷移（`in_progress`, `declined`）は全ロールに開放されており、要件と一致。

---

## FAIL した項目

### [MEDIUM] F-01: `updateInquiryStatus` に楽観ロックがない（TOCTOU）

**ファイル**: `src/application/usecases/updateInquiryStatus.ts`

**問題**:

現在のステータスをトランザクション外で読み取ってから `canTransition` を検証し、その後トランザクションを開始している（check-then-act パターン）。

```typescript
// トランザクション外で読む
const inquiry = await inquiryRepository.findById(data.inquiryId, data.organizationId);
// ...
if (!canTransition(inquiry.status, data.newStatus)) { ... }

// converted パス: トランザクション開始
const updatedInquiry = await db.transaction(async (tx) => {
  const newRequest = await requestRepository.create(..., tx);
  await approvalStepRepository.createMany(..., tx);
  await inquiryRepository.updateStatus(..., newRequest.id, tx);
  // ...
});
```

この設計では、2 つの並行リクエストが同じ引き合い（`in_progress` 状態）に対して `converted` 遷移を試みた場合、次の順序で問題が発生する：

1. Thread A: `findById` → `status = "in_progress"` を読む
2. Thread B: `findById` → `status = "in_progress"` を読む
3. Thread A: `canTransition` チェック通過 → トランザクション開始
4. Thread B: `canTransition` チェック通過 → トランザクション開始
5. Thread A: 承認リクエスト A を作成、`inquiries.requestId = A` に更新
6. Thread B: 承認リクエスト B を作成、`inquiries.requestId = B` に更新（A を上書き）

結果：承認リクエスト A は `inquiries.requestId` から参照されなくなる（orphaned request）。監査ログにはどちらも記録されるが、引き合いと承認リクエストの 1:1 不変条件が破壊される。

**既存パターンとの不整合**:

既存の `requests` テーブルと `approvalSteps` テーブルは `version` カラムで楽観ロックを実装している。`inquiries` テーブルにはこの保護がない。

**リスク評価**:

- 実行条件: admin / manager 権限が必要。同一引き合いを同時操作する確率は低い
- 影響: orphaned approval request（セキュリティ侵害ではなくデータ整合性の問題）
- 既存パターンとの一貫性欠如

**修正案**:

Option A（推奨）: `inquiries` テーブルに `version` カラムを追加し、`updateStatus` で `AND version = :currentVersion` 条件を加えて楽観ロックを実装する。更新後に affected rows = 0 の場合は同時変更検出エラーとして返す。

Option B: `converted` 遷移のみ、`db.transaction()` 内で `FOR UPDATE` ロックを取得してから `canTransition` を再検証する（悲観ロック）。スキーマ変更が不要だが、長時間のロック保持リスクがある。

---

### [LOW] F-02: `findContactsByClientId` に JSDoc がない（D8 リスク軽減策の未実装）

**ファイル**: `src/infrastructure/repositories/clientRepository.ts` L135〜L144

**問題**:

`design.md` の D8 決定でリスク軽減策として「リポジトリ関数の JSDoc でテナント分離の前提を明記する」と明記されているが、`findContactsByClientId` 関数に JSDoc が実装されていない。

```typescript
// JSDoc なし
export async function findContactsByClientId(
  clientId: string,
  tx?: Transaction
): Promise<ClientContact[]> {
```

`client_contacts` テーブルに `organizationId` がないため（D8 による設計）、この関数は clientId のみで担当者を取得し、テナント検証を呼び出し側に委ねている。呼び出し元（`/clients/[id]/page.tsx`）では `clientRepository.findById(id, organizationId)` の結果を確認してから進むため、データは実際にはテナント境界外に漏れない。しかし、その前提が JSDoc に文書化されていないことで、将来の誤用リスクがある。

**修正案**:

```typescript
/**
 * 指定した顧客の担当者一覧を返す。
 *
 * テナント分離の注意: このクエリは organizationId を直接参照しない（D8 設計決定）。
 * 呼び出し前に clientRepository.findById(clientId, organizationId) で
 * 顧客がセッションの組織に属することを確認すること。
 */
export async function findContactsByClientId(
  clientId: string,
  tx?: Transaction
): Promise<ClientContact[]> {
```

---

## 必要な修正

| ID | 優先度 | 修正内容 |
|---|---|---|
| F-01 | MEDIUM | `inquiries` テーブルに楽観ロックを追加し、`updateInquiryStatus` で concurrent converted transition を防ぐ |
| F-02 | LOW | `findContactsByClientId` に JSDoc を追加し、テナント分離の前提を文書化する |
