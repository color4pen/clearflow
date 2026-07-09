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

  // TC-017: h2 文言の不変性
  it("h2 文言「アクション待ちリスト」が存在する", async () => {
    const content = await readSrc("app/(dashboard)/dashboard/SalesDashboard.tsx");
    expect(content).toContain("アクション待ちリスト");
  });

  it("h2 文言「停滞案件リスト」が存在する", async () => {
    const content = await readSrc("app/(dashboard)/dashboard/SalesDashboard.tsx");
    expect(content).toContain("停滞案件リスト");
  });

  it("h2 文言「直近の活動」が存在する", async () => {
    const content = await readSrc("app/(dashboard)/dashboard/SalesDashboard.tsx");
    expect(content).toContain("直近の活動");
  });
});

describe("SalesDashboard.tsx — ハードコード排除", () => {
  // TC-018: ハードコード hex クラスが全パターンで存在しない
  it("text-[# 形式のハードコード hex クラスが存在しない", async () => {
    const content = await readSrc("app/(dashboard)/dashboard/SalesDashboard.tsx");
    expect(content).not.toContain("text-[#");
  });

  it("bg-[# 形式のハードコード hex クラスが存在しない", async () => {
    const content = await readSrc("app/(dashboard)/dashboard/SalesDashboard.tsx");
    expect(content).not.toContain("bg-[#");
  });

  it("border-[# 形式のハードコード hex クラスが存在しない", async () => {
    const content = await readSrc("app/(dashboard)/dashboard/SalesDashboard.tsx");
    expect(content).not.toContain("border-[#");
  });
});
