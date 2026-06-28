# Tasks: 案件アクティビティに対象エンティティ名とリンクを表示

## T-01: TargetInfo 型を定義し getDealActivity の返却型を拡張する

- [ ] `src/application/usecases/getDealActivity.ts` に `TargetInfo` 型を export 定義する:
  ```ts
  export type TargetInfo = {
    label: string;
    href?: string;
  };
  ```
- [ ] `DealActivityResult` 型を export 定義する:
  ```ts
  export type DealActivityResult = {
    logs: AuditLog[];
    targetInfoMap: Record<string, TargetInfo>;
  };
  ```
- [ ] `getDealActivity` のパラメータに `dealTitle: string` を追加する
- [ ] 返却型を `Promise<AuditLog[]>` から `Promise<DealActivityResult>` に変更する
- [ ] この時点では `targetInfoMap` は空オブジェクト `{}` を返す（T-02 でマップ構築ロジックを追加）
- [ ] `return` 文を `return { logs: result, targetInfoMap: {} }` の形に変更し、既存の `auditLogRepository.findByTargets` 結果を `logs` に格納する

**Acceptance Criteria**:
- `TargetInfo` と `DealActivityResult` が export されている
- `getDealActivity` のシグネチャが `dealTitle: string` を含む
- 返却型が `Promise<DealActivityResult>` である
- `bun run build` が通る（呼び出し元の page.tsx は T-04 で修正するため、一時的に型エラーが出る場合は T-04 と合わせて解消）

---

## T-02: getDealActivity 内で targetInfoMap を構築する

- [ ] `@/lib/meetingLabels` から `meetingTypeLabels` を import する
- [ ] 既に取得済みの `meetings`, `contracts`, `invoices`, `actionItems` から `targetInfoMap` を構築する。キー形式は `${targetType}:${targetId}`
- [ ] deal エントリ: `deal:${dealId}` → `{ label: dealTitle, href: \`/deals/${dealId}\` }`
- [ ] meeting エントリ: 各 meeting について `meeting:${m.id}` → `{ label: \`${meetingTypeLabels[m.type] ?? m.type} ${m.date.toLocaleDateString("ja-JP")}\`, href: \`/deals/${dealId}/meetings/${m.id}\` }`
- [ ] contract エントリ: 各 contract について `contract:${c.id}` → `{ label: c.title, href: \`/contracts/${c.id}\` }`
- [ ] invoice エントリ: 各 invoice について `invoice:${inv.id}` → `{ label: inv.title }`（href なし）
- [ ] action_item エントリ: 各 actionItem について `action_item:${ai.id}` → `{ label: ai.description }`（href なし）
- [ ] deal_contact はマップに含めない（要件: contactId → 氏名の追加解決をしない）
- [ ] `return` 文の `targetInfoMap: {}` を構築したマップに差し替える

**Acceptance Criteria**:
- `targetInfoMap` に deal / meeting / contract / invoice / action_item のエントリが含まれる
- deal / meeting / contract には `href` が付与される
- invoice / action_item には `href` が付与されない
- deal_contact のエントリはマップに含まれない
- 新規のリポジトリ import / 呼び出しが追加されていない（既存の import のみ使用）
- `bun run build` が通る

---

## T-03: DealActivitySection に対象ラベル表示を追加する

- [ ] `src/app/(dashboard)/deals/[id]/DealActivitySection.tsx` の `Props` に `targetInfoMap: Record<string, { label: string; href?: string }>` を追加する
- [ ] 各アクティビティ行のレンダリングで、`targetInfoMap[\`${log.targetType}:${log.targetId}\`]` をルックアップする
- [ ] ルックアップ結果が存在する場合:
  - アクション文（`actionLabel`）の後に区切り文字「：」を挟んで対象ラベルを表示する
  - `href` がある場合は Next.js の `Link` コンポーネントでラップする。スタイルは `text-primary underline` とする
  - `href` がない場合はプレーンテキスト `<span>` で表示する
- [ ] ルックアップ結果が存在しない場合: アクション文のみ表示（従来通り、対象ラベルなし）
- [ ] `next/link` の import を追加する（href ありの場合に使用）
- [ ] 既存の表示要素（時刻・actor・アクション文）に変更を加えない

**Acceptance Criteria**:
- href ありの対象（deal / meeting / contract）がリンクとして表示される
- href なしの対象（invoice / action_item）がテキストとして表示される
- 対象がマップに無い場合はアクション文のみ表示（壊れない）
- 既存の表示要素が変更されていない
- `bun run build` が通る

---

## T-04: page.tsx の呼び出しを新しい返却型に対応させる

- [ ] `src/app/(dashboard)/deals/[id]/page.tsx` の `getDealActivity` 呼び出しを修正する:
  - パラメータに `dealTitle: deal.title` を追加する
  - `activityEnabled` が false の場合のフォールバック値を `{ logs: [], targetInfoMap: {} }` に変更する
