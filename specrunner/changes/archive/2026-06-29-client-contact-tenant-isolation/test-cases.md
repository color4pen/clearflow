# Test Cases: 顧客担当者（clientContact）のテナント分離を repository で強制する

## Summary

- **Total**: 38 cases
- **Automated** (unit/integration): 35
- **Manual**: 3
- **Priority**: must: 33, should: 5, could: 0

---

<!-- =========================================================
     Scenario 由来 TC（Source 参照のみ、GWT 省略）
     ========================================================= -->

### TC-001: findContactsByClientId — 自組織の担当者を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: findContactsByClientId は organizationId でテナント分離する > Scenario: 自組織の clientId で担当者を取得する

---

### TC-002: findContactsByClientId — 他組織の clientId には空配列を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: findContactsByClientId は organizationId でテナント分離する > Scenario: 他組織の clientId で担当者を取得しようとする

---

### TC-003: updateContact — 自組織の担当者を更新する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: updateContact は organizationId でテナント分離する > Scenario: 自組織の担当者を更新する

---

### TC-004: updateContact — 他組織の担当者は更新せず null を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: updateContact は organizationId でテナント分離する > Scenario: 他組織の担当者を更新しようとする

---

### TC-005: deleteContact — 自組織の担当者を削除する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: deleteContact は organizationId でテナント分離する > Scenario: 自組織の担当者を削除する

---

### TC-006: deleteContact — 他組織の担当者は削除せず false を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: deleteContact は organizationId でテナント分離する > Scenario: 他組織の担当者を削除しようとする

---

### TC-007: countContactsByClientIds — 自組織の担当者数を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: countContactsByClientIds は organizationId でテナント分離する > Scenario: 自組織の clientId で担当者数を取得する

---

### TC-008: countContactsByClientIds — 他組織の clientId はカウント対象外

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: countContactsByClientIds は organizationId でテナント分離する > Scenario: 他組織の clientId で担当者数を取得しようとする

---

### TC-009: typecheck が通る

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 全呼び出し元が organizationId を repository に伝搬する > Scenario: typecheck が通る

---

### TC-010: 既存テストが通る

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 既存の振る舞いが維持される > Scenario: 既存テストが通る

---

<!-- =========================================================
     非 Scenario 由来 TC（GWT 必須）
     ========================================================= -->

### TC-011: findContactsByClientId のシグネチャに organizationId が追加されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `src/infrastructure/repositories/clientRepository.ts` のソースが読み込める
**WHEN** `findContactsByClientId` 関数定義部分を静的に検査する
**THEN** シグネチャに `organizationId` パラメータが含まれる

---

### TC-012: findContactsByClientId クエリに clients への innerJoin と organizationId 条件が含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `src/infrastructure/repositories/clientRepository.ts` のソースが読み込める
**WHEN** `findContactsByClientId` 関数本体を静的に検査する
**THEN** `innerJoin` と `clients.organizationId` の両方が含まれる

---

### TC-013: findContactsByClientId の JSDoc が repository 強制の旨に更新されている

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-01

**GIVEN** `src/infrastructure/repositories/clientRepository.ts` のソースが読み込める
**WHEN** `findContactsByClientId` の JSDoc コメントを静的に検査する
**THEN** 「呼び出し前に findById で確認すること」の記述が存在せず、repository が organizationId で強制する旨の記述が含まれる

---

### TC-014: updateContact のシグネチャに organizationId が追加されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `src/infrastructure/repositories/clientRepository.ts` のソースが読み込める
**WHEN** `updateContact` 関数定義部分を静的に検査する
**THEN** シグネチャに `organizationId` パラメータが含まれる

---

### TC-015: updateContact のクエリ条件に organizationId が組み込まれている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `src/infrastructure/repositories/clientRepository.ts` のソースが読み込める
**WHEN** `updateContact` 関数本体を静的に検査する
**THEN** `organizationId` を参照する where 条件が含まれる

---

### TC-016: updateContact の JSDoc が repository 強制の旨に更新されている

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-02

