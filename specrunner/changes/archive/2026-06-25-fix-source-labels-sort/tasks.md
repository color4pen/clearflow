# Tasks: 経路ラベル追加とテーブル並び順の修正

## T-01: sourceLabels に email と agent_service を追加する

- [x] `src/app/(dashboard)/labels.ts` の `sourceLabels` に `email: "メール"` と `agent_service: "仲介サービス"` を追加する
- [x] 挿入位置は enum 定義順（web, phone, email, referral, agent_service, exhibition, other）に合わせる。`phone` の後に `email`、`referral` の後に `agent_service` を挿入する

**Acceptance Criteria**:
- sourceLabels のキーが `["web", "phone", "email", "referral", "agent_service", "exhibition", "other"]` の 7 値を含む
- `typecheck` が green

## T-02: InquiryForm の sourceOptions に email と agent_service を追加する

- [x] `src/app/(dashboard)/inquiries/new/InquiryForm.tsx` の `sourceOptions` 配列に `{ value: "email", label: "メール" }` と `{ value: "agent_service", label: "仲介サービス" }` を追加する
- [x] 順序は先頭のプレースホルダー（value=""）の後に web, phone, email, referral, agent_service, exhibition, other とする
- [x] labels.ts からの自動生成は行わない（D2: 明示性優先）

**Acceptance Criteria**:
- sourceOptions が プレースホルダー + 7 値 = 8 要素になる
- 順序が web → phone → email → referral → agent_service → exhibition → other である
- `typecheck` が green

## T-03: inquiryRepository の orderBy を desc に変更する

- [x] `src/infrastructure/repositories/inquiryRepository.ts` の import に `desc` を追加する
- [x] `findAllByOrganization`（line 77）: `.orderBy(inquiries.createdAt)` → `.orderBy(desc(inquiries.createdAt))`
- [x] `findAllWithClientByOrganization`（line 92）: `.orderBy(inquiries.createdAt)` → `.orderBy(desc(inquiries.createdAt))`
- [x] `findByClientId`（line 169）: `.orderBy(inquiries.createdAt)` → `.orderBy(desc(inquiries.createdAt))`

**Acceptance Criteria**:
- 3 箇所の orderBy が `desc(inquiries.createdAt)` に変更されている
- `typecheck` が green

## T-04: dealRepository の orderBy を desc に変更する

- [x] `src/infrastructure/repositories/dealRepository.ts` の import に `desc` を追加する（既存の `asc` の隣）
- [x] `findAllByOrganization`（line 101）: `.orderBy(asc(deals.createdAt))` → `.orderBy(desc(deals.createdAt))`
- [x] `findAllByClientId`（line 123）: `.orderBy(asc(deals.createdAt))` → `.orderBy(desc(deals.createdAt))`

**Acceptance Criteria**:
- 2 箇所の orderBy が `desc(deals.createdAt)` に変更されている
- 未使用の `asc` インポートが残る場合は削除する（lint 対策）
- `typecheck` が green

## T-05: contractRepository の orderBy を desc に変更する

- [x] `src/infrastructure/repositories/contractRepository.ts` の import に `desc` を追加する（既存の `asc` の隣）
- [x] `findAllByClientId`（line 105）: `.orderBy(asc(contracts.createdAt))` → `.orderBy(desc(contracts.createdAt))`
- [x] `findAllByOrganization`（line 122）: `.orderBy(asc(contracts.createdAt))` → `.orderBy(desc(contracts.createdAt))`

**Acceptance Criteria**:
- 2 箇所の orderBy が `desc(contracts.createdAt)` に変更されている
- 未使用の `asc` インポートが残る場合は削除する（lint 対策）
- `typecheck` が green

## T-06: requestRepository の orderBy を desc に変更する

- [x] `src/infrastructure/repositories/requestRepository.ts` の import に `desc` を追加する
- [x] `findAllByOrganization`（line 116）: `.orderBy(requests.createdAt)` → `.orderBy(desc(requests.createdAt))`
- [x] `findAllWithStepsByOrganization`（line 140）: `.orderBy(requests.createdAt, approvalSteps.stepOrder)` → `.orderBy(desc(requests.createdAt), approvalSteps.stepOrder)`
  - `approvalSteps.stepOrder` は昇順のまま維持する（要件 4）

**Acceptance Criteria**:
- `findAllByOrganization` の orderBy が `desc(requests.createdAt)` に変更されている
- `findAllWithStepsByOrganization` の orderBy が `desc(requests.createdAt), approvalSteps.stepOrder` に変更されている
- `typecheck` が green

## T-07: clientRepository の orderBy を desc に変更する

- [x] `src/infrastructure/repositories/clientRepository.ts` の import に `desc` を追加する
- [x] `findAllByOrganization`（line 82）: `.orderBy(clients.createdAt)` → `.orderBy(desc(clients.createdAt))`

**Acceptance Criteria**:
- orderBy が `desc(clients.createdAt)` に変更されている
- `typecheck` が green

## T-08: 全体の型チェックとテスト実行

- [x] `bun run build` でビルドが成功することを確認する
- [x] テストがある場合は実行して green を確認する

**Acceptance Criteria**:
- `typecheck && test` が green
- ソート順をアサートするテストがある場合は期待値が更新済み
