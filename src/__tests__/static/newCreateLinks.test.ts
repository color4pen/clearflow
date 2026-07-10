/**
 * 新規作成リンクの BTN_PRIMARY 化検証テスト。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

// ---------------------------------------------------------------------------
// deals/page.tsx
// ---------------------------------------------------------------------------

describe("deals/page.tsx — 新規作成リンク", () => {
  it("BTN_PRIMARY または bg-primary text-white を含む新規作成 Link が存在する", async () => {
    const content = await readSrc("app/(dashboard)/deals/page.tsx");
    expect(content.includes("BTN_PRIMARY") || content.includes("bg-primary text-white")).toBe(true);
  });

  it("ブラケット [ が新規作成テキストに含まれない", async () => {
    const content = await readSrc("app/(dashboard)/deals/page.tsx");
    expect(content).not.toContain("[新規作成]");
  });

  it("/deals/new への href が変更されていない", async () => {
    const content = await readSrc("app/(dashboard)/deals/page.tsx");
    expect(content).toContain('href="/deals/new"');
  });
});

// ---------------------------------------------------------------------------
// inquiries/page.tsx
// ---------------------------------------------------------------------------

describe("inquiries/page.tsx — 新規作成リンク", () => {
  it("BTN_PRIMARY または bg-primary text-white を含む新規作成 Link が存在する", async () => {
    const content = await readSrc("app/(dashboard)/inquiries/page.tsx");
    expect(content.includes("BTN_PRIMARY") || content.includes("bg-primary text-white")).toBe(true);
  });

  it("ブラケット [ が新規登録テキストに含まれない", async () => {
    const content = await readSrc("app/(dashboard)/inquiries/page.tsx");
    expect(content).not.toContain("[新規登録]");
  });

  it("/inquiries/new への href が変更されていない", async () => {
    const content = await readSrc("app/(dashboard)/inquiries/page.tsx");
    expect(content).toContain('href="/inquiries/new"');
  });
});

// ---------------------------------------------------------------------------
// clients/page.tsx
// ---------------------------------------------------------------------------

describe("clients/page.tsx — 新規作成リンク", () => {
  it("BTN_PRIMARY または bg-primary text-white を含む新規作成 Link が存在する", async () => {
    const content = await readSrc("app/(dashboard)/clients/page.tsx");
    expect(content.includes("BTN_PRIMARY") || content.includes("bg-primary text-white")).toBe(true);
  });

  it("ブラケット [ が新規登録テキストに含まれない", async () => {
    const content = await readSrc("app/(dashboard)/clients/page.tsx");
    expect(content).not.toContain("[新規登録]");
  });

  it("/clients/new への href が変更されていない", async () => {
    const content = await readSrc("app/(dashboard)/clients/page.tsx");
    expect(content).toContain('href="/clients/new"');
  });
});

// ---------------------------------------------------------------------------
// requests/page.tsx
// ---------------------------------------------------------------------------

describe("requests/page.tsx — 新規作成リンク", () => {
  it("BTN_PRIMARY または bg-primary text-white を含む新規作成 Link が存在する", async () => {
    const content = await readSrc("app/(dashboard)/requests/page.tsx");
    expect(content.includes("BTN_PRIMARY") || content.includes("bg-primary text-white")).toBe(true);
  });

  it("ブラケット [ が新規作成テキストに含まれない（インラインツールバーも不在）", async () => {
    const content = await readSrc("app/(dashboard)/requests/page.tsx");
    expect(content).not.toContain("[新規作成]");
  });

  it("/requests/new への href が変更されていない", async () => {
    const content = await readSrc("app/(dashboard)/requests/page.tsx");
    expect(content).toContain('href="/requests/new"');
  });
});

// ---------------------------------------------------------------------------
// settings/policies/page.tsx
// ---------------------------------------------------------------------------

describe("settings/policies/page.tsx — 新規作成リンク", () => {
  it("BTN_PRIMARY または bg-primary text-white を含む新規作成 Link が存在する", async () => {
    const content = await readSrc("app/(dashboard)/settings/policies/page.tsx");
    expect(content.includes("BTN_PRIMARY") || content.includes("bg-primary text-white")).toBe(true);
  });

  it("ブラケット [ がポリシー追加テキストに含まれない", async () => {
    const content = await readSrc("app/(dashboard)/settings/policies/page.tsx");
    expect(content).not.toContain("[ポリシーを追加]");
  });

  it("/settings/policies/new への href が変更されていない", async () => {
    const content = await readSrc("app/(dashboard)/settings/policies/page.tsx");
    expect(content).toContain('href="/settings/policies/new"');
  });
});

// ---------------------------------------------------------------------------
// settings/templates/page.tsx
// ---------------------------------------------------------------------------

describe("settings/templates/page.tsx — 新規作成リンク", () => {
  it("BTN_PRIMARY または bg-primary text-white を含む新規作成 Link が存在する", async () => {
    const content = await readSrc("app/(dashboard)/settings/templates/page.tsx");
    expect(content.includes("BTN_PRIMARY") || content.includes("bg-primary text-white")).toBe(true);
  });

  it("ブラケット [ がテンプレート追加テキストに含まれない", async () => {
    const content = await readSrc("app/(dashboard)/settings/templates/page.tsx");
    expect(content).not.toContain("[テンプレートを追加]");
  });

  it("/settings/templates/new への href が変更されていない", async () => {
    const content = await readSrc("app/(dashboard)/settings/templates/page.tsx");
    expect(content).toContain('href="/settings/templates/new"');
  });
});

// ---------------------------------------------------------------------------
// contracts/page.tsx — /contracts/new リンクが存在しない
// ---------------------------------------------------------------------------

describe("contracts/page.tsx — /contracts/new への新規リンクが存在しない", () => {
  it("contracts/page.tsx に /contracts/new への新規作成リンクが存在しない", async () => {
    const content = await readSrc("app/(dashboard)/contracts/page.tsx");
    expect(content).not.toContain('href="/contracts/new"');
  });

  it("contracts/page.tsx に [新規作成] ブラケット表記が存在しない", async () => {
    const content = await readSrc("app/(dashboard)/contracts/page.tsx");
    expect(content).not.toContain("[新規作成]");
  });
});
