/**
 * NotificationPanel 静的検証テスト
 *
 * NotificationPanel.tsx に未定義トークン bg-bg-card が残っていないことを確認する。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

const SRC_PATH = "app/(dashboard)/NotificationPanel.tsx";

describe("NotificationPanel 静的検証", () => {
  it("未定義トークン bg-bg-card が含まれない", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).not.toContain("bg-bg-card");
  });

  it("パネル幅 w-[340px] が含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("w-[340px]");
  });

  it("サイドバー幅追随 left-[220px] が含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("left-[220px]");
  });
});
