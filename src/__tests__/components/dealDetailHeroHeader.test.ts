/**
 * deals/[id]/page.tsx ヒーローヘッダー静的検証テスト。
 * ソースファイルを静的解析し、ヒーロー行の構成が正しいことを確認する。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("deals/[id]/page.tsx — ヒーローヘッダー", () => {
  it("StatusBadge をインポートしている", async () => {
    const content = await readSrc("app/(dashboard)/deals/[id]/page.tsx");
    expect(content).toContain("StatusBadge");
  });

  it("PHASE_VARIANT または phaseVariant が存在する", async () => {
    const content = await readSrc("app/(dashboard)/deals/[id]/page.tsx");
    expect(content.includes("PHASE_VARIANT") || content.includes("phaseVariant")).toBe(true);
  });

  it("won → green のマッピングが存在する", async () => {
    const content = await readSrc("app/(dashboard)/deals/[id]/page.tsx");
    expect(content).toMatch(/won.*green/);
  });

  it("lost → red のマッピングが存在する", async () => {
    const content = await readSrc("app/(dashboard)/deals/[id]/page.tsx");
    expect(content).toMatch(/lost.*red/);
  });

  it("hearing → gray のマッピングが存在する", async () => {
    const content = await readSrc("app/(dashboard)/deals/[id]/page.tsx");
    expect(content).toMatch(/hearing.*gray/);
  });

  it("WatchToggle が存在する", async () => {
    const content = await readSrc("app/(dashboard)/deals/[id]/page.tsx");
    expect(content).toContain("WatchToggle");
  });

  it("estimateRequestId の条件チェックが存在する", async () => {
    const content = await readSrc("app/(dashboard)/deals/[id]/page.tsx");
    expect(content).toContain("estimateRequestId");
  });

  it("text-[# 形式のハードコード hex クラスが存在しない", async () => {
    const content = await readSrc("app/(dashboard)/deals/[id]/page.tsx");
    expect(content).not.toContain("text-[#");
  });
});
