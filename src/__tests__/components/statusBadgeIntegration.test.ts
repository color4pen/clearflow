/**
 * StatusBadge 統合静的検証テスト。
 * 代表画面のソースファイルを静的解析し、StatusBadge が正しく使用されていることを確認する。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("deals/page.tsx — StatusBadge 統合", () => {
  it("StatusBadge をインポートしている", async () => {
    const content = await readSrc("app/(dashboard)/deals/page.tsx");
    expect(content).toContain("StatusBadge");
  });

  it("PHASE_VARIANT または phaseVariant が定義されている", async () => {
    const content = await readSrc("app/(dashboard)/deals/page.tsx");
    expect(content.includes("PHASE_VARIANT") || content.includes("phaseVariant")).toBe(true);
  });

  it("won → green のマッピングが存在する", async () => {
    const content = await readSrc("app/(dashboard)/deals/page.tsx");
    expect(content).toMatch(/won.*green/);
  });

  it("lost → red のマッピングが存在する", async () => {
    const content = await readSrc("app/(dashboard)/deals/page.tsx");
    expect(content).toMatch(/lost.*red/);
  });

  it("hearing → gray のマッピングが存在する", async () => {
    const content = await readSrc("app/(dashboard)/deals/page.tsx");
    expect(content).toMatch(/hearing.*gray/);
  });
});

describe("requests/BulkApprovalPanel.tsx — StatusBadge 統合", () => {
  it("StatusBadge をインポートしている", async () => {
    const content = await readSrc("app/(dashboard)/requests/BulkApprovalPanel.tsx");
    expect(content).toContain("StatusBadge");
  });

  it("statusVariant の使用が存在する", async () => {
    const content = await readSrc("app/(dashboard)/requests/BulkApprovalPanel.tsx");
    expect(content).toContain("statusVariant");
  });
});

describe("contracts/[id]/InvoiceSection.tsx — StatusBadge 統合", () => {
  it("StatusBadge をインポートしている", async () => {
    const content = await readSrc("app/(dashboard)/contracts/[id]/InvoiceSection.tsx");
    expect(content).toContain("StatusBadge");
  });

  it("overdue → red のマッピングが存在する", async () => {
    const content = await readSrc("app/(dashboard)/contracts/[id]/InvoiceSection.tsx");
    expect(content).toMatch(/overdue.*red/);
  });

  it("paid → green のマッピングが存在する", async () => {
    const content = await readSrc("app/(dashboard)/contracts/[id]/InvoiceSection.tsx");
    expect(content).toMatch(/paid.*green/);
  });
});

describe("requests/statusUtils.ts — ハードコード hex 排除", () => {
  it("text-[# 形式のハードコード hex が存在しない", async () => {
    const content = await readSrc("app/(dashboard)/requests/statusUtils.ts");
    expect(content).not.toContain("text-[#");
  });
});
