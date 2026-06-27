# Spec Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:    specification is complete, consistent, and ready for implementation
  - needs-fix:   specification has issues that must be resolved before implementation
  - escalation:  unresolvable conflicts, missing context, or requires human judgment
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | File | Description | How to Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
  - CRITICAL: production outage, data loss, security breach
  - HIGH:     functional failure, clear bug, no workaround — blocks approval
  - MEDIUM:   quality degradation, maintainability issue, future risk
  - LOW:      informational, style, minor improvement
- If no findings, write a table row with "None" or omit the table body.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: needs-fix

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | HIGH | Functional bug | tasks.md > T-08 | `updateRevenueTarget.ts` のトランザクション内で `auditLogRepository.create` が `revenueTargetRepository.update` の結果を確認する前に呼ばれている。現在のコード構造は `const result = await revenueTargetRepository.update(...)` → `await auditLogRepository.create(...)` → `return result` の順。楽観的ロック追加後に version 不一致で update が 0 行を返した場合、null を return するものの audit log は INSERT 済みでトランザクションがコミットされる。結果として、実際には更新されていないのに監査ログが残るファントムエントリが発生する。T-05〜T-07 の他 usecase は `if (!updated) throw` → `if (!updated) return null` に変更することで null チェックが audit log より前に来るが、T-08 は `auditLogRepository.create` が先に来る構造なので別の対処が必要。 | T-08 に「`revenueTargetRepository.update` の戻り値が null の場合はトランザクションから null を return し `auditLogRepository.create` を呼ばない」旨の手順を追加する。具体的には `const result = await revenueTargetRepository.update(..., existing.version, tx); if (!result) return null; await auditLogRepository.create({...}, tx); return result;` の順に変更することを明記する。 |
| 2 | MEDIUM | Missing task | tasks.md | `drizzle/meta/0009_snapshot.json` の作成がタスクに含まれていない。design.md の Migration Plan ステップ 3 には「drizzle/meta/0009_snapshot.json を生成」と記載されているが、tasks.md の T-01 にはこのファイル生成が抜けている。スナップショットがないと将来の `drizzle-kit generate` が正しいスキーマ差分を計算できなくなる。 | tasks.md T-01 に「`drizzle/meta/0009_snapshot.json` を作成する（0008_snapshot.json を基に meetings / action_items / revenue_targets の version カラムを追加したスキーマ定義を反映）」を追加する。 |

## Review Notes

### Validation summary

**spec.md**: Requirement/Scenario の記述は3エンティティ × 2シナリオ（version一致→成功、version不一致→拒否）+ マイグレーションシナリオ + mapRow シナリオで構成されており、`SHALL` キーワードを含む。記述は完結かつ測定可能。

**design.md**: ADR-005 の既存パターン踏襲を明示し、D1〜D5 の設計判断が適切に記録されている。TOCTOU ギャップへの言及（Risk セクション）も適切。クライアント側 version 持ち回りがスコープ外であることは明記済み。design.md 自体に問題はない。

**tasks.md**: T-01〜T-10 の構成は概ね正確だが、Finding #1（T-08 の audit log 順序）と Finding #2（スナップショット欠落）の2点が不完全。

### Finding #1 詳細 — updateRevenueTarget 構造比較

参照実装 `updateContract.ts` のトランザクション内構造:
```typescript
const updatedContract = await contractRepository.update(..., contract.version, tx);
if (!updatedContract) {
  return null;  // audit log 未作成でトランザクション終了
}
await auditLogRepository.create({...}, tx);
return updatedContract;
```

現在の `updateRevenueTarget.ts` のトランザクション内構造:
```typescript
const result = await revenueTargetRepository.update(..., tx);
await auditLogRepository.create({...}, tx);  // ← update が null を返しても実行される
return result;
```

楽観的ロック追加後の `updateRevenueTarget.ts` で T-08 の手順のみ適用した場合:
```typescript
const result = await revenueTargetRepository.update(..., existing.version, tx);
await auditLogRepository.create({...}, tx);  // ← version 不一致時も実行され、ファントム audit log が生成される
return result;
```

T-05〜T-07 は `if (!updated) throw` → `if (!updated) return null` の変換で自然に audit log が null チェック後になるが、T-08 の updateRevenueTarget はそもそも `throw` を使っておらず、audit log が update より先にある構造のため、同じ変換では解決できない。

### セキュリティ確認

- version は常に `findById` でサーバー側から取得され、クライアント入力からは受け取らない（クライアント側 version 持ち回りはスコープ外）。version 改ざんリスクなし。
- WHERE 条件の `eq(table.version, expectedVersion)` は Drizzle ORM のパラメータ化クエリで実行されるため SQL インジェクションリスクなし。
- テナント分離（`organizationId` による WHERE）は変更なし。楽観的ロック条件追加は分離を弱めない。
- 新規公開 API・エンドポイントなし。影響範囲はサーバー側 usecase のみ。

### Migration Plan 確認

`drizzle/0009_contract_invoice_version.sql` の既存パターン（`ALTER TABLE ... ADD COLUMN "version" integer DEFAULT 1 NOT NULL`）と T-01 の指定内容は一致。journal の現在の最終エントリ（idx=8, tag=`0009_contract_invoice_version`）から次は idx=9, tag=`0010_remaining_entity_version` が正しい。SQL 内の statement-breakpoint 配置（最後の文なし）も既存パターンに準拠。