**GIVEN** `src/infrastructure/repositories/clientRepository.ts` のソースが読み込める
**WHEN** `updateContact` の JSDoc コメントを静的に検査する
**THEN** 「呼び出し前に findById で確認すること」の記述が存在せず、repository が organizationId で強制する旨の記述が含まれる

---

### TC-017: deleteContact のシグネチャに organizationId が追加されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `src/infrastructure/repositories/clientRepository.ts` のソースが読み込める
**WHEN** `deleteContact` 関数定義部分を静的に検査する
**THEN** シグネチャに `organizationId` パラメータが含まれる

---

### TC-018: deleteContact のクエリ条件に organizationId が組み込まれている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `src/infrastructure/repositories/clientRepository.ts` のソースが読み込める
**WHEN** `deleteContact` 関数本体を静的に検査する
**THEN** `organizationId` を参照する where 条件が含まれる

---

### TC-019: deleteContact の JSDoc が repository 強制の旨に更新されている

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03

**GIVEN** `src/infrastructure/repositories/clientRepository.ts` のソースが読み込める
**WHEN** `deleteContact` の JSDoc コメントを静的に検査する
**THEN** 「呼び出し前に findById で確認すること」の記述が存在せず、repository が organizationId で強制する旨の記述が含まれる

---

### TC-020: countContactsByClientIds のシグネチャに organizationId が追加されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** `src/infrastructure/repositories/clientRepository.ts` のソースが読み込める
**WHEN** `countContactsByClientIds` 関数定義部分を静的に検査する
**THEN** シグネチャに `organizationId` パラメータが含まれる

---

### TC-021: countContactsByClientIds クエリに clients への innerJoin と organizationId 条件が含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** `src/infrastructure/repositories/clientRepository.ts` のソースが読み込める
**WHEN** `countContactsByClientIds` 関数本体を静的に検査する
**THEN** `innerJoin` と `clients.organizationId` の両方が含まれる

---

### TC-022: validatePrimaryUniqueness のシグネチャに organizationId が追加されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** `src/application/services/clientContactService.ts` のソースが読み込める
**WHEN** `validatePrimaryUniqueness` 関数定義部分を静的に検査する
**THEN** シグネチャに `organizationId` パラメータが含まれる

---

### TC-023: validatePrimaryUniqueness 内の findContactsByClientId 呼び出しに organizationId が渡されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** `src/application/services/clientContactService.ts` のソースが読み込める
**WHEN** `validatePrimaryUniqueness` 関数本体内の `findContactsByClientId` 呼び出し箇所を静的に検査する
**THEN** `organizationId` が引数として渡されている

---

### TC-024: listClientContacts usecase のシグネチャに organizationId が追加されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** `src/application/usecases/listClientContacts.ts` のソースが読み込める
**WHEN** `listClientContacts` 関数定義部分を静的に検査する
**THEN** シグネチャに `organizationId` パラメータが含まれる

---

### TC-025: listClientContacts 内の findContactsByClientId 呼び出しに organizationId が渡されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** `src/application/usecases/listClientContacts.ts` のソースが読み込める
**WHEN** `listClientContacts` 関数本体内の `findContactsByClientId` 呼び出し箇所を静的に検査する
**THEN** `organizationId` が引数として渡されている

---

### TC-026: deleteClientContact usecase の deleteContact 呼び出しに organizationId が渡されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** `src/application/usecases/deleteClientContact.ts` のソースが読み込める
**WHEN** `deleteContact` 呼び出し箇所を静的に検査する
**THEN** `data.organizationId` が第 3 引数として渡されている

---

### TC-027: createClientContact usecase の validatePrimaryUniqueness 呼び出しに organizationId が渡されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** `src/application/usecases/createClientContact.ts` のソースが読み込める
**WHEN** `validatePrimaryUniqueness` 呼び出し箇所を静的に検査する
**THEN** `data.organizationId` が第 2 引数として渡されている

---

### TC-028: updateClientContactAction の validatePrimaryUniqueness 呼び出しに organizationId が渡されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** `src/app/actions/clients.ts` のソースが読み込める
**WHEN** `updateClientContactAction` 内の `validatePrimaryUniqueness` 呼び出し箇所を静的に検査する
**THEN** `session.user.organizationId` が引数として渡されている

