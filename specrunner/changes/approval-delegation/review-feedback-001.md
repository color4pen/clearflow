# Code Review Feedback — iteration 001

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
- iteration line format (exact): `- **iteration**: NNN` (3-digit zero-padded integer)
- Findings table MUST have exactly 7 columns in this order:
  # | Severity | Category | File | Description | How to Fix | Fix
  - Fix column: yes = fixer should address this finding; no = skip (pre-existing / out-of-scope)
- Scores table columns: Category | Score | Weight
  - Valid Category values: correctness | security | architecture | performance | maintainability | testing
  - Score: integer 1-10
  - Weight: decimal as defined below
- total line format (exact): `- **total**: <decimal>`
- Default weights: correctness=0.30, security=0.25, architecture=0.15, performance=0.10, maintainability=0.10, testing=0.10
- Scores table is optional but recommended.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approved
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | low | maintainability | `src/application/usecases/approveRequest.ts` | `canApprove` が import されているが使用されていない（lint warning: `'canApprove' is defined but never used`）。`canApproveWithDelegation` への移行後に import 文が未クリーンアップ。 | import 文から `canApprove` を削除する。 | yes |
| 2 | medium | testing | `src/app/(dashboard)/settings/delegations/page.tsx` | T-12 の仕様「fromUserId（ユーザー選択）、toUserId（ユーザー選択）」「ユーザー一覧は同一組織内のユーザーを取得する usecase / repository を利用する」に反し、UUID プレースホルダーのテキスト入力が実装されている。管理者が UUIDs を手入力しなければならず、誤操作リスクが高い。 | `userRepository.findByOrganization` 等で同一 org ユーザー一覧を取得し `<select>` に変更する。 | yes |
| 3 | low | maintainability | `src/infrastructure/repositories/approvalDelegationRepository.ts` | `create(data, tx?)` と `update` 内で、INSERT/UPDATE は `queryRunner`（tx 可）で実行するが、直後の fromUserRole 取得には bare `db` を使用している。TX コンテキストの不一致。現行の呼び出し元（`createDelegation`）は TX を渡していないため動作に影響はないが、将来 TX 内で呼んだ場合に読み取りが TX 外になる。 | `create` の二次 SELECT および `update` の二次 SELECT を `queryRunner` または TX に統一する。`update` も `tx?` 引数を受け取れるよう拡張するとベター。 | yes |
| 4 | low | testing | `src/domain/services/approvalStepService.ts` | test-cases.md TC-003「Inactive delegation is ignored」（must）は `canApproveWithDelegation` の単体テストで検証されていない。同関数は入力が事前フィルタ済みであることを前提（JsDoc に明記）とし、`isActive` を再チェックしないため、未フィルタなデータが渡された場合の防衛がない。現行の呼び出し元は常に `findActiveByToUserId`（is_active=true でフィルタ）を経由するため実害なし。 | `canApproveWithDelegation` の unit test に「`isActive: false` な委譲を渡しても承認されない」ケースを追加するか、または JsDoc で「入力は呼び出し元がフィルタ責任を持つ」設計意図を明示したうえで、テスト-cases.md TC-003 のカバレッジをリポジトリ層の静的解析テストとして補完する。 | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 7 | 0.10 |
| testing | 7 | 0.10 |

- **total**: 8.60

## Summary

代理承認の中核実装品質は高い。設計判断（D3: canApprove 純粋関数維持、D2: TX 内委譲取得、D4: admin 限定）が正しく実装されており、受け入れ基準の重要項目はすべて充足している。

**確認済み正常実装:**
- `approval_delegations` テーブル（全カラム・複合インデックス・リレーション）✓
- `canApproveWithDelegation`: 直接ロール一致優先 → 委譲マッチ（最新 startDate 採用）→ 拒否 の 3 段階ロジック ✓
- `canApprove` の後方互換性（引数なし呼び出し）✓
- `approveRequest` pre-TX fast-fail + TX 内再チェック（TOCTOU 防止）✓
- `delegatedFrom` は委譲経由時のみ audit_log.metadata に記録 ✓
- Server Actions が session から `organizationId` を取得（TC-024 クライアント汚染防止）✓
- 自己委譲・クロスオーグ・期間重複・startDate >= endDate の各バリデーション ✓
- seed の FK 削除順（`approvalDelegations` → `users`）✓
- build / lint 通過（警告1件は finding #1 として報告）✓
- ゼロステップフローへの影響なし（T-09 スコープ維持）✓
- `rejectRequest` スコープ外（T-10 維持）✓

**要修正 (4 件、すべて low/medium):**

1. **[low]** `canApprove` の不要 import 削除（lint warning 解消）
2. **[medium]** 委譲管理 UI を UUID テキスト入力 → ユーザー選択 `<select>` に変更（T-12 仕様準拠）
3. **[low]** repository の `create`/`update` 内の二次 SELECT を `queryRunner`/TX に統一
4. **[low]** TC-003「Inactive delegation is ignored」の domain unit test 追加または説明補完

いずれも機能の正確性・セキュリティには影響しない。code-fixer で対応可能。
