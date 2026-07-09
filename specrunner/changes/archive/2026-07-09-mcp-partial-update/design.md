# Design: MCP update 系ツールの部分更新是正

## Context

MCP の update 系ツールで、渡さなかった項目が既定値でリセットされる問題がある（issue #167 #4）。横断監査の結果、以下の3箇所に問題を確認した。

**確認済みバグ（データ破壊）:**

1. **interactions `update_meeting` attendees**（interactions.ts:200-217）: `internalAttendees` のみ指定すると `externalAttendees ?? []` が空配列に評価され、既存の外部参加者が無言で消える。逆も同様。
2. **approvalPolicies `update`**（approvalPolicies.ts:65-100, updatePolicy.ts:36-48）: スキーマが `name` / `triggerAction` / `templateId` を必須化し PUT 的全置換を強制する。加えて `description ?? null` / `conditionField ?? null` 等が undefined を null に変換し、省略時にクリアされる。

**不整合（データ破壊なし・null クリア不可）:**

3. **inquiries `update` スキーマ**（inquiries.ts:47-60）: `description` / `contactNote` / `budget` / `timeline` / `clientId` / `assigneeId` が `.optional()` のみで `.nullable()` がなく、agent は null クリアできない。usecase は null を受容可能。

**正常（変更不要）:**

| 操作 | 方式 | 判定 |
|------|------|------|
| deals.update | handler が undefined を透過、usecase が `...(x !== undefined && { x })` | OK |
| clients.update | `Partial<{...}>` でそのまま渡す | OK |
| clients.update_contact | `Partial<{...}>` でそのまま渡す（isPrimary も undefined 保持） | OK |
| contracts.update | handler が undefined を透過、Drizzle が undefined をスキップ | OK |
| invoices.update | handler が undefined を透過、Drizzle が undefined をスキップ | OK |
| tasks.update | handler が undefined を透過、usecase が `if (x !== undefined)` | OK |
| revenueTargets.update | handler が undefined を透過、Drizzle が undefined をスキップ | OK |
| approval_templates.update | handler が undefined を透過、repository が `!== undefined` ガード | OK |
| organization.update | 単一フィールド（name）のみ、常に必須 | OK |

## Goals / Non-Goals

**Goals**:

- 全多フィールド update オペレーションで、未指定（undefined）フィールドが既存値を保持する
- null（明示クリア）と undefined（変更なし）を区別する
- interactions `update_meeting` の attendees 部分更新を是正する
- approvalPolicies `update` を PUT セマンティクスから PATCH セマンティクスに変換する
- inquiries `update` スキーマに `.nullable()` を追加し null クリアを可能にする
- 上記すべての挙動を behavioral テストで固定する

**Non-Goals**:

- 単一フィールド遷移（`update_status` / `update_phase` / `update_role`）の変更
- フィールド describe の全面整備（attendees セマンティクスの明記のみ本 request で実施）
- 認可・監査・レート制限・戻り値の変更
- Server Action 側の変更

## Decisions

### D1: attendees は内部/外部を独立した部分更新フィールドとして usecase に渡す

handler で `internalAttendees` / `externalAttendees` を `MeetingAttendee[]` に変換後、usecase に別々のフィールドとして渡す。usecase は既存レコードから反対側の attendees を取得しマージする。

- `internalAttendees` のみ指定 → 内部側を差し替え、外部側は既存を保持
- `externalAttendees` のみ指定 → 外部側を差し替え、内部側は既存を保持
- 両方指定 → 両方差し替え
- 両方 undefined → attendees 変更なし
- null → 当該側をクリア（空配列として扱う）

既存の `attendees?: MeetingAttendee[]` パラメータは Server Action からの全置換用に残す（後方互換）。`internalAttendees` / `externalAttendees` と `attendees` が同時指定された場合、`internalAttendees` / `externalAttendees` を優先する。

