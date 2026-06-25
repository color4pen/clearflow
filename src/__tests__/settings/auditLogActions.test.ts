/**
 * 監査ログ設定アクション — 静的コード解析テスト
 *
 * TC-020: 操作者でフィルタできる
 * TC-021: 対象種別でフィルタできる
 * TC-025: auditLogRepository が actorId/targetType フィルタをサポートする
 * TC-026: CSV エクスポート API が actorId/targetType フィルタをサポートする
 *
 * ライブ DB / 認証を使わず、ソースファイルを静的解析して実装パターンを確認する。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

// ---------------------------------------------------------------------------
// TC-025: auditLogRepository が actorId/targetType フィルタをサポートする
// ---------------------------------------------------------------------------

describe("TC-025: auditLogRepository — actorId/targetType フィルタ", () => {
  it("findByOrganization が options.actorId を受け付ける", async () => {
    const src = await readSrc("infrastructure/repositories/auditLogRepository.ts");
    expect(src).toContain("actorId");
    const fnIdx = src.indexOf("findByOrganization");
    expect(fnIdx).toBeGreaterThan(-1);
    const afterFn = src.slice(fnIdx);
    expect(afterFn).toContain("actorId?:");
  });

  it("actorId が指定された場合に eq(auditLogs.actorId, ...) 条件を追加する", async () => {
    const src = await readSrc("infrastructure/repositories/auditLogRepository.ts");
    expect(src).toContain("auditLogs.actorId");
    // actorId に対して eq フィルタが適用される
    const actorIdx = src.indexOf("auditLogs.actorId");
    expect(actorIdx).toBeGreaterThan(-1);
    expect(src.slice(Math.max(0, actorIdx - 20), actorIdx + 50)).toContain("eq(");
  });

  it("findByOrganization が options.targetType を受け付ける", async () => {
    const src = await readSrc("infrastructure/repositories/auditLogRepository.ts");
    const fnIdx = src.indexOf("findByOrganization");
    const afterFn = src.slice(fnIdx);
    expect(afterFn).toContain("targetType?:");
  });

  it("targetType が指定された場合に eq(auditLogs.targetType, ...) 条件を追加する", async () => {
    const src = await readSrc("infrastructure/repositories/auditLogRepository.ts");
    expect(src).toContain("auditLogs.targetType");
    const targetIdx = src.indexOf("auditLogs.targetType");
    expect(targetIdx).toBeGreaterThan(-1);
    expect(src.slice(Math.max(0, targetIdx - 20), targetIdx + 60)).toContain("eq(");
  });

  it("organizationId を常にフィルタ条件に含める", async () => {
    const src = await readSrc("infrastructure/repositories/auditLogRepository.ts");
    const fnIdx = src.indexOf("findByOrganization");
    const afterFn = src.slice(fnIdx);
    expect(afterFn).toContain("auditLogs.organizationId");
    expect(afterFn).toContain("eq(");
  });
});

// ---------------------------------------------------------------------------
// TC-020: 操作者でフィルタできる
// ---------------------------------------------------------------------------

describe("TC-020: 監査ログページ — 操作者フィルタ", () => {
  it("監査ログページが actorId を searchParams から読み取る", async () => {
    const src = await readSrc("app/(dashboard)/settings/audit-logs/page.tsx");
    expect(src).toContain("actorId");
    expect(src).toContain("searchParams");
  });

  it("actorId を auditLogRepository.findByOrganization に渡す", async () => {
    const src = await readSrc("app/(dashboard)/settings/audit-logs/page.tsx");
    expect(src).toContain("findByOrganization");
    const fnIdx = src.indexOf("findByOrganization");
    const afterFn = src.slice(fnIdx);
    // findByOrganization の呼び出しに actorId が含まれる
    const callEnd = afterFn.indexOf(")");
    expect(afterFn.slice(0, callEnd + 1)).toContain("actorId");
  });

  it("操作者フィルタ UI（Select）が actorId name 属性で存在する", async () => {
    const src = await readSrc("app/(dashboard)/settings/audit-logs/page.tsx");
    expect(src).toContain('name="actorId"');
  });

  it("組織ユーザーリストをフィルタ option として表示する", async () => {
    const src = await readSrc("app/(dashboard)/settings/audit-logs/page.tsx");
    expect(src).toContain("orgUsers");
    expect(src).toContain("listOrganizationUsers");
  });
});

// ---------------------------------------------------------------------------
// TC-021: 対象種別でフィルタできる
// ---------------------------------------------------------------------------

describe("TC-021: 監査ログページ — 対象種別フィルタ", () => {
  it("監査ログページが targetType を searchParams から読み取る", async () => {
    const src = await readSrc("app/(dashboard)/settings/audit-logs/page.tsx");
    expect(src).toContain("targetType");
    expect(src).toContain("searchParams");
  });

  it("targetType を auditLogRepository.findByOrganization に渡す", async () => {
    const src = await readSrc("app/(dashboard)/settings/audit-logs/page.tsx");
    const fnIdx = src.indexOf("findByOrganization");
    const afterFn = src.slice(fnIdx);
    const callEnd = afterFn.indexOf(")");
    expect(afterFn.slice(0, callEnd + 1)).toContain("targetType");
  });

  it("対象種別フィルタ UI（Select）が targetType name 属性で存在する", async () => {
    const src = await readSrc("app/(dashboard)/settings/audit-logs/page.tsx");
    expect(src).toContain('name="targetType"');
  });

  it("TARGET_TYPE_OPTIONS に request が含まれる", async () => {
    const src = await readSrc("app/(dashboard)/settings/audit-logs/page.tsx");
    expect(src).toContain("TARGET_TYPE_OPTIONS");
    expect(src).toContain('"request"');
  });
});

// ---------------------------------------------------------------------------
// TC-026: CSV エクスポート API が actorId/targetType フィルタをサポートする
// ---------------------------------------------------------------------------

describe("TC-026: CSV エクスポート API — actorId/targetType フィルタ", () => {
  it("GET ハンドラが actorId クエリパラメータを読み取る", async () => {
    const src = await readSrc("app/api/audit-logs/export/route.ts");
    expect(src).toContain("actorId");
    expect(src).toContain("searchParams.get");
    const actorIdx = src.indexOf('"actorId"');
    expect(actorIdx).toBeGreaterThan(-1);
  });

  it("GET ハンドラが targetType クエリパラメータを読み取る", async () => {
    const src = await readSrc("app/api/audit-logs/export/route.ts");
    expect(src).toContain("targetType");
    const targetIdx = src.indexOf('"targetType"');
    expect(targetIdx).toBeGreaterThan(-1);
  });

  it("actorId を findByOrganization に渡す", async () => {
    const src = await readSrc("app/api/audit-logs/export/route.ts");
    expect(src).toContain("findByOrganization");
    const fnIdx = src.indexOf("findByOrganization");
    const afterFn = src.slice(fnIdx);
    const callEnd = afterFn.indexOf(")");
    expect(afterFn.slice(0, callEnd + 1)).toContain("actorId");
  });

  it("targetType を findByOrganization に渡す", async () => {
    const src = await readSrc("app/api/audit-logs/export/route.ts");
    const fnIdx = src.indexOf("findByOrganization");
    const afterFn = src.slice(fnIdx);
    const callEnd = afterFn.indexOf(")");
    expect(afterFn.slice(0, callEnd + 1)).toContain("targetType");
  });

  it("Content-Type: text/csv で返す", async () => {
    const src = await readSrc("app/api/audit-logs/export/route.ts");
    expect(src).toContain("text/csv");
  });

  it("admin ロールのみアクセスを許可する", async () => {
    const src = await readSrc("app/api/audit-logs/export/route.ts");
    expect(src).toContain("admin");
    expect(src).toContain("Forbidden");
  });
});
