# Domain-Invariants Review Result

- **change**: interaction-generalization
- **reviewer**: domain-invariants
- **iteration**: 1
- **date**: 2026-06-30
- **verdict**: approved

---

## 観点と判定基準

本レビューはテナント分離・監査ログ完全性・承認ワークフロー不変条件の3軸で実装を検証する。

---

## テナント分離

### interactionRepository（全クエリ）

| 関数 | organizationId フィルタ | 判定 |
|------|------------------------|------|
| `create` | INSERT に `organizationId` 指定 | ✅ |
| `findById` | `AND interactions.organizationId = organizationId` | ✅ |
| `findAllByDeal` | `AND interactions.organizationId = organizationId` | ✅ |
| `findAllByOrganization` | `WHERE interactions.organizationId = organizationId` | ✅ |
| `findAllByInquiry` | `AND interactions.organizationId = organizationId` | ✅ |
| `update` | WHERE 句に `organizationId` 含む（+ 楽観ロック）| ✅ |
| `searchBySummary` | `AND interactions.organizationId = organizationId` | ✅ |

`update` は WHERE 句に `id AND organizationId AND version` の3条件を持ち、クロステナント書き換えを防ぐ。楽観ロック（version）の不変条件も維持されている。

### createMeeting / updateMeeting usecase

- `dealRepository.findById(dealId, organizationId)` で deal の所有組織を確認してから interaction を作成する。
- `interactionRepository.findById(meetingId, organizationId)` で更新前に所有確認する。
- Server Action（`createMeetingAction` / `updateMeetingAction`）の `organizationId` は `session.user.organizationId`（セッション取得）のみから導出され、外部入力を受け付けない。

### 認可チェック

`createMeetingAction` では `canPerform(session.user.role, "meeting", "create")`、`updateMeetingAction` では `canPerform(session.user.role, "meeting", "edit")` を保持。設計判断 D9（認可エンティティ名 `"meeting"` を維持）に従い、変更はない。

**テナント分離: 問題なし ✅**

---

## 監査ログの完全性

### 新規監査アクション

`createMeeting` usecase:
```
action: "interaction.create"
targetType: "interaction"
targetId: newMeeting.id
metadata: { kind: data.kind }  // "meeting"
```

`updateMeeting` usecase:
```
action: "interaction.update"
targetType: "interaction"
targetId: data.meetingId
metadata: { kind: existing.kind }  // "meeting"
```

トランザクション内で create/update と recordAudit を同一 tx で実行しており、ロールバック時の監査ログ孤立を防いでいる。

### 既存ログの保持

`meeting.create` / `meeting.update`（targetType="meeting"）の既存監査ログを上書き・更新する処理は一切存在しない。追記専用原則を遵守している。

### タイムライン（getDealActivity）

targets 配列に各 interaction につき 2 エントリを追加：
```typescript
...meetings.flatMap((m) => [
  { targetType: "interaction", targetId: m.id },
  { targetType: "meeting", targetId: m.id },
])
```

`targetInfoMap` にも `interaction:<id>` と `meeting:<id>` の両キーを登録。移行前後のログを漏れなく取得できる。

`TIMELINE_ACTIONS` に `"interaction.create"` と `"meeting.create"` の両方を含む。動的テストで両 targetType の存在・targetInfoMap の両キー登録・TIMELINE_ACTIONS への追加を検証済み。

### 通知（getNotifications）

targets 配列に getDealActivity と同様の双方 targetType を採用。`NOTIFICATION_ACTIONS` に `"interaction.create"` と `"meeting.create"` の両方を含む。動的テストで両 targetType の存在・NOTIFICATION_ACTIONS への追加・`excludeActorId` による本人除外・organizationId 伝達を検証済み。

### AuditTargetType / AuditAction の型整合

`AuditTargetType` に `"interaction"` と `"meeting"` の両方を定義。`AuditAction` に `"interaction.create"` / `"interaction.update"` を追加。`AuditMetadataMap` に `"interaction.create": { kind: string }` / `"interaction.update": { kind: string }` を定義し、型安全性を維持。

**監査ログ完全性: 問題なし ✅**

---

## 承認ワークフローの不変条件

`approvalPolicies` / `approvalTemplates` / `approvalSteps` / `requests` テーブルは本変更で一切変更されていない。承認ワークフロー関連 usecase（applyApproval / approveStep 等）にも手が入っていない。

認可 Entity `"meeting"` は維持されており、承認ポリシーのトリガーアクションとして `"meeting.create"` を参照している既存設定がある場合でも影響を受けない。

**承認ワークフロー不変条件: 問題なし ✅**

---

## データ不可侵（マイグレーション安全性）

マイグレーション SQL（`0017_interaction_generalization.sql`）を精査した結果：

- `ALTER TABLE "meetings" RENAME TO "interactions"` — in-place リネームでデータを保持
- `ALTER TABLE "interactions" RENAME COLUMN "type" TO "meeting_type"` — 値を保持
- `ALTER TABLE "interactions" RENAME COLUMN "hearing_data" TO "details"` — 値を保持
- `ALTER TABLE "interactions" ADD COLUMN "kind" ... DEFAULT 'meeting'` — 既存行は kind=meeting
- `ALTER TABLE "action_items" RENAME COLUMN "meeting_id" TO "interaction_id"` — FK 値を保持
- **DROP / DELETE / TRUNCATE を含まない** ✅

CHECK 制約は `meetings_deal_or_inquiry_check` を DROP した後、`interactions_related_entity_check`（5種）を ADD しており、既存行（deal_id/inquiry_id が必ず片方 NOT NULL）は新制約を自動的に満たす。

**データ不可侵: 問題なし ✅**

---

## 観察事項（情報提供のみ・要対応なし）

### O-1: interactionRepository.update の dealId/inquiryId 変更不可

`update` 関数のパラメータに `dealId`/`inquiryId` は含まれていない。商談の関連先変更は未対応。既存仕様の継続であり、本リクエストのスコープ外。将来他 kind が追加される際の注意点として記録する。

### O-2: createMeeting のバリデーションは deal/inquiry 限定

`createMeeting` は `dealId || inquiryId` のいずれかを必須とするが、スキーマ上は `contractId`/`invoiceId`/`clientId` でも CHECK 制約を満たせる。設計判断 D5（kind=meeting のみ対象）に基づく意図的な実装。他 kind 追加時に拡張が必要。

---

## 総評

テナント分離・監査ログ完全性・承認ワークフロー不変条件のいずれも要件を満たしている。マイグレーション SQL はデータ欠落を生じるオペレーション（DROP/DELETE/TRUNCATE）を含まない。ドメイン不変条件の破壊はない。

- **verdict**: approved
