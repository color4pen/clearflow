/**
 * bulkApprove usecase — static code analysis tests
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("bulkApprove usecase — static analysis", () => {
  it("bulkApprove.ts exists and imports approveRequest", async () => {
    const content = await readSrc("application/usecases/bulkApprove.ts");
    expect(content).toContain("approveRequest");
    expect(content).toContain("import");
  });

  it("bulkApprove.ts returns an object with a results property", async () => {
    const content = await readSrc("application/usecases/bulkApprove.ts");
    expect(content).toContain("results");
  });

  it("bulkApprove.ts contains a for loop or iteration construct", async () => {
    const content = await readSrc("application/usecases/bulkApprove.ts");
    // Accepts for...of or similar iteration
    const hasIteration = content.includes("for (") || content.includes("for(");
    expect(hasIteration).toBe(true);
  });

  it("bulkApprove.ts has no import from @/app/actions (dependency direction)", async () => {
    const content = await readSrc("application/usecases/bulkApprove.ts");
    expect(content).not.toContain("@/app/actions");
    expect(content).not.toContain("../app/actions");
  });

  it("bulkApprove is exported from usecases/index.ts", async () => {
    const content = await readSrc("application/usecases/index.ts");
    expect(content).toContain("bulkApprove");
  });

  it("BulkApproveResult type has correct shape in bulkApprove.ts", async () => {
    const content = await readSrc("application/usecases/bulkApprove.ts");
    // Should define a result type with requestId, success, and optional reason
    expect(content).toContain("requestId");
    expect(content).toContain("success");
    expect(content).toContain("reason");
  });
});
