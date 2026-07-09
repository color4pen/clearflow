/**
 * SalesDashboard.tsx KPI グリッド・h2 色統一の静的検証テスト。
 * ソースファイルを静的解析し、KPI グリッド構成と見出しスタイルが正しいことを確認する。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("SalesDashboard.tsx — KPI グリッド", () => {
  it("grid-cols-8 が存在しない（KPI グリッド廃止）", async () => {
    const content = await readSrc("app/(dashboard)/dashboard/SalesDashboard.tsx");
    expect(content).not.toContain("grid-cols-8");
  });

  it("auto-fill が存在する（可変グリッド採用）", async () => {
    const content = await readSrc("app/(dashboard)/dashboard/SalesDashboard.tsx");
    expect(content).toContain("auto-fill");
  });

  it("minmax(150px が存在する", async () => {
    const content = await readSrc("app/(dashboard)/dashboard/SalesDashboard.tsx");
    expect(content).toContain("minmax(150px");
  });

  it("text-2xl font-bold が存在する（KPI 値スタイル）", async () => {
    const content = await readSrc("app/(dashboard)/dashboard/SalesDashboard.tsx");
    expect(content).toContain("text-2xl font-bold");
  });
});

describe("SalesDashboard.tsx — h2 色統一", () => {
  it("text-sm font-semibold text-text-muted が存在しない（h2 色変更確認）", async () => {
    const content = await readSrc("app/(dashboard)/dashboard/SalesDashboard.tsx");
    expect(content).not.toContain("text-sm font-semibold text-text-muted");
  });
});

describe("SalesDashboard.tsx — ハードコード排除", () => {
  it("text-[# 形式のハードコード hex クラスが存在しない", async () => {
    const content = await readSrc("app/(dashboard)/dashboard/SalesDashboard.tsx");
    expect(content).not.toContain("text-[#");
  });
});
