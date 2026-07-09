# Tasks: MCP update 系ツールの部分更新是正

## T-01: interactions `update_meeting` attendees の部分更新修正

- [ ] `src/application/usecases/updateMeeting.ts` の入力型に `internalAttendees?: MeetingAttendee[]` と `externalAttendees?: MeetingAttendee[]` を追加する（既存の `attendees?: MeetingAttendee[]` は Server Action 後方互換のため残す）
- [ ] `updateMeeting` usecase にマージロジックを追加する: `internalAttendees` / `externalAttendees` が指定された場合、`existing.attendees` から `isExternal` でフィルタして反対側を保持し、指定側と結合して新しい `attendees` を構築する。`attendees` と `internalAttendees` / `externalAttendees` が同時指定された場合は `internalAttendees` / `externalAttendees` を優先する
- [ ] `src/app/api/mcp/tools/interactions.ts` の `update_meeting` handler（200-217 行付近）を修正する: `internalAttendees` / `externalAttendees` を個別に `MeetingAttendee[]` に変換し、usecase に `internalAttendees` / `externalAttendees` として渡す（統合 `attendees` の構築を削除）。undefined はそのまま透過、null は空配列に変換する
- [ ] `updateMeetingSchema` の `internalAttendees` / `externalAttendees` フィールドの `.describe()` を更新し、片方のみ指定時に反対側が保持されるセマンティクスを明記する

**Acceptance Criteria**:
- `internalAttendees` のみ指定した `update_meeting` で、usecase に `internalAttendees` が渡り `externalAttendees` が undefined で渡る
- usecase は既存の外部参加者を保持して attendees を構築する
- `externalAttendees` のみ指定した場合も同様に逆側を保持する
- 両方省略時は attendees 変更なし
- null 指定時は当該側を空配列として扱う
- Server Action からの `attendees` 全置換は引き続き動作する

## T-02: approvalPolicies `update` を PATCH セマンティクスに変換

- [ ] `src/app/api/mcp/tools/approvalPolicies.ts` の `updateSchema`（65-100 行付近）を修正する:
  - `name` を `z.string().min(1).optional()` にする
  - `triggerAction` を `.optional()` にする
  - `templateId` を `z.string().uuid().optional()` にする
  - `description` を `z.string().nullable().optional()` にする
  - `conditionField` を `z.string().nullable().optional()` にする
  - `conditionOperator` を `z.enum(CONDITION_OPERATORS).nullable().optional()` にする
  - `conditionValue` を `z.string().nullable().optional()` にする
- [ ] `superRefine` を調整する: `conditionField` が明示的に指定されかつ非 null / 非空のときのみ `conditionOperator` / `conditionValue` を要求する。全省略時はバリデーションをスキップする
- [ ] handler の `update` case（198-218 行付近）を修正する: `description ?? null` / `conditionField ?? null` / `conditionOperator ?? null` / `conditionValue ?? null` のフォールバックを削除し、undefined をそのまま usecase に渡す。`hasCondition` 分岐も調整する
- [ ] `src/application/usecases/updatePolicy.ts` を修正する:
  - `name` / `triggerAction` / `templateId` を optional 型にする
  - `templateId` のバリデーション（組織内テンプレート存在確認）を `templateId !== undefined` のときのみ実行する
  - repository に渡すオブジェクトで `...(x !== undefined && { x })` パターンを使い、`description ?? null` 等の `?? null` フォールバックを除去する

**Acceptance Criteria**:
- `name` のみ指定した `approval_policies.update` で、`triggerAction` / `templateId` / `description` / condition 系が undefined として usecase に渡る
- `description: null` 指定時に null が usecase に渡る（クリア）
- `description` 省略時に undefined が usecase に渡る（保持）
- `conditionField` 省略時に既存の条件が保持される
- 既存テストが green

## T-03: inquiries `update` スキーマに `.nullable()` を追加

- [ ] `src/app/api/mcp/tools/inquiries.ts` の `updateSchema`（47-60 行付近）を修正する:
  - `description` を `z.string().nullable().optional()` にする
  - `contactNote` を `z.string().nullable().optional()` にする
  - `clientId` を `z.string().uuid().nullable().optional()` にする
  - `assigneeId` を `z.string().uuid().nullable().optional()` にする
  - `budget` を `z.number().int().nullable().optional()` にする
  - `timeline` を `z.string().nullable().optional()` にする
- [ ] handler の `update` case は変更不要であることを確認する（`typedArgs.xxx` を直接 usecase に渡しており、undefined / null がそのまま透過する）

**Acceptance Criteria**:
- `description: null` を指定した `inquiries.update` で、usecase に `description: null` が渡る
- `description` 省略時に usecase に `description: undefined` が渡る
- 他の nullable 化したフィールドも同様に null / undefined が正しく透過する
- 既存テストが green

## T-04: handler → usecase 境界の部分更新 behavioral テスト

各多フィールド update 操作について、実 MCP transport 経由で `tools/call` を発行し、usecase mock に渡された引数を検証する behavioral テストを作成する。

