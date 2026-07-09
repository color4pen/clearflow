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

  // TC-006: 全フェーズの variant マッピングを検証
  it("proposal_prep → blue のマッピングが存在する", async () => {
    const content = await readSrc("app/(dashboard)/deals/[id]/page.tsx");
    expect(content).toMatch(/proposal_prep.*blue/);
  });

  it("proposed → blue のマッピングが存在する", async () => {
    const content = await readSrc("app/(dashboard)/deals/[id]/page.tsx");
    expect(content).toMatch(/proposed.*blue/);
  });

  it("negotiation → blue のマッピングが存在する", async () => {
    const content = await readSrc("app/(dashboard)/deals/[id]/page.tsx");
    expect(content).toMatch(/negotiation.*blue/);
  });

  it("passed → gray のマッピングが存在する", async () => {
    const content = await readSrc("app/(dashboard)/deals/[id]/page.tsx");
    expect(content).toMatch(/passed.*gray/);
  });

  // TC-003/TC-009: WatchToggle がヒーロー行のみに配置されている（ステッパーカード内に重複しない）
  it("WatchToggle が存在する", async () => {
    const content = await readSrc("app/(dashboard)/deals/[id]/page.tsx");
    expect(content).toContain("WatchToggle");
  });

  it("WatchToggle の JSX 使用がファイル内に 1 箇所のみ（ステッパーカード内に存在しない）", async () => {
    const content = await readSrc("app/(dashboard)/deals/[id]/page.tsx");
    const jsxOccurrences = (content.match(/<WatchToggle/g) ?? []).length;
    expect(jsxOccurrences).toBe(1);
  });

  // TC-010: 見積承認リンクの href パターンと文言の不変性
  it("estimateRequestId の条件チェックが存在する", async () => {
    const content = await readSrc("app/(dashboard)/deals/[id]/page.tsx");
    expect(content).toContain("estimateRequestId");
  });

  it("見積承認リンクの href が /requests/${estimateRequestId} パターンを持つ", async () => {
    const content = await readSrc("app/(dashboard)/deals/[id]/page.tsx");
    expect(content).toMatch(/href=.*requests.*estimateRequestId/);
  });

  it("見積承認リンクの文言「見積承認を表示」が存在する", async () => {
    const content = await readSrc("app/(dashboard)/deals/[id]/page.tsx");
    expect(content).toContain("見積承認を表示");
  });

  // TC-011: ハードコード hex クラスが全パターンで存在しない
  it("text-[# 形式のハードコード hex クラスが存在しない", async () => {
    const content = await readSrc("app/(dashboard)/deals/[id]/page.tsx");
    expect(content).not.toContain("text-[#");
  });

  it("bg-[# 形式のハードコード hex クラスが存在しない", async () => {
    const content = await readSrc("app/(dashboard)/deals/[id]/page.tsx");
    expect(content).not.toContain("bg-[#");
  });

  it("border-[# 形式のハードコード hex クラスが存在しない", async () => {
    const content = await readSrc("app/(dashboard)/deals/[id]/page.tsx");
    expect(content).not.toContain("border-[#");
  });
});