- [ ] `getDealActivity` の結果を構造分割代入で受け取る。`Promise.all` の結果から `activities` を受け取っている部分を `activityResult` に変更し、`const { logs: activities, targetInfoMap } = activityResult` で展開する（または `Promise.all` の型に合わせて適切に分割代入する）
- [ ] `DealActivitySection` の呼び出しに `targetInfoMap={targetInfoMap}` props を追加する
- [ ] `TargetInfo` 型は import 不要（props の型は DealActivitySection の Props で定義済み）

**Acceptance Criteria**:
- `getDealActivity` に `dealTitle` が渡されている
- `DealActivitySection` に `targetInfoMap` が渡されている
- `activityEnabled` が false のとき空の logs と空の targetInfoMap が使われる
- 既存の activities / userMap の渡し方は変わらない
- `bun run build` が通る

---

## T-05: テスト — getDealActivity が targetInfoMap を返す

- [ ] `src/__tests__/usecases/dealActivity.test.ts` に以下のテストを追加する（既存テストは変更しない）
- [ ] テスト: `getDealActivity.ts` のソースに `targetInfoMap` の文字列が含まれることを静的解析で確認する
- [ ] テスト: `getDealActivity.ts` のソースに `TargetInfo` の文字列が含まれることを確認する
- [ ] テスト: `getDealActivity.ts` のソースに `dealTitle` パラメータの文字列が含まれることを確認する
- [ ] テスト: `getDealActivity.ts` のソースに `meetingTypeLabels` の参照が含まれることを確認する（meeting ラベル構築に使用）
- [ ] テスト: `getDealActivity.ts` のソースに `"/deals/"` のパスパターンが含まれることを確認する（deal / meeting の href 構築）
- [ ] テスト: `getDealActivity.ts` のソースに `"/contracts/"` のパスパターンが含まれることを確認する（contract の href 構築）
- [ ] テスト: `getDealActivity.ts` のソースに `deal_contact` のマップキーが含まれ**ない**ことを確認する（deal_contact はマップ対象外）。具体的には、ソース内の targetInfoMap 構築ブロックに `deal_contact` を targetInfoMap のキーとして設定する記述が無いことを確認する

**Acceptance Criteria**:
- targetInfoMap / TargetInfo / dealTitle が getDealActivity に含まれることがテストで検証される
- href パターン（/deals/, /contracts/）がテストで検証される
- deal_contact がマップ対象外であることがテストで検証される
- 既存テストが無変更で green
- `bun test` が全件 green

---

## T-06: テスト — DealActivitySection の対象ラベル表示

- [ ] `src/__tests__/components/DealActivitySection.test.ts` を新規作成する
- [ ] テスト: `DealActivitySection.tsx` のソースに `targetInfoMap` の文字列が含まれることを静的解析で確認する
- [ ] テスト: `DealActivitySection.tsx` のソースに `next/link` の import（`Link`）が含まれることを確認する（href ありの対象をリンク表示するため）
- [ ] テスト: `DealActivitySection.tsx` のソースに `href` の参照が含まれることを確認する
- [ ] テスト: `DealActivitySection.tsx` のソースに `formatRelativeTime` の呼び出しが残っていることを確認する（既存表示の維持）
- [ ] テスト: `DealActivitySection.tsx` のソースに `getActionLabel` の呼び出しが残っていることを確認する（既存表示の維持）

**Acceptance Criteria**:
- targetInfoMap / Link / href の使用がテストで検証される
- 既存表示要素（formatRelativeTime, getActionLabel）の維持がテストで検証される
- `bun test` が全件 green

---

## T-07: テスト — フォールバック動作

- [ ] `src/__tests__/components/DealActivitySection.test.ts` に以下のテストを追加する
- [ ] テスト: `DealActivitySection.tsx` のソースに `targetType` と `targetId` を組み合わせたキーでの targetInfoMap ルックアップパターンが含まれることを確認する（ルックアップなしでは対象表示できないため、このパターンが存在すること自体がフォールバック設計の前提）
- [ ] テスト: `DealActivitySection.tsx` のソースに `userMap` の参照が残っていることを確認する（既存の actor 解決が不変）

**Acceptance Criteria**:
- targetInfoMap のルックアップパターンがテストで検証される
- 既存の userMap 参照が維持されていることがテストで検証される
- `bun test` が全件 green

---

## T-08: 最終確認 — ビルド・型チェック・lint・テスト

- [ ] `bun run build` を実行し、ビルドが成功することを確認する
- [ ] `bunx tsc --noEmit` を実行し、型チェックが通ることを確認する
- [ ] `bun test` を実行し、全テストが green であることを確認する（既存テスト無変更で green）
- [ ] `bun run lint` を実行し、lint エラーがないことを確認する

**Acceptance Criteria**:
- `bun run build` 成功
- `typecheck` green
- `bun test` 全件 green（既存テスト無変更）
- `bun run lint` エラーなし
