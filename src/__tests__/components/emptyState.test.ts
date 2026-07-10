/**
 * EmptyState コンポーネントの静的検証テスト。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("EmptyState.tsx — 静的検証", () => {
  it("EmptyState.tsx が icon prop に対する条件分岐を含む", async () => {
    const content = await readSrc("app/components/EmptyState.tsx");
    expect(content).toContain("icon");
    expect(content).toMatch(/icon\s*&&/);
  });

  it("EmptyState.tsx が message prop の描画コードを含む", async () => {
    const content = await readSrc("app/components/EmptyState.tsx");
    expect(content).toContain("message");
    expect(content).toContain("{message}");
  });

  it("EmptyState.tsx が children prop の描画コードを含む", async () => {
    const content = await readSrc("app/components/EmptyState.tsx");
    expect(content).toContain("children");
    expect(content).toMatch(/children\s*&&/);
  });

  it("EmptyState.tsx が text-xs text-text-muted を含む", async () => {
    const content = await readSrc("app/components/EmptyState.tsx");
    expect(content).toContain("text-xs text-text-muted");
  });

  it("EmptyState.tsx が py-10 text-center を含む", async () => {
    const content = await readSrc("app/components/EmptyState.tsx");
    expect(content).toContain("py-10");
    expect(content).toContain("text-center");
  });

  it("EmptyState.tsx が text-4xl を含む（icon の絵文字用）", async () => {
    const content = await readSrc("app/components/EmptyState.tsx");
    expect(content).toContain("text-4xl");
  });

  it("EmptyState が index.ts からエクスポートされている", async () => {
    const content = await readSrc("app/components/index.ts");
    expect(content).toContain("EmptyState");
  });
});