---

### TC-029: updateClientContactAction の updateContact 呼び出しに organizationId が渡されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** `src/app/actions/clients.ts` のソースが読み込める
**WHEN** `updateClientContactAction` 内の `updateContact` 呼び出し箇所を静的に検査する
**THEN** `session.user.organizationId` が第 3 引数として渡されている

---

### TC-030: clients/[id] RSC ページの listClientContacts 呼び出しに organizationId が渡されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** `src/app/(dashboard)/clients/[id]/page.tsx` のソースが読み込める
**WHEN** `listClientContacts` 呼び出し箇所を静的に検査する
**THEN** `organizationId` が第 2 引数として渡されている

---

### TC-031: deals/[id] RSC ページの listClientContacts 呼び出しに organizationId が渡されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** `src/app/(dashboard)/deals/[id]/page.tsx` のソースが読み込める
**WHEN** `listClientContacts` 呼び出し箇所を静的に検査する
**THEN** `organizationId` が第 2 引数として渡されている

---

### TC-032: deals/[id]/meetings/new RSC ページの listClientContacts 呼び出しに organizationId が渡されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** `src/app/(dashboard)/deals/[id]/meetings/new/page.tsx` のソースが読み込める
**WHEN** `listClientContacts` 呼び出し箇所を静的に検査する
**THEN** `organizationId` が第 2 引数として渡されている

---

### TC-033: deals/[id]/meetings/[meetingId] RSC ページの listClientContacts 呼び出しに organizationId が渡されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** `src/app/(dashboard)/deals/[id]/meetings/[meetingId]/page.tsx` のソースが読み込める
**WHEN** `listClientContacts` 呼び出し箇所を静的に検査する
**THEN** `organizationId` が第 2 引数として渡されている

---

### TC-034: テナント分離テストファイルが存在する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-11

**GIVEN** プロジェクトルートが読み込める
**WHEN** `src/__tests__/infrastructure/clientContactTenantIsolation.test.ts` の存在を確認する
**THEN** ファイルが存在する

---

### TC-035: テナント分離テストが repository の 4 メソッドと全呼び出し元を静的検証している

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-11

**GIVEN** `src/__tests__/infrastructure/clientContactTenantIsolation.test.ts` が存在する
**WHEN** テストファイルの内容を静的に検査する
**THEN** `findContactsByClientId`・`updateContact`・`deleteContact`・`countContactsByClientIds` の organizationId パラメータ検証と、`listClientContacts`・`deleteClientContact`・`updateClientContactAction` の organizationId 伝搬検証がそれぞれ含まれる

---

### TC-036: bun run build が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-12

**GIVEN** 全変更（T-01〜T-11）が完了している
**WHEN** `bun run build` を実行する
**THEN** exit 0 でビルドが完了する

---

### TC-037: usecase / action 側の親 client org 検証コードが残っている（多重防御）

**Category**: unit
**Priority**: should
**Source**: design.md > D2

**GIVEN** `src/application/usecases/deleteClientContact.ts` および `src/app/actions/clients.ts` のソースが読み込める
**WHEN** 各ファイル内の parent client 取得（`findById`）呼び出しを静的に検査する
**THEN** `findById` の呼び出しが残存しており、repository の organizationId 強制と合わせた多重防御が維持されている

---

### TC-038: usecases が domain と infrastructure を import し、domain から infrastructure への逆依存がない

**Category**: unit
**Priority**: should
**Source**: design.md > Goals

**GIVEN** `src/application/usecases/listClientContacts.ts` および `src/application/usecases/deleteClientContact.ts` のソースが読み込める
**WHEN** import 文を静的に検査する
**THEN** usecases が `@/infrastructure/repositories` または `@/domain` を import しており、domain 層のファイルに `@/infrastructure` への import が存在しない

---

## Result

```yaml
result: completed
total: 38
automated: 35
manual: 3
must: 33
should: 5
could: 0
blocked_reasons: []
```