**Rationale**: handler で既存データを取得すると usecase の `findById` と重複する。usecase は既に `findById` を実行しているため、マージロジックを usecase に配置するのが自然。Server Action 側は `attendees` 全置換を維持し、MCP handler のみ分離フィールドを使う。

**Alternatives considered**:
- handler で既存データを取得してマージ → handler が repository に依存し、レイヤー違反
- usecase の `attendees` パラメータにマージモードフラグを追加 → インターフェースが不自然

### D2: approvalPolicies `update` を PATCH セマンティクスに変換する

Zod スキーマの `name` / `triggerAction` / `templateId` を `.optional()` にし、usecase で `...(x !== undefined && { x })` パターンを使う。`description ?? null` / `conditionField ?? null` 等の `?? null` を除去し、undefined をそのまま透過させる。

`superRefine` の条件バリデーションは調整する: `conditionField` が明示指定されたときのみ `conditionOperator` / `conditionValue` を要求する。全て省略時は既存値を保持する。

**Rationale**: 他の全 update 操作が PATCH セマンティクス。approvalPolicies のみ PUT であることは一貫性に欠け、agent が「名前だけ変えたい」ときに全フィールド再指定を強いられる。

**Alternatives considered**:
- PUT セマンティクスを維持 → 「未指定フィールドの保持」要件に反する

### D3: inquiries `update` スキーマに `.nullable()` を追加する

`description` / `contactNote` / `budget` / `timeline` / `clientId` / `assigneeId` に `.nullable()` を追加し、`z.string().nullable().optional()` とする。usecase は既に `string | null` 型を受容しているため変更不要。

**Rationale**: undefined/null 区別は本 request の要件に含まれる。usecase 側の対応は済んでおり、スキーマの追加のみで完結する。

**Alternatives considered**:
- describe 全面整備に含めて別 request で対応 → 本要件「クリアが有効な項目で null と undefined を区別する」に直接該当するため、ここで対応する

### D4: テスト戦略 — handler → usecase 境界の引数検証 + usecase 単体テスト

テストは2層で構成する:

1. **handler → usecase 境界テスト**（`.dynamic.test.ts`）: 実 MCP transport 経由で `tools/call` を発行し、usecase mock に渡された引数を検証する。省略フィールドが `undefined` として渡ることを assert。既存の `mcpInteractions.dynamic.test.ts` パターンに準拠。
2. **usecase 単体テスト**: attendees マージロジックと approvalPolicies PATCH ロジックを、repository mock を使って直接検証する。更新後のデータを再取得し、未指定フィールドの保持を assert。

**Rationale**: handler 層のテストは transport ～ handler 間の変換を検証する。usecase 層のテストは DB 操作のマージロジックを検証する。両層を分けることで mock の複雑さを抑える。

**Alternatives considered**:
- stateful in-memory repository を使った end-to-end テスト → mock.module パターンとの整合が複雑で、テスト専用 repository 実装のメンテナンスコストが高い

## Risks / Trade-offs

[Risk] approvalPolicies の PATCH 化で、既存の MCP agent ワークフローが全フィールド指定を前提としている場合、挙動が変わる
→ Mitigation: 全フィールド指定の場合は以前と同じ結果になる（undefined フィールドがないため）。PATCH 化は破壊的変更ではなく、「今まで必須だったフィールドが任意になる」拡張的変更。

[Risk] attendees マージロジックが usecase に増えることで、`updateMeeting` usecase の複雑度が上がる
→ Mitigation: マージロジックは 5 行程度の filter + concat で完結する。既存の `findById` 結果を利用するため追加 DB アクセスは不要。

[Risk] null と undefined の区別を Zod スキーマ + MCP transport が正しく伝搬しない
→ Mitigation: 既存テスト TC-005 / TC-006 で `update_meeting` の undefined / null 伝搬が検証済み。同じパターンを他操作にも適用。

## Open Questions

なし — review-result-001 の Finding #1（approvalPolicies の PUT/PATCH 判断）は D2 で解決。Finding #2（テスト戦略）は D4 で解決。
