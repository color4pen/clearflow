/**
 * 承認系アクションの canPerform 使用 静的検証
 *
 * approveRequestAction / rejectRequestAction / bulkApproveAction が
 * canPerform(@/domain/authorization) 経由でロールゲートを行い、
 * インライン role === "member" 判定を含まないことを保証する。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("承認系アクション canPerform 静的検証", () => {
  it("requests.ts が canPerform を @/domain/authorization からインポートしている", async () => {
    const content = await readSrc("app/actions/requests.ts");
    expect(content).toContain('canPerform');
    expect(content).toContain('@/domain/authorization');
  });

  it("approveRequestAction 内で canPerform が使用されている", async () => {
    const content = await readSrc("app/actions/requests.ts");
    const fnStart = content.indexOf("export async function approveRequestAction");
    expect(fnStart).toBeGreaterThan(-1);
    // Find the closing of the function by looking for the next export function
    const fnEnd = content.indexOf("export async function", fnStart + 1);
    const fnBody = fnEnd > -1 ? content.slice(fnStart, fnEnd) : content.slice(fnStart);
    expect(fnBody).toContain('canPerform');
    expect(fnBody).toContain('"approval"');
    expect(fnBody).toContain('"approve"');
  });

  it("rejectRequestAction 内で canPerform が使用されている", async () => {
    const content = await readSrc("app/actions/requests.ts");
    const fnStart = content.indexOf("export async function rejectRequestAction");
    expect(fnStart).toBeGreaterThan(-1);
    const fnEnd = content.indexOf("export async function", fnStart + 1);
    const fnBody = fnEnd > -1 ? content.slice(fnStart, fnEnd) : content.slice(fnStart);
    expect(fnBody).toContain('canPerform');
    expect(fnBody).toContain('"approval"');
    expect(fnBody).toContain('"reject"');
  });

  it("bulkApproveAction 内で canPerform が使用されている", async () => {
    const content = await readSrc("app/actions/requests.ts");
    const fnStart = content.indexOf("export async function bulkApproveAction");
    expect(fnStart).toBeGreaterThan(-1);
    const fnEnd = content.indexOf("export async function", fnStart + 1);
    const fnBody = fnEnd > -1 ? content.slice(fnStart, fnEnd) : content.slice(fnStart);
    expect(fnBody).toContain('canPerform');
    expect(fnBody).toContain('"approval"');
    expect(fnBody).toContain('"approve"');
  });

  it('承認系アクション内にインライン role === "member" 判定が存在しない', async () => {
    const content = await readSrc("app/actions/requests.ts");

    const checkFunction = (fnName: string) => {
      const fnStart = content.indexOf(`export async function ${fnName}`);
      expect(fnStart).toBeGreaterThan(-1);
      const fnEnd = content.indexOf("export async function", fnStart + 1);
      const fnBody = fnEnd > -1 ? content.slice(fnStart, fnEnd) : content.slice(fnStart);
      expect(fnBody).not.toMatch(/role\s*===\s*["']member["']/);
      expect(fnBody).not.toMatch(/["']member["']\s*===\s*role/);
    };

    checkFunction("approveRequestAction");
    checkFunction("rejectRequestAction");
    checkFunction("bulkApproveAction");
  });
});
