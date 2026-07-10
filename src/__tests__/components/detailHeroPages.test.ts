/**
 * 詳細ヒーローページの静的検証テスト。
 * inquiries/[id]・contracts/[id]・contracts/[id]/invoices/[invoiceId]・requests/[id]
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

// ---------------------------------------------------------------------------
// inquiries/[id]/page.tsx
// ---------------------------------------------------------------------------

describe("inquiries/[id]/page.tsx — ヒーローヘッダー", () => {
  it("<h1 が存在する", async () => {
    const content = await readSrc("app/(dashboard)/inquiries/[id]/page.tsx");
    expect(content).toContain("<h1");
  });

  it("StatusBadge が存在する", async () => {
    const content = await readSrc("app/(dashboard)/inquiries/[id]/page.tsx");
    expect(content).toContain("StatusBadge");
  });

  it("/inquiries への一覧リンクが存在する", async () => {
    const content = await readSrc("app/(dashboard)/inquiries/[id]/page.tsx");
    expect(content).toContain('href="/inquiries"');
  });

  it("引合一覧 テキストが存在する", async () => {
    const content = await readSrc("app/(dashboard)/inquiries/[id]/page.tsx");
    expect(content).toContain("引合一覧");
  });

  it("bg-bg-toolbar border border-border の旧バーが存在しない", async () => {
    const content = await readSrc("app/(dashboard)/inquiries/[id]/page.tsx");
    expect(content).not.toContain("bg-bg-toolbar border border-border");
  });

  it("InquiryActions が ml-auto コンテナ内に存在する（ヒーロー行）", async () => {
    const content = await readSrc("app/(dashboard)/inquiries/[id]/page.tsx");
    expect(content).toContain("ml-auto");
    expect(content).toContain("InquiryActions");
  });
});

// ---------------------------------------------------------------------------
// contracts/[id]/page.tsx
// ---------------------------------------------------------------------------

describe("contracts/[id]/page.tsx — ヒーローヘッダー", () => {
  it("<h1 が存在する", async () => {
    const content = await readSrc("app/(dashboard)/contracts/[id]/page.tsx");
    expect(content).toContain("<h1");
  });

  it("StatusBadge が存在する", async () => {
    const content = await readSrc("app/(dashboard)/contracts/[id]/page.tsx");
    expect(content).toContain("StatusBadge");
  });

  it("/contracts への一覧リンクが存在する", async () => {
    const content = await readSrc("app/(dashboard)/contracts/[id]/page.tsx");
    expect(content).toContain('href="/contracts"');
  });

  it("bg-bg-toolbar border border-border の旧バーが存在しない", async () => {
    const content = await readSrc("app/(dashboard)/contracts/[id]/page.tsx");
    expect(content).not.toContain("bg-bg-toolbar border border-border");
  });

  it("「案件を表示」リンクが ml-auto コンテナ内に存在する", async () => {
    const content = await readSrc("app/(dashboard)/contracts/[id]/page.tsx");
    expect(content).toContain("ml-auto");
    expect(content).toContain("案件を表示");
  });

  it("「顧客を表示」リンクが存在する", async () => {
    const content = await readSrc("app/(dashboard)/contracts/[id]/page.tsx");
    expect(content).toContain("顧客を表示");
  });

  it("dl 内に <dt>ステータス</dt> 行が存在しない", async () => {
    const content = await readSrc("app/(dashboard)/contracts/[id]/page.tsx");
    expect(content).not.toContain("<dt>ステータス</dt>");
  });
});

// ---------------------------------------------------------------------------
// contracts/[id]/invoices/[invoiceId]/page.tsx
// ---------------------------------------------------------------------------

describe("contracts/[id]/invoices/[invoiceId]/page.tsx — ヒーローヘッダー", () => {
  it("<h1 が存在する", async () => {
    const content = await readSrc("app/(dashboard)/contracts/[id]/invoices/[invoiceId]/page.tsx");
    expect(content).toContain("<h1");
  });

  it("StatusBadge が存在する", async () => {
    const content = await readSrc("app/(dashboard)/contracts/[id]/invoices/[invoiceId]/page.tsx");
    expect(content).toContain("StatusBadge");
  });

  it("/contracts への一覧リンクが存在する", async () => {
    const content = await readSrc("app/(dashboard)/contracts/[id]/invoices/[invoiceId]/page.tsx");
    expect(content).toContain('href="/contracts"');
  });

  it("契約詳細リンクが存在する", async () => {
    const content = await readSrc("app/(dashboard)/contracts/[id]/invoices/[invoiceId]/page.tsx");
    expect(content).toContain("contracts/${contractId}");
  });

  it("bg-bg-toolbar border border-border の旧バーが存在しない", async () => {
    const content = await readSrc("app/(dashboard)/contracts/[id]/invoices/[invoiceId]/page.tsx");
    expect(content).not.toContain("bg-bg-toolbar border border-border");
  });

  it("dl 内に <dt>ステータス</dt> 行が存在しない", async () => {
    const content = await readSrc("app/(dashboard)/contracts/[id]/invoices/[invoiceId]/page.tsx");
    expect(content).not.toContain("<dt>ステータス</dt>");
  });
});

// ---------------------------------------------------------------------------
// requests/[id]/page.tsx
// ---------------------------------------------------------------------------

describe("requests/[id]/page.tsx — ヒーローヘッダー", () => {
  it("<h1 が存在する", async () => {
    const content = await readSrc("app/(dashboard)/requests/[id]/page.tsx");
    expect(content).toContain("<h1");
  });

  it("StatusBadge が存在する", async () => {
    const content = await readSrc("app/(dashboard)/requests/[id]/page.tsx");
    expect(content).toContain("StatusBadge");
  });

  it("/requests への一覧リンクが存在する", async () => {
    const content = await readSrc("app/(dashboard)/requests/[id]/page.tsx");
    expect(content).toContain('href="/requests"');
  });

  it("申請一覧 テキストが存在する", async () => {
    const content = await readSrc("app/(dashboard)/requests/[id]/page.tsx");
    expect(content).toContain("申請一覧");
  });

  it("「← 申請一覧に戻る」テキストが存在しない", async () => {
    const content = await readSrc("app/(dashboard)/requests/[id]/page.tsx");
    expect(content).not.toContain("← 申請一覧に戻る");
  });

  it("bg-bg-toolbar border border-border の旧バーが存在しない", async () => {
    const content = await readSrc("app/(dashboard)/requests/[id]/page.tsx");
    expect(content).not.toContain("bg-bg-toolbar border border-border");
  });

  it("SectionCard 内の border-b border-border px-4 py-3 ブロックが存在しない", async () => {
    const content = await readSrc("app/(dashboard)/requests/[id]/page.tsx");
    expect(content).not.toContain("border-b border-border px-4 py-3");
  });

  it("ActionButtons が存在する", async () => {
    const content = await readSrc("app/(dashboard)/requests/[id]/page.tsx");
    expect(content).toContain("ActionButtons");
  });

  it("h1 が SectionCard 外のヒーロー行に存在する（SectionCard より前にある）", async () => {
    const content = await readSrc("app/(dashboard)/requests/[id]/page.tsx");
    const h1Idx = content.indexOf("<h1");
    const sectionCardIdx = content.indexOf("<SectionCard");
    expect(h1Idx).toBeGreaterThan(-1);
    expect(sectionCardIdx).toBeGreaterThan(-1);
    expect(h1Idx).toBeLessThan(sectionCardIdx);
  });
});
