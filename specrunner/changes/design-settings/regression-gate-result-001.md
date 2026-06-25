# Regression Gate Result — design-settings / Iteration 1

- **verdict**: approved
- **date**: 2026-06-25
- **test run**: 968 pass / 0 fail

---

## Finding 1 (HIGH): must 優先度の自動テスト 7 件が未実装（TC-010, TC-018, TC-019, TC-020, TC-021, TC-025, TC-026）

- **Status**: ✅ Fixed — still present
- **Evidence**:
  - `src/__tests__/settings/userSettingsActions.test.ts` — TC-010（ロール select 動作）を 8 アサーションでカバー
  - `src/__tests__/settings/webhookSettingsActions.test.ts` — TC-018（findLatestByEndpointIds バッチ取得）および TC-019（listWebhookEndpointsAction lastDeliveryStatus 付与）をカバー
  - `src/__tests__/settings/auditLogActions.test.ts` — TC-020（操作者フィルタ）、TC-021（対象種別フィルタ）、TC-025（auditLogRepository actorId/targetType フィルタ）、TC-026（CSV エクスポート API フィルタ）をカバー
  - `bun run test` 実行結果: 968 pass / 0 fail

---

## Finding 2 (LOW): findLatestByEndpointIds が全配信行をメモリ取得してから JS で rn===1 フィルタ

- **Status**: ✅ Accepted — no regression
- **Evidence**: `src/infrastructure/repositories/webhookDeliveryRepository.ts` L127–161 の実装は変更なし。`inArray` による単一クエリ＋JS 側 `rn===1` フィルタのパターンを維持。原所見で「デモ規模では実害なく、設計上の既知トレードオフ（design.md D3）としてスコープ外許容」と判定されており、コード修正は行われていない。後退なし。

---

## Finding 3 (LOW): actorId フィルタに whitelist 検証がない（defense-in-depth）

- **Status**: ✅ Accepted — no regression
- **Evidence**: `src/app/(dashboard)/settings/audit-logs/page.tsx` L46–66 では `actorIdStr` をそのまま `findByOrganization` の `actorId` オプションに渡しており、`orgUsers.some(u => u.id === actorIdStr)` の事前検証は追加されていない。原所見で「organizationId フィルタが先行するため情報漏洩なし、修正は任意」と判定されており、意図的に未修正。後退なし。

---

## Summary

| # | Severity | Finding | Fix status |
|---|----------|---------|------------|
| 1 | HIGH | TC-010/018/019/020/021/025/026 テスト未実装 | ✅ Fixed & verified |
| 2 | LOW | findLatestByEndpointIds JS フィルタ | ✅ Accepted tradeoff (no change expected) |
| 3 | LOW | actorId whitelist 検証なし | ✅ Accepted as optional (no change expected) |

Regressions detected: **0**
