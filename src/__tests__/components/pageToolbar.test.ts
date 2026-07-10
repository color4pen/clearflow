/**
 * PageToolbar コンポーネントの静的検証テスト。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("PageToolbar.tsx — 静的検証", () => {
  it("PageToolbar.tsx が <h1 タグを含む", async () => {
    const content = await readSrc("app/components/PageToolbar.tsx");
    expect(content).toContain("<h1");
  });

  it("PageToolbar.tsx の h1 が text-lg font-bold クラスを持つ", async () => {
    const content = await readSrc("app/components/PageToolbar.tsx");
    expect(content).toContain("text-lg font-bold");
  });

  it("PageToolbar.tsx に bg-bg-toolbar が含まれない", async () => {
    const content = await readSrc("app/components/PageToolbar.tsx");
    expect(content).not.toContain("bg-bg-toolbar");
  });

  it("PageToolbar.tsx に border border-border が含まれない", async () => {
    const content = await readSrc("app/components/PageToolbar.tsx");
    expect(content).not.toContain("border border-border");
  });

  it("actions が ml-auto を持つコンテナでラップされている", async () => {
    const content = await readSrc("app/components/PageToolbar.tsx");
    expect(content).toContain("ml-auto");
  });

  it("| 区切り span が存在しない", async () => {
    const content = await readSrc("app/components/PageToolbar.tsx");
    expect(content).not.toContain('text-border mx-1">|<');
  });
});
