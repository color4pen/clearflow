/**
 * T-09: 認可テスト
 * TC-006, TC-007, TC-008, TC-009, TC-010, TC-030, TC-031, TC-033
 *
 * canPerform を使った権限チェックが MCP ツールハンドラに存在することを静的に検証する。
 * また、canPerform の実際の権限マトリクスを直接テストする。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";
import { canPerform } from "../../domain/authorization";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("canPerform 権限マトリクステスト", () => {
  describe("TC-006: member ロールによる引合の削除 → 拒否", () => {
    it("inquiry.delete は admin のみ許可される", () => {
      expect(canPerform("admin", "inquiry", "delete")).toBe(true);
      expect(canPerform("manager", "inquiry", "delete")).toBe(false);
      expect(canPerform("member", "inquiry", "delete")).toBe(false);
      expect(canPerform("finance", "inquiry", "delete")).toBe(false);
    });
  });

  describe("TC-007: member ロールによる案件の作成 → 拒否", () => {
    it("deal.create は admin/manager のみ許可される", () => {
      expect(canPerform("admin", "deal", "create")).toBe(true);
      expect(canPerform("manager", "deal", "create")).toBe(true);
      expect(canPerform("member", "deal", "create")).toBe(false);
      expect(canPerform("finance", "deal", "create")).toBe(false);
    });
  });

  describe("TC-008: admin ロールによる引合の削除 → 成功", () => {
    it("admin は inquiry.delete が許可される", () => {
      expect(canPerform("admin", "inquiry", "delete")).toBe(true);
    });
  });

  describe("TC-009: decline 権限を持たないロールによる引合の却下 → 拒否", () => {
    it("inquiry.decline は admin/manager のみ許可される", () => {
      expect(canPerform("admin", "inquiry", "decline")).toBe(true);
      expect(canPerform("manager", "inquiry", "decline")).toBe(true);
      expect(canPerform("member", "inquiry", "decline")).toBe(false);
      expect(canPerform("finance", "inquiry", "decline")).toBe(false);
    });
  });

  describe("TC-010: decline 権限を持つロールによる引合の却下 → 成功", () => {
    it("admin は inquiry.decline が許可される", () => {
      expect(canPerform("admin", "inquiry", "decline")).toBe(true);
    });
  });

  describe("TC-030: member による client.deleteContact → 拒否", () => {
    it("client.deleteContact は admin/manager のみ許可される", () => {
      expect(canPerform("admin", "client", "deleteContact")).toBe(true);
      expect(canPerform("manager", "client", "deleteContact")).toBe(true);
      expect(canPerform("member", "client", "deleteContact")).toBe(false);
      expect(canPerform("finance", "client", "deleteContact")).toBe(false);
    });
  });

  describe("TC-031: manager による deal.create → 成功", () => {
    it("manager は deal.create が許可される", () => {
      expect(canPerform("manager", "deal", "create")).toBe(true);
    });
  });

  describe("TC-033: deals update_phase で won/lost への遷移に closePhase 権限が必要", () => {
    it("deal.closePhase は admin/manager のみ許可される", () => {
      expect(canPerform("admin", "deal", "closePhase")).toBe(true);
      expect(canPerform("manager", "deal", "closePhase")).toBe(true);
      expect(canPerform("member", "deal", "closePhase")).toBe(false);
      expect(canPerform("finance", "deal", "closePhase")).toBe(false);
    });

    it("deal.changePhase は admin/manager/member が許可される", () => {
      expect(canPerform("admin", "deal", "changePhase")).toBe(true);
      expect(canPerform("manager", "deal", "changePhase")).toBe(true);
      expect(canPerform("member", "deal", "changePhase")).toBe(true);
    });
  });

  describe("inquiry.convert 権限", () => {
    it("inquiry.convert は admin/manager のみ許可される", () => {
      expect(canPerform("admin", "inquiry", "convert")).toBe(true);
      expect(canPerform("manager", "inquiry", "convert")).toBe(true);
      expect(canPerform("member", "inquiry", "convert")).toBe(false);
    });
  });
});

describe("MCP ツールハンドラの権限チェック（静的検証）", () => {
  it("inquiries.ts が canPerform を使っている", async () => {
    const content = await readSrc("app/api/mcp/tools/inquiries.ts");
    expect(content).toContain("canPerform");
  });

  it("inquiries.ts が inquiry.delete の権限チェックを含む", async () => {
    const content = await readSrc("app/api/mcp/tools/inquiries.ts");
    expect(content).toContain('"inquiry", "delete"');
  });

  it("inquiries.ts が inquiry.convert の権限チェックを含む", async () => {
    const content = await readSrc("app/api/mcp/tools/inquiries.ts");
    expect(content).toContain('"inquiry", "convert"');
  });

  it("inquiries.ts が inquiry.decline の権限チェックを含む", async () => {
    const content = await readSrc("app/api/mcp/tools/inquiries.ts");
    expect(content).toContain('"inquiry", "decline"');
  });

  it("deals.ts が deal.create の権限チェックを含む", async () => {
    const content = await readSrc("app/api/mcp/tools/deals.ts");
    expect(content).toContain('"deal", "create"');
  });

  it("deals.ts が deal.closePhase と deal.changePhase の権限チェックを含む", async () => {
    const content = await readSrc("app/api/mcp/tools/deals.ts");
    expect(content).toContain("closePhase");
    expect(content).toContain("changePhase");
  });

  it("clients.ts が client.deleteContact の権限チェックを含む", async () => {
    const content = await readSrc("app/api/mcp/tools/clients.ts");
    expect(content).toContain('"client", "deleteContact"');
  });
});

describe("TC-015: MCP deals.ts isTerminalPhase に passed が含まれる（静的検証）", () => {
  it("deals.ts の isTerminalPhase 判定に passed が含まれる", async () => {
    const content = await readSrc("app/api/mcp/tools/deals.ts");
    // isTerminalPhase の判定ロジックに passed が含まれる
    const isTerminalMatch = content.match(/isTerminalPhase\s*=\s*.+/);
    expect(isTerminalMatch).not.toBeNull();
    expect(isTerminalMatch![0]).toContain("passed");
  });

  it("deals.ts の updatePhaseSchema に passed が含まれる", async () => {
    const content = await readSrc("app/api/mcp/tools/deals.ts");
    // updatePhaseSchema 定義ブロック内に passed が含まれる（MCP が passed を受理できる）
    const updatePhaseSection = content.match(/const updatePhaseSchema[\s\S]*?\}\);/);
    expect(updatePhaseSection).not.toBeNull();
    expect(updatePhaseSection![0]).toContain('"passed"');
  });

  it("deals.ts の updatePhaseSchema に hearing が含まれる", async () => {
    const content = await readSrc("app/api/mcp/tools/deals.ts");
    // updatePhaseSchema 定義ブロック内に hearing が含まれる（MCP が hearing を受理できる）
    const updatePhaseSection = content.match(/const updatePhaseSchema[\s\S]*?\}\);/);
    expect(updatePhaseSection).not.toBeNull();
    expect(updatePhaseSection![0]).toContain('"hearing"');
  });

  it("passed は closePhase 権限経路に到達する（isTerminalPhase=true → closePhase）", async () => {
    const content = await readSrc("app/api/mcp/tools/deals.ts");
    // isTerminalPhase が true のとき requiredOperation が closePhase になるパターンが存在する
    expect(content).toContain("closePhase");
    // passed を含む isTerminalPhase 判定と closePhase が同一 case ブロック内に存在する
    const updatePhaseCase = content.match(/case "update_phase"[\s\S]*?(?=case "|default)/);
    expect(updatePhaseCase).not.toBeNull();
    const block = updatePhaseCase![0];
    expect(block).toContain("passed");
    expect(block).toContain("closePhase");
  });
});