- [ ] `src/__tests__/mcp/mcpPartialUpdate.dynamic.test.ts` を新規作成する
- [ ] テスト対象操作と検証内容（各操作につき「省略フィールドが undefined で渡る」ことを assert）:
  - `deals.update`: title のみ指定 → description / estimatedAmount 等が undefined
  - `clients.update`: name のみ指定 → industry / size 等が undefined
  - `clients.update_contact`: name のみ指定 → department / position / email / phone / isPrimary が undefined
  - `inquiries.update`: title のみ指定 → description / contactNote / budget 等が undefined
  - `contracts.update`: title のみ指定 → contractType / amount / startDate 等が undefined
  - `invoices.update`: title のみ指定 → amount / issueDate / dueDate / notes が undefined
  - `tasks.update`: description のみ指定 → assigneeId / dueDate / interactionId 等が undefined
  - `revenueTargets.update`: targetAmount のみ指定 → periodStart / periodEnd が undefined
  - `approval_templates.update`: name のみ指定 → steps / fields が undefined
  - `approval_policies.update`: name のみ指定 → triggerAction / templateId / description / condition 系が undefined
- [ ] mock.module パターンは既存の `mcpInteractions.dynamic.test.ts` に準拠する（実装捕捉 → mock.module → afterAll 復元）
- [ ] 各操作の usecase のみ mock する（rate limit は共通で mock）。ファイル単位でテストを分離し mock 汚染を防ぐ

**Acceptance Criteria**:
- 全 11 操作の「フィールド省略 → undefined 保持」がテストで固定される
- `bun test` で全テストが green

## T-05: null クリアの behavioral テスト

null 指定が usecase に正しく伝搬されることを検証する behavioral テストを作成する。

- [ ] T-04 のテストファイル（`mcpPartialUpdate.dynamic.test.ts`）に null クリアのテストケースを追加する。テストファイルが肥大化する場合は操作グループごとに分割する
- [ ] テスト対象（null 指定 → usecase に null が渡ることを assert）:
  - `deals.update`: `description: null` → description が null
  - `clients.update`: `industry: null` → industry が null
  - `clients.update_contact`: `department: null` → department が null
  - `inquiries.update`: `description: null` → description が null
  - `contracts.update`: `endDate: null` → endDate が null
  - `invoices.update`: `issueDate: null` → issueDate が null
  - `tasks.update`: `assigneeId: null` → assigneeId が null
  - `approval_policies.update`: `description: null` → description が null
  - `interactions.update_meeting`: `location: null` → location が null（既存 TC-006 と同等だが統合テストファイルにも含める）

**Acceptance Criteria**:
- null 指定が usecase に null として渡ることが全対象操作でテスト固定される
- undefined と null が区別されることが assert で明示される

## T-06: interactions attendees 部分更新の behavioral テスト

attendees の内部/外部独立部分更新を検証する behavioral テストを作成する。

- [ ] handler → usecase 境界テスト（`mcpPartialUpdate.dynamic.test.ts` または専用ファイル）:
  - `internalAttendees` のみ指定 → usecase に `internalAttendees` が渡り `externalAttendees` が undefined
  - `externalAttendees` のみ指定 → usecase に `externalAttendees` が渡り `internalAttendees` が undefined
  - 両方指定 → 両方が渡る
  - 両方省略 → 両方 undefined
  - `internalAttendees: null` → 空配列（クリア）として usecase に渡る
- [ ] usecase 単体テスト（`src/__tests__/usecases/updateMeetingPartialAttendees.dynamic.test.ts` を新規作成）:
  - 既存 attendees に内部・外部が混在する状態で `internalAttendees` のみ指定 → 更新後の attendees に既存外部 + 新規内部が含まれる
  - 既存 attendees に内部・外部が混在する状態で `externalAttendees` のみ指定 → 更新後の attendees に既存内部 + 新規外部が含まれる
  - 両方指定 → 全差し替え
  - `internalAttendees: []`（空配列）指定 → 内部側がクリアされ外部のみ残る
  - repository mock は `findById` が既存 attendees を返し、`update` に渡された attendees を検証する

**Acceptance Criteria**:
- 片方指定時に反対側が保持されることが handler テスト + usecase テストの両層で固定される
- null 指定（クリア）も検証される
- `bun test` で全テストが green

## T-07: approvalPolicies PATCH 化の usecase 単体テスト

approvalPolicies `updatePolicy` usecase の PATCH 動作を検証する単体テストを作成する。

- [ ] `src/__tests__/usecases/updatePolicyPartial.dynamic.test.ts` を新規作成する
- [ ] テストケース:
  - `name` のみ指定 → repository に `{ name: "新名" }` のみ渡される（他フィールドが含まれない）
  - `description: null` 指定 → repository に `{ description: null }` が渡される
  - `description` 省略 → repository に渡されるオブジェクトに `description` キーが含まれない
  - `templateId` 指定時のテンプレート存在確認が実行される
  - `templateId` 省略時のテンプレート存在確認がスキップされる
- [ ] repository mock は `findById` が既存ポリシーを返し、`updateById` に渡されたデータを検証する

**Acceptance Criteria**:
- PATCH セマンティクスが usecase レベルで検証される
- undefined フィールドが repository に渡されない
- null フィールドが repository に null として渡される

## T-08: 品質ゲート確認

- [ ] `bun run typecheck` が green
- [ ] `bun run lint` が green
- [ ] `bun run build` が green
- [ ] `bun test` が全 green（既存テスト + 新規テスト）

**Acceptance Criteria**:
- 全品質ゲートが green
- 既存テストの挙動が変わっていない
