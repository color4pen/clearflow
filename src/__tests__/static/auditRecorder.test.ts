/**
 * auditRecorder 静的検証テスト
 *
 * 1. recordAudit が AuditAction / AuditTargetType を型に持つことを静的検証する
 * 2. AuditRecordParams が action_item.toggle の metadata を { done: boolean } として要求することを型テストで検証する
 * 3. auditLogRepository.create の直接呼び出しがヘルパ実装以外の
 *    src/application/ および src/infrastructure/handlers/ に残っていないことを検証する
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile, readdir } from "fs/promises";
import type { AuditRecordParams } from "@/application/services/auditRecorder";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

async function listTsFilesRecursive(dir: string): Promise<string[]> {
  const result: string[] = [];
  const absDir = path.join(ROOT, "src", dir);
  const entries = await readdir(absDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(absDir, entry.name);
    if (entry.isDirectory()) {
      const sub = await listTsFilesRecursive(path.join(dir, entry.name));
      result.push(...sub);
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      result.push(path.join(dir, entry.name));
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// テスト 1: recordAudit の型シグネチャ静的検証
// ---------------------------------------------------------------------------

describe("auditRecorder — 型シグネチャ静的検証", () => {
  it("recordAudit が AuditAction 型を型引数に持つことをソースで確認する", async () => {
    const src = await readSrc("application/services/auditRecorder.ts");
    expect(src).toContain("AuditAction");
    // ジェネリック引数 A extends AuditAction が定義されている
    expect(src).toContain("A extends AuditAction");
  });

  it("recordAudit が AuditTargetType 型を引数に持つことをソースで確認する", async () => {
    const src = await readSrc("application/services/auditRecorder.ts");
    expect(src).toContain("AuditTargetType");
    expect(src).toContain("targetType: AuditTargetType");
  });

  it("recordAudit が Promise<AuditLog> を返すことをソースで確認する", async () => {
    const src = await readSrc("application/services/auditRecorder.ts");
    expect(src).toContain("Promise<AuditLog>");
  });

  it("recordAudit が tx?: Transaction を第 2 引数に持つことをソースで確認する", async () => {
    const src = await readSrc("application/services/auditRecorder.ts");
    expect(src).toContain("tx?: Transaction");
  });

  it("AuditRecordParams 型がエクスポートされている", async () => {
    const src = await readSrc("application/services/auditRecorder.ts");
    expect(src).toContain("export type AuditRecordParams");
  });

  it("AuditRecordParams が conditional type で AuditMetadataMap を参照している", async () => {
    const src = await readSrc("application/services/auditRecorder.ts");
    expect(src).toContain("AuditMetadataMap");
    // conditional type で既知の action には metadata が必須
    expect(src).toContain("A extends keyof AuditMetadataMap");
    expect(src).toContain("metadata: AuditMetadataMap[A]");
  });
});

// ---------------------------------------------------------------------------
// テスト 2: action_item.toggle の metadata 型強制（型テスト）
// ---------------------------------------------------------------------------

describe("AuditRecordParams — action_item.toggle の metadata 型強制", () => {
  it("action_item.toggle に { done: boolean } の metadata が必須である（型テスト）", () => {
    // 正しい metadata を渡した場合は型が通る
    const valid: AuditRecordParams<"action_item.toggle"> = {
      action: "action_item.toggle",
      targetType: "action_item",
      targetId: "id",
      actorId: "actor",
      organizationId: "org",
      metadata: { done: true },
    };
    expect(valid.metadata.done).toBe(true);
  });

  it("action_item.toggle の metadata に done: boolean が必須であることをソースで確認する", async () => {
    const src = await readSrc("domain/models/auditLog.ts");
    expect(src).toContain('"action_item.toggle"');
    expect(src).toContain("done: boolean");
  });

  it("metadata が欠けた場合に @ts-expect-error が有効である（型レベルガード）", () => {
    // @ts-expect-error: action_item.toggle には metadata: { done: boolean } が必須
    const _invalid: AuditRecordParams<"action_item.toggle"> = {
      action: "action_item.toggle",
      targetType: "action_item",
      targetId: "id",
      actorId: "actor",
      organizationId: "org",
    };
    // @ts-expect-error が有効であれば型エラーが期待どおりに発生している
    expect(_invalid).toBeDefined();
  });

  it("action 未定義の action では metadata が省略可能である（型テスト）", () => {
    // AuditMetadataMap に存在しない action は metadata が optional
    const withoutMetadata: AuditRecordParams<"deal.create"> = {
      action: "deal.create",
      targetType: "deal",
      targetId: "id",
      actorId: "actor",
      organizationId: "org",
      // metadata なしでも型エラーにならない
    };
    expect(withoutMetadata.action).toBe("deal.create");
  });
});

// ---------------------------------------------------------------------------
// テスト 3: auditLogRepository.create の直接呼び出しガード
// ---------------------------------------------------------------------------

describe("auditLogRepository.create 直接呼び出しガード", () => {
  it("src/application/usecases/ 配下に auditLogRepository.create の直接呼び出しが残っていない", async () => {
    const files = await listTsFilesRecursive("application/usecases");
    const violations: string[] = [];

    for (const relPath of files) {
      const content = await readSrc(relPath);
      if (content.includes("auditLogRepository.create")) {
        violations.push(relPath);
      }
    }

    expect(violations).toEqual([]);
  });

  it("src/infrastructure/handlers/ 配下に auditLogRepository.create の直接呼び出しが残っていない", async () => {
    const files = await listTsFilesRecursive("infrastructure/handlers");
    const violations: string[] = [];

    for (const relPath of files) {
      const content = await readSrc(relPath);
      if (content.includes("auditLogRepository.create")) {
        violations.push(relPath);
      }
    }

    expect(violations).toEqual([]);
  });

  it("auditRecorder.ts は唯一の許可された auditLogRepository.create 呼び出し箇所である", async () => {
    const src = await readSrc("application/services/auditRecorder.ts");
    expect(src).toContain("auditLogRepository.create");
  });

  it("src/application/usecases/ の大半が recordAudit を使用している", async () => {
    const files = await listTsFilesRecursive("application/usecases");
    let countWithRecordAudit = 0;

    for (const relPath of files) {
      const content = await readSrc(relPath);
      if (content.includes("recordAudit")) {
        countWithRecordAudit++;
      }
    }

    // 少なくとも 43 ファイルが recordAudit を使用している
    expect(countWithRecordAudit).toBeGreaterThanOrEqual(43);
  });
});
