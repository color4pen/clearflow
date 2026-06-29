/**
 * actionItemManagement — listActionItems ユースケースの静的検証テスト
 *
 * ソースファイルの内容を静的解析し、重要なパターンが含まれることを確認する。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile, access } from "fs/promises";
import { constants } from "fs";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

async function fileExists(relPath: string): Promise<boolean> {
  try {
    await access(path.join(ROOT, relPath), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

describe("listActionItems ユースケース 静的検証", () => {
  it("listActionItems.ts が存在する", async () => {
    const exists = await fileExists("src/application/usecases/listActionItems.ts");
    expect(exists).toBe(true);
  });

  it("actionItemRepository.findByOrganization の呼び出しが含まれる", async () => {
    const content = await readSrc("application/usecases/listActionItems.ts");
    expect(content).toContain("actionItemRepository.findByOrganization");
  });

  it("dealRepository の参照が含まれる（紐づけ先名前解決）", async () => {
    const content = await readSrc("application/usecases/listActionItems.ts");
    expect(content).toContain("dealRepository");
  });

  it("interactionRepository の参照が含まれる（紐づけ先名前解決）", async () => {
    const content = await readSrc("application/usecases/listActionItems.ts");
    expect(content).toContain("interactionRepository");
  });

  it("inquiryRepository の参照が含まれる（紐づけ先名前解決）", async () => {
    const content = await readSrc("application/usecases/listActionItems.ts");
    expect(content).toContain("inquiryRepository");
  });

  it("ActionItemWithSource 型定義に sourceName が含まれる", async () => {
    const content = await readSrc("application/usecases/listActionItems.ts");
    expect(content).toContain("ActionItemWithSource");
    expect(content).toContain("sourceName");
  });

  it("ActionItemWithSource 型定義に sourceHref が含まれる", async () => {
    const content = await readSrc("application/usecases/listActionItems.ts");
    expect(content).toContain("sourceHref");
  });

  it("Promise.all で並列取得している", async () => {
    const content = await readSrc("application/usecases/listActionItems.ts");
    expect(content).toContain("Promise.all");
  });

  it("個人タスクのフォールバック文字列が含まれる", async () => {
    const content = await readSrc("application/usecases/listActionItems.ts");
    expect(content).toContain("個人タスク");
  });

  it("done フィルタが引数として渡される", async () => {
    const content = await readSrc("application/usecases/listActionItems.ts");
    expect(content).toContain("done");
  });

  it("application/usecases/index.ts から listActionItems が export されている", async () => {
    const content = await readSrc("application/usecases/index.ts");
    expect(content).toContain("listActionItems");
  });
});
