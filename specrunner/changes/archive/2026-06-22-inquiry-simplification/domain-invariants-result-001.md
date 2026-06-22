# Domain-Invariants Review — inquiry-simplification — iter 1

## Reviewer: domain-invariants

**Purpose**: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。

## Verdict

- **verdict**: approved

---

## 確認観点と結果

### 1. テナント分離

| 確認項目 | 結果 | 根拠 |
|--------|------|------|
| `meetingRepository.create` が `organizationId` を INSERT する | OK | line 43: `organizationId: data.organizationId` |
| `meetingRepository.findById` が `organizationId` 条件でフィルタ | OK | line 68: `and(eq(meetings.id, id), eq(meetings.organizationId, organizationId))` |
| `meetingRepository.findAllByDeal` が `organizationId` 条件でフィルタ | OK | line 83: `and(eq(meetings.dealId, dealId), eq(meetings.organizationId, organizationId))` |
| `meetingRepository.update` が `organizationId` 条件でフィルタ | OK | line 117: `and(eq(meetings.id, id), eq(meetings.organizationId, organizationId))` |
| `createMeeting` が deal の所有テナントを検証してから INSERT | OK | `dealRepository.findById(data.dealId, data.organizationId)` で deal 所有を確認。他テナントの deal への商談作成を阻止 |
| `updateInquiryStatus` が `organizationId` で引き合い取得 | OK | `inquiryRepository.findById(data.inquiryId, data.organizationId)` |
| Action 層が `session.user.organizationId` をユースケースへ渡す | OK | `createMeetingAction`・`updateInquiryStatusAction` ともに session から organizationId を取得して渡す |

テナント分離の不変条件はすべて保持されている。

---

### 2. 監査ログの完全性

| 操作 | トランザクション内ログ | ログ内容 |
|------|-----------------|--------|
| `inquiry.updateStatus` (converted 遷移) | OK | `action: "inquiry.updateStatus"`, `metadata: { fromStatus, toStatus, dealId }` をトランザクション内で記録 |
| `inquiry.updateStatus` (declined / new 遷移) | OK | `action: "inquiry.updateStatus"`, `metadata: { fromStatus, toStatus }` をトランザクション内で記録 |
| `meeting.create` | OK | `action: "meeting.create"` をトランザクション内で記録 |
| `meeting.update` | OK | `action: "meeting.update"` をトランザクション内で記録 |

`declined → new` 遷移は `converted` 以外の分岐（`updateInquiryStatus.ts:90-126`）で処理され、正しく監査ログが記録される。状態変更が監査ログなしで完了するパスは存在しない。

---

### 3. 承認ワークフローの不変条件

#### 遷移グラフ

変更後の遷移ルール（`inquiryTransition.ts`）:
- `new → converted` (直接案件化)
- `new → declined` (見送り)
- `declined → new` (再開・受付状態に戻す)
- `converted` は終端状態（キーなし → `VALID_TRANSITIONS["converted"]` = `undefined` → 全遷移が `false`）

設計書 D1・D4 の意図どおり実装されている。

#### 不変条件チェック

| 不変条件 | 結果 | 根拠 |
|--------|------|------|
| `converted` が終端状態（遷移不可） | OK | `VALID_TRANSITIONS` に `converted` キーが存在しない。`canTransition("converted", any)` は `false` |
| `in_progress` への遷移が全経路で阻止される | OK | 型: `InquiryStatus = "new" \| "converted" \| "declined"`。遷移表にも `in_progress` なし。`canTransition("new", "in_progress")` = `false` |
| `new → converted` 時に `clientId` が必須 | OK | `updateInquiryStatus.ts:34`: `if (!inquiry.clientId) return { ok: false }` で阻止 |
| `converted` 時に Deal が同一トランザクション内で作成される | OK | `db.transaction` 内で `dealRepository.create` → `inquiryRepository.updateStatus` → `auditLogRepository.create` の順で実行 |
| 商談が必ず Deal に紐づく（孤立レコード防止） | OK | DB: `deal_id NOT NULL`（migration `0001_soft_cloak.sql`）+ ドメインモデル `Meeting.dealId: string`（nullable なし）+ ユースケース: `dealId` 必須パラメータ |
| `canTransition` がドメイン外の依存を持たない | OK | `inquiryTransition.ts` は `InquiryStatus` 型のみをインポート。infrastructure への参照なし |

#### converted 権限制御

`inquiries.ts:115-119` で `converted` 遷移は `admin` または `manager` ロールのみに制限されており、引き続き保持されている。

---

## 観察事項（minor）

### OBS-01: テストケース T-03 と T-07 が同一アサーション

`inquiryTransition.test.ts` の T-03 と T-07 が共に `canTransition("declined", "new") === true` を検証している（重複）。テストの意図は tasks.md の変換マッピング（T-03: 旧 `in_progress → converted` → 新 `declined → new`、T-07: 旧 `declined → in_progress` → 新 `declined → new`）に由来するが、結果として同一アサーションが2件存在する。動作上の問題はなく、テストは全件 pass している。

**推奨**: T-07 を `converted → declined が拒否される（終端状態）` 等の別の拒否ケースに振り替えると網羅性が上がる。ただし現時点での機能的影響はなし。

### OBS-02: Action 層の `newStatus` にランタイムバリデーションなし

`updateInquiryStatusAction`（`inquiries.ts:125`）は `newStatus as "new" | "converted" | "declined"` と型キャストするが、ランタイムで `"in_progress"` などの不正値を明示的に拒否するコードがない。生の HTTP POST で `in_progress` を送られた場合でも、`canTransition` が `false` を返すためドメイン層で阻止される（多層防御は機能している）。

**推奨**: アクション層で `const VALID_STATUSES = ["new", "converted", "declined"] as const` による明示ガードを追加すると堅牢性が増す。現状の実装で不変条件は保持されているため、このリリースを妨げる問題ではない。

---

## まとめ

- テナント分離: 全リポジトリメソッドで `organizationId` 条件が維持されており、変更による漏洩はない
- 監査ログ: すべての状態変更が同一トランザクション内でログを記録しており、変更後も完全性は保たれている
- 承認ワークフロー不変条件: `converted` 終端状態・`in_progress` 廃止・Deal 生成の原子性・商談の Deal 専属化がすべて正しく実装されている

2件の観察事項はいずれも機能的影響なし（テスト重複と型安全性の向上余地）。
